# Fissure Static Triage Report

- Triage: `TRIAGE-20260624-130612`
- Repo: `/home/ericl/vscode_github_public/jinn`
- Generated: `2026-06-24T13:06:12.808495-04:00`
- Findings: 10
- Static triggers considered: 1188
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

### FTRIAGE-008 — Subprocess launch needs supervision boundary

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 26

Observed behavior:

A subprocess launch candidate may be detached, unsupervised, or package-manager backed.

Expected behavior:

Subprocesses should have timeout, error reporting, and sanitized environment behavior.

Remediation:

Route through a bounded spawn helper with timeout and visible failure reporting.

Validation:

- unit test timeout/failure path
- manual CLI smoke test

Evidence:

- `packages/jinn/src/sessions/registry.ts:400` shell_exec — database.exec(`
  - `398:   console.error(`[fts] Boot drain failed (${msg}). Disabling FTS for this process — next boot will retry.`);`
  - `399:   try {`
  - `400:     database.exec(``
  - `401:       DROP TRIGGER IF EXISTS messages_fts_ai;`
  - `402:       DROP TRIGGER IF EXISTS messages_fts_ad;`
- `packages/jinn/src/sessions/registry.ts:209` shell_exec — db.exec(CREATE_TABLE);
  - `207:   db = new Database(SESSIONS_DB, { timeout: 5000 });`
  - `208:   db.pragma('journal_mode = WAL');`
  - `209:   db.exec(CREATE_TABLE);`
  - `210:   db.exec(CREATE_MESSAGES_TABLE);`
  - `211:   db.exec(CREATE_MESSAGES_INDEX);`
- `packages/jinn/src/sessions/registry.ts:210` shell_exec — db.exec(CREATE_MESSAGES_TABLE);
  - `208:   db.pragma('journal_mode = WAL');`
  - `209:   db.exec(CREATE_TABLE);`
  - `210:   db.exec(CREATE_MESSAGES_TABLE);`
  - `211:   db.exec(CREATE_MESSAGES_INDEX);`
  - `212:   db.exec(CREATE_META_TABLE);`

### FTRIAGE-009 — Raw error or log output may disclose local details

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 23

Observed behavior:

A request or process path appears to emit raw exception/environment details.

Expected behavior:

Client-visible errors should use stable categories; detailed errors should stay local.

Remediation:

Return redacted error codes and log detailed exceptions behind operator-visible logging.

Validation:

- unit test redacted response
- manual bad-input smoke test

Evidence:

- `packages/jinn/src/cli/skills.ts:167` side_channel — console.log(`\nInstalling skill: ${pkg}\n`);
  - `165: `
  - `166: export function skillsAdd(pkg: string): void {`
  - `167:   console.log(`\nInstalling skill: ${pkg}\n`);`
  - `168: `
  - `169:   // Snapshot before`
- `packages/jinn/src/cli/skills.ts:192` side_channel — console.log(`\n${GREEN}Skill "${existing.name}" added to ${SKILLS_DIR}${RESET}`);
  - `190:       copySkillToInstance(existing.name, existing.dir);`
  - `191:       upsertManifest(existing.name, pkg);`
  - `192:       console.log(`\n${GREEN}Skill "${existing.name}" added to ${SKILLS_DIR}${RESET}`);`
  - `193:     } else {`
  - `194:       console.log(`\n${YELLOW}Skill installed globally but could not locate the directory.${RESET}`);`
- `packages/jinn/src/cli/skills.ts:194` side_channel — console.log(`\n${YELLOW}Skill installed globally but could not locate the directory.${RESET}`);
  - `192:       console.log(`\n${GREEN}Skill "${existing.name}" added to ${SKILLS_DIR}${RESET}`);`
  - `193:     } else {`
  - `194:       console.log(`\n${YELLOW}Skill installed globally but could not locate the directory.${RESET}`);`
  - `195:     }`
  - `196:     return;`

### FTRIAGE-010 — Environment ingress crosses trust boundary

- Status: `candidate`
- Severity: `medium`
- Confidence: `medium`
- Trigger count: 18

Observed behavior:

Environment-derived input appears on an executable or externally visible path.

Expected behavior:

Environment values should be validated, redacted where needed, and scoped to intended children.

Remediation:

Validate environment-derived values and avoid logging raw values.

Validation:

- unit tests for invalid env values
- redaction test for logs/reports

Evidence:

- `packages/jinn/src/shared/__tests__/resolve-bin.test.ts:33` side_channel — const prev = process.env.PATH;
  - `31: `
  - `32:   it("finds an executable on PATH", () => {`
  - `33:     const prev = process.env.PATH;`
  - `34:     process.env.PATH = `${tmpDir}${path.delimiter}${prev ?? ""}`;`
  - `35:     try {`
- `packages/jinn/src/shared/__tests__/resolve-bin.test.ts:34` side_channel — process.env.PATH = `${tmpDir}${path.delimiter}${prev ?? ""}`;
  - `32:   it("finds an executable on PATH", () => {`
  - `33:     const prev = process.env.PATH;`
  - `34:     process.env.PATH = `${tmpDir}${path.delimiter}${prev ?? ""}`;`
  - `35:     try {`
  - `36:       expect(resolveBin(NAME)).toBe(exePath);`
- `packages/jinn/src/shared/__tests__/resolve-bin.test.ts:43` side_channel — const prev = process.env.PATH;
  - `41: `
  - `42:   it("treats a bare-name override as the name to resolve", () => {`
  - `43:     const prev = process.env.PATH;`
  - `44:     process.env.PATH = `${tmpDir}${path.delimiter}${prev ?? ""}`;`
  - `45:     try {`

