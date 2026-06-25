# Workflow / GUI Integrity Audit

## Surface Inventory & Boundary Map

| View/Control | Backend Effect | Shown Status | Actual Status | Feedback On Failure | Bypass If Disabled? |
|---|---|---|---|---|---|
| Kanban "Run Now" | `POST /api/org/departments/:name/tickets/:id/dispatch` | Starting | Started / Errored | 400 surfaced in UI | No (backend 400 on no-assignee) |
| Cron "Trigger" | `POST /api/cron/:id/trigger` | Running | Running / Disabled | 409 surfaced in UI | No (backend 409 on !job.enabled) |
| Approvals "Approve" / "Reject" | `POST /api/approvals/:id/approve` or `reject` | Done | Approved / Rejected | Error message shown inline | No (backend 409 if not pending) |
| Sidebar "Delete Employee" | `POST /api/sessions/bulk-delete` | Removed from UI | Deleted | **None (swallowed)** | N/A |
| Kanban Board Move | `PUT /api/org/departments/:name/board` | Optimistic | Saved | Error toast + reload | N/A |

## Findings Table

| ID | Domain | Rule | Severity | Confidence | Status |
|---|---|---|---|---|---|
| WFG-009 | Workflow / GUI Integrity | Partial Success Presented Complete | High | Confirmed | Open |
| WFG-005 | Workflow / GUI Integrity | Hidden Failure | Medium | Confirmed | Open |

---

## Detailed Findings

### WFG-009: Bulk delete ignores partial failure and emits fake success

Severity: High
Confidence: Confirmed
Domain: Workflow / GUI Integrity

Evidence:
- `packages/jinn/src/gateway/api.ts` (line ~641+): The `POST /api/sessions/bulk-delete` route calls `deleteSessions(ids)`, which returns a count of rows successfully deleted. The route then unconditionally emits a `session:deleted` WS event for **every** requested ID, even if `count < ids.length`.
- `packages/web/src/hooks/use-sessions.ts`: `useBulkDeleteSessions` caches out all requested IDs immediately upon an `onSuccess` 200 response.

Observed behavior:
- If a bulk delete operation partially fails (e.g. some sessions were locked or already removed), the UI removes all selected items locally and the gateway broadcasts deletion of all items, presenting a complete success.

Expected boundary:
- The backend must only emit `session:deleted` for the specific session IDs that were successfully deleted. The UI must verify the actual deleted count and surface any discrepancy.

Failure mechanism:
- The `bulk-delete` API handler trusts the input `ids` array for its success loop rather than checking which IDs were actually affected by the database transaction.

Break-it angle:
- Perform a bulk delete where one session ID is invalid or locked. The UI drops it, and all connected clients see a `session:deleted` event for the invalid ID.

Impact:
- The operator believes canonical state is purged, but undeleted items remain in the database (ghost state), leading to UI/API mismatches on subsequent reloads.

Recommended mitigation:
- Modify `deleteSessions` to return the specific list of successfully deleted IDs, rather than just a count.
- Iterate over the returned successful IDs to emit `session:deleted` events.
- Update the frontend mutation to only remove the verified deleted IDs.

Validation:
- Test: Submit a bulk delete with one valid and one invalid ID. Assert that only the valid ID emits a delete event and disappears from the UI cache.

---

### WFG-005: Bulk and single session deletions swallow network failures

Severity: Medium
Confidence: Confirmed
Domain: Workflow / GUI Integrity

Evidence:
- `packages/web/src/components/chat/chat-sidebar.tsx`: `handleDeleteEmployee` and `handleDelete` wrap their respective `mutateAsync` calls in a `try` block but use an empty `catch {}` block.

Observed behavior:
- If `bulkDeleteMutation` or `deleteSessionMutation` rejects (e.g., due to a 500 server error or network failure), the promise rejection is swallowed. The optimistic update does not run, but the operator is not provided any error message.

Expected boundary:
- Mutations triggered by operator action must provide visible feedback upon failure so the operator can diagnose the issue.

Failure mechanism:
- The `catch {}` block intentionally ignores all errors, leaving the UI state unchanged but failing to alert the operator.

Break-it angle:
- Disconnect the network or force the `/api/sessions/bulk-delete` endpoint to return 500. Click "Delete all sessions" for an employee. The UI does nothing.

Impact:
- Operator clicks a destructive action, nothing happens, and they are left guessing why the operation failed.

Recommended mitigation:
- Replace the empty `catch {}` with an error toast or inline alert showing the rejection reason.
- Alternatively, rely on a global mutation error handler if one exists, but do not swallow the rejection locally.

Validation:
- Test: Mock the API to return 500, trigger a delete, and assert an error message is rendered.

---

## Non-Findings

- **WFG-001 Fake Success (Approvals)**: `POST /api/approvals/:id/approve` verifies `approval.state === "pending"` and returns a 409 if stale. The frontend `approvals/page.tsx` catches the error and surfaces it.
- **WFG-010 Disabled Control Active Backend (Kanban "Run Now")**: The "Run Now" button is disabled when `!assigneeId`. The backend `POST /api/org/departments/:name/tickets/:id/dispatch` also checks for assignee presence and returns 400 `no-assignee`, matching the UI guard perfectly.
- **WFG-010 Disabled Control Active Backend (Cron)**: Triggering a disabled cron job via `POST /api/cron/:id/trigger` returns a 409 `Cron job is disabled`, matching the UI button state.
- **WFG-004 Stale Display (Kanban Board)**: Drag-and-drop operations optimistically update the UI, but errors from `persistBoardChange` clear the optimistic state and invoke `loadData()` to restore the canonical source of truth.
- **WFG-015 Bulk Selection Semantics Mismatch**: The bulk delete API accepts an explicit list of IDs (`ids` array), and the sidebar builds this array explicitly from the employee's `empSessions`. The backend does not recompute the set via a separate filter.

## Patch Order

1. Gateway API (`api.ts` & `sessions/registry.ts`): Change `deleteSessions` to return `string[]` of deleted IDs; update the `bulk-delete` handler to only iterate and emit `session:deleted` over the actually deleted IDs.
2. Web UI (`chat-sidebar.tsx`): Remove the empty `catch {}` blocks in `handleDelete` and `handleDeleteEmployee` and wire them to surface `window.alert` or toast notifications.
3. Web UI (`use-sessions.ts`): Ensure `useBulkDeleteSessions` relies on the returned `deletedIds` (or emits) to update the cache.

## Regression and Guardrail Tests

- `test_bulk_delete_partial_failure`: Send 2 valid IDs and 1 invalid ID to `/api/sessions/bulk-delete`. Assert HTTP 200, but only 2 `session:deleted` WS events are emitted, and the response indicates 2 successful deletions.
- `test_sidebar_delete_error_surfaced`: Mount `ChatSidebar`, mock the delete mutation to reject, trigger delete, assert error UI is visible to the operator.
