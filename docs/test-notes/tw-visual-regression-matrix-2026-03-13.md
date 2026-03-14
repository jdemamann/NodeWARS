# TentacleWars Visual Regression Matrix

## Purpose

This matrix turns the main TentacleWars sandbox visual checks into a repeatable capture set that can be rerun after UI, renderer, or gameplay-facing presentation changes.

## Command

```bash
bash scripts/tw-visual-matrix.sh
```

## Artifacts

- `output/playwright/matrix/grade-showcase-none.png`
- `output/playwright/matrix/grade-showcase-pin-node:5.png`
- `output/playwright/matrix/capture-lab-pin-node:3.png`
- `output/playwright/matrix/slice-lab-slice-primary.png`
- `output/playwright/matrix/clash-lab-none.png`
- `output/playwright/matrix/density-lab-none.png`

## Coverage

- grade progression and per-grade silhouette read
- pinned card presentation and TentacleWars slot semantics
- neutral capture card semantics
- slice retraction visual behavior
- clash midpoint presentation
- dense-overlap lane readability

## Acceptance Notes

- grade labels must use TentacleWars naming, not NodeWARS numeric progression text
- slot presentation must foreground available TentacleWars capacity instead of sent-over-total semantics
- clash must remain visually pinned to lane midpoint
- slice must remain readable without giant target flash artifacts
- dense overlaps must keep owner identity and packet direction readable enough for manual playtest use
