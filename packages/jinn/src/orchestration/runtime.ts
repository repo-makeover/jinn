import { ORCH_CONFIG_DIR, ORCH_DB, ORCH_WORKTREE_ROOT } from "../shared/paths.js";
import { logger } from "../shared/logger.js";
import type { JinnConfig } from "../shared/types.js";
import { loadOrchestrationConfig } from "./config.js";
import { buildCoordinatorTaskBrief, type CoordinatorMode } from "./coordinator.js";
import { resolveCrossFamilyReviewPolicy, type CrossFamilyReviewPolicy } from "./cross-family.js";
import { listProtectedDualLaneTaskIds } from "./dual-lane-state.js";
import type { LiveRunContinuationRecord } from "./live-run.js";
import { PersistentMatrixScheduler } from "./persistent-scheduler.js";
import { filterWorkersWithHeadroom, type HeadroomFilterResult } from "./routing-headroom.js";
import { OrchestrationStore } from "./store.js";
import { computeWorkerScores, readOrchestrationTelemetry } from "./telemetry.js";
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
const DEFAULT_STALE_DISPATCHING_CONTINUATION_MS = 10 * 60 * 1_000;
const DEFAULT_SHUTDOWN_DRAIN_TIMEOUT_MS = 5_000;
const EMPIRICAL_ROUTING_MAX_BYTES = 1_000_000;
const EMPIRICAL_ROUTING_MAX_RECORDS = 5_000;

type HeadroomFilter = (workers: OrchestrationConfig["workers"], config: JinnConfig) => Promise<HeadroomFilterResult>;

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
  workerScores?: Record<string, number>;
  jinnConfig?: JinnConfig;
  headroomFilter?: HeadroomFilter;
  staleDispatchingContinuationMs?: number;
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
  private readonly jinnConfig?: JinnConfig;
  private readonly headroomFilter: HeadroomFilter;
  private readonly staleDispatchingContinuationMs: number;
  private readonly resumeDispatches = new Set<Promise<void>>();
  private resumeQueuedRunHandler?: ResumeQueuedRunHandler;
  private reaper: ReturnType<typeof setInterval> | null = null;
  private closing = false;

  constructor(opts: OrchestrationRuntimeOptions) {
    this.config = opts.config ?? loadOrchestrationConfig(opts.configDir ?? ORCH_CONFIG_DIR);
    this.dbPath = opts.dbPath ?? ORCH_DB;
    this.store = OrchestrationStore.open(this.dbPath);
    this.scheduler = PersistentMatrixScheduler.open(this.config, {
      store: this.store,
      now: opts.now,
      reviewPolicy: opts.reviewPolicy,
      workerScores: opts.workerScores,
    });
    this.reaperIntervalMs = Math.max(1, Math.floor(opts.reaperIntervalMs ?? DEFAULT_REAPER_INTERVAL_MS));
    this.jinnConfig = opts.jinnConfig;
    this.headroomFilter = opts.headroomFilter ?? filterWorkersWithHeadroom;
    this.staleDispatchingContinuationMs = Math.max(
      0,
      Math.floor(opts.staleDispatchingContinuationMs ?? DEFAULT_STALE_DISPATCHING_CONTINUATION_MS),
    );
    this.worktrees = {
      root: opts.worktreeRoot ?? ORCH_WORKTREE_ROOT,
      maxWorktrees: typeof opts.maxWorktrees === "number" && Number.isFinite(opts.maxWorktrees) && opts.maxWorktrees > 0
        ? Math.floor(opts.maxWorktrees)
        : DEFAULT_MAX_WORKTREES,
    };
    this.recoverStaleDispatchingContinuations();
    if (opts.startReaper !== false) this.startReaper();
  }

  setResumeQueuedRunHandler(handler: ResumeQueuedRunHandler | undefined): void {
    this.resumeQueuedRunHandler = handler;
    if (handler && !this.closing) void this.retryQueuedWithLiveHeadroom();
  }

  requestAllocation(request: AllocationRequest): AllocationResult {
    return this.scheduler.requestAllocation(request);
  }

  async requestAllocationWithLiveHeadroom(request: AllocationRequest): Promise<AllocationResult> {
    return this.scheduler.requestAllocation(request, {
      allowedWorkerIds: await this.resolveLiveHeadroomWorkerIds(),
    });
  }

  tryAllocationNow(request: AllocationRequest): AllocationResult {
    return this.scheduler.tryAllocationNow(request);
  }

  async tryAllocationNowWithLiveHeadroom(request: AllocationRequest): Promise<AllocationResult> {
    return this.scheduler.tryAllocationNow(request, {
      allowedWorkerIds: await this.resolveLiveHeadroomWorkerIds(),
    });
  }

  heartbeatLease(leaseId: string, coordinatorId?: string): Lease {
    return this.scheduler.heartbeatLease(leaseId, coordinatorId);
  }

  releaseLease(leaseId: string, coordinatorId?: string): Lease {
    const lease = this.scheduler.releaseLease(leaseId, coordinatorId);
    void this.retryQueuedWithLiveHeadroom();
    return lease;
  }

  expireLeases(now?: Date): Lease[] {
    const expired = this.scheduler.expireLeases(now);
    if (expired.length > 0) void this.retryQueuedWithLiveHeadroom();
    return expired;
  }

  retryQueued(): AllocationResult[] {
    const results = this.scheduler.retryQueued();
    this.dispatchRetryResults(results);
    return results;
  }

  async retryQueuedWithLiveHeadroom(): Promise<AllocationResult[]> {
    if (this.closing) return [];
    const allowedWorkerIds = await this.resolveLiveHeadroomWorkerIds();
    if (this.closing) return [];
    const results = this.scheduler.retryQueued({
      allowedWorkerIds,
    });
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

  async retryFailedLiveContinuation(taskId: string, coordinatorId: string): Promise<RetryLiveContinuationResult> {
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

    const result = this.scheduler.requestAllocation(buildContinuationRequest(queued, this.config), {
      allowedWorkerIds: await this.resolveLiveHeadroomWorkerIds(),
    });
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
      || this.store.listLiveContinuations(["queued", "dispatching"]).length > 0
      || this.resumeDispatches.size > 0;
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
    for (const taskId of listProtectedDualLaneTaskIds()) activeTaskIds.add(taskId);
    return reapOrphanedWorktrees(this.worktrees.root, activeTaskIds);
  }

  close(): void {
    this.closing = true;
    if (this.reaper) {
      clearInterval(this.reaper);
      this.reaper = null;
    }
    this.scheduler.close();
    this.store.close();
  }

  async prepareForShutdown(reason = "gateway shutting down gracefully", timeoutMs = DEFAULT_SHUTDOWN_DRAIN_TIMEOUT_MS): Promise<void> {
    this.closing = true;
    const wait = this.waitForResumeDispatches(timeoutMs);
    if (wait) await wait;
    for (const continuation of this.store.listLiveContinuations(["dispatching"])) {
      this.markLiveContinuationFailed(continuation.taskId, continuation.coordinatorId, reason, continuation.allocationId);
    }
    for (const lease of this.scheduler.listLeases()) {
      if (lease.state !== "running") continue;
      try {
        this.scheduler.releaseLease(lease.leaseId, lease.coordinatorId);
      } catch (err) {
        logger.warn(`Orchestration shutdown release failed for lease ${lease.leaseId}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  private dispatchRetryResults(results: AllocationResult[]): void {
    for (const result of results) {
      if (!result.ok) continue;
      if (this.closing) {
        this.releaseAllocationLeases(result.allocation, { retryQueued: false });
        continue;
      }
      const dispatch = this.resumeQueuedAllocation(result.allocation, result.reviewPolicy).catch((err) => {
        logger.error(`Queued orchestration resume crashed for ${result.allocation.taskId}/${result.allocation.coordinatorId}: ${err instanceof Error ? err.message : err}`);
      });
      this.resumeDispatches.add(dispatch);
      dispatch.finally(() => this.resumeDispatches.delete(dispatch));
    }
  }

  private async resumeQueuedAllocation(allocation: Allocation, reviewPolicy: ReviewPolicySummary): Promise<void> {
    if (!this.resumeQueuedRunHandler) {
      logger.warn(
        `No orchestration resume handler is registered for ${allocation.taskId}/${allocation.coordinatorId}; leaving continuation queued.`,
      );
      this.releaseAllocationLeases(allocation, { retryQueued: false });
      return;
    }
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

  private releaseAllocationLeases(allocation: Allocation, opts: { retryQueued?: boolean } = {}): void {
    for (const lease of allocation.leases) {
      try {
        this.scheduler.releaseLease(lease.leaseId, lease.coordinatorId);
      } catch (err) {
        logger.warn(`Orchestration invariant cleanup failed for lease ${lease.leaseId}: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (opts.retryQueued !== false && !this.closing) void this.retryQueuedWithLiveHeadroom();
  }

  private recoverStaleDispatchingContinuations(): void {
    const cutoff = Date.now() - this.staleDispatchingContinuationMs;
    for (const continuation of this.store.listLiveContinuations(["dispatching"])) {
      const updatedAt = Date.parse(continuation.updatedAt);
      if (Number.isFinite(updatedAt) && updatedAt > cutoff) continue;
      const error = `Recovered stale dispatching continuation after runtime restart`;
      logger.warn(`Orchestration ${error}: ${continuation.taskId}/${continuation.coordinatorId}`);
      this.markLiveContinuationFailed(continuation.taskId, continuation.coordinatorId, error, continuation.allocationId);
      const allocation = continuation.allocationId
        ? this.scheduler.listAllocations().find((candidate) => candidate.allocationId === continuation.allocationId)
        : undefined;
      if (allocation) this.releaseAllocationLeases(allocation, { retryQueued: false });
    }
  }

  private waitForResumeDispatches(timeoutMs: number): Promise<void> | undefined {
    if (this.resumeDispatches.size === 0) return undefined;
    const pending = Promise.allSettled([...this.resumeDispatches]).then(() => undefined);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        logger.warn(`Timed out waiting for ${this.resumeDispatches.size} orchestration resume dispatch(es) during shutdown`);
        resolve();
      }, Math.max(0, timeoutMs));
      timer.unref?.();
    });
    return Promise.race([pending, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  private async resolveLiveHeadroomWorkerIds(): Promise<Set<string> | undefined> {
    if (!this.jinnConfig) return undefined;
    try {
      const result = await this.headroomFilter(this.config.workers, this.jinnConfig);
      if (result.rejected.length > 0) {
        logger.debug(
          `Orchestration headroom filtered ${result.rejected.length} worker(s): ${
            result.rejected.map(({ worker, headroom }) => `${worker.id}:${headroom.reason}`).join(", ")
          }`,
        );
      }
      return new Set(result.allowed.map((worker) => worker.id));
    } catch (err) {
      logger.warn(`Orchestration headroom filter failed closed: ${err instanceof Error ? err.message : String(err)}`);
      return new Set();
    }
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
    jinnConfig: config,
    workerScores: opts.workerScores ?? resolveEmpiricalWorkerScores(config),
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
  if (record.mode === "dual_lane") {
    return {
      taskId: record.task.taskId,
      coordinatorId: record.task.coordinatorId,
      requiredRoles: [record.task.openaiRole ?? "openaiImplementer", record.task.anthropicRole ?? "anthropicImplementer"],
      optionalRoles: [],
      priority: record.task.priority,
      leaseDurationMs: record.task.leaseDurationMs,
    };
  }
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

function resolveEmpiricalWorkerScores(config: JinnConfig): Record<string, number> | undefined {
  if (config.orchestration?.empiricalRouting !== true) return undefined;
  try {
    const telemetry = readOrchestrationTelemetry(undefined, {
      maxBytes: EMPIRICAL_ROUTING_MAX_BYTES,
      maxRecords: EMPIRICAL_ROUTING_MAX_RECORDS,
    });
    if (telemetry.skippedLines > 0) {
      logger.warn(`Orchestration empirical routing skipped ${telemetry.skippedLines} malformed telemetry line(s)`);
    }
    return computeWorkerScores(telemetry.records);
  } catch (err) {
    logger.warn(`Orchestration empirical routing disabled for this boot: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}
