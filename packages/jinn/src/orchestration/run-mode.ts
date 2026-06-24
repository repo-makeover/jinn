import { z } from "zod";
import { createSession, getSession, insertMessage, updateSession } from "../sessions/registry.js";
import { logger } from "../shared/logger.js";
import type { Engine } from "../shared/types.js";
import type { ApiContext } from "../gateway/api.js";
import { dispatchWebSessionRun } from "../gateway/api/session-dispatch.js";
import { buildCoordinatorTaskBrief, coordinatorModeSchema, type CoordinatorMode } from "./coordinator.js";
import { toLeaseTransportMeta } from "./lease-meta.js";
import { resolveLiveLeaseDurationMs } from "./runtime.js";
import type { Allocation, Lease, QueueItem, Worker } from "./types.js";

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
  | { ok: false; state: "blocked_resource"; mode: LiveRunMode; queueItem: QueueItem }
  | { ok: true; state: "completed"; mode: LiveRunMode; allocation: Allocation; sessions: OrchestrationRunSession[] };

export interface OrchestrationRunSession {
  sessionId: string;
  leaseId: string;
  workerId: string;
  role: string;
  status: string;
  error: string | null;
}

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
  if (!allocationResult.ok) return { ok: false, state: "blocked_resource", mode, queueItem: allocationResult.queueItem };

  const sessions: OrchestrationRunSession[] = [];
  for (const lease of allocationResult.allocation.leases) {
    sessions.push(await runLeaseTurn({
      context: opts.context,
      mode,
      lease,
      prompt: promptForRole(parsed.prompt, lease.role),
      cwd: parsed.cwd,
      title: parsed.title,
      model: parsed.model,
      effortLevel: parsed.effortLevel,
    }));
  }

  return { ok: true, state: "completed", mode, allocation: allocationResult.allocation, sessions };
}

async function runLeaseTurn(opts: {
  context: ApiContext;
  mode: LiveRunMode;
  lease: Lease;
  prompt: string;
  cwd?: string;
  title?: string;
  model?: string;
  effortLevel?: string;
}): Promise<OrchestrationRunSession> {
  const runtime = opts.context.orchestration?.runtime;
  if (!runtime) throw new Error("orchestration runtime is not enabled");
  const worker = requireWorker(runtime.listWorkers(), opts.lease.workerId);
  const validation = runtime.validateLeaseForWorker(worker.id, opts.lease.leaseId, opts.lease.taskId, opts.lease.coordinatorId);
  if (!validation.ok) throw new Error(`lease ${opts.lease.leaseId} is not valid for worker ${worker.id}: ${validation.reason ?? "unknown"}`);

  const engine = resolveWorkerEngine(opts.context, worker);
  if (!engine) throw new Error(`engine for worker provider ${worker.provider} is not available`);

  const sessionKey = `orchestration:${opts.lease.taskId}:${opts.lease.role}:${opts.lease.leaseId}`;
  const session = createSession({
    engine: worker.provider,
    source: "web",
    sourceRef: sessionKey,
    connector: "web",
    sessionKey,
    replyContext: { source: "web" },
    transportMeta: toLeaseTransportMeta({
      leaseId: opts.lease.leaseId,
      taskId: opts.lease.taskId,
      coordinatorId: opts.lease.coordinatorId,
      workerId: worker.id,
      role: opts.lease.role,
      mode: opts.mode,
    }),
    model: opts.model,
    effortLevel: opts.effortLevel,
    cwd: opts.cwd,
    title: opts.title ?? `${opts.lease.taskId} ${opts.lease.role}`,
    prompt: opts.prompt,
  });

  insertMessage(session.id, "user", opts.prompt);
  updateSession(session.id, { status: "running", lastActivity: new Date().toISOString(), lastError: null });

  try {
    await dispatchWebSessionRun(session, opts.prompt, engine, opts.context.getConfig(), opts.context);
  } finally {
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
    workerId: worker.id,
    role: opts.lease.role,
    status: completed?.status ?? "interrupted",
    error: completed?.lastError ?? null,
  };
}

function resolveWorkerEngine(context: ApiContext, worker: Worker): Engine | undefined {
  return context.ptyViewEngines?.[worker.provider] ?? context.sessionManager.getEngine(worker.provider);
}

function requireWorker(workers: Worker[], workerId: string): Worker {
  const worker = workers.find((candidate) => candidate.id === workerId);
  if (!worker) throw new Error(`allocated worker not found in runtime config: ${workerId}`);
  return worker;
}

function promptForRole(prompt: string, role: string): string {
  if (!role.toLowerCase().includes("review")) return prompt;
  return [
    "Review-only pass. Do not modify files. Inspect the completed work and report issues, risks, and missing validation.",
    "",
    prompt,
  ].join("\n");
}
