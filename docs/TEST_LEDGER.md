# Test Ledger

| Test Area | Command / Evidence | Last Known Result | Source | Coverage Meaning | Gaps |
|---|---|---|---|---|---|
| Root typecheck | `pnpm typecheck` | passed on 2026-06-25 | local stewardship run | TypeScript checks for `jinn-cli` and `@jinn/web`. | Does not execute runtime flows. |
| Root lint | `pnpm lint` | passed on 2026-06-25 | local stewardship run | ESLint checks package source trees with `--max-warnings=0`. | Does not lint docs. |
| Root unit tests | `pnpm test` | passed on 2026-06-25 | local stewardship run | `jinn-cli`: 190 files, 1508 passed, 1 skipped. `@jinn/web`: 75 files, 711 passed. | Emits React test warnings; see `TODO-20260625-001`. |
| Setup/config CLI tests | `pnpm --filter jinn-cli exec vitest run src/cli/__tests__/setup.test.ts src/cli/__tests__/config-seed.test.ts` | passed on 2026-06-25 | local stewardship run | Covers setup/config seed behavior after aligning the setup Node warning. | Focused subset only. |
| Giles repo standard | `giles repo-check /home/ericl/Work/vscode/public_share/jinn --format pretty` | passed on 2026-06-25 with `finding_count: 0` | local stewardship run | Governance standard artifacts are valid. | Compliance-todo advisories are separate from repo-check. |
| CI typecheck | `.github/workflows/ci.yml` typecheck job | configured | `.github/workflows/ci.yml` | Installs with pnpm and runs `pnpm typecheck`. | CI run result not checked in this session. |
| CI unit tests | `.github/workflows/ci.yml` unit-tests job | configured | `.github/workflows/ci.yml` | Runs `pnpm build` then `pnpm test`. | CI run result not checked in this session. |
| CI build | `.github/workflows/ci.yml` build job | configured | `.github/workflows/ci.yml` | Runs production build after typecheck. | `pnpm build` not run in this session. |
| E2E tests | `pnpm test:e2e` / `playwright test` | not run in this session | `package.json`, `playwright.config.ts`, `e2e/*.spec.ts` | Browser-level smoke/scroll coverage. | Needs explicit browser runtime and was not part of this docs pass. |
| Gateway files façade seam | `packages/jinn/src/gateway/__tests__/files-facade-seam.test.ts` | included in `pnpm test` pass | test file + local run | Guards split `files.ts` public route behavior. | Focused to representative route flow. |
| Orchestration router façade | `packages/jinn/src/gateway/__tests__/api-orchestration-routing.test.ts` | included in `pnpm test` pass | test file + local run | Guards `/api/orchestration/*` dispatch through `handleApiRequest()`. | Does not replace end-to-end live daemon tests. |
