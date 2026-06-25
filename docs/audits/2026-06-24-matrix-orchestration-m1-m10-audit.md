# Matrix Orchestration M1-M10 Audit

- Date: 2026-06-24
- Actor: Codex
- Authority: audit-only
- Repo: `/home/ericl/vscode_github_public/jinn`
- Requested lenses: timing, path, connectivity, concurrency, fail-safe behavior, off-nominal behavior, recovery readiness
- Skills loaded: `failsafe-readiness`, `off-nominal-review`, `recovery-readiness`, `plan-prototype-build`
- Giles routing: explicitly waived by operator for this session
- Dory: resumed session `ab2839a8-9c05-40ed-8886-4abd163c3ec9`; Dory reported no recorded phase/last step/next step, so this audit treats Dory as partial continuity evidence only

## Scope

Reviewed the M1-M10 matrix orchestration surfaces that affect durable state, live execution, worker allocation, board dispatch, worktrees, dual-lane runs, telemetry, and empirical routing.

Primary files inspected:

- `packages/jinn/src/orchestration/scheduler.ts`
- `packages/jinn/src/orchestration/persistent-scheduler.ts`
- `packages/jinn/src/orchestration/store.ts`
- `packages/jinn/src/orchestration/runtime.ts`
- `packages/jinn/src/orchestration/run-mode.ts`
- `packages/jinn/src/orchestration/dual-lane.ts`
- `packages/jinn/src/orchestration/dual-lane-state.ts`
- `packages/jinn/src/orchestration/worktree.ts`
- `packages/jinn/src/orchestration/telemetry.ts`
- `packages/jinn/src/gateway/orchestration-runtime-manager.ts`
- `packages/jinn/src/gateway/orchestration-runtime-factory.ts`
- `packages/jinn/src/gateway/server.ts`
- `packages/jinn/src/gateway/ticket-dispatch.ts`
- `packages/jinn/src/gateway/board-worker.ts`
- `packages/jinn/src/gateway/run-web-session.ts`
- related tests under `packages/jinn/src/orchestration/__tests__` and `packages/jinn/src/gateway/__tests__`

No source patches were made.

## Findings Table

| ID | Severity | Confidence | Lens | Summary |
|---|---:|---|---|---|
| FSR-MATRIX-001 | High | Confirmed | Timing, Concurrency | Config reload replaces and closes the runtime even when active orchestration work exists |
| FSR-MATRIX-002 | High | Confirmed | Timing, Recovery | Graceful shutdown closes the orchestration runtime before active turns can release leases |
| FSR-MATRIX-003 | High | Confirmed | Connectivity, Timing | Single-worker/review pre-dispatch failures after allocation can leak leases until TTL |
| RRR-MATRIX-004 | High | Likely | Recovery, Concurrency | `dispatching` live continuations have no boot recovery path and can block active-work drain indefinitely |
| ONR-MATRIX-005 | Medium | Confirmed | Connectivity | Live orchestration allocation does not wire the headroom filter before leasing workers |
| ONR-MATRIX-006 | Medium | Confirmed | Timing, Config | Org-worker refresh defers during active work but is not replayed after drain |
| FSR-MATRIX-007 | Medium | Confirmed | Timing, Telemetry | Empirical routing and telemetry append use unbounded synchronous IO on daemon paths |

## Findings

### FSR-MATRIX-001: Config reload replaces and closes the runtime even when active orchestration work exists

Evidence:

- `packages/jinn/src/gateway/orchestration-runtime-manager.ts:12-17`
- `packages/jinn/src/gateway/server.ts:915-928`
- `packages/jinn/src/orchestration/runtime.ts:247-253`

Observed behavior:

- `reloadConfig()` calls `swapOrchestrationRuntime()`.
- If the new config still has `orchestration.enabled === true`, `swapOrchestrationRuntime()` immediately creates a new runtime, binds it, and closes the current runtime.
- This path does not check `currentRuntime.hasActiveWork()` before replacing the runtime.

Expected boundary:

- A config reload should not close the runtime that owns active leases, queued continuations, resume handlers, worktree reaping, and the scheduler store.

Failure mechanism:

- A config save/reload during an active orchestration run can close the runtime DB handle and scheduler while in-flight turns still expect to heartbeat/release through that runtime.
- Subsequent release or continuation completion may fail against a closed runtime, leaving durable state to rely on TTL cleanup instead of normal terminal cleanup.

Recommended mitigation:

- Make runtime replacement follow the same active-work discipline as org reload: if current runtime has active work, keep it bound and record a pending config/runtime refresh.
- Apply the pending refresh when active work drains, or expose an explicit operator-visible "refresh deferred" state.
- Add a test where config reload occurs while a lease is running and assert the old runtime remains bound until the lease is released.

### FSR-MATRIX-002: Graceful shutdown closes the orchestration runtime before active turns can release leases

Evidence:

- `packages/jinn/src/gateway/server.ts:1219-1227`
- `packages/jinn/src/gateway/server.ts:1234-1256`
- `packages/jinn/src/orchestration/run-mode.ts:295-320`
- `packages/jinn/src/gateway/ticket-dispatch.ts:343-353`
- `packages/jinn/src/orchestration/runtime.ts:247-253`

Observed behavior:

- Gateway cleanup stops the status reconciler and board worker, then calls `orchestrationRuntime?.close()`.
- Only after closing the runtime does shutdown mark running sessions interrupted and kill engine processes.
- Orchestration release ownership lives in active turn finalizers and ticket dispatch promise callbacks, both of which need the runtime to still be open.

Expected boundary:

- Shutdown should stop new orchestration dispatch, settle or interrupt active engine turns, release or expire owned leases, then close the runtime store.

Failure mechanism:

- An active turn can settle after the runtime has been closed. Its release path catches and logs release failures, but durable lease state may remain `running` until TTL or next boot expiry.
- Board/manual dispatch lease guards have the same risk because their promise callbacks call `runtime.releaseLease()` after `dispatchWebSessionRun()` settles.

Recommended mitigation:

- Add an orchestration shutdown phase: stop new dispatch, mark active orchestration sessions interrupted, kill or await engines, release/expire running orchestration leases, mark in-flight continuations retryable/failed, then close runtime.
- Track in-flight orchestration run promises in the runtime so `close()` can either drain them or fail them deterministically.
- Add tests for shutdown during a controlled unresolved orchestration run and a board-dispatch run.

### FSR-MATRIX-003: Single-worker/review pre-dispatch failures after allocation can leak leases until TTL

Evidence:

- `packages/jinn/src/orchestration/run-mode.ts:155-200`
- `packages/jinn/src/orchestration/run-mode.ts:242-249`
- `packages/jinn/src/orchestration/run-mode.ts:271-287`
- `packages/jinn/src/orchestration/run-mode.ts:295-320`

Observed behavior:

- `runAllocatedOrchestrationTask()` sets `turnStarted = true` immediately before calling `runOrchestrationLeaseTurn()`.
- The caller only releases the lease in its catch block when `turnStarted` is false.
- `runOrchestrationLeaseTurn()` can throw before its own `try/finally` release block is installed: invalid lease validation, missing engine, `createSession()`, `insertMessage()`, or `updateSession()`.

Expected boundary:

- Once a lease has been allocated, every pre-dispatch and dispatch failure path should release it or mark it terminal.

Failure mechanism:

- If a worker's provider engine is unavailable, or a session DB write fails after allocation but before the dispatch `try/finally`, the caller skips release because `turnStarted` is already true.
- The worker remains leased until TTL expiry, blocking queued work and producing no durable run telemetry for the failed launch.

Recommended mitigation:

- Move the `turnStarted = true` boundary inside `runOrchestrationLeaseTurn()` after the release-owning `try/finally` is installed, or release in the outer catch whenever the lease is still running.
- Add tests for missing engine after allocation, failed `createSession()`, and failed `insertMessage()` that assert lease release and failed telemetry or visible failure state.

### RRR-MATRIX-004: `dispatching` live continuations have no boot recovery path and can block active-work drain indefinitely

Evidence:

- `packages/jinn/src/orchestration/live-run.ts:4`
- `packages/jinn/src/orchestration/store.ts:78-92`
- `packages/jinn/src/orchestration/store.ts:502-535`
- `packages/jinn/src/orchestration/runtime.ts:227-230`
- `packages/jinn/src/orchestration/runtime.ts:263-293`
- `packages/jinn/src/orchestration/runtime.ts:307-315`

Observed behavior:

- `claimQueuedLiveContinuation()` moves a continuation from `queued` to `dispatching`.
- Completion/failure marking happens only after the async resume handler returns.
- `hasActiveWork()` treats `dispatching` continuations as active.
- Runtime boot/reaper expires leases and reaps worktrees, but does not reconcile old `dispatching` continuations.

Expected recovery behavior:

- A daemon crash or process kill after claim but before completion should leave a continuation in a recoverable state on next boot.

Failure mechanism:

- A stale `dispatching` continuation can survive restart forever.
- Because `hasActiveWork()` includes `dispatching`, the runtime can appear permanently active, blocking org/config refresh drain behavior.
- Manual retry only accepts `failed` continuations, not `dispatching`.

Recommended mitigation:

- On runtime boot, identify `dispatching` continuations older than a configured threshold and mark them `failed` or `queued` after checking whether any corresponding lease/session is still live.
- Consider adding a `dispatchHeartbeatAt` or `claimedByRuntimeId` field so stale dispatching can be distinguished from a currently running resume.
- Add restart tests for crash-after-claim, crash-after-allocation-before-handler, and stale dispatching manual recovery.

### ONR-MATRIX-005: Live orchestration allocation does not wire the headroom filter before leasing workers

Evidence:

- `packages/jinn/src/orchestration/routing-headroom.ts:27-66`
- `packages/jinn/src/orchestration/run-mode.ts:126-129`
- `packages/jinn/src/orchestration/runtime.ts:99-104`
- `packages/jinn/src/orchestration/run-mode.ts:247-248`

Observed behavior:

- `engineHasHeadroom()` and `filterWorkersWithHeadroom()` exist and are tested.
- General live orchestration calls `runtime.requestAllocation()`, which delegates straight to scheduler allocation.
- Engine resolution happens only after the lease has already been allocated.

Expected boundary:

- Live routing should exclude workers whose engine is unavailable, exhausted, or below the configured remaining-usage floor before a lease is created.

Failure mechanism:

- A rate-limited or unavailable engine can still receive a lease. The failure then occurs late in `runOrchestrationLeaseTurn()`.
- Combined with FSR-MATRIX-003, an unavailable engine can also leak the lease until TTL.

Recommended mitigation:

- Add a live-only candidate/headroom filter at runtime allocation time while preserving pure simulation determinism.
- If no headroom-qualified worker exists, queue or fail visibly without creating a lease.
- Add tests that an exhausted provider is skipped before lease creation and that hard constraints still override empirical scores.

### ONR-MATRIX-006: Org-worker refresh defers during active work but is not replayed after drain

Evidence:

- `packages/jinn/src/gateway/orchestration-runtime-manager.ts:31-42`
- `packages/jinn/src/gateway/server.ts:835-857`
- `packages/jinn/src/gateway/__tests__/orchestration-runtime-manager.test.ts:42-66`

Observed behavior:

- Org reload correctly defers runtime refresh while active orchestration work exists.
- The defer path only logs and returns the current runtime.
- Tests cover a second explicit refresh after drain, but no code stores a pending refresh request or triggers it when drain completes.

Expected boundary:

- If an org reload is deferred for safety, the system should eventually apply it once active work drains without requiring another filesystem event.

Failure mechanism:

- A worker rename/removal/model change during active work leaves the scheduler using stale synthesized workers until another org/config reload happens.
- Board dispatch may keep allocating a stale org-derived worker mapping after the live work has already drained.

Recommended mitigation:

- Track `pendingOrgRefresh` in the runtime manager or server closure and re-run runtime construction when `hasActiveWork()` transitions false.
- Alternatively add a periodic drain check tied to the existing status reconciler or orchestration reaper.
- Add a test that an org reload during active work is applied automatically after the final lease releases.

### FSR-MATRIX-007: Empirical routing and telemetry append use unbounded synchronous IO on daemon paths

Evidence:

- `packages/jinn/src/orchestration/telemetry.ts:78-94`
- `packages/jinn/src/orchestration/telemetry.ts:96-114`
- `packages/jinn/src/orchestration/runtime.ts:367-378`

Observed behavior:

- Every telemetry append opens the log synchronously, writes one JSONL line, and fsyncs by default.
- Empirical routing startup reads the full telemetry log synchronously and computes scores over all records.
- There is no cap, rotation, score cache, or tail-window limit.

Expected boundary:

- Durable telemetry should not make daemon boot, config reload, or hot dispatch paths scale with the full historical log size.

Failure mechanism:

- A large `orchestration-telemetry.jsonl` can delay runtime creation when `orchestration.empiricalRouting` is enabled.
- Frequent small runs can introduce event-loop stalls from per-record synchronous fsync.

Recommended mitigation:

- Keep append-only JSONL as the durable surface, but add rotation or a bounded score window for empirical routing.
- Cache computed scores with a watermark, or read only the last N records/bytes.
- Consider async/batched append with a shutdown flush, while preserving safe file mode and no-secret sanitization.

## Failure Table

| Failure mode | Detection today | Containment today | Recovery today | Gap |
|---|---|---|---|---|
| Config reload during active orchestration | None specific | New runtime is bound immediately | Old runtime is closed | Active leases can outlive their owning runtime |
| Graceful shutdown during active orchestration | Cleanup logs only if later release fails | Sessions are marked interrupted after runtime close | Lease TTL/boot expiry eventually cleans | Release ownership is closed before the releaser runs |
| Engine unavailable after allocation | Exception from `runOrchestrationLeaseTurn()` | Worktree cleanup still runs | Lease expiry later | Lease release can be skipped before dispatch `finally` exists |
| Crash during queued continuation dispatch | Continuation remains `dispatching` | `hasActiveWork()` keeps it visible | No automatic stale-dispatching reconciliation | Runtime can stay "active" forever |
| Huge telemetry log | Empirical routing catches read errors | Corrupt lines skipped | No size control | Startup/config reload can block on full sync read |
| Org reload during active work | Warning log | Current runtime retained | Only a later reload applies changes | Deferred refresh intent is not remembered |

## Off-Nominal Scenario Worksheet

| Scenario | Current response | Result | Recommended drill |
|---|---|---|---|
| Operator saves config while one orchestration task is running | Runtime swaps and closes old instance | Unsafe | Test active lease survives config reload and releases normally |
| Operator stops daemon while a board-dispatched run is still resolving | Runtime closes before promise release callback | Unsafe | Test graceful shutdown with delayed dispatch promise |
| Worker provider binary disappears between allocation and execution | Engine lookup fails after lease | Unsafe | Test missing engine releases lease and reports failed launch |
| Process crashes after `claimQueuedLiveContinuation()` | Continuation persists as `dispatching` | Unsafe | Restart test converts stale dispatching to retryable state |
| Org YAML changes during a long task | Refresh logs deferred | Degraded | Test automatic post-drain refresh |
| Worktree base cwd is outside configured roots | `resolveTaskBaseCwd()` rejects | Safe | Keep as regression test |
| Board worker tries a busy exact worker | Immediate allocation returns busy and ticket stays `todo` | Safe | Existing test covers this |
| Telemetry line is malformed | Reader skips and counts corrupt line | Safe | Existing test covers this |

## Recovery Worksheet

| State artifact | Normal owner | Restart behavior | Recovery concern |
|---|---|---|---|
| `leases` in `orchestration.db` | `PersistentMatrixScheduler` | Hydrated and expired by reaper | Active runtime closure can leave running leases until TTL |
| `queue_items` in `orchestration.db` | `MatrixScheduler` | Retried on release/expiry | Safe if release/expiry still fires |
| `live_run_continuations` | `OrchestrationRuntime` | Loaded from store | `dispatching` has no stale recovery |
| managed worktrees | `OrchestrationRuntime.reapWorktrees()` | Reaped unless protected | Dual-lane selected worktrees intentionally remain; needs operator cleanup policy later |
| board tickets | orphaned-ticket reconciler | Startup and periodic sweep | Good containment: stale in-progress becomes blocked, not silently retried |
| telemetry JSONL | telemetry module | Read by CLI and empirical routing | Corrupt tolerant, but unbounded sync read |

## Non-Findings

- Persistent scheduler state writes use SQLite transactions for snapshot deltas.
- `runWebSession` heartbeats orchestration leases every 5 seconds from `transportMeta`.
- Board/manual ticket dispatch under orchestration uses an exact-worker lease guard and does not fall back to legacy dispatch when the runtime is unavailable.
- Board write failure after allocation releases the lease and leaves the ticket retryable in existing tests.
- Worktree path handling validates allowed workspace roots, managed worktree root containment, and marker-based cleanup.
- Dual-lane failure handling has a broader catch path that releases still-running allocation leases and cleans prepared worktrees.
- Telemetry record sanitization omits prompts, raw model output, and paths from run records; worktree paths still appear in dual-lane archive metadata, which is a local artifact rather than the telemetry JSONL.

## Suggested Repair Order

1. Fix runtime swap/shutdown ownership first: FSR-MATRIX-001 and FSR-MATRIX-002.
2. Fix single-worker pre-dispatch lease release: FSR-MATRIX-003.
3. Add stale `dispatching` continuation recovery: RRR-MATRIX-004.
4. Wire live headroom filtering before leases: ONR-MATRIX-005.
5. Add deferred org-refresh replay after drain: ONR-MATRIX-006.
6. Bound telemetry IO for empirical routing: FSR-MATRIX-007.

## Tests To Add

- Config reload with an active orchestration lease preserves the old runtime until release.
- Graceful shutdown during active `runOrchestrationLeaseTurn()` releases or expires leases deterministically before runtime close.
- Missing worker engine after allocation releases the lease and appends a failed telemetry record or returns a visible failed state.
- Restart with a `dispatching` continuation older than the threshold marks it retryable/failed and does not keep `hasActiveWork()` true forever.
- Live allocation with an exhausted engine does not create a lease for that worker.
- Org reload during active work is automatically applied after the last active lease/continuation drains.
- Empirical routing uses a bounded telemetry fixture and starts within an asserted time budget.

## Validation

Audit validation only:

- `git status --short --branch` was clean before the audit.
- Source was read with line-numbered evidence.
- No unit tests were run because this was an audit-only request and no source behavior was changed.

## Residual Risk

This was a static source audit. It did not simulate real daemon reloads, signal shutdown, or process crashes. The highest-risk findings should be validated with deterministic tests before any broader M11 dashboard/control work builds on these lifecycle assumptions.
