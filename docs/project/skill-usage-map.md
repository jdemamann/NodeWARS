# Skill Usage Map

## Purpose

Map the installed Codex skills to the real workstreams in this project so future sessions can use them intentionally instead of guessing.

---

## Installed Skills

### `develop-web-game`

Use for:

- gameplay feel
- web-game interaction loops
- input polish
- tuning of player-facing feedback

Best fit in this project:

- tentacle feel
- click / drag / slice UX
- tutorial interaction polish
- gameplay readability improvements

Pair with:

- `docs/agents/gameplay-systems-agent.md`
- `docs/agents/ui-ux-agent.md`
- `npm run check:gameplay`

---

### `doc`

Use for:

- writing or restructuring technical or product documentation
- phase reports
- implementation specs
- release or milestone documentation

Best fit in this project:

- wave reports
- gameplay system docs
- balance and campaign reports
- operational handoff documents

Pair with:

- `docs/agents/code-commentary-agent.md`
- `docs/agents/narrative-localization-agent.md`

---

### `imagegen`

Use for:

- concept exploration
- UI or brand mockups
- visual direction studies
- logo or promo-art ideation

Best fit in this project:

- menu and HUD explorations
- campaign ending art direction
- world identity studies
- promotional material concepts

Pair with:

- `docs/agents/render-visual-language-agent.md`
- `docs/agents/ui-ux-agent.md`

---

### `playwright`

Use for:

- browser-driven flow validation
- UI regression checks
- menu and tutorial flows
- settings and screen transitions

Best fit in this project:

- settings toggles
- world selection
- tutorial entry / exit / pause flow
- campaign ending screen
- menu interaction regressions

Pair with:

- `docs/agents/qa-checks-agent.md`
- `docs/agents/meta-progression-agent.md`
- `npm run check:ui`

---

### `playwright-interactive`

Use for:

- interactive bug investigation
- difficult reproduction cases
- input problems that need manual observation

Best fit in this project:

- click reliability
- drag-and-drop targeting
- slice gestures
- tutorial step edge cases

Pair with:

- `docs/agents/qa-checks-agent.md`
- `docs/agents/ui-ux-agent.md`
- `docs/agents/gameplay-systems-agent.md`

---

### `screenshot`

Use for:

- visual inspection
- state comparison
- documenting UI or render regressions

Best fit in this project:

- canvas readability review
- menu/theme comparison
- notification system review
- ending screen polish

Pair with:

- `docs/agents/render-visual-language-agent.md`
- `docs/agents/ui-ux-agent.md`

---

### `spreadsheet`

Use for:

- structured balancing
- campaign pacing tables
- tuning matrices
- phase-by-phase comparison

Best fit in this project:

- authored campaign balancing
- wave planning for difficulty
- energy / pacing comparison by phase group

Pair with:

- `docs/agents/campaign-level-agent.md`
- `docs/agents/ai-behavior-agent.md`
- `docs/project/campaign-balance-wave-b-plan.md`

---

## Recommended Default Mapping

### For gameplay bugs

Use:

1. `develop-web-game`
2. `playwright-interactive` if reproduction is difficult
3. `screenshot` if visual evidence helps

### For UI or menu regressions

Use:

1. `playwright`
2. `playwright-interactive`
3. `screenshot`

### For balance work

Use:

1. `develop-web-game`
2. `spreadsheet`
3. `doc`

### For documentation and operational work

Use:

1. `doc`

### For visual direction work

Use:

1. `imagegen`
2. `screenshot`
3. `develop-web-game`

---

## Restart Guidance

Installed skills are only available after restarting Codex.

It is safe to restart when:

- the current wave is not in the middle of file edits
- the current validation run is already complete
- the intended handoff docs are already updated

There is no need to create extra tasks before restarting only to activate skills.
Finish the current wave cleanly, then restart.
