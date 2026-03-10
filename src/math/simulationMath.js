/* ================================================================
   NODE WARS v3 — Simulation Math
   ================================================================ */

import { LVL_STEP, BUILD_RULES, PROGRESSION_RULES } from '../config/gameConfig.js';

export const computeDistance = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

export const computeDistanceSquared = (ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
export const rnd = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

export const computeEnergyLevel = energy => clamp(Math.floor(energy / LVL_STEP), 0, 5);
export const computeMaxAttainableEnergyLevel = maxEnergy => clamp(Math.floor(maxEnergy / LVL_STEP), 0, 5);
export function computeStableNodeLevel(energy, maxEnergy = 200, previousLevel = null) {
  const clampedEnergy = clamp(energy, 0, maxEnergy);
  const maxAttainableLevel = computeMaxAttainableEnergyLevel(maxEnergy);
  const rawLevel = clamp(Math.floor(clampedEnergy / LVL_STEP), 0, maxAttainableLevel);
  if (previousLevel == null) return rawLevel;

  const stablePreviousLevel = clamp(previousLevel, 0, maxAttainableLevel);
  if (rawLevel >= stablePreviousLevel) return rawLevel;

  const demotionThreshold = stablePreviousLevel * LVL_STEP - PROGRESSION_RULES.LEVEL_DOWN_HYSTERESIS_ENERGY;
  return clampedEnergy < demotionThreshold ? rawLevel : stablePreviousLevel;
}
export const computeNodeRadius = (energy, maxEnergy = 200) => 16 + (energy / maxEnergy) * 42;
export const computeBuildCost = distance => BUILD_RULES.BASE_COST + distance * BUILD_RULES.COST_PER_PIXEL;

export const maxRange = (energy, distanceCostMultiplier) =>
  Math.max(0, (energy - BUILD_RULES.BASE_COST) / (BUILD_RULES.COST_PER_PIXEL + distanceCostMultiplier));

/** Attack efficiency: always 1.0 — fill-percentage penalty removed (matches original Tentacle Wars). */
export function efAtk(node) {
  void node;
  return 1.0;
}

/** Damage multiplier per evolution level. Level 0=1.0, Level 5=2.1. */
export const computeAttackLevelMultiplier = level => 1 + level * 0.22;

/** Defense reduction per evolution level. Level 0=1.0, Level 5=1.6 (symmetric but milder). */
export const computeDefenseLevelMultiplier = level => 1 + level * 0.12;

/** Wire efficiency: always 1.0 — heat loss removed (matches original Tentacle Wars). */
export const wireEff = distance => {
  void distance;
  return 1.0;
};

/** Travel time (s): how long for energy to cross the tentacle. */
export const computeTravelDuration = distance => Math.max(0.18, distance / 160);

/** @deprecated Use TIER_REGEN[level] from gameConfig.js instead. */
export const regenMult = level => {
  void level;
  return 1;
};

/** @deprecated Use TIER_REGEN[level] from gameConfig.js instead. */
export const baseRegen = () => 0;
