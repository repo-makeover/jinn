import Database from "better-sqlite3";
import { ORCH_DB } from "../shared/paths.js";
import type { LiveRunContinuationRecord, LiveRunContinuationState } from "./live-run.js";
import {
  claimQueuedLiveContinuationInDb,
  deleteLiveContinuationFromDb,
  getLiveContinuationFromDb,
  getQueuePauseStateFromDb,
  listLiveContinuationsFromDb,
  markLiveContinuationStateInDb,
  setQueuePauseStateInDb,
  type QueuePauseState,
  upsertLiveContinuationInDb,
} from "./store-continuations.js";
import { openStoreDatabase, type StoreOpenOptions } from "./store-schema.js";
import { applySnapshotDeltaToDb, loadSnapshotFromDb, replaceSnapshotInDb } from "./store-snapshot.js";
import type { SchedulerSnapshot, TelemetryEvent } from "./types.js";

export type { QueuePauseState, StoreOpenOptions };

export class OrchestrationStore {
  private constructor(
    private readonly db: Database.Database,
    private readonly recoveryEvent?: TelemetryEvent,
  ) {}

  static open(dbPath = ORCH_DB, opts: StoreOpenOptions = {}): OrchestrationStore {
    const opened = openStoreDatabase(dbPath, opts);
    return new OrchestrationStore(opened.db, opened.recoveryEvent);
  }

  close(): void {
    this.db.close();
  }

  loadSnapshot(): SchedulerSnapshot {
    return loadSnapshotFromDb(this.db, this.recoveryEvent);
  }

  replaceSnapshot(snapshot: SchedulerSnapshot): void {
    replaceSnapshotInDb(this.db, snapshot);
  }

  applySnapshotDelta(before: SchedulerSnapshot, after: SchedulerSnapshot): void {
    applySnapshotDeltaToDb(this.db, before, after);
  }

  listLiveContinuations(states?: LiveRunContinuationState[]): LiveRunContinuationRecord[] {
    return listLiveContinuationsFromDb(this.db, states);
  }

  getLiveContinuation(taskId: string, coordinatorId: string): LiveRunContinuationRecord | undefined {
    return getLiveContinuationFromDb(this.db, taskId, coordinatorId);
  }

  upsertLiveContinuation(record: LiveRunContinuationRecord): void {
    upsertLiveContinuationInDb(this.db, record);
  }

  deleteLiveContinuation(taskId: string, coordinatorId: string): void {
    deleteLiveContinuationFromDb(this.db, taskId, coordinatorId);
  }

  claimQueuedLiveContinuation(
    taskId: string,
    coordinatorId: string,
    opts: { updatedAt?: string; allocationId?: string } = {},
  ): LiveRunContinuationRecord | undefined {
    return claimQueuedLiveContinuationInDb(this.db, taskId, coordinatorId, opts);
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
    return markLiveContinuationStateInDb(this.db, taskId, coordinatorId, state, opts);
  }

  getQueuePauseState(): QueuePauseState {
    return getQueuePauseStateFromDb(this.db);
  }

  setQueuePauseState(state: QueuePauseState): void {
    setQueuePauseStateInDb(this.db, state);
  }
}
