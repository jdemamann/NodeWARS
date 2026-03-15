# TentacleWars Level Data Schema

## Purpose

Define the canonical `JS object` contract for one authored TentacleWars campaign level.

This schema is intentionally strict on authoring errors and intentionally light on
runtime semantics that still belong to later tasks such as:

- `TASK-TWL-003 TentacleWars Progression and Score Spec`
- `TASK-TWL-004 TentacleWars Obstacle Spec`

## Canonical Shape

Each level is authored as one `JS object`.

Required fields:

- `id`
- `world`
- `phase`
- `energyCap`
- `cells`
- `obstacles`
- `winCondition`
- `par`
- `introMechanicTags`

## Field Contract

### `id`

- type: `string`
- format: `W<world>-<phase>`
- examples:
  - `W1-01`
  - `W2-14`
  - `W4-20`

This is the stable cross-surface level identifier.

### `world`

- type: `integer`
- allowed range: `1..4`

### `phase`

- type: `integer`
- allowed range: `1..20`

`id`, `world`, and `phase` must agree.

### `energyCap`

- type: `integer`
- allowed range: `1..700`

This is the per-level maximum cell energy.

### `cells`

- type: `array`
- required: non-empty

Each cell object requires:

- `id`
  - type: `string`
  - unique inside the level
- `owner`
  - allowed values:
    - `player`
    - `neutral`
    - `red`
    - `purple`
- `initialEnergy`
  - type: `number`
  - range: `0..energyCap`
- `x`
  - type: `number`
  - normalized range: `0..1`
- `y`
  - type: `number`
  - normalized range: `0..1`

Coordinates are normalized on purpose.
That matches the existing authored-layout style in the repository and keeps
levels resolution-independent.

### `obstacles`

- type: `array`
- required: yes
- may be empty

Each obstacle object requires:

- `id`
  - type: `string`
  - unique inside the level
- `shape`
  - type: `object`
  - required discriminator: `kind`

Current schema-valid shape kinds:

- `circle`
  - requires `cx`
  - requires `cy`
  - requires `radius`
- `capsule`
  - requires `ax`
  - requires `ay`
  - requires `bx`
  - requires `by`
  - requires `radius`

Important:

- allowing both `circle` and `capsule` in the schema does **not** widen the runtime family again
- canonical authored TentacleWars blockers currently use capsules
- runtime obstacle geometry remains owned by the obstacle-spec track
- this schema only keeps the authoring format forward-compatible enough to avoid rewriting it later

### `winCondition`

- type: `string`
- allowed values:
  - `all_hostiles_converted`

This field references the canonical product decision from `TASK-TWL-001`.
It must not redefine win semantics locally.

### `par`

- type: `integer`
- allowed range: positive integer

Current meaning:

- target time for `3-star` evaluation

Final star calculation remains owned by `TASK-TWL-003`.

### `introMechanicTags`

- type: `array<string>`
- required: yes
- may be empty
- strings must be unique inside the array

Purpose:

- mark which mechanic introductions a level is responsible for
- support future campaign sanity checks around mechanic ordering

Examples:

- `connect`
- `neutral-capture`
- `slice`
- `support-loop`
- `purple-intro`
- `obstacle-routing`

## Valid Example

```js
{
  id: 'W1-01',
  world: 1,
  phase: 1,
  energyCap: 15,
  cells: [
    { id: 'p1', owner: 'player', initialEnergy: 5, x: 0.18, y: 0.50 },
    { id: 'n1', owner: 'neutral', initialEnergy: 8, x: 0.42, y: 0.50 },
    { id: 'r1', owner: 'red', initialEnergy: 10, x: 0.78, y: 0.50 },
  ],
  obstacles: [],
  winCondition: 'all_hostiles_converted',
  par: 45,
  introMechanicTags: ['connect', 'neutral-capture'],
}
```

## Validator

Canonical validator:

- [TwLevelSchema.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/tentaclewars/TwLevelSchema.js)

Primary export:

- `validateTentacleWarsLevelData(levelData)`

Sample fixtures exported for sanity checks:

- `TW_LEVEL_SAMPLE_VALID`
- `TW_LEVEL_SAMPLE_INVALID`

Schema sanity:

- [tw-level-schema-sanity.mjs](/home/jonis/.claude/projects/nodewars-v2-codex/scripts/tw-level-schema-sanity.mjs)

## Notes

- canonical authoring format remains `JS objects`
- JSON export/import can be added later without changing the source-of-truth schema
- obstacle runtime complexity is intentionally deferred
- score and progression semantics are intentionally deferred
