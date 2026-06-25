# STT-JINN-006 Ticket Dispatch Repair

Date: 2026-06-23T08:47:16-04:00
Actor: Codex
Task: Repair STT-JINN-006, where board ticket dispatch could create or mark a session in SQLite before the board ticket transition was durable.

## Scope

- Selected finding: STT-JINN-006 only.
- Source touched:
  - `packages/jinn/src/gateway/ticket-dispatch.ts`
- Test touched:
  - `packages/jinn/src/gateway/__tests__/ticket-dispatch-idempotency.test.ts`
- Out of scope:
  - Broader board worker startup reconciliation.
  - Engine lifecycle and Grok transcript test stability.
  - Governance/control file edits.

## Startup Evidence

- Loaded repair skill: `/home/ericl/Work/vscode/agent-skills/20_repair/repair-defect-priority/SKILL.md`.
- Read repo instructions: `AGENTS.md`.
- Read task-relevant docs/audit evidence:
  - `README.md`
  - `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`
- Checked for repo control/governance files requested by startup instructions:
  - No `control/*.yaml`, `governance/*.yaml`, `docs/INDEX.md`, `PROJECT_HANDOFF_MASTER.md`, or `PLAN.md` were present in this checkout.
- Checked Giles:
  - `.giles/` not present.
- Checked Dory:
  - Dory exists, but `dory session status` reported an unrelated active recoverable session for "Implement Kiro headless engine with estimated credit gauge".
  - This repair did not start, resume, checkpoint, or finalize that unrelated Dory session.

## Patch Summary

- Added board dispatch metadata states on ticket-created sessions:
  - `session_created`
  - `board_linked`
- Reordered dispatch persistence so the board ticket is written before the session is marked `running`.
- Reused recoverable in-flight sessions by `sessionKey`/ticket identity instead of creating a second session after a board-write failure.
- Preserved the existing `already-running` behavior for tickets whose linked session is already running.

## Regression Coverage

Added `ticket-dispatch-idempotency.test.ts`:

- Seeds an isolated `JINN_HOME`, org employee, and board ticket.
- Mocks engine dispatch.
- Injects a failure in `writeBoardTickets`.
- Asserts the failed attempt leaves exactly one idle session with `boardDispatchState: session_created`.
- Retries dispatch.
- Asserts retry reuses the same session, writes the board to `in_progress`, marks the session `running`, and dispatches exactly once.

## Validation

Passed:

- `pnpm --filter jinn-cli test -- src/gateway/__tests__/ticket-dispatch-idempotency.test.ts`
- `pnpm --filter jinn-cli typecheck`
- `pnpm --filter jinn-cli test -- src/gateway/__tests__/ticket-dispatch.test.ts src/gateway/__tests__/ticket-dispatch-route.test.ts src/gateway/__tests__/ticket-dispatch-idempotency.test.ts`
- `pnpm lint`
  - Completed with Turbo warning: no lint tasks were executed.
- `pnpm typecheck`
- `pnpm --filter jinn-cli test -- src/engines/__tests__/codex.test.ts -t "tracks a live process and clears it after close"`

Full-suite status:

- `pnpm test` was run twice and did not complete cleanly.
- First full-suite run:
  - `@jinn/web` passed: 58 files, 625 tests.
  - `jinn-cli` failed on `src/engines/__tests__/codex.test.ts` with a timeout in `tracks a live process and clears it after close (isAlive)`.
  - The isolated rerun of that Codex test passed.
- Second full-suite run:
  - `@jinn/web` passed again: 58 files, 625 tests.
  - `jinn-cli` failed with unrelated suite instability:
    - timeout in `src/engines/__tests__/codex.test.ts`
    - hook timeouts in `approvals.test.ts`, `work.test.ts`, `archives.test.ts`, and `sso-user-capture.test.ts`
    - one `src/engines/__tests__/grok.test.ts` transcript assertion failure

## File Size / Modularity

- `packages/jinn/src/gateway/ticket-dispatch.ts`: 222 lines.
- `packages/jinn/src/gateway/__tests__/ticket-dispatch-idempotency.test.ts`: 154 lines.
- No touched hand-written file is over 600 lines.
- Modularity stayed stable; the fix remained in the existing dispatch module with one focused regression test.

## Residual Risks

- The fix closes the reported failure window where a board-dispatch session could be marked `running` before the board ticket transition was durable.
- A crash after board write but around engine dispatch/session-running update is still governed by existing runtime reconciliation behavior, not a new startup reconciliation pass.
- Truly concurrent same-ticket dispatch calls are not guarded by a new database uniqueness constraint; this patch targets failed/retried partial transitions through the existing worker/manual-dispatch paths.
- Full-suite instability remains outside this patch; targeted dispatch coverage and typecheck passed.

## Recommended Next Batch

- Investigate the recurring full-suite instability in `src/engines/__tests__/codex.test.ts`.
- If board dispatch hardening continues, add startup reconciliation for recoverable `boardDispatchState` sessions so restart can repair partially linked board/session state without requiring a manual retry.
