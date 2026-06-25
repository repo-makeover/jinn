# Orchestration Data Integrity Audit

Date: 2026-06-25
Scope: recently implemented matrix orchestration persistence and control surfaces in `packages/jinn/src/orchestration/**`, `packages/jinn/src/gateway/api/orchestration-routes.ts`, and focused orchestration tests/docs.
Authority: audit-only
Primary lens: Data Integrity
Secondary lenses used: Architecture, Reliability, Cascade, Workflow-GUI
Budget: ~18 source/test/doc files, ~20 targeted reads/queries, targeted vitest runs only
Stop condition: reviewed all state-mutating orchestration persistence/control seams named in the recent June 23-24 implementation logs; remaining orchestration surfaces were below this audit's integrity priority floor.

The supplied prompt was treated as a draft. I preserved the intended mission but expanded review to adjacent failure mechanisms and seams implied by the task.

## Surface Inventory

| Entity | Source | Owner | Writers | Readers | Scope Key | Provenance | Integrity Constraint |
|---|---|---|---|---|---|---|---|
| Live run continuations | SQLite `live_run_continuations` | orchestration runtime/store | `run-mode.ts`, `dual-lane.ts`, `runtime.ts`, `recovery-requeue.ts` | runtime retry/recovery routes | `task_id + coordinator_id` | task payload JSON + retry/error fields | one continuation per live task scope |
| Task pauses | SQLite `task_pauses` | orchestration runtime/store | runtime pause/resume routes, recovery requeue | runtime retry filtering, queue routes | `task_id + coordinator_id` | `manager_name`, `pause_reason`, timestamps | pause applies to exactly one queued task scope |
| Holds | SQLite `orchestration_holds` | orchestration runtime/store | hold routes, recovery requeue | runtime headroom filter, hold routes | `hold_id`; optional `task_id/coordinator_id` | manager, role/worker lists, timestamps | hold state must survive restart without affecting unrelated tasks |
| Dual-lane manifests | filesystem `tmp/orchestration-dual-lane/<task>/manifest.json` | dual-lane state | `dual-lane.ts`, `artifacts.ts` | dual-lane select/apply/list routes | `taskId` only | manifest includes `coordinatorId`, lane sessions | one live dual-lane run should not overwrite another run's state |
| Dual-lane artifacts | filesystem + SQLite `artifact_records` | artifact writer/store | `artifacts.ts` | artifact route, apply route | `taskId + kind + lane` | record metadata + file contents | prompt/output/diff/apply artifacts must remain tied to the originating run |
| Recovery manifests | filesystem JSON notice | store recovery | `store-schema.ts`/`store-recovery.ts` | status/recovery routes | manifest path | original/corrupt DB paths and message | recovery should preserve recoverable scope and fail visibly |

## Boundary Map

| Surface | Intended boundary |
|---|---|
| Continuation queue/retry/recovery | composite task scope (`taskId + coordinatorId`), no cross-run reuse |
| Dual-lane selection/apply/artifact view | explicit run identity, human-selected winner only |
| Recovery requeue | recover one quarantined continuation without mutating unrelated recovered state |
| Pause/hold controls | durable control state must remain scoped and restart-safe |
| Artifacts and manifests | provenance-bearing records; no silent overwrite across runs |

## Findings Table

| ID | Severity | Confidence | Summary |
|---|---|---|---|
| DAT-JINN-001 | High | Confirmed | Dual-lane durable state and artifacts collapse multiple coordinators into a `taskId`-only namespace. |
| DAT-JINN-002 | Medium | Confirmed | Recovery requeue can only address `taskId`, so quarantined continuations sharing a task ID cannot be uniquely recovered. |
| DAT-JINN-003 | Medium | Confirmed | Recovery requeue performs multiple durable writes without a transaction and can return an error after partially restoring state. |

## Skill Escalation

| Finding | Primary Lens | Secondary Lens | Why |
|---|---|---|---|
| DAT-JINN-001 | Data Integrity | Architecture | The scope key is consistent in SQLite but dropped in the newer file/artifact seam. |
| DAT-JINN-001 | Data Integrity | Cascade | The collided manifest/artifact state feeds selection, apply-to-base, and artifact viewing. |
| DAT-JINN-002 | Data Integrity | Reliability | Recovery is operator-visible and becomes impossible for a valid quarantined record set. |
| DAT-JINN-003 | Data Integrity | Reliability | A recovery failure can still leave durable state mutated, which changes later runtime behavior. |

### DAT-JINN-001: Dual-lane durable state is keyed by taskId only

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Data-Integrity

Evidence:
- `packages/jinn/src/orchestration/store-schema.ts:93-105` — `live_run_continuations` uses `PRIMARY KEY (task_id, coordinator_id)`.
- `packages/jinn/src/orchestration/live-run.ts:6-8` — live run payload requires both `taskId` and `coordinatorId`.
- `packages/jinn/src/orchestration/dual-lane-state.ts:58-65` — manifest write/read paths key only by `taskId`.
- `packages/jinn/src/orchestration/dual-lane-state.ts:114-123` — task directory and manifest path are derived from `taskId` alone.
- `packages/jinn/src/orchestration/artifacts.ts:57-58` — artifact reads fetch by `taskId` only.
- `packages/jinn/src/orchestration/artifacts.ts:98-105` — patch-apply artifact write receives only `taskId`.
- `packages/jinn/src/orchestration/artifacts.ts:132-141` — prompt/output/diff persistence accepts only `taskId`.
- `packages/jinn/src/orchestration/artifacts.ts:161-169` — artifact file path and `artifactId` are `taskId + kind + lane`, with no `coordinatorId`.
- `packages/jinn/src/gateway/api/orchestration-routes.ts:219-225` — dual-lane selection route accepts `taskId` and `winnerLane` only.
- `packages/jinn/src/gateway/api/orchestration-routes.ts:243-250` — dual-lane apply route accepts `taskId` and `winnerLane` only.
- `packages/jinn/src/gateway/api/orchestration-routes.ts:397-405` — artifact route reads by `taskId` and `kind` only.

Observed behavior:
- Core live-run persistence treats `taskId + coordinatorId` as the owning scope, but the newer dual-lane manifest, artifact, selection, and apply surfaces collapse that scope to `taskId` alone.

Expected boundary:
- Every dual-lane durable read/write should be keyed by the same owning scope as the live continuation and queue state, or by a new immutable run ID that is equally unique.

Failure mechanism:
- The runtime preserves composite scope in SQLite, then the dual-lane file/artifact layer derives directories, manifest paths, artifact IDs, and control-route lookups from only `taskId`. A later run with the same task ID overwrites or reads the prior run's durable state.

Break-it angle:
- Start two `dual_lane` runs with the same `taskId` and different `coordinatorId` values. The second run writes to the same manifest/artifact namespace; later `select`, `apply`, or `artifacts/:taskId/:kind` operations can act on the wrong run.

Impact:
- Cross-run contamination, lost coordinator provenance, silent overwrite of prompt/output/diff artifacts, and potential apply-to-base of the wrong lane's patch.

Operational impact:
- Blast radius: Workflow
- Side-effect class: file
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: unsafe

Adjacent failure modes:
- DAT-JINN-002
- artifact history for repeated task IDs is overwritten rather than versioned
- wrong dual-lane winner selection can be presented back to the operator

Recommended mitigation:
- Remediation patterns: composite_scope_key, immutable_run_identity, provenance_preserving_artifacts
- Minimal repair: thread `coordinatorId` or a generated run ID through dual-lane manifest paths, artifact IDs, artifact routes, and select/apply APIs.
- Local guardrail: reject dual-lane writes when the requested run identity does not match the stored manifest identity.
- Behavior test: run two dual-lane tasks with the same `taskId` and different `coordinatorId`; verify manifests, artifacts, selection, and apply stay isolated.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: M
- Cost drivers: modules, tests, docs
- Nominal implementation agent: codex
- Rationale: the repair spans the state file format, route params, CLI/API callers, and persistence tests, but stays local to orchestration surfaces.

Validation:
- Test: same `taskId`, different `coordinatorId` creates two distinct manifest roots.
- Test: artifact listing requires full run identity and returns only that run's artifacts.
- Test: selecting/applying one run cannot mutate the other run's manifest or patch records.

Non-goals:
- Do not redesign the dual-lane comparison report format.
- Do not broaden the fix into general session identity changes outside orchestration.

### DAT-JINN-002: Recovery requeue cannot uniquely target the full continuation scope

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Data-Integrity

Evidence:
- `packages/jinn/src/orchestration/store-schema.ts:93-105` — recovered continuations are durably keyed by `task_id + coordinator_id`.
- `packages/jinn/src/gateway/api/orchestration-routes.ts:299-314` — recovery route accepts `manifestPath`, `taskId`, and `managerName`, but no `coordinatorId`.
- `packages/jinn/src/orchestration/recovery-requeue.ts:60-64` — recovery lookup queries `WHERE task_id = ?` and rejects multiple rows for the same task ID.

Observed behavior:
- The recovery path cannot identify a single quarantined continuation when more than one record shares the same `taskId`; it errors instead of allowing the operator to recover by the table's real primary key.

Expected boundary:
- Recovery controls should target the same durable scope key as the recovered entity so every valid quarantined record remains individually recoverable.

Failure mechanism:
- Recovery inputs and lookup logic were reduced to `taskId` even though the persisted continuation identity is composite. Duplicate task IDs across coordinators become an unrecoverable ambiguity.

Break-it angle:
- Quarantine a DB containing `live_run_continuations` rows `(taskA, coord1)` and `(taskA, coord2)`. `POST /api/orchestration/recovery/requeue` cannot recover either one because both match the same `taskId`.

Impact:
- Valid recovered work can remain stranded in quarantine even though the DB contains enough information to recover it safely.

Operational impact:
- Blast radius: Local
- Side-effect class: none
- Reversibility: compensatable
- Operator visibility: UI-visible
- Rerun safety: safe

Adjacent failure modes:
- DAT-JINN-001
- manual recovery may push operators toward unsafe direct SQLite edits

Recommended mitigation:
- Remediation patterns: composite_scope_key, recovery_selector_alignment
- Minimal repair: require `coordinatorId` (or immutable run ID) in the recovery API/CLI and query `live_run_continuations` by the full scope key.
- Local guardrail: reject manifests whose recovered continuation set contains ambiguous keys unless the operator supplies the full composite identity.
- Behavior test: a quarantined DB with duplicate `taskId` values across coordinators can recover each row independently.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests, docs
- Nominal implementation agent: codex
- Rationale: the defect is localized to recovery route/CLI/plumbing and one SQL selector, with straightforward focused tests.

Validation:
- Test: recovery requeue with duplicate `taskId` values succeeds when `coordinatorId` is supplied.
- Test: recovery requeue without the disambiguating key fails with an explicit ambiguity error.

Non-goals:
- Do not expand recovery into automatic full-database reconstruction.

### DAT-JINN-003: Recovery requeue can leave partial restored state after returning an error

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Data-Integrity

Evidence:
- `packages/jinn/src/orchestration/recovery-requeue.ts:65-82` — the function writes the continuation, then the task pause, then imports holds before returning success.
- `packages/jinn/src/orchestration/recovery-requeue.ts:91-93` — later exceptions are converted into an error result.
- `packages/jinn/src/orchestration/store-continuations.ts:59-87` — `upsertLiveContinuationInDb` is a direct autocommit write.
- `packages/jinn/src/orchestration/store-controls.ts:96-105` — `setTaskPauseInDb` is a direct autocommit write.
- `packages/jinn/src/orchestration/store-controls.ts:129-157` — `upsertHoldInDb` is a direct autocommit write.

Observed behavior:
- Recovery requeue performs several durable writes in sequence without a transaction. If a later step throws, the route returns an error even though earlier recovery state may already be present in the live orchestration DB.

Expected boundary:
- Recovery import should be all-or-nothing for one continuation scope: either the continuation, pause, and imported holds all persist together, or none of them do.

Failure mechanism:
- The function is not wrapped in a store transaction. JSON parse errors in recovered hold rows, future validation additions, or write failures after the first mutation can strand partially restored state while reporting failure to the operator.

Break-it angle:
- Recover a continuation whose matching recovered hold row has invalid JSON. The continuation and task pause are written first; hold import throws later; the API returns `invalid_record` even though the task is already requeued and paused.

Impact:
- Operator-visible failure can still change live scheduler state, creating confusing duplicate recovery attempts or hidden queued work.

Operational impact:
- Blast radius: Workflow
- Side-effect class: DB
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: unsafe

Adjacent failure modes:
- DAT-JINN-002
- repeated recovery attempts can stack more durable mutations onto an already partially restored task

Recommended mitigation:
- Remediation patterns: transactional_recovery_import, fail_visible_recovery
- Minimal repair: wrap recovered continuation, pause, and hold import writes in one DB transaction on the live store.
- Local guardrail: add a failing hold-parse test that proves no continuation or pause row persists on error.
- Behavior test: injected failure during hold import leaves the live orchestration store unchanged.

Implementation assessment:
- Complexity: persistence_recovery
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: the fix is narrow but touches recovery semantics and needs careful rollback assertions.

Validation:
- Test: invalid recovered hold JSON aborts recovery with zero live-store mutations.
- Test: successful recovery persists continuation, pause, and holds in one atomic commit.

Non-goals:
- Do not broaden this repair into a new generic transaction abstraction unless another live recovery path needs it.

## Non-Findings

- `Not Confirmed` — duplicate continuation rows in the primary live store: `live_run_continuations`, `queue_items`, and `task_pauses` all enforce `PRIMARY KEY (task_id, coordinator_id)` in `packages/jinn/src/orchestration/store-schema.ts:76`, `packages/jinn/src/orchestration/store-schema.ts:105`, and `packages/jinn/src/orchestration/store-schema.ts:115`.
- `Not Confirmed` — orphaned allocation/lease join rows on normal snapshot replacement: `allocation_leases` has foreign keys with `ON DELETE CASCADE` in `packages/jinn/src/orchestration/store-schema.ts:57-61`.
- `Not Confirmed` — corrupt orchestration DB contents silently promoted to authority on boot: `openStoreDatabase()` quarantines the DB, writes a recovery manifest, and starts from an empty store in `packages/jinn/src/orchestration/store-schema.ts:136-163`.
- `Not Confirmed` — role-only holds silently blocking worker capacity: current runtime headroom filtering only enforces explicit `workerIds`, and the docs/logs already describe role-only holds as visible but non-blocking behavior. I did not find a contradictory claim in the reviewed orchestration docs.

## Required Inventory Coverage

| Check | Result |
|---|---|
| DAT-001 Scope Leakage | Finding: DAT-JINN-001 |
| DAT-002 Duplicate Entity | Not Confirmed in reviewed SQLite-backed continuation/queue/pause state |
| DAT-003 Orphaned Record | Not Confirmed in reviewed allocation/lease join state |
| DAT-004 Lost Provenance | Finding: DAT-JINN-001 |
| DAT-005 Corrupt Merge | Not Confirmed in reviewed orchestration persistence paths |
| DAT-006 Incorrect Normalization | Not Confirmed in reviewed orchestration persistence paths |
| DAT-007 Partial Persistence | Finding: DAT-JINN-003 |
| DAT-008 Migration Meaning Loss | Not Reviewed deeply; no new schema migration file beyond runtime `ALTER TABLE` helpers was implicated by the recent orchestration slice |
| DAT-009 Round-Trip Loss | Finding-adjacent: DAT-JINN-002 blocks full recovery round-trip for duplicate task IDs |
| DAT-010 Stale Derived Data | Not Confirmed in reviewed durable control-state paths |
| DAT-011 Evidence Misclassification | Not Confirmed in reviewed orchestration telemetry/artifact metadata |
| DAT-012 Advisory Output Misrepresented | Not Confirmed in reviewed orchestration docs/routes |
| DAT-013 Silent Constraint Violation | Not Confirmed in reviewed SQLite primary-key/FK-backed core state |
| DAT-014 Cross-Batch Contamination | Finding: DAT-JINN-001 |
| DAT-015 Weak Data Promoted To Authority | Not Confirmed on boot-time corrupt-DB handling; the reviewed path fails closed to quarantine |

## Break-It Review

- Tried the scope angle: the core runtime uses `taskId + coordinatorId`, but dual-lane durable state and recovery controls do not carry that full scope through newer file/control seams.
- Tried the provenance angle: coordinator provenance is present in continuations and manifests, but lost as an addressing key in dual-lane durable state.
- Tried the round-trip angle: corrupt-DB recovery cannot faithfully round-trip every valid continuation when duplicate task IDs exist, and the import is not atomic on failure.
- Tried the promotion angle: corrupt DB boot recovery is conservative and did not auto-promote quarantined rows into live state.
- Tried the constraint angle: reviewed core SQLite tables use primary keys and some FKs; the more serious defects came from mismatched scope keys and missing transactional grouping rather than absent unique constraints.

## Patch Order

1. Fix DAT-JINN-001 first so dual-lane state, artifacts, and control routes share a non-colliding run identity.
2. Fix DAT-JINN-003 next so recovery writes are atomic before expanding recovery addressing.
3. Fix DAT-JINN-002 once recovery operations are transactional, then add CLI/API support for the full continuation identity.

## Regression And Guardrail Tests

- Add a dual-lane collision test: two runs share `taskId` but differ in `coordinatorId`; manifests, artifacts, and apply/select behavior remain isolated.
- Add artifact route tests that require the full run identity and prove no cross-run records are returned.
- Add a recovery requeue ambiguity test for duplicate `taskId` values in a quarantined DB.
- Add a recovery requeue atomicity test with a malformed recovered hold row and assert zero live-store mutations after failure.

## Validation Limits

- This was a static, non-destructive audit. I did not run live gateway traffic or manual DB corruption drills beyond reading the recovery code and targeted tests.
- `npx vitest run src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/runtime.test.ts src/orchestration/__tests__/dual-lane.test.ts src/gateway/__tests__/orchestration-routes.test.ts` reported 3 passing files and 1 failing file; the failing file was `src/gateway/__tests__/orchestration-routes.test.ts`, where 8 GET-route tests currently receive `404` via `handleApiRequest`. I treated that as validation context, not as a data-integrity finding in this report.
- `npx vitest run src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/runtime.test.ts src/orchestration/__tests__/dual-lane.test.ts` left one existing timeout in `src/orchestration/__tests__/dual-lane.test.ts`. The reviewed findings above do not depend on reproducing that timeout.
- I did not deep-review unrelated gateway/session/auth regressions exposed by the broader repo test baseline because they were outside this task's orchestration-integrity scope.
