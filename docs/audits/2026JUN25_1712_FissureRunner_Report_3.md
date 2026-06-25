# Fissure Dry-Run Report

- Run: `FRUN-20260625-171219`
- Seed: `4242`
- Surface scan: `SCAN-20260625-171222`
- Data path scan: `DPATH-20260625-171227`
- Paths selected: 4
- Stop reason: `path_limit_reached`
- Data path summary: `{'total': 1216, 'dead': 27, 'unresolved': 200, 'completed': 989, 'hazard_count': 1612}`
- Deterministic checks: `not_executed`.
- Runtime probe status: `not_executed`.
- Model review status: `not_requested`.
- Runtime probe scope: validation commands only; selected surfaces are not executed.
- Model review scope: report-only; deterministic checks remain authoritative.

## Selected Path Probes

- `cli.argparse.kokoro_sidecar` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/jinn/src/talk/kokoro_sidecar.py`
- `script.npm.nuke` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`
- `script.npm.test:watch` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`packages/web/package.json`
- `script.npm.setup` (cli_command) score=0.1 weight=1.1 diff=unchanged variant=1 strategy=baseline file=`package.json`

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
