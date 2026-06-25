# Config Schema Tightening And Settings Reshape

Date: 2026-06-23T09:56:00-04:00
Agent/model: Codex / GPT-5
Repo/branch/commit before patch: `/home/ericl/vscode_github_public/jinn` / `main` / `618a4cb`
Input findings source: follow-up to `CFG-JINN-008` residual risk plus explicit user request to implement broader config schema tightening / unknown-key policy, then reshape the Settings UI

## Selected Patch Batch

- Item ID / title: `CFG-JINN-008 follow-up` / shared config schema tightening and Settings UI reshape
- Priority: `P1`
- Eligible domain: `backend`, `reliability`, `config/state mutation`
- Why selected:
  - `validateConfigShape` still allowed broad drift outside a small hand-written subset.
  - the Settings page still edited config through a stale, loose object contract.
  - the user explicitly reopened both the backend boundary and the UI follow-up in one request.
- Why no high-priority items were deferred:
  - this run stayed on the reopened config/settings seam only.

## Files Changed

- `packages/jinn/src/shared/config-schema.ts`
- `packages/jinn/src/shared/config.ts`
- `packages/jinn/src/shared/types.ts`
- `packages/jinn/src/shared/__tests__/config.test.ts`
- `packages/jinn/src/gateway/__tests__/config-put-roundtrip.test.ts`
- `packages/web/src/routes/settings/page.tsx`
- `packages/web/src/routes/settings/settings-constants.ts`
- `packages/web/src/routes/settings/settings-config.ts`
- `packages/web/src/routes/settings/settings-config.test.ts`
- `packages/web/src/routes/settings/settings-fields.tsx`

## Patch Summary

- Extracted shared config validation into `config-schema.ts` and made the validator enforce a broader unknown-key policy across:
  - top-level config sections;
  - workspaces;
  - gateway;
  - engines/models;
  - connectors and connector instances;
  - MCP config (including `mcp.gateway.enabled`);
  - model fallback;
  - sessions;
  - board worker;
  - cron, notifications, portal, context, STT, talk, and remotes.
- Kept `/api/config` aligned with the same shared validator by leaving the write path on `validateConfigShape`.
- Reshaped Settings to expose the newly governed surfaces directly:
  - `Gateway & Workspaces`
  - turn-stall watchdog fields
  - `Recovery & Fallbacks`
  - global fallback chain editing
  - `Board Worker`
- Added web-side helpers for line-based workspace roots and pipe-delimited fallback-chain editing.

## Tests / Checks Run

Backend/shared:

- `pnpm --filter jinn-cli test -- src/shared/__tests__/config.test.ts src/gateway/__tests__/config-put-roundtrip.test.ts src/gateway/__tests__/config-redaction-security.test.ts`
  - result: passed (`3 files / 22 tests`)
- `pnpm --filter jinn-cli typecheck`
  - result: passed

Web/unit:

- `pnpm --filter @jinn/web test -- src/routes/settings/settings-config.test.ts`
  - result: passed (`1 file / 2 tests`)
- `pnpm --filter @jinn/web typecheck`
  - result: passed

Rendered UI validation:

- Browser availability classification: Browser plugin absent in this session
- Fallback path: regular Playwright-style validation through `@playwright/test` APIs with system Chrome at `/usr/bin/google-chrome`
- Local app: `pnpm --filter @jinn/web dev`
- URL: `http://localhost:5173/settings`
- Mocked auth/config endpoints used to isolate the Settings flow
- Interaction validated:
  - load `/settings`
  - edit workspace roots/default cwd
  - switch fallback mode
  - edit fallback chain
  - edit board-worker timezone/idle minutes
  - save config
- Evidence:
  - screenshot: `/tmp/jinn-settings-full.png`
  - screenshot: `/tmp/jinn-settings-after.png`
  - captured PUT body confirmed the reshaped sections wrote `workspaces`, `modelFallback`, and `boardWorker` back through `/api/config`

## Rendered Validation Notes

- The Settings page rendered the new labeled sections in DOM text:
  - `GATEWAY & WORKSPACES`
  - `RECOVERY & FALLBACKS`
  - `BOARD WORKER`
- The save interaction succeeded and emitted one `PUT /api/config` request containing the edited workspace, fallback, and board-worker payloads.
- Standalone Vite validation still showed background websocket/auth noise from app-wide providers that were not fully mocked:
  - `/ws` connection failures
  - some 401s on unrelated provider fetches
- Those errors did not block the Settings form render or save path under test.

## Regression Risks Considered

- Existing real-world configs with previously tolerated unknown keys will now be rejected once they pass through the shared validator.
- `mcp.gateway.enabled` was explicitly allowed in the validator/types because setup/template comments already advertise that key.
- The Settings page still saves the config object wholesale, but it now exposes the reopened config surfaces directly instead of leaving them as hidden round-trip state.

## Dory / Giles

- Dory status checked with `dory session status`.
- Dory still reported the unrelated recoverable active Kiro session; this work did not mutate that session.
- `.giles/` remains absent in this checkout.

## Residual Risks

- `packages/jinn/src/shared/config-schema.ts` is 814 lines and `packages/jinn/src/shared/types.ts` is 821 lines; both exceed the repo’s 600-line soft threshold.
- `packages/web/src/routes/settings/page.tsx` remains very large at 1446 lines even after helper extraction.
- The rendered UI validation used a mocked standalone frontend harness, not a live gateway daemon with fully healthy websocket/auth providers.
- Full monorepo `pnpm test`, `pnpm lint`, and `pnpm build` were not run in this patch.

## Follow-Up Items

- Split `settings/page.tsx` into section components if more Settings work lands.
- If stricter migration UX is desired, add an operator-facing error summary for legacy/unknown config keys before save or load failure.
- If the MCP gateway toggle is meant to be live behavior rather than just a tolerated config key, wire it through the runtime MCP resolver explicitly.

## Final Status

- `completed_verified`
