# Matrix Orchestration Foundation

- Date: 2026-06-23
- Actor: Codex
- Scope: implement the inert provider-neutral matrix orchestration foundation.

## Startup Evidence

- Read repo instructions: `AGENTS.md`.
- Read startup docs and local surfaces:
  - `README.md`
  - `.dory/memory/agent.md`
  - `.dory/memory/context.md`
  - `.dory/memory/open_loops.md`
- `docs/INDEX.md`, `PROJECT_HANDOFF_MASTER.md`, and `PLAN.md` were absent at startup.
- `control/` and `governance/` contained no YAML policy files in this checkout.
- `.giles/` was absent.
- Dory reported an unrelated active recoverable Kiro session. Per the implementation brief, that stale unrelated session was abandoned before source edits and a new Dory session was started for this work.
- Git worktree was clean before edits.

## Changes

- Added `packages/jinn/src/orchestration/` with local types, Zod schemas, config loaders, deterministic in-memory scheduler, lease lifecycle, blocked-resource queueing, and simulation runner.
- Added CLI dry-run commands:
  - `jinn workers list --config-dir <dir> [--json]`
  - `jinn scheduler allocate <task-file> --config-dir <dir> --dry-run [--json]`
  - `jinn scheduler simulate <scenario-file> --config-dir <dir> [--json]`
- Added focused Vitest tests for schema parsing, deterministic matching, max concurrency, opposite-family reviewer selection, quota blocking, atomic allocation, lease release/expiry, queue retry, priority retry, and CLI dry-run behavior.
- Added `docs/orchestration/README.md` and example YAML files under `docs/orchestration/examples/`.
- Created `docs/INDEX.md` and updated `docs/feature_inventory.md`.

## Validation

- `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/cli/__tests__/orchestration-scheduler.test.ts` passed: 2 files / 14 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm typecheck` passed: `@jinn/web` and `jinn-cli`.
- Line-count check over touched files passed; largest touched/new file was `packages/jinn/src/orchestration/scheduler.ts` at 415 lines.
- `pnpm lint` completed, but Turbo reported no lint tasks were configured or executed.
- `pnpm test` did not complete cleanly:
  - `@jinn/web` passed: 59 files / 627 tests.
  - `jinn-cli` failed two timeout tests during the full concurrent run:
    - `src/gateway/__tests__/queue-cancel-scope.test.ts` / `cannot cancel a pending queue item that belongs to another session`
    - `src/engines/__tests__/codex.test.ts` / `tracks a live process and clears it after close (isAlive)`
  - Isolated rerun passed for both failing tests:
    - `pnpm --filter jinn-cli test -- src/gateway/__tests__/queue-cancel-scope.test.ts src/engines/__tests__/codex.test.ts -t "cannot cancel a pending queue item|tracks a live process"` passed: 2 tests, 26 skipped.

## Residual Risks

- This slice is intentionally inert. It does not run providers, create worktrees, persist telemetry, or integrate with the daemon/dashboard.
- Scheduler state is in-memory only.
- Existing Kanban/board audit findings remain separate backlog work unless they later block orchestration integration.
- Full-suite stability still has unrelated timeout risk under concurrent `jinn-cli` test load.
- The live gateway on port 7777 and live `~/.jinn` runtime state were not touched.
