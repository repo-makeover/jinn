# Matrix Orchestration M6 Session Log

Date: 2026-06-23
Actor: Codex
Dory session: `4f45e443-0326-4568-9a64-68e92450b4ca`

## Objective

Implement M6 worktree execution from the amended roadmap: task/lane-scoped git
worktrees, read-only reviewer access to the implementation worktree, task-end
cleanup, runtime orphan reaping, and CLI helpers.

## Governance And Recovery

- Dory initially reported no active session and `RUNNING_CLEAN`.
- A fresh Dory session was started for this M6 slice.
- Giles Watcher routing was run with `giles remediate-plan --format pretty .`.
  It produced advisory artifacts and reported baseline governance actions
  unrelated to the M6 implementation seam. Those findings were treated as
  out-of-scope background debt.
- `.giles/`, `.dory/`, `docs/logs/`, `governance/logs/`, and Giles `state/`
  outputs were confirmed ignored local artifacts.

## Changes

- Added managed git worktree lifecycle support in `orchestration/worktree.ts`.
- Added `orchestration.worktreeRoot` and `orchestration.maxWorktrees`.
- Narrowed worker `workspacePolicy` to `shared`, `read_only`, and
  `isolated_worktree`.
- Wired `runOrchestrationTask` to resolve a base cwd once, create
  implementation worktrees for isolated workers, route reviewers to that
  worktree read-only, release leases promptly, and clean task worktrees at task
  end.
- Hooked orphan worktree cleanup into the existing `OrchestrationRuntime`
  boot/timer reaper.
- Added `jinn worktree create|diff|cleanup <task> [--lane <name>]`.
- Updated orchestration docs, feature inventory, docs index, and roadmap status.

## Validation

- `pnpm --filter jinn-cli typecheck` passed.
- Focused M6 tests passed:
  `pnpm --filter jinn-cli test -- src/orchestration/__tests__/worktree.test.ts src/orchestration/__tests__/run-mode.test.ts src/cli/__tests__/orchestration-worktree.test.ts`
- Broader orchestration regression tests passed:
  `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts src/orchestration/__tests__/store.test.ts src/orchestration/__tests__/worktree.test.ts src/orchestration/__tests__/run-mode.test.ts src/cli/__tests__/orchestration-scheduler.test.ts src/cli/__tests__/orchestration-run.test.ts src/cli/__tests__/orchestration-worktree.test.ts src/gateway/__tests__/orchestration-routes.test.ts`
- `pnpm typecheck` passed.
- `pnpm test` passed:
  - `@jinn/web`: 59 files, 627 tests passed.
  - `jinn-cli`: 162 files, 1258 tests passed, 1 skipped.
- `pnpm lint` exited 0, but Turbo reported no configured lint tasks.
- `git diff --check` passed.
- Forbidden orchestration terminology scan passed.

## Residual Risks

- M6 removes completed managed worktrees at task end; durable patch artifacts and
  integration worktrees remain M8/later work.
- Reviewer read-only enforcement uses filesystem permission toggling and the
  non-mutating session contract. It is a practical local guard, not a sandbox
  boundary against a malicious same-user process.
- Board-worker routing, dashboard controls, and dual-lane integration remain
  unwired.
