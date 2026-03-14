/* ================================================================
   Tentacle command helpers

   Shared lookup and cost helpers used by click resolution, drag
   preview, and AI/path checks.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import { computeBuildCost, computeDistance } from '../math/simulationMath.js';
import { canCreateTentacleWarsLane, findBlockingTentacleWarsObstacle } from '../tentaclewars/TwObstacleRuntime.js';
import { computeTentacleWarsBuildCost } from '../tentaclewars/TwTentacleEconomy.js';

/*
 * Build cost stays mode-aware so the shared click/drag shell can feed both
 * NodeWARS and TentacleWars without duplicating preview and intent logic.
 */
export function computeTentacleBuildCost(sourceNode, targetNode, distanceCostMultiplier) {
  const distance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
  if (sourceNode?.simulationMode === 'tentaclewars') {
    const linearBuildCost = computeTentacleWarsBuildCost(distance, undefined, sourceNode?.twCostNormalizer);
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

/* TentacleWars authored obstacles must gate lane creation canonically. */
export function findTentacleBuildBlocker(sourceNode, targetNode, obstacles) {
  if (sourceNode?.simulationMode !== 'tentaclewars') return null;
  return findBlockingTentacleWarsObstacle(obstacles, sourceNode, targetNode);
}

/* Single gate for player, AI, and preview build validation. */
export function canCreateTentacleConnection(sourceNode, targetNode, obstacles) {
  if (sourceNode?.simulationMode !== 'tentaclewars') return true;
  return canCreateTentacleWarsLane(obstacles, sourceNode, targetNode);
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
