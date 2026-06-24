# Matrix Orchestration — End-to-End Capability Plan

> **Status:** Phase 1 and M1–M7 are **complete** (Codex, 2026-06-23).
> This is the **full-capability roadmap** from inert scaffold to real,
> daemon-integrated provider-neutral matrix scheduler; reading it changes no code.
>
> **Execution discipline:** Every implementation milestone below is built with the
> `plan-prototype-build` skill at `~/vscode/agent-skills/30_plan/plan-prototype-build/`
> (Gates 0–7: orient → plan → skeleton → core → interface/IO/persistence → hardening
> → docs → final QA/QC), with a per-gate audit, a defect ledger, and the 800-line
> file limit enforced via `tools/line_count_check.sh`. The *roadmap* is the milestone
> sequence M1–M11; the *gate loop* is how each milestone is implemented.
>
> **Authority model (from the source brief):** one strong implementer per slice +
> strict written brief + small patch slices + deterministic tests + manual review.
> The Jinn agent "department" is a **review/hardening layer**, never the first mover.
> Do not point the whole department at "implement matrix orchestration".

---

## 0. Goal & Non-Goals

### Goal

A **provider-neutral matrix orchestration layer** for Jinn (extractable to Cuttlefish
later) that dynamically assembles task-specific teams from a pool of qualified
workers, while:

- preventing agent collision (exclusive leases),
- controlling cost (quota + risk-based team assembly + local-compute preference),
- using local compute aggressively (Ollama/Pi/local workers for triage),
- preserving the **one-implementer-per-patch-slice** discipline (isolated worktrees),
- keeping **deterministic tests/validation as authority**, not model confidence.

The target shape: `central scheduler + persistent worker pool + ephemeral coordinators
+ exclusive leases + queue/blocking + provider-aware routing + isolated worktrees +
deterministic QA gates`.

### Non-Goals (whole program)

- Permanent "OpenAI department vs Anthropic department" topology.
- DAWES-specific governance (SAM.gov, GSA, SBIR, provenance gates) baked into the
  generic scheduler — those are downstream policy packs, later, elsewhere.
- Breaking the Claude **subscription / interactive-PTY billing path**
  (`cc_entrypoint=cli`) — see `AGENTS.md` "Prohibited automation behavior".
- Replacing the existing session execution engine. The scheduler sits **above**
  the session manager; it does not reimplement engine execution.

### Non-Goals (Phase 1, already honored by Codex)

No real provider calls, no GUI, no daemon integration, no worktrees, no persistence,
no changes to the live `~/.jinn` runtime or port 7777. (Verified: `packages/jinn/src/
orchestration/*` is in-memory and pure.)

---

## 1. Orientation (Gate 0 output — repo facts that constrain the design)

This section is the load-bearing part of the plan: the design is shaped by what
**already exists**. File:line references are exact as of 2026-06-23.

### 1.1 Repo shape

- pnpm + Turborepo TS monorepo. Packages: `packages/jinn` (gateway daemon + CLI,
  published as `jinn-cli`) and `packages/web` (Vite/React dashboard).
- Validation (repo root): `pnpm typecheck`, `pnpm test`, `pnpm lint` (turbo reports
  *no lint tasks configured* today), `pnpm build`. Per-package vitest:
  `pnpm --filter jinn-cli test -- <glob>` or `cd packages/jinn && npx vitest run <file>`.
- Node `>=24 <25`. ESM with `.js` import suffixes (mandatory).
- Governance: `governance/repo_config.yaml` declares `family: application`,
  `repo_type: service`, `repo_profile: service_backend`. `control/` and `governance/`
  currently contain **no enforced YAML policy files** in this checkout; `.giles/` is
  **absent**. Active constraints today = `AGENTS.md` + Dory + docs/logs + tests.
- **Software-delivery routing (`AGENTS.md`):** source edits under `~/vscode/*` must
  route through **Giles Watcher** first (a Job Plan: scope, files to inspect, files
  allowed/forbidden to change, tests required, budget ceiling, escalation criteria,
  expected report fields) *before any implementer is spawned*. The operator may waive
  per session. **Each implementation milestone below requires a Giles Job Plan or an
  explicit waiver as a gate precondition.**

### 1.2 Engine layer (the substrate the ProviderAdapter must wrap, not replace)

- Common interface: `Engine { name; run(opts): Promise<EngineResult> }` at
  `packages/jinn/src/shared/types.ts:14`. Stateful engines add
  `InterruptibleEngine { kill, isAlive, killAll, killIdle }` (same file).
- `EngineRunOpts` carries `prompt, systemPrompt, sessionId, resumeSessionId, cwd,
  model, effortLevel, attachments, cliFlags, mcpConfigPath, onStream, onActivity`.
  `EngineResult` carries `{ sessionId, result, cost?, durationMs?, numTurns?,
  contextTokens?, error?, rateLimit? }`. Streaming via `onStream(delta: StreamDelta)`.
- Engine registry is a `Map<string, Engine>` built in `packages/jinn/src/gateway/
  server.ts:365`. Names: `claude, codex, antigravity, grok, pi, kiro, hermes, mock`.
- Execution models differ per engine: **interactive PTY** (claude — subscription via
  `SsePtyProxy`; antigravity PTY-only), **headless spawn + JSON/transcript tail**
  (codex, grok, pi), **ACP/JSON-RPC** (hermes — see `engines/hermes-acp.ts`),
  **credit** (kiro), **mock** (`engines/mock.ts`, zero-cost canned responses).
- **`mock` is the natural `stub_provider` / `local_echo_provider`** for orchestration
  tests — no binary, deterministic, fires `onStream`, fixed $0.001 cost.
- Model metadata: `ModelInfo { id, label, supportsEffort, effortLevels, contextWindow }`
  and `EngineRegistryEntry { name, available, defaultModel, effortMechanism, models }`
  (`shared/types.ts:559+`, built in `shared/models.ts`). There is **no** existing
  `capability`, `tools-permission`, `cost_class`, or `worker` concept on engines —
  these are new in the orchestration layer.
- Cost classes today are **implicit** per engine (subscription / api-per-call /
  credit / free). Worker `costClass` must be authored, not derived, initially.

### 1.3 Session lifecycle & concurrency (the axis the scheduler sits above)

- A `Session` (`shared/types.ts:214`) is persisted in **SQLite** at
  `~/.jinn/sessions/registry.db` (WAL mode) via `sessions/registry.ts` (`initDb()`,
  CRUD, FTS5 messages, `queue_items`, `queue_pauses` tables).
- **The only concurrency control today is per-session-key serialization**:
  `SessionQueue` (`sessions/queue.ts`) — one turn at a time *per sessionKey*, with
  pause/resume (used by rate-limit handling). There is **no global per-engine
  concurrency cap** and **no worker pool**.
- Spawn path: connector/API → `SessionManager.route()` (`sessions/manager.ts:154`)
  → `queue.enqueue(sessionKey, () => runSession(...))` → engine resolve → context
  build (`sessions/context.ts`) → MCP resolve → `engine.run(...)` → rate-limit handling
  → persist. The web/cron/talk single-turn path is `gateway/run-web-session.ts:70`.
- **No git worktree usage exists anywhere.** Sessions isolate only by `cwd` (defaults
  to `JINN_HOME`). `sessions/fork.ts` duplicates *engine session state* (Claude
  `--fork-session`, Codex JSONL copy) — it is **not** filesystem isolation. Worktrees
  (M6) are genuinely new infrastructure.
- Rate-limit / usage: `shared/rateLimit.ts` (detect), `sessions/rate-limit-handler.ts`
  (wait-and-retry or fallback-engine state machine), `shared/usage-status.ts` +
  `shared/engine-limits.ts` (per-engine reset clocks in `~/.jinn/tmp/usage|engine-limits`).
  Kiro credit ledger lives here too.
- Cron scheduler precedent: `cron/scheduler.ts` uses node-cron + an `inFlight` Set
  (one run per job; second trigger → `skipped_overlap`), runs logged append-only to
  `~/.jinn/cron/runs/<jobId>.jsonl`. This is a useful *pattern* but not a resource
  scheduler (no quota/lease/queue).

### 1.4 Gateway / org / board (the parallel coordination system — collision risk)

- HTTP server: raw `http.createServer` in `gateway/server.ts:924`; routes are a long
  if-chain in `gateway/api.ts` using `matchRoute(pattern, pathname)`
  (`gateway/api/match-route.ts`). Auth: bearer/header/cookie token, constant-time
  compare (`gateway/auth.ts`). New routes go under a new prefix (recommend
  `/api/orchestration/...`).
- **Org system** (`gateway/org.ts`, `org-hierarchy.ts`): `~/.jinn/org/<dept>/*.yaml`.
  `Employee { name(immutable), rank: executive|manager|senior|employee, engine,
  model, persona, reportsTo, maxCostUsd, mcp, modelPolicy, provides[] }`. This is a
  **standing** team with a manager hierarchy.
- **Kanban board** (`gateway/board-service.ts`, `board-sync.ts`, `board-worker.ts`):
  `~/.jinn/org/<dept>/board.json` (statuses backlog|todo|in_progress|review|done|
  blocked). The board is a **status mirror**, *not* a dispatcher — except
  `board-worker.ts`, which **auto-dispatches** `todo` tickets to the department
  **manager** every ~5 min when chat is idle and the manager's engine has quota.
- Ticket dispatch: `gateway/ticket-dispatch.ts:105` `dispatchTicket()` → creates/reuses
  a session and runs a turn via `dispatchWebSessionRun`.
- **Collision risk (Risk R1, see §10):** `board-worker` and a future scheduler are
  *two dispatchers* that could both task the same engine/employee. The matrix layer
  must become the **single allocator**; org→worker bridging is a later, explicit
  adapter (M9), and `board-worker` must defer to the scheduler when both are live.
- Telemetry today: hash-chained integrity ledger `~/.jinn/audit.jsonl`
  (`shared/audit-log.ts` `appendAudit`/`verifyAuditChain`), gateway log
  `~/.jinn/logs/gateway.log` (`shared/logger.ts`), cron run jsonl. `logs/` and
  `docs/logs/` are git-ignored local artifacts (`AGENTS.md`).

### 1.5 Paths & conventions

- All runtime state under `JINN_HOME` (`shared/paths.ts`): `sessions/registry.db`,
  `cron/`, `org/`, `audit.jsonl`, `logs/`, `tmp/`, etc. **Never commit `~/.jinn`.**
- Plans live in `docs/superpowers/plans/<date>-<slug>.md`; design specs in
  `docs/superpowers/specs/<date>-<slug>-design.md`. `docs/INDEX.md` already indexes
  the `docs/superpowers/plans/` directory, so this file needs no INDEX edit.
- Public CLI/API/UI surfaces are catalogued in `docs/feature_inventory.md` (update
  per milestone as surfaces land — Codex already added the Phase-1 CLI rows).

---

## 2. Current state (what Phase 1 delivered)

Codex implemented the inert foundation (verified by reading the files):

- `packages/jinn/src/orchestration/{types,schemas,config,scheduler,index}.ts` — pure,
  in-memory, deterministic `MatrixScheduler` (atomic required-role allocation,
  optional-role best-effort, capability/tool/family/quota/concurrency matching,
  opposite-family reviewer constraint, deterministic worker sort, lease lifecycle:
  create/heartbeat/release/expire + `validateLeaseForWorker`, blocked-resource queue
  with priority retry, telemetry event list). `scheduler.ts` = 415 lines.
- Zod schemas + YAML loaders (`schemas.ts`, `config.ts`) for
  `workers.yaml / roles.yaml / coordinators.yaml / quotas.yaml`, allocation-request
  files, and simulation-scenario files.
- CLI (`cli/orchestration.ts` + `bin/jinn.ts`): `jinn workers list`,
  `jinn scheduler allocate <task> --dry-run`, `jinn scheduler simulate <scenario>`,
  all requiring explicit `--config-dir`; `allocate` refuses to run without `--dry-run`.
- Tests: `orchestration/__tests__/scheduler.test.ts` (14 cases) +
  `cli/__tests__/orchestration-scheduler.test.ts`.
- Docs: `docs/orchestration/README.md` + `docs/orchestration/examples/*.yaml`;
  `docs/INDEX.md`; `docs/feature_inventory.md` updated; local session log under
  `docs/logs/session/062026/`.

**What is still inert / missing (the gap this plan closes):** durable state, real
provider execution, worktrees, daemon/dashboard integration, live cross-family
enforcement, dual-lane mode, durable telemetry, org→worker bridging, and the safety
glue that connects scheduler routing to real usage/quota signals.

---

## 3. Target architecture (explicit design rulings)

These are the load-bearing decisions. Each is a *ruling* the milestones implement;
each carries the risk it mitigates.

### D1 — The scheduler sits **above** the session manager (not beside it)

A **Worker is not a Session.** A worker is a capability slot = `engine + model +
tool/mcp permissions + workspace policy + concurrency limit + capability metadata`.
A **lease** authorizes one coordinator to task one worker for one role on one task.
The *actual turn execution* still flows through the existing path
(`run-web-session.ts` / `sessions/manager.ts` → `engine.run`). The scheduler grants a
lease → a coordinator builds an `EngineRunOpts` for the leased worker → the turn runs
through the normal session machinery → on completion the lease is released. This keeps
`SessionQueue` (per-session ordering) and the lease model (global worker exclusivity)
on *different axes* and avoids reimplementing execution. **Mitigates R2.**

### D2 — `ProviderAdapter` is a **thin wrapper over the existing `Engine`**

The brief's `ProviderAdapter` (`can_execute, estimate_cost, estimate_context,
start_task, stream_output, cancel, get_status, collect_artifacts`) maps onto existing
primitives — it must not duplicate them:

| ProviderAdapter method | Backed by |
|---|---|
| `can_execute(role, task, tools)` | worker capability/tool match (scheduler) + `engineAvailable()` (`shared/models.ts`) |
| `estimate_cost / estimate_context` | `EngineRegistryEntry`/`ModelInfo.contextWindow` + worker `costClass`; no live call |
| `start_task(task, lease)` | validate lease (`validateLeaseForWorker`) → `engine.run(EngineRunOpts)` |
| `stream_output(run_id)` | existing `onStream(StreamDelta)` callback / PTY stream |
| `cancel(run_id)` | `InterruptibleEngine.kill(sessionId)` |
| `get_status(run_id)` | session status (`registry.ts`) + lease state |
| `collect_artifacts(run_id)` | `EngineResult` + worktree diff (M6) + emitted files (`UPLOADS_DIR`) |

Initial adapters = `stub` (no-op), `local_echo` (= `mock` engine), `manual`
(human-in-the-loop). Real adapters reuse the registered engines. **An adapter MUST
reject any `start_task` without a valid running lease owned by the caller.**
**Mitigates R3 (collision) and R7 (provider leakage into scheduler core).**

### D3 — Durable state in SQLite, following the `registry.ts` pattern

Full capability requires surviving daemon restarts. Add orchestration tables
(`workers_runtime`?, `leases`, `allocations`, `queue_items`, `telemetry_events`) — to
a dedicated `~/.jinn/orchestration/registry.db` (cleanest extraction boundary for
Cuttlefish) **or** new tables in the existing `sessions/registry.db`. **Ruling:**
separate DB file `~/.jinn/orchestration.db`, WAL mode, same `better-sqlite3` +
migration discipline as `sessions/registry.ts`. The in-memory `MatrixScheduler` stays
the pure decision core; a thin persistence layer hydrates it on boot and writes
through on lease/queue mutations. **Mitigates R5 (state loss) while keeping the core
testable.** Config (`workers/roles/coordinators/quotas`) stays in YAML under
`~/.jinn/orchestration/*.yaml` (mirrors `org/`).

### D4 — Routing consults **real** usage/quota signals

Scheduler `QuotaPolicy` (provider/family *active-lease* caps) is concurrency, not rate
limits. Routing must *also* avoid workers whose engine is rate-limited/exhausted, by
reading the existing `shared/usage-status.ts` / `engine-limits.ts` signals (the same
`minRemainingPercent` gate `board-worker.ts` already uses). Add a routing predicate
`engineHasHeadroom(worker, config)` used during candidate filtering in live mode (off
in pure simulation). **Mitigates R8 and avoids dispatching into a wall.**

### D5 — Worktrees are task/lane-scoped, git-only, and reaped

When an implementation worker's `workspacePolicy === "isolated_worktree"` **and** the
resolved task base `cwd` is inside a git repo: create
`git worktree add <root>/jinn-<taskId>-<lane>` on a fresh branch; pass that path as the
implementation turn `cwd`. Reviewer roles read the implementation lane's worktree in
read-only mode (`git -C <worktree> diff` plus a non-mutating session contract), never a
separate mutable reviewer worktree unless a later repair role explicitly grants it.
Worker leases still release promptly, but the implementation worktree survives until
the task/lane lifecycle is complete so the reviewer can inspect the actual patch. Task
completion performs cleanup, and orphan cleanup plugs into the existing
`OrchestrationRuntime` boot+timer reaper. Non-git `cwd` falls back to the current
single-`cwd` behavior with a logged downgrade.
**Mitigates R-worktree (disk/orphans) and preserves one-implementer-per-slice.**

### D6 — The matrix layer is the **single allocator**; org is bridged, not merged

Keep `Employee/Manager/Department` (org) and `Worker/Coordinator/ProviderLane`
(orchestration) as separate vocabularies and separate code. Bridging is an explicit,
optional `OrgWorkerAdapter` (M9) that *reads* org employees and synthesizes workers —
it never writes org YAML. When both the scheduler and `board-worker` are enabled, the
scheduler is authoritative: `board-worker` either routes through the scheduler or is
gated off (config flag). **Mitigates R1 (two dispatchers) and R-naming.**

### D7 — Subscription / interactive-PTY billing path is sacrosanct

Any worker bound to `claude` must run through the **interactive PTY** path
(`cc_entrypoint=cli`, `SsePtyProxy`), never forced into a headless API call by the
scheduler. The adapter passes through to the existing claude engine unchanged. A
contract test asserts the scheduler never sets a flag that bypasses the PTY path.
**Mitigates the `AGENTS.md` prohibited behavior (billing-path breakage).**

### D8 — Determinism is preserved; real-provider tests are opt-in smoke only

The scheduler core stays deterministic (sorted workers, injected `now()`). All unit
tests use a fake clock + `mock`/stub workers. Real-provider execution is exercised only
by an **opt-in smoke script** (`scripts/orchestration-smoke.mjs`, mirroring
`scripts/hermes-acp-smoke.mjs`) gated behind an env flag, never in CI. **Mitigates R1
(building too much before simulation) and flaky CI.**

---

## 4. Terminology & the org reconciliation table

Code/orchestration-doc vocabulary is fixed (already enforced in
`docs/orchestration/README.md`). The org bridge maps — it does not rename:

| Org (existing, keep) | Orchestration (code) | Relationship |
|---|---|---|
| Employee | Worker | OrgWorkerAdapter *synthesizes* a Worker from an Employee (engine+model+mcp+maxCostUsd); read-only |
| Manager (rank) | Coordinator | A manager *kind* of task can spawn a Coordinator; not the same object |
| Department (dir) | ProviderLane | Lane = provider/local family, **not** an org department |
| Team | Allocation | — |
| Tasking | Lease | — |
| Reports-to | Lease ownership | — |

Forbidden in `packages/jinn/src/orchestration/**`: `Employee`, `Manager`,
`Department`, `Boss`, `Reportee`.

---

## 5. Milestone roadmap (M1–M11)

Each milestone is one `plan-prototype-build` run (Gates 0–7, §8) by **one implementer**,
preceded by a Giles Job Plan/waiver, followed by the designated review. Milestones are
mostly sequential; parallelizable pairs are noted. Phase numbers in parentheses map to
the source brief.

> Legend — **Exit gate** = the checklist that must be green to call the milestone done;
> **Team** = who does it (single implementer unless noted) and who reviews.

### M1 — Durable scheduler state (complete, 2026-06-23) ✦ foundation for everything live

- **Phase:** new (precedes brief Phase 4). **Goal:** persist leases/allocations/queue/
  telemetry so the scheduler survives daemon restarts, without changing the pure core.
- **Delivered:** `orchestration/store.ts` (better-sqlite3, WAL, dedicated
  `~/.jinn/orchestration.db`, corrupt DB recovery); `orchestration/persistent-scheduler.ts`
  (hydrates `MatrixScheduler`, write-through snapshot persistence, deterministic
  lease expiry on hydrate); schema for leases, allocations, allocation leases, queue
  items, telemetry events, and metadata; default config loader for
  `~/.jinn/orchestration/*.yaml`.
- **Integration points:** mirror `sessions/registry.ts:176` init pattern; new
  `ORCH_DB = JINN_HOME/orchestration.db` in `shared/paths.ts`.
- **Exit gate:** passed for simulated restart round-trip, corrupt/empty DB recovery,
  unchanged pure `MatrixScheduler` behavior, temp-DB-only tests, transaction rollback,
  restart-resume queued task, and expired-lease purge on hydrate.
- **Remaining boundary:** M1 is still not wired into gateway startup, live session
  execution, API routes, or CLI persistence. Those remain later milestones.
- **Team:** implementer; **review:** department adversarial pass on persistence + crash
  semantics (this is the first place the department is genuinely useful).

### M2 — Provider adapter contract (complete, 2026-06-23) ✦ highest blast radius

- **Goal:** define the provider-neutral `ProviderAdapter` interface (D2) and
  stub/echo/manual adapters; scheduler core stays ignorant of engine APIs.
- **Delivered:** `orchestration/adapter/{types,stub-adapter,local-echo-adapter,
  manual-adapter,registry}.ts`; injected lease validation; structured errors;
  fail-closed registry; `local_echo`/`mock` delegate only to `engines/mock.ts`.
- **Exit gate:** passed for valid-owned-lease rejection, structured errors, fail-closed
  lookup, scheduler import boundary, and adapter store/persistence boundary.
- **Team:** **architecture-manager mode** (architect → implementer → independent
  reviewer → adversarial reviewer → QA) — bad abstraction here poisons everything.
- **M1 carry-forward:** injected lease validation works with `MatrixScheduler` or
  `PersistentMatrixScheduler`; adapters stay store-ignorant. **Implemented.**

### M3 — Real adapter wiring + `engineHasHeadroom` routing (complete, 2026-06-23)

- **Goal:** back real workers with the registered engines (claude/codex/grok/hermes/
  pi/kiro), preserving D7; add usage-aware routing (D4).
- **Delivered:** `orchestration/adapter/real-adapter.ts` (worker.provider/model →
  existing engine via an injected engine `Map`); `orchestration/routing-headroom.ts`
  (usage-status based predicate/filter); explicit live registry factory; bounded
  adapter run retention; push-stream subscription; live cancel mapped to
  `InterruptibleEngine.kill(sessionId)`.
- **Exit gate:** passed for injected-engine Claude contract (`server.ts` still maps
  `claude` to `interactiveClaudeEngine`), headless-bypass rejection, scheduler import
  boundary, adapter store/persistence boundary, real-adapter no-concrete-engine-import
  boundary, usage-headroom filtering, and simulation staying untouched.
- **Team:** implementer; **review:** department — focus on billing-path + usage glue.
- **M2 carry-forward (resolve in M3):** (1) **`cancel(runId)` must map to the live engine
  session** — capture `ProviderRun.engineSessionId` at `startTask` (from
  `EngineRunOpts.sessionId`, known before the turn completes), not only on completion, so
  `cancel` can call `InterruptibleEngine.kill(sessionId)` to interrupt a real in-flight
  turn (without this, cancel can't stop a running engine — a real failsafe gap). (2)
  **Reconcile push vs pull streaming** — M2's `streamOutput(runId)` is vestigial (echo
  streams via the `onStream` in `EngineRunOpts`); for real engines + the M11 dashboard,
  make `streamOutput` register a subscriber against the live stream/PTY tee rather than
  return `unsupported`. (3) Bound the adapter's `runs` map (same retention note as M1).
  **Implemented.**
- **Remaining boundary:** M3 does not wire live matrix execution into sessions, daemon
  boot, API routes, CLI commands, worktrees, or dashboard controls. Those remain M4/M5+.

### M4 — Coordinator templates → live allocation API (complete, 2026-06-23)

- **Goal:** turn a task brief + coordinator template into an allocation plan the daemon
  can observe later; add read/observe HTTP + CLI surfaces.
- **Delivered:** `orchestration/coordinator.ts` (template → `AllocationRequest`,
  `matrix`, `single_worker`, and `single_worker_with_review` planning modes);
  observe-only HTTP routes under `/api/orchestration/` (`workers`, `leases`, `queue`,
  `allocations`) registered through `gateway/api.ts`; CLI `jinn leases list`,
  `jinn queue list`, and `jinn scheduler plan <task>`.
- **Validation:** focused M4 tests cover planner modes, CLI plan/list behavior, and
  GET-only API observation. Node 24 full-suite preflight was made green with
  timeout-only harness fixes for concurrent-load-sensitive tests.
- **Remaining boundary:** M4 does not wire live matrix execution into sessions,
  daemon boot, provider adapters, worktrees, dashboard controls, retry/release
  mutation routes, or board-worker dispatch. Those remain M5+.

### M5 — First real mode: `single_worker` + `single_worker_with_review` (complete, 2026-06-23)

- **Goal:** end-to-end orchestration for **low-risk tasks only**: allocate → run turn
  through the session path → release → (optional) opposite-family reviewer reads diff →
  QA → emit telemetry.
- **Delivered:** `orchestration/run-mode.ts` allocates on the daemon-owned runtime
  scheduler, creates normal Jinn sessions with lease metadata in `transportMeta`, dispatches
  through `runWebSession`, and releases each lease in `finally`. `run-web-session.ts`
  renews leases from the existing 5s `runHeartbeat` interval. `orchestration/runtime.ts`
  owns one `PersistentMatrixScheduler`, expiry/retry timer, and shutdown `close()`.
  `orchestration.enabled` is accepted in config and defaults off when absent. M4 observe
  routes read the shared runtime when present, with the old open-per-request path kept only
  as no-daemon/test fallback. `jinn run --mode single_worker|single_worker_with_review
  --task <file>` posts to `POST /api/orchestration/run`.
- **Resolved live preconditions:** persistent scheduler mutations now use incremental
  upserts/deletes instead of delete-all snapshot replacement; corrupt store recovery
  quarantines the DB and surfaces recovery telemetry; heartbeat renews `leaseExpiresAt`
  with the lease's original duration; release/expiry trigger queued-work retry.
- **Validation:** focused M5 tests cover five low-risk mock runs, review-mode sequencing,
  heartbeat renewal, persistent scheduler/store regressions, shared-runtime observe routes,
  and CLI gateway posting. `pnpm --filter jinn-cli typecheck` passed.
- **Remaining boundary:** M5 has no worktrees, dashboard controls, board-worker routing,
  dual-lane competition, org-worker bridge, persistent telemetry JSONL, or broad live-provider
  smoke. `single_worker_with_review` runs sequential sessions and prompts the reviewer as
  review-only, but read-only worktree enforcement is M6.
- **M5 carry-forward → resolved in M6:** `runOrchestrationTask` previously passed the same
  optional task `cwd` to every lease turn and released each lease independently. M6 added
  per-task lane→worktree state so the reviewer targets the implementation lane's
  worktree read-only, and the implementation worktree is cleaned up at task/lane end
  rather than on implementer lease release. It resolves the effective base `cwd` before
  git detection because task `cwd` is optional, and narrows accepted `workspacePolicy`
  values to `shared`, `read_only`, and `isolated_worktree`.

### M6 — Worktree execution (complete, 2026-06-23)

- **Goal:** isolated implementation worktrees plus read-only reviewer access per D5.
- **Delivered:** `orchestration/worktree.ts` creates/diffs/cleans/reaps managed git
  worktrees with a marker file, git-only downgrade, path safety, and `maxWorktrees`.
  `run-mode.ts` resolves the effective base `cwd`, keeps per-task lane→worktree state,
  sends reviewers to the implementation worktree in read-only mode, releases leases
  promptly, and cleans task worktrees at task end. `OrchestrationRuntime` reuses its
  existing boot+timer reaper to remove abandoned managed worktrees whose task no longer
  has a running lease. `jinn worktree create|diff|cleanup <task> [--lane <name>]` exposes
  focused operator helpers.
- **Validation:** focused tests cover create/diff/cleanup, non-git downgrade, max
  worktree enforcement, runtime reaping, reviewer cwd/read-only routing, and CLI
  worktree helpers.
- **Remaining boundary:** integration worktrees, dual-lane selection, durable patch
  artifacts, dashboard controls, and board-worker routing remain later milestones.

### M7 — Cross-family review policy in live runs (complete, 2026-06-23)

- **Goal:** enforce model-family diversity for reviewers at runtime (the scheduler core
  already supports `opposite_of_implementer`; this makes it a live, explainable policy).
- **Delivered:** `orchestration/cross-family.ts` resolves fail-closed reviewer policy,
  role-metadata reviewer detection, and explanation records. `MatrixScheduler`
  now emits reviewer-policy explanations for selected, blocked, and explicit
  same-family fallback decisions. `orchestration.sameFamilyReviewerFallback`
  permits same-family fallback only after no qualified opposite-family reviewer
  is available; opposite-family candidates still win when present.
- **Exit gate:** passed for reviewer-selection explainability, blocked-reviewer
  allocation explainability, same-family fallback permit/forbid behavior, and no
  silent downgrade in CLI/API JSON/text output.
- **Team:** implementer; **review:** department policy critique.

### M8 — Dual-lane competition (brief Phase 8) ✦ high-value, last

- **Goal:** OpenAI lane and Anthropic lane produce competing patches in **isolated**
  worktrees from an identical brief; a comparison reviewer reports differences; a human
  or authorized coordinator selects the integration; the loser is archived.
- **Deliverables:** `orchestration/dual-lane.ts`; comparison report generator;
  integration-selection gate (defaults to **human** selection).
- **Exit gate (brief AC):** identical brief to both lanes; isolated worktrees;
  comparison report identifies major differences; explicit selection; unselected lane
  archived/discarded. **Only attempt after M1–M7 are stable.**
- **Team:** **dual-lane / architecture-manager mode**; department integration review.

### M9 — Org→Worker bridge + board-worker reconciliation (brief Phase 3, deferred)

- **Goal:** optionally synthesize workers from `~/.jinn/org/*` employees (D6); make the
  scheduler the single allocator; gate/route `board-worker` through it.
- **Deliverables:** `orchestration/org-worker-adapter.ts` (read-only over
  `gateway/org.ts` `scanOrg`); a config switch so `board-worker.ts` defers to the
  scheduler when orchestration is enabled.
- **Exit gate:** no double-dispatch of the same employee/engine across board-worker and
  scheduler (collision test); org YAML never written by the adapter; disabling
  orchestration restores prior board-worker behavior exactly.
- **Team:** implementer; **review:** department — collision + regression focus.

### M10 — Durable telemetry & empirical routing (brief Phase 9)

- **Goal:** every orchestration run emits a telemetry record; routing can prefer
  historically successful workers; failures degrade a capability score.
- **Deliverables:** append-only `~/.jinn/logs/orchestration-telemetry.jsonl`
  (git-ignored; aligns with `logs/` convention) with the brief's fields (task_id,
  worker_id, provider, model, role, cost, latency, tokens, files_changed, tests_added,
  tests_passed, review_blockers, human_edits, regressions, disposition); a summarizer
  (`jinn scheduler stats`); optional allocation entries to the hash-chained
  `audit.jsonl`.
- **Exit gate (brief AC):** every run emits telemetry; summarizable by
  provider/family/role; router can prefer historically successful workers behind a flag;
  failures degrade score; no secrets in telemetry.
- **Team:** implementer; can use a **local-heavy (Pi/Ollama) worker** for log triage.

### M11 — Dashboard / control surface (brief Phase 10)

- **Goal:** expose workers/leases/queue/quotas/worktrees/review/QA/cost in the web UI
  with **concrete** labels (no "AI team / smart mode / auto magic").
- **Deliverables:** `packages/web` views consuming the M4 `/api/orchestration/` routes;
  read-first, then guarded controls (pause queue, cancel lease) reusing existing
  approval patterns.
- **Exit gate:** UI reflects real scheduler state; controls are auth-gated and reuse
  existing approval flows; no control claims an action it cannot perform.
- **Team:** department GUI specialist (this is where the department's UX strength fits).

---

## 6. Operating modes (assembled by coordinators)

Risk-tiered team assembly (brief Modes 1–5), built incrementally (M5 → M8):

1. **single_worker** — implementer → deterministic QA → release (small changes).
2. **single_worker_with_review** — implementer → opposite-family reviewer → fix → QA
   (the normal serious-work mode).
3. **architecture** — architect → implementer → independent reviewer → adversarial
   reviewer → QA (orchestration/runtime/shell/persistence changes — *this program
   itself* uses this mode).
4. **dual_lane** — OpenAI lane ∥ Anthropic lane → comparison → integration selection →
   QA (high-risk/high-value only; M8).
5. **local_heavy** — Ollama/Pi for summarize/triage/dedup/clustering/lint-explain/config-
   validation; local workers reduce frontier load and never own high-risk judgment.

Risk-based assembly prevents **review theater** (R6): small tasks do not get full teams.

---

## 7. Consolidated file plan (line budgets enforce the 800-line rule)

All new code files target **< 800 lines** (skill blocker; current `scheduler.ts` = 415).
Split before a file approaches the limit. New runtime state under `JINN_HOME` only.
**The 800-line limit applies to human-authored *source* files only** — markdown/docs
(this plan, READMEs, specs, session logs) are **exempt** and never a gate blocker.

| File (new unless noted) | Milestone | Purpose | Budget |
|---|---|---|---|
| `orchestration/store.ts` | M1 | SQLite persistence (WAL, migrations) | ≤350 |
| `orchestration/persistent-scheduler.ts` | M1 | hydrate + write-through over core | ≤250 |
| `orchestration/adapter/types.ts` | M2 | ProviderAdapter interface + error types | ≤150 |
| `orchestration/adapter/{stub,local-echo,manual}-adapter.ts` | M2 | inert adapters | ≤120 ea |
| `orchestration/adapter/registry.ts` | M2 | provider→adapter map | ≤120 |
| `orchestration/adapter/real-adapter.ts` | M3 | engine-backed adapter (PTY-safe) | ≤300 |
| `orchestration/routing-headroom.ts` | M3 | usage/quota-aware filter | ≤150 |
| `orchestration/coordinator.ts` | M4 | template → AllocationRequest, modes | ≤300 |
| `gateway/api/orchestration-routes.ts` | M4 | `/api/orchestration/*` handlers | ≤400 |
| `cli/orchestration.ts` (modify) | M4 | leases/queue/plan subcommands | keep ≤500 |
| `orchestration/run-mode.ts` | M5 | allocate→run→review→QA→release | ≤400 |
| `orchestration/runtime.ts` | M5 | daemon-boot owner: single scheduler + expiry/retry timer + shutdown close | ≤200 |
| `gateway/api/orchestration-routes.ts` (modify) | M5 | read shared boot instance; open-per-request only as no-daemon fallback | keep ≤400 |
| `shared/config-schema.ts` + `types.ts` (modify) | M5 | `orchestration.enabled` flag (off by default) | small |
| `orchestration/worktree.ts` | M6 | git worktree lifecycle + reaper | ≤350 |
| `orchestration/cross-family.ts` | M7 | live family policy + explainability | ≤200 |
| `orchestration/dual-lane.ts` | M8 | competing lanes + comparison | ≤400 |
| `orchestration/org-worker-adapter.ts` | M9 | read org → synthesize workers | ≤250 |
| `orchestration/telemetry.ts` | M10 | jsonl emit + summarize + score | ≤300 |
| `scripts/orchestration-smoke.mjs` | M3+ | opt-in real-provider smoke | ≤200 |
| `shared/paths.ts` (modify) | M1 | add `ORCH_DB`, orchestration dirs | small |
| `packages/web/...` | M11 | dashboard views | per-file ≤800 |

Plus a co-located `__tests__/*.test.ts` for every module (TDD per the gate loop).

---

## 8. The `plan-prototype-build` gate loop (applied to each milestone)

Each milestone is one autonomous, walk-away gated run. **Do not pause for approval
between gates within a milestone**; infer conservative defaults and record assumptions.
Gates per `SKILL.md`:

- **Gate 0 — Orient:** re-read `AGENTS.md`, the relevant subsystem, this plan's
  milestone section, current `git status`; confirm Giles Job Plan / waiver; record
  assumptions + a milestone risk register.
- **Gate 1 — Plan:** normalize the milestone into a `gated_execution_plan.md`
  (template), with file plan, IO contract, test plan, audit plan, acceptance criteria,
  scope-pressure policy.
- **Gate 2 — Skeleton:** module boundaries + test harness + doc stub; verify it builds;
  line counts checked.
- **Gate 3 — Core workflow:** the milestone's primary non-UI behavior; deterministic
  error behavior; unit tests (write the failing test first, per the hermes-plan TDD
  rhythm used in this repo).
- **Gate 4 — Interface/IO/persistence:** CLI/API/(UI) surface; explicit save/load;
  user-visible errors; path/file validation; no silent overwrite.
- **Gate 5 — Hardening + audit repair:** modularity, hidden globals, error/data-loss
  paths, dependency sprawl, line-count, test gaps, doc drift. Patch only bounded
  defects.
- **Gate 6 — Docs/diagrams:** update `docs/orchestration/README.md`,
  `docs/feature_inventory.md` (new surfaces), Mermaid arch/workflow diagrams, session
  log under `docs/logs/session/MMYYYY/`. No doc claims unsupported by code.
- **Gate 7 — Final QA/QC + handoff:** line-count enforcement; `pnpm typecheck` + targeted
  vitest + (where touched) `pnpm test`; manual workflow validation; defect-ledger
  closure; residual-risk + skipped-check summary; final file/artifact map.

**Audit between gates:** after each implementation gate, run an audit (the skill's
adversarial fallback, or a department reviewer). Every finding enters the defect ledger
with a disposition (`fixed | verified-not-a-defect | deferred-with-risk |
blocked-by-missing-input | blocked-by-tooling`). No finding disappears.

**Department cadence (when to bring the team in):**
- After M1/M2 design: architecture review, failure-mode review, schema/terminology
  critique, test-gap review.
- After M5 (first real mode): scheduler adversarial review, queue/deadlock/lease-recovery
  review, real-task smoke.
- After M8/M11: workflow critique + UX/control-surface design.
- **Never** for: initial implementation of a slice, broad simultaneous refactors, or
  self-hosted orchestration of the orchestration build (the snake eating its tail).

---

## 9. Test / validation plan (deterministic first; failsafes; error-checking)

### 9.1 Commands (every milestone, Gate 7)

```bash
# from packages/jinn
npx vitest run src/orchestration/**/*.test.ts src/cli/__tests__/*orchestration*.test.ts
npm run typecheck
# from repo root
pnpm typecheck
pnpm test            # full turbo run; if the known jinn-cli timeout flakiness recurs,
                     # rerun the failing file in isolation and record both results
bash ~/vscode/agent-skills/30_plan/plan-prototype-build/tools/line_count_check.sh
git diff --check
```

### 9.2 Scheduler simulation scenarios (extend the existing 14 cases — keep them green)

one-task/one-worker · two-tasks/one-worker (queue) · maxConcurrency before block ·
qualified worker unavailable → blocked_resource · opposite-family reviewer selection ·
all workers busy · lease timeout/expiry · heartbeat recovery · worker failure → release
· quota exhausted (atomic, no partial team) · local worker preferred for cheap task ·
high-priority queued behind normal resumes first · atomic allocation prevents deadlock.

### 9.3 Per-milestone additions

- **M1:** restart round-trip; corrupt-DB recovery; transaction atomicity (crash → no
  half-allocation); expired-lease purge on hydrate.
- **M2/M3:** adapter rejects start without owned lease; structured error on failure;
  **claude PTY-path contract test** (no headless bypass); rate-limited engine filtered.
- **M5:** ≥5 low-risk tasks E2E with `mock`/local workers; collision impossible (two
  tasks never lease one worker under load); lease TTL + watchdog bounds every run;
  heartbeat renews `leaseExpiresAt` (a turn longer than `leaseDurationMs` keeps its worker,
  is not re-leased); lease released on every terminal run-web-session path (error, stall,
  rate-limit fallback, late recovery, deleted session); observe routes read the single boot
  instance (no stale second-handle read).
- **M6:** implementer session receives the isolated worktree `cwd`; reviewer session
  receives that same worktree `cwd` read-only; implementer lease release does not remove
  the worktree before review; task-end cleanup removes completed worktrees; runtime
  reaper finds + removes abandoned worktrees; non-git cwd downgrade logged; max-worktrees
  bound enforced.
- **M7:** reviewer-selection explainability; same-family fallback permit/forbid honored.
- **M8:** identical brief to both lanes; isolated worktrees; comparison report;
  explicit selection; loser archived.
- **M9:** no double-dispatch (board-worker + scheduler); org YAML never mutated; disable
  → exact prior behavior.
- **M10:** every run emits a telemetry line; summarizer aggregates; no secrets in output.

### 9.4 Failsafes & error-checking (cross-cutting)

- **Lease TTL + heartbeat watchdog** on every live run — no unbounded background work
  (mirror cron's `inFlight`/timeout discipline).
- **Atomic allocation** — required team all-or-nothing; never reserve half a team
  (deadlock guard, already in the core; persistence must preserve it — M1).
- **Blocked tasks suspend** — no live model "waits"; scheduler wakes on resource events
  (`retryQueued`). No polling loop burns compute.
- **Idempotent recovery** — expired/abandoned leases release workers on boot + timer.
- **Structured provider errors** — adapters return typed errors, never throw raw into the
  scheduler; failures map to `EngineFailureReason` where possible.
- **No real provider in unit tests** — real execution only via the opt-in smoke script.
- **Path/disk safety** — worktree root validated; max-worktrees cap; reaper bounds disk.
- **Secret hygiene** — no tokens/credentials in telemetry, logs, or worktree branches.

---

## 10. Risk register (brief risks + repo-specific risks discovered)

| # | Risk | Mitigation | Verifying check |
|---|---|---|---|
| R1 | Two dispatchers (board-worker + scheduler) collide on one engine/employee | Scheduler is single allocator (D6); board-worker defers/gated (M9) | M9 collision test; disable→regression test |
| R2 | New per-worker leasing conflicts with per-session-key `SessionQueue` | Scheduler sits *above* session manager; different axes (D1) | M5 collision + ordering tests |
| R3 | Agent collision (two tasks, one worker) | Valid owned lease required for all execution; adapter rejects otherwise (D2); heartbeat renews `leaseExpiresAt` so a long turn's lease never expires mid-run (M5 precond. 4) | adapter contract test; M5 load test; long-turn lease-renewal test (turn > `leaseDurationMs` keeps worker) |
| R4 | Deadlock / half-allocated teams | Atomic allocation + lease TTLs (core); persistence preserves atomicity (M1) | atomic-allocation test (×2: core + persisted) |
| R5 | State loss on daemon restart | Durable SQLite + hydrate-on-boot (D3, M1) | restart round-trip test |
| R6 | Review theater (full teams for trivial tasks) | Risk-based team assembly; modes 1–5 (§6) | mode-selection tests |
| R7 | Provider-specific assumptions leak into scheduler | Adapters below scheduler; core has zero engine imports (D2) | import-boundary lint/test |
| R8 | Local models over-trusted / routing into a rate-limited engine | local = triage only; `engineHasHeadroom` filter (D4) | M3 headroom test |
| R9 | **Subscription/PTY billing path broken** (AGENTS.md) | Claude forced through interactive PTY; no headless bypass (D7) | M3 PTY-path contract test |
| R10 | Orchestrator becomes DAWES-specific | Generic Cuttlefish-compatible primitives only; policy packs downstream | design review; no DAWES strings in core |
| R11 | Worktree disk blowup / orphans | Task/lane-scoped, capped, reaped; git-only with downgrade (D5) | reaper + max-worktrees tests |
| R12 | Naming collision (Employee/Manager vs Worker/Coordinator) | Vocabularies kept separate; bridge maps (D6, §4) | forbidden-term grep in orchestration/** |
| R13 | Building too much before first simulation | No real execution until M2 sim/contract green; smoke opt-in (D8) | gate ordering; CI excludes smoke |
| R14 | `pnpm test` flakiness (known jinn-cli timeouts) masks real failures | Rerun failing file in isolation; record both; never declare green on a flake | Gate 7 evidence discipline |
| R15 | Self-hosting recursion (department rebuilds its own coordinator) | One implementer per slice; department review-only until M5+ | execution-strategy adherence |

---

## 11. Persistence & telemetry contract

- **Config (declarative):** `~/.jinn/orchestration/{workers,roles,coordinators,quotas}.yaml`
  (mirrors `org/`). Validated by the existing Zod schemas; invalid config fails with a
  path-specific message before any execution.
- **Runtime state (durable):** `~/.jinn/orchestration.db` (SQLite/WAL) — leases,
  allocations, queue_items, telemetry index. Never committed.
- **Telemetry (append-only):** `~/.jinn/logs/orchestration-telemetry.jsonl` (git-ignored,
  per `logs/` convention). Allocation *decisions* may also append to the hash-chained
  `~/.jinn/audit.jsonl` (`shared/audit-log.ts`) for tamper-evidence.
- **No secrets** anywhere in the above.

---

## 12. Security baseline

Local-low sensitivity, but enforce: no telemetry/network beyond what a worker's engine
already does; no secrets in logs/telemetry/branches; validate worktree paths and config
file paths; atomic-ish writes (`shared/safe-write.ts` pattern); deterministic handling
of malformed config/task files; orchestration state separate from app code; document
trust assumptions and the (out-of-scope) threat model in `docs/orchestration/README.md`.
All new HTTP routes auth-gated by the existing token (`gateway/auth.ts`).

---

## 13. Scope-pressure policy

Under pressure, preserve the **primary end-to-end path** (allocate → lease → run →
release → telemetry) and cut secondary scope in this order: dual-lane (M8) → dashboard
controls (M11, ship read-only views) → org bridge (M9) → empirical-routing scoring
(keep raw telemetry). Never cut: atomicity, lease exclusivity, billing-path safety,
worktree isolation, deterministic tests. Document every deferral with residual risk.

---

## 14. Acceptance criteria

**Global (full capability):** a task brief + coordinator template assembles a real team
from configured/synthesized workers; required roles allocate atomically or the task
queues; leases are exclusive and TTL-bounded; turns run through the existing engine path
(claude via PTY); worktrees isolate lanes; cross-family review is enforced and
explainable; dual-lane competition produces a comparison + explicit selection; every run
emits durable telemetry; state survives restart; the dashboard reflects real state with
concrete labels; **existing tests stay green and the subscription billing path is
intact.**

**Per milestone:** the Exit gate listed in §5, validated by §9 and closed in the
milestone's defect ledger.

---

## 15. Launch prompts (hand one of these to a single implementer per milestone)

Each launch prompt is the milestone's contract. Template (fill `<M#>` from §5):

```text
Use the plan-prototype-build skill (~/vscode/agent-skills/30_plan/plan-prototype-build/).
Build milestone <M#> from docs/superpowers/plans/2026-06-23-matrix-orchestration.md
autonomously through Gates 0–7. Do not pause between gates; infer conservative defaults
and record assumptions.

repo_path: /home/ericl/vscode_github_public/jinn
target_language: TypeScript (ESM, .js import suffixes), Node >=24
target_platform: jinn-cli daemon + CLI (+ packages/web for M11)
authority: patch-authorized
audit_skill_path: <adversarial fallback, or assign a department reviewer>

Preconditions (BLOCKING):
- Read AGENTS.md and §1/§3 of the plan first.
- Obtain a Giles Job Plan for this slice, or an explicit one-session waiver from the
  operator (AGENTS.md Software Delivery Routing). Do not spawn implementation work first.
- Do NOT touch live ~/.jinn or port 7777; tests use temp dirs only.

Scope: exactly milestone <M#> Deliverables (plan §5). Honor the design rulings D1–D8
(plan §3): scheduler-above-session, thin adapter over Engine, durable SQLite, usage-aware
routing, task/lane-scoped git worktrees, single-allocator, **claude interactive-PTY billing
path is sacrosanct (D7)**, determinism preserved.

Non-goals: no real provider calls outside the opt-in smoke script; no DAWES specifics;
no Employee/Manager/Department terms in orchestration/**; no out-of-milestone work; no
source file over 800 lines (split first; markdown/docs are exempt).

Acceptance: the milestone Exit gate (§5), the relevant tests (§9), pnpm typecheck +
targeted vitest green, line-count check clean, docs/feature_inventory + session log
updated, defect ledger closed. Report what passed/failed/was-skipped with evidence.
```

Milestone-specific emphasis to append to the template:

- **M1:** "Mirror sessions/registry.ts init/migration pattern; prove restart round-trip
  and atomic (no half-written) allocation; keep the pure MatrixScheduler tests unchanged."
- **M2:** "Architecture-manager mode. The scheduler core must have ZERO concrete-engine
  imports. Adapter rejects start_task without a valid owned lease."
- **M3:** "Prove the claude worker runs via interactive PTY (cc_entrypoint=cli) with a
  contract test; filter rate-limited engines via usage-status.ts; sim mode unaffected."
- **M5:** "≥5 low-risk tasks E2E with mock/local workers; no collision, no leak, no lost
  worktrees, no unbounded runs (lease TTL + watchdog on every run). Resolve all four
  BLOCKING preconditions first — especially heartbeat-renews-`leaseExpiresAt` (today it
  does not; a turn outliving `leaseDurationMs` would let the worker be re-leased). Heartbeat
  on the 5s `runHeartbeat` interval, not raw `onActivity`. Release the lease on EVERY
  terminal path of run-web-session via `finally`. Allocate against the one live persistent
  scheduler, not the observe-only planner. Add `orchestration.enabled` (off by default);
  construct the single scheduler at boot and route the M4 observe endpoints through it."
- **M6:** "git-only implementation worktrees, lane isolation enforced, reviewer reads
  the implementation worktree read-only, worktree survives implementer lease release,
  orphan reaper uses the runtime boot+timer loop, non-git cwd downgrades with a log line."
- **M8:** "Only start once M1–M7 are stable; identical brief to both lanes; human
  selection by default; archive the loser."
- **M9:** "OrgWorkerAdapter is read-only over scanOrg; prove no double-dispatch with
  board-worker; disabling orchestration restores exact prior behavior."

---

## 16. Residual risks known before build

- **Concurrency-model seam (D1)** is the subtlest integration; M5 must prove the
  lease/SessionQueue interaction under load before M6–M8 build on it.
- **Worktrees (M6)** are entirely new to this repo — expect iteration on the daemon's
  arbitrary-`cwd` reality (the daemon runs from `JINN_HOME`, tasks target other repos).
- **`pnpm test` jinn-cli timeout flakiness** (observed by Codex) can mask regressions;
  Gate 7 must rerun failing files in isolation and record both results — never declare
  green on a flake (R14).
- **Org/board reconciliation (M9)** changes a *live* dispatch path; treat as
  architecture-mode with a full regression pass.
- This plan assumes the inert Phase-1 scaffold remains the decision core; if a later
  milestone needs to change `MatrixScheduler` semantics, re-run the §9.2 simulation
  suite as a non-regression gate.

### M1 carry-forward residuals (verified 2026-06-23; track in the defect ledger)

M1 passed its exit gate; these are *non-blocking-for-M1* items that **must** be resolved
before the scheduler goes live (M5) or telemetry durably grows (M10):

- **Snapshot write amplification.** `PersistentMatrixScheduler.commitMutation` does a
  full delete-all + reinsert-all of every table after *every* mutation. Fine while inert;
  O(total-state) per heartbeat once live. → incremental writes (M5 precondition).
- **Telemetry coupled to the snapshot.** `this.telemetry` accumulates forever and is
  re-serialized into the DB on every mutation. → move durable telemetry to the
  append-only jsonl (M10) and keep the snapshot to operational state only
  (leases/allocations/queue/`nextSeq`).
- **Unbounded `allocations` map.** Released/expired allocations are never pruned (and
  `listAllocations()` returns all). → add allocation state transitions + a retention/prune
  policy (mirror `board-service` auto-ticket pruning).
- **Corrupt-recovery = data loss.** Quarantine-and-start-empty drops all leases/queue;
  acceptable while inert, unsafe once live. → emit audit/telemetry on recovery, consider
  re-queue, document the trust boundary (M5).
- **Not daemon-wired (expected).** M1 is code-level only; single-instance boot
  hydrate/close is owned by M4/M5, not a defect.
```
