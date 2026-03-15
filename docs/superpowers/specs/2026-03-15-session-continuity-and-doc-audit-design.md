# Session Continuity + Doc Audit — Design Spec

**Date:** 2026-03-15
**Authors:** Claude (design) + Codex (review — incorporated 2026-03-15)
**Status:** APPROVED — ready for implementation planning

---

## Goal

Fix the cold-start problem: a fresh Claude or Codex session should be able to resume work reliably in 4 reads. Then run a bounded doc audit to clean up what those 4 reads point to.

---

## Two waves, in order

**Wave B — Session Continuity** (first, steps 1 of 2)
**Wave A — Doc Audit** (second, steps 2 of 2 — bounded to what Wave B's boot chain points to)

---

## Wave B — Session Continuity

### Problem

The current cold-start chain has 10 files to read, no clear distinction between stable rules and live project state, and includes stale files that actively mislead:
- `session-handoff-2026-03-14.md` — wrong branch, obsolete task, old smoke counts
- `RESUME-CODEX.md` — points to historical state, no longer maintained
- `operational-kanban.md` — has drift (e.g. POSTMERGE-WAVE-001 still says "validation: pending in current wave")
- `memory/` — referenced in prompts but does not exist in the repo (it lives in Claude Code's system memory, not the repository)

### Solution: two-layer model

**Layer 1 — Stable** (`AGENTS.md`):
- Gameplay invariants
- Code structure and entry points
- Canonical commands and checks
- High-risk files
- Workflow expectations and skill stack

Does not change between waves. Never contains live project state.

**Layer 2 — Live** (`docs/project/RESUME.md`, new file):
Concise operational summary (~60–80 lines max). Updated at the close of each wave.

Required fields:
- Current project phase
- Current branch expectation (main vs feature branch isolation)
- Latest validated baseline smoke counts
- Currently open tracks (with direct links)
- Cold-start order (explicit, 4 steps)
- Stale files to ignore during this session
- Active protocol summary (inbox English-only rule, file locations)
- Next recommended action
- Tiebreaker rule (see below)

**What RESUME.md must NOT be:**
- A changelog
- A duplicate of AGENTS.md sections
- A long historical narrative

### RESUME.md — initial committed content

The first committed RESUME.md must use these values (as of transition commit):

```markdown
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

## Stale files — ignore these during cold-start
- `docs/archive/session-handoff-2026-03-14.md` — historical, not a live entry point
- `docs/archive/RESUME-CODEX.md` — replaced by this file

## Protocol
- Async collaboration: Claude writes `inbox-codex.md`, Codex writes `inbox-claude.md`
- All inbox content must be in English
- Status tracked in `tw-collab-status.md`
- memory/ is Claude Code system memory (outside this repo) — not a repo directory

## Next recommended action
No active wave. Review open tracks above and await playtest data.
If a new implementation track is needed, start with brainstorming skill.

## Tiebreaker
If inbox and RESUME disagree: trust inbox for the current task; trust RESUME for stable cold-start context.
If inbox is empty: trust RESUME's next recommended action.
```

### New cold-start chain (4 steps)

```
1. AGENTS.md                          — stable rules and structure
2. docs/project/RESUME.md             — live state: phase, open tracks, what to ignore
3. docs/project/inbox-codex.md        — current task
4. docs/project/tw-collab-status.md   — protocol handoff state
```

### Stale file handling

Create `docs/archive/` directory first (it does not currently exist). Then move both files. **Commit the archive moves and RESUME.md creation in a single atomic commit** — this ensures the stale-file paths listed inside RESUME.md are accurate at every point in git history. Delete archived files later if still unused after multiple sessions.

| File | Action |
|------|--------|
| `docs/project/session-handoff-2026-03-14.md` | Archive to `docs/archive/` |
| `docs/project/RESUME-CODEX.md` | Archive to `docs/archive/` |

After moving, remove all inbound references to these files from:
- `AGENTS.md` (section "First Files To Read")
- `docs/project/development-working-rhythm.md` (see below)

### Stale-source deactivation — AGENTS.md

Replace the "First Files To Read" section with the 4-step cold-start chain. Remove any direct references to the archived files.

### Stale-source deactivation — development-working-rhythm.md

Update **only `### 1. Session start`** — the section that lists the 7-file reading sequence. Replace with the 4-step chain.

Do not modify sections 0, 3, or 6 of that file in this wave. Those sections reference docs by name but are describing the general rhythm, not the mandatory boot sequence. They are out of scope for Wave B.

Note: the current `inbox-codex.md` live file has body content in Portuguese (violating the English-only protocol). This is pre-existing drift. Fix the inbox language as part of Wave B when it is rewritten with the next task dispatch.

### Kanban trust repair

Fix only the one explicitly known stale line:
- `POSTMERGE-WAVE-001` status "validation: pending in current wave" → update to reflect it has been validated

**Do not touch the historical stub entries** (`TASK-TW-00x`, lines 191–212). Those are historical records, intentionally kept without full output records.

### Checks after Wave B

No `src/` files are modified. No smoke-checks run required. The Wave B deliverable is verified by doing a cold-start read-through: open a fresh context, read the 4 files in order, confirm the state is coherent and actionable.

---

## Wave A — Doc Audit (bounded)

### Scope

Only files in the boot chain + 1 level of references from them. Does NOT sweep all 162 docs.

### Script: `scripts/doc-audit.mjs`

A read-only Node.js script. Prints a structured report. Modifies nothing.

**5 checks:**

**1. Dead references** — scan all boot-chain `.md` files for `[text](path)` and backtick references to `docs/...` and `src/...`; verify each target exists on disk.

**2. Missing scripts** — extract all `scripts/*.mjs` and `scripts/*.sh` names referenced in `AGENTS.md`, `development-working-rhythm.md`, and `check-matrix.md`; verify each exists in `scripts/`.

**3. Orphan scripts** — list all files in `scripts/`; report any not referenced in any boot-chain doc. **Disposition: log and leave.** Do not delete or add references to orphan scripts in this wave. The report is informational. Exception: if a script is referenced only in `docs/archive/`, classify it as `[ARCHIVE-REF]`, not an error.

**4. Duplicate headings** — extract all `#` and `##` headings from boot-chain docs; flag identical headings appearing in more than one file. **Filter:** headings of 2 words or fewer (`Purpose`, `Problem`, `Scope`, `Goal`, `Checks`) are classified as `[INFO]`, not `[REVIEW]` — these are expected common headings and are not a quality signal.

**5. Orphan docs** — list all `.md` files in `docs/project/` not referenced by any boot-chain doc. Apply archive allowlist: `docs/archive/` files are always classified as `[ARCHIVE — OK]`. All others are classified as `[REVIEW]`.

**Output format:**
```
=== Doc Audit Report ===

[DEAD LINKS] N found
  file.md:12 → docs/foo/bar.md (NOT FOUND)

[MISSING SCRIPTS] N found
  AGENTS.md references scripts/foo.mjs (NOT FOUND)

[ORPHAN SCRIPTS] N found (informational — no action required this wave)
  scripts/tw-codex-worker.sh — not referenced in any boot-chain doc

[DUPLICATE HEADINGS] N found
  [INFO] "Purpose" in docs/project/a.md AND docs/project/b.md (common heading — OK)
  [REVIEW] "Balance Goals" in docs/project/a.md AND docs/project/b.md

[ORPHAN DOCS] N found
  docs/archive/session-handoff-2026-03-14.md [ARCHIVE — OK]
  docs/project/gemini-visb-prompt.md — no inbound references [REVIEW]
```

### Fix pass

After running the script, fix findings in priority order:
1. Dead references — update or remove
2. Scripts cited in AGENTS.md that don't exist — add note or remove reference
3. Orphan docs flagged as `[REVIEW]` — decide per file: archive, link from RESUME.md, or delete
4. Remaining stale status lines in `operational-kanban.md` if any surface in the audit

**Do not act on `[ORPHAN SCRIPTS]` or `[INFO]` findings this wave.**

### Checks after Wave A

```bash
node scripts/doc-audit.mjs
```

Expected: zero `[DEAD LINKS]`, zero `[MISSING SCRIPTS]`. Other categories may still have `[REVIEW]` items — those are reviewed and triaged, not necessarily all resolved.

---

## Files created or modified

| File | Wave | Action |
|------|------|--------|
| `docs/archive/` (directory) | B | Create |
| `docs/project/RESUME.md` | B | Create with initial committed content |
| `AGENTS.md` | B | Update "First Files To Read" → 4-step chain |
| `docs/project/development-working-rhythm.md` | B | Update `### 1. Session start` only |
| `docs/project/operational-kanban.md` | B | Fix POSTMERGE-WAVE-001 stale status line |
| `docs/archive/session-handoff-2026-03-14.md` | B | Move from `docs/project/` |
| `docs/archive/RESUME-CODEX.md` | B | Move from `docs/project/` |
| `scripts/doc-audit.mjs` | A | Create |
| Various boot-chain docs | A | Fix dead links and references found by audit |

---

## Codex review — incorporated

Changes applied from Codex DESIGN-REVIEW-001 (2026-03-15):

1. **RESUME.md content expanded** — added canonical protocol note (inbox English rule) and branch expectation field
2. **Tiebreaker rule added** — inbox overrides RESUME for current task; RESUME is stable cold-start context; empty inbox → trust RESUME next action
3. **Archive both stale files** (not delete yet) — archive in transition commit, delete later if unused
4. **doc-audit.mjs archive allowlist** — `docs/archive/` files are never flagged as orphan errors
5. **Stale-source deactivation made explicit** — references removed from AGENTS.md and development-working-rhythm.md (bounded to `### 1. Session start` only)
6. **Kanban trust repair scoped explicitly** — fix only the one named stale line; historical stubs untouched

Changes applied from spec-document-reviewer (2026-03-15):

7. **`docs/archive/` creation step added** — the directory does not exist; spec now says to create it first
8. **Initial RESUME.md content specified** — full populated example with correct values as of transition commit
9. **development-working-rhythm.md update bounded** — explicitly `### 1. Session start` only; sections 0, 3, 6 out of scope
10. **Kanban repair scoped to one named line** — historical stubs explicitly excluded
11. **Orphan scripts disposition defined** — log and leave; no deletion or reference changes in this wave
12. **Duplicate heading filter added** — 2-word-or-fewer headings classified as `[INFO]`, not `[REVIEW]`
13. **Empty inbox tiebreaker case added** — trust RESUME next recommended action when inbox is empty
14. **Wave B checks defined** — no src/ changes; cold-start read-through is the verification
