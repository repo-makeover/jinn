# Orphaned Ticket Reconciler M1/M2 Repair

- Date: 2026-06-23
- Actor: codex fallback for code-reviewer
- Scope: repair reviewed M1/M2 defects in the orphaned `in_progress` ticket reconciler.

## Changes

- Moved startup pending-web-queue replay before startup orphaned-ticket reconciliation so resumed sessions refresh their running heartbeat before ticket classification.
- Preserved board ticket `description` when marking orphaned tickets `blocked`; stored the generic interruption reason in `blockedReason`.
- Added focused tests for startup-fresh running sessions and description preservation.

## Validation

- `npx -p node@24.13.0 -c 'cd packages/jinn && ./node_modules/.bin/vitest run src/gateway/__tests__/orphaned-ticket-reconciler.test.ts src/gateway/__tests__/status-reconciler.test.ts'` — passed, 2 files / 19 tests.
- `npx -p node@24.13.0 -c 'cd packages/jinn && ./node_modules/.bin/tsc --noEmit'` — passed.

## Residual Risks

- Runtime gateway restart was not exercised end-to-end; coverage is unit-level plus startup ordering inspection.
- The new `blockedReason` metadata is persisted but not currently surfaced in the kanban UI.
