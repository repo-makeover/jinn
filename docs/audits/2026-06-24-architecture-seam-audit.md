# Architecture & Seam Audit — Jinn

**Date**: 2026-06-24
**Skill**: `audit-architecture-seam` v3.0
**Scope**: Full codebase (`packages/jinn/src/`, `packages/web/src/`)
**Authority**: Audit-only (no patches authorized)
**Budget**: ~40 files read, ~60 tool calls

> The supplied prompt is treated as a draft. I preserved the intended mission but
> expanded review to adjacent failure mechanisms and seams implied by the task.

---

## Surface Inventory

| Module | Responsibility | Owns | Depends On | Boundary Contract | Coupling Risk |
|--------|----------------|------|------------|-------------------|---------------|
| `shared/types.ts` | Core domain types | Session, Engine, Connector, Employee, CronJob | Nothing (foundation) | Interface-only | LOW — pure types |
| `orchestration/adapter/types.ts` | ProviderAdapter contract | ProviderAdapterResult<T>, error codes | `shared/types` | Typed Result union | LOW — well-bounded |
| `orchestration/adapter/registry.ts` | Adapter factory/registry | ProviderAdapterRegistry | adapter/types, real/stub/echo adapters | createLiveProviderAdapterRegistry | LOW — pure factory |
| `orchestration/run-mode.ts` | Allocated task execution | Session lifecycle, worktree, telemetry | `sessions/registry`, `gateway/api` **← violation** | runOrchestrationTask → creates sessions + runs engines | 🔴 CRITICAL — imports gateway |
| `orchestration/runtime.ts` | Lease/queue lifecycle | LiveContinuationRecord, scheduler | `orchestration/types`, store | tryAllocationNow, setResumeQueuedRunHandler | HIGH — callback with no enforcement |
| `orchestration/coordinator.ts` | Task mode resolution | AllocationRequest validation | `types`, `scheduler` | Pure: AllocationRequest → AllocationResult | LOW — no state |
| `gateway/api.ts` | HTTP route handler | All 30+ route namespaces | sessions, orchestration, connectors, cron, board, org | handleApiRequest | 🔴 CRITICAL — god object (1795 lines) |
| `gateway/server.ts` | Entry point wiring | Process lifecycle, 70+ module imports | All subsystems | Bootstraps everything | HIGH — intentional but dense |
| `gateway/ticket-dispatch.ts` | Board ticket → session | Session creation, lease lifecycle | sessions/registry, orchestration/runtime | dispatchTicket | HIGH — dual responsibility |
| `gateway/budgets.ts` | Employee budget checks | Budget policy | `sessions/registry.initDb()` **← violation** | checkBudget | HIGH — policy queries schema directly |
| `gateway/connector-reply.ts` | Outbound connector delivery | NON_CONNECTOR_SOURCES filter | connectors map (injected) | deliverConnectorReply | MEDIUM — fire-and-forget |
| `gateway/external-turns.ts` | CLI↔Gateway transcript sync | Transcript anchor key | `sessions/registry`, `claude-interactive` | isPersistableClaudeTranscriptEntry | HIGH — hardcoded Claude shape |
| `sessions/registry.ts` | All session persistence | SQLite DB, all session CRUD | Nothing | initDb, createSession, updateSession | HIGH — 1528 lines, all DB, no tx API |
| `sessions/manager.ts` | Session execution coordinator | Rate-limit retry, cost tracking | engines, connectors, registry | run() | HIGH — 891 lines, multi-domain |
| `talk/engine-resolver.ts` | Talk engine fallback | Engine selection logic | `shared/models` (injected) | Pure: ResolveTalkEngineInput → TalkEngineResolution | LOW — pure, injected |
| `connectors/{slack,discord,telegram,whatsapp}` | Chat I/O adapters | Connector protocol | `shared/types.Connector` | onMessage callback + sendMessage | LOW — implement clean interface |
| `web/lib/kanban/store.ts` | Client ticket persistence | localStorage | types only | saveTickets, loadTickets | LOW — client-side only |
| `web/lib/api.ts` | Web client types | Response DTOs | Nothing | Interface shapes | LOW — mirrors server |

---

## Boundary Map

```
[shared/types] ← foundation, no deps
       ↑
[orchestration/types] ← types only
       ↑
[orchestration/adapter/types] ← typed Result contract
       ↑
[orchestration/adapter/registry] [orchestration/runtime] [orchestration/coordinator]
       ↑                                   ↓ (callback)
[orchestration/run-mode] ←──────────────── ↑
    ↓ VIOLATES LAYER BOUNDARY
    → imports gateway/api.ts (ApiContext)
    → imports sessions/registry.ts (createSession, updateSession)

[gateway/server] ← wires all subsystems
    ↓
[gateway/api] ← god object: 30+ route namespaces in one file
    ↓
[sessions/registry] ← persistence bottleneck

[gateway/budgets] → sessions/registry.initDb() ← policy queries schema directly
[gateway/external-turns] → hardcoded Claude transcript shape
[gateway/connector-reply] → fire-and-forget, no retry
```

---

## Findings Table

| ID | Title | Severity | Confidence | Evidence Basis |
|----|-------|----------|------------|----------------|
| ARC-JIN-001 | God Object: gateway/api.ts (1795 lines, 30+ routes) | High | Confirmed | source-evidenced |
| ARC-JIN-002 | Boundary Violation: orchestration/run-mode.ts imports gateway layer | High | Confirmed | source-evidenced |
| ARC-JIN-003 | Policy Mixed With Mechanism: budgets.ts queries sessions schema directly | Medium | Confirmed | source-evidenced |
| ARC-JIN-004 | Hidden Coupling: resumeQueuedRunHandler callback has no injection guarantee | High | Likely | simulation-reasoned |
| ARC-JIN-005 | Leaky Abstraction: external-turns.ts hardcodes Claude transcript shape | Medium | Confirmed | source-evidenced |
| ARC-JIN-006 | No Delivery Guarantee: connector-reply.ts fire-and-forget with swallowed errors | Medium | Confirmed | source-evidenced |
| ARC-JIN-007 | Dual Persistence: LiveContinuationRecord and Session have no shared transaction | High | Likely | simulation-reasoned |
| ARC-JIN-015 | Compatibility Facades: api.ts re-exports remnants of AS-001 modularization | Info | Confirmed | source-evidenced |

---

## Detailed Findings

### ARC-JIN-001: God Object — gateway/api.ts

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/gateway/api.ts:1-72` — 72 import lines spanning sessions, orchestration, connectors, cron, board, approvals, org, config, QR code, STT, files, hooks, talk, watcher
- `packages/jinn/src/gateway/api.ts:135` — single `handleApiRequest()` function containing all 30+ route branches
- Route surface at lines 147, 218, 226, 233, 236, 275, 286, 301, 321, 343, 392, 408, 425, 436, 505, 608, 751, 887, 911, 949, 967, 979, 1045, 1066, 1094, 1110, 1159, 1179 (partial list)

Observed behavior:
- One 1795-line file mixes: session CRUD, archive management, PTY token issuance, message injection, queue management, approval workflow, board CRUD, ticket dispatch, org management, cron management, config hot-reload, STT, TTS, files, hooks, and onboarding.

Expected boundary:
- Route handlers should be split by domain — each owning one coherent namespace (sessions, board, cron, org, config, approvals).

Failure mechanism:
- Any change to any domain touches the same file; merge conflicts are high; test coverage for a given route requires understanding the full 1795-line switch-like structure.

Break-it angle:
- Adding a new route namespace requires editing the same file as all existing routes. A typo in any branch's matchRoute() call silently falls through.

Impact:
- High change-coupling; no domain isolation; test surface for any one domain is entangled with all others.

Operational impact:
- Blast radius: Service
- Side-effect class: none (routing only)
- Reversibility: reversible
- Operator visibility: silent (routing mismatch returns 404, not an alert)
- Rerun safety: safe

Adjacent failure modes:
- Silently missed routes as file grows (already partially mitigated by AS-001 extraction of session-query and orchestration routes into subdirectory)

Recommended mitigation:
- Remediation pattern: split by domain using existing sub-directory pattern (`api/session-query-routes.ts`, `api/orchestration-routes.ts` already in place)
- Minimal repair: move board routes → `api/board-routes.ts`, cron → `api/cron-routes.ts`, org → `api/org-routes.ts`, config → `api/config-routes.ts`
- Regression test: each sub-router handles only its own namespace; unknown paths pass to next handler

Implementation assessment:
- Complexity: local_guardrail
- Cost: M
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: mechanical extraction following established `api/` sub-directory pattern

Validation:
- Test: each sub-router rejects routes outside its namespace
- Test: gateway handles unknown path with 404 (existing behavior preserved)

Non-goals:
- Do not change handler logic, only move routing

---

### ARC-JIN-002: Boundary Violation — orchestration/run-mode.ts imports gateway layer

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/orchestration/run-mode.ts:2` — `import { createSession, getSession, insertMessage, updateSession } from "../sessions/registry.js"`
- `packages/jinn/src/orchestration/run-mode.ts:5` — `import type { ApiContext } from "../gateway/api.js"`
- `packages/jinn/src/orchestration/run-mode.ts:6` — `import { dispatchWebSessionRun } from "../gateway/api/session-dispatch.js"`
- `packages/jinn/src/gateway/server.ts:35` — `import { runAllocatedOrchestrationTask } from "../orchestration/run-mode.js"`

Observed behavior:
- The orchestration layer (`orchestration/`) imports `ApiContext` from `gateway/api.ts` and `createSession`/`updateSession` from `sessions/registry.ts`. `gateway/server.ts` imports `run-mode.ts`. This creates a cycle: `gateway/server → orchestration/run-mode → gateway/api`.

Expected boundary:
- Dependencies should point inward: `gateway → orchestration`, `gateway → sessions`. The orchestration layer should not know about `ApiContext` or call `sessions/registry` directly.

Failure mechanism:
- `orchestration/run-mode.ts` must receive `ApiContext` to call `dispatchWebSessionRun`, so the orchestration execution path is tightly coupled to gateway request-handling infrastructure. Testability of orchestration in isolation requires constructing a full `ApiContext` mock.

Break-it angle:
- Any change to `ApiContext` shape (or `gateway/api.ts` exports) must be coordinated with `orchestration/run-mode.ts`. Circular type import risks TypeScript resolution failures when both sides evolve simultaneously.

Impact:
- Orchestration cannot be tested without gateway. Gateway and orchestration cannot be split into separate packages. The cycle prevents clean onion-layer enforcement.

Operational impact:
- Blast radius: Service
- Side-effect class: none (structural)
- Reversibility: reversible (but requires refactor)
- Operator visibility: silent
- Rerun safety: safe

Adjacent failure modes:
- ARC-JIN-001 (god object at api.ts — extending it widens the coupling surface)

Recommended mitigation:
- Extract a `RunContext` interface into `orchestration/types.ts` or `shared/types.ts` with only the fields `run-mode.ts` needs (engines map, config getter, emit, sessionManager)
- Pass session-creation operations via injected callbacks rather than direct `sessions/registry` import
- Test: orchestration task runner can be instantiated without importing `gateway/api.ts`

Implementation assessment:
- Complexity: workflow_protocol
- Cost: M
- Cost drivers: modules, tests
- Nominal implementation agent: claude
- Rationale: needs broad context to correctly scope the minimal RunContext interface without breaking gateway integration

Validation:
- Test: `orchestration/run-mode.ts` has no static import of `gateway/`
- Test: orchestration unit tests pass without gateway module loaded

Non-goals:
- Do not restructure session persistence schema in this slice

---

### ARC-JIN-003: Policy Mixed With Mechanism — budgets.ts queries sessions DB directly

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/gateway/budgets.ts:1` — `import { initDb } from '../sessions/registry.js'`
- `packages/jinn/src/gateway/budgets.ts:6` — `const db = initDb()`
- `packages/jinn/src/gateway/budgets.ts:13-15` — raw SQL: `SELECT COALESCE(SUM(total_cost), 0) as spend FROM sessions WHERE employee = ? AND created_at >= ?`

Observed behavior:
- Budget policy (gateway/budgets.ts) directly calls `initDb()` and issues raw SQL against the sessions schema. The query couples to the `sessions.total_cost` and `sessions.employee` column names.

Expected boundary:
- Policy should call a stable API (e.g., `getMonthlySpendForEmployee(employee, since)`) exported by `sessions/registry.ts`. The SQL belongs inside the registry, not the policy caller.

Failure mechanism:
- If the sessions schema changes (`total_cost` renamed or column dropped in a migration), `budgets.ts` breaks at runtime, not compile time. No type safety on the raw SQL result.

Break-it angle:
- Rename `total_cost` to `cost_usd` in the schema; `budgets.ts` silently returns 0 (COALESCE default) and all employees appear under-budget.

Impact:
- Schema changes silently break budget enforcement, allowing overspend to go undetected until next deployment check.

Operational impact:
- Blast radius: Workflow
- Side-effect class: none
- Reversibility: reversible
- Operator visibility: silent (budget check returns wrong result, no error thrown)
- Rerun safety: safe

Adjacent failure modes:
- Similar direct-DB patterns may exist in other gateway modules.

Recommended mitigation:
- Add `getMonthlySpend(employee: string, since: string): number` to `sessions/registry.ts`
- Rewrite `budgets.ts` to call that function
- Test: mock registry cost query; verify budget thresholds applied correctly

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules
- Nominal implementation agent: codex

Validation:
- Test: `checkBudget` returns `paused` when registry reports spend >= limit
- Test: rename schema column in test DB; budget check throws rather than silently returning 0

Non-goals:
- Do not change the budget threshold percentages (80% warning, 100% paused)

---

### ARC-JIN-004: Hidden Coupling — resumeQueuedRunHandler has no injection guarantee

Severity: High
Confidence: Likely
Evidence basis: simulation-reasoned
Domain: Architecture

Evidence:
- `packages/jinn/src/orchestration/runtime.ts:86` — `private resumeQueuedRunHandler?: ResumeQueuedRunHandler` (optional field, no guard)
- `packages/jinn/src/orchestration/runtime.ts:117-119` — `setResumeQueuedRunHandler(handler: ResumeQueuedRunHandler | undefined): void { this.resumeQueuedRunHandler = handler; ... }`
- `packages/jinn/src/gateway/server.ts` (caller) — must call `setResumeQueuedRunHandler` post-construction; no assertion that this is done before queued work runs

Observed behavior:
- `OrchestrationRuntime` starts its reaper on construction (line 114: `if (opts.startReaper !== false) this.startReaper()`). If queued work surfaces before `setResumeQueuedRunHandler` is called by the gateway, it is silently dropped (handler undefined → no dispatch).

Expected boundary:
- Required callbacks should be passed at construction time or the runtime should not start its reaper until the handler is set.

Failure mechanism:
- On startup, the reaper may fire within milliseconds. If `setResumeQueuedRunHandler` is called in a separate async tick (after `await`), the race window exists. Silent work loss — no error is thrown; queued continuations are simply skipped.

Break-it angle:
- Construct `OrchestrationRuntime` with `reaperIntervalMs: 1`, do not call `setResumeQueuedRunHandler` until 10ms later; verify queued continuations from prior runs are dropped.

Impact:
- Queued orchestration runs from before shutdown may silently not resume on next start.

Operational impact:
- Blast radius: Workflow
- Side-effect class: none (structural)
- Reversibility: reversible (continuations still in store, next reaper pass may catch them)
- Operator visibility: silent
- Rerun safety: safe (continuations remain in store, retry possible)

Adjacent failure modes:
- ARC-JIN-007 (dual persistence — if continuation state survives but session state is stale, recovery is partial)

Recommended mitigation:
- Either: accept handler at construction (make it required) and defer reaper start until handler is set
- Or: add assertion/invariant check in reaper tick: `if (!this.resumeQueuedRunHandler) return` with a `logger.warn` on first miss
- Test: queued continuation dispatches correctly even when handler set 100ms after construction

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules
- Nominal implementation agent: codex

Validation:
- Test: handler set after construction delay; queued work is dispatched on next reaper tick
- Test: handler never set; reaper logs a warning per missed tick

Non-goals:
- Do not change the reaper interval or shutdown drain logic

---

### ARC-JIN-005: Leaky Abstraction — external-turns.ts hardcodes Claude transcript shape

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/gateway/external-turns.ts:76-88` — `isPersistableClaudeTranscriptEntry()` checks `obj.isSidechain`, `obj.isMeta`, `obj.sourceToolAssistantUUID`, `obj.toolUseResult`, `obj.promptSource`, `obj?.origin?.kind`, `obj?.message?.model === "<synthetic>"`
- `packages/jinn/src/gateway/external-turns.ts:3-4` — imports `findTranscriptForSession` from `../engines/claude-interactive.js`

Observed behavior:
- The gateway's transcript sync function `isPersistableClaudeTranscriptEntry()` contains Claude-specific field checks. These are undocumented internal Claude CLI JSON properties — any change to the Claude CLI transcript format silently breaks the filter.

Expected boundary:
- The filter predicate belongs in `engines/claude-interactive.ts` as a provider-specific parser. The gateway sync function should call `engine.parseTranscriptEntry(obj)` and receive an engine-agnostic result.

Failure mechanism:
- Claude CLI adds a new field (e.g., renames `isSidechain` to `sidechain`) → filter no longer excludes the right entries → duplicate messages inserted into gateway DB.

Break-it angle:
- Change Claude transcript format to use `obj.sidechain` instead of `obj.isSidechain`; entries that should be filtered are now persisted, causing duplicate messages in chat.

Impact:
- Silent double-insertion of internal Claude turns into session message history.

Operational impact:
- Blast radius: Workflow
- Side-effect class: DB
- Reversibility: compensatable (delete duplicate messages)
- Operator visibility: UI-visible (duplicate messages appear in chat)
- Rerun safety: unsafe (sync runs on each Stop, will keep inserting)

Adjacent failure modes:
- Other transcript parsers in the codebase that copy these field names.

Recommended mitigation:
- Move `isPersistableClaudeTranscriptEntry` and `transcriptEntryText` into `engines/claude-interactive.ts` or a co-located `engines/claude-transcript.ts`
- Gateway sync calls `engine.parseExternalTurnEntry(obj): TranscriptTailEntry | null`
- Test: changing a Claude-specific field name breaks only the Claude engine test, not the gateway sync test

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex

Validation:
- Test: `parseExternalTurnEntry` returns null for sidechain entries
- Test: gateway sync does not need to know Claude field names

Non-goals:
- Do not change sync anchor logic (`TRANSCRIPT_SYNC_META_KEY`)

---

### ARC-JIN-006: No Delivery Guarantee — connector-reply.ts swallows errors with no retry

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/gateway/connector-reply.ts:51-68` — `deliverConnectorReply()`: no delivery queue, no retry, error swallowed at lines 63-66 with `logger.warn`
- `packages/jinn/src/gateway/connector-reply.ts:59` — `if (!connector) return;` — silent no-op if connector missing

Observed behavior:
- When a session completed via `runWebSession` (cron, rate-limit resume, parent callback), the turn result is delivered to the connector in a fire-and-forget call. If the connector (Slack, Discord, etc.) is temporarily offline, the message is permanently lost.

Expected boundary:
- Connector-sourced turns whose replies fail to deliver should be retried or flagged for operator review.

Failure mechanism:
- Connector rate-limits or transient connection failure → `replyMessage()` throws → error swallowed → user sees no reply → next connector message triggers a new turn with no context that the reply was lost.

Break-it angle:
- Bring Slack connector offline for 30 seconds during a cron job run; the turn completes and is marked successful in gateway but the Slack reply is silently dropped.

Impact:
- Connector-sourced sessions lose their reply without any operator signal.

Operational impact:
- Blast radius: Workflow
- Side-effect class: external API
- Reversibility: irreversible (message lost)
- Operator visibility: log-only (warn-level log)
- Rerun safety: safe

Adjacent failure modes:
- Cron-triggered connector replies (same path via connector-reply).

Recommended mitigation:
- At minimum: upgrade failed delivery to a structured event emitted on `context.emit("connector:reply_failed", {...})` so operators can observe
- For durability: queue failed deliveries with exponential backoff (bounded, e.g., 3 retries over 5 minutes)
- Test: connector failure during delivery emits an observable event rather than silently dropping

Implementation assessment:
- Complexity: workflow_protocol
- Cost: M
- Cost drivers: modules, tests, runtime_verification
- Nominal implementation agent: claude
- Rationale: retry queue requires lifecycle integration; operator event is cheaper first step

Validation:
- Test: `deliverConnectorReply` with failing connector emits `connector:reply_failed`
- Test: delivery succeeds after connector recovers (if retry implemented)

Non-goals:
- Do not implement persistent cross-restart delivery queue in this slice

---

### ARC-JIN-007: Dual Persistence — LiveContinuationRecord and Session have no shared transaction

Severity: High
Confidence: Likely
Evidence basis: simulation-reasoned
Domain: Architecture

Evidence:
- `packages/jinn/src/orchestration/runtime.ts:179-200` — `queueLiveContinuation`, `deleteLiveContinuation`, `markLiveContinuationCompleted`, `markLiveContinuationFailed` operate on `OrchestrationStore` (orch.db)
- `packages/jinn/src/orchestration/run-mode.ts:2` — same module also calls `updateSession` on sessions/registry (sessions.db)
- Two separate SQLite databases with no two-phase commit or compensating transaction

Observed behavior:
- A completed orchestration run writes its `LiveRunContinuationRecord` to `orch.db` and its session status to `sessions.db` in two separate writes. If the process crashes between the two writes, one store is updated and the other is not.

Expected boundary:
- Work that spans two persistent stores requires either: a single store, a saga with compensating actions, or an idempotent recovery path that can reconcile the two.

Failure mechanism:
- Process crash after `markLiveContinuationCompleted` but before `updateSession("completed")` → session stuck in "running" state; continuation marked complete. Status reconciler (`status-reconciler.ts`) may recover the session, but only if it observes the discrepancy.

Break-it angle:
- Insert `process.exit()` between `markLiveContinuationCompleted` and `updateSession` in run-mode.ts; verify session remains in "running" state after restart.

Impact:
- Stale "running" sessions that never complete, consuming quota and blocking new work.

Operational impact:
- Blast radius: Workflow
- Side-effect class: DB
- Reversibility: compensatable (status-reconciler can recover)
- Operator visibility: log-only (reconciler logs; no operator alert)
- Rerun safety: safe (reconciler designed for this)

Adjacent failure modes:
- ARC-JIN-004 (handler not set → continuation survives but session never advanced to completed)

Recommended mitigation:
- Document the recovery contract explicitly: `status-reconciler` is the compensating mechanism for split-brain between the two stores
- Add a reconciler coverage test for the crash-between-writes scenario
- Consider merging live-continuation state into sessions.db (single store, single transaction)

Implementation assessment:
- Complexity: persistence_recovery
- Cost: L
- Cost drivers: modules, tests, migrations
- Nominal implementation agent: multi-agent
- Rationale: single-store migration requires schema change + migration + orchestration store refactor

Validation:
- Test: reconciler detects and fixes sessions stuck in "running" when continuation is "completed"
- Test: no data loss when reconciler runs after split-brain scenario

Non-goals:
- Do not merge stores without a migration path; document the current recovery contract first

---

### ARC-JIN-015: Overbuilt Compatibility — api.ts re-export facades

Severity: Info
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- `packages/jinn/src/gateway/api.ts:52-57` — comments read "Compatibility facade: these moved to ./config-sanitize.js (AS-001 modularization); re-exported so existing importers of ./api.js keep working"
- Two separate `export { ... } from "./config-sanitize.js"` and `export { ... } from "./connector-reply.js"` added to maintain backward compatibility

Observed behavior:
- Items extracted during AS-001 modularization are re-exported from `api.ts` so callers do not need to update their import paths.

Expected boundary:
- Once callers are migrated, re-exports become dead weight that widens `api.ts`'s public API surface unnecessarily.

Failure mechanism:
- Re-exports preserve the illusion that `api.ts` still owns these symbols. New callers may import from `api.ts` instead of the canonical new home.

Recommended mitigation:
- Search for callers that still import `isSensitiveConfigKey`, `sanitizeConfigForApi`, `resolveUserHeader`, `deliverConnectorReply` from `gateway/api.ts`
- Migrate callers to canonical modules and remove the re-exports
- Test: no import of these symbols from `gateway/api.ts` outside of `api.ts` itself

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules
- Nominal implementation agent: codex

Validation:
- Test: `grep "from.*gateway/api" | grep -E "isSensitiveConfigKey|sanitizeConfigForApi|resolveUserHeader|deliverConnectorReply"` returns empty

---

## Non-Findings (checked and held)

**✓ No circular import between orchestration core and sessions (except run-mode.ts)**
- `orchestration/runtime.ts`, `orchestration/coordinator.ts`, `orchestration/scheduler.ts` do NOT import from `sessions/` or `gateway/`
- `sessions/registry.ts` does NOT import from `orchestration/`
- The only violation is `orchestration/run-mode.ts` (ARC-JIN-002)

**✓ Web layer (packages/web/src/) does NOT own domain rules**
- `web/lib/kanban/types.ts`: pure client DTOs, no validation logic
- `web/lib/kanban/store.ts`: client-side localStorage serialization only
- `web/lib/api.ts`: response type definitions, no business logic
- No budget, routing, or session lifecycle decisions made in the web package

**✓ Connector interface is not provider-contract-flattening**
- `connectors/{slack,discord,telegram,whatsapp}/index.ts` each implement `Connector` from `shared/types.ts`
- Each has its own auth/threading/format module without forcing incompatible contracts behind one adapter
- Non-finding: the interface preserves connector-specific `reconstructTarget()` and `parseMessage()` without flattening

**✓ Optional integrations are truly optional**
- Slack, Discord, Telegram, WhatsApp connectors loaded only when `config.connectors.{name}` is present
- Orchestration runtime created only if `config.orchestration.enabled === true` (runtime-factory.ts:19)
- Core web session path (`dispatchWebSessionRun`) runs without any connector or orchestration present

**✓ ProviderAdapter interface is genuinely polymorphic**
- `orchestration/adapter/types.ts:105-115` — 8-method contract consistently implemented by real, stub, local-echo, and manual adapters
- `createLiveProviderAdapterRegistry` wraps each engine without flattening engine-specific behavior
- Engine-specific behavior (e.g., PTY vs HTTP) encapsulated inside each engine's `run()` implementation, not leaked through the adapter

**✓ Talk engine resolver is pure and injected**
- `talk/engine-resolver.ts`: all dependencies injected via `ResolveTalkEngineInput`; no globals; testable in isolation
- Clear fallback order with explicit `reason` in result

**✓ Passive collectors do not actively execute**
- `orchestration/types.ts`, `orchestration/live-run.ts`, `shared/types.ts`: pure type/interface definitions; no exec or subprocess calls
- Transcript tailer (`engines/transcript-tailer.ts`): reads files only; does not spawn processes

---

## Break-It Review

| Attack | Result |
|--------|--------|
| Swap one provider behind ProviderAdapter | Adapter contract holds — each engine still wraps via `createRealProviderAdapter`; no flattening. Non-finding. |
| Remove optional orchestration; does core path run? | Yes — `dispatchWebSessionRun` in `api/session-dispatch.ts` runs without orchestration. Optional confirmed. |
| Remove optional connector; does core web path run? | Yes — `deliverConnectorReply` no-ops for non-connector sources. Optional confirmed. |
| Call `OrchestrationRuntime` before `setResumeQueuedRunHandler`; work lost? | Likely yes — reaper fires immediately on construction; handler check is optional. ARC-JIN-004 confirmed. |
| Crash between `markLiveContinuationCompleted` and `updateSession`; what happens? | Session stuck in "running"; continuation marked complete. Reconciler should recover but untested. ARC-JIN-007 confirmed. |
| Rename `isSidechain` in Claude transcript; what breaks? | `isPersistableClaudeTranscriptEntry` allows formerly-filtered entries through; duplicates inserted. ARC-JIN-005 confirmed. |
| Bring Slack offline during cron session turn; reply delivered? | No — swallowed in `deliverConnectorReply` catch; no retry; message lost. ARC-JIN-006 confirmed. |
| Delete re-export facades from api.ts; does anything break? | Search needed. ARC-JIN-015 is Info severity pending caller audit. |

---

## Patch Order

1. **ARC-JIN-003** (XS, isolated) — Add `getMonthlySpend()` to registry; rewrite budgets.ts. No risk.
2. **ARC-JIN-015** (XS) — Remove re-export facades after caller audit. No behavior change.
3. **ARC-JIN-004** (XS) — Add warning log in reaper for unset handler; make handler required at construction or deferred start.
4. **ARC-JIN-005** (S) — Move `isPersistableClaudeTranscriptEntry` into `engines/claude-interactive.ts`.
5. **ARC-JIN-001** (M) — Split `gateway/api.ts` by domain into `api/board-routes.ts`, `api/cron-routes.ts`, `api/org-routes.ts`, `api/config-routes.ts`.
6. **ARC-JIN-006** (M) — Add structured `connector:reply_failed` event emission; consider retry queue.
7. **ARC-JIN-002** (M) — Extract `RunContext` interface; remove `orchestration/run-mode.ts` dependency on `gateway/api.ts`.
8. **ARC-JIN-007** (L) — Document recovery contract; add reconciler coverage test; long-term: evaluate single store.

---

## Required Tests For This Domain

- [ ] Each sub-router (`board-routes`, `cron-routes`, `org-routes`) rejects routes outside its namespace
- [ ] `orchestration/run-mode.ts` unit tests pass without importing `gateway/api.ts`
- [ ] `checkBudget` returns `paused` when monthly spend >= limit (mocked registry API)
- [ ] `OrchestrationRuntime` logs warning when reaper fires with no handler set
- [ ] `isPersistableClaudeTranscriptEntry` lives in engine module; gateway sync has no Claude field names
- [ ] `deliverConnectorReply` failure emits `connector:reply_failed` event
- [ ] Status reconciler test: session stuck in "running" with continuation "completed" is recovered
- [ ] No static import of `gateway/api.ts` from `orchestration/` (CI lint rule)

---

## Skill Escalation

| Finding | Escalation Needed | Suggested Skill |
|---------|-------------------|-----------------|
| ARC-JIN-006 (delivery loss) | Reliability: retry durability, at-least-once contract | `audit-failsafe-readiness` |
| ARC-JIN-007 (dual persistence) | Recovery: split-brain reconciliation, crash recovery | `audit-recovery-idempotency` |
| ARC-JIN-004 (silent work loss) | Operator signal: work drop without alert | `audit-operator-signal` |

---

## Validation Limits

- `sessions/manager.ts` (891 lines) reviewed for ownership patterns only; full rate-limit retry logic and cost tracking were not audited.
- `gateway/server.ts` (1349 lines) reviewed for import structure and wiring only; individual subsystem startup sequences not traced.
- `orchestration/dual-lane.ts`, `orchestration/persistent-scheduler.ts` not reviewed in this pass.
- Connector implementations (discord, slack, telegram, whatsapp internal threading logic) sampled, not fully reviewed.
- Web `routes/` components (`.tsx`) not reviewed; only `lib/` layer checked.
- All conclusions from unreviewed surfaces marked `Plausible` or above only where structural patterns confirm them.
