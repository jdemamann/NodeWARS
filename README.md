# NODE WARS

> *The network is alive. Energy flows. Nodes evolve. Dominate the grid — or be consumed by it.*

A browser-based real-time strategy game built entirely with **Vanilla JS ES Modules** and **HTML5 Canvas**. No framework. No bundler. No dependencies. Open `index.html` and play.

---

## Gameplay

You control a network of **nodes** connected by **tentacles** that carry energy. Capture neutral nodes, evolve your cells, and crush the enemy before they overwhelm you.

### Core Mechanics

| Action | How |
|---|---|
| **Select a node** | Click one of your nodes |
| **Send tentacle** | Click a target (neutral or enemy) |
| **Retract all** | Click your selected node again |
| **Reverse flow** | Click a node already receiving your tentacle |
| **Cut links** | Right-click drag across tentacles |

**Energy** flows through tentacles using a **zero-sum model**: a node's total energy budget is split among its active tentacles — the node does *not* self-regenerate while it is draining. Nodes evolve through 5 tiers as they accumulate energy, unlocking more outgoing tentacle slots and increasing damage output. A freshly captured node starts at tier 0 with minimum energy — protect it fast.

### Scoring

Stars are awarded based on score at the moment of victory:

| Stars | Score threshold |
|---|---|
| ⭐⭐⭐ | ≥ 700 |
| ⭐⭐ | ≥ 430 |
| ⭐ | ≥ 200 |

Par time is shown per level. Beat it to maximize your score.

---

## Energy Physics — Zero-Sum Flow

NODE WARS uses the same **zero-sum energy model** as the original *Tentacle Wars*.

### Tier Regeneration

Each node regenerates at a fixed rate determined by its evolution tier. There is no randomness — tier is everything:

| Tier | Name       | Regen    | Tentacle slots | Polygon |
|------|------------|----------|----------------|---------|
| 0    | Spore      | 0.5 e/s  | 1              | circle  |
| 1    | Embryo     | 1.0 e/s  | 2              | triangle|
| 2    | Pulsar     | 1.5 e/s  | 3              | square  |
| 3    | Gamma      | 2.0 e/s  | 4              | hexagon |
| 4    | Solar      | 4.0 e/s  | 5              | octagon |
| 5    | Dominator  | 8.0 e/s  | 5              | decagon |

Tier 0 to Tier 5 is a **16× regen increase**. Evolving a node is the core strategic imperative.

### Zero-Sum Rule

A node's tier regen is its **total energy budget** per second. That budget is redirected entirely into its active tentacles — the node stops self-regenerating while tentacles are draining it. With 2 tentacles active, each receives half the budget. With 3, each receives a third.

This means:
- Sending many tentacles from a weak node dilutes each one — spread too thin and nothing gets done.
- Evolving a node before expanding is almost always the better play.
- Cutting an enemy's tentacles restores their self-regen and slows their evolution.

### Split Budget (Self vs. Tentacle)

While a node has active tentacles, its tier regen is split between self-growth and tentacle feed. The split is controlled by `SELF_REGEN_FRAC` (default `0.3`):

```
Tier 0 node (0.5 e/s), 1 active tentacle, SELF_REGEN_FRAC = 0.3:
  Node self-regen:  0.5 × 0.30 = 0.15 e/s  (source still grows, slowly)
  Tentacle carries: 0.5 × 0.70 = 0.35 e/s  (sent to ally/neutral)
  Total generated:  0.50 e/s  ← zero-sum preserved, no energy duplication
```

When idle (no active tentacles), the node keeps 100% of its regen.

With `SELF_REGEN_FRAC = 0.0` the model is pure soma-zero — source frozen while feeding, exactly like original Tentacle Wars. The default `0.3` prevents low-tier nodes from stalling permanently after paying the build cost of a tentacle.

### Bandwidth Cap

Each tentacle has a hard bandwidth ceiling of `tier_regen × 1.1`. This cap is real and tight — a tier-0 tentacle can carry at most **0.55 e/s**, not the 10–35 e/s the game previously allowed. Higher-tier tentacles carry proportionally more.

---

## Balancing (GAME_BALANCE)

All physics pacing lives in a single object in `src/constants.js`:

```js
export const GAME_BALANCE = {
  TIER_REGEN: [0.5, 1.0, 1.5, 2.0, 4.0, 8.0], // e/s per tier
  EMBRYO_COST: 10,           // energy to capture a neutral cell

  GLOBAL_REGEN_MULT:  1.0,   // scales ALL regeneration — raise to speed the whole game up
  CAPTURE_SPEED_MULT: 4.0,   // how fast neutral cells are captured (4.0 ≈ 6s at tier 0)
  ATTACK_DAMAGE_MULT: 1.0,   // scales combat damage — raise for more aggressive combat
  TENTACLE_BANDWIDTH_TOLERANCE: 1.1, // tentacles can carry 10% above tier regen

  SELF_REGEN_FRAC: 0.3,      // fraction of tier regen kept by source while feeding
                             // 0.0 = pure soma-zero (source frozen), 0.3 = recommended
};
```

To speed up the early game, raise `GLOBAL_REGEN_MULT`. To make captures feel snappier, raise `CAPTURE_SPEED_MULT`. To create a more defensive meta, lower `ATTACK_DAMAGE_MULT`. No other file needs touching.

---

## Worlds

The campaign spans **3 worlds** across **32 levels** (plus 3 tutorials).

### World 1 — GENESIS
*The origin cluster. Master flow, cuts, and node evolution.*

10 levels of pure strategy. Learn to route energy, siege fortified bunker nodes, and survive the mirror boss **ECHO** — a symmetric layout where every move you make, the AI mirrors.

### World 2 — THE VOID
*Hazard vortexes drain tentacles that cross their shadow. Route wisely.*

Purple vortex hazards bleed energy from any tentacle passing through their radius. Later levels feature **pulsing vortexes** (dormant then suddenly active) and **moving vortexes** that drift sinusoidally across the map. The boss, **OBLIVION**, fields a Super-Vortex with double radius and triple drain.

### World 3 — NEXUS PRIME
*Relay nodes amplify flow. Pulsars broadcast energy bursts — control them first.*

**Relay nodes** act as amplifiers: capturing one boosts the flow rate of every tentacle passing through it. **Pulsar beacons** periodically broadcast energy bursts to all nearby player-owned nodes. **Signal Towers** grant 8 seconds of full-map fog-of-war reveal when captured. The final boss, **TRANSCENDENCE**, combines all three mechanics plus a map-wide Nexus Core pulsar.

Worlds 2 and 3 are unlocked in **Settings**.

---

## Features

- **Zero dependencies** — pure ES Modules, no build step, runs from `file://`
- **Procedural audio** — fully synthesized music and SFX via Web Audio API; no audio files
- **4 adaptive soundtracks** — menu theme + one per world, each with distinct BPM and chord progression
- **Fog of War** — enemy territory is hidden; Signal Towers reveal the full map temporarily
- **AI personalities** — AI shifts between `expand`, `siege`, and `aggressive` strategies based on level progression
- **Object pooling** — orbs and free-orbs reuse pooled objects to eliminate GC pressure
- **High Graphics mode** — shadow and glow effects toggle for performance tuning
- **Bilingual** — full Portuguese and English support, switchable at runtime
- **Persistent progress** — completed levels, scores, and settings saved to `localStorage`
- **4 UI fonts** — Orbitron, Share Tech Mono, Rajdhani, Exo 2, plus a text zoom slider

---

## Project Structure

```
nodewars-v2/
├── index.html              # Entry point — all static DOM, zero JS inline
├── styles/
│   └── main.css            # All styling: HUD, screens, buttons, animations
└── src/
    ├── main.js             # Bootstrap: load state, wire DOM listeners, init game
    ├── Game.js             # Game loop, input handling, level loading, update pipeline
    ├── GameState.js        # Singleton STATE — persistent cross-cutting state
    ├── EventBus.js         # Pub/sub bus for decoupled audio/UI event wiring
    ├── constants.js        # Enums, GAME_BALANCE (pacing config), world data, all 32 level configs
    ├── utils.js            # Pure math helpers (distance, bezier, build cost, etc.)
    ├── storage.js          # Safe localStorage wrapper (falls back to in-memory)
    ├── i18n.js             # PT/EN translation strings + applyLang()
    │
    ├── entities/
    │   ├── GNode.js        # Grid node: owner, energy, level, type, fog state
    │   ├── Tent.js         # Tentacle: state machine (growing→active→clashing→dead)
    │   └── Orb.js          # Energy orb particles + OrbPool + FreeOrbPool
    │
    ├── systems/
    │   ├── Physics.js      # Zero-sum energy flow, clash resolution, vortex/pulsar, fog, camera
    │   ├── AI.js           # Enemy AI with personality-driven scoring weights
    │   └── Tutorial.js     # Step-by-step tutorial overlay system
    │
    ├── renderer/
    │   ├── Renderer.js     # Main render pass: clears, camera transform, delegates to sub-renderers
    │   ├── NodeRenderer.js # Draws nodes (polygon, glow, energy bar, level pip)
    │   ├── TentRenderer.js # Draws tentacles (bezier curves, clash fronts, flow orbs)
    │   ├── HazardRenderer.js # Draws vortexes (W2) and pulsars (W3)
    │   ├── BGRenderer.js   # Draws the animated background grid
    │   └── UIRenderer.js   # Draws in-canvas UI (fog overlay, world banner)
    │
    ├── audio/
    │   ├── Music.js        # Procedural music engine — 4 synthesized tracks
    │   └── Audio.js        # SFX engine — procedural sound effects for every game event
    │
    └── ui/
        ├── Screens.js      # Screen manager: showScr, fadeGo, buildWorldTabs, endLevel
        ├── HUD.js          # In-game HUD updater (score counters, level label, hints)
        └── IDS.js          # Central registry of all DOM element IDs
```

### Architecture at a Glance

```
main.js
  └── Game (game loop owner)
        ├── Physics     (simulation — no rendering)
        ├── AI          (reads game state, emits Tent actions)
        ├── Tutorial    (reads game state, drives overlay)
        ├── Renderer    (render pass delegator)
        │     ├── NodeRenderer
        │     ├── TentRenderer
        │     ├── HazardRenderer
        │     ├── BGRenderer
        │     └── UIRenderer
        └── EventBus    (audio wiring: game events → SFX/Music calls)
```

State lives in the `STATE` singleton (`GameState.js`). Everything imports it directly — no prop drilling, no context, no store library.

---

## Running Locally

No installation required.

```bash
# Option A — open directly (Chromium-based browsers support ES modules from file://)
open index.html

# Option B — local server (recommended for Firefox)
npx serve .
# or
python3 -m http.server 8080
```

---

## Level Configuration

Every level is a plain object in `constants.js → LEVELS[]`. To design a level, add an entry:

```js
{
  id:   33,          // unique id (continue from 32)
  w:    3,           // world (1, 2, or 3)
  name: 'MY LEVEL',  // display name

  ec:    150,        // energy cap for all nodes in this level (80–200 across worlds)
  nodes: 10,         // total node count (player + enemy + neutral)
  ai:    2,          // number of AI-controlled enemy factions
  aiE:   32,         // starting energy for each AI node
  pE:    30,         // starting energy for the player node
  aiMs:  4.5,        // AI action interval (seconds) — lower = faster AI
  dm:    0.07,       // damage multiplier per node level
  nr:    [20, 55],   // node radius range [min, max] in pixels
  par:   120,        // par score for 3-star rating

  // Optional flags:
  hz:       2,       // number of vortex hazards (W2)
  rl:       3,       // number of relay nodes (W3)
  ps:       1,       // number of pulsar beacons (W3)
  sig:      1,       // number of signal towers (W3)
  bk:       2,       // N neutral nodes start as level-2 bunkers
  bkrl:     1,       // N relay nodes start as fortresses
  mvhz:     2,       // first N vortexes drift (sinusoidal movement)
  pchz:     6,       // vortexes pulse on/off every N seconds
  supervhz: true,    // last vortex is a super-vortex (2× radius, 3× drain)
  superps:  true,    // first pulsar is the Nexus Core (map-wide broadcast)
  sym:      true,    // symmetric mirrored layout (boss pattern)
  tut:      true,    // marks this as a tutorial level
}
```

---

## Settings

| Setting | Description |
|---|---|
| **World 2: The Void** | Unlocks W2 levels in the campaign |
| **World 3: Nexus Prime** | Unlocks W3 levels in the campaign |
| **Sound Effects** | Procedural audio feedback on game events |
| **Music** | Adaptive procedural soundtrack |
| **High Graphics** | Shadow and glow effects — disable on low-end devices |
| **UI Font** | Cycle between Orbitron, Share Tech Mono, Rajdhani, Exo 2 |
| **Text Size** | Scale the UI from 50% to 200% |
| **Language** | Portuguese or English |
| **Debug Mode** | Unlocks all levels, shows internal state panel |

---

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome / Edge (108+) | Fully supported |
| Firefox (110+) | Fully supported (requires local server) |
| Safari (16+) | Supported |
| Mobile Chrome / Safari | Supported (touch input fully mapped) |

Web Audio API is required for music and SFX. The game runs silently if unavailable.

---

## License

MIT — do whatever you want, just don't claim you built the procedural music engine.
