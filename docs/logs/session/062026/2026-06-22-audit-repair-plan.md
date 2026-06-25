# 2026-06-22 audit repair plan implementation

- Actor: Codex
- Dory session: `669a00b9-763b-488b-a6d1-b0b9bdaa3182`
- Intent: implement the audit repair plan covering gateway auth, file-read boundaries, PTY websocket gating, hook replay protection, cron lifecycle truth/overlap/validation, board merge semantics, transport metadata patching, status/config truth, UI failure reporting, viewport accessibility, and supply-chain pinning.

## Changes

- Added token auth for `/api/**` and `/ws`, public `/api/auth/*` login/status/logout, HttpOnly cookie login, Bearer and `X-Jinn-Token` API access, and short-lived PTY websocket tokens.
- Persisted `apiToken` in `~/.jinn/gateway.json`; hook relay now sends nonce/timestamp replay fields.
- Restricted `/api/files/read` to configured roots by default with explicit unsafe escape hatches.
- Added cron job create/update validation, run lifecycle records, run-log retention, in-flight overlap handling, disabled manual-trigger rejection, and UI polling.
- Added board service merge semantics with session ticket preservation and explicit deletes; Kanban now displays blocked tickets, refetches on board updates, and surfaces save failures.
- Added transactional `patchSessionTransportMeta` and routed transport metadata writers through it.
- Made `/api/status` derive `ok/degraded/error` from real checks; tightened config validation.
- Updated queue clear/stop UI to report failure/partial states; removed mobile viewport zoom lock.
- SHA-pinned GitHub Actions, added Dependabot for action updates, and pinned the external `skills` npx spec to `skills@1.5.12`.
- Updated README for gateway auth and file-read config.

## Validation

- `pnpm --filter jinn-cli exec vitest run src/gateway/__tests__/auth.test.ts src/gateway/__tests__/hook-endpoint.test.ts src/gateway/__tests__/file-read.test.ts src/gateway/__tests__/board-service.test.ts src/gateway/__tests__/board-sync.test.ts src/gateway/__tests__/route-hardening.test.ts src/cron/__tests__/jobs.test.ts src/cron/__tests__/validation.test.ts src/cron/__tests__/scheduler.test.ts src/cron/__tests__/runner.test.ts src/sessions/__tests__/transport-meta-patch.test.ts src/shared/__tests__/config.test.ts src/cli/__tests__/skills-shell-security.test.ts` — passed, 13 files / 75 tests.
- `pnpm typecheck` — passed.
- First `pnpm test` — failed after the new registry mock export was missing in `rate-limit-fallback-guard.test.ts`; the same run also reported a transient Vitest worker/glibc failure after the failed test.
- `pnpm --filter jinn-cli exec vitest run src/sessions/__tests__/rate-limit-fallback-guard.test.ts` — passed after updating the mock, 1 file / 3 tests.
- Second `pnpm test` — passed, web 54 files / 607 tests and jinn 127 files / 1071 passed / 1 skipped.
- `pnpm build` — passed.
- `pnpm lint` — completed, but Turbo reported no lint tasks configured.

## Residual risk

- Several touched files remain over the repo's 600-line soft threshold, especially `packages/jinn/src/gateway/api.ts`, `packages/jinn/src/gateway/server.ts`, `packages/jinn/src/sessions/registry.ts`, `packages/jinn/src/gateway/files.ts`, `packages/jinn/src/gateway/run-web-session.ts`, `packages/jinn/src/shared/types.ts`, `packages/web/src/lib/api.ts`, and `packages/web/src/routes/cron/page.tsx`. The patch added focused helper modules where practical but did not attempt broad modularization.
- Runtime browser/manual verification was not performed in this session; validation is automated test/type/build based.
- `docs/INDEX.md`, `docs/feature_inventory.md`, and expected `control/*.yaml` / `governance/*.yaml` files were absent in this checkout, so they could not be updated or checked beyond confirming absence.
