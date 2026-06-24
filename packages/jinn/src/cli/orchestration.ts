import fs from "node:fs";
import yaml from "js-yaml";
import { formatZodError } from "../orchestration/schemas.js";
import { loadAllocationRequest, loadOrchestrationConfig, loadSimulationScenario } from "../orchestration/config.js";
import { loadCoordinatorTaskBrief, planCoordinatorAllocation } from "../orchestration/coordinator.js";
import { liveRunModeSchema } from "../orchestration/run-mode.js";
import { PersistentMatrixScheduler } from "../orchestration/persistent-scheduler.js";
import { MatrixScheduler, runSimulation } from "../orchestration/scheduler.js";
import {
  cleanupWorktreeByTaskLane,
  createImplementationWorktree,
  diffWorktreeByTaskLane,
  resolveTaskBaseCwd,
  resolveWorktreeOptions,
} from "../orchestration/worktree.js";
import { GATEWAY_INFO_FILE, ORCH_DB } from "../shared/paths.js";
import { loadConfig } from "../shared/config.js";
import { readGatewayInfo } from "../gateway/gateway-info.js";
import type { AllocationResult, Lease, OrchestrationConfig, QueueItem, SchedulerSnapshot, Worker } from "../orchestration/types.js";

export interface ConfigDirOptions {
  configDir: string;
  json?: boolean;
}

export interface SchedulerAllocateOptions extends ConfigDirOptions {
  dryRun?: boolean;
}

export interface OrchestrationStateOptions extends ConfigDirOptions {
  dbPath?: string;
}

export interface OrchestrationRunOptions {
  mode: string;
  task: string;
  json?: boolean;
}

export interface WorktreeCliOptions {
  lane?: string;
  json?: boolean;
}

function requireConfigDir(opts: ConfigDirOptions): string {
  if (!opts.configDir) throw new Error("--config-dir is required");
  return opts.configDir;
}

function loadConfigForCli(opts: ConfigDirOptions): OrchestrationConfig {
  try {
    return loadOrchestrationConfig(requireConfigDir(opts));
  } catch (err) {
    throw new Error(`invalid orchestration config: ${formatZodError(err)}`);
  }
}

function print(value: unknown, json?: boolean): void {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(String(value));
}

function formatWorkers(workers: Worker[]): string {
  const lines = ["Worker              Provider     Family       Tier        Cost       Concurrency  Workspace"];
  for (const worker of workers) {
    lines.push([
      worker.id.padEnd(19),
      worker.provider.padEnd(12),
      worker.family.padEnd(12),
      worker.tier.padEnd(11),
      worker.costClass.padEnd(10),
      String(worker.maxConcurrentTasks).padEnd(12),
      worker.workspacePolicy,
    ].join(" "));
  }
  return lines.join("\n");
}

function formatAllocationResult(result: AllocationResult): string {
  if (!result.ok) {
    const lines = [
      `Task ${result.queueItem.taskId} blocked_resource`,
      `Missing roles: ${result.queueItem.missingRoles.join(", ")}`,
      `Resume on: ${result.queueItem.resumeOn.join(", ")}`,
    ];
    lines.push(...formatReviewPolicy(result.reviewPolicy));
    return lines.join("\n");
  }
  const lines = [
    `Allocation ${result.allocation.allocationId}`,
    `Task: ${result.allocation.taskId}`,
    `Coordinator: ${result.allocation.coordinatorId}`,
  ];
  for (const lease of result.allocation.leases) {
    lines.push(`- ${lease.role}: ${lease.workerId} (${lease.leaseId}, expires ${lease.leaseExpiresAt})`);
  }
  if (result.allocation.optionalRolesSkipped.length > 0) {
    lines.push(`Optional roles skipped: ${result.allocation.optionalRolesSkipped.join(", ")}`);
  }
  lines.push(...formatReviewPolicy(result.reviewPolicy));
  return lines.join("\n");
}

function formatLeases(leases: Lease[]): string {
  if (leases.length === 0) return "No orchestration leases.";
  const lines = ["Lease               Worker              Role                 Task                State      Expires"];
  for (const lease of leases) {
    lines.push([
      lease.leaseId.padEnd(19),
      lease.workerId.padEnd(19),
      lease.role.padEnd(20),
      lease.taskId.padEnd(19),
      lease.state.padEnd(10),
      lease.leaseExpiresAt,
    ].join(" "));
  }
  return lines.join("\n");
}

function formatQueue(queue: QueueItem[]): string {
  if (queue.length === 0) return "No blocked orchestration queue items.";
  const lines = ["Task                Coordinator         Priority  Missing roles"];
  for (const item of queue) {
    lines.push([
      item.taskId.padEnd(19),
      item.coordinatorId.padEnd(19),
      item.priority.padEnd(9),
      item.missingRoles.join(", "),
    ].join(" "));
  }
  return lines.join("\n");
}

function formatRunResult(result: any): string {
  if (result?.ok === false) {
    const lines = [
      `Task ${result.queueItem?.taskId ?? "(unknown)"} blocked_resource`,
      `Missing roles: ${(result.queueItem?.missingRoles ?? []).join(", ")}`,
      `Resume on: ${(result.queueItem?.resumeOn ?? []).join(", ")}`,
    ];
    lines.push(...formatReviewPolicy(result?.reviewPolicy));
    return lines.join("\n");
  }
  const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
  const lines = [
    `Orchestration run ${result?.state ?? "completed"}`,
    `Mode: ${result?.mode ?? "(unknown)"}`,
    `Allocation: ${result?.allocation?.allocationId ?? "(unknown)"}`,
  ];
  for (const session of sessions) {
    lines.push(`- ${session.role}: ${session.workerId} (${session.sessionId}) ${session.status}${session.error ? `: ${session.error}` : ""}`);
  }
  lines.push(...formatReviewPolicy(result?.reviewPolicy));
  return lines.join("\n");
}

function formatReviewPolicy(reviewPolicy: any): string[] {
  const explanations = Array.isArray(reviewPolicy?.explanations) ? reviewPolicy.explanations : [];
  if (explanations.length === 0) return [];
  return explanations.map((entry: any) => {
    const decision = typeof entry?.decision === "string" ? entry.decision : "unknown";
    const detail = typeof entry?.detail === "string" ? entry.detail : "review policy decision recorded";
    return `Review policy: ${decision} - ${detail}`;
  });
}

function readTaskYaml(filePath: string): unknown {
  try {
    return yaml.load(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`failed to read ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function readTaskIdentity(filePath: string): { taskId: string; cwd?: string } {
  const raw = readTaskYaml(filePath);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`invalid worktree task file: ${filePath}`);
  const task = raw as Record<string, unknown>;
  if (typeof task.taskId !== "string" || !task.taskId.trim()) throw new Error("worktree task file must include taskId");
  if (task.cwd !== undefined && typeof task.cwd !== "string") throw new Error("worktree task cwd must be a string when provided");
  return { taskId: task.taskId, cwd: task.cwd };
}

function readSnapshotIfPresent(config: OrchestrationConfig, opts: OrchestrationStateOptions): SchedulerSnapshot | undefined {
  const dbPath = opts.dbPath ?? ORCH_DB;
  if (dbPath !== ":memory:" && !fs.existsSync(dbPath)) return undefined;
  const scheduler = PersistentMatrixScheduler.open(config, { dbPath, expireOnHydrate: false });
  try {
    return scheduler.createSnapshot();
  } finally {
    scheduler.close();
  }
}

function readState<T>(config: OrchestrationConfig, opts: OrchestrationStateOptions, read: (scheduler: PersistentMatrixScheduler) => T, empty: T): T {
  const dbPath = opts.dbPath ?? ORCH_DB;
  if (dbPath !== ":memory:" && !fs.existsSync(dbPath)) return empty;
  const scheduler = PersistentMatrixScheduler.open(config, { dbPath, expireOnHydrate: false });
  try {
    return read(scheduler);
  } finally {
    scheduler.close();
  }
}

export async function runWorkersList(opts: ConfigDirOptions): Promise<void> {
  const config = loadConfigForCli(opts);
  print(opts.json ? { workers: config.workers } : formatWorkers(config.workers), opts.json);
}

export async function runLeasesList(opts: OrchestrationStateOptions): Promise<void> {
  const config = loadConfigForCli(opts);
  const leases = readState(config, opts, (scheduler) => scheduler.listLeases(), []);
  print(opts.json ? { leases } : formatLeases(leases), opts.json);
}

export async function runQueueList(opts: OrchestrationStateOptions): Promise<void> {
  const config = loadConfigForCli(opts);
  const queue = readState(config, opts, (scheduler) => scheduler.listQueue(), []);
  print(opts.json ? { queue } : formatQueue(queue), opts.json);
}

export async function runSchedulerAllocate(taskFile: string, opts: SchedulerAllocateOptions): Promise<void> {
  if (!opts.dryRun) throw new Error("scheduler allocate is inert in this slice; pass --dry-run");
  const config = loadConfigForCli(opts);
  const request = loadAllocationRequest(taskFile, config);
  const scheduler = new MatrixScheduler(config);
  const result = scheduler.requestAllocation(request);
  print(opts.json ? result : formatAllocationResult(result), opts.json);
}

export async function runSchedulerPlan(taskFile: string, opts: OrchestrationStateOptions): Promise<void> {
  const config = loadConfigForCli(opts);
  const brief = loadCoordinatorTaskBrief(taskFile, config);
  const snapshot = readSnapshotIfPresent(config, opts);
  const plan = planCoordinatorAllocation(brief, config, { snapshot });
  print(opts.json ? plan : formatAllocationResult(plan.result), opts.json);
}

export async function runSchedulerSimulate(scenarioFile: string, opts: ConfigDirOptions): Promise<void> {
  const config = loadConfigForCli(opts);
  const scenario = loadSimulationScenario(scenarioFile, config);
  const scheduler = new MatrixScheduler(config);
  const steps = runSimulation(scheduler, scenario.steps);
  const result = {
    name: scenario.name,
    steps,
    leases: scheduler.listLeases(),
    queue: scheduler.listQueue(),
  };
  print(opts.json ? result : JSON.stringify(result, null, 2), opts.json);
}

export async function runOrchestrationRun(opts: OrchestrationRunOptions): Promise<void> {
  const mode = liveRunModeSchema.parse(opts.mode);
  const task = readTaskYaml(opts.task);
  const config = loadConfig();
  const gateway = readGatewayInfo(GATEWAY_INFO_FILE);
  if (!gateway?.apiToken) throw new Error("gateway is not running or gateway token is unavailable");

  const res = await fetch(`http://${config.gateway.host}:${gateway.port || config.gateway.port}/api/orchestration/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${gateway.apiToken}`,
    },
    body: JSON.stringify({ mode, task }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok && res.status !== 409) {
    const detail = body && typeof body === "object" && "detail" in body ? `: ${(body as { detail?: unknown }).detail}` : "";
    throw new Error(`orchestration run failed (${res.status})${detail}`);
  }
  print(opts.json ? body : formatRunResult(body), opts.json);
}

export async function runWorktreeCreate(taskFile: string, opts: WorktreeCliOptions): Promise<void> {
  const task = readTaskIdentity(taskFile);
  const config = loadConfig();
  const worktrees = resolveWorktreeOptions(config);
  const result = createImplementationWorktree({
    taskId: task.taskId,
    lane: opts.lane ?? "implementation",
    baseCwd: resolveTaskBaseCwd(task.cwd, config),
    worktrees,
  });
  print(opts.json ? result : formatWorktreeCreate(result), opts.json);
}

export async function runWorktreeDiff(taskFile: string, opts: WorktreeCliOptions): Promise<void> {
  const task = readTaskIdentity(taskFile);
  const config = loadConfig();
  const diff = diffWorktreeByTaskLane(resolveWorktreeOptions(config).root, task.taskId, opts.lane ?? "implementation");
  print(opts.json ? { taskId: task.taskId, lane: opts.lane ?? "implementation", diff } : (diff || "No worktree diff."), opts.json);
}

export async function runWorktreeCleanup(taskFile: string, opts: WorktreeCliOptions): Promise<void> {
  const task = readTaskIdentity(taskFile);
  const config = loadConfig();
  const result = cleanupWorktreeByTaskLane(resolveWorktreeOptions(config).root, task.taskId, opts.lane ?? "implementation");
  print(opts.json ? { taskId: task.taskId, lane: opts.lane ?? "implementation", ...result } : formatWorktreeCleanup(result), opts.json);
}

function formatWorktreeCreate(result: ReturnType<typeof createImplementationWorktree>): string {
  if (result.mode === "shared") return `Worktree downgraded: ${result.downgradeReason}; cwd ${result.cwd}`;
  return `Created worktree ${result.handle.path}`;
}

function formatWorktreeCleanup(result: { path: string; removed: boolean }): string {
  return result.removed ? `Removed worktree ${result.path}` : `No worktree found at ${result.path}`;
}
