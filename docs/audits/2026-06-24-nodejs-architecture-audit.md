# Node.js Architecture Audit

- Date: 2026-06-24
- Actor: Gemini 3.5 Flash
- Authority: audit-only
- Repo: `/home/ericl/vscode_github_public/jinn`
- Skill used: `/home/ericl/Work/vscode/agent-skills/10_audit/audit-nodejs-architecture/`

## Scope

This audit targets the Node.js backend architecture of the Jinn AI gateway daemon. The analysis focuses on module boundaries, routing layout, database persistence layer boundaries, configuration management, async execution seams, and testing boundaries. 

The scope is bounded to:
- `packages/jinn/src/gateway/`
- `packages/jinn/src/sessions/`
- `packages/jinn/src/shared/`

## Orientation Notes

- [AGENTS.md](file:///home/ericl/vscode_github_public/jinn/AGENTS.md), [README.md](file:///home/ericl/vscode_github_public/jinn/README.md), and [docs/feature_inventory.md](file:///home/ericl/vscode_github_public/jinn/docs/feature_inventory.md) were read.
- The monorepo layout maps to standard workspaces using `pnpm`.
- The backend relies on standard library features (`http.IncomingMessage` and `http.ServerResponse`) for REST services, bypassing web frameworks like Express or Fastify.
- Persistence uses `better-sqlite3` on a local registry database file.

---

## Component & Boundary Inventory

| Surface | Boundary | Notes |
|---|---|---|
| [jinn.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/bin/jinn.ts) | CLI Entry Point | Parses options with `commander`, dynamically imports commands from `src/cli/` after setting up the environment. |
| [server.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/server.ts) | HTTP/WS Server | Initializes registries, cron, connectors, and handles server listen and WebSocket heartbeats. |
| [api.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/api.ts) | HTTP API Router | Sequential pattern matching routes `/api/*` endpoints and parses JSON/multimedia payloads. |
| [board-service.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/board-service.ts) | Board Management | Synchronous file reading, parsing, merging, writing, and backup rotation of department boards. |
| [registry.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/registry.ts) | DB Persistence | Handles SQLite SQL operations, FTS indexes, migration states, and transaction wraps. |
| [manager.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/manager.ts) | Session Lifecycle | Tracks active sessions, triggers, and routes messages to specific engine adapters. |
| [queue.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/queue.ts) | Session Queue | Controls sequential and paused states for session runs. |
| [callbacks.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/callbacks.ts) | Session Notification | Wakes parent sessions or channels using local API requests. |
| [org.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/org.ts) | Org Schema Parser | Scans filesystem for employee and department structures. |

---

## Findings Table

| ID | Severity | Confidence | Lens | Status |
|---|---|---|---|---|
| CON-JINN-001 | High | Confirmed | Concurrency, Data-Integrity | Open |
| ARC-JINN-002 | Medium | Confirmed | Architecture, Failsafe | Open |
| ARC-JINN-003 | Medium | Confirmed | Architecture, Reliability | Open |

---

## Detailed Findings

### CON-JINN-001: Board update writes use a non-atomic last-writer-wins merge strategy, enabling manual PUT updates to silently overwrite concurrent status updates

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Concurrency

Evidence:
- [board-service.ts:146-156](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/board-service.ts#L146-L156) (`mergeBoardTickets`)
- [board-service.ts:175-196](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/board-service.ts#L175-L196) (`writeMergedBoard`)

Observed behavior:
- `writeMergedBoard` reads the department board file, merges incoming ticket arrays using `mergeBoardTickets`, and writes the serialization back to disk. 
- During `mergeBoardTickets`, if an incoming ticket matches the ID of an existing ticket on disk, the properties are resolved entirely from the incoming data—unless the existing on-disk ticket has its source tagged as `"session"`.
- If the operator submits a stale PUT payload (e.g. they loaded the UI board, then a background worker updated a ticket to `in_progress` and added a `sessionId`, then the operator drags another ticket and saves the board), the stale PUT payload will clobber the updated status and `sessionId` values of the concurrently modified ticket.

Expected boundary:
- Board update operations should enforce optimistic concurrency control (e.g., via checking a version counter or verifying `updatedAt` stamps) before committing the file write. Stale UI updates must be rejected or merged without losing active session metadata.

Failure mechanism:
- Because the UI sends the entire array of tickets during drag/drop actions, the write merges a stale representation of adjacent tickets. The backend does not check if the tickets being replaced were updated concurrently, leading to silent state overwriting.

Break-it angle:
- The `board-worker` scheduler loop selects a ticket and automatically dispatches it, setting its status to `in_progress` and assigning a `sessionId`. An operator who has a stale view open in the dashboard moves another ticket on the board, triggering a PUT request. The PUT payload's stale representation of the dispatched ticket overwrites the on-disk state back to `todo` and drops the `sessionId`. The session remains running in the background, but the UI has lost track of it.

Impact:
- Lost session IDs, corrupted ticket statuses, duplicate dispatches, and mismatched operator dashboard state.

Operational impact:
- Blast radius: Workflow
- Side-effect class: file
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: safe

Adjacent failure modes:
- None.

Recommended mitigation:
- Remediation patterns: optimistic concurrency check, ticket versioning.
- Add an `updatedAt` check: verify that each ticket in the PUT request does not have a newer `updatedAt` value on disk. Reject with a `409 Conflict` if the payload is stale, or merge properties cleanly at the attribute level.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: Direct modification of `board-service.ts` logic and API handlers, supported by unit tests simulating stale saves.

Validation:
- Create a test that calls `writeMergedBoard` with a stale payload and asserts that it throws an exception or retains the concurrent session parameters.

---

### ARC-JINN-002: Domain callbacks perform synchronous config file reads and network HTTP loopbacks instead of using direct service APIs

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- [callbacks.ts:220-223](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/callbacks.ts#L220-L223) (`_sendDiscordNotification` config load)
- [callbacks.ts:248-251](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/callbacks.ts#L248-L251) (`_sendRaw` loopback port lookup)

Observed behavior:
- Inside `_sendRaw` and `_sendDiscordNotification`, the session callback subsystem reads the config file synchronously from the disk (`loadConfig()`) to retrieve the gateway port.
- It then constructs a full HTTP request (`fetch`) targeting the localhost IP (`http://127.0.0.1:${port}/api/...`) to communicate with other sessions or post updates.

Expected boundary:
- Domain modules should communicate using in-process APIs (such as EventEmitters, EventBus, or direct registry/manager calls) instead of loopback TCP/HTTP network connections. Configuration parameters should be passed or injected into callbacks instead of forcing synchronous disk parses inside wake cycles.

Failure mechanism:
- Because the callback loop issues synchronous I/O (`fs.readFileSync` inside `loadConfig`) and then maps network `fetch` loops, it blocks the main single-threaded event loop. If the gateway server is temporarily starting up, shutting down, or has its socket pool saturated, notifications will fail with `ECONNREFUSED` or timeout exceptions.

Break-it angle:
- A high volume of session completions triggers multiple callbacks simultaneously. Each completion triggers synchronous file read/parse sequences, stalling the Node.js event loop and saturating TCP ports on `127.0.0.1`.

Impact:
- Thread starvation, synchronous filesystem parse latency overhead, and failure to wake parent sessions if the local HTTP port is occupied or unresponsive.

Operational impact:
- Blast radius: Local
- Side-effect class: network
- Reversibility: compensatable
- Operator visibility: log-only
- Rerun safety: safe

Adjacent failure modes:
- None.

Recommended mitigation:
- Remediation patterns: local message bus, dynamic port injection.
- Refactor parent notification flow to pass messages through the instantiated `SessionManager` event handlers or an in-memory event bus rather than fetching loopback endpoints.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: claude
- Rationale: Moving from HTTP relay to memory-based message passing requires refactoring callback interfaces across `sessionManager`.

Validation:
- Mock the HTTP stack and verify that parent notifications can be triggered without network activity.

---

### ARC-JINN-003: Core environment variable evaluation is locked at module load time, making unit tests prone to state pollution

Severity: Medium (Low if bounded to tests)
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Architecture

Evidence:
- [paths.ts:9-16](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/shared/paths.ts#L9-L16) (`resolveHome` module evaluation)

Observed behavior:
- `resolveHome()` executes immediately when `paths.ts` is imported, freezing directory path constants like `JINN_HOME` and `CONFIG_PATH`.
- Unit tests that need to target temporary sandboxes must call `vi.resetModules()` and dynamically import all dependencies using `await import(...)` in `beforeEach` blocks to prevent pollution.

Expected boundary:
- Path resolution should be evaluated dynamically via function calls or retrieved from an execution context rather than locking constants at the time of module loading.

Failure mechanism:
- If a test file statically imports `paths.ts` directly or indirectly, `JINN_HOME` is computed immediately based on the environment state at that instant. Subsequent edits to `process.env.JINN_HOME` do not alter the constants, causing tests to write files in incorrect locations.

Break-it angle:
- A test suite helper statically imports a utility that depends on `paths.ts`. A test run sets `process.env.JINN_HOME` inside `beforeEach` to mock an instance, but because the module was already loaded, the backend writes session files directly into the operator's real `~/.jinn` home registry, polluting production states.

Impact:
- Test suite instability, high reliance on cache-clearing tools (`vi.resetModules()`), and risk of writing test state into active daemon folders.

Operational impact:
- Blast radius: Local
- Side-effect class: file
- Reversibility: reversible
- Operator visibility: silent
- Rerun safety: safe

Adjacent failure modes:
- None.

Recommended mitigation:
- Remediation patterns: getter paths, dynamic path configuration.
- Convert exported path strings into dynamic getters (e.g. `export const JINN_HOME = () => resolveHome()`) or parameterize them inside a settings class.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: Straightforward change to paths utility exports and refactoring downstream usages from static strings to functional lookups.

Validation:
- Verify that modifying `process.env.JINN_HOME` during test runs shifts destination folders without requiring module cache resets.

---

## Detailed Non-Findings

1. **Request Routing and Traversal Guards**
   - File: [match-route.ts:13-22](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/api/match-route.ts#L13-L22)
   - Boundary: Request path parsing -> router param extraction.
   - Non-finding details: The custom routing implementation is resilient against path traversal attacks. It explicitly checks for percent-encoded separator sequences (`%2f`, `%5c`) and rejects parameters containing standard directory traversal indicators (`.`, `..`, `/`, `\`, `\0`), ensuring dynamic parameter resolution (e.g., matching session IDs or skills) cannot escape sandbox directories.

2. **Concurrent Process Safety in Websockets**
   - File: [server.ts:1050-1060](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/server.ts#L1050-L1060)
   - Boundary: WebSocket connection sweep -> PTY session lifetimes.
   - Non-finding details: The WebSocket subsystem isolates normal broadcast clients from session-specific PTY channels, keeping them on separate WS server objects. A protocol-level ping/pong sweep automatically terminates half-open connections, triggering the `onDisconnect` handlers to cleanly decrement viewer counts and prevent process leaks.

3. **Database Transaction Isolation**
   - File: [registry.ts:758-769](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/registry.ts#L758-L769)
   - Boundary: Registry session writes -> SQLite transactions.
   - Non-finding details: Direct database updates in `registry.ts` that involve multi-statement operations (such as updating transport metadata or duplicate session snapshots) are correctly wrapped in native SQLite transactions using `better-sqlite3` `db.transaction()` callbacks, preventing half-written states in the registry.

---

## Risk-Ranked Recommendations

1. **Implement Optimistic Concurrency Control for Boards (High Risk - CON-JINN-001)**
   - Introduce an `updatedAt` timestamp comparison or auto-incrementing board state version ID inside `board.json`.
   - Update `PUT /api/org/departments/:name/board` to assert that the received board state matches the current version on disk. Return `409 Conflict` on mismatches.
   - *Follow-up routing:* `plan-nodejs-architecture` (to draft precise API patch protocol).

2. **De-couple Domain Callbacks from Network Loopbacks (Medium Risk - ARC-JINN-002)**
   - Replace HTTP loopback fetches in `callbacks.ts` with direct calls to `sessionManager` queue dispatch methods.
   - Pass port/connector options to notifier functions using context variables rather than calling `loadConfig()` synchronously inside hot loops.
   - *Follow-up routing:* `repair-nodejs-defect` (to migrate message triggers).

3. **Refactor Path Resolution to Dynamic Getters (Low Risk - ARC-JINN-003)**
   - Modify `paths.ts` to expose getter methods or evaluate constants dynamically so runtime environment overrides are reflected immediately without resetting the module cache.
   - *Follow-up routing:* `repair-nodejs-defect` (to refactor static imports).
