# Board worker poller and manual Run now dispatch

- Actor: Codex
- Date: 2026-06-22
- Authority: user-requested feature implementation under repo `AGENTS.md`
- Dory checkpoint baseline: `.dory/checkpoints/20260622T2316300.md`

## Intent

Implement an opt-in kanban board worker that automatically dispatches one eligible
`todo` ticket during configured overnight weekday/weekend windows when interactive
chat is idle, plus a manual `Run now` ticket action that bypasses the idle and
schedule gates. Keep routing deterministic: the poller always routes to the
department manager; the manual path requires an explicit assignee.

## Files touched

- `packages/jinn/src/shared/types.ts`
- `packages/jinn/src/shared/config.ts`
- `packages/jinn/src/shared/__tests__/config.test.ts`
- `packages/jinn/src/gateway/board-service.ts`
- `packages/jinn/src/gateway/board-sync.ts`
- `packages/jinn/src/gateway/board-worker.ts`
- `packages/jinn/src/gateway/ticket-dispatch.ts`
- `packages/jinn/src/gateway/api.ts`
- `packages/jinn/src/gateway/server.ts`
- `packages/jinn/src/gateway/__tests__/board-service.test.ts`
- `packages/jinn/src/gateway/__tests__/board-sync.test.ts`
- `packages/jinn/src/gateway/__tests__/board-worker.test.ts`
- `packages/jinn/src/gateway/__tests__/ticket-dispatch.test.ts`
- `packages/jinn/src/gateway/__tests__/ticket-dispatch-route.test.ts`
- `packages/web/src/lib/kanban/types.ts`
- `packages/web/src/lib/kanban/store.ts`
- `packages/web/src/components/kanban/create-ticket-modal.tsx`
- `packages/web/src/components/kanban/ticket-detail-panel.tsx`
- `packages/web/src/lib/api.ts`
- `packages/web/src/routes/kanban/page.tsx`
- `CHANGELOG.md`

## Notes

- `docs/feature_inventory.md` is absent in this checkout, so it was not updated.
- `docs/INDEX.md` is absent in this checkout, so it was not updated.
- Ticket-driven sessions stamp board metadata into `transportMeta`, letting
  `board-sync` update the original board ticket instead of creating a duplicate
  `session-*` ticket.

## Validation performed

- `git diff --check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`

### Validation notes

- `pnpm typecheck` passed.
- `pnpm test` passed after hardening test-local `JINN_HOME` cleanup in
  `session-query-routes.test.ts`; final result: `131` test files passed,
  `1097` tests passed, `1` skipped.
- `pnpm lint` is configured at the root, but no package lint tasks are defined
  in this checkout, so the command completed as a no-op.
- `pnpm build` passed for both `jinn-cli` and `@jinn/web`.
- Final Dory checkpoint: `.dory/checkpoints/20260622T2329043.md`

## Residual risks

- Runtime verification against a live gateway at `localhost:7777` may still be
  skipped if it would disrupt the local daemon.
- Legacy `board.json` tickets without `complexity` rely on the compatibility
  default of `"medium"`.
