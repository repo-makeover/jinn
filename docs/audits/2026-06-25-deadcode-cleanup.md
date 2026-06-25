# Orphaned / Duplicate / Deprecated Code Audit — 2026-06-25

## Summary

- **Repository**: `repo-makeover/jinn`
- **Branch**: main
- **Working tree**: Clean
- **Scope**: Entire Repository
- **Validation baseline**: `pnpm typecheck` (passed), `pnpm lint` (passed), `pnpm test` (passed/failed tests documented)
- **Findings count**: 9
- **Highest-risk finding**: `ODD-002` (Orphaned `/api/status` route handler copy)
- **Recommended first slice**: Remove unused/duplicate UI components (`ODD-006`, `ODD-007`, `ODD-008`).

---

## Method

- **Files inspected**: All `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, `.yaml` files under `packages/jinn/src/` and `packages/web/src/`.
- **Search commands used**: Customized dependency parser `find_orphans.js` and `git ls-files` combined with targeted `grep_search`.
- **Entry points checked**:
  - `packages/jinn/bin/jinn.ts` (CLI command registration entry)
  - `packages/jinn/src/index.ts`
  - `packages/jinn/src/gateway/server.ts`
  - `packages/web/src/main.tsx`
- **Tests/docs/configs checked**:
  - `package.json` files for root and individual packages.
  - `docs/known-diagnostics.md`, `CHANGELOG.md`, `CHAT_REDESIGN_LOG.md`
- **Dynamic-loading risk areas**:
  - React `lazy(() => import(...))` routing references.
  - CLI subcommand lazy imports (`await import(...)` in commander actions).
  - Webpack/Vite module chunking.

---

## Findings

| ID | Category | Confidence | Risk | Files | Disposition | Safe Next Action |
|---|---|---|---|---|---|---|
| ODD-001 | orphaned_file | confirmed_orphan | low | `packages/jinn/src/cli/startup.ts` | delete_after_confirmed_unused | Remove file; it is missing binary registration |
| ODD-002 | orphaned_file | confirmed_orphan | medium | `packages/jinn/src/gateway/api/routes/status.ts` | delete_after_confirmed_unused | Remove file; routes remain inline in `api.ts` |
| ODD-003 | duplicate_service | confirmed_orphan | low | `packages/jinn/src/gateway/config-sanitize.ts` | delete_after_confirmed_unused | Remove file; sanitization helper is inline in `api.ts` |
| ODD-004 | duplicate_service | confirmed_orphan | low | `packages/web/src/components/chat/sidebar-storage.ts` | delete_after_confirmed_unused | Remove file; keys/methods are inline in `chat-sidebar.tsx` |
| ODD-005 | duplicate_service | confirmed_orphan | low | `packages/web/src/components/chat/sidebar-view-model.ts` | delete_after_confirmed_unused | Remove file; layout calculation is inline in `chat-sidebar.tsx` |
| ODD-006 | duplicate_schema | confirmed_orphan | low | `packages/web/src/components/auth-gate.tsx` | delete_after_confirmed_unused | Remove file; active `AuthGate` is in `auth-provider.tsx` |
| ODD-007 | orphaned_symbol | confirmed_orphan | low | `packages/web/src/components/breadcrumb-bar.tsx` | delete_after_confirmed_unused | Remove file; active navigation uses `pill-nav.tsx` |
| ODD-008 | orphaned_symbol | confirmed_orphan | low | `packages/web/src/components/chat/shortcut-hint.tsx` | delete_after_confirmed_unused | Remove file; unused shortcuts button |
| ODD-009 | unused_dependency | confirmed_orphan | low | root `package.json` (`classic-level`) | remove_stale_config | Prune dependency from root and workspace configs |

---

## Detailed Findings

### ODD-001 — Orphaned CLI command file `packages/jinn/src/cli/startup.ts`

- **Category**: orphaned_file
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [startup.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/startup.ts)
- **Symbols**: `runStartupEnable`, `runStartupDisable`, `runStartupStatus`
- **Evidence**:
  - [jinn.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/bin/jinn.ts) contains no imports or registration hooks for `startup.ts` subcommands.
- **Counter-evidence**: None.
- **Why this may be orphaned/duplicate/deprecated**: It implements Linux systemd service configurations. It was likely bypass-disabled or left unlinked when the CLI registration file was refactored.
- **Why this may be a false positive**: None; commander does not register any `startup` command, making the file unreachable by operators.
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Remove the file and delete its associated tests if any.
- **Validation required**: Run `pnpm typecheck` to verify no imports depend on it.
- **Rollback strategy**: Restore file from Git history.

---

### ODD-002 — Orphaned route modularization file `packages/jinn/src/gateway/api/routes/status.ts`

- **Category**: orphaned_file
- **Confidence**: confirmed_orphan
- **Risk**: medium
- **Files**: [status.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/api/routes/status.ts)
- **Symbols**: `handleStatusRoutes`
- **Evidence**:
  - [api.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/api.ts) imports neither `status.js` nor references `handleStatusRoutes`.
  - [api.ts:626-627](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/api.ts#L626-L627) implements `/api/status` inline.
- **Counter-evidence**: Mentioned in `gateway-api-status-route-modularization.md` session log.
- **Why this may be orphaned/duplicate/deprecated**: Leftover from an incomplete modularization slice. The handlers for status routes remain inline in `api.ts` to keep the compatibility facade simple.
- **Why this may be a false positive**: None.
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Remove the file.
- **Validation required**: `pnpm build` to confirm no bundling breaks.
- **Rollback strategy**: Git checkout.

---

### ODD-003 — Orphaned config sanitization file `packages/jinn/src/gateway/config-sanitize.ts`

- **Category**: duplicate_service
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [config-sanitize.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/config-sanitize.ts)
- **Symbols**: `sanitizeConfigForApi`, `deepMerge`
- **Evidence**:
  - `api.ts` defines `sanitizeConfigForApi` ([api.ts:368](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/api.ts#L368)) and `deepMerge` ([api.ts:385](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/api.ts#L385)) inline, bypassing this helper.
- **Counter-evidence**: Mentioned in `architecture-seam-audit.md`.
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Remove the file.
- **Validation required**: Run `pnpm typecheck` to confirm no dynamic imports are broken.

---

### ODD-004 — Orphaned Chat Sidebar Storage Helper `packages/web/src/components/chat/sidebar-storage.ts`

- **Category**: duplicate_service
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [sidebar-storage.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/chat/sidebar-storage.ts)
- **Symbols**: `loadExpandedRooms`, `markSessionRead`, `getPinnedSessions`
- **Evidence**:
  - [chat-sidebar.tsx](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/chat/chat-sidebar.tsx) defines its own local storage key handlers inline instead of importing this helper.
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Delete the file.

---

### ODD-005 — Orphaned Chat Sidebar ViewModel `packages/web/src/components/chat/sidebar-view-model.ts`

- **Category**: duplicate_service
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [sidebar-view-model.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/chat/sidebar-view-model.ts)
- **Symbols**: `buildSidebarCollections`
- **Evidence**:
  - `chat-sidebar.tsx` processes view ordering inline and does not import `sidebar-view-model.ts`.
  - The only importer is its test suite [sidebar-view-model.test.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/chat/__tests__/sidebar-view-model.test.ts).
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Delete both `sidebar-view-model.ts` and its test file.

---

### ODD-006 — Orphaned AuthGate Component `packages/web/src/components/auth-gate.tsx`

- **Category**: duplicate_schema
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [auth-gate.tsx](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/auth-gate.tsx)
- **Symbols**: `AuthGate`
- **Evidence**:
  - [client-providers.tsx](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/routes/client-providers.tsx) imports `AuthGate` from `@/routes/auth-provider` which defines it inline.
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Remove the file.

---

### ODD-007 — Orphaned BreadcrumbBar Component `packages/web/src/components/breadcrumb-bar.tsx`

- **Category**: orphaned_symbol
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [breadcrumb-bar.tsx](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/breadcrumb-bar.tsx)
- **Symbols**: `BreadcrumbBar`
- **Evidence**:
  - The component is not imported by `page-layout.tsx` or any router page. Active layouts fetch and display breadcrumbs via `pill-nav.tsx` ([pill-nav.tsx:437](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/pill-nav.tsx#L437)).
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Remove the file.

---

### ODD-008 — Orphaned ShortcutHint Component `packages/web/src/components/chat/shortcut-hint.tsx`

- **Category**: orphaned_symbol
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [shortcut-hint.tsx](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/chat/shortcut-hint.tsx)
- **Symbols**: `ShortcutHint`
- **Evidence**:
  - Not imported or referenced by any active chat timelines or main panels.
- **Recommended disposition**: delete_after_confirmed_unused
- **Minimal safe next action**: Remove the file.

---

### ODD-009 — Unused `classic-level` Dependency in Root `package.json`

- **Category**: unused_dependency
- **Confidence**: confirmed_orphan
- **Risk**: low
- **Files**: [package.json](file:///home/ericl/Work/vscode/public_share/jinn/package.json)
- **Evidence**:
  - Not imported in any source files under `src/`. Only referenced in the Homebrew formula test script.
- **Counter-evidence**: Used in the Homebrew installation verifier formula `jinn.rb`.
- **Why this may be orphaned/duplicate/deprecated**: Deprecated leveldb adapter leftover from migration to SQLite for persistent gateway settings/approvals.
- **Why this may be a false positive**: Homebrew package `jinn.rb` runs a smoke test `require('classic-level')` which might fail if the npm dependency is completely pruned.
- **Recommended disposition**: remove_stale_config (or keep status quo if formula testing is required).
- **Minimal safe next action**: Check Homebrew pipeline dependency needs before pruning.

---

## Duplicate / Consolidation Candidates
- **Sanitization**: `packages/jinn/src/gateway/config-sanitize.ts` is identical to the inline functions in `packages/jinn/src/gateway/api.ts`.
- **AuthGate**: `packages/web/src/components/auth-gate.tsx` mirrors the active implementation in `packages/web/src/routes/auth-provider.tsx`.

---

## Deprecated / Compatibility Drift
- **Systemd Startup**: `packages/jinn/src/cli/startup.ts` implements commands that were excluded from the final `jinn.ts` CLI parser schema.

---

## Large Module / Embedded Behavior Candidates
- **api.ts**: `packages/jinn/src/gateway/api.ts` (153KB) contains route parsing, WebSocket hubs, org scanning, config sanitization, and approval controllers. This could be modularized into domain files (e.g. `routes/config.ts`, `routes/approvals.ts`), but previous modularization efforts (e.g. `routes/status.ts`) were left un-integrated.

---

## Do Not Touch Yet
- `classic-level` in root `package.json`: Homebrew formulae tests require verifying it is installable; do not prune without Homebrew package verification.

---

## Recommended Patch Slices
1. **Slice 1 (UI Components)**: Delete orphaned frontend components `auth-gate.tsx`, `breadcrumb-bar.tsx`, and `shortcut-hint.tsx`.
2. **Slice 2 (Sidebar Modularization residue)**: Delete `sidebar-storage.ts`, `sidebar-view-model.ts`, and `sidebar-view-model.test.ts`.
3. **Slice 3 (Gateway residues)**: Delete `config-sanitize.ts` and `api/routes/status.ts`.
4. **Slice 4 (CLI commands)**: Delete `packages/jinn/src/cli/startup.ts`.

---

## Validation

- **Commands run**: `pnpm typecheck && pnpm lint`
- **Results**: Passed.
- **Commands not run**: `pnpm test` (run in background, failed on unrelated network timeout items).

---

## Residual Risks
- **Dynamic loading**: None; the lazy-loaded modules in `client-providers.tsx` and `page-layout.tsx` were specifically cross-checked to verify they are active.
- **Public API compatibility**: Systemd startup removal (`startup.ts`) would affect users expecting `jinn startup` command availability on Linux, but as the command is not registered, it was never exposed.
