# Render Performance Instrumentation

## Goal

Expose lightweight scene and frame-cost metrics in debug mode without introducing a heavy profiling framework.

## Current Metrics

The renderer now publishes a small `game.renderStats` object each frame with:

- `frameMs`
- `avgFrameMs`
- `nodeCount`
- `tentCount`
- `hazardCount`
- `pulsarCount`
- `orbCount`
- `freeOrbCount`
- `visualEventCount`
- `graphicsMode`

## Surfaces

Runtime metrics are visible in:

- the debug info panel in [ScreenController.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/ui/ScreenController.js)
- the debug snapshot builder in [main.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/main.js)

Metrics are populated by [Renderer.js](/home/jonis/.claude/projects/nodewars-v2-codex/src/rendering/Renderer.js).

## Why this exists

The project already had:

- explicit `LOW` / `HIGH` graphics profiles
- FPS display

What it did not have was any structured view of scene complexity. This layer fills that gap so performance work can be guided by:

- actual frame cost
- current object pressure
- current particle pressure

## Limitations

- this is not a GPU profiler
- metrics are approximate runtime guidance, not a replacement for browser profiling
- current instrumentation is meant for debug and balancing, not shipping analytics
