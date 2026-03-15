# Session Continuity + Doc Audit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix cold-start reliability by creating RESUME.md as a live-state file, archiving stale entry points, aligning the 4-step boot chain, and running a bounded doc audit on the resulting chain.

**Architecture:** Wave B (doc-only) ships in two commits: atomic archive+RESUME creation, then boot-chain alignment. Wave A ships as one script (`doc-audit.mjs`) plus a fix-pass commit. No src/ files are touched; no smoke checks required.

**Tech Stack:** Markdown, Node.js ESM for the audit script.

**Spec:** `docs/superpowers/specs/2026-03-15-session-continuity-and-doc-audit-design.md`

---

## File Map

| File | Wave | Action |
|------|------|--------|
| `docs/archive/` | B | Create directory |
| `docs/archive/session-handoff-2026-03-14.md` | B | Move from `docs/project/` |
| `docs/archive/RESUME-CODEX.md` | B | Move from `docs/project/` |
| `docs/project/RESUME.md` | B | Create with initial content |
| `AGENTS.md` | B | Replace "First Files To Read" with 4-step chain |
| `docs/project/development-working-rhythm.md` | B | Replace `### 1. Session start` list with 4-step chain |
| `docs/project/operational-kanban.md` | B | Fix POSTMERGE-WAVE-001 stale validation line |
| `scripts/doc-audit.mjs` | A | Create read-only audit script |
| Various boot-chain docs | A | Fix dead links and missing script references found by audit |

---

## Chunk 1: Wave B — Session Continuity

### Task 1: Archive stale files and create RESUME.md (atomic commit)

**Files:**
- Create: `docs/archive/` (directory)
- Move: `docs/project/session-handoff-2026-03-14.md` → `docs/archive/session-handoff-2026-03-14.md`
- Move: `docs/project/RESUME-CODEX.md` → `docs/archive/RESUME-CODEX.md`
- Create: `docs/project/RESUME.md`

All four changes go in a single commit so that the archive paths referenced inside RESUME.md are accurate at every point in git history.

- [ ] **Step 1: Create docs/archive/ and move stale files**

```bash
mkdir -p docs/archive && git mv docs/project/session-handoff-2026-03-14.md docs/archive/session-handoff-2026-03-14.md && git mv docs/project/RESUME-CODEX.md docs/archive/RESUME-CODEX.md
```

Verify:
```bash
ls docs/archive/
```
Expected: both files listed.

- [ ] **Step 2: Create `docs/project/RESUME.md`**

Create the file with this exact content:

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

## Stale files — ignore during cold-start

- `docs/archive/session-handoff-2026-03-14.md` — historical, not a live entry point
- `docs/archive/RESUME-CODEX.md` — replaced by this file

## Protocol

- Async collaboration: Claude writes `inbox-codex.md`, Codex writes `inbox-claude.md`
- **All inbox content must be in English** — no exceptions
- Status tracked in `docs/project/tw-collab-status.md`
- `memory/` is Claude Code system memory (outside this repo) — not a repo directory

## Next recommended action

No active wave. Review open tracks above and await playtest data.
If a new implementation track is needed, start with the brainstorming skill.

## Tiebreaker

- If `inbox-codex.md` and this file disagree: trust the inbox for the current task; trust this file for stable cold-start context.
- If the inbox is empty: trust this file's "Next recommended action" field.
```

- [ ] **Step 3: Commit atomically**

```bash
git add docs/archive/ docs/project/RESUME.md
git commit -m "$(cat <<'EOF'
docs: create RESUME.md and archive stale session files

Introduces docs/project/RESUME.md as the canonical live-state
file for cold-start continuity. Archives the two stale entry
points that were causing sessions to start with wrong branch,
obsolete tasks, and old smoke counts.

Archived:
- docs/archive/session-handoff-2026-03-14.md
- docs/archive/RESUME-CODEX.md

Both are now under docs/archive/ for historical reference only.
EOF
)"
```

---

### Task 2: Align AGENTS.md, development-working-rhythm.md, and kanban

**Files:**
- Modify: `AGENTS.md:19-30` (replace "First Files To Read" list)
- Modify: `docs/project/development-working-rhythm.md:27-37` (replace `### 1. Session start` list)
- Modify: `docs/project/operational-kanban.md:59` (fix POSTMERGE-WAVE-001 stale line)

- [ ] **Step 1: Update AGENTS.md "First Files To Read"**

Read `AGENTS.md` to confirm the section starts at line 19. Replace the entire "First Files To Read" section (lines 19–30) with:

```markdown
## First Files To Read

1. `AGENTS.md` — stable rules and structure (this file)
2. `docs/project/RESUME.md` — live state: current phase, open tracks, what to ignore
3. `docs/project/inbox-codex.md` — current task
4. `docs/project/tw-collab-status.md` — handoff state
```

- [ ] **Step 2: Update `development-working-rhythm.md` — `### 1. Session start` only**

Read `docs/project/development-working-rhythm.md` to confirm `### 1. Session start` is at line 27. Replace only the list under that heading (lines 29–37) with:

```markdown
Read in this order:

1. `AGENTS.md` — stable rules and structure
2. `docs/project/RESUME.md` — live state: current phase, open tracks, what to ignore
3. `docs/project/inbox-codex.md` — current task
4. `docs/project/tw-collab-status.md` — handoff state
```

Do NOT modify sections 0, 2, 3, 4, 5, or 6 of this file.

- [ ] **Step 3: Fix POSTMERGE-WAVE-001 stale status in `operational-kanban.md`**

Read `docs/project/operational-kanban.md` line 59. Find:
```
  - validation: pending in current wave
```

Replace with:
```
  - validation: 90/90 + 15/15 PASS (completed, branch merged to main)
```

Do NOT touch any other lines, especially the historical `TASK-TW-00x` stub entries (lines 191–212).

- [ ] **Step 4: Verify no inbound references remain to the archived files**

```bash
grep -r "session-handoff-2026-03-14" docs/ AGENTS.md progress.md --include="*.md" | grep -v "docs/archive/"
grep -r "RESUME-CODEX" docs/ AGENTS.md progress.md --include="*.md" | grep -v "docs/archive/"
```

Expected: no output (or only hits inside `docs/project/inbox-codex.md` — that file contains pre-existing references that are addressed when the inbox is rewritten at next task dispatch, not in this step). Any hit in `AGENTS.md`, `progress.md`, or `docs/project/development-working-rhythm.md` must be removed before committing.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md docs/project/development-working-rhythm.md docs/project/operational-kanban.md
git commit -m "$(cat <<'EOF'
docs: align boot chain to 4-step cold-start order

Updates AGENTS.md, development-working-rhythm.md, and
operational-kanban.md to use the new 4-step boot chain:
AGENTS.md → RESUME.md → inbox → status.

Also corrects the stale POSTMERGE-WAVE-001 validation
status in the kanban (was "pending", now reflects the
completed merge and passing checks).
EOF
)"
```

---

### Wave B Verification

No src/ files modified — no smoke checks required.

- [ ] **Cold-start read-through:** Open a fresh context (or simulate one). Read the 4 files in order. Confirm:
  - [ ] Branch matches reality (`main`)
  - [ ] Smoke counts are in `N/N` format and recent
  - [ ] Open tracks list is non-empty and accurate
  - [ ] Cold-start order lists exactly 4 files
  - [ ] No references to archived files in AGENTS.md or development-working-rhythm.md

---

## Chunk 2: Wave A — Doc Audit

### Task 3: Create `scripts/doc-audit.mjs`

**Files:**
- Create: `scripts/doc-audit.mjs`

This script is read-only — it scans and reports but never modifies anything.

- [ ] **Step 1: Create the script**

```bash
# Verify scripts/ directory exists
ls scripts/ | head -5
```

Create `scripts/doc-audit.mjs` with this content:

```js
#!/usr/bin/env node
/**
 * doc-audit.mjs
 *
 * Read-only doc audit for the NodeWARS boot-chain files.
 * Scans for dead links, missing scripts, orphan scripts,
 * duplicate headings, and orphan docs.
 *
 * Usage: node scripts/doc-audit.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Boot-chain files to audit ──────────────────────────────────────────────

const BOOT_CHAIN = [
  'AGENTS.md',
  'docs/project/RESUME.md',
  'docs/project/development-working-rhythm.md',
  'docs/project/operational-kanban.md',
  'docs/project/skill-usage-map.md',
  'docs/project/task-backlog.md',
  'docs/project/check-matrix.md',
  'docs/project/inbox-codex.md',
  'docs/project/inbox-claude.md',
  'docs/project/tw-collab-status.md',
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function fileExists(absPath) {
  try { await fs.access(absPath); return true; } catch { return false; }
}

async function readText(rel) {
  return fs.readFile(path.join(ROOT, rel), 'utf8');
}

async function listDir(rel, ext = null) {
  const dir = path.join(ROOT, rel);
  try {
    const entries = await fs.readdir(dir);
    return ext ? entries.filter(e => e.endsWith(ext)) : entries;
  } catch { return []; }
}

// Returns [{href, line}] — line number (1-based) of the link in the file
function extractMarkdownLinks(text) {
  const results = [];
  const lines = text.split('\n');
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    // [text](path) links
    for (const m of lineText.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
      const href = m[2].split('#')[0].trim();
      if (href && !href.startsWith('http')) results.push({ href, line: lineNum });
    }
    // Backtick paths that look like docs/ or src/ references
    for (const m of lineText.matchAll(/`((?:docs|src)\/[^`]+\.(?:md|js))`/g)) {
      results.push({ href: m[1], line: lineNum });
    }
  });
  return results;
}

// Returns [{source, script}] — which file references which script
function extractScriptRefs(rel, text) {
  const results = [];
  for (const m of text.matchAll(/`(scripts\/[^`]+\.(?:mjs|sh))`/g)) {
    results.push({ source: rel, script: m[1] });
  }
  for (const m of text.matchAll(/node (scripts\/\S+\.mjs)/g)) {
    results.push({ source: rel, script: m[1] });
  }
  for (const m of text.matchAll(/bash (scripts\/\S+\.sh)/g)) {
    results.push({ source: rel, script: m[1] });
  }
  return results;
}

function extractHeadings(text) {
  const results = [];
  for (const m of text.matchAll(/^(#{1,2})\s+(.+)$/gm)) {
    results.push(m[2].trim());
  }
  return results;
}

// Headings of 2 words or fewer are common across docs — not a quality signal
const isCommonHeading = (h) => h.trim().split(/\s+/).length <= 2;

// ── Checks ─────────────────────────────────────────────────────────────────

async function checkDeadLinks(bootFiles) {
  const findings = [];
  for (const rel of bootFiles) {
    let text;
    try { text = await readText(rel); } catch { continue; }
    for (const { href, line } of extractMarkdownLinks(text)) {
      const abs = path.join(ROOT, href);
      if (!await fileExists(abs)) {
        findings.push(`  ${rel}:${line} → ${href} (NOT FOUND)`);
      }
    }
  }
  return findings;
}

async function checkMissingScripts(bootFiles) {
  const cited = []; // [{source, script}]
  for (const rel of bootFiles) {
    let text;
    try { text = await readText(rel); } catch { continue; }
    for (const ref of extractScriptRefs(rel, text)) cited.push(ref);
  }
  const findings = [];
  const seen = new Set();
  for (const { source, script } of cited) {
    const key = `${source}::${script}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!await fileExists(path.join(ROOT, script))) {
      findings.push(`  ${source} references ${script} (NOT FOUND)`);
    }
  }
  return findings;
}

async function checkOrphanScripts(bootFiles) {
  // Collect refs from boot chain
  const bootRefs = new Set();
  for (const rel of bootFiles) {
    let text;
    try { text = await readText(rel); } catch { continue; }
    for (const { script } of extractScriptRefs(rel, text)) bootRefs.add(script);
  }
  // Collect refs from docs/archive/
  const archiveFiles = await listDir('docs/archive', '.md');
  const archiveRefs = new Set();
  for (const f of archiveFiles) {
    let text;
    try { text = await readText(`docs/archive/${f}`); } catch { continue; }
    for (const { script } of extractScriptRefs(`docs/archive/${f}`, text)) archiveRefs.add(script);
  }

  const scriptFiles = await listDir('scripts');
  const findings = [];
  for (const f of scriptFiles) {
    const rel = `scripts/${f}`;
    if (bootRefs.has(rel)) continue; // referenced in boot chain — OK
    if (archiveRefs.has(rel)) {
      findings.push(`  ${rel} [ARCHIVE-REF] — referenced only in docs/archive/`);
    } else {
      findings.push(`  ${rel} — not referenced in any boot-chain doc`);
    }
  }
  return findings;
}

async function checkDuplicateHeadings(bootFiles) {
  const headingMap = new Map(); // heading → [files]
  for (const rel of bootFiles) {
    let text;
    try { text = await readText(rel); } catch { continue; }
    for (const h of extractHeadings(text)) {
      if (!headingMap.has(h)) headingMap.set(h, []);
      headingMap.get(h).push(rel);
    }
  }
  const findings = [];
  for (const [h, files] of headingMap) {
    if (files.length > 1) {
      if (isCommonHeading(h)) {
        findings.push(`  [INFO] "${h}" in ${files.join(' AND ')} (common heading — OK)`);
      } else {
        findings.push(`  [REVIEW] "${h}" in ${files.join(' AND ')}`);
      }
    }
  }
  return findings;
}

async function checkOrphanDocs(bootFiles) {
  const allRefs = new Set(bootFiles.map(f => f.replace(/^\//, '')));
  for (const rel of bootFiles) {
    let text;
    try { text = await readText(rel); } catch { continue; }
    for (const { href } of extractMarkdownLinks(text)) allRefs.add(href);
  }

  const docFiles = await listDir('docs/project', '.md');
  const findings = [];
  for (const f of docFiles) {
    const rel = `docs/project/${f}`;
    if (!allRefs.has(rel)) {
      findings.push(`  ${rel} — no inbound references [REVIEW]`);
    }
  }

  const archiveFiles = await listDir('docs/archive', '.md');
  for (const f of archiveFiles) {
    findings.push(`  docs/archive/${f} [ARCHIVE — OK]`);
  }

  return findings;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Doc Audit Report ===\n');

  const deadLinks = await checkDeadLinks(BOOT_CHAIN);
  console.log(`[DEAD LINKS] ${deadLinks.length} found`);
  for (const f of deadLinks) console.log(f);
  if (!deadLinks.length) console.log('  (none)');

  console.log('');
  const missingScripts = await checkMissingScripts(BOOT_CHAIN);
  console.log(`[MISSING SCRIPTS] ${missingScripts.length} found`);
  for (const f of missingScripts) console.log(f);
  if (!missingScripts.length) console.log('  (none)');

  console.log('');
  const orphanScripts = await checkOrphanScripts(BOOT_CHAIN);
  console.log(`[ORPHAN SCRIPTS] ${orphanScripts.length} found (informational — no action required this wave)`);
  for (const f of orphanScripts) console.log(f);
  if (!orphanScripts.length) console.log('  (none)');

  console.log('');
  const dupHeadings = await checkDuplicateHeadings(BOOT_CHAIN);
  console.log(`[DUPLICATE HEADINGS] ${dupHeadings.length} found`);
  for (const f of dupHeadings) console.log(f);
  if (!dupHeadings.length) console.log('  (none)');

  console.log('');
  const orphanDocs = await checkOrphanDocs(BOOT_CHAIN);
  console.log(`[ORPHAN DOCS] ${orphanDocs.length} found`);
  for (const f of orphanDocs) console.log(f);
  if (!orphanDocs.length) console.log('  (none)');

  const errors = deadLinks.length + missingScripts.length;
  console.log(`\n=== Summary ===`);
  console.log(`Errors (must fix): ${errors}`);
  console.log(`  [DEAD LINKS]: ${deadLinks.length}`);
  console.log(`  [MISSING SCRIPTS]: ${missingScripts.length}`);
  console.log(`Review items: ${orphanDocs.filter(f => f.includes('[REVIEW]')).length}`);
  console.log(`Informational: orphan scripts ${orphanScripts.length}, duplicate headings ${dupHeadings.length}`);

  if (errors > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error('Doc audit failed:', err);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run the audit and review output**

```bash
node scripts/doc-audit.mjs
```

Expected: script runs without crashing. Review each section of the output. Note all `[DEAD LINKS]` and `[MISSING SCRIPTS]` — these must be fixed. Note `[REVIEW]` orphan docs for triage.

- [ ] **Step 3: Commit the script**

```bash
git add scripts/doc-audit.mjs
git commit -m "$(cat <<'EOF'
feat(audit): add doc-audit.mjs for boot-chain integrity

Read-only script that checks the 10 boot-chain docs for dead
links, missing scripts, orphan scripts, duplicate headings,
and orphan docs in docs/project/. Archive-aware: docs/archive/
files are classified as OK, not flagged as orphans.

Run: node scripts/doc-audit.mjs
EOF
)"
```

---

### Task 4: Fix audit findings

**Files:** Varies — determined by audit output from Task 3.

This task is conditional: if the audit in Task 3 finds zero `[DEAD LINKS]` and zero `[MISSING SCRIPTS]`, skip to verification.

- [ ] **Step 1: Fix all `[DEAD LINKS]`**

For each dead link found, either:
- Update the path to the correct current location, or
- Remove the reference if the doc no longer exists and is not critical

Common expected finding: references to the old `docs/project/RESUME-CODEX.md` or `docs/project/session-handoff-2026-03-14.md` paths anywhere not yet caught in Task 2.

- [ ] **Step 2: Fix all `[MISSING SCRIPTS]`**

For each script referenced in a boot-chain doc that doesn't exist:
- If it was renamed: update the reference
- If it was deleted: remove the reference
- Do not create new scripts to satisfy references

- [ ] **Step 3: Triage `[ORPHAN DOCS]` — one decision per doc**

For each `[REVIEW]` orphan doc in `docs/project/`:

| Decision | Action |
|----------|--------|
| Historical, no longer relevant | `git mv docs/project/<file> docs/archive/<file>` |
| Still relevant, just not linked | Add a reference to it from RESUME.md or AGENTS.md |
| Duplicate of another doc | Delete it (`git rm`) |

Do not change `[ARCHIVE — OK]` entries.

- [ ] **Step 4: Re-run audit to confirm zero errors**

```bash
node scripts/doc-audit.mjs
```

Expected:
```
[DEAD LINKS] 0 found
[MISSING SCRIPTS] 0 found
```

Other sections may still have `[REVIEW]` or `[INFO]` items — those are acceptable.

- [ ] **Step 5: Commit fixes (if any)**

```bash
git add -p   # stage only the fix changes
git commit -m "$(cat <<'EOF'
docs: fix dead links and missing script refs (doc-audit Wave A)

Resolved all [DEAD LINKS] and [MISSING SCRIPTS] found by
node scripts/doc-audit.mjs. Triaged orphan docs — some
archived, some linked, none deleted without review.
EOF
)"
```

---

### Wave A Verification

- [ ] **Run audit — confirm zero errors:**

```bash
node scripts/doc-audit.mjs 2>&1
```

Expected last lines:
```
Errors (must fix): 0
  [DEAD LINKS]: 0
  [MISSING SCRIPTS]: 0
```

- [ ] **Confirm script is listed in AGENTS.md or RESUME.md** so future sessions know it exists. If not, add a one-line mention under the doc-audit wave close note.

---
