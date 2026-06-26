# Active TODO Ledger

This ledger tracks active documentation/maintenance TODOs only. Historical TODO
snippets inside archived plans/specs are not active until re-opened here.

| ID | Status | Priority | Area | Item | Source | Opened | Last Evidence | Exit Criteria |
|---|---|---|---|---|---|---|---|---|
| TODO-20260625-001 | open | P2 | Tests | Remove or explicitly accept React test warnings around `act(...)` wrapping and nested `<button>` markup. | `pnpm test` output, 2026-06-25 | 2026-06-25 | `pnpm test` runs without those warnings, or `docs/known-diagnostics.md` records them as accepted. |
| TODO-20260625-002 | needs-decision | P3 | Public tooling | Decide whether `.claude/`, `.agents/`, and `.fissure/` are intentional public tooling surfaces or should become local-only artifacts. | `docs/polish/structure-review.md` | 2026-06-25 | Public tooling policy documented and tracked/ignored state matches it. |
| TODO-20260625-003 | open | P3 | Docs archive | Curate historical `docs/plans/` and `docs/superpowers/` so stale framework assumptions are clearly historical. | `docs/DOCUMENTATION_INVENTORY.md` | 2026-06-25 | Archive/index policy applied, or docs are annotated as historical where needed. |
| TODO-20260625-004 | needs-decision | P3 | Giles retention | Decide whether to keep repo-local policy that `docs/logs/` is fully ignored or adopt Giles default tracked monthly summaries under that tree. | `docs/STRUCTURE_COMPLIANCE.md` | 2026-06-25 | `AGENTS.md`, `.gitignore`, and `docs/INDEX.md` agree on one policy. |
