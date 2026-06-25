# Fissure Dry-Run Report

- Run: `FRUN-20260625-171340`
- Status: `completed`
- Seed: `20260624`
- Surface scan: `SCAN-20260625-171345`
- Data path scan: `DPATH-20260625-171353`
- Paths selected: 8
- Stop reason: `path_limit_reached`
- Data path summary: `{'total': 1216, 'dead': 27, 'unresolved': 200, 'completed': 989, 'hazard_count': 1612}`
- Deterministic checks: `failed`.
- Runtime probe status: `executed`.
- Model review status: `completed`.
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
- `data.environment.packages.jinn.src.engines.__tests__.kiro.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=161 file=`packages/jinn/src/engines/__tests__/kiro.test.ts` evidence='if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;'
- `data.environment.packages.jinn.src.engines.__tests__.kiro.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=163 file=`packages/jinn/src/engines/__tests__/kiro.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.kiro.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=165 file=`packages/jinn/src/engines/__tests__/kiro.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'
- `data.environment.packages.jinn.src.engines.__tests__.kiro.test.ts.const_prevClaude_process_env_CLAUDE_CODE_SESSION` destructive severity=high line=167 file=`packages/jinn/src/engines/__tests__/kiro.test.ts` evidence='if (prevKiro === undefined) delete process.env.KIRO_API_KEY;'
- `data.environment.packages.jinn.src.engines.__tests__.kiro.test.ts.const_prevCodex_process_env_CODEX_HOME` destructive severity=high line=161 file=`packages/jinn/src/engines/__tests__/kiro.test.ts` evidence='if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;'
- `data.environment.packages.jinn.src.engines.__tests__.kiro.test.ts.const_prevCodex_process_env_CODEX_HOME` destructive severity=high line=163 file=`packages/jinn/src/engines/__tests__/kiro.test.ts` evidence='if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;'
- `data.environment.packages.jinn.src.engines.__tests__.kiro.test.ts.const_prevCodex_process_env_CODEX_HOME` destructive severity=high line=165 file=`packages/jinn/src/engines/__tests__/kiro.test.ts` evidence='if (prevCodex === undefined) delete process.env.CODEX_HOME;'

## Audit Lens Recommendations

- `audit-code-security` relationship=complements triggers=1131 top={'side_channel': 634, 'destructive': 286, 'shell_exec': 211}
  - Fissure role: Highlights shell execution, secrets/logging, destructive operations, and trust-boundary candidates.
  - Limits: Does not validate exploitability, authorization, tenant isolation, or injection sinks end-to-end.
- `audit-nodejs-security` relationship=complements triggers=1131 top={'side_channel': 634, 'destructive': 286, 'shell_exec': 211}
  - Fissure role: Flags Node/TypeScript child-process, process.env, package-script, and runtime hazard candidates.
  - Limits: Does not inspect lockfiles, CORS/cookie config, npm publishing exposure, or runtime flags completely.
- `audit-input-output-path` relationship=partial_replacement triggers=920 top={'side_channel': 634, 'destructive': 286}
  - Fissure role: Inventories ingress/output-like paths, generated artifacts, log/report leakage candidates, and unsafe path/string hazards.
  - Limits: Does not actively craft malicious archives, files, or malformed payloads.
- `audit-operator-signal` relationship=complements triggers=634 top={'side_channel': 634}
  - Fissure role: Surfaces log/report leakage and unresolved/dead-path visibility risks.
  - Limits: Does not verify health endpoint honesty, alerts, or runbook quality.
- `audit-architecture-seam` relationship=complements triggers=325 top={'unresolved': 200, 'redundancy_parallel': 125}
  - Fissure role: Highlights unresolved call chains, cross-layer-looking sinks, and repeated implementation hotspots.
  - Limits: Does not reason about intended ownership without human architecture context.
- `audit-data-integrity` relationship=complements triggers=286 top={'destructive': 286}
  - Fissure role: Highlights destructive and persistence-looking paths that may affect persisted correctness.
  - Limits: Does not validate database constraints, migrations, provenance, or round-trip behavior.
- `audit-temporal` relationship=complements triggers=216 top={'sequential_order': 216}
  - Fissure role: Flags sequencing, retry, timeout, and cache/state timing hints.
  - Limits: Does not prove lifecycle freshness or ordering correctness.
- `audit-reliability` relationship=complements triggers=216 top={'sequential_order': 216}
  - Fissure role: Identifies unresolved/dead paths, retry/order hints, and partial-output report risks.
  - Limits: Does not fault-inject missing dependencies or crashes.
- `audit-security` relationship=complements triggers=211 top={'shell_exec': 211}
  - Fissure role: Flags shell, path, secret, and trust-boundary candidates for deeper security review.
  - Limits: Does not validate authz/authn, exploitability, or deployment posture end-to-end.
- `audit-pipeline-graph` relationship=complements triggers=200 top={'unresolved': 200}
  - Fissure role: Provides a machine inventory of ingress paths, hops, termini, and selected dry-run variants.
  - Limits: Does not branch-expand full lifecycle graphs or run replayable inputs yet.

## Runtime Validation Probes

- Probe: `FPROBE-20260625-171356`
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

## Model Review

- Review: `FMODEL-20260625-171429`
- Status: `completed`
- Execution model: `incremental_path_review`
- Path reviews: `8`
- Worker model: `claude_cli:haiku` status=`completed`
- Supervisor model: `codex_cli:gpt-5.4` status=`completed`
- Reviewed elapsed seconds: `319.174`
- Scope: report-only; model output does not override deterministic checks.

### Path 1 `script.npm.setup:force` status=`completed`
- File: `package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `35.932`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` kilo_cli:gemini-2.5-flash-default-route elapsed=`35.917`

#### Worker Output

## Findings

1. **High: process-wide env cleanup in tests can taint validation around `script.npm.setup:force`**
   - Evidence: `packages/jinn/src/engines/__tests__/codex.test.ts:173` deletes `process.env.GITHUB_TOKEN` when `prevGithub === undefined`; `:175` deletes `process.env.CLAUDE_CODE_SESSION`; `:177` deletes `process.env.CODEX_HOME`.
   - Risk: those mutations affect the whole Node process, so later deterministic checks for the selected surface can fail for environment-related reasons unrelated to the `setup:force` script itself. This is especially risky because the deterministic result for this path is already `failed`.
   - Why it matters for this path: the selected surface is a package script (`surface_id: \`script.npm.setup:force\``) discovered from `package.json`, and package-script validation commonly depends on inherited environment.

2. **Medium: insufficient direct evidence for the `setup:force` script body creates a review blind spot**
   - Evidence: the selected surface points to `package.json` with `kind: \`cli_command\`` and tag `setup:force`, but no script definition, command text, or line range was supplied.
   - Risk: the name `setup:force` suggests potentially state-changing behavior, yet the supplied evidence marks the surface `destructive: false` and `mutates_state: false` without showing the underlying command. That classification cannot be trusted from this evidence alone.

## Evidence

- Selected surface: `package.json` -> `script.npm.setup:force`
- Planned execution: `surface_not_executed_validation_probe_only`
- Deterministic result: `failed`
- Related hazards:
  - `packages/jinn/src/engines/__tests__/codex.test.ts:173`
  - `packages/jinn/src/engines/__tests__/codex.test.ts:175`
  - `packages/jinn/src/engines/__tests__/codex.test.ts:177`

## Recommended Validation

1. Inspect the exact `package.json` entry for `setup:force` and verify whether it mutates repo state, installs tooling, or depends on `GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, 
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.001`

#### Supervisor Output

**Watchdog Report**

Selected surface is **bounded**. `package.json` at the repo root is repo-owned and the detected surface exists as a real npm script:
[`package.json:20`](/home/ericl/Work/vscode/public_share/jinn/package.json:20) defines `"setup:force": "pnpm build && node packages/jinn/dist/bin/jinn.js setup --force"`.

This is **not selection drift**:
- It is not stale or missing.
- It is inside the repo-owned tree.
- It is not under temp, vendor, or virtualenv paths.
- The detector selected a concrete script entry, not an inferred path.

**Overclaim risk**
- High if the worker reports runtime behavior. The surface metadata says `planned_execution: surface_not_executed_validation_probe_only`, so the worker should not claim the script succeeds, fails, is safe, or is idempotent from static inspection alone.
- Medium if the worker ignores that `--force` is an explicit state-affecting flag. The metadata says `mutates_state: false`, but the command semantics suggest potential mutation if executed. That mismatch is a surface-modeling issue, not yet a product defect.
- Medium if the worker treats this as an auth finding. `auth_required` is `unknown`; no auth conclusion is justified from the script string alone.

**Deterministic evidence to require from the worker**
- Exact citation of the script definition at [`package.json:20`](/home/ericl/Work/vscode/public_share/jinn/package.json:20).
- Explicit acknowledgment that the command was **not executed** and that conclusions are limited to static command composition.
- Exact command expansion:
  - `pnpm build`
  - `node packages/jinn/dist/bin/jinn.js setup --force`
- Recognition that the script depends on a built artifact path under `packages/jinn/dist/bin/jinn.js`, so any claim about runtime behavior requires execution evidence after `pnpm build`.
- Separation between:
  - static fact: the script exists and chains build plus setup
  - inference: `--force` likely alters setup behavior
  - unknowns: auth, side effects, suc

### Path 2 `script.npm.preview` status=`completed`
- File: `packages/web/package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `21.239`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`21.228`

#### Worker Output

I will start by viewing the files in the workspace to gather evidence regarding the selected path (`packages/web/package.json` for script `preview`) and inspect the related hazards to see if they apply or what bugs/risks exist in this path.

First, let's verify what workspace we have by running a search or listing files in the default project directory.
### Findings & Risk Analysis: `packages/web/package.json` (`script.npm.preview`)

Based on the evidence from the codebase, we found the following risk/bug associated with the `preview` script surface:

---

#### 1. Missing Proxy Configuration for the Preview Server
* **Finding**: The Vite configuration in [vite.config.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/vite.config.ts) defines proxy rules under `server.proxy` for dev mode, but does not specify them for preview mode under `preview.proxy`.
* **Evidence**:
  * In [package.json](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/package.json#L8), the `preview` script executes `vite preview`.
  * In [vite.config.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/web/vite.config.ts#L26-L38), proxy settings are only declared for the dev `server`:
    ```typescript
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${gatewayPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://127.0.0.1:${gatewayPort}`,
          ws: true,
          changeOrigin: true,
        },
      },
    }
    ```
  * In Vite, `server.proxy` rules **do not** automatically apply to the preview server. Without defining `preview.proxy`, any backend API (`/api`) or WebSocket (`/ws`) requests will result in `404 Not Found` errors when served by `vite preview`.

---

#### 2. Implicit Build Dependency
* **Finding**: The `preview` script does not guarantee a fresh build output directory (`out/`) is present before execution. 
* **Evidence**:
  * [package.json](file:///home/ericl/Work/vscode/pub
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.001`

#### Supervisor Output

**Watchdog Report**

The task is bounded. The selected surface is a single in-repo package script at [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:8), with `surface_id: script.npm.preview` and planned scope `surface_not_executed_validation_probe_only`. That is narrow enough for a worker to assess without broad repo claims.

The main overclaim risk is behavioral inference. The script currently resolves to `"preview": "vite preview"` at [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:8). A worker should not claim more than that unless it has execution evidence. In particular, it should not assert:
- that the preview command is broken or working
- that auth is required
- that it mutates state
- that it is production-safe or repo-integrated
- that the daemon serves this path the same way as the package-local Vite preview server

**Deterministic evidence to check on return**
- The selected file exists under the repo-owned tree: `packages/web/package.json`.
- The `preview` script is present and exactly maps to `vite preview`.
- No adjacent wrapper script or custom CLI is involved in this surface.
- If the worker reports a finding, require direct evidence tied to this file or a command result. For example:
  - script text from `package.json`
  - command stderr/stdout from actually running `pnpm --filter @jinn/web preview` or equivalent
  - any port/host assumptions must come from Vite output or config, not inference
- If the worker claims a validation failure without execution, classify it as unsupported unless the failure is purely static, such as “surface metadata says X but script text says Y”.

**Selection drift**
No drift detected. The surface is not stale, missing, temp, vendor, virtualenv, or outside the repo-owned tree. This should be treated as a product surface, not a scan-path issue.

**Safe resume requirements**
If this watchdog report is the only output, safe resu

### Path 3 `script.npm.dev` status=`completed`
- File: `packages/web/package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `66.903`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`66.893`

#### Worker Output

**Findings**
- `packages/web/package.json:6` uses a bare `vite` dev script, while the repo docs tell operators to open `http://localhost:5173` and expect `/api` + `/ws` proxying through the Vite server (`README.md:273-276`). Because the script does not pin `--port 5173` or `--strictPort`, Vite can silently move to another port when 5173 is busy, making the documented URL stale and breaking the gateway proxy path for users who follow the README verbatim.
  - Evidence: `packages/web/package.json:6`, `README.md:273-276`
  - Recommended validation: start a process on `5173`, run the web dev script, and confirm whether the dashboard still binds the documented port or fails fast. If it shifts ports, add `--port 5173 --strictPort` to keep the contract stable.

**Notes**
- I did not execute the selected surface; this review is based on the manifest and repo docs only.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.001`

#### Supervisor Output

**Watchdog Report**

Selection is valid, not drift. The target is repo-owned, present, and unchanged: [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:1). It is a package-script surface, not a directly reviewed runtime path.

- **Boundedness:** Bounded only if the worker limits the task to script-definition facts for `script.npm.dev` in `packages/web/package.json`. Unbounded if it starts making claims about dev-server behavior, auth, network exposure, or state mutation without execution.
- **Overclaim risk:** High. The selected surface is labeled `cli_command`, but the concrete evidence is only `"dev": "vite"` in [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:6). The plan says `surface_not_executed_validation_probe_only`, so any claim beyond “the package defines a `dev` script that invokes Vite” would overreach.
- **Deterministic evidence to require on return:**
  - Exact citation that `packages/web` defines `"dev": "vite"` at [`packages/web/package.json`](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:6).
  - Confirmation the file is unchanged in git state for this run.
  - If the worker claims the script is part of the workspace dev flow, cite root [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:9) showing root `"dev": "turbo dev"`.
  - If the worker claims the script resolves to a real Vite app surface, cite the presence of [`packages/web/vite.config.ts`](/home/ericl/Work/vscode/public_share/jinn/packages/web/vite.config.ts:1).
- **Claims that should be rejected unless separately proven:** auth requirements, whether the script is safe/destructive, whether it mutates state at runtime, whether the served app works, port/binding behavior, or anything about execution results.

If this watchdog report is the only output, safe resume needs a worker return with file-backed citations limited to script metadata, or a rescan that 

### Path 4 `script.npm.test:watch` status=`completed`
- File: `packages/web/package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `42.819`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`25.731`

#### Worker Output

## Review: `packages/web/package.json` — npm `test:watch` script

### Selected Surface
**Location**: `packages/web/package.json:12`  
**Surface**: CLI command — `test:watch` npm script  
**Status**: Unchanged in diff, not executed (validation probe only)

### Findings

**✓ No issues with the selected surface itself.**

The `test:watch` script (`"test:watch": "vitest"`) is a straightforward npm script that launches vitest in watch mode. It:
- Makes no destructive calls
- Mutates no state
- Hasn't changed in the current diff
- Poses no direct risk

### Related Hazards (Lower Confidence)

The Fissure report flags environment variable deletions at `packages/jinn/src/engines/__tests__/codex.test.ts:173–177`. These are in a **different test file** and appear to be **correct test cleanup**, not bugs:

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

**Why these are marked "destructive" but are safe here:**
- Conditional restore logic is correct (delete if was undefined, restore if had a value)
- Scoped to `finally` block in a single test
- Restores the environment to its pre-test state
- No cross-test leakage

### Assessment

| Aspect | Result |
|--------|--------|
| Selected surface risk | ✓ None |
| Environment cleanup (codex.test.ts) | False positive (correct cleanup) |
| Test isolation | ✓ Sound |

**Recommended validation**: None required for the selected surface. The `test:watch` script is safe; the codex.test.ts cleanup is idiomatic and correct.
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`17.081`

#### Supervisor Output

**Watchdog Verdict**

This selection is **not selection drift**. `packages/web/package.json` is inside the repo-owned tree and the surface resolves to a real script at [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:11).

The task is **not bounded** if the worker treats `script.npm.test:watch` as executable validation. The selected script is `"test:watch": "vitest"` at [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:12), and the repo already classifies that exact surface as interactive, unbounded, and excluded from automated probes in [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:216).

**Likely Overclaim Risk**

The worker prompt is likely to overclaim if it reports a product defect from non-execution or from the mere existence of the watch script. Deterministic local evidence says:

- `test:watch` is a dev/test convenience, not the authoritative validation path.
- The repo’s authoritative check is root `pnpm test` at [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:14), while AGENTS names `pnpm test` as the canonical test command in [AGENTS.md](/home/ericl/Work/vscode/public_share/jinn/AGENTS.md:54).
- The script map explicitly marks `test:watch` as `interactive: true`, `bounded: false`, `automated_probe_default: exclude` at [docs/script-surface-map.md](/home/ericl/Work/vscode/public_share/jinn/docs/script-surface-map.md:221).

So if the worker returns “failed” without proving an actual misconfiguration, that is probably an **audit-scope error**, not a product finding.

**Deterministic Evidence To Check On Return**

Require the worker to anchor every claim to these checks:

- Confirm the selected script text is unchanged: [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:11).
- Confirm the repo classifies `test:watch` as unbounded/excluded: [docs/script

### Path 5 `script.npm.coverage` status=`completed`
- File: `packages/jinn/package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `32.119`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` kilo_cli:gemini-2.5-flash-default-route elapsed=`31.834`

#### Worker Output

## Findings

1. High: `script.npm.coverage` appears exposed to flaky or misleading results because related test code mutates global `process.env` during coverage-relevant test execution.
Evidence:
- `packages/jinn/src/engines/__tests__/codex.test.ts:173` deletes `process.env.GITHUB_TOKEN` when the prior value was undefined.
- `packages/jinn/src/engines/__tests__/codex.test.ts:175` deletes `process.env.CLAUDE_CODE_SESSION` when the prior value was undefined.
- `packages/jinn/src/engines/__tests__/codex.test.ts:177` deletes `process.env.CODEX_HOME` when the prior value was undefined.
Risk:
- A coverage script typically runs the full test suite or large subsets of it. Global env mutation in one test can contaminate later tests in the same worker/process, especially if failures interrupt normal restoration flow or if concurrent execution shares process state.
- Because the selected surface is `packages/jinn/package.json` `script.npm.coverage`, this is a plausible cause of deterministic failure or nondeterministic coverage outcomes even though the script itself was not shown.

2. Medium: The selected surface has no direct script-body evidence, so the failure may be hard to localize from package metadata alone.
Evidence:
- Selected surface is only `packages/jinn/package.json`, `surface_id: script.npm.coverage`.
- All supplied hazard evidence points instead to `packages/jinn/src/engines/__tests__/codex.test.ts`.
Risk:
- If `package.json` just delegates to a test runner, maintainers may debug the wrong layer unless they trace from the coverage script into test-side global state handling.

## Recommended Validation

1. Inspect the exact `coverage` script in `packages/jinn/package.json` and confirm whether it runs `codex.test.ts` directly or as part of the full suite.
2. Run the coverage command with test isolation reduced and increased, comparing results across repeated runs to detect env leakage and order dependence.
3. Run the implicated `codex.test.ts` before and after ot
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.282`

#### Supervisor Output

**Watchdog Report**

The task is bounded. The selected surface is a real, repo-owned file: [packages/jinn/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json:20). This is not selection drift: the file exists under the monorepo, is unchanged in git, and the `coverage` script is present.

The main overclaim risk is scope inflation from a static script selection. The worker was pointed at `script.npm.coverage` with `planned_execution: surface_not_executed_validation_probe_only`, so it can safely claim only what is in source, not whether coverage currently passes, what files are covered, or whether the command is side-effect free. In fact, repo-local evidence already says the opposite on state mutation: [packages/jinn/src/cli/__tests__/script-surface-map.test.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/cli/__tests__/script-surface-map.test.ts:75) describes this surface as “bounded; writes coverage/ directory”. If the worker reports “non-mutating” or “safe to execute without writes,” that is an overclaim against repo evidence.

Deterministic evidence to check when the worker returns:
- The script text matches [packages/jinn/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json:25) and [packages/jinn/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json:26): `test` is `vitest run`, `coverage` is `vitest run --coverage`.
- The package has the required declared tooling: `vitest` and `@vitest/coverage-v8` are present in `devDependencies` in [packages/jinn/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/package.json:57).
- The root workspace delegates coverage through Turbo in [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json:14), so claims about “repo coverage” vs “package-local coverage” must stay distinct.
- The repo has an explicit invariant test for this exact surface at [packages/jinn/src/cli/__tests__/script-surface-map.

### Path 6 `script.npm.start` status=`completed`
- File: `package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `25.949`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` agy_cli:Gemini 3.5 Flash (Low) elapsed=`23.528`

#### Worker Output

### Review Findings: Path Index 6 (`script.npm.start`)

---

#### 1. Surface Identification
* **Surface ID**: `script.npm.start`
* **File**: [package.json](file:///home/ericl/Work/vscode/public_share/jinn/package.json)
* **Command**: `pnpm clean && pnpm build && node packages/jinn/dist/bin/jinn.js start`
* **Execution Status**: Validation probe only (not executed).

---

#### 2. Findings & Risk Areas

##### Risk 1: Over-Destructive Clean Phase on Start
* **Evidence**:
  * `package.json` line 21: `"start": "pnpm clean && pnpm build && ..."`
  * `package.json` line 17: `"clean": "rm -rf .turbo node_modules/.cache && turbo clean"`
* **Description**: The `start` script enforces a full `clean` and `build` on every run. Purging `.turbo` and `node_modules/.cache` eliminates build caching benefits. This causes significant startup latency for developers or operators running the daemon.

##### Risk 2: Host Environment/Secrets Leaks and State Side-Effects
* **Evidence**:
  * [codex.test.ts:L173-178](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/engines/__tests__/codex.test.ts#L173-L178):
    ```typescript
    if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = prevGithub;
    if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;
    else process.env.CLAUDE_CODE_SESSION = prevClaude;
    if (prevCodex === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = prevCodex;
    ```
* **Description**: The test suite modifies global process environment variables (`GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, `CODEX_HOME`) directly. If the daemon starts concurrently with tests or depends on environment variable consistency during runtime orchestration, state contamination can leak across tasks or to the spawned sub-processes.

---

#### 3. Recommended Validation

1. **Verify Startup Latency and Cache Performance**:
   * Measure the execution time of `npm start` vs `node packages/jinn/dist
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`2.418`

#### Supervisor Output

**Watchdog Report**

This selection is bounded enough to review, and it is not selection drift. The selected surface maps to the repo-root [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:21), which does define `script.npm.start` as:

`pnpm clean && pnpm build && node packages/jinn/dist/bin/jinn.js start`

The worker’s risk of overclaim is moderate to high because the run already says `deterministic_result: failed` while also saying `surface_not_executed_validation_probe_only`. That means no runtime evidence exists yet. A safe worker report must stay narrow: it can describe the script definition and its prerequisites, but it should not claim the `start` flow is broken, missing, or validated without an actual repro.

Deterministic evidence to require when the worker returns:
- Confirm the surface exists at [`package.json:21`](/home/ericl/Work/vscode/public_share/jinn/package.json:21). Any claim that `npm start` is undefined is false.
- Confirm the review stayed at the repo root, not `packages/jinn/package.json` or `packages/web/package.json`, because those define different scripts.
- If the worker claims failure, require the exact failing command, working directory, exit code, and stderr/stdout.
- Require the worker to distinguish which stage failed: `pnpm clean`, `pnpm build`, or `node packages/jinn/dist/bin/jinn.js start`.
- Check prerequisite evidence before accepting a product finding: [`package.json:4`](/home/ericl/Work/vscode/public_share/jinn/package.json:4) pins `pnpm@10.6.4`, and [`package.json:5`](/home/ericl/Work/vscode/public_share/jinn/package.json:5) requires Node `>=24 <25`.
- If the worker claims a missing build artifact, require evidence that `pnpm build` was attempted first; the script itself builds before start.
- Reject broad claims about daemon behavior, auth, or mutability unless backed by execution or source inspection beyond this one script.

What would be needed to safely resume if this watchdog report is the only outpu

### Path 7 `script.npm.jinn` status=`completed`
- File: `package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `70.979`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` codex_cli:gpt-5.4-mini elapsed=`70.975`

#### Worker Output

**Findings**
1. **Environment leakage / cross-run contamination risk**  
   `package.json` exposes `jinn` as a thin wrapper, and `scripts/run-jinn-cli.mjs` spawns the CLI without overriding `env`, so the child inherits whatever the caller shell or surrounding test harness has mutated. That is relevant here because the supplied hazard evidence shows `packages/jinn/src/engines/__tests__/codex.test.ts:173-177` explicitly deleting/restoring `GITHUB_TOKEN`, `CLAUDE_CODE_SESSION`, and `CODEX_HOME`, and the runtime code consumes env-derived engine settings in [engine-env.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/shared/engine-env.ts#L23) and [engine-limits.ts](/home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/shared/engine-limits.ts#L316).  
   Evidence: [package.json](/home/ericl/Work/vscode/public_share/jinn/package.json#L18), [scripts/run-jinn-cli.mjs](/home/ericl/Work/vscode/public_share/jinn/scripts/run-jinn-cli.mjs#L21), supplied hazard at `codex.test.ts:173-177`.  
   Recommended validation: run the launcher under a harness that sets and then removes those env vars, and verify the child process sees only the intended values and the parent environment is restored after exit.

2. **Stale binary can be executed when source changes but `dist/` still exists**  
   The `jinn` wrapper only rebuilds when `packages/jinn/dist/bin/jinn.js` is missing, so a stale compiled binary can survive source edits and still be launched. That is a correctness risk for `pnpm jinn` because it does not compare timestamps or source version before executing the binary.  
   Evidence: [scripts/run-jinn-cli.mjs](/home/ericl/Work/vscode/public_share/jinn/scripts/run-jinn-cli.mjs#L11) only gates on `existsSync(cliEntry)` before running the binary.  
   Recommended validation: change a source file under `packages/jinn/src`, keep `dist/` present, run `pnpm jinn ...`, and confirm whether it rebuilds or intentionally executes stale output.

I did not execute `pnpm jinn` 
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

This selection is bounded enough to review, but only as a very narrow surface: the root [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:18) script entry `jinn`. It is not selection drift. The file is repo-owned, present at the repo root, and unchanged in git status. The detector metadata is incomplete because `selected_surface.path` is `null`, but the referenced file exists and the script is real.

The main overclaim risk is scope inflation. [`package.json`](/home/ericl/Work/vscode/public_share/jinn/package.json:18) only shows that `pnpm jinn` dispatches to `node scripts/run-jinn-cli.mjs`; it does not by itself prove runtime behavior, auth posture, safety, or command semantics. The worker prompt is likely to overclaim if it turns a script entry review into findings about the CLI without tracing the handoff file and, if needed, the actual CLI entrypoint.

Deterministic evidence to require when the worker returns:
- Confirm the exact script binding at [`package.json:18`](/home/ericl/Work/vscode/public_share/jinn/package.json:18): `"jinn": "node scripts/run-jinn-cli.mjs"`.
- Confirm the handoff file exists: [`scripts/run-jinn-cli.mjs`](/home/ericl/Work/vscode/public_share/jinn/scripts/run-jinn-cli.mjs:1).
- If the worker claims build-on-demand behavior, require evidence from [`scripts/run-jinn-cli.mjs:9`](/home/ericl/Work/vscode/public_share/jinn/scripts/run-jinn-cli.mjs:9) showing it checks for `packages/jinn/dist/bin/jinn.js` and runs `pnpm --filter jinn-cli build` when missing.
- If the worker claims execution target or argument forwarding, require evidence from [`scripts/run-jinn-cli.mjs:20`](/home/ericl/Work/vscode/public_share/jinn/scripts/run-jinn-cli.mjs:20) showing it invokes `node <cliEntry> ...process.argv.slice(2)`.
- Reject any claim about product behavior beyond that wrapper unless the worker also inspects the underlying CLI source or built entrypoint and cites it directly.

What would be needed to safely resum

### Path 8 `script.npm.clean` status=`completed`
- File: `packages/web/package.json`
- Review classification: `deterministic_failure_anchor`
- Elapsed seconds: `23.234`
- Worker execution: `parallel_paths`
- Worker attempts: `1` failovers=`0`
- Worker: `completed` claude_cli:haiku elapsed=`23.23`

#### Worker Output

## Review: `script.npm.clean` in `packages/web/package.json`

### Selected Surface
**File:** `packages/web/package.json:13`  
**Kind:** CLI command (npm script)  
**Status:** Not executed (validation probe only)

```json
"clean": "node -e \"const{rmSync}=require('node:fs');['out','dist'].forEach(d=>rmSync(d,{recursive:true,force:true}))\""
```

### Findings

**LOW RISK** — The `clean` script is benign:
- Targets only two hardcoded directories (`out`, `dist`)
- Uses `force:true` to tolerate missing directories (no error if already deleted)
- No dynamic paths, user input, or recursive filesystem traversal
- Typical build artifact cleanup pattern

### Related Hazards Assessment

All **8 flagged hazards** point to test cleanup code in `codex.test.ts:173–177` — **these are false positives**:

```typescript
// Proper test isolation: restore environment to pre-test state
finally {
  if (prevGithub === undefined) delete process.env.GITHUB_TOKEN;  // line 173
  else process.env.GITHUB_TOKEN = prevGithub;
  if (prevClaude === undefined) delete process.env.CLAUDE_CODE_SESSION;  // line 175
  else process.env.CLAUDE_CODE_SESSION = prevClaude;
  if (prevCodex === undefined) delete process.env.CODEX_HOME;  // line 177
  else process.env.CODEX_HOME = prevCodex;
}
```

**Why this is correct**, not destructive:
- Saves original values at test start (lines 158–160)
- Only deletes if the variable **wasn't set before** (correct isolation)
- Otherwise restores the original value (idempotent cleanup)
- This is **standard test hygiene** — prevents test pollution

### Validation Recommended
None for the `clean` script itself. If desired, verify the related test still passes to confirm environment cleanup doesn't mask integration issues:
```bash
npm test -- packages/jinn/src/engines/__tests__/codex.test.ts
```
- Supervisor: `completed` codex_cli:gpt-5.4 elapsed=`0.0`

#### Supervisor Output

**Watchdog Report**

Selection looks valid, not drift. `packages/web/package.json` exists in the repo-owned tree, is unchanged, and contains the selected `clean` script at [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:13).

The task is bounded if the worker stays narrowly on this surface:
- Verify the `clean` script definition.
- Assess only what the script is deterministically coded to remove.
- Do not generalize to broader build hygiene, workspace cleanup, or runtime effects without execution evidence.

Overclaim risk is moderate. The worker prompt can easily overstate:
- That the script is safe in all invocation contexts.
- That it only affects `packages/web` regardless of current working directory.
- That it is unused or correctly wired into tooling.
- That it was validated in practice, since `planned_execution` says `surface_not_executed_validation_probe_only`.

Deterministic evidence to require from the worker:
- Exact evidence path: [packages/web/package.json](/home/ericl/Work/vscode/public_share/jinn/packages/web/package.json:13).
- Exact script content: it runs `node -e` and calls `rmSync` on `['out','dist']` with `{ recursive: true, force: true }`.
- Scope claim limited to code semantics: it attempts to remove relative paths `out` and `dist` from the process working directory.
- Note that `force: true` suppresses missing-path errors.
- Note that no execution occurred, so any claim about actual side effects, cwd, integration, or safety under all callers is non-deterministic unless separately evidenced.

What to check when the worker returns:
- Did it cite the actual file and line?
- Did it distinguish coded behavior from executed behavior?
- Did it avoid claiming package-local confinement unless it proved the invocation cwd?
- Did it avoid turning a validation-probe result into a product bug or safety guarantee?

Safe-resume requirement if this is the only output:
- Re-run the worker with an instruction to p

### Worker Metrics

- `agy_cli:Gemini 3.5 Flash (Low)` completed=2 failed=0 timeout=0 rate_limited=0 mean_s=22.378 median_s=22.378 mean_chars=2748.0 unique=2 redundant=0
- `claude_cli:haiku` completed=2 failed=0 timeout=0 rate_limited=0 mean_s=24.48 median_s=24.48 mean_chars=1805.0 unique=2 redundant=0
- `codex_cli:gpt-5.4-mini` completed=2 failed=0 timeout=0 rate_limited=0 mean_s=68.934 median_s=68.934 mean_chars=1458.5 unique=2 redundant=0
- `kilo_cli:gemini-2.5-flash-default-route` completed=2 failed=0 timeout=0 rate_limited=0 mean_s=33.876 median_s=33.876 mean_chars=2267.0 unique=2 redundant=0
