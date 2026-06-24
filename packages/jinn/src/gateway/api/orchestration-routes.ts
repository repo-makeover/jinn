import fs from "node:fs";
import { selectDualLaneWinner } from "../../orchestration/dual-lane.js";
import { listDualLaneManifests } from "../../orchestration/dual-lane-state.js";
import type { IncomingMessage as HttpRequest, ServerResponse } from "node:http";
import { loadDefaultOrchestrationConfig, loadOrchestrationConfig } from "../../orchestration/config.js";
import { liveRunModeSchema, runOrchestrationTask } from "../../orchestration/run-mode.js";
import type { OrchestrationRuntime } from "../../orchestration/runtime.js";
import { formatZodError } from "../../orchestration/schemas.js";
import { PersistentMatrixScheduler } from "../../orchestration/persistent-scheduler.js";
import { OrchestrationStore } from "../../orchestration/store.js";
import { ORCH_DB } from "../../shared/paths.js";
import { readOrchestrationTelemetry, summarizeOrchestrationTelemetry } from "../../orchestration/telemetry.js";
import { listManagedWorktrees, resolveWorktreeOptions } from "../../orchestration/worktree.js";
import { readJsonBody } from "../http-helpers.js";
import type { ApiContext } from "./context.js";
import { json } from "./responses.js";

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
    disabledReason: enabled ? null : "orchestration is disabled",
    degradedReason: enabled && !runtime ? "orchestration runtime is not bound; observe routes may use durable fallback state" : null,
    counts,
  };
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
