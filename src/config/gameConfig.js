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
export const MAX_E    = 200;  // visual/fallback cap — actual cap is per-level cfg.nodeEnergyCap
export const LVL_STEP = 50;   // energy threshold per level (0→250 in 5 steps)

/**
 * GAME_BALANCE — Centralized physics configuration.
 *
 * All pacing parameters live here. Tweak these to speed up or slow down
 * the game without hunting through physics code.
 *
 * Unified budget model:
 *   A node always regenerates by tier.
 *   Active tentacles then drain against that budget explicitly.
 *   Normal support flow reserves a small self-regen share so feeder nodes
 *   can still level slowly while sustaining allied links.
 */
export const GAME_BALANCE = {

  // Energy generated per second at each level (0–5).
  // Level 0 now starts at 1.0 e/s to make the opening less sluggish while
  // preserving the same absolute step increases as the prior tuning.
  TIER_REGEN: [1.0, 1.5, 2.0, 2.5, 4.5, 8.5],

  // Energy threshold to capture a neutral cell. Lower = faster captures.
  // Original Tentacle Wars used a small threshold (~10). Was 20 before.
  EMBRYO_COST: 10,

  // ── PACING MULTIPLIERS ─────────────────────────────────────────────────
  // These multiply on top of the zero-sum tier values. Set all to 1.0 for
  // a strict Tentacle Wars clone, or tune for NODE WARS pacing.

  // Global multiplier for all regeneration (GameNode self-regen + tentFeedPerSec).
  // Raise above 1.0 to speed up the whole game; lower to slow it down.
  GLOBAL_REGEN_MULT: 1.0,

  // Multiplier applied to capture contributions against neutral cells.
  // Default 2.0 keeps early neutral captures close to the prior pacing even
  // after raising tier-0 regen from 0.5 e/s to 1.0 e/s.
  CAPTURE_SPEED_MULT: 2.0,

  // How allied owners interact while racing for a neutral node:
  // - 'sum': allied red/purple contributions add together toward one threshold
  // - 'lockout': once one allied owner starts the capture, the other stays out
  // This is intentionally parametrized so coalition difficulty can be tuned
  // without rewriting neutral-capture combat logic later.
  NEUTRAL_CAPTURE_ALLIANCE_MODE: 'sum',

  // Multiplier applied to damage dealt to enemy nodes.
  // Raise to create more aggressive combat; lower for defensive games.
  ATTACK_DAMAGE_MULT: 1.0,

  // Tentacles can carry this fraction above the node's exact tier regen.
  // 1.1 = 10% tolerance, making the bandwidth cap a real but forgiving limit.
  TENTACLE_BANDWIDTH_TOLERANCE: 1.1,

  // Fraction of the node's regen that stays with the node while it is feeding
  // through active tentacles. This keeps allied support links from freezing
  // the source node's growth completely.
  SELF_REGEN_FRACTION: 0.30,

  // Temporary self-regen boost granted by player frenzy.
  // 1.35 matches the user-facing "+35% regen" tutorial and toast copy.
  FRENZY_REGEN_MULT: 1.35,

  // Tentacle travel speed in px/s (reserved for future explicit distance-speed tuning).
  TENTACLE_SPEED: 250,

  // Scales how fast the clash front moves per unit of force difference.
  // Higher = more volatile clashes that resolve quickly.
  CLASH_VOLATILITY: 0.20,

  // Visual-only speed used when a fresh ACTIVE↔ACTIVE clash is formed.
  // The real clash front still resolves from force balance; this just animates
  // the lane from the incumbent side toward the middle instead of popping there.
  CLASH_VISUAL_APPROACH_SPEED: 2.8,

  // Clashes should cost more commitment than ordinary support/attack flow.
  // This multiplier is applied to the per-tentacle output share when two
  // tentacles are directly fighting over the same lane.
  CLASH_DRAIN_MULTIPLIER: 1.25,

  // Payload multiplier when a kamikaze burst (cutRatio < 0.3) reaches its target.
  SLICE_BURST_MULT: 1.5,

  // Relay nodes amplify outgoing transfer by this multiplier.
  RELAY_FLOW_MULT: 1.45,

  // Nodes under attack should feel pressured, but they must not hard-stop all
  // outgoing flow or matches can stall. 0.55 means max attack state keeps 45%
  // of the node's normal outgoing budget.
  UNDER_ATTACK_OUTPUT_DAMPING_MAX: 0.55,
};

export const BUILD_RULES = {
  // Flat cost applied to every new tentacle. Raise to make all expansion more
  // deliberate; lower to make spam openings easier.
  BASE_COST: 3,
  // Distance component of build cost in energy per pixel. This is the global
  // "long links are expensive" knob, before per-level distance multipliers.
  COST_PER_PIXEL: 0.028,
};

export const TENTACLE_RULES = {
  // Body growth speed from source to target. Raising this shortens the window
  // where a tentacle is vulnerable during construction.
  GROW_SPEED_PX_PER_SEC: 220,
  // Speed used by burst / advancing states once the tentacle is already built.
  ADVANCE_SPEED_PX_PER_SEC: 300,
  // Visual flow speed for orb/pulse motion along the lane.
  FLOW_SPEED_PX_PER_SEC: 160,
  TENTACLE_SPEED: GAME_BALANCE.TENTACLE_SPEED,
  CLASH_VOLATILITY: GAME_BALANCE.CLASH_VOLATILITY,
  SLICE_BURST_MULT: GAME_BALANCE.SLICE_BURST_MULT,
  // Lower = more frequent decorative orb spawns on saturated friendly lanes.
  ORB_BASE_INTERVAL_SEC: 0.55,
};

export const PROGRESSION_RULES = {
  // Slot count by node level. This is one of the strongest macro-pressure knobs.
  MAX_TENTACLE_SLOTS_PER_LEVEL: [1, 2, 3, 4, 5, 5],
  // Polygon sides used for visual silhouette per level. Purely visual.
  NODE_POLYGON_SIDES_PER_LEVEL: [0, 3, 4, 6, 8, 10],
  // Prevents rapid level thrash when a node hovers around an energy threshold,
  // especially on maps where nodeEnergyCap sits exactly on a level boundary.
  LEVEL_DOWN_HYSTERESIS_ENERGY: 4,
};

export const CUT_RULES = {
  // Cut ratios below this use the burst path (source-side kamikaze payload).
  BURST_MAX_RATIO: 0.3,
  // Cut ratios above this refund back to the source side.
  REFUND_MIN_RATIO: 0.7,
};

export const INPUT_TUNING = {
  // Mouse/touch forgiveness around nodes.
  HOVER_HIT_PADDING_PX: 14,
  CLICK_HIT_PADDING_PX: 12,
  // Snap radius used by drag-and-release targeting.
  NODE_SNAP_DISTANCE_PX: 60,
  // Movement threshold before left-drag is treated as drag-connect or slice.
  DRAG_CONNECT_THRESHOLD_PX: 18,
  // Touch-specific threshold before a tap becomes a slice gesture.
  TOUCH_SLICE_DRAG_THRESHOLD_PX: 20,
  // Tap classification tolerances.
  TAP_MAX_DISTANCE_PX: 22,
  TAP_MAX_DURATION_MS: 600,
  // Hold time before the hover pin helper appears on touch.
  LONG_PRESS_DURATION_MS: 400,
};

export const AI_RULES = {
  // Adaptive think-speed envelope. Lower interval = faster reaction.
  SPEED_MULT_MIN: 0.45,
  SPEED_MULT_MAX: 1.65,
  PLAYER_ADVANTAGE_SPEED_FACTOR: 0.5,
  INTERVAL_JITTER_BASE: 0.76,
  INTERVAL_JITTER_RANGE: 0.48,
  // Reduces aggressive expansion when an AI source is already low.
  DEFENSIVE_ENERGY_THRESHOLD: 32,
  // Radius for relay route-value estimation.
  RELAY_CONTEXT_RADIUS_PX: 320,
  // Purple AI must cut inside the source-side burst zone so its strategic
  // cuts still create pressure under the canonical slice rules.
  STRATEGIC_CUT_RATIO: 0.15,
  // Minimum tentacle fill before purple AI considers a strategic cut worth it.
  STRATEGIC_CUT_PIPE_TARGET_RATIO: 0.65,
  // Minimum interval between opportunistic slice attempts. Purple cuts more
  // often because slice is part of its faction identity.
  RED_SLICE_COOLDOWN_SEC: 2.2,
  PURPLE_SLICE_COOLDOWN_SEC: 0.9,
  // Slice scoring gates. Red only cuts when the lane is highly valuable;
  // purple is allowed to threaten the player more often.
  RED_SLICE_SCORE_THRESHOLD: 72,
  PURPLE_SLICE_SCORE_THRESHOLD: 48,
  // Slice scoring components for charged offensive lanes.
  SLICE_LOW_PLAYER_ENERGY_FRACTION: 0.4,
  SLICE_LOW_PLAYER_ENERGY_BONUS: 18,
  SLICE_EXISTING_PRESSURE_BONUS: 16,
  SLICE_LONG_LANE_MIN_PX: 180,
  SLICE_LONG_LANE_BONUS: 10,
  SLICE_CLASH_BREAK_BONUS: 14,
  SLICE_RELAY_STRIKE_BONUS: 14,
  SLICE_OVEREXTENDED_PLAYER_BONUS: 12,
  SLICE_PIPE_TARGET_RATIO_BONUS: 26,
  // Tactical state profile thresholds.
  FINISH_PLAYER_ENERGY_FRACTION: 0.32,
  FINISH_PRESSURE_THRESHOLD: 0.25,
  EXPAND_NEUTRAL_RATIO_THRESHOLD: 0.28,
  RECOVER_LOW_ENERGY_FRACTION: 0.33,
  SUPPORT_UNDER_ATTACK_NODE_THRESHOLD: 1,
  // Tactical state score shaping.
  TACTICAL_EXPAND_NEUTRAL_BONUS: 12,
  TACTICAL_PRESSURE_PLAYER_BONUS: 10,
  TACTICAL_SUPPORT_ALLY_BONUS: 18,
  TACTICAL_FINISH_PLAYER_BONUS: 20,
  TACTICAL_RECOVER_PLAYER_ATTACK_DAMPENER: 0.72,
  // Structural weakness reading for player-owned nodes.
  PLAYER_EXPOSED_OUTCOUNT_THRESHOLD: 2,
  PLAYER_EXPOSED_SUPPORT_PENALTY: 10,
  PLAYER_ISOLATED_DISTANCE_PX: 170,
  PLAYER_ISOLATED_NODE_BONUS: 12,
  PLAYER_THIN_DEFENSE_ENERGY_FRACTION: 0.45,
  PLAYER_THIN_DEFENSE_BONUS: 14,
  // Bonus for continuing a neutral capture where the AI coalition already has
  // meaningful progress invested. Higher = less abandoned neutral pressure.
  ALLIED_CONTEST_CONTINUATION_BONUS: 0.45,
  // Bonus for supporting an allied node that is already under visible player pressure.
  ALLIED_SUPPORT_UNDER_ATTACK_BONUS: 26,
  // Extra score for player nodes that are already close to collapse.
  PLAYER_KILL_CONFIRM_BONUS: 24,
  // Prefer lanes where the player is already pressured or overextended.
  PLAYER_UNDER_ATTACK_PRESSURE_BONUS: 12,
  PLAYER_HIGH_OUTCOUNT_PUNISH_BONUS: 10,
  // Reduce waste by discouraging too many AI lanes onto the same target unless
  // that target is a genuine kill-confirm or decisive coalition objective.
  OVERCOMMIT_NEUTRAL_TARGET_PENALTY: 12,
  OVERCOMMIT_PLAYER_TARGET_PENALTY: 8,
  // Limit low-value multi-source spam onto the same target in one think wave.
  ALLOW_MULTI_SOURCE_PLAYER_FOCUS_THRESHOLD: 82,
};

export const WORLD_RULES = {
  // Fog and signal tower tuning.
  FOG_VISION_RADIUS_PX: 240,
  FOG_RECALC_INTERVAL_SEC: 0.5,
  SIGNAL_REVEAL_DURATION_SEC: 8.0,
  // Pulsar UX timing.
  PULSAR_CHARGE_WARNING_SEC: 1.2,
  PULSAR_CHARGE_COOLDOWN_SEC: 0.8,
  // Camera follow for dramatic pressure moments.
  CAMERA_MAX_OFFSET_PX: 60,
  CAMERA_FOLLOW_STRENGTH: 0.18,
  CAMERA_SMOOTHING: 1.8,
  // Auto-retract safety net for near-dead owned nodes under heavy pressure.
  AUTO_RETRACT_ATTACK_THRESHOLD: 0.88,
  AUTO_RETRACT_ENERGY_FRACTION: 0.08,
  // Default capture thresholds for neutral objectives.
  DEFAULT_CAPTURE_THRESHOLD: 20,
  BUNKER_CAPTURE_THRESHOLD: 60,
};

export const RENDER_RULES = {
  NODE: {
    SLOT_RING_OFFSET_PX: 17,
    SLOT_DOT_RADIUS_PX: 2.8,
    RANGE_RING_THRESHOLDS: [0.33, 0.66, 1.0],
    RANGE_RING_COLORS: ['rgba(0,229,255,0.05)', 'rgba(0,229,255,0.045)', 'rgba(0,229,255,0.18)'],
    CRITICAL_ENERGY_FRACTION: 0.16,
    CRITICAL_ATTACK_THRESHOLD: 0.45,
  },
  TENTACLE: {
    BEZIER_SEGMENTS: 12,
    REVERSED_DASH: [3, 6],
    FRIENDLY_DASH: [15, 8],
    HIGH_FLOW_THRESHOLD: 0.15,
    CLASH_LABEL_Y_OFFSET_PX: 18,
    FLOW_PULSE_COUNT: 3,
    FLOW_PULSE_SPAN: 0.1,
    ROOT_BULB_SCALE: 1.45,
    ROOT_COLLAR_SCALE: 1.9,
    MID_TAPER_SCALE: 0.72,
    TIP_TAPER_SCALE: 0.2,
    ORGANIC_WOBBLE_PX: 1.6,
    CLASH_DISTORTION_PX: 3.2,
    TARGET_IMPACT_RING_SCALE: 1.35,
    ALLY_FEED_PULSE_ALPHA: 0.16,
    ATTACK_IMPACT_ALPHA: 0.28,
    RELAY_SURGE_ALPHA: 0.22,
  },
  UI: {
    HOVER_RING_OFFSET_PX: 8,
    HOVER_PIN_Y_OFFSET_PX: 14,
    PANEL_WIDTH_PX: 168,
    PANEL_ROW_HEIGHT_PX: 17,
    PANEL_PADDING_PX: 10,
    PANEL_TITLE_HEIGHT_PX: 24,
    PANEL_EDGE_MARGIN_PX: 8,
    PANEL_CONNECTOR_DASH: [3, 4],
    SLICER_DASH: [5, 3],
    PREVIEW_REACH_DASH: [5, 5],
    PREVIEW_OVERFLOW_DASH: [3, 9],
    PREVIEW_MIN_DISTANCE_PX: 18,
    PHASE_PANEL_X_PX: 12,
    PHASE_PANEL_Y_PX: 60,
    PHASE_PANEL_WIDTH_PX: 224,
    PHASE_PANEL_MIN_HEIGHT_PX: 56,
  },
  TUTORIAL: {
    GUIDE_DASH: [5, 5],
    DRAG_RELEASE_RING_RADIUS_PX: 14,
  },
  STYLE: {
    NODE_CORE_GLOW_ALPHA: 0.34,
    NODE_NEUTRAL_CORE_ALPHA: 0.18,
    NODE_SPECULAR_ALPHA: 0.18,
  },
};

export const GAMEPLAY_RULES = {
  energy: GAME_BALANCE,
  build: BUILD_RULES,
  tentacle: TENTACLE_RULES,
  cut: CUT_RULES,
  input: INPUT_TUNING,
  progression: PROGRESSION_RULES,
  ai: AI_RULES,
  world: WORLD_RULES,
  render: RENDER_RULES,
};

// Convenience aliases — used throughout the codebase (avoid breaking imports).
export const TIER_REGEN = GAME_BALANCE.TIER_REGEN;
export const EMBRYO     = GAME_BALANCE.EMBRYO_COST;
export const BUILD_B    = BUILD_RULES.BASE_COST;
export const BUILD_PX   = BUILD_RULES.COST_PER_PIXEL;
export const DOM_MULT   = 0.22;  // damage multiplier per level
export const CLASH_S    = 0.14;  // clash front shift speed (e/s)
export const FLOW_SPD   = TENTACLE_RULES.FLOW_SPEED_PX_PER_SEC;
export const FOG_R      = WORLD_RULES.FOG_VISION_RADIUS_PX;
export const GROW_PPS   = TENTACLE_RULES.GROW_SPEED_PX_PER_SEC;
export const ADV_PPS    = TENTACLE_RULES.ADVANCE_SPEED_PX_PER_SEC;
export const ORB_IVB    = TENTACLE_RULES.ORB_BASE_INTERVAL_SEC;

/* ── CELL PROGRESSION ── */
export const MAX_SLOTS = PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL;
export const SIDES     = PROGRESSION_RULES.NODE_POLYGON_SIDES_PER_LEVEL;
export const CP  = ['#00b8d9','#00ccb8','#00e5ff','#55faff','#ffffff','#ffffaa']; // player colours
export const CE  = ['#c01830','#ee1e3e','#ff3d5a','#ff7090','#ffb8c8','#ffddee']; // enemy (red) colours
export const CE3 = ['#9020cc','#a030dd','#c040ff','#d060ff','#e090ff','#f0b8ff']; // enemy (purple) colours

/* ── VISUAL THEMES ── */
export const THEMES = {
  AURORA: {
    bgW1: '#04070f',
    bgW2: '#070415',
    bgW3: '#080602',
    grid: 'rgba(0,229,255,0.016)',
  },
  SOLAR: {
    bgW1: '#15070a',
    bgW2: '#14050f',
    bgW3: '#171004',
    grid: 'rgba(255,180,70,0.024)',
  },
  GLACIER: {
    bgW1: '#eef4f8',
    bgW2: '#edf1fa',
    bgW3: '#eef6f4',
    grid: 'rgba(10,58,86,0.06)',
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
  Tune `aiThinkIntervalSeconds` and `distanceCostMultiplier`.
  Lower think interval = faster AI decisions.
  Higher distance multiplier = more expensive long-range tentacles.
*/
export const DIFFICULTY = {
  EASY:   { aiThinkIntervalSeconds: 9.0, distanceCostMultiplier: 0.04 },
  NORMAL: { aiThinkIntervalSeconds: 5.0, distanceCostMultiplier: 0.06 },
  HARD:   { aiThinkIntervalSeconds: 2.5, distanceCostMultiplier: 0.09 },
  PURPLE: { aiThinkIntervalSeconds: 1.8, distanceCostMultiplier: 0.10 },
};

/* ── LEVEL DATA ── */
/*
  Level config field guide:

  Core pacing:
  - `nodeEnergyCap`: max energy for nodes in the phase
  - `playerStartEnergy`: initial energy of player-owned start nodes
  - `enemyStartEnergy`: initial energy of red AI start nodes
  - `purpleEnemyStartEnergy`: initial energy of purple AI start nodes
  - `aiThinkIntervalSeconds`: baseline AI reaction interval
  - `distanceCostMultiplier`: extra per-pixel tentacle tax for this phase
  - `neutralEnergyRange`: [min,max] starting energy for procedurally seeded neutrals
  - `par`: score pacing reference

  Structure counts:
  - `enemyCount`: red AI starting nodes
  - `purpleEnemyCount`: purple AI starting nodes
  - `relayCount`, `fortifiedRelayCount`
  - `pulsarCount`, `signalTowerCount`
  - `vortexCount`, `movingVortexCount`

  Special flags:
  - `isTutorial`: rigid onboarding level
  - `isBoss`: cannot be skipped and should feel like a world climax
  - `isSymmetricLayout`: authored mirrored layout
  - `hasSuperVortex`, `hasSuperPulsar`

  Tuning rule of thumb:
  - if a phase feels too snowbally, first adjust starting energy or starting-node
    structure in the authored layout
  - if a phase feels too cheap/too expensive to route, adjust `distanceCostMultiplier`
  - if AI feels oppressive, slow `aiThinkIntervalSeconds` before inflating player stats
*/
const RAW_LEVELS = [
  /* TUT W1 */
  { id:0,  worldId:0, nodeEnergyCap:100, tutorialWorldId:1, name:'TUTORIAL', nodes:5, enemyCount:0, enemyStartEnergy:0, playerStartEnergy:40, aiThinkIntervalSeconds:99, distanceCostMultiplier:0.05, neutralEnergyRange:[20,45], par:999, isTutorial:true },
  /* W1 — GENESIS ── Tier 1: The Pulse */
  { id:1,  worldId:1, nodeEnergyCap:80,  name:'FIRST LIGHT', nodes:6,  enemyCount:1, enemyStartEnergy:18, playerStartEnergy:32, ...DIFFICULTY.EASY, neutralEnergyRange:[14,34], par:55 },
  { id:2,  worldId:1, nodeEnergyCap:85,  name:'TWIN AXIS',   nodes:7,  enemyCount:1, enemyStartEnergy:25, playerStartEnergy:28, ...DIFFICULTY.EASY, aiThinkIntervalSeconds:7.5, distanceCostMultiplier:0.05, neutralEnergyRange:[14,40], par:72 },
  { id:3,  worldId:1, nodeEnergyCap:90,  name:'THE BRIDGE',  nodes:8,  enemyCount:1, enemyStartEnergy:28, playerStartEnergy:30, ...DIFFICULTY.EASY, aiThinkIntervalSeconds:6.5, distanceCostMultiplier:0.06, neutralEnergyRange:[16,45], par:90 },
  /* W1 ── Tier 2: The Struggle */
  { id:4,  worldId:1, nodeEnergyCap:95,  name:'TRIANGLE WAR', nodes:9,  enemyCount:2, enemyStartEnergy:26, playerStartEnergy:30, aiThinkIntervalSeconds:5.5, distanceCostMultiplier:0.06, neutralEnergyRange:[18,52], par:110 },
  { id:5,  worldId:1, nodeEnergyCap:100, name:'SIEGE RING',   nodes:10, enemyCount:2, enemyStartEnergy:30, playerStartEnergy:30, aiThinkIntervalSeconds:5.0, distanceCostMultiplier:0.07, neutralEnergyRange:[20,55], par:128 },
  { id:6,  worldId:1, nodeEnergyCap:110, name:'THE FORK',     nodes:11, enemyCount:2, enemyStartEnergy:34, playerStartEnergy:32, aiThinkIntervalSeconds:4.3, distanceCostMultiplier:0.07, neutralEnergyRange:[22,60], par:148 },
  /* W1 ── Tier 3: The Collapse — Bunker Nodes */
  { id:7,  worldId:1, nodeEnergyCap:115, name:'DEADLOCK',   nodes:12, enemyCount:3, enemyStartEnergy:40, playerStartEnergy:34, aiThinkIntervalSeconds:3.0, distanceCostMultiplier:0.08, neutralEnergyRange:[25,68], par:172 },
  { id:8,  worldId:1, nodeEnergyCap:120, name:'FORTRESS',   nodes:13, enemyCount:3, enemyStartEnergy:46, playerStartEnergy:35, aiThinkIntervalSeconds:2.6, distanceCostMultiplier:0.09, neutralEnergyRange:[28,72], par:202, bunkerCount:3 },
  { id:9,  worldId:1, nodeEnergyCap:125, name:'OMEGA GRID', nodes:14, enemyCount:4, enemyStartEnergy:52, playerStartEnergy:36, aiThinkIntervalSeconds:2.1, distanceCostMultiplier:0.10, neutralEnergyRange:[30,80], par:238, bunkerCount:4 },
  /* W1 ── Boss: The Mirror */
  { id:10, worldId:1, nodeEnergyCap:130, name:'ECHO', nodes:15, enemyCount:1, enemyStartEnergy:40, playerStartEnergy:40, aiThinkIntervalSeconds:1.35, distanceCostMultiplier:0.12, neutralEnergyRange:[35,90], par:278, isSymmetricLayout:true, isBoss:true },
  /* TUT W2 */
  { id:11, worldId:2, nodeEnergyCap:130, tutorialWorldId:2, name:'VOID TUTORIAL', nodes:5, enemyCount:1, enemyStartEnergy:16, playerStartEnergy:40, aiThinkIntervalSeconds:8.0, distanceCostMultiplier:0.06, neutralEnergyRange:[15,40], par:999, isTutorial:true, vortexCount:1 },
  /* W2 — THE VOID ── Tier 1: The Drain Field */
  { id:12, worldId:2, nodeEnergyCap:130, name:'ENTROPY',     nodes:8,  enemyCount:1, enemyStartEnergy:22, playerStartEnergy:32, aiThinkIntervalSeconds:6.5, distanceCostMultiplier:0.06, neutralEnergyRange:[15,45], par:94, vortexCount:1 },
  { id:13, worldId:2, nodeEnergyCap:135, name:'THE RIFT',    nodes:9,  enemyCount:1, enemyStartEnergy:28, playerStartEnergy:28, aiThinkIntervalSeconds:5.8, distanceCostMultiplier:0.06, neutralEnergyRange:[15,50], par:105, vortexCount:2 },
  { id:14, worldId:2, nodeEnergyCap:140, name:'DRAIN FIELD', nodes:10, enemyCount:2, enemyStartEnergy:32, playerStartEnergy:30, aiThinkIntervalSeconds:5.0, distanceCostMultiplier:0.07, neutralEnergyRange:[18,55], par:122, vortexCount:2 },
  /* W2 ── Tier 2: Moving Shadows — Pulsing Vortexes */
  { id:15, worldId:2, nodeEnergyCap:145, name:'CORRIDORS',   nodes:10, enemyCount:2, enemyStartEnergy:35, playerStartEnergy:32, aiThinkIntervalSeconds:4.5, distanceCostMultiplier:0.07, neutralEnergyRange:[20,55], par:134, vortexCount:3 },
  { id:16, worldId:2, nodeEnergyCap:150, name:'STATIC VOID', nodes:11, enemyCount:2, enemyStartEnergy:40, playerStartEnergy:32, aiThinkIntervalSeconds:4.0, distanceCostMultiplier:0.08, neutralEnergyRange:[22,60], par:152, vortexCount:4 },
  { id:17, worldId:2, nodeEnergyCap:155, name:'PHANTOM',     nodes:11, enemyCount:3, enemyStartEnergy:42, playerStartEnergy:34, aiThinkIntervalSeconds:3.5, distanceCostMultiplier:0.08, neutralEnergyRange:[22,60], par:168, vortexCount:4, pulsingVortexPeriodSeconds:6 },
  /* W2 ── Tier 3: The Maelstrom — Moving + Pulsing Vortexes */
  { id:18, worldId:2, nodeEnergyCap:160, name:'MAELSTROM',   nodes:12, enemyCount:3, enemyStartEnergy:44, playerStartEnergy:36, aiThinkIntervalSeconds:3.2, distanceCostMultiplier:0.09, neutralEnergyRange:[25,68], par:202, vortexCount:5, movingVortexCount:3, pulsingVortexPeriodSeconds:6 },
  { id:19, worldId:2, nodeEnergyCap:165, name:'VORTEX RING', nodes:13, enemyCount:3, enemyStartEnergy:54, playerStartEnergy:36, aiThinkIntervalSeconds:2.6, distanceCostMultiplier:0.09, neutralEnergyRange:[28,72], par:215, vortexCount:5, movingVortexCount:5 },
  { id:20, worldId:2, nodeEnergyCap:170, name:'ABYSS GATE',  nodes:14, enemyCount:4, enemyStartEnergy:60, playerStartEnergy:38, aiThinkIntervalSeconds:2.2, distanceCostMultiplier:0.10, neutralEnergyRange:[28,78], par:244, vortexCount:6, movingVortexCount:6 },
  /* W2 ── Boss: Heart of the Void — Super-Vortex + Purple Incursion */
  { id:21, worldId:2, nodeEnergyCap:175, name:'OBLIVION', nodes:15, enemyCount:4, enemyStartEnergy:60, playerStartEnergy:42, aiThinkIntervalSeconds:1.75, distanceCostMultiplier:0.11, neutralEnergyRange:[32,88], par:282, vortexCount:6, movingVortexCount:3, pulsingVortexPeriodSeconds:5, hasSuperVortex:true, purpleEnemyCount:1, purpleEnemyStartEnergy:42, isBoss:true },
  /* TUT W3 */
  { id:22, worldId:3, nodeEnergyCap:175, tutorialWorldId:3, name:'NEXUS TUTORIAL', nodes:5, enemyCount:1, enemyStartEnergy:16, playerStartEnergy:40, aiThinkIntervalSeconds:8.0, distanceCostMultiplier:0.06, neutralEnergyRange:[15,40], par:999, isTutorial:true, relayCount:1, pulsarCount:1 },
  /* W3 — NEXUS PRIME ── Tier 1: Signal Acquisition */
  { id:23, worldId:3, nodeEnergyCap:175, name:'RESONANCE',   nodes:9,  enemyCount:2, enemyStartEnergy:28, playerStartEnergy:28, aiThinkIntervalSeconds:5.5, distanceCostMultiplier:0.06, neutralEnergyRange:[18,50], par:98, relayCount:3, pulsarCount:0 },
  { id:24, worldId:3, nodeEnergyCap:178, name:'RELAY RACE',  nodes:10, enemyCount:2, enemyStartEnergy:28, playerStartEnergy:34, aiThinkIntervalSeconds:5.3, distanceCostMultiplier:0.06, neutralEnergyRange:[20,55], par:120, relayCount:4, pulsarCount:0 },
  { id:25, worldId:3, nodeEnergyCap:182, name:'FIRST PULSE', nodes:10, enemyCount:2, enemyStartEnergy:35, playerStartEnergy:30, aiThinkIntervalSeconds:4.5, distanceCostMultiplier:0.07, neutralEnergyRange:[20,58], par:128, relayCount:3, pulsarCount:1 },
  /* W3 ── Tier 2: Frequency War — Relay Fortresses */
  { id:26, worldId:3, nodeEnergyCap:185, name:'BROADCAST', nodes:11, enemyCount:3, enemyStartEnergy:38, playerStartEnergy:32, aiThinkIntervalSeconds:4.0, distanceCostMultiplier:0.07, neutralEnergyRange:[22,60], par:146, relayCount:3, pulsarCount:2 },
  { id:27, worldId:3, nodeEnergyCap:188, name:'OVERCLOCK', nodes:12, enemyCount:3, enemyStartEnergy:44, playerStartEnergy:32, aiThinkIntervalSeconds:3.6, distanceCostMultiplier:0.08, neutralEnergyRange:[25,65], par:165, relayCount:4, pulsarCount:2 },
  { id:28, worldId:3, nodeEnergyCap:191, name:'FORTIFIED SIGNAL', nodes:12, enemyCount:3, enemyStartEnergy:48, playerStartEnergy:34, aiThinkIntervalSeconds:3.2, distanceCostMultiplier:0.08, neutralEnergyRange:[25,68], par:184, relayCount:3, pulsarCount:3, fortifiedRelayCount:2 },
  /* W3 ── Tier 3: Maximum Throughput — Signal Towers + Purple Threat */
  { id:29, worldId:3, nodeEnergyCap:194, name:'CASCADE', nodes:13, enemyCount:4, enemyStartEnergy:52, playerStartEnergy:36, aiThinkIntervalSeconds:2.8, distanceCostMultiplier:0.09, neutralEnergyRange:[28,72], par:204, relayCount:5, pulsarCount:3, purpleEnemyCount:1, purpleEnemyStartEnergy:42 },
  { id:30, worldId:3, nodeEnergyCap:196, name:'SIGNAL LOCK', nodes:14, enemyCount:4, enemyStartEnergy:53, playerStartEnergy:40, aiThinkIntervalSeconds:2.55, distanceCostMultiplier:0.09, neutralEnergyRange:[30,78], par:246, relayCount:5, pulsarCount:3, signalTowerCount:1, purpleEnemyCount:1, purpleEnemyStartEnergy:42 },
  { id:31, worldId:3, nodeEnergyCap:198, name:'APEX', nodes:14, enemyCount:5, enemyStartEnergy:65, playerStartEnergy:38, aiThinkIntervalSeconds:2.0, distanceCostMultiplier:0.10, neutralEnergyRange:[32,82], par:260, relayCount:6, pulsarCount:4, signalTowerCount:1, purpleEnemyCount:1, purpleEnemyStartEnergy:55 },
  /* W3 ── Boss: Nexus Core — Super-Pulsar + Relay Fortresses + Signal Tower + Purple Dominance */
  { id:32, worldId:3, nodeEnergyCap:200, name:'TRANSCENDENCE', nodes:15, enemyCount:5, enemyStartEnergy:66, playerStartEnergy:44, aiThinkIntervalSeconds:1.6, distanceCostMultiplier:0.11, neutralEnergyRange:[35,90], par:308, relayCount:6, pulsarCount:4, signalTowerCount:1, fortifiedRelayCount:3, hasSuperPulsar:true, purpleEnemyCount:2, purpleEnemyStartEnergy:55, isBoss:true },
];

export const LEVELS = RAW_LEVELS;
const SORTED_LEVEL_IDS = LEVELS
  .map(levelConfig => levelConfig.id)
  .sort((leftLevelId, rightLevelId) => leftLevelId - rightLevelId);

/** Returns the world id for a given level id. Derived from LEVELS data — no more magic ranges. */
export function worldOf(id) {
  const levelConfig = LEVELS.find(candidateLevel => candidateLevel.id === id);
  return levelConfig ? (levelConfig.worldId || 1) : 1;
}

export function getLevelConfig(levelId) {
  return LEVELS.find(levelConfig => levelConfig.id === levelId) || null;
}

export function getNextLevelId(levelId) {
  const currentLevelIndex = SORTED_LEVEL_IDS.indexOf(levelId);
  if (currentLevelIndex === -1) return null;
  return SORTED_LEVEL_IDS[currentLevelIndex + 1] ?? null;
}

export function getPreviousLevelId(levelId) {
  const currentLevelIndex = SORTED_LEVEL_IDS.indexOf(levelId);
  if (currentLevelIndex <= 0) return null;
  return SORTED_LEVEL_IDS[currentLevelIndex - 1] ?? null;
}

export function starsFor(sc) {
  if (sc === null || sc <= 0) return 0;
  if (sc >= 700) return 3;
  if (sc >= 430) return 2;
  if (sc >= 200) return 1;
  return 0;
}
