# Fissure Static Triage Report

- Triage: `TRIAGE-20260625-171658`
- Repo: `/home/ericl/Work/vscode/public_share/jinn`
- Generated: `2026-06-25T17:16:58.687552-04:00`
- Findings: 12
- Static triggers considered: 998
- Generated-path triggers suppressed: 75

This report is static triage over Fissure artifacts. Findings are candidates until validated by target-repo tests, review, or runtime probes.

## Findings

### FTRIAGE-001 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `high`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/cli/nuke.ts` near line 133.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/cli/nuke.ts` near line 133 and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/nuke.ts:133` destructive - fs.rmSync(safeHome, { recursive: true, force: true });
  - `131:   // Delete home directory`
  - `132:   if (fs.existsSync(safeHome)) {`
  - `133:     fs.rmSync(safeHome, { recursive: true, force: true });`
  - `134:   }`
  - `135: `

Notes:

- co-located static signals in same file: concurrency_cleanup, environment_boundary, sequential_ordering, unresolved_data_flow
- no nearby guard-like source context detected in the captured snippet

### FTRIAGE-002 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `high`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/cli/skills.ts` near line 214.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/cli/skills.ts` near line 214 and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/skills.ts:214` destructive - fs.rmSync(skillDir, { recursive: true, force: true });
  - `212:   }`
  - `213: `
  - `214:   fs.rmSync(skillDir, { recursive: true, force: true });`
  - `215:   removeFromManifest(name);`
  - `216:   console.log(`${GREEN}Skill "${name}" removed.${RESET}`);`

Notes:

- co-located static signals in same file: concurrency_cleanup, raw_error_or_log_disclosure, unresolved_data_flow
- no nearby guard-like source context detected in the captured snippet

### FTRIAGE-003 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `high`
- Trigger count: 3

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/test-utils/jinn-home.ts` near line 63.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/test-utils/jinn-home.ts` near line 63 and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/test-utils/jinn-home.ts:63` destructive - fs.rmSync(home, { recursive: true, force: true });
  - `61:       setJinnHomeForTest(previousHome);`
  - `62:     }`
  - `63:     fs.rmSync(home, { recursive: true, force: true });`
  - `64:   });`
  - `65: `
- `packages/jinn/src/test-utils/jinn-home.ts:34` destructive - fs.rmSync(tmpHome, { recursive: true, force: true });
  - `32:       }`
  - `33:       vi.resetModules();`
  - `34:       fs.rmSync(tmpHome, { recursive: true, force: true });`
  - `35:       tmpHome = "";`
  - `36:     },`
- `packages/jinn/src/test-utils/jinn-home.ts:63` destructive - fs.rmSync(home, { recursive: true, force: true });
  - `61:       setJinnHomeForTest(previousHome);`
  - `62:     }`
  - `63:     fs.rmSync(home, { recursive: true, force: true });`
  - `64:   });`
  - `65: `

Notes:

- co-located static signals in same file: environment_boundary, unresolved_data_flow
- no nearby guard-like source context detected in the captured snippet

### FTRIAGE-004 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `high`
- Trigger count: 2

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/gateway/files.ts` near line 90.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/gateway/files.ts` near line 90 and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/gateway/files.ts:90` destructive - fs.rmSync(path.join(UPLOADS_DIR, entry.name), { recursive: true, force: true });
  - `88:     if (Number.isNaN(ts) || ts >= cutoff) continue;`
  - `89:     try {`
  - `90:       fs.rmSync(path.join(UPLOADS_DIR, entry.name), { recursive: true, force: true });`
  - `91:       removed++;`
  - `92:     } catch (err) {`
- `packages/jinn/src/gateway/files.ts:850` destructive - fs.rmSync(current, { force: true });
  - `848:       if ((err as NodeJS.ErrnoException).code === "EXDEV") {`
  - `849:         fs.copyFileSync(current, dest);`
  - `850:         fs.rmSync(current, { force: true });`
  - `851:       } else {`
  - `852:         logger.warn(`Failed to re-home attachment ${id}: ${err instanceof Error ? err.message : String(err)}`);`

Notes:

- co-located static signals in same file: side_channel_disclosure, unresolved_data_flow
- no nearby guard-like source context detected in the captured snippet

### FTRIAGE-005 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/cli/setup.ts` near line 360, inside or near `safeHome`.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/cli/setup.ts` near line 360 (`safeHome`) and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/setup.ts:360` destructive - fs.rmSync(safeHome, { recursive: true, force: true });
  - `358:     const safeHome = assertSafeDestructiveHome(JINN_HOME);`
  - `359:     console.log(`  ${YELLOW}[force]${RESET} Removing ${safeHome}...`);`
  - `360:     fs.rmSync(safeHome, { recursive: true, force: true });`
  - `361:     console.log(`  ${GREEN}[ok]${RESET} Removed ${safeHome}\n`);`
  - `362:   }`

Notes:

- co-located static signals in same file: environment_boundary, unresolved_data_flow
- nearby guard-like source context detected; verify the guard covers containment, symlinks, and ownership

### FTRIAGE-006 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `high`
- Trigger count: 2

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/orchestration/worktree.ts` near line 219, inside or near `cleanupReviewBundle`.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/orchestration/worktree.ts` near line 219 (`cleanupReviewBundle`) and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/orchestration/worktree.ts:219` destructive - fs.rmSync(handle.path, { recursive: true, force: true });
  - `217: `
  - `218: export function cleanupReviewBundle(handle: ReviewBundleHandle): void {`
  - `219:   fs.rmSync(handle.path, { recursive: true, force: true });`
  - `220: }`
  - `221: `
- `packages/jinn/src/orchestration/worktree.ts:166` destructive - fs.rmSync(handle.path, { recursive: true, force: true });
  - `164:     runGit(["worktree", "remove", "--force", handle.path], handle.gitRoot);`
  - `165:   } catch {`
  - `166:     fs.rmSync(handle.path, { recursive: true, force: true });`
  - `167:   }`
  - `168:   try {`

Notes:

- co-located static signals in same file: unresolved_data_flow
- no nearby guard-like source context detected in the captured snippet

### FTRIAGE-007 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `high`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/cli/migrate.ts` near line 234.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/cli/migrate.ts` near line 234 and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/migrate.ts:234` destructive - fs.rmSync(claudeMigrateSettings.tempDir, { recursive: true, force: true });
  - `232:   } finally {`
  - `233:     if (claudeMigrateSettings) {`
  - `234:       fs.rmSync(claudeMigrateSettings.tempDir, { recursive: true, force: true });`
  - `235:     }`
  - `236:   }`

Notes:

- co-located static signals in same file: sequential_ordering
- no nearby guard-like source context detected in the captured snippet

### FTRIAGE-008 - Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `high`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path. Primary evidence is in `packages/jinn/src/cli/remove.ts` near line 54.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion. Start at `packages/jinn/src/cli/remove.ts` near line 54 and add the target repo's regression test around that entry point.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/remove.ts:54` destructive - fs.rmSync(safeHome, { recursive: true, force: true });
  - `52:   if (opts.force) {`
  - `53:     if (safeHome && fs.existsSync(safeHome)) {`
  - `54:       fs.rmSync(safeHome, { recursive: true, force: true });`
  - `55:       console.log(`${GREEN}Instance "${name}" removed.${RESET} Home directory ${DIM}${safeHome}${RESET} deleted.`);`
  - `56:     } else {`

Notes:

- co-located static signals in same file: concurrency_cleanup
- no nearby guard-like source context detected in the captured snippet

### FTRIAGE-009 - Subprocess launch needs supervision boundary

- Status: `candidate`
- Severity: `medium`
- Confidence: `high`
- Trigger count: 27

Observed behavior:

A subprocess launch candidate may be detached, unsupervised, or package-manager backed. Primary evidence is in `packages/jinn/src/sessions/registry.ts` near line 406.

Expected behavior:

Subprocesses should have timeout, error reporting, and sanitized environment behavior.

Remediation:

Route through a bounded spawn helper with timeout and visible failure reporting. Start at `packages/jinn/src/sessions/registry.ts` near line 406 and add the target repo's regression test around that entry point.

Validation:

- unit test timeout/failure path
- manual CLI smoke test

Evidence:

- `packages/jinn/src/sessions/registry.ts:406` shell_exec - database.exec(`
  - `404:   console.error(`[fts] Boot drain failed (${msg}). Disabling FTS for this process — next boot will retry.`);`
  - `405:   try {`
  - `406:     database.exec(``
  - `407:       DROP TRIGGER IF EXISTS messages_fts_ai;`
  - `408:       DROP TRIGGER IF EXISTS messages_fts_ad;`
- `packages/jinn/src/sessions/registry.ts:212` shell_exec - db.exec(CREATE_TABLE);
  - `210:   db = new Database(SESSIONS_DB, { timeout: 5000 });`
  - `211:   db.pragma('journal_mode = WAL');`
  - `212:   db.exec(CREATE_TABLE);`
  - `213:   db.exec(CREATE_MESSAGES_TABLE);`
  - `214:   db.exec(CREATE_MESSAGES_INDEX);`
- `packages/jinn/src/sessions/registry.ts:213` shell_exec - db.exec(CREATE_MESSAGES_TABLE);
  - `211:   db.pragma('journal_mode = WAL');`
  - `212:   db.exec(CREATE_TABLE);`
  - `213:   db.exec(CREATE_MESSAGES_TABLE);`
  - `214:   db.exec(CREATE_MESSAGES_INDEX);`
  - `215:   db.exec(CREATE_META_TABLE);`

Notes:

- co-located static signals in same file: concurrency_cleanup, destructive_data_mutation, sequential_ordering, unresolved_data_flow

### FTRIAGE-010 - Data flow requires runtime validation

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 16

Observed behavior:

Static scan could not prove the final data sink. Primary evidence is in `packages/web/src/routes/settings/page.tsx` near line 1262.

Expected behavior:

Important ingress paths should have observable sinks or runtime probes.

Remediation:

Add a targeted runtime/test probe or simplify the call path for static traceability. Start at `packages/web/src/routes/settings/page.tsx` near line 1262 and add the target repo's regression test around that entry point.

Validation:

- targeted integration test
- future Fissure runtime probe

Evidence:

- `packages/web/src/routes/settings/page.tsx:1262` side_channel - <FieldRow label="App Token">
  - `1260:                   Slack`
  - `1261:                 </div>`
  - `1262:                 <FieldRow label="App Token">`
  - `1263:                   <SettingsInput`
  - `1264:                     type="password"`
- `packages/web/src/routes/settings/page.tsx:1264` side_channel - type="password"
  - `1262:                 <FieldRow label="App Token">`
  - `1263:                   <SettingsInput`
  - `1264:                     type="password"`
  - `1265:                     value={config.connectors?.slack?.appToken ?? ""}`
  - `1266:                     onChange={(v) =>`
- `packages/web/src/routes/settings/page.tsx:1272` side_channel - <FieldRow label="Bot Token">
  - `1270:                   />`
  - `1271:                 </FieldRow>`
  - `1272:                 <FieldRow label="Bot Token">`
  - `1273:                   <SettingsInput`
  - `1274:                     type="password"`

Notes:

- co-located static signals in same file: concurrency_cleanup, redundant_or_parallel_path, sequential_ordering, unresolved_data_flow

### FTRIAGE-011 - Destructive data mutation needs ownership guard

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 15

Observed behavior:

A static data path reaches a destructive data mutation. Primary evidence is in `packages/jinn/src/sessions/registry.ts` near line 1519, inside or near `clearAllPartialMessages`.

Expected behavior:

Delete/update mutations should have scoped predicates, ownership checks, and regression tests.

Remediation:

Confirm the mutation is scoped to intended rows and add a test for over-broad deletion. Start at `packages/jinn/src/sessions/registry.ts` near line 1519 (`clearAllPartialMessages`) and add the target repo's regression test around that entry point.

Validation:

- unit or integration test for mutation scope
- review persistence ownership rules

Evidence:

- `packages/jinn/src/sessions/registry.ts:1519` destructive - return db.prepare('DELETE FROM messages WHERE partial = 1').run().changes;
  - `1517: export function clearAllPartialMessages(): number {`
  - `1518:   const db = initDb();`
  - `1519:   return db.prepare('DELETE FROM messages WHERE partial = 1').run().changes;`
  - `1520: }`
  - `1521: `
- `packages/jinn/src/sessions/registry.ts:1807` destructive - initDb().prepare("DELETE FROM approvals").run();
  - `1805: `
  - `1806: export function clearApprovalRecordsForTest(): void {`
  - `1807:   initDb().prepare("DELETE FROM approvals").run();`
  - `1808: }`
  - `1809: `
- `packages/jinn/src/sessions/registry.ts:1295` destructive - const result = db.prepare('DELETE FROM archives WHERE id = ?').run(id);
  - `1293: export function deleteArchive(id: string): boolean {`
  - `1294:   const db = initDb();`
  - `1295:   const result = db.prepare('DELETE FROM archives WHERE id = ?').run(id);`
  - `1296:   return result.changes > 0;`
  - `1297: }`

Notes:

- co-located static signals in same file: concurrency_cleanup, sequential_ordering, unresolved_data_flow, unsupervised_subprocess

### FTRIAGE-012 - Environment ingress crosses trust boundary

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 4

Observed behavior:

Environment-derived input appears on an executable or externally visible path. Primary evidence is in `packages/jinn/src/cli/nuke.ts` near line 48, inside or near `i`.

Expected behavior:

Environment values should be validated, redacted where needed, and scoped to intended children.

Remediation:

Validate environment-derived values and avoid logging raw values. Start at `packages/jinn/src/cli/nuke.ts` near line 48 (`i`) and add the target repo's regression test around that entry point.

Validation:

- unit tests for invalid env values
- redaction test for logs/reports

Evidence:

- `packages/jinn/src/cli/nuke.ts:48` side_channel - const homeDisplay = inst.home.replace(process.env.HOME || process.env.USERPROFILE || "", "~");
  - `46:     for (let i = 0; i < instances.length; i++) {`
  - `47:       const inst = instances[i];`
  - `48:       const homeDisplay = inst.home.replace(process.env.HOME || process.env.USERPROFILE || "", "~");`
  - `49:       console.log(`  ${DIM}${i + 1}.${RESET} ${inst.name} ${DIM}(${homeDisplay})${RESET}`);`
  - `50:     }`
- `packages/jinn/src/cli/nuke.ts:85` side_channel - const homeDisplay = instance.home.replace(process.env.HOME || process.env.USERPROFILE || "", "~");
  - `83:     process.exit(1);`
  - `84:   }`
  - `85:   const homeDisplay = instance.home.replace(process.env.HOME || process.env.USERPROFILE || "", "~");`
  - `86: `
  - `87:   // Check if running and stop it`
- `packages/jinn/src/cli/nuke.ts:48` side_channel - const homeDisplay = inst.home.replace(process.env.HOME || process.env.USERPROFILE || "", "~");
  - `46:     for (let i = 0; i < instances.length; i++) {`
  - `47:       const inst = instances[i];`
  - `48:       const homeDisplay = inst.home.replace(process.env.HOME || process.env.USERPROFILE || "", "~");`
  - `49:       console.log(`  ${DIM}${i + 1}.${RESET} ${inst.name} ${DIM}(${homeDisplay})${RESET}`);`
  - `50:     }`

Notes:

- co-located static signals in same file: concurrency_cleanup, destructive_path_guard, sequential_ordering, unresolved_data_flow

