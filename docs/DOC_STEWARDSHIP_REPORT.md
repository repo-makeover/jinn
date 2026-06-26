# Documentation Stewardship Report

## Summary

- Date: 2026-06-25
- Repo: `/home/ericl/Work/vscode/public_share/jinn`
- Governing authority: repo-declared `AGENTS.md` with Giles present.
- Scope: tracked documentation, summaries, diagrams, ledgers, and public
  navigation docs.
- Source-code changes: one cleanup-safe user-facing setup warning aligned with the documented Node 24.x requirement.

## Created / Updated

- `docs/DOCUMENTATION_INVENTORY.md`
- `docs/USER_MANUAL.md`
- `docs/IMPLEMENTATION_DIAGRAMS.md`
- `docs/TEST_LEDGER.md`
- `docs/TODO_LEDGER.md`
- `docs/SPECIFICATION.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISION_LOG.md`
- `docs/DOC_MAINTENANCE.md`
- `docs/STRUCTURE_COMPLIANCE.md`
- `docs/UPSTREAM_DIFF_BASELINE.md`
- `docs/LOG_ARCHIVE.md`
- `docs/SESSION_SUMMARY_062026.md`
- `docs/AUDIT_SUMMARY_062026.md`
- `README.md`
- `docs/INDEX.md`
- `.github/CONTRIBUTING.md`
- `packages/jinn/src/cli/setup.ts` (user-facing Node prerequisite warning only)

## Archived / Consolidated

- Raw audit and session logs were not moved or deleted.
- Durable summaries were created under tracked `docs/` paths because
  `AGENTS.md` currently declares `docs/audits/` and `docs/logs/` local-only.

## Active TODO Ledger

- Open items: 4
- P0/P1 items: 0
- Source: `docs/TODO_LEDGER.md`

## Validation

| Command | Result | Notes |
|---|---|---|
| `git diff --check && git diff --cached --check` | passed | No whitespace errors. |
| Markdown relative-link check | passed | 115 tracked Markdown files checked with a local Node script. |
| Mermaid render tool check | skipped | `mmdc` is not installed; Mermaid fences are present in `docs/IMPLEMENTATION_DIAGRAMS.md`. |
| legacy Node prerequisite scan | passed | No stale mixed-version prerequisite strings remained in current docs or setup output. |
| `git fetch upstream main` + upstream diff commands | passed | `upstream/main` compared to local `HEAD`; local branch was 244 commits ahead at snapshot time. |
| `pnpm lint` | passed | Both package lint tasks passed. |
| `pnpm typecheck` | passed | Both package typecheck tasks passed. |
| `pnpm --filter jinn-cli exec vitest run src/cli/__tests__/config-seed.test.ts` | passed | 5 setup/config-seed tests passed. |
| `pnpm test` | passed | Run during the preceding polish pass: `jinn-cli` 1508 passed, 1 skipped; `@jinn/web` 711 passed. |
| `giles repo-check /home/ericl/Work/vscode/public_share/jinn --format pretty` | passed | `finding_count: 0`. |

## Remaining Documentation Risks

- `pnpm build`, `pnpm test:e2e`, markdown-link checking, and Mermaid rendering were not run in this stewardship pass.
- Historical plans/specs still contain older framework assumptions and remain marked historical rather than rewritten.
- The repo needs a policy decision on whether to track or ignore `.claude/`, `.agents/`, and `.fissure/` public tooling directories.
- The repo-local ignored `docs/logs/` policy conflicts with the doc-stewardship skill's Giles default tracked-summary path; the current repo contract was preserved.
- Node prerequisite drift was corrected in current public docs and the setup warning: Node 24.x is the supported repo/tooling line.

## Next Recommended Action

Run a dedicated documentation validation pass with markdown link checking and
Mermaid rendering before release, then decide whether to keep or revise the
current local-only log/audit retention policy.
