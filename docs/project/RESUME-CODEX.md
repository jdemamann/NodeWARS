# Single-Use Resume Instruction

When a new Codex session starts in this repository, do exactly this:

1. Read these files in order:
   - `AGENTS.md`
   - `docs/project/session-handoff-2026-03-14.md`
   - `docs/project/inbox-codex.md`
   - `docs/project/tw-collab-status.md`

2. Rebuild the active project state from those files only.

3. Confirm whether `superpowers` skills are available in the current session after restart.

4. Resume the current open task:
   - `TASK-TWL-013 TentacleWars World 3 Playtest and Reconstruction Review`

5. Run the relevant checks after the wave:
   - `node scripts/smoke-checks.mjs`
   - `node scripts/tw-campaign-sanity.mjs`
   - `node scripts/commentary-policy.mjs`

6. Continue the manual inbox protocol with Claude:
   - read `docs/project/inbox-codex.md`
   - write the report to `docs/project/inbox-claude.md`
   - update `docs/project/tw-collab-status.md`

7. After successfully resuming and confirming context, this file may be deleted.
