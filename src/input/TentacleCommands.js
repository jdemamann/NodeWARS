/* ================================================================
   Tentacle command helpers

   Shared lookup and cost helpers used by click resolution, drag
   preview, and AI/path checks.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import { computeBuildCost, computeDistance } from '../math/simulationMath.js';

export function computeTentacleBuildCost(sourceNode, targetNode, distanceCostMultiplier) {
  const distance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
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
