# 2026-06-24 Matrix Orchestration M12 Safe Controls

## Scope

Implemented M12 as the post-M11 safe-control slice for matrix orchestration:
global queue pause/resume plus strict running-lease stop from the backend and
`/orchestration` dashboard.

## Governance and Startup

- Read repo `AGENTS.md`, current matrix plan, project docs, `.dory/`, `.giles/`,
  `governance/`, and recent M11 local session log before source edits.
- Resumed Dory session `ab2839a8-9c05-40ed-8886-4abd163c3ec9`.
- Giles status reported `blocked_but_documented` with explain-only watchers and
  no enforced watcher pack; the user's M12 brief was used as the scoped job plan.
- Preserved unrelated dirty files in `packages/jinn/src/cli/remove.ts`,
  `packages/jinn/src/gateway/watcher.ts`, and the untracked instances-safety
  test.

## Backend Changes

- Added durable global orchestration queue pause metadata in the orchestration
  store.
- Added runtime `pauseQueue`, `resumeQueue`, and `getControlState`.
- Paused runtime suppresses queued continuation dispatch after lease release,
  lease expiry, manual retry, and resume handler registration.
- Queue resume clears the pause and retries queued work through the existing
  live-headroom-aware path.
- Added routes:
  - `POST /api/orchestration/queue/pause`
  - `POST /api/orchestration/queue/resume`
  - `POST /api/orchestration/leases/stop`
- `GET /api/orchestration/status` now returns queue pause state.
- Lease stop resolves the mapped Jinn session via
  `transportMeta.orchestrationLease.leaseId`, interrupts interruptible running
  sessions without directly releasing the lease, releases immediately for
  already-terminal mapped sessions, and returns `409` without release for
  missing mappings or non-interruptible engines.

## Web Changes

- `/orchestration` now shows queue paused state and exposes Pause queue or
  Resume queue only when the runtime is enabled and bound.
- Running leases render a `Stop lease` action.
- Action failures remain visible in the page error banner.
- Orchestration API client additions stayed in
  `packages/web/src/lib/orchestration-api.ts`.

## Deferred

- Per-task queue pause.
- Raw diff viewing.
- Raw prompt or model-output viewing.
- Automatic patch integration.

## Validation Evidence

- Passed: `pnpm --filter jinn-cli test -- src/orchestration/__tests__/runtime.test.ts src/gateway/__tests__/orchestration-routes.test.ts`
  - 2 files, 27 tests.
- Passed: `pnpm --filter @jinn/web test -- src/lib/__tests__/orchestration-api.test.ts src/routes/orchestration/page.test.tsx`
  - 2 files, 8 tests.

- Passed: `pnpm --filter jinn-cli typecheck`.
- Passed: `pnpm --filter @jinn/web typecheck`.
- Passed: `pnpm typecheck`.
- Passed: `pnpm test`
  - web: 61 files, 637 tests.
  - jinn-cli: 171 files, 1346 passed, 1 skipped.
- Passed: `git diff --check`.
- Focused touched-source line count:
  - `packages/jinn/src/orchestration/store.ts`: 800 lines.
  - `packages/jinn/src/orchestration/runtime.ts`: 540 lines.
  - `packages/jinn/src/gateway/api/orchestration-routes.ts`: 417 lines.
  - `packages/web/src/routes/orchestration/page.tsx`: 520 lines.
  - `packages/web/src/lib/orchestration-api.ts`: 248 lines.
- Browser verification: Vite dev server at `http://localhost:5173/orchestration`
  with mocked orchestration API data rendered the queue paused state, Resume
  queue, and Stop lease at desktop `1440x900` and mobile `390x844`. Console
  showed expected dev-server proxy/websocket errors from running without a real
  daemon; route content rendered correctly.
