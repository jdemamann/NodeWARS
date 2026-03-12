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

### `jupyter-notebook`

Use for:

- exploratory balancing
- packet-model comparison
- overflow and throughput analysis
- audio extraction summaries
- prototype data visualization

Best fit in this project:

- TentacleWars packet runtime tuning
- overflow-mode comparison
- grade-threshold analysis
- soundtrack reconstruction analysis

Pair with:

- `docs/agents/gameplay-systems-agent.md`
- `docs/agents/ai-behavior-agent.md`
- `spreadsheet`

---

### `figma`

Use for:

- UI concepting
- authored layout planning
- debug editor mockups
- screen composition exploration

Best fit in this project:

- TentacleWars mode presentation
- future phase editor UI
- mobile HUD cleanup studies

Pair with:

- `docs/agents/ui-ux-agent.md`
- `docs/agents/render-visual-language-agent.md`

---

### `figma-implement-design`

Use for:

- translating approved Figma work into implementation
- reducing design drift during UI waves

Best fit in this project:

- TentacleWars menu/sandbox UI
- future phase editor implementation
- structured HUD refinements

Pair with:

- `figma`
- `docs/agents/ui-ux-agent.md`

---

### `pdf`

Use for:

- exporting formal project reports
- packaging architecture and milestone documents
- producing review-ready deliverables

Best fit in this project:

- TentacleWars architecture studies
- milestone snapshots
- handoff and review documents

Pair with:

- `doc`
- `docs/agents/code-commentary-agent.md`

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

### `sentry`

Use for:

- runtime error monitoring
- release-time crash capture
- production-only UI and input regression visibility

Best fit in this project:

- future Linux/Android packaging
- browser-distributed builds
- post-release health tracking

Pair with:

- `docs/agents/performance-build-agent.md`
- `docs/agents/qa-checks-agent.md`

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

## Audio Reconstruction Mapping

For authored soundtrack reconstruction from a source audio file:

1. read `docs/agents/audio-reconstruction-agent.md`
2. follow `docs/project/linux-audio-extraction-playbook.md`
3. use the package layout in:
   - `tmp/audio-analysis/<track-slug>/`
4. use `doc` for the extraction report or wave summary if needed
5. validate with:
   - `node scripts/smoke-checks.mjs`
   - `node scripts/commentary-policy.mjs`
   - `npm run check` when the player or runtime lifecycle changes

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
4. `jupyter-notebook`

### For documentation and operational work

Use:

1. `doc`
2. `pdf` when a polished export is useful

### For visual direction work

Use:

1. `imagegen`
2. `screenshot`
3. `develop-web-game`
4. `figma` if the direction needs structured visual iteration

### For TentacleWars systems analysis

Use:

1. `develop-web-game`
2. `jupyter-notebook`
3. `spreadsheet`
4. `doc`

### For release readiness and production monitoring

Use:

1. `sentry`
2. `playwright`
3. `doc`

---

## Restart Guidance

Installed skills are only available after restarting Codex.

It is safe to restart when:

- the current wave is not in the middle of file edits
- the current validation run is already complete
- the intended handoff docs are already updated

There is no need to create extra tasks before restarting only to activate skills.
Finish the current wave cleanly, then restart.
