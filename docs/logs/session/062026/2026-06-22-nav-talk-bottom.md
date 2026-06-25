# Nav rail Talk placement

- Actor: Codex
- Date: 2026-06-22
- Authority: user-requested UI behavior change under repo `AGENTS.md`
- Dory session: `4d1abaef-f857-4eed-ba55-0de86f3278cd`

## Intent

Move the desktop rail Talk icon out of the primary vertical navigation stack and
pin it in the bottom cluster directly above the theme toggle. Preserve canonical
navigation data and mobile tab order.

## Files touched

- `packages/web/src/components/pill-nav.tsx`
- `packages/web/src/components/__tests__/nav-ribbon.test.tsx`

## Validation

- `npx -p node@24.13.0 -c 'cd packages/web && ./node_modules/.bin/vitest run src/components/__tests__/nav-ribbon.test.tsx'`
- `npx -p node@24.13.0 -c 'pnpm --filter web exec tsc --noEmit'`
- `npx -p node@24.13.0 -c 'node -v && pnpm build'`
- `npx -p node@24.13.0 -c 'node packages/jinn/dist/bin/jinn.js restart'`
- `curl http://127.0.0.1:7777/` returned HTTP 200
- Browser MCP desktop check verified Talk is below Settings and above
  `Theme: dark`.
- Browser MCP mobile-width check verified the visible mobile tabs remain Chat,
  Talk, Organization, Cron, Settings.

## Residual risks

- Browser validation covered current dark-theme desktop and mobile-width nav
  structure. It did not exhaust every theme variant.
