# Orchestration Temporal Audit (audit-temporal lens)

Date: 2026-06-25
Lens: `audit-temporal` (domain TMP / finding prefix TMP)
Scope: orchestration layer of `packages/jinn/src/orchestration/**` + gateway orchestration routes
Authority: **REPORT-ONLY**. No source/test files were modified. The only file written is this report.
Repo: `/home/ericl/Work/vscode/public_share/jinn` (pnpm + Turborepo TS monorepo)

> The supplied prompt is treated as a draft. I preserved the intended mission (time/ordering
> failures in orchestration) but expanded review to adjacent seams the TMP-001..TMP-015
> inventory implied (reaper TOCTOU, heartbeat-on-expired-lease, mixed-era empirical routing,
> mtime-derived artifact timestamps).

## Budget and method

Files deep-read (every line): `scheduler.ts`, `persistent-scheduler.ts`, `lease-meta.ts`,
`store-continuations.ts`, `recovery-requeue.ts`, `scheduler-retention.ts`, `store-recovery.ts`,
`store-schema.ts`, `store-snapshot.ts`, `store-controls.ts`, `store.ts`, `store-utils.ts`,
`run-mode.ts`, `runtime.ts`, `worktree.ts`, `dual-lane.ts`, `dual-lane-state.ts`,
`artifacts.ts`, `telemetry.ts`, `coordinator.ts`, `live-run.ts`, `routing-headroom.ts`, plus
`gateway/api/orchestration-routes.ts` (dual-lane select/apply, retry, requeue handlers) and
`run-mode.test.ts` (workspace ordering confirmation). Not deep-read: `adapter/*.ts`,
`store.test.ts`/`scheduler.test.ts` internals, `gateway/orchestration-runtime-{factory,manager}.ts`
(grepped only), `cross-family.ts`, `routing-headroom` usage internals, `config.ts`, `schemas.ts`,
`audit.ts`. Validation (typecheck/vitest) was **not executed**; all confidence ceilings reflect
static (`source-evidenced`) analysis only — see Validation Limits.

Cross-reference: the prior recovery-idempotency audit
(`docs/audits/2026-06-25-recovery-idempotency-orchestration-kanban.md`) already filed
**FSR-JINN-001** (SQLITE_BUSY → DB quarantine/reset) and **FSR-JINN-002** (continuation
overwrite of an active run). These are **not** re-derived here. Where a temporal angle touches
them, it is cross-referenced.

---

## Surface / Temporal inventory

| Artifact/State | Created | Consumed | Freshness check | Expiry/Version | Ordering guarantee | Cleanup |
|---|---|---|---|---|---|---|
| Lease (`leases`) | `createLease` (`scheduler.ts:474`) | `validateLeaseForWorker` (`scheduler.ts:228`), `heartbeatLease` (`scheduler.ts:172`) | validate checks `leaseExpiresAt <= now` (`:240`); heartbeat checks only `state==="running"` (`:520`) | `leaseExpiresAt`, `leaseDurationMs` | `expireLeases` sweeps `state==="running"` past expiry (`:207`) | terminal allocations pruned by retention (`scheduler-retention.ts:46`) |
| Allocation | `requestAllocation` (`scheduler.ts:150`) | `runAllocatedOrchestrationTask` (`run-mode.ts:144`) | none at consume; lease re-validated per turn | derived state | sequential per-lease loop (`run-mode.ts:157`) | `pruneTerminalAllocations` 24h / 1000 cap |
| Live continuation | `queueLiveContinuation`/`buildContinuationRecord` (`run-mode.ts:475`) | `claimQueuedLiveContinuation` (`store-continuations.ts:97`), dispatch (`runtime.ts:466`) | claim is transactional `state==="queued"` guard | `state` enum, `retryCount` | claim transaction; queue ordered by `updated_at` | `recoverStaleDispatchingContinuations` (`runtime.ts:510`); `deleteLiveContinuation` |
| Queue item | `queueBlocked` (`scheduler.ts:490`) | `retryQueued` (`scheduler.ts:244`) | re-runs `requestAllocation` (fresh) | priority + `blockedSince` | `compareQueueItems` priority→time→taskId (`:640`) | spliced on success |
| Hold | `createHold` (`runtime.ts:301`) | `activeHeldWorkerIds` filter (`runtime.ts:563`), recovery import | `expireHolds` `expires_at <= now` (`store-controls.ts:172`) | `expiresAt` | expire-before-read in `listHolds`/`activeHeldWorkerIds` | `expireHolds` marks `expired` |
| Implementation worktree | `createImplementationWorktree` (`worktree.ts:72`) | reviewer review-bundle / dual-lane diff | marker file presence | none (no version) | reaper protects running-lease + dual-lane taskIds (`runtime.ts:414`) | `reapOrphanedWorktrees` every 5s (`runtime.ts:576`); `cleanupWorktree` |
| Review bundle | `createReviewBundle` (`worktree.ts:182`) | reviewer session cwd | snapshot copy of diff at create time | none | created synchronously in lease loop | `cleanupReviewBundle` in `finally` (`run-mode.ts:204`) |
| Dual-lane manifest | `writeDualLaneManifest` (`dual-lane-state.ts:58`) | `selectDualLaneWinner`/`applyDualLaneWinner` | `state` check (`selection_required`/`selected`) | `promptHash`, `state` | manifest write before persist | local artifact; not auto-cleaned |
| Dual-lane artifacts | `writeArtifact` (`artifacts.ts:153`) | `listArtifactContents`/apply | mtime-derived `createdAt` | `artifactId` (overwrites) | none | none (over-preserved) |
| Telemetry JSONL | `appendOrchestrationTelemetry` (`telemetry.ts:83`) | `computeWorkerScores` (`runtime.ts:638`) | tail-read maxBytes/maxRecords | none | append-only; no era boundary | none (unbounded file) |
| Scheduler snapshot (SQLite) | `applySnapshotDelta` (`persistent-scheduler.ts:105`) | `loadSnapshot` on boot/rehydrate | delta vs in-memory before-state | `schema_version=4`, `nextSeq` | single-writer in-process; transactional | retention prune on every mutation |
| Recovery manifest | `writeRecoveryManifest` (`store-recovery.ts:18`) | `requeueRecoveredContinuation` (`recovery-requeue.ts:43`) | field-shape validation | `recoveredAt` (informational) | n/a | not cleaned (over-preserved) |

## Boundary map (intended boundaries)

- **Freshness**: lease must be unexpired at use; worktree must exist when reviewer/dual-lane reads it.
- **Expiry**: expired leases/holds must not be treated as authority.
- **Ordering**: continuation claim must be single-winner; queue retried by priority then age.
- **TOCTOU**: lease validate→use, dirty-base check→patch apply, worktree protect→reap.
- **Era**: empirical worker scores must not blend pre/post-config-change telemetry as if uniform.
- **Draft-as-final**: dual-lane manifest `selection_required` must not be applied as if `selected`.
- **Retention/cleanup**: terminal allocations, telemetry, worktrees, manifests, recovery files.

---

## Findings table

| ID | Sev | Conf | Basis | TMP | Mechanism (one line) |
|---|---|---|---|---|---|
| TMP-JINN-001 | High | Likely | source-evidenced | TMP-007/014 | Worktree reaper can delete the implementation worktree in the lease-release→reviewer-setup window, so the review/diff runs on a deleted tree. |
| TMP-JINN-002 | Medium | Confirmed | source-evidenced | TMP-003 | `heartbeatLease` accepts a lease that is past `leaseExpiresAt` but not yet reaped and resurrects it with a fresh expiry. |
| TMP-JINN-003 | Medium | Confirmed | source-evidenced | TMP-007 | `applyDualLaneWinner` checks `isGitWorkspaceDirty(baseCwd)` then `git apply`s with a mutation window in between (TOCTOU on the base tree). |
| TMP-JINN-004 | Medium | Likely | source-evidenced | TMP-009 | Empirical worker scores blend all-era telemetry (no time window / config-era boundary), so stale eras steer current routing. |
| TMP-JINN-005 | Low | Confirmed | source-evidenced | TMP-013/002 | Artifact `createdAt` is derived from filesystem mtime, not a logical clock; rewrites and clock skew misorder/relabel artifacts. |
| TMP-JINN-006 | Low | Likely | source-evidenced | TMP-014/015 | Recovery manifests and telemetry JSONL have no retention/cleanup; over-preserved legacy data accumulates and recovery files are never pruned. |

Non-findings (checked and held): lease validate-at-use expiry; continuation claim single-winner;
hold expire-before-read; migration sequencing; snapshot delta ordering; dual-lane draft-vs-final
state gate; queue ordering. See Non-Findings.

---

## Detailed findings

### TMP-JINN-001: Worktree reaper can delete the implementation worktree during the implementer→reviewer handoff

Severity: High
Confidence: Likely
Evidence basis: source-evidenced
Domain: Temporal

Evidence:
- `packages/jinn/src/orchestration/run-mode.ts:157-202` — leases run **sequentially**; each `runOrchestrationLeaseTurn` releases its own lease in `finally` before the loop advances to the next lease.
- `packages/jinn/src/orchestration/run-mode.ts:300-305` — `finally { runtime.releaseLease(opts.lease.leaseId, ...) }` releases the implementer lease as soon as its turn ends.
- `packages/jinn/src/orchestration/run-mode.ts:438-453` — the reviewer's workspace is built by `prepareLeaseWorkspace` → `createReviewBundle`, which reads the implementation worktree (`source.handle`) **after** the implementer turn has returned.
- `packages/jinn/src/orchestration/runtime.ts:414-422` — `reapWorktrees()` builds `activeTaskIds` from **running** leases (`lease.state === "running"`) plus dual-lane protected task IDs only.
- `packages/jinn/src/orchestration/runtime.ts:572-581` — the reaper runs on a `setInterval` (`DEFAULT_REAPER_INTERVAL_MS = 5_000`, `runtime.ts:29`) and immediately on `startReaper()`.
- `packages/jinn/src/orchestration/worktree.ts:222-230` — `reapOrphanedWorktrees` removes every managed worktree whose `handle.taskId` is not in `activeTaskIds`.
- Confirming order: `packages/jinn/src/orchestration/__tests__/run-mode.test.ts:314-318` asserts sessions run as `implementation_worktree` then `review_bundle`, and `:323` asserts the implementation cwd is gone after the run — the reviewer bundle is sourced from the implementation worktree.

Observed behavior:
- In `single_worker_with_review` (and `architecture`) with `workspacePolicy: isolated_worktree`, the implementer lease is released the instant its turn ends. Until the reviewer lease begins its turn and `createReviewBundle` copies the diff, **no running lease references that taskId**, so the worktree is unprotected. A reaper tick in that window calls `reapOrphanedWorktrees`, which removes the implementation worktree (and its branch).

Expected boundary (freshness / TOCTOU):
- An artifact that a later step in the same allocation will consume must remain protected until consumed. The reaper's "active" set must include taskIds with any non-terminal allocation/queued reviewer turn, not only taskIds with a currently-running lease.

Failure mechanism:
- Protection is keyed on *running leases*, but the lease lifecycle releases per-turn while the allocation is still mid-pipeline. The reaper's liveness model and the run loop's lease model disagree about when a taskId is "done".

Break-it angle:
- Enqueue a review-mode task whose implementer turn ends just before a reaper tick; the reviewer then calls `diffWorktree`/`createReviewBundle` against a path the reaper deleted. `diffWorktree` → `findGitRoot` returns the parent repo or throws; the reviewer reviews an empty or wrong patch, or the turn throws. The same window exists for `workspaceTelemetryCounts` (`run-mode.ts:406-414`).

Impact:
- Reviewer reviews a stale/empty/incorrect diff and may pass a change it never saw (false-clean review), or the run fails mid-pipeline after the implementer already executed. Review integrity — a core orchestration guarantee — is silently compromised.

Operational impact:
- Blast radius: Workflow
- Side-effect class: file (worktree/branch removal)
- Reversibility: irreversible (worktree + branch deleted; diff lost)
- Operator visibility: log-only (cleanup warnings) / silent for the false-clean review
- Rerun safety: unknown (rerun re-creates worktree, but a passed review cannot be un-passed)

Adjacent failure modes:
- Reaper vs dual-lane: dual-lane is protected via `listProtectedDualLaneTaskIds` (`runtime.ts:420`), but only *after* the manifest is written (`dual-lane.ts:205`); a tick between worktree creation (`dual-lane.ts:144`) and manifest write is similarly unprotected for dual-lane.
- TMP-JINN-002 (expired-lease heartbeat) shares the lease-liveness modeling gap.

Recommended mitigation:
- Remediation patterns: protect-by-allocation-not-lease; reaper grace window.
- Minimal repair: include in `activeTaskIds` the taskIds of all non-terminal allocations and any allocation currently being executed by the run loop, not only running leases; alternatively keep the implementer lease (or a protection token) until the dependent reviewer turn has captured its bundle.
- Local guardrail: a per-task "in-flight pipeline" set held by the runtime for the duration of `runAllocatedOrchestrationTask`, consulted by `reapWorktrees`.
- Behavior test: drive a review-mode run with the reaper enabled and a forced tick between implementer release and reviewer setup; assert the review bundle equals the implementer diff and the worktree survives until the bundle is built.

Implementation assessment:
- Complexity: cross_process_coordination
- Cost: M
- Cost drivers: modules, tests, runtime_verification
- Nominal agent: codex
- Rationale: small surface (reaper active-set + run loop), but the fix must be validated against a timing race, raising the test/verification cost above a pure local guardrail.

Validation:
- Reaper tick in the handoff window does not remove a worktree owned by an in-flight allocation; reviewer always sees the implementer's actual diff.

Non-goals:
- Do not change the per-turn lease-release semantics for telemetry/quota accounting.

---

### TMP-JINN-002: `heartbeatLease` accepts and resurrects a lease past its expiry (expired authority accepted)

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Temporal

Evidence:
- `packages/jinn/src/orchestration/scheduler.ts:172-187` — `heartbeatLease` calls `getRunningLease(leaseId)` then sets `lease.leaseExpiresAt = now + leaseDurationMs`.
- `packages/jinn/src/orchestration/scheduler.ts:520-525` — `getRunningLease` only rejects when `state !== "running"`; it does **not** compare `leaseExpiresAt` to `now`.
- Contrast: `packages/jinn/src/orchestration/scheduler.ts:240` — `validateLeaseForWorker` *does* reject `Date.parse(lease.leaseExpiresAt) <= this.now()` with `lease_expired`.
- `packages/jinn/src/orchestration/scheduler.ts:207-226` — a lease only transitions to `expired` when `expireLeases` runs; between true expiry and the next reaper sweep, `state` is still `"running"`.

Observed behavior:
- A lease whose `leaseExpiresAt` has already passed but which has not yet been swept by `expireLeases` is still `state==="running"`. `heartbeatLease` accepts it and rewrites `leaseExpiresAt` to a fresh future time, resurrecting an expired authority instead of rejecting it.

Expected boundary (expiry):
- An expired lease is dead authority. Heartbeat should reject (or require re-validation against `now`) exactly as `validateLeaseForWorker` does, so that an expired lease cannot be silently extended.

Failure mechanism:
- Two different "is this lease alive?" predicates exist. `validateLeaseForWorker` checks the clock; `getRunningLease` (used by heartbeat and release) checks only the stored state enum, which lags the clock until the reaper runs.

Break-it angle:
- Let a lease expire, suppress/deflake the reaper tick (or call heartbeat within the same tick window), then heartbeat: the lease is extended past a deadline the system intended to enforce, even though a concurrent `validateLeaseForWorker` would reject the same lease. The scheduler can then hold quota/worker slots for work that should have been reclaimed.

Impact:
- Expiry is not authoritative for heartbeat: a stuck/slow worker can keep a slot indefinitely by heartbeating around expiry, defeating the reaper's reclaim guarantee. Inconsistent with the validate path, so two callers disagree on the same lease's validity.

Operational impact:
- Blast radius: Workflow
- Side-effect class: DB (lease row extended)
- Reversibility: compensatable (next expiry/reaper can still reclaim once heartbeats stop)
- Operator visibility: log-only (`lease_heartbeat` telemetry)
- Rerun safety: safe

Adjacent failure modes:
- Shares the lease-liveness modeling gap with TMP-JINN-001.
- `releaseLease` also uses `getRunningLease`; releasing an already-expired-but-unswept lease emits `lease_released` rather than reflecting expiry (cosmetic, lower severity).

Recommended mitigation:
- Remediation patterns: single-source liveness predicate; re-validate at use.
- Minimal repair: in `heartbeatLease`, reject when `Date.parse(lease.leaseExpiresAt) <= this.now()` (mirror `validateLeaseForWorker`), or call `expireLeases(this.now())` first and then re-fetch.
- Local guardrail: factor a shared `isLeaseLive(lease, now)` used by validate/heartbeat/release.
- Behavior test: expire a lease without running the reaper, assert `heartbeatLease` throws `lease_expired` and does not extend `leaseExpiresAt`.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: one predicate added to one method plus a focused test; risk is regressing the heartbeat-happy-path, hence S not XS.

Validation:
- An expired (unswept) lease cannot be heartbeated back to life; validate and heartbeat agree.

Non-goals:
- Do not change the reaper interval or the `expired` state machine.

---

### TMP-JINN-003: TOCTOU between dirty-base check and `git apply` in `applyDualLaneWinner`

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Temporal

Evidence:
- `packages/jinn/src/orchestration/artifacts.ts:89-92` — `if (isGitWorkspaceDirty(manifest.baseCwd)) { ... return dirty_base }`.
- `packages/jinn/src/orchestration/artifacts.ts:93-112` — then `patchWorktree(winner.worktree)` and `applyPatchToGitWorkspace(manifest.baseCwd, patch)`.
- `packages/jinn/src/orchestration/worktree.ts:141-154` — `applyPatchToGitWorkspace` does `git apply --check` then `git apply` (two separate invocations, a second internal TOCTOU window).
- `packages/jinn/src/gateway/api/orchestration-routes.ts:232-259` — the apply route has no locking around the check→apply sequence; concurrent POSTs are possible.

Observed behavior:
- The base working tree is validated as clean, then a patch is generated and applied. Between the `isGitWorkspaceDirty` check and `git apply`, the base tree (`baseCwd`) can be mutated (another apply, an interactive session, a concurrent dual-lane apply for a different task pointed at the same base) so the patch lands on a tree different from the one validated.

Expected boundary (TOCTOU):
- The clean-base invariant must hold at apply time, not only at check time. Either apply under a lock that also covers the check, or rely solely on `git apply --check` atomically with `git apply` (still racy without a lock).

Failure mechanism:
- Validation and use are separated by patch generation, telemetry, and process boundaries with no lock; the base tree is shared mutable state.

Break-it angle:
- Fire two `dual-lane/apply` requests for two tasks sharing one `baseCwd`, or dirty the base between check and apply: the second apply can corrupt or partially apply onto a non-clean tree, or `--check` passes and the subsequent `git apply` fails after the first hunk, leaving a partially-applied tree.

Impact:
- Partial/garbled patch application onto canonical working tree; the "clean base" guarantee the operator relies on for safe apply is not actually enforced at the moment of mutation.

Operational impact:
- Blast radius: Workflow (potentially Repo if baseCwd is a real repo)
- Side-effect class: file (working-tree mutation)
- Reversibility: compensatable (git reset) but operator must notice
- Operator visibility: log-only / patch-attempt record
- Rerun safety: unsafe (a partial apply changes the base for the next attempt)

Adjacent failure modes:
- `selectDualLaneWinner` (`dual-lane.ts:242`) likewise reads manifest state then mutates without a lock; concurrent select/apply could interleave.

Recommended mitigation:
- Remediation patterns: serialize-check-and-mutate; single atomic guard.
- Minimal repair: hold a per-`baseCwd` (or per-task) mutex spanning the dirty check through `git apply`; on `git apply` failure after a passing `--check`, abort and report rather than leaving a partial tree.
- Behavior test: concurrently invoke apply twice against the same base and assert at most one applies and the tree is never left partially patched.

Implementation assessment:
- Complexity: cross_process_coordination
- Cost: M
- Cost drivers: modules, tests, runtime_verification
- Nominal agent: codex
- Rationale: needs a coordination primitive and a concurrency test; bounded surface.

Validation:
- Concurrent apply attempts cannot interleave the check and the apply; a failed apply leaves the base unchanged.

Non-goals:
- Do not redesign the dual-lane manifest format.

---

### TMP-JINN-004: Empirical worker scores blend all telemetry eras (mixed-era report drives routing)

Severity: Medium
Confidence: Likely
Evidence basis: source-evidenced
Domain: Temporal

Evidence:
- `packages/jinn/src/orchestration/runtime.ts:635-650` — `resolveEmpiricalWorkerScores` reads telemetry (tail of up to `EMPIRICAL_ROUTING_MAX_BYTES`/`MAX_RECORDS`) and feeds `computeWorkerScores`.
- `packages/jinn/src/orchestration/telemetry.ts:151-157` — `computeWorkerScores` sums `scoreRecord` over **all** records with no time window, decay, or era boundary; `record.timestamp` is never consulted.
- `packages/jinn/src/orchestration/telemetry.ts:271-288` — `readTelemetryLog` tails by *bytes*, not by time; the cutoff is volume-based, so the retained set is an arbitrary mixed-era slice.
- Consumed at boot only: `runtime.ts:108-113` builds the scheduler once with these scores; `scheduler.ts:622-631` uses them as a tiebreak in `compareWorkers`.

Observed behavior:
- Worker routing scores are an undecayed lifetime sum across every telemetry era present in the retained byte-tail. A worker that performed poorly under an old config/model and well recently (or vice versa) is scored as if all eras were one regime. Scores are computed once at boot and never refreshed within a process.

Expected boundary (era):
- Routing should weight recent, same-era performance; old eras (pre-model-swap, pre-config-change) should decay or be windowed, not summed as equal evidence.

Failure mechanism:
- No temporal weighting in `scoreRecord`/`computeWorkerScores`; the only bound is a byte-size tail that does not correspond to any era boundary.

Break-it angle:
- Append a long run of `discarded`/`blocked` records under an old configuration; even after the worker improves, its accumulated negative score keeps it deprioritized (or a long-ago winner stays favored). Routing reflects history, not current capability.

Impact:
- Suboptimal/biased routing that misrepresents current worker quality; an operator reading the summary cannot tell which era the score reflects.

Operational impact:
- Blast radius: Service (routing decisions)
- Side-effect class: none (advisory tiebreak)
- Reversibility: reversible
- Operator visibility: silent
- Rerun safety: safe

Adjacent failure modes:
- `summarizeOrchestrationTelemetry` (`telemetry.ts:128`) similarly aggregates across eras for operator-facing summaries (mixed-era report).

Recommended mitigation:
- Remediation patterns: time-windowed aggregation; recency decay; era tagging.
- Minimal repair: window `computeWorkerScores` by `record.timestamp` (e.g., last N days) and/or apply exponential recency decay; expose the window in the summary.
- Behavior test: records older than the window do not change current scores; recent records dominate.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: S
- Cost drivers: modules, tests
- Nominal agent: gpt
- Rationale: scoring-math change with clear unit tests; no coordination surface.

Validation:
- Scores reflect a defined recency window; pre-window records are excluded or decayed.

Non-goals:
- Do not introduce a telemetry schema migration in this slice.

---

### TMP-JINN-005: Artifact `createdAt` derived from filesystem mtime, not a logical clock

Severity: Low
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Temporal

Evidence:
- `packages/jinn/src/orchestration/artifacts.ts:166-176` — `createdAt: new Date(stat.mtimeMs).toISOString()` and `artifactId` is a deterministic `${taskId}:${kind}:${lane}` that **overwrites** on rewrite (`addArtifactRecordInDb` `ON CONFLICT ... DO UPDATE`, `store-controls.ts:193`).
- `packages/jinn/src/orchestration/artifacts.ts:182-202` — `discoverDualLaneArtifacts` likewise derives `createdAt` from `stat.mtimeMs`.
- Consumed for ordering: `listArtifactRecordsFromDb` orders by `created_at` (`store-controls.ts:218`).

Observed behavior:
- An artifact's logical creation time is whatever the filesystem reports as mtime at read/write time. Rewriting the same artifact id moves `createdAt` forward; clock skew or a touched file relabels the era. Ordering by `created_at` therefore reflects file mtimes, not the logical sequence of orchestration events.

Expected boundary (clock/timezone, stale-artifact):
- Logical timestamps should come from the orchestration clock at the moment of the logical event, independent of filesystem mtime, so ordering and freshness are stable across rewrites and clock skew.

Failure mechanism:
- The created-at field conflates "when the bytes were last written to disk" with "when this artifact was logically produced".

Break-it angle:
- Re-run dual-lane for a task (same `artifactId`): the prompt/output/diff artifacts all jump to the new mtime, hiding that the diff is from a later era than its sibling records; downstream `ORDER BY created_at` reorders accordingly.

Impact:
- Mild operator confusion and unreliable artifact ordering/freshness; not a state-corruption path.

Operational impact:
- Blast radius: Local
- Side-effect class: file/DB (metadata)
- Reversibility: reversible
- Operator visibility: UI-visible (ordering)
- Rerun safety: safe

Adjacent failure modes:
- Telemetry/manifest timestamps use `new Date().toISOString()` (logical), so they and artifact timestamps can disagree about ordering for the same event.

Recommended mitigation:
- Remediation patterns: logical-clock timestamps.
- Minimal repair: stamp `createdAt` with the runtime clock at write time (pass `now()` through), not `stat.mtimeMs`.
- Behavior test: rewriting an artifact does not retroactively change a sibling's `createdAt`; ordering follows logical write order.

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules, tests
- Nominal agent: codex
- Rationale: one-field change with a small test.

Non-goals:
- Do not change artifact id semantics.

---

### TMP-JINN-006: No retention/cleanup for recovery manifests and telemetry log (over-preserved legacy data)

Severity: Low
Confidence: Likely
Evidence basis: source-evidenced
Domain: Temporal

Evidence:
- `packages/jinn/src/orchestration/store-recovery.ts:18-27` — `writeRecoveryManifest` writes a uniquely-named file per quarantine and `listRecoveryNotices` only caps the *read* (`limit = 10`, `:29`); nothing deletes old manifests.
- `packages/jinn/src/orchestration/store-schema.ts:165-177` — each corrupt-open quarantines a copy (`.corrupt.<stamp>`) and writes a manifest; these accumulate with no pruning.
- `packages/jinn/src/orchestration/telemetry.ts:83-99` — `appendOrchestrationTelemetry` only appends; the JSONL grows unbounded (reads tail by bytes, but the file is never truncated/rotated).

Observed behavior:
- Quarantined DB copies, recovery manifests, and the telemetry JSONL grow without bound. In-memory scheduler state has retention (`scheduler-retention.ts`), but these on-disk artifacts do not.

Expected boundary (retention/cleanup):
- Legacy recovery artifacts and the telemetry log should have a retention policy (age/count cap or rotation) so disk does not grow unbounded and stale recovery manifests do not mislead operators about current state.

Failure mechanism:
- Cleanup was implemented for scheduler in-memory state but not for these disk artifacts; recovery quarantine is inherently append-only.

Break-it angle:
- Repeated corrupt-opens (or a flapping disk) generate many `.corrupt.*` DBs + manifests; an operator inspecting `listRecoveryNotices` sees only the newest 10 while older ones silently consume disk; telemetry JSONL on a busy gateway grows until the byte-tail read dominates routing.

Impact:
- Disk exhaustion over time and stale recovery artifacts; an aged manifest can be re-`requeueRecoveredContinuation`'d long after it is relevant (delayed-job-on-old-assumption flavor, mitigated by the explicit pause/resume guard in `recovery-requeue.ts:67-74`).

Operational impact:
- Blast radius: Service
- Side-effect class: file
- Reversibility: reversible (manual cleanup)
- Operator visibility: silent
- Rerun safety: safe

Adjacent failure modes:
- Dual-lane manifests/archives under `TMP_DIR/orchestration-dual-lane` are also never auto-cleaned.

Recommended mitigation:
- Remediation patterns: age/count retention; log rotation.
- Minimal repair: prune `.corrupt.*`/manifests beyond an age or count cap on open; rotate/cap the telemetry JSONL.
- Behavior test: after N recoveries, only the retained window of manifests/quarantine files remains.

Implementation assessment:
- Complexity: persistence_recovery
- Cost: S
- Cost drivers: modules, tests, operator_training
- Nominal agent: codex
- Rationale: bounded filesystem retention logic plus tests.

Non-goals:
- Do not delete a manifest that still references a quarantined DB an operator has not reviewed.

---

## Non-findings (seams checked and held)

- **Lease validate-at-use enforces expiry** — `scheduler.ts:240` rejects `leaseExpiresAt <= now` with `lease_expired`; `run-mode.ts:244-245` calls `validateLeaseForWorker` before each lease turn and throws on failure. The validate path (unlike heartbeat, TMP-JINN-002) is clock-correct. Held.
- **Continuation claim is single-winner** — `claimQueuedLiveContinuationInDb` (`store-continuations.ts:97-131`) runs inside `db.transaction` and updates only `WHERE ... state = 'queued'`, returning `undefined` if not queued; `resumeQueuedAllocation` (`runtime.ts:474-483`) treats a missing claim as an invariant violation and releases leases. Out-of-order/duplicate dispatch cannot double-claim. Held (the *overwrite-while-active* problem is the separate, already-filed FSR-JINN-002).
- **Hold expiry is enforced before read** — `activeHeldWorkerIds` (`runtime.ts:563-566`) and `listHolds` (`runtime.ts:296-299`) call `expireHolds` first; `expireHoldsInDb` (`store-controls.ts:172-178`) marks `state='expired' WHERE expires_at <= now`; recovery import skips already-expired holds (`recovery-requeue.ts:112-113`). No expired hold is treated as active. Held.
- **Migration sequencing is idempotent and additive** — `openDatabase` (`store-schema.ts:195-213`) runs `CREATE TABLE IF NOT EXISTS` then idempotent `ensure*Column` ALTERs guarded by `table_info` checks, then stamps `schema_version=4`. Re-running on an already-migrated DB is a no-op; columns are added with defaults and back-filled (`:221-226`, `:263-272`). No destructive or order-dependent step found. Held.
- **Snapshot delta ordering** — `applySnapshotDeltaToDb` (`store-snapshot.ts:155-198`) diffs before/after in one transaction (deletes then upserts) and stamps `nextSeq`; `persistOrRehydrate` rehydrates from disk on failure (`persistent-scheduler.ts:105-112`). Single in-process writer; no stale snapshot overwrites fresher state. Held.
- **Dual-lane draft-vs-final gate** — `selectDualLaneWinner` requires `state === "selection_required"` (`dual-lane.ts:254`) and `applyDualLaneWinner` requires `selection_required`/`selected` and refuses a different already-selected lane (`artifacts.ts:70-83`). A `selection_required` manifest is not treated as final without an explicit select/apply. Held.
- **Queue retry ordering** — `retryQueued` sorts by `compareQueueItems` (priority → `blockedSince` → taskId, `scheduler.ts:640-646`); existing queue entries preserve `blockedSince` and bump `blockedAttempts`/`lastBlockedAt` (`scheduler.ts:490-503`). Replaying the queue preserves priority/age order. Held.

## Break-it review (temporal checklist applied)

- **Consume a stale cache/artifact**: stale implementation worktree → TMP-JINN-001 (no freshness guard against the reaper). Stale telemetry era → TMP-JINN-004.
- **Present an expired token/lease**: heartbeat accepts an expired-but-unswept lease → TMP-JINN-002. Validate-at-use correctly rejects (non-finding).
- **Mutate object between check and use**: dirty-base→apply → TMP-JINN-003; reaper deletes worktree between implementer-release and reviewer-read → TMP-JINN-001.
- **Replay events out of order**: continuation claim transaction and queue ordering hold (non-findings).
- **Run a migration twice / out of sequence**: idempotent additive migrations (non-finding).
- **Enqueue job, mutate state, let job run on old assumption**: `recoverStaleDispatchingContinuations` (`runtime.ts:510-523`) re-checks `updatedAt` against a cutoff and fails stale dispatching continuations on boot; recovery requeue forces a pause (`recovery-requeue.ts:67-74`). These re-validate at run — held, except the unbounded retention angle (TMP-JINN-006).
- **Feed a draft standard as final**: dual-lane state gate holds (non-finding).

## Validation limits (what was NOT done / NOT reviewed)

- **No tests or typecheck were executed.** All findings are static (`source-evidenced`); none is `test-reproduced` or `runtime-observed`. TMP-JINN-001/003 are timing races — confidence is capped at **Likely** (TMP-001) / Confirmed-static (TMP-003 mechanism is deterministic in source but the race outcome is not reproduced). Per calibration rules, the race *outcome* is not claimed Confirmed without reproduction.
- **Not reviewed**: `adapter/*.ts` (local-echo/manual/real/stub adapters), `gateway/orchestration-runtime-{factory,manager}.ts` (grepped only, not deep-read — startup ordering of reaper vs first dispatch not fully traced), `cross-family.ts`, `config.ts`, `schemas.ts`, `routing-headroom` usage-status clock handling internals, the web package, and the SQLite WAL/lock file behavior (`a sqlite lock file` per recent commit) beyond what FSR-JINN-001 covered.
- **Concurrency assumptions**: the orchestration scheduler is single-writer in-process; cross-process concurrency (multiple gateways on one DB) was not exercised and would change the severity of TMP-JINN-003 and the continuation-claim analysis. Marked accordingly.
- **Reaper interaction with the run loop (TMP-JINN-001)** was inferred from `setInterval(... 5000)`, the per-turn lease release, and the `activeTaskIds` construction; it was not reproduced with a forced tick. Recommend a `test-reproduced` follow-up before patching.

## Recommended next lens / surface

Run `audit-concurrency` against `dual-lane.ts` apply/select + `orchestration-routes.ts` (TMP-JINN-003 and the unlocked manifest mutations are concurrency-shaped), and a `test-reproduced` drill of the reaper handoff window (TMP-JINN-001) before any patch lands.
