# June 2026 Audit Summary

> Raw audit detail files under `docs/audits/` are intentionally ignored by git and
> may not be available on other machines. This summary is the durable synced
> record.

## Executive Summary

June 2026 audits concentrated on orchestration reliability, post-modularization
regressions, architecture seams, dependency criticality, kanban behavior,
dead-code cleanup, and public repository hygiene. The highest-value outcomes
were concrete repair plans and follow-up tests rather than publishing every raw
audit artifact.

## Major Finding Families

- Orchestration routing needed a single backend router owner for `/api/orchestration/*`.
- File/gateway modularization required façade/seam tests to preserve public paths.
- Queue pause, recovery, dual-lane, hold, and lease-stop behavior needed explicit contract coverage.
- Public staging required local generated artifacts to be ignored and removed from the tracked index.
- Large source files needed modularization by responsibility rather than line buckets.

## Resolved / Addressed

- Backend orchestration routing was centralized in `handleApiRequest()`.
- Web orchestration mutator request shapes were covered by table-driven contract tests.
- `files.ts`, `server.ts`, `page.tsx`, `chat-messages.tsx`, chat route/input files, `types.ts`, and `registry.ts` received modularization work.
- A dedicated gateway files façade seam test was added.
- Giles governance validation now passes `repo-check`.

## Deferred / Advisory

- Historical release-note backfill remains advisory because source-grounded release summaries for every tag would be public noise without reliable evidence.
- Giles scanner findings from ignored generated bundles are not documented as product UI.
- The repo type/profile mismatch for monorepo top-level directories is a Giles/canon-profile advisory, not a source-layout change to apply here.

## Source Audits

- `docs/audits/062026/2026-06-25-orchestration-*.md`
- `docs/audits/062026/2026-06-25-post-modularization-regression-audit*.md`
- `docs/audits/2026-06-23-*.md`
- `docs/audits/2026-06-24-*.md`
- `docs/audits/2026-06-25-*.md`
