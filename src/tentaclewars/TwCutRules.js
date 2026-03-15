/* ================================================================
   TentacleWars cut rules

   Owns the TentacleWars-specific lane cut distribution. Unlike the
   shared NodeWARS slice zones, TentacleWars uses the cut geometry as a
   continuous split of the committed lane payload.
   ================================================================ */

import { clamp } from '../math/simulationMath.js';

/*
 * Split a committed TentacleWars lane payload across the source and target
 * sides based on the physical cut position along the lane.
 */
export function resolveTentacleWarsCutDistribution(payload, cutRatio) {
  const safePayload = Number.isFinite(payload) ? Math.max(0, payload) : 0;
  const effectiveCutRatio = clamp(Number.isFinite(cutRatio) ? cutRatio : 0.5, 0, 1);

  return {
    effectiveCutRatio,
    sourceShare: safePayload * effectiveCutRatio,
    targetShare: safePayload * (1 - effectiveCutRatio),
  };
}
