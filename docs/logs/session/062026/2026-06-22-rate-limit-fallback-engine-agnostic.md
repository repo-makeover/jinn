# Session Log — 2026-06-22 — Rate-Limit Fallback Engine-Agnostic Repair

## Summary

Implemented a bounded repair for the rate-limit recovery seam so fallback/wait handling is engine-agnostic instead of Claude/Codex-specific. Kept Claude-only preflight heuristics and Claude-only transcript resync behavior local to Claude restore paths.

## Mode

Existing-findings mode from watcher-confirmed seam.

## Selected defect

- `usage/limit only works for codex and not other llm CLIs`
  - Evidence: `packages/jinn/src/sessions/rate-limit-handler.ts` only auto-fell back when the source engine was Claude and carried Claude/GPT-specific state text.
  - Files touched: `packages/jinn/src/sessions/rate-limit-handler.ts`, `packages/jinn/src/sessions/manager.ts`, `packages/jinn/src/gateway/run-web-session.ts`, `packages/jinn/src/shared/types.ts`, `packages/web/src/routes/settings/settings-constants.ts`, `packages/jinn/src/sessions/__tests__/rate-limit-fallback-guard.test.ts`
  - Verification target: focused fallback guard test plus package typechecks across the shared type boundary.

## Excluded / deferred

- `packages/jinn/src/gateway/api.ts`
  - Reason: out of allowed scope for this slice, even though one queued-web waiting message still names Claude explicitly.

## Patch count

- Selected repairs: 1
- Intermediary audit patches: 0
- Remaining patch budget: 9

## Validation

- `pnpm test -- src/sessions/__tests__/rate-limit-fallback-guard.test.ts`
  - Passed: 1 file, 5 tests.
- `pnpm typecheck` in `packages/jinn`
  - Passed.
- `pnpm typecheck` in `packages/web`
  - Passed.
- `git diff --check -- <touched files>`
  - Passed.

## Intermediary audit

- Checked for accidental GUI changes: none.
- Checked for engine-specific fallback assumptions in the touched seam: repaired in shared handler, connector path, and web path.
- Checked for config typing drift across package boundary: repaired in shared + web config types.

## Regression check

- Confirmed fallback now keys off configured `sessions.fallbackEngine` for non-Claude source engines.
- Confirmed fallback run uses the fallback engine's configured model instead of reusing the source engine model.
- Confirmed waiting/fallback/resume/timeout messages now derive from the active engine name in touched paths.
- Confirmed connector-side "still paused" notice reads engine-specific recorded reset state when available.

## Residual risk

- `packages/jinn/src/gateway/api.ts` still has one Claude-specific queued-waiting banner string outside the allowed slice.
- The settings UI copy still references Claude/Codex in the visible selector text; only the config typing was widened in this repair.

## Final status

- `completed_verified`
