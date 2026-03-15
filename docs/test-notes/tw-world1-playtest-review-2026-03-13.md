# TentacleWars World 1 Playtest and Reconstruction Review

Date: `2026-03-13`
Task: `TASK-TWL-009 TentacleWars World 1 Playtest and Reconstruction Review`

## Scope

This review closes the first full World 1 inspection pass after authoring.

It combines:

- browser runtime inspection for all `W1-01..W1-20`
- representative visual spot checks across onboarding, mid-curve, obstacle, and boss phases
- authored-data review from [TwWorld1.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/levels/TwWorld1.js)
- balance review from [tw-balance-matrix.csv](/home/jonis/.claude/projects/nodewars-v2-codex/docs/tentaclewars/tw-balance-matrix.csv)

Counterpoint:

- this is a reproducible browser review pass, not a claim that all 20 phases were personally full-cleared by hand in this wave
- any approval of `TWL-009` should be interpreted as "World 1 is structurally ready to move forward with documented follow-up issues", not "final balance is closed forever"

## Evidence

Full World 1 capture set:

- directory: [output/playwright/world1-review](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/world1-review)
- coverage: `W1-01.png` through `W1-20.png`
- capture helper: [tw-world1-playtest-capture.sh](/home/jonis/.claude/projects/nodewars-v2-codex/scripts/tw-world1-playtest-capture.sh)

Representative spot checks:

- [W1-01.png](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/world1-review/W1-01.png)
- [W1-05.png](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/world1-review/W1-05.png)
- [W1-10.png](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/world1-review/W1-10.png)
- [W1-16.png](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/world1-review/W1-16.png)
- [W1-20.png](/home/jonis/.claude/projects/nodewars-v2-codex/output/playwright/world1-review/W1-20.png)

Browser observations:

- all 20 authored phases loaded successfully through the live runtime
- no page errors surfaced during capture
- console output was limited to expected autoplay `AudioContext` warnings
- obstacle phases remained readable with the current circle-blocker runtime
- boss closure still reads as a proper escalation rather than a random density spike

## Curve Review

World 1 still maps cleanly to the intended skeleton:

- `W1-01..W1-04`
  - onboarding: connect, neutral conversion, slice intro, support-loop reading
- `W1-05..W1-08`
  - first route decisions and expansion timing
- `W1-09..W1-12`
  - central pressure and first stronger multi-hostile reads
- `W1-13..W1-16`
  - obstacle introduction and reinforcement
- `W1-17..W1-19`
  - mastery checks for cuts, disruption, and support shaping
- `W1-20`
  - World 1 closure with layered hostile pressure

## Par Review

Current par ladder:

- starts at `36s` in `W1-01`
- rises steadily through `154s` in `W1-19`
- final boss sits at `164s` in `W1-20`

Assessment:

- the ladder is structurally coherent and monotonic
- the onboarding band is conservative enough for first-read clarity
- the obstacle band does not spike disproportionately relative to phase count and density
- `W1-16` and `W1-20` are the main candidates for later human-clear recalibration if live sessions show repeated overshoot

Recommendation:

- keep the current par values for now
- re-open only after recorded human clears produce evidence that the last obstacle band or the boss are consistently over/under target

## Reconstruction Notes Per Phase

| Phase | Matches source intent | Divergence | Why the divergence is acceptable now |
| --- | --- | --- | --- |
| `W1-01` | pure one-lane onboarding | not pixel-matched to original coordinates | structural reconstruction only |
| `W1-02` | neutral bridge before direct attack | simplified to one clear center pivot | cleaner onboarding readability |
| `W1-03` | first slice-pressure read | symmetric 2v2 shell | clearer first slice lesson |
| `W1-04` | support before final push | extra allied forward anchor | helps teach feed/support without extra UI |
| `W1-05` | first obstacle routing phase | one circle blocker instead of organic shape | phase-one obstacle runtime is static circles |
| `W1-06` | route-choice expansion | fully mirrored neutral branches | cleaner post-obstacle pacing |
| `W1-07` | twin-front red punishment | fewer node types than a richer original map might use | keeps World 1 readable |
| `W1-08` | asymmetric pressure | compressed layout | preserves fast threat scan |
| `W1-09` | central strong defender | simplified side escorts | keeps first stronghold legible |
| `W1-10` | three-front pressure | more explicit central neutral pivot | reinforces route discipline |
| `W1-11` | wide expansion check | safer neutral spacing | avoids accidental maze feel |
| `W1-12` | side-trim then breach | escorts are cleaner and more geometric | structural fidelity over visual mimicry |
| `W1-13` | obstacle wave begins | circles replace organic blockers | matches approved World 1 obstacle scope |
| `W1-14` | obstacle-assisted center contest | simplified blocker grouping | keeps middle pivot readable |
| `W1-15` | commitment-routing check | triple blockers are spaced wider than a harsher original could be | avoids premature World 3 density |
| `W1-16` | densest non-boss obstacle phase | obstacle pattern is still clean and circular | world-one readability takes priority |
| `W1-17` | repeated cut/disruption mastery | chains are symmetric and explicit | helps validate slice pressure clearly |
| `W1-18` | support-loop mastery | wider player opening support | consistent with earlier authored structural-support philosophy |
| `W1-19` | pre-boss endurance | neutral web is slightly cleaner than a raw reconstruction could be | protects late World 1 clarity |
| `W1-20` | boss closure with choke and stronghold | boss shell is authored for readability rather than exact map mimicry | acceptable under structural-reconstruction target |

## Known Balance Issues

- `W1-16` is the current upper bound for obstacle density.
  - If later human clears report route-reading fatigue, this phase should be tuned before widening obstacle complexity in World 2.
- `W1-17` and `W1-18` may compress together because both sit in the mastery band without obstacles.
  - If live clears show redundant feel, adjust hostile staging rather than global numbers first.
- `W1-20` likely needs the first real par recheck once human boss clears are recorded.
  - The structure reads correctly, but boss timing cannot be considered final from screenshot/runtime review alone.

## Validation

- `node scripts/tw-campaign-sanity.mjs`
- `node scripts/smoke-checks.mjs`
- `node scripts/commentary-policy.mjs`

All passed.

## Review Conclusion

World 1 is ready to move past raw authoring and into the next world without reopening its structure.

What this review closes:

- full authored World 1 runtime inspection
- reconstruction deviations are documented per phase
- current par ladder is coherent enough to keep
- known future balance risks are explicit

What this review does not claim:

- pixel-perfect recreation
- final human-clear tuned par values
- zero future balance adjustments
