/* ================================================================
   NODE WARS v3 — Constants, Enums, Level Data
   ================================================================ */

/* ── ENUMS ── */

/** Unified node type enum — replaces the dual type/isRelay pattern. */
export const NodeType = Object.freeze({
  NORMAL: 'n',
  HAZARD: 'h',
  RELAY:  'r',
  PULSAR: 'p',
  SIGNAL: 's',   // W3 Signal Tower — captures grant 8s full-map fog reveal
});

/** Tentacle state machine values — replaces bare string comparisons. */
export const TentState = Object.freeze({
  GROWING:    'growing',
  ACTIVE:     'active',
  ADVANCING:  'advancing',
  RETRACTING: 'retracting',
  BURSTING:   'bursting',   // Kamikaze cut: tail rushes forward to deal burst damage
  DEAD:       'dead',
});

/* ── PHYSICS CONSTANTS ── */
export const MAX_E    = 200;  // visual/fallback cap — actual cap is per-level cfg.ec
export const LVL_STEP = 50;   // energy threshold per level (0→250 in 5 steps)

/**
 * GAME_BALANCE — Centralized physics configuration.
 *
 * All pacing parameters live here. Tweak these to speed up or slow down
 * the game without hunting through physics code.
 *
 * Zero-Sum model (matches original Tentacle Wars):
 *   A node's tier regen is the total energy budget it can output.
 *   That budget is split among active tentacles — the node does NOT
 *   self-regenerate while tentacles are draining it.
 */
export const GAME_BALANCE = {

  // Energy generated per second at each level (0–5). Exponential scale.
  // Level 0 = Spore (0.5 e/s) → Level 5 = Dominator (8.0 e/s). 16× range.
  TIER_REGEN: [0.5, 1.0, 1.5, 2.0, 4.0, 8.0],

  // Energy threshold to capture a neutral cell. Lower = faster captures.
  // Original Tentacle Wars used a small threshold (~10). Was 20 before.
  EMBRYO_COST: 10,

  // ── PACING MULTIPLIERS ─────────────────────────────────────────────────
  // These multiply on top of the zero-sum tier values. Set all to 1.0 for
  // a strict Tentacle Wars clone, or tune for NODE WARS pacing.

  // Global multiplier for all regeneration (GNode self-regen + tentFeedPerSec).
  // Raise above 1.0 to speed up the whole game; lower to slow it down.
  GLOBAL_REGEN_MULT: 1.0,

  // Multiplier applied to capture contributions against neutral cells.
  // Default 4.0: a tier-0 node captures a neutral cell in ~6s instead of 24s.
  // This compensates for the small tier-0 regen (0.5 e/s) that would make
  // early captures painfully slow while keeping late-game pacing correct.
  CAPTURE_SPEED_MULT: 4.0,

  // Multiplier applied to damage dealt to enemy nodes.
  // Raise to create more aggressive combat; lower for defensive games.
  ATTACK_DAMAGE_MULT: 1.0,

  // Tentacles can carry this fraction above the node's exact tier regen.
  // 1.1 = 10% tolerance, making the bandwidth cap a real but forgiving limit.
  TENTACLE_BANDWIDTH_TOLERANCE: 1.1,

  // Tentacle travel speed in px/s (reserved for future explicit distance-speed tuning).
  TENTACLE_SPEED: 250,

  // Scales how fast the clash front moves per unit of force difference.
  // Higher = more volatile clashes that resolve quickly.
  CLASH_VOLATILITY: 0.20,

  // Payload multiplier when a kamikaze burst (cutRatio > 0.7) reaches its target.
  SLICE_BURST_MULT: 1.5,
};

// Convenience aliases — used throughout the codebase (avoid breaking imports).
export const TIER_REGEN = GAME_BALANCE.TIER_REGEN;
export const EMBRYO     = GAME_BALANCE.EMBRYO_COST;
export const BUILD_B    = 4;     // flat build cost
export const BUILD_PX   = 0.046; // build cost per pixel of distance
export const DOM_MULT   = 0.22;  // damage multiplier per level
export const CLASH_S    = 0.14;  // clash front shift speed (e/s)
export const FLOW_SPD   = 160;   // energy transit speed (px/s)
export const FOG_R      = 240;   // player vision radius (px)
export const GROW_PPS   = 220;   // tentacle growth speed (px/s, visual)
export const ADV_PPS    = 300;   // post-clash advance speed (px/s)
export const ORB_IVB    = 0.55;  // base orb spawn interval (s)

/* ── CELL PROGRESSION ── */
export const MAX_SLOTS = [1, 2, 3, 4, 5, 5]; // outgoing tentacle slots per level (0-5)
export const SIDES     = [0, 3, 4, 6, 8, 10]; // polygon sides per level
export const CP  = ['#00b8d9','#00ccb8','#00e5ff','#55faff','#ffffff','#ffffaa']; // player colours
export const CE  = ['#c01830','#ee1e3e','#ff3d5a','#ff7090','#ffb8c8','#ffddee']; // enemy (red) colours
export const CE3 = ['#9020cc','#a030dd','#c040ff','#d060ff','#e090ff','#f0b8ff']; // enemy (purple) colours

/* ── VISUAL THEMES ── */
export const THEMES = {
  DARK: {
    bgW1: '#04070f',
    bgW2: '#070415',
    bgW3: '#080602',
    grid: 'rgba(0,229,255,0.016)',
  },
  LIGHT: {
    bgW1: '#e8ecef',
    bgW2: '#e2dce8',
    bgW3: '#e8e5dc',
    grid: 'rgba(0,0,0,0.05)',
  },
};

/* ── WORLDS ── */
export const WORLDS = [
  { id:1, name:'GENESIS',     col:'#00e5ff', glow:'rgba(0,229,255,0.22)',
    desc:'The origin cluster. Master flow, cuts and evolution.' },
  { id:2, name:'THE VOID',    col:'#c040ff', glow:'rgba(192,64,255,0.22)',
    desc:'Hazard vortexes drain tentacles that cross their shadow. Route wisely.' },
  { id:3, name:'NEXUS PRIME', col:'#f5c518', glow:'rgba(245,197,24,0.22)',
    desc:'Relay nodes amplify flow. Pulsars broadcast energy bursts — control them first.' },
];

/* ── DIFFICULTY PRESETS ── */
/*
  Reusable spread objects for level config — apply with { ...DIFFICULTY.EASY, ...overrides }.
  Tune aiMs (AI think interval in seconds) and dm (distance-cost multiplier per pixel).
  Lower aiMs = faster AI decisions; higher dm = more expensive long-range tentacles.
*/
export const DIFFICULTY = {
  EASY:   { aiMs: 9.0, dm: 0.04 },
  NORMAL: { aiMs: 5.0, dm: 0.06 },
  HARD:   { aiMs: 2.5, dm: 0.09 },
  PURPLE: { aiMs: 1.8, dm: 0.10 },
};

/* ── LEVEL DATA ── */
/*
  New flags:
    sym     — symmetric mirrored layout (W1 ECHO boss)
    bk:N    — N neutral nodes start as level-2 bunkers (hard capture)
    bkrl:N  — N relay nodes start as fortresses (hard capture)
    pchz:S  — all vortexes pulse on/off every S seconds
    mvhz:N  — first N vortexes are moving (sinusoidal drift)
    supervhz— last vortex spawned is a super-vortex (2× radius, 3× drain)
    sig:N   — N signal tower nodes; capturing one reveals full map for 8s
    superps — first pulsar spawned is the Nexus Core (map-wide broadcast)
*/
export const LEVELS = [
  /* TUT W1 */
  { id:0,  w:0, ec:100, tutW:1, name:'TUTORIAL',         nodes:5,  ai:0, aiE:0,  pE:40, aiMs:99,  dm:0.05, nr:[20,45], par:999, tut:true },
  /* W1 — GENESIS ── Tier 1: The Pulse */
  { id:1,  w:1, ec:80,  name:'FIRST LIGHT',   nodes:6,  ai:1, aiE:18, pE:32, ...DIFFICULTY.EASY,                    nr:[14,34], par:55  },
  { id:2,  w:1, ec:85,  name:'TWIN AXIS',     nodes:7,  ai:1, aiE:25, pE:28, ...DIFFICULTY.EASY, aiMs:7.5, dm:0.05, nr:[14,40], par:72  },
  { id:3,  w:1, ec:90,  name:'THE BRIDGE',    nodes:8,  ai:1, aiE:28, pE:28, ...DIFFICULTY.EASY, aiMs:6.5, dm:0.05, nr:[16,45], par:90  },
  /* W1 ── Tier 2: The Struggle */
  { id:4,  w:1, ec:95,  name:'TRIANGLE WAR',  nodes:9,  ai:2, aiE:26, pE:30, aiMs:5.5, dm:0.06, nr:[18,52], par:110 },
  { id:5,  w:1, ec:100, name:'SIEGE RING',    nodes:10, ai:2, aiE:30, pE:30, aiMs:5.0, dm:0.07, nr:[20,55], par:128 },
  { id:6,  w:1, ec:110, name:'THE FORK',      nodes:11, ai:2, aiE:34, pE:32, aiMs:4.3, dm:0.07, nr:[22,60], par:148 },
  /* W1 ── Tier 3: The Collapse — Bunker Nodes */
  { id:7,  w:1, ec:115, name:'DEADLOCK',      nodes:12, ai:3, aiE:40, pE:34, aiMs:3.0, dm:0.08, nr:[25,68], par:172 },
  { id:8,  w:1, ec:120, name:'FORTRESS',      nodes:13, ai:3, aiE:46, pE:35, aiMs:2.6, dm:0.09, nr:[28,72], par:202, bk:3 },
  { id:9,  w:1, ec:125, name:'OMEGA GRID',    nodes:14, ai:4, aiE:52, pE:36, aiMs:2.1, dm:0.10, nr:[30,80], par:238, bk:4 },
  /* W1 ── Boss: The Mirror */
  { id:10, w:1, ec:130, name:'ECHO',          nodes:15, ai:1, aiE:40, pE:40, aiMs:1.2, dm:0.12, nr:[35,90], par:268, sym:true },
  /* TUT W2 */
  { id:11, w:2, ec:130, tutW:2, name:'VOID TUTORIAL',  nodes:5,  ai:1, aiE:20, pE:40, aiMs:8.0, dm:0.06, nr:[15,40], par:999, tut:true, hz:1 },
  /* W2 — THE VOID ── Tier 1: The Drain Field */
  { id:12, w:2, ec:130, name:'ENTROPY',       nodes:8,  ai:1, aiE:24, pE:30, aiMs:6.5, dm:0.06, nr:[15,45], par:88,  hz:1 },
  { id:13, w:2, ec:135, name:'THE RIFT',      nodes:9,  ai:1, aiE:28, pE:28, aiMs:5.8, dm:0.06, nr:[15,50], par:105, hz:2 },
  { id:14, w:2, ec:140, name:'DRAIN FIELD',   nodes:10, ai:2, aiE:32, pE:30, aiMs:5.0, dm:0.07, nr:[18,55], par:122, hz:2 },
  /* W2 ── Tier 2: Moving Shadows — Pulsing Vortexes */
  { id:15, w:2, ec:145, name:'CORRIDORS',     nodes:10, ai:2, aiE:35, pE:32, aiMs:4.5, dm:0.07, nr:[20,55], par:134, hz:3 },
  { id:16, w:2, ec:150, name:'STATIC VOID',   nodes:11, ai:2, aiE:40, pE:32, aiMs:4.0, dm:0.08, nr:[22,60], par:152, hz:4 },
  { id:17, w:2, ec:155, name:'PHANTOM',       nodes:11, ai:3, aiE:42, pE:34, aiMs:3.5, dm:0.08, nr:[22,60], par:168, hz:4, pchz:6 },
  /* W2 ── Tier 3: The Maelstrom — Moving + Pulsing Vortexes */
  { id:18, w:2, ec:160, name:'MAELSTROM',     nodes:12, ai:3, aiE:48, pE:34, aiMs:3.0, dm:0.09, nr:[25,68], par:188, hz:5, mvhz:3, pchz:6 },
  { id:19, w:2, ec:165, name:'VORTEX RING',   nodes:13, ai:3, aiE:54, pE:36, aiMs:2.6, dm:0.09, nr:[28,72], par:215, hz:5, mvhz:5 },
  { id:20, w:2, ec:170, name:'ABYSS GATE',    nodes:14, ai:4, aiE:60, pE:38, aiMs:2.2, dm:0.10, nr:[28,78], par:244, hz:6, mvhz:6 },
  /* W2 ── Boss: Heart of the Void — Super-Vortex + Purple Incursion */
  { id:21, w:2, ec:175, name:'OBLIVION',      nodes:15, ai:4, aiE:65, pE:40, aiMs:1.6, dm:0.11, nr:[32,88], par:262, hz:6, mvhz:3, pchz:5, supervhz:true, ai3:1, aiE3:50 },
  /* TUT W3 */
  { id:22, w:3, ec:175, tutW:3, name:'NEXUS TUTORIAL', nodes:5,  ai:1, aiE:20, pE:40, aiMs:8.0, dm:0.06, nr:[15,40], par:999, tut:true, rl:1, ps:1 },
  /* W3 — NEXUS PRIME ── Tier 1: Signal Acquisition */
  { id:23, w:3, ec:175, name:'RESONANCE',     nodes:9,  ai:2, aiE:28, pE:28, aiMs:5.5, dm:0.06, nr:[18,50], par:98,  rl:3, ps:0 },
  { id:24, w:3, ec:178, name:'RELAY RACE',    nodes:10, ai:2, aiE:32, pE:30, aiMs:5.0, dm:0.06, nr:[20,55], par:114, rl:4, ps:0 },
  { id:25, w:3, ec:182, name:'FIRST PULSE',   nodes:10, ai:2, aiE:35, pE:30, aiMs:4.5, dm:0.07, nr:[20,58], par:128, rl:3, ps:1 },
  /* W3 ── Tier 2: Frequency War — Relay Fortresses */
  { id:26, w:3, ec:185, name:'BROADCAST',     nodes:11, ai:3, aiE:38, pE:32, aiMs:4.0, dm:0.07, nr:[22,60], par:146, rl:3, ps:2 },
  { id:27, w:3, ec:188, name:'OVERCLOCK',     nodes:12, ai:3, aiE:44, pE:32, aiMs:3.6, dm:0.08, nr:[25,65], par:165, rl:4, ps:2 },
  { id:28, w:3, ec:191, name:'FORTIFIED SIGNAL', nodes:12, ai:3, aiE:48, pE:34, aiMs:3.2, dm:0.08, nr:[25,68], par:184, rl:3, ps:3, bkrl:2 },
  /* W3 ── Tier 3: Maximum Throughput — Signal Towers + Purple Threat */
  { id:29, w:3, ec:194, name:'CASCADE',       nodes:13, ai:4, aiE:52, pE:36, aiMs:2.8, dm:0.09, nr:[28,72], par:204, rl:5, ps:3, ai3:1, aiE3:42 },
  { id:30, w:3, ec:196, name:'SIGNAL LOCK',   nodes:14, ai:4, aiE:58, pE:38, aiMs:2.4, dm:0.09, nr:[30,78], par:230, rl:5, ps:3, sig:1, ai3:1, aiE3:48 },
  { id:31, w:3, ec:198, name:'APEX',          nodes:14, ai:5, aiE:65, pE:38, aiMs:2.0, dm:0.10, nr:[32,82], par:260, rl:6, ps:4, sig:1, ai3:1, aiE3:55 },
  /* W3 ── Boss: Nexus Core — Super-Pulsar + Relay Fortresses + Signal Tower + Purple Dominance */
  { id:32, w:3, ec:200, name:'TRANSCENDENCE', nodes:15, ai:5, aiE:72, pE:42, aiMs:1.5, dm:0.11, nr:[35,90], par:288, rl:6, ps:4, sig:1, bkrl:3, superps:true, ai3:2, aiE3:62 },
];

/** Returns the world id for a given level id. Derived from LEVELS data — no more magic ranges. */
export function worldOf(id) {
  const lv = LEVELS.find(l => l.id === id);
  return lv ? (lv.w || 1) : 1;
}

export function starsFor(sc) {
  if (sc === null || sc <= 0) return 0;
  if (sc >= 700) return 3;
  if (sc >= 430) return 2;
  if (sc >= 200) return 1;
  return 0;
}
