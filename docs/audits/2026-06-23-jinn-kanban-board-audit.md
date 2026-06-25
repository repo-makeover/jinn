# Jinn Kanban Board Audit

- Date: 2026-06-23
- Actor: Codex
- Authority: audit-only
- Repo: `/home/ericl/vscode_github_public/jinn`
- Requested lenses: workflow, temporal, internal API contract, concurrency, negative space, input/output path, cascade, data integrity, state transition, Node.js architecture, architecture seam
- Shared base loaded from: `/home/ericl/Work/vscode/agent-skills/00_common/audit-base/*`

## Scope

Focused audit of the Kanban/board pipeline:

- web Kanban load, edit, delete, restore, retention, and dispatch flows
- board persistence and merge semantics
- ticket dispatch and board-worker entry points
- ticket-to-session lookup surfaces

Read but not audited repo-wide: unrelated engine, connector, cron, and chat surfaces.

## Baseline Note

- `git status --short` -> clean
- `git log --oneline -5` -> reviewed recent board/session changes through `3269760`
- `git diff --check` -> clean
- Python-specific baseline commands from the internal-API skill were not applicable in this Node/TypeScript repo
- Targeted validation ran:
  - `pnpm --dir packages/jinn test -- src/gateway/__tests__/board-service.test.ts src/gateway/__tests__/board-sync.test.ts src/gateway/__tests__/session-query-routes.test.ts src/gateway/__tests__/ticket-dispatch-route.test.ts`
  - result: passed, 4 files / 37 tests

## Orientation Notes

- `AGENTS.md` and `README.md` were read
- `PROJECT_HANDOFF_MASTER.md` missing
- `docs/INDEX.md` missing
- `control/` has no YAML files in this checkout
- `governance/` has no policy YAML files in this checkout
- `.dory/` exists and reports a recoverable interrupted active session for unrelated Kiro work; I inspected it but did not mutate it to avoid clobbering that continuity trail

## Skill Escalation

| Trigger | Escalated lens | Why |
|---|---|---|
| Board JSON is canonical state for Kanban mutations | Data Integrity, State Transition | Department scope and lifecycle ownership matter |
| Manual dispatch + board worker + UI writes touch the same ticket state | Concurrency, Cascade | Duplicate or stale writes can propagate to live sessions |
| Kanban UI renders API state and operator controls | Workflow | Hidden failures and scope drift can mislead operators |
| Board API is repo-owned, not external | Internal API, Architecture | Contract validation and ownership belong inside this repo |

## Surface Inventory

| Surface | Producer | Consumer | Boundary | Notes |
|---|---|---|---|---|
| `packages/web/src/routes/kanban/page.tsx` | browser UI | `/api/org/departments/:name/board`, `/dispatch` | workflow, state, scope | full-board writer per department |
| `packages/jinn/src/gateway/board-service.ts` | API + sync code | `board.json` | persistence, schema | accepts and serializes board payloads |
| `packages/jinn/src/gateway/ticket-dispatch.ts` | manual dispatch + board worker | session registry + board JSON | state transition, scope | creates sessions from board tickets |
| `packages/jinn/src/gateway/board-worker.ts` | scheduler loop | `dispatchTicket()` | temporal, concurrency | auto-dispatches todo work |
| `packages/jinn/src/gateway/api.ts` board routes | web/API clients | board service | contract, error shape | honest 500 on corrupt board |
| `packages/jinn/src/sessions/queue.ts` | dispatch path | queued runs | concurrency | serializes after session creation |

## Findings Table

| ID | Severity | Confidence | Lens | Summary |
|---|---|---|---|---|
| DAT-JINN-001 | High | Confirmed | Data Integrity, State Transition, Internal API | Cross-department assignee changes do not move board scope, and dispatch does not verify department membership |
| WFG-JINN-001 | Medium | Confirmed | Workflow | Per-department board load failures are swallowed, so missing/corrupt boards disappear silently in the UI |
| WFG-JINN-002 | Medium | Confirmed | Workflow, Internal API | The Kanban page collapses per-department recycle-bin retention into one global control and overwrites all boards with it |
| ARC-JINN-001 | Medium | Confirmed | Internal API, Architecture | `PUT /board` accepts arbitrary ticket objects and the UI coerces unknown statuses to `todo` instead of rejecting drift |
| CON-JINN-001 | High | Likely | Concurrency, Cascade | Board dispatch and full-board writes are check-then-act / last-writer-wins, so overlapping writers can duplicate work or drop manual edits |

### DAT-JINN-001: Cross-department assignee changes do not move board scope, and dispatch does not verify department membership

Severity: High
Confidence: Confirmed
Domain: Data-Integrity

Evidence:
- `packages/web/src/routes/kanban/page.tsx:399-409`
- `packages/web/src/routes/kanban/page.tsx:246-287`
- `packages/jinn/src/gateway/ticket-dispatch.ts:54-58`
- `packages/jinn/src/gateway/ticket-dispatch.ts:88-92`
- `packages/jinn/src/gateway/ticket-dispatch.ts:103-115`

Observed behavior:
- Reassigning a ticket to an employee in another department updates `department` in UI state but leaves `departmentId` untouched, and persistence groups tickets by `departmentId`.
- Server dispatch then resolves the assignee by global employee name and never checks that the assignee still belongs to the board department.

Expected boundary:
- A ticket's persisted board scope must move with a cross-department reassignment, or the API must reject assignees outside the board's department.

Failure mechanism:
- The UI updates only a display field (`department`) while persistence keys on `departmentId`.
- The backend trusts the board/assignee combination and does not enforce department membership at the mutation boundary.

Break-it angle:
- Move a software-delivery ticket to an employee from another department, then run it. The ticket stays on the original board while the created session is attributed to the foreign employee.

Impact:
- Cross-department contamination of board state, misleading ticket ownership, and dispatch metadata that no longer matches the board that launched it.

Adjacent failure modes:
- `CON-JINN-001`
- `WFG-JINN-001`

Recommended mitigation:
- Update both `department` and `departmentId` atomically on assignee changes, or forbid cross-department assignment entirely.
- Enforce `employee.department === boardDepartment` in `dispatchTicket()`.
- Add negative tests for foreign-department assignee changes and dispatch.

Validation:
- Test: reassigning to a foreign department moves the ticket to the new board or is rejected.
- Test: dispatch with a foreign-department assignee returns a failure and creates no session.

Non-goals:
- Do not redesign the whole org model.

### WFG-JINN-001: Per-department board load failures are swallowed, so missing/corrupt boards disappear silently in the UI

Severity: Medium
Confidence: Confirmed
Domain: Workflow-GUI

Evidence:
- `packages/web/src/routes/kanban/page.tsx:189-202`
- `packages/jinn/src/gateway/api.ts:1012-1024`

Observed behavior:
- The Kanban page catches every board-fetch failure with an empty `catch {}` and proceeds as if the department simply had no board.
- The backend already distinguishes corrupt boards with a 500 and `"board.json is corrupt"`.

Expected boundary:
- A department board fetch failure should surface as an operator-visible error or partial-load warning, not be normalized into "no board here".

Failure mechanism:
- UI workflow truth is lost at the per-department fetch boundary; all failures collapse into silent omission.

Break-it angle:
- Corrupt one department's `board.json`; the API emits 500, but the UI quietly hides that department's tickets and offers no diagnosis.

Impact:
- Operators can miss backlog items and treat a broken board as an empty one.

Adjacent failure modes:
- `WFG-JINN-002`
- `ARC-JINN-001`

Recommended mitigation:
- Preserve the distinction between 404/no-board and 500/corrupt-or-failed board.
- Surface partial-load errors in the Kanban page with department attribution.
- Add a UI test for mixed-success board loads.

Validation:
- Test: one department 500s and the page shows a partial-load warning naming that department.
- Test: true 404/no-board still remains non-fatal.

Non-goals:
- Do not change the API's honest 500 behavior.

### WFG-JINN-002: The Kanban page collapses per-department recycle-bin retention into one global control and overwrites all boards with it

Severity: Medium
Confidence: Confirmed
Domain: Workflow-GUI

Evidence:
- `packages/jinn/src/gateway/board-service.ts:34-37`
- `packages/jinn/src/gateway/board-service.ts:181-193`
- `packages/web/src/routes/kanban/page.tsx:188-193`
- `packages/web/src/routes/kanban/page.tsx:269-286`
- `packages/web/src/routes/kanban/page.tsx:388-396`

Observed behavior:
- Backend board state stores `retentionDays` per department board.
- The UI loads all departments, keeps only the maximum retention value, and then writes that one value back to every department on the next persist.

Expected boundary:
- Either retention is truly global and stored once, or it remains per-board and the UI preserves board-local values.

Failure mechanism:
- A many-board API contract is flattened into a single page-level scalar with no provenance back to the original department.

Break-it angle:
- Set department A to 1 day and department B to 7 days, then change retention from the Kanban page once. Both boards will be rewritten to the same value.

Impact:
- Department-local retention policy is lost silently.

Adjacent failure modes:
- `WFG-JINN-001`
- `ARC-JINN-001`

Recommended mitigation:
- Decide whether retention is global or per-board, then align storage, API, and UI to one truth.
- If per-board, persist and edit by department.
- Add a regression test covering mixed department retention values.

Validation:
- Test: mixed board retention values survive load/save without being collapsed.

Non-goals:
- Do not broaden into recycle-bin UI redesign beyond the ownership fix.

### ARC-JINN-001: `PUT /board` accepts arbitrary ticket objects and the UI coerces unknown statuses to `todo` instead of rejecting drift

Severity: Medium
Confidence: Confirmed
Domain: Architecture

Evidence:
- `packages/jinn/src/gateway/board-service.ts:124-143`
- `packages/jinn/src/gateway/board-service.ts:146-155`
- `packages/web/src/routes/kanban/page.tsx:58-90`

Observed behavior:
- Board write parsing checks only that `tickets` is an array, then casts entries directly to `BoardTicket`.
- Merge logic requires only `ticket.id`.
- The UI maps unknown statuses through `statusMap[item.status] || 'todo'`.

Expected boundary:
- Repo-owned board routes should validate ticket shape and reject unknown statuses, priorities, timestamps, and missing required fields rather than persisting drift and coercing it on read.

Failure mechanism:
- The internal API contract is implicit and unenforced at the write boundary, and the read boundary silently normalizes invalid states into a valid-looking UI state.

Break-it angle:
- Send a ticket with an invalid status; it is accepted into `board.json`, then rendered as `todo`, hiding the contract violation.

Impact:
- Contract drift becomes persistent state, and operator-visible status can diverge from what was actually stored.

Adjacent failure modes:
- `WFG-JINN-001`
- `WFG-JINN-002`

Recommended mitigation:
- Add request validation for board tickets at the API boundary.
- Reject unknown enums and missing required fields with 400s.
- Add route tests for malformed ticket payloads and invalid enums.

Validation:
- Test: invalid board ticket payload returns 400 and does not mutate `board.json`.
- Test: unknown status is rejected, not coerced.

Non-goals:
- Do not replace `board.json` storage in this slice.

### CON-JINN-001: Board dispatch and full-board writes are check-then-act / last-writer-wins, so overlapping writers can duplicate work or drop manual edits

Severity: High
Confidence: Likely
Domain: Concurrency

Evidence:
- `packages/jinn/src/gateway/ticket-dispatch.ts:80-85`
- `packages/jinn/src/gateway/ticket-dispatch.ts:103-145`
- `packages/jinn/src/sessions/queue.ts:73-107`
- `packages/web/src/routes/kanban/page.tsx:246-287`
- `packages/jinn/src/gateway/board-service.ts:146-155`

Observed behavior:
- Dispatch rejects an already-running ticket only by reading the current `sessionId` before session creation and board write.
- Queue serialization happens after session creation.
- Manual board edits are persisted as full-board snapshots, and merge logic keeps incoming manual tickets wholesale with no version or compare-and-swap guard.

Expected boundary:
- Duplicate dispatches and overlapping full-board writes should fail closed or merge deterministically without dropping newer manual state.

Failure mechanism:
- Both dispatch and board persistence are check-then-act / last-writer-wins paths with no optimistic concurrency token, compare-and-swap, or lock at the board boundary.

Break-it angle:
- Two overlapping dispatch requests can both pass the pre-write `sessionId` check before the board is updated.
- Two tabs editing the same department can each PUT a stale full-board snapshot, letting the later write erase the earlier manual change.

Impact:
- Duplicate sessions, duplicate cost/work, or silent loss of manual Kanban edits.

Adjacent failure modes:
- `DAT-JINN-001`
- `WFG-JINN-001`

Recommended mitigation:
- Add a concurrency guard at dispatch (`compare sessionId`, explicit running marker, or board-scoped CAS).
- Add versioning or ETag-style optimistic concurrency for manual board PUTs.
- Add forced-interleave tests for duplicate dispatch and stale board snapshots.

Validation:
- Test: two concurrent dispatch attempts create at most one session.
- Test: stale full-board PUT is rejected or merged without dropping the intervening manual change.

Non-goals:
- Do not introduce distributed coordination beyond the board/session boundary.

## Important Non-Findings

- `packages/jinn/src/gateway/board-service.ts:150-154` preserves `source:"session"` tickets when a manual board PUT omits them. I did not confirm a defect where ordinary manual edits automatically erase live session tickets.
- `packages/jinn/src/gateway/api.ts:1086-1090` and `packages/jinn/src/gateway/ticket-dispatch.ts:83-91` already reject missing assignees and obvious same-ticket reruns in the normal non-raced path.
- `packages/jinn/src/gateway/api.ts:1019-1024` honestly reports corrupt `board.json` as a server error; the hiding happens in the UI, not in the API route.

## Board Backlog Updates

Added backlog tickets to `~/.jinn/org/software-delivery/board.json` for all five findings:

- `kanban-scope-20260623-001`
- `kanban-workflow-20260623-002`
- `kanban-retention-20260623-003`
- `kanban-contract-20260623-004`
- `kanban-concurrency-20260623-005`

## Validation Limits

- I did not run end-to-end browser automation or live gateway mutation beyond read-only inspection and targeted tests.
- I did not deep-read unrelated engine, connector, cron, or auth surfaces once the Kanban inventory was exhausted.
- `PROJECT_HANDOFF_MASTER.md`, `docs/INDEX.md`, `control/*.yaml`, and policy YAML under `governance/` were absent in this checkout, so there was nothing further to verify there.
