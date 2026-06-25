# Orchestration Cascade And Input/Output Path Audit

Date: 2026-06-25
Scope: recently implemented orchestration deferred-feature and runtime-repair surfaces, centered on `packages/jinn/src/orchestration/{recovery-requeue,artifacts,dual-lane-state}.ts`, `packages/jinn/src/gateway/api/orchestration-routes.ts`, related docs, and focused tests.
Authority: audit-only
Primary lenses: Cascade, Input-Output-Path
Secondary lenses used: Data Integrity, Reliability, Architecture, Workflow-GUI
Budget: ~16 code/doc/test files, ~20 targeted reads, 2 focused vitest runs
Stop condition: all reviewed high-risk orchestration input/output and propagation seams ended as findings or explicit non-findings; remaining orchestration surfaces were below this audit's lens priority floor.

The supplied prompt was treated as a draft. I preserved the intended mission but expanded review to adjacent failure mechanisms and seams implied by the task.

## Surface Inventory

| Surface | Direction | Format | Source Trust | Validation Point | Sink/Destination | Size/Resource Bound |
|---|---|---|---|---|---|---|
| Recovery requeue request body | in | JSON body with `manifestPath`, `taskId`, `managerName` | operator/gateway caller | type check + manager auth in route | recovery manifest reader | none on path locality |
| Recovery manifest file | in | local JSON file | intended: Jinn-generated recovery notice | required field presence only | `corruptDbPath` open + live store writes | none on recovery-dir containment |
| Quarantined DB import | in | SQLite tables `live_run_continuations`, `orchestration_holds` | intended: quarantined orchestration DB | table existence + row shape checks | live orchestration store | no transaction across imported rows |
| Dual-lane manifest | out -> in | local JSON file | Jinn-generated local artifact | safe segment for task dir only | select/apply/list routes | no unique run key beyond `taskId` |
| Dual-lane artifacts | out -> in | local text files + SQLite metadata | Jinn-generated local artifact | task-id + kind lookup only | artifact view route, apply route | read capped at 2 MB |
| Patch apply artifact | out -> in | local patch text | Jinn-generated output | empty/conflict/dirty checks before apply | base repo unstaged changes | no unique run key beyond `taskId + lane` |

## Propagation Inventory

| Origin Failure | Propagation Path | Containment Point | Downstream Consumer | Amplifier | Blast Radius |
|---|---|---|---|---|---|
| Arbitrary recovery manifest path | request body -> manifest JSON -> arbitrary `corruptDbPath` DB -> live store | missing | runtime continuation/hold/queue state | recovery route itself | Workflow |
| Reused `taskId` in dual-lane run | manifest/artifact overwrite -> select/apply/artifact view read stale output | missing | operator selection/apply workflow | repeated reruns with same task ID | Workflow |
| Recovery import error after first write | continuation/pause written -> hold parse/write fails -> API returns error | missing transaction | live continuation/queue views and later resume flow | operator rerun / duplicate attempts | Workflow |

## Boundary Map

| Surface | Intended boundary |
|---|---|
| Recovery manifest ingestion | only Jinn-generated recovery notices should be accepted as authoritative recovery input |
| Quarantined DB import | imported rows should remain quarantined unless the entire selected recovery succeeds atomically |
| Dual-lane outputs | prompt/output/diff/apply artifacts should remain bound to one specific orchestration run |
| Artifact view/apply routes | outputs should be fetched and applied only for the exact originating run |

## Findings Table

| ID | Severity | Confidence | Summary |
|---|---|---|---|
| IOP-JINN-001 | High | Confirmed | Recovery requeue accepts arbitrary local manifest paths and trusts any `corruptDbPath` named inside them as authoritative input. |
| IOP-JINN-002 | High | Confirmed | Dual-lane manifests and artifacts are written and reread in a `taskId`-only namespace, enabling stale artifact reuse and overwrite across distinct runs. |
| CAS-JINN-001 | Medium | Confirmed | Recovery import can fail after partially restoring live state, so a local recovery error propagates into later queue/runtime behavior. |

## Skill Escalation

| Finding | Primary Lens | Secondary Lens | Why |
|---|---|---|---|
| IOP-JINN-001 | Input-Output-Path | Cascade | An external file path becomes trusted input and then mutates live orchestration state consumed downstream. |
| IOP-JINN-001 | Input-Output-Path | Data Integrity | The imported DB rows become authoritative continuation/hold state. |
| IOP-JINN-002 | Input-Output-Path | Cascade | Generated artifacts become later operator inputs for selection, view, and apply. |
| IOP-JINN-002 | Input-Output-Path | Workflow-GUI | The operator-facing artifact/view/apply surfaces can present or act on the wrong run. |
| CAS-JINN-001 | Cascade | Reliability | Recovery failure is returned to the operator while live state may already be mutated. |
| CAS-JINN-001 | Cascade | Data Integrity | Partial import changes continuation and pause state despite a failed recovery outcome. |

### IOP-JINN-001: Recovery requeue trusts arbitrary manifest and DB paths

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Input-Output-Path

Evidence:
- `packages/jinn/src/gateway/api/orchestration-routes.ts:299-314` — the route accepts `manifestPath`, `taskId`, and `managerName` from the request body and passes `manifestPath` directly to recovery.
- `packages/jinn/src/orchestration/recovery-requeue.ts:50-55` — recovery reads the supplied manifest and opens `manifest.manifest.corruptDbPath` as a SQLite database.
- `packages/jinn/src/orchestration/recovery-requeue.ts:155-173` — manifest validation checks only required JSON fields, not manifest location or provenance.
- `docs/orchestration/README.md:116-117` — docs show recovery requeue as operating on `~/.jinn/orchestration-recovery/<manifest>.json`.
- `docs/orchestration/README.md:165-168` — docs describe importing one operator-selected recovered continuation from a recovery notice.

Observed behavior:
- The recovery route will accept any local JSON file path and then trust any `corruptDbPath` inside that file as the source database for requeue import.

Expected boundary:
- Recovery requeue should only accept Jinn-generated recovery notices from the configured recovery notice directory, or otherwise verify that the manifest provenance and referenced DB path are within an approved quarantine boundary.

Failure mechanism:
- Path locality and provenance are not enforced. A request body supplies the manifest path; the manifest supplies the DB path; both are treated as trusted after minimal shape checks.

Break-it angle:
- Provide a syntactically valid manifest outside the recovery notice directory that points `corruptDbPath` at an arbitrary local SQLite file containing matching tables. The route imports those rows into live orchestration state.

Impact:
- Hidden input sources can become authoritative orchestration continuations and holds. A management-scope caller can recover from the wrong database or intentionally feed unrelated local DB content into the live scheduler state.

Operational impact:
- Blast radius: Workflow
- Side-effect class: DB
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: unsafe

Adjacent failure modes:
- CAS-JINN-001
- arbitrary manifest path hides the provenance of imported recovery data from later operators

Recommended mitigation:
- Remediation patterns: path_containment_guard, provenance_bound_manifest, trusted_input_allowlist
- Minimal repair: resolve `manifestPath` and `corruptDbPath` against the configured recovery/quarantine roots and reject paths outside those roots.
- Local guardrail: require the manifest to come from the runtime's recovery notice directory or carry a verifier that only Jinn-generated notices possess.
- Behavior test: recovery requeue rejects a valid-looking manifest outside the configured recovery directory and rejects a manifest whose `corruptDbPath` escapes the quarantine root.

Implementation assessment:
- Complexity: local_guardrail
- Cost: S
- Cost drivers: modules, tests, docs
- Nominal implementation agent: codex
- Rationale: the repair is localized to recovery route/path validation and a few focused tests, with operator docs needing an exact update.

Validation:
- Test: arbitrary manifest path outside recovery dir is rejected.
- Test: manifest inside recovery dir but with escaped `corruptDbPath` is rejected.
- Test: valid generated manifest inside the recovery dir still imports successfully.

Non-goals:
- Do not redesign the broader corrupt-DB recovery UX in this slice.

### IOP-JINN-002: Dual-lane artifacts and manifests reuse a taskId-only namespace

Severity: High
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Input-Output-Path

Evidence:
- `packages/jinn/src/orchestration/dual-lane-state.ts:11-22` — manifest structure contains both `taskId` and `coordinatorId`.
- `packages/jinn/src/orchestration/dual-lane-state.ts:58-69` — manifest write/read paths are keyed only by `taskId`.
- `packages/jinn/src/orchestration/dual-lane-state.ts:114-123` — dual-lane task directory and manifest path are derived from `taskId` alone.
- `packages/jinn/src/orchestration/artifacts.ts:52-58` — artifact listing reads by `taskId` and `kind` only.
- `packages/jinn/src/orchestration/artifacts.ts:132-141` — prompt/output/diff artifacts are persisted with only `taskId`.
- `packages/jinn/src/orchestration/artifacts.ts:161-169` — artifact file path and `artifactId` are `taskId + kind + lane/base`.
- `packages/jinn/src/orchestration/artifacts.ts:182-203` — fallback artifact discovery also enumerates only the task-id-derived artifact directory.
- `packages/jinn/src/gateway/api/orchestration-routes.ts:397-405` — artifact view route keys on `taskId` and `kind`.
- `docs/orchestration/README.md:147-152` — docs instruct selection/apply entirely by `taskId`.
- `packages/jinn/src/orchestration/__tests__/dual-lane.test.ts:49-56` and `packages/jinn/src/orchestration/__tests__/dual-lane.test.ts:76-95` — current tests exercise a single `taskId` happy path only.

Observed behavior:
- Dual-lane generated outputs are written, listed, selected, and applied in a namespace that ignores `coordinatorId`, even though the run identity model otherwise carries both fields.

Expected boundary:
- Generated artifacts and manifests should be bound to the full orchestration run identity, or to a separate immutable run ID, so later view/select/apply operations cannot reuse stale output from another run.

Failure mechanism:
- The code emits files and metadata into a `taskId`-derived directory and uses `taskId` as the artifact/manifest lookup key. A later run with the same `taskId` overwrites or reuses the previous run's outputs.

Break-it angle:
- Run `dual_lane` twice with the same `taskId` and different `coordinatorId` values. The second run reuses the same manifest/artifact directory; `artifacts`, `select`, and `apply` can read or act on stale data from the wrong run.

Impact:
- Stale prompt/output/diff/apply artifacts can pollute operator review, wrong patches can be selected/applied, and prior outputs can be silently overwritten.

Operational impact:
- Blast radius: Workflow
- Side-effect class: file
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: unsafe

Adjacent failure modes:
- stale patch artifacts can be treated as current authority
- output overwrite destroys provenance for prior runs
- wrong dual-lane manifest can keep worktrees protected or archived incorrectly

Recommended mitigation:
- Remediation patterns: immutable_run_identity, generated_artifact_versioning, provenance_preserving_lookup
- Minimal repair: include `coordinatorId` or a generated run ID in dual-lane manifest paths, artifact IDs, artifact route selectors, and select/apply APIs.
- Local guardrail: refuse select/apply when the requested run identity does not match the manifest's stored identity.
- Behavior test: two dual-lane runs sharing a `taskId` but differing by `coordinatorId` keep separate manifests, artifacts, and patch-apply records.

Implementation assessment:
- Complexity: workflow_protocol
- Cost: M
- Cost drivers: modules, tests, docs
- Nominal implementation agent: codex
- Rationale: this spans filesystem naming, stored artifact metadata, gateway and CLI request shapes, and operator docs, but remains localized to orchestration.

Validation:
- Test: repeated `taskId` with different `coordinatorId` values does not overwrite prior manifest/artifact files.
- Test: artifact view route requires the full run identity and returns only that run's artifacts.
- Test: select/apply cannot act on a stale manifest from another run instance.

Non-goals:
- Do not redesign the comparison report contents.

### CAS-JINN-001: Recovery failure can still poison later live orchestration state

Severity: Medium
Confidence: Confirmed
Evidence basis: source-evidenced
Domain: Cascade

Evidence:
- `packages/jinn/src/orchestration/recovery-requeue.ts:65-75` — recovery writes the continuation, then the task pause, then imports holds.
- `packages/jinn/src/orchestration/recovery-requeue.ts:91-93` — later exceptions are flattened to an error result.
- `packages/jinn/src/gateway/api/orchestration-routes.ts:315-319` — the route returns an error response or `202` strictly from that result object.
- `packages/jinn/src/orchestration/recovery-requeue.ts:118-126` — recovered hold rows are parsed and upserted one by one, so a bad later row can throw after earlier writes.
- `packages/jinn/src/orchestration/store-controls.ts:82-104` — task pause writes are direct DB mutations.
- `packages/jinn/src/orchestration/__tests__/recovery-requeue.test.ts:88-116` — current tests verify the successful import path only.
- `docs/orchestration/README.md:165-168` — docs describe a successful import as one operator-selected recovered continuation being queued and paused for later explicit resume.

Observed behavior:
- A recovery error after the continuation or pause write can still leave live orchestration state mutated, so the failure propagates beyond the recovery request that raised the error.

Expected boundary:
- Recovery should either commit the selected continuation import atomically or leave live orchestration state unchanged on error.

Failure mechanism:
- The import is sequenced, not transactional. Once the continuation and task pause are written, a later hold parse/write exception returns an error but does not roll back those earlier state changes.

Break-it angle:
- Create a quarantined DB where the selected continuation is valid but one matching hold row has invalid JSON in `roles_json` or `worker_ids_json`. Recovery returns `invalid_record`, but the continuation and per-task pause may already exist in the live DB.

Impact:
- A local recovery failure becomes later scheduler/view state: queue/continuation surfaces can show restored work the operator believes failed, and a rerun can compound the confusion.

Operational impact:
- Blast radius: Workflow
- Side-effect class: DB
- Reversibility: compensatable
- Operator visibility: silent
- Rerun safety: unsafe

Adjacent failure modes:
- IOP-JINN-001
- failed recovery can leave dormant paused work that later operators treat as intentionally restored
- repeated recovery attempts can amplify the confusion around what state is authoritative

Recommended mitigation:
- Remediation patterns: transactional_recovery_import, containment_bulkhead, fail_visible_state_transition
- Minimal repair: wrap continuation import, task pause creation, and hold imports in one store transaction.
- Local guardrail: when recovery fails, emit explicit diagnostics only after verifying no live-store mutation occurred.
- Behavior test: malformed recovered hold JSON causes recovery failure and leaves zero live continuations, pauses, or imported holds.

Implementation assessment:
- Complexity: persistence_recovery
- Cost: S
- Cost drivers: modules, tests
- Nominal implementation agent: codex
- Rationale: the fix is localized to one recovery seam but must be validated with rollback assertions rather than line-based checks.

Validation:
- Test: injected parse failure during hold import leaves the live store unchanged.
- Test: successful recovery still writes continuation, pause, and holds together.
- Test: error responses do not coincide with newly visible continuation/pause state.

Non-goals:
- Do not expand this into a generic multi-surface transaction framework unless another recovery path needs it immediately.

## Non-Findings

- `Not Confirmed` — path traversal in dual-lane artifact filenames or directories: `safeSegment()` strips non `[A-Za-z0-9._-]` characters before deriving task/lane filesystem segments in `packages/jinn/src/orchestration/dual-lane-state.ts:126-129` and `packages/jinn/src/orchestration/artifacts.ts:163-164`.
- `Not Confirmed` — unbounded artifact reads through the artifact route: `MAX_ARTIFACT_BYTES = 2_000_000` and `readArtifactFile()` rejects larger files before returning content in `packages/jinn/src/orchestration/artifacts.ts:19` and `packages/jinn/src/orchestration/artifacts.ts:205-209`.
- `Not Confirmed` — missing-output artifacts silently masquerading as real model output: `rawOutputForSession()` writes the explicit marker `[raw model output unavailable in session transcript]` when no assistant transcript exists in `packages/jinn/src/orchestration/artifacts.ts:145-150`, and the deferred-features log documents that unavailable-marker behavior in `docs/logs/session/062026/2026-06-24-matrix-orchestration-deferred-features.md:41-43`.
- `Not Confirmed` — corrupt-DB boot recovery automatically promotes quarantined data into live authority: the docs and reviewed store boot path describe quarantine + empty restart, with requeue remaining explicit and operator-driven.

## Input/Output Inventory Coverage

| Check | Result |
|---|---|
| IOP-001 Unvalidated Input | Finding: IOP-JINN-001 |
| IOP-002 Unsafe Output Path | Not Confirmed in reviewed dual-lane artifact path derivation |
| IOP-003 Path Traversal | Not Confirmed in reviewed dual-lane artifact/manfest path derivation |
| IOP-004 Archive Slip | Not applicable to reviewed orchestration slice |
| IOP-005 Extension/Format Confusion | Not Confirmed in reviewed orchestration slice |
| IOP-006 Malformed Payload Accepted | Finding-adjacent: recovery manifest accepts arbitrary location; malformed JSON itself is rejected |
| IOP-007 Dangerous Export Formula | Not applicable to reviewed orchestration slice |
| IOP-008 Provider/OCR Output Treated As Trusted | Not Confirmed in reviewed raw-output marker seam |
| IOP-009 Log/Report Leakage | Not Confirmed in reviewed orchestration docs/routes |
| IOP-010 Generated Artifact Reuse | Finding: IOP-JINN-002 |
| IOP-011 Output Overwrite | Finding: IOP-JINN-002 |
| IOP-012 Partial Output Presented Complete | Not Confirmed in reviewed raw-output marker seam |
| IOP-013 Unbounded File/Archive Processing | Not Confirmed in reviewed artifact read path |
| IOP-014 Hidden Input Source | Finding: IOP-JINN-001 |
| IOP-015 Inconsistent CLI/API/UI Input Handling | Not Reviewed exhaustively beyond recovery/artifact surfaces |

## Cascade Inventory Coverage

| Check | Result |
|---|---|
| CAS-001 Cascading Failure | Finding: CAS-JINN-001 |
| CAS-002 Feedback Loop | Not Confirmed in reviewed orchestration IO seams |
| CAS-003 Retry Amplification | Not Confirmed in reviewed orchestration IO seams |
| CAS-004 State Poisoning | Finding: CAS-JINN-001 |
| CAS-005 Downstream Misclassification | Not Confirmed in reviewed orchestration IO seams |
| CAS-006 Blast Radius Expansion | Finding-adjacent: IOP-JINN-002 and CAS-JINN-001 expand local defects into operator workflow surfaces |
| CAS-007 Missing Containment | Findings: IOP-JINN-001, CAS-JINN-001 |
| CAS-008 Error Context Lost | Not Confirmed materially in reviewed surfaces |
| CAS-009 Bad Data Becomes Authority | Finding: IOP-JINN-001 |
| CAS-010 Partial Failure Becomes Global | Finding: CAS-JINN-001 |
| CAS-011 Advisory Finding Becomes Enforcement | Not applicable to reviewed orchestration slice |
| CAS-012 Optional Integration Failure Multiplier | Not Confirmed in reviewed orchestration IO seams |
| CAS-013 Stale Artifact Pollutes Workflow | Finding: IOP-JINN-002 |
| CAS-014 Recovery Causes Secondary Failure | Finding: CAS-JINN-001 |
| CAS-015 Alert/Health Noise Masks Root Cause | Not Reviewed deeply in this slice |

## Break-It Review

- Parse-vs-trust angle: recovery manifest parsing validates shape but not provenance or path containment, so parse success is treated as authority.
- Destination angle: reviewed artifact/manfest paths are path-sanitized, but the run-identity namespace is too weak and enables overwrite/reuse.
- Export-as-input angle: dual-lane prompt/output/diff/apply artifacts are explicit outputs that later become operator-trusted inputs for view/select/apply.
- Completeness angle: raw output artifact honesty held because the code emits an explicit unavailable marker instead of inventing content.
- Containment angle: recovery import lacks a transactional bulkhead, so a later hold parse failure can escape its local request boundary and persist into live state.
- Authority angle: arbitrary DB rows referenced by a supplied manifest can become live continuation/hold authority.
- Recovery angle: the recovery path itself can introduce a secondary failure by mutating state before returning an error.

## Patch Order

1. Fix `IOP-JINN-001` first so recovery input is constrained to trusted notice/quarantine roots.
2. Fix `CAS-JINN-001` next so a recovery failure cannot mutate live state on the way out.
3. Fix `IOP-JINN-002` last because the run-identity change touches CLI/API/docs and benefits from the recovery boundary already being stabilized.

## Regression And Guardrail Tests

- Add a recovery test that rejects a manifest outside the configured recovery notice directory.
- Add a recovery test that rejects a manifest whose `corruptDbPath` escapes the quarantine directory.
- Add a recovery rollback test with malformed recovered hold JSON and assert zero live-store mutations.
- Add a dual-lane collision test using the same `taskId` with two different `coordinatorId` values and assert isolated manifests, artifacts, and apply records.
- Add an artifact-route test that requires the full run identity and proves stale artifacts from another run are not returned.

## Validation Limits

- This was a static audit with focused non-destructive test execution. I did not perform manual gateway requests against a live daemon or destructive filesystem drills.
- `npx vitest run src/orchestration/__tests__/recovery-requeue.test.ts` passed: 1 file, 9 tests.
- `npx vitest run src/orchestration/__tests__/dual-lane.test.ts` passed: 1 file, 3 tests.
- The current recovery tests cover successful import, expired-hold skipping, missing manifest handling, and invalid recovered states, but they do not cover manifest path containment, arbitrary `corruptDbPath` rejection, duplicate `taskId` across coordinators, or rollback on late import failure.
- I did not re-audit unrelated auth/session/gateway regressions outside the orchestration IO and cascade seams named above.
