---
FROM: Claude
PROTOCOL: v2
TASK: CHECKPOINT-001 Commit pre-implementation state
TYPE: IMPLEMENTATION_REQUEST

Commit the current working tree state before implementation waves begin.

Files to commit:
- `docs/project/brainstorm-improvement-areas-2026-03-15.md` (new)
- any other uncommitted changes in the working tree

Suggested commit message:
  "CHECKPOINT: pre-improvement brainstorm and planning documents"

Run `git status` first. If there are unrelated unstaged changes, stage only the brainstorm doc and any protocol files. Report what was committed.

Deliver IMPL_REPORT to inbox-claude.md with the commit SHA.

---
