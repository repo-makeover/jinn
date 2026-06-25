# Independent State-Transition Codebase Audit

Date: 2026-06-23T07:24:07-04:00
Repository: `/home/ericl/vscode_github_public/jinn`
Mode: audit-only, independent of previous findings
Skill loaded: `/home/ericl/Work/vscode/agent-skills/10_audit/audit-state-transition`

## Scope And Method

This audit used the requested `audit-state-transition` skill and its required base audit instructions. I inspected the live repository source, tests, documentation, Dory state, and available governance surfaces. I did not patch source files.

Coverage focused on lifecycle, status, queue, approval, archive, board, cron, file, connector, remote, auth, and config transitions across `packages/jinn` and `packages/web`. Generated output, vendored dependencies, and historical audit files were not used as finding evidence.

Startup observations:

- `AGENTS.md`, `README.md`, `packages/jinn/README.md`, model-specific pointer files, Dory state, docs inventory, source inventory, and package scripts were checked.
- `control/` and `governance/` contained no YAML control files in this checkout despite `AGENTS.md` naming them.
- `.giles/` was absent.
- Dory was present but already had an unrelated active interrupted Kiro session: `04e81f7b-1151-44c2-855e-3c2d5b3c403a`. I did not mutate or finalize that unrelated session.
- The working tree was clean before report creation.

Validation run for cited guard surfaces:

```text
pnpm --filter jinn-cli test -- src/gateway/__tests__/auth.test.ts src/gateway/__tests__/route-param-security.test.ts src/gateway/__tests__/hook-endpoint.test.ts src/sessions/__tests__/update-session-status-guard.test.ts src/cron/__tests__/scheduler.test.ts src/gateway/__tests__/files-security.test.ts

Test Files  6 passed (6)
Tests       23 passed (23)
```

## Surface Inventory

| Surface | Files inspected | State or boundary |
|---|---|---|
| HTTP/API gateway | `packages/jinn/src/gateway/api.ts`, `server.ts`, `http-helpers.ts`, route helpers | Auth, request mutation, CORS, JSON bodies |
| Session registry | `packages/jinn/src/sessions/registry.ts` | Durable sessions, messages, queues, archives, files |
| Session queue | `packages/jinn/src/sessions/queue.ts`, `gateway/api/session-dispatch.ts` | Pending/running/completed queue transitions |
| Web run lifecycle | `gateway/run-web-session.ts`, `status-reconciler.ts`, `session-turn-state.ts` | Running/waiting/error/idle, stall recovery, supersession |
| Approvals | `gateway/approvals.ts`, fallback approval API | Pending/approved/rejected and fallback resume side effects |
| Board/tickets | `board-service.ts`, `board-sync.ts`, `board-worker.ts`, `ticket-dispatch.ts`, Kanban UI | Ticket status, worker dispatch, board file writes |
| Cron | `cron/scheduler.ts`, `runner.ts`, `jobs.ts`, `sessions/manager.ts` | In-flight overlap, manual trigger, run logs |
| Files/uploads/remotes | `gateway/files.ts`, `shared/ssrf-guard.ts`, config types | Upload, transfer, SSRF, size limits |
| Connector callbacks | `sessions/callbacks.ts`, `connector-reply.ts`, Discord remote | Parent wake, notification relay, remote proxy |
| Talk delegation | `talk/routes.ts`, talk tests | Server-owned delegate spawn/continue |
| Config/settings | `shared/types.ts`, `shared/config.ts`, `gateway/config-sanitize.ts`, settings page | Config schema, redaction, PUT round-trip |

## Boundary Map

| Boundary | Expected authority | Observed guard |
|---|---|---|
| `/api/**` HTTP routes | Gateway token or auth cookie | Central gate in `server.ts:934-941` |
| `/ws` and `/ws/pty/:id` | Gateway token, plus PTY token for PTY | `server.ts:1000-1029` |
| Internal hook relay | Loopback, shared secret, timestamp, nonce | `hook-endpoint.ts:34-71`; tests cover replay |
| Session lifecycle | Registry owns durable status enum | `registry.ts:659-685`; tests cover illegal values |
| Queue item mutation | Registry and queue service | Item cancel is not session-scoped; pause is memory-only |
| Board ticket lifecycle | Board JSON plus session registry | Dispatch spans SQLite and board JSON without atomicity |
| Archive lifecycle | Archive row plus session deletion | Archive create and live deletion are not one transaction |
| Config lifecycle | `JinnConfig` / `validateConfigShape` | API has a stale duplicate allow-list |

## State Model Inventory

| Object | States | Legal Transitions | Gate/Guard | Mutation Layer | Durable? | Idempotent? |
|---|---|---|---|---|---|---|
| Session | `idle`, `running`, `waiting`, `error`, `interrupted` | create idle, run/wait/error/idle/interrupted, recover stale | `VALID_SESSION_STATUSES` at registry boundary | `sessions/registry.ts`, run managers | Yes, SQLite | Mostly; multi-write paths vary |
| Queue item | `pending`, `running`, `cancelled`, `completed` | enqueue -> pending, pending -> running/cancelled, running -> completed | Queue runner checks pending before running | `sessions/queue.ts`, registry queue helpers | Yes for item status; pause is not | Partial; cancel by item ID only |
| Queue pause | paused/unpaused per session key | pause, resume | In-memory `paused` set | `SessionQueue` | No | No persistence across restart |
| Approval | `pending`, `approved`, `rejected` | pending -> approved/rejected | `resolveApproval` pending precondition | JSON approval store and fallback API | Yes, JSON safe write | Terminal guard exists; fallback side effects are not atomic |
| Archive | archive row plus deleted live sessions | snapshot live sessions -> archive -> remove live | Archive kind validation | `api.ts`, registry | Partial | No transactional wrapper across archive/delete |
| Board ticket | `backlog`, `todo`, `in_progress`, `review`, `done`, `blocked` | manual moves, worker/manual dispatch to in_progress, sync to done/blocked | Board normalization, worker filters `todo` | Board JSON and ticket dispatch | Yes as file, but split from DB | Not crash-idempotent |
| Cron run | `running`, `success`, `error`, `skipped_overlap` | trigger -> running or skipped; running -> success/error | `inFlight` set | `cron/scheduler.ts`, run log | In-memory in-flight plus JSONL log | HTTP reports overlap; connector command does not |
| File upload | managed metadata plus disk file | upload -> file row + disk write | Filename/path guards, multipart cap | `gateway/files.ts`, registry files table | Partial | Some disk/DB partials remain possible |
| Config | YAML mapping | GET redacted config, PUT merge and validate | `validateConfigShape`, API allow-lists | `api.ts`, `shared/config.ts` | Yes, safe write | Stale allow-list rejects valid fields |
| Work state | derived `queued/running/waiting_on_human/blocked/completed/failed` | read-only projection | Precedence in `deriveWorkState` | `shared/work-state.ts`, status route | No, derived only | Not persisted |

## Findings Table

| ID | Severity | Confidence | STT lens | Title |
|---|---:|---|---|---|
| STT-JINN-001 | High | Confirmed | STT-002, STT-009 | Server-side callbacks re-enter authenticated API without credentials |
| STT-JINN-002 | Medium | Confirmed | STT-006 | Queue-item cancellation is not scoped to the route session |
| STT-JINN-003 | Medium | Confirmed | STT-011 | Queue pause state is not durable and pending work resumes after restart |
| STT-JINN-004 | Medium | Confirmed | STT-003 | Single-session delete is non-atomic |
| STT-JINN-005 | Medium | Confirmed | STT-003, STT-007 | Archive creation and live-session removal are non-atomic |
| STT-JINN-006 | Medium | Confirmed | STT-003, STT-010 | Board ticket dispatch spans DB and board file without atomicity |
| STT-JINN-007 | Medium | Confirmed | STT-003, STT-010 | Fallback approval side effects occur before approval resolution |
| CFG-JINN-008 | Medium | Confirmed | STT-009 | Config API allow-list is stale relative to live `JinnConfig` |
| IOP-JINN-009 | Medium | Confirmed for missing boundary; likely for exhaustion | IOP | JSON file upload lacks the multipart/session 50 MB boundary |
| WFG-JINN-010 | Low | Confirmed | WFG | Connector `/cron run` reports success when overlap was skipped |

## Detailed Findings

### STT-JINN-001: Server-side callbacks re-enter authenticated API without credentials

Severity: High
Confidence: Confirmed
Domain: State Transition / Reliability / Auth Boundary

Evidence:

- `packages/jinn/src/gateway/server.ts:934-941` gates every `/api/**` request through `isAuthenticatedRequest` before `handleApiRequest`.
- `packages/jinn/src/talk/routes.ts:477-490` posts to `/api/sessions` and `/api/sessions/:id/message` with only `Content-Type`.
- `packages/jinn/src/sessions/callbacks.ts:232-236` posts to `/api/connectors/:name/send` with only `Content-Type`.
- `packages/jinn/src/sessions/callbacks.ts:252-259` posts parent notifications to `/api/sessions/:id/message` with only `Content-Type`.
- `packages/jinn/src/connectors/discord/remote.ts:100-104` posts remote connector operations to `/api/connectors/discord/proxy` with only `Content-Type`.
- `packages/jinn/src/gateway/files.ts:622-626` posts file transfers to another gateway's `/api/files` with only `Content-Type`.
- `README.md:292-294` documents that CLI/API callers need `Authorization: Bearer <apiToken>` or `X-Jinn-Token`.

Observed behavior:

Server-owned workflows call protected API routes as plain JSON clients. Normal Node `fetch` does not carry the browser auth cookie, and these calls do not attach the gateway token. Talk delegation checks `r.ok` and will fail with 401. Parent callbacks and notification sends do not check `res.ok`, so a 401 can be silently treated as a completed fetch.

Expected boundary:

Server-side workflow transitions should either call in-process services directly or attach the current gateway token when intentionally re-entering the HTTP API.

Failure mechanism:

API auth was centralized at the server boundary, but several existing internal clients were not updated to satisfy that boundary.

Break-it angle:

With auth enabled, call `/api/talk/delegate` for `thread:"new"` or complete a child session with a parent. The internal call to `/api/sessions` or `/api/sessions/:id/message` receives 401 unless given a token.

Impact:

Talk delegation, attached talk wakes, parent child-session result propagation, hardcoded Discord alerts, remote Discord proxy, and remote file transfer are path-wired but auth-blocked. The most serious state impact is parent sessions not learning child success/failure.

Recommended mitigation:

Prefer in-process calls for parent/talk transitions. Where HTTP re-entry is retained, add `X-Jinn-Token` or `Authorization` from `ApiContext.apiToken` or `gateway.json`, and check `res.ok` on every fetch. Extend callback/talk/remote tests to return 401 and assert failure is visible.

### STT-JINN-002: Queue-item cancellation is not scoped to the route session

Severity: Medium
Confidence: Confirmed
Domain: State Transition / Cross-Scope Transition

Evidence:

- The route is `DELETE /api/sessions/:id/queue/:itemId`, but `api.ts:378-386` only checks that route session `:id` exists and then calls `cancelQueueItem(queueItemParams.itemId)`.
- `registry.ts:1329-1334` updates queue item status by `id` and `pending` status only, with no `session_id` or `session_key` predicate.
- Queue items have both `sessionId` and `sessionKey` fields (`registry.ts:1286-1292`).

Observed behavior:

Any authenticated caller that knows a pending queue-item ID can cancel it through any existing session route, even when the item belongs to another session key.

Expected boundary:

The mutation should require the queue item to belong to the route session or that session's `sessionKey`.

Failure mechanism:

Scope is checked at the route object level but not at the queue item mutation boundary.

Recommended mitigation:

Load the item and compare `item.sessionId`/`item.sessionKey` with the route session before canceling, or add a scoped SQL update such as `WHERE id = ? AND session_id = ? AND status = 'pending'`.

Regression test:

Create sessions A and B, enqueue an item for B, then call `DELETE /api/sessions/A/queue/<Bitem>`. Assert 404/409 and that B's item remains pending. Then assert A can cancel its own pending item.

### STT-JINN-003: Queue pause state is not durable and pending work resumes after restart

Severity: Medium
Confidence: Confirmed
Domain: State Transition / Durability

Evidence:

- `SessionQueue` stores paused queues only in `private paused = new Set<string>()` (`queue.ts:11-14`).
- Pause/resume mutate only that in-memory set (`queue.ts:53-64`).
- Startup recovery resets running queue rows to pending (`registry.ts:1352-1358`).
- Startup replay dispatches all pending web queue items without consulting any durable pause state (`api/session-dispatch.ts:52-77`).

Observed behavior:

An operator can pause a session queue, but after gateway restart the pause is lost and pending work can be re-dispatched.

Expected boundary:

If pause is an operator-facing transition, it should be durable or documented as process-local only.

Failure mechanism:

Queue item state is persisted, but the pause gate is not.

Recommended mitigation:

Persist paused session keys in SQLite or a small safe-written state file and have `resumePendingWebQueueItems` skip paused keys until an explicit resume.

Regression test:

Pause a session queue, enqueue pending work, simulate a new `SessionQueue` plus startup replay, and assert the item remains pending until resume.

### STT-JINN-004: Single-session delete is non-atomic

Severity: Medium
Confidence: Confirmed
Domain: State Transition / Partial Transition

Evidence:

- `deleteSession` runs separate statements for messages, queue items, and session deletion (`registry.ts:1048-1053`).
- `deleteSessions` uses a transaction for the same class of multi-table delete (`registry.ts:1056-1067`).
- Route teardown calls `deleteSession` after engine and queue cleanup (`api/session-dispatch.ts:43-49`).

Observed behavior:

If SQLite throws or the process exits after child-row deletion and before the session row deletion, the session can remain without its messages or queue rows.

Expected boundary:

Deleting one session should have the same transactional semantics as bulk delete.

Failure mechanism:

Single-delete and bulk-delete implement the same transition with different atomicity guarantees.

Recommended mitigation:

Wrap the single-session `messages`, `queue_items`, and `sessions` deletes in one SQLite transaction.

Regression test:

Inject a failure after deleting messages but before deleting the session row and assert rollback preserves all rows.

### STT-JINN-005: Archive creation and live-session removal are non-atomic

Severity: Medium
Confidence: Confirmed
Domain: State Transition / Partial Transition / Archived Object

Evidence:

- Archive POST snapshots sessions, then creates the archive at `api.ts:179-189`.
- It then loops over snapshots and calls `teardownAndDeleteSession` one session at a time (`api.ts:191-198`).
- `createArchive` inserts the archive row separately (`registry.ts:1129-1156`).
- `teardownAndDeleteSession` uses non-transactional single delete (`api/session-dispatch.ts:43-49`, `registry.ts:1048-1053`).

Observed behavior:

A crash or delete failure after archive creation can leave sessions both archived and live, or leave only part of the archived set removed.

Expected boundary:

The archive transition should either atomically mark the live sessions archived and remove them, or persist an explicit resumable archive-in-progress state.

Failure mechanism:

The archive row is durable before the live-session teardown sequence completes.

Recommended mitigation:

Move archive creation plus session-row deletion into one registry transaction where possible. If engine teardown must stay outside the DB transaction, persist a durable archive operation status and reconcile it on startup.

Regression test:

Inject failure after `createArchive` and assert the system cannot present both the archive and fully live sessions as a completed archive transition.

### STT-JINN-006: Board ticket dispatch spans DB and board file without atomicity

Severity: Medium
Confidence: Confirmed
Domain: State Transition / Partial Transition / Idempotency

Evidence:

- `ticket-dispatch.ts:105-124` creates a session row.
- `ticket-dispatch.ts:126-130` marks that session running.
- `ticket-dispatch.ts:132-136` mutates the board ticket to `in_progress` and writes `board.json`.
- `ticket-dispatch.ts:147-153` dispatches the engine run after those writes.
- The board worker only selects `todo` tickets (`board-worker.ts:149-153`).

Observed behavior:

If the process fails after the session row is created/running but before the board file is updated, the ticket can remain `todo` while a running session already exists for the same ticket.

Expected boundary:

Dispatch should be idempotent by ticket identity and should not create a hidden running session before the board transition is durable.

Failure mechanism:

The transition writes SQLite and a JSON board file without a transaction, operation marker, or idempotency key enforced at the durable boundary.

Recommended mitigation:

Persist a ticket dispatch operation keyed by department/ticket ID before creating the session, or make session creation idempotent on `sessionKey` and reconcile board state on startup before worker selection.

Regression test:

Inject failure between `updateSession` and `writeBoardTickets`, then retry dispatch and assert only one session can exist for that ticket.

### STT-JINN-007: Fallback approval side effects occur before approval resolution

Severity: Medium
Confidence: Confirmed
Domain: State Transition / Partial Transition / Idempotency

Evidence:

- The approve route first updates the session engine/model/status (`api.ts:521-529`).
- It then patches fallback metadata (`api.ts:530-533`) and deletes partial messages (`api.ts:534`).
- It only resolves the approval after those side effects (`api.ts:535`).
- `resolveApproval` itself correctly rejects non-pending approvals (`approvals.ts:111-124`).

Observed behavior:

If the process fails after the session is switched to fallback/running but before the approval is marked approved, the approval remains pending while the session has already transitioned.

Expected boundary:

Approval resolution and fallback session rollout should be one atomic operation or resumable with an explicit in-progress state.

Failure mechanism:

The terminal approval state is guarded, but the side effects that depend on approval are written before the terminal state.

Recommended mitigation:

Resolve the approval and fallback metadata/session updates in one durable operation where possible, or introduce a `running_on_fallback_pending_dispatch` marker and idempotent dispatcher.

Regression test:

Inject failure immediately before `resolveApproval`; on retry, assert there is not a second fallback dispatch and that the approval/session state reconciles deterministically.

### CFG-JINN-008: Config API allow-list is stale relative to live `JinnConfig`

Severity: Medium
Confidence: Confirmed
Domain: Config / State Mutation Layer

Evidence:

- `JinnConfig` includes `workspaces` (`types.ts:689-697`), `modelFallback` (`types.ts:766`), and `boardWorker` (`types.ts:776`).
- `loadConfig` normalizes and returns `boardWorker` on every load (`config.ts:251-254`).
- `validateConfigShape` accepts `gateway.turnStallInactivityMs`, `gateway.turnStallCeilingMs`, and `gateway.turnStallRetries` (`config.ts:88-123`) and validates `boardWorker` (`config.ts:174-226`).
- The API `KNOWN_KEYS` list omits `workspaces`, `modelFallback`, and `boardWorker` (`api.ts:1230-1247`).
- The API `KNOWN_GATEWAY_KEYS` list omits the turn-stall watchdog keys (`api.ts:1257-1267`).
- The settings page loads full config and saves the same object via `api.updateConfig(config)` (`settings/page.tsx:99-109`, `settings/page.tsx:164-169`).

Observed behavior:

A valid runtime config can be rejected by `PUT /api/config` as having unknown keys. Because `GET /api/config` returns normalized `boardWorker`, a full settings round-trip can include a key the API write path does not accept.

Expected boundary:

The API mutation layer should use the same schema/shape validation as runtime config loading.

Failure mechanism:

Config authority is duplicated between `JinnConfig`/`validateConfigShape` and a controller-local allow-list.

Recommended mitigation:

Remove the duplicate API allow-list or derive it from the shared config validator. Add tests that `GET /api/config` output can be PUT back unchanged.

### IOP-JINN-009: JSON file upload lacks the multipart/session 50 MB boundary

Severity: Medium
Confidence: Confirmed for missing boundary; likely for memory/disk exhaustion
Domain: Input / Resource Boundary

Evidence:

- Local `readBody` in `files.ts:272-278` concatenates all chunks without a byte cap.
- JSON upload parses that unbounded body (`files.ts:422-427`).
- Base64 upload decodes the full `content` into a buffer (`files.ts:444-449`).
- URL upload fetches and buffers the full `arrayBuffer` (`files.ts:452-461`).
- Multipart upload has a 50 MB cap (`files.ts:355-359`).
- Session attachment upload checks 50 MB for base64 and URL fetch buffers (`files.ts:805-829`).

Observed behavior:

The JSON `/api/files` path accepts much larger request bodies and fetched responses than the sibling file-upload paths.

Expected boundary:

All upload paths should enforce the same maximum before buffering.

Failure mechanism:

`files.ts` uses a separate local body reader instead of the shared capped helper, and it applies no post-decode/post-fetch limit.

Recommended mitigation:

Use a capped body reader for JSON upload, reject base64 payloads whose decoded length exceeds the configured maximum, and stream or cap URL fetches before buffering.

Regression test:

POST JSON `/api/files` with content over 50 MB and assert 413/400 before full decode. Serve a URL with content over 50 MB and assert rejection.

### WFG-JINN-010: Connector `/cron run` reports success when overlap was skipped

Severity: Low
Confidence: Confirmed
Domain: Workflow / Operator Feedback

Evidence:

- `startCronJobRun` returns `{ started: false, run }` and logs `skipped_overlap` when a job is already in flight (`scheduler.ts:89-102`).
- HTTP manual trigger checks that flag and returns 409 (`api.ts:929-932`).
- `triggerCronJob` discards the skipped flag and returns the job even when not started (`scheduler.ts:114-119`).
- Connector command replies `Triggered cron job` whenever `triggerCronJob` returns a job (`manager.ts:850-854`).

Observed behavior:

The connector `/cron run` command can tell an operator that a job was triggered even when it was skipped due to overlap.

Expected boundary:

Connector and HTTP triggers should expose the same run-start result.

Failure mechanism:

The scheduler has a correct state result, but the connector helper collapses it to job existence.

Recommended mitigation:

Return a structured result from `triggerCronJob` and have `/cron run` reply with an overlap/skipped message when `started` is false.

Regression test:

Mock an in-flight job, call connector `/cron run`, and assert the reply says already running or skipped, not triggered.

## Required STT Checklist

| Skill item | Outcome |
|---|---|
| STT-001 Illegal Transition | Confirmed through cross-session queue cancel (`STT-JINN-002`) and fallback/session side effects before approval terminalization (`STT-JINN-007`). Illegal session status strings are guarded as a non-finding. |
| STT-002 Gate Bypass | Confirmed for server-side API re-entry without credentials (`STT-JINN-001`) and route-level queue scope not enforced at mutation (`STT-JINN-002`). |
| STT-003 Partial Transition | Confirmed for delete, archive, board dispatch, and fallback approval (`STT-JINN-004` through `STT-JINN-007`). |
| STT-004 Missing Status | Non-finding for session status enum. Finding for missing durable pause status (`STT-JINN-003`). |
| STT-005 Ambiguous Status | Mostly non-finding: session/work-state precedence is explicit. Connector cron command has misleading operator state (`WFG-JINN-010`). |
| STT-006 Cross-Scope Transition | Confirmed for queue cancel by item ID without route-session scope (`STT-JINN-002`). |
| STT-007 Rejected/Archived Object Mutable | No direct archived-object mutation route observed. Archive creation itself is partial, so archived/live dual presence is possible (`STT-JINN-005`). |
| STT-008 Review Gate Skipped | Approval terminal mutation is guarded; fallback approval side effects are not atomic with that gate (`STT-JINN-007`). |
| STT-009 State Mutation In Wrong Layer | Confirmed for duplicated config schema in API controller (`CFG-JINN-008`) and server-side HTTP re-entry (`STT-JINN-001`). |
| STT-010 Idempotency Missing | Confirmed under crash/replay for board dispatch and fallback approval side effects (`STT-JINN-006`, `STT-JINN-007`). |
| STT-011 Transition Not Durable | Confirmed for queue pause (`STT-JINN-003`). |
| STT-012 Derived State Becomes Authority | Non-finding for `/api/work`: derived work state is read-only and not persisted (`work-state.ts:48-56`, status route `routes/status.ts:120-138`). Board derived/session sync issues are captured under partial transition rather than as a separate derived-authority finding. |

## Non-Findings

- Illegal session statuses are rejected at the registry boundary: `VALID_SESSION_STATUSES` and `updateSession` validation are in `registry.ts:659-685`, with tests in `update-session-status-guard.test.ts:11-37`.
- Approval terminal state has a direct pending precondition: `approvals.ts:111-124`; fallback side-effect atomicity is a separate finding.
- API auth is centrally enforced for external callers: `server.ts:934-941`, with tests for bearer/header/cookie tokens and PTY token binding in `auth.test.ts:38-64`.
- Route parameter decoding rejects encoded slash, backslash, dot segments, and malformed encodings: `match-route.ts:11-22`; tests in `route-param-security.test.ts:4-19`.
- Hook endpoint replay and loopback checks are present: `hook-endpoint.ts:34-71`; tests cover wrong secret, non-loopback remote, replay, and stale timestamp in `hook-endpoint.test.ts:53-103`.
- SSRF checks exist before server-side URL fetches in the file paths: `files.ts:452-454`, `files.ts:821-823`, backed by `ssrf-guard.ts:64-105`. Residual DNS rebinding/TOCTOU is explicitly documented in `ssrf-guard.ts:14-15`.
- Automated board worker selection is status-gated to `todo` tickets: `board-worker.ts:149-153`. Manual "Run now" bypasses idle/schedule gates by design in the UI.
- Cron HTTP manual trigger correctly reports overlap as 409; only the connector command collapses that state.

## Break-It Review

| Attack | Result |
|---|---|
| Use a queue item ID from another session in the route | Confirmed cancellable if pending (`STT-JINN-002`). |
| Pause queue, restart gateway, then observe pending replay | Confirmed pause is not durable (`STT-JINN-003`). |
| Crash between delete child-row and session-row delete | Confirmed partial delete window (`STT-JINN-004`). |
| Crash after archive row insertion before all live deletes | Confirmed partial archive window (`STT-JINN-005`). |
| Crash after ticket dispatch creates session before board write | Confirmed orphan/duplicate dispatch window (`STT-JINN-006`). |
| Fail before fallback approval resolution | Confirmed pending approval plus rolled session window (`STT-JINN-007`). |
| Round-trip `GET /api/config` through settings save | Confirmed stale allow-list can reject normalized valid keys (`CFG-JINN-008`). |
| Oversized JSON upload body/base64/URL | Confirmed no matching 50 MB cap (`IOP-JINN-009`). |
| Trigger cron overlap through connector | Confirmed false success reply (`WFG-JINN-010`). |

## Patch Order

1. Fix server-side API re-entry first: talk delegation, callbacks, remote Discord, and file transfer need auth-aware or in-process paths.
2. Scope queue-item cancel at the registry mutation boundary.
3. Make queue pause durable or document and rename it as process-local.
4. Transactionalize single-session delete and archive/delete state changes.
5. Add idempotency/reconciliation for board ticket dispatch.
6. Make fallback approval resolution and rollout atomic or resumable.
7. Remove duplicate/stale config allow-lists and add config round-trip tests.
8. Apply upload body/fetch caps consistently across JSON uploads.
9. Return structured cron trigger results to connector commands.

## Regression And Guardrail Tests

- `talk/routes` route test: `/api/talk/delegate` can spawn/continue with auth enabled, or uses in-process dispatch without HTTP re-entry.
- `sessions/callbacks` test: 401 from internal callback is not swallowed; fixed path includes token or bypasses HTTP.
- `RemoteDiscordConnector` and file transfer tests: configured remote with token succeeds; no-token remote fails visibly.
- Queue cancel test: route session A cannot cancel queue item for session B.
- Queue pause restart test: paused queue remains paused across startup replay.
- Single delete injected-failure test: no partial message/queue deletion survives rollback.
- Archive injected-failure test: archive/live-session state is all-or-nothing or explicitly resumable.
- Ticket dispatch injected-failure test: duplicate sessions cannot be created for one board ticket.
- Fallback approval injected-failure test: retry does not double-dispatch fallback.
- Config API test: `GET /api/config` payload can be PUT back unchanged.
- JSON upload test: oversized JSON body/base64/URL response is rejected before full buffering.
- Connector cron test: overlap returns a skipped/already-running reply.

## Validation Limits

- This was a static, source-backed audit plus targeted guard-test validation. I did not run the full `pnpm test`, `pnpm typecheck`, `pnpm lint`, or runtime gateway flows.
- I did not mutate Dory because the active Dory session belongs to an unrelated interrupted Kiro implementation.
- I did not write or modify source code; this report is a local audit artifact under the repo's ignored audit tree.
- Findings involving crash windows are confirmed for missing atomicity from code structure; exact post-crash database/file states were not runtime-reproduced.
