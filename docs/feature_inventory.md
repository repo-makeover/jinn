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

### Kanban optimistic save protection
- `packages/jinn/src/gateway/board-service.ts`
- `packages/web/src/routes/kanban/page.tsx`
- Web board saves send each ticket's last observed `updatedAt` as `baseUpdatedAt`.
- The gateway rejects stale ticket updates or stale deletion attempts with HTTP `409`
  and `reason: "board-conflict"` instead of overwriting newer server state.
- Running board-linked tickets preserve active `sessionId` and `source` metadata across
  fresh saves so a stale layout cannot silently move a dispatched ticket back to `todo`.

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
- `jinn run --mode single_worker|single_worker_with_review|dual_lane --task <file> [--json]` posts a live task brief to the running gateway; the daemon must have `orchestration.enabled: true`.
- `jinn dual-lane select --task-id <id> --winner openai|anthropic [--json]` explicitly selects a completed dual-lane winner, archives the loser diff/metadata, and removes the loser worktree.
- `jinn continuations list [--json]` lists durable blocked/failed continuation records through the running gateway.
- `jinn continuations retry --task-id <id> --coordinator-id <id> [--json]` re-attempts a previously failed live continuation through the running gateway.
- `jinn scheduler stats [--path <file>] [--json]` summarizes append-only orchestration run telemetry by provider, family, role, worker, and disposition.
- `jinn worktree create <task-file> [--lane <name>] [--json]` creates a managed git worktree for a task/lane when the task cwd is inside a git repo.
- `jinn worktree diff <task-file> [--lane <name>] [--json]` prints the diff for a managed task/lane worktree.
- `jinn worktree cleanup <task-file> [--lane <name>] [--json]` removes a managed task/lane worktree.
- Dry-run/list/plan commands remain inert and explicit-path based. `jinn run` is opt-in live execution through the daemon-owned scheduler and existing Jinn session path.
- `single_worker_with_review` run output includes reviewer-family policy explanations. Same-family reviewer fallback is forbidden by default and only enabled by `orchestration.sameFamilyReviewerFallback: true`.
- Live run output can now end in `ok: false, state: "failed"` when any leased role session errors; blocked runs remain `state: "blocked_resource"`.
- Fidelity gaps:
  - A SQLite store, persistent scheduler wrapper, and daemon runtime now exist for leases, allocations, queue items, and telemetry events.
  - Provider-adapter contract modules now exist for `stub`, `manual`, `local_echo`, `mock`, and opt-in live adapters for existing Jinn engine ids via an injected engine map. The default registry used by dry-runs remains inert-only.
  - Live orchestration allocation applies usage-aware headroom before creating leases, filtering unavailable, exhausted, or below-threshold engines while simulation mode stays deterministic.
  - Worktree execution is task/lane-scoped: implementation lanes can run in isolated git worktrees, reviewers inspect generated diff bundles instead of the implementation tree, and the runtime reaper removes abandoned managed worktrees.
  - Dual-lane mode allocates OpenAI and Anthropic implementer roles atomically, sends both lanes an identical prompt in isolated worktrees, returns a deterministic comparison report, and requires explicit human selection. It does not apply the selected patch to the base repo.
  - Board-originated ticket dispatch is scheduler-aware when `orchestration.enabled: true`: manual dispatch and the board worker allocate an exact synthesized org worker role before session launch and release the lease after the run settles.
  - Durable telemetry is appended to `~/.jinn/logs/orchestration-telemetry.jsonl` for scheduler-owned live runs, dual-lane selection outcomes, and scheduler-owned board/manual ticket dispatch. Prompts, raw model output, raw diffs, cwd/worktree paths, credentials, headers, and env are not logged.
  - `orchestration.empiricalRouting: true` lets runtime startup use historical telemetry scores as a deterministic worker tie-break after hard constraints and explicit tier/cost preferences.
  - Runtime reload/shutdown paths preserve active orchestration work, replay deferred org/config refresh after drain, recover stale `dispatching` continuations, and release owned leases before closing persistent state.
  - The public CLI dry-runs and plans do not write the durable store; list commands read existing durable state only.
  - Dashboard controls and automatic patch integration are later milestones.

## API

### Provider-neutral matrix orchestration observe routes
- `packages/jinn/src/gateway/api/orchestration-routes.ts`
- `GET /api/orchestration/workers` returns configured workers.
- `GET /api/orchestration/leases` returns existing durable orchestration leases.
- `GET /api/orchestration/queue` returns blocked-resource queue items, including missing roles and resume triggers.
- `GET /api/orchestration/allocations` returns existing durable allocations.
- `GET /api/orchestration/continuations` returns durable blocked/failed continuation records.
- `POST /api/orchestration/continuations/retry` re-attempts a failed continuation through the live runtime.
- `POST /api/orchestration/run` executes `single_worker`, `single_worker_with_review`, and `dual_lane` tasks through the daemon runtime.
- `POST /api/orchestration/dual-lane/select` selects a completed dual-lane winner and archives/discards the loser lane.
- Run responses include `reviewPolicy.explanations` for reviewer selection, explicit same-family fallback, and blocked reviewer allocation.
- Blocked live runs persist a durable continuation keyed by task/coordinator and auto-resume on later resource availability.
- These routes inherit the existing `/api/*` gateway token gate; unsupported methods on each path return `405`.
- Fidelity gaps:
  - GET routes observe state only; `POST /api/orchestration/run` is the only M5 mutating route.
  - The run route allocates leases, creates sessions, heartbeats leases on the existing 5s runner interval, passes isolated worktree cwd values to eligible implementation sessions, hands reviewers diff bundles, and releases leases on terminal paths.
  - If no orchestration runtime exists, state routes retain the no-daemon/test fallback; the run route fails instead of opening its own live scheduler.
  - No dashboard controls, cancel API, or automatic dual-lane patch application are wired yet.

### Kanban ticket dispatch scheduler bridge
- `packages/jinn/src/gateway/org-worker-bridge.ts`
- `packages/jinn/src/gateway/ticket-dispatch.ts`
- `packages/jinn/src/gateway/board-worker.ts`
- `packages/jinn/src/gateway/orchestration-runtime-factory.ts`
- When `orchestration.enabled: true`, manual ticket dispatch and the background board worker allocate an exact in-memory org-derived scheduler role before creating/running the board-linked session.
- A busy exact worker returns `orchestration-busy` and leaves the ticket in `todo`; no orchestration queue item is created because the board is already the durable backlog.
- Missing runtime or missing org-worker mapping returns `orchestration-unavailable` or `orchestration-worker-unmapped` and does not fall back to legacy direct dispatch.
- The manual dispatch route maps scheduler-specific failures to HTTP `409`.
- When orchestration is disabled, ticket dispatch keeps the legacy direct dispatch behavior.

### Internal session notification delivery
- `packages/jinn/src/sessions/notification-sink.ts`
- `packages/jinn/src/gateway/notification-sink.ts`
- Gateway-owned session callbacks use an injected in-process notification sink for
  parent-session, attached-talk, rate-limit, completion, and connector notifications.
- The direct sink avoids localhost loopback HTTP calls and repeated config file parsing
  on gateway hot paths. Callback helpers retain the old loopback path as a fallback
  for non-gateway and compatibility contexts.

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

## Runtime Paths

### Live Jinn path context
- `packages/jinn/src/shared/paths.ts`
- Runtime path exports remain import-compatible, but they now refresh from a shared
  path context instead of being fixed permanently at first module evaluation.
- Tests and runtime helpers can call `setJinnHomeForTest(<path>)` or
  `refreshJinnPaths()` to redirect `JINN_HOME`-derived paths without a module reset.
- `getJinnPaths()` returns an explicit snapshot for code that should avoid reading
  mutable module bindings directly.
