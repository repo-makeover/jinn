# Board, Callback, And Path Hardening

Date: 2026-06-24
Actor: Codex

## Scope

Focused repair for `CON-JINN-001`, `ARC-JINN-002`, and `ARC-JINN-003`.
No M11 dashboard/control work was started.

## Changes

- Added optimistic concurrency to department board writes. Web saves now carry
  per-ticket `baseUpdatedAt`, stale updates/deletions return HTTP `409`, and
  active board-linked `sessionId` metadata is preserved on fresh saves.
- Added a small `SessionNotificationSink` seam. Gateway callback paths deliver
  parent-session and connector notifications directly in-process, with the old
  loopback HTTP path retained as a fallback outside the gateway context.
- Converted `shared/paths.ts` JINN_HOME-derived exports to refreshable live
  bindings and added `getJinnPaths()`, `refreshJinnPaths()`, and
  `setJinnHomeForTest()` so tests can move runtime state without module resets.

## Validation

- Focused jinn vitest slice passed for board service/API, callbacks,
  notification sink, paths, config, cron jobs, ticket dispatch, and status
  reconciler: 8 files, 91 tests.
- Focused web kanban store vitest passed: 1 file, 4 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm typecheck` passed.
- `git diff --check` passed.
- Full `pnpm test` reproduced the known concurrent jinn-cli timeout/flaky
  combined-run pattern after `@jinn/web` passed. Every failed jinn-cli file from
  that run was rerun in isolation and passed: 13 files, 100 tests.

## Residual Risk

The direct callback sink intentionally preserves the existing notification
semantics and does not refactor the whole session dispatch pipeline. Non-gateway
callback callers still use the loopback fallback for compatibility.
