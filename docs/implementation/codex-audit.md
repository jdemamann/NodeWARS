# Codex Audit

## Scope

Repository audit completed before application code changes.

Note: this document is historically useful, but parts of the codebase have since been reorganized. File paths and some findings below reflect the state at audit time unless otherwise updated.

## Architecture Summary

The game is a small ES-module canvas app with a single runtime owner:

- `src/main.js`: bootstrap, saved-state load, DOM wiring, `Game` creation, audio/event wiring.
- `src/core/Game.js`: loop owner, level generation/loading, player input, slice detection, update ordering, AI instantiation.
- `src/core/GameState.js`: persistent singleton state for progress, language, and settings.
- `src/config/gameConfig.js`: gameplay constants, owner color palettes, world metadata, and all level data.
- `src/entities/GameNode.js`: node state and per-frame regen / decay behavior.
- `src/entities/Tent.js`: tentacle state machine and almost all gameplay-critical energy transfer, combat, clash, capture, and burst behavior.
- `src/systems/Physics.js`: core simulation bookkeeping.
- `src/systems/WorldSystems.js`: world systems layered on top of core tent/node simulation: vortex drain, pulsars, relay/signal events, fog, auto-retract, camera.
- `src/systems/AI.js`: red AI targeting and purple AI strategic-cut behavior.
- `src/rendering/Renderer.js`: render pipeline coordinator.
- `src/rendering/NodeRenderer.js`, `src/rendering/TentRenderer.js`, `src/entities/Orb.js`, `src/rendering/UIRenderer.js`: owner-facing visual implementation and color usage.

### Gameplay update order

`Game.update()` drives the frame in this order:

1. `Physics.updateOutCounts()` computes outgoing counts and per-node feed budget.
2. `Game.resolveClashes()` links opposing tentacles.
3. Nodes update via `GameNode.update()`.
4. World systems run via `WorldSystems`.
5. Tentacles update via `Tent.update()`.
6. AI updates after simulation.
7. HUD updates last.

Primary reference: `src/core/Game.js:424-492`.

## Gameplay-Critical Files

- `src/entities/Tent.js`
  - Most critical file in the repo.
  - Owns active flow, clash resolution, neutral capture, enemy damage, ownership flips, retract behavior, and burst payload resolution.
- `src/entities/GameNode.js`
  - Owns node regen and node-level fail-safes like auto-retract triggers.
- `src/systems/Physics.js`
  - Owns hazard drain, pulsar bursts, relay/signal capture side effects, fog-of-war rules, and outgoing feed allocation.
- `src/systems/AI.js`
  - Owns AI source/target selection and owner-3 special cut behavior.
- `src/core/Game.js`
  - Owns player actions, level spawning for relay/pulsar/signal nodes, and slice detection.
- `src/config/gameConfig.js`
  - Balancing source of truth for regen, slots, cut/burst multipliers, palettes, and level flags.

## Exact Mechanic Implementations

### Node energy regen

- `src/entities/GameNode.js:84-93`
  - Nodes regenerate full tier regen every frame for any non-neutral owner.
- `src/systems/Physics.js:255-267`
  - Outgoing tent feed budget is derived from `TIER_REGEN / outCount`, and is set to `0` while under attack.
- `src/config/gameConfig.js:41-82`
  - Regen values and pacing multipliers live in `GAME_BALANCE`.

### Tentacle flow / drain

- `src/entities/Tent.js:364-465`
  - Normal active flow: source drain, pipe fill delay, ally transfer, neutral capture contribution, enemy damage.
- `src/entities/Tent.js:467-518`
  - Clash drain and tug-of-war front movement.
- `src/systems/Physics.js:16-85`
  - Vortex hazard drains `energyInPipe` and also chips source energy.

### Relay mechanics

- `src/core/Game.js:351-374`
  - Relay node spawning and relay-fortress setup.
- `src/entities/GameNode.js:73-81`
  - Relays do not self-regen.
- `src/entities/Tent.js:391-405` and `src/entities/Tent.js:440-444`
  - Captured relays amplify outgoing transfer via `relayMult = 1.45`.
- `src/systems/Physics.js:134-145`
  - Relay capture event detection.
- `src/rendering/NodeRenderer.js:383-452`
  - Relay-specific visuals.

### AI targeting

- `src/systems/AI.js:88-158`
  - Core source filtering, target scoring, and move selection.
- `src/systems/AI.js:48-52`
  - Personality selection by level / owner.
- `src/systems/AI.js:173-210`
  - Purple owner-3 strategic-cut behavior.
- `src/core/Game.js:164-165`
  - AI instance creation for owner 2 and optional owner 3.

### Slice / burst behavior

- `src/core/Game.js:681-739`
  - Player slice hit detection and cut-ratio derivation.
- `src/entities/Tent.js:76-212`
  - `kill(cutRatio)` decides refund / retract / burst behavior and immediate middle-cut resolution.
- `src/entities/Tent.js:520-583`
  - `BURSTING` state payload delivery at the target.
- `src/config/gameConfig.js:80-81`
  - Burst multiplier config.

### Rendering colors for owners 1 / 2 / 3

- Canonical palettes: `src/config/gameConfig.js:97-102`
  - `CP` owner 1, `CE` owner 2, `CE3` owner 3.
- Node colors: `src/rendering/NodeRenderer.js:12-24`
- Relay and signal variants: `src/rendering/NodeRenderer.js:383-452`, `src/rendering/NodeRenderer.js:459-507`
- Tentacle colors: `src/rendering/TentRenderer.js:38-46`
- Orb colors: `src/entities/Orb.js:6-8`, `src/entities/Orb.js:40-48`
- Hover/info panel colors: `src/rendering/UIRenderer.js:15-17`, `src/rendering/UIRenderer.js:26-41`

## Findings

### Critical gameplay bugs

1. Slice refund and burst zones are inverted in `Tent.kill()`.
   - `src/core/Game.js:696-700` documents `< 0.3 = refund` and `> 0.7 = burst`.
   - `src/config/gameConfig.js:80-81` also documents burst as near-target.
   - `src/entities/Tent.js:99-101` implements the opposite: `< 0.3` is treated as kamikaze and `> 0.7` as refund.
   - Impact: player slicing near the source and near the target behaves backwards from both code comments and the intended mechanic.

2. Owner-3 contested neutral capture is partially unsupported.
   - `src/entities/Tent.js:412-417` sets `const rival = s.owner === 1 ? 2 : 1`.
   - That hard-codes only owners 1 and 2 during neutral contest cancellation.
   - Impact: owner 3 can contribute to neutral contests, but cancellation logic is not symmetrical and will produce inconsistent capture races in W2/W3 purple levels.

3. Purple AI strategic cut does not use the same burst model as player cuts.
   - `src/systems/AI.js:184-209` applies immediate direct damage using a separate formula, then calls `t.kill()` with no `cutRatio`.
   - `src/entities/Tent.js:520-583` is the canonical burst resolution path.
   - Impact: owner-3 burst behavior is mechanically different from player burst behavior, bypasses burst-state travel, ignores `SLICE_BURST_MULT`, and can drift from future balance changes.

### AI / design inconsistencies

1. AI never targets relay nodes directly.
   - `src/systems/AI.js:107` skips `tgt.isRelay`.
   - This conflicts with the README claim that relay control is a World 3 priority and means relays are mostly a player-only tactical lever unless captured indirectly.

2. Under-attack rule hard-disables outgoing feed.
   - `src/systems/Physics.js:260-267` sets `tentFeedPerSec = 0` when `underAttack > 0.5`.
   - This is a strong design choice, but it is not reflected in the README’s “split budget” explanation and materially changes combat feel.

3. Relay amplification only applies when the relay is the effective source.
   - `src/entities/Tent.js:391` checks `s.isRelay`.
   - That means relays do not amplify “passing through” arbitrary paths as described in the README; they only amplify links originating from the relay node.

### Visual inconsistencies

1. Tentacle renderer has no owner-3 palette.
   - `src/rendering/TentRenderer.js:38-46` only handles owner 1 and “everyone else as red”.
   - Purple AI tentacles render as owner-2 red.

2. Orb renderer has no owner-3 palette.
   - `src/entities/Orb.js:47` only handles owner 1, else red.
   - Purple flow particles render red.

3. UI info panel has no owner-3 palette.
   - `src/rendering/UIRenderer.js:28-41` treats only owner 2 as enemy-colored.
   - Owner 3 hovers will inherit red enemy styling.

4. Relay gradient fallback is wrong for owner 3.
   - `src/rendering/NodeRenderer.js:406` falls through to greenish relay fill for non-owner-1 and non-owner-2, while `src/rendering/NodeRenderer.js:385` correctly sets the relay outline to purple for owner 3.
   - Purple relay nodes will have mixed purple/green rendering.

### Documentation drift

1. README describes `SELF_REGEN_FRAC`, but the code no longer has it.
   - README: `README.md:67-105`
   - Code: `src/config/gameConfig.js:41-82`
   - Current implementation is the unified-pool model in `src/entities/GameNode.js:84-93` plus drain in `src/entities/Tent.js:369-375`.

2. README says nodes do not self-regenerate while draining.
   - README: `README.md:23` and `README.md:58-80`
   - Code: `src/entities/GameNode.js:84-93` always regenerates, while tents separately drain.

3. README says relay nodes boost every tentacle “passing through” them.
   - README: `README.md:125-128`
   - Code: `src/entities/Tent.js:391` only boosts when the relay is the source node.

4. README says AI personalities are `expand`, `siege`, and `aggressive`.
   - README: `README.md:140`
   - Code adds a fourth special owner-3 `cutthroat` personality in `src/systems/AI.js:36-45`.

## Concise Action Plan

### Critical gameplay bugs

- Fix the cut-zone inversion in `src/entities/Tent.js` so `cutRatio` semantics match `Game.checkSlice()` and `GAME_BALANCE` comments.
- Generalize neutral contest cancellation and ownership-side assumptions to support owners 1, 2, and 3 consistently.
- Unify owner-3 strategic cuts with the canonical tent burst path instead of maintaining a separate damage model.

### AI / design inconsistencies

- Decide whether AI should be allowed to target relays and signal nodes directly in World 3; current behavior undercuts those mechanics.
- Decide whether “under attack disables outgoing feed” is intended balance or a temporary defense heuristic, then document or tune it.
- Clarify whether relay behavior should be “relay as source amplifies” or true “path passthrough amplification”; current implementation matches only the former.

### Visual inconsistencies

- Centralize owner palettes in renderers so nodes, tents, orbs, relay fills, and UI all use the same owner-1/2/3 mapping.
- Add explicit owner-3 handling to `TentRenderer`, `Orb`, and `UIRenderer`.
- Fix the owner-3 relay gradient fallback in `NodeRenderer`.

### Documentation drift

- Rewrite the README energy section to match the unified-pool implementation.
- Remove or restore `SELF_REGEN_FRAC`; right now documentation and code disagree.
- Update README relay wording to match actual source-only amplification unless code is changed.
- Document owner-3 / purple AI and its `cutthroat` behavior explicitly.
