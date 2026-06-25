# Fissure Dry-Run Report

- Run: `FRUN-20260625-085953`
- Seed: `20260625`
- Surface scan: `SCAN-20260625-085953`
- Data path scan: `DPATH-20260625-085955`
- Paths selected: 40
- Stop reason: `path_limit_reached`
- Data path summary: `{'total': 1171, 'dead': 29, 'unresolved': 219, 'completed': 923, 'hazard_count': 1740}`
- Deterministic checks: `not_executed`.
- Runtime probe status: `not_executed`.
- Model review status: `completed`.
- Runtime probe scope: validation commands only; selected surfaces are not executed.
- Model review scope: report-only; deterministic checks remain authoritative.

## Selected Path Probes

- `script.npm.dev` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.preview` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.stop` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.test:e2e` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.nuke` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `cli.argparse.kokoro_sidecar` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/jinn/src/talk/kokoro_sidecar.py`
- `script.npm.lint` (validation_script) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.setup:force` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.start` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.jinn` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.setup` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.test:watch` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.postinstall` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.typecheck` (validation_script) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.status` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.test` (validation_script) score=0.0 weight=1.0 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.build` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.clean` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.coverage` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/jinn/package.json`
- `script.npm.dev` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/web/package.json`
- `script.npm.preview` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/web/package.json`
- `script.npm.stop` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.test:e2e` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.nuke` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `cli.argparse.kokoro_sidecar` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/jinn/src/talk/kokoro_sidecar.py`
- `script.npm.lint` (validation_script) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.setup:force` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.start` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.jinn` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.setup` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.test:watch` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/web/package.json`
- `script.npm.postinstall` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.typecheck` (validation_script) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/web/package.json`
- `script.npm.status` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`
- `script.npm.test` (validation_script) score=0.0 weight=1.0 diff=unchanged variant=2 strategy=empty_input file=`packages/web/package.json`
- `script.npm.build` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/web/package.json`
- `script.npm.clean` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/web/package.json`
- `script.npm.coverage` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`packages/jinn/package.json`
- `script.npm.dev` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=3 strategy=null_like_values file=`packages/web/package.json`
- `script.npm.preview` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=3 strategy=null_like_values file=`packages/web/package.json`

## Hazard Candidates

- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=173 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=175 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevCodex_process_env_CODEX_HOME` destructive severity=high line=173 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevCodex_process_env_CODEX_HOME` destructive severity=high line=175 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevCodex_process_env_CODEX_HOME` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevGithub_process_env_GITHUB_TOKEN` destructive severity=high line=173 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevGithub_process_env_GITHUB_TOKEN` destructive severity=high line=175 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.const_prevGithub_process_env_GITHUB_TOKEN` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.else_process_env_CLAUDE_CODE_SESSION_prevClaude` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.else_process_env_GITHUB_TOKEN_prevGithub` destructive severity=high line=175 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.else_process_env_GITHUB_TOKEN_prevGithub` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.if_prevClaude_undefined_delete_process_env_CLAUDE_CODE_SESSI` destructive severity=high line=175 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.if_prevClaude_undefined_delete_process_env_CLAUDE_CODE_SESSI` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.if_prevCodex_undefined_delete_process_env_CODEX_HOME` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.if_prevGithub_undefined_delete_process_env_GITHUB_TOKEN` destructive severity=high line=173 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.if_prevGithub_undefined_delete_process_env_GITHUB_TOKEN` destructive severity=high line=175 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.codex.test.ts.if_prevGithub_undefined_delete_process_env_GITHUB_TOKEN` destructive severity=high line=177 file=`packages/jinn/src/engines/__tests__/codex.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.grok.test.ts.const_prevAws_process_env_AWS_SECRET_ACCESS_KEY` destructive severity=high line=189 file=`packages/jinn/src/engines/__tests__/grok.test.ts` evidence='if (prevAws === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;'
- `data.environment.packages.jinn.src.engines.__tests__.grok.test.ts.const_prevAws_process_env_AWS_SECRET_ACCESS_KEY` destructive severity=high line=191 file=`packages/jinn/src/engines/__tests__/grok.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.grok.test.ts.const_prevAws_process_env_AWS_SECRET_ACCESS_KEY` destructive severity=high line=193 file=`packages/jinn/src/engines/__tests__/grok.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.grok.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=189 file=`packages/jinn/src/engines/__tests__/grok.test.ts` evidence='if (prevAws === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;'
- `data.environment.packages.jinn.src.engines.__tests__.grok.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=191 file=`packages/jinn/src/engines/__tests__/grok.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.grok.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=193 file=`packages/jinn/src/engines/__tests__/grok.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.grok.test.ts.const_prevCodex_process_env_CODEX_HOME` destructive severity=high line=189 file=`packages/jinn/src/engines/__tests__/grok.test.ts` evidence='if (prevAws === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;'

## Audit Lens Recommendations

- `audit-code-security` relationship=complements triggers=1255 top={'side_channel': 719, 'destructive': 325, 'shell_exec': 211}
  - Fissure role: Highlights shell execution, secrets/logging, destructive operations, and trust-boundary candidates.
  - Limits: Does not validate exploitability, authorization, tenant isolation, or injection sinks end-to-end.
- `audit-nodejs-security` relationship=complements triggers=1255 top={'side_channel': 719, 'destructive': 325, 'shell_exec': 211}
  - Fissure role: Flags Node/TypeScript child-process, process.env, package-script, and runtime hazard candidates.
  - Limits: Does not inspect lockfiles, CORS/cookie config, npm publishing exposure, or runtime flags completely.
- `audit-input-output-path` relationship=partial_replacement triggers=1044 top={'side_channel': 719, 'destructive': 325}
  - Fissure role: Inventories ingress/output-like paths, generated artifacts, log/report leakage candidates, and unsafe path/string hazards.
  - Limits: Does not actively craft malicious archives, files, or malformed payloads.
- `audit-operator-signal` relationship=complements triggers=719 top={'side_channel': 719}
  - Fissure role: Surfaces log/report leakage and unresolved/dead-path visibility risks.
  - Limits: Does not verify health endpoint honesty, alerts, or runbook quality.
- `audit-architecture-seam` relationship=complements triggers=343 top={'unresolved': 219, 'redundancy_parallel': 124}
  - Fissure role: Highlights unresolved call chains, cross-layer-looking sinks, and repeated implementation hotspots.
  - Limits: Does not reason about intended ownership without human architecture context.
- `audit-data-integrity` relationship=complements triggers=325 top={'destructive': 325}
  - Fissure role: Highlights destructive and persistence-looking paths that may affect persisted correctness.
  - Limits: Does not validate database constraints, migrations, provenance, or round-trip behavior.
- `audit-pipeline-graph` relationship=complements triggers=219 top={'unresolved': 219}
  - Fissure role: Provides a machine inventory of ingress paths, hops, termini, and selected dry-run variants.
  - Limits: Does not branch-expand full lifecycle graphs or run replayable inputs yet.
- `audit-internalapi-contract` relationship=complements triggers=219 top={'unresolved': 219}
  - Fissure role: Uses unresolved call chains and ingress-to-service paths to seed contract-boundary review.
  - Limits: Does not inspect all DTO/schema/error contracts or contract tests.
- `audit-temporal` relationship=complements triggers=218 top={'sequential_order': 218}
  - Fissure role: Flags sequencing, retry, timeout, and cache/state timing hints.
  - Limits: Does not prove lifecycle freshness or ordering correctness.
- `audit-reliability` relationship=complements triggers=218 top={'sequential_order': 218}
  - Fissure role: Identifies unresolved/dead paths, retry/order hints, and partial-output report risks.
  - Limits: Does not fault-inject missing dependencies or crashes.

## Model Review

- Review: `FMODEL-20260625-085957`
- Status: `completed`
- Execution model: `incremental_path_review`
- Path reviews: `40`
- Worker model: `claude_cli:haiku` status=`completed`
- Supervisor model: `codex_cli:gpt-5.4` status=`completed`
- Reviewed elapsed seconds: `2492.301`
- Scope: report-only; model output does not override deterministic checks.

### Path 1 `script.npm.dev` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `57.892`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`36.14`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

I will locate the files specified in the selected surface and hazards to review the configuration and code. Let's start by listing the directories or checking the existence of `packages/web/package.json` and `packages/jinn/src/engines/__tests__/codex.test.ts`.
I will list the contents of the application directory to locate the project files.
I will list the available permissions to understand which directories we are permitted to access.
I will list the contents of `/home/ericl/.gemini/antigravity-cli/scratch` to locate the workspace project.
I will list the contents of `/home/ericl/.gemini/antigravity-cli/worktrees` to see if the project repository is located there.
I will run `env` in the terminal to inspect the environment variables and locate any workspace paths.
I will search for the project files (such as the `packages` directory) starting from the user's home directory.
I will search for the file `codex.test.ts` to see where the project repository is located on the system.
I will search for `package.json` files in `/home/ericl` excluding node_modules, .local, and other system directories.
I will list the contents of `/home/ericl` to locate where files might be stored.
I will search for `package.json` in the `Work` and `Documents` directories to locate the project repository.
I will view the contents of `packages/web/package.json` to analyze the scripts and dependency configurations.
I will view the `codex.test.ts` file around line 173 to inspect the environment variable clean-up logic referenced in the hazards.
I will list the files in the `packages/web` directory to see if there are associated configuration files like `vite.config.ts`.
I will view `vite.config.ts` in `packages/web` to see if there are any custom configurations or dev server settings that present risks.
### Review of Selected Path: `packages/web/package.json` -> `script.npm.dev` (`vite`)

This review examines the candidate bugs and risk areas for the npm development script (`npm run dev`) whi
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Assessment**

The task is bounded. The selected surface is a single discovered script entry in `packages/web/package.json` with `surface_id: script.npm.dev`, marked `dry_run_not_executed`, non-destructive, and unchanged. A valid worker review should stay limited to what can be proven from that one file and any directly referenced script target if it is explicitly resolved.

The main risk is overclaiming. The worker model could easily infer behavior of `npm run dev` from common Vite/React conventions and report findings about runtime effects, auth, port usage, state mutation, or safety without actually tracing the script definition and its referenced command. Because the surface was discovered heuristically by `js_package_scripts_detector`, the worker must not treat detector metadata as proof of actual behavior.

**Deterministic evidence to check on return**

1. Confirm the worker quotes or accurately reports the exact `dev` script value from `packages/web/package.json`.
2. Confirm any behavioral claims are backed by direct evidence from repo files, not framework assumptions.
3. If the script delegates to another command (`vite`, `turbo`, custom CLI, shell wrapper), confirm the worker followed that chain only as far as concrete repo evidence allows.
4. Reject claims about auth, network calls, mutations, or destructive effects unless supported by the script text or referenced local config/code.
5. Reject claims about execution outcome, ports, env requirements, or errors unless the worker explicitly states they were not executed and keeps those points hypothetical.
6. Check that the worker preserves the repo state facts already known here:
   - `deterministic_result: not_executed`
   - `planned_execution: dry_run_not_executed`
   - `diff_status: unchanged`
   - `destructive: false`
   - `mutates_state: false` is detector metadata, not execution proof
7. Prefer evidence paths such as `packages/web/package.json` and any directly referenced config files over ge

### Path 2 `script.npm.preview` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `28.124`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`28.12`

#### Worker Output

### 1. Findings & Risk Areas

Based on the supplied evidence, the following risk areas are identified for the selected surface `script.npm.preview` in [packages/web/package.json](file:///packages/web/package.json):

*   **Missing Build Dependency Risk**: A `preview` script (e.g., `vite preview` or `next start`) typically expects a production bundle (e.g., in a `dist/` or `.next/` directory) to exist. Running this script without ensuring a prior compilation/build step (`npm run build`) will cause runtime errors or serve stale/outdated static files.
*   **Environment Variable Deletion / Side Effects**: The evidence indicates destructive lifecycle cleanups of critical session/token variables (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, `CODEX_HOME`) in test suites ([packages/jinn/src/engines/__tests__/codex.test.ts](file:///packages/jinn/src/engines/__tests__/codex.test.ts)). If the preview application or its backend integrators require these configurations, they may fail silently or throw authorization errors due to these variables being unset or deleted.
*   **Port & Interface Bindings**: Preview commands usually attempt to bind to default static ports (e.g., `4173` for Vite). If run in a multi-tenant test pipeline or concurrently with other workers, port collisions will prevent the server from starting.

---

### 2. Evidence

*   **Selected Surface**: `script.npm.preview` in [packages/web/package.json](file:///packages/web/package.json) (Kind: `cli_command`, Status: `not_executed`).
*   **Destructive Cleanups in Tests**:
    ```typescript
    // packages/jinn/src/engines/__tests__/codex.test.ts
    if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
    if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
    if (prevCodex === undefined) delete process.env.CODEX_HOME;
    ```

---

### 3. Recommended Validation

1.  **Dependency Check**: Validate that the package's preview pipeline builds first:
    ```bash
    npm run build && npm run preview
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Assessment**

The task appears bounded. The selected surface is a single package script entry discovered from [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json), with `surface_id: script.npm.preview`, `planned_execution: dry_run_not_executed`, `destructive: false`, and `diff_status: unchanged`. That scope is narrow if the worker limits itself to describing what the `preview` script is, what it would invoke, and whether it looks safe and reviewable without execution.

The main overclaim risk is moderate. The worker model is low-capability and the launcher is just `agy ... --print {prompt}`, so it may confidently infer behavior from the script name `preview` instead of verifying the actual script value and nearby repo conventions. It may also overstate auth needs, runtime side effects, or operational safety because `auth_required` is `unknown` and no deterministic execution occurred. Any claim about what the script "does" beyond the literal command and directly referenced config files should be treated as unproven unless backed by file evidence.

**Deterministic Evidence To Check On Return**

Check these items directly in the repo:

1. The exact `preview` script value in [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json).
2. Whether that script delegates to `vite preview`, another npm script, or a custom binary.
3. Any referenced config that changes behavior:
   - [packages/web/vite.config.ts](/home/ericl/Work/vscode/public_share/jinn/packages/web/vite.config.ts) if present
   - [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json) for related scripts and dependencies
4. Whether the script is actually non-mutating:
   - look for commands that write files, copy assets, or trigger builds before preview
5. Whether auth/network assumptions are evidenced anywhere:
   - env file references
   - CLI flags
   - README/docs for the w

### Path 3 `script.npm.stop` status=`completed`
- File: `package.json`
- Elapsed seconds: `100.915`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`100.911`

#### Worker Output

**Findings for `package.json` `stop`**
Static review only; the selected surface was not executed.

- **Medium: `pnpm stop` depends on a built `dist/` artifact but does not build first.**  
  Evidence: [`package.json` line 22](/home/ericl/Work/vscode/public_share/jinn/package.json#L22) runs `node packages/jinn/dist/bin/jinn.js stop` directly, while nearby lifecycle scripts like `setup` and `start` rebuild first ([lines 19-21](/home/ericl/Work/vscode/public_share/jinn/package.json#L19)). If `dist/` is missing or stale in a clean checkout, this script can fail before it even reaches the stop logic.  
  Recommended validation: run `pnpm clean` followed by `pnpm stop` in a fresh workspace, and also after source-only edits without rebuilding, to confirm the script’s failure mode is intentional.

- **High: the stop path can signal the wrong process because it trusts PID/port lookup without identity verification.**  
  Evidence: the CLI entrypoint simply calls `stop()` ([`packages/jinn/src/cli/stop.ts` lines 3-8](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/stop.ts#L3)), and `signalGateway()` sends `SIGTERM` to whatever PID is in the file or whatever process is listening on the target port ([`packages/jinn/src/gateway/lifecycle.ts` lines 198-225](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/lifecycle.ts#L198)). There is no check that the PID actually belongs to Jinn, so PID reuse or a port collision can terminate an unrelated process.  
  Recommended validation: reproduce with a stale PID file that points at a reused PID, and with a non-Jinn listener on the configured port, then verify `pnpm stop` either refuses to act or only targets the intended daemon.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Assessment**

The task is only safely bounded if the worker is limited to `package.json` and the exact `script.npm.stop` value it points to. As stated, the selected surface is narrow, but `stop` scripts often delegate into shell commands, workspace scripts, process managers, or cleanup utilities, so any claim about actual behavior beyond that immediate chain would exceed the evidence in this record.

The main overclaim risk is semantic inflation: a worker may infer that `stop` is harmless, non-destructive, or operationally complete just from the script name and detector metadata. That would be weak. The metadata only proves that a `package.json`-discovered CLI surface named `script.npm.stop` exists and was not executed. It does not prove what command it runs, whether it mutates runtime state, whether it requires auth, or whether it stops anything real.

**Deterministic Evidence To Check On Return**

Check these concrete items before accepting the worker result:

1. The exact `package.json` entry for `script.npm.stop`, including file path and line reference.
2. The literal command string behind that script.
3. Whether that command delegates to another package script, shell script, Node entrypoint, or tool like `turbo`, `pnpm`, `pkill`, `docker`, `systemctl`, etc.
4. The existence of every referenced file/script/command target in-repo.
5. Whether the worker distinguishes static inspection from execution.
6. Whether any claim about side effects is tied to source evidence rather than script naming.
7. Whether the worker stayed within one coherent task and did not generalize from `package.json` to overall service shutdown behavior without tracing the chain.
8. Whether the worker reported `not_executed` consistently and did not imply runtime validation.
9. Whether the worker noted unknowns explicitly: auth requirement, external process impact, cross-package effects, and environment dependencies.
10. Whether any risk statement is anchored to deterministic text i

### Path 4 `script.npm.test:e2e` status=`completed`
- File: `package.json`
- Elapsed seconds: `28.667`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`28.664`

#### Worker Output

## Fissure Review: `script.npm.test:e2e`

### Selected Surface
**File**: `package.json` (line 16)  
**Surface**: npm script `test:e2e` → `playwright test`  
**Status**: Non-destructive, unchanged  
**Execution**: Not executed (baseline scan only)

---

### Findings

#### ✅ Script definition is safe
The npm script itself is clean and non-destructive — it runs Playwright tests as expected.

#### ⚠️ Environment mutation in test cleanup
The related hazards all point to proper **test teardown** in `codex.test.ts:172–178`:

```typescript
finally {
  if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = prevGithub;
  if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
  else process.env.CLAUDE_CODE_SESSION = prevClaude;
  if (prevCodex === undefined) delete process.env.CODEX_HOME;
  else process.env.CODEX_HOME = prevCodex;
}
```

**Assessment**: This is correct test cleanup. The test:
1. Saves original env state (lines 158–160)
2. Injects test values (lines 162–164)
3. Asserts the engine strips secrets from spawned subprocesses (lines 166–171)
4. Restores pre-test state in `finally` (lines 172–178)

The conditional deletes ensure environment variables are restored exactly as they were before the test ran — this is standard isolation practice.

---

### Recommended Validation

| Item | Approach |
|------|----------|
| **Test isolation** | Verify the test passes when run standalone and in sequence with other codex tests. The finally block should prevent leakage to peers. |
| **Environment inheritance** | Run `npm run test:e2e` in a fresh shell (unset `GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, `CODEX_HOME`) to confirm the test doesn't assume these exist. |
| **Subprocess verification** | Spot-check the CodexEngine implementation (referenced in the test) to confirm it actually filters these secrets from child process env, not just at test assertion time. |

**Risk Level**: Low. The cleanup pattern is sound; mutation is i
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays on one question: what `script.npm.test:e2e` in `package.json` actually points to, whether it is runnable as declared, and what deterministic evidence in the repo supports that conclusion. It becomes unbounded if the worker drifts into judging overall E2E quality, CI readiness, environment setup beyond what the script references, or behavior of external services it cannot execute.

The worker prompt is at moderate risk of overclaiming because the selected surface is only a detected package script, `deterministic_result` is `not_executed`, and the surface metadata does not include the resolved command, target files, or auth/runtime prerequisites. The main failure mode is language like “the E2E suite works/is broken/is safe” when the worker has only inspected static references. Safe claim shape is narrower: “the script resolves to X”, “X references these files/configs”, “these prerequisites are documented or missing”, and “execution was not performed.”

Deterministic evidence to check when the worker returns:
- The exact `package.json` entry for `test:e2e`.
- Whether the script delegates to `pnpm`, `turbo`, a local binary, or a package runner, and the exact command string.
- Existence of every referenced config/script/file path.
- Presence of the corresponding package workspace if the script uses filtering or workspace-relative commands.
- Whether the referenced test framework is actually declared in dependencies/devDependencies where expected.
- Whether repo docs or CI configs mention the same E2E command and prerequisites consistently.
- Whether the script is dry-run safe or obviously depends on external state such as credentials, browsers, servers, or services.
- Any mismatch between the worker’s claim and the repo state: missing files, stale script names, nonexistent package filters, or undocumented env vars.

What would be needed to safely resume if this is the only output:
- The worker’s actual prompt.


### Path 5 `script.npm.nuke` status=`completed`
- File: `package.json`
- Elapsed seconds: `63.799`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`27.826`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

### Fissure Worker Path Review

**Path Index:** 5/40  
**Selected Surface:** `script.npm.nuke` (defined in [package.json](file:///home/ericl/Work/vscode/public_share/jinn/package.json))  
**Execution Status:** `not_executed` (dry run / planned execution only)  

---

### Findings & Risk Areas

#### 1. Destructive File/Directory Deletion (High Risk)
- **Description:** The `nuke` script delegates to `jinn.js nuke` (implemented in [nuke.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/nuke.ts)). This command permanently deletes instance registry records and wipes the corresponding home directories on disk via `fs.rmSync(safeHome, { recursive: true, force: true })`.
- **Evidence:** 
  - [nuke.ts:L131-134](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/nuke.ts#L131-L134):
    ```typescript
    if (fs.existsSync(safeHome)) {
      fs.rmSync(safeHome, { recursive: true, force: true });
    }
    ```
- **Risk:** If the path verification logic in `assertSafeManagedInstanceHome` or `assertSafeDestructiveHome` is bypassed or flawed, this could recursively delete arbitrary directories (e.g., user home directory, repository root) if misconfigured.

#### 2. Test Environment Side-Effects & Shared State Leakage (Medium Risk)
- **Description:** The related hazards indicate that tests dynamically modify and delete critical process environment variables (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, `CODEX_HOME`) in a shared `process.env` object.
- **Evidence:** 
  - [codex.test.ts:L172-179](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L172-L179):
    ```typescript
    } finally {
      if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = prevGithub;
      ...
    }
    ```
- **Risk:** Because `process.env` is global to the Node.js process, modifying these variables concurrently during parallel test execution can lead to flaky test runs, race
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker is restricted to `package.json` and specifically to the `script.npm.nuke` surface. The selected surface metadata says `kind=cli_command`, `diff_status=unchanged`, `planned_execution=dry_run_not_executed`, `mutates_state=false`, and `destructive=false`, but the script name `nuke` is a clear semantic red flag. The main boundary risk is prompt drift from “review one path” into broader repo claims about safety, behavior, or reachability.

The worker prompt is moderately likely to overclaim unless constrained. Reasons:
- `package.json` script review often invites inferred behavior from script names without resolving the actual command string.
- `deterministic_result=not_executed` means any statement about runtime effects, auth, side effects, or environmental requirements would be speculative unless backed by static evidence.
- `auth_required=unknown` and `input_schema_ref=null` mean the worker should not claim either safe execution or no-auth operation.
- If the worker only sees detector metadata and not the concrete `package.json` script value, any conclusion beyond “needs source inspection” would be weak.

**Deterministic evidence to check when the worker returns**
- The exact `package.json` entry for `script.npm.nuke`.
- Whether the script exists at all, and whether its name maps exactly to the selected surface.
- The literal command string bound to `nuke`.
- Any referenced local files or scripts invoked by that command, such as shell scripts, Node entrypoints, or turbo/pnpm targets.
- Whether the command transitively calls destructive operations like `rm -rf`, `git clean`, Docker volume deletion, cache removal, or environment resets.
- Whether the command is actually non-mutating as the surface metadata claims, or whether that field is only detector inference.
- Whether the command requires auth, secrets, network, or local runtime state.
- Whether there are platform guards or environment-variable gates that chang

### Path 6 `cli.argparse.kokoro_sidecar` status=`completed`
- File: `packages/jinn/src/talk/kokoro_sidecar.py`
- Elapsed seconds: `28.842`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`28.84`

#### Worker Output

# Fissure Worker Review

**Target Path Index:** 6 / 40
**Selected Surface:** `cli.argparse.kokoro_sidecar`
**Target File:** [/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py) (Line 160)

---

### Findings & Risk Areas

#### 1. Uncaught `ValueError` in CLI Port Default Parsing
* **Evidence:** [kokoro_sidecar.py:L161](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py#L161)
  ```python
  parser.add_argument("--port", type=int, default=int(os.environ.get("KOKORO_PORT", "8765")))
  ```
* **Risk:** If the environment variable `KOKORO_PORT` is set but is not a valid integer (e.g. empty string or a non-numeric string), `int(...)` raises a `ValueError` immediately upon execution, causing the process to crash before argument parsing or error handling runs.

#### 2. Fragile Default `--model-dir` Resolution via `os.getcwd()`
* **Evidence:** [kokoro_sidecar.py:L162](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py#L162)
  ```python
  parser.add_argument("--model-dir", default=os.environ.get("KOKORO_MODEL_DIR", os.getcwd()))
  ```
* **Risk:** Using `os.getcwd()` makes the default directory search dependent on the current working directory of the caller. If the parent process spawns the sidecar from the repository root instead of the sidecar's directory, it will fail to locate the model/voice files and output `KOKORO_SIDECAR_MODEL_DIR_MISSING`.

#### 3. Standard Exit Behavior of `argparse` on Unknown Parameters
* **Evidence:** [kokoro_sidecar.py:L165](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py#L165)
  ```python
  args = parser.parse_args()
  ```
* **Risk:** Because this script is spawned programmatically, any unexpected or malformed command-line argument will trigger `argparse`'s default behavior: printing to stderr and calling `sys
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays narrow: review `packages/jinn/src/talk/kokoro_sidecar.py` as a local Python CLI entrypoint and describe only what is statically evident there. The selected surface metadata is slightly misleading because the detector pinned `line 160`, but the actual CLI surface spans `main()` and its interaction with the rest of the file, roughly [packages/jinn/src/talk/kokoro_sidecar.py](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:158) through [packages/jinn/src/talk/kokoro_sidecar.py](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:191), plus the HTTP handlers and lazy model loading those flags control.

Overclaim risk is moderate to high if the worker is loose. Likely failure modes:
- Treating this as a generic `argparse` surface and missing that it starts a long-running localhost HTTP server.
- Claiming auth, destructive behavior, or state mutation beyond what is visible. The file shows no auth and no persistent writes; it does serve requests and load model files.
- Claiming the `--voice` flag affects synthesis. In this file it is parsed but never used after `parse_args()`, so any claim that it changes default runtime voice would be unsupported.
- Claiming warm mode guarantees readiness. `--warm` only attempts `_load_model()` and still serves even after failure.
- Claiming exact dependency/runtime success. `kokoro_onnx` import and model file presence are deferred and unverified here.

Deterministic evidence to check when the worker returns:
- It should identify the actual CLI args from [kokoro_sidecar.py:160](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:160) to [kokoro_sidecar.py:164](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:164): `--port`, `--model-dir`, `--voice`, `--warm`.
- It should note that `--voice` is currently unused after parsing; there is no assignment fr

### Path 7 `script.npm.lint` status=`completed`
- File: `package.json`
- Elapsed seconds: `73.912`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`73.91`

#### Worker Output

**Findings**
- **`pnpm lint` is effectively a no-op gate right now.** The root script only delegates to `turbo lint` ([`package.json:12`](./package.json#L12)), but Turbo’s `lint` task is empty ([`turbo.json:15`](./turbo.json#L15)) and neither workspace package defines a `lint` script ([`packages/jinn/package.json:20-27`](./packages/jinn/package.json#L20-L27), [`packages/web/package.json:5-12`](./packages/web/package.json#L5-L12)). Result: the repository can report “lint passed” without actually linting any files.

**Evidence**
- Root script: [`package.json:12`](./package.json#L12)
- Turbo task config: [`turbo.json:15`](./turbo.json#L15)
- No package-level lint script in CLI package: [`packages/jinn/package.json:20-27`](./packages/jinn/package.json#L20-L27)
- No package-level lint script in web package: [`packages/web/package.json:5-12`](./packages/web/package.json#L5-L12)

**Recommended validation**
- Run `pnpm lint` and confirm Turbo reports zero tasks, not just exit code 0.
- Add explicit `lint` scripts per package or remove the root lint gate until real checks exist.
- If the intent is to catch test-time env mutation risks like the `process.env` cleanup in `packages/jinn/src/engines/__tests__/codex.test.ts`, add a dedicated test or typecheck gate; lint will not cover that class of issue.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays strictly on `script.npm.lint` as declared by `selected_surface.surface_id` and evaluates only whether the repo’s `lint` package script is a valid, non-destructive validation surface. The current record supports that scope: `kind=validation_script`, `destructive=false`, `mutates_state=false`, `diff_status=unchanged`, and `planned_execution=dry_run_not_executed`. Scope creep risk appears if the worker starts treating this as a general repo audit instead of a single-surface review.

Overclaim risk is moderate. The worker could easily overstate:
- That `pnpm lint` is safe to run, without verifying the actual `package.json` script body.
- That the surface is deterministic, without checking whether the lint script shells out to dynamic tools, writes caches, runs codegen, or depends on environment/auth.
- That the script exists and maps cleanly to the selected surface, since `deterministic_result` is still `not_executed` and no line/file evidence beyond `package.json` has been captured yet.

Deterministic evidence to require when the worker returns:
- Exact `package.json` entry for the root `lint` script, with file path and line reference.
- If `lint` delegates, the exact downstream command chain, including any Turborepo targets and per-package lint scripts.
- Evidence whether any invoked command writes files, caches, or generated outputs.
- Evidence whether auth, network, daemon state, or local runtime state is required.
- Confirmation that the surface remains non-destructive and unchanged in git state.
- If the worker makes any claim about expected behavior, it should tie that claim to checked script definitions, not assumptions from naming.

Minimum safe acceptance criteria for the worker’s report:
- Observed behavior: what `lint` resolves to.
- Expected behavior: why that qualifies as a validation script.
- Residual risk: anything unverified because execution did not occur.

If this watchdog report is the onl

### Path 8 `script.npm.setup:force` status=`completed`
- File: `package.json`
- Elapsed seconds: `54.915`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`21.985`

#### Worker Output

## Fissure Review: `script.npm.setup:force`

**Path:** `package.json` (line 20) — `setup:force` npm script  
**Status:** Not executed; baseline variant  
**Selection weight:** 1.1 (low significance)

---

### Script Definition
```json
"setup:force": "pnpm build && node packages/jinn/dist/bin/jinn.js setup --force",
```

### Findings

**No bugs found in the script definition itself.** The command composition (`pnpm build && node ...`) is safe: the `&&` operator correctly chains operations with implicit error propagation.

However, **related environment variable cleanup code** in the test suite (codex.test.ts, lines 173–177) shows three sensitive vars being deleted:
- `GITHUB_TOKEN`
- `CLAUDE_CODE_SESSION`
- `CODEX_HOME`

These deletion operations are **correctly implemented** — they save the prior state, restore it in a `finally` block, and only delete if the var was undefined before the test. This is standard test isolation.

---

### Risk Areas (from context, not the script itself)

1. **Environment assumptions:** The `jinn setup --force` command interacts with auth/session environment variables. If `setup:force` is run in an environment where these vars are pre-set, the `--force` flag's behavior with respect to existing credentials should be validated.

2. **Unclear `--force` semantics:** The script passes `--force` to the setup command, but the implications are not visible here — e.g., does it bypass confirmation prompts, overwrite existing configs, or reset credentials? This should be documented or tested.

---

### Recommended Validation

- [ ] Verify behavior of `pnpm run setup:force` when `GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, or `CODEX_HOME` are already set
- [ ] Confirm `--force` flag semantics and document in README/help text
- [ ] Check that build failures during `pnpm build` are clearly reported to the user (not silent)
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`32.929`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays on the single selected surface: root `package.json` script `setup:force`, its direct target `packages/jinn/bin/jinn.ts`, and the implementation `packages/jinn/src/cli/setup.ts`. It becomes unbounded if the worker drifts into general setup behavior, engine installation, onboarding UX, or runtime behavior outside the `--force` path.

The prompt has a real overclaim risk because the scan metadata underdescribes the surface. `selected_surface.destructive=false` and `mutates_state=false` are not consistent with the repo code. Deterministic repo evidence shows:
- `package.json` defines `setup:force` as `pnpm build && node packages/jinn/dist/bin/jinn.js setup --force`.
- `packages/jinn/bin/jinn.ts` defines `jinn setup --force` as “Delete existing home dir and reinitialize from scratch”.
- `packages/jinn/src/cli/setup.ts` executes `fs.rmSync(safeHome, { recursive: true, force: true })` when `opts.force` is set.
- `packages/jinn/src/cli/__tests__/script-surface-map.test.ts` already classifies `setup:force` as destructive.

That means the worker should not claim this surface is safe, read-only, or non-mutating merely because this run was `not_executed`. The correct narrow claim is: this specific run did not execute, but the reviewed surface is inherently destructive and state-mutating if invoked.

**Deterministic Evidence To Check On Return**

Check that the worker’s report is anchored to these facts:
1. `package.json` root script string contains `setup --force`.
2. The script also contains `pnpm build`, so it is not a pure probe; it writes build artifacts before setup.
3. `packages/jinn/bin/jinn.ts` exposes `.option("--force", "Delete existing home dir and reinitialize from scratch")`.
4. `packages/jinn/src/cli/setup.ts` actually deletes `JINN_HOME` under `opts.force`.
5. `packages/jinn/src/cli/instances.ts` uses `assertSafeDestructiveHome`, so deletion is guarded but still destructive.
6. Existing regression test 

### Path 9 `script.npm.start` status=`completed`
- File: `package.json`
- Elapsed seconds: `164.716`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`152.412`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

Please wait a brief moment while the background search completes.
Please wait while we locate the codebase files for more context.
### Fissure Worker Review Summary

**Run ID**: `FRUN-20260625-085953`  
**Path Index**: `9` of `40`  
**Selected Surface**: `script.npm.start` in [package.json](file:///home/ericl/Work/vscode/public_share/jinn/package.json#L21) (`pnpm clean && pnpm build && node packages/jinn/dist/bin/jinn.js start`)  
**Execution Status**: **Not Executed** (Dry Run / Planned Execution)

---

### 1. Risk Analysis & Evidence

#### Target Codebase Surface Context
The selected surface launches the `jinn` runner via the start script:
```json
"start": "pnpm clean && pnpm build && node packages/jinn/dist/bin/jinn.js start"
```
The test environment at [packages/jinn/src/engines/__tests__/codex.test.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L156-L181) tests how the engine manages env variables.

#### Identified Hazards & Risks
The `related_hazards` array highlights environment pollution cleanup blocks in the `CodexEngine — child process environment` unit test block:
```typescript
173:       if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
174:       else process.env.GITHUB_TOKEN = prevGithub;
175:       if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
176:       else process.env.CLAUDE_CODE_SESSION = prevClaude;
177:       if (prevCodex === undefined) delete process.env.CODEX_HOME;
178:       else process.env.CODEX_HOME = prevCodex;
```

* **No Production Code Side-Effects**: These modifications to `process.env` occur strictly within a `finally` block of a unit test in [codex.test.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L156-L181) to restore the environment for subsequent tests.
* **Non-destructive Operation**: The code uses standard node environment restoration patterns (restoring previous values or delet
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker is restricted to reviewing the `package.json` surface tied to `script.npm.start` and does not drift into runtime behavior claims about the daemon, dashboard, or package scripts it has not inspected. Based on the payload, the selected surface is narrow: one package script discovered statically, `deterministic_result` is `not_executed`, and `planned_execution` is `dry_run_not_executed`. That means the worker should only make file-backed statements about how `start` is declared, where it points, and any immediately visible risks from that declaration.

The main overclaim risk is high if the worker prompt does not force evidence discipline. With no execution and no auth/destructive verification, the worker must not claim that `npm start` works, fails, is safe, launches a specific service, requires credentials, mutates state, or matches documented behavior unless those points are directly supported by repository files. It also should not generalize from the script name alone; `start` is often a thin wrapper around another workspace command.

**Deterministic evidence to check when the worker returns**

1. Confirm the worker cited the exact `package.json` entry for `start` and its literal command string.
2. Confirm whether the worker identified which package `package.json` this is from, since repo root vs package-level meaning is materially different.
3. Check whether the command delegates to `pnpm`, `turbo`, a local binary, or another script, and whether the worker traced only one step further using file evidence.
4. Verify any claims about affected package(s) against workspace files such as root `package.json`, `pnpm-workspace.yaml`, and `turbo.json` if referenced.
5. Reject any claim about runtime success, port binding, auth needs, side effects, or external dependencies unless the worker cites explicit code or docs showing that.
6. Reject any claim that the surface is non-destructive or non-mutating beyond the curre

### Path 10 `script.npm.jinn` status=`completed`
- File: `package.json`
- Elapsed seconds: `138.967`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`138.964`

#### Worker Output

I will wait for the background search for `codex.test.ts` to finish so we can find where the codebase is located.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task appears bounded if the worker is constrained to the single discovered surface `script.npm.jinn` in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json). The selected surface is low-significance, non-destructive, marked `mutates_state: false`, and the planned execution is `dry_run_not_executed`, so the review scope should stay narrow: identify what the `jinn` package script is, what it invokes, and whether that script is safe and correctly described.

The main risk is overclaiming. The worker model is a low-tier fast model, the deterministic result is `not_executed`, and there is no evidence that the script or its target command actually ran. Any claim about runtime behavior, auth requirements, side effects, or successful execution would be unsupported unless the worker cites direct static evidence from repo files. It should not infer more than the script text, referenced files, and any clearly documented behavior in repo docs.

Deterministic evidence to check when the worker returns:
- The exact `scripts` entry in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json) for `jinn`.
- Any referenced executable or entrypoint file resolved from that script, with file paths cited.
- Whether the script is a thin alias to `pnpm`, `turbo`, `node`, or a local bin, and whether that mapping is evidenced in repo files.
- Any static indicators of auth, mutation, or external calls in the resolved entrypoint.
- Whether the worker clearly distinguishes observed static facts from inferred runtime behavior.
- Whether the worker avoids claiming execution, success, safety, or idempotence given `deterministic_result: not_executed`.

If this watchdog report is the only model output, safe resume would require:
1. The exact worker prompt that was sent.
2. The relevant `package.json` script contents.
3. Any files transitively referenced by that script.
4. The worker’s returned assessment, so its claims can be checked against the

### Path 11 `script.npm.setup` status=`completed`
- File: `package.json`
- Elapsed seconds: `226.669`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`226.666`

#### Worker Output

Static review only; the selected `package.json` script was not executed.

**Findings**
- Medium: `setup` is a stateful bootstrap, not a safe probe. The root script chains `pnpm build && node packages/jinn/dist/bin/jinn.js setup` ([package.json](/home/ericl/Work/vscode/public_share/jinn/package.json#L19)), the repo classifies it as `mutates_state: true`, `interactive: true` on fresh install, and only conditionally safe for unattended use ([docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md#L34), [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md#L38)), and the CLI switches into a prompt-driven branch when stdin is a TTY and `config.yaml` is missing ([packages/jinn/src/cli/setup.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/setup.ts#L466)). Risk: automation can block on input or mutate a real home directory if it treats this as a read-only setup check.
- Low/Medium: the root script hard-couples home initialization to the full monorepo build. Because `setup` always runs `pnpm build` first ([package.json](/home/ericl/Work/vscode/public_share/jinn/package.json#L10), [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json#L19)), any unrelated workspace build failure or missing web artifact prevents `~/.jinn` bootstrap from starting. Risk: first-run setup inherits the entire build surface instead of just the CLI/bootstrap surface.

**Recommended validation**
- Run `pnpm setup` only with an isolated `JINN_HOME` and non-TTY stdin; confirm it does not prompt and only writes into the temp home.
- Verify whether a failing web/workspace build is intended to block initialization; if not, split bootstrap from build or add a dedicated setup path that does not depend on the full monorepo build.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.001`

#### Supervisor Output

**Watchdog Report**

The task appears bounded. The selected surface is a single `package.json`-discovered CLI script, `script.npm.setup`, with `planned_execution: dry_run_not_executed`, `destructive: false`, `mutates_state: false`, and unchanged diff status. That limits the worker’s legitimate scope to reviewing the `setup` script definition and any directly referenced local files or docs needed to understand what it would do. It should not drift into broader repo health, unrelated scripts, or runtime behavior claims that were not exercised.

The main overclaim risk is high enough to watch for. The worker model may imply what `npm/pnpm setup` “does,” whether it is safe, idempotent, or auth-free, without actual execution. The metadata already says `deterministic_result: not_executed` and `auth_required: unknown`, so any claims about successful behavior, side effects, network access, credential requirements, environment setup, or cross-package outcomes would need hard evidence from static inspection only. Acceptable claims are limited to what is directly visible in `package.json`, lockstep script references, and nearby documentation.

Deterministic evidence to check when the worker returns:
- Exact `package.json` entry for `script.npm.setup`: script string, workspace/package location, and whether it is `npm` or `pnpm` oriented.
- Any directly referenced executable targets: local JS/TS files, shell scripts, package binaries, or chained scripts invoked by `setup`.
- Whether the script is purely local orchestration or shells out to external tools.
- Whether it transitively invokes install/build/test/lint/dev/bootstrap commands.
- Any statically visible state mutation points: file writes, config generation, environment exports, cache/bootstrap directories.
- Any statically visible auth/network indicators: login commands, API keys/env vars, registry access, remote downloads, `curl/wget`, package install steps.
- Whether the repo docs mention a canonical setup flow and whet

### Path 12 `script.npm.test:watch` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `41.169`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`21.913`

#### Worker Output

## Review: `script.npm.test:watch` from `packages/web/package.json`

### Selected Surface
- **File**: `packages/web/package.json:11`
- **Script**: `"test:watch": "vitest"`
- **Status**: Unchanged, non-destructive, low significance (0.1)

### Findings

**✓ No direct bugs in the selected surface.** The script is a standard Vitest watch-mode invocation with no destructive operations or state mutations.

### Related Hazards in `packages/jinn/src/engines/__tests__/codex.test.ts` (HIGH severity)

Lines 173–178 contain **environment variable cleanup via `delete`** in a test finally-block:
```javascript
if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
if (prevCodex === undefined) delete process.env.CODEX_HOME;
```

**Risk areas**:
1. **Test isolation fragility**: If test execution crashes or times out before the finally-block, env vars remain modified, contaminating subsequent test runs.
2. **Process.env mutation during watch mode**: In watch mode, the Node process persists across file changes; destructive env cleanup can leak across test re-runs if exception handling fails.
3. **Implicit cleanup contract**: The code relies on `prevGithub/prevClaude/prevCodex` being captured before mutation; if the setup code is refactored, cleanup may reference stale or undefined variables.

### Recommended Validation

1. **For `test:watch` in packages/web**: No action needed — script is benign.**
2. **For codex.test.ts cleanup**: 
   - Verify test suite handles exceptions during env restoration (e.g., try/catch wrapping the finally-block or using afterEach hooks).
   - Confirm watch-mode re-execution does not accumulate env-var side effects across file changes.
   - Consider safer restoration: `process.env.X = prevX ?? undefined` instead of conditional delete.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`19.254`

#### Supervisor Output

**Boundedness**

This task is bounded only if the worker stays local to the selected surface: [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json) defines `"test:watch": "vitest"`, and [`docs/script-surface-map.md`](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:216) already classifies it as interactive watch mode. The worker should assess the script definition, whether the surface metadata matches the file, and whether any claim about execution is supported. It becomes unbounded if the worker starts reviewing the whole web test suite, Vitest behavior outside this repo, or broader package-script policy.

**Overclaim Risk**

The overclaim risk is high. The run metadata says `deterministic_result: not_executed` and `planned_execution: dry_run_not_executed`, while this surface is an interactive watcher, not a finite deterministic command. A weak worker prompt is likely to overstate:
- that the command is safe to automate end-to-end
- that tests passed, failed, or are green
- that `auth_required`, side effects, or mutability were empirically verified
- that the script is suitable for CI, when the repo’s authoritative validation uses `pnpm test`, not `test:watch` per [`AGENTS.md`](/home/ericl/Work/vscode/public_share/jinn/AGENTS.md)

Safe claims are limited to static facts visible in-repo: the script string, its interactive nature, and any documented classification.

**Deterministic Checks On Return**

Check that the worker’s output is anchored to these exact facts:
- [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json) contains `"test": "vitest run"` and `"test:watch": "vitest"`.
- [`docs/script-surface-map.md:216`](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:216) describes `test:watch` as interactive and blocking.
- [`AGENTS.md`](/home/ericl/Work/vscode/public_share/jinn/AGENTS.md) lists authoritative validation as `pnpm test`, not 

### Path 13 `script.npm.postinstall` status=`completed`
- File: `package.json`
- Elapsed seconds: `26.75`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`13.508`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

### Fissure Path Review (Path Index 13)

**Execution Status**: **Not Executed** (Planned execution status: `dry_run_not_executed`).

---

### 1. Findings & Risk Areas

* **Host Environment Mutation Risk**: The test suite in `packages/jinn/src/engines/__tests__/codex.test.ts` directly mutates global state (`process.env`) by deleting environment variables (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, `CODEX_HOME`) when they are undefined in the pre-test context. 
* **Potential CLI/Postinstall Interference**: If `postinstall` or other NPM hooks invoke processes that trigger these tests or share similar lifecycle state, active developer tokens or session credentials in the shell environment may be deleted or modified unexpectedly, disrupting CLI usage or CI/CD pipelines.

---

### 2. Evidence

From `packages/jinn/src/engines/__tests__/codex.test.ts`:
* **Line 173**: `if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;`
* **Line 175**: `if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;`
* **Line 177**: `if (prevCodex === undefined) delete process.env.CODEX_HOME;`

---

### 3. Recommended Validation

1. **Verify NPM Postinstall Behavior**: Inspect the `postinstall` script in `package.json` to ensure it does not inadvertently invoke test suites or scripts that mutate environment variables.
2. **Implement Safe Environment Mocking**: Refactor `packages/jinn/src/engines/__tests__/codex.test.ts` to use safe environment stubbing (e.g., using test framework helpers or object cloning) instead of mutating the global `process.env` object directly.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.112`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays strictly on `package.json` and the single discovered surface `script.npm.postinstall`. It is not bounded if the worker generalizes from the detector metadata into repo-wide claims about install behavior, runtime side effects, or security posture without reading the actual script target and any directly referenced command/file.

Overclaim risk is moderate to high. The selected surface is weakly significant (`significance: 0.1`), the deterministic result is `not_executed`, and the worker model is a low-tier flash model. That combination makes unsupported claims likely in three places:
- Claiming what `postinstall` does without quoting the exact `package.json` entry.
- Claiming safety or harmlessness without tracing the invoked command to its implementation.
- Claiming non-mutating behavior from metadata alone, even though `postinstall` scripts commonly write files or trigger builds.

Deterministic evidence to check when the worker returns:
- The exact `package.json` `postinstall` script value for `surface_id: script.npm.postinstall`.
- Whether the worker identified the concrete command chain accurately, including package manager wrappers like `pnpm`, `turbo`, `node`, `tsx`, or shell scripts.
- The exact target files/scripts referenced by that command, with paths.
- Whether those target files exist and match the worker’s description.
- Whether the worker distinguished observed facts from inferences, especially for auth, mutation, and destructiveness.
- Whether the worker avoided execution claims, since `planned_execution` is `dry_run_not_executed` and `deterministic_result` is `not_executed`.
- Whether any claim about side effects is backed by static evidence from the called script body rather than package metadata alone.

Failure conditions to flag in the worker output:
- “The postinstall is safe” or similar without code-path evidence.
- “It does nothing important” without inspecting the referenced command.


### Path 14 `script.npm.typecheck` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `13.949`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`12.672`

#### Worker Output

### Fissure Worker Review Summary

**Path Index:** 14 of 40  
**Run ID:** FRUN-20260625-085953  
**Selected Surface:** `script.npm.typecheck` in [packages/web/package.json](file:///packages/web/package.json)  
**Execution Status:** **Not Executed** (`dry_run_not_executed`)

---

### 1. Risk Areas & Candidate Bugs

*   **Destructive Environment Cleanup Hazards:**  
    The engine test suite `codex.test.ts` deletes critical environment variables (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, and `CODEX_HOME`) during process execution.
*   **Concurrency and State Leakage Risks:**  
    If validation tasks (like `typecheck`) or concurrent testing jobs run in the same persistent process environment or shared CI executor, deleting these key tokens/homes can disrupt authentications, package installations (e.g. from private GitHub registries), and codex lookup tasks.

---

### 2. Supplied Evidence

*   **[packages/jinn/src/engines/__tests__/codex.test.ts:L173](file:///packages/jinn/src/engines/__tests__/codex.test.ts#L173):**
    ```typescript
    if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
    ```
*   **[packages/jinn/src/engines/__tests__/codex.test.ts:L175](file:///packages/jinn/src/engines/__tests__/codex.test.ts#L175):**
    ```typescript
    if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
    ```
*   **[packages/jinn/src/engines/__tests__/codex.test.ts:L177](file:///packages/jinn/src/engines/__tests__/codex.test.ts#L177):**
    ```typescript
    if (prevCodex === undefined) delete process.env.CODEX_HOME;
    ```

---

### 3. Recommended Validation

1.  **Environment Isolation Verification:**  
    Verify that validation tasks (e.g., `npm run typecheck`) and the test suite are run in completely isolated/sandboxed processes to prevent environment variables mutated by one task from impacting another.
2.  **Mock Environment Variables:**  
    Refactor test files to use a helper context or a copy of `process.env` during test execution inst
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`1.274`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays on the selected surface: `packages/web/package.json`, specifically the `script.npm.typecheck` validation script entry discovered by the package-scripts detector. It becomes unbounded if the worker drifts into repo-wide typecheck behavior, Turborepo wiring, or claims about runtime behavior outside that file.

The worker prompt is somewhat likely to overclaim because the selected surface is a *script record*, but the authoritative behavior for `typecheck` may also depend on:
- the actual script text in `packages/web/package.json`
- root `package.json` script delegation
- Turbo configuration
- `tsconfig` files and package graph
- whether execution was actually performed

Since `deterministic_result` is `not_executed`, the worker must not claim that typechecking passes, fails, is wired correctly end-to-end, or is unused unless it cites file evidence only.

**What to check when the worker returns**

Deterministic evidence should be limited to verifiable file facts:

1. `packages/web/package.json`
   - Confirm the `scripts` entry for `typecheck` exists or does not exist.
   - Record the exact command string.
   - Verify whether the selected surface `script.npm.typecheck` actually maps to this file.

2. Repo root `package.json`
   - Check whether root `pnpm typecheck` delegates through Turbo as stated in `AGENTS.md`.

3. `turbo.json` or equivalent repo task config
   - Confirm whether `typecheck` is a defined pipeline task.

4. `packages/web/tsconfig*.json`
   - Confirm the package has TypeScript configuration supporting the script.

5. Neighboring docs/instructions
   - Ensure any worker conclusion is consistent with `AGENTS.md` validation guidance and does not invent execution results.

**Reject or flag the worker output if it does any of the following**
- Claims the script was executed.
- Claims the script succeeds or fails.
- Claims repo-wide typecheck semantics from only `packages/web/package.json`.
- Infers

### Path 15 `script.npm.status` status=`completed`
- File: `package.json`
- Elapsed seconds: `102.911`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`78.348`

#### Worker Output

No execution was performed on the selected surface. One candidate risk area is visible from static evidence:

- `status` is coupled to a generated artifact and can fail on a clean workspace. The root script runs `node packages/jinn/dist/bin/jinn.js status` directly, while the package build step is what creates `dist`. There is no prebuild or fallback in the `status` script itself, so a fresh clone, `pnpm clean`, or any state where `packages/jinn/dist` is absent will make the command fail even though it is meant to be a read-only status check.  
  Evidence: [`/home/ericl/Work/vscode/public_share/jinn/package.json`]( /home/ericl/Work/vscode/public_share/jinn/package.json ) `scripts.status`; [`/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json`]( /home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json ) `scripts.build`.  
  Recommended validation: run the script from a workspace with `packages/jinn/dist` removed, and verify whether `pnpm status` either fails cleanly with a clear message or is updated to build/resolve the CLI entrypoint first.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`24.561`

#### Supervisor Output

**Watchdog Report**

The task is bounded, but only if the worker stays on the concrete surface `npm script -> jinn status` and does not drift into general gateway-health claims. The script is defined as `node packages/jinn/dist/bin/jinn.js status` in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:24), wired to `runStatus()` in [packages/jinn/dist/bin/jinn.js](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/dist/bin/jinn.js:53), with the actual behavior implemented in [packages/jinn/src/cli/status.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/status.ts:1).

The main overclaim risk is that the detector label "`status`" looks harmless and deterministic, but the command is only partially static. It reads local runtime state (`JINN_HOME`, PID file, config), calls `getStatus()`, and may fetch `http://<host>:<port>/api/status` for live details. A worker should not claim that the gateway is running, stopped, unauthenticated, or fully validated unless it either executed the command and captured stdout/exit code or cited the implementation precisely. It also should not imply that `auth_required: unknown` means auth is involved here; from the code shown, the CLI itself does not prompt for auth and the `/api/status` probe is attempted without credentials.

**Deterministic evidence to check when the worker returns**

Check that the worker’s report matches the actual code path:

1. Script target is exactly `node packages/jinn/dist/bin/jinn.js status`.
2. `status` dispatches to `runStatus()`, not to some other subcommand.
3. `runStatus()` has these mutually exclusive top-level outcomes:
   - If `JINN_HOME` does not exist: prints `Gateway is not set up. Run "jinn setup" first.`
   - If `getStatus().error`: prints `Gateway: error` plus the error line.
   - If `!status.running`: prints `Gateway: stopped`, optionally the stale PID line.
   - If running: prints `Gateway: running`, PID, optional uptime, then optional port/session/serv

### Path 16 `script.npm.test` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `40.904`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`40.901`

#### Worker Output

---

## Fissure Worker Review: `packages/web` npm test script

**Selected Surface**: `script.npm.test` in `packages/web/package.json:10`  
**Command**: `vitest run`  
**Status**: Unchanged, not executed (dry_run_not_executed)

### Findings

**No direct risks in selected surface.** The test script is a standard validation runner:

- ✓ Command is `vitest run` — standard non-destructive test execution
- ✓ Test environment (jsdom) and setup (localStorage polyfill) are safe
- ✓ Test suite uses standard mocking (`vi.fn()`, `vi.stubGlobal()`) with no destructive operations
- ✓ No environment variable deletion, filesystem mutations, or credential handling detected in `packages/web/src/**/*.test.ts`

### Context on Related Hazards

The **related_hazards list** flags environment variable deletions in `packages/jinn/src/engines/__tests__/codex.test.ts` (lines 173–177). These hazards are **not related to the selected web package** — they are in a sibling package's test teardown. They do not execute when running `npm test` in `packages/web`.

### Recommended Validation

1. **Dry run scope**: The `vitest run` command is safe to execute without environment pollution or pre-check needed.
2. **Cross-package isolation**: Confirm that `packages/web` tests do not import or depend on `packages/jinn` test fixtures (particularly `codex.test.ts`).
3. **Setup inspection**: If future test failures occur, verify the jsdom/vitest setup (line 8–12 of vitest.config.ts) handles React 19 globals correctly.

**Risk level**: Low. No candidate bugs found in this surface.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task appears bounded if the worker is limited to the single discovered surface: `packages/web/package.json`, specifically the `script.npm.test` entry. That is a narrow review target. It becomes unbounded if the worker treats “test” as permission to assess the whole web package, runtime behavior, or repository-wide validation posture.

The main overclaim risk is high unless the worker is explicitly constrained. This surface only proves what the `test` script string is in `package.json`; it does not by itself prove:
- that the script succeeds,
- that the underlying test suite exists or is meaningful,
- that the script is wired correctly in the monorepo,
- that coverage, reliability, or behavior are adequate.

A safe worker return should therefore avoid claims like “tests are fine”, “validation passes”, or “the web package is covered” unless supported by deterministic evidence outside this file.

**Deterministic evidence to check when the worker returns**

Check these items directly against the repo:
1. `packages/web/package.json`
   Verify the exact value of the `test` script for `surface_id: script.npm.test`.
2. Nearby package metadata in the same file
   Confirm whether the script depends on known tools such as `vitest`, `jest`, `turbo`, or a wrapper command.
3. Root `package.json`
   Check whether repo-level `pnpm test` or Turbo wiring references `packages/web` consistently with the worker’s claims.
4. `turbo.json` and any workspace config
   Confirm whether `test` is actually a defined pipeline task and whether `packages/web` participates.
5. Existence of test files under `packages/web`
   Deterministically verify whether tests are present at all, using file patterns like `*.test.*`, `*.spec.*`, or configured test directories.
6. Test tool config
   Check for `vitest.config.*`, Vite config, or package-local config if the worker claims specific runner behavior.
7. Lockstep with repo instructions
   Verify that any claim about “authoritative

### Path 17 `script.npm.build` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `55.636`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`28.537`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

### 1. Selected Surface Overview

* **Surface ID**: `script.npm.build` (`npm run build` / `vite build`)
* **File**: [packages/web/package.json](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/package.json)
* **Execution Status**: `dry_run_not_executed` (Deterministic result: `not_executed`)

---

### 2. Findings and Risk Areas

#### Risk 1: Static Environment Injection in Build Artifacts
* **Evidence**: [packages/web/vite.config.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/vite.config.ts)
  ```typescript
  define: {
    'process.env.NEXT_PUBLIC_GATEWAY_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_GATEWAY_URL ?? '',
    ),
  }
  ```
* **Finding**: `NEXT_PUBLIC_GATEWAY_URL` is hardcoded into the built bundle at compile time. If the build server does not supply this environment variable, it defaults to `""`. While [packages/web/src/lib/ws.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/lib/ws.ts#L35) and [packages/web/src/components/cli-terminal.tsx](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/src/components/cli-terminal.tsx#L94) safely fall back to `window.location.host` when this value is falsy, baking the value at build-time prevents dynamic runtime environment configuration.

#### Risk 2: Test Environment Pollution (Related Hazard)
* **Evidence**: [packages/jinn/src/engines/__tests__/codex.test.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L173)
  ```typescript
  finally {
    if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prevGithub;
    ...
  }
  ```
* **Finding**: The tests temporarily mutate `process.env` properties globally. If tests run concurrently/in parallel under the monorepo test runners, these modifications can lead to race conditions, leaks, or intermittent test failures across suites.

---

### 3. Recommended Validation

1. **Verify Bundle Generation**:
   Run the
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.001`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Report**

The task appears bounded if the worker is restricted to the single discovered surface: the `build` package script defined in `packages/web/package.json`. The selected surface is low-significance, non-destructive, unchanged, and marked `dry_run_not_executed`, so the safe scope is narrow: identify what the script is, what command it resolves to, and what repo-local evidence says about its expected behavior. The task becomes unbounded if the worker drifts into judging the entire web package, the full monorepo build, or runtime behavior that was never executed.

The worker prompt is somewhat likely to overclaim if it reports build behavior as if observed. The strongest risk comes from `deterministic_result: "not_executed"` combined with a model-only review path. Any claim that the script "works", "fails", "builds the dashboard", "copies artifacts", or is "safe" would be unsupported unless grounded in static evidence from the repo. Acceptable claims are limited to what is explicitly declared in files and what can be inferred conservatively from adjacent configuration. The worker should distinguish:
- observed declaration: the exact `build` script text in `packages/web/package.json`
- static supporting evidence: matching Vite/Turbo/package configuration and docs
- unverified behavior: anything requiring command execution

**Deterministic evidence to check on return**

1. `packages/web/package.json`
   - Exact value of the `build` script.
   - Whether related scripts (`dev`, `test`, `lint`, preview) contextualize intended behavior.

2. Root `package.json`
   - Whether root `build` delegates through Turbo and how `packages/web` participates.

3. `turbo.json` and any package-level Turbo config
   - Whether `build` is a declared pipeline task.
   - Declared outputs for the web package.

4. Web build tool config
   - Files such as `packages/web/vite.config.*` and relevant TS config.
   - Whether the script command aligns with the configured output director

### Path 18 `script.npm.clean` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `54.858`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`54.857`

#### Worker Output

### Fissure Worker Path Review

**Path Index**: 18
**Selected Surface**: `script.npm.clean` in [packages/web/package.json](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/package.json#L12)
**Execution Status**: Not Executed (`dry_run_not_executed`)

---

### Findings & Risk Areas

1. **Destructive File Deletion**
   - **Evidence**: `"clean": "node -e \"const{rmSync}=require('node:fs');['out','dist'].forEach(d=>rmSync(d,{recursive:true,force:true}))\""`
   - **Risk**: The script uses `rmSync` with `{recursive: true, force: true}`. While intended to clean build artifacts, it will unconditionally and permanently delete any directories named `out` and `dist` relative to the current working directory during execution without prompting or verification.

2. **Platform and Path Ambiguity**
   - **Evidence**: `['out','dist'].forEach(d=>rmSync(d,...))`
   - **Risk**: It uses relative paths (`out` and `dist`). If executed from a directory other than the package root (depending on the package manager's configuration or CLI execution context), there is a minor risk of deleting unrelated folders named `out` or `dist` in the active directory.

---

### Recommended Validation

1. **Dry-Run / Safe Mode Verification**
   - Verify directory cleanup behavior by running a dry-run or logging the directories to be deleted before executing the actual removal.
2. **Explicit Directory Scope Execution**
   - Run the script and confirm it only cleans target folders within the context of `packages/web/`.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker is limited to `packages/web/package.json` and the specific discovered surface `script.npm.clean`. That surface is low-significance, non-destructive, and marked `dry_run_not_executed`, so the worker should only verify what the `clean` script is, what it would target, and whether its declaration matches repo conventions. Scope expands if the worker starts reasoning about actual filesystem effects outside the script text or general repo cleanup behavior without checking the referenced commands.

The worker prompt is somewhat likely to overclaim because the selected surface was discovered heuristically (`js_package_scripts_detector`) and nothing was executed. Common failure modes:
- Claiming the script is safe because `destructive: false` in the scan metadata. That field reflects the scanner’s classification, not proof.
- Claiming behavior of `npm run clean` without reading the exact script value and any invoked commands.
- Inferring auth, side effects, or repo-wide impact from the script name alone.
- Treating `diff_status: unchanged` as evidence that running clean would not mutate state.

Deterministic evidence to check when the worker returns:
- The exact `clean` script string in `packages/web/package.json`.
- Any directly referenced commands or local executables that define what `clean` does.
- Whether those commands target only generated artifacts or could remove source/state.
- Whether the script is actually reachable through the package’s scripts block under the reported surface id.
- Whether the worker clearly distinguishes “declared behavior from code inspection” from “observed runtime behavior,” since nothing was executed.
- Whether the worker avoids contradicting repo rules about generated artifacts and local state.

A safe return should include:
- Evidence path: `packages/web/package.json` with the `clean` script entry.
- A paraphrase of the script’s concrete action.
- Any chained evidence paths for refe

### Path 19 `script.npm.coverage` status=`completed`
- File: `packages/jinn/package.json`
- Elapsed seconds: `104.44`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`104.438`

#### Worker Output

**Findings**
- Medium: `coverage` is a write-producing script, not a read-only check. [`packages/jinn/package.json`]( /home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json#L25 ) runs `vitest run --coverage`, and Vitest is configured to write reports into `coverage/` in [`packages/jinn/vitest.config.ts`]( /home/ericl/Work/vscode/public_share/jinn/packages/jinn/vitest.config.ts#L11 ). That means the command will dirty the package tree and can interfere with workspace cleanliness or any tooling that assumes a read-only sweep.
  - Evidence: script command plus `reportsDirectory: 'coverage'`.
  - Recommended validation: run the script in a clean worktree and verify the only new artifacts are the expected coverage reports; decide whether those outputs should be ignored or redirected.

- Low/Medium: The coverage run will execute tests that mutate `process.env` during cleanup, which is a coupling risk. In [`codex.test.ts`]( /home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L156 ), the test temporarily sets `GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, and `CODEX_HOME`, then deletes them in `finally` when they were previously absent at [`codex.test.ts`]( /home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L173 ). That is isolated enough for the test itself, but it creates fragility if more env-sensitive tests share a worker or if coverage execution becomes more parallel.
  - Evidence: explicit env deletion in the test cleanup block.
  - Recommended validation: run coverage with representative env vars present and absent, and look for order-dependent or worker-shared failures.

Not executed; this review is based only on the supplied evidence for the selected path.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays on the selected surface only: `packages/jinn/package.json` script `coverage` (`surface_id: script.npm.coverage`). That script is a single deterministic command, `vitest run --coverage`, so reviewing its classification is narrow and auditable. It is not safe to generalize from this path to overall repo test behavior, CLI behavior, or runtime auth requirements.

The main overclaim risk is already visible in the metadata. The selected surface says `mutates_state: false` and `planned_execution: dry_run_not_executed`, but repo-local evidence says the `coverage` script does write artifacts. In [packages/jinn/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json:25) the script is `vitest run --coverage`; in [packages/jinn/vitest.config.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/vitest.config.ts:8) coverage output is configured with `reportsDirectory: 'coverage'`; and [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:228) classifies `packages/jinn` `coverage` as `mutates_state: true`, `bounded: true`. There is also a regression test asserting this exact classification in [packages/jinn/src/cli/__tests__/script-surface-map.test.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/__tests__/script-surface-map.test.ts:75).

**Deterministic evidence to check when the worker returns**

1. The worker must explicitly anchor on [packages/jinn/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json:25) and quote or paraphrase the actual script: `vitest run --coverage`.
2. The worker must not call the surface non-mutating. Check against [packages/jinn/vitest.config.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/vitest.config.ts:8) and [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:228), which show coverage writes to `coverage/`

### Path 20 `script.npm.dev` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `35.163`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`35.161`

#### Worker Output

## Fissure Review: `packages/web/package.json` npm `dev` script

### Selected Surface
**Path**: `packages/web/package.json` | **Script**: `dev: "vite"`  
**Classification**: CLI command (npm script), dev environment  
**Status**: Unchanged, not executed

---

## Findings

### 1. ✅ Selected Surface: Benign
The `dev` script is a standard Vite dev server command. No direct state mutation or destructive operations in this package.json entry.

---

### 2. ⚠️ Related Hazards: False Positive Classification
**Files flagged**: `packages/jinn/src/engines/__tests__/codex.test.ts` (lines 173–177)

**Evidence**:
```javascript
// lines 158–160: Capture original env state
const prevGithub = process.env.GITHUB_TOKEN;
const prevClaude = process.env.CLAUDE_CODE_SESSION;
const prevCodex = process.env.CODEX_HOME;

// lines 173–177: Restore or delete in finally block
if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
if (prevCodex === undefined) delete process.env.CODEX_HOME;
```

**Assessment**: These deletions are **intentional test cleanup**, not defects. The pattern is correct:
- Variables are captured before mutation (lines 158–160)
- Environment is restored or cleaned in `finally` (lines 173–177)
- No scope or variable-shadowing issues observed
- Test isolation is maintained

The Fissure classifier correctly identifies these as *destructive operations* but incorrectly categorizes them as hazards. This is a **false positive**: legitimate test teardown code.

---

### 3. ❌ No Connection Path
The selected surface (`packages/web` dev script) has no clear execution path to trigger the test cleanup code in `codex.test.ts`. Tests are not run by `vite` in this package.

---

## Recommended Validation

| Action | Rationale |
|--------|-----------|
| **Verify vite dev script isolation** | Confirm `vite` in `packages/web` does not execute or depend on `codex.test.ts` tests as a side effect |
| **Review test set
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays strictly on `packages/web/package.json`, specifically the `script.npm.dev` surface discovered as a package script with `planned_execution: dry_run_not_executed`. It becomes unbounded if the worker drifts into runtime behavior claims about the dev server, dashboard features, auth, network side effects, or monorepo-wide script wiring without reading the exact referenced script and any directly invoked local entrypoints.

The prompt is moderately likely to overclaim because the selected surface is only a detector hit, not an executed result. Risk areas:
- Claiming what `pnpm dev` or the web `dev` script actually does without quoting the script value from `packages/web/package.json`.
- Inferring auth requirements, state mutation, or safety from naming alone (`dev`) rather than from the command string and immediate callees.
- Generalizing from repo conventions to this script variant without checking whether the package delegates to Vite, Turbo, a custom wrapper, or another script.

Deterministic evidence to require from the worker on return:
- The exact `dev` script string from `packages/web/package.json`.
- File/line evidence for that script in `packages/web/package.json`.
- If the script delegates, the exact next hop(s): local file path or package script names it invokes.
- Whether the script is purely a launcher or performs setup/mutation, supported by direct code/config evidence.
- Any conclusion about auth, destructive behavior, or state mutation must be marked `unknown` unless directly evidenced in the invoked code.
- Confirmation that no execution occurred, consistent with `deterministic_result: not_executed` and `planned_execution: dry_run_not_executed`.

What to check deterministically against overclaim:
- Worker statements must not exceed what can be derived from static inspection.
- Any mention of ports, environment variables, backend coupling, login, API calls, file writes, or generated output must 

### Path 21 `script.npm.preview` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `33.531`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`10.728`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

### Fissure Worker Review: Path 21 of 40

**Selected Surface:**
*   **Surface ID:** `script.npm.preview`
*   **File:** [packages/web/package.json](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/web/package.json) (or relative workspace path `packages/web/package.json`)
*   **Execution Status:** `not_executed` / `dry_run_not_executed`

---

#### 1. Candidate Bugs & Risk Areas
*   **Potential Environment/State Leakage or Side-Effects (High Risk):**
    The supplied evidence shows environment token deletion cleanup blocks in the workspace's tests (`packages/jinn/src/engines/__tests__/codex.test.ts` lines 173–177). If the `preview` script or dependencies rely on these shared environments (e.g. `GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, or `CODEX_HOME`), state pollution or deletion of these environment variables could cause subsequent runs or sibling processes to fail silently or lose authentication context.
*   **Workspace Dependency/Context Drift:**
    Since `preview` is run with an `empty_input` strategy and has not been executed, any unregistered or undeclared local environment requirements could cause runtime crashes when running locally or during automated validation.

---

#### 2. Evidence
*   **Evidence 1:** [packages/jinn/src/engines/__tests__/codex.test.ts:L173](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/jinn/src/engines/__tests__/codex.test.ts#L173)  
    `if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;`
*   **Evidence 2:** [packages/jinn/src/engines/__tests__/codex.test.ts:L175](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/jinn/src/engines/__tests__/codex.test.ts#L175)  
    `if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;`
*   **Evidence 3:** [packages/jinn/src/engines/__tests__/codex.test.ts:L177](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/jinn/src/engines/__tests__/codex.test.ts#L177)  
    `if (prevCodex === undefined) delete process.env.CODEX_HOME;`

---

#### 
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`10.133`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Boundedness**

Yes. This is narrowly bounded to one discovered surface: `script.npm.preview` in [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json). The current deterministic scope is only whether that package script exists and what it points to. It is not enough to infer runtime behavior, auth requirements, or end-to-end safety.

**Likely Overclaim Risks**

The worker prompt is at risk of overclaiming if it says any of the following without execution evidence:

- That `preview` works. The file only proves `"preview": "vite preview"`, not that it starts successfully.
- That the surface is safe/non-mutating in practice. Metadata says `mutates_state: false`, but running `vite preview` still opens a local server process and depends on prior build outputs.
- That auth is not required. The record explicitly says `auth_required: "unknown"`.
- That the selected surface is meaningful as a test target by itself. `vite preview` usually serves built assets; success may depend on whether `build` was run and whether output exists.

**Deterministic Evidence To Check On Return**

Require the worker to anchor claims to these exact facts:

- [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json) contains `"preview": "vite preview"`.
- The selected surface metadata remains consistent:
  - `surface_id: "script.npm.preview"`
  - `kind: "cli_command"`
  - `file: "packages/web/package.json"`
  - `planned_execution: "dry_run_not_executed"`
  - `deterministic_result: "not_executed"`
  - `diff_status: "unchanged"`
- No claim of successful execution, reachable URL, auth behavior, or output correctness unless the worker provides separate execution evidence.
- If the worker classifies risk/severity, it should stay informational unless it finds an actual contract violation.

**What Would Be Needed To Safely Resume**

If this watchdog report is the only output, safe resume requires:

1. The worker’s exact cl

### Path 22 `script.npm.stop` status=`completed`
- File: `package.json`
- Elapsed seconds: `71.337`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`32.841`

#### Worker Output

### Fissure Worker Review: Path Index 22

**Selected Surface:**
* **ID:** `script.npm.stop`
* **File:** `package.json`
* **Kind:** `cli_command` (NPM lifecycle script)
* **Execution Status:** `not_executed` / `dry_run_not_executed`

---

### 1. Candidate Bugs & Risk Areas

* **Destructive Environment Modification (High Severity):**
  The related hazard evidence points to `packages/jinn/src/engines/__tests__/codex.test.ts` forcefully deleting environment variables during teardown or state management:
  * `GITHUB_TOKEN`
  * `CLAUDE_CODE_SESSION`
  * `CODEX_HOME`
  
  If the `npm stop` script triggers test execution, test compilation, or CLI wrappers that import or run these test suites, there is a risk that ambient credentials or environment configurations are unintentionally modified or deleted. 
  
* **State Pollution/Side-Effects in Test Lifecycle:**
  While the conditions (`if (prevGithub === undefined)`) attempt to revert changes, modifying `process.env` globally within processes triggered by package scripts can lead to race conditions (e.g., during parallel execution) or pollute parent/child processes if not properly isolated.

---

### 2. Supplied Evidence

* **File:** `packages/jinn/src/engines/__tests__/codex.test.ts`
  * **Line 173:** `if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;`
  * **Line 175:** `if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;`
  * **Line 177:** `if (prevCodex === undefined) delete process.env.CODEX_HOME;`

---

### 3. Recommended Validation

1. **Inspect `package.json`:** Verify the definition of the `stop` script. Ensure it only stops running processes and does not invoke unit/integration tests or tools that execute `codex.test.ts`.
2. **Review Environment Isolation:** Ensure that any tests deleting or modifying environment variables are run in fully isolated worker processes (e.g., using Jest/Vitest sandbox settings) so that global process environment leaks do not occur.
3. **Verify Safe Reversio
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`38.492`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays on the selected surface chain only: root `stop` script in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:22), CLI wiring in [packages/jinn/bin/jinn.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/bin/jinn.ts:43), and stop behavior in [packages/jinn/src/cli/stop.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/stop.ts:3) plus [packages/jinn/src/gateway/lifecycle.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/lifecycle.ts:241). It becomes unbounded if the worker starts generalizing about daemon lifecycle, restart safety, auth, or runtime state without execution.

Overclaim risk is moderate. The selected surface is only a package script wrapper, and `deterministic_result` is `not_executed`, so the worker must not claim observed runtime behavior. Specific traps:
- Claiming `pnpm stop` waits for shutdown. It does not; `stop()` only returns whether `signalGateway(port)` found something to signal [lifecycle.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/lifecycle.ts:241).
- Claiming PID-file cleanup always happens on `stop`. That is only guaranteed by `stopAndWait()`, not `stop()` [lifecycle.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/lifecycle.ts:245).
- Claiming `jinn stop && jinn start` is safe from inside a gateway session. The code comments say the opposite; that is why detached restart exists [lifecycle.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/lifecycle.ts:157).
- Claiming anything about auth requirements or real process state. Those remain unknown without execution.

Deterministic evidence to check when the worker returns:
- It should state that the root surface is exactly `node packages/jinn/dist/bin/jinn.js stop` from [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:22).
- It should trace the command to Commander wiring wit

### Path 23 `script.npm.test:e2e` status=`completed`
- File: `package.json`
- Elapsed seconds: `123.219`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`123.216`

#### Worker Output

**Findings**
- **Medium:** `test:e2e` is not self-contained and depends on an already-running gateway at `http://localhost:7779`. The root script just shells to `playwright test` ([`/home/ericl/Work/vscode/public_share/jinn/package.json:16`]( /home/ericl/Work/vscode/public_share/jinn/package.json#L16 )), the Playwright config explicitly says it does **not** auto-start a web server ([`/home/ericl/Work/vscode/public_share/jinn/playwright.config.ts:6-11`]( /home/ericl/Work/vscode/public_share/jinn/playwright.config.ts#L6-L11 )), and the smoke test hardcodes that same localhost URL ([`/home/ericl/Work/vscode/public_share/jinn/e2e/smoke.spec.ts:4-9`]( /home/ericl/Work/vscode/public_share/jinn/e2e/smoke.spec.ts#L4-L9 )).  
  - Risk: unattended runs can produce false failures or hangs when the gateway is absent, on the wrong port, or not fully ready.
  - Recommended validation: add a preflight health check or CI wrapper that starts an isolated gateway and verifies the target URL before invoking Playwright.

- **Low:** The e2e suite uses the fixed localhost URL directly inside tests instead of relying on the Playwright `baseURL` source of truth. `scroll.spec.ts` falls back to the same literal `http://localhost:7779` and only optionally overrides it via env vars ([`/home/ericl/Work/vscode/public_share/jinn/e2e/scroll.spec.ts:6-19`]( /home/ericl/Work/vscode/public_share/jinn/e2e/scroll.spec.ts#L6-L19 )).  
  - Risk: configuration drift makes alternate ports/previews harder to run and increases the chance of inconsistent behavior across environments.
  - Recommended validation: switch tests to relative navigation (`page.goto('/...')`) and run one pass against a non-default port to confirm the suite still resolves correctly.

**Evidence notes**
- I did not claim this surface executed.
- I did not treat the unrelated env-cleanup code in `packages/jinn/src/engines/__tests__/codex.test.ts` as evidence for this path, because the selected script does not invoke that test file direct
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is only partially bounded. The selected surface is one line in root [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:16), where `test:e2e` is defined as `playwright test`, but that script immediately expands into repo-wide Playwright behavior via [playwright.config.ts](/home/ericl/Work/vscode/public_share/jinn/playwright.config.ts:1) and the tests under [e2e/smoke.spec.ts](/home/ericl/Work/vscode/public_share/jinn/e2e/smoke.spec.ts:1) and [e2e/scroll.spec.ts](/home/ericl/Work/vscode/public_share/jinn/e2e/scroll.spec.ts:1). So the review can be bounded if the worker stays on “what this script deterministically invokes and assumes,” but it becomes unbounded if it starts judging the whole application or runtime health behind `localhost:7779`.

Overclaim risk is moderate. The scan metadata says `planned_execution: "dry_run_not_executed"` and `deterministic_result: "not_executed"`, so the worker should not claim the script passes, that the gateway is reachable, that auth is not required, or that the E2E flow is safe/non-destructive in practice. In particular, [playwright.config.ts](/home/ericl/Work/vscode/public_share/jinn/playwright.config.ts:11) explicitly says the test runner does not auto-start a server and assumes one is already running, while [e2e/scroll.spec.ts](/home/ericl/Work/vscode/public_share/jinn/e2e/scroll.spec.ts:7) also depends on optional environment variables and a live thread/session. Any claim beyond static scope, assumptions, and observable test code would be an overreach.

Deterministic evidence to check when the worker returns:
- It cites the exact script body in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:16): `playwright test`.
- It notes the configured test root and base URL from [playwright.config.ts](/home/ericl/Work/vscode/public_share/jinn/playwright.config.ts:3) and [playwright.config.ts](/home/ericl/Work/vscode/public_share/jinn/playwright.config.ts:7): `./e2e` a

### Path 24 `script.npm.nuke` status=`completed`
- File: `package.json`
- Elapsed seconds: `34.057`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`34.054`

#### Worker Output

## Fissure Review: `script.npm.nuke` (Path 24/40)

### Selected Surface
**File**: `package.json` (line 23)  
**Script**: `"nuke": "node packages/jinn/dist/bin/jinn.js nuke"`  
**Status**: Non-executed (dry-run not triggered)

### Finding: False Positive Hazard Correlation

**Issue**: Related hazards reported from test file environment cleanup are incorrectly associated with the `nuke` script.

**Evidence Misalignment**:
- Selected surface: `package.json` script (shell delegation)
- Reported hazards: `packages/jinn/src/engines/__tests__/codex.test.ts` lines 173–177
- Hazard pattern: Environment variable cleanup in test `finally` block

**Root Cause**: The reported deletions (`delete process.env.GITHUB_TOKEN`, etc.) are test teardown/isolation code in `CodexEngine` specs, **not** code executed by the `nuke` command itself. The test is verifying that the engine strips secrets from spawned processes; the finally block merely restores pre-test state.

### Actual Risk Assessment

| Aspect | Finding |
|--------|---------|
| **Script destructiveness** | ✓ Non-destructive (thin CLI wrapper) |
| **Test cleanup pattern** | ✓ Correct (capture→modify→restore) |
| **Command execution** | ✗ Not executed; actual `nuke` CLI behavior unknown |
| **Environment side effects** | Hazards reported are test artifacts, not script artifacts |

### Recommended Validation

1. **Verify `nuke` command actual behavior**: Inspect `packages/jinn/dist/bin/jinn.js nuke` or its source to determine if it performs destructive operations (file deletion, state cleanup, etc.)
2. **Separate test hazards from CLI hazards**: Fissure should filter environment-only hazards in test finally blocks from the command classification
3. **Runtime test**: Execute the script with instrumentation to observe actual side effects if the CLI behavior is unclear from code review
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker is limited to one surface: `script.npm.nuke` discovered in `package.json`, with no execution. The scope should be: inspect the `package.json` script definition, trace the command it would run, and determine whether the surface is destructive, state-mutating, gated, or misclassified. It is not bounded if the worker expands into broader repo cleanup behavior, infers runtime effects without reading the underlying command chain, or claims validation from non-executed behavior.

The worker prompt is somewhat likely to overclaim because the selected surface name is `nuke`, while the deterministic result is `not_executed` and `planned_execution` is `dry_run_not_executed`. That combination creates a risk of the worker asserting destructiveness, safety, auth requirements, or operational impact from naming alone. The main failure mode to watch for is language like “this command deletes X”, “this is safe”, or “this requires auth” unless those claims are tied to concrete script contents and any referenced files or commands.

Deterministic evidence to check when the worker returns:
- The exact `package.json` entry for `script.npm.nuke`.
- Any command/file the script dispatches to, recursively, until the actual shell/program behavior is visible.
- Whether the script invokes known destructive primitives such as `rm`, `rimraf`, `git clean`, `docker compose down -v`, database resets, or custom cleanup scripts.
- Whether the script is local-only or calls external services/tools.
- Whether the script has guards, prompts, env checks, or documented operator intent in nearby docs.
- Whether the worker clearly separates “observed in code” from “inferred behavior” and acknowledges that execution did not occur.

If this watchdog report is the only output, safe resume requires:
1. The exact worker prompt.
2. The `package.json` script body for `nuke`.
3. Any referenced script files or chained commands.
4. The worker’s returned assessment,

### Path 25 `cli.argparse.kokoro_sidecar` status=`completed`
- File: `packages/jinn/src/talk/kokoro_sidecar.py`
- Elapsed seconds: `82.205`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`36.801`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

An analysis of the selected path (Path index 25/40, CLI command surface at [kokoro_sidecar.py:L160](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py#L160)) has been performed. Here are the findings:

### 1. Findings (Candidate Bugs & Risks)

* **Uncaught Environment Parsing Exception (`ValueError`)**
  * **Risk/Bug**: In [kokoro_sidecar.py:L161](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py#L161), the port argument parser configuration does `int(os.environ.get("KOKORO_PORT", "8765"))`. If the environment variable `KOKORO_PORT` is set to an empty string `""` or an invalid/non-numeric string (e.g., `"abc"`), this invocation will crash immediately with a `ValueError` during parser setup.
* **Uncaught FileSystem Exception (`FileNotFoundError`)**
  * **Risk/Bug**: In [kokoro_sidecar.py:L162](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py#L162), the `--model-dir` option defaults to `os.environ.get("KOKORO_MODEL_DIR", os.getcwd())`. If the process is spawned in a working directory that has been deleted or is otherwise inaccessible, `os.getcwd()` will throw a `FileNotFoundError`, causing startup failure.
* **CLI Exit Behavior on Invalid Arguments**
  * **Risk**: The `argparse.ArgumentParser` default behavior when encountering unknown arguments or `--help` is to print to `stderr`/`stdout` and call `sys.exit()`. If the orchestrating/parent service passes unhandled arguments to the sidecar, the sidecar will terminate silently with exit code `2` or `0`, instead of reporting a structured JSON error.

---

### 2. Evidence

* **Port parsing**: [kokoro_sidecar.py:L161](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py#L161)
  ```python
  parser.add_argument("--port", type=int, default=int(os.environ.get("KOKORO_PORT", "8765")))
  ```
* **Directory retrieval**: [kokoro_sidecar.py:L162](file:///home/ericl/Work/vscode/p
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Assessment**

The task is bounded if the worker stays on `packages/jinn/src/talk/kokoro_sidecar.py` as a single-file surface review. The file is small and self-contained: a Python CLI entrypoint that parses flags, binds a localhost HTTP server, exposes `/health` and `/synth`, lazy-loads Kokoro weights, and emits fixed readiness/error markers. The main risk is scope drift because the selected surface was discovered as `cli.argparse.kokoro_sidecar` at line 160, while the meaningful behavior spans nearly the whole file, not just the argparse block at [kokoro_sidecar.py](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:158).

The worker prompt is somewhat likely to overclaim if it treats this as an executable dry-run result instead of a static review. `deterministic_result` is `not_executed`, `planned_execution` is `dry_run_not_executed`, and auth/runtime state is unknown, so any claim about actual startup, port binding, model availability, WAV synthesis, or endpoint behavior would be unsupported unless the worker explicitly labels it as code inspection only.

**Deterministic Evidence To Check On Return**

Require the worker to anchor claims to these concrete facts in the file:

- CLI flags are only `--port`, `--model-dir`, `--voice`, and `--warm` at [kokoro_sidecar.py](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:160).
- `--voice` is parsed but never used in request handling or warm-load logic; request-time voice comes from JSON or `DEFAULT_VOICE` at [kokoro_sidecar.py](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:136) and [kokoro_sidecar.py](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:163).
- `/health` returns JSON with `ready` based only on `_model is not None`, not on socket status or model-dir validity, at [kokoro_sidecar.py](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/talk/kokoro_sidecar.py:

### Path 26 `script.npm.lint` status=`completed`
- File: `package.json`
- Elapsed seconds: `45.947`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`45.945`

#### Worker Output

### Fissure Path Review (Path Index 26)

#### Selected Surface
* **File:** [package.json](file:///home/ericl/Work/vscode/public_share/jinn/package.json#L12)
* **Surface ID:** `script.npm.lint` (`turbo lint`)
* **Execution Status:** Dry run (not executed)

---

#### Findings & Risk Areas
1. **Global `process.env` Mutation in Tests (Race Conditions):**
   The test suite [codex.test.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L173-L179) directly modifies global `process.env` keys (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, `CODEX_HOME`) and attempts to restore them afterwards in a `finally` block. If tests run concurrently within the same Node process, this global mutation can lead to flaky tests, race conditions, or unintended environment leakage.

---

#### Evidence
From [codex.test.ts:L158-179](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L158-L179):
```typescript
    const prevGithub = process.env.GITHUB_TOKEN;
    const prevClaude = process.env.CLAUDE_CODE_SESSION;
    const prevCodex = process.env.CODEX_HOME;
    try {
      process.env.GITHUB_TOKEN = "host-secret";
      process.env.CLAUDE_CODE_SESSION = "hook";
      process.env.CODEX_HOME = "/tmp/codex-loop";

      const { call } = await runWith({}, [threadStarted("t1"), agentMessage("ok")]);
      const env = envFrom(call);

      expect(env.GITHUB_TOKEN).toBeUndefined();
      expect(env.CLAUDE_CODE_SESSION).toBeUndefined();
      expect(env.CODEX_HOME).toBeUndefined();
    } finally {
      if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = prevGithub;
      if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
      else process.env.CLAUDE_CODE_SESSION = prevClaude;
      if (prevCodex === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = prevCodex;
    }
```

---

#### Recommended Validation
1. **Mocking 
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker is limited to the selected surface: root `package.json`, script `script.npm.lint`, currently defined as `"lint": "turbo lint"` in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:12). That is a narrow validation-script review, not a repo-wide lint audit. The worker should not drift into evaluating lint rule quality, package-level scripts, or whether lint passes, because `deterministic_result` is `not_executed` and the planned execution is `dry_run_not_executed`.

The main overclaim risk is high if the worker speaks as though it observed runtime behavior. From the evidence available, it can only claim:
- the selected surface exists,
- it is unchanged at scan time,
- it is non-destructive and not state-mutating,
- the root `lint` script delegates to `turbo lint`.

It should not claim:
- that lint succeeds or fails,
- that downstream package lint scripts exist or are correctly wired,
- that auth is or is not required in practice,
- that the script is safe beyond its static classification.

Deterministic evidence to check when the worker returns:
1. Did it cite the exact script body from [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:12): `"lint": "turbo lint"`?
2. Did it preserve the execution state: `not_executed` / `dry_run_not_executed`, rather than inferring results?
3. Did it keep scope to `script.npm.lint` instead of broadening to all scripts or all lint config?
4. Did it avoid invented downstream evidence from `turbo`, package workspaces, or lint output that was never run?
5. Did it keep the risk framing aligned with the metadata: `destructive: false`, `mutates_state: false`, `diff_status: unchanged`?

If this watchdog report is the only model output, safe resume requires the worker’s actual review output plus any concrete evidence it relied on beyond the selected-surface metadata, especially whether it inspected only root `package.json` or also traced workspace `l

### Path 27 `script.npm.setup:force` status=`completed`
- File: `package.json`
- Elapsed seconds: `90.727`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`90.725`

#### Worker Output

No execution performed.

**Finding**
- `setup:force` is an unguarded destructive entry point. In [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json#L19-L20) the root script directly dispatches `node packages/jinn/dist/bin/jinn.js setup --force`. The repo’s own surface map classifies this path as destructive and says it removes `safeHome` before reinitializing in [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md#L40-L50), and the regression test describes it as deleting `JINN_HOME` before reinit in [packages/jinn/src/cli/__tests__/script-surface-map.test.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/__tests__/script-surface-map.test.ts#L19-L23).
- Risk area: if automation or an operator points `JINN_HOME` at a real instance, this script can erase that state without any prompt. That is expected behavior for `--force`, but it is high-impact and should be treated as unsafe outside an isolated home.

**Recommended validation**
- Confirm every caller of `setup:force` uses a disposable `JINN_HOME` and that it is excluded from unattended sweeps.
- Verify the destructive-home guard in `setup.ts` still rejects unsafe targets before deletion.
- Smoke-test only in a temporary home to confirm the force path reinitializes as documented and does not emit interactive prompts.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is only partially bounded. The selected surface is a single `package.json` script entry, `script.npm.setup:force`, which is a good narrow starting point, but script review is only truly bounded if the worker limits itself to:

1. The exact script definition in `package.json`.
2. Any directly referenced commands/files that the script invokes.
3. Static claims only.

It becomes unbounded if the worker infers whole-system behavior, setup outcomes, or environment requirements without tracing the script targets.

The worker prompt is at risk of overclaiming because the run metadata says `deterministic_result: not_executed` and `planned_execution: dry_run_not_executed`. That means any claim like “this sets up X,” “this is safe,” “this is idempotent,” or “this requires no auth” would be speculative unless supported by static evidence in the repo. `auth_required` is also `unknown`, so the worker should not assert anything about credentials, network access, or account requirements unless the script text or referenced files state that explicitly.

Deterministic evidence to check when the worker returns:

- The exact `package.json` line defining `setup:force`.
- Whether the script is a direct shell command, a package manager alias, or a wrapper around another script.
- Any scripts it chains to, with exact names and file/line references.
- Any referenced files such as shell scripts, Node entrypoints, or config files.
- Whether those referenced files contain destructive operations, state mutation, network calls, auth flows, filesystem writes, or environment-variable gates.
- Whether the worker’s claims stay within what static inspection proves, versus what would require execution.

Reject or downgrade any conclusion that is not backed by file-path evidence. In particular, runtime claims about success, safety, side effects, idempotence, required services, or auth should be treated as unverified unless the worker clearly labels them as inference.

If 

### Path 28 `script.npm.start` status=`completed`
- File: `package.json`
- Elapsed seconds: `20.482`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`20.159`

#### Worker Output

## Fissure Review: Path 28/40 — `npm start` script

**Selected Surface**: `package.json` script `npm start`  
**Classification**: Non-destructive CLI command (startup wrapper)

---

### Findings

**1. Script itself is safe, but environment cleanup in related tests has isolation risk**

The `npm start` command at line 21 is a standard startup wrapper:
```javascript
"start": "pnpm clean && pnpm build && node packages/jinn/dist/bin/jinn.js start"
```
This is **not destructive** on its own.

However, the **8 related hazards** all point to test cleanup code in `codex.test.ts` (lines 173–177):
```javascript
finally {
  if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
  if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
  if (prevCodex === undefined) delete process.env.CODEX_HOME;
  // ... plus restoration logic
}
```

**Risk**: These tests mutate global `process.env` and delete keys if they didn't exist before. While this is idiomatic test cleanup, **parallel test execution could cause race conditions** — one test's finally block might delete env vars that another test is currently reading.

---

### Evidence

- **Selected surface**: Non-mutating; marked `mutates_state: false`
- **Related hazards**: All in test setup/teardown, not in production code
- **Severity**: Test isolation risk (high) if tests run concurrently without env var mocking

---

### Recommended Validation

1. **Check test isolation**: Verify whether `codex.test.ts` runs in isolation or shares `process.env` with parallel tests. If parallel, consider using `beforeEach`/`afterEach` with proper mocking (e.g., `jest.spyOn(process.env, ...)`) instead of direct mutations.
2. **Confirm npm start is gated**: Verify the startup script doesn't accidentally trigger test code paths that depend on these env vars.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.32`

#### Supervisor Output

**Watchdog Report**

The task is only partially bounded. The selected surface is one script entry, but that entry is operationally broad: [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:21) defines `start` as `pnpm clean && pnpm build && node packages/jinn/dist/bin/jinn.js start`. That spans cleanup, full monorepo build, and daemon startup, so a worker limited to one-path review can assess the declaration but should not overstate runtime behavior, safety, or side effects.

Overclaim risk is moderate to high if the worker reports more than static facts. The metadata says `mutates_state: false` and `planned_execution: dry_run_not_executed`, but the script text clearly performs state-changing operations (`clean`, `build`) before starting the service. A correct worker report should therefore avoid claims such as “safe,” “non-destructive,” “works,” “starts successfully,” or “requires no auth” unless it has separate evidence from the referenced commands and daemon implementation.

Deterministic evidence to check when the worker returns:
- [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:21) contains the exact `start` script string above.
- The worker distinguishes static script-definition review from runtime validation not performed.
- The worker notes the mismatch between surface metadata (`mutates_state: false`) and the script’s actual cleanup/build behavior.
- Any claim about what `jinn.js start` does is backed by direct code evidence in `packages/jinn/dist/bin/jinn.js` or, preferably, the source that produces it, not by inference from the script name.
- Any claim about auth, network use, ports, or persistence is treated as unknown unless cited from code.

If this watchdog report is the only model output, safe resume would require:
1. The exact worker prompt.
2. The worker’s returned text.
3. If runtime claims are expected, direct inspection of the `jinn start` implementation source, not just `package.json`.

### Path 29 `script.npm.jinn` status=`completed`
- File: `package.json`
- Elapsed seconds: `79.47`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`43.496`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

### Fissure Worker Review: Path Index 29

**Selected Surface:** 
- **Surface ID:** `script.npm.jinn` (CLI command running `node packages/jinn/dist/bin/jinn.js` in [package.json](file:///home/ericl/Work/vscode/public_share/jinn/package.json#L18))
- **Execution Status:** Not Executed (`deterministic_result: "not_executed"`)

---

### Findings

1. **Global Environment Variable Mutation & Race Conditions in Tests**
   - The test suite in [codex.test.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L158-L179) mutates global `process.env` variables (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, and `CODEX_HOME`) directly on the Node process.
   - If tests are executed concurrently in the same process/thread context, this direct mutation will leak state to other tests, leading to non-deterministic test failures or environment leakage.
2. **Destructive Environment Cleanup**
   - The `finally` block deletes environment variables if they were initially undefined (`prevGithub === undefined`). If any concurrent tests or runtime tasks rely on these variables during that lifecycle window, they will fail.

---

### Evidence

- **Script Definition:**
  ```json
  "jinn": "node packages/jinn/dist/bin/jinn.js"
  ```
- **Hazard Code Segment ([codex.test.ts#L158-L179](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L158-L179)):**
  ```typescript
  const prevGithub = process.env.GITHUB_TOKEN;
  const prevClaude = process.env.CLAUDE_CODE_SESSION;
  const prevCodex = process.env.CODEX_HOME;
  try {
    process.env.GITHUB_TOKEN = "host-secret";
    process.env.CLAUDE_CODE_SESSION = "hook";
    process.env.CODEX_HOME = "/tmp/codex-loop";
    // ... test logic ...
  } finally {
    if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prevGithub;
    if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
    else process.env.CLAUDE_CODE_
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`23.842`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays on the selected surface: the root `package.json` script alias `jinn` at [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:18) and its direct target. It becomes unbounded if the worker starts reviewing daemon behavior, setup side effects, auth, or subcommand semantics beyond what the alias and entrypoint metadata prove.

Overclaim risk is moderate. The scan says `planned_execution: dry_run_not_executed` and `deterministic_result: not_executed`, so the worker cannot safely claim that `jinn` works, is non-authenticated, is harmless in practice, or that bare invocation is a no-op. What is actually supported by repo evidence is narrower:
- The root script `jinn` maps to `node packages/jinn/dist/bin/jinn.js` at [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:18).
- The published package exposes the same bin target at [packages/jinn/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json:10).
- The target file exists and is a Commander CLI entrypoint beginning at [packages/jinn/dist/bin/jinn.js](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/dist/bin/jinn.js:1).
- The CLI registers mutating subcommands such as `setup`, `start`, and `stop` at [packages/jinn/dist/bin/jinn.js](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/dist/bin/jinn.js:20), so the worker must not generalize the selected surface into “the Jinn CLI is non-destructive.”
- Bare invocation ends in `program.parse()` at [packages/jinn/dist/bin/jinn.js](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/dist/bin/jinn.js:445), but without execution the exact output and exit code remain unproven.

Deterministic evidence to check when the worker returns:
1. The worker should cite the exact alias definition in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:18).
2. The worker should confirm the matching bin declaration in [packages/jinn/package.

### Path 30 `script.npm.setup` status=`completed`
- File: `package.json`
- Elapsed seconds: `42.221`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`11.361`

#### Worker Output

### Fissure Worker Review: Path Index 30 (`script.npm.setup`)

**Result:** `not_executed` (Dry Run)

---

#### 1. Findings & Risk Areas
* **Side-Effects from Global Environment Mutation**: 
  The unit test suite in `packages/jinn/src/engines/__tests__/codex.test.ts` dynamically mutates the global `process.env` object by deleting `GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, and `CODEX_HOME` under certain conditions.
* **Potential for Flaky Tests or Shared State Pollution**:
  If the `setup` script executes tests or runs processes in a shared/single-threaded context (e.g., executing tests sequentially or using in-band execution), removing these environment variables mid-execution can break downstream tasks or other tests that expect these values to persist.
* **Lack of Safe Teardown Guarantees**:
  If these deletions are written inline rather than wrapped in a robust `try...finally` block or Jest's lifecycle hooks (`afterAll`/`afterEach`), any unexpected failure prior to these lines will leak modified environment variables.

---

#### 2. Supplied Evidence
* **Selected Surface**: `script.npm.setup` defined in `package.json`
* **Identified Hazards**:
  * [packages/jinn/src/engines/__tests__/codex.test.ts:173](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/jinn/src/engines/__tests__/codex.test.ts#L173):
    ```typescript
    if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
    ```
  * [packages/jinn/src/engines/__tests__/codex.test.ts:175](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/jinn/src/engines/__tests__/codex.test.ts#L175):
    ```typescript
    if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
    ```
  * [packages/jinn/src/engines/__tests__/codex.test.ts:177](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/jinn/src/engines/__tests__/codex.test.ts#L177):
    ```typescript
    if (prevCodex === undefined) delete process.env.CODEX_HOME;
    ```

---

#### 3. Recommended Validation
1. **Lifecyle Aud
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`30.858`

#### Supervisor Output

**Watchdog Assessment**

The task is bounded only if the worker stays narrow: classify `script.npm.setup` from [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:19), trace its delegation through [packages/jinn/bin/jinn.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/bin/jinn.ts:24), and describe the static behavior implemented in [packages/jinn/src/cli/setup.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/setup.ts:354). It is not bounded if the worker expands into runtime claims about auth, successful execution, actual prompts seen, or safety of unattended execution, because `deterministic_result` is `not_executed`.

Overclaim risk is moderate to high. The selected-surface metadata says `mutates_state: false` and `planned_execution: dry_run_not_executed`, but the repo’s own authoritative map says root `setup` is state-mutating, TTY-conditional, and only safe for automated probes with an isolated `JINN_HOME`: [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:25). The implementation confirms it writes config, database, directories, symlinks, and settings under `JINN_HOME`, and may prompt on fresh interactive setup: [packages/jinn/src/cli/setup.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/setup.ts:466).

**Deterministic Evidence To Check On Return**

1. The worker must identify the exact script string for `setup` from [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:19): `pnpm build && node packages/jinn/dist/bin/jinn.js setup`.
2. The worker must trace that script to the `setup` subcommand in [packages/jinn/bin/jinn.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/bin/jinn.ts:24).
3. The worker must note that `runSetup` is state-mutating even without `--force`: it creates/writes `CONFIG_PATH`, DB, cron files, docs/skills/org content, and settings in [packages/jinn/src/cli/setup.ts](/home/ericl/Work/vscode/public_sha

### Path 31 `script.npm.test:watch` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `43.617`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`43.614`

#### Worker Output

**Findings**
- `packages/web/package.json:11` exposes `test:watch` as a bare `vitest` invocation. That is a risk surface in automation because the command is interactive by default and can keep a process resident instead of exiting cleanly, which is easy to miswire into CI or scripted tooling.
- The script is not constrained with any explicit mode flag or guard, so its behavior depends on the caller’s environment rather than the package manifest itself.

**Evidence**
- [`packages/web/package.json`](./packages/web/package.json) defines:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`

**Recommended validation**
- Confirm `test:watch` is only used for local developer sessions and is not referenced by CI, turbo tasks, or other automation.
- If automation may call it, split the intent explicitly: keep a bounded non-watch script for runners and a separate watch-only script for interactive use.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays on the selected surface only: [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json). The relevant deterministic fact is narrow: `scripts["test:watch"]` is currently `"vitest"`, with `diff_status: "unchanged"` and `planned_execution: "dry_run_not_executed"`.

The worker prompt has a moderate overclaim risk because `test:watch` is an interactive, long-running watch command. A weak worker may overstate:
- that tests “passed” when watch mode was never executed to completion,
- that the surface is safe/non-mutating beyond what was actually observed,
- that auth or environment requirements are known, even though `auth_required` is explicitly `unknown`,
- that the selected surface was “reviewed” when only package metadata was inspected.

**Deterministic evidence to require when the worker returns**
- The exact script definition from [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json): `test:watch = "vitest"`.
- Whether the worker executed anything at all. If not, the result must remain `not_executed`.
- If execution is claimed, the exact command, cwd, invocation mode, captured stdout/stderr, and how the watch process was terminated.
- Any claim about test results must be backed by concrete `vitest` output. Watch startup alone is not equivalent to a passing test suite.
- Any claim about mutability must distinguish the script entry from runtime behavior. The package entry is static; `vitest` may still read config, spawn watchers, and react to file changes.
- Confirmation that the file remained unchanged if the worker was only auditing.

If this watchdog report is the only model output, safe resume would require:
1. A precise worker objective: inspect only, or actually execute `test:watch`.
2. Execution constraints: whether long-running interactive commands are allowed, and for how long.
3. Required evidence format: transcrip

### Path 32 `script.npm.postinstall` status=`completed`
- File: `package.json`
- Elapsed seconds: `20.58`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`20.578`

#### Worker Output

## Fissure Review: `script.npm.postinstall`

**Surface:** `package.json` — root postinstall npm script (path 32/40)

### Findings

**Script content:**
```json
"postinstall": "chmod +x node_modules/.pnpm/node-pty@*/node_modules/node-pty/prebuilds/*/spawn-helper 2>/dev/null || true"
```

**Risk Assessment: LOW**

| Finding | Evidence | Severity |
|---------|----------|----------|
| **Mismatched hazards** | Related hazards cite `codex.test.ts` lines 173–177, which are test teardown deletions in a `finally` block; these are unrelated to the postinstall script and present no risk to the postinstall path | Info |
| **Correct error handling** | stderr redirected to `/dev/null` and `\|\| true` suppresses failures; the script will not fail the install if the binary is missing or chmod fails | Low |
| **Path safety** | Uses glob pattern to make `node-pty` prebuilt binaries executable; this is standard for native modules and safe | Low |

### Validation Recommended

1. **Verify hazard correlation:** The test file deletions are proper test isolation cleanup, not related to this script. Confirm hazard grouping doesn't conflate unrelated code paths.
2. **Test native module setup:** Run `pnpm install` on a fresh checkout and verify `node-pty` works without shell errors—the postinstall logic should succeed silently.

**Conclusion:** Script is defensive and correctly implemented. Related hazard evidence is false-positive due to surface correlation mismatch.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker stays strictly on `script.npm.postinstall` as declared by `selected_surface.surface_id`, and limits review to deterministic evidence in the repo root [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json) plus any directly referenced install script target. It becomes unbounded if the worker expands into general package hygiene, dependency safety, or runtime behavior that is not reachable from the `postinstall` entry.

The worker prompt is at moderate risk of overclaiming because the `deterministic_result` is `not_executed` and `planned_execution` is `dry_run_not_executed`. That means the worker cannot honestly claim observed install-time behavior, side effects, auth requirements, or cross-platform execution characteristics unless it cites static evidence from files. Specific risk areas:
- Inferring what `postinstall` does without quoting the exact script string from `package.json`.
- Claiming whether it is safe, harmless, or non-mutating without resolving the command target.
- Claiming auth, network, or filesystem effects from the `postinstall` path when `auth_required` is `unknown` and nothing was executed.
- Reporting findings outside the selected surface, such as unrelated scripts or package-manager policy.

Deterministic evidence to check when the worker returns:
- The exact `postinstall` value in [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json).
- Whether the worker identified the concrete target of that command: inline shell, `node` entrypoint, `pnpm` subcommand, or external binary.
- If the command references a local file, verify that file exists and that the worker inspected it directly.
- If the command chains to another package script, verify the referenced script exists and was traced exactly.
- Any claim about side effects should be backed by explicit code or script lines showing file writes, downloads, build steps, env access, or subprocess calls.
- Any clai

### Path 33 `script.npm.typecheck` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `41.636`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`8.32`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

### Fissure Worker Review: Path Index 33

**Status:** `not_executed` (Dry run/not executed)
**Selected Surface:** `script.npm.typecheck` in [packages/web/package.json](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/web/package.json) (Variant: `empty_input`)

---

#### 1. Findings & Risk Areas

Based on the supplied evidence, the primary concerns lie in the environment teardown/cleanup logic within test files, which may side-effect the execution of the selected surface (type-checking and build verification scripts) or subsequent test runs:

*   **Destructive Environment Cleanup Hazard:** 
    *   The test suite in `packages/jinn/src/engines/__tests__/codex.test.ts` dynamically deletes environment variables (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, `CODEX_HOME`) at lines 173, 175, and 177 if they were initially undefined. 
    *   **Risk:** If environment state mutations are not scoped locally to individual test processes, or if shared resources run concurrently, this teardown process could disrupt authentication tokens, home path parameters, or session credentials needed by concurrent validation tasks or scripts (such as type-checking scripts dependent on environment configuration).

---

#### 2. Evidence

*   **File:** [packages/jinn/src/engines/__tests__/codex.test.ts](file:///home/ericl/.gemini/antigravity-cli/scratch/packages/jinn/src/engines/__tests__/codex.test.ts)
    *   **Line 173:** `if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;`
    *   **Line 175:** `if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;`
    *   **Line 177:** `if (prevCodex === undefined) delete process.env.CODEX_HOME;`

---

#### 3. Recommended Validation

*   **Static Type Checking (Isolated):** Validate that running type checking (`npm run typecheck` or equivalent `tsc --noEmit`) succeeds without relying on active environment variables.
*   **Test Environment Isolation Verification:** Review `codex.test.ts` to ensure that environment variable
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`3.568`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker is restricted to `packages/web/package.json` and the specific selected surface `script.npm.typecheck`. This is a narrow validation-surface review, not a general repo audit. The main scope risk is prompt drift from “review one path” into claims about repo-wide typecheck behavior, Turborepo wiring, or runtime behavior that cannot be established from this file alone.

The worker prompt is moderately likely to overclaim because the selected surface metadata says `discovered_by: js_package_scripts_detector`, `kind: validation_script`, and `planned_execution: dry_run_not_executed`, while `deterministic_result` is `not_executed`. That means the worker must not claim the script works, fails, resolves correctly, or matches root validation behavior unless it cites file-local evidence. Safe claims are limited to what is literally present in `packages/web/package.json`: whether a `typecheck` script exists, its exact command, and any nearby package metadata or dependencies directly relevant to interpreting that command.

Deterministic evidence to check when the worker returns:
- `packages/web/package.json`: confirm whether a `scripts.typecheck` entry exists at all.
- The exact script string for `typecheck`: verify the worker quoted or paraphrased it accurately.
- Whether the file contains any package-local context the worker relies on, such as `name`, `private`, `devDependencies`, or tool-specific packages referenced by the script.
- Whether the worker distinguishes package-local script definition from root-level execution behavior.
- Whether the worker avoids claiming execution, success, failure, auth requirements, or side effects, since the surface was not executed.
- Whether any statement about Turborepo, pnpm workspaces, or repo-wide validation is backed by explicit evidence from this file or clearly labeled as inference.

If this watchdog report is the only model output, safe resume would require:
- The exact worker pro

### Path 34 `script.npm.status` status=`completed`
- File: `package.json`
- Elapsed seconds: `14.419`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`11.306`

#### Worker Output

### Path Review: Path 34 of 40

**Status:** Not Executed (`dry_run_not_executed`)

---

### 1. Selected Surface
* **File:** `package.json`
* **Surface ID:** `script.npm.status`
* **Kind:** CLI command (`package_script`)

---

### 2. Candidate Bugs & Risk Areas
* **Destructive Environment Cleanup in Test Suite:** 
  The test file `packages/jinn/src/engines/__tests__/codex.test.ts` alters and deletes variables from the shared process environment (`process.env.GITHUB_TOKEN`, `process.env.CLAUDE_CODE_SESSION`, and `process.env.CODEX_HOME`). 
* **Risks:** 
  * **Global State Pollution / Side Effects:** Modifying `process.env` globally within a test file can leak to other concurrent or subsequent tests in the same test runner process, causing intermittent test failures (flakiness).
  * **Credential Erasure:** If a parent runner or user context depends on these environment variables remaining set, deleting them mid-execution can break integration flows or subsequent command executions.

---

### 3. Evidence
* **[codex.test.ts:173](file:///packages/jinn/src/engines/__tests__/codex.test.ts#L173):** `if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;` (Severity: High)
* **[codex.test.ts:175](file:///packages/jinn/src/engines/__tests__/codex.test.ts#L175):** `if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;` (Severity: High)
* **[codex.test.ts:177](file:///packages/jinn/src/engines/__tests__/codex.test.ts#L177):** `if (prevCodex === undefined) delete process.env.CODEX_HOME;` (Severity: High)

---

### 4. Recommended Validation
1. **Environment Mocking:** Replace direct mutation/deletion of `process.env` with a localized configuration object, a stub/spy (e.g., using Jest/Vitest's environment mocking utilities), or run the test in an isolated child process or environment setup.
2. **State Isolation Check:** Ensure that running the `status` package script concurrently with tests does not fail due to missing or wiped environmental context.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`3.112`

#### Supervisor Output

**Watchdog Report**

Task boundedness: weakly bounded.

The selected surface is narrow in one sense: a single `package.json` script surface, `script.npm.status`, with `planned_execution: dry_run_not_executed`, `destructive: false`, and `mutates_state: false`. But the actual worker prompt is not shown, the script body is not shown, and `path`/line anchors are missing. That means the worker could drift from “review this one script surface” into broader repo claims unless explicitly constrained.

Overclaim risk: moderate to high.

Reasons:
- `deterministic_result` is `not_executed`, so no runtime evidence exists.
- The detector-derived label `status` is only a heuristic from `js_package_scripts_detector`; it does not prove what the script actually does.
- `auth_required` is `unknown`, so any claim that the surface is safely runnable or fully observable would be unsupported.
- `package.json` location and exact script value are absent from this handoff, so the worker should not claim verified behavior, only static observations tied to the manifest entry.

The worker should be held to claims like:
- “The manifest appears to define a script named `status` …”
- “Based on static inspection, it likely invokes …”
- “No execution evidence was collected.”

The worker should not claim:
- that the command works,
- that it is harmless in practice,
- that it requires or does not require auth,
- that it is repo-wide representative,
- or that it produces a specific output unless that output is statically encoded.

Deterministic evidence to check when the worker returns:
1. Exact `package.json` path inspected.
2. Exact `scripts.status` entry, quoted exactly from the file.
3. If the script delegates, the exact downstream command/binary/file path it invokes.
4. Whether the worker kept scope to this single surface and avoided repo-wide conclusions.
5. Explicit separation of verified facts vs inference.
6. A statement that execution did not occur, consistent with `deterministic_result: not

### Path 35 `script.npm.test` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `80.721`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`61.523`

#### Worker Output

**Findings**

- Medium: [`packages/web/package.json:10`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json#L10) defines `test` as plain `vitest run` with no explicit env isolation or workspace scoping.
  Evidence: the repo contains tests that mutate shared globals and then clean up by deleting/restoring `process.env.GITHUB_TOKEN`, `process.env.CLAUDE_CODE_SESSION`, and `process.env.CODEX_HOME` in [`packages/jinn/src/engines/__tests__/codex.test.ts:173-177`](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L173-L177). If this validation path is composed into a broader runner that shares a shell or worker process, those mutations can leak into adjacent checks or mask real env-dependent failures.
  Recommended validation: run the web test script with sentinel env values set, confirm they are unchanged after the suite, and verify the root test workflow does not co-schedule unrelated package tests in the same process or worker.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`19.196`

#### Supervisor Output

**Watchdog Report**

The task is bounded. The selected surface is `packages/web/package.json` script `test`, and the script is explicitly `vitest run`, not watch mode, so it is a finite validation command rather than an interactive or open-ended surface. Deterministic repo evidence supports that classification in [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:5), [packages/jinn/src/cli/__tests__/script-surface-map.test.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/__tests__/script-surface-map.test.ts:59), and [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:361).

Overclaim risk is moderate if the worker reports more than “this package test command is bounded and classified safe for deterministic sweeps.” The main failure mode would be claiming execution success, runtime safety, or repo-wide validation status from static inspection alone. Another overclaim would be conflating package-local `pnpm test` in `packages/web` with root `pnpm test`; the root contract is `turbo run test`, which is a broader surface in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:8).

Deterministic evidence to check when the worker returns:
- The worker should cite that `packages/web` `scripts.test` is exactly `vitest run` in [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:10).
- The worker should distinguish it from `test:watch`, which is bare `vitest` and therefore interactive/unbounded in [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:11).
- The worker should align with the repo’s own assertion that `packages/web test uses vitest run (bounded — safe for deterministic sweeps)` in [packages/jinn/src/cli/__tests__/script-surface-map.test.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/__tests__/script-surface-map.test.ts:59).
- The wor

### Path 36 `script.npm.build` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `34.062`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`34.06`

#### Worker Output

## Fissure Review: `script.npm.build` (packages/web/package.json)

### Surface Summary
| Property | Value |
|----------|-------|
| Command | `vite build` |
| Destructive | ❌ No |
| State Mutation | ❌ No |
| Significance | Low (0.1) |
| Execution Status | Not executed (dry_run) |

---

### Findings

**✅ Safe Build Command**  
The `vite build` script is a standard Vite compilation step—no inherent risk. Builds TypeScript/JSX to static assets in the `out/` directory.

**⚠️ Minor: Unvalidated Environment Variable Injection**  
- `NEXT_PUBLIC_GATEWAY_URL` (line 13, vite.config.ts) is read at build time and baked into the bundle
  - **Risk**: No validation. Caller can inject any URL. Could point to attacker-controlled gateway if env is compromised.
  - **Mitigation**: Validate URL format at build time (e.g., `new URL()` to ensure valid origin) or document build-time security requirements.
- `GATEWAY_PORT` (line 6, vite.config.ts) defaults to `'7777'` if unset—acceptable.

**⚠️ Minor: Output Directory Cleanup**  
- Vite config uses `emptyOutDir: true` (line 23, vite.config.ts)
  - **Risk**: If build output path is misconfigured or symlinked unexpectedly, could delete unintended files.
  - **Mitigation**: Standard Vite behavior; verify `outDir: 'out'` is isolated and not pointing to a shared directory.

---

### Related Hazards Context
The 8 listed hazards (destructive env var deletions in `codex.test.ts` lines 173, 175, 177) are **contextually unrelated**. They originate from test setup/teardown code for the Codex engine, not from the web build pipeline. No cross-contamination detected.

---

### Recommended Validation
- [ ] Confirm `out/` is git-ignored and not a shared build directory
- [ ] Document or validate `NEXT_PUBLIC_GATEWAY_URL` format (URL parsing) if it comes from untrusted sources
- [ ] Dry run: `npm run build` with and without `NEXT_PUBLIC_GATEWAY_URL` set to verify fallback behavior

**Risk Level:** 🟢 **Low** — standard web build, no state mutation, minor en
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

The task is bounded if the worker is limited to `packages/web/package.json` and the selected surface `script.npm.build`. The surface is low-significance, non-destructive, marked `unchanged`, and the deterministic result is already `not_executed`, so the safe scope is narrow: verify what the `build` script is, whether it is actually dry-run safe, and whether any claim about behavior is supported by static evidence in that file and immediate repo references only.

The worker prompt is somewhat likely to overclaim if it infers runtime behavior from the script name alone. Risk points:
- `discovered_by: js_package_scripts_detector` means this was detector-selected metadata, not execution evidence.
- `planned_execution: dry_run_not_executed` and `deterministic_result: not_executed` mean the worker must not claim the build succeeds, fails, is harmless, or is auth-free from observation.
- `auth_required: unknown` means the worker must not assert no auth is needed unless the script and called tooling make that explicit.
- `mutates_state: false` is metadata, but build scripts often write artifacts; the worker should treat that as unverified unless the repo contract or script body proves otherwise.

Deterministic evidence to check when the worker returns:
1. The exact `build` entry in `packages/web/package.json`.
2. Any directly referenced command in that script, typically `vite build`, `turbo`, or a local wrapper.
3. Whether the script delegates to another manifest or config file that changes meaning, such as root `package.json`, `turbo.json`, `vite.config.*`, or package-local build tooling.
4. Whether the repo instructions already define authoritative build behavior. Here, `AGENTS.md` says `pnpm build` runs `turbo build` and copies `packages/web/out -> packages/jinn/dist/web`; any worker claim should align with that.
5. Whether the worker distinguishes static facts from unexecuted assumptions:
   - Static fact: script text, referenced tooling, declared r

### Path 37 `script.npm.clean` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `32.254`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`20.089`
- Worker attempted models: `kilo_cli:kilo-auto/small, agy_cli:Gemini 3.5 Flash (Low)`

#### Worker Output

# Fissure Review: Path 37 (`script.npm.clean`)

## Selected Surface Information
* **File:** [packages/web/package.json](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/package.json#L12)
* **Surface ID:** `script.npm.clean`
* **Kind:** `cli_command`
* **Execution Status:** **Not Executed** (Dry Run)

---

## Findings & Risk Areas

### 1. Hardcoded Directory Paths and Execution Context
* **Risk:** The script attempts to delete the directories `out` and `dist` using relative paths (`['out','dist']`).
* **Detail:** If the `clean` script is invoked from a workspace root or via a monorepo command runner (such as `npm run clean` from the root of a monorepo without correct directory targeting), it will attempt to delete `out` and `dist` from the current working directory where the process is started rather than the package root of `@jinn/web` (`packages/web/`).

### 2. Dependency on Modern Node.js prefix (`node:fs`)
* **Risk:** The script uses `require('node:fs')`.
* **Detail:** The `node:` prefix is supported in Node.js versions v14.18.0+ and v16.0.0+. In very old Node.js environments, this import scheme will fail. 

---

## Evidence

In [packages/web/package.json (Line 12)](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/package.json#L12):
```json
"clean": "node -e \"const{rmSync}=require('node:fs');['out','dist'].forEach(d=>rmSync(d,{recursive:true,force:true}))\""
```

---

## Recommended Validation

1. **Verify Workspace Invocation:**
   * Test running `npm run clean` (or its equivalent workspace runner execution) from both the root of the project and directly inside the `packages/web` directory to ensure that relative deletion paths consistently target the intended `packages/web/dist` and `packages/web/out` folders rather than root or parent directories.
2. **Compatibility Test:**
   * Verify compatibility across targeted Node.js runtime versions to ensure `node:fs` resolved imports work without errors.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Watchdog Report**

Task boundedness: weakly bounded. The selected surface is a single package script entry in `packages/web/package.json` with `surface_id: script.npm.clean`, `planned_execution: dry_run_not_executed`, and no input schema. That is narrow at the file/surface level, but the worker could still drift into claiming behavior about what the `clean` script does across the repo unless it is forced to quote the exact script value and any directly invoked commands.

Overclaim risk: moderate to high. The worker is being asked to “review one path,” but the surface metadata does not include `line_start`, `line_end`, or the actual script contents. If the worker returns conclusions like “safe,” “non-destructive,” “workspace-only,” or “no auth required” without citing the literal script text and any referenced files/commands, that would be overclaiming. The highest-risk claims are:
- Whether `clean` deletes only local build artifacts versus broader paths.
- Whether it affects only `packages/web` or reaches repo-root/shared locations.
- Whether it is deterministic/idempotent.
- Whether it is safe to run in a dirty worktree.

Deterministic evidence to check on return:
1. The exact `clean` script value in `packages/web/package.json`.
2. Whether that script delegates to another command/tool (`rimraf`, `rm`, `del`, `turbo`, custom node script, etc.).
3. If delegated, the exact target paths or globs from the referenced script/file.
4. Whether any target paths escape `packages/web` or touch generated/shared outputs like repo-level caches or `packages/jinn/dist/web`.
5. Whether the worker distinguishes observed evidence from inference.
6. Whether the worker avoids claiming execution results, since `deterministic_result` is `not_executed`.

Fail/flag conditions for the worker response:
- Claims about runtime outcome without execution.
- Claims about safety/destructiveness without quoting deletion targets.
- Claims about auth/network requirements with no evidence from the sc

### Path 38 `script.npm.coverage` status=`completed`
- File: `packages/jinn/package.json`
- Elapsed seconds: `30.498`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`15.025`

#### Worker Output

### Fissure Worker Review: Path Index 38

* **Selected Surface:** `coverage` script inside [packages/jinn/package.json](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json#L25) (`vitest run --coverage`)
* **Deterministic Result:** `not_executed`

---

### Key Findings & Risk Areas

#### 1. Global State Mutation and Test Flakiness in Concurrent Runs
* **Evidence:** [packages/jinn/src/engines/__tests__/codex.test.ts#L156-L181](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L156-181)
* **Risk:** The test `"strips host secrets and engine loop variables from spawned env"` directly overwrites and deletes global `process.env` properties:
  ```typescript
  process.env.GITHUB_TOKEN = "host-secret";
  process.env.CLAUDE_CODE_SESSION = "hook";
  process.env.CODEX_HOME = "/tmp/codex-loop";
  ```
  Since `vitest` runs tests concurrently by default, this global mutation can lead to race conditions where other parallel test suites query these environment variables and read dummy values, or run with deleted credentials.
* **Secondary Risk:** If the process crashes or terminates abruptly before the `finally` block completes execution, host environment credentials might not be restored correctly.

---

### Recommended Validation & Remediation

1. **Refactor using Vitest Env Stubs:**
   Instead of manually reassigning and deleting properties on `process.env`, use Vitest's built-in utility `vi.stubEnv` in `beforeEach` / `afterEach` (or within the test block) to automatically isolate and safely teardown environment mutations:
   ```typescript
   beforeEach(() => {
     vi.stubEnv("GITHUB_TOKEN", "host-secret");
     vi.stubEnv("CLAUDE_CODE_SESSION", "hook");
     vi.stubEnv("CODEX_HOME", "/tmp/codex-loop");
   });

   afterEach(() => {
     vi.unstubAllEnvs();
   });
   ```

2. **Execute Coverage Validation:**
   Verify test runner behavior with:
   ```bash
   npm run coverage
   ```
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`15.47`

#### Supervisor Output

**Watchdog Assessment**

The task is bounded if the worker is limited to the selected surface itself: `packages/jinn/package.json` script `coverage`, which is currently `"vitest run --coverage"`. That script is locally deterministic to inspect as a string and its expected side effects are documented: it is non-destructive but state-mutating because it writes coverage artifacts to `packages/jinn/coverage/`. The broader root `coverage` script is different (`"turbo run coverage"`), so the worker must not generalize from the repo root to the selected package surface.

The main overclaim risk is scope drift. A weak worker prompt may claim:
- that coverage was executed, even though `deterministic_result` is `not_executed` and `planned_execution` is `dry_run_not_executed`
- that the surface is read-only or non-mutating, when local docs/tests say coverage writes artifacts
- that repo-wide coverage behavior applies, when this selected surface is specifically the package-level script in `packages/jinn/package.json`
- that auth, runtime success, or test pass/fail are known, when none of that can be concluded from static inspection here

**Deterministic Evidence To Check On Return**

Require the worker output to align with these local facts:
- `packages/jinn/package.json`: script `coverage` equals `vitest run --coverage`
- `packages/jinn/vitest.config.ts`: coverage `reportsDirectory` is `coverage`
- `packages/jinn/vitest.config.ts`: reporters are `text`, `json`, `html`
- `docs/script-surface-map.md`: package `coverage` is marked `bounded: true`, `mutates_state: true`, `automated_probe_default: conditional`
- `packages/jinn/src/cli/__tests__/script-surface-map.test.ts`: test asserts package coverage contains `vitest run --coverage`
- `package.json`: root `coverage` is `turbo run coverage`, which is a different surface

A safe worker return should explicitly say:
- inspection only, not executed
- bounded command surface
- non-destructive but state-mutating
- package-local script,

### Path 39 `script.npm.dev` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `109.928`
- Worker execution: `parallel_paths`
- Worker attempts: `2` failovers=`1`
- Worker: `completed` claude_cli:haiku elapsed=`17.014`
- Worker attempted models: `codex_cli:gpt-5.4-mini, claude_cli:haiku`

#### Worker Output

## Fissure Review: `packages/web/package.json` — `script.npm.dev`

### Selected Surface
- **Script**: `"dev": "vite"` (line 6)
- **Status**: Not executed in test (deterministic_result: `not_executed`, planned_execution: `dry_run_not_executed`)
- **Characteristics**: Non-destructive, no state mutation, low significance (0.1)

### Findings

**✓ No bugs detected in selected surface.** The `dev` script is a straightforward invocation of Vite, the standard frontend build tool for this React project.

### Related Hazards Assessment

The listed hazards reference environment variable deletions in `packages/jinn/src/engines/__tests__/codex.test.ts` (lines 173, 175, 177):
```javascript
if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
if (prevCodex === undefined) delete process.env.CODEX_HOME;
```

**Hazards are not applicable to this surface.** These are in a different package/test file and represent legitimate test cleanup: conditionally deleting environment variables only if they weren't previously set (preserving test isolation). This pattern is sound.

### Recommended Validation

**None required for this surface** — the dev script is unchanged, non-destructive, and standard Vite usage. The related hazards should be reviewed separately in the context of `codex.test.ts` if test isolation is a concern.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`13.916`
- Supervisor attempted models: `codex_cli:gpt-5.4, codex_cli:gpt-5.4`

#### Supervisor Output

**Assessment**

The task is bounded if the worker stays on the selected surface: [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:6) and specifically the `script.npm.dev` entry. Deterministic repo evidence shows that surface is just `"dev": "vite"` in the web package, while the repo-root `dev` is separately `"turbo dev"` in [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:11). A safe worker report should therefore stay narrow: identify the script definition, note that it was not executed, and avoid broader claims about runtime behavior.

The overclaim risk is moderate. Because `deterministic_result` is `not_executed` and `auth_required` is `unknown`, the worker should not claim whether the command binds a port, opens a browser, requires env vars, is safe in CI, or is non-mutating beyond the static script text. It also should not collapse the package-local `vite` script into the repo-root `turbo dev` workflow unless it explicitly distinguishes them.

**Deterministic Checks When The Worker Returns**

Check that the worker’s claims match these verifiable facts:

- [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:6) defines `dev` as exactly `vite`.
- [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:5) contains the `scripts` block and no wrapper flags around `vite`.
- [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:44) includes `@vitejs/plugin-react-swc` and [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:49) includes `vite`, which supports describing it as a Vite-based frontend package.
- [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:11) defines the repo-root `dev` separately as `turbo dev`; the worker must not conflate that with the selected surface.
- The worker must preserve `

### Path 40 `script.npm.preview` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `18.192`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`18.189`

#### Worker Output

## Review: `packages/web/package.json` → `preview` script

**Surface:** CLI command `npm run preview` (line 8)  
**Status:** Not executed | Selected weight: 1.1 | Significance: 0.1

---

### Findings

**Low Risk — Selected Surface**

The `preview` script (`"vite preview"`) is a standard, non-destructive development command that serves a built Vite application. No injection, environment mutation, or state modification occurs from this surface itself.

**Unrelated Hazard Noise**

The reported hazards (lines 173–177 in `codex.test.ts`) are test cleanup code in a different file, not executed by this surface. These are conditional environment variable *restoration* in a `finally` block — destructive classification is misleading; the pattern (save → set → restore/delete if was undefined) is correct test isolation, not a bug.

---

### Recommended Validation

1. **Confirm preview execution context:** Verify `vite preview` runs in expected working directory and with correct build output (`dist/`)
2. **No cross-contamination:** Ensure preview doesn't mutate sibling package state or environment
3. **Isolate hazard review:** The codex test cleanup pattern is sound but should be reviewed independently in its test context for actual isolation bugs (race conditions between parallel tests, leaked env state)

---

**Verdict:** Selected surface is safe. Hazards are in unrelated test code; review separately if test isolation is a concern.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

The task is bounded if the worker is limited to `packages/web/package.json` and the specific discovered surface `script.npm.preview`. That surface is low significance, non-destructive, and marked `dry_run_not_executed`, so the worker should only verify what the `preview` script is, whether it is actually invocable from that package, and whether any claim about auth, side effects, or runtime behavior is supported by repo evidence. Scope should not expand into serving behavior, daemon integration, or actual network/UI observations unless the worker is explicitly allowed to execute commands.

The main overclaim risk is high. The selected surface metadata contains unknowns (`auth_required: unknown`, no schema ref, no execution result), and `preview` scripts often imply behavior that cannot be proven from `package.json` alone. A weak worker prompt may overstate that the script is safe, non-mutating in practice, unauthenticated, or equivalent to a standard Vite preview flow without checking the actual script value and any referenced config. It may also overclaim operational behavior of the web dashboard or daemon integration even though the surface was only discovered by a package-script detector.

Deterministic evidence to check when the worker returns:
- The exact `preview` script string in [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json).
- Whether that script delegates to another tool or local file that changes the risk profile, for example Vite, Turbo, a custom node script, or a shell wrapper.
- Any referenced config files that deterministically constrain behavior, such as `vite.config.*`, workspace scripts, or docs describing preview serving for `packages/web`.
- Whether the worker’s claims stay within what static repo evidence proves:
  - `mutates_state: false` is only justified if the script is plainly a read-only preview/server start command.
  - `auth_required` must remain `unknown` unless code or docs explicitly s
