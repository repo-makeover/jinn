# Fissure Static Triage Report

- Triage: `TRIAGE-20260624-130507`
- Repo: `/home/ericl/vscode_github_public/jinn`
- Generated: `2026-06-24T13:05:07.026228-04:00`
- Findings: 10
- Static triggers considered: 1418
- Generated-path triggers suppressed: 79

This report is static triage over Fissure artifacts. Findings are candidates until validated by target-repo tests, review, or runtime probes.

## Findings

### FTRIAGE-001 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 25

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

### FTRIAGE-002 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 6

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
- `packages/jinn/src/gateway/files.ts:96` destructive — logger.warn(`Failed to remove old upload bucket ${entry.name}: ${err instanceof Error ? err.message : String(err)}`);
  - `94:       removed++;`
  - `95:     } catch (err) {`
  - `96:       logger.warn(`Failed to remove old upload bucket ${entry.name}: ${err instanceof Error ? err.message : String(err)}`);`
  - `97:     }`
  - `98:   }`
- `packages/jinn/src/gateway/files.ts:782` destructive — // Cross-device fallback: copy then remove.
  - `780:       fs.renameSync(current, dest);`
  - `781:     } catch (err) {`
  - `782:       // Cross-device fallback: copy then remove.`
  - `783:       if ((err as NodeJS.ErrnoException).code === "EXDEV") {`
  - `784:         fs.copyFileSync(current, dest);`

### FTRIAGE-003 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 5

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

- `packages/web/src/routes/talk/use-talk.ts:325` destructive — // Drop the under-orb whisper the instant the turn stops thinking — speaking,
  - `323:   }, [removePendingUser])`
  - `324: `
  - `325:   // Drop the under-orb whisper the instant the turn stops thinking — speaking,`
  - `326:   // idle, or listening should never carry a stale "routing…" hint.`
  - `327:   useEffect(() => {`
- `packages/web/src/routes/talk/use-talk.ts:639` destructive — dispatchGraph({ type: "remove", id: ev.node.id })
  - `637:           threadIdsRef.current.add(ev.node.id)`
  - `638:           if (ev.change === "removed" || ev.change === "detached")`
  - `639:             dispatchGraph({ type: "remove", id: ev.node.id })`
  - `640:           else dispatchGraph({ type: "upsert", node: ev.node })`
  - `641:           // The dock renders depth-1 nodes straight from the graph — no second`
- `packages/web/src/routes/talk/use-talk.ts:778` destructive — // Drop a persisted target selection that no longer maps to a live node.
  - `776:       // so chips already added live (or by a prior reconnect) are no-ops.`
  - `777:       for (const chip of snapshotDelegationChips(snapNodes)) addSystem(chip)`
  - `778:       // Drop a persisted target selection that no longer maps to a live node.`
  - `779:       setTargetThreadId((cur) => {`
  - `780:         if (!cur) return cur`

### FTRIAGE-004 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 4

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

- `packages/jinn/src/cli/nuke.ts:108` destructive — console.log(`  This will permanently delete:`);
  - `106:         console.error(`${RED}Error:${RESET} Gateway process ${pid} is still running after 10s. Aborting — nothing was deleted. Stop it manually, then retry.`);`
  - `107:         process.exit(1);`
  - `108:       }`
  - `109:       console.log(`  Stopped.`);`
  - `110:     }`
- `packages/jinn/src/cli/nuke.ts:120` destructive — // Remove from registry
  - `118:   console.log(`      ${DIM}(config, sessions, skills, org, logs — everything)${RESET}\n`);`
  - `119: `
  - `120:   const confirmation = await ask(`Type "${BOLD}${name}${RESET}" to confirm: `);`
  - `121: `
  - `122:   if (confirmation !== name) {`
- `packages/jinn/src/cli/nuke.ts:124` destructive — // Delete home directory
  - `122:   if (confirmation !== name) {`
  - `123:     console.log("\nAborted. Nothing was deleted.");`
  - `124:     return;`
  - `125:   }`
  - `126: `

### FTRIAGE-005 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 4

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

- `packages/jinn/src/cli/remove.ts:12` destructive — console.error(`${RED}Error:${RESET} Cannot remove the default "jinn" instance.`);
  - `10: export async function runRemove(name: string, opts: { force?: boolean }): Promise<void> {`
  - `11:   if (name === "jinn") {`
  - `12:     console.error(`${RED}Error:${RESET} Cannot remove the default "jinn" instance.`);`
  - `13:     process.exit(1);`
  - `14:   }`
- `packages/jinn/src/cli/remove.ts:39` destructive — // Remove from registry
  - `37:   if (fs.existsSync(pidFile)) {`
  - `38:     try {`
  - `39:       const pid = parseInt(fs.readFileSync(pidFile, "utf-8").trim(), 10);`
  - `40:       process.kill(pid, 0);`
  - `41:       console.error(`${RED}Error:${RESET} Instance "${name}" is still running. Stop it first with: jinn -i ${name} stop`);`
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
- Trigger count: 4

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

- `packages/jinn/src/gateway/lifecycle.ts:263` destructive — // Only remove the PID file if it still refers to the process we stopped —
  - `261:   }`
  - `262: `
  - `263:   // Only remove the PID file if it still refers to the process we stopped —`
  - `264:   // a fresh daemon may have overwritten it already.`
  - `265:   try {`
- `packages/jinn/src/gateway/lifecycle.ts:344` destructive — socket.destroy();
  - `342:       const socket = net.createConnection({ port, host });`
  - `343:       socket.once("connect", () => {`
  - `344:         socket.destroy();`
  - `345:         resolve(true);`
  - `346:       });`
- `packages/jinn/src/gateway/lifecycle.ts:348` destructive — socket.destroy();
  - `346:       });`
  - `347:       socket.once("error", () => {`
  - `348:         socket.destroy();`
  - `349:         resolve(false);`
  - `350:       });`

### FTRIAGE-007 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 3

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

- `packages/jinn/src/gateway/status-reconciler.ts:60` destructive — deps.pendingStuck?.delete(session.id); // fresh heartbeat — recovered, clear any mark
  - `58:     const staleFor = now - last;`
  - `59:     if (staleFor < staleMs) {`
  - `60:       deps.pendingStuck?.delete(session.id); // fresh heartbeat — recovered, clear any mark`
  - `61:       continue; // heartbeat is live — a turn is in flight`
  - `62:     }`
- `packages/jinn/src/gateway/status-reconciler.ts:68` destructive — deps.pendingStuck?.delete(session.id); // live turn — clear any mark
  - `66:     const turnRunning = sessionHasLiveTurn(session, deps.engines);`
  - `67:     if (turnRunning) {`
  - `68:       deps.pendingStuck?.delete(session.id); // live turn — clear any mark`
  - `69:       continue;`
  - `70:     }`
- `packages/jinn/src/gateway/status-reconciler.ts:77` destructive — pending?.delete(session.id);
  - `75:       continue; // confirm on the next sweep — could be a turn-boundary race`
  - `76:     }`
  - `77:     pending?.delete(session.id);`
  - `78:     // Don't erase the evidence. A session stuck at running with no live turn did`
  - `79:     // NOT complete cleanly — it stalled. Record an actionable error (instead of`

### FTRIAGE-008 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 3

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
- `packages/jinn/src/orchestration/worktree.ts:129` destructive — runGit(["worktree", "remove", "--force", handle.path], handle.gitRoot);
  - `127:   makeWritable(handle.path);`
  - `128:   try {`
  - `129:     runGit(["worktree", "remove", "--force", handle.path], handle.gitRoot);`
  - `130:   } catch {`
  - `131:     fs.rmSync(handle.path, { recursive: true, force: true });`
- `packages/jinn/src/orchestration/worktree.ts:131` destructive — fs.rmSync(handle.path, { recursive: true, force: true });
  - `129:     runGit(["worktree", "remove", "--force", handle.path], handle.gitRoot);`
  - `130:   } catch {`
  - `131:     fs.rmSync(handle.path, { recursive: true, force: true });`
  - `132:   }`
  - `133:   try {`

### FTRIAGE-009 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 3

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

- `packages/web/src/components/kanban/ticket-card.tsx:69` destructive — {/* Delete button (visible on hover) */}
  - `67:       }}`
  - `68:     >`
  - `69:       {/* Delete button (visible on hover) */}`
  - `70:       {isHovered && onDelete && (`
  - `71:         <button`
- `packages/web/src/components/kanban/ticket-card.tsx:76` destructive — aria-label="Delete ticket"
  - `74:             onDelete()`
  - `75:           }}`
  - `76:           aria-label="Delete ticket"`
  - `77:           title="Delete ticket"`
  - `78:           className="absolute top-1.5 right-1.5 w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--system-red)] border-none cursor-pointer p-0 z-[1]"`
- `packages/web/src/components/kanban/ticket-card.tsx:77` destructive — title="Delete ticket"
  - `75:           }}`
  - `76:           aria-label="Delete ticket"`
  - `77:           title="Delete ticket"`
  - `78:           className="absolute top-1.5 right-1.5 w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center text-[var(--system-red)] border-none cursor-pointer p-0 z-[1]"`
  - `79:           style={{`

### FTRIAGE-010 — Destructive operation needs explicit path guard

- Status: `candidate`
- Severity: `high`
- Confidence: `medium`
- Trigger count: 3

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

- `packages/web/src/hooks/use-chat-tabs.ts:177` destructive — /** Move a tab from one position to another (for drag & drop reordering). */
  - `175:   }, [tabs.length])`
  - `176: `
  - `177:   /** Move a tab from one position to another (for drag & drop reordering). */`
  - `178:   const moveTab = useCallback((from: number, to: number) => {`
  - `179:     setState((current) => {`
- `packages/web/src/hooks/use-chat-tabs.ts:251` destructive — * - Drop any tab whose sessionId no longer exists.
  - `249:   /**`
  - `250:    * Reconcile persisted tabs against an authoritative session list:`
  - `251:    * - Drop any tab whose sessionId no longer exists.`
  - `252:    * - Normalize stale `status: 'running'` to match the server-side status`
  - `253:    *   when the server reports the session as `idle` or `error` (cleans up`
- `packages/web/src/hooks/use-chat-tabs.ts:273` destructive — if (!session) continue // orphan — drop
  - `271:           }`
  - `272:           const session = byId.get(tab.sessionId)`
  - `273:           if (!session) continue // orphan — drop`
  - `274:           let updated: SessionTab = tab`
  - `275:           // Normalize stale 'running' if server says otherwise`

