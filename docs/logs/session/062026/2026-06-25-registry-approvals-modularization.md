# 2026-06-25 registry approvals modularization

- Skill: `repair-source-modularization`
- Status: `completed_verified`
- Target file: `packages/jinn/src/sessions/registry.ts`

## Gate 0 - Orientation

- Repo contract re-read from `AGENTS.md` before edits.
- Repo state at start:
  - existing uncommitted modularization work already present in `packages/web/src/routes/settings/page.tsx`
  - existing untracked modularization logs/tests/modules already present from earlier slices
- Validation inventory:
  - `pnpm --filter jinn-cli typecheck`
  - `pnpm --filter jinn-cli test -- registry-approvals.test.ts approvals.test.ts`
- Existing local convention confirmed:
  - session logs under `docs/logs/session/062026/`
  - 600-line soft modularity threshold from prior repo session logs

## Gate 1 - Candidate Inventory And Target Lock

- Locked target: `packages/jinn/src/sessions/registry.ts`
  - current largest production source file at 1,744 lines
  - already contains one extracted archive seam, so continuing the facade pattern is the least-risk follow-up
- Rejected candidates:
  - `packages/web/src/routes/settings/page.tsx`
    - no longer the largest production source file after the connectors slice
  - `packages/jinn/src/gateway/server.ts`
    - broader startup/runtime fan-out than a bounded persistence seam
  - `packages/jinn/src/engines/claude-interactive.ts`
    - interactive engine path remains higher-risk and behavior-sensitive
- Out of scope:
  - tests/docs/generated/build/vendor/migration originals
  - queue persistence, file metadata persistence, and message persistence seams for this run

## Gate 2 - Extraction Plan

Target file:
- Path: `packages/jinn/src/sessions/registry.ts`
- Reason selected: largest source file with another clean persistence seam still co-located
- Current responsibilities: DB boot/migrations, session CRUD, archives, message persistence/FTS, queue persistence, approvals, file metadata
- Public compatibility names: `importApprovalsJsonIfNeeded`, `listApprovalRecords`, `getApprovalRecord`, `createApprovalRecord`, `resolveApprovalRecord`, `clearApprovalRecordsForTest`

Extraction seams:
- New module path: `packages/jinn/src/sessions/registry-approvals.ts`
- Responsibility: approvals persistence, legacy import, dedupe, and resolution
- Names moved: approval row conversion and approval CRUD/import logic
- Names re-exported or delegated by original file: all approval APIs remain exported from `registry.ts`
- Behavior check: gateway approvals store + endpoint tests and direct helper tests
- Two-deep connection check: `registry.ts` facade -> `gateway/approvals.ts` -> `gateway/api/routes/approvals.ts` and fallback approval flows

Risks:
- Import cycle risk: avoided with injected `getDb`, `getMeta`, `setMeta`, and `parseJsonObject` deps
- Monkeypatch/import compatibility risk: callers continue importing approvals APIs from `registry.ts`
- Workflow/data-path risk: fallback dedupe and pending-only resolution semantics must remain unchanged
- Validation gaps: full monorepo lint/build not run in this slice

## Gate 3 - Extract One Cohesive Seam

- Added `packages/jinn/src/sessions/registry-approvals.ts`.
- Replaced inline approval-store implementation in `registry.ts` with delegating wrappers.
- Preserved the original `registry.ts` approval export surface unchanged.

## Gate 4 - Behavior And Two-Deep Connection Checks

- Direct callers checked:
  - `packages/jinn/src/gateway/approvals.ts`
  - `packages/jinn/src/gateway/__tests__/approvals.test.ts`
- Second-level workflow checked:
  - approvals route flow through `packages/jinn/src/gateway/api/routes/approvals.ts`
  - fallback approval lifecycle exercised by gateway approval endpoint tests
- Static-search evidence:
  - no new import from `registry-approvals.ts` back into `registry.ts`
  - callers still resolve the compatibility facade in `registry.ts`

## Gate 5 - Intermediary Audit And Patch

- Audit focus:
  - stale references after moving approval helpers
  - fallback dedupe drift
  - legacy json import regression
  - facade export omissions
- Dispositions:
  - `fixed`: helper module uses dependency injection so approval helpers do not introduce a registry import cycle
  - `verified-not-a-defect`: `registry.ts` still owns the public approval API surface and DB boot path

## Gate 6 - Tests, Docs, Ledgers, And Reality Sync

- Added `packages/jinn/src/sessions/__tests__/registry-approvals.test.ts` for the extracted helper behavior.
- Added this gated session log under `docs/logs/session/062026/`.

## Gate 7 - Final Regression And Adversarial Walkthrough

- Workflow walkthrough:
  - approval listing/creation/resolution still flow through `gateway/approvals.ts`
  - fallback approval dedupe still keeps one pending fallback record per session
  - endpoint-driven approval transitions remain governed by pending-only resolution checks
- Data-path walkthrough:
  - legacy `approvals.json` import still records a meta watermark to avoid duplicate imports
  - approval payloads still parse through the same JSON-object guard as before

## Validation

- `pnpm --filter jinn-cli typecheck`
- `pnpm --filter jinn-cli test -- registry-approvals.test.ts approvals.test.ts`

## Residual Risks

- `packages/jinn/src/sessions/registry.ts` remains above the repo’s 600-line soft threshold after this single seam extraction.
- Queue persistence, file metadata persistence, and message persistence still live in the same facade.

## Recommended Follow-up

- Next low-risk registry slice: extract queue persistence or file metadata persistence while preserving `registry.ts` as the compatibility facade.
