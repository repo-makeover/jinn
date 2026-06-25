# WFG-JINN-010 Cron Overlap Feedback Repair

Date: 2026-06-23T10:21:00-04:00
Actor: Codex
Task: Repair WFG-JINN-010, where connector `/cron run` reported success even when a manual cron trigger was skipped due to overlap.

## Scope

- Selected finding: WFG-JINN-010 only.
- Source touched:
  - `packages/jinn/src/cron/scheduler.ts`
  - `packages/jinn/src/sessions/manager.ts`
- Tests touched:
  - `packages/jinn/src/cron/__tests__/scheduler.test.ts`
  - `packages/jinn/src/sessions/__tests__/cron-command.test.ts`
- Out of scope:
  - Cron runner behavior changes.
  - HTTP `/api/cron/:id/trigger` contract changes.
  - Broader connector UX wording cleanup.

## Startup Evidence

- Read repo instructions: `AGENTS.md`.
- Task-relevant source reviewed:
  - `packages/jinn/src/cron/scheduler.ts`
  - `packages/jinn/src/gateway/api.ts`
  - `packages/jinn/src/sessions/manager.ts`
- Requested startup files not present in this checkout:
  - `PROJECT_HANDOFF_MASTER.md`
  - `docs/INDEX.md`
  - `PLAN.md`
  - startup `control/*.yaml`
  - startup `governance/*.yaml`
- `.giles/` is not present.
- Dory was not used for this repair.

## Patch Summary

- Added a structured `CronTriggerResult` return type so `triggerCronJob()` preserves whether the run actually started.
- Kept the scheduler overlap behavior unchanged while exposing the existing `skipped_overlap` state to callers.
- Updated connector `/cron run` replies to say `already running; skipped overlap` when the trigger was rejected for overlap, while preserving the existing success and not-found replies.

## Regression Coverage

- Extended `scheduler.test.ts` to verify `triggerCronJob()` no longer collapses overlap skips to mere job existence.
- Added `cron-command.test.ts` to assert `/cron run` replies with an overlap/skipped message instead of `Triggered cron job ...` when the scheduler reports `started: false`.

## Validation

Passed:

- `pnpm typecheck` (from `packages/jinn`)
- `pnpm test -- src/cron/__tests__/scheduler.test.ts src/sessions/__tests__/cron-command.test.ts` (from `packages/jinn`)

Not run:

- Root `pnpm test`, `pnpm lint`, and `pnpm build` were not run because the repair stayed within cron/session command handling and the targeted validation passed.

## File Size / Modularity

- `packages/jinn/src/cron/scheduler.ts`: 145 lines.
- `packages/jinn/src/sessions/manager.ts`: 880 lines.
- `packages/jinn/src/cron/__tests__/scheduler.test.ts`: 107 lines.
- `packages/jinn/src/sessions/__tests__/cron-command.test.ts`: 75 lines.
- One touched hand-written file is over 600 lines:
  - `packages/jinn/src/sessions/manager.ts`
- No touched hand-written file exceeds 1000 lines.
- Modularity stayed stable; the fix remained split between the scheduler seam and one connector-facing command seam.

## Residual Risks

- The connector reply now reflects overlap skips, but it still waits for successful manual runs to finish before replying because `triggerCronJob()` preserves the current await-on-success behavior.
- No additional connector surfaces beyond `/cron run` were changed; any future reuse of `triggerCronJob()` should keep honoring the structured result instead of collapsing it again.
