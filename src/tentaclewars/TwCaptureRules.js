/* ================================================================
   TentacleWars capture rules

   Owns the first pure capture-rule helpers for TentacleWars. The mode
   uses a reset-plus-carryover hostile takeover rule and a separate
   acquisition cost for neutral cells.
   ================================================================ */

import { TW_BALANCE } from './TwBalance.js';

/*
 * Convert neutral displayed energy into the acquisition cost used by the
 * TentacleWars mode. The ratio and rounding mode stay configurable so the
 * prototype can be retuned without touching simulation code.
 */
export function computeTentacleWarsNeutralCaptureCost(
  neutralEnergy,
  balance = TW_BALANCE,
) {
  const safeNeutralEnergy = Number.isFinite(neutralEnergy) ? Math.max(0, neutralEnergy) : 0;
  const rawCaptureCost = safeNeutralEnergy * balance.NEUTRAL_CAPTURE_COST_RATIO;

  switch (balance.NEUTRAL_CAPTURE_ROUNDING_MODE) {
    case 'floor':
      return Math.floor(rawCaptureCost);
    case 'round':
      return Math.round(rawCaptureCost);
    case 'ceil':
    default:
      return Math.ceil(rawCaptureCost);
  }
}

/*
 * Neutral capture in the first prototype stacks directly. The helper keeps
 * the rule explicit so later variants can introduce diminishing returns or
 * other modifiers without rewriting the callers.
 */
export function applyTentacleWarsNeutralCaptureProgress(currentProgress, addedProgress) {
  const safeCurrentProgress = Number.isFinite(currentProgress) ? Math.max(0, currentProgress) : 0;
  const safeAddedProgress = Number.isFinite(addedProgress) ? Math.max(0, addedProgress) : 0;
  return safeCurrentProgress + safeAddedProgress;
}

/*
 * TentacleWars neutrals keep a dedicated acquisition threshold. Once that
 * threshold is crossed, the neutral keeps its displayed energy as the base of
 * the captured cell, and any extra packet pressure becomes carryover on top.
 */
export function resolveTentacleWarsNeutralCapture(
  totalCaptureProgress,
  acquisitionCost,
  neutralEnergy,
) {
  const safeTotalCaptureProgress = Number.isFinite(totalCaptureProgress) ? Math.max(0, totalCaptureProgress) : 0;
  const safeAcquisitionCost = Number.isFinite(acquisitionCost) ? Math.max(0, acquisitionCost) : 0;
  const safeNeutralEnergy = Number.isFinite(neutralEnergy) ? Math.max(0, neutralEnergy) : 0;
  const carryoverEnergy = Math.max(0, safeTotalCaptureProgress - safeAcquisitionCost);

  return {
    acquisitionCost: safeAcquisitionCost,
    baseEnergy: safeNeutralEnergy,
    carryoverEnergy,
    nextEnergy: safeNeutralEnergy + carryoverEnergy,
  };
}

/*
 * Resolve a hostile takeover using the agreed TentacleWars rule:
 * the captured cell resets to a fixed base energy first, then the
 * surviving offensive and lane-release carryover are applied.
 */
export function resolveTentacleWarsHostileCapture(
  attackCarryoverEnergy,
  releasedOutgoingEnergy = 0,
  balance = TW_BALANCE,
) {
  const safeAttackCarryoverEnergy = Number.isFinite(attackCarryoverEnergy) ? Math.max(0, attackCarryoverEnergy) : 0;
  const safeReleasedOutgoingEnergy = Number.isFinite(releasedOutgoingEnergy) ? Math.max(0, releasedOutgoingEnergy) : 0;
  const carryoverEnergy = balance.HOSTILE_CAPTURE_APPLIES_CARRYOVER
    ? safeAttackCarryoverEnergy + safeReleasedOutgoingEnergy
    : 0;

  return {
    resetEnergy: balance.HOSTILE_CAPTURE_RESET_ENERGY,
    carryoverEnergy,
    nextEnergy: balance.HOSTILE_CAPTURE_RESET_ENERGY + carryoverEnergy,
  };
}
