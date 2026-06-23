# Feature Inventory

## Web UI

### Kanban ticket live session inspector
- `packages/web/src/components/kanban/ticket-detail-panel.tsx`
- In-progress tickets can show a live session summary in the detail panel:
  - session status
  - engine and model
  - accumulated session cost
  - relative last-activity heartbeat
  - latest transcript tail (capped to 8 messages)
  - link to open the full live chat view
- This is session-level liveness only. It reflects the gateway session state and transcript, not process-level CPU/PID health.

## API

### `GET /api/org/departments/:name/tickets/:id/session`
- Best-effort ticket-to-session resolver for the kanban panel.
- Returns `200 { found:false }` when no live or recent matching session can be resolved.
- When a match exists, returns compact session state plus the latest transcript tail (capped to 8 messages).
- Matching prefers the most recently active session and resolves by:
  - `session.transportMeta.boardTicketId === ticket.id`
  - persisted `ticket.sessionId` matching the session id or engine session id
  - channel/session keys containing the ticket id
