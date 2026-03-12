# TentacleWars Playtest Wave A

Date: 2026-03-12

## Scope

Visual browser playtest of the `TentacleWars` sandbox after the recent slice and clash fidelity changes.

Focus:

- sandbox entry flow
- AI pressure ramp
- clash readability
- slice / cut presentation
- lane density readability

## Artifacts

- `output/playwright/tw-playtest-start.png`
- `output/playwright/tw-playtest-5s.png`
- `output/playwright/tw-playtest-12s.png`
- `output/playwright/tw-playtest-wave-a-hud-lanes-start.png`
- `output/playwright/tw-playtest-wave-a-hud-lanes-5s.png`
- `output/playwright/tw-playtest-wave-a-hud-lanes-12s.png`
- `output/playwright/tw-playtest-player-neutral.png`
- `output/playwright/tw-playtest-player-attack.png`
- `output/playwright/tw-playtest-attack-plus5s.png`
- `output/playwright/tw-playtest-attack-plus10s.png`

## Observations

### Confirmed good

- entering `TentacleWars` from the main menu now drops straight into gameplay instead of leaving the menu shell visible
- the sandbox produces live multi-faction pressure quickly enough for visual inspection
- forced player expansion still works cleanly in the browser loop
- forced player attack produced a readable clash marker near the lane midpoint
- the midpoint-locked clash behavior remained visually stable across the later attack screenshots

### Remaining visual issues

- late-fight lane density becomes hard to parse quickly:
  - many active lanes converge into bright pale overlaps
  - player-vs-enemy ownership is less obvious once several lanes stack over each other
- the global HUD wordmark still says `NODE WARS` even inside the `TentacleWars` sandbox, which weakens mode identity
- the pinned node tooltip can dominate the center-top combat space during active playtesting and partially occlude the lane bundle being inspected
- clash readability is improved, but the `CLASH` label is still subtle under heavy overlap and would benefit from stronger local emphasis

### Slice-specific note

- this wave validated the slice runtime changes structurally and indirectly through the sandbox flow
- a more focused slice-only visual pass is still useful because the captured browser scenarios in this wave were dominated by macro lane pressure rather than repeated manual cuts

## Follow-up Validation

After the first pass, a targeted visual-language adjustment was applied:

- the HUD brand now switches to `TENTACLEWARS` inside the sandbox
- the sandbox HUD level title now shows the prototype mode title instead of the campaign shell label
- TentacleWars lanes now suppress part of the inherited white-heavy inner glow and membrane treatment
- owner-colored packet beads now run along active TentacleWars lanes
- clash labels received a small visibility boost

Artifacts for this follow-up validation:

- `output/playwright/tw-playtest-wave-a-hud-lanes-start.png`
- `output/playwright/tw-playtest-wave-a-hud-lanes-5s.png`
- `output/playwright/tw-playtest-wave-a-hud-lanes-12s.png`

Observed result:

- the sandbox identity is now materially clearer because the HUD brand reads `TENTACLEWARS`
- lane ownership is easier to parse at a glance because packet beads preserve owner color through overlap
- lane bundles are less washed out than before because the inherited white core treatment is reduced
- the midpoint clash marker remains stable and slightly easier to notice

Remaining gap after the follow-up:

- very dense late-fight intersections still lose some clarity once several hostile red lanes stack through the same corridor
- a dedicated TentacleWars lane pass can still push this further through stronger separation of packet rhythm, clash emphasis, and overlap handling

## Suggested next corrections

1. strengthen `TentacleWars` lane visual language under overlap
2. make sandbox mode identity more explicit in the HUD
3. reduce tooltip occlusion during live combat inspection
4. run a dedicated slice-only visual pass after those readability fixes
