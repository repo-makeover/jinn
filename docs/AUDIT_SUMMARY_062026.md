# June 2026 Audit Summary

> Raw audit detail files under `docs/audits/` are intentionally ignored by git and
> may not be available on other machines. This summary is the durable synced
> record.

## Executive Summary

June 2026 audits concentrated on orchestration reliability, post-modularization
regressions, architecture seams, dependency criticality, kanban behavior,
dead-code cleanup, and public repository hygiene. The highest-value outcomes
were concrete repair plans and follow-up tests rather than publishing every raw
audit artifact.

## Major Finding Families

- Orchestration routing needed a single backend router owner for `/api/orchestration/*`.
- File/gateway modularization required façade/seam tests to preserve public paths.
- Queue pause, recovery, dual-lane, hold, and lease-stop behavior needed explicit contract coverage.
- Public staging required local generated artifacts to be ignored and removed from the tracked index.
- Large source files needed modularization by responsibility rather than line buckets.

## Resolved / Addressed

- Backend orchestration routing was centralized in `handleApiRequest()`.
- Web orchestration mutator request shapes were covered by table-driven contract tests.
- `files.ts`, `server.ts`, `page.tsx`, `chat-messages.tsx`, chat route/input files, `types.ts`, and `registry.ts` received modularization work.
- A dedicated gateway files façade seam test was added.
- Giles governance validation now passes `repo-check`.

### FTRIAGE-001–008 destructive path guards (2026-06-26)

- A shared guard `assertSafeDestructivePath` / `safeRmSync` was added in
  `packages/jinn/src/shared/safe-delete.ts` (rejects filesystem root, the user
  home, cwd, symlinked targets, and any out-of-containment path) with unit
  tests. `cli/instances.ts` `assertSafeDestructiveHome` now delegates to it, so
  the already-covered home deletes (`cli/nuke.ts`, `cli/remove.ts`,
  `cli/setup.ts`) and `assertSafeManagedInstanceHome` share one implementation.
- The guard was wired into the genuinely-unguarded recursive deletes:
  `cli/skills.ts`, `gateway/api/routes/skills.ts` (DELETE `/api/skills/:name`),
  `gateway/files.ts` (DELETE `/api/files/:id`), `gateway/files/storage.ts`,
  `gateway/files/attachments.ts`, `orchestration/worktree.ts`
  (`cleanupReviewBundle`), `cli/migrate.ts` (×2), `connectors/telegram/index.ts`,
  `talk/kokoro.ts`, and `test-utils/jinn-home.ts`.
- Root-cause hardening: `POST /api/artifacts/register` now rejects ids
  containing a path separator or `.`/`..` (the id feeds `FILES_DIR/<id>`), and
  `rehomeAttachmentsToSession` sanitizes the stored filename before building its
  source path. Together with the `DELETE /api/files/:id` guard this closes a
  network-reachable path where a poisoned artifact id (`..`) could recursively
  delete the entire Jinn home. Regression tests were added.
- The original triage line numbers were stale (post-modularization). The
  single-file `force` deletes in `orchestration/store-recovery.ts` (already
  containment-guarded via `isSameOrInside`) and `sessions/manager.ts` (a managed
  temp file) were reviewed and left as covered / out of recursive-delete scope.

### Product findings (2026-06-26)

- `packages/web/vite.config.ts` now shares one proxy config across the dev
  server and `vite preview` (preview previously 404'd on `/api` and `/ws`) and
  pins the dev server to port 5173 with `strictPort`, matching the documented
  URL and failing fast instead of silently moving ports.
- `scripts/run-jinn-cli.mjs` (`pnpm jinn`) now rebuilds when any source file is
  newer than the compiled entry, not only when the entry is absent, so source
  edits are no longer silently run against a stale `dist` binary.
- The Fissure `no_unhandled_exception` deterministic failure
  (`FRUN-20260625-171340`) is most likely a downstream symptom of the preview
  proxy / dev-port gaps above. Re-running Fissure is required to confirm and is
  waived here when the tool is unavailable.

## Deferred / Advisory

- Historical release-note backfill remains advisory because source-grounded release summaries for every tag would be public noise without reliable evidence.
- Giles scanner findings from ignored generated bundles are not documented as product UI.
- The repo type/profile mismatch for monorepo top-level directories is a Giles/canon-profile advisory, not a source-layout change to apply here.

## Source Audits

- `docs/audits/062026/2026-06-25-orchestration-*.md`
- `docs/audits/062026/2026-06-25-post-modularization-regression-audit*.md`
- `docs/audits/2026-06-23-*.md`
- `docs/audits/2026-06-24-*.md`
- `docs/audits/2026-06-25-*.md`
