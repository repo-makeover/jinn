# 🧞 Jinn

Lightweight AI gateway daemon orchestrating Claude Code, Codex, Antigravity, Grok, and Pi.

<p align="center">
  <img src="assets/jinn-showcase.gif" alt="Jinn Web Dashboard" width="800" />
</p>

> [!NOTE]
> **This is a fork that underwent a significant rewrite.** It was forked from the
> upstream project **[hristo2612/jinn](https://github.com/hristo2612/jinn)** and then
> heavily reworked before being opened up. For the original, unmodified project,
> see that upstream repository.
>
> **What changed in this fork:**

> - Reworked the agent/governance docs (`AGENTS.md`, `governance/`, `control/`) to
>   drop those tool dependencies while keeping the governance framework.
> - Moved activity logs, audits, and session logs out of version control (now
>   `.gitignore`d as local-only artifacts).
>

## What is Jinn?

Jinn is an open-source AI gateway that wraps professional AI coding CLIs (Claude
Code, Codex, Antigravity, Grok, and Pi) behind a unified daemon process. It routes
tasks to AI engines, manages connectors like Slack, and schedules background work
via cron. Jinn is a bus, not a brain.

## 💡 Why Jinn?

Most AI agent frameworks reinvent the wheel: custom tool-calling loops, brittle
context management, hand-rolled retry logic. Then they charge you per API call on
top.

**Jinn takes a different approach.** It wraps battle-tested professional CLI tools
(Claude Code, Codex, Antigravity, Grok, Pi) and adds only what they're missing:
routing, scheduling, connectors, and an org system.

### 🔑 Works with your Anthropic Max subscription

Because Jinn uses **Claude Code CLI under the hood** (Anthropic's own first-party
tool) it works with the [$200/mo Max subscription](https://www.anthropic.com/pricing).
No per-token API billing. No surprise $500 invoices. Flat rate, unlimited usage.

Other frameworks can't do this. Anthropic [banned third-party tools from using Max subscription OAuth tokens](https://docs.anthropic.com/en/docs/claude-code/bedrock-vertex#max-plan)
in January 2026. Since Jinn delegates to the official CLI, it's fully supported.

And starting **June 15, 2026**, Anthropic stops subsidizing `claude -p` (headless
one-shot mode) under the Max subscription: only the interactive TUI keeps billing
as `cc_entrypoint=cli`. Most wrappers will silently start hitting your API credit
pool. Jinn has already moved every Claude turn off `-p` and onto the real
interactive TUI driven inside a PTY (see [How the Claude engine works](#-how-the-claude-engine-works-under-the-hood)
below). Your subscription keeps working.

### 🧞 Jinn vs OpenClaw

| | Jinn | OpenClaw |
|---|---|---|
| **Architecture** | Wraps professional CLIs (Claude Code, Codex, Antigravity) | Custom agentic loop |
| **Max subscription** | ✅ Works (uses official Claude Code CLI) | ❌ Banned since Jan 2026 |
| **Typical cost** | $200/mo flat (Max) or pay-per-use | $300–750/mo API bills ([reported by users](https://www.reddit.com/r/OpenClaw/)) |
| **Security** | Inherits Claude Code's security model | 512 vulnerabilities found by CrowdStrike |
| **Memory & context** | Handled natively by Claude Code | Custom implementation with [known context-drop bugs](https://github.com/openclaw/openclaw/issues/5429) |
| **Cron scheduling** | ✅ Built-in, hot-reloadable | ❌ [Fires in wrong agent context](https://github.com/openclaw/openclaw/issues/16053) |
| **Slack integration** | ✅ Thread-aware, reaction workflow | ❌ [Drops agent-to-agent messages](https://github.com/openclaw/openclaw/issues/15836) |
| **Multi-agent org** | Departments, ranks, managers, boards | Flat agent list |
| **Self-modification** | Agents can edit their own config at runtime | Limited |

### 🧠 The "bus, not brain" philosophy

Jinn adds **zero custom AI logic**. No prompt engineering layer. No opinions on how
agents should think. All intelligence comes from the engines themselves: Claude
Code already handles tool use, file editing, multi-step reasoning, and memory. Jinn
just connects it to the outside world.

When Claude Code gets better, Jinn gets better, automatically.

## ✨ Features

- 🔌 **Multi-engine support**: Claude Code, Codex, Antigravity, Grok, and Pi
- 🎛️ **Per-session engine, model, and effort**: pick the engine, model, and reasoning effort per session, switchable mid-chat
- 🗂️ **Model registry**: a single `models:` config block is the source of truth for the UI selectors (model id, label, effort levels, context window) — add a model with no code change
- 🪜 **Policy-driven model fallback**: configurable fallback/escalation chains auto-failover to another model or engine when the primary is rate-limited or unavailable
- ✅ **Approval queue**: when a fallback needs sign-off, it surfaces in an Approvals queue — approve to resume on the fallback engine, reject to stop it (never a silent stall)
- 📊 **Unified work visibility**: every session normalizes to one work-state (queued / running / needs-human / blocked / done / failed); a live `/api/work` + org summary strip show what's in flight
- 📂 **Per-chat working folder**: pick the directory a new chat's engine runs in (defaults to `~/.jinn`); browse + recent folders in the composer
- 🔒 **Write integrity**: atomic, fsync-durable state writes with a tamper-evident hash-chained `audit.jsonl` ledger
- 💬 **Connectors**: Slack (threads + reactions), WhatsApp (QR auth), Discord (bot), Telegram (polling + allowlist)
- 🎙️ **Voice**: speech-to-text input and Kokoro text-to-speech output over the `/talk/*` routes
- 📎 **File attachments**: drag & drop files and images into web chat (inbound and outbound), passed through to engines
- 🖼️ **In-app file viewer**: click any file path in chat to open it in a built-in viewer tab
- 🏬 **Department project-rooms**: the chat sidebar groups sessions into collapsible department rooms with a merged read-only multi-agent timeline and a Managers quick-access section
- 🗄️ **Previous Projects archive**: snapshot rooms, individual chats, or past scheduled run sessions into dated read-only records and remove them from the active sidebar without disabling cron jobs
- 📊 **Live context meter**: watch token usage per turn in real time
- 📱 **Mobile-responsive**: collapsible sidebar and mobile-friendly dashboard
- ⏰ **Cron scheduling**: hot-reloadable background jobs
- 👥 **AI org system**: departments, ranks, managers, employees, task boards
- 🌐 **Web dashboard**: chat, org map, kanban, cost tracking, cron visualizer
- 🔄 **Hot-reload**: change config, cron, or org files without restarting
- 🛠️ **Self-modification**: agents can edit their own config, skills, and org at runtime
- 📦 **Skills system**: reusable markdown playbooks that engines follow natively
- 🏢 **Multi-instance**: run multiple isolated Jinn instances side by side
- 🔗 **MCP support**: connect to any MCP server

## 🚀 Quick Start

> **Prerequisites:** Node.js 24+ and at least one engine CLI on your `PATH` — Jinn
> orchestrates them and can't run a session without one:
> - [Claude Code](https://docs.anthropic.com/en/docs/claude-code): `npm install -g @anthropic-ai/claude-code`
> - [Codex](https://github.com/openai/codex) (optional): `npm install -g @openai/codex`
> - Grok, Antigravity, and Pi are also supported (optional) — install each vendor's
>   CLI and put it on your `PATH`; Jinn drives whichever engines are present.

```bash
npm install -g jinn-cli
jinn setup
jinn start
```

Or install via Homebrew:

```bash
brew tap hristo2612/jinn https://github.com/hristo2612/jinn
brew install jinn
jinn setup
jinn start
```

Then open [http://localhost:7777](http://localhost:7777).

> **Authenticate your engines first.** Jinn drives the official engine CLIs, so
> sign in to them once before `jinn start`: run `claude` and use `/login`, and
> run `codex` to sign in. (Antigravity, if you use it, signs in the same way via
> its own CLI.) Without this, sessions can't reach the models.

Everyday commands:

```bash
jinn start           # start the gateway daemon
jinn stop            # stop the gateway daemon
jinn restart         # restart safely (detached; works even from inside a session)
jinn status          # check whether the daemon is running
jinn startup enable  # auto-start this instance when your Linux user session starts
jinn limits          # show engine rate limits, quota windows, and model capabilities
jinn migrate         # apply pending config/template migrations to this instance
```

Manage skills and extra instances:

```bash
jinn skills find <query>   # search the skills.sh registry (also: add/remove/list/update/restore)
jinn create <name>         # create a new isolated instance (auto-assigns a port)
jinn list                  # list all instances
jinn remove <name>         # remove an instance from the registry (--force also deletes its home dir)
jinn nuke [name]           # permanently delete an instance and all its data
```

Need Jinn to come up automatically after login on Linux? Run `jinn startup enable`.
For non-default instances, use `jinn -i <name> startup enable`. If you want the
service to start even before you log in, enable lingering once with
`loginctl enable-linger $USER`.

## 🏗️ Architecture

```
                          +----------------+
                          |   jinn CLI     |
                          +-------+--------+
                                  |
                          +-------v--------+
                          |    Gateway     |
                          |    Daemon      |
                          +--+--+--+--+---+
                             |  |  |  |
              +--------------+  |  |  +--------------+
              |                 |  |                  |
      +-------v---------+ +-----v------+  +----------v----+
      |     Engines      | | Connectors |  |    Web UI     |
      | Claude|Codex|Agy | | Slack|WA|DC|  | localhost:7777|
      |   Grok|Pi        | |            |  |               |
      +------------------+ +------------+  +---------------+
              |                 |
      +-------v-------+ +------v------+
      |     Cron      | |    Org      |
      |   Scheduler   | |   System    |
      +---------------+ +-------------+
```

The CLI sends commands to the gateway daemon. The daemon dispatches work to AI
engines (Claude Code, Codex, Antigravity, Grok, Pi), manages connector
integrations, runs scheduled cron jobs, and serves the web dashboard.

## 🪄 How the Claude engine works under the hood

Anthropic stops subsidizing `claude -p` under the Max subscription on **June 15,
2026**: only the interactive TUI keeps billing as `cc_entrypoint=cli`. So Jinn
drives the real interactive `claude` binary, not the headless one-shot mode.

Every Claude turn (cron jobs, Slack messages, the web Chat view, the web CLI view)
flows through the same path:

- **Real TUI under PTY.** The interactive `claude` binary runs inside a [node-pty](https://github.com/microsoft/node-pty)
  pseudo-terminal, byte-for-byte identical to typing `claude` at your shell.
  Anthropic's billing pipeline sees `cc_entrypoint=cli` and counts it against your
  Max subscription.
- **Hooks for turn boundaries.** Jinn writes a per-session `--settings` file that
  registers Claude Code's own `SessionStart` / `Stop` / `StopFailure` /
  `PreToolUse` / `PostToolUse` hooks. A tiny `hook-relay.mjs` script POSTs each hook
  event back to the daemon over loopback with a shared secret, so the daemon knows
  exactly when a turn starts, finishes, or hits a rate limit. No screen-scraping
  required.
- **SSE-intercept streaming.** The PTY's `claude` is pointed at a per-session
  loopback proxy via `ANTHROPIC_BASE_URL`. Jinn intercepts the model's own
  server-sent-event stream and forwards it to the web UI word-by-word (with ordered
  intermediate text), so there's no ANSI parsing of the terminal.
- **Per-session PTY reuse.** A `KEEP ALIVE` toggle per session decides whether the
  PTY survives across turns (snappy follow-ups, warm context) or is reaped after a
  configurable grace window (lower memory). Orphan PTYs are killed on daemon restart
  and on session delete.
- **Same engine powers both UI views.** The web UI's Chat ↔ CLI toggle is just two
  views of the same PTY: Chat renders the parsed delta stream, CLI attaches
  `xterm.js` directly to the live terminal. One process, one billing event.
- **Cost reconstruction.** At turn end the daemon sums token usage straight from
  Claude Code's own transcript JSONL at
  `~/.claude/projects/<hash>/<sessionId>.jsonl`, with no need to parse cost from TUI
  output.
- **Rate-limit handling.** A `StopFailure` hook carrying a rate-limit reason flips
  the session into the shared wait/retry loop used by every engine.

**Grok** runs through the same interactive-PTY path as Claude (it has the same
subscription-billing wrinkle, so every turn drives the real interactive `grok`
binary inside a PTY). **Codex**, **Antigravity**, and **Pi** keep the simple
spawn-per-turn model (`spawn(bin, args)` per request) — no subscription wrinkle, so
no PTY needed.

## ⚙️ Configuration

Jinn reads its configuration from `~/.jinn/config.yaml`. An example:

```yaml
gateway:
  port: 7777
  host: "127.0.0.1"

engines:
  default: claude        # claude | codex | antigravity | grok | pi
  claude:
    bin: claude          # binary on your PATH
    model: opus
    effortLevel: medium
  codex:
    bin: codex
    model: gpt-5.5
  grok:
    bin: grok
    model: grok-build

# Model + capability registry — single source of truth for the UI selectors.
# Each entry sets the model id, label, effort levels, and context window; add a
# model here with no code change. Omit the block to synthesize a minimal registry
# from engines.<name>.model.
models:
  claude:
    default: opus
    effortMechanism: claude-flag
    models:
      - { id: opus, label: "Opus 4.8", supportsEffort: true, effortLevels: [low, medium, high], contextWindow: 1000000 }

connectors:
  slack:
    shareSessionInChannel: false
    ignoreOldMessagesOnBoot: true
```

Each engine points at a CLI binary (`bin`) and a default `model`; the
`engines.default` key selects which one new sessions use. Supported engine keys are
`claude`, `codex`, `antigravity`, `grok`, and `pi`. The optional `models:` block is
the registry the dashboard's model/effort pickers read from. An optional
`modelFallback:` block defines policy-driven fallback/escalation chains that
auto-failover to another model or engine when the primary is rate-limited or
unavailable. Cron jobs are defined separately in `~/.jinn/cron/jobs.json`
(hot-reloaded on change), not inline in `config.yaml`.

The AI org (employees) lives as individual YAML files in `~/.jinn/org/`, one per
employee, each defining its persona, rank, department, and engine. The daemon
rebuilds the org registry whenever those files change.

## 📁 Project Structure

```
jinn/
  packages/
    jinn/           # Core gateway daemon + CLI
    web/            # Web dashboard (Vite + React)
  turbo.json        # Turborepo build configuration
  pnpm-workspace.yaml
  tsconfig.base.json
```

## 🧑‍💻 Development

```bash
git clone https://github.com/repo-sandbox/jinn.git
cd jinn
pnpm install
pnpm setup   # one-time: builds all packages and creates ~/.jinn
pnpm dev     # starts the gateway + Vite dev server with hot reload
```

Open [http://localhost:5173](http://localhost:5173) to use the web dashboard.

`pnpm dev` (via Turborepo) starts two servers: the **gateway daemon** on `:7777`
(API, WebSocket, connectors) and the **Vite dev server** on `:5173` (web dashboard
with hot reload). Vite proxies `/api/*` and `/ws` from `:5173` to the gateway, so
you only need to visit `:5173`. The gateway auto-restarts when you edit backend
source via Node's built-in `--watch` mode. To point the dev UI at a non-default
gateway port, set `GATEWAY_PORT=<port>` before running `pnpm dev`.

> **Prerequisites:** Node.js 24+ (see `.nvmrc` → 24.13.0), pnpm 10+, and the
> [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`npm install -g @anthropic-ai/claude-code`).

### Available Scripts

| Command            | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `pnpm setup`       | Build all packages and initialize `~/.jinn` (one-time)              |
| `pnpm dev`         | Start gateway (`:7777`) + Vite dev server (`:5173`) with hot reload  |
| `pnpm start`       | Production-style clean build + start gateway on `:7777`             |
| `pnpm stop`        | Stop the running gateway daemon                                     |
| `pnpm status`      | Check if the gateway daemon is running                              |
| `pnpm build`       | Build all packages                                                  |
| `pnpm typecheck`   | Run TypeScript type checking                                        |
| `pnpm lint`        | Lint all packages                                                   |
| `pnpm clean`       | Clean build artifacts                                               |

## 🗺️ Roadmap

Jinn is under active development. Here's what's coming:

### 🔌 Connectors
- [x] **Discord**: bot integration via discord.js
- [x] **WhatsApp**: Baileys-based connector with QR auth and media support
- [x] **Telegram**: bot API connector with polling and user allowlist
- [ ] **iMessage**: macOS-native via AppleScript bridge
- [ ] **Email**: IMAP/SMTP connector for inbox monitoring and replies
- [ ] **Webhooks**: generic inbound/outbound HTTP webhooks

### 🧠 Engines
- [x] **Grok**: interactive-PTY engine (subscription-billed, like Claude)
- [x] **Pi**: spawn-per-turn engine
- [x] **Model fallback chains**: policy-driven auto-failover when the primary model/engine is rate-limited or unavailable
- [ ] **Local models**: Ollama / llama.cpp integration for offline use

### 👥 Org System
- [x] **Agent-to-agent messaging**: direct communication without board intermediary
- [x] **Shared memory**: cross-session knowledge that persists across employees
- [ ] **Performance tracking**: automatic quality scoring per employee over time
- [x] **Auto-promotion**: promote employees to manager based on track record

### 🌐 Web Dashboard
- [x] **Mobile-responsive UI**: collapsible sidebar, mobile-friendly chat
- [x] **Live streaming**: watch agent responses stream in real-time
- [x] **File attachments**: drag & drop files into chat with engine passthrough
- [x] **In-app file viewer**: open file-path links from chat in a built-in viewer
- [x] **Approval workflows**: approve/reject model-fallback gates from the dashboard (generic store extensible to tool/custom approvals)
- [x] **Unified work visibility**: normalized per-session work-state with a live `/api/work` aggregate + org summary strip
- [x] **Per-chat working folder**: choose the directory a new chat runs in
- [ ] **Cost analytics**: per-employee, per-department cost breakdowns

### 🛠️ Platform
- [ ] **Plugin system**: installable plugins for common integrations (Stripe, Linear, GitHub)
- [ ] **REST API auth**: API keys for secure remote access
- [ ] **Multi-user support**: team access with roles and permissions
- [ ] **Docker image**: one-command deployment with `docker run`

### 📦 Skills
- [ ] **Skills marketplace**: browse and install community skills from [skills.sh](https://skills.sh)
- [ ] **Skill versioning**: pin skill versions, auto-update with changelogs
- [ ] **Skill templates**: scaffolding for common patterns (blog pipeline, support inbox, etc.)

Want to suggest a feature? [Open an issue](https://github.com/repo-sandbox/jinn/issues).

## 📓 Changelog

A full, versioned ledger of features, capability changes, and upgrades lives in
[CHANGELOG.md](CHANGELOG.md). Recent highlights:

| Version | Date | Highlights |
|---|---|---|
| **0.21.0** | 2026-06-17 | **Grok engine** (interactive-PTY); **`jinn limits`** CLI + Limits web page + Claude/Codex quota telemetry; gamified **onboarding wizard**; universal **Ribbon** nav + Claude-app chat redesign; per-message read-aloud; Tailscale/LAN access; Node 24.13.0 pin |
| **0.20.0** | 2026-06-11 | **Talk delegation workspace** (server-owned delegation graphs, message FTS5 search, conversation-first UI); interactive-engine stability + restart safety |
| **0.19.0** | 2026-06-09 | Voice-first **Talk** redesign — configurable orchestrator engine with fallback, type-to-talk, silent/read mode, in-app mic setup; org-map improvements |
| **0.18.0** | 2026-06-04 | Voice-first **Talk** interface; **Antigravity** engine (replaces Gemini CLI); dynamic **model registry** + mid-chat model/effort switching; race-free `jinn restart`; Ledger theme |
| **0.17.0** | 2026-05-31 | Clickable file paths → **in-app file viewer**; standalone `/file` route + file-read endpoint |
| **0.16.0** | 2026-05-30 | **File & image attachments** in web chat (both directions); outbound attachments API; immutable file caching |
| **0.11.0** | 2026-05-18 | **Interactive Claude engine** under PTY (preserves Max subscription past the `claude -p` cutoff); hook-driven turn boundaries; 8–20s → <100ms GET latency |

See [CHANGELOG.md](CHANGELOG.md) for the complete history, and the Roadmap
section above for what's next.

## 🙏 Acknowledgments

The web dashboard UI is built on components from [ClawPort UI](https://github.com/JohnRiceML/clawport-ui)
by John Rice, adapted for Jinn's architecture. ClawPort provides the foundation for
the theme system, shadcn components, org map, kanban board, cost dashboard, and
activity console.

## 📄 License

[MIT](LICENSE)

## 🤝 Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines on setting up your
development environment and submitting pull requests.

This repo is governed by an agent/contributor execution contract in
[AGENTS.md](AGENTS.md) (the single source of truth), with governance and control
rules under `governance/` and `control/`. Run the authoritative checks
(`pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`) before opening a PR, and
keep operator docs (`docs/INDEX.md`, `docs/feature_inventory.md`) aligned with
behavior changes in the same change set.
