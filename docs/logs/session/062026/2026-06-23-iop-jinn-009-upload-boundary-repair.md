# IOP-JINN-009 Upload Boundary Repair

Date: 2026-06-23T10:17:00-04:00
Actor: Codex
Task: Repair IOP-JINN-009, where JSON `/api/files` uploads lacked the same 50 MB boundary enforced by multipart and session attachment upload paths.

## Scope

- Selected finding: IOP-JINN-009 only.
- Source touched:
  - `packages/jinn/src/gateway/files.ts`
- Test touched:
  - `packages/jinn/src/gateway/__tests__/files-upload-boundary.test.ts`
- Out of scope:
  - Broader upload policy reshaping for session attachments or transfer routes.
  - Governance/control file edits.
  - Settings/UI work.

## Startup Evidence

- Loaded repair skill: `/home/ericl/Work/vscode/agent-skills/20_repair/repair-defect-priority/SKILL.md`.
- Read repo instructions: `AGENTS.md`.
- Read task-relevant audit evidence:
  - `docs/audits/2026-06-23-independent-state-transition-codebase-audit.md`
- Checked for repo files requested by startup instructions:
  - `README.md` and `AGENTS.md` are present.
  - `PROJECT_HANDOFF_MASTER.md`, `docs/INDEX.md`, `PLAN.md`, `.giles/`, and `.dory/` were not used for this repair path.
  - Requested `control/*.yaml` and `governance/*.yaml` startup files were not present in this checkout.
- Checked Dory:
  - Dory exists, but the visible active session was unrelated to this repair.
  - No Dory session was started or mutated for this patch.

## Patch Summary

- Switched JSON `/api/files` parsing to the shared capped JSON body reader instead of the local uncapped reader.
- Added a JSON-envelope cap sized for a 50 MB binary file plus base64 overhead, so valid 50 MB JSON uploads still fit while unbounded request bodies no longer do.
- Rejected base64 JSON uploads whose decoded size exceeds 50 MB before persisting.
- Replaced unbounded URL `arrayBuffer()` upload buffering with a capped reader that rejects oversized responses before fully buffering them.
- Reused the same 50 MB message text for multipart and JSON upload rejection paths.

## Regression Coverage

Added `files-upload-boundary.test.ts`:

- Streams a JSON `/api/files` request whose base64 payload represents more than 50 MB decoded and asserts rejection.
- Stubs `fetch()` for URL upload, advertises a response larger than 50 MB via `content-length`, and asserts rejection.

## Validation

Passed:

- `pnpm typecheck` (from `packages/jinn`)
- `pnpm test -- src/gateway/__tests__/files-upload-boundary.test.ts` (from `packages/jinn`)
- `pnpm test -- src/gateway/__tests__/*.test.ts` (from `packages/jinn`)

Not run:

- Root `pnpm test`, `pnpm lint`, and `pnpm build` were not run because this repair stayed within the gateway package and targeted gateway validation passed.

## File Size / Modularity

- `packages/jinn/src/gateway/files.ts`: 1049 lines.
- `packages/jinn/src/gateway/__tests__/files-upload-boundary.test.ts`: 109 lines.
- One touched hand-written file is already over 600 lines:
  - `packages/jinn/src/gateway/files.ts`
- One touched hand-written file is already over 1000 lines:
  - `packages/jinn/src/gateway/files.ts`
- Modularity stayed broadly flat. The patch kept logic local to the existing upload module and added one focused regression test.

## Residual Risks

- This repair covers the JSON `/api/files` path only. `handleAttachmentJson` still uses the local uncapped JSON body reader even though it already enforces 50 MB limits after decode/fetch.
- URL rejection trusts `content-length` when present and also enforces a streamed byte cap when reading; it does not convert the route to a fully streaming file save path.
- Invalid-but-decodable base64 normalization behavior remains whatever Node's base64 decoder accepts; this patch targets size boundaries rather than stricter content validation.

## Recommended Next Batch

- Align `handleAttachmentJson` with the shared capped JSON body helper so the sibling JSON attachment path enforces the same request-envelope boundary before buffering.
- Consider extracting upload-size constants/helpers from `files.ts` if more upload paths need the same boundary logic.
