# CFG-JINN-008 Config API Round-Trip Repair

Date: 2026-06-23T09:36:00-04:00
Agent/model: Codex / GPT-5
Repo/branch/commit before patch: `/home/ericl/vscode_github_public/jinn` / `main` / `e98ada9`
Input findings source: `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`

## Selected Patch Batch

- Item ID / title: `CFG-JINN-008` / Config API allow-list is stale relative to live `JinnConfig`
- Priority: `P1`
- Eligible domain: `backend`, `reliability`, `config/state mutation`
- Why selected:
  - `PUT /api/config` rejected fields that runtime config loading already accepts.
  - `GET /api/config` returns normalized `boardWorker`, so a settings save could fail on an unchanged payload.
- Why no high-priority items were deferred:
  - This run was explicitly scoped to the named defect only.

## Files Changed

- `packages/jinn/src/gateway/api.ts`
- `packages/jinn/src/gateway/__tests__/config-put-roundtrip.test.ts`

## Patch Summary

- Removed the controller-local `/api/config` allow-lists and redundant type gate so the write path now defers to `validateConfigShape`, the same shared validator used by runtime config loading.
- Added a regression test that:
  - loads a config containing `workspaces`, `modelFallback`, gateway turn-stall keys, and `boardWorker`;
  - fetches it through `GET /api/config`;
  - sends that sanitized payload back through `PUT /api/config` unchanged;
  - verifies the write succeeds and redacted secrets remain preserved on disk.

## Tests / Checks Run

- `pnpm --filter jinn-cli test -- src/gateway/__tests__/config-put-roundtrip.test.ts src/gateway/__tests__/config-redaction-security.test.ts src/shared/__tests__/config.test.ts`
  - result: passed
- `pnpm --filter jinn-cli typecheck`
  - result: passed

## Regression Risks Considered

- `/api/config` request validation behavior changed from a controller-local subset to the shared runtime validator.
- Secret round-trip handling remained intact because the existing `deepMerge()` redaction-preservation path was kept unchanged and was asserted in the new regression.
- No config schema, persistence format, or settings UI code changed.

## Dory / Giles

- Dory status checked with `dory session status`.
- Dory reported an unrelated recoverable active session (`04e81f7b-1151-44c2-855e-3c2d5b3c403a`) for Kiro work, so this repair did not start or mutate a new Dory session to avoid clobbering that continuity trail.
- `.giles/` is absent in this checkout.

## Residual Risks

- `validateConfigShape` still does not enforce a strict top-level unknown-key policy; this repair intentionally aligned `/api/config` with the runtime loader instead of introducing a new schema boundary.
- `packages/jinn/src/gateway/api.ts` was already over the repo’s 600-line soft threshold before this repair and remains so.

## Follow-Up Items

- If stricter config-key enforcement is desired later, it should be implemented once in the shared config validator or a shared schema surface, not reintroduced as a route-local allow-list.

## Final Status

- `completed_verified`
