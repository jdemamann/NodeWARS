/* ================================================================
   Tentacle command helpers

   Shared lookup and cost helpers used by click resolution, drag
   preview, and AI/path checks.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import { computeBuildCost, computeDistance } from '../math/simulationMath.js';
import { computeTentacleWarsBuildCost } from '../tentaclewars/TwTentacleEconomy.js';

/*
 * Build cost stays mode-aware so the shared click/drag shell can feed both
 * NodeWARS and TentacleWars without duplicating preview and intent logic.
 */
export function computeTentacleBuildCost(sourceNode, targetNode, distanceCostMultiplier) {
  const distance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
  if (sourceNode?.simulationMode === 'tentaclewars') {
    const linearBuildCost = computeTentacleWarsBuildCost(distance);
    return {
      distance,
      baseBuildCost: linearBuildCost,
      rangeSurcharge: 0,
      totalBuildCost: linearBuildCost,
    };
  }

  const baseBuildCost = computeBuildCost(distance);
  const rangeSurcharge = distance * distanceCostMultiplier;

  return {
    distance,
    baseBuildCost,
    rangeSurcharge,
    totalBuildCost: baseBuildCost + rangeSurcharge,
  };
}

export function findDirectedTentacle(tents, sourceNode, targetNode) {
  return tents.find(tent => tent.alive && tent.source === sourceNode && tent.target === targetNode) || null;
}

export function findOpposingActiveTentacle(tents, sourceNode, targetNode) {
  return tents.find(tent =>
    tent.alive &&
    tent.state === TentState.ACTIVE &&
      tent.effectiveSourceNode === targetNode &&
      tent.effectiveTargetNode === sourceNode
  ) || null;
}
