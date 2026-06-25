# Fissure Static Triage Report

- Triage: `TRIAGE-20260624-130650`
- Repo: `/home/ericl/vscode_github_public/jinn`
- Generated: `2026-06-24T13:06:50.430809-04:00`
- Findings: 10
- Static triggers considered: 952
- Generated-path triggers suppressed: 79

This report is static triage over Fissure artifacts. Findings are candidates until validated by target-repo tests, review, or runtime probes.

## Findings

### FTRIAGE-001 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 2

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/gateway/files.ts:93` destructive — fs.rmSync(path.join(UPLOADS_DIR, entry.name), { recursive: true, force: true });
  - `91:     if (Number.isNaN(ts) || ts >= cutoff) continue;`
  - `92:     try {`
  - `93:       fs.rmSync(path.join(UPLOADS_DIR, entry.name), { recursive: true, force: true });`
  - `94:       removed++;`
  - `95:     } catch (err) {`
- `packages/jinn/src/gateway/files.ts:785` destructive — fs.rmSync(current, { force: true });
  - `783:       if ((err as NodeJS.ErrnoException).code === "EXDEV") {`
  - `784:         fs.copyFileSync(current, dest);`
  - `785:         fs.rmSync(current, { force: true });`
  - `786:       } else {`
  - `787:         logger.warn(`Failed to re-home attachment ${id}: ${err instanceof Error ? err.message : String(err)}`);`

### FTRIAGE-002 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 2

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/orchestration/worktree.ts:184` destructive — fs.rmSync(handle.path, { recursive: true, force: true });
  - `182: `
  - `183: export function cleanupReviewBundle(handle: ReviewBundleHandle): void {`
  - `184:   fs.rmSync(handle.path, { recursive: true, force: true });`
  - `185: }`
  - `186: `
- `packages/jinn/src/orchestration/worktree.ts:131` destructive — fs.rmSync(handle.path, { recursive: true, force: true });
  - `129:     runGit(["worktree", "remove", "--force", handle.path], handle.gitRoot);`
  - `130:   } catch {`
  - `131:     fs.rmSync(handle.path, { recursive: true, force: true });`
  - `132:   }`
  - `133:   try {`

### FTRIAGE-003 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/migrate.ts:234` destructive — fs.rmSync(claudeMigrateSettings.tempDir, { recursive: true, force: true });
  - `232:   } finally {`
  - `233:     if (claudeMigrateSettings) {`
  - `234:       fs.rmSync(claudeMigrateSettings.tempDir, { recursive: true, force: true });`
  - `235:     }`
  - `236:   }`

### FTRIAGE-004 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/nuke.ts:126` destructive — fs.rmSync(instance.home, { recursive: true, force: true });
  - `124:     return;`
  - `125:   }`
  - `126: `
  - `127:   // Remove from registry`
  - `128:   allInstances.splice(index, 1);`

### FTRIAGE-005 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/remove.ts:44` destructive — fs.rmSync(instance.home, { recursive: true, force: true });
  - `42:       process.exit(1);`
  - `43:     } catch {`
  - `44:       // Process not alive, continue`
  - `45:     }`
  - `46:   }`

### FTRIAGE-006 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/setup.ts:343` destructive — fs.rmSync(JINN_HOME, { recursive: true, force: true });
  - `341: `
  - `342:   if (opts?.force && fs.existsSync(JINN_HOME)) {`
  - `343:     const safeHome = assertSafeDestructiveHome(JINN_HOME);`
  - `344:     console.log(`  ${YELLOW}[force]${RESET} Removing ${safeHome}...`);`
  - `345:     fs.rmSync(safeHome, { recursive: true, force: true });`

### FTRIAGE-007 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 1

Observed behavior:

A recursive or forceful delete/write candidate appears on a static data path.

Expected behavior:

Destructive operations should validate ownership, containment, and symlink behavior before mutating files.

Remediation:

Add a shared path-safety guard and call it before registry mutation or file deletion.

Validation:

- unit tests for rejected root/home/cwd/symlink targets
- targeted CLI test for the destructive command

Evidence:

- `packages/jinn/src/cli/skills.ts:214` destructive — fs.rmSync(skillDir, { recursive: true, force: true });
  - `212:   }`
  - `213: `
  - `214:   fs.rmSync(skillDir, { recursive: true, force: true });`
  - `215:   removeFromManifest(name);`
  - `216:   console.log(`${GREEN}Skill "${name}" removed.${RESET}`);`

### FTRIAGE-008 — Concurrent cleanup path needs partial-failure handling

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 17

Observed behavior:

A concurrent operation candidate may stop on the first failure or leave stale state.

Expected behavior:

Cleanup should attempt every branch, aggregate failures, and reset local state deterministically.

Remediation:

Use all-settled aggregation and make cleanup idempotent.

Validation:

- unit test one failing close among several resources

Evidence:

- `packages/web/src/components/chat/model-selector-row.tsx:145` race_condition — const { data: registry, isLoading } = useModelRegistry()
  - `143:  */`
  - `144: export function ModelSelectorRow({ mode, value, onChange, pendingNote, errorNote, disabled, contextTokens, onNewChat }: ModelSelectorRowProps) {`
  - `145:   const { data: registry, isLoading } = useModelRegistry()`
  - `146:   const queryClient = useQueryClient()`
  - `147: `
- `packages/web/src/components/chat/model-selector-row.tsx:167` race_condition — const engines = engineList(registry)
  - `165:   // uninstalled engine on a NEW chat — then fall back to the first installed one.`
  - `166:   // Existing chats stay pinned to their (possibly hidden) engine.`
  - `167:   const engines = engineList(registry)`
  - `168:   const preferred = value.engine ?? registry?.default`
  - `169:   const engine =`
- `packages/web/src/components/chat/model-selector-row.tsx:168` race_condition — const preferred = value.engine ?? registry?.default
  - `166:   // Existing chats stay pinned to their (possibly hidden) engine.`
  - `167:   const engines = engineList(registry)`
  - `168:   const preferred = value.engine ?? registry?.default`
  - `169:   const engine =`
  - `170:     mode === 'new' && engines.length > 0 && !engines.some((e) => e.name === preferred)`

### FTRIAGE-009 — Data flow requires runtime validation

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 16

Observed behavior:

Static scan could not prove the final data sink.

Expected behavior:

Important ingress paths should have observable sinks or runtime probes.

Remediation:

Add a targeted runtime/test probe or simplify the call path for static traceability.

Validation:

- targeted integration test
- future Fissure runtime probe

Evidence:

- `packages/web/src/routes/settings/page.tsx:880` side_channel — <FieldRow label="App Token">
  - `878:                   Slack`
  - `879:                 </div>`
  - `880:                 <FieldRow label="App Token">`
  - `881:                   <SettingsInput`
  - `882:                     type="password"`
- `packages/web/src/routes/settings/page.tsx:882` side_channel — type="password"
  - `880:                 <FieldRow label="App Token">`
  - `881:                   <SettingsInput`
  - `882:                     type="password"`
  - `883:                     value={config.connectors?.slack?.appToken ?? ""}`
  - `884:                     onChange={(v) =>`
- `packages/web/src/routes/settings/page.tsx:890` side_channel — <FieldRow label="Bot Token">
  - `888:                   />`
  - `889:                 </FieldRow>`
  - `890:                 <FieldRow label="Bot Token">`
  - `891:                   <SettingsInput`
  - `892:                     type="password"`

### FTRIAGE-010 — Destructive data mutation needs ownership guard

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 15

Observed behavior:

A static data path reaches a destructive data mutation.

Expected behavior:

Delete/update mutations should have scoped predicates, ownership checks, and regression tests.

Remediation:

Confirm the mutation is scoped to intended rows and add a test for over-broad deletion.

Validation:

- unit or integration test for mutation scope
- review persistence ownership rules

Evidence:

- `packages/jinn/src/sessions/registry.ts:1394` destructive — return db.prepare('DELETE FROM messages WHERE partial = 1').run().changes;
  - `1392: export function clearAllPartialMessages(): number {`
  - `1393:   const db = initDb();`
  - `1394:   return db.prepare('DELETE FROM messages WHERE partial = 1').run().changes;`
  - `1395: }`
  - `1396: `
- `packages/jinn/src/sessions/registry.ts:1682` destructive — initDb().prepare("DELETE FROM approvals").run();
  - `1680: `
  - `1681: export function clearApprovalRecordsForTest(): void {`
  - `1682:   initDb().prepare("DELETE FROM approvals").run();`
  - `1683: }`
  - `1684: `
- `packages/jinn/src/sessions/registry.ts:1289` destructive — const result = db.prepare('DELETE FROM archives WHERE id = ?').run(id);
  - `1287: export function deleteArchive(id: string): boolean {`
  - `1288:   const db = initDb();`
  - `1289:   const result = db.prepare('DELETE FROM archives WHERE id = ?').run(id);`
  - `1290:   return result.changes > 0;`
  - `1291: }`

