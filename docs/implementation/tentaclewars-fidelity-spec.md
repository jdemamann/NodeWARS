# Tentacle Wars Fidelity Spec

## Goal

This document defines how to re-orient NodeWARS toward a more Tentacle Wars-faithful implementation, based on the current repository state.

It does not prescribe a full rewrite. It identifies which current mechanics should be preserved, which need reinterpretation, and which are likely fidelity-breaking additions.

## High-Priority Original Pillars

These should be treated as non-negotiable fidelity anchors:

- draw-to-connect tentacles
- drain/capture through tentacles
- slicing/cutting tentacles as a core tactic
- cell growth/evolution increasing offensive power
- responsive touch/mouse interaction

## Current Gameplay Surface Reviewed

Primary sources:

- `src/core/Game.js`
- `src/entities/Tent.js`
- `src/entities/GameNode.js`
- `src/systems/Physics.js`
- `src/systems/AI.js`
- `src/config/gameConfig.js`

## Classification Framework

### Core and Compatible

Mechanics that clearly fit the Tentacle Wars direction and should survive intact or with only tuning.

### Ambiguous

Mechanics that could be acceptable depending on the fidelity target, but need an explicit design call.

### Likely Divergence

Mechanics that are likely outside a Tentacle Wars-faithful core and should be removed, disabled, or isolated behind a non-fidelity mode.

## A. KEEP

These are the parts of the current game that are most compatible with a Tentacle Wars-faithful direction.

### 1. Click/tap-to-select, then connect by targeting another cell

Current implementation:

- `src/core/Game.js` input and click handling
- `src/entities/Tent.js` growing to active tentacle path

Why keep:

- This is the central interaction loop.
- It preserves direct tentacle authorship and immediate tactical readability.

### 2. Tentacle-mediated transfer, capture, and attack

Current implementation:

- `src/entities/Tent.js:_updateNormal()`

Why keep:

- Energy is not teleported; it travels through the tentacle and affects ally, neutral, or enemy targets through the same conduit.
- This is one of the strongest fidelity-aligned systems already present.

### 3. Tentacle slicing as a first-class tactic

Current implementation:

- `src/core/Game.js:checkSlice()`
- `src/entities/Tent.js:applySliceCut()`, `kill()`, `_updateBursting()`

Why keep:

- Cutting tentacles is already treated as an active combat skill, not a peripheral gimmick.
- That lines up with the intended “cutting as core tactic” pillar.

### 4. Growth/evolution tied to combat strength

Current implementation:

- `src/entities/GameNode.js` level derived from energy
- `src/config/gameConfig.js` tier regen, slot count
- `src/math/simulationMath.js` offensive/defensive scaling helpers

Why keep:

- Cells become stronger as they grow.
- Offensive throughput and survivability scaling from growth is directionally faithful.

### 5. Direct mouse and touch support

Current implementation:

- `src/input/GameInputBinding.js`
- `src/core/Game.js`

Why keep:

- Responsive pointer control is essential to the original feel.
- The current code already supports both mouse and touch with low ceremony.

### 6. Distance-aware tentacle build commitment

Current implementation:

- `src/core/Game.js` build-cost check
- `src/entities/Tent.js` progressive payment during growth

Why keep:

- Paying to extend a line and committing resources into a connection supports the physical, analog feel of the system.

## B. REWORK

These are important mechanics, but the current implementation is either ambiguous or notably off from a stricter Tentacle Wars interpretation.

### 1. Input model should move toward true draw-to-connect, not click-to-connect only

Current state:

- The game currently uses select-then-click targeting for connection creation.
- Slicing already uses drawn gestures.

Why rework:

- The requested fidelity pillar explicitly prioritizes draw-to-connect tentacles.
- Current input is usable and responsive, but not yet aligned with that pillar.

Recommended direction:

- Preserve current responsiveness.
- Add or migrate toward drag/draw connection creation as the primary fidelity mode.

### 2. Energy generation / drain model needs an explicit fidelity decision

Current state:

- `GameNode.update()` always regenerates.
- `Tent._updateNormal()` and `_updateClash()` drain outgoing feed separately.
- Relays now forward buffered input only.

Why rework:

- The current model is coherent, but it mixes “always regen” with “drain to preserve zero-sum.”
- For fidelity, the project should choose one canonical rule and document it clearly.

Recommended direction:

- Tighten the model around “source budget is what tentacles can move.”
- Remove remaining documentation and balancing assumptions that imply a softer split model.

### 3. Slice result mapping needs documentation and design normalization

Current state:

- The implemented cut-zone mapping is:
  - near source: burst
  - middle: split cut
  - near target: refund

Why rework:

- Even if this is now accepted as the project’s correct behavior, it should be treated as a deliberate house rule unless validated against the target reference.
- It is central enough that fidelity mode needs one stable, documented answer.

Recommended direction:

- Keep the canonical shared entry point.
- Decide whether this exact zone mapping is the fidelity target or a NodeWARS-specific variation.

### 4. Clash / instant counter-attack behavior should be tuned for feel, not expanded

Current state:

- Opposing active or growing tentacles can enter instant clash / tug-of-war states.

Why rework:

- This is compatible in spirit, but highly sensitive to tuning.
- The system should remain simple and tactile, not become an abstract combat minigame.

Recommended direction:

- Preserve clash as a readable physical confrontation.
- Rework only if tempo or resolution feels less direct than the target experience.

### 5. AI should be reworked toward fidelity, but kept lightweight

Current state:

- `src/systems/AI.js` uses heuristic source/target scoring.
- Relay targeting and shared burst entry have recently been improved.

Why rework:

- Heuristic AI is fine for fidelity, but it should be judged by whether it produces recognizable Tentacle Wars-style pressure.
- Special AI rules should not introduce mechanics players do not also use.

Recommended direction:

- Keep the lightweight heuristic model.
- Prefer shared player-facing mechanics and better timing/target heuristics over bespoke AI-only rules.

### 6. Relay nodes are ambiguous and should be treated as optional fidelity content

Current state:

- Relays act as captured infrastructure that amplifies outgoing flow from the relay.

Why rework:

- They now behave more cleanly, but they are not part of the high-priority original pillars.
- They may still be suitable as optional later-world content, not as baseline fidelity gameplay.

Recommended direction:

- Keep them out of “pure fidelity” mode unless validated as compatible enough.
- If retained, keep them infrastructure-only and mechanically subordinate to the core tentacle loop.

## C. REMOVE or DISABLE

These mechanics are the strongest candidates for removal or default disablement in a Tentacle Wars-faithful mode.

### 1. World hazards: vortex drain fields

Current implementation:

- `src/systems/Physics.js:updateVortex()`

Why remove or disable:

- They add environmental routing puzzles on top of the base cell war.
- This is a substantial layer beyond the core pillars and changes the match from cell-versus-cell into map gimmick management.

### 2. Pulsars / periodic broadcast energy

Current implementation:

- `src/systems/Physics.js:updatePulsar()`

Why remove or disable:

- Free periodic area energy injections are a major external pacing system.
- They shift emphasis away from line management and local tactical cuts.

### 3. Signal towers / temporary full-map reveal

Current implementation:

- `src/systems/Physics.js:updateSignalTower()`
- `src/systems/Physics.js:updateFog()`

Why remove or disable:

- Fog reveal towers introduce a meta-layer that does not support the core tentacle loop directly.
- If fidelity is the priority, visibility rules should stay simple.

### 4. Fog of war as a core rules layer

Current implementation:

- `src/systems/Physics.js:updateFog()`

Why remove or disable:

- It alters information access more than direct tentacle control.
- The fidelity target should bias toward clean tactical readability unless the reference clearly depends on hidden information.

### 5. Frenzy mechanic

Current implementation:

- `src/core/Game.js` cut-combo tracking and temporary regen bonus

Why remove or disable:

- Combo-triggered temporary power states feel arcade-like and score-driven.
- They are not part of the requested original pillars.

### 6. Auto-retract as an automatic survival rule

Current implementation:

- `src/entities/GameNode.js` low-energy trigger
- `src/systems/Physics.js:updateAutoRetract()`

Why remove or disable:

- It replaces player timing with a safety net.
- A fidelity-oriented mode should prefer manual decisions and punish overextension directly.

### 7. Score-optimization systems as gameplay shapers

Current implementation:

- stars, par time, cut/frenzy/waste bonuses

Why remove or disable:

- Scoring can remain as campaign wrapper UX, but it should not steer combat rules.
- Fidelity mode should avoid combat mechanics that exist primarily to feed score multipliers.

## Summary Table

### KEEP

- direct cell targeting and tentacle creation
- tentacle-mediated drain / attack / capture
- slicing as active tactical play
- growth/evolution increasing strength
- responsive touch/mouse control
- distance-aware connection commitment

### REWORK

- move toward draw-to-connect as the main fidelity input model
- simplify and lock down the canonical energy-budget model
- normalize and document slice-zone behavior as an explicit fidelity choice
- tune clashes for direct physical readability
- keep AI heuristic but align it strictly with player-facing mechanics
- treat relays as optional or secondary fidelity content

### REMOVE or DISABLE

- vortex hazards
- pulsars
- signal towers
- fog of war as a baseline rule
- frenzy
- auto-retract safety behavior
- score-driven combat modifiers

## Recommended Fidelity Direction

If the repository adds a “Tentacle Wars fidelity mode,” the default gameplay stack should be:

- direct tentacle connection control
- tentacle-based drain, capture, and attack
- manual slicing/cutting as a core defensive and offensive skill
- growth-driven offensive escalation
- simple readable board state
- low-latency touch and mouse input

Everything else should be opt-in only if it does not weaken those pillars.
