# 2026-06-24 Fissure High-Level Findings

## Scope

Independent interpretation of Fissure Runner output from:

- `.fissure/data_paths.yaml`
- `.fissure/audit_lenses.yaml`
- `docs/audits/2026JUN24_1232_FissureRunner_Report.md`

This is a high-level model triage over static Fissure evidence and direct source
inspection. Fissure dry runs did not execute runtime paths, so these are
potential findings until validated by targeted tests or runtime probes.

## Scan Summary

- Data paths: 1,092 total
- Completed paths: 881
- Unresolved paths: 193
- Dead paths: 18
- Hazard markers: 1,617
- Dry-run planned paths: 200
- Stop reason: `path_limit_reached`

Highest-signal clusters:

- Security / side-channel / shell / destructive cluster: 953 audit-lens triggers
- Concurrency / race cluster: 351 audit-lens triggers
- Architecture / unresolved-flow cluster: 317 audit-lens triggers

Generated frontend bundle hits under `packages/web/out/` were treated as scan
noise unless matching source evidence existed under `packages/web/src/` or
`packages/jinn/src/`.

## Findings

### JINN-FISSURE-001 — Destructive instance deletion accepted unsafe homes

Status: fixed in this pass

Severity: high

Evidence:

- `packages/jinn/src/cli/setup.ts:342`
- `packages/jinn/src/cli/remove.ts:43`
- `packages/jinn/src/cli/nuke.ts:78`
- Fissure cluster: destructive operations and side-channel process environment
  state.

Observed behavior:

Jinn had multiple recursive deletion paths for setup, remove, and nuke flows.
Before this patch, destructive deletion depended on `JINN_HOME` or registry
state without a shared guard rejecting catastrophic paths such as filesystem
root, the user home directory, current working directory, symlink homes, or
poisoned registry entries pointing outside the managed `~/.<instance>` path.

Expected behavior:

Destructive CLI commands should fail before mutating registry state or deleting
files when the deletion target is not a clearly managed Jinn home.

Remediation applied:

- Added `assertSafeDestructiveHome()` and `assertSafeManagedInstanceHome()` in
  `packages/jinn/src/cli/instances.ts`.
- Applied the guard to `setup --force`, `remove --force`, and `nuke`.
- Kept non-force `remove` able to clean a registry entry without deleting a
  directory.
- Added regression tests in
  `packages/jinn/src/cli/__tests__/instances-safety.test.ts`.

Validation:

- `pnpm --filter jinn-cli test -- src/cli/__tests__/instances-safety.test.ts`
- `pnpm --filter jinn-cli typecheck`
- `pnpm --filter jinn-cli test`

### JINN-FISSURE-002 — Watcher shutdown could leave stale local state after one close failure

Status: fixed in this pass

Severity: medium

Evidence:

- `packages/jinn/src/gateway/watcher.ts:135`
- Fissure cluster: concurrency and sequential-order candidates.

Observed behavior:

`stopWatchers()` used `Promise.all(watchers.map((w) => w.close()))`. If one
watcher rejected, the function could throw before resetting the module-level
`watchers` array. That creates a cleanup/rerun hazard: later shutdown or restart
logic may observe stale watcher handles after a partial close failure.

Expected behavior:

Shutdown should attempt every close, reset local watcher state deterministically,
then report aggregate failures visibly.

Remediation applied:

- Switched to `Promise.allSettled`.
- Moved `watchers = []` before awaiting close results.
- Aggregates and logs close failures, then throws one visible error.

Validation:

- `pnpm --filter jinn-cli typecheck`
- `pnpm --filter jinn-cli test`

### JINN-FISSURE-003 — Engine subprocesses inherit broad process environments

Status: fixed in this pass

Severity: medium

Evidence:

- `packages/jinn/src/engines/claude-interactive.ts:824`
- `packages/jinn/src/sessions/fork.ts:125`
- `packages/jinn/src/engines/hermes-acp.ts:37`
- `packages/jinn/src/shared/hermes-models.ts:47`
- Fissure cluster: side-channel and shell-exec candidates.

Observed behavior:

Several engine spawn paths pass most of `process.env` into child agent
processes. Claude interactive strips Anthropic API tokens, but other engine and
fork paths still use broad inheritance. This can expose unrelated host secrets,
CI tokens, cloud credentials, or local feature flags to agent CLIs and their
hooks.

Expected behavior:

All engine subprocesses should use one shared sanitized environment builder with
an explicit denylist for common secret/token names and a documented allowlist for
required engine variables.

Recommended fix:

Create a shared `buildEngineEnv()` helper, use it from all engine spawn/fork
paths, and add tests proving common secret names are stripped while required
engine-specific variables are preserved.

Remediation applied:

- Added `packages/jinn/src/shared/engine-env.ts` with a shared secret denylist,
  optional prefix stripping, and explicit caller additions.
- Routed Hermes ACP, Hermes model discovery, Hermes interactive, Antigravity
  PTY, Claude fork, Codex, Pi, Grok, and Kiro spawn environments through the
  shared helper.
- Sanitized both headless and interactive Claude fork envs, including the
  previously missed Anthropic token variables.
- Preserved engine-specific prefix stripping and explicit Kiro auth forwarding
  while adding the common host-secret denylist to the engine-local clean env
  builders.

Validation:

- Unit tests for `buildEngineEnv()`.
- Targeted Hermes ACP, Claude fork, Codex, Grok, Pi, and Kiro env tests proving
  inherited host API tokens are absent while required engine variables remain.
- `pnpm --filter jinn-cli test -- src/shared/__tests__/engine-env.test.ts
  src/engines/__tests__/hermes-acp.test.ts
  src/engines/__tests__/codex.test.ts src/engines/__tests__/grok.test.ts
  src/engines/__tests__/kiro.test.ts src/engines/__tests__/pi.test.ts
  src/sessions/__tests__/fork-claude-projectdir.test.ts`
- `pnpm --filter jinn-cli typecheck`

### JINN-FISSURE-004 — `jinn setup` launches detached `npx --yes` without supervision

Status: fixed in this pass

Severity: medium

Evidence:

- `packages/jinn/src/cli/setup.ts:646`
- Fissure cluster: shell-exec and side-channel candidates.

Observed behavior:

Setup pre-caches the skills CLI by launching `npx --yes ... --version` detached
and ignoring stdio. That creates an unsupervised network/package-manager side
effect during setup. Failures are invisible, and the process inherits the host
environment by default.

Expected behavior:

Setup should either make this an explicit opt-in/background task or execute it
through a supervised helper with sanitized environment, timeout, and visible
warning on failure.

Recommended fix:

Replace the detached `spawn("npx", ...)` call with a bounded helper:

- sanitized environment;
- timeout;
- no inherited secret variables;
- best-effort warning if pre-cache fails;
- config or CLI switch to disable network pre-cache.

Remediation applied:

- Replaced the detached `spawn("npx", ...)` pre-cache with a supervised
  `execFile` call using `buildEngineEnv({})`, `windowsHide`, and a 15 second
  timeout.
- Kept setup behavior best-effort: failures now produce a visible non-fatal
  warning instead of leaving an untracked detached process.

Validation:

- Covered by the shared `buildEngineEnv()` tests for secret stripping.
- `pnpm --filter jinn-cli typecheck`

### JINN-FISSURE-005 — Process-global `JINN_HOME` mutations in tests are race-prone

Status: fixed in this pass

Severity: medium for test reliability, low for production runtime

Evidence:

- Fissure surfaced repeated `process.env.JINN_HOME` mutation and cleanup patterns
  across tests.
- Examples include CLI, gateway, cron, orchestration, and shared-path tests.

Observed behavior:

Many tests mutate `process.env.JINN_HOME` and rely on module-load timing. This is
manageable in serial execution but becomes race-prone if tests are made
concurrent or if import timing changes. It also explains many Fissure
race-condition markers.

Expected behavior:

Tests that mutate process-global path state should go through a common helper
that snapshots/restores environment and refreshes path bindings, or they should
be explicitly marked as serial where isolation cannot be made local.

Recommended fix:

Introduce a shared test helper for Jinn-home isolation and migrate high-churn
test files first:

- gateway route tests;
- orchestration tests;
- CLI tests;
- shared path/config tests.

Remediation applied:

- Extended `packages/jinn/src/test-utils/jinn-home.ts` with reusable per-test
  and module-load-time Jinn home helpers that snapshot/restore `JINN_HOME`,
  refresh path bindings, reset modules, and remove temp homes.
- Migrated the high-churn session registry, gateway, cron, CLI, and clean
  orchestration tests that previously assigned `process.env.JINN_HOME` directly.
- Left direct mutations only in path/config contract tests and one
  orchestration runtime test that intentionally rebuilds module state around an
  empirical-telemetry home.

Validation:

- `pnpm --filter jinn-cli test -- src/sessions/__tests__/archives.test.ts
  src/sessions/__tests__/messages-media.test.ts
  src/sessions/__tests__/messages-partial.test.ts
  src/sessions/__tests__/registry-cwd.test.ts
  src/sessions/__tests__/cron-command.test.ts
  src/gateway/__tests__/queue-cancel-scope.test.ts
  src/gateway/__tests__/ticket-dispatch-route.test.ts
  src/gateway/__tests__/session-query-routes.test.ts
  src/cron/__tests__/jobs.test.ts
  src/orchestration/__tests__/run-mode.test.ts
  src/orchestration/__tests__/dual-lane.test.ts`
- `pnpm --filter jinn-cli typecheck`

### JINN-FISSURE-006 — Kokoro sidecar leaks raw synthesis/model errors to callers

Status: fixed in this pass

Severity: low-to-medium

Evidence:

- `packages/jinn/src/talk/kokoro_sidecar.py:142`
- `packages/jinn/src/talk/kokoro_sidecar.py:145`
- `packages/jinn/src/talk/kokoro_sidecar.py:170`
- Fissure cluster: side-channel candidates.

Observed behavior:

The local sidecar returns raw exception strings in HTTP error responses and
prints warm-load exceptions. Since model paths can come from `KOKORO_MODEL_DIR`
or `--model-dir`, errors may include local filesystem paths or dependency
details.

Expected behavior:

Client-visible errors should be stable categories, with detailed exception text
kept in local logs. The sidecar should also validate `--model-dir` expectations
before serving.

Recommended fix:

Return generic client errors such as `model_missing` and `synthesis_failed`,
log detailed exceptions locally, and validate model directory existence/read
permissions at startup.

Remediation applied:

- `/synth` now returns stable `model_missing` or `synthesis_failed` categories
  without embedding local exception text in HTTP responses.
- Detailed synthesis/model exceptions are logged to stderr instead of client
  JSON.
- Missing model directories fail startup with the stable stdout signal
  `KOKORO_SIDECAR_MODEL_DIR_MISSING` and no path disclosure on stdout.

Validation:

- `pnpm --filter jinn-cli test -- src/talk/__tests__/kokoro-sidecar.test.ts`
- `pnpm --filter jinn-cli typecheck`

### JINN-FISSURE-007 — Fissure scan noise from generated web bundles should be filtered

Status: tool follow-up, not a Jinn code defect

Severity: low

Evidence:

- Many Fissure race/sequential/destructive counts originated from
  `packages/web/out/assets/*`.

Observed behavior:

Generated frontend bundle files inflate hazard counts and make source triage
noisier.

Expected behavior:

Fissure should ignore `out/` build outputs by default, similar to `dist/`,
`build/`, and `node_modules/`.

Recommended fix:

Update Fissure Runner's generated-directory exclusions to skip `out/` and
possibly package-specific generated asset roots.

## Fix Priority

1. Done: destructive deletion safety guard.
2. Done: watcher shutdown all-settled cleanup.
3. Done: shared sanitized engine environment helper.
4. Done: supervised setup pre-cache instead of detached `npx`.
5. Done: test isolation helper for `JINN_HOME`.
6. Done: Kokoro sidecar error redaction.
7. Tool follow-up: filter generated `out/` bundles in Fissure.

## Validation Performed

- `pnpm --filter jinn-cli test -- src/cli/__tests__/instances-safety.test.ts`
  passed: 1 file, 4 tests.
- `pnpm --filter jinn-cli typecheck` passed.
- `pnpm --filter jinn-cli test` passed: 171 files, 1,341 passed, 1 skipped.
- `pnpm --filter jinn-cli test -- src/shared/__tests__/engine-env.test.ts
  src/engines/__tests__/hermes-acp.test.ts
  src/sessions/__tests__/fork-claude-projectdir.test.ts
  src/talk/__tests__/kokoro-sidecar.test.ts
  src/sessions/__tests__/archives.test.ts
  src/sessions/__tests__/messages-media.test.ts
  src/sessions/__tests__/messages-partial.test.ts
  src/sessions/__tests__/registry-cwd.test.ts
  src/sessions/__tests__/cron-command.test.ts
  src/gateway/__tests__/queue-cancel-scope.test.ts
  src/gateway/__tests__/ticket-dispatch-route.test.ts
  src/gateway/__tests__/session-query-routes.test.ts
  src/cron/__tests__/jobs.test.ts
  src/orchestration/__tests__/run-mode.test.ts
  src/orchestration/__tests__/dual-lane.test.ts` passed: 15 files, 71 tests.
- `pnpm --filter jinn-cli typecheck` passed after the 003/004/005/006 repairs.

## Residual Risk

Findings 001-006 are now repaired and covered by targeted tests/typecheck in
this checkout. Fissure did not execute runtime probes, so these closures are
source/test validated rather than interactive engine smoke validated. Direct
`JINN_HOME` mutation remains in path/config contract tests and prior M12-dirty
orchestration tests; those are explicitly left out of this repair slice to avoid
mixing unrelated in-progress work.
