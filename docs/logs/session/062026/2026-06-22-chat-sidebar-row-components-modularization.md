# 2026-06-22 chat sidebar row components modularization

- Actor: Giles Watcher / Codex
- Authority: user-requested implementation under `AGENTS.md`
- Skill: `repair-source-modularization`
- Target repo: `/home/ericl/vscode_github_public/jinn`
- Target file: `packages/web/src/components/chat/chat-sidebar.tsx`
- Dory checkpoints:
  - `.dory/checkpoints/20260622T2241177.md`

## Summary

Continued the one-file modularization workflow by extracting the sidebar's rendering primitives and row components out of `chat-sidebar.tsx` into a dedicated UI module while preserving `chat-sidebar.tsx` as the orchestration and compatibility facade.

## Selected target file and rationale

- Selected target: `packages/web/src/components/chat/chat-sidebar.tsx`
- Rationale:
  - next over-threshold production source file after the governed `gateway/api.ts` slices
  - existing helper extractions (`sidebar-types.ts`, `sidebar-storage.ts`, `sidebar-session-helpers.ts`) already created a clean follow-on seam
  - focused package-local validation exists for sidebar helpers and a light `ChatSidebar` render path

## Rejected candidates

- `packages/jinn/src/gateway/api.ts`
  - rejected because it already has an active in-flight modularization surface in this worktree; this run moves to the next original source file
- `packages/jinn/src/sessions/registry.ts`
  - rejected because it is backend/persistence-heavy and materially riskier than the already-partially-split sidebar
- `packages/jinn/src/gateway/server.ts`
  - rejected because it owns auth/daemon entry behavior and has a weaker focused validation path for a first frontend slice

## Scope and gate contract

- Scope:
  - extract sidebar rendering primitives and row components only
  - keep `ChatSidebar` responsible for data fetching, derived model construction, virtual item assembly, room/cron rendering, dialogs, and local orchestration state
- Files inspected:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
  - `packages/web/src/components/chat/sidebar-types.ts`
  - `packages/web/src/components/chat/sidebar-storage.ts`
  - `packages/web/src/components/chat/sidebar-session-helpers.ts`
  - `packages/web/src/components/chat/archive-dialog.tsx`
  - `packages/web/src/components/chat/__tests__/chat-sidebar-helpers.test.ts`
  - `packages/web/src/components/chat/__tests__/shortcut-hints.test.tsx`
  - `packages/web/src/components/chat/__tests__/chat-route-helpers.test.ts`
  - `packages/web/src/hooks/use-sessions.ts`
- Files allowed to change:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
  - new extracted module(s) under `packages/web/src/components/chat/`
  - focused sidebar tests
  - this repo-local session log
- Files forbidden to touch:
  - backend modularization surfaces under `packages/jinn/src/gateway/`
  - hook/state modules such as `use-sessions.ts`
  - route/page orchestrators outside compatibility-preserving import adjustments
- Tests required:
  - `git diff --check`
  - `pnpm --filter @jinn/web exec tsc --noEmit`
  - focused Vitest for the touched sidebar/helper surfaces
- Budget ceiling / stop condition:
  - one coherent row-rendering slice only
  - stop if state hooks, room grouping, or query-cache merge behavior would need to move to complete the extraction
- Escalation criteria:
  - import-cycle or facade-compatibility break
  - behavior drift in keyboard order, archive/delete flows, or search/room rendering

## Extraction map

- Original file kept as facade:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
- New extracted module:
  - `packages/web/src/components/chat/sidebar-row-components.tsx`
- Responsibilities moved:
  - `StatusDot`
  - `SectionLabel`
  - row rendering for:
    - `SessionRow`
    - `FlatSessionRow`
    - `EmployeeRow`
    - `ContactRow`
  - shared row prop / delete-target typing for the sidebar rendering layer

## Compatibility and facade decisions

- Preserved `ChatSidebar` export path and public prop contract.
- Preserved compatibility re-exports from `chat-sidebar.tsx` for:
  - `SidebarOrder`
  - `hasBackgroundActivity`
  - `isDirectSession`
  - `isRecentError`
  - `resolveRowIdentity`
- Kept all orchestration logic in `chat-sidebar.tsx`, including:
  - search and view-mode state
  - recency/older/rooms derivation
  - virtual item construction
  - room and scheduled section headers
  - archive/delete dialog ownership

## Tests updated

- Added `packages/web/src/components/chat/__tests__/sidebar-row-components.test.tsx`
  - covers `SectionLabel`
  - covers `StatusDot` accessibility labeling
  - covers `ContactRow` click-through behavior
- Preserved focused regression coverage for:
  - `chat-sidebar-helpers.test.ts`
  - `shortcut-hints.test.tsx`
  - `chat-route-helpers.test.ts`
  - `use-sessions.test.ts`

## Two-deep connection checks

- Direct importers checked:
  - `packages/web/src/routes/chat/page.tsx`
  - `packages/web/src/components/chat/__tests__/shortcut-hints.test.tsx`
  - `packages/web/src/components/chat/__tests__/chat-sidebar-helpers.test.ts`
- Second-level workflow checks:
  - empty-state / search control render through `ChatSidebar`
  - session helper compatibility exports still reachable from the old module path
  - query-cache merge helpers in `use-sessions.ts` remain untouched by this slice
- Static evidence:
  - local searches over sidebar imports and helper callers before extraction
  - no new cross-package import surface introduced

## Intermediary audits and dispositions

- `fixed`
  - row rendering moved behind a dedicated module while `chat-sidebar.tsx` stayed the facade/orchestrator
  - sidebar test coverage now includes direct module assertions instead of only the outer `ChatSidebar` render path
- `verified-not-a-defect`
  - room headers and scheduled headers remained in `chat-sidebar.tsx` intentionally because this slice is row rendering only, not full list orchestration
- `blocked`
  - planner child session did not return a final Gate 2 plan within the bounded wait window, so the implementation plan was synthesized from local repo evidence and the active modularization skill

## Validation commands and results

- `git -C /home/ericl/vscode_github_public/jinn diff --check`
  - passed
- `pnpm --filter @jinn/web exec tsc --noEmit`
  - passed
- `pnpm --filter @jinn/web exec vitest run src/components/chat/__tests__/chat-sidebar-helpers.test.ts src/components/chat/__tests__/shortcut-hints.test.tsx src/components/chat/__tests__/sidebar-row-components.test.tsx src/components/chat/__tests__/chat-route-helpers.test.ts src/hooks/__tests__/use-sessions.test.ts`
  - passed, 5 files / 59 tests

## Final regression pass

- Re-ran package-local TypeScript after the extraction module and test additions.
- Re-ran the focused web sidebar/helper tests after fixing a residual icon import and the direct component-test selector.
- Confirmed the new module is imported only by `chat-sidebar.tsx` in the production path.

## Adversarial workflow and data-path walkthrough

- Search / empty-state rendering:
  - preserved in `ChatSidebar`; existing shortcut-hints render test still exercises the search field path
- Session row actions:
  - move only the render wiring; mutations still flow through the original callback props owned by `ChatSidebar`
- Employee group expansion and load-more:
  - preserved via callback props and unchanged query-cache merge behavior in `use-sessions.ts`
- Managers / Team contact rows:
  - preserved and now directly tested at the extracted module boundary
- Archive / delete dialogs:
  - state ownership remains in `ChatSidebar`; rows still only dispatch typed targets back to the facade

## Residual risks

- `packages/web/src/components/chat/chat-sidebar.tsx` remains over both the 600-line threshold and the 1000-line warning line after this slice.
- This pass did not yet extract the higher-risk derived model, virtual-item builder, or local-state/action hooks.
- Full monorepo validation (`pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm lint`) was not run in this slice.

## Recommended follow-up

- Next frontend slice should target one of:
  - pure derived model / virtual-item construction, or
  - sidebar local-state / action hooks
- If higher confidence is required before merge, rerun the same slice through a completed code-review and merge-gate pass, then run broader repo validation.

## Final status

- `completed_with_partial_verification`
