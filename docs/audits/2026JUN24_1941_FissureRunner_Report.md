# Fissure Dry-Run Report

- Run: `FRUN-20260624-193803`
- Seed: `20260624`
- Surface scan: `SCAN-20260624-193804`
- Data path scan: `DPATH-20260624-193807`
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

- Probe: `FPROBE-20260624-193809`
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

- Review: `FMODEL-20260624-193821`
- Status: `completed`
- Execution model: `incremental_path_review`
- Path reviews: `3`
- Worker model: `claude_cli:haiku` status=`completed`
- Supervisor model: `codex_cli:gpt-5.4` status=`completed`
- Reviewed elapsed seconds: `498.862`
- Scope: report-only; model output does not override deterministic checks.

### Path 1 `script.npm.setup:force` status=`completed`
- File: `package.json`
- Elapsed seconds: `210.71`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` opencode_cli:gpt-5.5-fast elapsed=`54.992`

#### Worker Output

Now I have full context. Let me also quickly check the run artifact writer for the hazard-to-selected-surface mapping logic.
### Fissure Path Review — Path 1/3

**Surface**: `script.npm.setup:force` — `package.json` npm script, discovered by `js_package_scripts_detector`

#### Summary
Low-risk, unchanged, non-destructive `npm run setup:force` CLI command. Significance 0.1, selection weight 1.1. Not executed (validation-probe-only).

#### Selected-Surface Findings

| Field | Value | Assessment |
|---|---|---|
| kind | `cli_command` | Correct (not test/lint/typecheck) |
| destructive | `false` | Accurate for a setup script |
| mutates_state | `false` | Plausible default, but setup scripts often do mutate state |
| auth_required | `unknown` | Honest default — no heuristic applied |
| diff_status | `unchanged` | Already known surface, no boost |
| selection_weight | 1.1 | Correct: 1.0 base + 0.1 significance (only "test not in tags" fired) |

**Risk 1 — `mutates_state` undercount**: `setup:force` likely writes files (installs deps, copies configs, builds). The detector assigns `mutates_state: false` to all package scripts by default. If this script runs `npm install`, `lerna bootstrap`, or similar, it mutates `node_modules/` and possibly `package-lock.json`. Actual state-mutation risk is higher than declared.

**Risk 2 — `auth_required` unknown**: A `setup:force` script may use tokens, private registries, or git credentials. `auth_required: unknown` is correct as a static-analysis default but should be treated as uninvestigated, not safe.

#### Related Hazards (8 items, all in `codex.test.ts`)

All hazards are from the target repo's test file `packages/jinn/src/engines/__tests__/codex.test.ts`, lines 173–177. They are **not in the selected surface file** but were surfaced via the same Fissure run's data-path analysis.

**Pattern** (lines ~170–177):
```
const prevGithub = process.env.GITHUB_TOKEN
const prevClaude = process.env.CLAUDE_CODE_SESSION
const prevCodex = proces
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`155.716`

#### Supervisor Output

**Watchdog Report**

The task is bounded only if the worker stays at static classification of one script surface and traces the real delegation chain from [package.json](/home/ericl/vscode_github_public/jinn/package.json:20) to [packages/jinn/bin/jinn.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/bin/jinn.ts:24) to [packages/jinn/src/cli/setup.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/setup.ts:357). It is not bounded if the worker claims runtime safety, auth behavior, or non-mutation from scan metadata alone.

Overclaim risk is high. The current scan still marks `script.npm.setup:force` as `mutates_state: false` and `destructive: false` in [.fissure/surfaces.yaml](/home/ericl/vscode_github_public/jinn/.fissure/surfaces.yaml:215), but the actual implementation deletes `JINN_HOME` recursively when `--force` is set in [packages/jinn/src/cli/setup.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/setup.ts:357). The nuance is that it is destructive but guarded: [packages/jinn/src/cli/instances.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/instances.ts:30) rejects root, user home, cwd, and symlink targets, and those cases are covered in [packages/jinn/src/cli/__tests__/instances-safety.test.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/__tests__/instances-safety.test.ts:20). The repo also has a regression test explicitly classifying root `setup:force` as destructive in [packages/jinn/src/cli/__tests__/script-surface-map.test.ts](/home/ericl/vscode_github_public/jinn/packages/jinn/src/cli/__tests__/script-surface-map.test.ts:19).

**Return Gate**

Require these exact facts before accepting the worker result:

- The worker must say the surface was not executed. The current probe says `deterministic_result: "passed"`, `execution_model: "validation_commands_only"`, and `surface_execution: "not_executed"` in [.fissure/probes/FPROBE-20260624-193809.json](/home/ericl/vscode_github_public/jinn/.fiss

### Path 2 `script.npm.preview` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `178.974`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`92.263`

#### Worker Output

**Finding**
- Medium: `packages/web/package.json` makes `preview` a bare `vite preview` server, but the web app is built around gateway-backed `/api` and `/ws` traffic. The API client issues relative `/api/*` requests in [packages/web/src/lib/api.ts](/home/ericl/vscode_github_public/jinn/packages/web/src/lib/api.ts#L453), and the PTY terminal opens `/ws/pty/...` sockets in [packages/web/src/components/cli-terminal.tsx](/home/ericl/vscode_github_public/jinn/packages/web/src/components/cli-terminal.tsx#L91). The only proxy wiring is under `server.proxy` in [packages/web/vite.config.ts](/home/ericl/vscode_github_public/jinn/packages/web/vite.config.ts#L26), so `preview` likely does not mirror the dev/runtime backend path and can produce a false-green “works in preview” signal.

**Recommended validation**
- Run the preview server against a page that hits `/api` and `/ws`, then verify those requests resolve end to end.
- If `preview` is supposed to be a parity check, add preview-time proxying and re-run the same route coverage.

Static review only; I did not claim execution of the selected surface.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`86.709`

#### Supervisor Output

**Watchdog**
The review task is bounded if it stays narrow: classify one selected surface, `script.npm.preview`, from [packages/web/package.json](/home/ericl/vscode_github_public/jinn/packages/web/package.json:5). The surface itself is not bounded at runtime: the script is `vite preview` ([packages/web/package.json](/home/ericl/vscode_github_public/jinn/packages/web/package.json:6)), which is a server-style command rather than a deterministic one-shot validation command. So the worker can safely do a bounded static review, but it should not imply the selected surface is itself bounded or was safely exercised.

Overclaim risk is medium-high. The main trap is that generated metadata marks `script.npm.preview` as `mutates_state: false` and non-destructive ([SCAN-20260624-193804.yaml](/home/ericl/vscode_github_public/jinn/.fissure/scans/SCAN-20260624-193804.yaml:177)), but the repo says generated script metadata is subordinate to the authoritative script map ([docs/INDEX.md](/home/ericl/vscode_github_public/jinn/docs/INDEX.md:13)). That authoritative map does not classify `packages/web` `preview` at all; it only documents `test`, `test:watch`, and `clean`, and its deterministic allowlist omits `preview` entirely ([docs/script-surface-map.md](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:264), [docs/script-surface-map.md](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:353)). Also, the reported deterministic pass is not evidence about `preview`: the probe explicitly says `surface_execution` was `not_executed` and only ran repo-wide `pnpm typecheck`, `pnpm test`, and `pnpm lint` ([FPROBE-20260624-193809.json](/home/ericl/vscode_github_public/jinn/.fissure/reports/FPROBE-20260624-193809.json:56), [FPROBE-20260624-193809.json](/home/ericl/vscode_github_public/jinn/.fissure/reports/FPROBE-20260624-193809.json:109)). Several invariants were skipped, including mutation checks ([FPROBE-20260624-193809.json](/home/ericl/vscode_github_public/ji

### Path 3 `script.npm.dev` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `109.178`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`18.794`

#### Worker Output

## Path 3/3: `packages/web/package.json` npm dev script

### Finding: No Issues with Selected Surface

The `dev` script (`vite`) is **clean and non-destructive**. It is a standard Vite dev server invocation with no file mutations, environment manipulation, or auth requirements.

---

### Related Hazards: Context from Broader Audit

The listed hazards all originate from **`packages/jinn/src/engines/__tests__/codex.test.ts`** (lines 173–177) and are **unrelated to the selected surface**. They document environment cleanup patterns in test code:

```javascript
if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
if (prevCodex === undefined) delete process.env.CODEX_HOME;
```

**Assessment of hazards** (not this path):
- ✓ **Pattern is correct**: Saves original values, restores in finally block
- ⚠️ **Thread-safety risk**: `process.env` mutations in parallel tests can race; **recommend `vi.stubEnv()` instead** of direct delete
- ✓ **No evidence of execution on selected surface**: The `npm run dev` script does not invoke this test cleanup code

---

### Validation Recommendation

- ✓ No validation needed for this path (non-destructive, no state mutations)
- Consider: In parallel test runs, replace `delete process.env.VAR` with `vi.stubEnv({ VAR: undefined })` in `codex.test.ts` for isolation

**Status**: Selected surface is **safe to execute**.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`90.382`

#### Supervisor Output

**Watchdog Report**

The task is bounded only as a static review of one surface. The deterministic fact is just that [`packages/web/package.json`](/home/ericl/vscode_github_public/jinn/packages/web/package.json:6) maps `dev` to `vite`, and the selected plan says `surface_not_executed_validation_probe_only`. Because the surface was not executed, the worker must not claim observed runtime behavior.

Overclaim risk is high.

- `deterministic_result: passed` does not mean the `dev` surface passed. The only recorded probe is validation-only in [`.fissure/probes/FPROBE-20260624-193809.json`](/home/ericl/vscode_github_public/jinn/.fissure/probes/FPROBE-20260624-193809.json:1), and it says `surface_execution: "not_executed"` while only running `pnpm typecheck`, `pnpm test`, and `pnpm lint`.
- The repo’s authoritative surface doc says generated metadata loses to [`docs/script-surface-map.md`](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:1) when they conflict, via [`docs/INDEX.md`](/home/ericl/vscode_github_public/jinn/docs/INDEX.md:9).
- That map does not classify `packages/web` `dev`; it only classifies `test`, `test:watch`, and `clean` for `packages/web` at [`docs/script-surface-map.md`](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:264).
- A same-day local audit says package `dev` still needs full classification and deterministic sweeps should stay allowlist-based, excluding unclassified surfaces like this one by omission: [`docs/audits/2026-06-24-script-surface-classification-audit.md`](/home/ericl/vscode_github_public/jinn/docs/audits/2026-06-24-script-surface-classification-audit.md:160), [`docs/script-surface-map.md`](/home/ericl/vscode_github_public/jinn/docs/script-surface-map.md:353).
- There is also an evidence gap: the exact run artifacts for `FRUN-20260624-193803` are missing locally, while the model-review record is still `running` in [`.fissure/model_reviews/FMODEL-20260624-193821.json`](/home/ericl/vscode_github_public/j
