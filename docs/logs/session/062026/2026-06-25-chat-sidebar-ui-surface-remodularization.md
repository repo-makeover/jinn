# 2026-06-25 chat sidebar UI surface re-modularization

- Actor: Codex
- Authority: user-requested implementation under `AGENTS.md`
- Skill: `repair-source-modularization`
- Target repo: `/home/ericl/Work/vscode/public_share/jinn`
- Target file: `packages/web/src/components/chat/chat-sidebar.tsx`

## Summary

Re-modularized the live chat sidebar UI surface without changing its public contract. `chat-sidebar.tsx` stayed the exported facade and state/query owner, while row rendering moved back onto `sidebar-row-components.tsx` and the list/body shell moved into a new `sidebar-list-surface.tsx`.

## Selected target and rationale

- Selected target: `packages/web/src/components/chat/chat-sidebar.tsx`
- Rationale:
  - largest current production source file in this repo slice at start of run
  - existing sidebar extraction modules already existed but had drifted into test-only usage
  - the least-risk behavior-preserving seam was reconnecting the facade to those extracted modules instead of starting a fresh hook/state split

## Rejected candidates

- `packages/jinn/src/sessions/registry.ts`
  - still large, but persistence and migration behavior make it a riskier single-slice target than the sidebar UI surface
- `packages/jinn/src/gateway/server.ts`
  - daemon/bootstrap surface with weaker focused validation for a behavior-preserving split
- new state-hook extraction for `chat-sidebar.tsx`
  - intentionally deferred for this run because the UI-surface split already reduced the original monolith substantially with lower behavior risk

## Extraction map

- Original facade kept:
  - `packages/web/src/components/chat/chat-sidebar.tsx`
- Existing extracted modules reconnected as live path:
  - `packages/web/src/components/chat/sidebar-row-components.tsx`
  - `packages/web/src/components/chat/sidebar-storage.ts`
  - `packages/web/src/components/chat/sidebar-view-model.ts`
  - `packages/web/src/components/chat/sidebar-session-helpers.ts`
- New extracted module:
  - `packages/web/src/components/chat/sidebar-list-surface.tsx`

## Compatibility and facade decisions

- Preserved `ChatSidebar` export path and prop contract.
- Preserved helper compatibility exports from `chat-sidebar.tsx`:
  - `hasBackgroundActivity`
  - `isDirectSession`
  - `isRecentError`
  - `resolveRowIdentity`
  - `SidebarOrder`
- Kept in the facade:
  - query hooks and cache merge behavior
  - local UI state and effects
  - delete / duplicate / rename / load-more handlers
  - dialog ownership
  - outer search/header shell
- Removed from the facade:
  - inline row components
  - inline list/body rendering
  - inline older/scheduled render branches
  - duplicated storage/helper/view-model logic

## Tests and two-deep checks

- Direct callers/importers checked:
  - `packages/web/src/routes/chat/page.tsx`
  - `packages/web/src/components/chat/__tests__/shortcut-hints.test.tsx`
  - helper/view-model tests importing compatibility exports
- Second-level workflows checked:
  - desktop/mobile sidebar render path through `chat/page.tsx`
  - search empty state and focused empty-state CTA
  - session row, employee row, and team contact callback propagation
  - scheduled section collapse/load-more wiring
  - keyboard order emission via unchanged `onOrderComputed`
- Static import checks:
  - production imports now flow `chat-sidebar.tsx` -> `sidebar-row-components.tsx` / `sidebar-list-surface.tsx` / `sidebar-view-model.ts` / `sidebar-storage.ts`
  - no stale `setArchiveTarget` / `ArchiveDialogTarget` references remain on the live sidebar path

## Validation commands and results

- `git diff --check`
  - passed
- `pnpm --filter @jinn/web exec tsc --noEmit`
  - passed
- `pnpm --filter @jinn/web exec vitest run src/components/chat/__tests__/sidebar-row-components.test.tsx src/components/chat/__tests__/sidebar-list-surface.test.tsx src/components/chat/__tests__/chat-sidebar-helpers.test.ts src/components/chat/__tests__/sidebar-view-model.test.ts src/components/chat/__tests__/shortcut-hints.test.tsx`
  - passed, 5 files / 31 tests

## Residual risks

- `packages/web/src/components/chat/sidebar-row-components.tsx` remains above the repo's 600-line soft threshold.
- Full monorepo validation (`pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`) was not run in this slice.
- A future run can still extract the sidebar's local controller/state seam if more reduction is needed.

## Final status

- `completed_verified`
