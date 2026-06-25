# Post-Modularization Regression Audit v2

Date: 2026-06-25
Repo: `jinn`
Auditor: Kilo
Scope: clean, audit-only regression pass across recent modularization seams in `packages/jinn` and `packages/web`

## Skill Load Status

- Shared/base audit skill directories were requested, but this environment did not expose a loader for those external skill paths.
- Audit proceeded manually across the requested lenses: nodejs architecture, seam ownership, input/output paths, internal API contracts, dependency criticality, cascade, data integrity, state transition, temporal, concurrency, negative space, and workflow.

## Repo State

- `git status --short` at start:
  - `M packages/jinn/src/gateway/files.ts`
  - `?? packages/jinn/src/gateway/files/`
- Recent modularization commits inspected:
  - `51b9f93` approvals extraction
  - `566588a` settings connectors extraction
  - `d049054` archives extraction
  - `841c367` chat sidebar surface extraction
  - `253f134` gateway API route extraction
  - plus the recent orchestration modularization/hardening commits in the last 20 entries

## Validation

- `pnpm typecheck`: passed
- `pnpm test`: passed
  - `188` test files passed
  - `1502` tests passed, `1` skipped
- `pnpm lint`: passed
- `pnpm build`: passed
  - residual warning only: large Vite chunks in `packages/web` build output

## Findings

### ARC-REG-001

- Severity: High
- Status: Confirmed
- Lenses: `audit-nodejs-architecture`, `audit-architecture-seam`, `audit-internalapi-contract`, `audit-temporal`, `audit-negative-space`
- Evidence:
  - `packages/jinn/src/gateway/api.ts:48-50`
  - `packages/jinn/src/gateway/api/routes/status.ts:28-36`
  - `packages/jinn/src/gateway/server.ts:1063-1068`
  - `packages/jinn/src/gateway/api/orchestration-routes.ts:82-112`
  - `packages/jinn/src/gateway/api/orchestration-routes.ts:277-314`
  - Reproduction in this audit session:
    - `POST /api/orchestration/queue/pause-task` via exported `handleApiRequest()` produced no status code and never ended the response
    - `POST /api/orchestration/queue/resume-task` via exported `handleApiRequest()` produced no status code and never ended the response
    - `POST /api/orchestration/recovery/requeue` via exported `handleApiRequest()` produced no status code and never ended the response
    - `POST /api/orchestration/continuations/retry` via exported `handleApiRequest()` returned `400 {"error":"continuation retry requires an HTTP request body"}` even when a body was supplied
- Observed behavior:
  - The modularized orchestration family is owned by two dispatch seams.
  - Live server traffic is special-cased in `server.ts` and calls `handleOrchestrationRoutes(..., req)` directly.
  - The exported compatibility façade `handleApiRequest()` reaches the same family indirectly through `handleStatusRoutes()`, but that path drops `req` entirely.
  - As a result, body-dependent orchestration mutations either hang without responding or mis-handle valid requests.
- Expected behavior:
  - `handleApiRequest()` and the live server path should share one canonical orchestration dispatch contract, and both must pass the HTTP request object through to body-reading mutation handlers.
- Regression risk:
  - Any embedder, test harness, or future refactor that routes orchestration traffic through `handleApiRequest()` instead of the current `server.ts` special case will hit broken POST semantics.
  - This is exactly the kind of stale façade / split-ownership regression modularization tends to introduce.
- Minimal remediation guidance:
  - Collapse orchestration routing to one canonical seam.
  - Either route orchestration directly inside `handleApiRequest(req, ...)` with the real request object, or remove the status-route delegation and keep the server-only path as the sole owner.
  - Preserve one exported contract and test that contract, not only the extracted sub-handler.
- Suggested regression test:
  - Add direct `handleApiRequest()` coverage for `POST /api/orchestration/queue/pause-task`, `resume-task`, `continuations/retry`, and `recovery/requeue`, asserting concrete status codes and completed responses.

### NEG-REG-002

- Severity: Medium
- Status: Confirmed
- Lenses: `audit-negative-space`, `audit-workflow`, `audit-internalapi-contract`
- Evidence:
  - `packages/jinn/src/gateway/__tests__/orchestration-routes.test.ts:543-566`
  - `packages/jinn/src/gateway/__tests__/orchestration-routes.test.ts:581-587`
  - `packages/jinn/src/gateway/api.ts:48-50`
  - `packages/jinn/src/gateway/api/routes/status.ts:36`
- Observed behavior:
  - The extracted orchestration route tests exercise `handleOrchestrationRoutes()` directly.
  - The broken compatibility path in `handleApiRequest()` is not covered by any matching mutation-route regression test.
  - This is why the façade regression in `ARC-REG-001` survived despite a fully green suite.
- Expected behavior:
  - After a route-family extraction, at least one end-to-end router test should hit the public compatibility façade, not only the extracted leaf handler.
- Regression risk:
  - Future route-family extractions can keep passing isolated handler tests while silently breaking the exported API surface.
- Minimal remediation guidance:
  - Keep the isolated handler tests, but add façade-level tests for representative GET and POST orchestration routes through `handleApiRequest()`.
- Suggested regression test:
  - Add one table-driven suite that sends orchestration requests through `handleApiRequest()` and verifies parity with direct `handleOrchestrationRoutes()` behavior.

### NEG-REG-003

- Severity: Low
- Status: Confirmed
- Lenses: `audit-negative-space`, `audit-internalapi-contract`, `audit-workflow`
- Evidence:
  - `packages/web/src/lib/orchestration-api.ts:264-316`
  - `packages/web/src/lib/__tests__/orchestration-api.test.ts:41-70`
- Observed behavior:
  - The web orchestration client now exports additional mutating helpers including `applyDualLaneWinner`, `pauseQueuedTask`, `resumeQueuedTask`, `createHold`, `extendHold`, `cancelHold`, `viewArtifact`, and `requeueRecoveredTask`.
  - The regression test only covers `retryContinuation`, `selectDualLaneWinner`, `pauseOrchestrationQueue`, `resumeOrchestrationQueue`, and `stopOrchestrationLease`.
- Expected behavior:
  - Each exported orchestration mutator should have at least one fetch-shape contract test after this modularization pass.
- Regression risk:
  - Path/body drift between dashboard code and daemon routes can slip through if a helper is added or changed but never exercised in the web API contract test.
- Minimal remediation guidance:
  - Extend the existing table-driven fetch mock test rather than adding many one-off tests.
- Suggested regression test:
  - Assert the request path and JSON body for every exported mutating helper in `packages/web/src/lib/orchestration-api.ts`.

## Top 5 Risks

1. `ARC-REG-001`: the exported API façade has broken POST behavior for several orchestration mutation routes.
2. Dual route ownership for orchestration traffic is split across `server.ts` and `status.ts`, increasing future drift risk even where runtime behavior currently works.
3. Orchestration route tests validate the extracted handler but not the compatibility façade, so router-level regressions can pass green.
4. The web orchestration client exposes more mutating helpers than the current contract test covers.
5. The current worktree contains an in-progress `gateway/files` submodule split; full validation passed, but this audit did not find dedicated new seam-specific tests in the same pass.

## Merge / Release Assessment

- Merge blocker: Yes.
  - `ARC-REG-001` blocks merge for the modularization series because the exported compatibility surface is broken for part of the orchestration family.
- Release blocker: Not confirmed on the standard daemon request path.
  - `server.ts` currently masks the defect by routing `/api/orchestration/*` directly to `handleOrchestrationRoutes(req, ...)` before `handleApiRequest()` runs.
  - That reduces immediate release risk, but it does not make the façade breakage acceptable.

## Recommended Patch Order

1. Repair `ARC-REG-001` by making orchestration routing single-owner and request-complete.
2. Add façade-level orchestration router regression tests to lock the repaired contract.
3. Extend `packages/web/src/lib/__tests__/orchestration-api.test.ts` to cover all exported mutating helpers.
4. Add a targeted seam test for the in-flight `gateway/files` split once that worktree change is finalized.

## Residual Risks And Skipped Checks

- No prior audit findings were used to drive this pass.
- External audit skill directories could not be loaded directly in this environment, so lens application was manual.
- No code was patched; this report is audit-only.
- Full repo validation passed, so remaining risk is concentrated in stale façade ownership and missing regression coverage rather than failing static or runtime checks.
