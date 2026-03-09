# Naming Convention

## Goal

Names should communicate gameplay intent before implementation detail.

A new engineer should be able to infer:

- what the value represents
- whether it is mutable
- whether it is a rate, amount, threshold, duration, or multiplier
- whether a function computes, applies, resolves, builds, or checks something

## Naming Method

### 1. Name by domain concept first

Prefer:

- `sourceNodeEnergy`
- `tentacleFeedRate`
- `captureThreshold`

Avoid:

- `srcE`
- `rate2`
- `cap`

### 2. Include units or semantics in quantitative names

Use:

- `feedRatePerSecond`
- `buildCost`
- `warningRadius`
- `captureDuration`
- `burstDamageMultiplier`

When the codebase already assumes the unit strongly, shorter names are acceptable if still explicit:

- `flowRate`
- `buildCost`
- `captureThreshold`

### 3. Booleans should read like a question

Use:

- `isRelayNode`
- `isUnderAttack`
- `hasClashPartner`
- `shouldAutoRetract`

Avoid:

- `relay`
- `underAtk`
- `clash`

### 4. Distinguish pure computation from mutation

Pure functions:

- `computeTentacleFeedRate`
- `getOwnerColor`
- `buildRelayContext`
- `shouldTriggerStrategicCut`

Mutating functions:

- `applySliceCut`
- `updateOutCounts`
- `resolveOwnershipChange`
- `syncHoverState`

### 5. Prefer full words over opaque abbreviations

Preferred replacements:

- `src` -> `sourceNode`
- `tgt` -> `targetNode`
- `sc` -> `score`
- `dm` -> `distanceCostMultiplier`
- `tot` -> `totalCost`
- `ctx` -> `context` unless it is clearly a render context
- `iv` -> `interval`

### 6. Use one term for one concept

Examples:

- use `owner`, not a mix of `team`, `side`, and `faction`
- use `tentacle`, not a mix of `tent`, `link`, and `pipe` in public-facing names
- use `capture`, not a mix of `claim` and `infect` unless the distinction is real

## Recommended Prefixes

Use these consistently:

- `compute` for derived values
- `get` for simple retrieval
- `build` for constructing a data object
- `should` for predicate decisions
- `apply` for direct state mutation
- `update` for per-frame state progression
- `resolve` for conflict or transition logic
- `sync` for keeping two states aligned

## Recommended Suffixes

- `Rate` for per-second or per-tick throughput
- `Amount` for absolute quantity
- `Multiplier` for scaling factors
- `Threshold` for decision boundaries
- `Duration` for time lengths
- `Radius` for circular distance
- `Budget` for available spendable capacity
- `State` for lifecycle markers

## Examples for This Repository

Good:

- `relayFeedBudget`
- `ownerColor`
- `applySliceCut`
- `strategicCutRatio`
- `playerRelayLinks`

Should be migrated over time:

- `dm` -> `distanceCostMultiplier`
- `sc` -> `score`
- `lo` -> `activeOutgoingTentacles`
- `maxT` -> `maxTentacleSlots`
- `hov` -> `hoveredNode`

## Documentation Rule

Whenever a new gameplay-critical variable or function is introduced:

1. choose a name that follows this convention
2. add a short comment if intent is not obvious
3. document the rule owner in the relevant implementation doc

## Renaming Strategy

Do not rename the whole codebase in one sweep.

Preferred order:

1. critical gameplay paths
2. shared helpers
3. public config/constants
4. secondary UI/debug code

Each rename batch should be:

- behavior-preserving
- locally understandable
- covered by smoke checks where relevant
