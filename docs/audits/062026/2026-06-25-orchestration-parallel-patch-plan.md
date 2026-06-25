# Orchestration Findings — Parallel Patch Plan (file-overlap scheduling)

Date: 2026-06-25
Status: **PLAN ONLY — no code.** Derived from the consolidated cross-lens report, Gemini's gated patch plan, and the per-lens audit reports (cascade/IO, data-integrity, recovery-idempotency, deadcode, pipeline-graph, temporal, reliability, internal-API).
Goal: group the ~32 findings by **the actual files they touch**, determine where work can run **in parallel** vs where shared files force **serialization**, and order it as waves of concurrent agents.

> Difference from Gemini's plan: Gemini grouped by *domain/function* (8 clusters). That grouping hides **file contention** — e.g. its Clusters 1/3/6 all edit `orchestration-routes.ts`, and the lease state machine is split across Clusters 4/5/6 while all three touch `scheduler.ts`/`runtime.ts`. This plan regroups by **file ownership** so concurrent agents never edit the same file.

---

## 1. Authoritative file → finding matrix (verified by grep/read)

| File (owner lane) | Findings whose fix lands here |
|---|---|
| `gateway/server.ts` | F1, ARC-ORCH-004, REL-JINN-004 |
| `gateway/auth.ts` | F1, ARC-ORCH-004 |
| `gateway/api/orchestration-routes.ts` ⚠️hub | F1, F3, REL-JINN-005, REL-JINN-007, ARC-ORCH-003, STT-ORCH-002(route side), DAT-JINN-002(route side) |
| `orchestration/scheduler.ts` ⚠️hub | REL-JINN-002, TMP-JINN-002, STT-ORCH-002(scheduler side) |
| `orchestration/runtime.ts` ⚠️hub | TMP-JINN-001, REL-JINN-006, TMP-JINN-004(read side), F2 |
| `orchestration/run-mode.ts` ⚠️hub | REL-JINN-001, TMP-JINN-001, ARC-ORCH-001 |
| `gateway/run-web-session.ts` | REL-JINN-001 |
| `orchestration/adapter/real-adapter.ts` + `registry.ts` | REL-JINN-003, ARC-ORCH-001 |
| `orchestration/artifacts.ts` ⚠️hub | DAT-JINN-001, TMP-JINN-003, TMP-JINN-005, FSR-JINN-003, F5(type), F4(copy) |
| `orchestration/dual-lane-state.ts` | DAT-JINN-001, F4(copy) |
| `orchestration/worktree.ts` | TMP-JINN-001(reaper), FSR-JINN-003, F4(copy) |
| `orchestration/store.ts` + `store-schema.ts` | FSR-JINN-001, DAT-JINN-001(artifact_records), F5(migration) |
| `orchestration/store-continuations.ts` | FSR-JINN-002, REL-JINN-006(retry_count) |
| `orchestration/recovery-requeue.ts` | IOP-JINN-001, DAT-JINN-002, DAT-JINN-003/CAS-JINN-001 |
| `orchestration/store-recovery.ts` | TMP-JINN-006 |
| `orchestration/telemetry.ts` | TMP-JINN-004(decay), TMP-JINN-006(retention) |
| `web/routes/kanban/page.tsx` + `gateway/board-service.ts` | FSR-JINN-004 |
| dead files (cli/startup.ts, config-sanitize.ts, web/auth-gate.tsx, …) | ODD-001..009 |

**Three contention hubs** force most serialization: `orchestration-routes.ts` (7 findings, 3 domains), `artifacts.ts`+`store*.ts` (the artifact/run-identity seam), and the lease triplet `scheduler.ts`/`runtime.ts`/`run-mode.ts`.

**Cross-lane findings** (a single fix spans two owners — these are the serialization edges):
`DAT-JINN-001` artifacts↔store · `F5` artifacts↔store-schema · `STT-ORCH-002` scheduler↔routes · `DAT-JINN-002` recovery↔routes · `REL-JINN-001` run-mode↔run-web-session · `REL-JINN-006` runtime↔store-continuations · `TMP-JINN-004` runtime↔telemetry · `TMP-JINN-001` run-mode/runtime↔worktree · `REL-JINN-002` scheduler↔run-lifecycle · `ARC-ORCH-001` run-mode↔adapter.

---

## 2. Concurrency verdict

The orchestration backend is **tightly coupled**, not embarrassingly parallel. Safe parallelism exists in two places:

1. **The isolated periphery** — 4 lanes share no files with anything else → run immediately, concurrently.
2. **One disjoint-file wave of core lanes** — *after* a single foundational change (run-identity + persistence) lands, the lease / run-lifecycle / edge lanes own disjoint file sets and can run 3-up.

The blocker to "just parallelize everything" is **DAT-JINN-001 (composite run identity: `taskId` → `taskId+coordinatorId`)**, which touches ~10 files (artifacts, store, dual-lane-state, scheduler, runtime references). It is a **serialization root**: it must land before any lane that touches the artifact/store/dual-lane seam.

**Max realistic concurrency:** 4 agents (Wave 1) → 1–2 (Wave 2 foundation) → 3 (Wave 3) → 1 (Wave 4) → 1 (Wave 5).

---

## 3. Lanes (each owns a disjoint file set)

| Lane | Owns (files) | Findings | Complexity | Cross-lane deps |
|---|---|---|---|---|
| **L-KANBAN** | web kanban/page.tsx, board-service.ts | FSR-JINN-004 | S | none ✅ |
| **L-DEAD** | the ODD orphan files (deletions) | ODD-001..009 | XS | none ✅ (verify-before-delete) |
| **L-TELE** | telemetry.ts | TMP-JINN-004(decay), TMP-JINN-006(tele) | S | none ✅ (runtime read-side deferred to L-RUN) |
| **L-ADAPT** | adapter/real-adapter.ts, registry.ts | REL-JINN-003 | S | none ✅ (ARC-ORCH-001 excluded → Wave 5) |
| **L-PERSIST** | store.ts, store-schema.ts, store-continuations.ts, recovery-requeue.ts, store-recovery.ts | FSR-JINN-001, FSR-JINN-002, IOP-JINN-001, DAT-JINN-002, DAT-JINN-003/CAS-JINN-001, TMP-JINN-006(store-recovery), F5(migration) | L | shares artifact schema w/ L-ART |
| **L-ART** | artifacts.ts, dual-lane-state.ts, dual-lane.ts, worktree.ts | DAT-JINN-001, TMP-JINN-003, TMP-JINN-005, FSR-JINN-003, F4, F5(type) | L | shares artifact_records w/ L-PERSIST |
| **L-LEASE** | scheduler.ts, lease-meta.ts | REL-JINN-002(mark+signal), TMP-JINN-002, STT-ORCH-002(typed result) | M | exposes API to L-RUN, L-EDGE |
| **L-RUN** | runtime.ts, run-mode.ts, run-web-session.ts | REL-JINN-001, TMP-JINN-001, REL-JINN-006, TMP-JINN-004(read), F2, REL-JINN-002(interrupt call) | L | consumes L-LEASE, L-ART, L-PERSIST, L-TELE |
| **L-EDGE** | server.ts, auth.ts, orchestration-routes.ts | F1, ARC-ORCH-004, F3, REL-JINN-004, REL-JINN-005, REL-JINN-007, ARC-ORCH-003, STT-ORCH-002(route), DAT-JINN-002(route) | M | consumes L-LEASE, L-PERSIST |
| **L-ADAPT-ALIGN** | run-mode.ts + adapter/* (architectural) | ARC-ORCH-001 | XL | conflicts w/ L-RUN + L-ADAPT → last |

> L-PERSIST and L-ART are coupled only at the **artifact schema** (`DAT-JINN-001` + `F5`). Resolve by landing that schema contract first (Wave 2a), then running both in parallel (Wave 2b). If you prefer simplicity, run them as **one** agent.

---

## 4. Wave schedule (dependency-ordered)

```
WAVE 1  (4 agents, fully parallel, git worktrees) ── no shared files
  L-KANBAN · L-DEAD · L-TELE · L-ADAPT

WAVE 2  Foundation: run-identity + persistence  (serialization root)
  2a  schema contract: DAT-JINN-001 composite key + F5 artifact schemaVersion/family
      (store-schema.ts migration + shared artifact type)  ── 1 agent, alone
  2b  (2 agents parallel, after 2a):
        L-PERSIST  (store/recovery/continuations)
        L-ART      (artifacts/dual-lane/worktree)

WAVE 3  Core internals (3 agents parallel — disjoint files, consume Wave 2 + agreed APIs)
  L-LEASE   (scheduler)        ─┐ agree lease API (typed result + cancel signal) up front
  L-RUN     (runtime/run-mode) ─┘ consumes L-LEASE signal, L-ART worktree token, L-PERSIST retry_count, L-TELE decay
  L-EDGE    (server/auth/routes) consumes L-LEASE typed result + L-PERSIST recovery selector

WAVE 4  Adapter alignment (1 agent, after L-RUN + L-ADAPT)
  L-ADAPT-ALIGN  ARC-ORCH-001  ── HUMAN DECISION FIRST: align prod onto ProviderAdapter vs deprecate the layer

WAVE 5  Integration + adversarial hardening (1 agent + drills)
  Gemini Case A (boot retry/backoff before quarantine), Case B (worktree abs-timeout),
  Case C (ambiguous_run_identifier), Case D (empty-output enforced only for kind=implementation)
  + audit-concurrency reproduction of TMP-JINN-001 & REL-JINN-002 BEFORE their patches merge
```

Within Wave 3, L-LEASE / L-RUN / L-EDGE own **disjoint files** (`scheduler.ts` vs `runtime.ts`+`run-mode.ts`+`run-web-session.ts` vs `server.ts`+`auth.ts`+`orchestration-routes.ts`), so they parallelize cleanly **provided the lease-API and recovery-selector signatures are fixed as a contract before the wave starts** (otherwise L-RUN/L-EDGE chase a moving interface). Land L-LEASE's additive API a beat ahead if in doubt.

---

## 5. Execution mechanics

- **Isolation:** give each concurrent agent its own **git worktree** (Workflow `isolation: 'worktree'`, or manual `git worktree add`). Wave 1's four lanes touch disjoint files, so even a shared tree is safe, but worktrees keep commits/branches clean and let each lane run its own `pnpm typecheck`/tests.
- **Per-lane gate (Gemini's 4 gates, keep):** `pnpm typecheck` → targeted `vitest run` for the lane's `__tests__` → integration/concurrency drill → `git diff --check`. A lane is not "done" until its gate is green in its worktree.
- **Merge order = wave order.** Merge Wave N fully (typecheck + full `pnpm test` green on `main`) before starting Wave N+1, because later waves consume earlier waves' contracts.
- **Authority:** these are **patch** tasks — each lane is scoped to its files + its lane's `__tests__`, no opportunistic refactor, behavior tests assert the boundary (not source strings). Confirmed findings only.
- **L-DEAD guard:** my grep showed `gateway/api/routes/status.ts` had ambiguous matches (substring false positives). The dead-code agent must re-verify each ODD file is unreferenced (import + dynamic-import + route-registration) **before** deleting; report any that aren't truly orphaned instead of deleting.

---

## 6. Two findings that must NOT be patched blind

`TMP-JINN-001` (worktree reaper handoff race) and `REL-JINN-002` (expired lease doesn't stop the engine) are **static-only / Likely-Plausible** — not reproduced. Run a dedicated **`audit-concurrency`** pass with a **`test-reproduced` drill** (the repo's fissure concurrency runner) to confirm the window before L-RUN/L-LEASE land their fixes. Patching a race from static reasoning alone risks fixing the wrong window.

---

## 7. Verification (end to end)

1. After each wave merges to `main`: `pnpm typecheck && pnpm lint && pnpm test` all green; `git diff --check` clean.
2. Targeted suites per lane: `vitest run packages/jinn/src/orchestration/__tests__` (+ `adapter/__tests__`, gateway `__tests__/orchestration-routes.test.ts`).
3. New regression tests required before close: empty-output→failure (REL-JINN-001, gated on kind=implementation per Case D); `SQLITE_BUSY` does **not** quarantine (FSR-JINN-001); unauthorized mutating POST to `/api/orchestration/{run,dual-lane/apply}` is rejected even on loopback (F1/F3); expired lease rejected on heartbeat (TMP-JINN-002); composite-key artifact isolation across two coordinators (DAT-JINN-001).
4. Concurrency drills (fissure runner): reaper-handoff (TMP-JINN-001), double-allocation (REL-JINN-002), dual-lane apply check-vs-apply window (TMP-JINN-003).
5. Live smoke: enable `orchestration.enabled: true`, run a `single_worker_with_review` task, confirm the reviewer sees the real diff and a clean run completes; confirm `/api/orchestration/status` reports honest `degraded` after a forced recovery.

---

## 8. One-paragraph answer to "can these run in parallel?"

Yes, but bounded. **Four lanes (kanban, dead-code, telemetry, adapter-error-taxonomy) are fully isolated and run concurrently right now.** The core orchestration files are tightly coupled through three hubs (`orchestration-routes.ts`, the `artifacts.ts`/`store*.ts` artifact seam, and the `scheduler.ts`/`runtime.ts` lease triplet), and the `taskId→taskId+coordinatorId` identity change is a foundation that must land first. Once that foundation is in, **three more lanes (lease, run-lifecycle, edge) own disjoint files and run 3-up.** The adapter-alignment refactor (ARC-ORCH-001) is architectural and runs alone, last, after a human decision. Net: ~4 parallel now, ~3 parallel after the foundation, ~13 sequential dependency edges total — not a flat fan-out.
