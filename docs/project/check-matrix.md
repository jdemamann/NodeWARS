# Check Matrix

## Purpose

This document says which checks to run for each kind of change.

Use it to avoid two mistakes:

- running too many checks for a small change
- running too few checks for a sensitive one

---

## Available Commands

### Gameplay / smoke

```bash
node scripts/smoke-checks.mjs
```

Protects:

- core mechanic invariants
- energy rules
- slice / burst / clash
- tutorial gating
- critical progression
- render/content guardrails

### UI actions

```bash
node scripts/ui-actions-sanity.mjs
```

Protects:

- button wiring
- i18n in settings/debug
- menu feedback
- font coverage
- clipboard fallback

### UI DOM-lite

```bash
node scripts/ui-dom-sanity.mjs
```

Protects:

- `showScr(...)`
- `refreshSettingsUI()`
- world tabs
- campaign ending screen

### Progression sanity

```bash
node scripts/game-state-progression-sanity.mjs
```

Protects:

- tutorial optionality
- world unlock routing
- next-level helpers
- manual world overrides
- skip/fail-streak rules

### Input harness

```bash
node scripts/input-harness.mjs
```

Protects:

- click intent resolution
- preview behavior
- tap promotion
- deterministic hit-testing

### Campaign sanity

```bash
node scripts/campaign-sanity.mjs
```

Protects:

- level ids and names
- world continuity
- mechanic placement
- structural support in late high-pressure phases

### Release readiness

```bash
node scripts/release-readiness.mjs
```

Protects:

- local bundled fonts
- packaging report presence
- release-domain package scripts

### Soak

```bash
node scripts/simulation-soak.mjs
```

Protects:

- long-run numerical stability

### Full local gate

```bash
npm run check
```

### Commentary policy

```bash
node scripts/commentary-policy.mjs
```

Protects:

- module headers in changed `src/*.js` files
- short block headers for newly added or modified function signatures
- English-only commentary policy in touched source files

---

## Matrix By Change Type

### Core gameplay

Examples:

- energy
- tentacles
- clash
- slice
- burst
- capture
- ownership

Suggested agent:

- `docs/agents/gameplay-systems-agent.md`

Run:

- `smoke-checks`
- `commentary-policy` when source files were changed
- `simulation-soak`

Add:

- `campaign-sanity` if the change touches level config or authored layouts

### AI / factions

Examples:

- target selection
- red/purple behavior
- relay usage
- coalition capture

Suggested agent:

- `docs/agents/ai-behavior-agent.md`

Run:

- `smoke-checks`
- `commentary-policy` when source files were changed
- `simulation-soak`

Add:

- `campaign-sanity` if the change affects campaign pacing

### Campaign / tutorial / progression

Examples:

- unlocks
- next-level flow
- tutorial optionality
- fixed layouts
- bosses

Suggested agent:

- `docs/agents/meta-progression-agent.md`

Run:

- `campaign-sanity`
- `commentary-policy` when source files were changed
- `smoke-checks`

Add:

- `ui-actions-sanity`
- `ui-dom-sanity`

### Menus / settings / HUD / screens

Examples:

- settings
- story
- credits
- pause
- result
- ending
- language
- button sound feedback

Suggested agents:

- `docs/agents/ui-ux-agent.md`
- `docs/agents/narrative-localization-agent.md` when text, story, credits, or ending copy changes

Run:

- `commentary-policy` when source files were changed
- `ui-actions-sanity`
- `ui-dom-sanity`

Add:

- `smoke-checks` if the UI reflects gameplay or persistence rules

### Render / visuals / fonts / graphics

Examples:

- HIGH / LOW
- canvas labels
- typography assets
- background / pulse / node visuals

Suggested agent:

- `docs/agents/render-visual-language-agent.md`

Run:

- `smoke-checks`
- `commentary-policy` when source files were changed
- `ui-actions-sanity`

Add:

- `ui-dom-sanity` if screens or menus are touched
- `simulation-soak` if the render loop or animation timing changes

### Music / soundtrack / theme identity

Examples:

- menu theme
- world music identity
- ending music
- procedural motif changes
- music lifecycle tied to screen flow

Suggested agent:

- `docs/agents/music-theme-agent.md`

Run:

- `ui-actions-sanity`
- `smoke-checks`

Add:

- `ui-dom-sanity` if the change is tied to screens or ending flow
- `npm run check` if lifecycle or settings integration changes materially

### Local persistence

Examples:

- saved settings
- progress
- fail streak
- current level

Suggested agent:

- `docs/agents/meta-progression-agent.md`

Run:

- `smoke-checks`
- `ui-actions-sanity`
- `ui-dom-sanity`

### Content / authored levels

Examples:

- fixed layouts
- bosses
- authored tutorials
- phase pacing
- structural player opening support

Suggested agent:

- `docs/agents/content-authored-levels-agent.md`

Run:

- `campaign-sanity`
- `smoke-checks`

Add:

- `ui-actions-sanity`
- `ui-dom-sanity` when tutorial or campaign screens are involved

### Desktop / Android readiness

Examples:

- local assets
- fonts
- build scripts
- runtime portability

Suggested agent:

- `docs/agents/performance-build-agent.md`

Run:

- `npm run check`

### Check infrastructure / QA

Examples:

- new smoke guardrails
- check command reorganization
- new DOM-lite suite
- reclassification of checks by domain

Suggested agent:

- `docs/agents/qa-checks-agent.md`

Run:

- `npm run check`

### Comments / readability / code alignment

Examples:

- function comments
- config comments
- stale comment cleanup
- comment/implementation alignment

Suggested agent:

- `docs/agents/code-commentary-agent.md`

Run:

- the checks for the domain touched

---

## Recommended Operating Rule

If there is any doubt:

```bash
npm run check
```

If the change is small and tightly scoped:

- run the minimum domain checks from this matrix
- document in the closing note which checks were run
