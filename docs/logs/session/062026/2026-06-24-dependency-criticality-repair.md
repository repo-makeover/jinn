# Dependency Criticality Repair Session

- Date: 2026-06-24
- Actor: Codex
- Scope: Repair selected dependency-criticality and architecture-seam findings from the pasted audits.
- Giles: Waived by operator for the full session.
- Dory: Existing unrelated stale/closed active session observed; no new Dory session was started to avoid hijacking it.

## Changes

- Allowed `hermes` in config validation and fallback typing.
- Made gateway status fail visible on config load errors instead of falling back to port `7777`.
- Added SQLite busy timeout to sessions and orchestration databases.
- Moved approvals persistence into `registry.db` with legacy JSON import, removing stale in-memory JSON writes.
- Added Kiro auth preflight that fails fast on explicit auth errors while preserving local auth setups.
- Moved connector instance handshakes to background start promises.
- Added observable connector reply failure events and bounded retry.
- Lazy-loaded `node-pty` through `pty-stream.spawnPty()` so importing gateway/engine modules no longer evaluates the native binding.
- Split Claude transcript helpers into a PTY-free `claude-transcript.ts` module.
- Moved budget monthly spend SQL behind a sessions registry function.
- Changed missing orchestration resume handler behavior to leave continuations queued instead of marking them failed.

## Validation

- `pnpm --filter jinn-cli typecheck`
- `pnpm --filter jinn-cli test`

Result: passed, 170 test files, 1331 passed, 1 skipped.

## Residual Risks

- `gateway/api.ts` remains oversized and compatibility re-exports remain; the API route extraction / facade cleanup from the architecture audit was deferred.
- `orchestration/run-mode.ts` still imports gateway dispatch/context surfaces; the deeper orchestration-owned dispatch context should be handled as a separate structural patch.
- Large existing files remain over the 600-line review threshold: `gateway/server.ts`, `sessions/registry.ts`, and `engines/claude-interactive.ts`.
