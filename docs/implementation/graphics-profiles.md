# Graphics Profiles

## Goal

Expose a clear player-facing graphics choice with two explicit profiles:

- `HIGH`
- `LOW`

This replaces the previous ambiguous `highGraphics ON/OFF` presentation.

## Design intent

The setting should communicate a tradeoff, not just a switch.

- `HIGH` prioritises richer rendering:
  - more layered and more organic tentacle rendering
  - extra node depth
  - heavier glow / blur usage
  - more decorative motion
  - stronger special-structure identity
- `LOW` prioritises responsiveness and lower GPU cost:
  - fewer render layers
  - reduced expensive gradients
  - fewer animated embellishments
  - same gameplay readability

## Implementation

State is now persisted in [GameState.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/core/GameState.js) as:

- `settings.graphicsMode`

Compatibility with existing saves is preserved:

- old saves with only `highGraphics` are normalized into `graphicsMode`
- `highGraphics` is still kept in sync as a compatibility field for existing code paths

The settings screen now exposes the profile with:

- [index.html](/home/jonis/.claude/projects/nodewars-v2-codex/index.html)
- [main.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/main.js)
- [Screens.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)

## Current LOW-mode reductions

### Tentacles

In [TentRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/TentRenderer.js), `LOW`:

- reduces bezier segment count for tapered attack bodies
- skips the outer membrane layer
- skips the animated internal flow pulses
- skips the organic silhouette wobble, root bulb, and target grip treatment
- keeps the main body, direction, clash, and gameplay-critical readability

In `HIGH`, tentacles now also gain:

- a wider organic root bulb where they emerge from the source node
- a more creature-like silhouette with taper variation instead of a uniform strip
- a target grip ring so the attachment reads as impact instead of a line endpoint
- extra clash distortion and body banding so direct lane fights feel more physical

### Nodes

In [NodeRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/NodeRenderer.js), `LOW`:

- falls back to simpler body fill instead of layered radial depth
- skips the nucleus gradient
- skips the specular highlight arc
- skips the secondary inner energy arc

The silhouette, energy ring, ownership color, selection state, and attack warnings remain readable.

In `HIGH`, special structures now also separate more clearly:

- relays gain a crystalline rotating inner core
- owned signals gain a stronger technological diamond frame
- pulsars gain an extra corona layer and richer broadcast presence

### Background / hazards / particles

Additional `LOW` reductions now apply to:

- [BGRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/BGRenderer.js)
- [HazardRenderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/HazardRenderer.js)
- [Orb.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/entities/Orb.js)

`LOW` now:

- disables the moving scanline pass
- disables ambient player-node background glow
- simplifies hazard and pulsar fills
- reduces hazard decorative particles
- reduces pulsar arm count
- removes orb shadow blur

This makes the profile more honest: `LOW` now cuts cost across the whole scene, not only in the main node/tentacle renderers.

## UX recommendation

Defaulting to `LOW` is reasonable for browser play because:

- it is safer across mid-range laptops and integrated GPUs
- it avoids the player needing to diagnose performance issues manually
- `HIGH` remains available as an upgrade path for players who want richer presentation

For desktop play, `HIGH` is now much more visibly worth enabling because the gain is no longer just blur and glow. The main difference is body language:

- tentacles feel less like links and more like living appendages
- relays and signals read faster as special infrastructure
- clash and pulse events look more intentional

## Validation

The lightweight regression suite now checks that:

- `graphicsMode` exists and persists
- compatibility normalization remains present
- the settings UI uses the explicit profile toggle
- renderers still branch on the explicit profile
