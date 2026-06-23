# Provider-Neutral Matrix Orchestration

Status: implemented as an inert foundation with durable scheduler-state and
provider-adapter contract modules. This layer validates configs, runs
fake-worker allocation, creates leases, exposes CLI dry-runs, includes a
SQLite-backed store plus a persistent scheduler wrapper, and defines
store-agnostic adapter contracts for later provider execution. It does not call
real providers, create worktrees, update the dashboard, or change the current
Jinn session execution path.

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

All commands are inert and require an explicit `--config-dir`.

```bash
jinn workers list --config-dir docs/orchestration/examples
jinn workers list --config-dir docs/orchestration/examples --json

jinn scheduler allocate docs/orchestration/examples/task-standard.yaml \
  --config-dir docs/orchestration/examples \
  --dry-run

jinn scheduler simulate docs/orchestration/examples/scenario-blocked-resource.yaml \
  --config-dir docs/orchestration/examples \
  --json
```

`scheduler allocate` intentionally requires `--dry-run`. Without it, the command
fails because real provider execution is out of scope for this slice.

## Scheduler Behavior

- Required roles allocate atomically: all required leases are created, or no
  leases are created and the task enters `blocked_resource`.
- Optional roles are attempted after required roles and may be skipped.
- Workers are matched by required capabilities, required tools, allowed family,
  family constraint, max concurrency, and provider/family quota.
- Default routing is deterministic: preferred tier/cost first when configured,
  otherwise lower cost class first, then lexical worker id.
- Opposite-family reviewers compare against already selected implementer roles.
- Queued tasks do not keep a model running. They resume only when the scheduler
  is asked to retry after a resource event such as release or expiry.
- Lease validation rejects missing, expired, released, foreign-worker,
  foreign-task, and foreign-coordinator leases.

## Durable State

`packages/jinn/src/orchestration/store.ts` creates a dedicated SQLite database
at `~/.jinn/orchestration.db` by default, with WAL mode and tables for leases,
allocations, queue items, telemetry events, and small metadata. Tests pass
explicit temp database paths and do not write live `~/.jinn`.

`packages/jinn/src/orchestration/persistent-scheduler.ts` hydrates a
`MatrixScheduler` from a stored snapshot, persists scheduler mutations
transactionally, and expires stale leases deterministically on hydrate. This is
not wired into gateway startup, live sessions, or the public CLI yet.

## Provider Adapters

`packages/jinn/src/orchestration/adapter/` defines the M2 provider-neutral
adapter contract. Adapters receive lease validation through an injected
function, so the adapter layer can validate against either `MatrixScheduler` or
`PersistentMatrixScheduler` without importing the store.

M2 registers only inert adapter ids:

- `local_echo` and `mock`: validate the lease, then run the deterministic
  `MockEngine`.
- `manual`: validates the lease, then returns `manual_required`.
- `stub`: validates the lease, then returns `unsupported_operation`.

Unknown providers fail closed with `adapter_not_found`; real provider ids such
as OpenAI, Anthropic, Claude, Kiro, Ollama, and Gemini are not registered yet.

## Failure Modes

- Invalid config fails during schema validation with a clear path-specific
  message.
- Unknown roles fail allocation before provider execution can exist.
- Provider quota exhaustion blocks the whole required allocation instead of
  reserving a partial team.
- Lease expiry releases worker capacity deterministically when `expireLeases`
  runs or when the persistent wrapper hydrates stale leases.
- Adapter start rejects invalid leases before any inert engine can run.
- Durable scheduler snapshots and adapter contracts are implemented, but
  persistent telemetry aggregation, real worktrees, real provider adapters, and
  live daemon routing are not implemented yet.

## Later Milestones

- Isolated implementation/review/integration worktrees.
- First real `single_worker` and `single_worker_with_review` modes for low-risk
  tasks.
- Cross-family review policy for live runs.
- Dual provider lanes and integration selection.
- Durable telemetry and dashboard control surfaces.
