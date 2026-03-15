# Project Resume

**Last updated:** 2026-03-15

## Project phase

Stabilized foundation — active TentacleWars balance and polish.
Core gameplay is not in high-risk drift. TentacleWars 80-level campaign integrated in main.

## Current branch

`main` — all TW work merged. No active feature branch.

## Latest validated baseline

- smoke-checks.mjs: 96/96 (post TW-AI-001, commits 475e241 + bb91479)
- tw-campaign-sanity.mjs: 15/15

## Open tracks

- Tutorial playtest feedback — awaiting sessions
- W24 RELAY RACE structural support — awaiting playtest evidence
- TASK-TWL-BALANCE-CROSS cross-world balance — awaiting timed playtests
- (no implementation tracks open — between waves)

## Cold-start order

1. `AGENTS.md` — stable rules and structure
2. `docs/project/RESUME.md` — this file (live state)
3. `docs/project/inbox-codex.md` — current task
4. `docs/project/tw-collab-status.md` — handoff state

## Stale files — ignore during cold-start

- `docs/archive/session-handoff-2026-03-14.md` — historical, not a live entry point
- `docs/archive/RESUME-CODEX.md` — replaced by this file

## Protocol

- Async collaboration: Claude writes `inbox-codex.md`, Codex writes `inbox-claude.md`
- All inbox content must be in English
- Status tracked in `docs/project/tw-collab-status.md`
- `memory/` is Claude Code system memory (outside this repo) — not a repo directory

## Next recommended action

No active wave. Review open tracks above and await playtest data.
If a new implementation track is needed, start with the brainstorming skill.
For bounded boot-chain integrity checks, run `node scripts/doc-audit.mjs`.

## Tiebreaker

- If `inbox-codex.md` and this file disagree: trust the inbox for the current task; trust this file for stable cold-start context.
- If the inbox is empty: trust this file's "Next recommended action" field.
