# Matrix Orchestration M10.5 Implementation

Timestamp: 2026-06-24T09:15:11-04:00

## Scope

Implemented the M10.5 lifecycle hardening interlock before M11. Giles routing was
waived by the operator in chat. Live `~/.jinn` and port 7777 were not touched; tests
use temp paths.

## Changes

- Config/org reload now defers runtime replacement while active orchestration work
  exists and replays the deferred refresh after drain.
- Gateway shutdown now prepares the orchestration runtime before closing persistent
  state, releasing running leases and failing dispatching continuations.
- Runtime now tracks queued-resume dispatch promises, gates retries during close, and
  recovers stale `dispatching` continuations on boot.
- Live run allocation applies engine headroom before creating leases.
- Pre-dispatch setup failures release still-running leases immediately.
- Empirical routing reads a bounded telemetry tail; run telemetry appends avoid
  per-record fsync stalls on hot paths.

## Validation

- `cd packages/jinn && npx vitest run src/orchestration/__tests__/runtime.test.ts src/orchestration/__tests__/run-mode.test.ts src/orchestration/__tests__/telemetry.test.ts src/gateway/__tests__/orchestration-runtime-manager.test.ts`
  - Passed: 4 files, 32 tests.
- `pnpm --filter jinn-cli typecheck`
  - Passed.
- `cd packages/jinn && npx vitest run src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/persistent-scheduler.test.ts src/orchestration/__tests__/runtime.test.ts src/orchestration/__tests__/run-mode.test.ts src/orchestration/__tests__/dual-lane.test.ts src/orchestration/__tests__/telemetry.test.ts src/gateway/__tests__/orchestration-runtime-manager.test.ts src/gateway/__tests__/ticket-dispatch-orchestration.test.ts src/gateway/__tests__/ticket-dispatch-route.test.ts src/cli/__tests__/orchestration-scheduler.test.ts`
  - Passed: 10 files, 69 tests.
- `pnpm typecheck`
  - Passed.
- `pnpm test`
  - Failed in full concurrent run with known timeout/order-sensitive files:
    approvals, config PUT roundtrip, work, archives, SSO capture, Grok transcript
    scoping, queue cancel, session query, ticket dispatch route, and dual-lane.
- `cd packages/jinn && npx vitest run <the 10 failed files>`
  - Passed in isolation: 10 files, 69 tests.
- `cd packages/jinn && npx vitest run --maxWorkers=1`
  - Passed serial full `jinn-cli` suite: 168 files, 1317 passed, 1 skipped.
- `pnpm --filter @jinn/web test`
  - Passed: 59 files, 627 tests.
- `git diff --check`
  - Passed.
- `pnpm lint`
  - Completed; turbo reports no lint tasks configured.
- `pnpm build`
  - Passed; web build emitted the existing large-chunk warning.
- `bash ~/vscode/agent-skills/30_plan/plan-prototype-build/tools/line_count_check.sh`
  - Failed because the helper counts nested `node_modules`, `.turbo`, assets, and
    large docs in this checkout.
- Focused touched-source line count:
  - Only `packages/jinn/src/gateway/server.ts` is above 800 lines (1344), and it was
    already oversized before this slice; M10.5 added only narrow wiring there.

## Residual Risk

Full `pnpm test` remains subject to the documented concurrent-load flake pattern.
The failed files passed in isolation after the full-suite failure.
