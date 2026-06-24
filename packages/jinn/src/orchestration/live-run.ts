export const LIVE_RUN_MODES = ["single_worker", "single_worker_with_review"] as const;

export type LiveRunMode = typeof LIVE_RUN_MODES[number];
export type LiveRunContinuationState = "queued" | "dispatching" | "completed" | "failed";

export interface LiveRunTaskPayload {
  taskId: string;
  coordinatorId: string;
  coordinatorTemplate?: string;
  template?: string;
  requiredRoles?: string[];
  optionalRoles?: string[];
  priority: "low" | "normal" | "high";
  leaseDurationMs: number;
  prompt: string;
  cwd?: string;
  title?: string;
  model?: string;
  effortLevel?: string;
}

export interface LiveRunContinuationRecord {
  taskId: string;
  coordinatorId: string;
  mode: LiveRunMode;
  state: LiveRunContinuationState;
  task: LiveRunTaskPayload;
  enqueuedAt: string;
  updatedAt: string;
  retryCount: number;
  lastDispatchedAt?: string;
  allocationId?: string;
  lastError?: string;
}
