# 2026-06-24 Matrix Orchestration M10

## Scope

Implemented M10 durable telemetry and empirical routing:

- append-only `~/.jinn/logs/orchestration-telemetry.jsonl`;
- `jinn scheduler stats [--path <file>] [--json]`;
- live telemetry emission for scheduler-owned orchestration turns, dual-lane
  selection, and M9 board/manual dispatch;
- `orchestration.empiricalRouting` score tie-breaks.

## Gate Notes

- Gate 0: read repo instructions and relevant orchestration docs/code. Giles
  gate reported a pre-existing governance block; the operator gave an explicit
  one-session waiver.
- Gate 1: kept scope to M10 only. Optional `audit.jsonl` integration was
  deferred because JSONL satisfies this milestone's durable telemetry acceptance.
- Gate 2-4: added telemetry module, CLI stats, runtime score wiring, and live
  emitters.
- Gate 5: added tests for corrupt telemetry, privacy boundaries, score
  tie-breaks, worktree count telemetry, dual-lane selection records, and board
  dispatch telemetry.
- Gate 6: updated orchestration README, feature inventory, and roadmap.
- Gate 7: validation recorded below.

## Defect Ledger

- M10-001: run telemetry could be skipped if the live dispatch threw before the
  post-run path. Fixed by appending in the run-mode `finally` block.
- M10-002: empirical routing could accidentally look like a hard routing rule.
  Fixed by making scores a scheduler tie-break after tier/cost and all hard
  constraints.
- M10-003: board dispatch owned leases but not telemetry. Fixed by emitting
  board/manual telemetry in the same promise settlement path that releases the
  lease.
- M10-004: dual-lane loser cleanup could remove diff evidence before selection
  telemetry counted changed files. Fixed by counting before archive/cleanup.

## Validation

- `cd packages/jinn && npx vitest run src/orchestration/__tests__/telemetry.test.ts src/orchestration/__tests__/scheduler.test.ts src/orchestration/__tests__/runtime.test.ts src/orchestration/__tests__/run-mode.test.ts src/orchestration/__tests__/dual-lane.test.ts src/gateway/__tests__/ticket-dispatch-orchestration.test.ts src/cli/__tests__/orchestration-scheduler.test.ts src/shared/__tests__/config.test.ts`
  - passed: 8 files, 69 tests.
- `pnpm --filter jinn-cli typecheck`
  - passed.
- `pnpm typecheck`
  - passed.
- `pnpm test`
  - passed: `jinn-cli` 168 files / 1309 passed / 1 skipped; `@jinn/web` 59
    files / 627 passed.
- `git diff --check`
  - passed.
- `pnpm lint`
  - completed; turbo reported no lint tasks configured.
- `line_count_check.sh`
  - failed on pre-existing nested/generated/cache artifacts because the script
    only excludes root-level `node_modules`/`dist` paths. Touched source files
    were checked separately and stayed under 800 lines (`config-schema.ts` 795,
    `shared/types.ts` 776, `telemetry.ts` 295).

## Residual Risk

- Hash-chained `audit.jsonl` entries remain deferred.
- Dashboard visibility/control for telemetry remains M11.
- Telemetry records count changed files/tests from diffs but do not evaluate test
  pass/fail automatically yet; those nullable fields remain `null` until a QA
  result source is wired.
