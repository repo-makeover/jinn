# Orchestration Open-Findings Ledger And Gated Repair Plan

- Date: 2026-06-25
- Actor: Codex
- Authority: docs-only / planning-only
- Trigger: consolidate the June 24-25 audit reports into one arbitrated repair ledger and a gated patch plan
- Scope: orchestration runtime, scheduler, recovery, dual-lane state/artifacts, gateway orchestration routes, runtime lifecycle wiring, and directly coupled Kanban control-plane findings

## Summary

This session consolidated the orchestration-related audit reports, merged duplicate findings,
re-checked the current source tree, and produced one canonical repair plan.

Bottom line:

- The highest-confidence open defects are still the dual-lane `taskId`-only namespace,
  unsafe recovery inputs and non-atomic recovery writes, the loopback-default auth gap on
  orchestration mutation routes, continuation overwrite / retry discipline gaps, and the
  stale runtime-refresh wiring in the gateway.
- Several older findings are now superseded or closed by newer code and should not drive
  new repair work.
- The biggest implementation risks are not the bugs themselves, but patching them in ways
  that break auth bootstrap, strand recovery artifacts, destabilize lease semantics, or
  orphan existing dual-lane manifests.

## Sources Consolidated

Primary orchestration reports reviewed:

- `docs/audits/062026/2026-06-25-orchestration-CONSOLIDATED.md`
- `docs/audits/062026/2026-06-25-orchestration-cascade-io-audit.md`
- `docs/audits/062026/2026-06-25-orchestration-data-integrity-audit.md`
- `docs/audits/062026/2026-06-25-orchestration-internalapi-contract.md`
- `docs/audits/062026/2026-06-25-orchestration-pipeline-graph.md`
- `docs/audits/062026/2026-06-25-orchestration-reliability.md`
- `docs/audits/062026/2026-06-25-orchestration-temporal.md`
- `docs/audits/2026-06-25-recovery-idempotency-orchestration-kanban.md`
- `docs/audits/2026-06-25-orchestration-kanban-nodejs-negative-space-audit.md`
- `docs/audits/2026-06-24-matrix-orchestration-m1-m10-audit.md`

Current-tree spot checks were performed against:

- `packages/jinn/src/orchestration/{dual-lane-state,artifacts,recovery-requeue,scheduler,runtime,run-mode,store-continuations,store-schema,telemetry}.ts`
- `packages/jinn/src/orchestration/adapter/{registry,real-adapter}.ts`
- `packages/jinn/src/gateway/{server,auth,orchestration-runtime-manager}.ts`
- `packages/jinn/src/gateway/api/orchestration-routes.ts`
- `packages/jinn/src/gateway/api.ts`
- `packages/web/src/routes/kanban/page.tsx`

## Arbitration Rules

1. June 25 orchestration-specific reports outrank older broad reports when they cover the same seam.
2. Current source beats historical report language when code has changed.
3. Multi-lens duplicates are merged into one canonical ledger item.
4. Static race findings remain open, but they are gated behind reproduction before behavior changes.
5. Adjacent Kanban/control-plane findings are retained in a secondary track, not mixed into the first orchestration-core patch wave unless explicitly chosen.

## Canonical Open Findings Ledger

### Primary orchestration track

| Canonical ID | Severity | Status | Merged findings | Current confirmation | Primary files | Summary | Biggest patch risk |
|---|---|---|---|---|---|---|---|
| ORCH-001 | High | Confirmed-open | `DAT-JINN-001`, `IOP-JINN-002` | `dual-lane-state.ts` and `artifacts.ts` still key manifests/artifacts by `taskId` only | `dual-lane-state.ts`, `artifacts.ts`, `orchestration-routes.ts`, `dual-lane.ts` | Dual-lane state, artifacts, and control routes collapse distinct runs into one `taskId` namespace | Breaking existing local manifests/artifacts or returning the wrong run during migration |
| ORCH-002 | High | Confirmed-open | `IOP-JINN-001` | `recovery-requeue.ts` still accepts arbitrary `manifestPath` and trusts `corruptDbPath` from the manifest | `recovery-requeue.ts`, `orchestration-routes.ts` | Recovery requeue trusts arbitrary local manifest and DB paths as authoritative input | Over-tight containment could strand legitimate recovery artifacts and block operator recovery |
| ORCH-003 | Medium | Confirmed-open | `DAT-JINN-003`, `CAS-JINN-001` | recovery still upserts continuation, pause, then holds without one live-store transaction | `recovery-requeue.ts`, `store.ts`, `store-controls.ts`, `store-continuations.ts` | Recovery can return an error after partially mutating live orchestration state | A bad transaction boundary could hide diagnostics or deadlock legitimate recovery writes |
| ORCH-004 | Medium | Confirmed-open | `DAT-JINN-002` | recovery route still selects only by `taskId` | `recovery-requeue.ts`, `orchestration-routes.ts` | Recovery cannot uniquely target continuations when multiple rows share a `taskId` | API/CLI shape changes can break existing scripts and operator muscle memory |
| ORCH-005 | High | Confirmed-open | `FSR-JINN-001` | `openStoreDatabase()` still quarantines on any open failure, not just corruption | `store-schema.ts` | `SQLITE_BUSY` or other transient open errors can trigger quarantine/reset and lose live state | Under-fixing can keep truly corrupt DBs live; over-fixing can make boot hang or loop |
| ORCH-006 | High | Confirmed-open | `FSR-JINN-002`, `REL-JINN-006` | `upsertLiveContinuationInDb()` still overwrites by composite key without state guard; retry count still has no cap/backoff policy | `store-continuations.ts`, `runtime.ts`, `run-mode.ts`, `dual-lane.ts` | Continuation lifecycle is too permissive: duplicate queueing can overwrite active work and retries are unbounded | Tightening too aggressively can strand legitimate recoverable work or cause starvation without operator visibility |
| ORCH-007 | High / Medium | Mixed: confirmed + plausible | `TMP-JINN-002`, `REL-JINN-002`, `STT-ORCH-002` | expired-heartbeat resurrection and throwy lease-stop seam are confirmed; interrupt-on-expiry gap is still plausible without runtime drill | `scheduler.ts`, `runtime.ts`, `orchestration-routes.ts` | Lease liveness is split across mismatched predicates, and the lease-stop path still depends on throwing scheduler calls | Touching lease semantics can create leaked leases, duplicate releases, or false interruptions |
| ORCH-008 | High | Likely-open | `TMP-JINN-001`, `FSR-JINN-003` | per-turn lease release plus reaper protection keyed to running leases still exists; review bundle cleanup still lacks crash reaping | `run-mode.ts`, `runtime.ts`, `worktree.ts`, `dual-lane-state.ts` | Reviewer/implementer handoff can race the worktree reaper, and crash leftovers are not fully reclaimed | Over-protecting worktrees can cause durable leaks and distort cleanup/accounting |
| ORCH-009 | Medium practical / High if network-exposed | Confirmed-open | `F1`, `F3`, `ARC-ORCH-004`, `TMP-JINN-003` | loopback-default auth still skips `/api/*` auth when host is loopback; `dual-lane/apply` and `select` still lack manager-scope gating; apply still has check/apply TOCTOU | `auth.ts`, `server.ts`, `orchestration-routes.ts`, `artifacts.ts`, `worktree.ts` | The most destructive orchestration mutation routes are under-protected and racy | Repeating the old global auth fix can re-break auth bootstrap or remote dashboard flows |
| ORCH-010 | High / Medium / Low | Confirmed-open | `REL-JINN-001`, `REL-JINN-003`, `REL-JINN-005`, `REL-JINN-007`, `ARC-ORCH-003` | empty-output success, substring failure classification, failed-run HTTP 200, degraded readiness over-optimism, and inconsistent route envelopes still exist | `run-web-session.ts`, `run-mode.ts`, `real-adapter.ts`, `orchestration-routes.ts` | Operator-facing orchestration truthfulness is too weak: false-success, misleading error reasons, and unstable HTTP semantics | Tightening truthfulness can break existing tests/UI assumptions, especially around quiet preemption and current response parsing |
| ORCH-011 | Medium | Confirmed-open | `ARC-ORCH-001` | adapter registry exists but production execution still routes around it | `adapter/registry.ts`, `adapter/real-adapter.ts`, `run-mode.ts`, `dual-lane.ts` | The typed adapter contract is not the live execution contract | Rewiring live execution through adapters could destabilize all provider paths and the CLI billing/interactive contract |
| ORCH-012 | High / Medium | Confirmed-open | `ARC-JINN-001`, `REL-JINN-004` | `reloadConfig()` and `reloadOrg()` still do not call runtime-manager refresh functions; runtime creation remains an unguarded lifecycle seam | `server.ts`, `watcher.ts`, `orchestration-runtime-manager.ts`, `orchestration-runtime-factory.ts` | Runtime refresh and rebinding are still not correctly wired through live reload paths | A partial fix can double-bind resume handlers, drop active runtime ownership, or make refresh deferral lie |
| ORCH-013 | Medium / Low | Confirmed-open | `TMP-JINN-004`, `TMP-JINN-005`, `TMP-JINN-006` | telemetry still scores across all retained eras, artifacts still use file mtime for `createdAt`, retention is still weak | `telemetry.ts`, `artifacts.ts`, recovery notice paths | Long-lived telemetry and artifact chronology can drift away from current routing truth | Changing score windows or retention may alter routing behavior unexpectedly and complicate historical comparisons |

### Secondary adjacent track

These are real, but they are not orchestration-core. They should not block the first repair train unless the operator chooses to broaden scope.

| Canonical ID | Severity | Status | Merged findings | Current confirmation | Primary files | Summary | Biggest patch risk |
|---|---|---|---|---|---|---|---|
| ADJ-001 | Medium | Confirmed-open | `STT-JINN-002` | `validateBoardAssigneesForDepartment()` is still a stub returning `null` | `packages/jinn/src/gateway/api.ts` | Board PUT accepts foreign-department assignees even though dispatch later rejects them | Save-path validation changes can surface more 400s to existing UI flows |
| ADJ-002 | Medium | Confirmed-open | `WFG-JINN-003` | `handleAssigneeChange()` still updates `department` but not `departmentId` | `packages/web/src/routes/kanban/page.tsx` | Cross-department reassignment persists to the wrong board | A UI-only move can appear to work while changing persistence semantics underneath users |
| ADJ-003 | Medium | Confirmed-open | `FSR-JINN-004` | `persistToApi()` still PUTs every department board on each save | `packages/web/src/routes/kanban/page.tsx` | Cross-department batching amplifies optimistic-lock conflicts | Refactoring save scope can regress deletion and recycle-bin synchronization if not fully covered |
| ADJ-004 | Low | Source-evidenced-open | `NEG-JINN-004` | not re-checked in this pass; retained from June 25 report | `board-sync.ts` and related tests | Failed `blocked` auto-session tickets can bypass the terminal-ticket cap | Retention fixes can accidentally delete tickets operators still expect to inspect |

## Superseded Or Closed Findings

These should not be carried forward as separate repair targets:

| Historical finding | Disposition | Basis |
|---|---|---|
| `FSR-MATRIX-002` | Closed by code change | `server.ts` now calls `prepareForShutdown()` before closing the runtime |
| `FSR-MATRIX-003` | Closed by code change | outer catch in `runAllocatedOrchestrationTask()` now releases the lease on pre-dispatch failure |
| `RRR-MATRIX-004` | Closed by code change | `runtime.ts` now has `recoverStaleDispatchingContinuations()` |
| `ONR-MATRIX-005` | Closed by code change | live allocation now uses `requestAllocationWithLiveHeadroom()` / `tryAllocationNowWithLiveHeadroom()` |
| Pipeline `F2` | Closed by code change | `resumeQueuedAllocation()` checks for a missing resume handler before claiming the continuation |
| `FSR-MATRIX-001` and `ONR-MATRIX-006` | Superseded | the underlying seam changed; keep `ORCH-012` as the current canonical runtime-refresh problem |
| `FSR-MATRIX-007` | Superseded in part | bounded telemetry reads exist now; remaining timing/retention issues are better represented by `ORCH-013` |

## File / Function Clusters

### Cluster A: Recovery boundary hardening

- Findings: `ORCH-002`, `ORCH-003`, `ORCH-004`, `ORCH-005`
- Primary files:
  - `packages/jinn/src/orchestration/recovery-requeue.ts`
  - `packages/jinn/src/orchestration/store-schema.ts`
  - `packages/jinn/src/gateway/api/orchestration-routes.ts`
  - likely `packages/jinn/src/orchestration/store.ts`
- Shared function:
  - recovery input trust, quarantine semantics, and atomic recovery import
- Biggest patch risk:
  - hardening recovery so aggressively that valid recovery artifacts become unusable during a real incident

### Cluster B: Dual-lane identity and apply safety

- Findings: `ORCH-001`, `ORCH-009`, part of `ORCH-013`
- Primary files:
  - `packages/jinn/src/orchestration/dual-lane-state.ts`
  - `packages/jinn/src/orchestration/artifacts.ts`
  - `packages/jinn/src/gateway/api/orchestration-routes.ts`
  - `packages/jinn/src/orchestration/worktree.ts`
  - likely `packages/jinn/src/orchestration/dual-lane.ts`
- Shared function:
  - one exact run identity, one exact apply target, and one safe mutation path
- Biggest patch risk:
  - breaking backwards access to already-written manifests/artifacts or reintroducing auth regressions on local flows

### Cluster C: Lease and continuation lifecycle

- Findings: `ORCH-006`, `ORCH-007`, `ORCH-008`
- Primary files:
  - `packages/jinn/src/orchestration/scheduler.ts`
  - `packages/jinn/src/orchestration/runtime.ts`
  - `packages/jinn/src/orchestration/run-mode.ts`
  - `packages/jinn/src/orchestration/store-continuations.ts`
  - `packages/jinn/src/orchestration/worktree.ts`
- Shared function:
  - one coherent definition of "live", "retryable", "protected", and "terminal"
- Biggest patch risk:
  - introducing new stuck states, duplicate retries, or cleanup leaks while fixing the current race windows

### Cluster D: Runtime lifecycle, auth, and route truthfulness

- Findings: `ORCH-009`, `ORCH-010`, `ORCH-012`
- Primary files:
  - `packages/jinn/src/gateway/server.ts`
  - `packages/jinn/src/gateway/auth.ts`
  - `packages/jinn/src/gateway/orchestration-runtime-manager.ts`
  - `packages/jinn/src/gateway/api/orchestration-routes.ts`
  - `packages/jinn/src/orchestration/adapter/real-adapter.ts`
- Shared function:
  - runtime ownership, route protection, and truthful operator-facing status/error contracts
- Biggest patch risk:
  - fixing the security gap with a route/global auth change that re-breaks bootstrap, cookies, or loopback/Tailscale workflows

### Cluster E: Architecture consolidation and telemetry hygiene

- Findings: `ORCH-011`, `ORCH-013`
- Primary files:
  - `packages/jinn/src/orchestration/adapter/{registry,real-adapter}.ts`
  - `packages/jinn/src/orchestration/run-mode.ts`
  - `packages/jinn/src/orchestration/telemetry.ts`
  - `packages/jinn/src/orchestration/runtime.ts`
  - `packages/jinn/src/orchestration/artifacts.ts`
- Shared function:
  - reduce contract drift and stale-scoring drift after the core bugs are fixed
- Biggest patch risk:
  - changing deep execution architecture too early, before local bug fixes are stabilized and parity-tested

### Cluster F: Secondary Kanban/control-plane cleanup

- Findings: `ADJ-001` .. `ADJ-004`
- Primary files:
  - `packages/jinn/src/gateway/api.ts`
  - `packages/web/src/routes/kanban/page.tsx`
  - likely `packages/jinn/src/gateway/board-sync.ts`
- Shared function:
  - keep department ownership and board persistence honest
- Biggest patch risk:
  - widening a focused orchestration repair train into mixed backend/frontend board work too early

## Detailed Gated Repair Plan

### Gate 0: Reproduction and guardrail scaffolding only

Goal: lock the current failure surfaces down before behavior changes.

Work:

- Add focused red tests for:
  - dual-lane repeated `taskId` with distinct `coordinatorId`
  - recovery manifest path escape and `corruptDbPath` escape
  - recovery rollback on malformed hold import
  - `SQLITE_BUSY` open path
  - continuation overwrite when an active continuation already exists
  - lease heartbeat on expired-but-unswept lease
  - failed orchestration run HTTP status and empty-output success
- Add race-harness tests or deterministic fake-clock scaffolds for:
  - worktree reaper handoff window
  - lease expiry plus second allocation
  - dual-lane apply serialization
- Do not ship behavioral fixes in Gate 0 beyond tiny test-only seams required to inject clocks or hooks.

Exit criteria:

- Failing tests exist for every Cluster A-D item that is currently deterministic enough to encode.
- Race items that cannot yet be encoded are documented with exact harness requirements.

### Gate 1: Recovery boundary hardening

Goal: make recovery safe before making it richer.

Work order:

1. Patch `openStoreDatabase()` to distinguish corruption from transient open failures.
2. Add path-containment and provenance checks for recovery manifests and `corruptDbPath`.
3. Prefetch and validate source rows from the quarantined DB, then write continuation/pause/holds in one live-store transaction.
4. Add full-scope recovery selection by `taskId + coordinatorId`, but make the new selector backward-compatible at the route/API boundary for one transition period.

Why first:

- Recovery is the highest operator-stress path.
- These fixes are localized and reduce the risk of state loss or unsafe recovery during later patch waves.

Validation gate:

- Focused orchestration recovery/store tests only.
- No full orchestration train changes yet.

### Gate 2: Dual-lane route hardening and run identity migration

Goal: make dual-lane control routes safe before touching the lease machine.

Work order:

1. Add route-local protection for orchestration mutation routes:
   - manager/cookie/token guard on `dual-lane/select`, `dual-lane/apply`, and `/run`
   - explicit same-origin / allowed-origin check for browser-posted mutation routes
2. Add a per-`baseCwd` serialization guard for `applyDualLaneWinner()`.
3. Introduce full run identity in manifests, artifact records, artifact lookup, select/apply payloads, and fallback discovery.
4. Use a dual-read / single-new-write compatibility period:
   - read old `taskId`-only manifests
   - write new fully-scoped manifests
   - migrate only when the current run can be positively identified
5. After the compatibility window, remove legacy fallback reads.

Why before lease work:

- `dual-lane/apply` is the most destructive route.
- The auth/race fixes are route-local and reduce blast radius without yet changing scheduler semantics.

Validation gate:

- Focused dual-lane/artifact/route tests.
- One compatibility test over a legacy manifest fixture.

### Gate 3: Lease, continuation, and pipeline-liveness repair

Goal: fix liveness semantics only after the destructive dual-lane and recovery seams are contained.

Work order:

1. Unify lease liveness predicates:
   - one shared "live lease" check for validate, heartbeat, release, and expiry
2. Make `heartbeatLease()` reject expired-but-unswept leases.
3. Normalize lease-stop errors to route-safe typed results.
4. Add continuation overwrite guardrails:
   - reject or explicitly supersede only safe states
5. Add retry backoff/cap policy and surface retry state clearly.
6. Protect in-flight review-mode task IDs from the worktree reaper until reviewer bundle capture completes.
7. Add stale review-bundle reaping separate from worktree reaping.
8. Only after the above, decide the expiry behavior for live engines:
   - interrupt-on-expiry
   - or keep worker slot reserved until mapped session is terminal

Why this order:

- The biggest risk here is compounding state-machine changes.
- The cheapest safe wins are predicate unification, overwrite guards, and protected handoff state.

Validation gate:

- Fake-clock scheduler tests
- runtime resume/retry tests
- review-mode reaper handoff harness
- no provider-adapter rewiring yet

### Gate 4: Runtime lifecycle wiring and truthful status/errors

Goal: make the gateway tell the truth and actually own runtime refresh behavior.

Work order:

1. Route `reloadConfig()` through `swapOrchestrationRuntime()`.
2. Route `reloadOrg()` through `refreshOrchestrationRuntimeForOrgReload()`.
3. Ensure deferred refresh state is set on deferral and replayed after drain with one source of truth.
4. Guard runtime creation and refresh failures so startup/swap can degrade visibly instead of crashing or silently drifting.
5. Fix orchestration truthfulness:
   - empty output is not success for orchestration turns
   - failure HTTP status is not 200
   - degraded readiness reflects lossy recovery / unbound runtime
   - error envelopes converge on one route contract
   - `engineFailureReason()` stops using unsafe ordered substring precedence

Why after Gates 1-3:

- Runtime lifecycle patches and status semantics are system-wide and easier to validate once the hot state seams are already constrained.

Validation gate:

- gateway integration tests for config/org reload while active work exists
- status route tests
- route error contract tests
- run-mode / run-web-session truthfulness tests

### Gate 5: Architecture consolidation and long-tail hygiene

Goal: handle the deep architecture change only after the bugfix train is green.

Work order:

1. Build a parity harness between:
   - current live execution path
   - `RealProviderAdapter` contract path
2. Decide one of two outcomes:
   - route live execution through adapters
   - or explicitly demote/remove unused production adapter registry assumptions
3. Only after that, tune telemetry era windows, retention, and artifact logical timestamps.

Why last:

- This is the highest regression-risk cluster and least urgent for immediate defect containment.

Validation gate:

- provider parity tests across all live providers
- documentation update for whichever execution contract becomes canonical

### Secondary Gate K: Adjacent Kanban/control-plane repairs

Only start this after Gates 1-4 are stable or if the operator explicitly broadens scope.

Work order:

1. backend assignee validator
2. frontend `departmentId` move parity
3. department-scoped save path
4. blocked-ticket cap enforcement

## Adversarial Walk-Through And Plan Corrections

### Challenge 1: "Fix auth by reverting the removed token gate."

Why that plan fails:

- The removed gate was broad enough to break auth bootstrap/public auth endpoints before.

Correction:

- Do not restore a blanket `/api/*` gate.
- Gate orchestration mutation routes locally and explicitly.
- Keep `/api/auth/*` behavior unchanged and test it in the same patch series.

### Challenge 2: "Fix dual-lane identity by renaming paths in place."

Why that plan fails:

- Existing local manifests/artifacts become unreadable or, worse, partially readable under mixed old/new state.

Correction:

- Use dual-read / new-write compatibility.
- Migrate lazily and only when the full run identity is known.
- Remove the legacy path only after compatibility tests and one clean pass.

### Challenge 3: "Wrap recovery in one transaction across source DB reads and destination writes."

Why that plan fails:

- The source database is a separate readonly quarantined DB; trying to transact across both is the wrong mental model.

Correction:

- Stage source rows first.
- Validate and parse them fully.
- Then perform one transaction only on the live destination store.

### Challenge 4: "Fix the review handoff race by never releasing the implementer lease until the whole allocation finishes."

Why that plan fails:

- It changes quota semantics, telemetry, and lease accounting more than necessary.

Correction:

- Protect by task/allocation pipeline token, not by overloading lease lifetime.
- Keep lease accounting narrow; extend only worktree protection.

### Challenge 5: "Interrupt any expired lease immediately."

Why that plan fails:

- A timer-only interrupt without a live-session check can kill legitimate long turns because of heartbeat drift or stale bookkeeping.

Correction:

- First unify the liveness predicate.
- Then only interrupt if a mapped session is still live and no fresh heartbeat exists inside a second explicit grace check.

### Challenge 6: "Treat all empty outputs as failures globally."

Why that plan fails:

- Quiet preemption and some interactive/session-edge paths can complete with no final assistant text without representing a true orchestration defect.

Correction:

- Scope the postcondition to orchestration lease turns.
- Preserve `quietPreempted` behavior explicitly in tests.

### Challenge 7: "Rewire production through `ProviderAdapter` in the same patch train."

Why that plan fails:

- It is a broad architecture rewrite disguised as a bugfix and can destabilize every provider at once.

Correction:

- Keep adapter unification in Gate 5.
- Do not couple it to urgent recovery, auth, or lease repairs.

### Challenge 8: "Fix runtime refresh by calling swap on every reload immediately."

Why that plan fails:

- It can still tear down runtime ownership during active work unless all defer/replay paths are centralized.

Correction:

- Funnel config and org reload through runtime-manager only.
- Rebind resume handlers in one place.
- Test reload during active work and replay after drain.

## Recommended Repair Order

1. Gate 0
2. Gate 1
3. Gate 2
4. Gate 3
5. Gate 4
6. Gate 5
7. Gate K only if scope broadens

## Notes For The Implementing Agent

- Treat `ORCH-001` through `ORCH-004` as the first unified recovery/identity dossier.
- Treat `ORCH-007` and `ORCH-008` as "prove first, then patch" items.
- Treat `ORCH-011` as an architecture project, not a bugfix.
- Do not re-open superseded June 24 findings as standalone tickets unless current source re-confirms them.

## Validation Status For This Planning Session

- No runtime behavior was patched.
- No tests were run in this planning session.
- Current-source confirmation was static and targeted; race outcomes remain capped at the confidence level recorded above.

## Residual Risk

This plan is intentionally conservative. The main residual risk is underestimating how much the
current tests encode today's broken semantics, especially around orchestration completion,
auth behavior on loopback, and dual-lane artifact lookup. That is why Gate 0 exists and why
Gate 5 is deferred.
