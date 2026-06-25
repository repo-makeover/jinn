# Matrix Orchestration M1 Durable State

- Date: 2026-06-23
- Actor: Codex
- Scope: implement M1 durable scheduler state for the inert provider-neutral matrix orchestration layer.

## Startup Evidence

- Loaded `/home/ericl/Work/vscode/agent-skills/30_plan/plan-prototype-build/SKILL.md`.
- Read `AGENTS.md`, `README.md`, `docs/INDEX.md`, and the matrix orchestration roadmap.
- `control/` and `governance/` contained no YAML policy files in this checkout.
- `.giles/` was absent.
- Dory reported no active session; started session `5e8033cc-850e-47ac-b0ca-cde11d29f1af`.
- Git worktree was clean before edits.

## Changes

- Added `ORCH_DB` and `ORCH_CONFIG_DIR` in `packages/jinn/src/shared/paths.ts`.
- Extended the pure `MatrixScheduler` with allocation tracking, snapshot export, and snapshot hydration.
- Added `packages/jinn/src/orchestration/store.ts`:
  - dedicated SQLite database, WAL mode;
  - tables for leases, allocations, allocation leases, queue items, telemetry events, and metadata;
  - transaction-based snapshot replacement;
  - corrupt database rename-and-recreate recovery.
- Added `packages/jinn/src/orchestration/persistent-scheduler.ts`:
  - hydrates scheduler state from the store;
  - persists mutations through the store;
  - expires stale leases on hydrate.
- Added temp-DB Vitest coverage for store round-trip, corrupt DB recovery, transaction rollback, restart hydration, queued-task resume, heartbeat/release/expiry, and expiry-on-hydrate.
- Updated orchestration docs, feature inventory, and the roadmap status for M1.

## Validation

- `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts` passed: 3 files / 18 tests.
- `pnpm --filter jinn-cli test -- src/cli/__tests__/orchestration-scheduler.test.ts` passed: 1 file / 4 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm typecheck` passed: `jinn-cli` and `@jinn/web`.
- `git diff --check` passed.
- Line-count check over touched/new human-authored files passed; largest touched file was `docs/superpowers/plans/2026-06-23-matrix-orchestration.md` at 773 lines, and largest touched source file was `packages/jinn/src/orchestration/scheduler.ts` at 479 lines.
- `pnpm test` did not complete cleanly:
  - `@jinn/web` passed: 59 files / 627 tests.
  - `jinn-cli` passed 151 files / 1205 tests / 1 skipped, with one timeout:
    - `src/gateway/__tests__/queue-cancel-scope.test.ts` / `cannot cancel a pending queue item that belongs to another session`.
  - Isolated rerun passed:
    - `pnpm --filter jinn-cli test -- src/gateway/__tests__/queue-cancel-scope.test.ts -t "cannot cancel a pending queue item"` passed: 1 test, 1 skipped.

## Residual Risks

- The durable wrapper is not wired into daemon startup, live session execution, API routes, or CLI persistence.
- The public CLI dry-run commands still use process-local state.
- No real provider adapters, worktrees, live routing, dashboard controls, or telemetry aggregation were added.
- Full-suite stability still has unrelated timeout risk under concurrent `jinn-cli` test load.
