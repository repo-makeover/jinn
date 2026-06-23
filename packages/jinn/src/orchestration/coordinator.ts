import fs from "node:fs";
import yaml from "js-yaml";
import { z } from "zod";
import { MatrixScheduler } from "./scheduler.js";
import { allocationRequestFileSchema, buildAllocationRequest } from "./schemas.js";
import type {
  AllocationRequest,
  AllocationResult,
  OrchestrationConfig,
  RoleDefinition,
  SchedulerSnapshot,
} from "./types.js";

export const coordinatorModeSchema = z.enum(["matrix", "single_worker", "single_worker_with_review"]);
export type CoordinatorMode = z.infer<typeof coordinatorModeSchema>;

export const coordinatorTaskBriefSchema = allocationRequestFileSchema.extend({
  mode: coordinatorModeSchema.default("matrix"),
});

export interface CoordinatorTaskBrief {
  mode: CoordinatorMode;
  request: AllocationRequest;
}

export interface CoordinatorPlanSummary {
  state: "allocated" | "blocked_resource";
  allocatedRoles: string[];
  missingRoles: string[];
  optionalRolesSkipped: string[];
  resumeOn: Array<"worker_released" | "quota_available" | "lease_expired">;
}

export interface CoordinatorAllocationPlan {
  mode: CoordinatorMode;
  request: AllocationRequest;
  result: AllocationResult;
  summary: CoordinatorPlanSummary;
}

export interface CoordinatorPlanOptions {
  snapshot?: SchedulerSnapshot;
  now?: () => Date;
}

export function loadCoordinatorTaskBrief(filePath: string, config: OrchestrationConfig): CoordinatorTaskBrief {
  let value: unknown;
  try {
    value = yaml.load(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`failed to read ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
  return buildCoordinatorTaskBrief(value, config);
}

export function buildCoordinatorTaskBrief(value: unknown, config: OrchestrationConfig): CoordinatorTaskBrief {
  const parsed = coordinatorTaskBriefSchema.parse(value);
  const { mode, ...allocationInput } = parsed;
  const request = applyMode(buildAllocationRequest(allocationInput, config), mode, config.roles);
  return { mode, request };
}

export function planCoordinatorAllocation(
  brief: CoordinatorTaskBrief,
  config: OrchestrationConfig,
  opts: CoordinatorPlanOptions = {},
): CoordinatorAllocationPlan {
  const scheduler = new MatrixScheduler(config, { snapshot: opts.snapshot, now: opts.now });
  const result = scheduler.requestAllocation(brief.request);
  return {
    mode: brief.mode,
    request: brief.request,
    result,
    summary: summarizePlan(result),
  };
}

function applyMode(
  request: AllocationRequest,
  mode: CoordinatorMode,
  roles: RoleDefinition[],
): AllocationRequest {
  if (mode === "matrix") return request;

  const orderedRoles = [...request.requiredRoles, ...request.optionalRoles];
  const implementer = orderedRoles.find((roleId) => isImplementer(roleId, roleById(roles, roleId))) ?? request.requiredRoles[0];
  if (!implementer) throw new Error(`${mode} requires at least one implementer role`);

  if (mode === "single_worker") {
    return { ...request, requiredRoles: [implementer], optionalRoles: [] };
  }

  const reviewer = orderedRoles.find((roleId) => roleId !== implementer && isReviewer(roleId, roleById(roles, roleId)));
  if (!reviewer) throw new Error("single_worker_with_review requires a reviewer role in the coordinator template");
  return { ...request, requiredRoles: [implementer, reviewer], optionalRoles: [] };
}

function summarizePlan(result: AllocationResult): CoordinatorPlanSummary {
  if (!result.ok) {
    return {
      state: "blocked_resource",
      allocatedRoles: [],
      missingRoles: [...result.queueItem.missingRoles],
      optionalRolesSkipped: [],
      resumeOn: [...result.queueItem.resumeOn],
    };
  }
  return {
    state: "allocated",
    allocatedRoles: result.allocation.leases.map((lease) => lease.role),
    missingRoles: [],
    optionalRolesSkipped: [...result.allocation.optionalRolesSkipped],
    resumeOn: [],
  };
}

function roleById(roles: RoleDefinition[], roleId: string): RoleDefinition | undefined {
  return roles.find((role) => role.id === roleId);
}

function isImplementer(roleId: string, role: RoleDefinition | undefined): boolean {
  if (roleId.toLowerCase().includes("implementer")) return true;
  if (!role) return false;
  return role.requiredCapabilities.includes("repo_edit") || role.requiredCapabilities.includes("coding");
}

function isReviewer(roleId: string, role: RoleDefinition | undefined): boolean {
  if (roleId.toLowerCase().includes("review")) return true;
  if (!role) return false;
  return role.requiredCapabilities.includes("code_review") || role.familyConstraint === "opposite_of_implementer";
}
