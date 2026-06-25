# 2026-06-25 registry archives modularization

- Skill: `repair-source-modularization`
- Status: `completed_verified`
- Target file: `packages/jinn/src/sessions/registry.ts`

## Gate 0 - Orientation

- Repo contract read from `AGENTS.md` before edits.
- Validation inventory:
  - `pnpm --filter jinn-cli typecheck`
  - `pnpm --filter jinn-cli test -- --runInBand packages/jinn/src/sessions/__tests__/archives.test.ts packages/jinn/src/sessions/__tests__/registry-archives.test.ts`
- Repo state:
  - `git status --short` returned no tracked-worktree changes before this patch.
- Soft modularity threshold found in existing session logs: 600 lines.

## Gate 1 - Candidate Inventory And Target Lock

- Locked target: `packages/jinn/src/sessions/registry.ts`
  - qualifies as the largest production source file in the repo at 1,863 lines
  - contains multiple persistence domains with a low-risk archive seam
- Rejected candidates:
  - `packages/web/src/routes/settings/page.tsx`
    - larger than many files but UI-surface changes were higher risk for a behavior-preserving backend slice
  - `packages/jinn/src/gateway/server.ts`
    - broad startup and workflow fan-out increases regression risk
  - `packages/jinn/src/engines/claude-interactive.ts`
    - interactive PTY/billing path is explicitly sensitive and out of scope for a low-risk modularization run
- Out of scope for this run:
  - tests/docs/generated/build/vendor/migration targets as originals
  - other over-threshold production files

## Gate 2 - Extraction Plan

Target file:
- Path: `packages/jinn/src/sessions/registry.ts`
- Reason selected: largest source file with an already isolated archive responsibility and focused validation
- Current responsibilities: DB boot/migrations, session CRUD, messages/FTS, queue state, archives, approvals, files
- Public compatibility names: `snapshotSessions`, `createArchive`, `createArchiveAndDeleteSessions`, `listArchives`, `getArchive`, `deleteArchive`

Extraction seams:
- New module path: `packages/jinn/src/sessions/registry-archives.ts`
- Responsibility: archive snapshotting and archive-table persistence
- Names moved: archive helpers and archive CRUD/delete-flow implementation
- Names re-exported or delegated by original file: archive APIs stay exported from `registry.ts`
- Behavior check: archive persistence, rollback, and API route tests
- Two-deep connection check: `registry.ts` facade -> `gateway/api/routes/archives.ts` -> `packages/web/src/hooks/use-archives.ts`

Risks:
- Import cycle risk: avoided by passing `getDb`, `getSession`, and `getMessages` as injected dependencies
- Monkeypatch/import compatibility risk: preserved by leaving the public archive exports on `registry.ts`
- Workflow/data-path risk: archive deletion still removes messages, queue items, queue pauses, and sessions in one transaction
- Validation gaps: full monorepo lint/build not run in this slice

## Gate 3 - Extract One Cohesive Seam

- Added `packages/jinn/src/sessions/registry-archives.ts` for archive-only logic.
- Replaced inline archive helpers/operations in `registry.ts` with thin delegating wrappers.
- Left all archive callers importing `../sessions/registry.js` unchanged.

## Gate 4 - Behavior And Two-Deep Connection Checks

- Direct callers checked:
  - `packages/jinn/src/gateway/api/routes/archives.ts`
  - `packages/jinn/src/sessions/__tests__/archives.test.ts`
- Second-level workflow checked:
  - `packages/web/src/hooks/use-archives.ts` consumes the archive API responses
  - API route continues to drive session deletion events after archive creation
- Static-search cycle/stale-reference check:
  - archive callers still point at `registry.ts`
  - new module is dependency-injected, so no runtime `registry.ts` import cycle was introduced

## Gate 5 - Intermediary Audit And Patch

- Audit focus:
  - behavior drift in archive snapshot payloads
  - facade export omissions
  - transaction/rollback regressions
  - stale references to moved archive helpers
- Disposition:
  - `fixed`: extracted helper module uses dependency injection to avoid a new registry import cycle
  - `verified-not-a-defect`: keeping archive exports on `registry.ts` preserves compatibility for route and test imports

## Gate 6 - Tests, Docs, Ledgers, And Reality Sync

- Added `packages/jinn/src/sessions/__tests__/registry-archives.test.ts` to exercise the extracted module directly.
- Kept `packages/jinn/src/sessions/__tests__/archives.test.ts` as facade + route behavior coverage.
- Added this gated session log under `docs/logs/session/062026/`.

## Gate 7 - Final Regression And Adversarial Walkthrough

- Workflow walkthrough:
  - archive route still snapshots live sessions through `registry.ts`
  - archive delete flow still removes messages, pending queue rows, pause rows, and session rows transactionally
  - web archive hooks remain insulated because API shape is unchanged
- Data-path walkthrough:
  - session/message rows still serialize into archive payloads with media/tool-call fields preserved
  - archive list/detail rows still deserialize through the same shape

## Validation

- `pnpm --filter jinn-cli typecheck`
- `pnpm --filter jinn-cli test -- --runInBand packages/jinn/src/sessions/__tests__/archives.test.ts packages/jinn/src/sessions/__tests__/registry-archives.test.ts`

## Residual Risks

- `packages/jinn/src/sessions/registry.ts` remains above the repo’s 600-line soft threshold after this single-seam extraction.
- Other registry domains like queue, approvals, files, and message persistence remain co-located and should be separate future slices.

## Recommended Follow-up

- Next low-risk registry slice: extract either queue persistence or file metadata persistence while keeping `registry.ts` as the facade.
