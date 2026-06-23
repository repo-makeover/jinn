import { MatrixScheduler, type SchedulerOptions } from "./scheduler.js";
import { OrchestrationStore } from "./store.js";
import type { Allocation, AllocationRequest, AllocationResult, Lease, LeaseValidationResult, OrchestrationConfig, QueueItem, SchedulerSnapshot, TelemetryEvent } from "./types.js";

export interface PersistentSchedulerOptions extends Omit<SchedulerOptions, "snapshot"> {
  dbPath?: string;
  store?: OrchestrationStore;
  expireOnHydrate?: boolean;
}

export class PersistentMatrixScheduler {
  private scheduler: MatrixScheduler;
  private readonly now: () => Date;
  private readonly ownsStore: boolean;

  constructor(
    private readonly config: OrchestrationConfig,
    private readonly store: OrchestrationStore,
    opts: PersistentSchedulerOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
    this.ownsStore = !opts.store;
    this.scheduler = this.hydrateScheduler();
    if (opts.expireOnHydrate !== false) {
      const expired = this.scheduler.expireLeases(this.now());
      if (expired.length > 0) this.persistOrRehydrate();
    }
  }

  static open(config: OrchestrationConfig, opts: PersistentSchedulerOptions = {}): PersistentMatrixScheduler {
    const store = opts.store ?? OrchestrationStore.open(opts.dbPath);
    return new PersistentMatrixScheduler(config, store, opts);
  }

  close(): void {
    if (this.ownsStore) this.store.close();
  }

  requestAllocation(request: AllocationRequest): AllocationResult {
    return this.commitMutation(() => this.scheduler.requestAllocation(request));
  }

  heartbeatLease(leaseId: string, coordinatorId?: string): Lease {
    return this.commitMutation(() => this.scheduler.heartbeatLease(leaseId, coordinatorId));
  }

  releaseLease(leaseId: string, coordinatorId?: string): Lease {
    return this.commitMutation(() => this.scheduler.releaseLease(leaseId, coordinatorId));
  }

  expireLeases(now?: Date): Lease[] {
    return this.commitMutation(() => this.scheduler.expireLeases(now));
  }

  retryQueued(): AllocationResult[] {
    return this.commitMutation(() => this.scheduler.retryQueued());
  }

  validateLeaseForWorker(workerId: string, leaseId: string, taskId: string, coordinatorId: string): LeaseValidationResult {
    return this.scheduler.validateLeaseForWorker(workerId, leaseId, taskId, coordinatorId);
  }

  listLeases(): Lease[] {
    return this.scheduler.listLeases();
  }

  listAllocations(): Allocation[] {
    return this.scheduler.listAllocations();
  }

  listQueue(): QueueItem[] {
    return this.scheduler.listQueue();
  }

  listTelemetry(): TelemetryEvent[] {
    return this.scheduler.listTelemetry();
  }

  createSnapshot(): SchedulerSnapshot {
    return this.scheduler.createSnapshot();
  }

  resolveLease(selector: { leaseId?: string; taskId?: string; role?: string; workerId?: string }): Lease {
    return this.scheduler.resolveLease(selector);
  }

  private commitMutation<T>(mutate: () => T): T {
    const result = mutate();
    this.persistOrRehydrate();
    return result;
  }

  private persistOrRehydrate(): void {
    try {
      this.store.replaceSnapshot(this.scheduler.createSnapshot());
    } catch (err) {
      this.scheduler = this.hydrateScheduler();
      throw err;
    }
  }

  private hydrateScheduler(): MatrixScheduler {
    return new MatrixScheduler(this.config, {
      now: this.now,
      snapshot: this.store.loadSnapshot(),
    });
  }
}
