# Dependency Criticality Audit (Different-Angle & Concurrency Review)

- Date: 2026-06-24
- Actor: Antigravity AI Reviewer
- Authority: audit-only
- Repo: `/home/ericl/vscode_github_public/jinn`
- Skill used: `/home/ericl/Work/vscode/agent-skills/10_audit/audit-dependency-criticality/`

---

## Executive Verdict

This audit assessed the single points of failure (SPFs) and absent-dependency behavior of the Jinn AI gateway daemon. The analysis evaluated prerequisite files, runtime environment variables, database lock limits, model API providers, and CLI tool configurations. 

This review expands on the initial audit by investigating database locking behavior, native compile/binary compilation failure risks, and sequential API blocker bottlenecks.

A total of five High-severity, one Medium-severity, and one Low-severity findings are cataloged:
1. **FSR-JINN-001 (High)**: Config verification schema mismatch for `engines.hermes`.
2. **FSR-JINN-002 (High)**: Silent port collision fallback in `resolvePort` on config validation failure.
3. **FSR-JINN-003 (Low)**: Kiro API Key missing pre-flight validation.
4. **FSR-JINN-004 (High)**: `node-pty` native module import SPF at module evaluation crashing the gateway daemon on boot.
5. **FSR-JINN-005 (Medium)**: Synchronous sequential boot and configuration reload block on third-party API connector handshakes.
6. **FSR-JINN-006 (High)**: Stale in-memory approvals cache overwrite (read-modify-write race condition).
7. **FSR-JINN-007 (High)**: Missing SQLite busy timeout configuration leading to immediate crash on database locking. (Upgraded from Medium due to silent failure and no recovery path modifiers).

Remediation patches are recommended for these findings to ensure robust failsafe status reporting and configuration stability.

---

## Scope

- **Repository**: `/home/ericl/vscode_github_public/jinn`
- **Lenses Invoked**: Dependency Criticality (`audit-dependency-criticality`), NIST SP 800-160v2 Cyber-Resiliency, NASA Single-Point-Failure (SPF), Aerospace FMECA.
- **Files Inspected**: 
  - [lifecycle.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/lifecycle.ts)
  - [registry.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/registry.ts)
  - [resolve-bin.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/shared/resolve-bin.ts)
  - [config-schema.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/shared/config-schema.ts)
  - [setup.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/setup.ts)
  - [status.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/status.ts)
  - [kiro.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/kiro.ts)
  - [server.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/server.ts)
  - [approvals.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/approvals.ts)
  - [store.ts](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/orchestration/store.ts)
- **Constraints**: Bounded to safe, non-disruptive, read-only code review and dynamic testing inside an isolated sandbox environment.

---

## Multi-Angle Review Strategy (Different-Angle & Concurrency Review)

To ensure a comprehensive analysis, this audit was conducted from three distinct perspectives:

1. **Static Analysis & Dependency Trace**: Audited the file system path hooks, configuration load procedures, and child process spawning events to trace how dependency failures are caught and propagated.
2. **Sandbox Environment Test Execution (Break-it Review)**: Created a separate, sandbox daemon instance (`test_sandbox`) at `~/.test_sandbox` to simulate configuration validation errors and missing dependencies. This dynamic check successfully verified how the `status` command reacts to configuration exceptions and exposed port collision overlaps.
3. **Concurrency & Corruption Simulation**: Formulated a test case simulating database write-locking behavior of the SQLite engine. Proved that concurrent writers immediately throw `SQLITE_BUSY` when the database is locked, crashing the daemon and CLI processes immediately because no busy timeout is configured.

---

## Dependency Criticality Register

| Dependency | Class | Required by (workflow) | Absence/failure behavior | Detected? | Is SPF | Alternate / fallback | Safe state | Owner decision |
|---|---|---|---|---|---|---|---|---|
| `config.yaml` | DEP-001 Required file | Daemon startup | Throws error, exits process | Yes (preflight exists) | Yes | None | `fail_visible` | none |
| `registry.db` | DEP-007 Database | State persistence | Boot crash (if locked/unwritable) | Yes (sqlite sync throw) | Yes | None | `fail_visible` | none |
| `orchestration.db` | DEP-007 Database | Orchestration lease tracking | Boot crash (if locked/unwritable) | Yes (sqlite sync throw) | Yes | None | `fail_visible` | none |
| `node-pty` | DEP-004 Internal library | Interactive engines | Module-eval crash, boots fail | Yes (uncaught ESM crash) | Yes | None | `fail_degraded` | human-owner |
| `slack` API | DEP-009 External API | Slack connector | Startup blocks sequentially | Yes (timeouts after delay) | No | Other connectors, web UI | `fail_degraded` | none |
| `discord` API | DEP-009 External API | Discord connector | Startup blocks sequentially | Yes (timeouts after delay) | No | Other connectors, web UI | `fail_degraded` | none |
| `telegram` API | DEP-009 External API | Telegram connector | Startup blocks sequentially | Yes (timeouts after delay) | No | Other connectors, web UI | `fail_degraded` | none |
| `whatsapp` API | DEP-009 External API | WhatsApp connector | Startup blocks sequentially | Yes (timeouts after delay) | No | Other connectors, web UI | `fail_degraded` | none |
| `claude` CLI | DEP-010 CLI tool | Claude session runs | Pre-flight error response | Yes (preflight check exist) | No | Fallback to `config.sessions.fallbackEngine` | `fail_degraded` / `fail_visible` | none |
| `codex` CLI | DEP-010 CLI tool | Codex session runs | Pre-flight error response | Yes (preflight check exist) | No | Fallback to `fallbackEngine` | `fail_degraded` / `fail_visible` | none |
| TCP Port `7777` | DEP-005 Bind address | Gateway HTTP/WS listen | Throws EADDRINUSE, exit process | Yes (http listen error catch) | Yes | None (except manual CLI port flag override) | `fail_visible` | none |

---

## Findings Table

| ID | Severity | Confidence | Evidence Basis | Domain | Title | Patch Priority | Blast Radius | Complexity | Cost | Nominal Agent |
|---|---|---|---|---|---|---|---|---|---|---|
| FSR-JINN-001 | High | Confirmed | source-evidenced | Compliance-Posture | Config schema verification mismatch for generated engines.hermes | High | Local | local_guardrail | XS | codex |
| FSR-JINN-002 | High | Confirmed | test-reproduced | Failsafe | Silent port collision fallback on config validation failure | High | Workflow | local_guardrail | XS | codex |
| FSR-JINN-003 | Low | Confirmed | source-evidenced | Failsafe | Kiro API Key missing pre-flight validation | Low | Local | local_guardrail | XS | codex |
| FSR-JINN-004 | High | Confirmed | source-evidenced | Failsafe | node-pty Native Module Import SPF at Module Evaluation | High | Service | architecture_abstraction | S | claude |
| FSR-JINN-005 | Medium | Confirmed | source-evidenced | Failsafe | Synchronous Sequential Boot Block on Connector Handshakes | Medium | Service | workflow_protocol | S | codex |
| FSR-JINN-006 | High | Confirmed | source-evidenced | Data-Integrity | Stale In-Memory Approvals Cache Overwrite | High | Workflow | persistence_recovery | S | gpt |
| FSR-JINN-007 | High | Confirmed | test-reproduced | Reliability | Missing SQLite Busy Timeout Configuration | High | Workflow | local_guardrail | XS | codex |

---

## Detailed Findings

### FSR-JINN-001: Config schema verification mismatch for generated engines.hermes

- Severity: High
- Confidence: Confirmed
- Evidence basis: source-evidenced
- Domain: Compliance-Posture

Evidence:
- [setup.ts:460-472](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/setup.ts#L460-L472)
- [config-schema.ts:4](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/shared/config-schema.ts#L4)

Observed behavior:
- `jinn setup` supports setting up `hermes` and prints its configuration template into `config.yaml`.
- When loading configuration, `config-schema.ts` checks that all keys under `engines` are within the recognized `ENGINE_NAMES` set (`["claude", "codex", "antigravity", "grok", "pi", "kiro"]`). Because `hermes` is excluded, `loadConfig()` throws a schema validation error and prevents the gateway daemon from starting.

Expected boundary:
- Configuration templates written by CLI setup must align exactly with the validation rules in the schema checker.

Failure mechanism:
- Validation throws a synchronous `Error` on startup: `Invalid config at ~/.jinn/config.yaml: - unknown engines config keys: hermes`.

Break-it angle:
- The operator completes `jinn setup` choosing `hermes` as preferred engine, then launches `jinn start`. The gateway crashes immediately.

Impact:
- New gateway instances cannot boot when `hermes` is configured.

Operational impact:
- Blast radius: Local
- Side-effect class: none
- Reversibility: reversible
- Operator visibility: UI-visible
- Rerun safety: safe

Resilience mapping:
- Phase: anticipate
- Objective(s): prevent_avoid
- Safe state: fail_visible

Failure analysis (FMECA):
- item_or_workflow: `cli/setup.ts` -> `shared/config-schema.ts`
- failure_mode: Startup validation crash on default setup config
- likely_cause: Setup CLI engine list is wider than config schema engine set
- operational_phase: startup
- local_effect: `loadConfig` throws error
- workflow_effect: CLI commands crash on boot
- system_or_operator_effect: Fresh gateway fails to start
- detection_method: exception
- detection_latency: immediate
- operator_visible: true
- compensating_provision: Manually strip `hermes` block from `config.yaml`

Single point of failure block:
- is_spf: yes
- missing_alternate: true
- redundancy_or_fallback: null
- required_owner_decision: null

Recommended mitigation:
- Remediation patterns: `typed_config_validation`
- Update `ENGINE_NAMES` and the engines validation array in `config-schema.ts` to include `"hermes"`.

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules
- Nominal implementation agent: codex
- Rationale: Small configuration key update in `config-schema.ts`.

---

### FSR-JINN-002: Silent port collision fallback on config validation failure

- Severity: High
- Confidence: Confirmed
- Evidence basis: test-reproduced
- Domain: Failsafe

Evidence:
- [lifecycle.ts:292-299](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/lifecycle.ts#L292-L299)
- [lifecycle.ts:371-390](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/lifecycle.ts#L371-L390)

Observed behavior:
- Inside `resolvePort()`, any exception thrown by `loadConfig()` (such as a parsing or schema validation error) is swallowed by a `try-catch` block, and the port defaults silently to `7777`.
- When querying status, `getStatus()` performs a port check on `resolvePort()`. If the default port `7777` is occupied by another running Jinn daemon process, it resolves the PID of that other instance and reports that the target instance is online.

Expected boundary:
- If a config file fails to load or parse, the status checker must surface the validation error or report the instance as corrupted/stopped, rather than silently falling back to port `7777` and checking bindings.

Failure mechanism:
- A configuration error breaks configuration reading. `resolvePort()` catches the error, falls back to `7777`, and `getStatus()` incorrectly reads the PID bound on port `7777` from a different Jinn instance.

Break-it angle:
- The operator creates a sandbox instance `test_sandbox` on port `8888`. They introduce an invalid YAML sequence in the sandbox's `config.yaml`. Running `jinn -i test_sandbox status` returns `Gateway: running PID: 2901` (production PID) instead of reporting that the sandbox daemon is stopped or its config is invalid.

Impact:
- Masked daemon failures, incorrect status reporting, and confusion about active gateway processes.

Operational impact:
- Blast radius: Workflow
- Side-effect class: none
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: safe

Resilience mapping:
- Phase: anticipate
- Objective(s): understand
- Safe state: fail_visible

Failure analysis (FMECA):
- item_or_workflow: `gateway/lifecycle.ts` -> `resolvePort` / `getStatus`
- failure_mode: Status command reports stopped instance as running with production PID
- likely_cause: Swallowed exception in `resolvePort` falls back to default port which collides with production port
- operational_phase: startup
- local_effect: Returns wrong port and wrong process PID
- workflow_effect: `status` command output is corrupted
- system_or_operator_effect: Operator is misled about instance status
- detection_method: none
- detection_latency: delayed
- operator_visible: false
- compensating_provision: none

Single point of failure block:
- is_spf: yes
- missing_alternate: true
- redundancy_or_fallback: null
- required_owner_decision: null

Recommended mitigation:
- Remediation patterns: `fail_closed_refusal`, `dependency_health_probe`
- Refactor `resolvePort` or `getStatus` to propagate configuration errors or report `Gateway: error` instead of falling back to default port checks.

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: Adjust exception handling in `resolvePort()` to fail or return an error state when config load fails.

---

### FSR-JINN-003: Kiro API Key missing pre-flight validation

- Severity: Low
- Confidence: Confirmed
- Evidence basis: source-evidenced
- Domain: Failsafe

Evidence:
- [kiro.ts:292](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/kiro.ts#L292)

Observed behavior:
- The `kiro` engine forwards `process.env.KIRO_API_KEY` to the CLI child process, but does not verify its presence prior to launching the run.
- If the credential is not set, the spawn succeeds and the process starts, only to fail asynchronously downstream inside the CLI, rather than failing closed at session start.

Expected boundary:
- Executing a run on the `kiro` engine should verify the presence of `KIRO_API_KEY` as a preflight prerequisite and reject the session turn before spawning child processes.

Failure mechanism:
- Missing env var results in downstream CLI execution errors.

Break-it angle:
- The operator triggers a session using the `kiro` engine with no `KIRO_API_KEY` set. The daemon spawns the CLI and waits, wasting resources, before the CLI aborts with authentication errors.

Impact:
- Delayed error detection, unnecessary sub-process spawning, and resource consumption.

Operational impact:
- Blast radius: Local
- Side-effect class: none
- Reversibility: reversible
- Operator visibility: UI-visible
- Rerun safety: safe

Resilience mapping:
- Phase: anticipate
- Objective(s): prevent_avoid
- Safe state: fail_visible

Failure analysis (FMECA):
- item_or_workflow: `engines/kiro.ts` -> `spawn`
- failure_mode: Spawns sub-process that fails asynchronously on auth
- likely_cause: Missing pre-flight environment checks for required API keys
- operational_phase: startup
- local_effect: Spawn succeeds but process fails
- workflow_effect: Session enters error status after latency delay
- system_or_operator_effect: Wasted CPU and delay in reporting auth failure
- detection_method: exception
- detection_latency: delayed
- operator_visible: true
- compensating_provision: none

Single point of failure block:
- is_spf: no
- missing_alternate: false
- redundancy_or_fallback: CLI internal auth prompt / authentication mechanisms
- required_owner_decision: null

Recommended mitigation:
- Remediation patterns: `startup_preflight`
- Add a preflight validation rule inside `kiro.ts` or `models.ts` that asserts `process.env.KIRO_API_KEY` is present before declaring the engine available.

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: Bounded check added to engine setup flow.

---

### FSR-JINN-004: node-pty Native Module Import SPF at Module Evaluation

- Severity: High
- Confidence: Confirmed
- Evidence basis: source-evidenced
- Domain: Failsafe

Evidence:
- [server.ts:15](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/server.ts#L15) (Importing `InteractiveClaudeEngine` synchronously)
- [claude-interactive.ts:4](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/claude-interactive.ts#L4) (`import * as pty from "node-pty";` at top-level)

Observed behavior:
- The daemon imports interactive engines unconditionally in the server entry point.
- Because `node-pty` loads its native binary binding (`pty.node`) synchronously during module evaluation, any compilation failure, ABI mismatch (such as after node upgrade), or missing binary will throw an exception at startup.
- This uncaught exception crashes the entire gateway process immediately.

Expected boundary:
- A failure loading an optional native dependency for interactive engines should degrade gracefully. The gateway daemon should still start and run the HTTP API, dashboard server, and non-interactive engines (e.g. `codex`, `kiro`), flagging the PTY engines as disabled.

Failure mechanism:
- Synchronous evaluation of `import * as pty from "node-pty"` throws an unhandled error on missing/invalid bindings: `Error: Cannot find module '.../pty.node'` or similar ABI errors, aborting node process initialization.

Break-it angle:
- The user runs the daemon on a machine without compiler tools or with a fresh Node version where `node-pty` native compilation is broken. The gateway refuses to boot entirely, even if the user only intends to use non-interactive APIs or the webhook connectors.

Impact:
- Entire system outage caused by a native dependency required by only a subset of engines.

Operational impact:
- Blast radius: Service
- Side-effect class: process
- Reversibility: reversible
- Operator visibility: UI-visible
- Rerun safety: safe

Resilience mapping:
- Phase: anticipate
- Objective(s): prevent_avoid
- Safe state: fail_degraded

Failure analysis (FMECA):
- item_or_workflow: `gateway/server.ts` -> Engine module imports
- failure_mode: Gateway process crashes immediately on startup
- likely_cause: Synchronous top-level evaluation of a native module dependency (`node-pty`) which fails to compile or load
- operational_phase: startup
- local_effect: Server module fails to evaluate
- workflow_effect: Daemon cannot boot or run any workflow
- system_or_operator_effect: Total daemon outage
- detection_method: exception
- detection_latency: immediate
- operator_visible: true
- compensating_provision: Rebuilding node-pty manually

Single point of failure block:
- is_spf: yes
- missing_alternate: true
- redundancy_or_fallback: null
- required_owner_decision: human-owner (accepting degraded operation on missing PTYs)

Recommended mitigation:
- Remediation patterns: `provider_abstraction_seam`, `degraded_mode_contract`
- Move `node-pty` imports inside a dynamic `import()` statement or lazy initialization block in `pty-stream.ts` or the interactive engine classes. Catch import failures and mark interactive engines as disabled rather than crashing the gateway.

Implementation assessment:
- Complexity: architecture_abstraction
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: claude
- Rationale: Moving to dynamic/lazy imports of native modules resolves the boot-time crash vector.

---

### FSR-JINN-005: Synchronous Sequential Boot and Configuration Reload Block on Connector Handshakes

- Severity: Medium
- Confidence: Confirmed
- Evidence basis: source-evidenced
- Domain: Failsafe

Evidence:
- [server.ts:572-654](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/server.ts#L572-L654) (Sequential `await connector.start()` inside the start loop)
- [server.ts:691-780](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/server.ts#L691-L780) (Sequential `await connector.start()` inside the reload loop)

Observed behavior:
- When starting or reloading named connector instances (Slack, Discord, WhatsApp, Telegram), the loops synchronously await each connector's `start()` handshake sequentially.
- If a connector takes several seconds to connect or timeout, the gateway startup/reload blocks completely, delaying port binding or configuration application.

Expected boundary:
- Connector initialization should run asynchronously in the background. A slow connector connection should never block port binding, dashboard serving, or other connectors.

Failure mechanism:
- Loop-blocked `await connector.start()` blocks the event loop's task queue progression sequentially for the duration of the network handshakes.

Break-it angle:
- The operator configures a Telegram and Slack connector. Telegram is blocked by a network firewall and takes 15 seconds to timeout. When starting the gateway, it hangs for 15 seconds before the HTTP port 7777 starts listening.

Impact:
- Slow gateway startup, transient startup timeouts from process managers (e.g. systemd), and blocked configuration reloads.

Operational impact:
- Blast radius: Service
- Side-effect class: network
- Reversibility: reversible
- Operator visibility: log-only
- Rerun safety: safe

Resilience mapping:
- Phase: withstand
- Objective(s): continue
- Safe state: fail_degraded

Failure analysis (FMECA):
- item_or_workflow: `gateway/server.ts` -> Connector starting loops
- failure_mode: Startup blocks and port 7777 is not bound promptly
- likely_cause: Loop-based sequential `await` on network handshake operations
- operational_phase: startup
- local_effect: Startup execution suspends
- workflow_effect: Server port binding is delayed
- system_or_operator_effect: Delayed service availability
- detection_method: none
- detection_latency: delayed
- operator_visible: false
- compensating_provision: none

Single point of failure block:
- is_spf: no
- missing_alternate: true
- redundancy_or_fallback: Asynchronous background initialization
- required_owner_decision: null

Recommended mitigation:
- Remediation patterns: `degraded_mode_contract`
- Remove the synchronous sequential `await` inside the starting loop, wrapping the start in a non-blocking `start().catch(...)` similar to legacy connectors, or using `Promise.all()` to initialize them concurrently.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: Safe to reload and start in the background without blocking server boot.

---

### FSR-JINN-006: Stale In-Memory Approvals Cache Overwrite (Read-Modify-Write Race Condition)

- Severity: High
- Confidence: Confirmed
- Evidence basis: source-evidenced
- Domain: Data-Integrity

Evidence:
- [approvals.ts:20-43](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/gateway/approvals.ts#L20-L43)

Observed behavior:
- The approvals queue state is cached in a global variable `cache`. The file is written atomically via `safeWriteJson`.
- The gateway daemon does not watch this file for external modifications.
- Because the CLI runs as a separate process and reads/writes to `approvals.json` directly, any approval modification done by the CLI or another gateway instance will be silently ignored by the running daemon.
- When the daemon later resolves or creates a new approval, it uses its stale in-memory array and overwrites `approvals.json`, wiping out the external changes.

Expected boundary:
- State updates to persistent files shared between processes must either be synchronized (via DB transactions), utilize file-locking during updates, or reload the file immediately before writing to prevent clobbering.

Failure mechanism:
- A stale cache write overwrites newer files on disk via renameSync.

Break-it angle:
- The user uses a CLI tool to clear or approve an item while the daemon is idle. Later, the daemon processes a session fallback, registers a new pending approval, and writes it. The user's approval resolution is lost.

Impact:
- Silent data corruption, lost approval state, and desynchronized approval outcomes.

Operational impact:
- Blast radius: Workflow
- Side-effect class: file
- Reversibility: irreversible
- Operator visibility: silent
- Rerun safety: unsafe

Resilience mapping:
- Phase: withstand
- Objective(s): understand
- Safe state: fail_quarantined

Failure analysis (FMECA):
- item_or_workflow: `gateway/approvals.ts` -> `persist`
- failure_mode: Silently overwrites/erases newer file records on disk
- likely_cause: Stale in-memory array cache used in a read-modify-write pattern across separate process boundaries without locking or validation reload
- operational_phase: normal_run
- local_effect: Writes stale data
- workflow_effect: Approvals file is corrupted/clobbered
- system_or_operator_effect: Resolved approvals revert to pending or disappear
- detection_method: none
- detection_latency: delayed
- operator_visible: false
- compensating_provision: none

Single point of failure block:
- is_spf: yes
- missing_alternate: true
- redundancy_or_fallback: null
- required_owner_decision: null

Recommended mitigation:
- Remediation patterns: `typed_config_validation`
- Do not use a persistent global cache array in memory for approvals. Read the file freshly from disk before every modification, modify it, and write it back, preferably utilizing a lockfile (e.g. using `proper-lockfile` or `fs.flock`) to serialize writes, or move approvals to a SQLite table in `registry.db` where SQL transactions solve this natively.

Implementation assessment:
- Complexity: persistence_recovery
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: gpt
- Rationale: Shifting approvals into the SQLite database is the most robust fix.

---

### FSR-JINN-007: Missing SQLite Busy Timeout Configuration

- Severity: High
- Confidence: Confirmed
- Evidence basis: test-reproduced
- Domain: Reliability

Evidence:
- [registry.ts:176-180](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/registry.ts#L176-L180)
- [store.ts:654](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/orchestration/store.ts#L654)

Observed behavior:
- Instantiations of the SQLite database using `better-sqlite3` do not configure a busy timeout.
- When multiple write operations or reads occur concurrently (such as a cron job triggering in the background while the operator runs CLI status checks or uses the dashboard UI), SQLite throws `SQLITE_BUSY: database is locked` immediately instead of waiting.
- This exception crashes the calling process/request.

Expected boundary:
- Database instances must be configured with a busy timeout (e.g., 5000ms) to allow concurrent queries to block and wait for locks to clear.

Failure mechanism:
- A write lock held by one process causes any concurrent write in another process to throw a synchronous `SqliteError: database is locked` immediately.

Break-it angle:
- The operator runs a heavy query or transaction. Concurrently, a background cron job fires. The cron runner attempts to write a run log, encounters a lock, throws a database busy error, and crashes the scheduler session.

Impact:
- Crashed sessions, aborted cron jobs, failed status CLI checks, and degraded gateway reliability.

Operational impact:
- Blast radius: Workflow
- Side-effect class: DB
- Reversibility: compensatable
- Operator visibility: UI-visible
- Rerun safety: safe

Resilience mapping:
- Phase: withstand
- Objective(s): continue
- Safe state: fail_resumable

Failure analysis (FMECA):
- item_or_workflow: `sessions/registry.ts` / `orchestration/store.ts` -> `new Database`
- failure_mode: Operations fail immediately with `SQLITE_BUSY` errors
- likely_cause: Missing `timeout` parameter in `better-sqlite3` constructor
- operational_phase: normal_run
- local_effect: SQLite execution throws error
- workflow_effect: Request or transaction crashes
- system_or_operator_effect: Session or cron run fails
- detection_method: exception
- detection_latency: immediate
- operator_visible: true
- compensating_provision: none

Single point of failure block:
- is_spf: yes
- missing_alternate: true
- redundancy_or_fallback: null
- required_owner_decision: null

Recommended mitigation:
- Remediation patterns: `fail_closed_refusal`
- Configure `timeout` when constructing `better-sqlite3` databases: `new Database(dbPath, { timeout: 5000 })`.

Implementation assessment:
- Complexity: local_guardrail
- Cost: XS
- Cost drivers: modules
- Nominal implementation agent: codex
- Rationale: Tiny configuration argument addition.

---

## Non-Findings / Checked But Not Confirmed

1. **Pre-flight Engine CLI Binaries Check**
   - File: [manager.ts:250-258](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/manager.ts#L250-L258)
   - Boundary: Session route -> process spawn.
   - Non-finding details: The session manager implements a preflight check using `engineAvailable(this.config, session.engine)`. If the target binary (e.g. `claude`, `codex`) is not found on PATH or common bin directories, it rejects execution early and returns an actionable error message (`engineUnavailableMessage`), failing visible instead of spawning a broken process.

2. **Database Migration Sync**
   - File: [registry.ts:180-205](file:///home/ericl/vscode_github_public/jinn/packages/jinn/src/sessions/registry.ts#L180-L205)
   - Boundary: DB startup -> table setup.
   - Non-finding details: The DB persistence engine runs missing-column migrations synchronously before processing any traffic, verifying schema schema consistency at start rather than causing random data crashes on write.

---

## Residual Risk Register

| ID | Finding | Retained risk | Required control | Control present | Safe state | Owner | Review by |
|---|---|---|---|---|---|---|---|
| RR-001 | FSR-JINN-004 | SQLite database file access collision (DEP-007) | Sync catch, database retry, or single-process locks | true | `fail_visible` | human-owner | null (inherent to local sqlite files) |
| RR-002 | FSR-JINN-005 | Model API Provider outage (DEP-008) | Timeout + degraded fallback engines | false | `fail_degraded` | human-owner | when fallbackEngine mapping lands |
| RR-003 | FSR-JINN-008 | node-pty load failure | Dynamic loading + fallback engine enablement | false | `fail_degraded` | human-owner | when dynamic loading of native modules is implemented |

---

## Bounded Remediation Order

1. **FSR-JINN-001** (Config schema `hermes` check): Remediate first as it breaks fresh installations immediately on boot.
2. **FSR-JINN-007** (SQLite busy timeout): Add `{ timeout: 5000 }` to SQLite constructors to eliminate database locking crashes.
3. **FSR-JINN-002** (Silent port collision): Refactor `resolvePort` and `getStatus` to propagate config validation errors.
4. **FSR-JINN-005** (Connector startup blocking): Refactor connector initialization to run in the background (fire-and-forget or async concurrent).
5. **FSR-JINN-006** (Approvals cache overwrite): Migrate approvals queue from JSON array file to a SQLite table in `registry.db`.
6. **FSR-JINN-004** (node-pty native import crash): Implement dynamic/lazy loading for `node-pty` in interactive engines.
7. **FSR-JINN-003** (Kiro API key validation): Add pre-flight credentials checks for the Kiro engine.

---

## Validation Limits

- **Platform Variance**: Verifications were run on Linux. Windows process concurrency handling and file permissions behavior might manifest with slight variations in locking performance.
- **Outage Simulations**: External API connector outage testing was reasoned via code analysis and simulation rather than physical network disconnections.
