import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ServerResponse } from "node:http";
import { handleApiRequest, type ApiContext } from "../api.js";
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

    expect(workers.body).toMatchObject({ workers: [{ id: "codexSenior" }] });
    expect(leases.body).toMatchObject({ leases: [{ taskId: "task-one", state: "running" }] });
    expect(queue.body).toMatchObject({ queue: [{ taskId: "task-two", missingRoles: ["seniorImplementer"] }] });
    expect(allocations.body).toMatchObject({ allocations: [{ taskId: "task-one", state: "allocated" }] });
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
      } as any,
    };

    const workers = await get("/api/orchestration/workers", ctx);
    const leases = await get("/api/orchestration/leases", ctx);

    expect(workers.body).toMatchObject({ workers: [{ id: "runtimeWorker" }] });
    expect(leases.body).toMatchObject({ leases: [{ taskId: "runtime-task" }] });
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

function makeCtx(cfg: OrchestrationConfig): ApiContext {
  return {
    getConfig: () => ({ gateway: {}, engines: {} }),
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
