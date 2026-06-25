# Orchestration Internal API Contract Audit

- Skill: `audit-internalapi-contract` (v0.1) + audit-base method v3.0/3.1
- Scope: orchestration layer of `packages/jinn` (runtime, scheduler, adapters, store,
  gateway orchestration routes, runtime swap/refresh)
- Authority: **REPORT-ONLY**. No source/test files were modified. The only file
  written is this report.
- Date: 2026-06-25
- Branch: `main` @ `4c0d970` (`refactor: remove authentication check for API routes`)

> The supplied prompt is treated as a draft. I preserved the intended mission (internal
> contract integrity across orchestration boundaries) and expanded review to the
> gateway auth seam touched by the head commit, because it directly governs who can
> reach the mutating orchestration contracts.

---

## 1. Summary

The orchestration layer has a **strong, mostly-honored typed contract spine** at the
store and scheduler-result boundaries: persistence rows are private interfaces converted
through dedicated `rowTo*` mappers (no DB row shapes leak to API/UI), lifecycle
transitions are enum-typed and guarded (e.g. `claimQueuedLiveContinuation` only moves
`queued -> dispatching`), and allocation/queue outcomes use discriminated-union result
types. Typecheck is clean and all 125 orchestration/adapter tests pass.

Three contract-integrity problems stand out:

1. **The `ProviderAdapter` contract is fully defined and tested but has no production
   consumer.** The live execution path (`run-mode.ts`) bypasses the registry/adapter
   entirely and dispatches engines directly. The repo therefore maintains two parallel
   execution surfaces; the typed/lease-validated one is dead in production. (ARC-ORCH-001)
2. **The scheduler boundary throws untyped `Error`s** (`unknown lease`, `lease is
   <state>`, `coordinator mismatch`) while every adjacent orchestration boundary returns
   typed result/error objects. This split error contract leaks raw strings to callers and
   has an unguarded call site behind a TOCTOU window in the lease-stop route. (STT-ORCH-002)
3. **Gateway error envelopes are unnormalized** — `{ error }`, `{ error, reason }`,
   `{ error, detail }`, `{ error, leaseId, sessionId }` are all emitted ad hoc, so HTTP
   consumers cannot rely on a stable error shape. (ARC-ORCH-003)

A fourth item is the head-commit auth change: it removed a **redundant** second token
check; the primary `authRequiredForRequest` gate still covers `/api/orchestration/*`, so
this is defense-in-depth erosion rather than a contract bypass (ARC-ORCH-004, Info/Low).

### Budget / coverage

Deep-read: `runtime.ts`, `orchestration-routes.ts`, `adapter/types.ts`, `registry.ts`,
`real-adapter.ts`, `store.ts`, `store-schema.ts`, `store-controls.ts`,
`store-continuations.ts`, `schemas.ts`, `types.ts`, `live-run.ts`, `run-mode.ts`,
`scheduler.ts` (allocation/lease/validate surface), `dual-lane.ts` (head), the two
runtime-manager/factory files, and the server auth seam (`server.ts`, `auth.ts`).
Sampled (not line-by-line): `coordinator.ts`, `persistent-scheduler.ts` (header),
`store-snapshot.ts`, `telemetry.ts`, `worktree.ts`, `artifacts.ts`, `recovery-requeue.ts`,
`cross-family.ts`, `routing-headroom.ts`. See Validation Limits.

---

## 2. Internal API Boundary Inventory

| API ID | Boundary | Producer | Consumer | Contract Type | Owner | Versioned? | Tests? | Risk |
|---|---|---|---|---|---|---|---|---|
| B01 | HTTP -> runtime mutate (pause/resume/hold/stop/retry/run/requeue/dual-lane) | `orchestration-routes.ts` | external HTTP | hand-rolled `typeof` guards + zod for `/run` | routes | No | partial (routes covered indirectly) | P0 |
| B02 | HTTP -> runtime observe (status/workers/leases/queue/allocations/continuations/holds/worktrees/telemetry/dual-lane/artifacts) | `orchestration-routes.ts` | external HTTP | ad-hoc JSON payloads | routes | No | partial | P2 |
| B03 | runtime public surface | `OrchestrationRuntime` (`runtime.ts`) | routes, run-mode, dual-lane | TS class methods; typed args/returns | runtime.ts | No | yes (`runtime.test.ts`) | P1 |
| B04 | runtime -> scheduler | `OrchestrationRuntime` | `PersistentMatrixScheduler` | typed; **throws** on lease errors | scheduler.ts | No | yes | P1 |
| B05 | scheduler allocation result | `MatrixScheduler.requestAllocation` | runtime, run-mode | `AllocationResult` discriminated union | types.ts | No | yes | P1 |
| B06 | adapter contract | `ProviderAdapter` impls | **(none in prod)** / tests | `ProviderAdapterResult<T>` + `ProviderAdapterError` union | adapter/types.ts | No | yes (contract tests) | P1 |
| B07 | live execution path | `run-mode.ts` `runOrchestrationLeaseTurn` | dual-lane, routes | direct `Engine.run` via `dispatchWebSessionRun` | run-mode.ts | No | yes | P0 |
| B08 | store facade | `OrchestrationStore` | runtime, routes, recovery | typed methods; private `*Row` -> record mappers | store-*.ts | `SCHEMA_VERSION=4` + ALTER migrations | yes (`store.test.ts`) | P1 |
| B09 | live continuation lifecycle | `store-continuations.ts` | runtime | `LiveRunContinuationState` enum, guarded transitions | live-run.ts | schema-versioned | yes | P1 |
| B10 | hold lifecycle | `store-controls.ts` | runtime, routes | `HoldState` enum; `active->expired/cancelled` | store-controls.ts | schema-versioned | yes | P1 |
| B11 | dual-lane select/apply | `dual-lane.ts` / `artifacts.ts` | routes | `DualLaneSelectionResult` / apply result unions | dual-lane.ts | manifest `state` | yes (`dual-lane.test.ts`) | P1 |
| B12 | config ingest | `schemas.ts` (zod) | config loader, `/run` task | zod `.strict()` schemas | schemas.ts | No | yes | P2 |
| B13 | runtime swap/refresh | `orchestration-runtime-manager.ts` | gateway lifecycle | typed fns; `hasActiveWork()` drain gate | runtime-manager.ts | No | partial | P1 |
| B14 | telemetry/artifact records | `telemetry.ts` / `store-controls.ts` | dashboard, empirical routing | typed records; bounded reads | telemetry.ts | No | yes | P2 |
| B15 | gateway auth gate -> all `/api` | `server.ts` / `auth.ts` | every route incl. orchestration | `authRequiredForRequest` + `shouldRequireGatewayAuth` | auth.ts | No | yes (`auth-security.test.ts`) | P0 |

---

## 3. Boundary Findings

### ARC-ORCH-001: ProviderAdapter contract is defined and tested but never wired into the live execution path

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/orchestration/adapter/types.ts:105-115` — full `ProviderAdapter`
  interface (`startTask`, `streamOutput`, `cancel`, `getStatus`, `collectArtifacts`) with
  typed `ProviderAdapterResult<T>` / `ProviderAdapterError` (`types.ts:20-30`).
- `packages/jinn/src/orchestration/adapter/registry.ts:48-63` — `createLiveProviderAdapterRegistry`
  builds real adapters per `LIVE_PROVIDER_IDS`.
- Search: the only non-self importers of `ProviderAdapterRegistry` /
  `createLiveProviderAdapterRegistry` / `ProviderAdapter` are
  `adapter/__tests__/real-adapter.test.ts` and `adapter/__tests__/adapter-contract.test.ts`
  (grep returned no production consumer).
- `packages/jinn/src/orchestration/run-mode.ts` — no `adapter` import; live turns run via
  `resolveWorkerEngine(...)` (`run-mode.ts:534-536`) then
  `dispatchWebSessionRun(...)` (`run-mode.ts:296`). `dual-lane.ts` likewise imports no adapter.

Observed behavior:
- The production live-run path resolves an `Engine` directly from the session manager and
  dispatches it, never going through `RealProviderAdapter.startTask` or its
  `validateStartLease` / `validateRequest` (the path that, e.g., blocks the Claude
  headless-bypass flags at `real-adapter.ts:255-265`).

Expected boundary:
- One execution contract source of truth. The preferred shape (entrypoint -> typed
  request -> runtime/scheduler -> **adapter** -> typed result -> trace) is defined but the
  adapter hop is skipped, so two execution surfaces coexist.

Failure mechanism:
- The adapter layer was built as the typed/lease-validated execution contract, but the
  live web-session dispatch path was wired in parallel and is the one actually used. The
  adapter's guards (lease re-validation inside `startTask`, provider-mismatch rejection,
  Claude headless-flag rejection, typed cancel/status) are therefore not enforced in
  production; only `run-mode`'s own `validateLeaseForWorker` check (`run-mode.ts:244`) runs.

Break-it angle:
- A future caller that trusts "adapters enforce the contract" (e.g. adds a new engine and
  relies on `RealProviderAdapter.validateRequest` to block headless bypass) gets no
  protection on the live path. Divergence between the tested contract and the real path is
  invisible because contract tests stay green.

Impact:
- Dead typed surface presented as the contract; guard logic (headless-bypass block,
  typed engine-failure normalization, cancel/status semantics) is duplicated or absent on
  the real path. Maintenance and audit confusion; risk that protections believed-present
  are not.

Operational impact:
- Blast radius: Service
- Side-effect class: process
- Reversibility: reversible
- Operator visibility: silent
- Rerun safety: safe

Adjacent failure modes:
- STT-ORCH-002 (the live path uses throwing scheduler calls instead of the adapter's
  typed result).

Recommended mitigation:
- Patterns: single-source-of-truth, contract-consolidation.
- Minimal repair: decide and document the canonical execution contract. Either route the
  live path through `RealProviderAdapter` (so lease re-validation and headless-flag guard
  run in prod), or formally demote the adapter layer to "reference/test harness" in
  `docs/feature_inventory.md` and delete the unused live-registry wiring.
- Local guardrail: an architecture test asserting that the production live-run path and
  the adapter path share the same lease-validation + headless-bypass guard.
- Behavior test: invoke the real live-run path with a Claude worker passing `-p` and
  assert rejection parity with `real-adapter.ts:255-265`.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: M
- Cost drivers: modules, tests, docs
- Nominal agent: claude
- Rationale: requires an architecture decision (consolidate vs. demote) spanning run-mode,
  adapter registry, dual-lane, and the feature inventory; breadth is moderate, risk is in
  changing the live dispatch path.

Validation:
- Grep gate: production import of adapter registry exists (or adapter demoted in docs).
- Parity test for headless-bypass + lease re-validation across both paths.

Non-goals:
- Rewriting engine dispatch semantics or session handling.

---

### STT-ORCH-002: Scheduler lease boundary throws untyped Errors while every adjacent boundary returns typed results

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: State-Transition

Evidence:
- `packages/jinn/src/orchestration/scheduler.ts:520-523` — `getRunningLease` throws
  `new Error("unknown lease: ...")` and `new Error("lease ... is <state>")`.
- `scheduler.ts:172-205` — `heartbeatLease` / `releaseLease` throw on coordinator
  mismatch and propagate `getRunningLease` throws.
- Contrast: `validateLeaseForWorker` (`scheduler.ts:228-239`) returns typed
  `LeaseValidationResult`; adapters return `ProviderAdapterResult`; continuations return
  typed records.
- `runtime.ts:160-164` re-exposes `releaseLease` (throwing) on the public runtime surface.
- `orchestration-routes.ts:551` — `jsonLeaseStop` calls `runtime.releaseLease(...)`
  unguarded; the POST lease-stop handler runs **before** the `try` block that wraps the
  GET observe paths (`orchestration-routes.ts:355`), so a throw here is uncaught by the
  route's catch.

Observed behavior:
- A lease error (unknown/non-running/coordinator mismatch) surfaces as a thrown JS `Error`
  with a free-text message rather than a typed `{ ok: false, reason }` result, and on the
  lease-stop route it is not normalized to an HTTP error envelope.

Expected boundary:
- A normalized error contract consistent with the rest of the layer: either a typed result
  union or a single catch that maps to a stable HTTP error shape.

Failure mechanism:
- The lease mutation methods predate / diverge from the result-typed convention. The route
  guards the common case (`lease.state !== "running"` check at `orchestration-routes.ts:540`)
  but the `releaseLease` call at line 551 sits in a TOCTOU window: the reaper
  (`runtime.ts:572-581`) or a concurrent request can expire/release the lease between the
  check and the call, making `getRunningLease` throw `lease ... is expired`.

Break-it angle:
- Concurrent lease-stop + reaper expiry, or stop on a lease whose coordinator was rebound,
  throws out of the handler. Best case the gateway's outer error handler returns a 500 with
  a raw message; worst case the response is left without the normalized `{ error }` shape
  other routes guarantee.

Impact:
- Inconsistent error contract for HTTP consumers; possible uncaught 500 with raw internal
  message on a P0 mutating route (`leases/stop`).

Operational impact:
- Blast radius: Workflow
- Side-effect class: process
- Reversibility: reversible
- Operator visibility: log-only
- Rerun safety: safe

Adjacent failure modes:
- ARC-ORCH-003 (route error envelopes are already inconsistent).

Recommended mitigation:
- Patterns: error-normalization, typed-result.
- Minimal repair: wrap the `runtime.releaseLease` call in `jsonLeaseStop` in try/catch and
  emit the normalized `{ error }` envelope (404/409). Longer term, give the
  heartbeat/release surface a typed result mirroring `validateLeaseForWorker`.
- Local guardrail: route-level try/catch around all throwing scheduler calls reachable
  from POST handlers.
- Behavior test: lease-stop on a lease that expires between the running-check and release
  (inject `now`/reaper) asserts a normalized HTTP error, not an uncaught throw.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: localized to the lease-stop handler plus an optional typed-result wrapper;
  small surface, clear test.

Non-goals:
- Reworking the scheduler's internal lease state machine.

---

### ARC-ORCH-003: Gateway orchestration error envelopes are not normalized

Severity: Low
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `orchestration-routes.ts` emits heterogeneous error bodies: `{ error }` (e.g. line 88),
  `{ error, reason }` (line 252, 316), `{ error, detail }` (line 346, 475),
  `{ error, leaseId }` (line 541), `{ error, leaseId, sessionId }` (line 557). 41 distinct
  `json(res, { error ... })` sites with no shared envelope helper.

Observed behavior:
- HTTP consumers receive a different error JSON shape depending on which branch failed;
  some carry `reason`, some `detail`, some entity ids, with no documented schema.

Expected boundary:
- One normalized error envelope (single source of truth) for the orchestration route group,
  matching the typed-contract discipline used at the store/scheduler-result layers.

Failure mechanism:
- Error responses are hand-written per branch rather than produced by a shared
  `errorResponse(code, message, detail?)` helper, so the contract drifts per handler.

Break-it angle:
- A dashboard or CLI parsing `body.reason` works for dual-lane apply but is `undefined`
  for queue pause-task; consumers must special-case each route.

Impact:
- Brittle clients; no stable machine-readable error contract on P0/P2 routes.

Operational impact:
- Blast radius: Workflow
- Side-effect class: user-visible
- Reversibility: reversible
- Operator visibility: UI-visible
- Rerun safety: safe

Recommended mitigation:
- Patterns: error-normalization.
- Minimal repair: a shared `orchestrationError(res, status, code, message, detail?)`
  helper returning `{ error: { code, message, detail? } }` (or keep flat `{ error, code }`)
  used by all branches.
- Behavior test: assert every error branch returns the same envelope keys.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: mechanical consolidation of one file's error sites with a snapshot/keys test.

Non-goals:
- Changing HTTP status codes or success payload shapes.

---

### ARC-ORCH-004: `/api` defense-in-depth token check removed at the gateway boundary

Severity: Info
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Compliance-Posture

Evidence:
- Head commit `4c0d970` removed 4 lines from `server.ts` that did
  `if (!isAuthenticatedRequest(req, gatewayInfo.token)) { unauthorized(res); return; }`
  inside the `/api/` block.
- The **primary** gate remains: `server.ts:1035` runs
  `if (authRequiredNow() && authRequiredForRequest(req.method, pathname))` ->
  `authenticateGatewayRequest(...)` before the `/api/` block.
- `auth.ts:151-161` — `authRequiredForRequest` returns `true` for all `/api/...` except a
  small allowlist (status, auth/state, auth/bootstrap, auth/pair, auth/logout,
  internal/hook); `/api/orchestration/*` is therefore still gated.
- `auth.ts:163-171` — `shouldRequireGatewayAuth` enforces auth when `authRequired`, or by
  default on network hosts (`isNetworkHost`); loopback default-no-auth is unchanged.

Observed behavior:
- Orchestration mutating routes remain auth-gated under the same conditions as before
  (network exposure or explicit `authRequired`); only the redundant second token check was
  deleted.

Expected boundary:
- A single auth gate is acceptable; the concern is that the commit message
  ("remove authentication check for API routes") overstates the change and the redundant
  layer is gone.

Failure mechanism:
- None reachable today: the in-scope orchestration contract boundary (B15) still requires
  auth on exposed deployments. Recorded as posture/clarity, not a bypass.

Impact:
- Loss of a redundant guard; if `authRequiredForRequest`'s allowlist ever broadens or a new
  orchestration path is added outside `/api/orchestration/`, the deleted backstop no longer
  covers it.

Operational impact:
- Blast radius: Service
- Side-effect class: network
- Reversibility: reversible
- Operator visibility: silent
- Rerun safety: safe

Recommended mitigation:
- Patterns: defense-in-depth, governance-clarity.
- Minimal repair: confirm the removal is intentional in the commit/PR; if so, ensure
  `auth-security.test.ts` asserts `/api/orchestration/*` (POST and GET) requires auth on
  network hosts so the single remaining gate is regression-locked.
- Behavior test: network-host request to `/api/orchestration/queue/pause` without token ->
  401.

Implementation assessment:
- Complexity: governance_decision
- Cost: XS
- Cost drivers: tests
- Nominal agent: human-owner
- Rationale: the substantive question (is removing the redundant layer intended) is an
  owner decision; the regression test is trivial.

Non-goals:
- Re-adding the second check without an owner decision.

---

## 4. Selected Paths (Gate 3)

Coverage-guided selection. Weights P0=8/P1=5/P2=3/P3=1. Seed (deterministic, recorded for
replay): `orch-internalapi-2026-06-25`. Total expanded paths: 8 (<= 32 cap). Paths are
*described*, not implemented (report-only).

Deliberate:

- **P-SUCCESS (canonical):** `POST /api/orchestration/run` (single_worker) -> `runOrchestrationTask`
  -> `liveRunTaskSchema.parse` -> `requestAllocationWithLiveHeadroom` -> `runAllocatedOrchestrationTask`
  -> `runOrchestrationLeaseTurn` -> `dispatchWebSessionRun` -> `releaseLease`.
  Decision nodes: orchestration enabled; allocation ok vs blocked; session failed vs ok.
  Invariants: lease released exactly once; continuation deleted on success; telemetry row
  appended. Coverage: `run-mode.test.ts`.
- **P-REJECT (controlled rejection):** `POST /api/orchestration/holds` with a non-org
  worker and non-executive manager -> `authorizeHoldManager` -> 403.
  Decision nodes: managerName present; worker mapping known; manager rank.
  Invariant: no hold persisted on rejection. Coverage: routes (indirect) — gap noted.
- **P-DEGRADED (branch/degraded):** allocation blocked -> `queueLiveContinuation(state="queued")`
  -> `retryFailedLiveContinuation` only from `failed`; `claimQueuedLiveContinuation` only
  from `queued`. Invariant: no double-dispatch; illegal-state retry returns
  `invalid_state` (`runtime.ts:352-358`). Coverage: `runtime.test.ts`, store tests.

Coverage-guided (5):

- **P-G1 (P0):** lease-stop TOCTOU — lease expires between running-check and `releaseLease`
  -> STT-ORCH-002. Invariant: normalized HTTP error, no uncaught throw. Coverage: **none**.
- **P-G2 (P1):** corrupt store open -> `openStoreDatabase` quarantines DB, emits
  `store_corrupt_recovered` telemetry, starts empty (`store-schema.ts:158-192`). Invariant:
  original work not silently requeued. Coverage: store tests.
- **P-G3 (P1):** runtime swap deferred while `hasActiveWork()` true
  (`orchestration-runtime-manager.ts:23-28`). Invariant: refresh deferred, not dropped;
  replayed when drained (`refreshDeferredOrchestrationRuntimeIfDrained`). Coverage: partial.
- **P-G4 (P1):** dual-lane apply via fallback store when runtime unbound
  (`orchestration-routes.ts:248-259`). Invariant: fallback store closed in `finally`; no
  leak. Coverage: dual-lane tests (apply), route-fallback path gap noted.
- **P-G5 (P0):** Claude headless-bypass flag through the **live** path (bypasses
  `real-adapter.ts:255-265`) -> ARC-ORCH-001. Invariant (desired): rejection parity.
  Coverage: only the adapter path is tested, not the live path.

---

## 5. Branch Coverage Plan

For each selected decision node, assert >= 2 outcomes (no implementation here):

- allocation: `ok:true` (alloc + leases) vs `ok:false` (queueItem) — covered.
- continuation lifecycle: `queued->dispatching` (claim succeeds) vs non-`queued` (claim
  returns undefined) — covered (`store-continuations.ts:109`).
- retry: `failed->queued` allowed vs non-`failed` -> `invalid_state` — covered.
- hold auth: org worker ok vs non-org worker non-executive -> 403 — partial.
- lease-stop: running lease released vs expired-mid-call throw — **gap (P-G1)**.
- headless flag: adapter path rejects vs live path (currently passes) — **gap (P-G5)**.

---

## 6. Invariants To Assert

1. No DB `*Row` type is exported from any store module or referenced outside `store-*.ts`
   (currently true — all mappers private; assert as a regression).
2. Every orchestration HTTP error response conforms to one envelope (ARC-ORCH-003).
3. The live execution path enforces the same lease re-validation + Claude headless-bypass
   guard as `RealProviderAdapter` (ARC-ORCH-001 / P-G5).
4. Lease lifecycle transitions never reverse a terminal state (`released`/`expired` ->
   `running`); scheduler `getRunningLease` already fails closed (`scheduler.ts:520-523`).
5. `claimQueuedLiveContinuation` is the only producer of the `queued->dispatching` edge and
   is atomic (it is — `db.transaction` at `store-continuations.ts:104`).
6. Schema migrations remain additive and gated by `table_info` checks
   (`store-schema.ts:215-272`); `SCHEMA_VERSION` bumps when row contracts change.

---

## 7. Findings Table

| ID | Title | Domain | Severity | Confidence | Evidence basis |
|---|---|---|---|---|---|
| ARC-ORCH-001 | ProviderAdapter contract has no production consumer (dual execution surface) | Architecture | Medium | Confirmed | source-evidenced |
| STT-ORCH-002 | Scheduler lease boundary throws untyped Errors; unguarded in lease-stop route | State-Transition | Medium | Confirmed | source-evidenced |
| ARC-ORCH-003 | Gateway orchestration error envelopes unnormalized | Architecture | Low | Confirmed | source-evidenced |
| ARC-ORCH-004 | `/api` redundant token check removed (defense-in-depth) | Compliance-Posture | Info | Confirmed | source-evidenced |

---

## 8. Non-Findings (checked and held)

- **No DB row-shape leakage to API/UI.** `store-controls.ts`, `store-continuations.ts`,
  `store-snapshot.ts` keep `*Row` interfaces private and convert via `rowTo*`
  (`store-controls.ts:257-307`, `store-continuations.ts:191-205`). Routes return domain
  types (`Allocation`, `Lease`, records); grep for `Row` in routes is empty.
- **Lifecycle states are enum-typed and guarded.** `LiveRunContinuationState`
  (`live-run.ts:4`), `HoldState`/`ArtifactKind`/`PatchApplyState` (`store-controls.ts:4-6`),
  `LeaseState`/`AllocationState` (`types.ts:5-7`). Transitions fail closed
  (`claimQueuedLiveContinuationInDb` `store-continuations.ts:109`, hold cancel/expire only
  from `active` `store-controls.ts:172-187`).
- **Allocation/result outcomes use discriminated unions**, not ad-hoc dicts
  (`AllocationResult` `types.ts:162-164`, `RetryLiveContinuationResult` `runtime.ts:59-75`,
  `DualLaneRunResult`/`DualLaneSelectionResult` `dual-lane.ts:45-100`).
- **Adapter result/error contract is uniform across all adapters** (`ProviderAdapterResult`
  / `ProviderAdapterError` `adapter/types.ts:20-30`; `real-adapter.ts` uses
  `providerOk/providerFail`). The defect is non-use (ARC-ORCH-001), not divergence.
- **Schema is versioned and migrations are additive/guarded** (`SCHEMA_VERSION=4`,
  `ensure*Column` via `table_info` `store-schema.ts:215-272`).
- **Config ingest is typed and strict** — zod `.strict()` schemas reject unknown keys
  (`schemas.ts:18-103`); `formatZodError` normalizes parse errors.
- **No raw-DB bypass from runtime/run-mode.** All persistence goes through
  `OrchestrationStore` (`runtime.ts` uses `this.store.*`); routes open `OrchestrationStore`
  / `PersistentMatrixScheduler` only as a deliberate read fallback when runtime is unbound
  (`orchestration-routes.ts:442-471`, closed in `finally`).
- **Corrupt-store path fails visible, not silent** — quarantines DB + writes recovery
  manifest + emits telemetry, does not auto-requeue (`store-schema.ts:158-192`).
- **Runtime swap drains before refresh** — `hasActiveWork()` gate defers and replays refresh
  (`orchestration-runtime-manager.ts:23-28,60-74`).
- **Primary `/api` auth gate still covers orchestration routes** (`auth.ts:151-171`,
  `server.ts:1035`) — see ARC-ORCH-004.

---

## 9. Risks

- ARC-ORCH-001 carries hidden-protection risk: guards believed-enforced by "the adapter
  contract" do not run on the live path.
- STT-ORCH-002 is the only finding with a (narrow) concurrency window on a P0 mutating route.
- ARC-ORCH-003 raises long-term client-coupling risk as routes proliferate.

## 10. Deferred Work / Not Reviewed

- Not line-by-line read: `coordinator.ts`, `store-snapshot.ts` (delta apply correctness),
  `telemetry.ts` body, `worktree.ts`, `artifacts.ts` apply-winner internals,
  `recovery-requeue.ts`, `cross-family.ts`, `routing-headroom.ts`, `scheduler-retention.ts`,
  `persistent-scheduler.ts` persistence/rehydrate correctness. Their public contracts were
  inventoried (B05/B08/B11/B14) but their internal invariants were not deep-audited.
- Concurrency proof for `claimQueuedLiveContinuation` under real multi-process access is
  `requires-authorized-drill` (single-process tests pass; the SQLite WAL lock file added in
  `e858f16` was not load-tested here).
- Did not audit the `/run` success payload for over-exposure of internal allocation/lease
  fields to clients (B01/B02) beyond confirming no DB row types leak.

## 11. Validation Limits

- `git status --short`: pre-existing untracked audit dirs and modified test files
  (`__tests__/*.test.ts`) present before this run; **unrelated** to this report. No source
  files modified by the audit.
- `git diff --check`: clean.
- `tsc --noEmit` (jinn-cli): **pass** (exit 0) — pre-existing clean state.
- `vitest run src/orchestration src/gateway/api/orchestration-routes`: **13 files /
  125 tests passed** — pre-existing clean state; establishes baseline coverage referenced
  in selected paths.
- All findings are static `source-evidenced`; none reproduced via new tests (report-only).
  Confidence ceiling honored: no race/concurrency claim marked Confirmed without a
  reproduced run (STT-ORCH-002's TOCTOU is Confirmed on the *static* unguarded-call-site
  property, not on an observed race).
