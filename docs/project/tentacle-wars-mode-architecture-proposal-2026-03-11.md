# Tentacle Wars Mode Architecture Proposal

## Purpose

This document defines a concrete architecture proposal for adding a separate `TentacleWars` game mode to the project.

It uses:

- the current NodeWARS codebase
- the Tentacle Wars video study
- the local wiki capture
- the answered mechanic questionnaires

The goal is to create a mode that is mechanically much closer to Tentacle Wars while preserving the already working NodeWARS mode.

## Executive Summary

The recommended approach is:

- keep `NodeWARS` intact as the current primary mode
- add a second mode called `TentacleWars`
- reuse shell systems where possible
- fork only the mechanic-heavy systems that must behave differently

This is the safest and most professional direction because:

- it protects the currently stable product
- it allows experimentation without destabilizing the live mode
- it makes fidelity work explicit instead of leaking into the existing game

## Product Direction

### Mode Strategy

The project should support two distinct gameplay modes:

- `NodeWARS`
  - current authored campaign and current gameplay model
- `TentacleWars`
  - new fidelity-oriented mode with a separate simulation model

### Design Principle

The new mode should prioritize:

- mechanic fidelity
- packetized flow
- overflow-driven pressure
- stronger support-network expression

It should not initially prioritize:

- exact campaign reconstruction
- immediate full-content parity

### First Deliverable

The first TentacleWars deliverable should be:

- one randomized sandbox phase
- including:
  - player
  - red enemy
  - purple enemy
  - neutral cells
  - full TentacleWars grade table including `Dominator`

This is intentionally a mechanic-validation slice, not a campaign launch.

## High-Level Architecture

## Shared Systems

These should remain shared between `NodeWARS` and `TentacleWars` unless later evidence proves otherwise.

### 1. Product Shell

- menus
- settings
- credits
- ending flow
- soundtrack player
- notifications framework

Primary surfaces:

- `src/ui`
- `src/main.js`
- `src/localization`

### 2. Persistence Shell

- settings save/load
- progress save/load
- mode selection state

Primary surfaces:

- `src/core/GameState.js`

### 3. Input Shell

Shared shell:

- pointer/touch event binding
- hover state
- pointer lifecycle
- drag/slice state entry points

Primary surfaces:

- `src/input/GameInputBinding.js`
- `src/input/InputState.js`
- `src/core/Game.js`

Important note:

- the shell can be shared
- the interpretation of actions should be mode-aware

### 4. Rendering Shell

Shared shell:

- render loop
- high/low profile toggles
- notifications rendering
- screen composition

Primary surfaces:

- `src/rendering/Renderer.js`
- `src/rendering/UIRenderer.js`

Important note:

- gameplay-facing visuals inside the new mode should still get their own mode-specific logic where necessary

### 5. Audio Shell

- soundtrack framework
- SFX framework
- music notifications

Primary surfaces:

- `src/audio/Music.js`
- `src/audio/SoundEffects.js`

The current audiovisual identity can stay shared initially.

## Forked Systems

These should be mode-specific for `TentacleWars`.

### 1. Energy Model

This is the core fork.

NodeWARS model:

- hybrid regen / budget split model
- current relay-aware feed logic

TentacleWars model:

- packet-based lane transfer
- per-level lane throughput
- full-cell overflow
- equal split overflow in phase 1

Recommended new surfaces:

- `src/tentaclewars/TwEnergyModel.js`
- `src/tentaclewars/TwPacketFlow.js`

### 2. Grade Table

NodeWARS and TentacleWars should not share the same effective progression table.

TentacleWars mode needs:

- original thresholds
- original hysteresis
- original lane throughput model
- explicit `Dominator`

Recommended new surface:

- `src/tentaclewars/TwGradeTable.js`

### 3. Tentacle Simulation

NodeWARS tentacle behavior is no longer the right canonical model for the fidelity mode.

TentacleWars mode needs:

- progressive distance cost only
- packet-based transfer
- construction payload tracking
- cut payout based on build energy + in-transit energy
- hostile capture carryover rule
- overflow propagation

Recommended new surfaces:

- `src/tentaclewars/TwTentacle.js`
- `src/tentaclewars/TwTentacleCombat.js`
- `src/tentaclewars/TwCaptureRules.js`

### 4. Neutral Capture

NodeWARS neutral contest should not be reused directly.

TentacleWars mode needs:

- neutral energy value
- separate acquisition threshold
- stackable allied multi-source capture
- no diminishing return in phase 1

Recommended new surface:

- `src/tentaclewars/TwNeutralCapture.js`

### 5. AI

The current AI is useful as a foundation, but fidelity mode should not directly reuse its assumptions.

TentacleWars mode AI should be forked around:

- packet pressure
- support triangles
- overflow exploitation
- purple slice identity
- red/purple hostility if desired by mode settings

Recommended new surfaces:

- `src/tentaclewars/TwAI.js`
- `src/tentaclewars/TwAIScoring.js`

### 6. Layout / Phase Content

The current authored campaign should remain attached to NodeWARS.

TentacleWars mode phase content should begin separately.

Recommended new surface:

- `src/tentaclewars/TwSandboxLayout.js`

## TentacleWars Core Simulation Model

## 1. Grade Table

Initial proposed table:

- Grade 1
  - ascend: `15`
  - descend: `5`
  - throughput: `1.0 / s`
- Grade 2
  - ascend: `40`
  - descend: `30`
  - throughput: `1.5 / s`
- Grade 3
  - ascend: `80`
  - descend: `60`
  - throughput: `2.0 / s`
- Grade 4
  - ascend: `120`
  - descend: `100`
  - throughput: `2.5 / s`
- Grade 5
  - ascend: `160`
  - descend: `140`
  - throughput: `3.0 / s`
- Dominator
  - ascend: `180`
  - descend: `160`
  - throughput: doubled packet rate relative to Grade 5

All values must be parameterized.

Recommended config surface:

- `TW_BALANCE.GRADE_ASCEND_THRESHOLDS`
- `TW_BALANCE.GRADE_DESCEND_THRESHOLDS`
- `TW_BALANCE.GRADE_PACKET_RATE_PER_SEC`
- `TW_BALANCE.DOMINATOR_PACKET_MULT`

## 2. Packet Model

Frozen decisions:

- packet transfer is real
- base packet size is `1`
- throughput can be fractional through an accumulator

Recommended implementation rule:

- each active outgoing lane owns an emission accumulator
- each frame:
  - `accumulator += throughputPerSecond * dt`
- while `accumulator >= packetSize`:
  - emit one packet
  - `accumulator -= packetSize`

This gives:

- discrete transfer
- stable handling of `1.5 / s`, `2.5 / s`, etc.
- simple render synchronization

Recommended config:

- `TW_BALANCE.PACKET_SIZE = 1`

## 3. Overflow Rule

Frozen phase-1 rule:

- overflow starts only when a cell is at full energy cap
- phase-1 overflow is split equally across all outgoing lanes
- if no outgoing lane exists, overflow is lost

This is a conservative first implementation.

It should remain parameterized so later fidelity tests can compare:

- `split_equal`
- `broadcast_full`
- other experimental rules

Recommended config:

- `TW_BALANCE.OVERFLOW_MODE = 'split_equal'`
- `TW_BALANCE.OVERFLOW_REQUIRES_FULL_CAP = true`

## 4. Tentacle Build Cost

Frozen rule:

- cost is progressive during growth
- linear with distance
- no fixed base cost

Recommended config:

- `TW_BALANCE.TENTACLE_COST_PER_PIXEL`

No `BASE_COST` should exist in the TentacleWars mode.

## 5. Retract / Cancel Refund

Frozen rule:

- canceling a growing tentacle refunds all invested energy
- manual retract behaves the same
- no intentional loss on retract

## 6. Cut Rule

Frozen rule:

- a tentacle stores:
  - construction energy invested into the lane
  - current in-transit energy
- cut payload is:
  - construction energy
  - plus in-transit energy
- cut position determines how much returns to source versus reaches target

This should be independent of NodeWARS slice/burst semantics.

Recommended new mode-specific rule owner:

- `TwTentacle.applyCut(...)`

## 7. Hostile Capture Rule

Frozen phase-1 rule:

- when a hostile node reaches zero
- it flips ownership
- it resets to `10`
- then applies carryover

Carryover should include:

- relevant outgoing tentacle energy released during takeover cleanup
- remaining offensive payload from the capture event

Recommended config:

- `TW_BALANCE.HOSTILE_CAPTURE_RESET_ENERGY = 10`
- `TW_BALANCE.HOSTILE_CAPTURE_APPLIES_CARRYOVER = true`

## 8. Neutral Capture Rule

Frozen phase-1 rule:

- neutral cells have:
  - displayed energy
  - separate acquisition cost
- acquisition cost starts at:
  - `40%` of neutral energy
- multi-source allied capture stacks directly
- no diminishing returns

Recommended config:

- `TW_BALANCE.NEUTRAL_CAPTURE_COST_RATIO = 0.4`
- `TW_BALANCE.NEUTRAL_CAPTURE_ROUNDING_MODE`

## 9. Purple AI Rule

Frozen phase-1 rule:

- purple exists in the prototype
- purple uses slice
- purple can:
  - burst
  - deny
  - redirect
- purple may value support triangles more than red

The exact red/purple hostility rule should remain parameterizable.

Recommended config:

- `TW_BALANCE.PURPLE_ENABLES_SLICE = true`
- `TW_BALANCE.PURPLE_SUPPORT_TRIANGLE_BONUS`
- `TW_BALANCE.ENEMY_RELATION_MODE`

Possible values:

- `all_hostile`
- `coalition`

Default for TentacleWars mode:

- `all_hostile`

## Input Strategy

## Shared Shell, Mode-Specific Semantics

The input shell can remain shared.

TentacleWars mode should interpret it like this:

- primary fantasy:
  - draw-connect
- compatibility:
  - click-connect may remain available
- slice:
  - keep current responsiveness in phase 1

This avoids blocking the first prototype on input refactor while still preserving the intended mode identity.

## Visual Strategy

TentacleWars mode should move visibly closer to the original game in:

- packet flow density
- grade silhouettes
- tentacle lane feel
- neutral/hostile readability

But this should be a controlled later layer on top of the mechanic fork, not the first implementation priority.

## Suggested Code Structure

Recommended new directory:

- `src/tentaclewars/`

Suggested early files:

- `TwModeRuntime.js`
- `TwBalance.js`
- `TwGradeTable.js`
- `TwEnergyModel.js`
- `TwPacketFlow.js`
- `TwTentacle.js`
- `TwTentacleCombat.js`
- `TwCaptureRules.js`
- `TwNeutralCapture.js`
- `TwAI.js`
- `TwAIScoring.js`
- `TwSandboxLayout.js`

This keeps the new mode explicit instead of entangling it with current systems.

## Rollout Plan

## Phase 1 — Skeleton

Deliver:

- mode selection plumbing
- TentacleWars runtime shell
- shared menu integration

No fidelity gameplay yet.

## Phase 2 — Core Packet Prototype

Deliver:

- one randomized sandbox
- packet flow
- grade thresholds
- overflow
- build cost
- neutral capture
- hostile capture reset + carryover

This is the first meaningful playable prototype.

## Phase 3 — Enemy Behavior

Deliver:

- red AI
- purple AI
- slice behavior for purple
- hostility mode parameter

## Phase 4 — Visual Fidelity Layer

Deliver:

- packet-rich lane rendering
- closer grade visuals
- closer TentacleWars board feel

## Phase 5 — Content Expansion

Deliver:

- more prototype maps
- possible mini-campaign
- eventual authored fidelity phases

## Risk Assessment

## Biggest Mechanical Risk

- overflow behavior can easily explode into runaway feedback loops

Mitigation:

- parameterize overflow mode
- start with equal split
- rely on caps and outgoing lane count
- build checks early

## Biggest Product Risk

- blending the new mode too deeply into NodeWARS and destabilizing the current game

Mitigation:

- explicit mode separation
- fork mechanic-heavy subsystems

## Biggest UX Risk

- sharing input but making the new mode feel “almost the same” instead of genuinely TentacleWars-like

Mitigation:

- keep draw-connect visually and tutorial-wise central
- adjust presentation and onboarding once the mechanic prototype is stable

## Required Early Checks

The TentacleWars mode should get its own focused checks early.

Recommended future suites:

- `tw-energy-sanity`
  - packet emission
  - overflow split
  - capture reset/carryover
- `tw-grade-sanity`
  - thresholds
  - hysteresis
  - Dominator output
- `tw-input-sanity`
  - draw-connect
  - slice
  - retract
- `tw-ai-sanity`
  - purple slicing
  - hostile relations
  - support triangle preference

## Recommended Next Tasks

### TASK-TW-001 TentacleWars Mode Skeleton

Goal:

- add mode selection, runtime boundary, and empty mode shell

### TASK-TW-002 TentacleWars Grade Table and Packet Core

Goal:

- implement grade thresholds, packet accumulator, and lane throughput

### TASK-TW-003 TentacleWars Tentacle Cost and Refund

Goal:

- implement linear distance cost and full refund rules

### TASK-TW-004 TentacleWars Overflow and Capture Core

Goal:

- implement split overflow, neutral acquisition cost, hostile reset + carryover

### TASK-TW-005 TentacleWars Sandbox Prototype

Goal:

- ship one randomized test phase with player, red, purple, and neutrals

### TASK-TW-006 TentacleWars AI Phase 1

Goal:

- add red and purple behavior tuned for packet/overflow logic

## Final Recommendation

The project should proceed with a separate TentacleWars mode.

That mode should:

- reuse the stable shell
- fork the simulation
- start with one randomized prototype
- validate packet/overflow fidelity before any broader content push

This is the most coherent way to preserve what already works while opening a clear path toward a much more faithful Tentacle Wars implementation.
