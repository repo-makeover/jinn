# Matrix Orchestration M2 Provider Adapters

- Date: 2026-06-23
- Actor: Codex
- Scope: implement the inert provider-adapter contract layer for matrix orchestration.

## Startup Evidence

- Loaded `/home/ericl/Work/vscode/agent-skills/30_plan/plan-prototype-build/SKILL.md`.
- Read `AGENTS.md`, `README.md`, `docs/INDEX.md`, and the amended M2 roadmap section.
- `control/` and `governance/` contained no YAML policy files in this checkout.
- `.giles/` was absent; AGENTS Giles routing path rule covers `~/vscode/*`, not this checkout path.
- Dory reported no active session; started session `47f3507e-0014-4e79-97d8-a442c0f6eec7`.
- Git worktree was clean before edits.

## Changes

- Moved `LeaseValidationResult` into orchestration-local `types.ts`.
- Added `packages/jinn/src/orchestration/adapter/` with:
  - provider-neutral adapter interface and structured result/error types;
  - injected `LeaseValidator` contract;
  - `stub`, `manual`, `local_echo`, and `mock` inert adapters;
  - fail-closed provider adapter registry.
- `local_echo` and `mock` validate leases before delegating to deterministic `MockEngine`.
- `manual` returns `manual_required`; `stub` returns `unsupported_operation`.
- Added adapter contract tests and import-boundary tests.
- Updated orchestration docs, feature inventory, docs index, and roadmap M2 status.

## Validation

- `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts src/orchestration/adapter/__tests__/adapter-contract.test.ts` passed: 3 files / 27 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm typecheck` passed: `jinn-cli` and `@jinn/web`.
- `git diff --check` passed.
- Line-count check over touched/new human-authored files passed; largest file was `docs/superpowers/plans/2026-06-23-matrix-orchestration.md` at 799 lines, and largest source file was `packages/jinn/src/orchestration/scheduler.ts` at 475 lines.
- `pnpm test` did not complete cleanly:
  - `@jinn/web` passed: 59 files / 627 tests.
  - `jinn-cli` passed 152 files / 1218 tests / 1 skipped, with one timeout:
    - `src/gateway/__tests__/queue-cancel-scope.test.ts` / `cannot cancel a pending queue item that belongs to another session`.
  - Isolated rerun passed:
    - `pnpm --filter jinn-cli test -- src/gateway/__tests__/queue-cancel-scope.test.ts -t "cannot cancel a pending queue item"` passed: 1 test, 1 skipped.

## Residual Risks

- No real provider adapters were registered.
- No daemon, session, API, CLI persistence, dashboard, or worktree wiring was added.
- M1 carry-forward items remain for later milestones: incremental durable writes, singleton daemon boot wiring, live corrupt-recovery policy, telemetry append-only retention, and allocation pruning.
- Full-suite stability still has unrelated timeout risk under concurrent `jinn-cli` test load.
- The roadmap is at 799 lines and should be split before further substantive milestone updates.
