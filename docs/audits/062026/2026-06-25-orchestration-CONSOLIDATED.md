# Orchestration Layer — Consolidated Cross-Lens Audit

Date: 2026-06-25
Authority: **audit-only / report-only** — no source or test files were modified by any lens.
Scope: `packages/jinn/src/orchestration/**` + gateway orchestration surfaces (`gateway/api/orchestration-routes.ts`, `gateway/orchestration-runtime-{factory,manager}.ts`).
Validation across lenses (read-only): `tsc --noEmit` clean (exit 0); `vitest run src/orchestration` = 13 files / 125 tests pass; tree green.

## Lenses run (this session)

| Lens | Findings | Report |
|---|---|---|
| Pipeline-graph | 7 (1H, 2M, 4 L/I) | `2026-06-25-orchestration-pipeline-graph.md` |
| Temporal | 6 (1H, 3M, 2L) | `2026-06-25-orchestration-temporal.md` |
| Reliability | 7 (2H, 3M, 2L) | `2026-06-25-orchestration-reliability.md` |
| Internal-API contract | 4 (2M, 1L, 1I) | `2026-06-25-orchestration-internalapi-contract.md` |

Prior-session reports cross-referenced (not re-derived): data-integrity (DAT-JINN-001..003), recovery-idempotency (FSR-JINN-001..004), cascade/IO, deadcode.

Total new findings: **24** (4 High, 8 Medium, 8 Low, 2 Info, 2 Plausible-if-reachable).

---

## Cross-lens convergence (the signal that matters)

Independent lenses landed on the same hot zones. Convergence = high confidence the area is genuinely fragile.

### Cluster A — Lease lifecycle state machine (3 lenses converge) ★ highest signal
The `MatrixScheduler` lease model is the single most-flagged surface.
- **TMP-JINN-002 (Medium, Confirmed)** — `heartbeatLease`→`getRunningLease` checks only `state==="running"`, not the clock, so an expired-but-unreaped lease is resurrected with fresh expiry (`scheduler.ts:172-187,520`). Contrast: `validateLeaseForWorker` rejects it correctly — the guard exists but isn't applied on the heartbeat path.
- **REL-JINN-002 (High if reachable, Plausible)** — `expireLeases` frees the worker slot but never interrupts the still-running engine (`scheduler.ts:207`); the reaper can allocate a second turn onto the same worker → double execution.
- **STT-ORCH-002 (Medium, Confirmed)** — lease methods throw untyped `Error`s while neighbors return typed results; lease-stop route calls `releaseLease` unguarded outside its try-block, TOCTOU vs the reaper (`scheduler.ts:520-523`, `orchestration-routes.ts:551`).
- **F2 (Medium)** — continuation dispatched with no `resumeQueuedRunHandler` sticks in `dispatching` until the 10-min stale cutoff (`runtime.ts:467`).
> Read together: lease expiry, heartbeat, release, and re-allocation are not coordinated under one clock-checked, typed, lock-guarded contract. This is the first thing to harden.

### Cluster B — Worktree / dual-lane apply races (2 lenses)
- **TMP-JINN-001 (High, Likely)** — 5s worktree reaper keys "active" off running leases, but in review modes the implementer lease is released per-turn *before* the reviewer reads its worktree; a reaper tick in that gap deletes the implementation worktree → **false-clean review** or run failure (`run-mode.ts:157-202,300`, `runtime.ts:414-422`).
- **F3 (Medium)** + **TMP-JINN-003 (Medium, Confirmed)** — `dual-lane/apply` (git-applies to the base repo — the most destructive route) is gated only by `orchestration.enabled`, with **no `authorizeManagerScope`** (unlike holds/recovery), and no lock spanning its `isGitWorkspaceDirty`→`git apply` window (`artifacts.ts:89-112`). Most destructive route, least protected, and racy.

### Cluster C — False success / honesty (2 lenses)
- **REL-JINN-001 (High, Confirmed)** — empty/clean-exit engine output counts as a successful lease turn; completion writes `status:"idle"` whenever `error` is falsy, **no non-empty-output postcondition** (`run-mode.ts:520`, `run-web-session.ts:730`); dual-lane then shows empty lanes as selectable candidates. An existing test locks the behavior in (`run-mode.test.ts:44`).
- **REL-JINN-003 (Medium, Confirmed)** — `engineFailureReason` substring-matches "auth" before "timeout", so a timeout hitting an auth endpoint is mislabeled `auth_failure` (`real-adapter.ts:327`).
- **REL-JINN-005 (Low)** — failed run returned HTTP 200 (`orchestration-routes.ts:344`). **REL-JINN-007 (Low)** — `/status degraded` = `enabled && !runtime`; a runtime bound from a reset/quarantined DB still reports `degraded:false`.
- **ARC-ORCH-003 (Low)** — 4 different error-envelope shapes across 41 sites; no stable HTTP error contract.

### Cluster D — Adapter contract bypassed in production (architectural root cause)
- **ARC-ORCH-001 (Medium, Confirmed)** — the `ProviderAdapter` contract is fully defined and tested but has **no production consumer**; the live path (`run-mode.ts`→`resolveWorkerEngine`→`dispatchWebSessionRun`) bypasses it. The adapter's guards — lease re-validation, Claude headless-bypass block (`real-adapter.ts:255-265`) — **never run in prod**.
> This partly explains Cluster A: a re-validation guard exists in the adapter layer but the live path doesn't go through it. Two parallel execution surfaces.

### Cluster E — Unbounded growth / retention
- **TMP-JINN-004 (Medium)** — empirical worker scores sum telemetry across all eras, no window/decay → stale eras steer routing (`telemetry.ts:151-157`). **TMP-JINN-006 (Low)** — no retention for recovery manifests, `.corrupt.*` DB copies, or telemetry JSONL. **REL-JINN-006 (Medium)** — continuation requeue increments `retry_count` but never enforces a cap/backoff.

---

## The auth question (F1 vs ARC-ORCH-004) — RESOLVED

The two lenses disagreed; I read the code to settle it.

`shouldRequireGatewayAuth` (`auth.ts:163-171`) → with neither `authRequired`/`authDisabled` set, returns `isNetworkHost(gateway.host)`. Default config is `host: 127.0.0.1`, which is loopback, so this returns **false**. Therefore `authRequiredNow()` is false and the gate at `server.ts:1035` is **skipped** on a default gateway.

**Verdict:** Pipeline-graph **F1 is mechanically correct**; ARC-ORCH-004 understated it. The check removed in commit `4c0d970` was *unconditional* (required the gateway token on every `/api/` route regardless of host). Removing it means on a default loopback gateway, `/api/orchestration/run` and `dual-lane/apply` are reachable **token-free**.

**Important nuance (why this isn't a simple "revert"):**
- The removal was necessary — that unconditional gate also blocked the public auth endpoints (`/api/auth/state`, `/api/auth/bootstrap`), which was the original sign-in failure. Restoring it verbatim re-breaks sign-in.
- It is **loopback-only** exposure: the threat is a **local** attacker, another local user on a shared host, or **CSRF/SSRF from a browser** POSTing to `localhost:7777` — not the network.
- It aligns with upstream's intended model (loopback trusted; token via bootstrap/cookie).

**Recommended fix (neither revert nor ignore):** gate the orchestration **mutation** routes (`run`, `dual-lane/apply`, `dual-lane/select`) with `authorizeManagerScope` / a session-or-token check **even on loopback**, and add an `Origin`/`Host` check to defeat browser CSRF. This closes F1 + F3 together without re-breaking the public auth flow. (Severity of F1 as it stands: Medium in practice — High only if the gateway is ever bound to a network host with auth left default.)

---

## Prioritized remediation order

| # | Theme | Findings | Why first | Suggested agent |
|---|---|---|---|---|
| 1 | Empty-output-as-success | REL-JINN-001 | Confirmed, test-locked, silently corrupts review/dual-lane selection | codex |
| 2 | Lease lifecycle contract | TMP-002, REL-002, STT-002, F2 | 3-lens convergence; double-execution + resurrection risk | multi-agent |
| 3 | Worktree reaper handoff race | TMP-JINN-001 | High; false-clean reviews | codex (after a reproduction drill) |
| 4 | dual-lane/apply auth + lock | F3, TMP-003 | Most destructive route, least protected | codex |
| 5 | Orchestration-route auth | F1 (+ CSRF) | Closes the regression I introduced; pair with #4 | human-owner decision on threat model, then codex |
| 6 | Failure honesty | REL-003/005/007, ARC-003 | Operator-deception; cheap fixes | codex |
| 7 | Adapter contract on live path | ARC-ORCH-001 | Architectural; would prevent recurrence of Cluster A | multi-agent |
| 8 | Retention / bounds | TMP-004/006, REL-006 | Slow-burn growth; not urgent | codex |

## Validation limits (honest)
- All findings are **static / source-evidenced**. No app was run; no kill/timing/corruption drills were authorized. The two races (TMP-001, REL-002) and any concurrency claim are capped at Likely/Plausible accordingly.
- Adapters and the runtime factory/manager were grepped, not fully line-read, by some lenses.
- A dedicated **`audit-concurrency`** pass on the lease state machine + `dual-lane/apply` is the recommended next lens, with `test-reproduced` drills before any Cluster A/B patch.

## My own correction this session
- I had killed the original pipeline-graph agent for exceeding audit-only scope and reverted an unrelated rogue agent's broken `employee-creator` feature (restored green typecheck). This consolidated run was re-launched strictly report-only. See `docs/audits/2026-06-25-orchestration-audit-session-report.md`.
