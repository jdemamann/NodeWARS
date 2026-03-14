# TentacleWars Playtest Wave B

## Purpose

This wave reran TentacleWars visual and readability checks on top of deterministic sandbox presets so card semantics, slice feel, clash feel, and dense-overlap readability could be judged without random layout drift.

## Scenarios Used

- `grade-showcase`
- `capture-lab`
- `slice-lab`
- `clash-lab`
- `density-lab`

## Main Findings

- the TentacleWars HUD and cards now read from a mode-owned presentation model instead of leaking NodeWARS level formatting
- the grade showcase confirms the slot-cap reconciliation is visible in UI through the same `n.maxSlots` source used by gameplay
- slice and clash are now reproducible as fixed visual targets instead of depending on a lucky sandbox opening
- the current tentacle material pass is materially closer to TentacleWars than the previous NodeWARS-derived pipe look
- dense-overlap readability is improved enough to treat the remaining noise as polish, not fidelity drift

## Captures

- `output/playwright/matrix/grade-showcase-none.png`
- `output/playwright/matrix/grade-showcase-pin-node:5.png`
- `output/playwright/matrix/capture-lab-pin-node:3.png`
- `output/playwright/matrix/slice-lab-slice-primary.png`
- `output/playwright/matrix/clash-lab-none.png`
- `output/playwright/matrix/density-lab-none.png`

## Outcome

- `TASK-TW-017 TentacleWars Controlled Scenario Presets`: validated
- `TASK-TW-018 TentacleWars Sandbox Playtest and Tuning Wave B`: validated
- `TASK-TW-019 TentacleWars HUD and Card Fidelity Contract`: validated against fixed presets
- `TASK-TW-020 TentacleWars Node Grade Silhouette Pass`: validated
- `TASK-TW-021 TentacleWars Tentacle Motion and Material Pass`: validated

## Remaining Gap

- the current remaining visual risk is low-priority polish in extreme overlap states rather than a core TentacleWars fidelity mismatch
