# STT-JINN-003 Durable Queue Pause Repair

Date: 2026-06-23T09:07:05-04:00
Actor: Codex
Task: Repair STT-JINN-003, where queue pause state was process-local and pending work resumed after gateway restart.

## Scope

- Selected finding: STT-JINN-003 only.
- Source touched:
  - `packages/jinn/src/sessions/queue.ts`
  - `packages/jinn/src/sessions/registry.ts`
  - `packages/jinn/src/gateway/api/session-dispatch.ts`
- Tests touched:
  - `packages/jinn/src/sessions/__tests__/queue-pause.test.ts`
  - `packages/jinn/src/gateway/__tests__/queue-pause-replay.test.ts`
- Out of scope:
  - Queue controller/UI refactors.
  - Broader restart/replay redesign beyond paused-key durability.

## Startup Evidence

- Repo instruction file in scope: `AGENTS.md`.
- Finding evidence checked in `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`.
- Dory still reports an unrelated active recoverable Kiro session; this repair did not mutate it.
- `.giles/` not present.

## Patch Summary

- Added durable queue pause storage in SQLite via a new `queue_pauses` table.
- Added registry helpers:
  - `pauseQueueKey(sessionKey)`
  - `resumeQueueKey(sessionKey)`
  - `listPausedQueueKeys()`
- `SessionQueue` now hydrates its paused set from durable state at construction and persists pause/resume transitions through the registry helpers.
- Session deletion now clears matching durable queue pause rows so deleted session keys do not leave stale pause state behind.
- Startup replay now skips pending web queue items whose `sessionKey` is durably paused, leaving them pending until explicit resume.

## Regression Coverage

- `queue-pause.test.ts` now verifies pause/resume persist through the registry helpers.
- `queue-pause-replay.test.ts` simulates:
  - paused queue state persisted by an original `SessionQueue`;
  - a fresh `SessionQueue` after restart;
  - startup replay leaving the pending item untouched while paused;
  - explicit resume followed by replay completing the queued item.

## Validation

Passed:

- `pnpm --filter jinn-cli test -- src/sessions/__tests__/queue-pause.test.ts src/gateway/__tests__/queue-pause-replay.test.ts src/sessions/__tests__/registry-delete-queue-items.test.ts`
- `pnpm --filter jinn-cli typecheck`
- `pnpm typecheck`
- `pnpm lint`
  - Completed with Turbo warning: no lint tasks were executed.
- `git diff --check`

Not run:

- Full `pnpm test` was not rerun for this narrow durability fix. Prior repair work already showed unrelated full-suite instability, so validation stayed focused on the affected queue/replay seams plus typecheck.

## File Size / Modularity

- `packages/jinn/src/sessions/queue.ts`: 137 lines.
- `packages/jinn/src/gateway/api/session-dispatch.ts`: 196 lines.
- `packages/jinn/src/sessions/__tests__/queue-pause.test.ts`: 85 lines.
- `packages/jinn/src/gateway/__tests__/queue-pause-replay.test.ts`: 78 lines.
- Touched file already over 600 lines:
  - `packages/jinn/src/sessions/registry.ts`: 1467 lines.
- Touched file already over 1000 lines:
  - `packages/jinn/src/sessions/registry.ts`
- Modularity stayed mostly unchanged. The repair used the existing queue/registry boundary rather than widening into a larger queue-state abstraction.

## Residual Risks

- Durable pause is now keyed by `sessionKey`, matching queue scheduling/replay behavior, but the broader queue state model is still split across in-memory scheduling and SQLite row status.
- `registry.ts` remains oversized and continues to own many unrelated persistence concerns.
