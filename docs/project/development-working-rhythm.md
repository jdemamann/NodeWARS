# Development Working Rhythm

## Purpose

Define a simple, repeatable flow for continuing development without relying too much on session memory.

---

## Recommended Flow

### 0. Start automation watchers (if not running)

```bash
bash scripts/tw-inbox-watch.sh &
bash scripts/tw-inbox-watch-codex.sh &
```

To check whether they are already running:

```bash
pgrep -fa tw-inbox-watch
```

These watchers are optional convenience tooling, not a protocol requirement.
If automation fails, fall back to the manual inbox flow and continue working.

### 1. Session start

Read in this order:

1. `AGENTS.md` — stable rules and structure
2. `docs/project/RESUME.md` — live state: current phase, open tracks, what to ignore
3. `docs/project/inbox-codex.md` — current task
4. `docs/project/tw-collab-status.md` — handoff state

### 2. Choose the wave

Choose a small wave:

- one problem
- one clear goal
- a small set of files
- expected checks

Also choose the most relevant domain agent before starting.
If the task clearly matches an installed Codex skill, choose that skill before implementation.
If the wave has more than one concrete step, start it with `update_plan` and keep that plan current during the wave.
If the wave touches source `.js` files, also open `docs/project/commentary-header-template.md` before editing.

### 3. Write a short spec

Before implementation, record:

- problem
- desired rule
- risks
- checks
- docs that must change

Use `docs/project/task-template.md`.

If the wave touches AI, progression, or checks, consult first:

- `docs/agents/ai-behavior-agent.md`
- `docs/agents/meta-progression-agent.md`
- `docs/agents/qa-checks-agent.md`

If the wave touches content, render, text, or comments, also consult:

- `docs/agents/audio-reconstruction-agent.md` for authored soundtrack rebuilds
- `docs/agents/content-authored-levels-agent.md`
- `docs/agents/render-visual-language-agent.md`
- `docs/agents/narrative-localization-agent.md`
- `docs/agents/code-commentary-agent.md`

### 4. Implement

Rules:

- prefer small changes
- preserve canonical entry points
- do not create duplicate rule paths
- if gameplay changed, consider adding or updating a guardrail
- if a touched source file lacks a module header, add it
- if a created or materially changed function lacks a short header comment, add it

### 5. Validate

Run the minimum checks from the matrix.
If the wave touched source `.js` files, always include:

```bash
node scripts/commentary-policy.mjs
```

If there is any doubt:

```bash
npm run check
```

### 6. Close the wave

Update, when relevant:

- `docs/project/task-backlog.md`
- `docs/project/stabilization-status.md`
- the subsystem doc that matches the change
- `AGENTS.md` if the canonical phase or priorities changed

---

## Golden Rule

Always prefer:

- small waves
- explicit checks
- live docs
- explicit closure

Avoid:

- large changes with multiple goals
- broad refactors without guardrails
- documentation drift
