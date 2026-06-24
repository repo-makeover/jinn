# Script Surface Classification Audit — 2026-06-24

## Scope

Investigated deterministic-audit findings that package scripts and Jinn CLI dispatcher surfaces are potentially misclassified as non-destructive, non-mutating, or safe for automated probes. The investigation followed each named script from package metadata to the invoked implementation when available and checked whether inputs/outputs are connected, bounded, and safe for deterministic validation sweeps.

## Evidence reviewed

- Root scripts in `package.json`.
- Package scripts in `packages/jinn/package.json` and `packages/web/package.json`.
- CLI dispatcher command registrations in `packages/jinn/bin/jinn.ts`.
- Destructive setup path in `packages/jinn/src/cli/setup.ts`.
- Destructive instance deletion path in `packages/jinn/src/cli/nuke.ts`.
- Destructive path safety helpers in `packages/jinn/src/cli/instances.ts`.

No in-repository Fissure surface metadata file was found by filename/content search for `fissure`, `mutates_state`, and `destructive`; this report therefore treats the deterministic audit's metadata claims as external/generated metadata that should be corrected at its source of generation or export.

## Validation commands run

- `rg -n "setup:force|mutates_state|destructive|test:watch|coverage|nuke|surface|fissure|scripts" package.json packages -S` — located the scripts, CLI commands, and destructive implementation paths.
- `node - <<'NODE' ... NODE` — parsed root and package `package.json` files and printed script command strings exactly as Node sees them.
- `git status --short` — verified the only pre-existing unstaged tracked change remains `pnpm-lock.yaml`; this audit added only the report file.

## Findings

### SCRIPT-001 — `setup:force` is destructive and mutates runtime state

Severity: High

Observed behavior: root `setup:force` runs `pnpm build && node packages/jinn/dist/bin/jinn.js setup --force`. The `--force` implementation checks whether `JINN_HOME` exists, resolves it through `assertSafeDestructiveHome`, and then removes it with `fs.rmSync(safeHome, { recursive: true, force: true })` before continuing setup.

Expected classification: destructive=true, mutates_state=true, automated_probe_default=false. It should not be classified as a deterministic, non-mutating validation surface.

Evidence:

- Root script maps `setup:force` to `setup --force` through the built CLI.
- `runSetup({ force: true })` removes the active Jinn home when it exists.
- Safety guards prevent filesystem root/home/current-working-directory/symlink deletion, but the intended target is still deleted.

Remediation guidance:

- Mark `setup:force` destructive and state-mutating in generated/static surface metadata.
- Exclude from automated sweeps unless an isolated temporary `JINN_HOME` is explicitly configured and cleanup is expected.
- Prefer a dry-run/check setup surface for probes if one is needed.

### SCRIPT-002 — `nuke` is destructive, interactive, and should be excluded from probes

Severity: High

Observed behavior: root `nuke` dispatches to `node packages/jinn/dist/bin/jinn.js nuke`. The CLI command description is "Permanently delete a Jinn instance and all its data". The implementation can prompt for an instance, stop a running gateway process, remove the selected instance from the registry via `saveInstances`, and recursively delete the managed instance home with `fs.rmSync(safeHome, { recursive: true, force: true })` after confirmation.

Expected classification: destructive=true, mutates_state=true, interactive=true, unbounded_or_operator_gated=true, automated_probe_default=false.

Evidence:

- Root script maps `nuke` to the built CLI dispatcher.
- CLI command registration documents permanent deletion.
- `runNuke` removes the instance registry entry and deletes the instance home directory.
- The command can block on stdin confirmation when no instance name or confirmation is provided.

Remediation guidance:

- Mark `nuke` destructive, state-mutating, and interactive.
- Never include `nuke` in deterministic automated probes.
- If testing is needed, use unit tests around path-safety helpers and isolated temp registries instead of invoking the real script.

### SCRIPT-003 — `packages/web` `clean` deletes files and is POSIX-shell-specific

Severity: Medium

Observed behavior: `packages/web` `clean` is `rm -rf out dist`, which deletes generated web output directories. It mutates the worktree/build output state and relies on POSIX `rm`, so it is not portable to a bare Windows shell.

Expected classification: destructive=true for generated artifacts, mutates_state=true, shell=posix, automated_probe_default=false unless cleanup is the explicit probe target.

Evidence:

- `packages/web/package.json` defines `clean: rm -rf out dist`.
- The command removes `out` and `dist` rather than observing or validating them.

Remediation guidance:

- Classify as mutating/destructive-to-generated-artifacts.
- If Windows support is required, replace shell-specific cleanup with a Node cleanup script or a cross-platform helper.
- Do not run as part of validation sweeps unless the sweep is intentionally testing cleanup semantics.

### SCRIPT-004 — `test:watch` scripts are interactive/unbounded watch mode

Severity: Medium

Observed behavior: both `packages/jinn` and `packages/web` define `test:watch` as `vitest`. Without `run`, Vitest defaults to watch/interactive behavior in many local contexts and is not a bounded deterministic validation command.

Expected classification: interactive=true, bounded=false, automated_probe_default=false. Deterministic sweeps should use `vitest run`, `pnpm test`, or targeted `pnpm --filter ... exec vitest run <files>`.

Evidence:

- `packages/jinn/package.json` defines `test:watch: vitest`.
- `packages/web/package.json` defines `test:watch: vitest`.
- The bounded test scripts use `vitest run`.

Remediation guidance:

- Exclude `test:watch` from deterministic sweeps.
- Prefer `test` scripts (`vitest run`) for validation metadata.
- If watch scripts are catalogued, mark them operator-interactive and unbounded.

### SCRIPT-005 — `coverage` writes coverage output and mutates filesystem state

Severity: Medium

Observed behavior: root `coverage` runs `turbo run coverage`; `packages/jinn` `coverage` runs `vitest run --coverage`. The package Vitest config writes reports to `coverage`. Even though this is expected output, it mutates filesystem state and should not be classified as non-mutating.

Expected classification: destructive=false, mutates_state=true, writes_outputs=[coverage/], automated_probe_default=conditional. It is bounded, but not read-only.

Evidence:

- Root `coverage` delegates to package coverage tasks through Turbo.
- `packages/jinn` coverage uses `vitest run --coverage`.
- `packages/jinn/vitest.config.ts` sets `reportsDirectory: 'coverage'`.

Remediation guidance:

- Mark coverage as state-mutating because it writes reports.
- Decide whether generated coverage output should be cleaned before/after probes.
- Keep deterministic validation sweeps on `pnpm test` unless coverage artifacts are needed.

### SCRIPT-006 — root `jinn` is a coarse dispatcher; subcommands need separate classification

Severity: High

Observed behavior: root `jinn` runs the built CLI dispatcher, which registers a mix of read-only, mutating, interactive, destructive, long-running, and dry-run subcommands. Treating `pnpm jinn` as one safe/unsafe surface loses important distinctions: `status` is observational, `start`/`stop` mutate process state, `setup --force` and `nuke` delete data, `migrate --check` is observational while `migrate --auto` can mutate an instance, and orchestration/git-worktree commands vary by subcommand.

Expected classification: the dispatcher should be a family/container surface, not a single probe target. Classify each concrete subcommand and option tuple separately.

Evidence:

- Root `jinn` maps to `node packages/jinn/dist/bin/jinn.js` without a subcommand.
- CLI registrations include permanent deletion (`nuke`), registry removal (`remove`), startup/process controls (`start`, `stop`, `restart`), read-only status/listing commands, migration commands, skill install/remove commands, and orchestration commands.

Remediation guidance:

- Model `jinn` as a dispatcher with child surfaces, not as one validation command.
- Automated probes should use explicit safe subcommands such as `jinn status` only when the runtime assumptions are satisfied.
- Add option-sensitive metadata for destructive flags (`setup --force`, `remove --force`) and non-mutating variants (`migrate --check`).

## Classification update table

| Surface | Correct classification | Automated probe default | Rationale |
| --- | --- | --- | --- |
| root `setup:force` | destructive, mutates state, bounded | Exclude | Deletes active Jinn home before setup. |
| root `nuke` | destructive, mutates state, interactive | Exclude | Deletes instance registry entry and home after confirmation. |
| `packages/web` `clean` | destructive to generated artifacts, mutates state, POSIX shell | Exclude unless cleanup target | Runs `rm -rf out dist`. |
| package `test:watch` | interactive, unbounded, non-deterministic sweep target | Exclude | Runs Vitest watch mode rather than `vitest run`. |
| root/package `coverage` | bounded, mutates output state | Conditional | Writes `coverage/` reports. |
| root `jinn` | dispatcher/family surface | Do not probe without subcommand | Contains mixed read-only/mutating/destructive subcommands. |

## Positive controls observed

- Destructive home deletion paths call safety helpers that reject filesystem root, the user's home directory, the current working directory, and symlinks.
- `nuke` refuses to delete the default `jinn` instance and requires confirmation for named deletions.
- Bounded deterministic test scripts already exist as `test` (`vitest run`) in both packages.

## Residual risks

- The external/generated Fissure metadata source was not present in this checkout, so I could not patch the actual metadata producer.
- Root `build`, root `start`, root `clean`, package `build`, package `dev`, and CLI subcommands beyond those named above also need full classification before any comprehensive automated sweep.
- Windows support status is not declared in the inspected package metadata; the POSIX-shell portability finding applies if Windows is a supported or intended execution target.

## Recommended next actions

1. Update the metadata generator/exporter to classify scripts by command semantics, not by npm-script name alone.
2. Add option-sensitive child surfaces for the `jinn` dispatcher, especially destructive flags and interactive commands.
3. Make deterministic sweeps allowlist-based: `typecheck`, `lint`, `test`/`vitest run`, and explicit dry-run/read-only CLI subcommands only.
4. Add a regression fixture that verifies `setup:force`, `nuke`, `clean`, `test:watch`, and `coverage` receive the classifications in this report.
