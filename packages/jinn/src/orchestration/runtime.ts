import { ORCH_CONFIG_DIR, ORCH_DB, ORCH_WORKTREE_ROOT } from "../shared/paths.js";
import { logger } from "../shared/logger.js";
import type { JinnConfig } from "../shared/types.js";
import { loadOrchestrationConfig } from "./config.js";
import { buildCoordinatorTaskBrief, type CoordinatorMode } from "./coordinator.js";
import { resolveCrossFamilyReviewPolicy, type CrossFamilyReviewPolicy } from "./cross-family.js";
import type { LiveRunContinuationRecord } from "./live-run.js";
import { PersistentMatrixScheduler } from "./persistent-scheduler.js";
import { OrchestrationStore } from "./store.js";
import {
  DEFAULT_LEASE_DURATION_MS,
  type Allocation,
  type AllocationRequest,
  type AllocationResult,
  type Lease,
  type LeaseValidationResult,
  type OrchestrationConfig,
  type QueueItem,
  type ReviewPolicySummary,
} from "./types.js";
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
  reviewPolicy?: Partial<CrossFamilyReviewPolicy>;
}

export interface ResumeQueuedRun {
  continuation: LiveRunContinuationRecord;
  allocation: Allocation;
  reviewPolicy: ReviewPolicySummary;
}

export type RetryLiveContinuationResult =
  | { ok: false; reason: "not_found" | "invalid_state"; message: string }
  | {
    ok: true;
    state: "blocked_resource";
    continuation: LiveRunContinuationRecord;
    queueItem: QueueItem;
    reviewPolicy: ReviewPolicySummary;
  }
  | {
    ok: true;
    state: "dispatching";
    continuation: LiveRunContinuationRecord;
    allocation: Allocation;
    reviewPolicy: ReviewPolicySummary;
  };

type ResumeQueuedRunHandler = (run: ResumeQueuedRun) => Promise<void>;

export class OrchestrationRuntime {
  readonly config: OrchestrationConfig;
  readonly dbPath: string;
  private readonly store: OrchestrationStore;
  private readonly scheduler: PersistentMatrixScheduler;
  private readonly reaperIntervalMs: number;
  private readonly worktrees: WorktreeOptions;
  private resumeQueuedRunHandler?: ResumeQueuedRunHandler;
  private reaper: ReturnType<typeof setInterval> | null = null;

  constructor(opts: OrchestrationRuntimeOptions) {
    this.config = opts.config ?? loadOrchestrationConfig(opts.configDir ?? ORCH_CONFIG_DIR);
    this.dbPath = opts.dbPath ?? ORCH_DB;
    this.store = OrchestrationStore.open(this.dbPath);
    this.scheduler = PersistentMatrixScheduler.open(this.config, {
      store: this.store,
      now: opts.now,
      reviewPolicy: opts.reviewPolicy,
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

  setResumeQueuedRunHandler(handler: ResumeQueuedRunHandler | undefined): void {
    this.resumeQueuedRunHandler = handler;
  }

  requestAllocation(request: AllocationRequest): AllocationResult {
    return this.scheduler.requestAllocation(request);
  }

  heartbeatLease(leaseId: string, coordinatorId?: string): Lease {
    return this.scheduler.heartbeatLease(leaseId, coordinatorId);
  }

  releaseLease(leaseId: string, coordinatorId?: string): Lease {
    const lease = this.scheduler.releaseLease(leaseId, coordinatorId);
    this.dispatchRetryResults(this.scheduler.retryQueued());
    return lease;
  }

  expireLeases(now?: Date): Lease[] {
    const expired = this.scheduler.expireLeases(now);
    if (expired.length > 0) this.dispatchRetryResults(this.scheduler.retryQueued());
    return expired;
  }

  retryQueued(): AllocationResult[] {
    const results = this.scheduler.retryQueued();
    this.dispatchRetryResults(results);
    return results;
  }

  validateLeaseForWorker(workerId: string, leaseId: string, taskId: string, coordinatorId: string): LeaseValidationResult {
    return this.scheduler.validateLeaseForWorker(workerId, leaseId, taskId, coordinatorId);
  }

  queueLiveContinuation(record: LiveRunContinuationRecord): void {
    this.store.upsertLiveContinuation(record);
  }

  getLiveContinuation(taskId: string, coordinatorId: string): LiveRunContinuationRecord | undefined {
    return this.store.getLiveContinuation(taskId, coordinatorId);
  }

  deleteLiveContinuation(taskId: string, coordinatorId: string): void {
    this.store.deleteLiveContinuation(taskId, coordinatorId);
  }

  markLiveContinuationCompleted(taskId: string, coordinatorId: string, allocationId?: string): void {
    this.store.markLiveContinuationState(taskId, coordinatorId, "completed", { allocationId: allocationId ?? null });
  }

  markLiveContinuationFailed(taskId: string, coordinatorId: string, error: string, allocationId?: string): void {
    this.store.markLiveContinuationState(taskId, coordinatorId, "failed", {
      allocationId: allocationId ?? null,
      lastError: error,
    });
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

  listLiveContinuations() {
    return this.store.listLiveContinuations();
  }

  retryFailedLiveContinuation(taskId: string, coordinatorId: string): RetryLiveContinuationResult {
    const current = this.store.getLiveContinuation(taskId, coordinatorId);
    if (!current) {
      return {
        ok: false,
        reason: "not_found",
        message: `no live continuation found for ${taskId}/${coordinatorId}`,
      };
    }
    if (current.state !== "failed") {
      return {
        ok: false,
        reason: "invalid_state",
        message: `live continuation ${taskId}/${coordinatorId} is ${current.state}; only failed continuations can be retried manually`,
      };
    }

    const queued = this.store.markLiveContinuationState(taskId, coordinatorId, "queued", {
      allocationId: null,
      lastError: null,
    });
    if (!queued) {
      return {
        ok: false,
        reason: "not_found",
        message: `live continuation ${taskId}/${coordinatorId} disappeared before retry`,
      };
    }

    const result = this.scheduler.requestAllocation(buildContinuationRequest(queued, this.config));
    if (!result.ok) {
      const blocked = this.store.getLiveContinuation(taskId, coordinatorId) ?? queued;
      return {
        ok: true,
        state: "blocked_resource",
        continuation: blocked,
        queueItem: result.queueItem,
        reviewPolicy: result.reviewPolicy,
      };
    }

    this.dispatchRetryResults([result]);
    return {
      ok: true,
      state: "dispatching",
      continuation: this.store.getLiveContinuation(taskId, coordinatorId) ?? queued,
      allocation: result.allocation,
      reviewPolicy: result.reviewPolicy,
    };
  }

  hasActiveWork(): boolean {
    return this.scheduler.listLeases().some((lease) => lease.state === "running")
      || this.scheduler.listQueue().length > 0
      || this.store.listLiveContinuations(["queued", "dispatching"]).length > 0;
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
    this.store.close();
  }

  private dispatchRetryResults(results: AllocationResult[]): void {
    for (const result of results) {
      if (!result.ok) continue;
      void this.resumeQueuedAllocation(result.allocation, result.reviewPolicy);
    }
  }

  private async resumeQueuedAllocation(allocation: Allocation, reviewPolicy: ReviewPolicySummary): Promise<void> {
    const claimed = this.store.claimQueuedLiveContinuation(allocation.taskId, allocation.coordinatorId, {
      allocationId: allocation.allocationId,
    });
    if (!claimed) {
      logger.warn(
        `Orchestration invariant violated: resumed allocation ${allocation.allocationId} for ${allocation.taskId}/${allocation.coordinatorId} had no queued continuation; releasing leases.`,
      );
      this.releaseAllocationLeases(allocation);
      return;
    }
    if (!this.resumeQueuedRunHandler) {
      const error = `No orchestration resume handler is registered for ${allocation.taskId}/${allocation.coordinatorId}`;
      logger.error(error);
      this.markLiveContinuationFailed(claimed.taskId, claimed.coordinatorId, error, allocation.allocationId);
      this.releaseAllocationLeases(allocation);
      return;
    }
    try {
      await this.resumeQueuedRunHandler({
        continuation: claimed,
        allocation,
        reviewPolicy,
      });
      this.markLiveContinuationCompleted(claimed.taskId, claimed.coordinatorId, allocation.allocationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Queued orchestration resume failed for ${claimed.taskId}/${claimed.coordinatorId}: ${message}`);
      this.releaseAllocationLeases(allocation);
      this.markLiveContinuationFailed(claimed.taskId, claimed.coordinatorId, message, allocation.allocationId);
    }
  }

  private releaseAllocationLeases(allocation: Allocation): void {
    for (const lease of allocation.leases) {
      try {
        this.scheduler.releaseLease(lease.leaseId, lease.coordinatorId);
      } catch (err) {
        logger.warn(`Orchestration invariant cleanup failed for lease ${lease.leaseId}: ${err instanceof Error ? err.message : err}`);
      }
    }
    this.dispatchRetryResults(this.scheduler.retryQueued());
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
    reviewPolicy: resolveCrossFamilyReviewPolicy(config.orchestration),
    ...opts,
  });
}

export function resolveLiveLeaseDurationMs(config: JinnConfig): number {
  const configured = config.orchestration?.leaseDurationMs;
  return typeof configured === "number" && Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_LEASE_DURATION_MS;
}

function buildContinuationRequest(record: LiveRunContinuationRecord, config: OrchestrationConfig): AllocationRequest {
  const brief = buildCoordinatorTaskBrief({
    taskId: record.task.taskId,
    coordinatorId: record.task.coordinatorId,
    coordinatorTemplate: record.task.coordinatorTemplate ?? record.task.template,
    requiredRoles: record.task.requiredRoles,
    optionalRoles: record.task.optionalRoles,
    priority: record.task.priority,
    leaseDurationMs: record.task.leaseDurationMs,
    mode: record.mode as CoordinatorMode,
  }, config);
  return brief.request;
}
