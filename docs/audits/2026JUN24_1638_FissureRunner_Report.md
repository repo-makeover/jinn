# Fissure Dry-Run Report

- Run: `FRUN-20260624-163818`
- Seed: `20260624`
- Surface scan: `SCAN-20260624-163819`
- Data path scan: `DPATH-20260624-163821`
- Paths selected: 20
- Stop reason: `path_limit_reached`
- Data path summary: `{'total': 1166, 'dead': 29, 'unresolved': 218, 'completed': 919, 'hazard_count': 1732}`
- Deterministic checks: `failed`.
- Runtime probe status: `executed`.
- Model review status: `not_requested`.
- Runtime probe scope: validation commands only; selected surfaces are not executed.
- Model review scope: report-only; deterministic checks remain authoritative.

## Selected Path Probes

- `script.npm.setup:force` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.preview` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.dev` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.test:watch` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.coverage` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/jinn/package.json`
- `script.npm.start` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.jinn` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.clean` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.nuke` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.lint` (validation_script) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `cli.argparse.kokoro_sidecar` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/jinn/src/talk/kokoro_sidecar.py`
- `script.npm.test` (validation_script) score=0.0 weight=1.0 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.status` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.setup` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.postinstall` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.build` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.test:e2e` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.stop` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.typecheck` (validation_script) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.setup:force` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=2 strategy=empty_input file=`package.json`

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

- `audit-code-security` relationship=complements triggers=1252 top={'side_channel': 719, 'destructive': 325, 'shell_exec': 208}
  - Fissure role: Highlights shell execution, secrets/logging, destructive operations, and trust-boundary candidates.
  - Limits: Does not validate exploitability, authorization, tenant isolation, or injection sinks end-to-end.
- `audit-nodejs-security` relationship=complements triggers=1252 top={'side_channel': 719, 'destructive': 325, 'shell_exec': 208}
  - Fissure role: Flags Node/TypeScript child-process, process.env, package-script, and runtime hazard candidates.
  - Limits: Does not inspect lockfiles, CORS/cookie config, npm publishing exposure, or runtime flags completely.
- `audit-input-output-path` relationship=partial_replacement triggers=1044 top={'side_channel': 719, 'destructive': 325}
  - Fissure role: Inventories ingress/output-like paths, generated artifacts, log/report leakage candidates, and unsafe path/string hazards.
  - Limits: Does not actively craft malicious archives, files, or malformed payloads.
- `audit-operator-signal` relationship=complements triggers=719 top={'side_channel': 719}
  - Fissure role: Surfaces log/report leakage and unresolved/dead-path visibility risks.
  - Limits: Does not verify health endpoint honesty, alerts, or runbook quality.
- `audit-architecture-seam` relationship=complements triggers=342 top={'unresolved': 218, 'redundancy_parallel': 124}
  - Fissure role: Highlights unresolved call chains, cross-layer-looking sinks, and repeated implementation hotspots.
  - Limits: Does not reason about intended ownership without human architecture context.
- `audit-data-integrity` relationship=complements triggers=325 top={'destructive': 325}
  - Fissure role: Highlights destructive and persistence-looking paths that may affect persisted correctness.
  - Limits: Does not validate database constraints, migrations, provenance, or round-trip behavior.
- `audit-pipeline-graph` relationship=complements triggers=218 top={'unresolved': 218}
  - Fissure role: Provides a machine inventory of ingress paths, hops, termini, and selected dry-run variants.
  - Limits: Does not branch-expand full lifecycle graphs or run replayable inputs yet.
- `audit-internalapi-contract` relationship=complements triggers=218 top={'unresolved': 218}
  - Fissure role: Uses unresolved call chains and ingress-to-service paths to seed contract-boundary review.
  - Limits: Does not inspect all DTO/schema/error contracts or contract tests.
- `audit-temporal` relationship=complements triggers=216 top={'sequential_order': 216}
  - Fissure role: Flags sequencing, retry, timeout, and cache/state timing hints.
  - Limits: Does not prove lifecycle freshness or ordering correctness.
- `audit-reliability` relationship=complements triggers=216 top={'sequential_order': 216}
  - Fissure role: Identifies unresolved/dead paths, retry/order hints, and partial-output report risks.
  - Limits: Does not fault-inject missing dependencies or crashes.

## Runtime Validation Probes

- Probe: `FPROBE-20260624-163823`
- Execution model: `validation_commands_only`
- Summary: `{'configured': 3, 'executed': 3, 'skipped': 0, 'timeout': 0, 'error': 0}`

### Deterministic Check Results

- `no_unhandled_exception` type=process_exit status=failed detail=unexpected process exit code
- `no_traceback` type=stderr_not_contains status=passed detail=stderr did not contain configured patterns
- `no_secret_leak` type=output_not_contains_regex status=passed detail=output did not match configured secret patterns
- `no_500_for_invalid_input` type=http_status_not_in status=skipped detail=check type is not supported by validation-command probes
- `schema_valid_response` type=response_schema_valid status=skipped detail=check type is not supported by validation-command probes
- `no_unapproved_mutation` type=db_or_file_delta_allowlist status=skipped detail=check type is not supported by validation-command probes
- `destructive_paths_disabled_by_default` type=deny_if_surface_tag status=skipped detail=check type is not supported by validation-command probes
