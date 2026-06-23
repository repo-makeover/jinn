import path from "node:path";
import type { Engine, JinnConfig, Session, StreamDelta } from "../shared/types.js";
import { isInterruptibleEngine } from "../shared/types.js";
import { rungKey } from "../shared/model-escalation.js";
import { resolveModelFallback } from "../shared/model-fallback.js";
import { recordEngineRateLimit } from "../shared/usage-status.js";
import { effortLevelsForModel, engineAvailable, isKnownEngine, engineUnavailableMessage } from "../shared/models.js";
import { createApproval } from "./approvals.js";
import { buildContext } from "../sessions/context.js";
import { listChildSessions, getSession, updateSession, patchSessionTransportMeta, insertMessage, insertPartialMessage, updatePartialMessage, deletePartialMessages, finalizePartialMessages, getMessages } from "../sessions/registry.js";
import { logger } from "../shared/logger.js";
import { JINN_HOME } from "../shared/paths.js";
import { resolveEffort } from "../shared/effort.js";
import { detectRateLimit } from "../shared/rateLimit.js";
import {
  handleRateLimit,
  rateLimitFallbackNotice,
  rateLimitSummary,
  rateLimitTimeoutError,
  rateLimitWaitingNotice,
} from "../sessions/rate-limit-handler.js";
import { notifyParentSession, notifyRateLimited, notifyRateLimitResumed, notifyDiscordChannel } from "../sessions/callbacks.js";
import { markTranscriptSyncedThrough } from "./external-turns.js";
import { getOrchestratorPersona } from "../talk/orchestrator-persona.js";
import { feedTalkText, flushTalkSpeech, discardTalkSpeech } from "../talk/tts-stream.js";
import { isTalkMuted } from "../talk/mute-state.js";
import { maybeEmitTalkGraph } from "../talk/graph.js";
import { createModelFallbackHandoff } from "./model-fallback.js";
import { deliverConnectorReply } from "./connector-reply.js";
import { isTurnSuperseded, clearSupersededTurnMeta } from "./session-turn-state.js";
import type { ApiContext } from "./api.js";

/**
 * Web/queue session execution orchestrator.
 *
 * Extracted verbatim from `api.ts` (audit AS-001) without behavior change. Owns
 * a single web/connector/cron/talk turn: engine resolution, context build,
 * streaming, partial-message persistence, rate-limit recovery / model fallback,
 * completion callbacks, and connector reply relay.
 */
export async function runWebSession(
  session: Session,
  prompt: string,
  engine: Engine,
  config: JinnConfig,
  context: ApiContext,
  attachments?: string[],
): Promise<void> {
  const currentSession = getSession(session.id);
  if (!currentSession) {
    logger.info(`Skipping deleted web session ${session.id} before run start`);
    return;
  }
  config = context.getConfig();
  const preferredPtyView = context.ptyViewEngines?.[session.engine] === engine;
  const runtimeEngine =
    (preferredPtyView ? context.ptyViewEngines?.[currentSession.engine] : undefined)
    ?? context.sessionManager.getEngine(currentSession.engine);
  if (!runtimeEngine) {
    const errMsg = `Engine "${currentSession.engine}" not available`;
    logger.error(`Web session ${currentSession.id} blocked: ${errMsg}`);
    insertMessage(currentSession.id, "assistant", `⛔ ${errMsg}`);
    const erroredSession = updateSession(currentSession.id, {
      status: "error",
      lastActivity: new Date().toISOString(),
      lastError: errMsg,
    });
    context.emit("session:completed", { sessionId: currentSession.id, result: null, error: errMsg });
    maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });
    if (erroredSession) notifyParentSession(erroredSession, { error: errMsg });
    return;
  }
  engine = runtimeEngine;
  logger.info(`Web session ${currentSession.id} running engine "${currentSession.engine}" (model: ${currentSession.model || "default"})`);

  // Ensure status is "running" (may already be set by the POST handler)
  const currentStatus = getSession(currentSession.id);
  if (currentStatus && currentStatus.status !== "running") {
    updateSession(currentSession.id, {
      status: "running",
      lastActivity: new Date().toISOString(),
    });
  }

  // If this session has an assigned employee, load their persona
  let employee: import("../shared/types.js").Employee | undefined;
  if (currentSession.employee) {
    const { findEmployee } = await import("./org.js");
    const { scanOrg } = await import("./org.js");
    const registry = scanOrg();
    employee = findEmployee(currentSession.employee, registry);
  }

  // Pre-flight: fail fast with an actionable error if the engine's CLI binary
  // isn't installed. Otherwise the (interactive PTY) engine spawns a missing
  // command, exits silently, and the turn produces no output and no error.
  // We surface it the way runWebSession reports errors and return normally
  // (throwing here would escape the queue task as an unhandled rejection).
  if (isKnownEngine(currentSession.engine) && !engineAvailable(config, currentSession.engine)) {
    const errMsg = engineUnavailableMessage(config, currentSession.engine);
    logger.error(`Web session ${currentSession.id} blocked: ${errMsg}`);
    insertMessage(currentSession.id, "assistant", `⛔ ${errMsg}`);
    const erroredSession = updateSession(currentSession.id, {
      status: "error",
      lastActivity: new Date().toISOString(),
      lastError: errMsg,
    });
    context.emit("session:completed", { sessionId: currentSession.id, result: null, error: errMsg });
    maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });
    // Wake the parent COO if this was a delegated child session (parity with
    // the normal error path; no-op for top-level sessions).
    if (erroredSession) {
      notifyParentSession(erroredSession, { error: errMsg }, { alwaysNotify: employee?.alwaysNotify });
    }
    return;
  }

  const { scanOrg: scanOrgForHierarchy } = await import("./org.js");
  const { resolveOrgHierarchy } = await import("./org-hierarchy.js");
  const orgHierarchy = resolveOrgHierarchy(scanOrgForHierarchy());

  try {

    const systemPrompt = buildContext({
      source: currentSession.source,
      channel: currentSession.sourceRef,
      user: currentSession.userId ?? "web-user",
      employee,
      connectors: Array.from(context.connectors.keys()),
      config,
      sessionId: currentSession.id,
      hierarchy: orgHierarchy,
      // Hands-free voice orchestrator: layer the AURA persona on top of the
      // base identity so it behaves as the thin voice layer above the COO.
      voicePersona: currentSession.source === "talk" ? getOrchestratorPersona() : undefined,
      talkThreads:
        currentSession.source === "talk"
          ? listChildSessions(currentSession.id).slice(0, 12).map((c) => ({
              id: c.id,
              label: c.title || "(untitled)",
              status: c.status,
              lastActivity: c.lastActivity,
            }))
          : undefined,
    });

    // Per-engine config is keyed by engine name; unconfigured optional engines
    // (antigravity/pi) resolve to {} so the engine falls back to dynamic bin/model
    // resolution. Adding an engine needs no change here.
    const engineConfig =
      (config.engines as unknown as Record<string, { bin?: string; model?: string; effortLevel?: string; childEffortOverride?: string } | undefined>)[
        currentSession.engine
      ] ?? {};
    const effortLevel = resolveEffort(
      engineConfig,
      currentSession,
      employee,
      effortLevelsForModel(config, currentSession.engine, currentSession.model ?? undefined),
    );

    // --- per-turn stall watchdog (#2) + bounded auto-recovery (#3) ---
    // The runHeartbeat below rewrites lastActivity every 5s for as long as
    // engine.run is pending, so a HUNG delegated turn never looks stale to the
    // status reconciler — it can wait forever. This watchdog is the deterministic
    // backstop the reconciler can't be: if the engine emits no stream activity for
    // `stallInactivityMs` (or the turn blows past the absolute `stallHardCeilingMs`),
    // we interrupt it. The first stall is retried in place (bounded); once retries
    // are exhausted the caller escalates to the parent instead of stranding a
    // half-dead turn for a human to find.
    const STALL_TICK_MS = 30_000;
    const gwCfg = (config as unknown as { gateway?: Record<string, unknown> }).gateway ?? {};
    const posNum = (v: unknown, fallback: number) => (typeof v === "number" && v > 0 ? v : fallback);
    const stallInactivityMs = posNum(gwCfg.turnStallInactivityMs, 8 * 60_000);
    const stallHardCeilingMs = posNum(gwCfg.turnStallCeilingMs, 45 * 60_000);
    const maxStallRetries =
      typeof gwCfg.turnStallRetries === "number" && gwCfg.turnStallRetries >= 0
        ? Math.floor(gwCfg.turnStallRetries)
        : 1;
    const killer = isInterruptibleEngine(engine) ? engine : null;
    const canKill = !!killer; // only engines we can interrupt get a watchdog
    let lastStreamAt = Date.now();

    // --- model escalation (#3) ---
    // In-place retry can't help when the MODEL/engine is the bottleneck (stalled
    // hard, or out of usage — e.g. a big job exhausting a small model). Escalation
    // moves the slice UP a capability ladder to a stronger model (often another
    // provider) and re-runs it, before escalating to a human:
    //   small (haiku/gemini-flash/qwen) → mid (gpt-5.4/sonnet) → large (gpt-5.5/opus).
    // Bounded by `sessions.maxModelEscalations` plus the tried-rungs set; the ladder
    // is overridable via `sessions.modelLadder`.
    const sessCfg = (config as unknown as { sessions?: Record<string, unknown> }).sessions ?? {};
    const maxEscalations = posNum(sessCfg.maxModelEscalations, 2);
    const customLadder = Array.isArray(sessCfg.modelLadder)
      ? (sessCfg.modelLadder as import("../shared/model-escalation.js").ModelLadder)
      : undefined;
    const attemptEscalation = async (trigger: "stall" | "usage", detail: string): Promise<boolean> => {
      const live = getSession(currentSession.id);
      if (!live) return false;
      const meta = (live.transportMeta ?? {}) as Record<string, unknown>;
      const prev = (meta.escalation && typeof meta.escalation === "object" ? meta.escalation : {}) as {
        count?: number; tried?: unknown; history?: unknown;
      };
      const count = typeof prev.count === "number" ? prev.count : 0;
      if (count >= maxEscalations) return false;
      const curModel = live.model ?? "";
      const tried = new Set<string>([
        ...(Array.isArray(prev.tried) ? (prev.tried as unknown[]).filter((x): x is string => typeof x === "string") : []),
        rungKey(live.engine, curModel),
      ]);
      const failureReason = trigger === "usage" ? "quota_exhausted" : "timeout";
      const fallbackDecision = resolveModelFallback({
        employee,
        config,
        failureReason,
        fromEngine: live.engine,
        fromModel: curModel || undefined,
        triedRungs: tried,
        ladder: customLadder,
        excludeEngines: trigger === "usage" ? new Set([live.engine]) : undefined,
        isAvailable: (e) => isKnownEngine(e) && !!context.sessionManager.getEngine(e) && engineAvailable(config, e),
      });
      if (!fallbackDecision.target) return false;
      const candidate = fallbackDecision.target;
      const handoff = createModelFallbackHandoff({
        session: live,
        employeeName: employee?.displayName ?? employee?.name ?? live.employee,
        fromEngine: live.engine,
        fromModel: curModel || null,
        target: candidate,
        failureReason,
        prompt,
        detail,
        recentMessages: getMessages(currentSession.id).slice(-20).map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
      });
      if (fallbackDecision.action === "ask_user") {
        const waitingMeta: Record<string, unknown> = {
          ...meta,
          modelFallback: {
            status: "approval_required",
            reason: failureReason,
            handoffPath: handoff.relativePath,
            from: { engine: live.engine, model: curModel || null },
            to: { engine: candidate.engine, model: candidate.model, effortLevel: candidate.effortLevel ?? null, source: candidate.source },
            createdAt: new Date().toISOString(),
          },
        };
        updateSession(currentSession.id, {
          status: "waiting",
          transportMeta: waitingMeta as any,
          lastActivity: new Date().toISOString(),
          lastError: "Model fallback approval required: " + live.engine + "/" + (curModel || "default") + " → " + candidate.engine + "/" + candidate.model,
        });
        insertMessage(currentSession.id, "notification", "🧭 Model fallback available: " + live.engine + "/" + (curModel || "default") + " → " + candidate.engine + "/" + candidate.model + ". Handoff: " + handoff.relativePath + ". Approval is required before switching.");
        context.emit("session:fallback-required", { sessionId: currentSession.id, handoffPath: handoff.relativePath, from: live.engine, to: candidate.engine, model: candidate.model, reason: failureReason });
        // Persist a first-class approval so the dashboard queue can surface it and
        // an operator can approve→resume. Deduped per session (createApproval).
        const approval = createApproval({
          sessionId: currentSession.id,
          type: "fallback",
          payload: {
            from: { engine: live.engine, model: curModel || null },
            to: { engine: candidate.engine, model: candidate.model, effortLevel: candidate.effortLevel ?? null, source: candidate.source },
            handoffPath: handoff.relativePath,
            reason: failureReason,
          },
        });
        context.emit("approval:created", { approvalId: approval.id, sessionId: currentSession.id, type: "fallback" });
        return true;
      }
      if (fallbackDecision.action !== "fallback") return false;
      const nextEngine = context.sessionManager.getEngine(candidate.engine);
      if (!nextEngine) return false;

      const nextMeta: Record<string, unknown> = {
        ...meta,
        escalation: {
          count: count + 1,
          tried: [...tried, rungKey(candidate.engine, candidate.model)],
          history: [
            ...(Array.isArray(prev.history) ? (prev.history as unknown[]) : []),
            { trigger, detail, from: { engine: live.engine, model: curModel || null }, to: { engine: candidate.engine, model: candidate.model }, via: candidate.via, source: candidate.source, handoffPath: handoff.relativePath },
          ],
        },
        modelFallback: {
          status: "running_on_fallback",
          reason: failureReason,
          handoffPath: handoff.relativePath,
          from: { engine: live.engine, model: curModel || null },
          to: { engine: candidate.engine, model: candidate.model, effortLevel: candidate.effortLevel ?? null, source: candidate.source },
          startedAt: new Date().toISOString(),
        },
      };
      const rolled = updateSession(currentSession.id, {
        engine: candidate.engine,
        model: candidate.model,
        effortLevel: candidate.effortLevel ?? live.effortLevel,
        engineSessionId: null,
        transportMeta: nextMeta as any,
        status: "running",
        lastActivity: new Date().toISOString(),
        lastError: "Fallback (" + trigger + "): " + live.engine + "/" + (curModel || "default") + " → " + candidate.engine + "/" + candidate.model,
      });
      deletePartialMessages(currentSession.id);
      logger.warn(
        "[model-fallback] session " + currentSession.id + " " + trigger + " (" + detail + ") — " +
          live.engine + "/" + (curModel || "default") + " → " + candidate.engine + "/" + candidate.model +
          " via " + candidate.source + "/" + candidate.via + " (fallback " + (count + 1) + "/" + maxEscalations + ", handoff " + handoff.relativePath + ")",
      );
      insertMessage(currentSession.id, "notification", "🔁 Model fallback: " + live.engine + "/" + (curModel || "default") + " → " + candidate.engine + "/" + candidate.model + ". Handoff: " + handoff.relativePath);
      try {
        context.emit("session:delta", {
          sessionId: currentSession.id,
          type: "text",
          content: "\n🔁 " + (live.employee ?? "worker") + " " + (trigger === "stall" ? "stalled" : "ran out of usage") + " on " + (curModel || live.engine) + "; continuing on fallback " + candidate.model + "…\n",
        });
      } catch { /* best effort */ }
      const fallbackPrompt = "You are taking over this task after a model fallback. Read the handoff packet below, preserve prior decisions and technical truth, then continue the original task.\n\n" + handoff.markdown;
      await runWebSession(rolled ?? getSession(currentSession.id)!, fallbackPrompt, nextEngine, config, context, attachments);
      return true;
    };

    let lastHeartbeatAt = 0;
    const runHeartbeat = setInterval(() => {
      // If the session was deleted mid-turn, stop heartbeating immediately —
      // the engine.run promise may still take minutes to resolve, and we don't
      // want to keep writing status:"running" rows for a session the user
      // already removed (and risk re-creating registry state in some paths).
      if (!getSession(currentSession.id)) {
        clearInterval(runHeartbeat);
        return;
      }
      updateSession(currentSession.id, {
        status: "running",
        lastActivity: new Date().toISOString(),
      });
    }, 5000);

    // Mid-turn persistence: mirror the live stream into `partial` DB rows so a
    // refresh restores in-progress blocks. Coalesced — text grows ONE row
    // (debounced, never per-token, so SQLite isn't hammered); each tool call is
    // its own row. All wiped + replaced by the single final message at turn end
    // (deletePartialMessages below). Only the primary engine stream is mirrored;
    // the rate-limit fallback stream stays WS-only (rare path).
    let partialSeq = 0;
    let curTextId: string | null = null; // the growing text-block row, null between blocks
    let curText = "";
    let lastToolId: string | null = null; // last tool row, for the tool_result → "Used" update
    let partialFlushTimer: ReturnType<typeof setTimeout> | null = null;
    const flushPartialText = () => {
      partialFlushTimer = null;
      if (!curText.trim()) return;
      if (curTextId) updatePartialMessage(curTextId, curText);
      else curTextId = insertPartialMessage(currentSession.id, "assistant", curText, partialSeq++);
    };
    const persistPartialDelta = (delta: StreamDelta) => {
      if (delta.type === "text" || delta.type === "text_snapshot") {
        if (typeof delta.content !== "string") return;
        if (delta.type === "text_snapshot") {
          if (delta.content.length > curText.length) curText = delta.content;
        } else {
          curText += delta.content;
        }
        if (!partialFlushTimer) partialFlushTimer = setTimeout(flushPartialText, 600);
      } else if (delta.type === "tool_use") {
        flushPartialText(); // finalize the text block before the tool
        if (partialFlushTimer) { clearTimeout(partialFlushTimer); partialFlushTimer = null; }
        const tool = delta.toolName || String(delta.content ?? "");
        lastToolId = insertPartialMessage(currentSession.id, "assistant", `Using ${tool}`, partialSeq++, tool);
        curTextId = null; curText = ""; // a fresh text block begins after the tool
      } else if (delta.type === "tool_result") {
        const tool = delta.toolName || String(delta.content ?? "");
        if (lastToolId) updatePartialMessage(lastToolId, `Used ${tool}`);
      }
    };

    const syncSinceIso = (currentSession.transportMeta as any)?.claudeSyncSince;
    const syncSinceMs = typeof syncSinceIso === "string" ? new Date(syncSinceIso).getTime() : NaN;
    const syncRequested = currentSession.engine === "claude" && typeof syncSinceIso === "string" && Number.isFinite(syncSinceMs);
    const promptToRun = syncRequested
      ? (() => {
        const sinceMessages = getMessages(currentSession.id)
          .filter((m) => (m.role === "user" || m.role === "assistant") && m.timestamp >= syncSinceMs)
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`);
        const transcript = sinceMessages.slice(-20).join("\n\n");
        return `We temporarily switched engines due to a usage limit on ${currentSession.engine}. Sync your context with this transcript (most recent last), then respond to the last USER message.\n\n${transcript}`;
      })()
      : prompt;

    const turnStartedAt = Date.now();
    let result!: Awaited<ReturnType<typeof engine.run>>;
    // Set by the watchdog when the FINAL attempt is killed for stalling; drives
    // the escalation branch after the loop. Null after a clean (or recovered) turn.
    let stalledReason: string | null = null;
    try {
    for (let stallAttempt = 0; ; stallAttempt++) {
      stalledReason = null;
      lastStreamAt = Date.now();
      const attemptStartedAt = Date.now();
      let stallKilled = false;
      let stallWatchdog: ReturnType<typeof setInterval> | null = null;
      stallWatchdog = canKill
        ? setInterval(() => {
            if (!getSession(currentSession.id)) { clearInterval(stallWatchdog!); return; }
            const idleMs = Date.now() - lastStreamAt;
            const totalMs = Date.now() - attemptStartedAt;
            if (idleMs >= stallInactivityMs || totalMs >= stallHardCeilingMs) {
              stalledReason =
                idleMs >= stallInactivityMs
                  ? `no engine activity for ${Math.round(idleMs / 1000)}s`
                  : `turn exceeded the ${Math.round(stallHardCeilingMs / 1000)}s ceiling`;
              stallKilled = true;
              clearInterval(stallWatchdog!);
              logger.warn(
                `[watchdog] web session ${currentSession.id} (${currentSession.engine}) stalled: ${stalledReason} ` +
                  `— interrupting${stallAttempt < maxStallRetries ? " and retrying" : ""}`,
              );
              // Interrupted-prefixed reason so the engine settles the run promise;
              // the stalledReason flag (not this text) is what routes escalation.
              killer?.kill(currentSession.id, `Interrupted: stalled — ${stalledReason}`);
            }
          }, STALL_TICK_MS)
        : null;
      try {
      result = await engine.run({
      prompt: promptToRun,
      resumeSessionId: currentSession.engineSessionId ?? undefined,
      systemPrompt,
      cwd: currentSession.cwd || JINN_HOME,
      bin: engineConfig.bin,
      model: currentSession.model ?? engineConfig.model,
      effortLevel,
      cliFlags: employee?.cliFlags,
      attachments: attachments?.length ? attachments : undefined,
      sessionId: currentSession.id,
      source: currentSession.source,
      // Any raw engine output (tool logs, progress, thinking) is proof-of-life:
      // bump the inactivity timer so long tool calls / thinking blocks — which emit
      // no parsed deltas — don't false-trip the stall watchdog.
      onActivity: () => { lastStreamAt = Date.now(); },
      onStream: (delta) => {
        // Same guard as runHeartbeat: a delta may arrive after the user
        // deleted the session; don't resurrect registry state for it.
        if (!getSession(currentSession.id)) return;
        // Live context-meter: message_start.usage arrives as a `context` delta
        // (once per assistant message — infrequent). Persist it immediately so the
        // meter ticks during the turn, not just at completion. The delta also flows
        // to the FE below for an instant in-pane update.
        if (delta.type === "context") {
          // Only the MAIN agent's stream reaches here (the proxy suppresses
          // sub-agent/auxiliary streams), so its usage drives the session meter.
          const ctx = Number(delta.content);
          if (Number.isFinite(ctx) && ctx > 0) {
            updateSession(currentSession.id, { lastContextTokens: ctx });
          }
        }
        const now = Date.now();
        lastStreamAt = now; // any delta is proof of life — feeds the stall watchdog
        if (now - lastHeartbeatAt >= 2000) {
          lastHeartbeatAt = now;
          updateSession(currentSession.id, {
            status: "running",
            lastActivity: new Date(now).toISOString(),
          });
        }
        try {
          context.emit("session:delta", {
            sessionId: currentSession.id,
            type: delta.type,
            content: delta.content,
            toolName: delta.toolName,
            toolId: delta.toolId,
            input: delta.input,
          });
        } catch (err) {
          logger.warn(`Failed to emit stream delta for session ${currentSession.id}: ${err instanceof Error ? err.message : err}`);
        }
        // Mirror the block into a persisted partial row (refresh survival). Guarded
        // so a DB hiccup never breaks the live stream above.
        try {
          persistPartialDelta(delta);
        } catch (err) {
          logger.warn(`Failed to persist partial block for session ${currentSession.id}: ${err instanceof Error ? err.message : err}`);
        }
        // Voice mode: stream the orchestrator's spoken text — complete sentences
        // synthesize immediately (per-sentence streaming); the flush at completion
        // speaks the remainder. Only `text` deltas are spoken; tool_use/context
        // are not. Skip entirely when the client is muted (silent/read mode) —
        // there's no point buffering or synthesizing audio the browser will discard.
        if (
          currentSession.source === "talk" &&
          !isTalkMuted(currentSession.id) &&
          delta.type === "text" &&
          typeof delta.content === "string"
        ) {
          feedTalkText(currentSession.id, delta.content, config.talk?.kokoro, context.emit);
        }
      },
      // A turn that settled as failed but whose CLI later finished delivers the
      // recovered text here. Append it and restore a clean idle status — unless
      // the session is gone or a NEW turn owns it (status back to "running").
      onLateRecovery: ({ result: lateText, sessionId: engineSid }) => {
        const live = getSession(currentSession.id);
        if (!live || live.status === "running") return;
        insertMessage(currentSession.id, "assistant", lateText);
        const recovered = updateSession(currentSession.id, {
          ...(engineSid.trim() ? { engineSessionId: engineSid } : {}),
          status: "idle",
          lastActivity: new Date().toISOString(),
          lastError: null,
        });
        // The parent/channel already saw this turn fail — label the late answer
        // so it reads as a supersede, not a fresh unprompted turn.
        const labelled = `(recovered — this supersedes the earlier reported failure)\n\n${lateText}`;
        if (recovered) {
          notifyParentSession(recovered, { result: labelled, error: null }, { alwaysNotify: employee?.alwaysNotify });
          void deliverConnectorReply(recovered, labelled, context.connectors);
        }
        context.emit("session:completed", {
          sessionId: currentSession.id,
          employee: currentSession.employee || config.portal?.portalName || "Jinn",
          title: currentSession.title,
          result: lateText,
          error: null,
        });
        logger.info(`Web session ${currentSession.id} recovered by late Stop after a failed turn`);
      },
      });
      } finally {
        if (stallWatchdog) clearInterval(stallWatchdog);
      }
      if (!stallKilled || stallAttempt >= maxStallRetries) break;
      // Bounded auto-recovery (#3): the slice stalled and retries remain. Drop the
      // killed attempt's partial rows and re-run the same turn in place. Only after
      // the budget is spent do we fall through to the escalation branch below.
      deletePartialMessages(currentSession.id);
      logger.warn(
        `[watchdog] web session ${currentSession.id} retrying after stall ` +
          `(attempt ${stallAttempt + 2}/${maxStallRetries + 1})`,
      );
    }
    } finally {
      clearInterval(runHeartbeat);
      // Stop any pending debounced text flush so it can't re-insert a partial row
      // after the turn-end cleanup below deletes them.
      if (partialFlushTimer) { clearTimeout(partialFlushTimer); partialFlushTimer = null; }
      flushPartialText();
    }

    if (!getSession(currentSession.id)) {
      logger.info(`Skipping completion for deleted web session ${currentSession.id}`);
      return;
    }

    // #2/#3: the final attempt stalled and bounded auto-recovery is spent. Escalate
    // as a real failure and WAKE THE PARENT so the director can reroute — rather
    // than letting the killed turn fall through as an "Interrupted" no-op (which
    // settles silently and strands the slice). The onLateRecovery hook still
    // supersedes this if a slow-but-alive engine finishes within its window.
    if (stalledReason) {
      // Before escalating to a human, try to escalate the slice to a stronger model.
      // A successful escalation re-dispatches and owns completion.
      if (await attemptEscalation("stall", stalledReason)) return;
      const attempts = maxStallRetries + 1;
      const errMsg =
        `Stalled: ${stalledReason}. Auto-recovery exhausted after ${attempts} ` +
        `attempt${attempts === 1 ? "" : "s"} and model escalation found no stronger model — needs attention.`;
      logger.error(`Web session ${currentSession.id} stalled out: ${errMsg}`);
      deletePartialMessages(currentSession.id);
      insertMessage(currentSession.id, "assistant", `⛔ ${errMsg}`);
      const stalledSession = updateSession(currentSession.id, {
        status: "error",
        lastActivity: new Date().toISOString(),
        lastError: errMsg,
      });
      context.emit("session:completed", { sessionId: currentSession.id, result: null, error: errMsg, stalled: true });
      maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });
      if (stalledSession) {
        notifyParentSession(stalledSession, { error: errMsg }, { alwaysNotify: employee?.alwaysNotify });
        void deliverConnectorReply(stalledSession, `⛔ ${errMsg}`, context.connectors);
      }
      return;
    }

    const wasInterrupted = result.error?.startsWith("Interrupted");
    const wasSuperseded = !wasInterrupted && isTurnSuperseded(currentSession.id, turnStartedAt);
    const quietPreempted = wasInterrupted || wasSuperseded;

    // Turn settled. Most engines replace live partials with a single final
    // assistant message. Antigravity's transcript is already interleaved text +
    // tool rows, so preserve those blocks when tool cards were streamed. If the
    // turn was preempted by a newer user message, drop stale partials/results so
    // the old assistant answer cannot land after the new user bubble.
    const streamedBlocks = getMessages(currentSession.id).filter((m) => m.partial);
    const preserveStreamedBlocks =
      !quietPreempted && currentSession.engine === "antigravity" && streamedBlocks.some((m) => !!m.toolCall);
    const resultAlreadyPersisted =
      preserveStreamedBlocks &&
      !!result.result?.trim() &&
      streamedBlocks.some((m) => !m.toolCall && m.content.trim() === result.result.trim());
    if (preserveStreamedBlocks) finalizePartialMessages(currentSession.id);
    else deletePartialMessages(currentSession.id);

    const rateLimit = !quietPreempted ? detectRateLimit(result) : { limited: false as const };

    if (rateLimit.limited) {
      // Record a deterministic per-engine reset clock — the provider's reset time if
      // it gave one, else a 3h fallback window — so the usage oracle and the
      // wait-until-reset recovery know when THIS engine frees up (for this turn's
      // recovery and for future preflight checks). See shared/usage-status.ts.
      recordEngineRateLimit(currentSession.engine, rateLimit.resetsAt);
      // Engine out of usage. Prefer escalating the slice to a STRONGER model on a
      // different provider over idling in the wait-and-retry loop (which can stall
      // for hours). Applies to all engines, including Claude. If no stronger model
      // is available, fall through to the existing rate-limit machinery below.
      if (await attemptEscalation("usage", "engine usage/quota limit")) {
        return;
      }
      // Drop any buffered voice text — we won't speak a rate-limited turn.
      if (currentSession.source === "talk") discardTalkSpeech(currentSession.id);
      const emitDelta = (delta: StreamDelta) => {
        context.emit("session:delta", {
          sessionId: currentSession.id,
          type: delta.type,
          content: delta.content,
          toolName: delta.toolName,
        });
      };

      const outcome = await handleRateLimit({
        session: currentSession,
        prompt,
        systemPrompt,
        engineConfig,
        effortLevel,
        cliFlags: employee?.cliFlags,
        attachments: attachments?.length ? attachments : undefined,
        config,
        engines: context.sessionManager.getEngines(),
        employee,
        engine,
        rateLimit,
        originalResult: result,
        hooks: {
          onFallbackStart: ({ resumeAt, originalEngine, fallbackName }) => {
            const resumeText = resumeAt
              ? resumeAt.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : null;
            const notificationText = rateLimitFallbackNotice(originalEngine, fallbackName, resumeText);
            insertMessage(currentSession.id, "notification", notificationText);

            notifyDiscordChannel(
              `⚠️ ${rateLimitSummary(originalEngine)} reached. Session ${currentSession.id}${currentSession.employee ? ` (${currentSession.employee})` : ""} switching to ${fallbackName}.`,
            );

            // Switching away from the source engine — drop any warm PTY AND its armed
            // late-recovery listener so the abandoned turn can't double-answer after
            // the fallback delivers.
            if (engine && isInterruptibleEngine(engine)) {
              engine.kill(currentSession.id, "Interrupted: engine switched");
            }
          },
          onFallbackStream: emitDelta,
          onFallbackComplete: (fallbackResult) => {
            if (fallbackResult.result) {
              insertMessage(currentSession.id, "assistant", fallbackResult.result);
            }

            const completedFallback = updateSession(currentSession.id, {
              engineSessionId: fallbackResult.sessionId,
              status: fallbackResult.error ? "error" : "idle",
              lastActivity: new Date().toISOString(),
              lastError: fallbackResult.error ?? null,
            });
            if (completedFallback) {
              notifyParentSession(completedFallback, { result: fallbackResult.result, error: fallbackResult.error ?? null, cost: fallbackResult.cost, durationMs: fallbackResult.durationMs }, { alwaysNotify: employee?.alwaysNotify });
              // Relay the fallback turn to the originating connector channel (#51).
              if (fallbackResult.result) void deliverConnectorReply(completedFallback, fallbackResult.result, context.connectors);
            }

            context.emit("session:completed", {
              sessionId: currentSession.id,
              employee: currentSession.employee || config.portal?.portalName || "Jinn",
              title: currentSession.title,
              result: fallbackResult.result,
              error: fallbackResult.error || null,
              cost: fallbackResult.cost,
              durationMs: fallbackResult.durationMs,
            });
            maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });
          },
          onWaitingStart: ({ resumeAt }) => {
            const resumeText = resumeAt
              ? resumeAt.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : null;
            const sourceEngine = currentSession.engine;

            // Send a deterministic Discord notification — does not depend on the LLM
            notifyDiscordChannel(
              `⚠️ ${rateLimitSummary(sourceEngine)} reached. Session ${currentSession.id}${currentSession.employee ? ` (${currentSession.employee})` : ""} paused${resumeText ? ` until ${resumeText}` : ""}.`,
            );

            const notificationText =
              rateLimitWaitingNotice(sourceEngine, resumeText);
            insertMessage(currentSession.id, "notification", notificationText);

            // Notify parent session about rate limit (fire-and-forget)
            const waitingSession = getSession(currentSession.id);
            notifyRateLimited(
              (waitingSession ?? { ...currentSession, status: "waiting" }) as Session,
              resumeAt
                ? resumeAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                : undefined,
            );

            context.emit("session:rate-limited", {
              sessionId: currentSession.id,
              employee: currentSession.employee,
              error: result.error,
              resetsAt: rateLimit.resetsAt ?? null,
            });
          },
          onRetryStream: emitDelta,
          onRetrySuccess: (retryResult) => {
            // Usage limit cleared — handle result
            if (retryResult.result) {
              insertMessage(currentSession.id, "assistant", retryResult.result);
            }
            const sourceEngine = currentSession.engine;

            const completedAfterRetry = updateSession(currentSession.id, {
              ...(retryResult.sessionId?.trim() ? { engineSessionId: retryResult.sessionId } : {}),
              status: retryResult.error ? "error" : "idle",
              lastActivity: new Date().toISOString(),
              lastError: retryResult.error ?? null,
            });

            if (completedAfterRetry) {
              notifyRateLimitResumed(completedAfterRetry);
              notifyDiscordChannel(
                `✅ ${rateLimitSummary(sourceEngine)} cleared. Session ${currentSession.id}${currentSession.employee ? ` (${currentSession.employee})` : ""} resumed.`,
              );
              notifyParentSession(completedAfterRetry, { result: retryResult.result, error: retryResult.error ?? null, cost: retryResult.cost, durationMs: retryResult.durationMs }, { alwaysNotify: employee?.alwaysNotify });
              // Relay the resumed (rate-limit-cleared) turn to the originating connector channel (#51).
              if (retryResult.result) void deliverConnectorReply(completedAfterRetry, retryResult.result, context.connectors);
            }

            context.emit("session:completed", {
              sessionId: currentSession.id,
              employee: currentSession.employee || config.portal?.portalName || "Jinn",
              title: currentSession.title,
              result: retryResult.result,
              error: retryResult.error || null,
              cost: retryResult.cost,
              durationMs: retryResult.durationMs,
            });
            maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });
          },
          onTimeout: () => {
            const sourceEngine = currentSession.engine;
            const timeoutError = rateLimitTimeoutError(sourceEngine);
            notifyDiscordChannel(
              `❌ ${timeoutError}. Session ${currentSession.id}${currentSession.employee ? ` (${currentSession.employee})` : ""} has been stopped.`,
            );
            const erroredSession = updateSession(currentSession.id, {
              status: "error",
              lastActivity: new Date().toISOString(),
              lastError: timeoutError,
            });
            if (erroredSession) {
              notifyParentSession(erroredSession, { error: timeoutError }, { alwaysNotify: employee?.alwaysNotify });
            }
            context.emit("session:completed", {
              sessionId: currentSession.id,
              result: null,
              error: timeoutError,
            });
            maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });
          },
        },
      });

      void outcome; // outcome handled entirely via hooks
      return;
    }

    // Persist the assistant response
    if (result.result && !resultAlreadyPersisted && !quietPreempted) {
      insertMessage(currentSession.id, "assistant", result.result);
    }

    // Voice mode: flush the remainder of the turn's spoken text (final chunk,
    // carries last:true). Fire-and-forget so completion isn't blocked on audio.
    // Discard (don't synthesize) on a half-finished interrupt OR when the client
    // is muted — the browser plays nothing in silent mode.
    if (currentSession.source === "talk") {
      if (quietPreempted || isTalkMuted(currentSession.id)) discardTalkSpeech(currentSession.id);
      else void flushTalkSpeech(currentSession.id, config.talk?.kokoro, context.emit);
    }

    const completedSession = updateSession(currentSession.id, {
      ...(result.sessionId?.trim() ? { engineSessionId: result.sessionId } : {}),
      ...(typeof result.contextTokens === "number" ? { lastContextTokens: result.contextTokens } : {}),
      // An interrupt (new message arrived / user stopped) is NOT an error — land idle
      // with no lastError, mirroring the connector path (manager.ts). Otherwise the
      // session would stick in "error" with a misleading "Interrupted" message and
      // fire a false parent-callback failure when the interrupt is the last action.
      status: quietPreempted ? "idle" : (result.error ? "error" : "idle"),
      lastActivity: new Date().toISOString(),
      lastError: quietPreempted ? null : (result.error ?? null),
    });
    if (!quietPreempted && currentSession.engine === "claude") {
      markTranscriptSyncedThrough(currentSession.id, result.sessionId);
    }
    if (syncRequested && !rateLimit.limited && !quietPreempted) {
      patchSessionTransportMeta(currentSession.id, (current) => {
        const nextMeta = { ...current } as Record<string, unknown>;
        delete nextMeta["claudeSyncSince"];
        return nextMeta as any;
      });
    }
    clearSupersededTurnMeta(currentSession.id);
    const reportedError = quietPreempted ? null : (result.error ?? null);
    if (completedSession && !quietPreempted) {
      notifyParentSession(completedSession, { result: result.result, error: reportedError, cost: result.cost, durationMs: result.durationMs }, { alwaysNotify: employee?.alwaysNotify });
    }

    // Relay the turn back to the originating connector channel (#51). Only
    // connector-sourced sessions reaching this path (parent callbacks, cron
    // follow-ups) deliver; web/talk/cron + interrupted turns no-op.
    if (completedSession && !quietPreempted && result.result) {
      await deliverConnectorReply(completedSession, result.result, context.connectors);
    }

    context.emit("session:completed", {
      sessionId: currentSession.id,
      employee: currentSession.employee || config.portal?.portalName || "Jinn",
      title: currentSession.title,
      result: quietPreempted ? null : result.result,
      error: reportedError,
      cost: result.cost,
      durationMs: result.durationMs,
    });
    maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });

    logger.info(
      `Web session ${currentSession.id} completed` +
      (result.durationMs ? ` in ${result.durationMs}ms` : "") +
      (result.cost ? ` ($${result.cost.toFixed(4)})` : ""),
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (!getSession(currentSession.id)) {
      logger.info(`Skipping error handling for deleted web session ${currentSession.id}: ${errMsg}`);
      return;
    }
    // The run threw — drop any orphaned mid-turn partial blocks.
    deletePartialMessages(currentSession.id);
    const erroredSession = updateSession(currentSession.id, {
      status: "error",
      lastActivity: new Date().toISOString(),
      lastError: errMsg,
    });
    if (erroredSession) {
      notifyParentSession(erroredSession, { error: errMsg }, { alwaysNotify: employee?.alwaysNotify });
    }
    context.emit("session:completed", {
      sessionId: currentSession.id,
      result: null,
      error: errMsg,
    });
    maybeEmitTalkGraph(currentSession.id, "completed", { getSession, emit: context.emit });
    logger.error(`Web session ${currentSession.id} error: ${errMsg}`);
  }
}
