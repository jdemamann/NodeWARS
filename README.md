# <div align="center">NODE WARS</div>

<div align="center">

**A fast, browser-based RTS about energy flow, living tentacles, infrastructure control, and surgical cuts.**

<br />

![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-ES_Modules-f7df1e?style=for-the-badge&logo=javascript&logoColor=111)
![Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26?style=for-the-badge&logo=html5&logoColor=white)
![No Build Step](https://img.shields.io/badge/Build-Step_Free-0f172a?style=for-the-badge)
![Campaign](https://img.shields.io/badge/Campaign-33_Levels-0ea5e9?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-16a34a?style=for-the-badge)

</div>

---

## Overview

**NODE WARS** is a real-time strategy game built with **Vanilla JavaScript ES Modules**, **HTML5 Canvas**, and **Web Audio API**.

You grow nodes, draw living tentacles, capture infrastructure, fight over relays and signals, route around hazards, and cut enemy links at the right moment.

The current project state is:

- fixed authored campaign
- stabilized core mechanics
- persistent local progress and settings
- explicit `HIGH` / `LOW` graphics profiles
- lightweight validation scripts for mechanics, campaign integrity, and long-run stability

## Core Experience

### What you do

- expand from your starting cells
- connect nodes with tentacles
- drain, heal, capture, and pressure through those links
- cut tentacles as a core tactic
- control relays, pulsars, and signal towers
- survive increasingly complex late-game maps

### Input

| Action | Control |
|---|---|
| Select a node | `Left click` one of your nodes |
| Connect / attack | `Click-click` or `drag-and-release` from your node to a target |
| Retract outgoing tentacles | `Click` your selected node again |
| Slice tentacles | `Right-click drag` across tentacles, or `left-drag` when the gesture does not start from one of your nodes |
| Pause / leave tutorial | `Pause` button or `Esc` |
| Mobile interaction | touch input is supported through the same gameplay paths |

### Slice Rules

Tentacle cuts depend on **where** the slice lands along the effective source-to-target path:

| Slice zone | Result |
|---|---|
| Near source | forward burst / kamikaze burst |
| Middle | split cut |
| Near target | defensive refund |

This is the canonical rule used by both the player and the purple AI.

### Frenzy Rule

- frenzy only triggers when `3` active tentacles are cut in the **same continuous slice gesture**
- cuts from separate gestures do **not** stack toward frenzy

## World Mechanics

### World 1: Genesis

- expansion fundamentals
- growth and capture pressure
- bunker-style neutral resistance

### World 2: The Void

- vortex hazards drain tentacles in their area
- moving and pulsing hazards force route timing
- the boss phase stacks hazard pressure and purple threat

### World 3: Nexus Prime

- **relays** amplify and forward flow, but do **not** create free energy
- **pulsars** energize nearby **owned non-relay nodes**
- **signal towers** temporarily reveal the map
- late-game phases mix infrastructure, pressure, and purple aggression

## Current Gameplay Rules

The current implementation deliberately preserves these rules:

- programmatic retract refunds `paidCost + energyInPipe`
- support cells keep a fraction of their own regeneration while feeding allies
- level-0 cells now start at `1.0 e/s`, with higher levels preserving the same step pattern as the previous tuning
- relay nodes act as pass-through infrastructure, not energy sources
- player and purple AI use the same shared slice / burst path
- red and purple are one hostile coalition and can capture neutral nodes cooperatively
- frenzy only counts cuts from one continuous slice gesture
- owner `3` is supported in both gameplay and rendering
- tutorials are optional in every world and do not block the first real phase
- crossing into a new world can still naturally route the campaign into that world's tutorial
- late high-pressure authored phases give the player extra structural opening support where needed
- phase skip unlocks only after repeated defeats and remains blocked on tutorials, bosses, and the final phase

## Features

- **No dependencies**
  - pure browser-side ES modules
- **Fixed campaign layouts**
  - authored layouts for all shipped levels
- **Persistent local save**
  - progress and settings stored in `localStorage`
- **Procedural audio**
  - music and SFX generated with Web Audio
- **Graphics profiles**
  - `HIGH` and `LOW`
- **Theme system**
  - multiple UI themes that affect the whole presentation
- **PT / EN localization**
  - tutorial, menus, story, and gameplay text
- **Built-in debug tooling**
  - runtime state, render metrics, snapshot helpers

## Project Structure

```text
src/
  core/           runtime orchestration, state, persistence, event bus
  config/         grouped gameplay config and campaign data
  entities/       GameNode, Tent, TentCombat, Orb
  input/          click, drag, slice, hover, preview helpers
  systems/        AI, Physics, Tutorial, world orchestration
  systems/world/  vortex, pulsar, visibility, auto-retract, camera
  rendering/      canvas render pipeline and specialized renderers
  ui/             HUD, screen controllers, screen composition helpers
  audio/          procedural music and sound effects
  math/           simulation math and geometry helpers
  theme/          owner palette and UI theme color helpers
  localization/   language strings and tutorial/story copy
  levels/         fixed campaign layouts
```

For a current architecture map, read [source-structure.md](docs/project/source-structure.md).

## Run Locally

### Option A

Open `index.html` directly in a modern browser.

### Option B

Serve the repository locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Validation

Run these after gameplay, campaign, UI/settings, persistence, or render changes:

```bash
node scripts/smoke-checks.mjs
node scripts/campaign-sanity.mjs
node scripts/simulation-soak.mjs
```

What they cover:

- core gameplay invariants
- campaign integrity
- long-run numeric stability

## Settings

The game persists these locally:

- progress
- current level
- active world tab
- phase fail streaks used for skip unlocks
- language
- audio toggles
- graphics mode
- FPS toggle
- theme
- font
- text zoom
- debug-related display preferences

Campaign progression and tutorial completion now resolve through shared state helpers rather than ad hoc `curLvl + 1` flow.

## Documentation Map

### Start here

- [AGENTS.md](AGENTS.md)
- [stabilization-status.md](docs/project/stabilization-status.md)
- [source-structure.md](docs/project/source-structure.md)

### Mechanics

- [energy-model.md](docs/implementation/energy-model.md)
- [tentacle-lifecycle.md](docs/implementation/tentacle-lifecycle.md)
- [capture-and-ownership.md](docs/implementation/capture-and-ownership.md)
- [relay-mechanics.md](docs/implementation/relay-mechanics.md)
- [shared-burst-mechanics.md](docs/implementation/shared-burst-mechanics.md)
- [ai-relay-targeting.md](docs/implementation/ai-relay-targeting.md)

### UX / Systems / Continuity

- [ui-ux-visual-sweep.md](docs/implementation/ui-ux-visual-sweep.md)
- [graphics-profiles.md](docs/implementation/graphics-profiles.md)
- [local-persistence-guardrails.md](docs/implementation/local-persistence-guardrails.md)
- [render-performance-instrumentation.md](docs/implementation/render-performance-instrumentation.md)
- [content-alignment-review.md](docs/implementation/content-alignment-review.md)

### Campaign / Balance

- [campaign-balance-wave-a.md](docs/project/campaign-balance-wave-a.md)
- [playtest-balance-plan.md](docs/project/playtest-balance-plan.md)
- [priority-phase-balance-pass.md](docs/project/priority-phase-balance-pass.md)

## Development Notes

### Guardrails

If you change:

- gameplay rules
- fixed campaign layouts
- settings
- tutorial
- story
- persistence
- world mechanics

you should also update the relevant validation scripts or documentation.

### High-risk files

- `src/entities/Tent.js`
- `src/entities/TentCombat.js`
- `src/core/Game.js`
- `src/systems/WorldSystems.js`
- `src/config/gameConfig.js`
- `src/levels/FixedCampaignLayouts.js`

## Roadmap

The heavy stabilization phase is effectively complete.

The highest-value next steps are:

1. playtest the hardest authored phases
2. continue campaign balance from evidence
3. polish selectively
4. only then begin the deeper Tentacle Wars fidelity wave

## License

MIT.
