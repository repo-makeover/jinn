import type { IncomingMessage as HttpRequest, ServerResponse } from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { CronJob, Engine, IncomingMessage, JinnConfig, JsonObject, Session, Target } from "../shared/types.js";
import { isInterruptibleEngine } from "../shared/types.js";
import { getModelRegistry, invalidateModelRegistry, refreshGrokModels, refreshPiModels } from "../shared/models.js";
import { applyEmployeeSessionDefaults, validateNewSessionSelection, validateSessionPatch, validateCwd } from "../sessions/session-patch.js";
import { getApproval, listApprovals, resolveApproval } from "./approvals.js";
import { listDirectory, FsBrowseError } from "./fs-browse.js";
import { safeWriteFile } from "../shared/safe-write.js";
import { listSessions, listRecentCwds, coercePortalEmployee, getSession, createSession, updateSession, patchSessionTransportMeta, UpdateSessionFields, deleteSession, deleteSessions, duplicateSession, insertMessage, deletePartialMessages, enqueueQueueItem, cancelQueueItem, getQueueItems, cancelAllPendingQueueItems, listAllPendingQueueItems, getFile, snapshotSessions, createArchive, listArchives, getArchive, deleteArchive } from "../sessions/registry.js";
import { forkEngineSession } from "../sessions/fork.js";
import { CONFIG_PATH, CRON_RUNS, ORG_DIR, SKILLS_DIR, LOGS_DIR, TMP_DIR } from "../shared/paths.js";
import { saveConfigAtomic, validateConfigShape } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { getSttStatus, downloadModel, transcribe as sttTranscribe, resolveLanguages, WHISPER_LANGUAGES } from "../stt/stt.js";
import { JINN_HOME } from "../shared/paths.js";
import { getClaudeExpectedResetAt } from "../shared/usageAwareness.js";
import { collectEngineLimits } from "../shared/engine-limits.js";
import { loadJobs, saveJobs } from "../cron/jobs.js";
import { reloadScheduler, startCronJobRun } from "../cron/scheduler.js";
import { buildCronJob, patchCronJob } from "../cron/validation.js";
import QRCode from "qrcode";
import { WhatsAppConnector } from "../connectors/whatsapp/index.js";
import { handleFilesRequest, handleSessionAttachment, fileIdsToMedia, rehomeAttachmentsToSession } from "./files.js";
import { readJsonBody, readBodyRaw } from "./http-helpers.js";
import { readJsonlTail } from "./jsonl-tail.js";
import { notifyParentSession, notifyAttachedTalkSessions } from "../sessions/callbacks.js";
import { loadInstances } from "../cli/instances.js";
import { handleHookPost, isLoopback } from "./hook-endpoint.js";
import { handleTalkApi } from "../talk/routes.js";
import { streamTtsSentences, ttsStatus, validateTtsText } from "../talk/tts-stream.js";
import { maybeEmitTalkGraph } from "../talk/graph.js";
import { onboardingNeeded, applyEngineChoice } from "./onboarding-policy.js";
import { sanitizeConfigForApi, deepMerge } from "./config-sanitize.js";
import type { ApiContext } from "./api/context.js";
import { handleSessionQueryRoutes } from "./api/session-query-routes.js";
import { handleStatusRoutes } from "./api/routes/status.js";
import { json, notFound, badRequest, serverError } from "./api/responses.js";
import { matchRoute } from "./api/match-route.js";
import { serializeSession } from "./api/serialize-session.js";
import {
  dispatchWebSessionRun,
  isArchiveKind,
  killSessionEngines,
  maybeRevertEngineOverride,
  resolveAttachmentPaths,
  resumePendingWebQueueItems,
  teardownAndDeleteSession,
} from "./api/session-dispatch.js";
// Compatibility facade: these moved to ./config-sanitize.js (AS-001 modularization);
// re-exported so existing importers of "./api.js" keep working.
export { isSensitiveConfigKey, sanitizeConfigForApi } from "./config-sanitize.js";
import { resolveUserHeader } from "./connector-reply.js";
// Compatibility facade: moved to ./connector-reply.js (AS-001 modularization).
export { resolveUserHeader, deliverConnectorReply } from "./connector-reply.js";
import { supersedeRunningTurn } from "./session-turn-state.js";
import { createPtyAccessToken } from "./auth.js";
import { writeMergedBoard } from "./board-service.js";
import { dispatchTicket } from "./ticket-dispatch.js";
export type { ApiContext } from "./api/context.js";
export { matchRoute } from "./api/match-route.js";
export { resumePendingWebQueueItems } from "./api/session-dispatch.js";
/** Max bytes accepted on /api/internal/hook (loopback-only relay payloads are tiny). */
const HOOK_BODY_MAX_BYTES = 64 * 1024;
const SESSION_LIST_PER_GROUP = 50;
type ResWithEncoding = ServerResponse & { __acceptEncoding?: string };

/**
 * GET /api/skills description cache, keyed by skill dir name and invalidated
 * by SKILL.md mtime (statSync is far cheaper than re-reading + re-parsing ~70
 * files per request). Mirrors the mtime-cache in talk/orchestrator-persona.ts.
 */
const skillDescriptionCache = new Map<string, { mtimeMs: number; description: string }>();

/** Extract a skill description from YAML frontmatter, ## Trigger section, or first paragraph. */
function parseSkillDescription(content: string): string {
  let description = "";
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const descMatch = frontmatterMatch[1].match(/^description:\s*(.+)$/m);
    if (descMatch) {
      description = descMatch[1].trim();
    }
  }
  if (!description) {
    const triggerMatch = content.match(/##\s*Trigger\s*\n+([^\n#]+)/);
    if (triggerMatch) {
      description = triggerMatch[1].trim();
    } else {
      // Use first non-heading, non-empty, non-frontmatter line
      const bodyContent = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
      const lines = bodyContent.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          description = trimmed;
          break;
        }
      }
    }
  }
  return description;
}

export async function handleApiRequest(
  req: HttpRequest,
  res: ServerResponse,
  context: ApiContext,
): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const method = req.method || "GET";
  // Stash so json() can compress large responses without threading req everywhere.
  (res as ResWithEncoding).__acceptEncoding = req.headers["accept-encoding"];

  try {
    if (await handleStatusRoutes(method, pathname, res, context)) return;

    // GET /api/archives — previous project summaries, newest first.
    if (method === "GET" && pathname === "/api/archives") {
      return json(res, listArchives());
    }

    // POST /api/archives — snapshot sessions into a read-only project archive,
    // then remove the live sessions through the same teardown path as DELETE.
    if (method === "POST" && pathname === "/api/archives") {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      const body = _parsed.body as Record<string, unknown> | null;
      if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest(res, "object body is required");
      if (!isArchiveKind(body.kind)) return badRequest(res, "kind must be one of: room, scheduled, chat");
      if (!Array.isArray(body.sessionIds) || body.sessionIds.length === 0) {
        return badRequest(res, "sessionIds array is required");
      }
      if (body.sessionIds.some((id) => typeof id !== "string" || !id.trim())) {
        return badRequest(res, "sessionIds must be non-empty strings");
      }
      if (body.label !== undefined && body.label !== null && typeof body.label !== "string") {
        return badRequest(res, "label must be a string");
      }
      if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
        return badRequest(res, "note must be a string");
      }
      if (body.sourceRef !== undefined && body.sourceRef !== null && typeof body.sourceRef !== "string") {
        return badRequest(res, "sourceRef must be a string");
      }

      const sessionIds = Array.from(new Set((body.sessionIds as string[]).map((id) => id.trim())));
      const snapshots = snapshotSessions(sessionIds);
      if (snapshots.length === 0) return badRequest(res, "no matching sessions to archive");

      const archive = createArchive({
        kind: body.kind,
        label: typeof body.label === "string" ? body.label.slice(0, 200) : null,
        note: typeof body.note === "string" ? body.note.slice(0, 5000) : null,
        sourceRef: typeof body.sourceRef === "string" ? body.sourceRef.slice(0, 500) : null,
        sessions: snapshots,
      });

      for (const snap of snapshots) {
        const session = getSession(snap.id);
        if (!session) continue;
        const deleted = teardownAndDeleteSession(context, session, "Interrupted: session archived");
        if (deleted) logger.info(`Archived and deleted session ${session.id} into archive ${archive.id}`);
      }
      context.emit("archive:created", { archive });
      return json(res, archive);
    }

    // GET /api/archives/:id — read-only archived project detail.
    let archiveParams = matchRoute("/api/archives/:id", pathname);
    if (method === "GET" && archiveParams) {
      const archive = getArchive(archiveParams.id);
      if (!archive) return notFound(res);
      return json(res, archive);
    }

    // DELETE /api/archives/:id — permanently remove an archive record only.
    archiveParams = matchRoute("/api/archives/:id", pathname);
    if (method === "DELETE" && archiveParams) {
      const deleted = deleteArchive(archiveParams.id);
      if (!deleted) return notFound(res);
      context.emit("archive:deleted", { archiveId: archiveParams.id });
      return json(res, { status: "deleted" });
    }
    if (await handleSessionQueryRoutes(method, pathname, url, res, context, SESSION_LIST_PER_GROUP)) return;

    // PUT|PATCH /api/sessions/:id — update title and/or mid-chat model/effort
    let params = matchRoute("/api/sessions/:id", pathname);
    if ((method === "PUT" || method === "PATCH") && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      const updates: UpdateSessionFields = {};
      if (body.title !== undefined) {
        if (typeof body.title !== "string") return badRequest(res, "title must be a string");
        const trimmed = body.title.trim();
        if (!trimmed) return badRequest(res, "title must not be empty");
        updates.title = trimmed.slice(0, 200);
      }
      // Mid-chat model / effort switch (applies from the next turn). Engine is
      // new-chat-only, so it's not mutable here. Validated against the registry.
      if (body.model !== undefined || body.effortLevel !== undefined) {
        const configForPatch = context.getConfig();
        const engineConfigForPatch =
          (configForPatch.engines as unknown as Record<string, { model?: string } | undefined>)[session.engine] ?? {};
        const patch = validateSessionPatch(configForPatch, session.engine, session.model, body, {
          engineSessionId: session.engineSessionId,
          defaultModel: engineConfigForPatch.model,
        });
        if (!patch.ok) return badRequest(res, patch.error || "invalid model/effort");
        if (patch.updates?.model !== undefined) updates.model = patch.updates.model;
        if (patch.updates?.effortLevel !== undefined) updates.effortLevel = patch.updates.effortLevel;
      }
      if (Object.keys(updates).length === 0) return badRequest(res, "no valid fields to update");
      const updated = updateSession(params.id, updates);
      if (!updated) return notFound(res);
      context.emit("session:updated", { sessionId: params.id });
      return json(res, serializeSession(updated, context));
    }

    // POST /api/sessions/:id/pty-token — mint a short-lived token bound to this
    // session id for /ws/pty/:id. The server-level auth gate has already
    // authenticated the browser/API caller before this handler runs.
    params = matchRoute("/api/sessions/:id/pty-token", pathname);
    if (method === "POST" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      if (!context.apiToken) return json(res, { error: "PTY auth unavailable" }, 503);
      const ptyEngine = context.ptyViewEngines?.[session.engine];
      if (!ptyEngine) return json(res, { error: "Session engine has no PTY view" }, 409);
      return json(res, { token: createPtyAccessToken(params.id, context.apiToken), expiresInMs: 60_000 });
    }

    // DELETE /api/sessions/:id
    params = matchRoute("/api/sessions/:id", pathname);
    if (method === "DELETE" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);

      // Tear down any live/warm engine processes for this session before deleting it.
      // kill() is safe to call unconditionally — it's a no-op when nothing is running.
      logger.info(`Killing engine process for deleted session ${params.id}`);
      const deleted = teardownAndDeleteSession(context, session, "Interrupted: session deleted");
      if (!deleted) return notFound(res);
      logger.info(`Session deleted: ${params.id}`);
      return json(res, { status: "deleted" });
    }

    // POST /api/sessions/:id/stop
    params = matchRoute("/api/sessions/:id/stop", pathname);
    if (method === "POST" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      const killResult = killSessionEngines(context, session, "Interrupted by user");
      context.sessionManager.getQueue().clearQueue(session.sessionKey || session.sourceRef || session.id);
      const stopped = killResult.interruptible > 0 || session.status !== "running";
      if (stopped) {
        updateSession(params.id, { status: "idle", lastActivity: new Date().toISOString(), lastError: null });
        context.emit("session:stopped", { sessionId: params.id });
      }
      return json(res, {
        status: stopped ? "stopped" : "not_stopped",
        stopped,
        interruptible: killResult.interruptible > 0,
        sessionId: params.id,
      }, stopped ? 200 : 409);
    }

    // POST /api/sessions/:id/reset — clear stuck session state (stale engine IDs, errors)
    params = matchRoute("/api/sessions/:id/reset", pathname);
    if (method === "POST" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      killSessionEngines(context, session, "Interrupted: session reset");
      context.sessionManager.getQueue().clearQueue(session.sessionKey || session.sourceRef || session.id);
      const meta = { ...(session.transportMeta || {}) } as Record<string, unknown>;
      delete meta["engineSessions"];
      delete meta["engineOverride"];
      updateSession(params.id, {
        status: "idle",
        engineSessionId: null,
        lastActivity: new Date().toISOString(),
        lastError: null,
        transportMeta: meta as any,
      });
      logger.info(`Session ${params.id} reset via API (cleared engineSessions, engineOverride, engineSessionId, lastError)`);
      context.emit("session:updated", { sessionId: params.id });
      return json(res, { status: "reset", sessionId: params.id });
    }

    // POST /api/sessions/:id/duplicate — duplicate a session (snapshot fork)
    params = matchRoute("/api/sessions/:id/duplicate", pathname);
    if (method === "POST" && params) {
      const source = getSession(params.id);
      if (!source) return notFound(res);
      if (!source.engineSessionId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session has no engine session ID — cannot duplicate" }));
        return;
      }

      let newSessionId: string | null = null;
      try {
        // 1. Duplicate session + messages in the registry
        const { session: newSession, messageCount } = duplicateSession(params.id);
        newSessionId = newSession.id;

        // 2. Fork the engine session (Claude/Codex). For Claude, route through
        //    the interactive PTY fork (no `-p`) so the duplicate bills as
        //    cc_entrypoint=cli rather than the de-subsidized Agent-SDK headless
        //    pool. Codex ignores the interactive ctx (it just copies the JSONL).
        const interactive = source.engine === "claude" && context.interactiveClaudeEngine
          ? {
              sourceJinnSessionId: params.id,
              engine: context.interactiveClaudeEngine,
              bin: context.getConfig().engines.claude.bin,
            }
          : undefined;
        const forkResult = await forkEngineSession(source.engine, source.engineSessionId, JINN_HOME, interactive);

        // 3. Store the new engine session ID
        updateSession(newSession.id, { engineSessionId: forkResult.engineSessionId });

        const result = getSession(newSession.id)!;
        logger.info(`Session duplicated: ${params.id} → ${newSession.id} (engine: ${forkResult.engineSessionId}, ${messageCount} messages)`);
        context.emit("session:created", { sessionId: newSession.id });
        return json(res, serializeSession(result, context));
      } catch (err: any) {
        // Clean up orphaned session if the engine fork failed after DB insert
        if (newSessionId) {
          try { deleteSession(newSessionId); } catch { /* best effort */ }
        }
        logger.error(`Failed to duplicate session ${params.id}: ${err.message}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Duplicate failed: ${err.message}` }));
        return;
      }
    }

    // DELETE /api/sessions/:id/queue/:itemId — cancel specific item
    const queueItemParams = matchRoute("/api/sessions/:id/queue/:itemId", pathname);
    if (method === "DELETE" && queueItemParams) {
      const session = getSession(queueItemParams.id);
      if (!session) return notFound(res);
      const cancelled = cancelQueueItem(queueItemParams.itemId);
      if (!cancelled) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Item not found or already running" }));
        return;
      }
      context.emit("queue:updated", { sessionId: queueItemParams.id, sessionKey: session.sessionKey });
      return json(res, { status: "cancelled", itemId: queueItemParams.itemId });
    }

    // DELETE /api/sessions/:id/queue — clear all pending
    params = matchRoute("/api/sessions/:id/queue", pathname);
    if (method === "DELETE" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      const sessionKey = session.sessionKey || session.sourceRef || session.id;
      const pendingBefore = getQueueItems(sessionKey).filter((item) => item.status === "pending").length;
      context.sessionManager.getQueue().clearQueue(sessionKey);
      const cancelled = cancelAllPendingQueueItems(sessionKey);
      context.emit("queue:updated", { sessionId: params.id, sessionKey, depth: 0 });
      const status =
        pendingBefore === 0 ? "empty" :
        cancelled < pendingBefore ? "partial" :
        "cleared";
      return json(res, { status, cancelled, requested: pendingBefore });
    }

    // POST /api/sessions/:id/queue/pause
    params = matchRoute("/api/sessions/:id/queue/pause", pathname);
    if (method === "POST" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      const sessionKey = session.sessionKey || session.sourceRef || session.id;
      context.sessionManager.getQueue().pauseQueue(sessionKey);
      context.emit("queue:updated", { sessionId: params.id, sessionKey, paused: true });
      return json(res, { status: "paused", sessionId: params.id });
    }

    // POST /api/sessions/:id/queue/resume
    params = matchRoute("/api/sessions/:id/queue/resume", pathname);
    if (method === "POST" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      const sessionKey = session.sessionKey || session.sourceRef || session.id;
      context.sessionManager.getQueue().resumeQueue(sessionKey);
      context.emit("queue:updated", { sessionId: params.id, sessionKey, paused: false });
      return json(res, { status: "resumed", sessionId: params.id });
    }

    // POST /api/sessions/bulk-delete
    if (method === "POST" && pathname === "/api/sessions/bulk-delete") {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      const ids: string[] = body.ids;
      if (!Array.isArray(ids) || ids.length === 0) return badRequest(res, "ids array is required");

      // Tear down any live/warm engine processes before deleting. kill() is safe
      // to call unconditionally — it's a no-op when nothing is running.
      for (const id of ids) {
        const session = getSession(id);
        if (!session) continue;
        killSessionEngines(context, session, "Interrupted: session deleted");
        context.sessionManager.getQueue().clearQueue(session.sessionKey || session.sourceRef || session.id);
      }

      for (const id of ids) {
        maybeEmitTalkGraph(id, "removed", { getSession, emit: context.emit });
      }
      const count = deleteSessions(ids);
      for (const id of ids) {
        context.emit("session:deleted", { sessionId: id });
      }
      logger.info(`Bulk deleted ${count} sessions`);
      return json(res, { status: "deleted", count });
    }

    // POST /api/sessions
    // ── Working folder: directory browser for the new-chat picker ──────────
    // GET /api/fs/list?path=<abs>  → { path, parent, entries:[{name,isDir}] }
    if (method === "GET" && pathname === "/api/fs/list") {
      const config = context.getConfig();
      const requested = url.searchParams.get("path") ?? undefined;
      const defaultDir = config.workspaces?.defaultCwd || JINN_HOME;
      try {
        return json(res, listDirectory(requested, { roots: config.workspaces?.roots, defaultDir }));
      } catch (err) {
        if (err instanceof FsBrowseError) return json(res, { error: err.message }, err.status);
        throw err;
      }
    }
    // GET /api/fs/recent → most-recently-used working dirs (MRU) for the picker.
    if (method === "GET" && pathname === "/api/fs/recent") {
      const config = context.getConfig();
      const defaultDir = config.workspaces?.defaultCwd || JINN_HOME;
      return json(res, { default: defaultDir, recent: listRecentCwds(8) });
    }

    // ── Feature 2: Unified work visibility ─────────────────────────────────
    // ── Feature 1: Approval queue ──────────────────────────────────────────
    // GET /api/approvals?state=pending|approved|rejected|all  (default pending)
    if (method === "GET" && pathname === "/api/approvals") {
      const stateParam = (url.searchParams.get("state") ?? "pending") as
        | "pending" | "approved" | "rejected" | "all";
      return json(res, listApprovals({ state: stateParam }));
    }
    // POST /api/approvals/:id/approve — approve a pending approval.
    let approvalParams = matchRoute("/api/approvals/:id/approve", pathname);
    if (method === "POST" && approvalParams) {
      const approval = getApproval(approvalParams.id);
      if (!approval) return notFound(res);
      if (approval.state !== "pending") return json(res, { error: `approval already ${approval.state}` }, 409);
      const config = context.getConfig();
      const actor = resolveUserHeader(req.headers, config.gateway.userHeader) ?? null;

      // Only `fallback` approvals carry a resume side-effect today. Other types
      // are accepted by the store generically and simply marked approved.
      if (approval.type !== "fallback") {
        const resolved = resolveApproval(approval.id, "approved", actor);
        context.emit("approval:resolved", { approvalId: resolved.id, sessionId: resolved.sessionId, state: "approved" });
        return json(res, { approval: resolved });
      }

      const session = getSession(approval.sessionId);
      if (!session) return notFound(res);
      const to = (approval.payload.to ?? {}) as { engine?: string; model?: string; effortLevel?: string | null };
      if (!to.engine) return badRequest(res, "approval payload missing target engine");
      const nextEngine = context.sessionManager.getEngine(to.engine);
      // Explicit 422 (never a silent no-op) when the fallback target engine is gone.
      if (!nextEngine) return json(res, { error: `fallback target engine '${to.engine}' is not available` }, 422);

      // Reuse the handoff packet written at ask_user time to build the resume prompt.
      const handoffPath = typeof approval.payload.handoffPath === "string" ? approval.payload.handoffPath : null;
      let handoffMd = "";
      if (handoffPath) {
        try { handoffMd = fs.readFileSync(path.join(JINN_HOME, handoffPath), "utf-8"); } catch { /* fall back to minimal prompt */ }
      }

      const prevMeta = (session.transportMeta ?? {}) as Record<string, unknown>;
      const prevFallback = (prevMeta.modelFallback ?? {}) as Record<string, unknown>;
      let rolled = updateSession(session.id, {
        engine: to.engine,
        model: to.model ?? session.model ?? undefined,
        effortLevel: (to.effortLevel ?? session.effortLevel) ?? undefined,
        engineSessionId: null,
        status: "running",
        lastActivity: new Date().toISOString(),
        lastError: null,
      }) ?? session;
      patchSessionTransportMeta(session.id, {
        modelFallback: { ...prevFallback, status: "running_on_fallback", approvedAt: new Date().toISOString() } as JsonObject,
      });
      rolled = getSession(session.id) ?? rolled;
      deletePartialMessages(session.id);
      const resolved = resolveApproval(approval.id, "approved", actor);
      insertMessage(session.id, "notification", `✅ Fallback approved → ${to.engine}/${to.model ?? "default"}. Resuming on fallback.`);
      context.emit("approval:resolved", { approvalId: resolved.id, sessionId: session.id, state: "approved" });
      context.emit("session:updated", { sessionId: session.id });

      const fallbackPrompt = handoffMd
        ? "You are taking over this task after a model fallback. Read the handoff packet below, preserve prior decisions and technical truth, then continue the original task.\n\n" + handoffMd
        : "Continue this conversation and respond to the last USER message after an operator-approved model fallback.";
      dispatchWebSessionRun(rolled, fallbackPrompt, nextEngine, config, context);
      return json(res, { approval: resolved, session: serializeSession(rolled, context) });
    }
    // POST /api/approvals/:id/reject — reject a pending approval; session surfaces as errored.
    approvalParams = matchRoute("/api/approvals/:id/reject", pathname);
    if (method === "POST" && approvalParams) {
      const approval = getApproval(approvalParams.id);
      if (!approval) return notFound(res);
      if (approval.state !== "pending") return json(res, { error: `approval already ${approval.state}` }, 409);
      const config = context.getConfig();
      const actor = resolveUserHeader(req.headers, config.gateway.userHeader) ?? null;
      const resolved = resolveApproval(approval.id, "rejected", actor);
      const session = getSession(approval.sessionId);
      if (session) {
        const prevMeta = (session.transportMeta ?? {}) as Record<string, unknown>;
        const prevFallback = (prevMeta.modelFallback ?? {}) as Record<string, unknown>;
        updateSession(session.id, {
          status: "error",
          lastError: "Model fallback rejected by operator",
          lastActivity: new Date().toISOString(),
        });
        patchSessionTransportMeta(session.id, {
          modelFallback: { ...prevFallback, status: "rejected", rejectedAt: new Date().toISOString() } as JsonObject,
        });
        insertMessage(session.id, "notification", "🚫 Model fallback rejected by operator. Session stopped — surfaced, not silently stalled.");
        context.emit("session:updated", { sessionId: session.id });
      }
      context.emit("approval:resolved", { approvalId: resolved.id, sessionId: approval.sessionId, state: "rejected" });
      return json(res, { approval: resolved });
    }

    if (method === "POST" && pathname === "/api/sessions") {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      const prompt = body.prompt || body.message;
      if (!prompt) return badRequest(res, "prompt or message is required");
      const config = context.getConfig();
      const requestedEmployee = coercePortalEmployee(body.employee, config.portal?.portalName);
      let employeeDefaults: import("../shared/types.js").Employee | undefined;
      if (requestedEmployee) {
        const { findEmployee, scanOrg } = await import("./org.js");
        employeeDefaults = findEmployee(requestedEmployee, scanOrg());
      }
      const selection = validateNewSessionSelection(config, applyEmployeeSessionDefaults({
        engine: body.engine,
        model: body.model,
        effortLevel: body.effortLevel,
      }, employeeDefaults));
      if (!selection.ok) return badRequest(res, selection.error || "invalid engine/model/effort");
      // Per-chat working folder (optional). Absent/empty → null → engine runs in
      // JINN_HOME (backward-compatible). Invalid/out-of-bounds → 400, never a
      // silent fallback (AGENTS.md). Validated against workspaces.roots if set.
      let cwd: string | null = null;
      if (body.cwd !== undefined && body.cwd !== null && body.cwd !== "") {
        const cwdResult = validateCwd(body.cwd, { roots: config.workspaces?.roots });
        if (!cwdResult.ok) return badRequest(res, cwdResult.error || "invalid cwd");
        cwd = cwdResult.cwd ?? null;
      }
      const engineName = selection.engine || config.engines.default;
      const sessionKey = `web:${Date.now()}`;
      // Opt-in SSO identity capture: when an auth proxy fronts the gateway and
      // `gateway.userHeader` is configured, persist the forwarded identity on the
      // session. Unset config → undefined → stored as NULL (single-user no-op).
      const userId = resolveUserHeader(req.headers, config.gateway.userHeader);
      const session = createSession({
        engine: engineName,
        source: "web",
        sourceRef: sessionKey,
        connector: "web",
        sessionKey,
        replyContext: { source: "web" },
        userId,
        // A session tagged with the portal name is a direct/COO session, not a
        // pseudo-employee (there is no org employee by the portal's name).
        // Coerce it to null so it buckets into the direct group rather than
        // spawning a phantom group that renders with the portal's own title.
        employee: requestedEmployee,
        parentSessionId: body.parentSessionId,
        effortLevel: selection.effortLevel,
        // Honor body.model so API clients can pin per-employee models
        // (e.g. MCP servers that look up org/<employee>.yaml and pass the
        // employee's configured model). Without this, runWebSession falls
        // back to config.engines.claude.model, breaking per-employee routing.
        // Fixes #38.
        model: selection.model,
        cwd,
        prompt,
        // Optional excerpt override (talk delegation passes the operator's
        // verbatim ask so list UIs don't show the scaffolded prompt).
        promptExcerpt: typeof body.promptExcerpt === "string" ? body.promptExcerpt : undefined,
        portalName: config.portal?.portalName,
      });
      logger.info(`Web session created: ${session.id} (model=${selection.model || "default"})`);
      // Voice mode: when the hands-free orchestrator (source:"talk") spawns a COO
      // child, tell the Talk UI which channel to animate to. Auto-derived here so
      // the orchestrator persona carries zero focus-signalling burden.
      if (session.parentSessionId) {
        const talkParent = getSession(session.parentSessionId);
        if (talkParent?.source === "talk") {
          const label = String(body.employee || prompt || "task").replace(/\s+/g, " ").trim().slice(0, 48);
          context.emit("talk:focus", { cooId: session.id, label, parentId: talkParent.id });
        }
      }
      maybeEmitTalkGraph(session.id, "added", { getSession, emit: context.emit });
      // First-message attachments were uploaded before the session existed (FILES_DIR).
      // Re-home them under uploads/<date>/<sessionId>/ now that we have an id, then persist
      // the media on the user message so the bubble renders chips/thumbnails on reload.
      rehomeAttachmentsToSession(body.attachments, session.id);
      const newSessionMedia = fileIdsToMedia(body.attachments);
      insertMessage(session.id, "user", prompt, newSessionMedia.length > 0 ? newSessionMedia : undefined);

      // Run engine asynchronously — respond immediately, push result via WebSocket.
      // CLI-mode session creation uses the engine's PTY view when one exists
      // (Claude, Antigravity). Engines without a PTY view fall back to normal chat.
      const ptyEngine = body.mode === "interactive" ? context.ptyViewEngines?.[engineName] : undefined;
      const engine = ptyEngine ?? context.sessionManager.getEngine(engineName);
      if (!engine) {
        updateSession(session.id, {
          status: "error",
          lastError: `Engine "${engineName}" not available`,
        });
        return json(res, { ...serializeSession({ ...session, status: "error", lastError: `Engine "${engineName}" not available` }, context) }, 201);
      }

      // Set status to "running" synchronously BEFORE returning the response.
      // This prevents a race condition where the caller polls immediately and
      // sees "idle" status before runWebSession has a chance to set "running".
      updateSession(session.id, {
        status: "running",
        lastActivity: new Date().toISOString(),
      });
      session.status = "running";

      const attachmentPaths = resolveAttachmentPaths(body.attachments);

      const queueSessionKey = session.sessionKey || session.sourceRef || session.id;
      const queueItemId = enqueueQueueItem(session.id, queueSessionKey, prompt);
      context.emit("queue:updated", { sessionId: session.id, sessionKey: queueSessionKey });

      dispatchWebSessionRun(session, prompt, engine, config, context, { queueItemId, attachments: attachmentPaths.length > 0 ? attachmentPaths : undefined });

      return json(res, serializeSession(session, context), 201);
    }

    // POST /api/sessions/:id/message
    params = matchRoute("/api/sessions/:id/message", pathname);
    if (method === "POST" && params) {
      const existingSession = getSession(params.id);
      if (!existingSession) return notFound(res);
      const session = maybeRevertEngineOverride(existingSession);
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      const prompt = body.message || body.prompt;
      if (!prompt) return badRequest(res, "message is required");

      // Voice mode: when the orchestrator CONTINUES an existing COO child (a
      // thread switch/reuse), re-signal focus so the Talk UI relights that
      // satellite + morphs the main orb to its channel — mirroring the
      // talk:focus emitted on new-session spawn in POST /api/sessions.
      if (session.parentSessionId) {
        const talkParent = getSession(session.parentSessionId);
        if (talkParent?.source === "talk") {
          context.emit("talk:focus", { cooId: session.id, label: session.title || "", parentId: talkParent.id });
        }
      }
      maybeEmitTalkGraph(session.id, "status", { getSession, emit: context.emit });

      // Allow internal callers (e.g. child session callbacks) to specify a non-user role
      const messageRole: string = body.role === "notification" ? "notification" : "user";
      const isNotification = messageRole === "notification";
      // Dual audience: the engine (e.g. the COO) runs on the full `prompt`, while the
      // web UI persists + shows a clean `displayMessage` banner. Falls back to `prompt`.
      const displayMessage: string =
        typeof body.displayMessage === "string" && body.displayMessage.trim()
          ? body.displayMessage
          : prompt;

      const config = context.getConfig();
      // CLI-mode sends route to the engine's PTY view when one exists so the
      // prompt/response are visible in xterm. Engines without a PTY view fall back.
      const ptyEngine = body.mode === "interactive" ? context.ptyViewEngines?.[session.engine] : undefined;
      const engine = ptyEngine ?? context.sessionManager.getEngine(session.engine);
      if (!engine) return serverError(res, `Engine "${session.engine}" not available`);

      // Only interrupt if a turn is actually in flight. With warm PTYs, isAlive is
      // also true for an idle-but-warm engine — isTurnRunning distinguishes them.
      // Headless engines lack isTurnRunning; their isAlive ≈ "turn running".
      const turnRunning = session.status === "running" && isInterruptibleEngine(engine)
        && ("isTurnRunning" in engine ? (engine as any).isTurnRunning(session.id) : engine.isAlive(session.id));
      const shouldInterruptRunningTurn =
        !isNotification &&
        (config.sessions?.interruptOnNewMessage ?? true) &&
        turnRunning;
      if (shouldInterruptRunningTurn) supersedeRunningTurn(session);

      // Persist the message immediately. For notifications, store the clean
      // human-facing `displayMessage` (what the UI banner renders) — the engine
      // still runs on the full `prompt` via the dispatch below.
      // For user messages, attach media (file IDs → descriptors) so the bubble
      // shows chips/thumbnails on reload — never the raw injected path text.
      const userMedia = isNotification ? [] : fileIdsToMedia(body.attachments);
      // Re-home any attachments uploaded without a sessionId (defensive; usually a no-op
      // since the web client now scopes uploads to the session).
      if (!isNotification) rehomeAttachmentsToSession(body.attachments, session.id);
      insertMessage(
        session.id,
        messageRole,
        isNotification ? displayMessage : prompt,
        userMedia.length > 0 ? userMedia : undefined,
      );
      // Push the banner live to any connected web client viewing the parent.
      if (isNotification) {
        context.emit("session:notification", { sessionId: session.id, message: displayMessage });
      }
      // Note: notification-role messages (e.g. child session callbacks) fall
      // through to enqueue + dispatch so the engine (e.g. the COO) actually
      // processes the notification and can respond — they do not return early.

      if (!isNotification && session.status === "waiting") {
        const expectedResetAt = getClaudeExpectedResetAt();
        const resumeText = expectedResetAt
          ? expectedResetAt.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
          : null;
        const queuedText =
          `⏳ Still paused due to Claude usage limit${resumeText ? ` (resets ${resumeText})` : ""}. Your message is queued and will run automatically.`;
        insertMessage(session.id, "notification", queuedText);
        context.emit("session:notification", { sessionId: session.id, message: queuedText });
      }

      // If a turn is already running, check whether we should interrupt or queue.
      // Notifications (child completion callbacks) should never interrupt — just queue.
      if (session.status === "running") {
        if (shouldInterruptRunningTurn) {
          logger.info(`Interrupting running session ${session.id} for new message`);
          engine.kill(session.id, "Interrupted: new message received");
          // SessionQueue serializes per-session; the new turn enqueued below will
          // wait for the killed run()'s promise to settle before starting.
          context.emit("session:interrupted", { sessionId: session.id, reason: "new message" });
        } else if (!isNotification) {
          context.emit("session:queued", { sessionId: session.id, message: prompt });
        }
      }

      // If session was interrupted by a restart, clear the error and resume
      if (session.status === "interrupted") {
        logger.info(`Resuming interrupted session ${session.id} (engineSessionId: ${session.engineSessionId})`);
        updateSession(session.id, {
          status: "running",
          lastActivity: new Date().toISOString(),
          lastError: null,
        });
        context.emit("session:resumed", { sessionId: session.id });
      }

      // Clear any pending cancellation so the new message runs normally.
      context.sessionManager.getQueue().clearCancelled(session.sessionKey || session.sourceRef || session.id);

      const attachmentPaths = resolveAttachmentPaths(body.attachments);

      const sessionKey = session.sessionKey || session.sourceRef || session.id;
      // Internal notification-role messages (child-completion callbacks) are
      // serialized via the in-memory queue but must NOT appear in the user's
      // queue panel — they already surface as banners. Only real user messages
      // get a visible queue item.
      let queueItemId: string | undefined;
      if (!isNotification) {
        queueItemId = enqueueQueueItem(session.id, sessionKey, prompt);
        context.emit("queue:updated", { sessionId: session.id, sessionKey });
      }

      dispatchWebSessionRun(session, prompt, engine, config, context, { queueItemId, attachments: attachmentPaths.length > 0 ? attachmentPaths : undefined });

      return json(res, { status: "queued", sessionId: session.id });
    }

    // POST /api/sessions/:id/attachments — running agent pushes a file/image into the chat.
    // Accepts multipart (file + optional text/caption) OR JSON ({path|content|url, filename?, text?}).
    // The file is stored under ~/.jinn/uploads/<date>/<sessionId>/ and surfaced as an assistant
    // message with rendered media (image/audio/file). Only the path/URL reaches the UI — never raw bytes in the prompt.
    params = matchRoute("/api/sessions/:id/attachments", pathname);
    if (method === "POST" && params) {
      const session = getSession(params.id);
      if (!session) return notFound(res);
      await handleSessionAttachment(req, res, params.id, context);
      return;
    }

    // GET /api/cron
    if (method === "GET" && pathname === "/api/cron") {
      const jobs = loadJobs();
      // Enrich with last run status — tail-read only the newest entry, the
      // run logs are append-only JSONL that grows forever.
      const enriched = await Promise.all(jobs.map(async (job) => {
        const runFile = path.join(CRON_RUNS, `${job.id}.jsonl`);
        const { entries } = await readJsonlTail(runFile, 1);
        return { ...job, lastRun: entries[0] ?? null };
      }));
      return json(res, enriched);
    }

    // GET /api/cron/:id/runs?limit=N — newest first (the UI shows "Recent Runs").
    // Run history is append-only JSONL that grows forever, so only the file's
    // tail is read; corrupt lines (crash mid-write) are skipped, not 500'd.
    params = matchRoute("/api/cron/:id/runs", pathname);
    if (method === "GET" && params) {
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "", 10) || 50));
      const runId = url.searchParams.get("runId");
      const runFile = path.join(CRON_RUNS, `${params.id}.jsonl`);
      const { entries, skipped } = await readJsonlTail(runFile, runId ? 500 : limit * 4);
      const seen = new Set<string>();
      const runs = [];
      for (const entry of entries as Record<string, unknown>[]) {
        const id = typeof entry.runId === "string" ? entry.runId : JSON.stringify(entry);
        if (runId && id !== runId) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        runs.push(entry);
        if (runs.length >= limit) break;
      }
      if (skipped) logger.warn(`GET /api/cron/${params.id}/runs: skipped ${skipped} corrupt line(s)`);
      return json(res, runs);
    }

    // POST /api/cron — create new cron job
    if (method === "POST" && pathname === "/api/cron") {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      const jobs = loadJobs();
      let newJob: CronJob;
      try {
        newJob = buildCronJob(_parsed.body);
      } catch (err) {
        return badRequest(res, err instanceof Error ? err.message : "Invalid cron job");
      }
      jobs.push(newJob);
      saveJobs(jobs);
      reloadScheduler(jobs, context.getConfig(), context.connectors);
      return json(res, newJob, 201);
    }

    // PUT /api/cron/:id
    params = matchRoute("/api/cron/:id", pathname);
    if (method === "PUT" && params) {
      const jobs = loadJobs();
      const idx = jobs.findIndex((j) => j.id === params!.id);
      if (idx === -1) return notFound(res);
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      try {
        jobs[idx] = { ...patchCronJob(jobs[idx], _parsed.body), id: params.id };
      } catch (err) {
        return badRequest(res, err instanceof Error ? err.message : "Invalid cron update");
      }
      saveJobs(jobs);
      reloadScheduler(jobs, context.getConfig(), context.connectors);
      return json(res, jobs[idx]);
    }

    // DELETE /api/cron/:id
    params = matchRoute("/api/cron/:id", pathname);
    if (method === "DELETE" && params) {
      const jobs = loadJobs();
      const idx = jobs.findIndex((j) => j.id === params!.id);
      if (idx === -1) return notFound(res);
      const removed = jobs.splice(idx, 1)[0];
      saveJobs(jobs);
      reloadScheduler(jobs, context.getConfig(), context.connectors);
      return json(res, { deleted: removed.id, name: removed.name });
    }

    // POST /api/cron/:id/trigger — manually run a cron job now
    params = matchRoute("/api/cron/:id/trigger", pathname);
    if (method === "POST" && params) {
      const jobs = loadJobs();
      const job = jobs.find((j) => j.id === params!.id);
      if (!job) return notFound(res);
      if (!job.enabled) {
        return json(res, { error: "Cron job is disabled", jobId: job.id, status: "disabled" }, 409);
      }

      logger.info(`Manual trigger for cron job "${job.name}" (${job.id})`);

      const started = startCronJobRun(job, context.sessionManager, context.getConfig(), context.connectors, "manual");
      if (!started.started) {
        return json(res, { error: "Cron job already running", jobId: job.id, status: started.run.status, runId: started.run.runId }, 409);
      }
      started.promise.catch((err) => logger.error(`Manual cron trigger failed for "${job.name}": ${err}`));

      return json(res, {
        status: "running",
        triggered: true,
        runId: started.runId,
        jobId: job.id,
        name: job.name,
        employee: job.employee,
        message: `Cron job "${job.name}" triggered manually`,
      }, 202);
    }

    // GET /api/org
    if (method === "GET" && pathname === "/api/org") {
      if (!fs.existsSync(ORG_DIR)) return json(res, { departments: [], employees: [], hierarchy: { root: null, sorted: [], warnings: [] } });
      const entries = fs.readdirSync(ORG_DIR, { withFileTypes: true });
      const departments = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

      const { scanOrg } = await import("./org.js");
      const { resolveOrgHierarchy } = await import("./org-hierarchy.js");
      const orgRegistry = scanOrg();
      const hierarchy = resolveOrgHierarchy(orgRegistry);

      const employees = hierarchy.sorted.map((name) => {
        const node = hierarchy.nodes[name];
        const emp = node.employee;
        const { persona, ...rest } = emp;
        return {
          ...rest,
          parentName: node.parentName,
          directReports: node.directReports,
          depth: node.depth,
          chain: node.chain,
        };
      });

      return json(res, {
        departments,
        employees,
        hierarchy: {
          root: hierarchy.root,
          sorted: hierarchy.sorted,
          warnings: hierarchy.warnings,
        },
      });
    }

    // GET /api/org/employees/:name
    params = matchRoute("/api/org/employees/:name", pathname);
    if (method === "GET" && params) {
      const { scanOrg } = await import("./org.js");
      const { resolveOrgHierarchy } = await import("./org-hierarchy.js");
      const orgRegistry = scanOrg();
      const emp = orgRegistry.get(params.name);
      if (!emp) return notFound(res);

      const hierarchy = resolveOrgHierarchy(orgRegistry);
      const node = hierarchy.nodes[params.name];

      return json(res, {
        ...emp,
        parentName: node?.parentName ?? null,
        directReports: node?.directReports ?? [],
        depth: node?.depth ?? 0,
        chain: node?.chain ?? [params.name],
      });
    }

    // PATCH /api/org/employees/:name — update employee fields (whitelisted, validated)
    params = matchRoute("/api/org/employees/:name", pathname);
    if (method === "PATCH" && params) {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      const body = _parsed.body as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return badRequest(res, "update body must be a JSON object");
      }
      const { scanOrg, updateEmployeeYaml, validateEmployeeUpdate } = await import("./org.js");
      const current = scanOrg().get(params.name);
      if (!current) return notFound(res);

      const result = validateEmployeeUpdate(context.getConfig(), current, body);
      if (!result.ok) return badRequest(res, result.error || "invalid update");

      const wrote = updateEmployeeYaml(params.name, result.updates!);
      if (!wrote) return notFound(res);

      // G1: synchronously refresh the in-memory registry (and drop warm PTYs) so an
      // immediate session spawn sees the new persona/model — don't wait for the watcher.
      context.reloadOrg?.();
      context.emit("org:updated", { employee: params.name });

      const updated = scanOrg().get(params.name);
      return json(res, { status: "ok", employee: updated ?? null });
    }

    // GET /api/org/departments/:name/board
    params = matchRoute("/api/org/departments/:name/board", pathname);
    if (method === "GET" && params) {
      const boardPath = path.join(ORG_DIR, params.name, "board.json");
      if (!fs.existsSync(boardPath)) return notFound(res);
      let board: unknown;
      try { board = JSON.parse(fs.readFileSync(boardPath, "utf-8")); }
      catch (err) {
        logger.warn(`GET /api/org/departments/${params.name}/board: corrupt board.json — ${err instanceof Error ? err.message : String(err)}`);
        return serverError(res, "board.json is corrupt");
      }
      return json(res, board);
    }

    // POST /api/org/departments/:name/tickets/:id/dispatch
    params = matchRoute("/api/org/departments/:name/tickets/:id/dispatch", pathname);
    if (method === "POST" && params) {
      const result = dispatchTicket(
        params.name,
        params.id,
        { source: "manual", routeToManager: false },
        { context, orgDir: ORG_DIR },
      );
      if (!result.ok) {
        if (result.reason === "no-assignee") return json(res, { reason: result.reason, error: "Assign someone first." }, 400);
        if (result.reason === "already-running") return json(res, { reason: result.reason, error: "Ticket already has a running session." }, 409);
        if (result.reason === "not-found") return notFound(res);
        return json(res, { reason: result.reason, error: result.reason }, 404);
      }
      return json(res, { status: "ok", sessionId: result.sessionId });
    }

    // PUT /api/org/departments/:name/board
    if (method === "PUT" && matchRoute("/api/org/departments/:name/board", pathname)) {
      const p = matchRoute("/api/org/departments/:name/board", pathname)!;
      const deptDir = path.join(ORG_DIR, p.name);
      if (!fs.existsSync(deptDir)) return notFound(res);
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      try {
        writeMergedBoard(ORG_DIR, p.name, _parsed.body);
      } catch (err) {
        logger.warn(`PUT /api/org/departments/${p.name}/board failed: ${err instanceof Error ? err.message : String(err)}`);
        return badRequest(res, err instanceof Error ? err.message : "Invalid board payload");
      }
      context.emit("board:updated", { department: p.name });
      return json(res, { status: "ok" });
    }

    // GET /api/skills
    if (method === "GET" && pathname === "/api/skills") {
      if (!fs.existsSync(SKILLS_DIR)) return json(res, []);
      const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
      const skills = entries.filter((e) => e.isDirectory()).map((e) => {
        const skillMdPath = path.join(SKILLS_DIR, e.name, "SKILL.md");
        const st = fs.statSync(skillMdPath, { throwIfNoEntry: false });
        if (!st) {
          skillDescriptionCache.delete(e.name);
          return { name: e.name, description: "" };
        }
        const hit = skillDescriptionCache.get(e.name);
        if (hit && hit.mtimeMs === st.mtimeMs) return { name: e.name, description: hit.description };
        const description = parseSkillDescription(fs.readFileSync(skillMdPath, "utf-8"));
        skillDescriptionCache.set(e.name, { mtimeMs: st.mtimeMs, description });
        return { name: e.name, description };
      });
      return json(res, skills);
    }

    // GET /api/skills/:name
    params = matchRoute("/api/skills/:name", pathname);
    if (method === "GET" && params) {
      const skillMd = path.join(SKILLS_DIR, params.name, "SKILL.md");
      if (!fs.existsSync(skillMd)) return notFound(res);
      const content = fs.readFileSync(skillMd, "utf-8");
      return json(res, { name: params.name, content });
    }

    // DELETE /api/skills/:name — remove a skill
    params = matchRoute("/api/skills/:name", pathname);
    if (method === "DELETE" && params) {
      const skillDir = path.join(SKILLS_DIR, params.name);
      if (!fs.existsSync(skillDir)) return notFound(res);
      fs.rmSync(skillDir, { recursive: true, force: true });
      const { removeFromManifest } = await import("../cli/skills.js");
      removeFromManifest(params.name);
      logger.info(`Skill removed via API: ${params.name}`);
      return json(res, { status: "removed", name: params.name });
    }

    // GET /api/engines — resolved model + capability registry (single source of truth
    // for the UI model/effort selectors). Synthesized from engines.<name>.model
    // when no `models:` block is configured.
    if (method === "GET" && pathname === "/api/engines") {
      const config = context.getConfig();
      const registry = getModelRegistry(config);
      return json(res, { default: config.engines.default, engines: registry });
    }

    // POST /api/engines/refresh — re-run dynamic model discovery and return the
    // rebuilt registry. Lets the UI pick up models added to dynamic CLIs without
    // restarting the gateway.
    if (method === "POST" && pathname === "/api/engines/refresh") {
      const config = context.getConfig();
      await refreshPiModels(config);
      await refreshGrokModels(config);
      context.emit("engines:updated", {});
      return json(res, { default: config.engines.default, engines: getModelRegistry(config) });
    }

    // GET /api/engine-limits — live/snapshot quota windows and static capability
    // metadata for each engine. Some CLIs expose full quota buckets (Codex), some
    // only expose session snapshots (Claude), and some expose no aggregate quota.
    if (method === "GET" && pathname === "/api/engine-limits") {
      const engine = url.searchParams.get("engine") || undefined;
      return json(res, await collectEngineLimits(context.getConfig(), { engine }));
    }

    // POST /api/engine-limits/refresh — currently identical to GET for live
    // sources. Kept as a command-shaped endpoint so the UI/CLI can request a
    // deliberate refresh without changing the public contract later.
    if (method === "POST" && pathname === "/api/engine-limits/refresh") {
      const engine = url.searchParams.get("engine") || undefined;
      return json(res, await collectEngineLimits(context.getConfig(), { engine }));
    }

    // GET /api/config
    if (method === "GET" && pathname === "/api/config") {
      const config = context.getConfig();
      return json(res, sanitizeConfigForApi(config));
    }

    // PUT /api/config
    if (method === "PUT" && pathname === "/api/config") {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      // Basic validation: must be a plain object
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return badRequest(res, "Config must be a JSON object");
      }
      // Validate known top-level keys
      // Keep this aligned with `JinnConfig` in src/shared/types.ts
      const KNOWN_KEYS = [
        "jinn",
        "gateway",
        "engines",
        "models",
        "connectors",
        "logging",
        "mcp",
        "sessions",
        "cron",
        "notifications",
        "portal",
        "context",
        "stt",
        "talk",
        "skills",
        "remotes",
      ];
      const unknownKeys = Object.keys(body).filter((k) => !KNOWN_KEYS.includes(k));
      if (unknownKeys.length > 0) {
        return badRequest(res, `Unknown config keys: ${unknownKeys.join(", ")}`);
      }
      // Validate critical field types
      if (body.gateway !== undefined) {
        if (typeof body.gateway !== "object" || Array.isArray(body.gateway)) {
          return badRequest(res, "gateway must be an object");
        }
        const KNOWN_GATEWAY_KEYS = [
          "port",
          "host",
          "streaming",
          "allowFileCustomPaths",
          "allowFileOpen",
          "fileReadRoots",
          "allowArbitraryFileRead",
          "exposeResolvedFilePaths",
          "userHeader",
        ];
        const unknownGatewayKeys = Object.keys(body.gateway).filter((k) => !KNOWN_GATEWAY_KEYS.includes(k));
        if (unknownGatewayKeys.length > 0) {
          return badRequest(res, `Unknown gateway config keys: ${unknownGatewayKeys.join(", ")}`);
        }
        if (body.gateway.port !== undefined && typeof body.gateway.port !== "number") {
          return badRequest(res, "gateway.port must be a number");
        }
      }
      if (body.engines !== undefined && (typeof body.engines !== "object" || Array.isArray(body.engines))) {
        return badRequest(res, "engines must be an object");
      }
      // Deep-merge incoming config with existing config to preserve
      // fields not included in the update (e.g. connector tokens).
      let existing: Record<string, unknown> = {};
      try {
        existing = yaml.load(fs.readFileSync(CONFIG_PATH, "utf-8")) as Record<string, unknown> || {};
      } catch { /* start fresh if unreadable */ }
      const merged = deepMerge(existing, body);
      const configProblems = validateConfigShape(merged);
      if (configProblems.length > 0) return badRequest(res, `Invalid config:\n- ${configProblems.join("\n- ")}`);
      saveConfigAtomic(merged);
      context.reloadConfig?.(); // refresh in-memory config now (don't wait on the watcher)
      invalidateModelRegistry(); // models/engines may have changed — rebuild on next read
      logger.info("Config updated via API");
      return json(res, { status: "ok" });
    }

    // GET /api/logs
    if (method === "GET" && pathname === "/api/logs") {
      const logFile = path.join(LOGS_DIR, "gateway.log");
      if (!fs.existsSync(logFile)) return json(res, { lines: [] });
      const n = parseInt(url.searchParams.get("n") || "100", 10);
      // Read only the last 64KB to avoid loading the entire file into memory
      const MAX_BYTES = 64 * 1024;
      const stat = fs.statSync(logFile);
      const readSize = Math.min(stat.size, MAX_BYTES);
      const fd = fs.openSync(logFile, "r");
      const buf = Buffer.alloc(readSize);
      fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
      fs.closeSync(fd);
      const allLines = buf.toString("utf-8").split("\n").filter(Boolean);
      const lines = allLines.slice(-n);
      return json(res, { lines });
    }

    // POST /api/connectors/reload — stop all instance connectors and restart from config
    if (method === "POST" && pathname === "/api/connectors/reload") {
      if (!context.reloadConnectorInstances) {
        return json(res, { error: "Connector reload not available" }, 501);
      }
      try {
        const result = await context.reloadConnectorInstances();
        context.emit("connectors:reloaded", result);
        return json(res, result);
      } catch (err) {
        return json(res, { error: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    // POST /api/connectors/:id/incoming — receive proxied Discord messages from primary instance
    // Supports both the legacy /api/connectors/discord/incoming and named instance ids
    params = matchRoute("/api/connectors/:id/incoming", pathname);
    if (method === "POST" && params && params.id) {
      // Try the exact instance id first, then fall back to "discord" for the legacy path
      const connector = context.connectors.get(params.id) ?? (params.id === "discord" ? context.connectors.get("discord") : undefined);
      if (!connector) return notFound(res);
      if (!("deliverMessage" in connector)) {
        return json(res, { error: "Discord connector is not in remote mode" }, 400);
      }

      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;

      // Download attachments from Discord CDN URLs to local temp
      const { downloadAttachment } = await import("../connectors/discord/format.js");
      const attachments = await Promise.all(
        (body.attachments || []).map(async (att: { name: string; url: string; mimeType: string }) => {
          if (att.url) {
            try {
              const localPath = await downloadAttachment(att.url, TMP_DIR, att.name);
              return { name: att.name, url: att.url, mimeType: att.mimeType, localPath };
            } catch {
              return { name: att.name, url: att.url, mimeType: att.mimeType };
            }
          }
          return att;
        }),
      );

      const incomingMsg: IncomingMessage = {
        connector: params.id,
        source: "discord",
        sessionKey: body.sessionKey,
        channel: body.channel,
        thread: body.thread,
        user: body.user,
        userId: body.userId,
        text: body.text,
        messageId: body.messageId,
        attachments,
        replyContext: body.replyContext || {},
        transportMeta: body.transportMeta,
        raw: body,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (connector as any).deliverMessage(incomingMsg);
      return json(res, { status: "delivered" });
    }

    // POST /api/connectors/:id/proxy — proxy connector operations from remote instances
    // Supports both the legacy /api/connectors/discord/proxy and named instance ids
    params = matchRoute("/api/connectors/:id/proxy", pathname);
    if (method === "POST" && params && params.id) {
      const connector = context.connectors.get(params.id) ?? (params.id === "discord" ? context.connectors.get("discord") : undefined);
      if (!connector) return notFound(res);

      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;

      const action = body.action as string;
      const target = body.target as Target | undefined;
      let messageId: string | undefined;

      switch (action) {
        case "sendMessage":
          if (!target || !body.text) return badRequest(res, "target and text are required");
          messageId = (await connector.sendMessage(target, body.text)) as string | undefined;
          break;
        case "replyMessage":
          if (!target || !body.text) return badRequest(res, "target and text are required");
          messageId = (await connector.replyMessage(target, body.text)) as string | undefined;
          break;
        case "editMessage":
          if (!target || !body.text) return badRequest(res, "target and text are required");
          await connector.editMessage(target, body.text);
          break;
        case "addReaction":
          if (!target || !body.emoji) return badRequest(res, "target and emoji are required");
          await connector.addReaction(target, body.emoji);
          break;
        case "removeReaction":
          if (!target || !body.emoji) return badRequest(res, "target and emoji are required");
          await connector.removeReaction(target, body.emoji);
          break;
        case "setTypingStatus":
          if (connector.setTypingStatus) {
            await connector.setTypingStatus(body.channelId ?? "", body.threadTs, body.status ?? "");
          }
          break;
        default:
          return badRequest(res, `Unknown proxy action: ${action}`);
      }

      return json(res, { status: "ok", messageId });
    }

    // POST /api/connectors/:name/send — send a message via a connector
    params = matchRoute("/api/connectors/:name/send", pathname);
    if (method === "POST" && params) {
      const connector = context.connectors.get(params.name);
      if (!connector) return notFound(res);
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      if (!body.channel || !body.text) return badRequest(res, "channel and text are required");
      await connector.sendMessage(
        { channel: body.channel, thread: body.thread },
        body.text,
      );
      return json(res, { status: "sent" });
    }

    // GET /api/connectors/whatsapp/qr — return current QR code as PNG data URL
    if (method === "GET" && pathname === "/api/connectors/whatsapp/qr") {
      const waConnector = context.connectors.get("whatsapp");
      if (!waConnector) return notFound(res);
      const qrString = (waConnector as WhatsAppConnector).getQrCode();
      if (!qrString) return json(res, { qr: null });
      const dataUrl = await QRCode.toDataURL(qrString, { width: 256, margin: 2 });
      return json(res, { qr: dataUrl });
    }

    // GET /api/connectors — list available connectors
    if (method === "GET" && pathname === "/api/connectors") {
      const connectors = Array.from(context.connectors.entries()).map(([instanceId, connector]) => ({
        name: connector.name,
        instanceId,
        employee: connector.getEmployee?.() ?? undefined,
        ...connector.getHealth(),
      }));
      return json(res, connectors);
    }

    // GET /api/onboarding — check if onboarding is needed
    if (method === "GET" && pathname === "/api/onboarding") {
      const sessions = listSessions();
      const hasEmployees = fs.existsSync(ORG_DIR) &&
        fs.readdirSync(ORG_DIR, { recursive: true }).some(
          (f) => String(f).endsWith(".yaml") && !String(f).endsWith("department.yaml")
        );
      const config = context.getConfig();
      const onboarded = config.portal?.onboarded === true;
      const setupComplete = config.portal?.setupComplete === true || onboarded;
      return json(res, {
        needed: onboardingNeeded(onboarded),
        onboarded,
        setupComplete,
        conversationNeeded: !setupComplete,
        sessionsCount: sessions.length,
        hasEmployees,
        portalName: config.portal?.portalName ?? null,
        operatorName: config.portal?.operatorName ?? null,
      });
    }

    // POST /api/onboarding — persist portal personalization
    if (method === "POST" && pathname === "/api/onboarding") {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      const { portalName, operatorName, language, engine, model, effortLevel } = body;

      // Read current config and merge engine choice + portal settings
      const config = context.getConfig();
      const updated = {
        ...applyEngineChoice(config, { engine, model, effortLevel }),
        portal: {
          ...config.portal,
          onboarded: true,
          setupComplete: true,
          ...(portalName !== undefined && { portalName: portalName || undefined }),
          ...(operatorName !== undefined && { operatorName: operatorName || undefined }),
          ...(language !== undefined && { language: language || undefined }),
        },
      };

      // Write updated config, then refresh the in-memory copy synchronously so
      // GET /api/onboarding reflects onboarded:true immediately (not after the
      // debounced file-watcher fires ~1s later).
      saveConfigAtomic(updated, { lineWidth: -1 });
      context.reloadConfig?.();
      logger.info(`Onboarding: portal name="${portalName}", operator="${operatorName}", language="${language}"`);

      const effectiveName = portalName || "Jinn";
      const languageSection = language && language !== "English"
        ? `\n\n## Language\nAlways respond in ${language}. All communication with the user must be in ${language}.`
        : "";

      // Personalize the operating manual with the chosen COO name + language.
      // The shipped identity line is bold, e.g.
      //   "You are **Jinn**, a personal AI assistant and COO of an AI organization."
      // (The previous CLAUDE.md regex expected unbolded "...the COO of the user's
      // AI organization." and never matched, so the rename silently no-op'd.)
      const personalizeManual = (filePath: string) => {
        let md = fs.readFileSync(filePath, "utf-8");
        // Replace just the bold name token; `[^*]+` supports multi-word names.
        md = md.replace(/^You are \*\*[^*]+\*\*/m, `You are **${effectiveName}**`);
        // Reset any prior language section, then append the new one if needed.
        md = md.replace(/\n\n## Language\nAlways respond in .+\. All communication with the user must be in .+\./m, "");
        if (languageSection) md = md.trimEnd() + languageSection + "\n";
        safeWriteFile(filePath, md); // atomic + fsync (persona/CLAUDE.md)
      };

      // CLAUDE.md is canonical. AGENTS.md is normally a symlink → CLAUDE.md, so we
      // edit CLAUDE.md directly and skip the symlink (avoids double-processing the
      // same file). Only the rare non-symlink fallback copy is personalized too.
      const claudeMdPath = path.join(JINN_HOME, "CLAUDE.md");
      if (fs.existsSync(claudeMdPath)) personalizeManual(claudeMdPath);

      const agentsMdPath = path.join(JINN_HOME, "AGENTS.md");
      if (fs.existsSync(agentsMdPath) && !fs.lstatSync(agentsMdPath).isSymbolicLink()) {
        personalizeManual(agentsMdPath);
      }

      context.emit("config:updated", { portal: updated.portal });
      return json(res, { status: "ok", portal: updated.portal });
    }

    // ── STT (Speech-to-Text) ──────────────────────────────────
    if (method === "GET" && pathname === "/api/stt/status") {
      const config = context.getConfig();
      const languages = resolveLanguages(config.stt);
      const status = getSttStatus(config.stt?.model, languages);
      return json(res, status);
    }

    if (method === "POST" && pathname === "/api/stt/download") {
      const config = context.getConfig();
      const model = config.stt?.model || "small";

      downloadModel(model, (progress) => {
        context.emit("stt:download:progress", { progress });
      }).then(() => {
        // Update config to mark STT as enabled
        try {
          const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
          const cfg = yaml.load(raw) as Record<string, unknown>;
          if (!cfg.stt || typeof cfg.stt !== "object") cfg.stt = {};
          const sttCfg = cfg.stt as Record<string, unknown>;
          sttCfg.enabled = true;
          sttCfg.model = model;
          if (!sttCfg.languages) sttCfg.languages = ["en"];
          saveConfigAtomic(cfg, { lineWidth: -1 });
        } catch (err) {
          logger.error(`Failed to update config after STT download: ${err}`);
        }
        context.emit("stt:download:complete", { model });
      }).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`STT download failed: ${msg}`);
        context.emit("stt:download:error", { error: msg });
      });

      return json(res, { status: "downloading", model });
    }

    if (method === "POST" && pathname === "/api/stt/transcribe") {
      const config = context.getConfig();
      const model = config.stt?.model || "small";
      const languages = resolveLanguages(config.stt);
      // Accept language from query param, fall back to first configured language
      const requestedLang = url.searchParams.get("language");
      const language = requestedLang && languages.includes(requestedLang) ? requestedLang : languages[0];

      const audioBuffer = await readBodyRaw(req);
      if (audioBuffer.length === 0) return badRequest(res, "No audio data");
      if (audioBuffer.length > 100 * 1024 * 1024) return badRequest(res, "Audio too large (100MB max)");

      const contentType = req.headers["content-type"] || "audio/webm";
      const ext = contentType.includes("wav") ? ".wav"
        : contentType.includes("mp4") || contentType.includes("m4a") ? ".m4a"
        : contentType.includes("ogg") ? ".ogg"
        : ".webm";

      const tmpFile = path.join(TMP_DIR, `stt-${crypto.randomUUID()}${ext}`);
      fs.mkdirSync(TMP_DIR, { recursive: true });
      // safeWrite EXCEPTION (intentional): single-use STT temp, read once by the
      // transcriber then unlinked. No durability/atomicity benefit.
      fs.writeFileSync(tmpFile, audioBuffer);

      try {
        const text = await sttTranscribe(tmpFile, model, language);
        return json(res, { text });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`STT transcription failed: ${msg}`);
        return serverError(res, `Transcription failed: ${msg}`);
      } finally {
        try { fs.unlinkSync(tmpFile); } catch {}
      }
    }

    if (method === "PUT" && pathname === "/api/stt/config") {
      const _parsed = await readJsonBody(req, res);
      if (!_parsed.ok) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = _parsed.body as any;
      const langs = body.languages;

      if (!Array.isArray(langs) || langs.length === 0) {
        return badRequest(res, "languages must be a non-empty array");
      }

      const invalid = langs.filter((l) => typeof l !== "string" || !WHISPER_LANGUAGES[l]);
      if (invalid.length > 0) {
        return badRequest(res, `Invalid language codes: ${invalid.join(", ")}`);
      }

      try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        const cfg = yaml.load(raw) as Record<string, unknown>;
        if (!cfg.stt || typeof cfg.stt !== "object") cfg.stt = {};
        const sttCfg = cfg.stt as Record<string, unknown>;
        sttCfg.languages = langs;
        // Remove deprecated language field if present
        delete sttCfg.language;
        saveConfigAtomic(cfg, { lineWidth: -1 });
        return json(res, { status: "ok", languages: langs });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return serverError(res, `Failed to update STT config: ${msg}`);
      }
    }

    // ── TTS (per-message read-aloud) ──────────────────────────
    // GET /api/tts — engine readiness so the client can pick Kokoro vs the
    // browser Web Speech fallback WITHOUT a failed POST. Reuses the shared Kokoro
    // engine (also driving the /talk voice loop); gated on weights + venv present.
    if (method === "GET" && pathname === "/api/tts") {
      const { available, voice } = ttsStatus(context.getConfig().talk?.kokoro);
      return json(res, { available, voice });
    }

    // POST /api/tts {text} — STREAM one length-prefixed WAV frame per sentence as
    // each is synthesized, so the client plays sentence 1 while 2..N are still
    // synthesizing (time-to-first-audio ≈ one sentence, not the whole message).
    // Frame = 4-byte big-endian length + WAV bytes. 503 {available:false} when
    // Kokoro can't run (client then falls back to browser Web Speech).
    if (method === "POST" && pathname === "/api/tts") {
      const kokoroOpts = context.getConfig().talk?.kokoro;
      if (!ttsStatus(kokoroOpts).available) {
        return json(res, { available: false }, 503);
      }
      const parsed = await readJsonBody(req, res);
      if (!parsed.ok) return;
      const valid = validateTtsText((parsed.body as { text?: unknown } | null)?.text);
      if (!valid.ok) return badRequest(res, valid.error);

      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no", // don't let a proxy buffer the stream
      });
      // A client abort (pause / navigate) closes the request → stop synthesizing
      // the rest of the message instead of wasting Kokoro on audio nobody hears.
      let cancelled = false;
      req.on("close", () => {
        cancelled = true;
      });
      try {
        await streamTtsSentences(
          valid.text,
          kokoroOpts,
          (wav) => {
            const header = Buffer.allocUnsafe(4);
            header.writeUInt32BE(wav.length, 0);
            res.write(header);
            res.write(wav);
          },
          () => cancelled || res.writableEnded,
        );
      } catch (err) {
        logger.warn(`TTS stream failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!res.writableEnded) res.end();
      return;
    }

    // ── Talk (/talk voice loop) ───────────────────────────────
    if (pathname.startsWith("/api/talk/")) {
      const handled = await handleTalkApi(req, res, context);
      if (handled) return;
    }

    // /api/files — file upload/download/management
    if (pathname.startsWith("/api/files")) {
      const handled = await handleFilesRequest(req, res, pathname, method, context);
      if (handled) return;
    }

    // POST /api/internal/hook — receive Claude Code turn hooks from the relay script
    if (method === "POST" && pathname === "/api/internal/hook") {
      if (!context.hookRegistry || !context.hookSecret) {
        return json(res, { error: "Interactive mode not active" }, 503);
      }
      // Loopback check FIRST — before reading the body — so a non-loopback
      // caller can't force unbounded body buffering by sending a huge POST.
      const remote = req.socket.remoteAddress;
      if (!isLoopback(remote)) {
        return json(res, { message: "forbidden" }, 403);
      }
      // Reject oversized bodies up front via Content-Length, then enforce
      // the cap mid-stream too in case the header was missing or lies.
      const contentLength = Number(req.headers["content-length"] ?? NaN);
      if (Number.isFinite(contentLength) && contentLength > HOOK_BODY_MAX_BYTES) {
        return json(res, { error: "Payload too large" }, 413);
      }
      const _parsed = await readJsonBody(req, res, { maxBytes: HOOK_BODY_MAX_BYTES });
      if (!_parsed.ok) return;
      const hookBody = _parsed.body as { jinnSessionId?: string; hook?: import("./hook-registry.js").HookPayload };
      const result = handleHookPost(
        { reg: context.hookRegistry, secret: context.hookSecret, remoteAddress: remote },
        req.headers["x-jinn-hook-secret"] as string | undefined,
        hookBody,
      );
      // Central engineSessionId capture: persist claude's OWN session id the moment
      // it reports one (SessionStart, or Stop as backup), independent of turn state.
      // Without this, an interrupted turn or an idle CLI-view spawn never persisted
      // the id, so the next cold respawn ran `claude` with resume:none → a fresh
      // conversation (the convo-wipe bug). Write-once guarded so it's not chatty.
      if (
        result.status === 200 &&
        hookBody.jinnSessionId &&
        (hookBody.hook?.hook_event_name === "SessionStart" || hookBody.hook?.hook_event_name === "Stop") &&
        typeof hookBody.hook?.session_id === "string" &&
        hookBody.hook.session_id
      ) {
        const existing = getSession(hookBody.jinnSessionId);
        if (existing && existing.engineSessionId !== hookBody.hook.session_id) {
          updateSession(hookBody.jinnSessionId, { engineSessionId: hookBody.hook.session_id });
        }
      }
      return json(res, { message: result.body }, result.status);
    }

    return notFound(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`API error: ${msg}`);
    return serverError(res, msg);
  }
}
