# Gateway API Major Modularization

Date: 2026-06-25
Target: `packages/jinn/src/gateway/api.ts`

## Selected Target

- Selected `packages/jinn/src/gateway/api.ts` as the largest eligible production source file at 3,258 lines.
- Rejected `packages/web/src/components/chat/chat-sidebar.tsx`, `packages/jinn/src/sessions/registry.ts`, and `packages/jinn/src/gateway/server.ts` because they were either smaller or higher-risk than the gateway route-surface monolith.

## Extraction Map

Compatibility facade kept in `packages/jinn/src/gateway/api.ts`:

- `handleApiRequest`
- `type ApiContext`
- `matchRoute`
- `resumePendingWebQueueItems`
- config redaction helpers
- connector identity/reply helpers
- block-finalization helpers
- transcript backfill helpers

Canonical helper ownership after this session:

- `api/context.ts` owns `ApiContext`
- `api/match-route.ts` owns `matchRoute`
- `api/serialize-session.ts` owns `serializeSession` and `isSessionLiveRunning`
- `api/session-dispatch.ts` owns `resumePendingWebQueueItems`
- `config-sanitize.ts` owns config redaction + deep merge
- `connector-reply.ts` owns forwarded identity + connector reply delivery
- `transcript-backfill.ts` owns transcript loading/backfill
- `api/block-finalize.ts` now owns:
  - `normalizeBlockDeltaForTurn`
  - `shouldPersistFinalAssistantMessage`
  - `finalBlocksForAssistantMessage`

Route ownership moved under `packages/jinn/src/gateway/api/routes/`:

- `auth.ts`
- `status.ts`
- `archives.ts`
- `session-write.ts`
- `fs.ts`
- `approvals.ts`
- `cron.ts`
- `org.ts`
- `skills.ts`
- `system.ts`
- `connectors.ts`

`api.ts` now keeps only:

- ordered route dispatch
- `/api/talk/*` passthrough
- `/api/files*` passthrough
- `POST /api/internal/hook`
- top-level URL parsing
- response encoding stash
- terminal `notFound`
- outer `try/catch`

## Compatibility Decisions

- Preserved the `packages/jinn/src/gateway/api.ts` import surface so existing callers and tests did not move.
- Preserved route precedence explicitly in the dispatcher.
- Restored behavior parity where the first extraction wave had drifted:
  - `status.ts` instance health now probes `/api/status`, not `/api/health`
  - `skills.ts` description extraction again uses frontmatter, Trigger section, or first paragraph fallback
  - `auth.ts` again defaults auth-device storage to `JINN_HOME` when `context.jinnHome` is unset

## Two-Deep Checks

- Static search confirmed moved route paths are no longer implemented inline in `api.ts`.
- Static search confirmed each new route module is imported only by `api.ts`.
- Static search confirmed canonical helper definitions now exist in one live implementation file each.
- `git diff --check` passed cleanly.

## Validation

- `pnpm typecheck` ✅
- Targeted gateway/session suites ✅
  - `auth-ux-api`
  - `route-hardening`
  - `work`
  - `session-query-routes`
  - `approvals`
  - `queue-cancel-scope`
  - `queue-pause-replay`
  - `config-put-roundtrip`
  - `config-redaction-security`
  - `ticket-dispatch-route`
  - `org`
  - `org-update`
  - `org-worker-bridge`
  - `api-last-n`
  - `run-web-session-connector-reply`
  - `sessions/archives`
  - `sessions/sso-user-capture`
- `pnpm lint` ✅
- `pnpm build` ✅
- `pnpm test` ✅

## Outcome

- `packages/jinn/src/gateway/api.ts` reduced from 3,258 lines to 116 lines.
- The public entrypoint stayed stable while the route surface finished the existing modularization pattern.

## Residual Risks

- `session-write.ts` is still the heaviest extracted route module and is the next likely candidate if this area needs another modularization pass.
- `system.ts` and `org.ts` remain dense but are now file-bounded and behavior-verified through focused tests plus full repo checks.
- The facade still carries the hook/talk/files edge handling by design; that was intentionally left in place to avoid widening scope into server/auth entry behavior.

## Next Candidates

- `packages/jinn/src/gateway/api/routes/session-write.ts`
- `packages/jinn/src/gateway/api/routes/system.ts`
- `packages/jinn/src/gateway/api/routes/org.ts`
