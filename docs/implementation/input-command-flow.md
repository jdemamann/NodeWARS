# Input Command Flow

## Goal

Document the current split of player interaction logic so further modularization of `Game.js` does not reintroduce duplicated rules.

## Current Rule Ownership

### `src/core/Game.js`

Owns orchestration and state application:

- converts DOM input into canvas coordinates
- dispatches click and touch events
- applies resolved click intents to live game state
- creates the actual `Tent` instance when a build is approved
- controls hover pinning and selection state on the live game object
- tracks drag-connect snap targets and same-gesture slice state

### `src/input/NodeHitTesting.js`

Owns node hit testing:

- point-in-node checks
- filtered node lookup at a world position

### `src/input/TentacleCommands.js`

Owns low-level tentacle command helpers:

- build cost calculation
- direct tentacle lookup
- opposing active tentacle lookup

### `src/input/PlayerTentacleInteraction.js`

Owns player tentacle interaction rules:

- which tentacles retract when a selected node is re-clicked
- which existing link can toggle flow
- slot usage and free-slot checks

### `src/input/PlayerClickResolution.js`

Owns click intent resolution:

- select player node
- retract selected node tentacles
- toggle existing tentacle flow
- reject for no slots
- reject for insufficient energy
- approve a new tentacle build

### `src/input/BuildPreview.js`

Owns preview model assembly for the build tooltip:

- existing-link flow toggle preview
- rounded build/range/total costs
- slot usage preview
- affordability and buildability flags

### `src/input/InputState.js`

Owns pure input-state transitions and gesture helpers:

- client-to-canvas coordinate conversion
- slice path start and extension state
- monotonic gesture timestamp sourcing for tap/slice recognition
- tap candidate creation
- tap-to-slice promotion rule
- tap activation rule
- hover tracking state while not pinned
- gesture cleanup primitives used to avoid orphaned slice state

### `src/input/GameInputBinding.js`

Owns raw DOM input binding for gameplay:

- canvas mouse event wiring
- canvas touch event wiring
- canonical promotion of touch drag into the same slice initializer used by mouse slicing
- long-press timer orchestration
- window resize / escape key wiring
- delegation from DOM events into `Game` methods and input helpers
- redundant release/cancel guards for slice cleanup (`mouseup`, `pointerup`, `pointercancel`, `contextmenu`, `blur`, `visibilitychange`)
- explicit dispose/unbind support for all listeners it registers

### `src/systems/Tutorial.js`

Owns rigid tutorial-step gating on top of the normal player interaction flow:

- whitelists click intents per tutorial step
- whitelists drag-connect starts and targets per tutorial step
- only allows slice gestures during the explicit cut step
- only allows slice hits against the currently demonstrated tentacle

### `src/input/SliceCutting.js`

Owns slice-segment scanning at the input/gameplay boundary:

- latest slice segment extraction
- player-cuttable tentacle filtering
- cut intersection detection
- effective source/target and cut-ratio normalization

### `src/input/PlayerSliceEffects.js`

Owns player-facing slice side effects after a cut is detected:

- canonical tentacle cut application delegation
- reactive defense tracking
- same-gesture frenzy tracking
- slice toast text assembly

## Gesture Rules

- `drag-and-release` only claims the gesture if it starts from a player-owned node
- left-drag can still become a slice if it does **not** start from a player-owned node
- touch-promoted slice now enters through the same `_beginSlice(...)` path as mouse slice
- drag-connect uses sticky snap targeting so a valid target remains selected even if the final frame hit test is imperfect
- frenzy is evaluated per continuous slice gesture, not across multiple disconnected cuts
- tutorial phases override the normal freedom of the input model and only accept the action required by the active step

## Tutorial Guardrail

Tutorial phases are intentionally rigid.

- off-step actions are ignored instead of mutating gameplay state
- the `cut` step is two-phase: first create the demonstration tentacle, then allow the slice
- this prevents players from soft-locking the tutorial by clearing the map or consuming the wrong target out of order

## Design Rule

`Game.click()` should remain a dispatcher.

It may:

- gather live state
- call resolver helpers
- apply the returned intent

It should not accumulate more embedded gameplay decision logic over time.

## Invalid Action UX

For invalid player actions such as:

- no free slots
- insufficient energy
- blocked reverse flow

the current UX intentionally keeps the selected source node active so the player can retry immediately without reselecting it.

## Next Extraction Targets

- isolate player command application from raw event binding
- collapse remaining `Game` slice wrappers if they no longer add value
- consider moving HUD/UI button binding into a separate UI binding module
