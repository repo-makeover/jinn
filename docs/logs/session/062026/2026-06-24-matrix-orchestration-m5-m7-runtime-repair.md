# Matrix Orchestration M5-M7 Runtime Repair

- Date: 2026-06-24
- Scope: repair blocked live-run auto-resume, truthful failed run state, diff-only reviewer flow, and orchestration runtime hot reload.
- Giles routing: waived by operator in-chat for this session.

## Files

- `packages/jinn/src/orchestration/live-run.ts`
- `packages/jinn/src/orchestration/store.ts`
- `packages/jinn/src/orchestration/runtime.ts`
- `packages/jinn/src/orchestration/run-mode.ts`
- `packages/jinn/src/orchestration/worktree.ts`
- `packages/jinn/src/gateway/orchestration-runtime-manager.ts`
- `packages/jinn/src/gateway/server.ts`
- `packages/jinn/src/gateway/api/orchestration-routes.ts`
- `packages/jinn/src/cli/orchestration.ts`
- `packages/jinn/src/orchestration/__tests__/{run-mode,runtime,store,worktree}.test.ts`
- `packages/jinn/src/gateway/__tests__/{orchestration-routes,orchestration-runtime-manager}.test.ts`
- `packages/jinn/src/cli/__tests__/orchestration-run.test.ts`
- `README.md`
- `docs/orchestration/README.md`
- `docs/feature_inventory.md`
- `docs/superpowers/plans/2026-06-23-matrix-orchestration.md`

## Behavior

- Blocked live runs now persist a durable continuation keyed by `taskId + coordinatorId`.
- Runtime retry paths pair resumed allocations with a claimed continuation and a gateway-owned dispatch callback.
- Missing-continuation resumed allocations are released instead of left running without a coordinator.
- Live orchestration returns `ok: false, state: "failed"` when any leased role session errors.
- Reviewer turns now receive a generated diff bundle (`patch.diff`, `metadata.json`) instead of the implementation worktree as `cwd`.
- Gateway config reload now swaps orchestration runtimes when enabled settings change; disabling orchestration rejects new runs while keeping active runtime state bound long enough to drain.

## Validation

- `pnpm --filter jinn-cli typecheck`
- Focused vitest suites for orchestration runtime/store/run-mode/worktree, gateway orchestration routes/runtime manager, and CLI orchestration run output

## Residual Risks

- The new continuation table is durable, but there is still no operator-facing control surface for inspecting or retrying failed continuations.
- `packages/jinn/src/orchestration/store.ts` remains above the repo's 600-line soft threshold; no further split was done in this repair slice.
