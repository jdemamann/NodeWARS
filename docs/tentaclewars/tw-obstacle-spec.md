# TentacleWars Obstacle Spec

## Purpose

Define the first-phase obstacle contract for the TentacleWars campaign.

This spec closes the obstacle-complexity decision required before World 1 authoring opens.

## Core Decision

Choose **Option A** for phase 1:

- static circles only
- line-of-sight blocking only
- no composite blob runtime in World 1 or World 2

## Why Option A

This is the safer project decision right now.

It keeps three things under control:

1. authoring complexity
2. runtime complexity
3. validation complexity

Counterpoint considered:

- the reconstruction report talks about amoeba-like blockers, which suggests more organic shapes

Why I still recommend Option A now:

- the campaign track does not exist yet
- World 1 is the first implementation milestone
- routing readability matters more than geometric richness at this stage
- circles are sufficient to teach blocked-route logic without risking a runtime detour

## Scope

This decision applies to:

- World 1
- World 2

For these worlds:

- no moving obstacles
- no packet interaction
- no drain/damage semantics
- no changing obstacle geometry during a phase

## Runtime Semantics

Obstacle behavior is simple:

- an obstacle blocks tentacle creation if the intended path intersects its blocking radius
- obstacles do not affect already-created tentacles dynamically because obstacles are static
- obstacles do not change packet throughput
- obstacles do not create damage, drain, or status effects

## Rendering Expectation

Use this visual rule for phase 1:

- tentacles should stop before apparent intersection with the obstacle shell
- they should not visually pass through the obstacle
- no “render behind obstacle and continue through it” behavior in phase 1

Why:

- this is clearer
- it matches the blocking semantics directly
- it avoids player confusion in the first authored worlds

## Level Schema Contract

Although `TWL-002` allowed both `circle` and `blob` as schema-valid descriptors for forward compatibility, the authored campaign should use only:

```js
shape: {
  kind: 'circle',
  radius: <normalized number>
}
```

for Worlds 1 and 2.

This is intentional:

- schema compatibility remains future-friendly
- authoring discipline remains conservative

## Authoring Guidelines

For World 1:

- obstacle count should stay low
- obstacle purpose should be obvious at a glance
- blocked-route lessons should be readable without dense overlap

For World 2:

- obstacle usage may increase
- but it should still serve path-choice clarity, not maze complexity

## What Is Out Of Scope

Not part of phase 1:

- composite blob runtime
- polygonal blockers
- moving obstacles
- packet-affecting obstacles
- obstacles with separate collision and visual shells

## Future Extension Path

If later reconstruction evidence shows circles are not enough, the correct next step is:

- create `TASK-TWL-004b TentacleWars Obstacle Runtime`

That future task would own:

- composite blob runtime
- richer shape authoring
- any visual/runtime reconciliation needed for organic amoeba obstacles

It should not be pulled into World 1 preemptively.

## Blocking Decisions Closed

- complexity decision: `Option A`
- authored obstacle shape for Worlds 1-2: `circle`
- moving obstacles in Worlds 1-2: `no`
- render-through behavior: `no`
- obstacle drains/damage/status: `no`
