/* ================================================================
   TentacleWars tentacle economy

   Owns the pure economy rules for TentacleWars lanes: linear distance
   cost, progressive build commitment, and full refund semantics. These
   helpers stay detached from the live Tent entity so the new mode can
   prove its math before a dedicated runtime exists.
   ================================================================ */

import { clamp } from '../math/simulationMath.js';
import { TW_BALANCE } from './TwBalance.js';

/*
 * TentacleWars build cost is purely linear with distance. There is no
 * fixed base cost in this mode, which keeps long lanes expensive while
 * preserving very short lane affordability.
 */
export function computeTentacleWarsBuildCost(distancePixels, balance = TW_BALANCE) {
  const safeDistancePixels = Number.isFinite(distancePixels) ? Math.max(0, distancePixels) : 0;
  return safeDistancePixels * balance.TENTACLE_COST_PER_PIXEL;
}

/*
 * Progressive growth spends only the energy that is actually available in
 * the source at this frame. The caller provides the desired build spend
 * for the step, and the helper clamps the commitment so the lane cannot
 * advance on unpaid budget.
 */
export function commitTentacleWarsGrowthBudget(
  investedEnergy,
  requestedEnergy,
  sourceAvailableEnergy,
  totalBuildCost,
) {
  const safeInvestedEnergy = Number.isFinite(investedEnergy) ? Math.max(0, investedEnergy) : 0;
  const safeRequestedEnergy = Number.isFinite(requestedEnergy) ? Math.max(0, requestedEnergy) : 0;
  const safeSourceAvailableEnergy = Number.isFinite(sourceAvailableEnergy) ? Math.max(0, sourceAvailableEnergy) : 0;
  const safeTotalBuildCost = Number.isFinite(totalBuildCost) ? Math.max(0, totalBuildCost) : 0;

  const remainingBuildCost = Math.max(0, safeTotalBuildCost - safeInvestedEnergy);
  const committedEnergy = Math.min(safeRequestedEnergy, safeSourceAvailableEnergy, remainingBuildCost);
  const nextInvestedEnergy = safeInvestedEnergy + committedEnergy;
  const nextProgressRatio = safeTotalBuildCost <= 0 ? 1 : clamp(nextInvestedEnergy / safeTotalBuildCost, 0, 1);

  return {
    committedEnergy,
    nextInvestedEnergy,
    nextProgressRatio,
    isBuildComplete: nextProgressRatio >= 1,
  };
}

/*
 * TentacleWars retract and cancel behavior refunds the full economic
 * payload already tied to the lane. That includes both construction
 * energy and any packet payload currently travelling through it.
 */
export function computeTentacleWarsRefundValue(investedBuildEnergy, inTransitEnergy) {
  const safeInvestedBuildEnergy = Number.isFinite(investedBuildEnergy) ? Math.max(0, investedBuildEnergy) : 0;
  const safeInTransitEnergy = Number.isFinite(inTransitEnergy) ? Math.max(0, inTransitEnergy) : 0;
  return safeInvestedBuildEnergy + safeInTransitEnergy;
}
