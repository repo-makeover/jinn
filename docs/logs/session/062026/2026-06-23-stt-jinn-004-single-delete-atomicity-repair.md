# STT-JINN-004 Single Delete Atomicity Repair

Date: 2026-06-23T09:12:06-04:00
Actor: Codex
Task: Repair STT-JINN-004, where `deleteSession` deleted child rows and the session row without a transaction.

## Scope

- Selected finding: STT-JINN-004 only.
- Source touched:
  - `packages/jinn/src/sessions/registry.ts`
- Tests touched:
  - `packages/jinn/src/sessions/__tests__/registry-delete-queue-items.test.ts`
- Out of scope:
  - Route/controller changes.
  - Multi-session archive/delete workflow changes.
  - Broader persistence refactors in `registry.ts`.

## Startup Evidence

- Repo instruction file in scope: `AGENTS.md`.
- Finding evidence checked in `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`.
- Dory still reports an unrelated active recoverable Kiro session; this repair did not mutate it.
- `.giles/` not present.

## Patch Summary

- Wrapped `deleteSession(id)` in a SQLite transaction, matching the atomicity already used by `deleteSessions(ids)`.
- Kept the same delete steps inside the transaction:
  - messages
  - queue items
  - durable queue pause row
  - session row
- Added an early `false` return when the target session is missing, before entering the transaction.

## Regression Coverage

Extended `registry-delete-queue-items.test.ts` to inject a failure on the queue-item delete step:

- create a session with messages and queue items;
- force an exception after the message delete step would have started;
- assert `deleteSession` throws;
- assert the transaction rolls back and preserves:
  - the session row,
  - its message row,
  - its queue row.

## Validation

Passed:

- `pnpm --filter jinn-cli test -- src/sessions/__tests__/registry-delete-queue-items.test.ts src/sessions/__tests__/registry-search-messages.test.ts`
- `pnpm --filter jinn-cli typecheck`
- `pnpm typecheck`
- `pnpm lint`
  - Completed with Turbo warning: no lint tasks were executed.
- `git diff --check`

Not run:

- Full `pnpm test` was not rerun for this narrow persistence fix. Prior repair work already showed unrelated suite instability, so validation stayed focused on the affected registry seam plus typecheck.

## File Size / Modularity

- `packages/jinn/src/sessions/registry.ts`: 1471 lines.
- `packages/jinn/src/sessions/__tests__/registry-delete-queue-items.test.ts`: 87 lines.
- Touched file already over 600 lines:
  - `packages/jinn/src/sessions/registry.ts`
- Touched file already over 1000 lines:
  - `packages/jinn/src/sessions/registry.ts`
- Modularity stayed unchanged. The repair intentionally avoided widening scope beyond the existing transactional persistence boundary.

## Residual Risks

- `deleteSession` is now atomic at the SQLite boundary, but route teardown still performs engine/queue cleanup before calling into persistence, so cross-subsystem rollback remains out of scope.
- `registry.ts` remains oversized and continues to own many unrelated behaviors.
