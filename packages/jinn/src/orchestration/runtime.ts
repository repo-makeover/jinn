import { ORCH_CONFIG_DIR, ORCH_DB, ORCH_WORKTREE_ROOT } from "../shared/paths.js";
import type { JinnConfig } from "../shared/types.js";
import { loadOrchestrationConfig } from "./config.js";
import { PersistentMatrixScheduler } from "./persistent-scheduler.js";
import { DEFAULT_LEASE_DURATION_MS, type AllocationRequest, type AllocationResult, type Lease, type LeaseValidationResult, type OrchestrationConfig } from "./types.js";
import { DEFAULT_MAX_WORKTREES, reapOrphanedWorktrees, type WorktreeHandle, type WorktreeOptions } from "./worktree.js";

const DEFAULT_REAPER_INTERVAL_MS = 5_000;

export interface OrchestrationRuntimeOptions {
  config?: OrchestrationConfig;
  configDir?: string;
  dbPath?: string;
  now?: () => Date;
  reaperIntervalMs?: number;
  startReaper?: boolean;
  worktreeRoot?: string;
  maxWorktrees?: number;
}

export class OrchestrationRuntime {
  readonly config: OrchestrationConfig;
  readonly dbPath: string;
  private readonly scheduler: PersistentMatrixScheduler;
  private readonly reaperIntervalMs: number;
  private readonly worktrees: WorktreeOptions;
  private reaper: ReturnType<typeof setInterval> | null = null;

  constructor(opts: OrchestrationRuntimeOptions) {
    this.config = opts.config ?? loadOrchestrationConfig(opts.configDir ?? ORCH_CONFIG_DIR);
    this.dbPath = opts.dbPath ?? ORCH_DB;
    this.scheduler = PersistentMatrixScheduler.open(this.config, {
      dbPath: this.dbPath,
      now: opts.now,
    });
    this.reaperIntervalMs = Math.max(1, Math.floor(opts.reaperIntervalMs ?? DEFAULT_REAPER_INTERVAL_MS));
    this.worktrees = {
      root: opts.worktreeRoot ?? ORCH_WORKTREE_ROOT,
      maxWorktrees: typeof opts.maxWorktrees === "number" && Number.isFinite(opts.maxWorktrees) && opts.maxWorktrees > 0
        ? Math.floor(opts.maxWorktrees)
        : DEFAULT_MAX_WORKTREES,
    };
    if (opts.startReaper !== false) this.startReaper();
  }

  requestAllocation(request: AllocationRequest): AllocationResult {
    return this.scheduler.requestAllocation(request);
  }

  heartbeatLease(leaseId: string, coordinatorId?: string): Lease {
    return this.scheduler.heartbeatLease(leaseId, coordinatorId);
  }

  releaseLease(leaseId: string, coordinatorId?: string): Lease {
    const lease = this.scheduler.releaseLease(leaseId, coordinatorId);
    this.scheduler.retryQueued();
    return lease;
  }

  expireLeases(now?: Date): Lease[] {
    const expired = this.scheduler.expireLeases(now);
    if (expired.length > 0) this.scheduler.retryQueued();
    return expired;
  }

  retryQueued(): AllocationResult[] {
    return this.scheduler.retryQueued();
  }

  validateLeaseForWorker(workerId: string, leaseId: string, taskId: string, coordinatorId: string): LeaseValidationResult {
    return this.scheduler.validateLeaseForWorker(workerId, leaseId, taskId, coordinatorId);
  }

  listWorkers() {
    return this.config.workers.map((worker) => ({ ...worker }));
  }

  listLeases() {
    return this.scheduler.listLeases();
  }

  listQueue() {
    return this.scheduler.listQueue();
  }

  listAllocations() {
    return this.scheduler.listAllocations();
  }

  getWorktreeOptions(): WorktreeOptions {
    return { ...this.worktrees };
  }

  reapWorktrees(): WorktreeHandle[] {
    const activeTaskIds = new Set(
      this.scheduler.listLeases()
        .filter((lease) => lease.state === "running")
        .map((lease) => lease.taskId),
    );
    return reapOrphanedWorktrees(this.worktrees.root, activeTaskIds);
  }

  close(): void {
    if (this.reaper) {
      clearInterval(this.reaper);
      this.reaper = null;
    }
    this.scheduler.close();
  }

  private startReaper(): void {
    if (this.reaper) return;
    this.expireLeases();
    this.reapWorktrees();
    this.reaper = setInterval(() => {
      this.expireLeases();
      this.reapWorktrees();
    }, this.reaperIntervalMs);
    this.reaper.unref?.();
  }
}

export function createOrchestrationRuntimeFromConfig(
  config: JinnConfig,
  opts: OrchestrationRuntimeOptions = {},
): OrchestrationRuntime | undefined {
  if (config.orchestration?.enabled !== true) return undefined;
  return new OrchestrationRuntime({
    configDir: config.orchestration.configDir,
    dbPath: config.orchestration.dbPath,
    reaperIntervalMs: config.orchestration.reaperIntervalMs,
    worktreeRoot: config.orchestration.worktreeRoot,
    maxWorktrees: config.orchestration.maxWorktrees,
    ...opts,
  });
}

export function resolveLiveLeaseDurationMs(config: JinnConfig): number {
  const configured = config.orchestration?.leaseDurationMs;
  return typeof configured === "number" && Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_LEASE_DURATION_MS;
}
