import type {
  Allocation,
  AllocationRequest,
  AllocationResult,
  Lease,
  OrchestrationConfig,
  QueueItem,
  RoleDefinition,
  SchedulerSnapshot,
  SimulationStepResult,
  TelemetryEvent,
  Worker,
} from "./types.js";

const COST_RANK: Record<string, number> = {
  near_zero: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const PRIORITY_RANK: Record<string, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export interface SchedulerOptions {
  now?: () => Date;
  snapshot?: SchedulerSnapshot;
}

export interface LeaseValidationResult {
  ok: boolean;
  reason?: string;
}

interface CandidateState {
  workerLeaseCounts: Map<string, number>;
  providerCounts: Map<string, number>;
  familyCounts: Map<string, number>;
}

export class MatrixScheduler {
  private readonly workers: Worker[];
  private readonly roles: Map<string, RoleDefinition>;
  private readonly now: () => Date;
  private readonly allocations = new Map<string, Allocation>();
  private readonly leases = new Map<string, Lease>();
  private readonly queue: QueueItem[] = [];
  private readonly telemetry: TelemetryEvent[] = [];
  private nextSeq = 1;

  constructor(private readonly config: OrchestrationConfig, opts: SchedulerOptions = {}) {
    this.workers = [...config.workers].sort((a, b) => a.id.localeCompare(b.id));
    this.roles = new Map(config.roles.map((role) => [role.id, role]));
    this.now = opts.now ?? (() => new Date());
    if (opts.snapshot) this.hydrate(opts.snapshot);
  }

  requestAllocation(request: AllocationRequest): AllocationResult {
    this.expireLeases(this.now());
    const activeState = this.activeState();
    const selected: Array<{ role: string; worker: Worker }> = [];
    const missingRoles: string[] = [];

    for (const roleId of request.requiredRoles) {
      const role = this.requireRole(roleId);
      const worker = this.selectWorker(role, selected, activeState);
      if (!worker) {
        missingRoles.push(roleId);
        continue;
      }
      selected.push({ role: roleId, worker });
      this.reserve(worker, activeState);
    }

    if (missingRoles.length > 0) {
      const queueItem = this.queueBlocked(request, missingRoles);
      this.record("task_blocked_resource", {
        taskId: request.taskId,
        timestamp: queueItem.blockedSince,
        detail: { missingRoles },
      });
      return { ok: false, queueItem };
    }

    const optionalRolesSkipped: string[] = [];
    for (const roleId of request.optionalRoles) {
      const role = this.requireRole(roleId);
      const worker = this.selectWorker(role, selected, activeState);
      if (!worker) {
        optionalRolesSkipped.push(roleId);
        continue;
      }
      selected.push({ role: roleId, worker });
      this.reserve(worker, activeState);
    }

    const createdAt = this.isoNow();
    const leases = selected.map(({ role, worker }) => this.createLease(request, role, worker, createdAt));
    for (const lease of leases) this.leases.set(lease.leaseId, lease);
    const allocation: Allocation = {
      allocationId: `alloc_${sanitizeId(request.taskId)}_${this.nextSeq++}`,
      taskId: request.taskId,
      coordinatorId: request.coordinatorId,
      state: "allocated",
      leases,
      optionalRolesSkipped,
      createdAt,
    };
    this.allocations.set(allocation.allocationId, allocation);
    this.record("allocation_created", {
      taskId: request.taskId,
      timestamp: createdAt,
      detail: {
        coordinatorId: request.coordinatorId,
        roles: leases.map((lease) => lease.role),
      },
    });
    return { ok: true, allocation };
  }

  heartbeatLease(leaseId: string, coordinatorId?: string): Lease {
    const lease = this.getRunningLease(leaseId);
    if (coordinatorId && lease.coordinatorId !== coordinatorId) {
      throw new Error(`lease ${leaseId} belongs to coordinator ${lease.coordinatorId}`);
    }
    lease.heartbeatAt = this.isoNow();
    this.record("lease_heartbeat", {
      taskId: lease.taskId,
      workerId: lease.workerId,
      role: lease.role,
      timestamp: lease.heartbeatAt,
    });
    return { ...lease };
  }

  releaseLease(leaseId: string, coordinatorId?: string): Lease {
    const lease = this.getRunningLease(leaseId);
    if (coordinatorId && lease.coordinatorId !== coordinatorId) {
      throw new Error(`lease ${leaseId} belongs to coordinator ${lease.coordinatorId}`);
    }
    lease.state = "released";
    this.record("lease_released", {
      taskId: lease.taskId,
      workerId: lease.workerId,
      role: lease.role,
      timestamp: this.isoNow(),
    });
    return { ...lease };
  }

  expireLeases(now: Date = this.now()): Lease[] {
    const expired: Lease[] = [];
    for (const lease of this.leases.values()) {
      if (lease.state !== "running") continue;
      if (Date.parse(lease.leaseExpiresAt) > now.getTime()) continue;
      lease.state = "expired";
      expired.push({ ...lease });
      this.record("lease_expired", {
        taskId: lease.taskId,
        workerId: lease.workerId,
        role: lease.role,
        timestamp: now.toISOString(),
      });
    }
    return expired;
  }

  validateLeaseForWorker(
    workerId: string,
    leaseId: string,
    taskId: string,
    coordinatorId: string,
  ): LeaseValidationResult {
    const lease = this.leases.get(leaseId);
    if (!lease) return { ok: false, reason: "lease_not_found" };
    if (lease.state !== "running") return { ok: false, reason: `lease_${lease.state}` };
    if (lease.workerId !== workerId) return { ok: false, reason: "worker_mismatch" };
    if (lease.taskId !== taskId) return { ok: false, reason: "task_mismatch" };
    if (lease.coordinatorId !== coordinatorId) return { ok: false, reason: "coordinator_mismatch" };
    if (Date.parse(lease.leaseExpiresAt) <= this.now().getTime()) return { ok: false, reason: "lease_expired" };
    return { ok: true };
  }

  retryQueued(): AllocationResult[] {
    const ordered = [...this.queue].sort(compareQueueItems);
    const results: AllocationResult[] = [];
    for (const item of ordered) {
      const result = this.requestAllocation(item.request);
      if (result.ok) {
        const index = this.queue.indexOf(item);
        if (index >= 0) this.queue.splice(index, 1);
        results.push(result);
      }
    }
    return results;
  }

  listLeases(): Lease[] {
    return [...this.leases.values()].map((lease) => ({ ...lease }));
  }

  listAllocations(): Allocation[] {
    return [...this.allocations.values()].map((allocation) => ({
      ...allocation,
      leases: allocation.leases.map((lease) => ({ ...lease })),
      optionalRolesSkipped: [...allocation.optionalRolesSkipped],
    }));
  }

  listQueue(): QueueItem[] {
    return this.queue.map((item) => ({
      ...item,
      missingRoles: [...item.missingRoles],
      resumeOn: [...item.resumeOn],
      request: {
        ...item.request,
        requiredRoles: [...item.request.requiredRoles],
        optionalRoles: [...item.request.optionalRoles],
      },
    }));
  }

  listTelemetry(): TelemetryEvent[] {
    return this.telemetry.map((event) => ({
      ...event,
      detail: event.detail ? { ...event.detail } : undefined,
    }));
  }

  createSnapshot(): SchedulerSnapshot {
    return {
      allocations: this.listAllocations(),
      leases: this.listLeases(),
      queue: this.listQueue(),
      telemetry: this.listTelemetry(),
      nextSeq: this.nextSeq,
    };
  }

  resolveLease(selector: { leaseId?: string; taskId?: string; role?: string; workerId?: string }): Lease {
    if (selector.leaseId) return this.getRunningLease(selector.leaseId);
    const matches = this.listLeases().filter((lease) => {
      if (lease.state !== "running") return false;
      if (selector.taskId && lease.taskId !== selector.taskId) return false;
      if (selector.role && lease.role !== selector.role) return false;
      if (selector.workerId && lease.workerId !== selector.workerId) return false;
      return true;
    });
    if (matches.length !== 1) {
      throw new Error(`release selector matched ${matches.length} running leases`);
    }
    return matches[0];
  }

  private requireRole(roleId: string): RoleDefinition {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`unknown role: ${roleId}`);
    return role;
  }

  private selectWorker(
    role: RoleDefinition,
    selected: Array<{ role: string; worker: Worker }>,
    state: CandidateState,
  ): Worker | null {
    const candidates = this.workers
      .filter((worker) => this.workerQualifies(worker, role, selected, state))
      .sort((a, b) => compareWorkers(a, b, role));
    return candidates[0] ?? null;
  }

  private workerQualifies(
    worker: Worker,
    role: RoleDefinition,
    selected: Array<{ role: string; worker: Worker }>,
    state: CandidateState,
  ): boolean {
    if (role.allowedFamilies && !role.allowedFamilies.includes(worker.family)) return false;
    if (!role.requiredCapabilities.every((capability) => worker.capabilities.includes(capability))) return false;
    if (!role.requiredTools.every((tool) => worker.tools.includes(tool))) return false;
    if ((state.workerLeaseCounts.get(worker.id) ?? 0) >= worker.maxConcurrentTasks) return false;
    if (!this.quotaAllows("providers", worker.provider, state.providerCounts)) return false;
    if (!this.quotaAllows("families", worker.family, state.familyCounts)) return false;
    return this.familyConstraintAllows(worker, role, selected);
  }

  private familyConstraintAllows(
    worker: Worker,
    role: RoleDefinition,
    selected: Array<{ role: string; worker: Worker }>,
  ): boolean {
    if (!role.familyConstraint) return true;
    const implementerFamilies = selected
      .filter((entry) => isImplementerRole(entry.role, this.roles.get(entry.role)))
      .map((entry) => entry.worker.family);
    if (implementerFamilies.length === 0) return true;
    if (role.familyConstraint === "opposite_of_implementer") {
      return !implementerFamilies.includes(worker.family);
    }
    return implementerFamilies.includes(worker.family);
  }

  private quotaAllows(section: "providers" | "families", key: string, counts: Map<string, number>): boolean {
    const limit = this.config.quotas[section][key]?.maxActiveLeases;
    return limit === undefined || (counts.get(key) ?? 0) < limit;
  }

  private activeState(): CandidateState {
    const state: CandidateState = {
      workerLeaseCounts: new Map(),
      providerCounts: new Map(),
      familyCounts: new Map(),
    };
    for (const lease of this.leases.values()) {
      if (lease.state !== "running") continue;
      const worker = this.workers.find((candidate) => candidate.id === lease.workerId);
      if (!worker) continue;
      this.reserve(worker, state);
    }
    return state;
  }

  private reserve(worker: Worker, state: CandidateState): void {
    increment(state.workerLeaseCounts, worker.id);
    increment(state.providerCounts, worker.provider);
    increment(state.familyCounts, worker.family);
  }

  private createLease(request: AllocationRequest, role: string, worker: Worker, startedAt: string): Lease {
    const expires = new Date(Date.parse(startedAt) + request.leaseDurationMs).toISOString();
    return {
      leaseId: `lease_${sanitizeId(request.taskId)}_${sanitizeId(role)}_${sanitizeId(worker.id)}_${this.nextSeq++}`,
      workerId: worker.id,
      taskId: request.taskId,
      coordinatorId: request.coordinatorId,
      role,
      state: "running",
      startedAt,
      leaseExpiresAt: expires,
      heartbeatAt: startedAt,
    };
  }

  private queueBlocked(request: AllocationRequest, missingRoles: string[]): QueueItem {
    const existing = this.queue.find((item) => item.taskId === request.taskId && item.coordinatorId === request.coordinatorId);
    if (existing) {
      existing.missingRoles = missingRoles;
      existing.request = request;
      return { ...existing, request: { ...existing.request } };
    }
    const item: QueueItem = {
      taskId: request.taskId,
      coordinatorId: request.coordinatorId,
      state: "blocked_resource",
      missingRoles,
      priority: request.priority,
      blockedSince: this.isoNow(),
      resumeOn: ["worker_released", "quota_available", "lease_expired"],
      request,
    };
    this.queue.push(item);
    return { ...item, request: { ...item.request } };
  }

  private getRunningLease(leaseId: string): Lease {
    const lease = this.leases.get(leaseId);
    if (!lease) throw new Error(`unknown lease: ${leaseId}`);
    if (lease.state !== "running") throw new Error(`lease ${leaseId} is ${lease.state}`);
    return lease;
  }

  private isoNow(): string {
    return this.now().toISOString();
  }

  private hydrate(snapshot: SchedulerSnapshot): void {
    this.nextSeq = Math.max(1, snapshot.nextSeq);
    for (const lease of snapshot.leases) {
      this.leases.set(lease.leaseId, { ...lease });
    }
    const leasesById = new Map(this.leases);
    for (const allocation of snapshot.allocations) {
      this.allocations.set(allocation.allocationId, {
        ...allocation,
        leases: allocation.leases.map((lease) => leasesById.get(lease.leaseId) ?? { ...lease }),
        optionalRolesSkipped: [...allocation.optionalRolesSkipped],
      });
    }
    this.queue.push(...snapshot.queue.map((item) => ({
      ...item,
      missingRoles: [...item.missingRoles],
      resumeOn: [...item.resumeOn],
      request: {
        ...item.request,
        requiredRoles: [...item.request.requiredRoles],
        optionalRoles: [...item.request.optionalRoles],
      },
    })));
    this.telemetry.push(...snapshot.telemetry.map((event) => ({
      ...event,
      detail: event.detail ? { ...event.detail } : undefined,
    })));
  }

  private record(type: TelemetryEvent["type"], event: Omit<TelemetryEvent, "eventId" | "type">): void {
    this.telemetry.push({
      eventId: `evt_${this.nextSeq++}`,
      type,
      ...event,
    });
  }
}

export function runSimulation(
  scheduler: MatrixScheduler,
  steps: Array<
    | { allocate: AllocationRequest }
    | { release: { leaseId?: string; taskId?: string; role?: string; workerId?: string } }
    | { heartbeat: { leaseId: string } }
    | { expire: { now: string } }
  >,
): SimulationStepResult[] {
  return steps.map((step, index) => {
    if ("allocate" in step) {
      return { step: index + 1, action: "allocate", result: scheduler.requestAllocation(step.allocate) };
    }
    if ("release" in step) {
      const lease = scheduler.resolveLease(step.release);
      return { step: index + 1, action: "release", result: scheduler.releaseLease(lease.leaseId) };
    }
    if ("heartbeat" in step) {
      return { step: index + 1, action: "heartbeat", result: scheduler.heartbeatLease(step.heartbeat.leaseId) };
    }
    const expired = scheduler.expireLeases(new Date(step.expire.now));
    const retried = scheduler.retryQueued();
    return { step: index + 1, action: "expire", result: { expired, retried } };
  });
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function compareWorkers(a: Worker, b: Worker, role: RoleDefinition): number {
  const tier = preferenceRank(a.tier, role.preferredTiers) - preferenceRank(b.tier, role.preferredTiers);
  if (tier !== 0) return tier;
  const cost = preferenceRank(a.costClass, role.preferredCostClasses) - preferenceRank(b.costClass, role.preferredCostClasses);
  if (cost !== 0) return cost;
  const baseCost = (COST_RANK[a.costClass] ?? 99) - (COST_RANK[b.costClass] ?? 99);
  if (baseCost !== 0) return baseCost;
  return a.id.localeCompare(b.id);
}

function preferenceRank(value: string, preferred: readonly string[] | undefined): number {
  if (!preferred || preferred.length === 0) return 0;
  const index = preferred.indexOf(value);
  return index === -1 ? preferred.length + 1 : index;
}

function compareQueueItems(a: QueueItem, b: QueueItem): number {
  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority !== 0) return priority;
  const time = Date.parse(a.blockedSince) - Date.parse(b.blockedSince);
  if (time !== 0) return time;
  return a.taskId.localeCompare(b.taskId);
}

function isImplementerRole(roleId: string, role: RoleDefinition | undefined): boolean {
  if (roleId.includes("implementer")) return true;
  if (!role) return false;
  return role.requiredCapabilities.includes("repo_edit") || role.requiredCapabilities.includes("coding");
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "id";
}
