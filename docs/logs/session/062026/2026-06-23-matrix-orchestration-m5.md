# Matrix Orchestration M5 Session Log

Date: 2026-06-23
Actor: Codex
Dory session: `c2156efb-33e7-41b8-b64a-22f17c5caa65`

## Objective

Recover after the prior crash and implement M5: first opt-in live
`single_worker` and `single_worker_with_review` run modes over the daemon-owned
matrix scheduler.

## Startup And Governance

- Read `AGENTS.md`, `README.md`, `PROJECT_HANDOFF_MASTER.md`, `docs/INDEX.md`,
  the matrix roadmap M5 section, and the loaded `plan-prototype-build` skill.
- Ran `dory status`; Dory reported no active session and recoverable clean state.
- Started Dory session `c2156efb-33e7-41b8-b64a-22f17c5caa65`.
- Ran `giles remediate-plan --format pretty .`; Giles generated `.giles/*`
  advisory artifacts and reported blocked governance convergence. `.giles/` is
  already git-ignored and remains local state.
- No `.giles` artifacts, live `~/.jinn` runtime state, or port 7777 were touched
  for validation.

## Changes

- Added `packages/jinn/src/orchestration/runtime.ts` as the daemon owner for one
  `PersistentMatrixScheduler`, including expiry/retry timer and shutdown close.
- Added `packages/jinn/src/orchestration/run-mode.ts` for live
  `single_worker` and `single_worker_with_review` execution through existing Jinn
  sessions.
- Added `packages/jinn/src/orchestration/lease-meta.ts` to store lease binding
  metadata in session `transportMeta`.
- Added `orchestration.enabled`, `configDir`, `dbPath`, `leaseDurationMs`, and
  `reaperIntervalMs` config schema/type support. The default remains disabled.
- Changed scheduler heartbeat semantics to renew `leaseExpiresAt` with a sliding
  TTL based on the original lease duration.
- Changed persistent scheduler writes from full snapshot replacement on every
  mutation to incremental store upserts/deletes.
- Changed corrupt DB recovery to surface telemetry/audit detail instead of
  silently looking like ordinary empty state.
- Wired daemon boot to construct one orchestration runtime when enabled and close
  it during gateway shutdown.
- Changed observe routes to read the shared runtime when present, falling back to
  the previous no-daemon/test read path only when no runtime exists.
- Added `POST /api/orchestration/run` for daemon-local run dispatch.
- Added `jinn run --mode single_worker|single_worker_with_review --task <file>
  [--json]`, implemented as a gateway client using `gateway.json` token auth.
- Added focused tests for run-mode E2E mock execution, CLI run posting, route
  shared-runtime reads, heartbeat renewal, and persistence regressions.
- Updated `docs/orchestration/README.md`, `docs/orchestration/examples/`,
  `docs/feature_inventory.md`, `docs/INDEX.md`, and the roadmap M5 status.

## Validation

- `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/run-mode.test.ts src/cli/__tests__/orchestration-scheduler.test.ts src/cli/__tests__/orchestration-run.test.ts src/gateway/__tests__/orchestration-routes.test.ts`
  passed: 7 files, 31 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- Source line-count gate passed for touched source files; all checked files are
  below 800 lines.

## Residual Risks

- M5 is opt-in live routing only. It does not add worktrees, dashboard controls,
  board-worker routing, org-worker mapping, dual-lane competition, persistent
  telemetry JSONL, or broad real-provider smoke coverage.
- `single_worker_with_review` runs sequential sessions and prompts reviewers as
  review-only, but file-system read-only enforcement is deferred to M6 worktrees.
- Corrupt recovery can surface state loss but cannot reconstruct unknowable
  in-flight leases from a corrupt DB. Operator follow-up remains required.
