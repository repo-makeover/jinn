# Documentation Maintenance Contract

## Read Order

1. `README.md`
2. `docs/INDEX.md`
3. `AGENTS.md`
4. Task-specific docs linked from the index

## Logs And Audits

- Raw session logs live under `docs/logs/session/<MMYYYY>/` and are local-only.
- Raw audit details live under `docs/audits/` and are local-only.
- Tracked monthly summaries currently live under `docs/SESSION_SUMMARY_<MMYYYY>.md`
  and `docs/AUDIT_SUMMARY_<MMYYYY>.md`.
- Do not publish raw logs unless a maintainer explicitly selects and reviews them.

## TODO Ledger

- Add active documentation/maintenance work to `docs/TODO_LEDGER.md`.
- Use stable IDs: `TODO-YYYYMMDD-###`.
- Remove items only when the exit criteria are met, or move them to a historical
  note if a history file becomes useful.

## Test Ledger

- Update `docs/TEST_LEDGER.md` whenever validation commands, CI workflows, or
  meaningful test coverage areas change.
- Do not claim a command passed unless it was run locally in the session, observed
  in CI, or cited from a tracked log.

## Specification And Architecture

- Update `docs/SPECIFICATION.md` for new requirements, public API behavior, config
  keys, persistence contracts, or acceptance criteria.
- Update `docs/ARCHITECTURE.md` and `docs/IMPLEMENTATION_DIAGRAMS.md` for
  meaningful component, data-flow, or deployment changes.
- Mark uncertain claims as inferred, proposed, or unresolved.

## README Drift Checks

Before release or public staging, verify:

- Quickstart commands still work.
- The documented Node version matches `.nvmrc` and `package.json`.
- Dashboard routes match `packages/web/src/main.tsx`.
- CLI commands match `packages/jinn/bin/jinn.ts`.
- Validation summary matches recent evidence in `docs/TEST_LEDGER.md`.

## Release Checklist

- `docs/INDEX.md` links every new tracked operator-facing doc.
- `docs/feature_inventory.md` reflects public CLI/API/UI surface changes.
- `docs/script-surface-map.md` reflects new or changed scripts/CLI commands.
- `docs/TODO_LEDGER.md` has no completed items left active.
- `docs/TEST_LEDGER.md` reflects the final validation pass.
