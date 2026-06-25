# Jinn Kanban Audit

- Date: 2026-06-23
- Actor: Codex
- Intent: audit the Jinn Kanban/board pipeline with the requested audit skill set, write local audit artifacts, and place all findings onto the live software-delivery backlog board.

## Scope

- Read `AGENTS.md`, `README.md`, `docs/feature_inventory.md`, `.dory/` state, and the Kanban/board/session code paths.
- Loaded the requested audit skills from `/home/ericl/Work/vscode/agent-skills/10_audit/` plus the shared audit base under `/home/ericl/Work/vscode/agent-skills/00_common/audit-base/`.
- Focused on `packages/web/src/routes/kanban/page.tsx`, `packages/jinn/src/gateway/board-service.ts`, `ticket-dispatch.ts`, `board-worker.ts`, `api.ts`, and `sessions/queue.ts`.

## Findings Recorded

- `DAT-JINN-001` high: cross-department assignee change leaves board scope stale and dispatch does not enforce department membership.
- `WFG-JINN-001` medium: Kanban silently hides department board load failures.
- `WFG-JINN-002` medium: one recycle-bin retention control overwrites every department board.
- `ARC-JINN-001` medium: board PUT accepts arbitrary ticket shapes and the UI coerces unknown statuses to `todo`.
- `CON-JINN-001` high / likely: missing concurrency guards can duplicate dispatch or lose manual board edits under overlapping writers.

## Artifacts Written

- `docs/audits/2026-06-23-jinn-kanban-board-audit.md`
- `docs/logs/session/062026/2026-06-23-jinn-kanban-audit.md`
- `~/.jinn/org/software-delivery/board.json` updated with backlog items:
  - `kanban-scope-20260623-001`
  - `kanban-workflow-20260623-002`
  - `kanban-retention-20260623-003`
  - `kanban-contract-20260623-004`
  - `kanban-concurrency-20260623-005`

## Validation

- `git status --short` -> clean before artifact writes
- `git diff --check` -> clean before artifact writes
- `pnpm --dir packages/jinn test -- src/gateway/__tests__/board-service.test.ts src/gateway/__tests__/board-sync.test.ts src/gateway/__tests__/session-query-routes.test.ts src/gateway/__tests__/ticket-dispatch-route.test.ts` -> passed, 4 files / 37 tests

## Dory / Governance Notes

- `.dory/` showed an active unrelated interrupted Kiro session. I inspected continuity state but did not rewrite the Dory session files to avoid corrupting that trail.
- `docs/INDEX.md`, `PROJECT_HANDOFF_MASTER.md`, `control/*.yaml`, and repo policy YAML under `governance/` were absent in this checkout; absence was recorded in the audit report.

## Residual Risk

- The concurrency finding is structurally strong but not runtime-reproduced in this session; it remains `Likely`, not `Confirmed`.
- No browser automation was run, so workflow findings are source-backed and test-backed, not Playwright-verified.
