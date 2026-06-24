import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { handleApiRequest, type ApiContext } from "../api.js";
import { handleOrchestrationRoutes } from "../api/orchestration-routes.js";
import { OrchestrationRuntime } from "../../orchestration/runtime.js";
import { PersistentMatrixScheduler } from "../../orchestration/persistent-scheduler.js";
import type { OrchestrationConfig } from "../../orchestration/types.js";

let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-orch-api-"));
  dbPath = path.join(tmpDir, "orchestration.db");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("GET /api/orchestration/*", () => {
  it("observes workers, leases, queue, and allocations without executing work", async () => {
    const cfg = config();
    const scheduler = PersistentMatrixScheduler.open(cfg, { dbPath });
    scheduler.requestAllocation(request("task-one", "coord-one"));
    scheduler.requestAllocation(request("task-two", "coord-two"));
    scheduler.close();

    const ctx = makeCtx(cfg);

    const workers = await get("/api/orchestration/workers", ctx);
    const leases = await get("/api/orchestration/leases", ctx);
    const queue = await get("/api/orchestration/queue", ctx);
    const allocations = await get("/api/orchestration/allocations", ctx);
    const continuations = await get("/api/orchestration/continuations", ctx);

    expect(workers.body).toMatchObject({ workers: [{ id: "codexSenior" }] });
    expect(leases.body).toMatchObject({ leases: [{ taskId: "task-one", state: "running" }] });
    expect(queue.body).toMatchObject({ queue: [{ taskId: "task-two", missingRoles: ["seniorImplementer"] }] });
    expect(allocations.body).toMatchObject({ allocations: [{ taskId: "task-one", state: "allocated" }] });
    expect(continuations.body).toEqual({ continuations: [] });
  });

  it("rejects mutating methods on observe-only routes", async () => {
    const cap = makeRes();
    await handleApiRequest(makeReq("POST", "/api/orchestration/leases"), cap.res, makeCtx(config()));

    expect(cap.status).toBe(405);
    expect(cap.body).toEqual({ error: "Method not allowed" });
  });

  it("reads observe state from the shared runtime when one is present", async () => {
    const ctx = makeCtx(config());
    ctx.orchestration = {
      runtime: {
        listWorkers: () => [{ id: "runtimeWorker" }],
        listLeases: () => [{ taskId: "runtime-task", state: "running" }],
        listQueue: () => [],
        listAllocations: () => [{ taskId: "runtime-task", state: "allocated" }],
        listLiveContinuations: () => [{ taskId: "runtime-task", coordinatorId: "runtime-coord", state: "failed" }],
      } as any,
    };

    const workers = await get("/api/orchestration/workers", ctx);
    const leases = await get("/api/orchestration/leases", ctx);
    const continuations = await get("/api/orchestration/continuations", ctx);

    expect(workers.body).toMatchObject({ workers: [{ id: "runtimeWorker" }] });
    expect(leases.body).toMatchObject({ leases: [{ taskId: "runtime-task" }] });
    expect(continuations.body).toMatchObject({ continuations: [{ taskId: "runtime-task", state: "failed" }] });
  });

  it("returns review-policy explanations for blocked run requests", async () => {
    const runtime = new OrchestrationRuntime({
      config: sameFamilyReviewConfig(),
      dbPath: ":memory:",
      startReaper: false,
    });
    const ctx = makeCtx(sameFamilyReviewConfig());
    ctx.orchestration = { runtime };
    const cap = makeRes();

    await handleOrchestrationRoutes(
      "POST",
      "/api/orchestration/run",
      cap.res,
      ctx,
      makeJsonReq({
        mode: "single_worker_with_review",
        task: {
          taskId: "api-blocked",
          coordinatorId: "api-coord",
          coordinatorTemplate: "withReview",
          mode: "single_worker_with_review",
          prompt: "Implement and review",
        },
      }),
    );

    expect(cap.status).toBe(409);
    expect(cap.body).toMatchObject({
      ok: false,
      state: "blocked_resource",
      reviewPolicy: {
        explanations: [{
          decision: "same_family_fallback_forbidden",
          role: "independentReviewer",
        }],
      },
    });
    runtime.close();
  });

  it("rejects new live run requests when orchestration is disabled in config", async () => {
    const cap = makeRes();
    await handleOrchestrationRoutes(
      "POST",
      "/api/orchestration/run",
      cap.res,
      makeCtx(config(), { enabled: false }),
      makeJsonReq({
        mode: "single_worker",
        task: {
          taskId: "api-disabled",
          coordinatorId: "api-disabled",
          requiredRoles: ["seniorImplementer"],
          prompt: "Do not run",
        },
      }),
    );

    expect(cap.status).toBe(409);
    expect(cap.body).toEqual({ error: "orchestration is disabled" });
  });

  it("retries failed continuations through the live runtime", async () => {
    const ctx = makeCtx(config());
    ctx.orchestration = {
      runtime: {
        retryFailedLiveContinuation: () => ({
          ok: true,
          state: "dispatching",
          continuation: { taskId: "task-retry", coordinatorId: "coord-retry", state: "dispatching" },
          allocation: { allocationId: "alloc-retry" },
          reviewPolicy: { explanations: [] },
        }),
      } as any,
    };
    const cap = makeRes();

    await handleOrchestrationRoutes(
      "POST",
      "/api/orchestration/continuations/retry",
      cap.res,
      ctx,
      makeJsonReq({ taskId: "task-retry", coordinatorId: "coord-retry" }, "/api/orchestration/continuations/retry"),
    );

    expect(cap.status).toBe(202);
    expect(cap.body).toMatchObject({
      ok: true,
      state: "dispatching",
      allocation: { allocationId: "alloc-retry" },
    });
  });
});

async function get(pathname: string, ctx: ApiContext) {
  const cap = makeRes();
  await handleApiRequest(makeReq("GET", pathname), cap.res, ctx);
  expect(cap.status).toBe(200);
  return cap;
}

function makeReq(method: string, urlPath: string) {
  return {
    method,
    url: urlPath,
    headers: { host: "localhost" },
  } as Parameters<typeof handleApiRequest>[0];
}

function makeJsonReq(body: unknown, url = "/api/orchestration/run") {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]) as NonNullable<Parameters<typeof handleOrchestrationRoutes>[4]>;
  Object.assign(req, {
    method: "POST",
    url,
    headers: { host: "localhost", "content-type": "application/json" },
  });
  return req;
}

function makeRes() {
  let status = 200;
  const chunks: Buffer[] = [];
  const res = {
    writeHead(s: number) {
      status = s;
      return this;
    },
    end(buf?: Buffer | string) {
      if (buf) chunks.push(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
    },
  } as unknown as ServerResponse;
  return {
    res,
    get status() {
      return status;
    },
    get body() {
      return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
    },
  };
}

function makeCtx(cfg: OrchestrationConfig, orchestrationCfg: { enabled?: boolean } = { enabled: true }): ApiContext {
  const liveConfig = {
    gateway: { port: 7777, host: "127.0.0.1" },
    engines: {
      default: "claude",
      claude: { bin: "claude", model: "opus" },
      codex: { bin: "codex", model: "gpt" },
      mock: { bin: "mock", model: "mock" },
    },
    connectors: {},
    logging: { file: false, stdout: false, level: "error" },
    orchestration: orchestrationCfg,
  };
  return {
    config: liveConfig as any,
    getConfig: () => liveConfig as any,
    connectors: new Map(),
    startTime: Date.now(),
    emit: vi.fn(),
    sessionManager: {
      getQueue: () => ({ getTransportState: (_key: string, status: string) => status, getPendingCount: () => 0 }),
    },
    orchestration: { config: cfg, dbPath },
  } as unknown as ApiContext;
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
    workers: [
      {
        id: "codexSenior",
        provider: "openai",
        family: "openai",
        tier: "frontier",
        capabilities: ["repo_edit", "coding"],
        tools: ["git", "filesystem"],
        maxConcurrentTasks: 1,
        costClass: "high",
        workspacePolicy: "isolated_worktree",
      },
    ],
    roles: [
      {
        id: "seniorImplementer",
        requiredCapabilities: ["repo_edit", "coding"],
        requiredTools: ["git", "filesystem"],
      },
    ],
    coordinatorTemplates: [
      {
        id: "standardImplementation",
        purpose: "feature work",
        requiredRoles: ["seniorImplementer"],
        optionalRoles: [],
      },
    ],
    quotas: { providers: {}, families: {} },
  };
}

function sameFamilyReviewConfig(): OrchestrationConfig {
  return {
    workers: [
      {
        id: "mockImplementer",
        provider: "mock",
        family: "local",
        tier: "frontier",
        capabilities: ["repo_edit", "coding"],
        tools: ["git", "filesystem"],
        maxConcurrentTasks: 1,
        costClass: "low",
        workspacePolicy: "shared",
      },
      {
        id: "mockReviewer",
        provider: "mock",
        family: "local",
        tier: "frontier",
        capabilities: ["code_review"],
        tools: ["filesystem"],
        maxConcurrentTasks: 1,
        costClass: "low",
        workspacePolicy: "read_only",
      },
    ],
    roles: [
      {
        id: "seniorImplementer",
        requiredCapabilities: ["repo_edit", "coding"],
        requiredTools: ["git", "filesystem"],
      },
      {
        id: "independentReviewer",
        requiredCapabilities: ["code_review"],
        requiredTools: ["filesystem"],
        familyConstraint: "opposite_of_implementer",
      },
    ],
    coordinatorTemplates: [
      {
        id: "withReview",
        purpose: "implementation with review",
        requiredRoles: ["seniorImplementer", "independentReviewer"],
        optionalRoles: [],
      },
    ],
    quotas: { providers: {}, families: {} },
  };
}
