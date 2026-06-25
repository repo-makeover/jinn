# 2026-06-22 chat sidebar view model modularization

- Actor: Giles Watcher / Codex
- Authority: user-requested implementation under `AGENTS.md`
- Skill: `repair-source-modularization`
- Target repo: `/home/ericl/vscode_github_public/jinn`
- Target file: `packages/web/src/components/chat/chat-sidebar.tsx`
- Dory checkpoints:
  - `.dory/checkpoints/20260622T2241177.md`

## Summary

Continued the same one-file modularization of `chat-sidebar.tsx` by extracting the pure sidebar derivation pipeline into a dedicated view-model module while preserving `chat-sidebar.tsx` as the exported orchestrator and compatibility facade.

## Selected target file and rationale

- Selected target: `packages/web/src/components/chat/chat-sidebar.tsx`
- Rationale:
  - still materially over threshold after the row-components slice
  - the remaining highest-value seam was the pure data/order/virtual-item pipeline
  - this seam is behavior-preserving and directly unit-testable without widening into hooks, storage, or backend contracts

## Rejected candidates

- further row-component splitting inside `sidebar-row-components.tsx`
  - rejected for this slice because the bigger risk/size driver was the pure derivation block still inside `chat-sidebar.tsx`
- `packages/web/src/hooks/use-sessions.ts`
  - rejected because cache merge semantics are shared and already covered; moving it would widen scope beyond the locked original source file
- backend surfaces under `packages/jinn/src/gateway/**`
  - rejected because they are unrelated active worktree seams

## Scope and gate contract

- Scope:
  - extract pure view-model helpers only:
    - visible-session normalization
    - sidebar collections/grouping
    - manager/contactable employee derivation
    - keyboard order builder
    - virtual-item builder
    - older summary line formatter
- Files inspected:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
  - `packages/web/src/components/chat/sidebar-types.ts`
  - `packages/web/src/components/chat/sidebar-session-helpers.ts`
  - `packages/web/src/components/chat/chat-route-helpers.ts`
  - `packages/web/src/components/chat/sidebar-row-components.tsx`
  - `packages/web/src/components/chat/__tests__/chat-sidebar-helpers.test.ts`
  - `packages/web/src/components/chat/__tests__/shortcut-hints.test.tsx`
  - `packages/web/src/components/chat/__tests__/chat-route-helpers.test.ts`
  - `packages/web/src/hooks/__tests__/use-sessions.test.ts`
- Files allowed to change:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
  - new extracted module(s) under `packages/web/src/components/chat/`
  - focused sidebar tests
  - this repo-local session log
- Files forbidden to touch:
  - shared backend modularization surfaces
  - room grouping implementation under `packages/web/src/lib/rooms/**`
  - storage-key modules and backend API contracts
- Tests required:
  - `git diff --check`
  - `pnpm --filter @jinn/web exec tsc --noEmit`
  - focused Vitest for the sidebar view-model + existing sidebar/helper coverage

## Extraction map

- Original file kept as facade:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
- New extracted module:
  - `packages/web/src/components/chat/sidebar-view-model.ts`
- Responsibilities moved:
  - `buildVisibleSessions(...)`
  - `buildSidebarCollections(...)`
  - `buildContactableEmployees(...)`
  - `buildManagerEmployees(...)`
  - `buildSidebarOrder(...)`
  - `buildVirtualItems(...)`
  - `formatOlderLineLabel(...)`
  - `DIRECT_GROUP`, `CRON_GROUP`, and `VIRTUALIZE_THRESHOLD` constants for the pure sidebar model layer

## Compatibility and facade decisions

- Preserved `ChatSidebar` as the exported facade and owner of:
  - state/effects
  - mutation handlers
  - dialogs
  - room derivation
  - room/scheduled header rendering
  - row rendering via `renderItem`
- Preserved compatibility re-exports from `chat-sidebar.tsx`:
  - `SidebarOrder`
  - `hasBackgroundActivity`
  - `isDirectSession`
  - `isRecentError`
  - `resolveRowIdentity`
- Did not change storage keys, group sentinels, keyboard-order semantics, room IDs, or backend-driven count semantics

## Tests updated

- Added `packages/web/src/components/chat/__tests__/sidebar-view-model.test.ts`
  - focused vs all older bucketing
  - direct/portal grouping plus cron counts
  - pinned/unpinned older grouping
  - keyboard order behavior for collapsed vs expanded older employees
  - room-mode virtual-item sequencing
  - older summary line formatting
- Kept passing:
  - `chat-sidebar-helpers.test.ts`
  - `shortcut-hints.test.tsx`
  - `sidebar-row-components.test.tsx`
  - `chat-route-helpers.test.ts`
  - `use-sessions.test.ts`

## Two-deep connection checks

- Direct importers checked:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
  - `packages/web/src/routes/chat/page.tsx`
  - existing sidebar tests
- Second-level workflows checked:
  - search-mode flattening
  - rooms-mode virtual item generation
  - older drawer + keyboard order
  - manager/contactable roster derivation
- Static evidence:
  - local searches over sidebar and helper imports before extraction
  - new module remains internal to the chat sidebar surface

## Intermediary audits and dispositions

- `fixed`
  - pure grouping/order/virtual-item logic moved out of `chat-sidebar.tsx`
  - direct unit tests now pin the non-DOM sidebar model behavior
- `verified-not-a-defect`
  - collapsed older employee rows contribute only their latest session to keyboard order, and that can dedupe away when the same session already appears in Today/Yesterday; tests were updated to match the live contract
- `blocked`
  - the planner child session returned after the row-components slice had already started; its recommendation was still adopted for this follow-on seam, but not used as the original gating artifact

## Validation commands and results

- `git -C /home/ericl/vscode_github_public/jinn diff --check`
  - passed
- `pnpm --filter @jinn/web exec tsc --noEmit`
  - passed
- `pnpm --filter @jinn/web exec vitest run src/components/chat/__tests__/sidebar-view-model.test.ts src/components/chat/__tests__/chat-sidebar-helpers.test.ts src/components/chat/__tests__/shortcut-hints.test.tsx src/components/chat/__tests__/sidebar-row-components.test.tsx src/components/chat/__tests__/chat-route-helpers.test.ts src/hooks/__tests__/use-sessions.test.ts`
  - passed, 6 files / 65 tests

## Final regression pass

- Re-ran package-local TypeScript after moving the pure builders behind `sidebar-view-model.ts`.
- Re-ran the focused sidebar/helper package tests after correcting the strict test typing and pinning the current collapsed-order behavior.
- Confirmed the extracted view-model module remains package-local and does not widen backend/shared contracts.

## Adversarial workflow and data-path walkthrough

- search path:
  - server-side results still flatten through the same row identity resolver and bypass load-more
- focused vs all:
  - still split in the pure builder using the same `isFocusedSession` rules and older-summary semantics
- rooms:
  - room grouping itself stays in `chat-sidebar.tsx`, but the room-mode virtual list is now built in the extracted pure module from supplied rooms + expansion state
- keyboard order:
  - still de-dupes session IDs and still depends on older drawer and employee expansion state exactly as before
- contactable / managers:
  - still intentionally allow leadership to appear independently of session presence and leave Team as the roster-only tail

## Residual risks

- `packages/web/src/components/chat/chat-sidebar.tsx` remains over both the 600-line threshold and the 1000-line warning line after this slice.
- `packages/web/src/components/chat/sidebar-row-components.tsx` also remains above 600 lines from the prior slice.
- Full monorepo validation was not run.

## Recommended follow-up

- Next frontend seam should either:
  - split `sidebar-row-components.tsx` by row family / primitives, or
  - extract sidebar local-state / mutation-action hooks from `chat-sidebar.tsx`

## Final status

- `completed_with_partial_verification`
