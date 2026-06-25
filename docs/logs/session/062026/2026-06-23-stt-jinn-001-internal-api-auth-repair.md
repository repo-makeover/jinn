# STT-JINN-001 Internal API Auth Repair

Date: 2026-06-23T08:58:01-04:00
Actor: Codex
Task: Repair STT-JINN-001, where server-owned workflows re-entered authenticated `/api/**` routes without credentials.

## Scope

- Selected finding: STT-JINN-001 only.
- Primary source touched:
  - `packages/jinn/src/gateway/internal-auth.ts`
  - `packages/jinn/src/talk/routes.ts`
  - `packages/jinn/src/sessions/callbacks.ts`
  - `packages/jinn/src/connectors/discord/remote.ts`
  - `packages/jinn/src/connectors/discord/index.ts`
  - `packages/jinn/src/gateway/files.ts`
  - `packages/jinn/src/gateway/server.ts`
  - `packages/jinn/src/shared/types.ts`
- Tests touched:
  - `packages/jinn/src/talk/__tests__/routes-auth.test.ts`
  - `packages/jinn/src/sessions/__tests__/callbacks.test.ts`
  - `packages/jinn/src/connectors/discord/__tests__/remote-auth.test.ts`
- Docs touched:
  - `README.md`
- Out of scope:
  - Replacing HTTP re-entry with in-process service calls.
  - Reworking the full API auth model.
  - Fixing unrelated full-suite engine/hook instability from prior validation.

## Startup Evidence

- Repo instructions: `AGENTS.md` was already loaded in the active session and remains the repo-wide contract.
- Finding evidence checked in `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`.
- Gateway auth boundary checked in `packages/jinn/src/gateway/server.ts` and `packages/jinn/src/gateway/auth.ts`.
- `dory session status` still reports an unrelated active recoverable Dory session for "Implement Kiro headless engine with estimated credit gauge"; this repair did not mutate that session.
- `.giles/` was not present.

## Patch Summary

- Added `packages/jinn/src/gateway/internal-auth.ts`:
  - Builds `X-Jinn-Token` headers from `ApiContext.apiToken` or `gateway.json`.
  - Provides JSON API headers for server-owned fetches.
  - Converts non-OK fetch responses into visible errors with status/body preview.
- Updated talk delegation internal HTTP calls to attach auth and surface non-OK responses.
- Updated parent callbacks and hardcoded notification sends to attach local gateway auth and log non-OK responses.
- Updated remote Discord proxy calls to attach configured target-gateway tokens and log non-OK responses.
- Updated Discord channel routing to allow object-form remote routes with per-route tokens.
- Updated remote file transfer to attach `remotes.<name>.token` when sending to a configured gateway.
- Documented remote-token config fields in `README.md`.

## Regression Coverage

- `routes-auth.test.ts` proves `/api/talk/delegate` internal `/api/sessions` calls include `X-Jinn-Token`.
- `callbacks.test.ts` now proves parent notifications include the gateway token and a 401 is logged rather than silently accepted.
- `remote-auth.test.ts` proves remote Discord proxy calls include the configured target token and log 401 responses.

## Validation

Passed:

- `pnpm --filter jinn-cli test -- src/talk/__tests__/routes-auth.test.ts src/sessions/__tests__/callbacks.test.ts src/connectors/discord/__tests__/remote-auth.test.ts src/gateway/__tests__/auth.test.ts src/gateway/__tests__/files-security.test.ts`
- `pnpm --filter jinn-cli test -- src/talk/__tests__/delegate.test.ts src/talk/__tests__/routes-auth.test.ts src/sessions/__tests__/callbacks.test.ts src/connectors/discord/__tests__/remote-auth.test.ts src/connectors/discord/index.ts src/gateway/__tests__/files-security.test.ts`
- `pnpm --filter jinn-cli typecheck`
- `pnpm typecheck`
- `pnpm lint`
  - Completed with Turbo warning: no lint tasks were executed.
- `git diff --check`

Not run:

- Full `pnpm test` was not rerun in this repair turn. The immediately preceding repair validation exposed unrelated full-suite instability in Codex/Grok/hook tests; this repair used targeted affected-area tests plus root typecheck.

## File Size / Modularity

- New helper file: 51 lines.
- New talk route test: 129 lines.
- New remote Discord test: 49 lines.
- Touched files already over 600 lines:
  - `packages/jinn/src/gateway/files.ts`: 1049 lines.
  - `packages/jinn/src/shared/types.ts`: 818 lines.
  - `packages/jinn/src/gateway/server.ts`: 1248 lines.
  - `packages/jinn/src/sessions/__tests__/callbacks.test.ts`: 604 lines.
- Touched files likely to remain over 1000 lines without future extraction:
  - `packages/jinn/src/gateway/files.ts`
  - `packages/jinn/src/gateway/server.ts`
- Modularity improved slightly by centralizing internal API auth header/error handling in a small helper.

## Repository State

- Unrelated existing worktree change observed and left untouched:
  - `packages/web/src/routes/globals.css`

## Residual Risks

- Local server-owned re-entry now authenticates through the gateway token, but these paths still use HTTP rather than in-process services.
- Remote gateway calls require the target gateway token to be configured; without it, auth failures are now visible but cannot succeed.
- Remote file transfer raw URL destinations only receive a token when the URL matches a configured `remotes.*` entry with `token`.

## Recommended Next Batch

- Replace parent/talk HTTP re-entry with in-process service calls if a future reliability pass wants to remove loopback HTTP from state transitions entirely.
- Investigate existing full-suite instability before treating `pnpm test` as a reliable release gate again.
