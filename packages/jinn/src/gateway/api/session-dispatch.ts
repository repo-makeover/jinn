import fs from "node:fs";
import path from "node:path";
import { notifyAttachedTalkSessions } from "../../sessions/callbacks.js";
import {
  cancelQueueItem,
  deleteSession,
  getFile,
  getSession,
  listAllPendingQueueItems,
  updateSession,
} from "../../sessions/registry.js";
import { FILES_DIR } from "../../shared/paths.js";
import { logger } from "../../shared/logger.js";
import { isInterruptibleEngine, type ArchiveKind, type Engine, type JinnConfig, type Session } from "../../shared/types.js";
import { maybeEmitTalkGraph } from "../../talk/graph.js";
import { runWebSession } from "../run-web-session.js";
import type { ApiContext } from "./context.js";

export function killSessionEngines(context: ApiContext, session: Session, reason: string): { interruptible: number; killed: number } {
  const engines = new Set<Engine>();
  const primary = context.sessionManager.getEngine(session.engine);
  const pty = context.ptyViewEngines?.[session.engine];
  if (primary) engines.add(primary);
  if (pty) engines.add(pty);

  let interruptible = 0;
  let killed = 0;
  for (const engine of engines) {
    if (!isInterruptibleEngine(engine)) continue;
    interruptible++;
    engine.kill(session.id, reason);
    killed++;
  }
  return { interruptible, killed };
}

const ARCHIVE_KINDS = new Set<ArchiveKind>(["room", "scheduled", "chat"]);

export function isArchiveKind(value: unknown): value is ArchiveKind {
  return typeof value === "string" && ARCHIVE_KINDS.has(value as ArchiveKind);
}

export function teardownAndDeleteSession(context: ApiContext, session: Session, reason: string): boolean {
  killSessionEngines(context, session, reason);
  context.sessionManager.getQueue().clearQueue(session.sessionKey || session.sourceRef || session.id);
  maybeEmitTalkGraph(session.id, "removed", { getSession, emit: context.emit });
  const deleted = deleteSession(session.id);
  if (deleted) context.emit("session:deleted", { sessionId: session.id });
  return deleted;
}

export function resumePendingWebQueueItems(context: ApiContext): void {
  const pending = listAllPendingQueueItems();
  if (pending.length === 0) return;

  let resumed = 0;
  for (const item of pending) {
    const existingSession = getSession(item.sessionId);
    if (!existingSession) {
      cancelQueueItem(item.id);
      continue;
    }
    let session = existingSession;
    if (session.source !== "web") continue;
    session = maybeRevertEngineOverride(session);

    const config = context.getConfig();
    const engine = context.sessionManager.getEngine(session.engine);
    if (!engine) {
      cancelQueueItem(item.id);
      updateSession(session.id, { status: "error", lastActivity: new Date().toISOString(), lastError: `Engine "${session.engine}" not available` });
      continue;
    }

    updateSession(session.id, { status: "running", lastActivity: new Date().toISOString(), lastError: null });
    dispatchWebSessionRun(session, item.prompt, engine, config, context, { queueItemId: item.id });
    resumed++;
  }

  if (resumed > 0) {
    logger.info(`Re-dispatched ${resumed} pending web queue item(s) after gateway restart`);
  }
}

export function maybeRevertEngineOverride(session: Session): Session {
  const meta = (session.transportMeta || {}) as Record<string, unknown>;
  const override = meta["engineOverride"] as Record<string, unknown> | undefined;
  if (!override) return session;

  const originalEngine = typeof override.originalEngine === "string" ? override.originalEngine : null;
  const originalEngineSessionId = typeof override.originalEngineSessionId === "string"
    ? override.originalEngineSessionId
    : null;
  const syncSince = typeof override.syncSince === "string" ? override.syncSince : null;
  const untilIso = typeof override.until === "string" ? override.until : null;
  if (!originalEngine || !untilIso) return session;

  const until = new Date(untilIso);
  if (Number.isNaN(until.getTime())) return session;
  if (until.getTime() > Date.now()) return session;

  const engineSessionsRaw = meta["engineSessions"];
  const engineSessions = (engineSessionsRaw && typeof engineSessionsRaw === "object" && !Array.isArray(engineSessionsRaw))
    ? { ...(engineSessionsRaw as Record<string, unknown>) }
    : {};

  if (session.engine && session.engineSessionId) {
    engineSessions[String(session.engine)] = session.engineSessionId;
  }

  const restoredSessionId = originalEngineSessionId
    ?? (typeof engineSessions[originalEngine] === "string" ? (engineSessions[originalEngine] as string) : null);

  const nextMeta = { ...meta, engineSessions } as Record<string, unknown>;
  if (originalEngine === "claude" && syncSince && session.engine !== "claude") {
    nextMeta["claudeSyncSince"] = syncSince;
  }
  delete (nextMeta as Record<string, unknown>)["engineOverride"];
  return updateSession(session.id, {
    engine: originalEngine,
    engineSessionId: restoredSessionId,
    transportMeta: nextMeta as any,
    lastError: null,
  }) ?? session;
}

export function dispatchWebSessionRun(
  session: Session,
  prompt: string,
  engine: Engine,
  config: JinnConfig,
  context: ApiContext,
  opts?: { delayMs?: number; queueItemId?: string; attachments?: string[] },
): void {
  const run = async () => {
    const sessionKey = session.sessionKey || session.sourceRef;
    try {
      await context.sessionManager.getQueue().enqueue(sessionKey, async () => {
        context.emit("session:started", { sessionId: session.id });
        if (opts?.queueItemId) context.emit("queue:updated", { sessionId: session.id, sessionKey });
        await runWebSession(session, prompt, engine, config, context, opts?.attachments);
      }, opts?.queueItemId);
    } finally {
      if (opts?.queueItemId) context.emit("queue:updated", { sessionId: session.id, sessionKey });
    }
  };

  const launch = () => {
    run().catch((err) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Web session ${session.id} dispatch error: ${errMsg}`);
      const erroredOnDispatch = updateSession(session.id, {
        status: "error",
        lastActivity: new Date().toISOString(),
        lastError: errMsg,
      });
      context.emit("session:completed", {
        sessionId: session.id,
        result: null,
        error: errMsg,
      });
      if (erroredOnDispatch) notifyAttachedTalkSessions(erroredOnDispatch, { error: errMsg });
      maybeEmitTalkGraph(session.id, "completed", { getSession, emit: context.emit });
    });
  };

  if (opts?.delayMs && opts.delayMs > 0) {
    setTimeout(launch, opts.delayMs);
  } else {
    launch();
  }
}

/** Resolve an array of file IDs to local filesystem paths for engine consumption. */
export function resolveAttachmentPaths(fileIds: unknown): string[] {
  if (!Array.isArray(fileIds)) return [];
  const paths: string[] = [];
  for (const id of fileIds) {
    if (typeof id !== "string" || !id.trim()) continue;
    const meta = getFile(id);
    if (!meta) {
      logger.warn(`Attachment file not found: ${id}`);
      continue;
    }
    const filePath = path.join(FILES_DIR, meta.id, meta.filename);
    if (fs.existsSync(filePath)) {
      paths.push(filePath);
    } else if (meta.path && fs.existsSync(meta.path)) {
      paths.push(meta.path);
    } else {
      logger.warn(`Attachment file missing on disk: ${id} (${meta.filename})`);
    }
  }
  return paths;
}
