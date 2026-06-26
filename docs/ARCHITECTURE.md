# Architecture

## Architecture Summary

Jinn is a pnpm/Turborepo TypeScript monorepo with two primary packages:

- `packages/jinn`: CLI, gateway daemon, engine adapters, connectors, session registry, orchestration runtime, and static web serving.
- `packages/web`: Vite/React dashboard served by the daemon after build.

The intended architecture is "a bus, not a brain": Jinn coordinates external AI
coding CLIs and adds routing, scheduling, connectors, persistence, and UI without
owning model reasoning.

## Component Map

- CLI entrypoint: `packages/jinn/bin/jinn.ts`
- Gateway lifecycle/server: `packages/jinn/src/gateway/`
- API router: `packages/jinn/src/gateway/api.ts`
- Engine adapters: `packages/jinn/src/engines/`
- Sessions and persistence: `packages/jinn/src/sessions/`
- Orchestration: `packages/jinn/src/orchestration/`
- Connectors: `packages/jinn/src/connectors/`
- Web dashboard: `packages/web/src/`
- Operator docs/governance: `docs/`, `AGENTS.md`, `governance/`, `schemas/`

## Data / Persistence Map

- Instance home: `~/.jinn` by default, or `~/.<instance>` when using `jinn -i`.
- Config/org/skills/templates: initialized and migrated from package templates.
- Sessions/messages/files/artifacts/queue/archive/approval state: SQLite-backed registry modules.
- Uploaded and attached artifacts: managed gateway storage with façade seam tests,
  SHA256 metadata, source/run annotations, validation helpers, and run-bundle
  manifest export.
- Orchestration telemetry/recovery/worktrees: managed under Jinn runtime paths and bounded retention policies.

## Workflows

### Local operator flow

1. Install `jinn-cli`.
2. Sign in to at least one engine CLI.
3. Run `jinn setup`.
4. Run `jinn start`.
5. Use the dashboard at the configured gateway host/port.

### Web/API flow

1. Browser loads the Vite/React dashboard served by the gateway.
2. UI calls `/api/*` routes through `handleApiRequest()`.
3. The API router delegates to route-family modules.
4. Route handlers call sessions, engines, connectors, files, or orchestration services.
5. Events stream back to the UI through gateway WebSocket/session channels.

### Engine turn flow

1. A session selects an engine/model/effort.
2. Gateway builds prompt/context and attachments.
3. Engine adapter invokes the external CLI.
4. Stream deltas are normalized and persisted.
5. Final message, blocks, media, cost/context, and metadata update the session.

## Dependency Boundaries

- Web UI should call API/client libraries, not persistence internals.
- Gateway route modules should route/validate/translate, not own business logic.
- Session registry modules own persistence semantics.
- Engine adapters own CLI invocation and stream normalization.
- Orchestration runtime owns leases, continuations, holds, worktrees, and telemetry.
- Local generated artifacts stay outside the tracked source tree.

## Extension Points

- Add engines through `packages/jinn/src/engines/` and model registry/config support.
- Add connectors under `packages/jinn/src/connectors/`.
- Add dashboard routes in `packages/web/src/main.tsx` and route modules.
- Add orchestration controls through `orchestration-routes.ts`, web API helpers, and contract tests.
- Add artifact workflows through `api/routes/artifacts.ts` while keeping file
  persistence semantics in `sessions/registry/files.ts`.
- Add skills through the `jinn skills` CLI and instance `skills.json`.

## Known Architecture Risks

- Historical docs still contain old Next.js assumptions and are explicitly historical.
- Orchestration is broad and should keep façade/contract tests around routing seams.
- Public tooling directories need a policy decision before further public hardening.
- React test warnings indicate UI test hygiene work remains.

## Diagrams

See `docs/IMPLEMENTATION_DIAGRAMS.md`.

## Decision Records

See `docs/DECISION_LOG.md`.
