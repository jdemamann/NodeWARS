# Cross-Disciplinary Technical Review

## Format

This document simulates a full technical review meeting with the project disciplines that matter most for NodeWARS:

- senior engineering
- gameplay / mechanics engineering
- frontend engineering
- UI design
- level design
- game design
- audio engineering
- performance engineering
- QA / test engineering

The goal is not ceremony. The goal is to identify what is truly finished, what is only partially stabilized, and what should become the next task wave.

## Executive Summary

The project is in a materially stronger state than the original baseline.

What is clearly in good shape:

- core gameplay invariants now have lightweight guardrails
- relay, slice, ownership, AI relay targeting, and tutorial/input consistency are much cleaner
- campaign configuration is explicit and readable
- structure and naming are now professional enough for ongoing development

What is still not “finished” despite the progress:

- the last dense gameplay files are still dense
- the UI/screen layer still mixes orchestration, DOM composition, and product logic
- some rendering/theme logic is still duplicated instead of fully canonical
- long-run simulation confidence is still weaker than short invariant confidence
- campaign balance is planned, but not yet operationally executed phase by phase

## Status Check Against Existing Tasks

### Clearly fulfilled

- `TASK-001 Ownership Transition Canonicalization`
- `TASK-002 Player Relay Interaction Consistency`
- `TASK-003 Contest Logic Generalization for All Owners`
- `TASK-005 Energy Budget Resolver Extraction`
- `TASK-010 Input Threshold Parameterization`
- `TASK-015 Backlog and Documentation Reconciliation`

### Functionally fulfilled, but still worth a light closing pass

- `TASK-004 Gameplay Comments and Doc Alignment`
- `TASK-007 Ownership Color Canonicalization Completion`
- `TASK-008 AI Action Canonicalization Audit`
- `TASK-012 Critical Naming Pass`

### Improved substantially, but not fully complete

- `TASK-006 Tentacle Lifecycle Split`
- `TASK-009 Domain Config Taxonomy`
- `TASK-011 Game.js Orchestration Reduction`
- `TASK-013 World Mechanics Boundary Isolation`
- `TASK-014 Final Tentacle Decomposition`

## Review Findings

### 1. Senior Engineering Review

Primary reading:

- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js)
- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js)
- [WorldSystems.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/WorldSystems.js)
- [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)

Assessment:

- the codebase has crossed the line from “fragile prototype” into “maintainable production prototype”
- the remaining risk is now concentrated, not spread everywhere
- the biggest structural hotspots are still easy to identify

Primary concerns:

- [Game.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/Game.js) is still very large at 945 lines
- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js) remains the densest gameplay file at 645 lines
- [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js) still mixes screen orchestration, DOM creation, string templates, and product rules

Conclusion:

- architecture is now coherent enough to continue
- the next engineering gains come from targeted decomposition, not another broad reorg

### 2. Gameplay / Mechanics Engineering Review

Primary reading:

- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js)
- [EnergyBudget.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/EnergyBudget.js)
- [WorldSystems.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/WorldSystems.js)
- [AI.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/AI.js)

Assessment:

- the core economy is much healthier than before
- retract, clash, burst, relay forwarding, and AI burst parity are on the right side now

Primary concerns:

- [Tent.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Tent.js) still owns too many concerns at once:
  - lifecycle
  - clash math
  - capture application
  - cut semantics
  - burst resolution
- [WorldSystems.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/WorldSystems.js) still contains several unrelated systems in one runtime surface:
  - vortexes
  - pulsars
  - relays
  - fog
  - signal towers
  - auto-retract
  - camera

Conclusion:

- mechanics are much safer
- the next risk is maintainability under future balance work, not immediate correctness

### 3. Frontend Engineering Review

Primary reading:

- [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)
- [HUD.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/HUD.js)
- [main.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/main.js)

Assessment:

- menus, settings, themes, and HUD are much stronger than before
- naming is far better
- the layer is still serviceable, but not yet clean enough for rapid UI iteration

Primary concerns:

- [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js) still builds substantial HTML through string assembly
- world tabs, level buttons, and result screen content still mix formatting and state derivation
- UI state transitions are spread across direct DOM writes instead of smaller screen-specific helpers

Conclusion:

- no urgent UI engineering failure
- there is a clear next refactor seam: split screen composition by screen

### 4. UI Design Review

Primary reading:

- [UIRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/UIRenderer.js)
- [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js)
- [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)
- [main.css](/home/jonis/.claude/projects/nodewars-v2-codex/styles/main.css)

Assessment:

- the game is much more readable and attractive than the baseline
- the major HUD and phase-feedback problems were addressed

Primary concerns:

- some visual language is still duplicated rather than centrally themed
- [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js) still carries local owner palette arrays instead of fully delegating to [ownerPalette.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/theme/ownerPalette.js)
- screen-level UI consistency would improve if result, level-select, and world-banner cards shared more explicit composition helpers

Conclusion:

- visual quality is now strong enough to support playtesting
- the next UI pass should be about consistency and theme ownership, not more decoration

### 5. Level Design Review

Primary reading:

- [fixed-campaign-review.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/level-design/fixed-campaign-review.md)
- [campaign-balance-matrix.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/campaign-balance-matrix.md)
- [priority-phase-balance-pass.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/priority-phase-balance-pass.md)
- [gameConfig.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/config/gameConfig.js)

Assessment:

- campaign structure is now well understood
- authored-level priorities are clear
- the team has enough design material to start real phase tuning

Primary concerns:

- the balance plan exists, but the tuning loop itself has not yet been executed
- there is still no historical record of observed fail reasons per phase
- static sanity checks do not replace actual phase outcomes and player confusion analysis

Conclusion:

- level design is ready for operational balancing
- the next phase should shift from planning to evidence collection

### 6. Game Design Review

Primary reading:

- [playtest-balance-plan.md](/home/jonis/.claude/projects/nodewars-v2-codex/docs/project/playtest-balance-plan.md)
- [gameConfig.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/config/gameConfig.js)

Assessment:

- the game has a clearer identity now:
  - connect
  - route
  - drain
  - capture
  - cut
  - infrastructure control

Primary concerns:

- `par` values and phase pressure are still mostly pre-playtest assumptions
- World 2 and World 3 likely still contain spikes that only show up in real play
- final campaign quality now depends more on tuning than on new engineering

Conclusion:

- game design risk has shifted from “broken mechanics” to “experience curve”

### 7. Audio Engineering Review

Primary reading:

- [Music.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/audio/Music.js)
- [SoundEffects.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/audio/SoundEffects.js)

Assessment:

- naming and structure improved
- the audio layer is locally understandable

Primary concerns:

- no lightweight guardrail exists for event spam or audio burst conditions
- there is no explicit review yet of whether repeated events can over-trigger sounds during high-chaos fights

Conclusion:

- audio is not currently a blocker
- it deserves one targeted polish/audit pass before final release-quality balancing

### 8. Performance Engineering Review

Primary reading:

- [Renderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/Renderer.js)
- [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js)
- [TentRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/TentRenderer.js)
- [Orb.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Orb.js)

Assessment:

- the explicit `LOW/HIGH` graphics split was a strong move
- orb pooling and low-graphics degradation are good foundations

Primary concerns:

- no actual performance instrumentation exists beyond FPS display
- render complexity still scales heavily with:
  - node count
  - tentacle count
  - pulses, gradients, shadows, text
- there is no automated budget check or stress harness for dense late-game phases

Conclusion:

- current performance engineering is pragmatic but still mostly reactive
- next step should be instrumentation, not blind optimization

### 9. QA / Test Engineering Review

Primary reading:

- [smoke-checks.mjs](/home/jonis/.claude/projects/nodewars-v2-codex/scripts/smoke-checks.mjs)
- [campaign-sanity.mjs](/home/jonis/.claude/projects/nodewars-v2-codex/scripts/campaign-sanity.mjs)

Assessment:

- this is one of the biggest improvements in the repository
- core invariants are now protected in a cheap, repeatable way

Primary concerns:

- coverage is still short-horizon
- there is no long-run simulation soak check for:
  - stalled matches
  - escalating orb counts
  - runaway visual event queues
  - repeated ownership churn

Conclusion:

- tests are strong for invariants
- the next useful layer is soak and stress validation, not a giant framework

## Consolidated Risk Ranking

### Highest remaining risks

1. Long-run gameplay confidence is weaker than short invariant confidence.
2. `Tent.js` and `Game.js` are still denser than the rest of the architecture.
3. `WorldSystems.js` still groups too many world-layer mechanics.
4. Campaign balance is planned but not yet executed through actual tuning loops.

### Medium remaining risks

1. palette/theme logic is not fully canonical in every renderer
2. screen composition is still more monolithic than ideal
3. audio event density has not been explicitly audited

### Low remaining risks

1. historical documentation drift
2. residual local short names in low-risk files

## Recommended New Task Wave

### TASK-016 Render Palette Canonicalization Final Pass

- Owner: `render-owner`
- Priority: `medium`
- Size: `small`

Goal:

- remove remaining local owner palette duplication and finish palette ownership through [ownerPalette.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/theme/ownerPalette.js)

### TASK-017 Screen Composition Split

- Owner: `frontend-owner`
- Priority: `medium`
- Size: `medium`

Goal:

- split [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js) into smaller screen-focused builders without changing behavior

### TASK-018 World Systems Decomposition Final Pass

- Owner: `architecture-owner`
- Priority: `high`
- Size: `medium`

Goal:

- split [WorldSystems.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/systems/WorldSystems.js) by mechanic while keeping one coordinator entry point

### TASK-019 Long-Run Simulation Soak Checks

- Owner: `test-owner`
- Priority: `high`
- Size: `medium`

Goal:

- add a lightweight deterministic soak harness for long-run simulation confidence

### TASK-020 Render Performance Instrumentation

- Owner: `performance-owner`
- Priority: `medium`
- Size: `small`

Goal:

- add internal counters and a debug-facing performance summary for render complexity

### TASK-021 Campaign Balance Execution Wave A

- Owner: `level-owner`
- Priority: `high`
- Size: `medium`

Goal:

- execute actual tuning on the critical phases already identified in the balance docs

### TASK-022 Audio Event Density Audit

- Owner: `sound-owner`
- Priority: `low`
- Size: `small`

Goal:

- verify that dense gameplay moments do not over-trigger or muddy audio feedback

## Final Recommendation

The project should now stop doing broad foundational rework.

The next productive cycle is:

1. finish the last concentrated structural seams
2. add soak/performance guardrails
3. run the first true balance wave on critical phases

That is the highest-leverage path from “stable codebase” to “excellent game experience”.
