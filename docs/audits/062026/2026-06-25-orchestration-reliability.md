# Orchestration Reliability Audit (audit-reliability lens)

- Date: 2026-06-25
- Scope: orchestration layer of the jinn gateway (`packages/jinn/src/orchestration/**`,
  `packages/jinn/src/gateway/api/orchestration-routes.ts`,
  `packages/jinn/src/gateway/orchestration-runtime-{factory,manager}.ts`).
- Lens: audit-reliability v3.0 (REL-001..REL-015). Authority: **REPORT-ONLY**. No source
  or test file was modified. The only file written is this report.
- Method: read the named seams, traced the adapter/run-mode/session-dispatch success path
  end-to-end, mapped failure modes, applied the reliability break-it checklist by reasoning
  over source (no kill/network/corruption drills were authorized, so race/timeout/multi-worker
  outcomes are capped at Plausible per the calibration addendum).

> The supplied prompt is treated as a draft. I preserved the intended mission and worked the
> REL inventory, expanding into the session-dispatch completion path (`run-web-session.ts`,
> `session-dispatch.ts`, `callbacks.ts`) because the orchestration "success" verdict is
> produced there, not inside the orchestration package.

Prior recovery-idempotency findings FSR-JINN-001 (SQLITE_BUSY → DB quarantine/reset),
FSR-JINN-002 (continuation overwrite), FSR-JINN-003 (review-bundle leak), FSR-JINN-004 (board
batching) are **not re-derived**; cross-referenced where relevant.

---

## 1. Surface Inventory

Inputs / state-mutating entry points:

- `POST /api/orchestration/run` → `runOrchestrationTask` (run-mode.ts) / `runDualLaneTask` (dual-lane.ts).
- `runOrchestrationLeaseTurn` → `dispatchWebSessionRun` → `runWebSession` (the actual engine call).
- Adapter execution: `RealProviderAdapter.startTask` (real-adapter.ts) — note: live runs go through
  the session-dispatch path, not the adapter; the adapter is a parallel execution surface.
- Scheduler mutations: `requestAllocation`, `releaseLease`, `expireLeases`, `retryQueued`
  (scheduler.ts) wrapped by `PersistentMatrixScheduler.commitMutation` (persistent-scheduler.ts).
- Continuation queue: `queueLiveContinuation`, `claimQueuedLiveContinuation`,
  `markLiveContinuationState` (runtime.ts / store-continuations.ts).
- Recovery: `requeueRecoveredContinuation` (recovery-requeue.ts), `recoverStaleDispatchingContinuations`
  (runtime.ts).
- Background work: reaper `setInterval` (runtime.ts `startReaper`), worktree reaper.
- Status surface: `GET /api/orchestration/status` → `buildStatusPayload`.

Downstream consumers: dashboard (`packages/web`), `/api/orchestration/*` observe routes,
dual-lane manifest + comparison report, telemetry JSONL (empirical routing scores).

## 2. Failure-Mode / Boundary Map

| Operation | Dependency | Failure Modes | Timeout? | Retry Policy | Atomic Recovery? | Health/Signal |
|---|---|---|---|---|---|---|
| Lease turn (`runOrchestrationLeaseTurn`) | engine CLI via `dispatchWebSessionRun` | hang, empty output, crash, auth fail | No orchestration-level timeout; only session-layer stall watchdog and only for interruptible engines (run-web-session.ts:391 `canKill`) | none at orchestration layer | lease released in `finally`; status read from session row | session `status`/`lastError` only |
| Success verdict (`orchestrationSessionFailed`) | session row | empty output counts as success | n/a | n/a | n/a | `status==="error" \|\| error` only (run-mode.ts:520) |
| Allocation (`requestAllocation`) | scheduler in-memory + SQLite | blocked (missing role/quota) | n/a | event-driven re-`retryQueued` on every release/expire | snapshot delta or rehydrate-on-error (persistent-scheduler.ts:105) | queue depth via `/queue` |
| Continuation requeue | `retryQueuedWithLiveHeadroom` | repeated immediate re-block | n/a | **no backoff/jitter; `retry_count` incremented but never capped** | claim is transactional (store-continuations.ts:104) | `retry_count` not surfaced |
| Lease expiry (`expireLeases`) | clock | engine still running after lease "expired" | n/a (no kill) | n/a | marks lease state only; **no engine interrupt** | `lease_expired` telemetry |
| Runtime startup (`createGatewayOrchestrationRuntime`) | config load, SQLite open | throw on bad config / open failure | n/a | none | DB corruption path quarantines+resets (FSR-JINN-001) | `degraded = enabled && !runtime` |
| Engine failure classification | error string | auth/network/timeout collapsed by substring match | n/a | n/a | n/a | `engineFailureReason` (real-adapter.ts:327) |
| Run HTTP response | route | failed run returned as HTTP 200 | n/a | n/a | n/a | body `ok/state`; HTTP status misleading |
| DB recovery | quarantine manifest | in-flight work silently lost | n/a | manual `recovery/requeue` | reset DB; manifest written | `recoveryNotices` (surfaced) |
| Telemetry read (empirical routing) | JSONL file | oversized file | n/a | n/a | bounded read | `skippedLines` logged |

## 3. Findings Table

| ID | Title | Severity | Confidence | Domain |
|---|---|---|---|---|
| REL-JINN-001 | Empty/clean-exit engine output counts as a successful lease turn | High | Confirmed | Reliability |
| REL-JINN-002 | Expired lease does not interrupt the still-running engine; slot reused | High if reachable | Plausible | Reliability |
| REL-JINN-003 | Engine failure classification collapses auth/timeout/network by substring match and order | Medium | Confirmed | Reliability |
| REL-JINN-004 | Orchestration runtime construction not guarded at gateway startup / swap | Medium | Likely | Reliability |
| REL-JINN-005 | Failed orchestration run returned with HTTP 200 | Low | Confirmed | Reliability |
| REL-JINN-006 | Continuation requeue has no backoff/cap; `retry_count` tracked but never enforced | Medium | Likely | Reliability |
| REL-JINN-007 | `/status degraded` is process-up, not readiness; post-recovery loss only in notices | Low | Plausible | Reliability |

## 4. Detailed Findings

### REL-JINN-001: Empty/clean-exit engine output counts as a successful lease turn

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Reliability

Evidence:
- `packages/jinn/src/orchestration/run-mode.ts:520-522` — `export function orchestrationSessionFailed(session): boolean { return session.status === "error" || Boolean(session.error); }`
- `packages/jinn/src/gateway/run-web-session.ts:727-733` — completion writes
  `status: quietPreempted ? "idle" : (result.error ? "error" : "idle")`, `lastError: ... (result.error ?? null)`.
  Status is `idle` whenever `result.error` is falsy, with **no check that `result.result` is non-empty**.
- `packages/jinn/src/gateway/run-web-session.ts:718` — `if (result.result && ... ) insertMessage(...)`: an empty
  result simply inserts no assistant message; the turn still finalizes as `idle`.
- `packages/jinn/src/orchestration/run-mode.ts:174-197` — a non-failed session is pushed and the loop continues;
  `runAllocatedOrchestrationTask` returns `ok:true, state:"completed"` (run-mode.ts:220-228).
- `packages/jinn/src/orchestration/dual-lane.ts:184` — lane marked `completed` on `!orchestrationSessionFailed`,
  then surfaced as a `selection_required` candidate (dual-lane.ts:223-234) with `changedFiles: []`.
- `packages/jinn/src/orchestration/__tests__/run-mode.test.ts:44` — the existing test asserts success on
  `{ status: "idle", error: null }` with **no assertion that output was produced**, confirming this is the
  intended, locked-in behavior.

Observed behavior:
- An engine that exits cleanly producing no output (silent auth/model failure that still exits 0, or an
  interrupted-then-empty turn) yields `status: "idle", lastError: null`. `orchestrationSessionFailed` returns
  `false`, so the lease turn, the allocated task (`state:"completed"`), and a dual-lane lane all report success.

Expected boundary:
- A lease turn must require captured, non-empty engine output (or an explicit non-empty completion signal) to
  count as success; an empty clean exit must be classified as a failure with a reason.

Failure mechanism:
- Success is keyed solely on the absence of `result.error`. Empty `result.result` is treated identically to a
  real answer because output presence is never a postcondition of the success path.

Break-it angle:
- Configure/stub the worker engine to return `{ result: "", error: null }` (clean exit, no text). The
  orchestration run reports `completed`; the dual-lane comparison presents an empty lane as a real candidate a
  human can "select"; telemetry records `disposition: "completed"`.

Impact:
- False success. Downstream (coordinator continuation marked completed, dual-lane selection, empirical routing
  scores, operator dashboard) acts on a non-result as if work was done. A reviewer lane that produced nothing is
  indistinguishable from a passing review.

Operational impact:
- Blast radius: Workflow
- Side-effect class: user-visible (status/dashboard) + file (dual-lane manifest/artifacts)
- Reversibility: compensatable (re-run), but the false-completed state is acted on first
- Operator visibility: silent (looks healthy)
- Rerun safety: safe

Adjacent failure modes:
- REL-JINN-003 (a misclassified failure that still sets a benign status), REL-JINN-005 (HTTP 200 on failed),
  REL-JINN-007 (no degraded signal).

Recommended mitigation:
- Patterns: explicit-postcondition, classify-empty-as-failure.
- Minimal repair: in the completion path that the orchestration relies on, treat `!result.error && empty
  result.result && !quietPreempted` as a failure outcome (set `status:"error"`/explicit `lastError:"empty_output"`),
  or add an orchestration-side check in `orchestrationSessionFailed` / the session-to-run mapping that requires a
  non-empty output for non-preempted turns.
- Local guardrail: dual-lane should refuse to present a lane with zero changed files and an empty session as a
  selectable candidate.
- Behavior test: empty engine output yields a failed lease turn; non-empty yields success.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: small, local predicate change plus the session-completion classification, but it touches the shared
  web-session completion path so it needs careful test coverage to avoid regressing interactive sessions.

Validation:
- Test: stubbed engine returns empty output, no error → `orchestrationSessionFailed === true` and run `state:"failed"`.
- Test: `quietPreempted` (interrupt/supersede) with empty output stays non-failure (do not regress that path).

Non-goals:
- Do not change engine selection or the rate-limit/stall paths.

---

### REL-JINN-002: Expired lease does not interrupt the still-running engine; worker slot reused

Severity: High if reachable
Confidence: Plausible
Evidence basis: simulation-reasoned (requires-authorized-drill to confirm runtime double-allocation)
Domain: Reliability

Evidence:
- `packages/jinn/src/orchestration/scheduler.ts:207-226` — `expireLeases` sets `lease.state = "expired"` and
  records `lease_expired`; it has no reference to sessions or engines and performs **no kill**.
- `packages/jinn/src/orchestration/scheduler.ts:453-466` — `activeState()` only counts `state === "running"`
  leases for quota/concurrency; an expired-but-still-executing engine no longer consumes its worker slot.
- `packages/jinn/src/orchestration/runtime.ts:166-170,572-581` — the reaper calls `expireLeases` every
  `reaperIntervalMs` (default 5s) and then `retryQueuedWithLiveHeadroom`, which can allocate a new lease on the
  freed worker.
- `packages/jinn/src/gateway/run-web-session.ts:391` — the only forced-termination is the session stall watchdog,
  gated on `canKill` (interruptible engines only); non-interruptible engines run unbounded.

Observed behavior:
- When a lease's `leaseExpiresAt` passes while the engine turn is still running, the lease flips to `expired` and
  its worker becomes eligible for a new allocation. The original engine process is never interrupted by the
  scheduler.

Expected boundary:
- Lease expiry should either interrupt/abandon the running engine turn or keep the worker slot reserved until the
  turn actually terminates, so a worker cannot host two concurrent live turns.

Failure mechanism:
- The lease is pure scheduler bookkeeping with no back-channel to the executing session/engine. Expiry frees
  capacity accounting independently of whether the work stopped.

Break-it angle:
- Run a long turn on a non-interruptible engine with a lease shorter than the turn; after expiry, submit another
  task targeting the same worker. (Confirming the concurrent execution and its corruption potential requires a
  timing drill not authorized here — capped at Plausible.)

Impact:
- Potential double-occupancy of a worker, two engine turns sharing a worktree/cwd, and lease/session state drift.
  `validateLeaseForWorker` (scheduler.ts:240) would reject the *expired* lease's own heartbeat, but the new
  allocation proceeds independently.

Operational impact:
- Blast radius: Service
- Side-effect class: process + file (shared worktree)
- Reversibility: compensatable
- Operator visibility: log-only (`lease_expired`)
- Rerun safety: unknown

Adjacent failure modes:
- REL-JINN-006 (the freed slot drives the unthrottled requeue), worktree contention.

Recommended mitigation:
- Patterns: bound-the-work, abort-on-expiry.
- Minimal repair: on expiry, signal the mapped session to interrupt (reuse the lease-stop kill path in
  orchestration-routes.ts:555 `killSessionEngines`) before freeing the slot; or do not count a worker as free
  until the session reaches a terminal state.
- Local guardrail: refuse a new allocation onto a worker that still has a live mapped session.
- Behavior test: expiry of a lease with a live mapped session triggers an interrupt and does not free the slot
  until the session is terminal.

Implementation assessment:
- Complexity: cross_process_coordination
- Cost: M
- Cost drivers: modules, tests, runtime_verification
- Nominal agent: claude
- Rationale: couples scheduler lease lifecycle to the session/engine kill path across package boundaries and needs
  timing-sensitive verification.

Validation:
- Drill: long non-interruptible turn + short lease + second allocation; assert no concurrent execution on the worker.

Non-goals:
- Do not change lease duration defaults.

---

### REL-JINN-003: Engine failure classification collapses auth/timeout/network by ordered substring match

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Reliability

Evidence:
- `packages/jinn/src/orchestration/adapter/real-adapter.ts:327-337` — `engineFailureReason` classifies purely by
  `message.toLowerCase().includes(...)` in a fixed order: rate limit → quota/credit → `auth`/`login` →
  `context` → `unavailable`/`not found` → `timeout` → `unknown`.

Observed behavior:
- Classification is order- and substring-dependent. A network/timeout error whose message also contains the word
  "authentication" (e.g. "authentication endpoint unreachable, request timeout") is classified `auth_failure`
  because `auth` is tested before `timeout`. A message mentioning "context" anywhere is classed
  `context_overflow`. Any unmatched error becomes `unknown`.

Expected boundary:
- Auth vs network vs timeout vs quota vs empty-result must be classified from structured signals (exit code,
  error kind), not from order-sensitive substring matching of a free-text message.

Failure mechanism:
- No structured error taxonomy is propagated from the engine; the adapter reverse-engineers a category from a
  human string, so categories overlap and the first match wins.

Break-it angle:
- Force a network timeout against an auth endpoint; the result is reported as `auth_failure`, misdirecting the
  operator and any auto-remediation keyed on the reason.

Impact:
- Misclassified failures route operators to the wrong fix (e.g. re-login instead of retry), and any policy that
  treats `auth_failure` differently from `timeout` acts on a wrong label.

Operational impact:
- Blast radius: Workflow
- Side-effect class: user-visible
- Reversibility: reversible
- Operator visibility: UI-visible (wrong label)
- Rerun safety: safe

Adjacent failure modes:
- REL-JINN-001 (empty output never reaches this classifier at all because it is not even a failure).

Recommended mitigation:
- Patterns: structured-error-taxonomy.
- Minimal repair: prefer a structured `EngineFailureReason` from the engine where available; reorder so
  timeout/network are tested before generic `auth` substring, and require word-boundary matches.
- Behavior test: a timeout message containing "auth" classifies as `timeout`.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: contained pure-function change with clear unit tests.

Validation:
- Table-driven test over representative engine error strings asserting each distinct reason.

Non-goals:
- Do not redesign the engine error contract in this slice.

---

### REL-JINN-004: Orchestration runtime construction not guarded at gateway startup / config swap

Severity: Medium
Confidence: Likely
Evidence basis: source-evidenced
Domain: Reliability

Evidence:
- `packages/jinn/src/gateway/server.ts:943` — `orchestrationRuntime = createGatewayOrchestrationRuntime(currentConfig, employeeRegistry);`
  is **not** inside a try/catch (the preceding try closes at server.ts:919; the next try starts at server.ts:953).
- `packages/jinn/src/orchestration/runtime.ts:104-129` — the constructor runs `loadOrchestrationConfig`,
  `OrchestrationStore.open`, `PersistentMatrixScheduler.open`, and `recoverStaleDispatchingContinuations`, any of
  which can throw (config parse error, non-corruption store open failure).
- `packages/jinn/src/gateway/orchestration-runtime-manager.ts:31` — `swapOrchestrationRuntime` calls
  `createRuntime(config)` directly with no try/catch; a config reload that yields an invalid orchestration config
  throws out of the swap.

Observed behavior:
- A throw during runtime construction at boot propagates up through gateway bootstrap (potential startup crash);
  a throw during a config-reload swap propagates out of the swap path. The corruption path is handled (quarantine
  + reset, FSR-JINN-001), but non-corruption construction failures are not contained here.

Expected boundary:
- Orchestration startup failure must be isolated: the gateway should come up with orchestration reported
  `degraded`/`disabledReason`, not crash, and the existing runtime should survive a failed swap.

Failure mechanism:
- Construction failure is unguarded; there is no catch that downgrades to a degraded-but-bound state and records a
  reason.

Break-it angle:
- Make `loadOrchestrationConfig` parse-fail (malformed orchestration config) and start the gateway; the bootstrap
  throws rather than degrading.

Impact:
- Orchestration-config error becomes a whole-gateway availability problem; a bad reload can throw mid-reload.

Operational impact:
- Blast radius: Service
- Side-effect class: process
- Reversibility: reversible (fix config, restart)
- Operator visibility: log-only / crash
- Rerun safety: safe

Adjacent failure modes:
- REL-JINN-007 (`degraded` does not carry a startup-failure reason even if the throw were caught).

Recommended mitigation:
- Patterns: fail-visible, contain-startup-failure.
- Minimal repair: wrap the factory call (server.ts:943) and the swap's `createRuntime` in try/catch; on failure
  log, leave `orchestration.runtime` unbound, and let `/status` report `degraded` with a concrete reason; keep the
  prior runtime on a failed swap.
- Behavior test: a throwing `createRuntime` leaves the gateway up and `/status.degraded === true` with reason.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: add bounded error handling around two call sites plus a status reason field.

Validation:
- Test: factory throws → gateway boot continues, status degraded; swap throws → current runtime retained.

Non-goals:
- Do not change the corruption/quarantine recovery path.

---

### REL-JINN-005: Failed orchestration run returned with HTTP 200

Severity: Low
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Reliability

Evidence:
- `packages/jinn/src/gateway/api/orchestration-routes.ts:344` — `json(res, result, result.ok || result.state === "failed" ? 200 : 409);`

Observed behavior:
- A run whose body is `{ ok:false, state:"failed", errorSummary }` is returned with HTTP **200 OK**. Only
  `blocked_resource` / other non-ok states get 409.

Expected boundary:
- HTTP status should reflect outcome class: a failed run should not be 200. Body-aware clients are fine, but
  status-only clients (proxies, monitors, simple scripts) read success.

Failure mechanism:
- The success status was widened to include `state === "failed"` so the failure body is delivered, conflating
  "request handled" with "run succeeded".

Break-it angle:
- A monitor that alerts on non-2xx never fires for failed orchestration runs.

Impact:
- Silent-to-monitoring failures; dashboards keying on HTTP status mis-report.

Operational impact:
- Blast radius: Workflow
- Side-effect class: user-visible
- Reversibility: reversible
- Operator visibility: UI-visible (body) / silent (status code)
- Rerun safety: safe

Recommended mitigation:
- Patterns: honest-status-code.
- Minimal repair: return a non-2xx (e.g. 422) for `state:"failed"` while keeping the structured body; or document
  the contract and ensure all clients are body-aware.
- Behavior test: a failed run yields a non-2xx status with the failure body intact.

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: one-line status change plus a route test; verify dashboard does not rely on 200-for-failed.

Non-goals:
- Do not change the run body schema.

---

### REL-JINN-006: Continuation requeue has no backoff/cap; `retry_count` tracked but never enforced

Severity: Medium
Confidence: Likely
Evidence basis: source-evidenced
Domain: Reliability

Evidence:
- `packages/jinn/src/orchestration/store-continuations.ts:110-123` — `claimQueuedLiveContinuation` increments
  `retry_count = current.retry_count + 1` on every claim.
- Grep across `packages/jinn/src/orchestration/*.ts`: `retry_count`/`retryCount` is written and surfaced but
  **never read as a threshold**; there is no `maxRetries`/backoff/jitter constant anywhere in the orchestration
  package (the only `setTimeout` is the shutdown drain timer, runtime.ts:530).
- `packages/jinn/src/orchestration/runtime.ts:160-193,451-464` — `releaseLease` and `expireLeases` each call
  `retryQueuedWithLiveHeadroom`, which immediately re-`requestAllocation`s every queued item with no delay.

Observed behavior:
- A continuation that is allocated and then immediately fails in `resumeQueuedRunHandler` is marked `failed`
  (runtime.ts:495), which stops auto-retry — that path is bounded. But a continuation that keeps *blocking* on
  resource (missing role/quota) is retried on every lease release/expiry with no backoff and no attempt cap. The
  reaper firing `expireLeases` every 5s also drives repeated `retryQueued` passes.

Expected boundary:
- Repeated allocation attempts for a persistently-blocked continuation should back off (and ideally cap attempts
  or surface `retry_count`) so a flapping resource condition cannot drive a steady stream of allocation attempts
  and headroom-filter calls.

Failure mechanism:
- Retry is purely event-driven with no throttle; `retry_count` is recorded as telemetry but no policy consumes it.

Break-it angle:
- Hold a required role unavailable while leases churn (release/expire cycling); each cycle re-runs the full
  `retryQueued` + `resolveLiveHeadroomWorkerIds` (which calls the headroom filter / engine availability) for every
  blocked item. Whether this reaches harmful amplification depends on churn rate and filter cost (capped at
  Likely; not reproduced).

Impact:
- Wasted allocation/headroom work proportional to churn; no operator-visible "giving up" signal; a stuck
  continuation retries indefinitely.

Operational impact:
- Blast radius: Service
- Side-effect class: process (+ network if headroom filter probes engines)
- Reversibility: reversible
- Operator visibility: log-only (debug)
- Rerun safety: safe

Adjacent failure modes:
- REL-JINN-002 (slot churn feeds this), REL-JINN-007 (no surfaced retry/backoff state).

Recommended mitigation:
- Patterns: bounded-retry, backoff-and-cap.
- Minimal repair: add a minimum re-attempt interval per queued item (skip items retried within the window) and a
  `retry_count`/age cap that moves an item to a surfaced `blocked`/`failed-needs-attention` state.
- Local guardrail: debounce reaper-driven `retryQueued` so back-to-back expiries do not each trigger a full pass.
- Behavior test: a continuously-blocked continuation is retried at most once per interval and is flagged after N
  attempts.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: M
- Cost drivers: modules, tests
- Nominal agent: claude
- Rationale: introduces a retry/backoff policy across scheduler queue + continuation store with state surfacing.

Validation:
- Test: simulate repeated release/expire with a permanently-missing role; assert bounded attempt rate and a
  terminal surfaced state.

Non-goals:
- Do not change the failed-resume path (already terminal).

---

### REL-JINN-007: `/status degraded` reflects process-up, not readiness; post-recovery loss only in notices

Severity: Low
Confidence: Plausible
Evidence basis: source-evidenced
Domain: Reliability

Evidence:
- `packages/jinn/src/gateway/api/orchestration-routes.ts:504,509` — `degraded: enabled && !runtime` and
  `degradedReason` is non-null only in that same `enabled && !runtime` case.
- `packages/jinn/src/orchestration/runtime.ts:510-523` — `recoverStaleDispatchingContinuations` marks in-flight
  continuations `failed` at startup; this loss is **not** reflected in `degraded`/`degradedReason`.
- DB corruption quarantine+reset (FSR-JINN-001) surfaces only via `recoveryNotices` (store-recovery.ts:29,
  surfaced at orchestration-routes.ts:483,510) — the boolean `degraded` stays `false`.

Observed behavior:
- A runtime that is bound but came up from a reset/quarantined DB (work lost) or that just force-failed stale
  dispatching continuations reports `degraded: false`. The only signal is the `recoveryNotices` array; an operator
  or probe keying on the `degraded` boolean sees healthy.

Expected boundary:
- `degraded` should be true (with a reason) when the runtime started in a recovered/lossy state, not only when it
  is entirely unbound.

Failure mechanism:
- `degraded` is computed solely from runtime binding, decoupled from recovery/loss state.

Break-it angle:
- Corrupt the DB to trigger quarantine+reset, restart; `/status.degraded` is `false` despite lost in-flight work.

Impact:
- Operators/monitors keying on the boolean miss a lossy recovery; mitigated because `recoveryNotices` is present.

Operational impact:
- Blast radius: Workflow
- Side-effect class: user-visible
- Reversibility: reversible
- Operator visibility: UI-visible (notices) / silent (boolean)
- Rerun safety: safe

Recommended mitigation:
- Patterns: readiness-reflects-state.
- Minimal repair: set `degraded:true` + a reason when `recoveryNotices.length > 0` or when stale continuations
  were force-failed this boot.
- Behavior test: after a recovery notice exists, `/status.degraded === true` with a recovery reason.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: small status-payload change; main cost is agreeing on the readiness contract.

Non-goals:
- Do not change the quarantine mechanism (FSR-JINN-001).

---

## 5. Non-Findings (checked and held)

- **Telemetry/empirical-routing read is bounded.** `readOrchestrationTelemetry` enforces `maxBytes`
  (telemetry.ts:271-282, tail-reads only the last N bytes) and `maxRecords` (telemetry.ts:122-124), and callers
  pass caps (`EMPIRICAL_ROUTING_MAX_BYTES/RECORDS` runtime.ts:32-33; dashboard caps orchestration-routes.ts:28-29).
  No unbounded growth here. (REL-013 held.)
- **Worktree creation is bounded.** `createImplementationWorktree` throws at the configured `maxWorktrees`
  (worktree.ts:85-86, default 8), and the reaper removes orphaned worktrees (runtime.ts:414-422). (REL-005 held.)
- **Scheduler persistence is atomic-or-rehydrate.** `commitMutation`/`persistOrRehydrate`
  (persistent-scheduler.ts:98-112) rehydrate from the store and rethrow on persist failure rather than leaving the
  in-memory scheduler ahead of the DB. (REL-008 held for the snapshot-delta path; cross-ref FSR-JINN-001/002 for
  corruption/overwrite.)
- **Continuation claim is transactional.** `claimQueuedLiveContinuation` uses a SQLite transaction with a
  `state = 'queued'` guard (store-continuations.ts:104-130), preventing two resumes from both claiming the same
  queued continuation. The runtime checks the claim result and releases leases if the claim is empty
  (runtime.ts:474-483). (Double-dispatch held.)
- **Stale dispatching continuations are recovered at startup.** `recoverStaleDispatchingContinuations`
  (runtime.ts:510-523) force-fails continuations stuck in `dispatching` past the cutoff and releases their leases.
  (REL-007 partly held; the *honesty* of that recovery is REL-JINN-007.)
- **Lease release / cleanup runs in `finally`.** `runOrchestrationLeaseTurn` releases the lease and appends
  telemetry in `finally` (run-mode.ts:300-320); review-bundle/worktree cleanup runs in `finally`
  (run-mode.ts:203-218). Cleanup failures are logged, not swallowed. (REL-012 held at this layer; review-bundle
  crash-leak is FSR-JINN-003.)
- **Adapter subscriber failures are isolated.** `broadcast` wraps each subscriber in try/catch so a bad
  subscriber cannot tear down the engine run (real-adapter.ts:269-279). This is intentional isolation, not a
  swallowed error on the primary path. (REL-010 held here.)
- **Headroom filter fails closed.** On filter error, `resolveLiveHeadroomWorkerIds` returns an empty allow-set
  (runtime.ts:557-560), so a failing filter blocks allocation rather than allocating blindly. (Fail-safe held.)

## 6. Break-It Review

- Kill a dependency, read health: a bad orchestration config can throw at construction unguarded (REL-JINN-004);
  a recovered/reset DB still reports `degraded:false` (REL-JINN-007).
- Empty adapter output as success: **reproduced by source path** — empty clean exit → `idle` → success
  (REL-JINN-001), and the existing test locks this in.
- Timeout vs auth vs network classification: collapsed by ordered substring match (REL-JINN-003).
- Crash mid-write then restart: snapshot delta is atomic-or-rehydrate and claim is transactional (held);
  corruption handling cross-referenced to FSR-JINN-001/002.
- Unbounded input growth: telemetry and worktrees bounded (held).
- Swallowed exceptions: cleanup/telemetry failures are logged; adapter subscriber isolation is intentional (held).
- Retry storms: failed-resume is terminal (bounded), but blocked-resource requeue has no backoff/cap and is
  reaper-driven (REL-JINN-006).
- Lease expiry vs running engine: expiry does not interrupt the engine and frees the slot (REL-JINN-002).

## 7. Patch Order

1. REL-JINN-001 (High, S) — stop reporting empty output as success; highest operator-deception value.
2. REL-JINN-002 (High-if-reachable, M) — interrupt-on-expiry / reserve slot until terminal.
3. REL-JINN-006 (Medium, M) — bound continuation requeue (backoff + cap + surfaced state).
4. REL-JINN-004 (Medium, S) — guard runtime construction at startup and swap.
5. REL-JINN-003 (Medium, S) — fix failure classification ordering / structured reason.
6. REL-JINN-007 (Low, S) — make `degraded` reflect recovered/lossy state.
7. REL-JINN-005 (Low, XS) — honest HTTP status for failed runs.

## 8. Regression / Guardrail Tests To Add

- Empty engine output → failed lease turn / failed run; non-empty → success; preempted-empty stays non-failure.
- Lease expiry with a live mapped session interrupts the engine and does not free the slot until terminal.
- Continuously-blocked continuation: bounded attempt rate per interval; terminal surfaced state after N attempts.
- Throwing `createRuntime` at boot → gateway up + `degraded:true` with reason; throwing swap retains prior runtime.
- Classification table: timeout-message-containing-"auth" → `timeout`; distinct reasons for each input.
- After a recovery notice exists, `/status.degraded === true` with a recovery reason.
- Failed run route returns non-2xx with the structured failure body.

## 9. Validation Limits

- **Static/source-evidenced only.** No gateway was started, no engine stubbed, no kill/timeout/corruption drill
  was run (not authorized). Per the calibration addendum, race/timeout/multi-worker outcomes are capped:
  REL-JINN-002 is Plausible, REL-JINN-006/004 Likely. REL-JINN-001/003/005 are Confirmed from deterministic source
  paths (and REL-JINN-001 is corroborated by an existing test).
- `pnpm typecheck` / `pnpm test` were **not** run (audit-only; running them changes nothing but was not needed for
  the source-evidenced findings and would have added noise — stated here as a coverage limit).
- **Not reviewed in depth:** `store-snapshot.ts` delta internals beyond the atomic-or-rehydrate contract;
  `store-controls.ts` hold/pause SQL; `coordinator.ts` brief construction; `routing-headroom.ts` filter internals;
  `artifacts.ts` persistence; `cross-family.ts` reviewer policy correctness; `scheduler-retention.ts` pruning math;
  the `RealProviderAdapter` execution path's interaction with live runs (live runs go through session-dispatch, so
  the adapter's empty-result handling at real-adapter.ts:214 `if (!record.run.result) return providerOk([])` was
  noted but not the primary live success path). These are candidates for a follow-up pass.
- Cross-lens escalation: REL-JINN-002 and REL-JINN-006 touch concurrency/scheduling and would benefit from the
  audit-concurrency lens; REL-JINN-001 touches data-integrity (false-completed artifacts) and could be re-run under
  audit-recovery-idempotency for the dual-lane manifest implications.
