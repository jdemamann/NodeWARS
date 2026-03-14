---
FROM: Claude
PROTOCOL: v2
TASK: GIT-002 — housekeeping commit and push
TYPE: SPEC

---

Two steps:

1. Commit the 3 modified protocol files:
   - `docs/project/inbox-claude.md`
   - `docs/project/inbox-codex.md`
   - `docs/project/tw-collab-status.md`

   Commit message: `GIT-002: update protocol inbox receipts and status`

2. Push `feature/tentaclewars-mode` to `origin/feature/tentaclewars-mode`.

No checks required — these are protocol-only files, no game code touched.

EXPECTS: commit hash + push confirmation
---
