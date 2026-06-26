# Log Archive Index

## Policy

Raw audit and session logs are local-only artifacts in this repository. They live
under `docs/audits/` and `docs/logs/`, but those trees are git-ignored by policy
to avoid publishing machine-local agent run details.

Durable summaries are tracked under `docs/`:

- `docs/SESSION_SUMMARY_062026.md`
- `docs/AUDIT_SUMMARY_062026.md`

## Local Raw Sources

These source paths were present locally during the 2026-06-25 stewardship pass:

- Session details: `docs/logs/session/062026/`
- Audit details: `docs/audits/` and `docs/audits/062026/`
- Giles generated compliance logs: `governance/logs/`
- Runtime logs: `logs/`

## Traceability Notes

- Summaries reference source paths, not copied raw content.
- A fresh checkout may not contain raw local detail files.
- If a raw log becomes important for public context, publish a curated summary or
  explicitly move that one log into a tracked docs location with maintainer
  approval.
