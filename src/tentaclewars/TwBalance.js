/* ================================================================
   TentacleWars balance

   Defines the first frozen balance surface for the TentacleWars mode.
   These values are intentionally isolated from NodeWARS tuning so the
   fidelity track can evolve without destabilizing the live game.
   ================================================================ */

/*
 * The first prototype keeps overflow conservative and packetized:
 * cells emit fixed-size packets, fractional throughput is handled by
 * per-lane accumulators, and Dominator throughput is a multiplier over
 * the top non-Dominator grade.
 */
export const TW_BALANCE = {
  GRADE_ASCEND_THRESHOLDS: [15, 40, 80, 120, 160, 180],
  GRADE_DESCEND_THRESHOLDS: [5, 30, 60, 100, 140, 160],
  GRADE_PACKET_RATE_PER_SEC: [1.0, 1.5, 2.0, 2.5, 3.0],
  GRADE_MAX_TENTACLE_SLOTS: [1, 2, 2, 2, 3, 3],
  DOMINATOR_PACKET_MULT: 2,
  PACKET_SIZE: 1,
  // Applies only to TW cells currently under active hostile pressure.
  // This is defender-side regen suppression, not the allied-feed self-retain rule.
  PASSIVE_REGEN_FRACTION: 0.25,
  // Reserves part of a source cell's packet budget for self-regen while it is
  // feeding allied lanes, so support cells do not flatten to zero throughput.
  TW_SELF_REGEN_FRACTION: 0.20,
  // TentacleWars phase 1 treats red and purple as separate hostiles by default.
  ENEMY_RELATION_MODE: 'all_hostile',
  TENTACLE_COST_PER_PIXEL: 0.20,
  OVERFLOW_MODE: 'broadcast_full',
  OVERFLOW_REQUIRES_FULL_CAP: true,
  HOSTILE_CAPTURE_RESET_ENERGY: 10,
  HOSTILE_CAPTURE_APPLIES_CARRYOVER: true,
  NEUTRAL_CAPTURE_COST_RATIO: 0.4,
  NEUTRAL_CAPTURE_ROUNDING_MODE: 'ceil',
  // AI phase 1 favors cheap neutrals, overflow-ready launches, and support
  // triangles before it grows into a richer packet-native behavior stack.
  AI_ENERGY_THRESHOLD: 18,
  AI_MAX_MOVES_PER_THINK: 2,
  AI_NEUTRAL_CAPTURE_BONUS: 32,
  AI_HOSTILE_FINISH_BONUS: 30,
  AI_HOSTILE_PLAYER_TARGET_BONUS: 12,
  AI_ALLIED_SUPPORT_BONUS: 26,
  AI_SUPPORT_TRIANGLE_BONUS: 18,
  AI_SUPPORT_PROXIMITY_PX: 170,
  AI_OVERFLOW_READY_BONUS: 14,
  AI_EXISTING_PRESSURE_BONUS: 16,
  AI_DISTANCE_PRESSURE_FACTOR: 240,
  AI_THINK_INTERVAL_SEC: 1.55,
  AI_PURPLE_ENABLES_SLICE: true,
  AI_PURPLE_SLICE_COOLDOWN_SEC: 0.8,
  AI_PURPLE_SLICE_PIPE_TARGET_RATIO: 0.35,
  AI_PURPLE_SLICE_SCORE_THRESHOLD: 24,
  AI_PURPLE_SLICE_HOSTILE_TARGET_BONUS: 18,
  AI_PURPLE_SLICE_OVERFLOW_SOURCE_BONUS: 12,
  // Observability: enable in DevTools when tuning TW AI decisions.
  // Must stay false by default so production runs do not allocate log state.
  AI_DEBUG_SCORING: false,
  // Tactical state thresholds used by the upcoming TW classifier.
  // A hostile target is vulnerable below this fraction of its maxE.
  AI_FINISH_LOW_ENERGY_FRACTION: 0.35,
  // A source is near-overflow above this fraction of its maxE.
  AI_PRESSURE_OVERFLOW_THRESHOLD: 0.7,
  DEFAULT_SOUNDTRACK_TRACK_ID: 'stella',
};
