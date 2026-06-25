# Orchestration Pipeline Graph Audit (Report-Only)

- Date: 2026-06-25
- Scope: `packages/jinn/src/orchestration/**` + gateway orchestration surface
  (`gateway/api/orchestration-routes.ts`, `gateway/orchestration-runtime-factory.ts`,
  `gateway/orchestration-runtime-manager.ts`).
- Authority: **audit-only**. No source/test files were created or modified. The only
  file written is this report. No test code was written (per run constraint).
- Skill: `audit-pipeline-graph` executed as static analysis; Gates 1–6 rendered as a
  written graph/inventory/invariant report plus a described (not implemented) harness.

## Baseline (Gate 0)

- Branch: `main`. Working tree: modified test files present (`__tests__/{persistent-scheduler,runtime,scheduler,store}.test.ts`,
  new `recovery-requeue.test.ts`) and untracked audit dirs — pre-existing repo state, not
  produced by this run.
- Recent commit of concern: `4c0d970` "refactor: remove authentication check for API
  routes" — deletes the unconditional `isAuthenticatedRequest` gate in
  `gateway/server.ts` for all `/api/` routes (see Finding F1).
- Validation run read-only: `tsc --noEmit` for `jinn-cli` → **exit 0**;
  `vitest run src/orchestration` → **13 files / 125 tests passed**.
- Orchestration is gated by `orchestration.enabled: true` and is **disabled by default**
  (`runtime.ts:588`, route guards throughout). SQLite via `better-sqlite3` (synchronous).
- Existing tests: 11 orchestration + 2 adapter test files. No graph-driven end-to-end
  path harness, no seeded randomized/property pipeline tests. The "pipeline graph" view
  below did not previously exist as a single artifact.

## Summary

The orchestration layer is a well-structured "initiation → validation → routing →
policy/branching → execution → persistence → artifact → trace" pipeline with strong
internal invariants (fail-closed allocation, lease ownership checks, snapshot-delta
persistence with rehydrate-on-error, dirty-base refusal before patch apply, corrupt-DB
quarantine). Static reading found **1 High** (auth gate removal exposing the entire
orchestration mutation surface), **2 Medium** (continuation crash on missing handler
leaves stale `dispatching`; dual-lane `apply` reachable without manager auth), and
**4 Low/Info** findings. 125 existing tests pass; typecheck clean. Most lifecycle
invariants hold; the gaps are at the gateway authorization seam, not the core scheduler.

**Finding count: 7 (1 High, 2 Medium, 4 Low/Info).**

---

## Gate 1 — Pipeline Graph

### Node table

| Node ID | File | Function/Class | Stage Type | Inputs | Outputs | Side Effects | Branches | Terminal? |
|--------|------|----------------|-----------|--------|---------|--------------|----------|-----------|
| N1 | gateway/api/orchestration-routes.ts:54 | `handleOrchestrationRoutes` | entrypoint | method, pathname, req | HTTP json | dispatch | enabled? runtime-bound? method? | no |
| N2 | orchestration/run-mode.ts:103 | `runOrchestrationTask` | entrypoint | task(unknown), mode | run result | session create | enabled/runtime/mode | no |
| N3 | orchestration/run-mode.ts:32 / schemas.ts:68 | `liveRunTaskSchema` / `allocationRequestFileSchema` | validation | raw body | parsed payload | none | strict() reject | no |
| N4 | orchestration/coordinator.ts:57 | `buildCoordinatorTaskBrief` + `applyMode` | contract/policy | parsed, config | AllocationRequest | none | mode enum (matrix/single/.../architecture/local_heavy) | no |
| N5 | orchestration/runtime.ts:136 | `requestAllocation(WithLiveHeadroom)` | routing | AllocationRequest | AllocationResult | lease/queue mutation | headroom filter | no |
| N6 | orchestration/scheduler.ts:97 | `MatrixScheduler.requestAllocation` | routing/decision | request, allowedWorkerIds | ok\|blocked | reserve leases, telemetry | missingRoles → queue | no |
| N7 | orchestration/scheduler.ts:330 | `selectWorker`/`selectOppositeFamilyReviewer` | policy | role, state | worker\|null + explanation | none | opposite-family / same-family fallback / forbidden | no |
| N8 | orchestration/persistent-scheduler.ts:98 | `commitMutation`/`persistOrRehydrate` | persistence | before snapshot | committed delta | SQLite write; rehydrate on err | catch → rehydrate+throw | no |
| N9 | orchestration/store-snapshot.ts:155 | `applySnapshotDeltaToDb` | persistence | before/after snapshot | DB rows | transactional upsert/delete | per-table diff | no |
| N10 | orchestration/run-mode.ts:230 | `runOrchestrationLeaseTurn` | adapter/capability | lease, worker, workspace | OrchestrationRunSession | session run, lease release, telemetry append | validateLease ok? engine present? | no |
| N11 | orchestration/run-mode.ts:428 | `prepareLeaseWorkspace` | capability | lease, role, worker | workspace | worktree/review-bundle create | reviewer / isolated / shared / downgrade | no |
| N12 | orchestration/dual-lane.ts:130 | `runAllocatedDualLaneTask` | capability/branch | task, allocation | DualLaneRunResult | 2 worktrees, 2 sessions | per-lane fail → release+cleanup | no |
| N13 | orchestration/artifacts.ts:153 | `writeArtifact`/`persistDualLaneArtifacts` | artifact_generation | content | ArtifactRecord | fs write + DB row + audit | none | no |
| N14 | orchestration/artifacts.ts:61 | `applyDualLaneWinner` | product_return (canonical write) | taskId, winnerLane, store | DualLaneApplyResult | **git apply to base cwd**, audit | dirty/empty/conflict/state | **yes** |
| N15 | orchestration/dual-lane.ts:242 | `selectDualLaneWinner` | product/branch | taskId, winnerLane | selection result | archive loser, cleanup worktree, manifest update | state/lane validity | no |
| N16 | orchestration/worktree.ts:141 | `applyPatchToGitWorkspace` | adapter | cwd, patch | void | `git apply --check` then `git apply` | check fails → throw | no |
| N17 | orchestration/audit.ts:appendOrchestrationAudit | trace | event, payload | audit line | append-only log | none | no |
| N18 | orchestration/telemetry.ts | `appendOrchestrationTelemetry` | trace | run record | jsonl line | fs append (best-effort) | catch→warn | no |
| N19 | orchestration/store-schema.ts:158 | `openStoreDatabase` | persistence/error_handler | dbPath | db (+recoveryEvent) | quarantine corrupt DB | corrupt → move+manifest | no |
| N20 | orchestration/recovery-requeue.ts:43 | `requeueRecoveredContinuation` | persistence/recovery | manifestPath, taskId, manager | result | upsert continuation + task-pause | not_found/invalid/multi | no |
| N21 | orchestration/runtime.ts:466 | `resumeQueuedAllocation` | execution | allocation, policy | void | claim continuation, run, mark completed/failed | no-handler / no-queued / throw | no |
| N22 | gateway/orchestration-runtime-manager.ts:16 | `swapOrchestrationRuntime` | error_handler/lifecycle | config, runtime | runtime\|undefined | bind/unbind, close | active-work → defer | no |

### Edge table (principal edges)

| Edge | From → To | Condition | Data Passed | Side Effect |
|------|-----------|-----------|-------------|-------------|
| E1 | N1 → N2 | POST `/api/orchestration/run`, enabled | mode, task | — |
| E2 | N2 → N3 | always | raw task | zod strict parse (reject extra/missing) |
| E3 | N3 → N4 | parse ok | parsed payload | applyMode role expansion |
| E4 | N4 → N5 | matrix/coordinator brief | AllocationRequest | headroom resolve |
| E5 | N5 → N6 | — | request, allowedWorkerIds | reserve/queue |
| E6 | N6 → N8 | every mutation | snapshot delta | SQLite commit |
| E7 | N6 → N2(return) | missingRoles>0 | queueItem | queue continuation upsert (N2 path) |
| E8 | N2 → N10 | allocation ok, non-dual | leases | session turns |
| E9 | N2 → N12 | mode==dual_lane | task, allocation | 2-lane run |
| E10 | N10 → N16/N13 | reviewer/impl workspace | diff/patch | worktree diff, artifact write |
| E11 | N12 → N13 | both lanes completed | prompt+diffs | manifest + artifacts (selection_required) |
| E12 | N1 → N15 | POST `dual-lane/select` | taskId, winnerLane | archive loser |
| E13 | N1 → N14 | POST `dual-lane/apply` | taskId, winnerLane | **git apply (canonical write)** |
| E14 | N1 → N20 | POST `recovery/requeue` (+manager auth) | manifest, taskId | requeue paused |
| E15 | N21 → N10 | resume handler set, claim ok | continuation | run; mark completed/failed |
| E16 | N19 → N1/observe | DB corrupt | recoveryEvent | quarantine + recovery notice |

---

## Gate 2 — Path Inventory (risk P0–P3)

| Path ID | Entry | Stages | Decision nodes | Terminal | Side effects | Risk | Existing tests |
|--------|-------|--------|----------------|----------|--------------|------|----------------|
| P-RUN-OK | `/run` | N1→N3→N4→N5→N6→N8→N10→N13→N18 | mode, allocation, validateLease | completed | sessions, telemetry | **P1** | run-mode.test.ts (partial) |
| P-RUN-BLOCKED | `/run` | N1→N6(queue)→N2 | missingRoles | blocked_resource | continuation upsert | P2 | scheduler/run-mode |
| P-RUN-REJECT | `/run` | N1→N3(reject) | strict parse | 400 | none | P2 | run-mode.test.ts |
| P-RUN-FAILSESSION | `/run` | N10 fail | session error | failed | lease release | P1 | run-mode |
| P-DUAL-OK | `/run` dual | N12→N13→manifest | per-lane | selection_required | 2 worktrees, artifacts | **P1** | dual-lane.test.ts |
| P-DUAL-SELECT | `dual-lane/select` | N15 | state/lane | selected | archive+cleanup | P2 | dual-lane.test.ts |
| **P-DUAL-APPLY** | `dual-lane/apply` | N14→N16 | dirty/empty/conflict | applied (canonical write) | **git apply to base repo** | **P0** | artifacts via dual-lane.test.ts |
| P-RECOVERY | `recovery/requeue` | N20 | manifest/continuation | paused | requeue+pause | **P1** | recovery-requeue.test.ts |
| P-RESUME | internal N21 | claim→N10 | handler/claim | completed/failed | lease release | **P1** | runtime.test.ts (partial) |
| P-LEASE-STOP | `leases/stop` | session kill | session mapped? | interrupted | engine kill | P1 | — |
| P-HOLD | `holds` POST | manager auth | scope/exec | created | hold row | P2 | — |
| P-PAUSE/RESUME | `queue/*` | control state | — | paused | meta write | P2 | — |
| P-OBSERVE | GET routes | read | runtime bound? | json | none | P3 | store.test.ts |
| P-CORRUPT | store open | N19 | corrupt? | empty+notice | quarantine | P1 | store.test.ts |

Equivalent clusters: all GET observe routes share (read-only, no mutation) → one cluster.
The five live mutation entrypoints (`run`, `dual-lane/select`, `dual-lane/apply`,
`recovery/requeue`, control routes) are distinct by side-effect class.

---

## Gate 3 — Selected paths (described; replay NOT implemented)

Three mandatory deliberate paths plus five randomized base paths. **Replay is described,
not executed** (report-only run).

- **Path A (canonical success):** `P-RUN-OK`, mode `single_worker`, valid roles, allocation
  succeeds → lease → session completes → telemetry appended. Invariants 1,3,4(n/a),5,12.
- **Path B (controlled branch/degraded):** `P-DUAL-OK` reaching `selection_required` with no
  canonical write, OR `selectOppositeFamilyReviewer` `same_family_fallback_used` branch
  (scheduler.ts:372) where trace explanation records the degraded decision. Invariants 1,3,10,12.
- **Path C (failure/rejection):** `P-RUN-REJECT` — body with extra field rejected by
  `.strict()` (run-mode.ts:50) → 400, no allocation, no persistence. Invariants 2,7,8,14.

Randomized base paths (weights P0=8,P1=5,P2=3,P3=1):

- Seed: `orch-pipe-20260625` (record this for any future implemented replay).
- Candidate paths: 14 (table above). Selection by weight would draw heavily toward
  `P-DUAL-APPLY` (P0=8), `P-RUN-OK`/`P-RESUME`/`P-RECOVERY`/`P-DUAL-OK` (P1=5).
- Path signatures (described): `entry|mode|branchClass|sideEffectClass|terminal`, e.g.
  `run|dual_lane|both-complete|fs+db|selection_required`.
- Input hashing: dual-lane already hashes prompt via `hashPrompt` (dual-lane.ts:493,
  sha256) — reuse for replay input hash. Replay command (described, not run):
  `vitest run src/orchestration --reporter=verbose` seeded via injected `now()` and a
  `:memory:` store, never the real `~/.jinn` DB.

---

## Gate 4 — Branch expansion plan (≤32; described)

Decision nodes to expand to ≥2 outcomes (planned, not implemented):

1. mode enum: matrix / single_worker / single_worker_with_review / architecture /
   local_heavy / dual_lane + unknown-enum reject.
2. allocation: allocated / blocked_resource(queue).
3. reviewer selection: opposite_family_selected / same_family_fallback_used /
   same_family_fallback_forbidden / no_qualified_reviewer (scheduler.ts:357–398).
4. validateLeaseForWorker: ok / not_found / wrong-worker / task_mismatch / expired
   (scheduler.ts:228–242).
5. dual-lane apply: invalid_lane / not_found / invalid_state / dirty_base / empty_patch /
   conflict / applied (artifacts.ts:66–129).
6. persistence: success / delta throws → rehydrate (persistent-scheduler.ts:105).
7. store open: clean / corrupt → quarantine (store-schema.ts:158).
8. recovery: manifest_not_found / invalid_manifest / continuation_not_found /
   invalid_record / multi-row reject / ok.

Estimated ≈26 expanded paths — within the 32 cap.

Deferred branches:

| Deferred Branch | Reason Deferred | Risk | Recommended Follow-Up |
|-----------------|-----------------|------|-----------------------|
| Real engine adapter execution (real-adapter.ts) | needs live CLI/PTY; out of static scope | P1 | integration test w/ stub engine |
| Headroom filter failure-closed (runtime.ts:557) | requires JinnConfig sampling injection | P2 | unit test returning empty Set |
| WAL concurrency / second-process lock | runtime/OS behavior | P2 | concurrency test w/ db lock file |

---

## Gate 6 — Invariants (15 standard) applicability and status

| # | Invariant | Applies | Status | Evidence |
|---|-----------|---------|--------|----------|
| 1 | Accepted job has a trace | yes | Holds | `record("allocation_created")` scheduler.ts:161; telemetry run-mode.ts:307 |
| 2 | Rejected job fails closed | yes | Holds | strict zod reject run-mode.ts:50 / schemas; route 400/409 |
| 3 | Terminal state valid | yes | Holds | `refreshAllocationLifecycle` scheduler.ts:574; states enumerated in types |
| 4 | Output artifact has schema family+version | partial | **Weak** | artifacts carry kind/lane/path but no schema_version field (store-controls.ts:30) — see F5 |
| 5 | Persisted artifact has provenance | yes | Holds | ArtifactRecord taskId/createdAt + audit append artifacts.ts:178 |
| 6 | payload_ref resolves or intentionally absent | yes | Holds | `readArtifactFile` bounds + existence (artifacts.ts:205); `discoverDualLaneArtifacts` fallback |
| 7 | Failure path emits controlled diagnostics | yes | Holds | recordPatchAttempt failed-state artifacts.ts:90,95,110; logger.warn paths |
| 8 | Policy-denied paths no forbidden persistence | yes | Holds | blocked allocation only queues; no lease rows committed (scheduler.ts:119) |
| 9 | Dry-run no durable writes | n/a | No dry-run mode in orchestration | — |
| 10 | Shadow paths create no canonical product | yes (dual-lane) | Holds | `selection_required` writes manifest/artifacts but NOT base repo; canonical write only via explicit `apply` N14 |
| 11 | Unknown capability fails closed | yes | Holds | `requireRole` throws (scheduler.ts:324); missing roles → blocked |
| 12 | Final product traces to initiation | yes | Holds | taskId/coordinatorId threaded through lease→session→artifact→audit |
| 13 | Fuzz input not leaked to unsafe logs | yes | **Risk** | prompt/reason truncated (sanitize* runtime.ts:652) but raw prompt is hashed only in dual-lane; non-dual prompt flows to session/telemetry — see F6 |
| 14 | Invalid branches no partial corrupt state | yes | Holds | `persistOrRehydrate` rehydrates+throws on delta error (persistent-scheduler.ts:105); dual-lane cleanup on throw (dual-lane.ts:235) |
| 15 | Replay metadata for randomized paths | n/a here | Not applicable (no randomized runs implemented) | — |

Repo-specific invariants observed to HOLD: lease ownership enforced on heartbeat/release
(scheduler.ts:174,191); dirty base refused before apply (artifacts.ts:89); worktree path
confined to root (`assertInsideRoot` worktree.ts:305); corrupt DB quarantined not deleted
(store-schema.ts:166).

---

## Findings

| ID | Severity | Confidence | Path | Finding | Evidence | Recommendation |
|----|----------|------------|------|---------|----------|----------------|
| F1 | High | Confirmed | all `/api/orchestration/*` | Commit `4c0d970` removed the unconditional `isAuthenticatedRequest` token gate for `/api/` routes. Remaining gate (`server.ts:1035`) is **conditional** on `shouldRequireGatewayAuth`, which returns false on loopback unless `gateway.authRequired===true`/`authDisabled` (auth.ts:163–171). On a default loopback gateway, the orchestration mutation surface — including `/run` (spawns engine sessions, creates worktrees, runs CLIs) and `dual-lane/apply` (git apply to the base repo) — is now reachable with no token. Orchestration disabled-by-default limits exploitability but the regression widened unauthenticated access. | `git show 4c0d970` removes the 4-line block in `gateway/server.ts`; `auth.ts:151-171`; orchestration-routes.ts:322 has no auth on `/run` | Restore an unconditional auth gate for `/api/` (or make `shouldRequireGatewayAuth` default-on for mutating orchestration routes); add a regression test that POST `/api/orchestration/run` without a token is 401 on a loopback gateway. |
| F2 | Medium | Confirmed | P-RESUME | If a queued continuation is dispatched but no `resumeQueuedRunHandler` is registered, `resumeQueuedAllocation` logs a warn and releases leases but **leaves the continuation in `dispatching`** (it never claims it, so it is not marked failed). Stale recovery relies on the time-based `recoverStaleDispatchingContinuations` cutoff (default 10 min) only at next runtime construction. | runtime.ts:467-473 (early return before `claimQueuedLiveContinuation`); recovery only at runtime.ts:510 on construct | When no handler is registered, mark the continuation `queued` (or `failed`) instead of leaving it `dispatching`, so it is retryable without waiting for the stale cutoff/restart. |
| F3 | Medium | Confirmed | P-DUAL-APPLY | `dual-lane/apply` (canonical git-apply to the base repo) and `dual-lane/select` are gated only by `orchestration.enabled` — **no manager-scope authorization**, unlike `holds` and `recovery/requeue` which call `authorizeManagerScope`. With F1 (no token), any local caller can apply a winning patch to the working tree. | orchestration-routes.ts:204-260 (no `authorizeManagerScope`); contrast holds:134 / requeue:304 | Require manager authorization (or at least the gateway token) for `dual-lane/apply`; the canonical-write path should be the most protected route, not the least. |
| F4 | Low | Confirmed | P-DUAL-APPLY | `safeSegment` (dual-lane-state.ts:126 and artifacts.ts:248) keeps `.` and `-`, so `safeSegment("..")` returns `".."`. Internal callers pass already-validated taskIds and the artifact GET route is protected by `matchRoute` (rejects `.`/`..`/slash, match-route.ts), so no live traversal was found — but the segment sanitizer itself does not neutralize `..`. | dual-lane-state.ts:126-130; match-route.ts dot/slash rejection | Defense-in-depth: have `safeSegment` reject or collapse `..`; do not rely solely on the route matcher. NON-FINDING for an exploitable traversal today. |
| F5 | Low | Confirmed | artifacts | `ArtifactRecord` has no schema family/version field (Invariant 4). Artifacts are plain `.txt` keyed by `taskId:kind:lane`; consumers infer shape from `kind`. Acceptable for current internal use but drifts from the pipeline-audit invariant of versioned product envelopes. | store-controls.ts:30-39; artifacts.ts:167 | If artifact formats may evolve, add a `schemaVersion`/`schemaFamily` to `ArtifactRecord`. |
| F6 | Low | Likely | P-RUN-OK | Invariant 13: non-dual-lane prompts flow verbatim into session creation and telemetry/diff counting; only `pauseReason`/`managerName` are length-sanitized (runtime.ts:652-660) and only dual-lane prompts are hashed. Raw prompt content can therefore reach session transcripts and (indirectly) logs. No secret-scrubbing layer observed in this scope. | run-mode.ts:286 insertMessage(prompt); dual-lane.ts:493 hash only | Confirm prompt handling against the gateway's existing log-redaction policy; out of strict orchestration scope but worth a cross-check. |
| F7 | Info | Confirmed | P-OBSERVE | Observe GET routes open a **fallback store** when no runtime is bound (`openFallbackStore`, recoverCorrupt:false) and close it in `finally` — correct. Several POST routes (`dual-lane/apply`, artifacts) also open/close a fallback store only when runtime is absent. No leak found. NON-FINDING recorded for store-lifecycle safety. | orchestration-routes.ts:248-258,403-408,601 | None; documented as a checked-safe seam. |

### Explicit NON-FINDINGS (seams checked, found safe)

- Path traversal on `/api/orchestration/artifacts/:taskId/:kind`: blocked by `matchRoute`
  (rejects `.`, `..`, `/`, `\`, `%2f`, `%5c`, `\0`). Safe.
- Persistence atomicity: `applySnapshotDeltaToDb` runs in a single `db.transaction`;
  on error `persistOrRehydrate` reloads from DB and rethrows — no partial in-memory drift.
- Corrupt DB handling: quarantined (renamed), not deleted; recovery manifest + telemetry
  emitted; starts empty rather than crashing. Safe and fail-closed.
- Dirty-base guard: `applyDualLaneWinner` refuses when `isGitWorkspaceDirty` (artifacts.ts:89)
  and `git apply --check` precedes `git apply` (worktree.ts:142). Safe.
- Lease ownership: heartbeat/release/validate enforce `coordinatorId`/`workerId` match.
- Runtime swap during active work: deferred, not forced (orchestration-runtime-manager.ts:23).

---

## Validation results

- `tsc --noEmit` (jinn-cli): exit 0 (clean).
- `vitest run src/orchestration`: 13 files / 125 tests passed, ~1.2s.
- No source/test files modified; `git diff --check` clean at start.
- Findings above are from static reading + these read-only checks; no findings were
  produced by executing the pipeline against real `~/.jinn` state.

## Risks / what was NOT reviewed

- Live adapter execution (`adapter/real-adapter.ts`, PTY/engine dispatch) read only at the
  call seam (`runOrchestrationLeaseTurn`), not exercised — engine-side behavior unverified.
- `store-controls.ts`, `store-continuations.ts`, `store-recovery.ts`, `scheduler-retention.ts`,
  `telemetry.ts`, `cross-family.ts`, `routing-headroom.ts`, `org-worker-bridge.ts` read at
  interface/contract level, not line-by-line in full.
- Concurrency (two processes / WAL contention) and the new DB lock file (commit `e858f16`)
  not exercised.
- F1 severity is High by mechanism (auth surface removal); real-world exploitability is
  bounded by orchestration being disabled by default and loopback binding — operators
  enabling orchestration on a network host with `authRequired` set are unaffected.

## Deferred work / next recommended slice

1. Remediate F1 (restore unconditional `/api/` auth or default-on for mutating
   orchestration routes) and F3 (manager auth on `dual-lane/apply`) — highest leverage.
2. Implement the Gate 3/4 path harness (seeded `now()`, `:memory:` store) covering Paths
   A/B/C + the 8 decision-node expansions; add the F1/F3 unauthorized regression tests.
3. Fix F2 (stale `dispatching` when no resume handler) and add a unit test for the
   no-handler branch.
