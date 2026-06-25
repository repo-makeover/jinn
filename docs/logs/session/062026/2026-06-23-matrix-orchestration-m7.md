# Matrix Orchestration M7 Session Log

Date: 2026-06-23
Actor: Codex
Dory session: `91be3df1-df85-4b9f-b8c9-4235bca5ac16`

## Objective

Implement M7 cross-family review policy and explainability for live
`single_worker_with_review` orchestration runs.

## Startup

- Repo `AGENTS.md`, `README.md`, `docs/INDEX.md`, roadmap, orchestration docs,
  Giles advisory files, and Dory state were inspected before source edits.
- `PROJECT_HANDOFF_MASTER.md` was absent in this checkout.
- Git had no tracked changes before edits; ignored local artifacts were present
  under `.dory/`, `.giles/`, `docs/logs/`, `governance/logs/`, and `state/`.
- Dory was healthy with no active session before this slice. A fresh session was
  started for M7. Dory reported `STALE_CLOSED` after start with recommended
  action `proceed_without_recovery`.
- Giles advisory state reported blocked governance drift and human-required
  governance decisions outside M7. These were recorded as background drift and
  not remediated in this scoped orchestration slice.

## Giles Job Plan

- Scope: M7 live cross-family reviewer policy and explainability only.
- Files to inspect: orchestration scheduler/runtime/run-mode/coordinator/types,
  shared config schema/types, orchestration CLI/API routes, M7 docs, and focused
  orchestration tests.
- Files allowed to change: `packages/jinn/src/orchestration/**`,
  `packages/jinn/src/shared/{types,config-schema}.ts`,
  `packages/jinn/src/shared/__tests__/config.test.ts`,
  `packages/jinn/src/cli/orchestration.ts`,
  `packages/jinn/src/cli/__tests__/orchestration-run.test.ts`,
  `packages/jinn/src/gateway/__tests__/orchestration-routes.test.ts`,
  `docs/orchestration/README.md`, `docs/feature_inventory.md`,
  `docs/superpowers/plans/2026-06-23-matrix-orchestration.md`, and this log.
- Files forbidden to touch: `control/**`, `governance/**`, dashboard UI,
  board-worker dispatch, dual-lane/integration code, real provider adapter
  behavior, live `~/.jinn` runtime state, and generated build outputs.
- Tests required: focused orchestration scheduler/run-mode/API/CLI tests, shared
  config validation test, `pnpm --filter jinn-cli typecheck`, `pnpm typecheck`,
  `git diff --check`, and source line-count check. Attempt `pnpm test` if time
  permits.
- Budget/stop condition: keep source edits under M7 and source files below the
  roadmap line-count gates; stop if fallback semantics require M8 dual-lane or
  board-worker routing changes.
- Escalation criteria: config-key naming conflict, need to alter scheduler
  persistence schema, need to touch real provider billing path, or test failure
  outside M7 that cannot be isolated.
- Expected final report fields: files changed, tests run, skipped validation,
  line-count status, governance/Dory/Giles state, residual risks, and deferred
  work.

## Changes

- Added `packages/jinn/src/orchestration/cross-family.ts` for fail-closed
  cross-family reviewer policy, role-metadata reviewer/implementer detection,
  and structured explanation records.
- Extended `MatrixScheduler` and `PersistentMatrixScheduler` so
  `opposite_of_implementer` reviewer roles first select qualified
  opposite-family reviewers, then use same-family reviewers only when
  `sameFamilyReviewerFallback` is explicitly enabled and no opposite-family
  candidate is available.
- Added `reviewPolicy.explanations` to allocation/run results and reviewer
  session metadata.
- Added `orchestration.sameFamilyReviewerFallback?: boolean` to config
  validation/types.
- Updated CLI text formatting so non-JSON run/plan output prints reviewer policy
  decisions.
- Updated orchestration docs, feature inventory, and roadmap M7 status.

## Validation

- `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/run-mode.test.ts src/gateway/__tests__/orchestration-routes.test.ts src/cli/__tests__/orchestration-run.test.ts src/shared/__tests__/config.test.ts`
  - passed: 5 files, 45 tests.
- The roadmap glob command
  `pnpm --filter jinn-cli test -- src/orchestration/**/*.test.ts src/cli/__tests__/*orchestration*.test.ts src/gateway/__tests__/*orchestration*.test.ts`
  failed because Vitest did not resolve the quoted glob patterns under the
  package runner (`No test files found`).
- Equivalent explicit orchestration test file list passed:
  - 13 files, 78 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm typecheck` passed.
- `git diff --check` passed.
- `pnpm test` passed:
  - `@jinn/web`: 59 files, 627 tests passed.
  - `jinn-cli`: 162 files, 1266 tests passed, 1 skipped.
- `tools/line_count_check.sh` was absent in this checkout. Fallback `wc -l`
  source check found no touched source file over 800 lines. Touched files over
  the repo's 600-line soft threshold: `shared/config-schema.ts` (793 lines) and
  `shared/types.ts` (775 lines).

## Residual Risks

- M7 does not add dashboard controls, board-worker routing, dual-lane selection,
  org-worker mapping, persistent telemetry aggregation, or new provider behavior.
- Same-family fallback is configured at daemon-runtime construction. Existing
  running daemons need restart/reload behavior from the existing config lifecycle
  before the new setting can affect a live runtime.
- Giles advisory governance drift remains outside this slice.
