# 2026-06-22 gateway api status-route modularization

- Actor: Giles Watcher / Codex
- Authority: user-requested implementation under `AGENTS.md`
- Skill: `repair-source-modularization`
- Target repo: `/home/ericl/vscode_github_public/jinn`
- Target file: `packages/jinn/src/gateway/api.ts`
- Dory checkpoints:
  - `.dory/checkpoints/20260622T2200517.md`
  - `.dory/checkpoints/20260622T2202278.md`

## Summary

Extracted the exact-match status/work visibility routes out of `packages/jinn/src/gateway/api.ts` into a new backend module while keeping `api.ts` as the compatibility facade. This run stayed within the one-original-source-file invariant and did not touch the frontend `chat-sidebar.tsx` seam.

## Selected target file and rationale

- Selected target: `packages/jinn/src/gateway/api.ts`
- Rationale:
  - explicit target mode from the operator brief
  - active `.dory` objective already pointed at this file
  - helper extraction modules already existed in the working tree, so continuing the backend seam was the least-risk way to turn partial modularization into a validated slice

## Rejected candidates

- `packages/web/src/components/chat/chat-sidebar.tsx`
  - rejected for this run because the skill allows exactly one original source file per run
- `packages/jinn/src/sessions/registry.ts`
  - rejected because explicit target mode locked the run to `gateway/api.ts`
- Any `/api/sessions*` route-cluster extraction beyond the existing facade
  - rejected for this slice because route precedence and queue/dispatch side effects make that a higher-risk next seam than exact-match status/work routes

## Extraction map

- New module: `packages/jinn/src/gateway/api/routes/status.ts`
  - responsibility: handle the exact-match visibility routes
  - moved routes:
    - `GET /api/status`
    - `GET /api/instances`
    - `GET /api/work`
    - `GET /api/activity`
  - moved helper:
    - `checkInstanceHealth()`
- Original facade retained: `packages/jinn/src/gateway/api.ts`
  - still exports and owns `handleApiRequest`
  - still re-exports `ApiContext`, `matchRoute`, `resumePendingWebQueueItems`, config sanitization helpers, and connector reply helpers
  - now delegates the extracted exact-match routes through `handleStatusRoutes(...)`
- Related extracted-module fix: `packages/jinn/src/gateway/api/session-dispatch.ts`
  - tightened `Session` typing and preserved existing behavior

## Compatibility and facade decisions

- Preserved `handleApiRequest(req, res, context)` as the public entrypoint.
- Preserved `./api.js` compatibility re-exports used by `server.ts` and tests.
- Kept auth boundaries in `server.ts` unchanged.
- Hoisted only exact-match paths into the delegated route module; no parameterized or overlapping route precedence changed.

## Tests updated

- No test files were modified.
- Existing targeted tests were used because this slice was structural and behavior-preserving.

## Two-deep connection checks

- Direct callers/importers checked:
  - `packages/jinn/src/gateway/server.ts`
  - `packages/jinn/src/gateway/__tests__/work.test.ts`
  - `packages/jinn/src/gateway/__tests__/route-hardening.test.ts`
  - `packages/jinn/src/gateway/__tests__/approvals.test.ts`
  - `packages/jinn/src/sessions/__tests__/archives.test.ts`
  - `packages/web/src/lib/api.ts`
  - `packages/web/src/routes/settings/page.tsx`
  - `packages/web/src/components/pill-nav.tsx`
- Second-level workflows checked:
  - web settings status polling through `/api/status`
  - work overview normalization through `/api/work`
  - instances list fetch in the nav shell through `/api/instances`
  - recent activity feed consumer through `/api/activity`
- Static evidence:
  - exact route consumers found with `rg` across `packages/`
  - facade imports confirmed still flow through `./api.js`
  - `tsc --noEmit` provided import/type consistency across the touched graph

## Intermediary audits and dispositions

- `fixed`
  - missing local `ResWithEncoding` cast type after response-helper extraction
  - `Session | undefined` typing drift in `api.ts` message dispatch block
  - `Session` type import / narrowing drift in `api/session-dispatch.ts`
- `verified-not-a-defect`
  - early delegation of `/api/status`, `/api/instances`, `/api/work`, and `/api/activity` does not alter precedence because all four are exact-match paths with no overlapping parameter routes

## Validation commands and results

- `git -C /home/ericl/vscode_github_public/jinn diff --check`
  - passed
- `pnpm --filter jinn-cli exec tsc --noEmit`
  - initially failed on extraction-adjacent typing drift
  - passed after the in-scope typing fixes above
- `pnpm --filter jinn-cli exec vitest run src/gateway/__tests__/work.test.ts src/gateway/__tests__/route-hardening.test.ts src/gateway/__tests__/route-param-security.test.ts src/gateway/__tests__/approvals.test.ts src/sessions/__tests__/archives.test.ts`
  - passed, 5 files / 23 tests

## Docs and ledger updates

- Added this session log under `docs/logs/session/062026/`
- `docs/INDEX.md` is absent in this checkout, so there was no index file to update

## Final regression pass

- Re-checked the extracted diff for facade export continuity.
- Re-ran TypeScript and the targeted route/session tests after the typing fixes.
- Confirmed the new route module is imported only by `api.ts` and does not introduce an import cycle.

## Adversarial workflow and data-path walkthrough

- `/api/status`
  - still reads live sessions, connector health, and the model registry from the same sources
- `/api/instances`
  - still probes peer instances through `/api/health` only and does not mutate state
- `/api/work`
  - still derives work-state from session status, queue transport state, and pending approvals
- `/api/activity`
  - still derives events from session timestamps plus queue transport state
- No persistence, auth, queue ownership, or session mutation behavior was changed by the new route module

## Decisions and concise rationale

- Chose the exact-match visibility routes as the next seam because they meaningfully shrink `api.ts` while avoiding the higher-risk `/api/sessions*` precedence and side-effect surface.
- Kept `api.ts` as the facade so existing imports and tests remain stable.
- Fixed only extraction-adjacent typing drift needed to make the slice typecheck and validate.

## Skipped checks and why

- `pnpm test`
  - skipped because the touched seam is backend-local and the targeted suite already covered the moved routes plus nearby facade flows
- `pnpm build`
  - skipped for the same reason; no web or packaging paths changed
- manual browser/runtime verification
  - skipped to avoid disrupting any active local gateway state for a structural backend slice

## Residual risks

- No dedicated automated test currently covers `/api/activity` or `/api/instances`; this run relied on typecheck, static caller checks, and exact-match-path reasoning for those two routes.
- `packages/jinn/src/gateway/api.ts` remains well above the repo’s 600-line soft threshold; this slice only extracted one bounded route cluster.
- The next major reduction still sits in the higher-risk `/api/sessions*`, approvals, cron, org, and connector clusters.

## Recommended follow-up

- Next backend modularization slice: extract a second low-risk domain route module such as archives or approvals, still preserving `api.ts` as the compatibility facade.
- Defer the frontend `chat-sidebar.tsx` modularization to a separate one-original-source-file run.

## Final status

- `completed_with_partial_verification`
