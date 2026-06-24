# Provider-Neutral Matrix Orchestration

Status: implemented as a provider-neutral foundation with durable
scheduler-state, provider-adapter contract modules, opt-in live-adapter
plumbing, coordinator planning, observe surfaces, and the first opt-in live run
modes. The live modes are daemon-gated by `orchestration.enabled` and route
through the existing Jinn session path. Git worktree execution is implemented
for isolated implementation lanes plus read-only review access. Live
cross-family reviewer policy is implemented with fail-closed same-family
fallback and structured explanations. Dashboard
controls, board-worker dispatch, dual lanes, and org-worker mapping remain
later milestones.

## Intent

The matrix layer is the first Jinn-hosted foundation for a later Cuttlefish
scheduler. It models a central scheduler, persistent worker pool, ephemeral
coordinators, exclusive leases, blocked-resource queueing, provider-aware
routing, and deterministic QA gates.

The first slices exist to make scheduler behavior and restart recovery testable
before real provider execution is added. Tests and validation remain the
authority; model confidence does not grant runtime authority.

## Terminology

Use these terms in code and operator-facing orchestration docs:

- Worker: provider/model/tool/workspace capability slot.
- Coordinator: ephemeral task owner requesting capabilities.
- Scheduler: central allocator that grants leases.
- Lease: exclusive permission for one worker to handle one role for one task.
- Allocation: workers assigned to a task.
- Queue: suspended blocked task state.
- ProviderLane: provider or local compute family.
- Capability: named skill or execution capability.

Do not use employee, manager, department, boss, or reportee in the orchestration
module. The existing Jinn org system can map to workers later through an adapter.

## Config Files

The CLI dry-runs load an explicit config directory. Code-level loaders also
support the default operator directory at `~/.jinn/orchestration/`, but the
current CLI commands still require `--config-dir`. See
`docs/orchestration/examples/` for complete examples.

Required files:

- `workers.yaml`
- `roles.yaml`
- `coordinators.yaml`

Optional file:

- `quotas.yaml`

Worker records describe provider, family, tier, capabilities, tools,
concurrency, cost class, and workspace policy. Roles describe required
capabilities/tools and routing constraints. Coordinator templates define the
minimum viable team for a task class. Quotas bound active provider/family leases.

## CLI

Dry-run and observation commands require an explicit `--config-dir`.
State-observation commands accept `--db-path`; tests and examples should pass a
temp DB path instead of reading live `~/.jinn`. `jinn run` is different: it
requires a running gateway with `orchestration.enabled: true` and sends the task
brief to the daemon-owned scheduler.

```bash
jinn workers list --config-dir docs/orchestration/examples
jinn workers list --config-dir docs/orchestration/examples --json

jinn scheduler allocate docs/orchestration/examples/task-standard.yaml \
  --config-dir docs/orchestration/examples \
  --dry-run

jinn scheduler simulate docs/orchestration/examples/scenario-blocked-resource.yaml \
  --config-dir docs/orchestration/examples \
  --json

jinn leases list --config-dir docs/orchestration/examples --db-path /tmp/orchestration.db --json
jinn queue list --config-dir docs/orchestration/examples --db-path /tmp/orchestration.db --json
jinn scheduler plan docs/orchestration/examples/task-standard.yaml \
  --config-dir docs/orchestration/examples \
  --db-path /tmp/orchestration.db \
  --json

jinn run --mode single_worker --task docs/orchestration/examples/task-live.yaml
jinn run --mode single_worker_with_review --task docs/orchestration/examples/task-live.yaml --json

jinn worktree create docs/orchestration/examples/task-live.yaml --lane seniorImplementer
jinn worktree diff docs/orchestration/examples/task-live.yaml --lane seniorImplementer
jinn worktree cleanup docs/orchestration/examples/task-live.yaml --lane seniorImplementer
```

`scheduler allocate` intentionally requires `--dry-run`. Without it, the command
fails because real provider execution is out of scope for this slice.

`scheduler plan` turns a task brief plus coordinator template into an allocation
plan. It supports `matrix`, `single_worker`, and `single_worker_with_review`
planning modes. It may account for persisted leases/queue when `--db-path`
points to an existing orchestration database, but it does not persist the plan or
run any provider.

`jinn run` accepts task YAML containing allocation fields plus `prompt`. The CLI
does not open the scheduler DB directly; it posts the task to
`POST /api/orchestration/run` with the gateway token. The daemon allocates on
its single runtime scheduler, creates normal Jinn sessions with lease metadata in
`transportMeta`, heartbeats the lease on the existing 5s session heartbeat, and
releases leases in `finally` after each role turn settles.
For `single_worker_with_review`, JSON output includes `reviewPolicy.explanations`.
Text output prints the reviewer policy decision so same-family fallback or a
blocked reviewer is not silent. If any leased role session errors, the live run
returns `ok: false, state: "failed"` with the session evidence preserved.

`jinn worktree create|diff|cleanup` uses the live `config.yaml`
`orchestration.worktreeRoot` and `orchestration.maxWorktrees` settings. The
helpers operate only on directories with Jinn's managed worktree marker.

## API

Gateway routes under `/api/orchestration/` inherit the existing `/api/*`
gateway token gate.

- `GET /api/orchestration/workers`
- `GET /api/orchestration/leases`
- `GET /api/orchestration/queue`
- `GET /api/orchestration/allocations`
- `POST /api/orchestration/run`

The GET routes return the configured workers and scheduler state. When the
daemon runtime exists, they read that shared instance; otherwise they use the
old no-daemon/test fallback that opens a scheduler for read-only inspection.

`POST /api/orchestration/run` executes only `single_worker` and
`single_worker_with_review` tasks through the existing session runner. It does
not create dashboard controls. When an implementation worker has
`workspacePolicy: isolated_worktree` and the resolved task `cwd` is inside a git
repo, the run path creates a task/lane-scoped worktree and passes that path as
the session `cwd`. Reviewer turns do not run in that worktree; they receive a
generated diff bundle directory containing `patch.diff` and `metadata.json`.
Non-supported methods return `405`.
Run responses include structured `reviewPolicy.explanations` when reviewer
family policy selects, falls back, or blocks a reviewer. Blocked live runs
persist a durable continuation and auto-resume on later resource availability.

## Scheduler Behavior

- Required roles allocate atomically: all required leases are created, or no
  leases are created and the task enters `blocked_resource`.
- Optional roles are attempted after required roles and may be skipped.
- Workers are matched by required capabilities, required tools, allowed family,
  family constraint, max concurrency, and provider/family quota.
- Default routing is deterministic: preferred tier/cost first when configured,
  otherwise lower cost class first, then lexical worker id.
- Opposite-family reviewers compare against already selected implementer roles.
- Same-family reviewer fallback is forbidden by default. Setting
  `orchestration.sameFamilyReviewerFallback: true` lets live review allocation
  use a same-family reviewer only after no qualified opposite-family reviewer is
  available. Opposite-family candidates still win when present.
- Reviewer selection and blocked-reviewer allocation return structured
  explanations with candidate ids, implementer families, the selected worker
  when any, and the policy decision.
- Queued tasks do not keep a model running. They resume only when the scheduler
  is asked to retry after a resource event such as release or expiry.
- Lease validation rejects missing, expired, released, foreign-worker,
  foreign-task, and foreign-coordinator leases.

## Runtime Policy Config

The live daemon runtime reads these optional `config.yaml` keys:

```yaml
orchestration:
  enabled: true
  sameFamilyReviewerFallback: false
```

`sameFamilyReviewerFallback` defaults to `false`. It is a boolean only; invalid
types are rejected by config validation.

## Durable State

`packages/jinn/src/orchestration/store.ts` creates a dedicated SQLite database
at `~/.jinn/orchestration.db` by default, with WAL mode and tables for leases,
allocations, queue items, telemetry events, and small metadata. Tests pass
explicit temp database paths and do not write live `~/.jinn`.

`packages/jinn/src/orchestration/persistent-scheduler.ts` hydrates a
`MatrixScheduler` from stored rows, persists mutations with incremental
upserts/deletes, and expires stale leases deterministically on hydrate. The
daemon constructs one runtime scheduler when `orchestration.enabled: true`,
starts an expiry/retry timer, and closes the scheduler on shutdown. Plain CLI
inspection still uses explicit temp paths or read-only fallbacks. On config
reload, the gateway swaps to a freshly constructed orchestration runtime when
settings stay enabled; if orchestration is disabled while work is active, the
existing runtime stays bound only long enough to drain leases and queued
continuations.

## Worktrees

Implementation workers with `workspacePolicy: isolated_worktree` run in a
managed git worktree rooted at `orchestration.worktreeRoot` (default:
`~/.jinn/worktrees`). `orchestration.maxWorktrees` bounds the number of managed
worktrees that can exist at once. If the resolved task `cwd` is not inside a git
repo, Jinn logs a downgrade and uses the current shared-cwd behavior.

For `single_worker_with_review`, the reviewer receives a generated diff-only
bundle outside the repository/worktree after the implementer lease has been
released. The bundle contains `patch.diff` plus `metadata.json`, so the patch
remains inspectable without handing the reviewer the implementation tree as its
session `cwd`. The implementation worktree is cleaned up at task end. If
cleanup is missed, the runtime's existing boot/timer reaper removes managed
worktrees whose task no longer has a running lease.

## Provider Adapters

`packages/jinn/src/orchestration/adapter/` defines the provider-neutral adapter
contract. Adapters receive lease validation through an injected function, so the
adapter layer can validate against either `MatrixScheduler` or
`PersistentMatrixScheduler` without importing the store.

The default adapter registry remains inert and registers only:

- `local_echo` and `mock`: validate the lease, then run the deterministic
  `MockEngine`.
- `manual`: validates the lease, then returns `manual_required`.
- `stub`: validates the lease, then returns `unsupported_operation`.

M3 adds `real-adapter.ts` plus an explicit `createLiveProviderAdapterRegistry`
factory. Live adapters are opt-in and receive the gateway's existing engine
`Map` as a dependency. They register only existing Jinn engine ids
(`claude`, `codex`, `antigravity`, `grok`, `hermes`, `pi`, `kiro`) that are
present in the injected map; unknown providers still fail closed with
`adapter_not_found`.

Live adapter behavior is intentionally narrow:

- `startTask` validates the lease first, then requires `EngineRunOpts.sessionId`
  and delegates to the injected engine.
- `cancel` uses the captured session id and `InterruptibleEngine.kill` when the
  engine supports interruption.
- `streamOutput` registers a callback against the live run's stream tee.
- Claude workers reject explicit headless bypass flags and rely on the gateway's
  injected interactive PTY engine.

This is not a live scheduler mode. No route, CLI command, dashboard control, or
daemon startup path calls the live adapter factory yet.

## Usage-Aware Routing

`packages/jinn/src/orchestration/routing-headroom.ts` provides an opt-in
`engineHasHeadroom(worker, config)` predicate and a worker filter helper. It
reuses the existing `usage-status.ts` engine limit snapshots and the
`boardWorker.usage.minRemainingPercent` default. Known live engines are filtered
when unavailable, exhausted, or below the configured remaining-percent floor.
Inert providers such as `local_echo` are allowed through so dry-runs and
simulation remain deterministic.

## Failure Modes

- Invalid config fails during schema validation with a clear path-specific
  message.
- Unknown roles fail allocation before provider execution can exist.
- Provider quota exhaustion blocks the whole required allocation instead of
  reserving a partial team.
- Lease heartbeat renews `leaseExpiresAt` with a sliding TTL, so long turns do
  not free a worker mid-run while the 5s heartbeat is alive.
- Lease expiry releases worker capacity deterministically when `expireLeases`
  runs, when the persistent wrapper hydrates stale leases, or when the runtime
  reaper fires.
- Corrupt DB recovery quarantines the DB and surfaces recovery telemetry instead
  of silently presenting an ordinary empty state.
- Adapter start rejects invalid leases before any inert engine can run.
- Same-family reviewer fallback is never implicit. If fallback is disabled and
  only same-family reviewers qualify, allocation returns `blocked_resource` with
  a `same_family_fallback_forbidden` explanation.
- Observe-only API routes reject mutating HTTP methods and return existing
  workers/leases/queue/allocations only.
- Durable scheduler state, adapter contracts, opt-in live adapters, headroom
  predicates, daemon runtime ownership, first live run modes, and git worktree
  isolation are implemented. Live cross-family reviewer policy is implemented.
  Persistent telemetry aggregation, dual-lane routing, board-worker integration,
  and dashboard controls are not implemented yet.

## Later Milestones

- Dual provider lanes and integration selection.
- Durable telemetry and dashboard control surfaces.
