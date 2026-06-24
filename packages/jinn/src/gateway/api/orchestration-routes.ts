import fs from "node:fs";
import { selectDualLaneWinner } from "../../orchestration/dual-lane.js";
import { listDualLaneManifests } from "../../orchestration/dual-lane-state.js";
import type { IncomingMessage as HttpRequest, ServerResponse } from "node:http";
import { listSessions, updateSession } from "../../sessions/registry.js";
import type { Session } from "../../shared/types.js";
import { parseLeaseTransportMeta } from "../../orchestration/lease-meta.js";
import { loadDefaultOrchestrationConfig, loadOrchestrationConfig } from "../../orchestration/config.js";
import { liveRunModeSchema, runOrchestrationTask } from "../../orchestration/run-mode.js";
import type { OrchestrationRuntime } from "../../orchestration/runtime.js";
import { formatZodError } from "../../orchestration/schemas.js";
import { PersistentMatrixScheduler } from "../../orchestration/persistent-scheduler.js";
import { OrchestrationStore } from "../../orchestration/store.js";
import { listRecoveryNotices } from "../../orchestration/store-recovery.js";
import { ORCH_DB, ORCH_RECOVERY_DIR } from "../../shared/paths.js";
import { readOrchestrationTelemetry, summarizeOrchestrationTelemetry } from "../../orchestration/telemetry.js";
import { listManagedWorktrees, resolveWorktreeOptions } from "../../orchestration/worktree.js";
import { readJsonBody } from "../http-helpers.js";
import type { ApiContext } from "./context.js";
import { json } from "./responses.js";
import { killSessionEngines } from "./session-dispatch.js";

const DASHBOARD_TELEMETRY_MAX_BYTES = 1_000_000;
const DASHBOARD_TELEMETRY_MAX_RECORDS = 5_000;

const ROUTES = new Set([
  "/api/orchestration/status",
  "/api/orchestration/workers",
  "/api/orchestration/leases",
  "/api/orchestration/queue",
  "/api/orchestration/allocations",
  "/api/orchestration/continuations",
  "/api/orchestration/telemetry/summary",
  "/api/orchestration/worktrees",
  "/api/orchestration/dual-lane",
  "/api/orchestration/queue/pause",
  "/api/orchestration/queue/resume",
  "/api/orchestration/leases/stop",
  "/api/orchestration/continuations/retry",
  "/api/orchestration/dual-lane/select",
  "/api/orchestration/run",
]);

export async function handleOrchestrationRoutes(
  method: string,
  pathname: string,
  res: ServerResponse,
  context: ApiContext,
  req?: HttpRequest,
): Promise<boolean> {
  if (!ROUTES.has(pathname)) return false;
  if (pathname === "/api/orchestration/queue/pause") {
    const runtime = requireLiveRuntime(method, res, context);
    if (!runtime) return true;
    const parsed = req ? await readJsonBody(req, res, { allowEmpty: true }) : { ok: true as const, body: null };
    if (!parsed.ok) return true;
    const body = parsed.body as { reason?: unknown } | null;
    json(res, { controlState: runtime.pauseQueue(typeof body?.reason === "string" ? body.reason : undefined) }, 200);
    return true;
  }
  if (pathname === "/api/orchestration/queue/resume") {
    const runtime = requireLiveRuntime(method, res, context);
    if (!runtime) return true;
    const result = await runtime.resumeQueue();
    json(res, { controlState: result.controlState, retried: result.retryResults.filter((entry) => entry.ok).length }, 202);
    return true;
  }
  if (pathname === "/api/orchestration/leases/stop") {
    const runtime = requireLiveRuntime(method, res, context);
    if (!runtime) return true;
    if (!req) {
      json(res, { error: "lease stop requires an HTTP request body" }, 400);
      return true;
    }
    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;
    const body = parsed.body as { leaseId?: unknown; reason?: unknown } | null;
    if (typeof body?.leaseId !== "string" || !body.leaseId.trim()) {
      json(res, { error: "leaseId is required" }, 400);
      return true;
    }
    jsonLeaseStop(res, context, runtime, body.leaseId, typeof body.reason === "string" ? body.reason : undefined);
    return true;
  }
  if (pathname === "/api/orchestration/dual-lane/select") {
    if (method !== "POST") {
      json(res, { error: "Method not allowed" }, 405);
      return true;
    }
    if (context.getConfig().orchestration?.enabled !== true) {
      json(res, { error: "orchestration is disabled" }, 409);
      return true;
    }
    if (!req) {
      json(res, { error: "dual-lane selection requires an HTTP request body" }, 400);
      return true;
    }
    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;
    const body = parsed.body as { taskId?: unknown; winnerLane?: unknown } | null;
    if (typeof body?.taskId !== "string" || typeof body?.winnerLane !== "string") {
      json(res, { error: "taskId and winnerLane are required" }, 400);
      return true;
    }
    const result = selectDualLaneWinner({ taskId: body.taskId, winnerLane: body.winnerLane });
    if (!result.ok) {
      json(res, { error: result.message }, result.reason === "not_found" ? 404 : 409);
      return true;
    }
    json(res, result, 200);
    return true;
  }
  if (pathname === "/api/orchestration/continuations/retry") {
    if (method !== "POST") {
      json(res, { error: "Method not allowed" }, 405);
      return true;
    }
    if (context.getConfig().orchestration?.enabled !== true) {
      json(res, { error: "orchestration is disabled" }, 409);
      return true;
    }
    const runtime = context.orchestration?.runtime;
    if (!runtime) {
      json(res, { error: "orchestration runtime is not enabled" }, 409);
      return true;
    }
    if (!req) {
      json(res, { error: "continuation retry requires an HTTP request body" }, 400);
      return true;
    }
    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;
    const body = parsed.body as { taskId?: unknown; coordinatorId?: unknown } | null;
    if (typeof body?.taskId !== "string" || typeof body?.coordinatorId !== "string") {
      json(res, { error: "taskId and coordinatorId are required" }, 400);
      return true;
    }
    const result = await runtime.retryFailedLiveContinuation(body.taskId, body.coordinatorId);
    if (!result.ok) {
      json(res, { error: result.message }, result.reason === "not_found" ? 404 : 409);
      return true;
    }
    json(res, result, result.state === "dispatching" ? 202 : 409);
    return true;
  }
  if (pathname === "/api/orchestration/run") {
    if (method !== "POST") {
      json(res, { error: "Method not allowed" }, 405);
      return true;
    }
    if (context.getConfig().orchestration?.enabled !== true) {
      json(res, { error: "orchestration is disabled" }, 409);
      return true;
    }
    if (!req) {
      json(res, { error: "orchestration run requires an HTTP request body" }, 400);
      return true;
    }
    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;
    const body = parsed.body as { mode?: unknown; task?: unknown } | null;
    try {
      const result = await runOrchestrationTask({
        context,
        mode: typeof body?.mode === "string" ? liveRunModeSchema.parse(body.mode) : undefined,
        task: body?.task,
      });
      json(res, result, result.ok || result.state === "failed" ? 200 : 409);
    } catch (err) {
      json(res, { error: "orchestration run failed", detail: formatZodError(err) }, 400);
    }
    return true;
  }
  if (method !== "GET") {
    json(res, { error: "Method not allowed" }, 405);
    return true;
  }

  try {
    const runtime = context.orchestration?.runtime;
    if (pathname === "/api/orchestration/status") {
      json(res, buildStatusPayload(context, runtime));
      return true;
    }
    if (pathname === "/api/orchestration/telemetry/summary") {
      const read = readOrchestrationTelemetry(context.orchestration?.telemetryLogPath, {
        maxBytes: DASHBOARD_TELEMETRY_MAX_BYTES,
        maxRecords: DASHBOARD_TELEMETRY_MAX_RECORDS,
      });
      json(res, {
        maxBytes: DASHBOARD_TELEMETRY_MAX_BYTES,
        maxRecords: DASHBOARD_TELEMETRY_MAX_RECORDS,
        summary: summarizeOrchestrationTelemetry(read),
      });
      return true;
    }
    if (pathname === "/api/orchestration/worktrees") {
      const root = context.orchestration?.worktreeRoot
        ?? runtime?.getWorktreeOptions().root
        ?? resolveWorktreeOptions(context.getConfig()).root;
      json(res, {
        root,
        worktrees: listManagedWorktrees(root).map((worktree) => ({
          taskId: worktree.taskId,
          lane: worktree.lane,
          path: worktree.path,
          baseCwd: worktree.baseCwd,
          gitRoot: worktree.gitRoot,
          branch: worktree.branch,
          createdAt: worktree.createdAt,
        })),
      });
      return true;
    }
    if (pathname === "/api/orchestration/dual-lane") {
      json(res, {
        manifests: listDualLaneManifests(context.orchestration?.dualLaneStateDir).map(summarizeDualLaneManifest),
      });
      return true;
    }
    if (runtime) {
      if (pathname === "/api/orchestration/workers") json(res, { workers: runtime.listWorkers() });
      else if (pathname === "/api/orchestration/leases") json(res, { leases: runtime.listLeases() });
      else if (pathname === "/api/orchestration/queue") json(res, { queue: runtime.listQueue() });
      else if (pathname === "/api/orchestration/continuations") json(res, { continuations: runtime.listLiveContinuations() });
      else json(res, { allocations: runtime.listAllocations() });
      return true;
    }

    const config = context.orchestration?.config
      ?? (context.orchestration?.configDir
        ? loadOrchestrationConfig(context.orchestration.configDir)
        : loadDefaultOrchestrationConfig());

    if (pathname === "/api/orchestration/workers") {
      json(res, { workers: config.workers });
      return true;
    }

    const dbPath = context.orchestration?.dbPath ?? ORCH_DB;
    if (dbPath !== ":memory:" && !fs.existsSync(dbPath)) {
      if (pathname === "/api/orchestration/leases") json(res, { leases: [] });
      else if (pathname === "/api/orchestration/queue") json(res, { queue: [] });
      else if (pathname === "/api/orchestration/continuations") json(res, { continuations: [] });
      else json(res, { allocations: [] });
      return true;
    }

    if (pathname === "/api/orchestration/continuations") {
      const store = OrchestrationStore.open(dbPath);
      try {
        json(res, { continuations: store.listLiveContinuations() });
      } finally {
        store.close();
      }
      return true;
    }

    const scheduler = PersistentMatrixScheduler.open(config, {
      dbPath,
      expireOnHydrate: false,
      now: context.orchestration?.now,
    });
    try {
      if (pathname === "/api/orchestration/leases") json(res, { leases: scheduler.listLeases() });
      else if (pathname === "/api/orchestration/queue") json(res, { queue: scheduler.listQueue() });
      else json(res, { allocations: scheduler.listAllocations() });
    } finally {
      scheduler.close();
    }
    return true;
  } catch (err) {
    json(res, { error: "orchestration observe failed", detail: err instanceof Error ? err.message : String(err) }, 500);
    return true;
  }
}

function buildStatusPayload(context: ApiContext, runtime: OrchestrationRuntime | undefined) {
  const enabled = context.getConfig().orchestration?.enabled === true;
  const controlState = runtime?.getControlState() ?? { queuePaused: false, pausedAt: null, pauseReason: null };
  const recoveryNotices = listRecoveryNotices(context.orchestration?.recoveryDir ?? ORCH_RECOVERY_DIR);
  const counts = runtime
    ? {
      workers: runtime.listWorkers().length,
      runningLeases: runtime.listLeases().filter((lease) => lease.state === "running").length,
      queueItems: runtime.listQueue().length,
      allocations: runtime.listAllocations().length,
      continuations: runtime.listLiveContinuations().length,
      activeWork: runtime.hasActiveWork(),
    }
    : {
      workers: context.orchestration?.config?.workers.length ?? 0,
      runningLeases: 0,
      queueItems: 0,
      allocations: 0,
      continuations: 0,
      activeWork: false,
    };
  return {
    enabled,
    runtimeBound: Boolean(runtime),
    degraded: enabled && !runtime,
    queuePaused: controlState.queuePaused,
    pausedAt: controlState.pausedAt,
    pauseReason: controlState.pauseReason,
    disabledReason: enabled ? null : "orchestration is disabled",
    degradedReason: enabled && !runtime ? "orchestration runtime is not bound; observe routes may use durable fallback state" : null,
    recoveryNotices,
    counts,
  };
}

function requireLiveRuntime(method: string, res: ServerResponse, context: ApiContext): OrchestrationRuntime | undefined {
  if (method !== "POST") {
    json(res, { error: "Method not allowed" }, 405);
    return undefined;
  }
  if (context.getConfig().orchestration?.enabled !== true) {
    json(res, { error: "orchestration is disabled" }, 409);
    return undefined;
  }
  const runtime = context.orchestration?.runtime;
  if (!runtime) {
    json(res, { error: "orchestration runtime is not enabled" }, 409);
    return undefined;
  }
  return runtime;
}

function jsonLeaseStop(
  res: ServerResponse,
  context: ApiContext,
  runtime: OrchestrationRuntime,
  leaseId: string,
  reason: string | undefined,
): void {
  const lease = runtime.listLeases().find((candidate) => candidate.leaseId === leaseId);
  if (!lease || lease.state !== "running") {
    json(res, { error: "running lease not found", leaseId }, lease ? 409 : 404);
    return;
  }
  const session = findSessionByLeaseId(leaseId);
  if (!session) {
    json(res, { error: "no session is mapped to this orchestration lease", leaseId }, 409);
    return;
  }
  const message = sanitizeStopReason(reason) ?? "Interrupted by orchestration lease stop";
  if (session.status !== "running") {
    const released = runtime.releaseLease(lease.leaseId, lease.coordinatorId);
    json(res, { status: "released_terminal_session", lease: released, sessionId: session.id }, 200);
    return;
  }
  const stopped = killSessionEngines(context, session, message);
  if (stopped.interruptible === 0 || stopped.killed === 0) {
    json(res, { error: "mapped session engine is not interruptible", leaseId, sessionId: session.id }, 409);
    return;
  }
  context.sessionManager.getQueue().clearQueue(session.sessionKey || session.sourceRef || session.id);
  updateSession(session.id, { status: "interrupted", lastActivity: new Date().toISOString(), lastError: message });
  context.emit("session:interrupted", { sessionId: session.id, reason: message });
  context.emit("session:updated", { sessionId: session.id });
  json(res, { status: "stop_requested", leaseId, sessionId: session.id, released: false, interruptible: true }, 202);
}

function findSessionByLeaseId(leaseId: string): Session | undefined {
  return listSessions().find((session) => parseLeaseTransportMeta(session.transportMeta)?.leaseId === leaseId);
}

function sanitizeStopReason(reason: string | undefined): string | null {
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  return trimmed ? trimmed.slice(0, 500) : null;
}

type DualLaneManifestSummaryInput = ReturnType<typeof listDualLaneManifests>[number];

function summarizeDualLaneManifest(manifest: DualLaneManifestSummaryInput) {
  return {
    taskId: manifest.taskId,
    coordinatorId: manifest.coordinatorId,
    state: manifest.state,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    baseCwd: manifest.baseCwd,
    selectedLane: manifest.selectedLane ?? null,
    archivedLane: manifest.archivedLane ?? null,
    lanes: manifest.lanes.map((lane) => ({
      id: lane.id,
      role: lane.role,
      family: lane.family,
      workerId: lane.workerId,
      leaseId: lane.leaseId,
      sessionId: lane.session.sessionId,
      sessionStatus: lane.session.status,
      sessionError: lane.session.error ?? null,
      worktreePath: lane.worktree.path,
      archive: lane.archive
        ? {
          diffPath: lane.archive.diffPath,
          metadataPath: lane.archive.metadataPath,
          archivedAt: lane.archive.archivedAt,
        }
        : null,
    })),
    comparisonReport: {
      taskId: manifest.comparisonReport.taskId,
      generatedAt: manifest.comparisonReport.generatedAt,
      laneSummaries: manifest.comparisonReport.laneSummaries.map((summary) => ({
        laneId: summary.laneId,
        changedFiles: summary.changedFiles,
        addedLines: summary.addedLines,
        removedLines: summary.removedLines,
        status: summary.status,
        error: summary.error,
      })),
      commonFiles: manifest.comparisonReport.commonFiles,
      uniqueFiles: manifest.comparisonReport.uniqueFiles,
      majorDifferences: manifest.comparisonReport.majorDifferences,
    },
  };
}
