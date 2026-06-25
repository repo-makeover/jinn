# 2026-06-24 Matrix Orchestration Continuation Controls

- Scope: add operator-facing inspection and retry controls for durable live-run continuations after the M5-M7 runtime-correctness repair.
- Authority: Giles watcher waived by operator for this session.

## Implemented

- Added `GET /api/orchestration/continuations` for durable continuation inspection from the live runtime or read-only DB fallback.
- Added `POST /api/orchestration/continuations/retry` for manual retry of continuations already in `failed` state.
- Added runtime-side `retryFailedLiveContinuation()` that reconstructs allocation from the persisted task payload, reuses the scheduler, and dispatches only through the existing gateway-owned resume callback.
- Added CLI commands:
  - `jinn continuations list`
  - `jinn continuations retry --task-id <id> --coordinator-id <id>`

## Validation

- `cd packages/jinn && npx vitest run src/orchestration/__tests__/runtime.test.ts src/gateway/__tests__/orchestration-routes.test.ts src/cli/__tests__/orchestration-run.test.ts`
- `cd packages/jinn && npx vitest run src/orchestration/**/*.test.ts src/cli/__tests__/*orchestration*.test.ts src/gateway/__tests__/orchestration-*.test.ts`
- `cd packages/jinn && npm run typecheck`
- `pnpm typecheck`
- `git diff --check`

## Residual Risks

- Manual retry intentionally excludes continuations still in `queued` state because naive re-allocation would duplicate scheduler queue items.
- There is still no delete/prune control for completed continuations; retention policy remains future work.
