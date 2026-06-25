# Giles Compliance TODO

## Repo

jinn (`/home/ericl/Work/vscode/public_share/jinn`)

## Timestamp

2026-06-25T13:57:18.563911Z

## Current state

- Compliance: **BLOCKED** (acceptance: blocked; cleanliness: not_clean)
- Disposition: **blocked_but_documented**
- Recheck status: 33 finding(s) remain after reconciliation; 4 blocking action(s) outstanding.
- Convergence: **0.0%** complete (0/8 actions done; 4 blocking, 8 remaining)
- Findings: 33 (2 mechanical, 31 human_required, 0 system_fault)
- Auto-fixes applied this run: 1
- Required actions: 8 (cycle: False)

## Giles findings

- `GACT-004` (low, human_required, blocking=False) — source: scan; subject: `AGENTS.md`
- `GACT-004` (low, human_required, blocking=False) — source: scan; subject: `AGENTS.md`
- `GACT-004` (low, human_required, blocking=False) — source: scan; subject: `CLAUDE.md`
- `GACT-004` (low, human_required, blocking=False) — source: scan; subject: `CODEX.md`
- `GACT-004` (low, human_required, blocking=False) — source: scan; subject: `GEMINI.md`
- `GAUD-001` (info, human_required, blocking=False) — source: scan; subject: `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`
- `GCFG-002` (info, human_required, blocking=False) — source: scan; subject: `—`
- `GCFG-003` (info, human_required, blocking=False) — source: scan; subject: `—`
- `GCFG-004` (info, human_required, blocking=False) — source: scan; subject: `—`
- `GCFG-005` (info, human_required, blocking=False) — source: scan; subject: `—`
- `GDAS-003` (high, human_required, blocking=True) — source: scan; subject: `AGENTS.md`
- `GDAS-004` (high, human_required, blocking=True) — source: scan; subject: `GEMINI.md`
- `GDAS-005` (low, human_required, blocking=False) — source: scan; subject: `AGENTS.md`
- `GDAS-005` (low, human_required, blocking=False) — source: scan; subject: `AGENTS.md`
- `GDAS-005` (low, human_required, blocking=False) — source: scan; subject: `AGENTS.md`
- `GDAS-005` (low, human_required, blocking=False) — source: scan; subject: `AGENTS.md`
- `GDAS-005` (low, human_required, blocking=False) — source: scan; subject: `AGENTS.md`
- `GDAS-006` (low, human_required, blocking=False) — source: scan; subject: `GEMINI.md`
- `GDAS-006` (low, human_required, blocking=False) — source: scan; subject: `GEMINI.md`
- `GDAS-006` (low, human_required, blocking=False) — source: scan; subject: `GEMINI.md`
- `GDAS-006` (low, human_required, blocking=False) — source: scan; subject: `GEMINI.md`
- `GM-001` (critical, human_required, blocking=True) — source: scan; subject: `/home/ericl/Work/vscode/public_share/jinn/.giles/repo.yaml`
- `GR-001` (high, human_required, blocking=True) — source: scan; subject: `governance/repo_config.yaml`
- `GSESS-005` (info, human_required, blocking=False) — source: scan; subject: `docs/logs/session/062026`
- `GILES-AGENTS-DRIFT` (high, human_required, blocking=True) — source: scan-repo; subject: `AGENTS.md`
- `GILES-DOC-PUBLIC-OBLIGATION` (low, human_required, blocking=False) — source: scan-repo; subject: `docs`
- `GILES-DOC-PUBLIC-UI` (low, human_required, blocking=False) — source: scan-repo; subject: `packages/web/out/assets/index-D-RoQl3r.js`
- `GILES-DOC-PUBLIC-UI` (low, human_required, blocking=False) — source: scan-repo; subject: `packages/web/out/assets/index-D-RoQl3r.js`
- `GILES-DOC-PUBLIC-UI` (low, human_required, blocking=False) — source: scan-repo; subject: `packages/web/src/main.tsx`
- `GILES-STRUCTURE-CONTROL` (high, human_required, blocking=True) — source: scan-repo; subject: `governance/local_semantics.yaml`
- `GILES-STRUCTURE-SLOT` (high, human_required, blocking=True) — source: scan-repo; subject: `.`
- `GILES-010` (warn, mechanical, blocking=False) — source: repo-check; subject: `governance/repo_manifest.yaml`
- `IDX-GD-004` (high, mechanical, blocking=True) — source: audit-structure; subject: `structure audit unavailable: governance/repo_config.yaml not present`

## What was auto-fixed

- removed transient .giles/index/ cache

### Skipped (intentionally)

- governance/logs/ already present

## What was not auto-fixed

- `GM-001` mechanical step: Run `giles migrate-manifest <repo>` to convert the legacy .giles/repo.yaml into the v2.2 RepoManifest shape. The mode value is a governance choice.
- `GR-001` mechanical step: Create governance/repo_config.yaml with the canon-aligned schema. Field values (repo_id, repo_type, owners) require human input.
- `GILES-010` mechanical step: Add repo_standard.version: "1.0" to governance/repo_manifest.yaml after the manifest itself is authored.
- `IDX-GD-004` mechanical step: Provide governance/repo_config.yaml so the structure audit can resolve repo_type. Same blocker as GR-001.

## Why it was not auto-fixed

- `GACT-004` — requires a governance/policy decision; see Required human decisions.
- `GACT-004` — requires a governance/policy decision; see Required human decisions.
- `GACT-004` — requires a governance/policy decision; see Required human decisions.
- `GACT-004` — requires a governance/policy decision; see Required human decisions.
- `GACT-004` — requires a governance/policy decision; see Required human decisions.
- `GAUD-001` — requires a governance/policy decision; see Required human decisions.
- `GCFG-002` — requires a governance/policy decision; see Required human decisions.
- `GCFG-003` — requires a governance/policy decision; see Required human decisions.
- `GCFG-004` — requires a governance/policy decision; see Required human decisions.
- `GCFG-005` — requires a governance/policy decision; see Required human decisions.
- `GDAS-003` — requires a governance/policy decision; see Required human decisions.
- `GDAS-004` — requires a governance/policy decision; see Required human decisions.
- `GDAS-005` — requires a governance/policy decision; see Required human decisions.
- `GDAS-005` — requires a governance/policy decision; see Required human decisions.
- `GDAS-005` — requires a governance/policy decision; see Required human decisions.
- `GDAS-005` — requires a governance/policy decision; see Required human decisions.
- `GDAS-005` — requires a governance/policy decision; see Required human decisions.
- `GDAS-006` — requires a governance/policy decision; see Required human decisions.
- `GDAS-006` — requires a governance/policy decision; see Required human decisions.
- `GDAS-006` — requires a governance/policy decision; see Required human decisions.
- `GDAS-006` — requires a governance/policy decision; see Required human decisions.
- `GM-001` — requires a governance/policy decision; see Required human decisions.
- `GR-001` — requires a governance/policy decision; see Required human decisions.
- `GSESS-005` — requires a governance/policy decision; see Required human decisions.
- `GILES-AGENTS-DRIFT` — requires a governance/policy decision; see Required human decisions.
- `GILES-DOC-PUBLIC-OBLIGATION` — requires a governance/policy decision; see Required human decisions.
- `GILES-DOC-PUBLIC-UI` — requires a governance/policy decision; see Required human decisions.
- `GILES-DOC-PUBLIC-UI` — requires a governance/policy decision; see Required human decisions.
- `GILES-DOC-PUBLIC-UI` — requires a governance/policy decision; see Required human decisions.
- `GILES-STRUCTURE-CONTROL` — requires a governance/policy decision; see Required human decisions.
- `GILES-STRUCTURE-SLOT` — requires a governance/policy decision; see Required human decisions.
- `GILES-010` — mechanical step is described, but Giles will not author governance content; the operator must land the file.
- `IDX-GD-004` — mechanical step is described, but Giles will not author governance content; the operator must land the file.

## Required human decisions

- `GACT-004` — requires governance/policy decision
- `GAUD-001` — requires governance/policy decision
- `GCFG-002` — requires governance/policy decision
- `GCFG-003` — requires governance/policy decision
- `GCFG-004` — requires governance/policy decision
- `GCFG-005` — requires governance/policy decision
- `GDAS-003` — requires governance/policy decision
- `GDAS-004` — requires governance/policy decision
- `GDAS-005` — requires governance/policy decision
- `GDAS-006` — requires governance/policy decision
- `GM-001` — Choosing the manifest's mode (canonical / extended / translated-compatible / declared-divergent) is a compliance posture decision.
- `GR-001` — Repo config carries the repo_id, repo_type, ownership, and fleet-policy alignment — all governance choices.
- `GSESS-005` — requires governance/policy decision
- `GILES-AGENTS-DRIFT` — requires governance/policy decision
- `GILES-DOC-PUBLIC-OBLIGATION` — requires governance/policy decision
- `GILES-DOC-PUBLIC-UI` — requires governance/policy decision
- `GILES-STRUCTURE-CONTROL` — requires governance/policy decision
- `GILES-STRUCTURE-SLOT` — requires governance/policy decision

## Git state

- branch: `main`
- upstream: `origin/main`
- behind/ahead: 0 / 0
- diverged: False
- has_uncommitted_files: True
- detail: behind 0, ahead 0 of origin/main

## Required actions (graph)

- actions: 8
- cycle detected: False
- missing dependencies: none

## Minimum path to compliance

- [ ] **align-agents-contract** (decision_required) — `AGENTS.md`: Align AGENTS contract to fleet standard and document repo-specific exceptions in a canonical governance lane.
- [ ] **align-semantic-structure** (decision_required) — `governance/local_semantics.yaml`: Align repository semantic slots and control-layer structure expectations; record explicit exceptions.
- [ ] **create-repo-config** (create_file) — `governance/repo_config.yaml`: Create governance/repo_config.yaml declaring repo_id, repo_type, owners, and fleet-policy alignment. Required before structure audit can resolve the repo type.
- [ ] **document-public-surfaces** (decision_required) — `docs/feature_inventory.md`: Document public CLI/API/UI surfaces and required outputs in discoverable operator-facing documentation.
- [ ] **migrate-repo-yaml** (edit_file) — `.giles/repo.yaml`: Author or repair .giles/repo.yaml to conform to the v2.2 RepoManifest schema (repo_id, canon_version, mode).
- [ ] **set-standard-version** (edit_file) — `governance/repo_manifest.yaml`: Add `repo_standard.version: "1.0"` to governance/repo_manifest.yaml so Giles considers this repo governed under the v6 standard.
- [ ] **decide-manifest-mode** (decision_required) — `.giles/repo.yaml`: Choose the manifest `mode` value (canonical / extended / translated-compatible / declared-divergent) based on this repo's compliance posture. (depends on: migrate-repo-yaml)
- [ ] **recheck** (decision_required): After applying the above actions, re-run `giles compliance-todo --refresh <repo>` to refresh this artifact and confirm the recheck status. (depends on: align-agents-contract, align-semantic-structure, create-repo-config, decide-manifest-mode, document-public-surfaces, migrate-repo-yaml, set-standard-version)

## Execution log

- (none — apply-actions has not run yet)

## Recheck status

33 finding(s) remain after reconciliation; 4 blocking action(s) outstanding.

---

Generated by `giles compliance-todo`. Use `--refresh` to update this
file in place while preserving completed action statuses and any human
annotations under each action. Run `giles apply-actions <repo>` to
execute pending mechanical actions (idempotent).
