# STT-JINN-002 Queue Cancel Scope Repair

Date: 2026-06-23T09:02:23-04:00
Actor: Codex
Task: Repair STT-JINN-002, where `DELETE /api/sessions/:id/queue/:itemId` could cancel a pending queue item from another session.

## Scope

- Selected finding: STT-JINN-002 only.
- Source touched:
  - `packages/jinn/src/gateway/api.ts`
  - `packages/jinn/src/sessions/registry.ts`
- Test added:
  - `packages/jinn/src/gateway/__tests__/queue-cancel-scope.test.ts`
- Out of scope:
  - Broad queue subsystem refactors.
  - Replay/pause behavior changes.
  - Any unrelated Dory session work.

## Startup Evidence

- Repo instruction file in scope: `AGENTS.md`.
- Finding evidence checked in `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`.
- Dory remains active on an unrelated recoverable Kiro session; this repair did not mutate that session.
- `.giles/` not present.

## Patch Summary

- Added `cancelQueueItemForSession(itemId, sessionId, sessionKey)` at the registry boundary.
- The new SQL mutation only cancels pending rows where the queue item belongs to the route session by `session_id` or `session_key`.
- Updated `DELETE /api/sessions/:id/queue/:itemId` to derive the route session key and call the scoped registry mutation instead of the unscoped global cancel-by-id.

## Regression Coverage

`queue-cancel-scope.test.ts` covers:

- session A cannot cancel a pending queue item created for session B;
- B's item remains `pending` after the attempted cross-session cancel;
- a session can still cancel its own pending queue item successfully.

## Validation

Passed:

- `pnpm --filter jinn-cli test -- src/gateway/__tests__/queue-cancel-scope.test.ts src/gateway/__tests__/session-query-routes.test.ts`
- `pnpm --filter jinn-cli typecheck`
- `pnpm typecheck`
- `pnpm lint`
  - Completed with Turbo warning: no lint tasks were executed.
- `git diff --check`

Not run:

- Full `pnpm test` was not rerun for this narrow fix. The repo already showed unrelated full-suite instability in prior validation, so this repair used focused route coverage plus package/root typecheck.

## File Size / Modularity

- `packages/jinn/src/gateway/api.ts`: 1777 lines.
- `packages/jinn/src/sessions/registry.ts`: 1430 lines.
- `packages/jinn/src/gateway/__tests__/queue-cancel-scope.test.ts`: 114 lines.
- Touched files already over 600 lines:
  - `packages/jinn/src/gateway/api.ts`
  - `packages/jinn/src/sessions/registry.ts`
- Touched files already over 1000 lines:
  - `packages/jinn/src/gateway/api.ts`
  - `packages/jinn/src/sessions/registry.ts`
- Modularity stayed unchanged. The repair deliberately avoided widening scope beyond the existing controller/persistence seam.

## Residual Risks

- The route boundary is now scoped, but other direct callers of `cancelQueueItem(itemId)` remain intentionally unscoped. Current in-repo uses are internal restart/dispatch logic, not user-routed API cancellation.
- `api.ts` and `registry.ts` remain oversized and continue to accumulate cross-cutting responsibilities.
