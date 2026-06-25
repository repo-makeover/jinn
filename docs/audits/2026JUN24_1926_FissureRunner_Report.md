# Fissure Dry-Run Report

- Run: `FRUN-20260624-191731`
- Seed: `20260624`
- Surface scan: `SCAN-20260624-191732`
- Data path scan: `DPATH-20260624-191734`
- Paths selected: 3
- Stop reason: `path_limit_reached`
- Data path summary: `{'total': 1171, 'dead': 29, 'unresolved': 219, 'completed': 923, 'hazard_count': 1740}`
- Deterministic checks: `passed`.
- Runtime probe status: `executed`.
- Model review status: `completed`.
- Runtime probe scope: validation commands only; selected surfaces are not executed.
- Model review scope: report-only; deterministic checks remain authoritative.

## Selected Path Probes

- `script.npm.setup:force` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.preview` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.dev` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`

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

## Runtime Validation Probes

- Probe: `FPROBE-20260624-191736`
- Execution model: `validation_commands_only`
- Summary: `{'configured': 3, 'executed': 3, 'skipped': 0, 'timeout': 0, 'error': 0}`

### Deterministic Check Results

- `no_unhandled_exception` type=process_exit status=passed detail=all executed probes exited with expected codes
- `no_traceback` type=stderr_not_contains status=passed detail=stderr did not contain configured patterns
- `no_secret_leak` type=output_not_contains_regex status=passed detail=output did not match configured secret patterns
- `no_500_for_invalid_input` type=http_status_not_in status=skipped detail=check type is not supported by validation-command probes
- `schema_valid_response` type=response_schema_valid status=skipped detail=check type is not supported by validation-command probes
- `no_unapproved_mutation` type=db_or_file_delta_allowlist status=skipped detail=check type is not supported by validation-command probes
- `destructive_paths_disabled_by_default` type=deny_if_surface_tag status=skipped detail=check type is not supported by validation-command probes

## Model Review

- Review: `FMODEL-20260624-191751`
- Status: `completed`
- Execution model: `incremental_path_review`
- Path reviews: `3`
- Worker model: `kiro_cli:deepseek-3.2` status=`completed`
- Supervisor model: `codex_cli:gpt-5.4` status=`completed`
- Reviewed elapsed seconds: `501.265`
- Scope: report-only; model output does not override deterministic checks.

### Path 1 `script.npm.setup:force` status=`completed`
- File: `package.json`
- Elapsed seconds: `211.317`
- Worker execution: `single`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` kiro_cli:deepseek-3.2 elapsed=`115.342`

#### Worker Output

[m> [0mI'll review the selected path. First, let me examine the package.json file to understand the "setup:force" script that was selected for review.[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/package.json[0m, all lines[m (using tool: read)[0m
[m ✓ [0mSuccessfully read [38;5;244m1400 bytes[0m from /home/ericl/vscode_github_public/jinn/package.json
[m - Completed in 0.1s[0m

[m> [0mNow let me examine the test file mentioned in the hazards to understand the destructive pattern context:[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts[0m, from line [m160[0m to [m190[0m[m (using tool: read)[0m
[m ✓ [0mSuccessfully read [38;5;244m1326 bytes[0m from /home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts
[m - Completed in 0.0s[0m

[m> [0mLet me also check what the [msetup[0m command does to understand the force variant:[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Searching for symbols matching: [m"setup"[0m [[mlimit=10[0m][m (using tool: code)[0m
[2K[1G[1A[?25l
  1. [mFunction[0m [msetup[0m at [mpackages/jinn/src/gateway/__tests__/session-query-routes.test.ts[0m:[m56:1
[0m  2. [mFunction[0m [msetup[0m at [mpackages/jinn/src/gateway/__tests__/queue-cancel-scope.test.ts[0m:[m44:1
[0m  3. [mFunction[0m [msetup[0m at [mpackages/jinn/src/gateway/__tests__/queue-pause-replay.test.ts[0m:[m11:1
[0m  4. [mType[0m [mSetupEngine[0m at [mpackages/jinn/src/cli/setup.ts[0m:[m477:3
[0m  5. [mFunction[0m [mrunSetup[0m at [mpackages/jinn/src/cli/setup.ts[0m:[m354:8
[0m  [m(5 more items found)
[0m[m - Completed in 0.643s[0m

[m> [0mLet me examine the setup command implementation:[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/setup.ts
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`95.972`

#### Supervisor Output

**Watchdog Assessment**

The task is bounded only if the worker stays narrow: classify one script surface and trace its delegation from [package.json](/home/ericl/vscode_github_public/jinn/package.json:20) to [packages/jinn/bin/jinn.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/bin/jinn.ts:24) to [packages/jinn/src/cli/setup.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/setup.ts:357). It is not bounded if the worker claims anything about safe execution, auth, or non-mutation, because this run’s deterministic probe did not execute the selected surface.

Overclaim risk is high. The repo’s own evidence says `setup:force` is destructive: the regression test names it that way in [packages/jinn/src/cli/__tests__/script-surface-map.test.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/__tests__/script-surface-map.test.ts:19), and `runSetup` deletes `JINN_HOME` with `fs.rmSync(...)` when `--force` is set in [packages/jinn/src/cli/setup.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/setup.ts:357). But the Fissure surface scan marks the same surface `mutates_state: false` and `destructive: false` in [.fissure/surfaces.yaml](/home/ericl/vscode_github_public/jinn/.fissure/surfaces.yaml:215). That mismatch is exactly where a worker could overclaim from scan metadata alone.

**Deterministic Evidence To Check On Return**

Check these exact facts before accepting the worker result:

- The worker must say the selected surface was not executed. The current probe says `execution_model: "validation_commands_only"` and `surface_execution: "not_executed"` in [.fissure/probes/FPROBE-20260624-191736.json](/home/ericl/vscode_github_public/jinn/.fissure/probes/FPROBE-20260624-191736.json:56).
- The worker must not equate `deterministic_result: passed` with “surface is safe.” That pass only covers `pnpm typecheck`, `pnpm test`, and `pnpm lint`, and the destructive-path rule was skipped in [.fissure/probes/FPROBE-20260624-191736.json]

### Path 2 `script.npm.preview` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `164.071`
- Worker execution: `single`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` kiro_cli:deepseek-3.2 elapsed=`36.351`

#### Worker Output

[m> [0mI'll review the selected path and examine the evidence provided. Let me first read the relevant file to understand the context better.[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/packages/web/package.json[0m, all lines[m (using tool: read)[0m
[m ✓ [0mSuccessfully read [38;5;244m1499 bytes[0m from /home/ericl/vscode_github_public/jinn/packages/web/package.json
[m - Completed in 0.0s[0m

[m> [0mNow let me examine the test file that contains the destructive patterns mentioned in the hazards:[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts[0m, from line [m165[0m to [m185[0m[m (using tool: read)[0m
[m ✓ [0mSuccessfully read [38;5;244m907 bytes[0m from /home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts
[m - Completed in 0.0s[0m

[m> [0mNow let me get more context around this test to understand the full picture:[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts[0m, from line [m150[0m to [m180[0m[m (using tool: read)[0m
[m ✓ [0mSuccessfully read [38;5;244m1244 bytes[0m from /home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts
[m - Completed in 0.0s[0m

[m> [0mBased on my analysis of the evidence, here's my review of the selected path:[0m[0m
[0m[0m
[m[1m# Fissure Worker Review - Path 2[0m[0m
[0m[0m
[1mSelected Surface:[22m [mpackages/web/package.json[0m → [mnpm run preview[0m[0m[0m
[1mRun ID:[22m FRUN-20260624-191731[0m[0m
[1mPath Status:[22m deterministic_result: passed[0m[0m
[0m[0m
[m[1m## Findings[0m[0m
[0m[0m
[m[1m### 1. [1mEnvironment Variable Cleanup Pattern Risk[22m[0m[0m
[1mSeverity:[22m Medium  [0m[0m
[1mEvidence:[22m [mpackages/jinn/src/eng
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`127.718`

#### Supervisor Output

**Watchdog Verdict**

- `packages/web` `preview` is not safely bounded as selected. The script is exactly `vite preview` in [packages/web/package.json](/home/ericl/vscode_github_public/jinn/packages/web/package.json:5), which is a server process, not a one-shot deterministic check. The repo’s own authority says generated sweep metadata loses to [docs/script-surface-map.md](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:264), and that map classifies analogous web watch surfaces as `bounded: false` / `automated_probe_default: exclude` while not classifying `preview` at all; that omission means the detector should not treat `script.npm.preview` as a clean automated pass.
- Overclaim risk is high. The run metadata already says `deterministic_result: "passed"` while `planned_execution` says `surface_not_executed_validation_probe_only`. If the worker comes back with “passed” absent an explicit timeout/startup/teardown harness, that would only justify “surface identified” or “execution intentionally skipped,” not “preview validated.”
- Local repo state around the run was clean but not validated for this surface: the Dory checkpoints immediately before the run show `main`, clean tree, and no tests run in [.dory/checkpoints/20260624T1916310.md](/home/ericl/vscode_github_public/jinn/.dory/checkpoints/20260624T1916310.md:1) and [.dory/checkpoints/20260624T1916370.md](/home/ericl/vscode_github_public/jinn/.dory/checkpoints/20260624T1916370.md:1). Giles is also still advisory-blocked overall in [.giles/compliance_status.yaml](/home/ericl/vscode_github_public/jinn/.giles/compliance_status.yaml:1), so this worker should not imply repo-wide cleanliness from a single script probe.

**Deterministic Evidence To Check On Return**

- Require the worker to say whether it actually executed `vite preview` or only classified/skipped it. “Passed” is invalid if execution never happened.
- If it executed the script, require:
  - exact command line and working directory;
  - e

### Path 3 `script.npm.dev` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `125.877`
- Worker execution: `single`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` kiro_cli:deepseek-3.2 elapsed=`28.503`

#### Worker Output

[m> [0mI'll review the selected path and analyze the evidence provided. Let me first examine the relevant files.[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Searching for symbols matching: [m"codex.test.ts"[0m in [mpackages/jinn/src/engines/__tests__[0m[m (using tool: code)[0m
[2K[1G[1A[?25l
No symbols found (scoped to: packages/jinn/src/engines/__tests__)
[m - Completed in 0.80s[0m

[m> [0m[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts[0m, from line [m160[0m to [m190[0m[m (using tool: read)[0m
[m ✓ [0mSuccessfully read [38;5;244m1326 bytes[0m from /home/ericl/vscode_github_public/jinn/packages/jinn/src/engines/__tests__/codex.test.ts
[m - Completed in 0.0s[0m

[m> [0mNow let me examine the package.json file to understand the selected surface:[0m[0m
[0m[0m
<｜DSML｜function_calls[0m[0m
Reading file: [m/home/ericl/vscode_github_public/jinn/packages/web/package.json[0m, all lines[m (using tool: read)[0m
[m ✓ [0mSuccessfully read [38;5;244m1499 bytes[0m from /home/ericl/vscode_github_public/jinn/packages/web/package.json
[m - Completed in 0.0s[0m

[m> [0mBased on my review of the evidence, here is my analysis:[0m[0m
[0m[0m
[m[1m## Fissure Worker Review - Selected Path[0m[0m
[0m[0m
[1mSelected Surface:[22m [mnpm run dev[0m ([mpackages/web/package.json[0m - script.npm.dev)[0m[0m
[0m[0m
[1mPath Index:[22m 3/3[0m[0m
[0m[0m
[m[1m### Findings[0m[0m
[0m[0m
[m[1m#### 1. [1mTest Environment Cleanup Hazard[22m[0m[0m
[1mEvidence:[22m Multiple [mdelete process.env.*[0m operations in [mcodex.test.ts[0m (lines 173-177)[0m[0m
[1mtypescript
[0m[mif (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
if (prevCodex === undefined) delete process.env.CODEX_HOME;
[0m[0m[0m
[0m[0m
[1mRisk:[22m Destructive 
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`97.373`

#### Supervisor Output

**Watchdog Report**

The task is bounded only if the worker stays at static classification of one surface in one file: [`packages/web/package.json`](/home/ericl/vscode_github_public/jinn/packages/web/package.json:5). The deterministic local fact is just `scripts.dev = "vite"` at line 6. Anything beyond that, especially runtime claims about ports, auth, safety, or successful execution, would exceed the evidence because the selected plan says `surface_not_executed_validation_probe_only`.

Overclaim risk is high. [`docs/INDEX.md`](/home/ericl/vscode_github_public/jinn/docs/INDEX.md:13) says [`docs/script-surface-map.md`](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:13) is the authoritative source when generated metadata conflicts, and that map does not classify `packages/web` `dev`; it only classifies `packages/web` `test`, `test:watch`, and `clean` at [`docs/script-surface-map.md`](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:264). The same-day local audit also calls out that `package dev` still needs full classification and recommends allowlist-based deterministic sweeps limited to `typecheck`, `lint`, `test`/`vitest run`, and explicit read-only dry-run surfaces: [`docs/audits/2026-06-24-script-surface-classification-audit.md`](/home/ericl/vscode_github_public/jinn/docs/audits/2026-06-24-script-surface-classification-audit.md:164), [`docs/script-surface-map.md`](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:353). A worker that returns “passed” without saying “static-only, not executed” is likely overstating.

Deterministic evidence to require when the worker returns:
- A citation to [`packages/web/package.json`](/home/ericl/vscode_github_public/jinn/packages/web/package.json:5) showing the exact literal `dev: "vite"` mapping.
- An explicit statement that the surface was not executed, so any result is metadata/static review only.
- A citation to the authoritative map showing that `packages/web` `dev` is not cu
