# 2026-06-24 Matrix Orchestration M11 Dashboard

## Scope

Implemented M11 as an observe-first orchestration operations dashboard plus the
small backend safety preflight required before exposing retry/selection state.

## Governance and Startup

- Read repo `AGENTS.md`, project docs, `.dory/`, `.giles/`, `governance/`, and
  recent local session logs before source edits.
- Resumed Dory session `ab2839a8-9c05-40ed-8886-4abd163c3ec9`.
- Resolved Giles watchers; this checkout reported explain-only watchers with no
  enforced watcher pack.

## Backend Changes

- `retryFailedLiveContinuation()` now applies live headroom before creating a
  retry allocation.
- Orchestration-backed manual and board-worker ticket dispatch now use
  headroom-aware exact-worker allocation.
- Added read-only dashboard routes:
  - `GET /api/orchestration/status`
  - `GET /api/orchestration/telemetry/summary`
  - `GET /api/orchestration/worktrees`
  - `GET /api/orchestration/dual-lane`
- Dual-lane listing returns sanitized manifest summaries and omits prompt hashes
  and raw diffs.

## Web Changes

- Added `/orchestration` route.
- Added isolated `packages/web/src/lib/orchestration-api.ts` instead of growing
  the already-large shared web API module.
- Added nav item `Orchestration`.
- Dashboard reads real workers, leases, queue, allocations, continuations,
  dual-lane manifests, worktrees, and telemetry summaries.
- Dashboard mutating controls are limited to:
  - retry only `failed` continuations;
  - select a lane only for `selection_required` dual-lane manifests.

## Deferred

- Pause queue.
- Cancel lease/session.
- Automatic patch integration.
- Raw diff viewing.
- Raw prompt/model-output viewing.

These remain deferred because M11 is observe-first and cancellation requires a
separate safety slice that stops owned engine work before releasing leases.

## Validation Evidence

- Passed: `pnpm --filter jinn-cli test -- src/orchestration/__tests__/runtime.test.ts src/gateway/__tests__/orchestration-routes.test.ts src/gateway/__tests__/ticket-dispatch-orchestration.test.ts src/gateway/__tests__/ticket-dispatch-idempotency.test.ts src/gateway/__tests__/ticket-dispatch-route.test.ts src/gateway/__tests__/board-worker.test.ts`
  - 6 files, 37 tests.
- Passed: `pnpm --filter @jinn/web test -- src/lib/__tests__/orchestration-api.test.ts src/routes/orchestration/page.test.tsx src/lib/__tests__/nav.test.ts src/components/__tests__/nav-ribbon.test.tsx`
  - 4 files, 18 tests.

Additional typecheck, full tests, line-count, diff-check, and browser checks are
pending at the time this log entry was created.
