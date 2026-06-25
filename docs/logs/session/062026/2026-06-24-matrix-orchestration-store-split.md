# 2026-06-24 Matrix Orchestration Store Split

## Scope

Implemented the immediate post-M12 structural blocker: split
`packages/jinn/src/orchestration/store.ts`, which had reached the 800-line hard
limit. This was a behavior-preserving modularization only; allocation pruning,
scheduler telemetry pruning, corrupt-DB recovery redesign, and new coordinator
modes remain deferred.

## Governance and Startup

- Read repo `AGENTS.md`, `README.md`, `docs/INDEX.md`,
  `docs/orchestration/README.md`, the matrix orchestration plan, Dory state,
  Giles state, governance/control file inventory, and recent M11/M12 session
  logs before source edits.
- Created Dory offline checkpoint
  `.dory/checkpoints/20260624T1753376.md` before editing.
- `control/*.yaml` and several governance YAMLs named by the repo contract were
  absent in this checkout; Giles reports compliance `blocked_but_documented`.
  No governance files were edited for this source-only slice.

## Changes

- Kept `OrchestrationStore` as the stable public facade in
  `packages/jinn/src/orchestration/store.ts`.
- Added `store-schema.ts` for schema creation, WAL setup, migration, and
  corrupt DB quarantine.
- Added `store-snapshot.ts` for scheduler snapshot load, replace, and
  incremental delta persistence.
- Added `store-continuations.ts` for live run continuations and queue pause
  state.
- Added `store-utils.ts` for shared metadata and JSON parsing helpers.
- Updated `docs/orchestration/README.md` durable-state wording to reflect the
  split.

## Validation Evidence

- Passed: `pnpm --filter jinn-cli test -- src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts`
  - 2 files, 9 tests.
- Passed: `pnpm --filter jinn-cli test -- src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts src/orchestration/__tests__/runtime.test.ts src/gateway/__tests__/orchestration-routes.test.ts`
  - 4 files, 36 tests.
- Passed: `pnpm --filter jinn-cli typecheck`.
- Passed: `pnpm typecheck`.
- Passed: `git diff --check`.

## Line Counts

- `packages/jinn/src/orchestration/store.ts`: 92 lines.
- `packages/jinn/src/orchestration/store-schema.ts`: 176 lines.
- `packages/jinn/src/orchestration/store-snapshot.ts`: 457 lines.
- `packages/jinn/src/orchestration/store-continuations.ts`: 205 lines.
- `packages/jinn/src/orchestration/store-utils.ts`: 16 lines.

No touched hand-written source file is over 600 lines.

## Residual Risks

- Unbounded released/expired allocations remain open.
- Scheduler internal telemetry snapshot growth remains open.
- Corrupt DB recovery still quarantines and starts empty; no requeue/operator
  recovery path was added.
- `scripts/orchestration-smoke.mjs`, `architecture` mode, `local_heavy` mode,
  and M13 D9/R18 design review remain deferred.
