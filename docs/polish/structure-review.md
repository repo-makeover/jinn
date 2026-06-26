# Structure Review

## Current Structure

- `packages/jinn`: gateway daemon, CLI, runtime orchestration, sessions, connectors, and templates.
- `packages/web`: Vite/React dashboard.
- `docs`: operator-facing docs, plans/specs, orchestration examples, and governance/polish records.
- `governance` and `schemas`: repo governance configuration and schema surfaces.
- `scripts` and `e2e`: repo-level operational helpers and Playwright tests.
- Local/generated artifacts are expected to be ignored rather than published.

## Issues Found

- `.playwright-mcp/` contained tracked browser automation logs and page snapshots. These are local generated artifacts and add noise to the public repository.
- `packages/jinn/dist/`, `packages/web/out/`, `.giles/`, local logs, audit logs, and state artifacts are present on disk but ignored or untracked as intended.

## Changes Applied

- Added `.playwright-mcp/` to `.gitignore`.
- Removed tracked `.playwright-mcp/` files from the Git index without deleting local files.

## Deferred Recommendations

- Consider a future, dedicated report-only pass for whether `.claude/`, `.agents/`, and `.fissure/` should remain public tooling surfaces or move to a documented local-artifact model.
- Consider a future docs archival pass for old planning/spec docs if public repo noise becomes a concern.

## Public Path Risks

- No public import paths, CLI commands, package exports, HTTP routes, config keys, or database migrations changed.

