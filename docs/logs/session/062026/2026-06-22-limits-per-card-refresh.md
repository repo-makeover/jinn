# Limits per-card refresh controls

- Actor: Codex
- Date: 2026-06-22
- Authority: user-requested UI behavior change under repo `AGENTS.md`
- Dory session: `2f7ba714-d91a-48e0-bd9a-0e86fb6e33c8`

## Intent

Move the limits refresh affordance out of the page header and into each engine
card. Each card refreshes its own CLI snapshot through
`/api/engine-limits/refresh?engine=<name>`, so non-Codex cards can be refreshed
directly.

## Files touched

- `packages/web/src/routes/limits/page.tsx`

## Validation

- `npx -p node@24.13.0 -c 'cd packages/web && ../../node_modules/.bin/tsc --noEmit'`
- `npx -p node@24.13.0 -c 'node -v && pnpm build'`
- `npx -p node@24.13.0 -c 'node packages/jinn/dist/bin/jinn.js restart'`
- `curl http://127.0.0.1:7777/limits` returned HTTP 200
- Browser MCP loaded `/limits`, found card refresh labels for Claude, Codex,
  Grok, Antigravity, and Pi, found zero generic header refresh buttons, and
  verified Claude and Grok card refreshes returned HTTP 200 from their
  engine-specific endpoints.

## Residual risks

- Browser validation covered desktop interaction and one narrow initial
  snapshot. It did not exhaustively test every engine button state after
  long-running CLI failures.
