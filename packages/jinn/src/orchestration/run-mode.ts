import { z } from "zod";
import { createSession, getSession, insertMessage, updateSession } from "../sessions/registry.js";
import { logger } from "../shared/logger.js";
import type { Engine, JsonObject } from "../shared/types.js";
import type { ApiContext } from "../gateway/api.js";
import { dispatchWebSessionRun } from "../gateway/api/session-dispatch.js";
import { buildCoordinatorTaskBrief, coordinatorModeSchema, type CoordinatorMode } from "./coordinator.js";
import { isReviewerRole } from "./cross-family.js";
import { toLeaseTransportMeta } from "./lease-meta.js";
import { resolveLiveLeaseDurationMs } from "./runtime.js";
import type { Allocation, Lease, QueueItem, ReviewPolicyExplanation, ReviewPolicySummary, RoleDefinition, Worker } from "./types.js";
import {
  cleanupWorktree,
  createImplementationWorktree,
  resolveTaskBaseCwd,
  setWorktreeReadOnly,
  type WorktreeHandle,
  type WorktreePreparation,
  type WorktreeOptions,
} from "./worktree.js";

export const liveRunModeSchema = z.enum(["single_worker", "single_worker_with_review"]);
export type LiveRunMode = z.infer<typeof liveRunModeSchema>;

const liveRunTaskSchema = z.object({
  taskId: z.string().min(1),
  coordinatorId: z.string().min(1),
  coordinatorTemplate: z.string().min(1).optional(),
  template: z.string().min(1).optional(),
  requiredRoles: z.array(z.string().min(1)).optional(),
  optionalRoles: z.array(z.string().min(1)).optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  leaseDurationMs: z.number().int().positive().optional(),
  mode: coordinatorModeSchema.default("single_worker"),
  prompt: z.string().min(1),
  cwd: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  effortLevel: z.string().min(1).optional(),
}).strict();

export interface RunOrchestrationTaskOptions {
  context: ApiContext;
  task: unknown;
  mode?: LiveRunMode;
}

export type OrchestrationRunTaskResult =
  | { ok: false; state: "blocked_resource"; mode: LiveRunMode; queueItem: QueueItem; reviewPolicy: ReviewPolicySummary }
  | { ok: true; state: "completed"; mode: LiveRunMode; allocation: Allocation; sessions: OrchestrationRunSession[]; reviewPolicy: ReviewPolicySummary };

export interface OrchestrationRunSession {
  sessionId: string;
  leaseId: string;
  workerId: string;
  role: string;
  status: string;
  error: string | null;
  cwd: string;
  workspaceMode: LeaseWorkspace["mode"];
  worktreePath?: string;
  reviewPolicy?: ReviewPolicyExplanation;
}

type LeaseWorkspace =
  | { mode: "shared"; cwd: string; downgradeReason?: string }
  | { mode: "implementation_worktree"; cwd: string; handle: WorktreeHandle }
  | { mode: "review_read_only_worktree"; cwd: string; handle: WorktreeHandle };

export async function runOrchestrationTask(opts: RunOrchestrationTaskOptions): Promise<OrchestrationRunTaskResult> {
  const runtime = opts.context.orchestration?.runtime;
  if (!runtime) throw new Error("orchestration runtime is not enabled");

  const parsed = liveRunTaskSchema.parse(opts.task);
  const mode = opts.mode ?? liveRunModeSchema.parse(parsed.mode);

  const requestInput = {
    taskId: parsed.taskId,
    coordinatorId: parsed.coordinatorId,
    coordinatorTemplate: parsed.coordinatorTemplate,
    template: parsed.template,
    requiredRoles: parsed.requiredRoles,
    optionalRoles: parsed.optionalRoles,
    priority: parsed.priority,
    leaseDurationMs: parsed.leaseDurationMs ?? resolveLiveLeaseDurationMs(opts.context.getConfig()),
    mode: mode as CoordinatorMode,
  };
  const brief = buildCoordinatorTaskBrief(requestInput, runtime.config);
  const allocationResult = runtime.requestAllocation(brief.request);
  if (!allocationResult.ok) {
    return { ok: false, state: "blocked_resource", mode, queueItem: allocationResult.queueItem, reviewPolicy: allocationResult.reviewPolicy };
  }

  const sessions: OrchestrationRunSession[] = [];
  const baseCwd = resolveTaskBaseCwd(parsed.cwd, opts.context.getConfig());
  const laneWorktrees = new Map<string, WorktreeHandle>();
  const roleDefinitions = new Map(runtime.config.roles.map((role) => [role.id, role]));
  const reviewPolicyByRole = new Map(allocationResult.reviewPolicy.explanations.map((explanation) => [explanation.role, explanation]));
  try {
    for (const lease of allocationResult.allocation.leases) {
      const worker = requireWorker(runtime.listWorkers(), lease.workerId);
      const role = roleDefinitions.get(lease.role);
      let turnStarted = false;
      try {
        const workspace = prepareLeaseWorkspace({
          baseCwd,
          lease,
          role,
          worker,
          worktrees: laneWorktrees,
          runtime,
        });
        turnStarted = true;
        sessions.push(await runLeaseTurn({
          context: opts.context,
          mode,
          lease,
          worker,
          workspace,
          reviewPolicy: reviewPolicyByRole.get(lease.role),
          prompt: promptForRole(parsed.prompt, lease.role, role),
          title: parsed.title,
          model: parsed.model,
          effortLevel: parsed.effortLevel,
        }));
      } catch (err) {
        if (!turnStarted) releaseLeaseSafely(runtime, lease);
        throw err;
      }
    }
  } finally {
    for (const handle of laneWorktrees.values()) {
      try {
        cleanupWorktree(handle);
      } catch (err) {
        logger.warn(`Orchestration worktree cleanup failed for ${handle.path}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  return { ok: true, state: "completed", mode, allocation: allocationResult.allocation, sessions, reviewPolicy: allocationResult.reviewPolicy };
}

async function runLeaseTurn(opts: {
  context: ApiContext;
  mode: LiveRunMode;
  lease: Lease;
  worker: Worker;
  workspace: LeaseWorkspace;
  reviewPolicy?: ReviewPolicyExplanation;
  prompt: string;
  title?: string;
  model?: string;
  effortLevel?: string;
}): Promise<OrchestrationRunSession> {
  const runtime = opts.context.orchestration?.runtime;
  if (!runtime) throw new Error("orchestration runtime is not enabled");
  const validation = runtime.validateLeaseForWorker(opts.worker.id, opts.lease.leaseId, opts.lease.taskId, opts.lease.coordinatorId);
  if (!validation.ok) throw new Error(`lease ${opts.lease.leaseId} is not valid for worker ${opts.worker.id}: ${validation.reason ?? "unknown"}`);

  const engine = resolveWorkerEngine(opts.context, opts.worker);
  if (!engine) throw new Error(`engine for worker provider ${opts.worker.provider} is not available`);

  const sessionKey = `orchestration:${opts.lease.taskId}:${opts.lease.role}:${opts.lease.leaseId}`;
  const transportMeta = toLeaseTransportMeta({
    leaseId: opts.lease.leaseId,
    taskId: opts.lease.taskId,
    coordinatorId: opts.lease.coordinatorId,
    workerId: opts.worker.id,
    role: opts.lease.role,
    mode: opts.mode,
  });
  transportMeta["orchestrationWorkspace"] = {
    mode: opts.workspace.mode,
    cwd: opts.workspace.cwd,
    worktreePath: "handle" in opts.workspace ? opts.workspace.handle.path : null,
    readOnly: opts.workspace.mode === "review_read_only_worktree",
    downgradeReason: opts.workspace.mode === "shared" ? opts.workspace.downgradeReason ?? null : null,
  };
  if (opts.reviewPolicy) {
    transportMeta["orchestrationReviewPolicy"] = opts.reviewPolicy as unknown as JsonObject;
  }
  const session = createSession({
    engine: opts.worker.provider,
    source: "web",
    sourceRef: sessionKey,
    connector: "web",
    sessionKey,
    replyContext: { source: "web" },
    transportMeta,
    model: opts.model,
    effortLevel: opts.effortLevel,
    cwd: opts.workspace.cwd,
    title: opts.title ?? `${opts.lease.taskId} ${opts.lease.role}`,
    prompt: opts.prompt,
  });

  insertMessage(session.id, "user", opts.prompt);
  updateSession(session.id, { status: "running", lastActivity: new Date().toISOString(), lastError: null });

  try {
    if (opts.workspace.mode === "review_read_only_worktree") setWorktreeReadOnly(opts.workspace.handle, true);
    await dispatchWebSessionRun(session, opts.prompt, engine, opts.context.getConfig(), opts.context);
  } finally {
    if (opts.workspace.mode === "review_read_only_worktree") {
      try {
        setWorktreeReadOnly(opts.workspace.handle, false);
      } catch (err) {
        logger.warn(`Orchestration worktree restore failed for ${opts.workspace.handle.path}: ${err instanceof Error ? err.message : err}`);
      }
    }
    try {
      runtime.releaseLease(opts.lease.leaseId, opts.lease.coordinatorId);
    } catch (err) {
      logger.warn(`Orchestration release failed for lease ${opts.lease.leaseId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const completed = getSession(session.id);
  return {
    sessionId: session.id,
    leaseId: opts.lease.leaseId,
    workerId: opts.worker.id,
    role: opts.lease.role,
    status: completed?.status ?? "interrupted",
    error: completed?.lastError ?? null,
    cwd: opts.workspace.cwd,
    workspaceMode: opts.workspace.mode,
    worktreePath: "handle" in opts.workspace ? opts.workspace.handle.path : undefined,
    reviewPolicy: opts.reviewPolicy,
  };
}

function prepareLeaseWorkspace(opts: {
  baseCwd: string;
  lease: Lease;
  role?: RoleDefinition;
  worker: Worker;
  worktrees: Map<string, WorktreeHandle>;
  runtime: { getWorktreeOptions(): WorktreeOptions };
}): LeaseWorkspace {
  if (isReviewerRole(opts.lease.role, opts.role)) {
    const implementation = firstWorktree(opts.worktrees);
    if (implementation) return { mode: "review_read_only_worktree", cwd: implementation.path, handle: implementation };
    return { mode: "shared", cwd: opts.baseCwd };
  }
  if (opts.worker.workspacePolicy !== "isolated_worktree") return { mode: "shared", cwd: opts.baseCwd };

  const lane = opts.lease.role;
  const existing = opts.worktrees.get(lane);
  if (existing) return { mode: "implementation_worktree", cwd: existing.path, handle: existing };

  const prepared: WorktreePreparation = createImplementationWorktree({
    taskId: opts.lease.taskId,
    lane,
    baseCwd: opts.baseCwd,
    worktrees: opts.runtime.getWorktreeOptions(),
  });
  if (prepared.mode === "shared") {
    logger.warn(`Orchestration worktree downgraded for task ${opts.lease.taskId}: ${prepared.downgradeReason}`);
    return { mode: "shared", cwd: prepared.cwd, downgradeReason: prepared.downgradeReason };
  }
  opts.worktrees.set(lane, prepared.handle);
  return { mode: "implementation_worktree", cwd: prepared.cwd, handle: prepared.handle };
}

function firstWorktree(worktrees: Map<string, WorktreeHandle>): WorktreeHandle | undefined {
  return worktrees.values().next().value;
}

function releaseLeaseSafely(runtime: { releaseLease(leaseId: string, coordinatorId?: string): Lease }, lease: Lease): void {
  try {
    runtime.releaseLease(lease.leaseId, lease.coordinatorId);
  } catch (err) {
    logger.warn(`Orchestration release failed for lease ${lease.leaseId}: ${err instanceof Error ? err.message : err}`);
  }
}

function resolveWorkerEngine(context: ApiContext, worker: Worker): Engine | undefined {
  return context.ptyViewEngines?.[worker.provider] ?? context.sessionManager.getEngine(worker.provider);
}

function requireWorker(workers: Worker[], workerId: string): Worker {
  const worker = workers.find((candidate) => candidate.id === workerId);
  if (!worker) throw new Error(`allocated worker not found in runtime config: ${workerId}`);
  return worker;
}

function promptForRole(prompt: string, roleId: string, role: RoleDefinition | undefined): string {
  if (!isReviewerRole(roleId, role)) return prompt;
  return [
    "Review-only pass. Do not modify files. Inspect the completed work and report issues, risks, and missing validation.",
    "",
    prompt,
  ].join("\n");
}
