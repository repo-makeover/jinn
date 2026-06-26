# User Manual

## What Jinn Does

Jinn is a local gateway daemon and web dashboard for coordinating professional AI
coding CLIs. It runs external engines such as Claude Code, Codex, Grok,
Antigravity, Pi, Hermes, and Kiro through a shared org/delegation model.

## Who It Is For

- Operators who already use coding-agent CLIs and want one local dashboard.
- Teams experimenting with AI "employees", departments, cron jobs, connectors,
  and controlled delegation.
- Developers who want local orchestration without replacing official engine CLIs.

## Core Concepts

- **Gateway daemon:** local Node process that serves the API and dashboard.
- **Engine:** external CLI Jinn invokes for model work.
- **Employee:** configured persona/role with an engine/model/department.
- **Session:** persisted conversation or work run.
- **Connector:** Slack/Discord/Telegram/WhatsApp-style integration.
- **Skill:** reusable Markdown playbook synced into agent workflows.
- **Orchestration:** scheduler/runtime for multi-role tasks, leases,
  continuations, holds, worktrees, and dual-lane operations.

## Installation And Setup

1. Install Node.js 24.x. This repo pins Node 24.13.0 via `.nvmrc` and root tooling enforces `>=24 <25`.
2. Install and sign in to at least one engine CLI.
3. Install Jinn:

```bash
npm install -g jinn-cli
```

4. Initialize the local Jinn home:

```bash
jinn setup
```

5. Start the gateway:

```bash
jinn start
```

By default, the dashboard is served by the gateway at `http://localhost:7777`
unless the configured gateway port differs.

## Common Workflows

### Start And Stop

```bash
jinn start
jinn status
jinn stop
jinn restart
```

### Pair Another Browser

```bash
jinn pair
jinn unpair --json
```

### Manage Instances

```bash
jinn create my-instance
jinn list
jinn -i my-instance start
jinn remove my-instance
```

`jinn nuke` permanently deletes an instance and its data; use it only when you
intend irreversible cleanup.

### Manage Skills

```bash
jinn skills find testing
jinn skills add <package>
jinn skills list
jinn skills update
```

### Use The Dashboard

Routes are defined in `packages/web/src/main.tsx`:

- `/`: primary chat workspace
- `/talk`: multi-agent talk sessions
- `/kanban`: department boards and ticket dispatch
- `/orchestration`: orchestration operations
- `/cron`: scheduled jobs
- `/logs`: runtime log inspection
- `/limits`: usage/rate-limit visibility
- `/org`: organization and employee configuration
- `/settings`: gateway/engine/connector settings
- `/skills`: local skill browsing and management
- `/file`: file viewer

## Configuration

Jinn reads instance configuration from the active Jinn home, normally `~/.jinn`.
Engine CLIs keep their own authentication state. Jinn does not replace engine
sign-in flows; run each engine once and authenticate before routing work to it.

## Persistence And Files

- Sessions, messages, registry data, queue state, files, archives, approvals, and
  orchestration state are persisted in the active Jinn home.
- Uploaded files are managed by the gateway files API and protected by managed
  storage/read policies.
- Local audit/session/Giles/runtime artifacts in the source checkout are not part
  of runtime persistence and are ignored by Git.

## Error Handling And Recovery

- `jinn status` reports daemon state and useful gateway details.
- Rate-limit and engine-unavailable paths are handled through session metadata and
  configured fallback behavior where supported.
- Orchestration recovery manifests are operator-reviewed; recovery requeue leaves
  work paused until explicitly resumed.
- File reads and downloads are constrained to allowed roots and managed paths.

## Troubleshooting

| Symptom | Likely Cause | Next Step |
|---|---|---|
| Engine not available | CLI missing or not signed in | Run the engine binary directly and authenticate. |
| Dashboard unreachable | Gateway not running or different port | Run `jinn status`; check `gateway.port`. |
| Claude sessions cannot reach models | Claude CLI not logged in | Run `claude`, use `/login`, then restart Jinn. |
| Hermes hidden or failing | `hermes` not on `PATH` or provider credentials missing | See `docs/engines-hermes.md`. |
| Orchestration controls disabled | Runtime disabled or unavailable | Check `orchestration.enabled` and `/orchestration` status. |

## Known Limitations

- Hermes is metered by its configured provider, unlike subscription-wrapped engines.
- Kiro credit usage is an estimate; see `docs/known-diagnostics.md`.
- Historical plan/spec docs may describe earlier intended designs and should not
  override current source, tests, README, or feature inventory.
- E2E Playwright tests were not run in the 2026-06-25 documentation stewardship pass.

## See Also

- `docs/ARCHITECTURE.md`
- `docs/SPECIFICATION.md`
- `docs/IMPLEMENTATION_DIAGRAMS.md`
- `docs/TEST_LEDGER.md`
- `docs/TODO_LEDGER.md`
- `docs/feature_inventory.md`
