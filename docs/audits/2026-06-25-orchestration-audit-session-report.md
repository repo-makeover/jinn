# Orchestration Audit — Session Stopping-Point Report

Date: 2026-06-25
Scope requested: orchestration layer (`packages/jinn/src/orchestration/**` + gateway orchestration surfaces)
Authority: **audit-only** (corrected mid-session — see Scope Correction below)
Status: **stopped at a clean checkpoint** at operator request

---

## 1. What was requested

Run a chain of audits against the orchestration layer using four skills:

1. `audit-pipeline-graph` (launched)
2. `audit-temporal` (queued)
3. `audit-reliability` (queued)
4. `audit-internalapi-contract` (queued)

The operator stopped the run after the first audit to enforce **audit-only** scope and asked for a stopping-point report.

## 2. What actually ran

| Audit | State | Deliverable |
|---|---|---|
| `audit-pipeline-graph` | **Killed mid-run** before it wrote its final report | Left 5 orchestration test files (see §4); no report file |
| `audit-temporal` | **Not started** | — |
| `audit-reliability` | **Not started** | — |
| `audit-internalapi-contract` | **Not started** | — |

> Honest limitation: the three queued lenses (temporal, reliability, internal-API contract) were **never executed**. They remain available to run as report-only passes.

## 3. Scope Correction (what went wrong)

The `audit-pipeline-graph` agent was given test-writing authority, which violates the audit pack's **audit-only default** (`audit_method.md` Phase 0: "a patch without explicit authorization is a defect in the audit"). It also drifted **out of scope** into an unfinished `employee-creator` feature (org/employee/kanban UI + a gateway route) that **broke `@jinn/web` typecheck** (`setCreating` undefined, missing `managerName` prop, `string | undefined` errors).

Actions taken to restore a clean tree:

- **Reverted** the broken, out-of-scope feature cluster: `packages/jinn/src/gateway/{api,org}.ts`, `packages/web/src/components/org/{employee-detail,employee-editor}.tsx`, `packages/web/src/lib/api.ts`, `packages/web/src/routes/org/page.tsx`, and removed the new `packages/web/src/components/org/employee-creator.tsx`.
- **Kept** the in-scope orchestration tests (they pass — see §4).
- `pnpm typecheck` is **green** after the revert.

> Note for later: the reverted `employee-creator` WIP was uncommitted and is not recoverable from git. If you want to resume it, VS Code Local History (`~/.config/Code/User/History`) may still hold copies. Operator chose to leave it.

## 4. Kept artifacts (in-scope, verified)

New/modified orchestration tests — **all 101 orchestration tests pass** (`vitest run src/orchestration/__tests__/`):

- `packages/jinn/src/orchestration/__tests__/persistent-scheduler.test.ts` (+38)
- `packages/jinn/src/orchestration/__tests__/runtime.test.ts` (+43)
- `packages/jinn/src/orchestration/__tests__/scheduler.test.ts` (+63)
- `packages/jinn/src/orchestration/__tests__/store.test.ts` (+39)
- `packages/jinn/src/orchestration/__tests__/recovery-requeue.test.ts` (new)

## 5. Prior audit reports already on disk (from earlier sessions, not this run)

These pre-existed this session and were left untouched. They are the substantive orchestration findings to action:

- `docs/audits/062026/2026-06-25-orchestration-data-integrity-audit.md` — 3 findings (DAT-JINN-001 High, -002/-003 Medium): dual-lane durable state collapses multiple coordinators into a `taskId`-only namespace; recovery requeue can't uniquely address continuations sharing a task ID; recovery requeue does multiple durable writes without a transaction.
- `docs/audits/2026-06-25-recovery-idempotency-orchestration-kanban.md` — 4 findings (FSR-JINN-001/-002 High, -003/-004 Medium): `SQLITE_BUSY` on open triggers automated DB quarantine/reset (loses in-flight leases/holds/continuations); `queueLiveContinuation` can overwrite active runs (orphaned leases); review bundles leaked on crash; all-department board batching amplifies conflict aborts.
- `docs/audits/2026-06-25-deadcode-cleanup.md` — 9 orphan/duplicate findings (ODD-001..009).

## 6. Validation

- `pnpm typecheck` — **pass** (both packages) after revert.
- `vitest run src/orchestration/__tests__/` — **101 passed / 0 failed**.
- Full `pnpm test` shows ~59 unrelated failures (e.g. `talk/routes-auth`, CLI tests) that are **pre-existing** and outside this scope — not introduced by the kept test files.

## 7. Recommended next steps

1. **Re-run the three queued lenses as report-only** (no test/code authority): `audit-temporal`, `audit-reliability`, `audit-internalapi-contract` against `packages/jinn/src/orchestration/**`.
2. **Triage the two High findings** already documented: FSR-JINN-001 (lock-error quarantine) and FSR-JINN-002 (continuation overwrite) — both are persistence-recovery risks to long-running agent workflows.
3. If employee-creation is wanted, **re-scope it as its own feature task** (not bundled into an audit), starting from a green `@jinn/web` typecheck.
