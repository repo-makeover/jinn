export type ProviderLane = string;
export type Capability = string;

export type CostClass = "near_zero" | "low" | "medium" | "high";
export type LeaseState = "running" | "released" | "expired";
export type QueueState = "blocked_resource";
export type AllocationState = "allocated" | "blocked_resource";
export type TaskPriority = "low" | "normal" | "high";
export type FamilyConstraint = "opposite_of_implementer" | "same_as_implementer";

export interface Worker {
  id: string;
  provider: ProviderLane;
  family: string;
  tier: string;
  capabilities: Capability[];
  tools: string[];
  maxConcurrentTasks: number;
  costClass: CostClass;
  workspacePolicy: string;
}

export interface RoleDefinition {
  id: string;
  requiredCapabilities: Capability[];
  requiredTools: string[];
  allowedFamilies?: string[];
  preferredTiers?: string[];
  preferredCostClasses?: CostClass[];
  familyConstraint?: FamilyConstraint;
  deterministicPreferred?: boolean;
}

export interface CoordinatorTemplate {
  id: string;
  purpose: string;
  requiredRoles: string[];
  optionalRoles: string[];
}

export interface QuotaLimit {
  maxActiveLeases: number;
}

export interface QuotaPolicy {
  providers: Record<string, QuotaLimit>;
  families: Record<string, QuotaLimit>;
}

export interface AllocationRequest {
  taskId: string;
  coordinatorId: string;
  coordinatorTemplate?: string;
  requiredRoles: string[];
  optionalRoles: string[];
  priority: TaskPriority;
  leaseDurationMs: number;
}

export interface Lease {
  leaseId: string;
  workerId: string;
  taskId: string;
  coordinatorId: string;
  role: string;
  state: LeaseState;
  startedAt: string;
  leaseExpiresAt: string;
  heartbeatAt: string;
}

export interface Allocation {
  allocationId: string;
  taskId: string;
  coordinatorId: string;
  state: AllocationState;
  leases: Lease[];
  optionalRolesSkipped: string[];
  createdAt: string;
}

export interface QueueItem {
  taskId: string;
  coordinatorId: string;
  state: QueueState;
  missingRoles: string[];
  priority: TaskPriority;
  blockedSince: string;
  resumeOn: Array<"worker_released" | "quota_available" | "lease_expired">;
  request: AllocationRequest;
}

export interface TelemetryEvent {
  eventId: string;
  type:
    | "allocation_created"
    | "task_blocked_resource"
    | "lease_heartbeat"
    | "lease_released"
    | "lease_expired";
  taskId?: string;
  workerId?: string;
  provider?: string;
  family?: string;
  role?: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export interface OrchestrationConfig {
  workers: Worker[];
  roles: RoleDefinition[];
  coordinatorTemplates: CoordinatorTemplate[];
  quotas: QuotaPolicy;
}

export type AllocationResult =
  | { ok: true; allocation: Allocation }
  | { ok: false; queueItem: QueueItem };

export interface SimulationStepResult {
  step: number;
  action: string;
  result: unknown;
}

