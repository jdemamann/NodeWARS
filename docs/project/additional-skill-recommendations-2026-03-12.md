# Additional Skill Recommendations

## Purpose

Identify the remaining curated Codex skills that would add real leverage to the current `NodeWARS` / `TentacleWars` development flow.

This report assumes the currently installed skills remain the baseline:

- `develop-web-game`
- `doc`
- `imagegen`
- `playwright`
- `playwright-interactive`
- `screenshot`
- `spreadsheet`

---

## Executive Summary

The project already has the most important day-to-day skills installed.

The next skills worth adding are the ones that would improve:

1. prototype analysis and balancing
2. authored content and visual iteration
3. deployment and runtime monitoring

The strongest additions are:

1. `jupyter-notebook`
2. `figma`
3. `figma-implement-design`
4. `sentry`
5. `pdf`

Everything else is either optional, organization-specific, or only useful once release/distribution becomes the active workstream.

---

## Recommended Skills

### 1. `jupyter-notebook`

### Why it fits

This project is now at the point where balancing, packet-model experiments, audio extraction summaries, and TentacleWars fidelity analysis would benefit from structured exploratory analysis.

### Best uses in this repo

- compare `NodeWARS` and `TentacleWars` packet/feed models
- tune overflow and throughput curves
- inspect phase pacing by level group
- analyze music extraction data from `tmp/audio-analysis/`
- produce charts for:
  - grade thresholds
  - packet throughput
  - hostile capture carryover
  - AI pressure curves

### Value level

`Very high`

### Recommended timing

Install soon, before deeper TentacleWars balancing begins.

---

### 2. `figma`

### Why it fits

The project now has enough UI surfaces that structured visual planning could save time:

- Settings
- Level Select
- HUD
- Ending screen
- TentacleWars mode presentation
- future debug-only visual editor concepts

### Best uses in this repo

- mock up TentacleWars mode UI before implementation
- plan a phase editor layout
- test alternative HUD/mobile layouts
- align future visual polish without trial-and-error in CSS

### Value level

`High`

### Recommended timing

Install when UI iteration becomes active again.

---

### 3. `figma-implement-design`

### Why it fits

If a Figma file becomes the source of truth for the next UI wave, this would reduce translation loss between design and implementation.

### Best uses in this repo

- implementing TentacleWars-specific screens
- debug editor UI
- final polish of credits/ending/settings/level select

### Value level

`High if Figma is used`, otherwise `low`

### Recommended timing

Install together with `figma`, but only if Figma becomes part of the workflow.

---

### 4. `sentry`

### Why it fits

This project already has good local guardrails, but once real distributions exist, local checks stop being enough.

### Best uses in this repo

- capture runtime boot failures
- detect production-only menu/input regressions
- monitor desktop/mobile packaged builds
- catch browser/device-specific crashes in the future

### Value level

`High for release readiness`

### Recommended timing

Install before Linux/Android/web release distribution becomes active.

---

### 5. `pdf`

### Why it fits

This repo already depends heavily on documents:

- operating model
- TentacleWars adaptation studies
- reports
- architecture proposals

### Best uses in this repo

- exporting milestone reports
- turning architecture studies into clean deliverables
- packaging shareable review docs for design and external collaborators

### Value level

`Moderate`

### Recommended timing

Install if document export becomes part of the workflow.

---

## Conditional / Context-Dependent Skills

### `transcribe`

Useful only if future analysis depends on:

- spoken design reviews
- voice memos for balancing notes
- audio annotation workflow

For the current repo, this is not a priority.

### `speech`

Useful only if the project adds spoken content or voice tooling.

Not currently needed.

### `slides`

Good for pitching, milestone presentation, or public-facing deck work.

Not necessary for development itself.

### `linear`

Only useful if the project is going to move from the local markdown backlog/kanban to Linear.

Today the project already has a working local operational system, so this is optional.

### `openai-docs`

Only useful if the project begins integrating OpenAI APIs directly.

Not currently relevant.

### `render-deploy`, `netlify-deploy`, `vercel-deploy`, `cloudflare-deploy`

Useful only once hosted deployment becomes active work.

At the moment:

- Linux/Android packaging is more relevant than web deployment automation
- these can wait

### `security-best-practices`, `security-ownership-map`, `security-threat-model`

These are not wrong choices, but they are not where the project gets the most value right now.

Good later for:

- packaged release hardening
- external hosting
- telemetry

Not current priorities.

### `gh-fix-ci`, `gh-address-comments`

Useful if GitHub CI and PR review volume become part of normal team flow.

Today the project is still more local and iterative than PR-driven, so these are optional.

---

## Not Recommended Right Now

These do not match the current project direction:

- `aspnet-core`
- `chatgpt-apps`
- `winui-app`
- `yeet`
- most Notion-related skills unless the project intentionally moves to Notion as the operational hub

---

## Best Next Install Set

If the goal is to improve the project meaningfully without adding noise, install in this order:

1. `jupyter-notebook`
2. `figma`
3. `figma-implement-design`
4. `sentry`
5. `pdf`

---

## Rationale by Workstream

### TentacleWars simulation work

Best skill addition:

- `jupyter-notebook`

Why:

- supports model comparisons
- helps validate packet/overflow rules visually
- makes tuning more rigorous

### UI / visual authoring

Best skill additions:

- `figma`
- `figma-implement-design`

Why:

- supports structured UI iteration
- lowers friction for future editor/debug UI work

### Release / production readiness

Best skill addition:

- `sentry`

Why:

- bridges the gap between local checks and real users

### Documentation / sharing

Best skill addition:

- `pdf`

Why:

- allows polished exports of key studies and proposals

---

## Recommended Decision

Install now:

- `jupyter-notebook`

Install next if UI/editor design becomes active:

- `figma`
- `figma-implement-design`

Install later when release work starts:

- `sentry`

Install if shareable reporting becomes important:

- `pdf`
