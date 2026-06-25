# 2026-06-24 Upstream Chat Streaming Merge

## Scope

Merged upstream commits:

- `1f40f7f` — Fix chat mode streaming and selector regressions
- `547fbb1` — Defer Claude subagent stop failures while active

Added one local follow-up commit:

- `aa56c69` — dedupe duplicated `shouldDeferStopFailure` option introduced during conflict resolution

## Repo-Local Merge Notes

- `packages/jinn/src/engines/claude-interactive.ts` already diverged via `claude-transcript.ts` extraction and fork-specific overage fields in rate-limit mapping; upstream stop-failure and reasoning-strip behavior was merged into that split file.
- Upstream changed `gateway/api.ts`, but this fork executes the relevant turn lifecycle in `packages/jinn/src/gateway/run-web-session.ts`. The streamed-block extraction was applied there instead of reviving upstream's older inline `runWebSession` copy.
- `packages/web/src/components/chat/new-chat-helpers.ts` already carried fork-specific `cwd` support; upstream selector helpers were merged without removing `cwd`.

## Implemented

- Claude interactive turns now:
  - strip leaked reasoning blocks from Stop-hook and transcript-recovered text;
  - use a StopFailure denylist (`rate_limit`, `billing_error`, `authentication_failed`, `max_output_tokens`) instead of an allowlist;
  - keep deferring graced StopFailures while upstream subagent activity remains active.
- Grok now strips reasoning-like payloads and reasoning markup before they reach chat output.
- Streamed-block preservation moved into `packages/jinn/src/gateway/streamed-blocks.ts` and is used by the fork's live turn runner.
- New-chat selector defaults now honor employee engine/model/effort only until the operator manually changes the selector.
- Live-session completion dedupe is now bounded to the current turn so historical identical messages are not removed.

## Validation

- `pnpm --filter jinn-cli typecheck`
- `pnpm --filter jinn-cli test`
- `pnpm --filter @jinn/web typecheck`
- `pnpm --filter @jinn/web test`
- `pnpm --filter jinn-cli test -- src/gateway/__tests__/streamed-blocks.test.ts src/gateway/__tests__/run-web-session-stall-policy.test.ts`

## Residual Risks

- The fork's Talk whisper/activity path previously used Claude's second hook-sourced `tool_use` delta input to infer `/api/talk/*` sub-actions. Upstream removed that duplicate `tool_use`; generic tool activity still works, but Claude-specific whisper granularity may now be lower until Talk gets a replacement signal.
- `packages/jinn/src/engines/claude-interactive.ts` is 1,133 lines and remains well above the 600-line soft threshold.
- `packages/jinn/src/gateway/run-web-session.ts` is 793 lines and remains above the 600-line soft threshold.
- `packages/web/src/hooks/use-live-session.ts` is 700 lines and remains above the 600-line soft threshold.
- `packages/web/src/components/chat/chat-pane.tsx` is 601 lines and remains just above the 600-line soft threshold.
