# Usage-Limit Cross-Engine Repair

- Actor: Giles Watcher
- Date: 2026-06-22
- Authority: user-requested scoped repair under repo `AGENTS.md`
- Dory session: `04e81f7b-1151-44c2-855e-3c2d5b3c403a`

## Intent

Repair the shared usage/rate-limit fallback path so it is not hardcoded to the
Claude-to-Codex case only. Keep the change limited to the orchestration/types
seam and focused tests.

## Files touched

- `packages/jinn/src/sessions/rate-limit-handler.ts`
- `packages/jinn/src/sessions/manager.ts`
- `packages/jinn/src/gateway/run-web-session.ts`
- `packages/jinn/src/shared/types.ts`
- `packages/web/src/routes/settings/settings-constants.ts`
- `packages/jinn/src/sessions/__tests__/rate-limit-fallback-guard.test.ts`

## Validation

- `packages/jinn/node_modules/.bin/vitest run packages/jinn/src/sessions/__tests__/rate-limit-fallback-guard.test.ts`
- `npx -p node@24.13.0 -c 'cd packages/jinn && ../../node_modules/.bin/tsc --noEmit'`

## Residual risks

- The repair generalizes fallback orchestration and transport messaging, but it
  does not widen engine-specific live limit collectors.
- The fallback path still prefers the fallback engine's configured default model;
  broader cross-engine model-selection semantics were left unchanged.
