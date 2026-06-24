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

### Kanban recycle bin
- `packages/jinn/src/gateway/board-service.ts`
- `packages/web/src/routes/kanban/page.tsx`
- Deleted kanban tickets move into a recycle bin instead of being purged immediately.
- The retention window defaults to 3 days and is configurable from 0 to 7 days in the kanban UI.
- `0` means immediate purge.
- Tickets remain restorable from the "Recently deleted" section until their retention window expires.

## CLI

### Provider-neutral matrix orchestration dry-runs and observe surfaces
- `packages/jinn/src/orchestration/*`
- `packages/jinn/src/cli/orchestration.ts`
- `packages/jinn/bin/jinn.ts`
- `jinn workers list --config-dir <dir> [--json]` loads explicit matrix worker config and prints available workers.
- `jinn scheduler allocate <task-file> --config-dir <dir> --dry-run [--json]` validates a task request and performs fake-worker allocation only.
- `jinn scheduler simulate <scenario-file> --config-dir <dir> [--json]` runs deterministic allocation/release/heartbeat/expiry scenario steps against in-memory scheduler state.
- `jinn scheduler plan <task-file> --config-dir <dir> [--db-path <path>] [--json]` expands a coordinator template into an observe-only allocation plan.
- `jinn leases list --config-dir <dir> [--db-path <path>] [--json]` lists durable orchestration leases when a DB exists.
- `jinn queue list --config-dir <dir> [--db-path <path>] [--json]` lists durable blocked-resource queue items when a DB exists.
- `jinn run --mode single_worker|single_worker_with_review --task <file> [--json]` posts a live task brief to the running gateway; the daemon must have `orchestration.enabled: true`.
- Dry-run/list/plan commands remain inert and explicit-path based. `jinn run` is opt-in live execution through the daemon-owned scheduler and existing Jinn session path.
- Fidelity gaps:
  - A SQLite store, persistent scheduler wrapper, and daemon runtime now exist for leases, allocations, queue items, and telemetry events.
  - Provider-adapter contract modules now exist for `stub`, `manual`, `local_echo`, `mock`, and opt-in live adapters for existing Jinn engine ids via an injected engine map. The default registry used by dry-runs remains inert-only.
  - Usage-aware headroom helpers can filter unavailable, exhausted, or below-threshold live engines when future live orchestration opts in; simulation mode does not call this filter.
  - The public CLI dry-runs and plans do not write the durable store; list commands read existing durable state only.
  - Worktree execution, dashboard controls, board-worker routing, cross-family live policy, and persistent telemetry aggregation are later milestones.

## API

### Provider-neutral matrix orchestration observe routes
- `packages/jinn/src/gateway/api/orchestration-routes.ts`
- `GET /api/orchestration/workers` returns configured workers.
- `GET /api/orchestration/leases` returns existing durable orchestration leases.
- `GET /api/orchestration/queue` returns blocked-resource queue items, including missing roles and resume triggers.
- `GET /api/orchestration/allocations` returns existing durable allocations.
- `POST /api/orchestration/run` executes `single_worker` and `single_worker_with_review` tasks through the daemon runtime.
- These routes inherit the existing `/api/*` gateway token gate; unsupported methods on each path return `405`.
- Fidelity gaps:
  - GET routes observe state only; `POST /api/orchestration/run` is the only M5 mutating route.
  - The run route allocates leases, creates sessions, heartbeats leases on the existing 5s runner interval, and releases leases on terminal paths.
  - If no orchestration runtime exists, state routes retain the no-daemon/test fallback; the run route fails instead of opening its own live scheduler.
  - No worktrees, dashboard controls, cancel API, or board-worker routing are wired yet.

### Kiro headless engine and estimated credit gauge
- `kiro` is a registered headless engine. Work turns spawn:
  - `kiro-cli chat --no-interactive --trust-all-tools --model <model> [--effort <level>] [--resume-id <engineSessionId>] <prompt>`
- Session continuity is wired through Kiro's `--resume-id` flag. For fresh sessions, Jinn attempts a bounded `kiro-cli chat --list-sessions --format json` lookup and stores the newest returned session id when available.
- Kiro stdout is ANSI-stripped and the `Credits: X.XX - Time: ...` / `Credits: X.XX • Time: ...` footer is removed from the assistant answer. The footer value is accumulated in `~/.jinn/usage/kiro-credits.json`.
- The Kiro usage gauge is an estimate, not an authoritative provider quota. It uses `engines.kiro.creditBudget` and `engines.kiro.billingAnchorDay` to calculate remaining percentage, state, and reset time. If Kiro reports credit exhaustion during an actual turn, the normal usage-limit recovery path treats it as a blocking limit even if the local estimate was stale.
- Fidelity gaps:
  - Kiro credit usage depends on the CLI footer text; if Kiro changes that footer, the local ledger may stop updating until the parser is updated.
  - No stable local Kiro quota endpoint is wired, so the gauge cannot verify account-side credit balance.
  - This source tree does not contain a scheduler/provider map architecture for routing Kiro to AWS. No Kiro-to-AWS provider mapping was added.

### `GET /api/org/departments/:name/tickets/:id/session`
- Best-effort ticket-to-session resolver for the kanban panel.
- Returns `200 { found:false }` when no live or recent matching session can be resolved.
- When a match exists, returns compact session state plus the latest transcript tail (capped to 8 messages).
- Matching prefers the most recently active session and resolves by:
  - `session.transportMeta.boardTicketId === ticket.id`
  - persisted `ticket.sessionId` matching the session id or engine session id
  - channel/session keys containing the ticket id
