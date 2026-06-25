# Matrix Orchestration Deferred Features

Date: 2026-06-24
Actor: Codex
Authority: user-requested implementation under AGENTS.md

## Intent

Implemented the accepted deferred matrix orchestration feature slice:
per-task queue pause/resume, TTL-bounded holds, manager-scoped authorization,
raw artifact viewing, dual-lane apply-to-base, explicit corrupt DB requeue, and
forward-looking Kiro known diagnostics.

## Changes

- Added durable SQLite tables for task pauses, holds, artifact metadata, and
  patch-apply attempts.
- Added runtime controls for per-task pause/resume and hold
  create/extend/cancel with hold-aware worker headroom filtering.
- Added manager-scoped authorization for holds and runtime employee mutation.
- Added raw prompt/output/diff/patch-apply artifact recording and viewing.
- Added dual-lane apply that refuses dirty base repos, missing winner worktrees,
  empty patches, and conflicts, then applies the winner patch as unstaged base
  changes only.
- Added explicit corrupt DB recovery requeue that imports one parsed recovered
  continuation, imports valid matching active holds, and leaves the task paused.
- Added hash-chained audit records for orchestration control events.
- Added API, CLI, and dashboard controls for the new surfaces.
- Added `docs/known-diagnostics.md` and indexed Kiro quota/AWS-routing gaps as
  known non-actionable diagnostics.

## Validation

- `pnpm --filter jinn-cli typecheck` passed after implementation fixes.
- `pnpm --filter @jinn/web typecheck` passed after dashboard fixture updates.
- Additional focused tests and repo-level validation were still pending when
  this log was written and should be recorded in the final completion report.

## Residual Risks

- Raw artifact output depends on the Jinn session transcript. If an engine run
  produced no assistant transcript row, the artifact records an explicit
  unavailable marker rather than invented output.
- Holds reserve explicit worker ids. Role-only holds are recorded and visible,
  but concrete capacity blocking requires worker ids.
- Recovery requeue trusts only parsed selected records from the quarantined DB
  and does not attempt broad restore.
