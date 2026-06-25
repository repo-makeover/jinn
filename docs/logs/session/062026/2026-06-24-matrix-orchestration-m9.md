# Matrix Orchestration M9 Session Log

Date: 2026-06-24
Actor: Codex
Scope: M9 org-board scheduler reconciliation

## Gate 0-1 Orientation And Plan

- Read repo instructions, current orchestration plan, docs index, README, governance logs, Dory state, and current source.
- No `control/*.yaml` files were present in this checkout.
- Giles compliance log remains blocked on human governance decisions (`governance/repo_config.yaml`, manifest mode, AGENTS drift). This M9 slice did not edit governance files.
- Dory daemon was healthy; started session `58cbd250-302c-4ac1-a1a5-f6ddfcd586d4`.
- Modularity constraint honored: no edits to `store.ts`, `config-schema.ts`, or `run-web-session.ts`.

## Implementation

- Added gateway-side org worker bridge in `packages/jinn/src/gateway/org-worker-bridge.ts`.
  - Reads `scanOrg()` output only through caller-provided registry data.
  - Synthesizes deterministic worker ids and exact-match role ids.
  - Adds generic board dispatch capability plus an exact worker capability.
  - Skips unusable records with explicit reasons.
- Added `packages/jinn/src/gateway/orchestration-runtime-factory.ts` to augment loaded orchestration config with synthesized org workers at runtime startup/reload.
- Wired gateway startup, config reload, and org reload to use the augmented runtime.
  - If org reload happens while orchestration has active work, runtime refresh is deferred and logged.
- Added non-queuing immediate allocation support:
  - `MatrixScheduler.requestAllocation(request, { queueOnBlock: false })`
  - `PersistentMatrixScheduler.tryAllocationNow()`
  - `OrchestrationRuntime.tryAllocationNow()`
- Refactored `ticket-dispatch.ts` so board-originated dispatch uses scheduler leases when `orchestration.enabled === true`.
  - Manual and board-worker dispatch allocate the exact selected assignee/manager role.
  - Board/session metadata remains intact.
  - `session.transportMeta.orchestrationLease` is attached for heartbeat renewal.
  - Lease release is owned by ticket dispatch: immediate on setup failure, `finally` after launched run settles.
  - Orchestration-disabled path remains the legacy direct dispatch path.
- Manual dispatch API maps scheduler-specific failures to HTTP `409`.

## Mitigated Findings

- `FSR-M9-001`: Board-worker can no longer bypass scheduler allocation when orchestration is enabled because `dispatchTicket()` fails visible without runtime/mapping and otherwise allocates a lease before dispatch.
- `FSR-M9-002`: Ticket dispatch owns release around `dispatchWebSessionRun()`, while run-web-session continues heartbeat renewal from transport metadata.
- `FSR-M9-003`: Board ticket/session semantics are preserved by keeping `dispatchTicket()` as the integration path instead of routing board work through generic `runOrchestrationTask()`.
- `FSR-M9-004`: Org-reading bridge code lives under `gateway/`, not `packages/jinn/src/orchestration/**`.

## Validation

Passed:

```bash
pnpm --filter jinn-cli typecheck
cd packages/jinn && npx vitest run \
  src/gateway/__tests__/org-worker-bridge.test.ts \
  src/orchestration/__tests__/runtime.test.ts \
  src/gateway/__tests__/ticket-dispatch-orchestration.test.ts \
  src/gateway/__tests__/ticket-dispatch-idempotency.test.ts \
  src/gateway/__tests__/ticket-dispatch-route.test.ts \
  src/gateway/__tests__/ticket-dispatch.test.ts \
  src/gateway/__tests__/board-worker.test.ts \
  src/gateway/__tests__/orchestration-runtime-manager.test.ts
```

Focused slice result: 8 files, 30 tests passed.

Final broader validation:

```bash
pnpm --filter jinn-cli typecheck
cd packages/jinn && npx vitest run \
  src/gateway/__tests__/org-worker-bridge.test.ts \
  src/orchestration/__tests__/runtime.test.ts \
  src/gateway/__tests__/ticket-dispatch-orchestration.test.ts \
  src/gateway/__tests__/ticket-dispatch-idempotency.test.ts \
  src/gateway/__tests__/ticket-dispatch-route.test.ts \
  src/gateway/__tests__/ticket-dispatch.test.ts \
  src/gateway/__tests__/board-worker.test.ts \
  src/gateway/__tests__/orchestration-runtime-manager.test.ts
cd packages/jinn && npx vitest run src/orchestration/**/*.test.ts \
  src/gateway/__tests__/org-worker-bridge.test.ts \
  src/gateway/__tests__/ticket-dispatch-orchestration.test.ts \
  src/gateway/__tests__/ticket-dispatch-idempotency.test.ts \
  src/gateway/__tests__/ticket-dispatch-route.test.ts \
  src/gateway/__tests__/ticket-dispatch.test.ts \
  src/gateway/__tests__/board-worker.test.ts \
  src/gateway/__tests__/orchestration-runtime-manager.test.ts \
  src/cli/__tests__/*orchestration*.test.ts
pnpm typecheck
pnpm lint
pnpm test
git diff --check
```

Final outcomes:

- `pnpm --filter jinn-cli typecheck`: passed.
- Focused M9 slice after final refactor: 8 files, 32 tests passed.
- Orchestration plus board/CLI slice: 19 files, 92 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no configured lint tasks executed.
- `pnpm test`: one full run passed before the final helper refactor; after the helper refactor one aggregate run hit known concurrent timeout failures in `approvals.test.ts`, `archives.test.ts`, and `dual-lane.test.ts`, all three passed in isolation; final full retry passed (`jinn-cli`: 167 files, 1300 passed, 1 skipped; web: 59 files, 627 passed).
- `git diff --check`: passed.
- Exact forbidden-term grep over `packages/jinn/src/orchestration/**`: no hits for standalone forbidden vocabulary.
- Stock `line_count_check.sh` still fails on existing/generated/docs artifacts in this checkout (`packages/web/node_modules`, `.turbo`, `dist`, markdown, and pre-existing oversized files). Touched new source files are below 800 lines; pre-existing oversized touched files are `api.ts` and `server.ts`, with only minimal routing/wiring edits.

## Residual Risks

- `server.ts` and `api.ts` are still oversized existing files; M9 only made small wiring edits there.
- M9 does not add dashboard controls, durable telemetry JSONL, automatic patch integration, or a new config key.
- Giles governance drift remains background debt requiring operator decisions.
