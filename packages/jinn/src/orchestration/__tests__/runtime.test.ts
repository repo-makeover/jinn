import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrchestrationRuntime } from "../runtime.js";
import type { LiveRunContinuationRecord } from "../live-run.js";
import type { OrchestrationConfig } from "../types.js";
import type { JinnConfig } from "../../shared/types.js";

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
  it("tryAllocationNow persists successful leases without changing normal allocation behavior", () => {
    const runtime1 = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    const immediate = runtime1.tryAllocationNow(request("board-ticket-1", "ticket-dispatch:manual"));

    expect(immediate.ok).toBe(true);
    if (!immediate.ok) return;
    expect(runtime1.listQueue()).toEqual([]);
    runtime1.close();

    const runtime2 = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    expect(runtime2.listLeases()).toEqual([
      expect.objectContaining({
        leaseId: immediate.allocation.leases[0].leaseId,
        taskId: "board-ticket-1",
        coordinatorId: "ticket-dispatch:manual",
        state: "running",
      }),
    ]);
    runtime2.close();
  });

  it("tryAllocationNow reports no capacity without creating queue items", () => {
    const runtime = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    const first = runtime.tryAllocationNow(request("board-ticket-1", "ticket-dispatch:manual"));
    expect(first.ok).toBe(true);

    const busy = runtime.tryAllocationNow(request("board-ticket-2", "ticket-dispatch:manual"));

    expect(busy.ok).toBe(false);
    expect(runtime.listQueue()).toEqual([]);
    runtime.close();
  });

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

  it("released immediate leases wake normal queued orchestration work", async () => {
    const runtime = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    const immediate = runtime.tryAllocationNow(request("board-ticket-1", "ticket-dispatch:manual"));
    expect(immediate.ok).toBe(true);
    if (!immediate.ok) return;
    const blocked = runtime.requestAllocation(request("task-2", "coord-2"));
    expect(blocked.ok).toBe(false);
    runtime.queueLiveContinuation(continuation("task-2", "coord-2"));
    const resumed: Array<{ taskId: string; allocationId: string }> = [];
    runtime.setResumeQueuedRunHandler(async ({ continuation, allocation }) => {
      resumed.push({ taskId: continuation.taskId, allocationId: allocation.allocationId });
    });

    runtime.releaseLease(immediate.allocation.leases[0].leaseId, "ticket-dispatch:manual");

    await waitFor(() => resumed.length === 1);
    expect(resumed[0]).toMatchObject({ taskId: "task-2" });
    runtime.close();
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

  it("retries a failed live continuation by reallocating and dispatching it", async () => {
    const runtime = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    runtime.queueLiveContinuation(continuation("task-3", "coord-3", {
      state: "failed",
      lastError: "forced engine failure",
      allocationId: "alloc-old",
    }));
    const resumed: Array<{ taskId: string; allocationId: string }> = [];
    runtime.setResumeQueuedRunHandler(async ({ continuation, allocation }) => {
      resumed.push({ taskId: continuation.taskId, allocationId: allocation.allocationId });
    });

    const result = runtime.retryFailedLiveContinuation("task-3", "coord-3");

    expect(result).toMatchObject({ ok: true, state: "dispatching" });
    await waitFor(() => resumed.length === 1);
    expect(resumed[0]).toMatchObject({ taskId: "task-3" });
    runtime.close();
  });

  it("loads empirical routing scores while skipping corrupt telemetry lines", async () => {
    const prevHome = process.env.JINN_HOME;
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-orch-runtime-telemetry-"));
    process.env.JINN_HOME = home;
    vi.resetModules();
    try {
      fs.mkdirSync(path.join(home, "logs"), { recursive: true });
      fs.writeFileSync(path.join(home, "logs", "orchestration-telemetry.jsonl"), [
        "{corrupt",
        JSON.stringify({
          task_id: "historical-task",
          coordinator_id: "historical-coord",
          session_id: "historical-session",
          lease_id: "historical-lease",
          worker_id: "betaImplementer",
          provider: "mock",
          family: "local",
          model: "mock",
          role: "seniorImplementer",
          mode: "single_worker",
          source: "orchestration",
          cost: null,
          latency_ms: null,
          tokens: null,
          files_changed: null,
          tests_added: null,
          tests_passed: null,
          review_blockers: null,
          human_edits: null,
          regressions: null,
          disposition: "selected",
          timestamp: "2026-06-24T10:00:00.000Z",
        }),
      ].join("\n"));
      const runtimeModule = await import("../runtime.js");
      const runtime = runtimeModule.createOrchestrationRuntimeFromConfig(jinnConfig(path.join(home, "orchestration.db")), {
        config: twoWorkerConfig(),
        startReaper: false,
      });
      expect(runtime).toBeDefined();
      if (!runtime) return;
      const result = runtime.requestAllocation(request("empirical-task", "coord"));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.allocation.leases[0].workerId).toBe("betaImplementer");
      runtime.close();
    } finally {
      if (prevHome === undefined) delete process.env.JINN_HOME;
      else process.env.JINN_HOME = prevHome;
      fs.rmSync(home, { recursive: true, force: true });
      vi.resetModules();
    }
  });

  it("recovers stale dispatching continuations on boot and releases their leases", () => {
    const runtime1 = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    const allocation = runtime1.requestAllocation(request("stale-task", "stale-coord"));
    expect(allocation.ok).toBe(true);
    if (!allocation.ok) return;
    runtime1.queueLiveContinuation(continuation("stale-task", "stale-coord", {
      state: "dispatching",
      allocationId: allocation.allocation.allocationId,
      updatedAt: "1970-01-01T00:00:00.000Z",
    }));
    runtime1.close();

    const runtime2 = new OrchestrationRuntime({
      config: config(),
      dbPath,
      startReaper: false,
      staleDispatchingContinuationMs: 0,
    });

    expect(runtime2.listLiveContinuations()).toMatchObject([{
      taskId: "stale-task",
      state: "failed",
      lastError: expect.stringContaining("Recovered stale dispatching continuation"),
    }]);
    expect(runtime2.listLeases()).toMatchObject([{ state: "released" }]);
    runtime2.close();
  });

  it("prepareForShutdown fails dispatching continuations and releases running leases", async () => {
    const runtime = new OrchestrationRuntime({ config: config(), dbPath, startReaper: false });
    const allocation = runtime.requestAllocation(request("shutdown-task", "shutdown-coord"));
    expect(allocation.ok).toBe(true);
    if (!allocation.ok) return;
    runtime.queueLiveContinuation(continuation("shutdown-task", "shutdown-coord", {
      state: "dispatching",
      allocationId: allocation.allocation.allocationId,
    }));

    await runtime.prepareForShutdown("test shutdown", 1);

    expect(runtime.listLiveContinuations()).toMatchObject([{ taskId: "shutdown-task", state: "failed", lastError: "test shutdown" }]);
    expect(runtime.listLeases()).toMatchObject([{ state: "released" }]);
    runtime.close();
  });

  it("applies live headroom before allocating a worker", async () => {
    const runtime = new OrchestrationRuntime({
      config: twoWorkerConfig(),
      dbPath,
      startReaper: false,
      jinnConfig: jinnConfig(dbPath),
      headroomFilter: async (workers) => ({
        allowed: workers.filter((worker) => worker.id === "betaImplementer"),
        rejected: workers
          .filter((worker) => worker.id !== "betaImplementer")
          .map((worker) => ({
            worker,
            headroom: { ok: false, provider: worker.provider, reason: "usage_exhausted" },
          })),
      }),
    });

    const result = await runtime.requestAllocationWithLiveHeadroom(request("headroom-task", "headroom-coord"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocation.leases[0].workerId).toBe("betaImplementer");
    runtime.close();
  });
});

function continuation(
  taskId: string,
  coordinatorId: string,
  overrides: Partial<LiveRunContinuationRecord> = {},
): LiveRunContinuationRecord {
  return {
    taskId,
    coordinatorId,
    mode: "single_worker",
    state: overrides.state ?? "queued",
    task: {
      taskId,
      coordinatorId,
      requiredRoles: ["seniorImplementer"],
      priority: "normal",
      leaseDurationMs: 60_000,
      prompt: `Resume ${taskId}`,
    },
    enqueuedAt: "2026-06-24T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-24T10:00:00.000Z",
    retryCount: 0,
    lastDispatchedAt: overrides.lastDispatchedAt,
    allocationId: overrides.allocationId,
    lastError: overrides.lastError,
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

function twoWorkerConfig(): OrchestrationConfig {
  const cfg = config();
  return {
    ...cfg,
    workers: [
      { ...cfg.workers[0], id: "alphaImplementer" },
      { ...cfg.workers[0], id: "betaImplementer" },
    ],
  };
}

function jinnConfig(dbPath: string): JinnConfig {
  return {
    gateway: { port: 7777, host: "127.0.0.1" },
    engines: {
      default: "codex",
      claude: { bin: "claude", model: "opus" },
      codex: { bin: "codex", model: "gpt" },
    },
    connectors: {},
    logging: { file: false, stdout: false, level: "error" },
    orchestration: { enabled: true, empiricalRouting: true, dbPath },
  } as JinnConfig;
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
