import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OrchestrationRuntime } from "../runtime.js";
import type { LiveRunContinuationRecord } from "../live-run.js";
import type { OrchestrationConfig } from "../types.js";

let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-orch-runtime-"));
  dbPath = path.join(tmpDir, "orchestration.db");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("OrchestrationRuntime continuation dispatch", () => {
  it("resumes a persisted blocked live continuation after restart", async () => {
    const runtime1 = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    const first = runtime1.requestAllocation(request("task-1", "coord-1"));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const blocked = runtime1.requestAllocation(request("task-2", "coord-2"));
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    runtime1.queueLiveContinuation(continuation("task-2", "coord-2"));
    runtime1.close();

    const resumed: Array<{ taskId: string; allocationId: string }> = [];
    const runtime2 = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    runtime2.setResumeQueuedRunHandler(async ({ continuation, allocation }) => {
      resumed.push({ taskId: continuation.taskId, allocationId: allocation.allocationId });
    });

    runtime2.releaseLease(first.allocation.leases[0].leaseId, "coord-1");

    await waitFor(() => resumed.length === 1);
    expect(resumed[0]).toMatchObject({ taskId: "task-2" });
    await waitFor(() => runtime2.listLiveContinuations().find((entry) => entry.taskId === "task-2")?.state === "completed");
    runtime2.close();
  });

  it("releases resumed allocations that have no live continuation to dispatch", async () => {
    const runtime = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    const first = runtime.requestAllocation(request("task-1", "coord-1"));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const blocked = runtime.requestAllocation(request("task-2", "coord-2"));
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;

    runtime.releaseLease(first.allocation.leases[0].leaseId, "coord-1");

    await waitFor(() => runtime.listLeases().every((lease) => lease.state !== "running"));
    expect(runtime.listLiveContinuations()).toEqual([]);
    runtime.close();
  });
});

function continuation(taskId: string, coordinatorId: string): LiveRunContinuationRecord {
  return {
    taskId,
    coordinatorId,
    mode: "single_worker",
    state: "queued",
    task: {
      taskId,
      coordinatorId,
      priority: "normal",
      leaseDurationMs: 60_000,
      prompt: `Resume ${taskId}`,
    },
    enqueuedAt: "2026-06-24T10:00:00.000Z",
    updatedAt: "2026-06-24T10:00:00.000Z",
    retryCount: 0,
  };
}

function request(taskId: string, coordinatorId: string) {
  return {
    taskId,
    coordinatorId,
    requiredRoles: ["seniorImplementer"],
    optionalRoles: [],
    priority: "normal" as const,
    leaseDurationMs: 60_000,
  };
}

function config(): OrchestrationConfig {
  return {
    workers: [{
      id: "mockImplementer",
      provider: "mock",
      family: "local",
      tier: "frontier",
      capabilities: ["repo_edit", "coding"],
      tools: ["git", "filesystem"],
      maxConcurrentTasks: 1,
      costClass: "low",
      workspacePolicy: "shared",
    }],
    roles: [{
      id: "seniorImplementer",
      requiredCapabilities: ["repo_edit", "coding"],
      requiredTools: ["git", "filesystem"],
    }],
    coordinatorTemplates: [],
    quotas: { providers: {}, families: {} },
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
