# Config Taxonomy

## Purpose

Gameplay tuning should be grouped by domain so engineers can change pacing and feel without hunting through simulation code.

## Current Domain Grouping

Primary source: `src/config/gameConfig.js`

- `GAME_BALANCE`
  - energy generation
  - capture speed
  - attack damage
  - bandwidth tolerance
  - clash volatility
  - relay flow multiplier
- `BUILD_RULES`
  - base tentacle build cost
  - per-pixel build surcharge
- `TENTACLE_RULES`
  - growth speed
  - post-clash advance speed
  - flow/travel support values
  - burst/clash pacing values
- `CUT_RULES`
  - slice threshold boundaries
- `INPUT_TUNING`
  - hit padding
  - snap distance
  - touch thresholds
  - tap and long-press timing
- `PROGRESSION_RULES`
  - max tentacle slots by level
  - node polygon sides by level
- `AI_RULES`
  - adaptive think pacing
  - defensive thresholds
  - relay evaluation radius
  - strategic cut thresholds
- `WORLD_RULES`
  - fog timing and vision radius
  - signal reveal timing
  - pulsar warning timing
  - camera follow limits
  - auto-retract thresholds
  - default world capture thresholds
- `RENDER_RULES`
  - stable visual thresholds shared across renderers
  - slot ring offsets
  - bezier segment counts
  - dash patterns
  - high-flow visual thresholds
  - UI panel and preview layout thresholds
- `GAMEPLAY_RULES`
  - domain alias object for grouped access

## Rule

When introducing a new gameplay-critical parameter:

1. place it in the smallest correct domain group
2. use a name that communicates intent and unit
3. add a one-line comment describing effect
4. avoid embedding the value directly in simulation or input code

## Near-Term Direction

The current taxonomy is still transitional.

Compatibility aliases such as `BUILD_B`, `BUILD_PX`, `MAX_SLOTS`, `GROW_PPS`, and `ADV_PPS`
still exist and currently map back to these grouped config surfaces. New code should prefer the
grouped domains first unless a compatibility alias is still required by older modules.

Recent migrations already point newer code toward grouped domains in:

- input binding and input helpers
- build math utilities
- UI preview / panel logic
- AI slot checks
- AI adaptive pacing and strategic cut thresholds
- node slot accessors
- world timing in physics systems
- bunker / fortress capture thresholds
- node rendering slot indicators
- tentacle and node shared render thresholds
- UI hover/panel/preview visual thresholds

Future extractions should likely split:

- world mechanic tuning
- AI tuning
- render feedback tuning
- campaign/layout tuning

into their own grouped config surfaces once the core simulation is fully stabilized.
