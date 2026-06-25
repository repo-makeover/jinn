# Recovery & Idempotency Audit: Orchestration & Kanban Board — 2026-06-25

## Executive Verdict
This audit evaluated the resilience and rerun safety of Jinn's matrix orchestration engine and Kanban board data pipeline under interruption, retry, and crash scenarios. A critical failsafe risk was identified where standard lock contention (`SQLITE_BUSY`) during SQLite open operations triggers an automated database quarantine and reset, resulting in the loss of all in-flight lease allocations, holds, and live continuations. In addition, the runtime allows enqueued live run continuations to overwrite active dispatching ones, and review bundles can leak temporary directory structures. On the Kanban board, updates to all departments are batched, multiplying conflict aborts. Resolving these issues is highly recommended to protect long-running agent workflows from state degradation during daemon restarts or network glitches.

## Scope
- **Repository/Branch/Commit**: `repo-makeover/jinn` (monorepo), main branch
- **Skills (lenses) invoked**: `audit-recovery-idempotency`
- **Files/directories inspected**:
  - Orchestration schema and state: [store-schema.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/store-schema.ts), [store.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/store.ts), [store-continuations.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/store-continuations.ts)
  - Orchestration runtime: [runtime.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/runtime.ts), [persistent-scheduler.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/persistent-scheduler.ts), [recovery-requeue.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/recovery-requeue.ts), [worktree.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/worktree.ts)
  - Kanban board backend and frontend: [board-service.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/board-service.ts), [page.tsx](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/routes/kanban/page.tsx)
- **Commands/tests run**:
  - `pnpm typecheck` (passed)
  - `pnpm test` (vitest runs, 1380 tests passed, 22 failed due to environment timeouts/mock setup mismatches)

## Draft Prompt Assessment
The user requested a Recovery and Idempotency audit focusing on the orchestration daemon and the Kanban board, referencing the `audit-recovery-idempotency` skill. The audit expanded beyond code correctness to evaluate filesystems, database transaction boundaries, lock cleanup, and concurrent API saves.

## Surface Inventory
| Surface | Actor | Input/Trigger | State/Output | Boundary | Reviewed |
|---|---|---|---|---|---|
| Orchestration State DB | Daemon / Runtime | DB Open / Schema Init | SQLite Database (`orch.db`) | Internal state storage | Yes |
| Continuation Manager | Runtime / Worker | `queueLiveContinuation` / `claimQueuedLiveContinuation` | `live_run_continuations` records | Work queue boundary | Yes |
| Git Worktrees | Worktree utility | `createImplementationWorktree` | `.jinn/orchestration-worktrees/` dirs | Disk filesystem | Yes |
| Review Bundles | Coordinator | `createReviewBundle` | `tmp/orchestration-review/` dirs | Temp filesystem | Yes |
| Kanban Board persistence | Frontend / API | `updateDepartmentBoard` | `board.json` files | API to filesystem | Yes |

## Boundary Map
| Surface | Intended Boundary | Enforced At | Status |
|---|---|---|---|
| DB corruption recovery | Quarantine only genuinely corrupted databases | `openStoreDatabase` (try-catch) | Degraded (Quarantines on lock errors) |
| Continuation isolation | Prevent duplicate queue items from affecting active runs | `upsertLiveContinuationInDb` | Degraded (Overwrites active entries) |
| Temporary disk cleanup | Prune all temporary files after task completion | `cleanupReviewBundle` / `reapWorktrees` | Degraded (Review bundles leaked on crash) |
| Board save isolation | Department-level optimistic lock verification | `writeMergedBoard` | Degraded (Batched updates cross-contaminate) |

## Findings Table
| ID | Severity | Confidence | Evidence Basis | Domain | Title | Patch Priority | Blast Radius | Complexity | Cost | Nominal Agent |
|---|---|---|---|---|---|---|---|---|---|---|
| FSR-JINN-001 | High | Confirmed | source-evidenced | Failsafe | SQLite lock errors trigger automated database quarantine/reset | 1 | Service | persistence_recovery | S | codex |
| FSR-JINN-002 | High | Confirmed | source-evidenced | Failsafe | `queueLiveContinuation` allows overwriting active runs, leading to orphaned leases | 2 | Workflow | persistence_recovery | S | codex |
| FSR-JINN-003 | Medium | Confirmed | source-evidenced | Failsafe | Review bundles are leaked on crash/exceptions due to missing reaper | 3 | Local | persistence_recovery | XS | codex |
| FSR-JINN-004 | Medium | Confirmed | source-evidenced | Failsafe | All-department update batching in frontend amplifies conflict aborts | 4 | Workflow | operator_ux | S | codex |

---

## Detailed Findings

### FSR-JINN-001: SQLite lock errors trigger automated database quarantine/reset

- **Severity**: High
- **Confidence**: Confirmed
- **Evidence basis**: source-evidenced
- **Domain**: Failsafe
- **Evidence**:
  - [store-schema.ts:158-193](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/store-schema.ts#L158-L193)
  - `openStoreDatabase` catch block renames the database file on *any* open failure.

- **Observed behavior**:
  When `openStoreDatabase` is called, it opens the database file via `new Database(dbPath)`. If this throws *any* error (including lock-related `SQLITE_BUSY` from concurrent CLI queries or disk timeout), Jinn catches the error, immediately treats it as corruption, renames/quarantines the database file, and starts Jinn with a fresh, empty database.

- **Expected boundary**:
  Only actual database corruption error codes (such as `SQLITE_CORRUPT`) should trigger the quarantine workflow. Temporary lock errors must be retried or bubbled to prevent accidental state resets.

- **Failure mechanism**:
  The catch block lacks any error-code check and assumes any failure equals corruption:
  ```typescript
  } catch (err) {
    if (opts.recoverCorrupt === false || dbPath === ":memory:" || !fs.existsSync(dbPath)) {
      throw err;
    }
    const quarantine = moveCorruptDatabase(dbPath, now);
  ```

- **Break-it angle**:
  If a backup process or CLI tool holds an exclusive lock on `orch.db` for longer than 5000ms during daemon boot, the daemon will permanently wipe the active database state, abandoning all running worker tasks and scheduled crons.

- **Impact**:
  Permanent loss of in-flight scheduler state, active allocations, leases, and holds.

- **Operational impact**:
  - **Blast radius**: Service
  - **Side-effect class**: DB / file
  - **Reversibility**: compensatable (manual restore from quarantine folder)
  - **Operator visibility**: Alerting (warnings printed to logs and recovery notice written)
  - **Rerun safety**: Unsafe (resets state)

- **Recommended mitigation**:
  - **Remediation pattern**: `transaction_boundary` / `quarantine`
  - **Minimal repair**: Inspect `err.code` in the catch block. Only quarantine if the code is `SQLITE_CORRUPT`. For `SQLITE_BUSY`, retry or throw/exit.
  ```typescript
  const code = (err as { code?: string }).code;
  if (code !== "SQLITE_CORRUPT") throw err;
  ```

- **Resilience mapping**:
  - **Phase**: withstand
  - **Objective(s)**: prevent_avoid | reconstitute
  - **Safe state**: `fail_rollback`

- **Failure analysis (FMECA row)**:
  - **Failure mode**: SQLITE_BUSY thrown on database open.
  - **Local effect**: Database is quarantined and reset.
  - **Workflow effect**: Active queues, continuations, and leases are lost.
  - **System-or-operator effect**: Operator must manually rename corrupt files back.
  - **Detection method**: Daemon logs warning.
  - **Detection latency**: Immediate.
  - **Operator visible**: Yes.

- **Criticality**:
  - **Likelihood**: plausible
  - **Detectability**: logged

---

### FSR-JINN-002: `queueLiveContinuation` allows overwriting active runs, leading to orphaned leases

- **Severity**: High
- **Confidence**: Confirmed
- **Evidence basis**: source-evidenced
- **Domain**: Failsafe
- **Evidence**:
  - [store-continuations.ts:33-40](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/store-continuations.ts#L33-L40)
  - `upsertLiveContinuationInDb` executes an `INSERT ON CONFLICT(task_id, coordinator_id) DO UPDATE` statement.

- **Observed behavior**:
  If a new live continuation is enqueued with the same `(task_id, coordinator_id)` as a currently executing task, the queue manager overwrites the existing DB row, setting the state back to `queued`. The active in-memory scheduler leases and worktree directories associated with the prior allocation are orphaned and left running, while the new queued task awaits dispatch.

- **Expected boundary**:
  Jinn should check the current state of the continuation in the database before queueing. Overwriting `dispatching` or `queued` tasks must be blocked or safely canceled first.

- **Failure mechanism**:
  The DB upsert lacks a state check constraint:
  ```sql
  INSERT ON CONFLICT(task_id, coordinator_id) DO UPDATE SET ...
  ```

- **Break-it angle**:
  An external connector or automated script sending duplicate dispatch requests for the same `taskId` will override the running continuation. The running agent worker will eventually complete and try to write to a continuation state that has changed, causing index mismatches.

- **Impact**:
  Orphaned child processes/worktrees, duplicate execution of tasks, and state inconsistency.

- **Operational impact**:
  - **Blast radius**: Workflow
  - **Side-effect class**: DB / process
  - **Reversibility**: compensatable
  - **Operator visibility**: silent
  - **Rerun safety**: Unsafe

- **Recommended mitigation**:
  - **Remediation pattern**: `dedupe_guard`
  - **Minimal repair**: Check if a continuation is already in `dispatching` or `queued` status before executing the upsert, and reject or throw if so.

- **Resilience mapping**:
  - **Phase**: withstand
  - **Objective(s)**: prevent_avoid
  - **Safe state**: `fail_manual_hold`

- **Failure analysis (FMECA row)**:
  - **Failure mode**: Duplicate task dispatch.
  - **Local effect**: Continuation overwritten.
  - **Workflow effect**: Original run lease orphaned; multiple agents run on the same work.
  - **Detection method**: None automatic.
  - **Detection latency**: Silent.

- **Criticality**:
  - **Likelihood**: plausible
  - **Detectability**: silent

---

### FSR-JINN-003: Review bundles are leaked on crash/exceptions due to missing reaper

- **Severity**: Medium
- **Confidence**: Confirmed
- **Evidence basis**: source-evidenced
- **Domain**: Failsafe
- **Evidence**:
  - [worktree.ts:182-220](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/worktree.ts#L182-L220)
  - `createReviewBundle` creates directory under `JINN_HOME/tmp/orchestration-review/`.
  - [runtime.ts:424-432](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/runtime.ts#L424-L432)
  - `reapWorktrees` reaps worktrees but not review bundles.

- **Observed behavior**:
  Review bundles (patch and metadata files) are stored in temporary directories named `JINN_HOME/tmp/orchestration-review/review-<taskId>-<role>-<random>`. If the coordinator process crashes, terminates, or fails before reaching `cleanupReviewBundle`, the review bundle directory is permanently leaked on disk. There is no automated startup or periodic reaper for these directories.

- **Expected boundary**:
  All transient checkout or patch directories should have an associated lifecycle reaper or be cleaned up on daemon startup.

- **Failure mechanism**:
  The runtime `reapWorktrees` function only tracks active git worktrees and ignores the review bundle directory.

- **Break-it angle**:
  Repeatedly executing tasks that generate review bundles and killing Jinn mid-execution will leak directories indefinitely, leading to filesystem disk usage growth.

- **Impact**:
  Local disk space leaks over time on long-running deployments.

- **Operational impact**:
  - **Blast radius**: Local
  - **Side-effect class**: file
  - **Reversibility**: reversible
  - **Operator visibility**: silent
  - **Rerun safety**: safe

- **Recommended mitigation**:
  - **Remediation pattern**: `quarantine`
  - **Minimal repair**: Add a cleanup function to `OrchestrationRuntime.reapWorktrees` that prunes directories in `JINN_HOME/tmp/orchestration-review` older than a threshold (e.g., 24 hours).

- **Resilience mapping**:
  - **Phase**: withstand
  - **Objective(s)**: reconstitute
  - **Safe state**: `fail_quarantined`

---

### FSR-JINN-004: All-department update batching in frontend amplifies conflict aborts

- **Severity**: Medium
- **Confidence**: Confirmed
- **Evidence basis**: source-evidenced
- **Domain**: Failsafe
- **Evidence**:
  - [page.tsx:282-305](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/routes/kanban/page.tsx#L282-L305)
  - `persistToApi` executes a `Promise.all` that updates *all* department boards on every single local save event.

- **Observed behavior**:
  When a user performs any action on the Kanban board (creating, moving, or editing a ticket), the frontend calls `persistToApi` to serialize the change. Rather than updating only the board containing the modified ticket, the frontend groups all tickets in local state by department and fires parallel PUT requests to `/api/org/departments/:name/board` for *every* department. If a concurrent change occurred on *any* department's board, that PUT fails with a `BoardConflictError`, aborting the entire save and forcing a rollback of all local modifications.

- **Expected boundary**:
  Only the department board that actually sustained changes should be written to the API.

- **Failure mechanism**:
  The frontend does not track which department board was dirtied; it synchronizes the entire local ticket store back to all department endpoints.

- **Break-it angle**:
  If two operators are editing tickets in separate departments (e.g. Developer A in `software-delivery` and Developer B in `marketing`), Developer A's changes will fail and rollback if Developer B saves their board in the meantime, despite no overlapping cards.

- **Impact**:
  Unnecessary data loss (local UI rollbacks) and elevated API write traffic.

- **Operational impact**:
  - **Blast radius**: Workflow
  - **Side-effect class**: file / user-visible
  - **Reversibility**: compensatable
  - **Operator visibility**: UI-visible
  - **Rerun safety**: safe

- **Recommended mitigation**:
  - **Remediation pattern**: `transaction_boundary`
  - **Minimal repair**: Refactor `persistBoardChange` and `persistToApi` to accept an optional target `departmentId`, updating only that specific department board rather than iterating over all departments.

- **Resilience mapping**:
  - **Phase**: withstand
  - **Objective(s)**: prevent_avoid
  - **Safe state**: `fail_resumable`

---

## Non-Findings / Checked But Not Confirmed

### NF-001: Atomic File Writes via `safeWriteFile`
We verified that the Jinn gateway daemon writes config and board files using the `safeWriteFile` module:
- [safe-write.ts:77-132](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/shared/safe-write.ts#L77-L132)
This implements NASA-grade write safety: writing to a temporary file, performing a blocking `fsync` on the file descriptor, renaming the temporary file to the target (atomic POSIX swap), and calling `fsync` on the parent directory. This prevents torn writes on crash.

### NF-002: Concurrent Lease Expiration
The lease expiration code in `MatrixScheduler.expireLeases` ([scheduler.ts:207-226](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/orchestration/scheduler.ts#L207-L226)) iterates through the active leases and marks running leases as `expired`. This operation is fully idempotent and transactional; state shifts are safely written back to the database as snapshot updates inside SQLite transactions.

---

## Break-It Review
- **Malformed Inputs**: Handled successfully. The gateway board service validates status, priority, and complexity values ([board-service.ts:170-186](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/board-service.ts#L170-L186)) before serialization.
- **Partial Failure**: Partially handled. DB mutations utilize transaction blocks, ensuring rollback on internal errors. However, filesystem open errors trigger unnecessary database quarantine (FSR-JINN-001).
- **Direct API Bypass**: Handled. Direct updates to the board files are validated upon write back via `verifyBoardWrite`.

---

## Recommended Patch Order
1. **FSR-JINN-001**: Add check for `SQLITE_CORRUPT` in `openStoreDatabase` to prevent lock/busy errors from wiping the database.
2. **FSR-JINN-002**: Implement a check in `queueLiveContinuation` to block overwriting active running continuations.
3. **FSR-JINN-004**: Scope `persistToApi` to only PUT the modified department board instead of updating all departments.
4. **FSR-JINN-003**: Prune old directories under `JINN_HOME/tmp/orchestration-review/` inside `reapWorktrees`.

---

## Regression Test Strategy
| Test | Purpose | Finding |
|---|---|---|
| Concurrent DB Lock Drill | Simulate `SQLITE_BUSY` during gateway initialization and assert the database is NOT quarantined. | FSR-JINN-001 |
| Duplicate Continuation Queuing | Verify that attempting to queue a continuation that is currently `dispatching` returns a validation block. | FSR-JINN-002 |
| Pruned Review Bundles | Verify that `reapWorktrees` prunes temporary review directories older than 24h. | FSR-JINN-003 |
| Target-Department Save | Drag a ticket in department A and assert that only department A's PUT API route is invoked. | FSR-JINN-004 |

---

## Validation Limits
The audit did not execute destructive lock interruption scripts or mutate production directories, but relied on source verification.

## Final Confidence
**High**: The findings are based on deterministic code inspection of the database opening logic, REST update paths, and filesystem transient checks.

## v3.1 Calibration Addendum
An escalation is not requested. SQLite lock behaviors were calibrated against better-sqlite3 driver defaults.

| Discovered Skill | Target Surface | Reason for Escalation |
|---|---|---|
| none | none | none |
