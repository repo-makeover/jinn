import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiContext } from "../../gateway/api.js";
import type { Engine, EngineRunOpts, EngineResult, JinnConfig } from "../../shared/types.js";
import type { OrchestrationConfig, Worker } from "../types.js";

let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  prevHome = process.env.JINN_HOME;
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-orch-run-mode-"));
  process.env.JINN_HOME = tmpHome;
  vi.resetModules();
});

afterEach(() => {
  if (prevHome === undefined) delete process.env.JINN_HOME;
  else process.env.JINN_HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  vi.resetModules();
});

describe("runOrchestrationTask", () => {
  it("runs five low-risk single-worker tasks and releases every lease", async () => {
    const { runOrchestrationTask, OrchestrationRuntime, getSession } = await loadModules();
    const engine = new RecordingEngine();
    const runtime = new OrchestrationRuntime({ config: config(), dbPath: ":memory:", startReaper: false });
    const ctx = makeContext(runtime, engine);

    for (let i = 0; i < 5; i++) {
      const result = await runOrchestrationTask({
        context: ctx,
        task: {
          taskId: `task-${i}`,
          coordinatorId: `coord-${i}`,
          requiredRoles: ["seniorImplementer"],
          mode: "single_worker",
          prompt: `Implement low-risk task ${i}`,
          leaseDurationMs: 60_000,
        },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.sessions[0]).toMatchObject({ role: "seniorImplementer", status: "idle", error: null });
      expect(getSession(result.sessions[0].sessionId)?.transportMeta).toMatchObject({
        orchestrationLease: {
          leaseId: result.sessions[0].leaseId,
          workerId: "mockImplementer",
          mode: "single_worker",
        },
      });
    }

    expect(engine.run).toHaveBeenCalledTimes(5);
    expect(runtime.listLeases().every((lease) => lease.state === "released")).toBe(true);
    expect(runtime.listQueue()).toEqual([]);
    runtime.close();
  });

  it("runs implementer and reviewer leases sequentially in review mode", async () => {
    const { runOrchestrationTask, OrchestrationRuntime } = await loadModules();
    const engine = new RecordingEngine();
    const runtime = new OrchestrationRuntime({ config: reviewConfig(), dbPath: ":memory:", startReaper: false });
    const ctx = makeContext(runtime, engine);

    const result = await runOrchestrationTask({
      context: ctx,
      task: {
        taskId: "task-review",
        coordinatorId: "coord-review",
        coordinatorTemplate: "withReview",
        mode: "single_worker_with_review",
        prompt: "Implement and review a small task",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessions.map((session) => session.role)).toEqual(["seniorImplementer", "independentReviewer"]);
    expect(engine.prompts[1]).toContain("Review-only pass");
    expect(runtime.listLeases().map((lease) => lease.state)).toEqual(["released", "released"]);
    runtime.close();
  });
});

async function loadModules() {
  const [runMode, runtime, registry] = await Promise.all([
    import("../run-mode.js"),
    import("../runtime.js"),
    import("../../sessions/registry.js"),
  ]);
  registry.initDb();
  return {
    runOrchestrationTask: runMode.runOrchestrationTask,
    OrchestrationRuntime: runtime.OrchestrationRuntime,
    getSession: registry.getSession,
  };
}

class RecordingEngine implements Engine {
  name = "mock";
  prompts: string[] = [];
  run = vi.fn(async (opts: EngineRunOpts): Promise<EngineResult> => {
    this.prompts.push(opts.prompt);
    opts.onStream?.({ type: "text", content: "mock complete" });
    return { sessionId: opts.sessionId ?? "mock-session", result: "mock complete" };
  });
}

function makeContext(runtime: unknown, engine: Engine): ApiContext {
  const cfg = jinnConfig();
  return {
    config: cfg,
    getConfig: () => cfg,
    startTime: Date.now(),
    emit: vi.fn(),
    connectors: new Map(),
    sessionManager: {
      getEngine: (name: string) => name === "mock" ? engine : undefined,
      getEngines: () => new Map([["mock", engine]]),
      getQueue: () => ({
        enqueue: async (_key: string, run: () => Promise<void>) => run(),
        getTransportState: (_key: string, status: string) => status,
        getPendingCount: () => 0,
      }),
    },
    orchestration: { runtime },
  } as unknown as ApiContext;
}

function worker(overrides: Partial<Worker> & Pick<Worker, "id" | "provider" | "family">): Worker {
  return {
    tier: "frontier",
    capabilities: ["repo_edit", "coding", "code_review"],
    tools: ["git", "filesystem"],
    maxConcurrentTasks: 1,
    costClass: "low",
    workspacePolicy: "shared",
    ...overrides,
  };
}

function config(): OrchestrationConfig {
  return {
    workers: [worker({ id: "mockImplementer", provider: "mock", family: "local" })],
    roles: [
      { id: "seniorImplementer", requiredCapabilities: ["repo_edit", "coding"], requiredTools: ["git", "filesystem"] },
    ],
    coordinatorTemplates: [],
    quotas: { providers: {}, families: {} },
  };
}

function reviewConfig(): OrchestrationConfig {
  return {
    workers: [
      worker({ id: "mockImplementer", provider: "mock", family: "local" }),
      worker({ id: "mockReviewer", provider: "mock", family: "review" }),
    ],
    roles: [
      { id: "seniorImplementer", requiredCapabilities: ["repo_edit", "coding"], requiredTools: ["git", "filesystem"] },
      { id: "independentReviewer", requiredCapabilities: ["code_review"], requiredTools: ["filesystem"], familyConstraint: "opposite_of_implementer" },
    ],
    coordinatorTemplates: [
      { id: "withReview", purpose: "implementation with review", requiredRoles: ["seniorImplementer", "independentReviewer"], optionalRoles: [] },
    ],
    quotas: { providers: {}, families: {} },
  };
}

function jinnConfig(): JinnConfig {
  return {
    gateway: { port: 7777, host: "127.0.0.1" },
    engines: {
      default: "claude",
      claude: { bin: "claude", model: "opus" },
      codex: { bin: "codex", model: "gpt" },
    },
    connectors: {},
    logging: { file: false, stdout: false, level: "error" },
    orchestration: { enabled: true },
  } as JinnConfig;
}
