# Fissure Dry-Run Report

- Run: `FRUN-20260625-084645`
- Seed: `20260625`
- Surface scan: `SCAN-20260625-084646`
- Data path scan: `DPATH-20260625-084648`
- Paths selected: 1
- Stop reason: `path_limit_reached`
- Data path summary: `{'total': 1171, 'dead': 29, 'unresolved': 219, 'completed': 923, 'hazard_count': 1740}`
- Deterministic checks: `not_executed`.
- Runtime probe status: `not_executed`.
- Model review status: `completed`.
- Runtime probe scope: validation commands only; selected surfaces are not executed.
- Model review scope: report-only; deterministic checks remain authoritative.

## Selected Path Probes

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

## Model Review

- Review: `FMODEL-20260625-084650`
- Status: `completed`
- Execution model: `incremental_path_review`
- Path reviews: `1`
- Worker model: `agy_cli:Gemini 3.5 Flash (Low)` status=`completed`
- Supervisor model: `codex_cli:gpt-5.4` status=`completed`
- Reviewed elapsed seconds: `35.048`
- Scope: report-only; model output does not override deterministic checks.

### Path 1 `script.npm.dev` status=`completed`
- File: `packages/web/package.json`
- Elapsed seconds: `35.048`
- Worker execution: `single`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`35.047`

#### Worker Output

### Path Review Report

**Path Index**: 1 / 1  
**Run ID**: `FRUN-20260625-084645`  
**Selected Surface**: `script.npm.dev` (`"dev": "vite"` in `packages/web/package.json`)  
**Execution Status**: **Not Executed** (Dry Run / No Execution Claimed)

---

### 1. Findings & Risk Areas

#### Risk A: Concurrent Test Environment Interference (Race Conditions)
* **Evidence**: `packages/jinn/src/engines/__tests__/codex.test.ts` (Lines 173, 175, 177)
  ```typescript
  if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
  if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
  if (prevCodex === undefined) delete process.env.CODEX_HOME;
  ```
* **Impact**: The tests globally mutate `process.env` during test execution. If tests are run concurrently or in parallel with other test suites or development servers, mutating global state can cause race conditions, flaky test outcomes, or unexpected environment behavior across the workspace.

#### Risk B: Unexpected Environment Leakage / Dependency during Local Development
* **Evidence**: `packages/web/package.json` (`"dev": "vite"`) & `packages/web/vite.config.ts`
* **Impact**: When running the dev server via `npm run dev`, Vite inherits all host environment variables (including sensitive tokens like `GITHUB_TOKEN` and `CLAUDE_CODE_SESSION`). If future configuration or custom plugins serialize or dump `process.env` (similar to how `process.env.NEXT_PUBLIC_GATEWAY_URL` is explicitly exposed via `define`), these sensitive keys run the risk of being bundled and leaked to the frontend client.

---

### 2. Recommended Validation

1. **Verify Test Isolation**:
   * Run the test suite using isolated threads or serial execution to ensure that mutations to `process.env` in `codex.test.ts` do not pollute or crash other tests.
   * **Recommendation**: Refactor `codex.test.ts` to mock `process.env` safely using testing frameworks (e.g., `vi.stubEnv` in Vitest or standard test isolation libraries) rather than mutating glo
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

The task is bounded if the worker stays on `packages/web/package.json` and treats `script.npm.dev` strictly as a package-script surface review, not as a full runtime or app behavior review. Scope should be limited to what the `dev` script declares, what command it invokes, and whether that declaration is accurately represented in the scan metadata. The main risk is scope drift from a static script entry into claims about what the dev server actually does at runtime.

The worker prompt is somewhat likely to overclaim if it does not force a distinction between static evidence and unexecuted behavior. `deterministic_result` is `not_executed` and `planned_execution` is `dry_run_not_executed`, so any claim about auth, network behavior, state mutation, safety, or actual startup effects would be unsupported unless the worker clearly marks it as inference. The highest-risk overclaims would be:
- claiming the `dev` script is safe to run rather than only non-destructive by inspection
- claiming auth is not required when metadata says `auth_required: unknown`
- claiming the script’s downstream command, port, environment needs, or side effects without citing the script value and referenced tooling config
- treating package metadata as proof of surface behavior beyond the literal command string

Deterministic evidence to check when the worker returns:
- The exact `dev` script value in `packages/web/package.json`.
- Whether the worker quotes or accurately paraphrases that value without embellishment.
- Whether any referenced tool (`vite`, `turbo`, custom node script, etc.) is actually declared in the same file’s `scripts` or dependencies/devDependencies.
- If the worker mentions runtime characteristics, verify they are backed by adjacent static files such as `packages/web/vite.config.*`, relevant env file templates, or repo scripts actually referenced by the `dev` command.
- Confirm the worker preserves the execution state: no claims of execution success, no inferred logs, no cla
