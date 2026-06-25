# Matrix Orchestration Residuals

Date: 2026-06-24
Actor: Codex
Authority: repo-local implementation under AGENTS.md

## Intent

Implemented the post-M12 residual plan without adding held-team allocations,
runtime-editable employees, per-task pause, raw diff/prompt/model-output
viewing, or automatic dual-lane patch integration.

## Changes

- Added bounded allocation lifecycle and pruning: allocations keep `allocated`
  while leases run, become `completed` after all leases release, and become
  `expired` when terminal with at least one expired lease. Terminal allocations
  default to 24-hour retention and a 1,000-record cap.
- Added `Allocation.updatedAt` and SQLite `allocations.updated_at` migration.
- Added bounded internal scheduler telemetry pruning with 24-hour and
  2,000-event defaults; append-only JSONL run telemetry is unchanged.
- Added corrupt orchestration DB recovery manifests under the orchestration
  recovery directory, recovery manifest paths in `store_corrupt_recovered`
  telemetry, API `recoveryNotices`, and read-only `jinn recovery notices`.
- Added `architecture` and `local_heavy` coordinator/live run modes with
  examples. `architecture` requires architect, implementer, independent
  reviewer, adversarial reviewer, and QA roles. `local_heavy` rejects editing
  roles and restricts workers to local, near-zero, or low-cost candidates.
- Added opt-in `scripts/orchestration-smoke.mjs`.
- Added M13 design gate note for runtime-editable employees, TTL-bounded holds,
  D9 hold semantics, and R18 auth.

## Validation

- `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts src/orchestration/__tests__/coordinator.test.ts src/orchestration/__tests__/run-mode.test.ts src/orchestration/__tests__/runtime.test.ts src/gateway/__tests__/orchestration-routes.test.ts src/cli/__tests__/orchestration-run.test.ts` passed: 8 files, 82 tests.
- `node scripts/orchestration-smoke.mjs` passed the default skip path.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm typecheck` passed.
- `git diff --check` passed.
- `pnpm test` passed: `jinn-cli` 173 files, 1368 passed and 1 skipped; `@jinn/web` 61 files, 637 passed.

## Residual Risks

- Corrupt DB recovery remains observe-only; there is no automatic restore or
  requeue because quarantined state is untrusted.
- Held-team allocations and runtime employee mutation remain deferred pending
  accepted adversarial review and an explicit auth model.
- `packages/jinn/src/orchestration/scheduler.ts` is 641 lines after this change,
  above the 600-line soft review threshold but below the 800-line hard limit.
