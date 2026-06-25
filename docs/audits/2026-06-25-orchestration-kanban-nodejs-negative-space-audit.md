# Orchestration And Kanban Audit

- Date: 2026-06-25
- Actor: GPT-5.4
- Authority: audit-only
- Repo: `/home/ericl/Work/vscode/public_share/jinn`
- Branch / commit: `main` / `4c0d970`
- Skills loaded:
  - `/home/ericl/Work/vscode/dev_tools/agent-skills/10_audit/audit-negative-space/`
  - `/home/ericl/Work/vscode/dev_tools/agent-skills/10_audit/audit-nodejs-architecture/`
- Shared audit base loaded:
  - `audit_method.md`
  - `evidence_discipline.md`
  - `severity_matrix.md`
  - `finding_format.md`
  - `model_adaptations.md`
  - `report_template.md`
  - `confidence_calibration.md`
  - `cross_lens_escalation.md`
  - `static_vs_observed_examples.md`

## Executive Verdict

This audit found one high-severity backend architecture defect and three medium/low workflow defects across the orchestration control plane and the Kanban board. The most important issue is that the orchestration runtime refresh manager exists but is not wired into the live config/org reload paths, so synthesized org-worker mappings and orchestration runtime settings remain stale until restart. The Kanban stack also permits department-invalid assignee states: the backend board PUT validator is a stub, and the frontend assignee-change flow does not update the ticket's persisted department key. A lower-severity negative-space defect lets failed `blocked` auto-session tickets bypass the terminal-ticket cap that was intended to bound board growth. No source patches were made.

## Scope

- Repository/project / branch / commit:
  - `jinn` / `main` / `4c0d970`
- Prompt or session log reviewed:
  - User request to load the negative-space and Node.js architecture audit skills and target orchestration logic plus the Kanban board.
- Skills (lenses) invoked:
  - Negative Space
  - Node.js Architecture
- Files/directories inspected:
  - `AGENTS.md`
  - `packages/jinn/README.md`
  - `docs/feature_inventory.md`
  - `packages/jinn/src/gateway/{server.ts,watcher.ts,api.ts,orchestration-runtime-manager.ts,orchestration-runtime-factory.ts,org-worker-bridge.ts,ticket-dispatch.ts,board-worker.ts,board-service.ts,board-sync.ts,ticket-session-resolver.ts}`
  - `packages/jinn/src/orchestration/{runtime.ts,run-mode.ts}`
  - `packages/web/src/routes/kanban/page.tsx`
  - `packages/web/src/components/kanban/{kanban-board.tsx,kanban-column.tsx,ticket-detail-panel.tsx}`
  - `packages/web/src/lib/{api.ts,kanban/store.ts,kanban/types.ts}`
  - Focused tests under `packages/jinn/src/gateway/__tests__` and `packages/jinn/src/orchestration/__tests__`
- Commands/tests run:
  - `pnpm --filter jinn-cli exec vitest run src/gateway/__tests__/orchestration-runtime-manager.test.ts src/gateway/__tests__/board-service.test.ts src/gateway/__tests__/ticket-dispatch.test.ts src/gateway/__tests__/ticket-dispatch-route.test.ts src/gateway/__tests__/board-sync.test.ts`
- Effort budget (per-lens) and what it bought:
  - Node.js architecture: deep read of the live gateway/runtime seam, board persistence path, and web Kanban mutation flow.
  - Negative space: alternate-path, stale-state, hidden-input, and failure-path review of runtime refresh, assignee migration, and board retention behavior.
- Constraints:
  - Audit-only authority.
  - No destructive runtime drills or live gateway restart simulation were authorized.
  - Delegated subagent exploration was unavailable in this environment due a sign-in requirement, so source review was performed directly.

## Draft Prompt Assessment

The supplied prompt was treated as a draft. The intended mission was a scoped audit of orchestration logic and the Kanban board using the two requested lenses. The prompt was narrower than the actual failure surface, so review expanded to the watcher -> server -> runtime-manager seam, the board PUT validation path, the ticket dispatch path, and the frontend board mutation flow that composes with those backend boundaries.

## Surface Inventory

| Surface | Actor | Input/Trigger | State/Output | Boundary | Reviewed |
|---|---|---|---|---|---|
| `packages/jinn/src/gateway/watcher.ts` | Filesystem watcher | `config.yaml`, `org/`, `cron/jobs.json`, `skills/` changes | Calls reload callbacks | Hot-reload ownership | Yes |
| `packages/jinn/src/gateway/server.ts` | Gateway bootstrap/runtime | Startup, watcher callbacks, cleanup, post-sweep replay | Binds runtime, API context, WS emit, cleanup | Runtime lifecycle and orchestration binding | Yes |
| `packages/jinn/src/gateway/orchestration-runtime-manager.ts` | Runtime control seam | Config/org refresh requests | Swap/defer/replay runtime | Active-work-safe refresh | Yes |
| `packages/jinn/src/gateway/orchestration-runtime-factory.ts` | Runtime constructor | Config + org registry | Runtime with synthesized org workers | Construction-only bridge | Yes |
| `packages/jinn/src/gateway/org-worker-bridge.ts` | Org->scheduler adapter | Employee registry | Synthesized workers and exact roles | Worker mapping invariant | Yes |
| `packages/jinn/src/gateway/api.ts` | HTTP API | Board GET/PUT, dispatch POST | Board writes, dispatch replies | Validation and route ownership | Yes |
| `packages/jinn/src/gateway/ticket-dispatch.ts` | Manual / board-worker dispatch | Ticket dispatch request | Session creation, lease allocation, board linking | Exact-worker allocation and fail-closed behavior | Yes |
| `packages/jinn/src/gateway/board-worker.ts` | Background poller | Idle time + board tickets + usage state | Auto-dispatch to manager | Schedule/idle/usage gate | Yes |
| `packages/jinn/src/gateway/board-service.ts` | Board persistence | PUT payloads and direct writes | `board.json` merge / retention / conflict checks | File merge and optimistic concurrency | Yes |
| `packages/jinn/src/gateway/board-sync.ts` | Session lifecycle mirror | `session:*` and approval events | Auto-managed session tickets | Derived-board safety and retention cap | Yes |
| `packages/jinn/src/orchestration/runtime.ts` | Runtime owner | Allocations, retries, shutdown | Scheduler/store state | Lease, continuation, shutdown ownership | Yes |
| `packages/web/src/routes/kanban/page.tsx` | Dashboard operator | Load/save/move/delete/restore/run-now | Board API payloads and local UI state | Workflow truthfulness | Yes |
| `packages/web/src/components/kanban/*` | Dashboard operator | Drag/drop, assignee changes, detail edits | UI state transitions | GUI mutation path | Sampled |

## Boundary Map

| Surface | Intended Boundary | Enforced At | Status |
|---|---|---|---|
| Config/org reload -> orchestration runtime | Hot reload should rebuild or safely defer runtime refresh when orchestration config or org-worker mappings change | `watcher.ts`, `server.ts`, `orchestration-runtime-manager.ts` | Broken |
| Board PUT -> assignee/department invariant | Saved assignees should belong to the destination department | `api.ts` before `writeMergedBoard()` | Broken |
| UI assignee change -> department migration | Moving a ticket to an assignee in another department should also move the persisted department key | `packages/web/src/routes/kanban/page.tsx` | Broken |
| Auto-session ticket retention cap | Terminal auto-generated session tickets should stay bounded even on failure paths | `board-sync.ts` | Partial |
| Manual/worker dispatch -> exact worker + live headroom | Do not lease unavailable/busy workers; do not silently fall back | `ticket-dispatch.ts` | Held |
| Manual board PUT -> active session metadata preservation | Stale writes should not erase active session state | `board-service.ts` | Held |
| Shutdown -> lease/continuation cleanup | Runtime should fail dispatching continuations and release running leases before close | `runtime.ts` and `server.ts` | Held |

## Findings Table

| ID | Severity | Confidence | Evidence Basis | Domain | Title | Patch Priority | Blast Radius | Complexity | Cost | Nominal Agent |
|---|---|---|---|---|---|---|---|---|---|---|
| `ARC-JINN-001` | High | Confirmed | source-evidenced | Architecture | Hot reload never refreshes the live orchestration runtime or org-worker bridge | P1 | Service | workflow_protocol | M | claude |
| `STT-JINN-002` | Medium | Confirmed | source-evidenced | State-Transition | Board PUT accepts foreign-department assignees even though dispatch later rejects them | P2 | Workflow | local_guardrail | S | codex |
| `WFG-JINN-003` | Medium | Confirmed | source-evidenced | Workflow-GUI | The Kanban assignee-change flow does not move `departmentId`, so cross-department reassignment persists to the wrong board | P2 | Workflow | local_guardrail | S | codex |
| `NEG-JINN-004` | Low | Confirmed | source-evidenced | Negative-Space | Failed `blocked` session tickets bypass the auto-ticket cap and can grow a board without bound | P3 | Workflow | local_guardrail | XS | codex |

## Detailed Findings

### ARC-JINN-001: Hot reload never refreshes the live orchestration runtime or org-worker bridge

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/gateway/server.ts:870-876`
- `packages/jinn/src/gateway/server.ts:952-976`
- `packages/jinn/src/gateway/watcher.ts:78-115`
- `packages/jinn/src/gateway/orchestration-runtime-manager.ts:44-80`

Observed behavior:
- The gateway creates `orchestrationRefreshState` and a replay helper on boot.
- `reloadConfig()` only reloads config into memory, updates the session manager, refreshes models, logs board summary, and emits `config:reloaded`.
- `reloadOrg()` only rescans org data, kills idle PTYs, and emits `org:changed`.
- The watcher callbacks route config and org filesystem changes only to those two functions.
- The runtime refresh manager contains the only code that can mark refreshes deferred or swap the runtime safely, but no live server callback invokes it.

Expected boundary:
- Config and org hot reload should either rebuild the orchestration runtime immediately or defer and replay that rebuild after active work drains.

Failure mechanism:
- The refresh manager exists as an isolated utility, but the production watcher/server path never calls `swapOrchestrationRuntime()` or `refreshOrchestrationRuntimeForOrgReload()`.
- `orchestrationRefreshState.pending` starts false, and the only setter is `markRefreshDeferred()` inside the runtime-manager utility.
- Because no live path calls the utility with `refreshState`, `replayDeferredOrchestrationRuntimeRefresh()` is effectively dead.

Break-it angle:
- Change `config.yaml` to enable orchestration after boot, disable it after boot, change the orchestration DB/worktree settings, or modify org employees so the synthesized exact-worker bridge should change. The gateway updates `currentConfig` and the in-memory org registry, but the bound orchestration runtime keeps the old worker set and runtime options until restart.

Impact:
- Orchestration control-plane changes are stale until restart.
- Org-worker bridge mappings can target removed or renamed employees after an org edit.
- Enabling orchestration post-boot can leave routes reading `enabled: true` while no runtime is bound.
- Disabling orchestration post-boot can leave stale observe state and runtime-owned data structures alive even though the config says orchestration is off.

Operational impact:
- Blast radius: Service
- Side-effect class: process
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: unknown

Adjacent failure modes:
- `STT-JINN-002`
- `WFG-JINN-003`

Recommended mitigation:
- Remediation patterns: live seam wiring, active-work-safe refresh, integration regression test.
- Minimal repair: route `reloadConfig()` through `swapOrchestrationRuntime()` and `reloadOrg()` through `refreshOrchestrationRuntimeForOrgReload()`, passing the shared `orchestrationRefreshState` and rebinding the resume handler.
- Local guardrail: on config/org reload, emit an explicit warning/banner when refresh is deferred and an explicit event when it is replayed after drain.
- Behavior test: add a gateway-level test that changes config/org state after boot and verifies runtime worker inventory or runtime binding changes without restart.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: M
- Cost drivers: modules, tests, runtime_verification
- Nominal implementation agent: claude
- Rationale: the fix crosses watcher callbacks, boot/runtime ownership, and resume-handler rebinding; it is still a contained runtime seam change rather than a storage rewrite.

Validation:
- Add an integration test that boots the gateway with orchestration off, flips it on via reload, and asserts `apiContext.orchestration.runtime` becomes bound.
- Add an org reload test that changes a bridged employee and asserts the runtime worker list changes after active work drains.

Non-goals:
- Do not redesign the scheduler or org-worker bridge.
- Do not add a second orchestration runtime.

### STT-JINN-002: Board PUT accepts foreign-department assignees even though dispatch later rejects them

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: State-Transition

Evidence:
- `packages/jinn/src/gateway/api.ts:114-118`
- `packages/jinn/src/gateway/api.ts:1776-1799`
- `packages/jinn/src/gateway/ticket-dispatch.ts:125-130`
- `packages/jinn/src/gateway/api.ts:1766-1769`

Observed behavior:
- The board PUT path calls `validateBoardAssigneesForDepartment()`, but the validator is a stub that always returns `null`.
- The route then writes the board payload with `writeMergedBoard()`.
- Later, manual dispatch resolves the assignee against org data and explicitly rejects an assignee whose `employee.department !== department`.

Expected boundary:
- A board save should reject department-invalid assignees before committing state, so persisted ticket ownership and dispatch eligibility stay aligned.

Failure mechanism:
- The save path and the dispatch path enforce different invariants.
- The API accepts a persisted board state that the dispatch subsystem will later refuse to execute.

Break-it angle:
- Save a ticket under `software-delivery/board.json` with assignee `researcher` from department `research`. The board persists successfully. The operator later clicks Run Now or the dispatch route is called; dispatch returns `foreign-department-assignee` and the ticket is left in a misleading assigned state.

Impact:
- Persisted board state can become operationally invalid.
- The UI shows an apparently assigned ticket that cannot run.
- Operators learn about the invariant only at dispatch time, not at edit time.

Operational impact:
- Blast radius: Workflow
- Side-effect class: file
- Reversibility: reversible
- Operator visibility: UI-visible
- Rerun safety: safe

Adjacent failure modes:
- `WFG-JINN-003`

Recommended mitigation:
- Remediation patterns: route-level validation parity, invariant enforcement at write boundary.
- Minimal repair: implement `validateBoardAssigneesForDepartment()` so every non-empty assignee in the payload must belong to the target department.
- Local guardrail: return a path-specific `400` that identifies the offending assignee and ticket id.
- Behavior test: add an API test that PUTs a foreign-department assignee and expects `400` without mutating the board file.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: this is a narrow route-level validation defect with a direct regression test surface.

Validation:
- Extend `packages/jinn/src/gateway/__tests__/ticket-dispatch-route.test.ts` or add a board PUT route test for foreign-department assignees.

Non-goals:
- Do not redesign board ownership semantics.
- Do not add cross-department dispatch behavior in this slice.

### WFG-JINN-003: The Kanban assignee-change flow does not move `departmentId`, so cross-department reassignment persists to the wrong board

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Workflow-GUI

Evidence:
- `packages/web/src/lib/kanban/types.ts:21-29`
- `packages/web/src/routes/kanban/page.tsx:265-270`
- `packages/web/src/routes/kanban/page.tsx:283-303`
- `packages/web/src/routes/kanban/page.tsx:435-446`
- `packages/web/src/routes/kanban/page.tsx:476-486`

Observed behavior:
- `KanbanTicket` distinguishes display `department` from persisted `departmentId`.
- `persistToApi()` groups outbound tickets strictly by `ticket.departmentId`.
- `handleAssigneeChange()` updates `assigneeId` and `department`, but never updates `departmentId`.
- `handleRunNow()` prefers `ticket.departmentId` over `ticket.department` when choosing the dispatch route.

Expected boundary:
- Changing a ticket's assignee to someone in another department should also move the ticket's persisted board ownership key, or the UI should refuse the cross-department reassignment.

Failure mechanism:
- The UI updates only the display-level department field.
- Persistence and dispatch continue to use the stale `departmentId`, so the ticket stays on the old board while appearing reassigned to another department's employee.

Break-it angle:
- Reassign a `software-delivery` ticket to a `research` employee from the detail panel. The UI now shows the research assignee, but save still targets the software-delivery board because `departmentId` is unchanged. Combined with `STT-JINN-002`, the invalid state can persist; even if backend validation is fixed later, the action becomes a save-time failure instead of a true move.

Impact:
- Cross-department reassignment is misleading and can create a ticket that appears valid in the panel but is persisted to the wrong board.
- Run-now and later dispatch still target the old department route.

Operational impact:
- Blast radius: Workflow
- Side-effect class: user-visible
- Reversibility: reversible
- Operator visibility: silent
- Rerun safety: safe

Adjacent failure modes:
- `STT-JINN-002`

Recommended mitigation:
- Remediation patterns: UI invariant preservation, persisted-key update.
- Minimal repair: when assignee changes and the new employee has a department, update both `department` and `departmentId` together.
- Local guardrail: if cross-department reassignment is not intended, block it in the picker and explain why.
- Behavior test: add a web test that reassigns a ticket across departments and asserts the emitted payload goes to the new department board.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: the defect is narrowly localized to the Kanban page state transition and API payload grouping.

Validation:
- Add a focused frontend test for `handleAssigneeChange()` or a component test around the detail panel save path.

Non-goals:
- Do not redesign the entire board data model.
- Do not add multi-board drag/drop in this slice.

### NEG-JINN-004: Failed `blocked` session tickets bypass the auto-ticket cap and can grow a board without bound

Severity: Low
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Negative-Space

Evidence:
- `packages/jinn/src/gateway/board-sync.ts:32-33`
- `packages/jinn/src/gateway/board-sync.ts:54-61`
- `packages/jinn/src/gateway/board-sync.ts:119-121`

Observed behavior:
- The module comment says auto-managed terminal tickets are capped per board.
- `pruneSessionTickets()` only counts auto session tickets whose status is `done`.
- A failed or stalled completion writes `status = "blocked"`.

Expected boundary:
- The cap should apply to all terminal auto-session tickets, including failure-path `blocked` tickets, or the code should explicitly document that blocked tickets are retained separately.

Failure mechanism:
- The happy-path cap covers `done` tickets only.
- The alternate failure path writes `blocked`, so repeated failed/stalled sessions accumulate outside the retention guard that was intended to keep derived board growth bounded.

Break-it angle:
- A flaky employee or repeated fallback/stall path can create an unbounded trail of `source:"session"` `blocked` tickets even though successful auto tickets are pruned.

Impact:
- Board clutter grows on the exact path where operators already need signal discipline.
- The derived board becomes less useful under repeated failures.

Operational impact:
- Blast radius: Workflow
- Side-effect class: file
- Reversibility: reversible
- Operator visibility: UI-visible
- Rerun safety: safe

Adjacent failure modes:
- None.

Recommended mitigation:
- Remediation patterns: failure-path parity, bounded derived-state retention.
- Minimal repair: treat `blocked` auto-session tickets as terminal in `pruneSessionTickets()` or add a separate bounded cap for them.
- Local guardrail: add a regression test that seeds many blocked auto tickets and asserts pruning holds.
- Behavior test: board-sync test for >40 blocked auto-session tickets.

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: tests
- Nominal implementation agent: codex
- Rationale: the fix is a tiny local change with a direct unit-test surface.

Validation:
- Extend `packages/jinn/src/gateway/__tests__/board-sync.test.ts` with a blocked-ticket retention case.

Non-goals:
- Do not redesign board archival or deleted-ticket retention.

## Non-Findings / Checked But Not Confirmed

1. Exact-worker board dispatch does fail closed through the orchestration runtime rather than silently falling back.
   - Evidence: `packages/jinn/src/gateway/ticket-dispatch.ts:193-233`
   - Why held: when orchestration is enabled, dispatch requires a mapped runtime, exact worker role, and live headroom; busy or unavailable paths return explicit failure reasons instead of using legacy direct dispatch.

2. Manual board writes do preserve active session metadata on fresh updates and reject stale replacement of active session state.
   - Evidence: `packages/jinn/src/gateway/board-service.ts:198-231` and `packages/jinn/src/gateway/board-service.ts:243-253`
   - Why held: stale updates and active-session metadata replacement are guarded by conflict checks and server-side session metadata preservation.

3. Runtime shutdown now explicitly fails dispatching continuations and releases running leases before close.
   - Evidence: `packages/jinn/src/orchestration/runtime.ts:434-449`
   - Why held: the runtime shutdown path marks `dispatching` continuations failed and releases running leases, which closes a previously risky recovery seam.

4. Board sync surfaces failure state without copying raw error text onto the board.
   - Evidence: `packages/jinn/src/gateway/board-sync.ts:99-121` and `packages/jinn/src/gateway/board-sync.ts:155-160`
   - Why held: the board gets `blocked` plus a generic note, while raw error detail stays outside the Kanban artifact.

## Negative-Space Inventory Result

| Item | Result | Notes |
|---|---|---|
| `NEG-001 Impossible State Possible` | Finding | `ARC-JINN-001` |
| `NEG-002 Hidden Actor` | Not Confirmed | Exact-worker leasing and single-tick board-worker serialization held on inspected paths. |
| `NEG-003 Unmodeled Input` | Finding | `ARC-JINN-001` treats config/org filesystem changes as control-plane input that never reaches the runtime. |
| `NEG-004 Cross-Boundary Composition` | Finding | `STT-JINN-002` + `WFG-JINN-003` |
| `NEG-005 Assumption Collapse` | Finding | `STT-JINN-002` shows board-save and dispatch paths assuming the same assignee invariant when they do not. |
| `NEG-006 Rare Timing Window` | Not Confirmed | No serious race was promoted beyond static evidence; no destructive concurrency drill was run. |
| `NEG-007 Catastrophic Low Probability` | Not Confirmed | No core-state corruption path was confirmed in the scoped surfaces. |
| `NEG-008 Negative Test Missing` | Finding | `ARC-JINN-001` and `NEG-JINN-004` both lack the integration/edge tests that would catch the defect. |
| `NEG-009 Safety Bypassed By Alternate Path` | Finding | `STT-JINN-002` and `NEG-JINN-004` |
| `NEG-010 Human/Operator Misuse` | Not Confirmed | The UI issues found are defect-driven, not operator-only misuse paths. |
| `NEG-011 Model/Provider Output Trusted` | Not Confirmed | No provider-output trust boundary was material in the audited surfaces. |
| `NEG-012 Future Integration Breaks Invariant` | Speculative | Multi-actor/public deployment would increase the blast radius of `ARC-JINN-001`, but no additional future-only defect was emitted. |
| `NEG-013 Local-First Assumption Fails` | Not Confirmed | Current findings are reachable without assuming multi-user deployment. |
| `NEG-014 Compliance Language Over-Trusted` | Not Confirmed | No misleading compliance posture language was material in this slice. |
| `NEG-015 Recovery Mechanism Causes Damage` | Not Confirmed | `runtime.ts:434-449` and `runtime.ts:510-522` show explicit shutdown/stale-dispatch recovery handling. |

## Break-It Review

- Config/org hot reload:
  - Attack: treat filesystem changes as first-class control-plane input.
  - Result: failed. The runtime-refresh seam exists but is not invoked by the live watcher/server path.
- Board save versus dispatch:
  - Attack: save a ticket ownership state that dispatch would later reject.
  - Result: failed. Board PUT accepts foreign-department assignees; dispatch later rejects them.
- UI reassignment:
  - Attack: move a ticket across departments only by changing assignee.
  - Result: failed. The UI updates display department but not persisted `departmentId`.
- Derived board retention:
  - Attack: drive the failure path instead of the happy path.
  - Result: failed. `blocked` auto tickets bypass the retention cap.
- Exact-worker scheduling:
  - Attack: dispatch to an unavailable or busy exact worker.
  - Result: held. The inspected path uses live headroom and explicit `orchestration-busy` / `orchestration-unavailable` failures.
- Active session metadata preservation:
  - Attack: overwrite a running board-linked ticket with stale UI data.
  - Result: held on the inspected server merge path.

## Skill Escalation

| Finding | Primary Lens | Secondary Lens | Why |
|---|---|---|---|
| `ARC-JINN-001` | Node.js Architecture | Reliability, State-Transition, Negative-Space | This is a dead ownership seam in the live runtime lifecycle, with stale-state consequences after config/org changes. |
| `STT-JINN-002` | Negative-Space | Workflow-GUI, Data-Integrity | The board-save path bypasses an invariant that the dispatch path depends on. |
| `WFG-JINN-003` | Workflow-GUI | State-Transition, Negative-Space | A visible UI action mutates only half of the persisted ownership key. |
| `NEG-JINN-004` | Negative-Space | Reliability | The failure path escapes a guard that exists on the success path. |

## Recommended Patch Order

1. `ARC-JINN-001`
2. `STT-JINN-002`
3. `WFG-JINN-003`
4. `NEG-JINN-004`

## Regression Test Strategy

| Test | Purpose | Finding |
|---|---|---|
| Gateway config reload binds/unbinds orchestration runtime without restart | Prove runtime-refresh seam is live | `ARC-JINN-001` |
| Org reload refreshes synthesized org-worker mapping after active work drains | Prove deferred replay actually happens | `ARC-JINN-001` |
| PUT board rejects foreign-department assignee | Preserve save-time invariant parity with dispatch | `STT-JINN-002` |
| Frontend cross-department reassignment updates `departmentId` or is blocked | Keep UI state and persisted ownership aligned | `WFG-JINN-003` |
| Board-sync cap prunes blocked auto-session tickets | Close alternate-path retention bypass | `NEG-JINN-004` |

## Deferred Risks

- The blast radius of `ARC-JINN-001` increases materially under broader orchestration usage or multi-actor/public deployment, but this audit did not run a live gateway-reload drill.
- The board save path may have additional workflow/GUI defects outside the inspected assignee/department invariant, especially around cross-board movement UX and restore flows.

## Validation Limits

- No live gateway process was started.
- No destructive shutdown/restart or concurrent multi-actor drill was run.
- Web frontend behavior was source-inspected but not browser-executed.
- Broader orchestration observe/control routes were sampled only where needed to understand the control-plane seam.

## Final Confidence

Medium-High.

The four findings are confirmed from direct source evidence, and the focused gateway test run passed for the currently covered cases. Confidence is not marked fully High because the orchestration hot-reload defect and the frontend reassignment defect were not reproduced in a live running gateway/browser session during this audit.
