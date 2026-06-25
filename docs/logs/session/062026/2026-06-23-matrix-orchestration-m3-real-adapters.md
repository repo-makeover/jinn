# Matrix Orchestration M3 Real Adapters

- Date: 2026-06-23
- Actor: Codex
- Scope: implement M3 real adapter wiring and `engineHasHeadroom` routing for the provider-neutral matrix orchestration layer.

## Startup Evidence

- Loaded `/home/ericl/Work/vscode/agent-skills/30_plan/plan-prototype-build/SKILL.md`.
- Read `AGENTS.md`, the M2 session log, `docs/orchestration/README.md`, `docs/feature_inventory.md`, and the amended M3 roadmap section.
- `control/` and `governance/` contained no YAML policy files in this checkout.
- `.giles/` was absent; `giles` CLI was available, but there was no repo-local Giles state to consume or mutate.
- Dory reported no active session; started session `d558c757-9d5d-432d-80bf-cb1e1bdf7c2c`.
- Git worktree before edits had one existing modified roadmap file: `docs/superpowers/plans/2026-06-23-matrix-orchestration.md`.

## Job Plan

- Allowed source scope:
  - `packages/jinn/src/orchestration/adapter/**`
  - `packages/jinn/src/orchestration/routing-headroom.ts`
  - focused orchestration/gateway tests for adapter, headroom, and Claude billing-path contracts
- Allowed docs scope:
  - `docs/orchestration/README.md`
  - `docs/feature_inventory.md`
  - `docs/superpowers/plans/2026-06-23-matrix-orchestration.md`
  - this session log
- Forbidden scope:
  - no live daemon scheduler wiring;
  - no API, CLI, dashboard, or worktree execution;
  - no real provider calls in tests;
  - no live `~/.jinn` orchestration state mutation;
  - no changes under `control/` or `governance/`.

## Changes

- Added `packages/jinn/src/orchestration/adapter/real-adapter.ts`:
  - validates injected scheduler leases before engine use;
  - resolves real workers through an injected engine `Map`;
  - requires `EngineRunOpts.sessionId` and captures it before awaiting `engine.run`;
  - maps cancellation to `InterruptibleEngine.kill(sessionId)`;
  - registers `streamOutput` subscribers against the run's stream tee;
  - rejects explicit Claude headless bypass flags;
  - bounds terminal run retention.
- Extended adapter structured error codes with `engine_unavailable` and `invalid_request`.
- Added `createLiveProviderAdapterRegistry(...)`; default `createProviderAdapterRegistry()` remains inert-only.
- Added `packages/jinn/src/orchestration/routing-headroom.ts`:
  - filters known live engines by availability, exhausted usage status, and configured minimum remaining percentage;
  - leaves inert providers untouched so simulation stays deterministic.
- Added focused tests for real adapter behavior, headroom routing, import boundaries, and Claude billing-path source contract.
- Updated orchestration docs, feature inventory, and roadmap M3 status.

## Validation

- `pnpm --filter jinn-cli test -- src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts src/orchestration/adapter/__tests__/adapter-contract.test.ts src/orchestration/adapter/__tests__/real-adapter.test.ts src/orchestration/__tests__/routing-headroom.test.ts src/gateway/__tests__/claude-billing-contract.test.ts` passed: 6 files / 44 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm typecheck` passed: `jinn-cli` and `@jinn/web`.
- `pnpm test` passed:
  - `@jinn/web`: 59 files / 627 tests.
  - `jinn-cli`: 156 files / 1236 passed / 1 skipped.
- `git diff --check` passed.
- Trailing-whitespace scan over modified and untracked files passed.
- Source-only line-count gate passed:
  - largest changed source/test file: `packages/jinn/src/orchestration/adapter/__tests__/real-adapter.test.ts` at 389 lines;
  - largest new source file: `packages/jinn/src/orchestration/adapter/real-adapter.ts` at 348 lines.
- Forbidden orchestration vocabulary check passed: no `Employee`, `Manager`, or `Department` terms under `packages/jinn/src/orchestration`.

## Residual Risks

- M3 is opt-in internal plumbing only; no current gateway session path uses the live adapter factory.
- No daemon singleton scheduler boot, API routes, CLI live commands, dashboard controls, worktrees, or live run modes were added.
- M1 carry-forward items remain for later milestones: incremental durable writes, singleton daemon wiring, live corrupt-recovery policy, telemetry append-only retention, and allocation pruning.
- Real provider execution remains untested by design; M3 tests use injected fake engines only.
