# 2026-06-25 settings connectors modularization

- Skill: `repair-source-modularization`
- Status: `completed_verified`
- Target file: `packages/web/src/routes/settings/page.tsx`

## Gate 0 - Orientation

- Repo contract read from `AGENTS.md` before edits.
- Repo state at start:
  - existing uncommitted work already present in `packages/jinn/src/sessions/registry.ts`
  - existing untracked files already present from the prior modularization slice
- Validation inventory:
  - `pnpm --filter @jinn/web typecheck`
  - `pnpm --filter @jinn/web test -- settings-connectors-section.test.tsx`
- Log/session convention confirmed under `docs/logs/session/062026/`.
- Existing 600-line soft modularity threshold confirmed from prior local session logs.

## Gate 1 - Candidate Inventory And Target Lock

- Locked target: `packages/web/src/routes/settings/page.tsx`
  - largest production source file in the repo at 1,828 lines before this slice
  - route facade with multiple independently renderable settings domains
- Rejected candidates:
  - `packages/jinn/src/sessions/registry.ts`
    - no longer the largest source file after the prior archive slice
  - `packages/jinn/src/gateway/server.ts`
    - higher workflow fan-out and backend startup risk
  - `packages/jinn/src/engines/claude-interactive.ts`
    - interactive engine path has higher behavioral/billing sensitivity
- Out of scope:
  - tests/docs/generated/build/vendor/migration originals
  - other settings sub-sections besides the connectors slice

## Gate 2 - Extraction Plan

Target file:
- Path: `packages/web/src/routes/settings/page.tsx`
- Reason selected: current largest production source file with an existing modularization pattern in the same directory
- Current responsibilities: route shell, local branding state, config loading/saving, WhatsApp status polling, and many settings sections
- Public compatibility names: default route export `SettingsPage`

Extraction seams:
- New module path: `packages/web/src/routes/settings/settings-connectors-section.tsx`
- Responsibility: connector settings rendering and connector-instance editing
- Names moved: connectors section JSX and its instance-specific update helpers
- Names re-exported or delegated by original file: `page.tsx` remains the route facade and still owns config/QR/employee state
- Behavior check: extracted section still mutates connector config and renders type-specific instance fields
- Two-deep connection check: `page.tsx` route -> `SettingsConnectorsSection` -> config update callbacks and `api.reloadConnectors()`

Risks:
- Import cycle risk: none expected; new component depends on config/constants/api only
- Monkeypatch/import compatibility risk: route import path remains unchanged
- Workflow/data-path risk: connector instance edits and reload button must preserve config mutation semantics and alert behavior
- Validation gaps: no existing full settings-page integration test suite

## Gate 3 - Extract One Cohesive Seam

- Added `settings-connectors-section.tsx` and moved only the Connectors section into it.
- Kept `page.tsx` as the route/state facade.
- Passed the page-local field components into the extracted module so the current settings UI styling stays identical.

## Gate 4 - Behavior And Two-Deep Connection Checks

- Direct callers checked:
  - `packages/web/src/routes/settings/page.tsx`
- Second-level paths checked:
  - `packages/web/src/main.tsx` lazy-loads the unchanged route export
  - extracted section still calls `updateConfig()` and `api.reloadConnectors()` through the same page workflow
- Static evidence:
  - no stale imports to old inline connector helpers remain
  - no new cycle from `settings-connectors-section.tsx` back into `page.tsx`

## Gate 5 - Intermediary Audit And Patch

- Audit focus:
  - stale references after extraction
  - behavior drift in connector-instance editing
  - route facade omissions
  - reload/WhatsApp UI regressions
- Dispositions:
  - `fixed`: component receives page-local field primitives as props to avoid silent visual drift from the older extracted settings field module
  - `verified-not-a-defect`: `page.tsx` continues to own config loading, WhatsApp polling, and save orchestration

## Gate 6 - Tests, Docs, Ledgers, And Reality Sync

- Added `packages/web/src/routes/settings/settings-connectors-section.test.tsx` for the extracted section’s add/edit/switch/remove instance behavior.
- Added this gated session log under `docs/logs/session/062026/`.

## Gate 7 - Final Regression And Adversarial Walkthrough

- Workflow walkthrough:
  - route still loads config, polls WhatsApp status, and saves through the same top-level handlers
  - connectors section still edits `config.connectors` through `updateConfig()`
  - connector instance creation/removal remains local to the settings route surface
- Data-path walkthrough:
  - instance arrays still serialize through `config.connectors.instances`
  - allow-list inputs still normalize into arrays the same way as before
  - reload button still aggregates `started/stopped/errors` into one alert

## Validation

- `pnpm --filter @jinn/web typecheck`
- `pnpm --filter @jinn/web test -- settings-connectors-section.test.tsx`

## Residual Risks

- `page.tsx` remains above the repo’s 600-line soft threshold after this single extraction slice.
- Other large settings domains like appearance/branding and gateway/engine configuration still live inline.

## Recommended Follow-up

- Next low-risk slice: extract either the gateway/workspaces section or engine configuration section while keeping `page.tsx` as the route facade.
