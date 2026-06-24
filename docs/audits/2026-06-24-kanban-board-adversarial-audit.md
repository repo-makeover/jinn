# Kanban Board Adversarial Audit — 2026-06-24

## Scope

Audited the Jinn web Kanban board end to end across dashboard loading, status movement, persistence, delete/restore, recycle-bin retention, live session reporting hooks, and malformed/adversarial inputs. The user asked for an adversarial walkthrough, including movement back and forth across statuses, verification that backlog/to-do/Kanban items load, delete/restore behavior, reporting/status updates, random-path checks, and unexpected characters.

## Evidence reviewed

- Frontend board loader/persister: `packages/web/src/routes/kanban/page.tsx`.
- Frontend board rendering/status columns: `packages/web/src/components/kanban/kanban-board.tsx`, `packages/web/src/lib/kanban/types.ts`, `packages/web/src/lib/kanban/store.ts`.
- Ticket creation/detail/delete/restore UI: `packages/web/src/components/kanban/create-ticket-modal.tsx`, `packages/web/src/components/kanban/ticket-detail-panel.tsx`.
- Gateway board APIs and hardening: `packages/jinn/src/gateway/api.ts`, `packages/jinn/src/gateway/board-service.ts`.
- Existing regression coverage: `packages/jinn/src/gateway/__tests__/board-service.test.ts`, `packages/jinn/src/gateway/__tests__/route-hardening.test.ts`, `packages/web/src/lib/kanban/__tests__/store.test.ts`.

## Validation commands run

- `pnpm --filter jinn-cli exec vitest run src/gateway/__tests__/board-service.test.ts src/gateway/__tests__/route-hardening.test.ts` — passed, 18 tests.
- `pnpm --filter @jinn/web exec vitest run src/lib/kanban/__tests__/store.test.ts` — passed, 4 tests.
- `pnpm --filter jinn-cli test -- board-service route-hardening` — failed because the package-level vitest invocation ran the broader jinn suite and hit unrelated Kokoro sidecar failures caused by missing `lsof`; it did not isolate to Kanban tests.

## Walkthrough results

### Loading backlog, to-do, and all board statuses

Implemented path: the page fetches `/api/org`, loops every returned department, calls `/api/org/departments/:name/board`, maps each ticket into a Kanban store, maps deleted tickets into a recycle-bin list, and displays warning banners for non-404 department load failures. Missing board files are tolerated as 404/not found and skipped.

Status coverage exists for all declared UI columns: `backlog`, `todo`, `in-progress`, `review`, `blocked`, and `done`; gateway status names are mapped both ways, including `in_progress` ↔ `in-progress`.

Risk: the frontend store is keyed only by `ticket.id`, so identical ticket IDs from two departments overwrite each other during load. This can make a backlog/to-do/Kanban item appear missing even though the gateway returned it. See Finding KANBAN-001.

### Moving cards back and forth across statuses

Implemented path: drag/drop calls `handleMoveTicket`, which calls `moveTicket`, updates `updatedAt`, and persists the whole board to the gateway. The gateway validates status values and rejects unknown status strings. The bidirectional frontend/backend mapping supports movement between backlog, to-do, in-progress, review, blocked, and done.

Risk: concurrent movement while a live session updates the same ticket is guarded by `baseUpdatedAt` optimistic concurrency in the gateway. Active session `source`/`sessionId` metadata is preserved when a fresh UI save omits it.

### Delete and restore

Implemented path: delete opens a confirmation dialog, removes the ticket from active UI state, sends `deletedIds` plus version information, and locally places it in the recently-deleted list when retention is nonzero. The gateway moves deleted active tickets into `deletedTickets`, prunes by retention, and removes restored tickets from the deleted list when they reappear in active tickets.

Risk: delete/restore is optimistic. If the PUT fails, the UI reloads from the gateway, which prevents hidden local divergence. Versioned deletion protects active session tickets from stale deletion.

### Reporting/live status

Implemented path: ticket detail panel fetches `/api/org/departments/:name/tickets/:id/session`, subscribes to session WebSocket events, polls every four seconds for in-progress tickets, and displays stalled/fallback/error signals when returned by the gateway.

Risk: the live section is gated primarily by `ticket.status === 'in-progress'` or a found session. Tickets with running session state but stale board status could under-report until board sync/reconciliation updates the ticket.

### Unexpected characters and malformed payloads

- UI title and description inputs accept arbitrary characters and render through React text nodes, which mitigates direct HTML/script execution in normal rendering paths.
- The gateway validates required object shape, non-empty `id` and `title`, valid status, valid priority, and valid complexity before writing.
- There is no apparent length cap for title/description/note fields. Very large strings can be persisted to board JSON and localStorage, making denial-of-service via storage bloat a residual risk. See Finding KANBAN-003.

## Findings

### KANBAN-001 — Duplicate ticket IDs across departments collapse on the frontend

Severity: High

Observed behavior: `loadData` loads every department board into a single object keyed only by `item.id`. If two departments contain `id: "same-id"`, the later department overwrites the earlier ticket. The UI count, columns, delete/restore list, and persistence payload can then omit one department's card. This directly violates the requirement that all backlog, to-do, and Kanban items load.

Expected behavior: tickets from distinct departments should remain distinct in frontend state, even when board-local IDs collide. The UI should either use a composite key (`department:id`) internally or reject/repair duplicate IDs across departments before display.

Evidence:

- `boardTickets[item.id] = mapBoardTicket(item, dept)` uses ticket ID alone as the store key while iterating all departments.
- `KanbanStore` is `Record<string, KanbanTicket>`, also keyed only by ticket ID.
- Delete/restore operations receive only `ticketId`, increasing ambiguity after a collision.

Remediation guidance:

- Use a stable UI key such as `${department}:${id}` while preserving the gateway `id` field for API calls; or enforce globally unique ticket IDs across all department boards at the gateway and surface duplicate conflicts before rendering.
- Add a web regression test with two departments returning the same `id` in different statuses and assert both cards are visible and persist to their original departments.

### KANBAN-002 — Assignee transfer across departments updates `department` but not `departmentId`

Severity: Medium

Observed behavior: changing a ticket assignee to an employee in another department updates the display `department` field but leaves `departmentId` unchanged. Persistence groups by `departmentId`, so the ticket is written back to the old department board with an assignee from a different department. The gateway correctly rejects this as a department-boundary violation, after which the UI reloads and loses the attempted reassignment.

Expected behavior: either cross-department reassignment should be explicitly blocked in the UI with a clear explanation, or both `department` and `departmentId` should move together and the ticket should be removed from the old board and written to the new board in one coherent save.

Evidence:

- `handleAssigneeChange` sets `updates.department = emp.department` but does not set `updates.departmentId`.
- `persistToApi` groups tickets by `ticket.departmentId` only.
- Gateway route-hardening tests prove the server rejects a ticket assigned to an employee from another department.

Remediation guidance:

- Decide product behavior: disallow cross-department assignee changes or support atomic cross-board moves.
- If supporting moves, update both `department` and `departmentId`, include an explicit delete from the previous department board, and add tests for transfer, save, reload, and restore.

### KANBAN-003 — Unbounded title/description/note sizes can bloat board JSON and localStorage

Severity: Medium

Observed behavior: the UI trims title on create/save but does not enforce maximum length for title, description, or appended notes. The gateway validates non-empty title but does not enforce size. Repeated very large note/title/description payloads can inflate `board.json`, slow board load, fill localStorage, and degrade dashboard usability.

Expected behavior: operator-facing board inputs should enforce documented maximum lengths at both UI and gateway layers, with clear validation errors.

Evidence:

- `CreateTicketModal` trims and checks non-empty title but has no max-length guard.
- `handleAppendNote` appends arbitrary note text into description.
- `assertValidBoardTicket` checks required fields and enums, but not field length.

Remediation guidance:

- Define limits, for example title ≤ 200 chars, description ≤ 20,000 chars, note append ≤ 5,000 chars.
- Enforce limits in the frontend form and in `assertValidBoardTicket`.
- Add adversarial tests for huge strings and unexpected Unicode/control characters.

## Positive controls observed

- Gateway accepts both legacy array boards and object boards with `tickets`, `deletedTickets`, and `retentionDays`.
- Gateway prunes deleted tickets according to bounded retention days.
- Gateway validates status, priority, and complexity rather than silently accepting contract drift.
- Gateway write path verifies that expected IDs are present after writing the board file.
- Active session tickets are preserved when omitted from manual board writes unless explicitly deleted with a fresh version.
- UI surfaces partial board-load failures and save failures instead of silently hiding them.

## Residual risks / not fully exercised

- I did not run a browser-based Playwright drag-and-drop session or screenshot because this task was an audit/report request and the available targeted unit tests cover the core store/API paths without launching the app.
- I did not mutate live `~/.jinn` runtime state or real operator boards.
- The broader package test invocation was not usable as a Kanban-specific validation because it ran unrelated Kokoro sidecar tests and failed on missing `lsof`.

## Recommended next actions

1. Fix KANBAN-001 first; duplicate IDs can cause actual cards to disappear from the dashboard.
2. Decide and implement explicit cross-department reassignment behavior for KANBAN-002.
3. Add input-size limits and adversarial Unicode/large-payload tests for KANBAN-003.
4. Add an end-to-end UI test that creates a ticket, moves it backlog → todo → in-progress → review → blocked → done → todo, deletes it, restores it, reloads the page, and verifies the gateway board payload at every step.
