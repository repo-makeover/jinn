# Documentation Index

This index lists operator-facing docs that are maintained in this checkout.
Audit and session logs under `docs/audits/` and `docs/logs/` are local-only
artifacts unless explicitly published.

## Current Operator Docs

- `README.md`: public overview and install/use workflow.
- `docs/feature_inventory.md`: implemented CLI/API/UI surfaces and fidelity gaps.
- `docs/known-diagnostics.md`: accepted non-actionable diagnostics that future
  audits should not re-report unless explicitly scoped.
- `docs/script-surface-map.md`: authoritative classification of npm scripts and CLI
  subcommands by destructiveness, interactivity, and suitability for automated sweeps;
  supersedes any generated surface-metadata that conflicts with it.
- `docs/engines-hermes.md`: Hermes engine behavior and caveats.
- `docs/orchestration/README.md`: provider-neutral matrix orchestration
  foundation, durable scheduler state, adapter contracts, CLI dry-run/observe
  commands, opt-in live run modes, git worktree execution, and orchestration
  HTTP routes.

## Design And Planning Archives

- `docs/plans/`: early Jinn design and implementation plans.
- `docs/superpowers/specs/`: feature design specs.
- `docs/superpowers/plans/`: detailed implementation plans.
