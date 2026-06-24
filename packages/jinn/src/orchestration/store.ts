import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { logger } from "../shared/logger.js";
import { ORCH_DB } from "../shared/paths.js";
import type { LiveRunContinuationRecord, LiveRunContinuationState } from "./live-run.js";
import { DEFAULT_LEASE_DURATION_MS, type Allocation, type Lease, type QueueItem, type SchedulerSnapshot, type TelemetryEvent } from "./types.js";

const SCHEMA_VERSION = 2;
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
  lease_duration_ms INTEGER NOT NULL DEFAULT ${DEFAULT_LEASE_DURATION_MS},
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

CREATE TABLE IF NOT EXISTS live_run_continuations (
  task_id TEXT NOT NULL,
  coordinator_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  state TEXT NOT NULL,
  task_json TEXT NOT NULL,
  enqueued_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_dispatched_at TEXT,
  allocation_id TEXT,
  last_error TEXT,
  PRIMARY KEY (task_id, coordinator_id)
);
CREATE INDEX IF NOT EXISTS idx_orch_live_run_state ON live_run_continuations (state, updated_at, task_id, coordinator_id);
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
  lease_duration_ms?: number;
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

interface LiveRunContinuationRow {
  task_id: string;
  coordinator_id: string;
  mode: LiveRunContinuationRecord["mode"];
  state: LiveRunContinuationState;
  task_json: string;
  enqueued_at: string;
  updated_at: string;
  retry_count: number;
  last_dispatched_at: string | null;
  allocation_id: string | null;
  last_error: string | null;
}

export class OrchestrationStore {
  private constructor(
    private readonly db: Database.Database,
    private readonly recoveryEvent?: TelemetryEvent,
  ) {}

  static open(dbPath = ORCH_DB, opts: StoreOpenOptions = {}): OrchestrationStore {
    try {
      return new OrchestrationStore(openDatabase(dbPath));
    } catch (err) {
      if (opts.recoverCorrupt === false || dbPath === ":memory:" || !fs.existsSync(dbPath)) {
        throw err;
      }
      const corruptPath = moveCorruptDatabase(dbPath, opts.now ?? (() => new Date()));
      const recoveredAt = (opts.now ?? (() => new Date()))().toISOString();
      logger.warn(`orchestration store: moved corrupt DB to ${corruptPath}; starting empty and surfacing recovery telemetry`);
      return new OrchestrationStore(openDatabase(dbPath), {
        eventId: "evt_store_corrupt_recovered_1",
        type: "store_corrupt_recovered",
        timestamp: recoveredAt,
        detail: {
          corruptPath,
          message: "orchestration state could not be trusted; in-flight leases and queue require operator review",
        },
      });
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
    if (this.recoveryEvent && !telemetry.some((event) => event.eventId === this.recoveryEvent?.eventId)) {
      telemetry.unshift(this.recoveryEvent);
    }
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
          lease_id, worker_id, task_id, coordinator_id, role, state, started_at, lease_expires_at, lease_duration_ms, heartbeat_at
        ) VALUES (
          @leaseId, @workerId, @taskId, @coordinatorId, @role, @state, @startedAt, @leaseExpiresAt, @leaseDurationMs, @heartbeatAt
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

  applySnapshotDelta(before: SchedulerSnapshot, after: SchedulerSnapshot): void {
    const beforeLeases = new Map(before.leases.map((lease) => [lease.leaseId, lease]));
    const afterLeases = new Map(after.leases.map((lease) => [lease.leaseId, lease]));
    const beforeAllocations = new Map(before.allocations.map((allocation) => [allocation.allocationId, allocation]));
    const afterAllocations = new Map(after.allocations.map((allocation) => [allocation.allocationId, allocation]));
    const beforeQueue = new Map(before.queue.map((item) => [queueKey(item), item]));
    const afterQueue = new Map(after.queue.map((item) => [queueKey(item), item]));
    const beforeTelemetry = new Map(before.telemetry.map((event) => [event.eventId, event]));
    const afterTelemetry = new Map(after.telemetry.map((event) => [event.eventId, event]));

    const apply = this.db.transaction(() => {
      const deleteAllocationLease = this.db.prepare("DELETE FROM allocation_leases WHERE allocation_id = ?");
      const deleteAllocation = this.db.prepare("DELETE FROM allocations WHERE allocation_id = ?");
      for (const allocationId of beforeAllocations.keys()) {
        if (afterAllocations.has(allocationId)) continue;
        deleteAllocationLease.run(allocationId);
        deleteAllocation.run(allocationId);
      }

      const deleteLease = this.db.prepare("DELETE FROM leases WHERE lease_id = ?");
      for (const leaseId of beforeLeases.keys()) {
        if (!afterLeases.has(leaseId)) deleteLease.run(leaseId);
      }

      const deleteQueueItem = this.db.prepare("DELETE FROM queue_items WHERE task_id = ? AND coordinator_id = ?");
      for (const key of beforeQueue.keys()) {
        if (afterQueue.has(key)) continue;
        const [taskId, coordinatorId] = splitQueueKey(key);
        deleteQueueItem.run(taskId, coordinatorId);
      }

      const deleteTelemetry = this.db.prepare("DELETE FROM telemetry_events WHERE event_id = ?");
      for (const eventId of beforeTelemetry.keys()) {
        if (!afterTelemetry.has(eventId)) deleteTelemetry.run(eventId);
      }

      const upsertLease = this.db.prepare(`
        INSERT INTO leases (
          lease_id, worker_id, task_id, coordinator_id, role, state, started_at, lease_expires_at, lease_duration_ms, heartbeat_at
        ) VALUES (
          @leaseId, @workerId, @taskId, @coordinatorId, @role, @state, @startedAt, @leaseExpiresAt, @leaseDurationMs, @heartbeatAt
        )
        ON CONFLICT(lease_id) DO UPDATE SET
          worker_id = excluded.worker_id,
          task_id = excluded.task_id,
          coordinator_id = excluded.coordinator_id,
          role = excluded.role,
          state = excluded.state,
          started_at = excluded.started_at,
          lease_expires_at = excluded.lease_expires_at,
          lease_duration_ms = excluded.lease_duration_ms,
          heartbeat_at = excluded.heartbeat_at
      `);
      for (const [leaseId, lease] of afterLeases) {
        if (sameJson(lease, beforeLeases.get(leaseId))) continue;
        upsertLease.run(lease);
      }

      const upsertAllocation = this.db.prepare(`
        INSERT INTO allocations (
          allocation_id, task_id, coordinator_id, state, optional_roles_skipped_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(allocation_id) DO UPDATE SET
          task_id = excluded.task_id,
          coordinator_id = excluded.coordinator_id,
          state = excluded.state,
          optional_roles_skipped_json = excluded.optional_roles_skipped_json,
          created_at = excluded.created_at
      `);
      const insertAllocationLease = this.db.prepare(`
        INSERT INTO allocation_leases (allocation_id, lease_id) VALUES (?, ?)
        ON CONFLICT(allocation_id, lease_id) DO NOTHING
      `);
      for (const [allocationId, allocation] of afterAllocations) {
        if (sameAllocationRecord(allocation, beforeAllocations.get(allocationId))) continue;
        upsertAllocation.run(
          allocation.allocationId,
          allocation.taskId,
          allocation.coordinatorId,
          allocation.state,
          JSON.stringify(allocation.optionalRolesSkipped),
          allocation.createdAt,
        );
        deleteAllocationLease.run(allocation.allocationId);
        for (const lease of allocation.leases) {
          insertAllocationLease.run(allocation.allocationId, lease.leaseId);
        }
      }

      const upsertQueueItem = this.db.prepare(`
        INSERT INTO queue_items (
          task_id, coordinator_id, state, missing_roles_json, priority, blocked_since, resume_on_json, request_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_id, coordinator_id) DO UPDATE SET
          state = excluded.state,
          missing_roles_json = excluded.missing_roles_json,
          priority = excluded.priority,
          blocked_since = excluded.blocked_since,
          resume_on_json = excluded.resume_on_json,
          request_json = excluded.request_json
      `);
      for (const [key, item] of afterQueue) {
        if (sameJson(item, beforeQueue.get(key))) continue;
        upsertQueueItem.run(
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

      const upsertTelemetry = this.db.prepare(`
        INSERT INTO telemetry_events (
          event_id, type, task_id, worker_id, provider, family, role, timestamp, detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(event_id) DO UPDATE SET
          type = excluded.type,
          task_id = excluded.task_id,
          worker_id = excluded.worker_id,
          provider = excluded.provider,
          family = excluded.family,
          role = excluded.role,
          timestamp = excluded.timestamp,
          detail_json = excluded.detail_json
      `);
      for (const [eventId, event] of afterTelemetry) {
        if (sameJson(event, beforeTelemetry.get(eventId))) continue;
        upsertTelemetry.run(
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

      this.setMeta(NEXT_SEQ_META_KEY, String(after.nextSeq));
    });
    apply();
  }

  listLiveContinuations(states?: LiveRunContinuationState[]): LiveRunContinuationRecord[] {
    if (!states || states.length === 0) {
      const rows = this.db.prepare(`
        SELECT * FROM live_run_continuations
        ORDER BY updated_at, task_id, coordinator_id
      `).all() as LiveRunContinuationRow[];
      return rows.map(rowToLiveRunContinuation);
    }
    const placeholders = states.map(() => "?").join(", ");
    const rows = this.db.prepare(`
      SELECT * FROM live_run_continuations
      WHERE state IN (${placeholders})
      ORDER BY updated_at, task_id, coordinator_id
    `).all(...states) as LiveRunContinuationRow[];
    return rows.map(rowToLiveRunContinuation);
  }

  getLiveContinuation(taskId: string, coordinatorId: string): LiveRunContinuationRecord | undefined {
    const row = this.db.prepare(`
      SELECT * FROM live_run_continuations
      WHERE task_id = ? AND coordinator_id = ?
    `).get(taskId, coordinatorId) as LiveRunContinuationRow | undefined;
    return row ? rowToLiveRunContinuation(row) : undefined;
  }

  upsertLiveContinuation(record: LiveRunContinuationRecord): void {
    this.db.prepare(`
      INSERT INTO live_run_continuations (
        task_id, coordinator_id, mode, state, task_json, enqueued_at, updated_at,
        retry_count, last_dispatched_at, allocation_id, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(task_id, coordinator_id) DO UPDATE SET
        mode = excluded.mode,
        state = excluded.state,
        task_json = excluded.task_json,
        enqueued_at = excluded.enqueued_at,
        updated_at = excluded.updated_at,
        retry_count = excluded.retry_count,
        last_dispatched_at = excluded.last_dispatched_at,
        allocation_id = excluded.allocation_id,
        last_error = excluded.last_error
    `).run(
      record.taskId,
      record.coordinatorId,
      record.mode,
      record.state,
      JSON.stringify(record.task),
      record.enqueuedAt,
      record.updatedAt,
      record.retryCount,
      record.lastDispatchedAt ?? null,
      record.allocationId ?? null,
      record.lastError ?? null,
    );
  }

  deleteLiveContinuation(taskId: string, coordinatorId: string): void {
    this.db.prepare(`
      DELETE FROM live_run_continuations
      WHERE task_id = ? AND coordinator_id = ?
    `).run(taskId, coordinatorId);
  }

  claimQueuedLiveContinuation(
    taskId: string,
    coordinatorId: string,
    opts: { updatedAt?: string; allocationId?: string } = {},
  ): LiveRunContinuationRecord | undefined {
    const updatedAt = opts.updatedAt ?? new Date().toISOString();
    const claim = this.db.transaction(() => {
      const current = this.db.prepare(`
        SELECT * FROM live_run_continuations
        WHERE task_id = ? AND coordinator_id = ?
      `).get(taskId, coordinatorId) as LiveRunContinuationRow | undefined;
      if (!current || current.state !== "queued") return undefined;
      this.db.prepare(`
        UPDATE live_run_continuations
        SET state = ?, updated_at = ?, retry_count = ?, last_dispatched_at = ?, allocation_id = ?, last_error = NULL
        WHERE task_id = ? AND coordinator_id = ? AND state = ?
      `).run(
        "dispatching",
        updatedAt,
        current.retry_count + 1,
        updatedAt,
        opts.allocationId ?? null,
        taskId,
        coordinatorId,
        "queued",
      );
      const claimed = this.db.prepare(`
        SELECT * FROM live_run_continuations
        WHERE task_id = ? AND coordinator_id = ?
      `).get(taskId, coordinatorId) as LiveRunContinuationRow | undefined;
      return claimed ? rowToLiveRunContinuation(claimed) : undefined;
    });
    return claim();
  }

  markLiveContinuationState(
    taskId: string,
    coordinatorId: string,
    state: LiveRunContinuationState,
    opts: {
      updatedAt?: string;
      allocationId?: string | null;
      lastError?: string | null;
    } = {},
  ): LiveRunContinuationRecord | undefined {
    const updatedAt = opts.updatedAt ?? new Date().toISOString();
    const update = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE live_run_continuations
        SET state = ?, updated_at = ?, allocation_id = ?, last_error = ?
        WHERE task_id = ? AND coordinator_id = ?
      `).run(
        state,
        updatedAt,
        opts.allocationId ?? null,
        opts.lastError ?? null,
        taskId,
        coordinatorId,
      );
      const row = this.db.prepare(`
        SELECT * FROM live_run_continuations
        WHERE task_id = ? AND coordinator_id = ?
      `).get(taskId, coordinatorId) as LiveRunContinuationRow | undefined;
      return row ? rowToLiveRunContinuation(row) : undefined;
    });
    return update();
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
    ensureLeaseDurationColumn(db);
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
    leaseDurationMs: row.lease_duration_ms ?? DEFAULT_LEASE_DURATION_MS,
    heartbeatAt: row.heartbeat_at,
  };
}

function rowToLiveRunContinuation(row: LiveRunContinuationRow): LiveRunContinuationRecord {
  return {
    taskId: row.task_id,
    coordinatorId: row.coordinator_id,
    mode: row.mode,
    state: row.state,
    task: parseJson<LiveRunContinuationRecord["task"]>(row.task_json, "live run task"),
    enqueuedAt: row.enqueued_at,
    updatedAt: row.updated_at,
    retryCount: row.retry_count,
    lastDispatchedAt: row.last_dispatched_at ?? undefined,
    allocationId: row.allocation_id ?? undefined,
    lastError: row.last_error ?? undefined,
  };
}

function ensureLeaseDurationColumn(db: Database.Database): void {
  const columns = db.pragma("table_info(leases)") as Array<{ name: string }>;
  if (columns.some((column) => column.name === "lease_duration_ms")) return;
  db.prepare(`ALTER TABLE leases ADD COLUMN lease_duration_ms INTEGER NOT NULL DEFAULT ${DEFAULT_LEASE_DURATION_MS}`).run();
}

function queueKey(item: Pick<QueueItem, "taskId" | "coordinatorId">): string {
  return `${encodeURIComponent(item.taskId)}\t${encodeURIComponent(item.coordinatorId)}`;
}

function splitQueueKey(key: string): [string, string] {
  const [taskId, coordinatorId] = key.split("\t");
  return [decodeURIComponent(taskId), decodeURIComponent(coordinatorId)];
}

function sameJson(left: unknown, right: unknown): boolean {
  if (right === undefined) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameAllocationRecord(left: Allocation, right: Allocation | undefined): boolean {
  if (!right) return false;
  return JSON.stringify(allocationRecord(left)) === JSON.stringify(allocationRecord(right));
}

function allocationRecord(allocation: Allocation): unknown {
  return {
    allocationId: allocation.allocationId,
    taskId: allocation.taskId,
    coordinatorId: allocation.coordinatorId,
    state: allocation.state,
    optionalRolesSkipped: allocation.optionalRolesSkipped,
    createdAt: allocation.createdAt,
    leaseIds: allocation.leases.map((lease) => lease.leaseId),
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
