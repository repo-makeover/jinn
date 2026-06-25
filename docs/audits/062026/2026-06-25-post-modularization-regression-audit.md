# Post-Modularization Regression Audit - June 25, 2026

* **Audit Date:** June 25, 2026
* **Status:** Draft (Completed Review)
* **Author:** Antigravity (Antigravity 3.5 Flash)

---

## Executive Summary & Validation Results

This audit was conducted immediately following several modularization passes (approvals, archives, settings connectors, chat sidebar, and files route refactoring). 

Deterministic validation checks were run from the repository root:
* **TypeScript Typecheck (`pnpm typecheck`):** **PASSED** (2/2 packages successfully verified)
* **Monorepo Tests (`pnpm test`):** **PASSED** (1,502 passed, 1 skipped, 188 test files executed successfully in 10.89s)
* **Linting (`pnpm lint`):** **PASSED** (0 warnings/errors across packages)
* **Monorepo Build (`pnpm build`):** **PASSED** (web build and gateway distribution completed successfully)

Despite the clean validation results, static code review revealed one **High/Critical security regression** where path allowlist constraints were lost during the modularization of `/api/files/read`.

---

## Skipped Lenses & Skill Availability

The following skill directories were requested but were unavailable on the system:
* `/home/ericl/Work/vscode/agent-skills/` (and its subdirectories `00_common/audit-base/`, `10_audit/*`)

As instructed, the audit proceeded utilizing built-in agent capabilities and manual cross-lens analysis of the code.

---

## Detailed Findings

### SEC-001: Missing `isAllowedReadPath` Check in `/api/files/read` Route (High / Critical)

* **Lens:** `audit-nodejs-architecture`, `audit-input-output-path`
* **Status:** Confirmed
* **Evidence:** [packages/jinn/src/gateway/files.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/files.ts#L84-L88)
* **Observed Behavior:**
  During the modularization of `files.ts` into individual submodules under `packages/jinn/src/gateway/files/`, the route handler for `GET /api/files/read` was refactored. The refactored handler validates paths via `resolveReadPath` and checks high-risk blocklists via `assessFileRead`, but it **entirely omitted** the validation call to `isAllowedReadPath(resolvedPath, context)`.
* **Expected Behavior:**
  The route must restrict reading files only to those within configured directories (such as `fileReadRoots` or default storage directories), unless `gateway.allowArbitraryFileRead` is set to `true`.
* **Regression Risk:**
  **Security Bypass / Arbitrary File Read.** Any authenticated client can read any file on the system (excluding a small hardcoded blocklist of keys/tokens), bypassing directory boundary controls (`fileReadRoots`) set by operators.
* **Minimal Remediation Guidance:**
  Add the `isAllowedReadPath` check immediately after the `assessFileRead` call in `handleFilesRequest`:
  ```typescript
  const assessment = assessFileRead(resolvedPath, { authenticated: true });
  if (!assessment.allowed) {
    json(res, { error: assessment.reason || "File read blocked by security policy" }, 403);
    return true;
  }
  if (!isAllowedReadPath(resolvedPath, context)) {
    json(res, { error: "File is outside configured read roots" }, 403);
    return true;
  }
  ```
* **Suggested Regression Test:**
  Add a test inside `packages/jinn/src/gateway/__tests__/file-read.test.ts` verifying that querying `/api/files/read?path=/etc/passwd` (or any path outside the `fileReadRoots` list) returns a `403 Forbidden` status when `fileReadRoots` is populated and `allowArbitraryFileRead` is disabled.

---

### SEC-002: Potential DoS Risk via Unbounded Memory Buffering in `handleAttachmentJson` (Medium)

* **Lens:** `audit-input-output-path`, `audit-negative-space`
* **Status:** Confirmed
* **Evidence:** [packages/jinn/src/gateway/files/attachments.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/files/attachments.ts#L149) and [packages/jinn/src/gateway/files/responses.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/files/responses.ts#L5-L12)
* **Observed Behavior:**
  The `handleAttachmentJson` method reads request bodies using the `readBody(req)` helper. `readBody` reads all chunks until completion and aggregates them into a string without capping memory consumption.
* **Expected Behavior:**
  JSON payloads containing base64 data should be read with a defined payload limit to prevent daemon crashes due to memory exhaustion.
* **Regression Risk:**
  A large malicious JSON request sent to the attachments endpoint could cause the gateway daemon to run out of memory (OOM) and crash (Denial of Service).
* **Minimal Remediation Guidance:**
  Replace `readBody(req)` in `handleAttachmentJson` with Jinn's standard capped JSON reader `readJsonBody(req, res, { maxBytes: 50 * 1024 * 1024 })` (which enforces the existing 50MB limit).
* **Suggested Regression Test:**
  Create a test where a large request body exceeding the limits is posted to `/api/sessions/:id/attachments`, verifying that the server rejects the request with a `413 Payload Too Large` or `400 Bad Request` before consuming excessive memory.

---

### MOD-001: Unused / Dead Facade Exports (Info)

* **Lens:** `audit-architecture-seam`
* **Status:** Confirmed
* **Evidence:** [packages/jinn/src/gateway/files.ts](file:///home/ericl/Work/vscode/public_share/jinn/packages/jinn/src/gateway/files.ts#L33-L56)
* **Observed Behavior:**
  The facade file `files.ts` exports helper utilities (e.g., `buildRemoteUploadBody`, `cleanupOldUploads`, `ensureFilesDir`, `remoteUploadHeaders`) that were previously consumed or might be internal to the submodules.
* **Expected Behavior:**
  The facade should expose only the minimal public API surface needed by outer directories.
* **Regression Risk:**
  Extremely low. There is no runtime breakage, only minor code bloat / dead code clutter.
* **Minimal Remediation Guidance:**
  Analyze which files actually import these helpers. Utilities only used inside `packages/jinn/src/gateway/files/*` should be removed from the facade's export block.

---

### CODE-001: Uncommitted Working Directory State (Info)

* **Lens:** `audit-nodejs-architecture`
* **Status:** Confirmed
* **Evidence:** Git Status (`M packages/jinn/src/gateway/files.ts`, `?? packages/jinn/src/gateway/files/`)
* **Observed Behavior:**
  The files refactoring is present in the local workspace as modified and untracked files, but has not been committed.
* **Expected Behavior:**
  Working tree should be clean/committed prior to final PR approval.
* **Regression Risk:**
  Risk of accidental modification or losing refactoring state if git commands are run blindly.
* **Minimal Remediation Guidance:**
  Stage the new submodules and commit the refactored code together with the facade updates.

---

## Architectural Review & Dependency Analysis

1. **Circular Seams:**
   Analysis of the imports shows that `packages/jinn/src/gateway/files.ts` imports from `./files/*`, and the submodules only import from sibling files (like `storage.ts`) and global Jinn shared libraries (`shared/paths.ts`, `shared/logger.ts`, `sessions/registry.ts`). No back-references to `files.ts` exist. The graph is **fully acyclic**.
2. **State & Lifecycle Transitions:**
   The extraction of registry-approvals and registry-archives has successfully preserved state consistency. Test suites explicitly covering these boundaries (e.g. `registry-approvals.test.ts`) are 100% green.
3. **Temporal & Concurrency Assumed Safety:**
   Files caching via conditional GET headers (`isFileNotModified`) was reviewed. Headers such as `If-None-Match` are validated accurately, and the 304 response paths operate as intended (verified by `file-cache.test.ts`).

---

## Release Impact and Next Steps

* **Blocks Release:** **YES** (SEC-001 is a critical security bypass that must be fixed before these refactorings are merged or released to production).
* **Recommended Remediation Order:**
  1. Patch `SEC-001` in `packages/jinn/src/gateway/files.ts` to reinstate the `isAllowedReadPath` check.
  2. Patch `SEC-002` to use `readJsonBody` instead of unbounded `readBody`.
  3. Commit the staged refactoring changes.
  4. Run validation checks (`pnpm typecheck && pnpm test && pnpm lint && pnpm build`).
