# Previous Projects archive implementation

- Actor: Codex
- Date: 2026-06-22
- Authority: user-requested feature implementation under repo `AGENTS.md`
- Dory session: `ed898b3d-77c3-4a5c-ad1e-c77e7159b5cf`

## Intent

Implement persisted read-only project archives for room, scheduled-run, and
single-chat session groups. Archive creation snapshots session metadata and
transcripts, writes an archive record, then removes source sessions through the
same teardown path as session deletion. Add web API client hooks, sidebar
archive affordances, and a `/archive` Previous Projects page.

## Files touched

- `packages/jinn/src/shared/types.ts`
- `packages/jinn/src/sessions/registry.ts`
- `packages/jinn/src/gateway/api.ts`
- `packages/jinn/src/sessions/__tests__/archives.test.ts`
- `packages/jinn/src/engines/__tests__/codex.test.ts`
- `packages/web/src/lib/api.ts`
- `packages/web/src/lib/query-keys.ts`
- `packages/web/src/hooks/use-archives.ts`
- `packages/web/src/components/chat/archive-dialog.tsx`
- `packages/web/src/components/chat/chat-sidebar.tsx`
- `packages/web/src/components/ui/input.tsx`
- `packages/web/src/routes/archive/page.tsx`
- `packages/web/src/main.tsx`
- `packages/web/src/lib/nav.ts`
- `README.md`
- `CHANGELOG.md`

## Validation

- `pnpm --filter jinn-cli exec tsc --noEmit`
- `pnpm --filter web exec tsc --noEmit`
- `git diff --check`
- `npx -p node@24.13.0 -c 'cd packages/jinn && ./node_modules/.bin/vitest run src/sessions/__tests__/archives.test.ts'`
- `npx -p node@24.13.0 -c 'cd packages/jinn && ./node_modules/.bin/tsc --noEmit'`
- `npx -p node@24.13.0 -c 'node -v && pnpm typecheck'`
- `npx -p node@24.13.0 -c 'node -v && pnpm build'`
- `npx -p node@24.13.0 -c 'cd packages/jinn && ./node_modules/.bin/vitest run src/engines/__tests__/codex.test.ts'`
- `npx -p node@24.13.0 -c 'node -v && pnpm lint'` (configured lint ran; no package lint tasks executed)
- `npx -p node@24.13.0 -c 'node -v && pnpm test'`

## Residual risks

- Manual runtime verification against a live gateway at `localhost:7777` was not
  run to avoid disrupting any active daemon sessions.
- The archive transcript UI renders captured message text and links to captured
  media metadata; it does not recreate the full live-chat media renderer.
- Large legacy files remain large: gateway API, session registry, and chat
  sidebar were extended in-place to preserve existing routing and UI patterns.
