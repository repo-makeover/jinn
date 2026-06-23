import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { logger } from "../shared/logger.js";
import { ORCH_DB } from "../shared/paths.js";
import type { Allocation, Lease, QueueItem, SchedulerSnapshot, TelemetryEvent } from "./types.js";

const SCHEMA_VERSION = 1;
const NEXT_SEQ_META_KEY = "scheduler_next_seq";

const CREATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leases (
  lease_id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  coordinator_id TEXT NOT NULL,
  role TEXT NOT NULL,
  state TEXT NOT NULL,
  started_at TEXT NOT NULL,
  lease_expires_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orch_leases_state ON leases (state);
CREATE INDEX IF NOT EXISTS idx_orch_leases_worker_state ON leases (worker_id, state);
CREATE INDEX IF NOT EXISTS idx_orch_leases_task ON leases (task_id);

CREATE TABLE IF NOT EXISTS allocations (
  allocation_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  coordinator_id TEXT NOT NULL,
  state TEXT NOT NULL,
  optional_roles_skipped_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orch_allocations_task ON allocations (task_id);

CREATE TABLE IF NOT EXISTS allocation_leases (
  allocation_id TEXT NOT NULL,
  lease_id TEXT NOT NULL,
  PRIMARY KEY (allocation_id, lease_id),
  FOREIGN KEY (allocation_id) REFERENCES allocations(allocation_id) ON DELETE CASCADE,
  FOREIGN KEY (lease_id) REFERENCES leases(lease_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue_items (
  task_id TEXT NOT NULL,
  coordinator_id TEXT NOT NULL,
  state TEXT NOT NULL,
  missing_roles_json TEXT NOT NULL,
  priority TEXT NOT NULL,
  blocked_since TEXT NOT NULL,
  resume_on_json TEXT NOT NULL,
  request_json TEXT NOT NULL,
  PRIMARY KEY (task_id, coordinator_id)
);
CREATE INDEX IF NOT EXISTS idx_orch_queue_priority ON queue_items (priority, blocked_since, task_id);

CREATE TABLE IF NOT EXISTS telemetry_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  task_id TEXT,
  worker_id TEXT,
  provider TEXT,
  family TEXT,
  role TEXT,
  timestamp TEXT NOT NULL,
  detail_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_orch_telemetry_time ON telemetry_events (timestamp, event_id);
`;

interface StoreOpenOptions {
  recoverCorrupt?: boolean;
  now?: () => Date;
}

interface LeaseRow {
  lease_id: string;
  worker_id: string;
  task_id: string;
  coordinator_id: string;
  role: string;
  state: Lease["state"];
  started_at: string;
  lease_expires_at: string;
  heartbeat_at: string;
}

interface AllocationRow {
  allocation_id: string;
  task_id: string;
  coordinator_id: string;
  state: Allocation["state"];
  optional_roles_skipped_json: string;
  created_at: string;
}

interface AllocationLeaseRow {
  lease_id: string;
}

interface QueueRow {
  task_id: string;
  coordinator_id: string;
  state: QueueItem["state"];
  missing_roles_json: string;
  priority: QueueItem["priority"];
  blocked_since: string;
  resume_on_json: string;
  request_json: string;
}

interface TelemetryRow {
  event_id: string;
  type: TelemetryEvent["type"];
  task_id: string | null;
  worker_id: string | null;
  provider: string | null;
  family: string | null;
  role: string | null;
  timestamp: string;
  detail_json: string | null;
}

export class OrchestrationStore {
  private constructor(private readonly db: Database.Database) {}

  static open(dbPath = ORCH_DB, opts: StoreOpenOptions = {}): OrchestrationStore {
    try {
      return new OrchestrationStore(openDatabase(dbPath));
    } catch (err) {
      if (opts.recoverCorrupt === false || dbPath === ":memory:" || !fs.existsSync(dbPath)) {
        throw err;
      }
      const corruptPath = moveCorruptDatabase(dbPath, opts.now ?? (() => new Date()));
      logger.warn(`orchestration store: moved corrupt DB to ${corruptPath}`);
      return new OrchestrationStore(openDatabase(dbPath));
    }
  }

  close(): void {
    this.db.close();
  }

  loadSnapshot(): SchedulerSnapshot {
    const leases = this.loadLeases();
    const leaseById = new Map(leases.map((lease) => [lease.leaseId, lease]));
    const allocations = this.loadAllocations(leaseById);
    const queue = this.loadQueue();
    const telemetry = this.loadTelemetry();
    const nextSeq = this.loadNextSeq() ?? inferNextSeq({ allocations, leases, queue, telemetry, nextSeq: 1 });
    return { allocations, leases, queue, telemetry, nextSeq };
  }

  replaceSnapshot(snapshot: SchedulerSnapshot): void {
    const replace = this.db.transaction(() => {
      this.db.prepare("DELETE FROM allocation_leases").run();
      this.db.prepare("DELETE FROM allocations").run();
      this.db.prepare("DELETE FROM leases").run();
      this.db.prepare("DELETE FROM queue_items").run();
      this.db.prepare("DELETE FROM telemetry_events").run();

      const insertLease = this.db.prepare(`
        INSERT INTO leases (
          lease_id, worker_id, task_id, coordinator_id, role, state, started_at, lease_expires_at, heartbeat_at
        ) VALUES (
          @leaseId, @workerId, @taskId, @coordinatorId, @role, @state, @startedAt, @leaseExpiresAt, @heartbeatAt
        )
      `);
      for (const lease of snapshot.leases) insertLease.run(lease);

      const insertAllocation = this.db.prepare(`
        INSERT INTO allocations (
          allocation_id, task_id, coordinator_id, state, optional_roles_skipped_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertAllocationLease = this.db.prepare(`
        INSERT INTO allocation_leases (allocation_id, lease_id) VALUES (?, ?)
      `);
      for (const allocation of snapshot.allocations) {
        insertAllocation.run(
          allocation.allocationId,
          allocation.taskId,
          allocation.coordinatorId,
          allocation.state,
          JSON.stringify(allocation.optionalRolesSkipped),
          allocation.createdAt,
        );
        for (const lease of allocation.leases) {
          insertAllocationLease.run(allocation.allocationId, lease.leaseId);
        }
      }

      const insertQueueItem = this.db.prepare(`
        INSERT INTO queue_items (
          task_id, coordinator_id, state, missing_roles_json, priority, blocked_since, resume_on_json, request_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of snapshot.queue) {
        insertQueueItem.run(
          item.taskId,
          item.coordinatorId,
          item.state,
          JSON.stringify(item.missingRoles),
          item.priority,
          item.blockedSince,
          JSON.stringify(item.resumeOn),
          JSON.stringify(item.request),
        );
      }

      const insertTelemetry = this.db.prepare(`
        INSERT INTO telemetry_events (
          event_id, type, task_id, worker_id, provider, family, role, timestamp, detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const event of snapshot.telemetry) {
        insertTelemetry.run(
          event.eventId,
          event.type,
          event.taskId ?? null,
          event.workerId ?? null,
          event.provider ?? null,
          event.family ?? null,
          event.role ?? null,
          event.timestamp,
          event.detail ? JSON.stringify(event.detail) : null,
        );
      }

      this.setMeta("schema_version", String(SCHEMA_VERSION));
      this.setMeta(NEXT_SEQ_META_KEY, String(snapshot.nextSeq));
    });
    replace();
  }

  private loadLeases(): Lease[] {
    const rows = this.db.prepare(`
      SELECT * FROM leases ORDER BY started_at, lease_id
    `).all() as LeaseRow[];
    return rows.map(rowToLease);
  }

  private loadAllocations(leaseById: Map<string, Lease>): Allocation[] {
    const rows = this.db.prepare(`
      SELECT * FROM allocations ORDER BY created_at, allocation_id
    `).all() as AllocationRow[];
    const leaseIdsForAllocation = this.db.prepare(`
      SELECT lease_id FROM allocation_leases WHERE allocation_id = ? ORDER BY lease_id
    `);
    return rows.map((row) => {
      const leaseIds = leaseIdsForAllocation.all(row.allocation_id) as AllocationLeaseRow[];
      return {
        allocationId: row.allocation_id,
        taskId: row.task_id,
        coordinatorId: row.coordinator_id,
        state: row.state,
        optionalRolesSkipped: parseJson<string[]>(row.optional_roles_skipped_json, "allocation optional roles"),
        createdAt: row.created_at,
        leases: leaseIds.map((leaseRow) => {
          const lease = leaseById.get(leaseRow.lease_id);
          if (!lease) throw new Error(`orchestration DB references missing lease ${leaseRow.lease_id}`);
          return { ...lease };
        }),
      };
    });
  }

  private loadQueue(): QueueItem[] {
    const rows = this.db.prepare(`
      SELECT * FROM queue_items ORDER BY blocked_since, task_id, coordinator_id
    `).all() as QueueRow[];
    return rows.map((row) => ({
      taskId: row.task_id,
      coordinatorId: row.coordinator_id,
      state: row.state,
      missingRoles: parseJson<string[]>(row.missing_roles_json, "queue missing roles"),
      priority: row.priority,
      blockedSince: row.blocked_since,
      resumeOn: parseJson<QueueItem["resumeOn"]>(row.resume_on_json, "queue resume triggers"),
      request: parseJson<QueueItem["request"]>(row.request_json, "queue allocation request"),
    }));
  }

  private loadTelemetry(): TelemetryEvent[] {
    const rows = this.db.prepare(`
      SELECT * FROM telemetry_events ORDER BY timestamp, event_id
    `).all() as TelemetryRow[];
    return rows.map((row) => ({
      eventId: row.event_id,
      type: row.type,
      taskId: row.task_id ?? undefined,
      workerId: row.worker_id ?? undefined,
      provider: row.provider ?? undefined,
      family: row.family ?? undefined,
      role: row.role ?? undefined,
      timestamp: row.timestamp,
      detail: row.detail_json ? parseJson<Record<string, unknown>>(row.detail_json, "telemetry detail") : undefined,
    }));
  }

  private loadNextSeq(): number | null {
    const row = this.db.prepare("SELECT value FROM meta WHERE key = ?").get(NEXT_SEQ_META_KEY) as { value: string } | undefined;
    if (!row) return null;
    const value = Number.parseInt(row.value, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private setMeta(key: string, value: string): void {
    this.db.prepare(`
      INSERT INTO meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }
}

function openDatabase(dbPath: string): Database.Database {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  try {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(CREATE_SCHEMA);
    db.prepare(`
      INSERT INTO meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run("schema_version", String(SCHEMA_VERSION));
    return db;
  } catch (err) {
    db.close();
    throw err;
  }
}

function rowToLease(row: LeaseRow): Lease {
  return {
    leaseId: row.lease_id,
    workerId: row.worker_id,
    taskId: row.task_id,
    coordinatorId: row.coordinator_id,
    role: row.role,
    state: row.state,
    startedAt: row.started_at,
    leaseExpiresAt: row.lease_expires_at,
    heartbeatAt: row.heartbeat_at,
  };
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    throw new Error(`invalid orchestration DB JSON in ${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function inferNextSeq(snapshot: SchedulerSnapshot): number {
  let max = 0;
  for (const id of [
    ...snapshot.allocations.map((allocation) => allocation.allocationId),
    ...snapshot.leases.map((lease) => lease.leaseId),
    ...snapshot.telemetry.map((event) => event.eventId),
  ]) {
    const match = id.match(/_(\d+)$/);
    if (!match) continue;
    max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return Math.max(1, max + 1);
}

function moveCorruptDatabase(dbPath: string, now: () => Date): string {
  const basePath = nextCorruptPath(dbPath, now);
  renameIfExists(dbPath, basePath);
  renameIfExists(`${dbPath}-wal`, `${basePath}-wal`);
  renameIfExists(`${dbPath}-shm`, `${basePath}-shm`);
  return basePath;
}

function nextCorruptPath(dbPath: string, now: () => Date): string {
  const stamp = now().toISOString().replace(/[^0-9A-Za-z]+/g, "-").replace(/-$/, "");
  let candidate = `${dbPath}.corrupt.${stamp}`;
  let index = 1;
  while (fs.existsSync(candidate)) {
    candidate = `${dbPath}.corrupt.${stamp}.${index++}`;
  }
  return candidate;
}

function renameIfExists(source: string, target: string): void {
  if (!fs.existsSync(source)) return;
  fs.renameSync(source, target);
}
