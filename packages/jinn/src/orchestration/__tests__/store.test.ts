import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrchestrationStore } from "../store.js";
import type { Lease, SchedulerSnapshot } from "../types.js";

const fixedNow = new Date("2026-06-23T12:00:00.000Z");

let tmpDir: string;
let dbPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jinn-orch-store-"));
  dbPath = path.join(tmpDir, "orchestration.db");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("OrchestrationStore", () => {
  it("initializes an empty WAL-backed database", () => {
    const store = OrchestrationStore.open(dbPath);

    expect(store.loadSnapshot()).toEqual({
      allocations: [],
      leases: [],
      queue: [],
      telemetry: [],
      nextSeq: 1,
    });
    const db = new Database(dbPath);
    expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
    db.close();
    store.close();
  });

  it("round-trips leases, allocations, queue, telemetry, and next sequence state", () => {
    const store = OrchestrationStore.open(dbPath);
    store.replaceSnapshot(exampleSnapshot());
    store.close();

    const reopened = OrchestrationStore.open(dbPath);
    const loaded = reopened.loadSnapshot();

    expect(loaded).toEqual(exampleSnapshot());
    reopened.close();
  });

  it("renames a corrupt database and recreates an empty store", () => {
    const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    fs.writeFileSync(dbPath, "not a sqlite database");

    const store = OrchestrationStore.open(dbPath, { now: () => fixedNow });

    expect(store.loadSnapshot().leases).toEqual([]);
    expect(fs.readdirSync(tmpDir).some((name) => name.startsWith("orchestration.db.corrupt.2026-06-23T12-00-00-000Z"))).toBe(true);
    store.close();
    warnSpy.mockRestore();
  });

  it("rolls back a failed snapshot replacement without leaving partial allocation state", () => {
    const store = OrchestrationStore.open(dbPath);
    const seed = exampleSnapshot();
    store.replaceSnapshot(seed);
    const invalid = {
      ...seed,
      leases: [seed.leases[0], seed.leases[0]],
    };

    expect(() => store.replaceSnapshot(invalid)).toThrow();
    expect(store.loadSnapshot()).toEqual(seed);
    store.close();
  });
});

function exampleSnapshot(): SchedulerSnapshot {
  const lease = exampleLease();
  return {
    allocations: [
      {
        allocationId: "alloc_task_1_2",
        taskId: "task-1",
        coordinatorId: "coord-1",
        state: "allocated",
        leases: [lease],
        optionalRolesSkipped: ["optionalReviewer"],
        createdAt: fixedNow.toISOString(),
      },
    ],
    leases: [lease],
    queue: [
      {
        taskId: "task-2",
        coordinatorId: "coord-2",
        state: "blocked_resource",
        missingRoles: ["seniorImplementer"],
        priority: "high",
        blockedSince: fixedNow.toISOString(),
        resumeOn: ["worker_released", "quota_available", "lease_expired"],
        request: {
          taskId: "task-2",
          coordinatorId: "coord-2",
          requiredRoles: ["seniorImplementer"],
          optionalRoles: [],
          priority: "high",
          leaseDurationMs: 60_000,
        },
      },
    ],
    telemetry: [
      {
        eventId: "evt_3",
        type: "allocation_created",
        taskId: "task-1",
        timestamp: fixedNow.toISOString(),
        detail: { coordinatorId: "coord-1", roles: ["seniorImplementer"] },
      },
    ],
    nextSeq: 4,
  };
}

function exampleLease(): Lease {
  return {
    leaseId: "lease_task_1_seniorImplementer_codexSenior_1",
    workerId: "codexSenior",
    taskId: "task-1",
    coordinatorId: "coord-1",
    role: "seniorImplementer",
    state: "running",
    startedAt: fixedNow.toISOString(),
    leaseExpiresAt: new Date(fixedNow.getTime() + 60_000).toISOString(),
    heartbeatAt: fixedNow.toISOString(),
  };
}
