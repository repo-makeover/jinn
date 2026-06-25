# Jinn Full Codebase Audit

- Date: 2026-06-23
- Actor: Codex
- Authority: audit-only
- Repo: `/home/ericl/vscode_github_public/jinn`
- Requested lenses: workflow, temporal, internal API contract, concurrency, negative space, input/output path, cascade, data integrity, state transition, node.js architecture, architecture seam
- Shared base loaded from: `/home/ericl/Work/vscode/agent-skills/00_common/audit-base/*`

## Scope

Repo-wide audit with emphasis on the gateway/session/web pipeline:

- `packages/web/src/routes/kanban/page.tsx`
- `packages/jinn/src/gateway/board-service.ts`
- `packages/jinn/src/gateway/ticket-dispatch.ts`
- `packages/jinn/src/gateway/api.ts`
- `packages/jinn/src/gateway/board-worker.ts`
- `packages/jinn/src/gateway/hook-endpoint.ts`
- `packages/jinn/src/gateway/api/session-dispatch.ts`
- `packages/jinn/src/sessions/*`
- sampled chat/sidebar and hook UI surfaces

This pass did not patch application source. It reconciled the code against the live backlog board and wrote local audit artifacts.

## Orientation Notes

- `AGENTS.md`, `README.md`, and `docs/feature_inventory.md` were read.
- `PROJECT_HANDOFF_MASTER.md` is absent in this checkout.
- `docs/INDEX.md` is absent in this checkout.
- `control/*.yaml` and `governance/*.yaml` are absent in this checkout.
- `.dory/` exists and was inspected for continuity, but I did not mutate it.
- The working tree already contains unrelated source changes in `packages/jinn/src/gateway/api.ts`, `packages/jinn/src/gateway/ticket-dispatch.ts`, and their tests. I preserved them.

## Skill Escalation

| Trigger | Escalated lens | Why |
|---|---|---|
| Canonical board JSON and board writes | Data Integrity, State Transition | Board scope and lifecycle ownership must remain truthful |
| Board load/persist flow in the Kanban page | Workflow, Input/Output Path | Silent load failures and flattened retention change operator truth |
| Dispatch, queue, and board-worker writes | Concurrency, Cascade | Overlapping writers can duplicate work or clobber state |
| Internal hook relay and hook endpoint | Temporal, Internal API Contract | Replay, secret, and loopback checks must stay enforced at the boundary |
| Bulk delete and sidebar delete UX | Workflow, Negative Space | Partial success and swallowed rejection need visible feedback |
| Status reconciliation and recovery loops | State Transition, Architecture Seam | Stale turn cleanup must not invent or lose lifecycle state |

## Surface Inventory

| Surface | Boundary | Notes |
|---|---|---|
| `packages/web/src/routes/kanban/page.tsx` | browser UI -> board API | board load, edit, delete, restore, retention, dispatch |
| `packages/jinn/src/gateway/board-service.ts` | API -> `board.json` | board parsing, merge semantics, retention persistence |
| `packages/jinn/src/gateway/ticket-dispatch.ts` | board -> session create | dispatch state transition and assignee resolution |
| `packages/jinn/src/gateway/api.ts` | HTTP API | board routes, session delete, hook relay, auth boundaries |
| `packages/jinn/src/gateway/board-worker.ts` | scheduler loop | automatic board dispatch |
| `packages/jinn/src/gateway/hook-endpoint.ts` | internal hook boundary | loopback, secret, replay, and timestamp checks |
| `packages/jinn/src/gateway/api/session-dispatch.ts` | session teardown and resume | delete/restore cascade, queue cleanup, event emission |
| `packages/web/src/components/chat/chat-sidebar.tsx` | operator action UX | delete failure surface |

## Findings Table

| ID | Severity | Confidence | Lens | Status |
|---|---|---|---|---|
| WFG-JINN-001 | Medium | Confirmed | Workflow | Open |
| WFG-JINN-002 | Medium | Confirmed | Workflow, Internal API | Open |
| ARC-JINN-001 | Medium | Confirmed | Internal API, Architecture | Open |
| CON-JINN-001 | High | Likely | Concurrency, Cascade | Open |
| WFG-009 | High | Confirmed | Workflow, GUI Integrity | Open |
| WFG-005 | Medium | Confirmed | Workflow, GUI Integrity | Open |

## Detailed Findings

### WFG-JINN-001: Per-department board load failures are swallowed, so missing or corrupt boards disappear silently in the UI

Severity: Medium
Confidence: Confirmed

Evidence:
- `packages/web/src/routes/kanban/page.tsx:189-202`
- `packages/jinn/src/gateway/api.ts:1036-1044`

Observed behavior:
- The Kanban page catches every department board fetch failure with an empty `catch {}` and treats the department as if it had no board.
- The backend distinguishes a corrupt board with a 500, so the UI is collapsing "missing board" and "failed board" into the same silent outcome.

Expected boundary:
- A board fetch failure should be operator-visible, or at least visibly partial, instead of being normalized into "nothing exists here".

Impact:
- Broken departments vanish from the board view and operators can miss backlog items.

Recommended mitigation:
- Preserve the distinction between 404/no-board and 500/failed-board.
- Show a partial-load warning naming the affected department.

### WFG-JINN-002: The Kanban page collapses per-department recycle-bin retention into one global control and overwrites all boards with it

Severity: Medium
Confidence: Confirmed

Evidence:
- `packages/web/src/routes/kanban/page.tsx:188-193`
- `packages/web/src/routes/kanban/page.tsx:269-286`
- `packages/web/src/routes/kanban/page.tsx:388-396`
- `packages/jinn/src/gateway/board-service.ts:175-193`

Observed behavior:
- The UI loads all departments, keeps the maximum retention value, and then writes that single value back to every department on the next persist.
- The board service persists `retentionDays` per department board, so the UI is flattening a per-board contract into a page-wide scalar.

Expected boundary:
- Either retention is truly global and stored once, or it remains per-board and the UI preserves department-local values.

Impact:
- Department-local recycle-bin policy is lost silently.

Recommended mitigation:
- Pick one ownership model and align storage, API, and UI to it.
- If retention remains per-board, persist it by department instead of collapsing it to one max value.

### ARC-JINN-001: `PUT /board` accepts arbitrary ticket objects and the UI coerces unknown statuses to `todo` instead of rejecting drift

Severity: Medium
Confidence: Confirmed

Evidence:
- `packages/jinn/src/gateway/board-service.ts:124-155`
- `packages/web/src/routes/kanban/page.tsx:58-90`

Observed behavior:
- Board write parsing only checks that `tickets` is an array and then casts entries directly to `BoardTicket`.
- Merge logic only requires a ticket id.
- The UI maps unknown statuses through `statusMap[item.status] || 'todo'`, which hides stored contract drift on read.

Expected boundary:
- Repo-owned board routes should validate ticket shape and reject unknown enums or missing required fields instead of persisting invalid data and normalizing it later.

Impact:
- Invalid board state becomes durable and can look valid in the UI.

Recommended mitigation:
- Validate board tickets at the API boundary.
- Reject unknown statuses and malformed ticket payloads with 400s.

### CON-JINN-001: Board dispatch and full-board writes are check-then-act / last-writer-wins, so overlapping writers can duplicate work or drop manual edits

Severity: High
Confidence: Likely

Evidence:
- `packages/jinn/src/gateway/ticket-dispatch.ts:67-136`
- `packages/jinn/src/gateway/board-service.ts:146-155`
- `packages/web/src/routes/kanban/page.tsx:246-287`
- `packages/jinn/src/sessions/queue.ts:73-106`

Observed behavior:
- Dispatch only checks `ticket.sessionId` and the current running session before creating a new session and writing the board.
- The session queue serializes by session key, but board writes are still full-snapshot writes with no compare-and-swap guard.
- Overlapping writers can therefore see stale state and commit clashing updates.

Expected boundary:
- Dispatch and board persistence should have a stronger reservation or versioning guard when multiple writers can touch the same ticket or session.

Impact:
- Duplicate sessions, stale board writes, or lost manual edits are possible under overlapping dispatch and UI activity.

Recommended mitigation:
- Add an atomic reservation or version guard around the dispatch/write path.
- Re-read before commit and fail stale writes explicitly.

### WFG-009: Bulk delete ignores partial failure and emits fake success

Severity: High
Confidence: Confirmed

Evidence:
- `packages/jinn/src/gateway/api.ts:429-455`
- `packages/jinn/src/sessions/registry.ts:1048-1066`
- `packages/web/src/hooks/use-sessions.ts:111-131`

Observed behavior:
- The bulk-delete route asks the DB for a count, but then emits `session:deleted` for every requested id regardless of what the transaction actually removed.
- The React Query hook removes all requested ids from cache on any 200 response.

Expected boundary:
- The API should return the actual deleted ids, and the UI should only remove confirmed ids.

Impact:
- Operators get a complete-success story even when only part of the requested delete actually happened.

Recommended mitigation:
- Return the list of deleted ids from the registry/API.
- Emit and cache-invalidate only for the confirmed deleted ids.

### WFG-005: Bulk and single session deletions swallow network failures

Severity: Medium
Confidence: Confirmed

Evidence:
- `packages/web/src/components/chat/chat-sidebar.tsx:278-328`

Observed behavior:
- `handleDeleteEmployee` and `handleDelete` catch and discard all rejection paths from the delete mutations.
- A failed delete leaves the UI unchanged but gives the operator no feedback.

Expected boundary:
- Operator-triggered destructive actions should report failure visibly instead of disappearing into an empty catch.

Impact:
- The user cannot tell whether the delete failed or simply did nothing.

Recommended mitigation:
- Replace the empty catch blocks with a visible error surface.
- A toast or inline error message is sufficient.

## Resolved Since Prior Pass

### DAT-JINN-001: Cross-department assignee changes no longer survive dispatch boundary checks

Status: Resolved in the current working tree. The board ticket `kanban-scope-20260623-001` is already `done`.

Evidence:
- `packages/jinn/src/gateway/api.ts:1097-1125`
- `packages/jinn/src/gateway/ticket-dispatch.ts:44-60`

Note:
- The current working tree now rejects foreign-department assignees at dispatch and validates board PUT assignees before persistence, so the earlier board-scope mismatch is no longer an open finding.

## Non-Findings

- The internal hook endpoint is defended by loopback, shared-secret, stale-timestamp, and nonce replay checks (`packages/jinn/src/gateway/hook-endpoint.ts:34-71`, `packages/jinn/src/gateway/api.ts:1725-1767`).
- The board worker has an in-process reentrancy guard and only dispatches inside the configured time window when the chat is idle (`packages/jinn/src/gateway/board-worker.ts:165-200`).
- The status guard around session updates rejects illegal lifecycle statuses instead of persisting them (`packages/jinn/src/sessions/__tests__/update-session-status-guard.test.ts`).

## Board Mapping

Live board entries already exist for every open finding:

- `kanban-workflow-20260623-002` -> `WFG-JINN-001` -> backlog
- `kanban-retention-20260623-003` -> `WFG-JINN-002` -> backlog
- `kanban-contract-20260623-004` -> `ARC-JINN-001` -> backlog
- `kanban-concurrency-20260623-005` -> `CON-JINN-001` -> backlog
- `a76aacec-7886-4dd6-b797-9ebdb3337870` -> `WFG-009` -> backlog
- `c3c41a5d-28b4-49c5-85be-89b4bb804bbd` -> `WFG-005` -> backlog

The closed item remains represented as done:

- `kanban-scope-20260623-001` -> `DAT-JINN-001` -> done

## Validation

- `jq empty /home/ericl/.jinn/org/software-delivery/board.json`
- `pnpm --dir packages/jinn test -- src/gateway/__tests__/board-service.test.ts src/gateway/__tests__/board-sync.test.ts src/gateway/__tests__/ticket-dispatch-route.test.ts src/gateway/__tests__/ticket-dispatch.test.ts src/gateway/__tests__/route-hardening.test.ts src/gateway/__tests__/hook-endpoint.test.ts src/gateway/__tests__/status-reconciler.test.ts src/gateway/__tests__/orphaned-ticket-reconciler.test.ts src/sessions/__tests__/registry-delete-queue-items.test.ts`
- `pnpm --dir packages/web test -- src/hooks/__tests__/use-sessions.test.ts`

## Residual Risk

- `CON-JINN-001` remains `Likely` rather than runtime-reproduced in this pass.
- The audit is source-backed and targeted-test-backed, but the full UI flows were not exercised in a browser harness.
- The board metadata now matches the audit rating better, but the underlying code issues remain open.
