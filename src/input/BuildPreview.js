/* ================================================================
   Build preview model

   Produces the tooltip model shown while the player hovers a possible
   target. It returns plain data so Game.js and the renderer can stay
   decoupled from preview logic.
   ================================================================ */

import { canCreateTentacleConnection, computeTentacleBuildCost, findTentacleBuildBlocker } from './TentacleCommands.js';
import { findToggleableTentacle, getTentacleSlotUsage } from './PlayerTentacleInteraction.js';
import { TentState } from '../config/gameConfig.js';
import { areHostileOwners } from '../systems/OwnerTeams.js';

export function buildPlayerTentaclePreview({
  selectedNode,
  hoveredNode,
  tents,
  liveOut,
  distanceCostMultiplier,
  obstacles = [],
}) {
  if (!selectedNode || !hoveredNode || selectedNode === hoveredNode) return null;

  const buildCost = computeTentacleBuildCost(selectedNode, hoveredNode, distanceCostMultiplier);
  const tentacleSlotUsage = getTentacleSlotUsage(selectedNode, liveOut);
  const toggleableTentacle = findToggleableTentacle(tents, selectedNode, hoveredNode);

  if (toggleableTentacle) {
    const displayFlowRate = +(toggleableTentacle.tentacle.flowRate || 0).toFixed(1);
    return {
      type: 'toggle_existing_tentacle',
      isFlowReversed: toggleableTentacle.isFlowReversed,
      displayFlowRate,
    };
  }

  const roundedBuildCost = Math.ceil(buildCost.baseBuildCost);
  const roundedRangeSurcharge = Math.ceil(buildCost.rangeSurcharge);
  /* In TentacleWars, a counter-tentacle toward an active hostile only needs to
     reach the clash midpoint, so the effective cost is half the route cost. */
  let effectiveTotalBuildCost = buildCost.totalBuildCost;
  let isClashRoute = false;
  if (selectedNode.simulationMode === 'tentaclewars') {
    isClashRoute = tents.some(t =>
      t.alive &&
      t.state === TentState.ACTIVE &&
      t.effectiveSourceNode === hoveredNode &&
      t.effectiveTargetNode === selectedNode &&
      areHostileOwners(t.effectiveSourceNode.owner, selectedNode.owner),
    );
    if (isClashRoute) effectiveTotalBuildCost = buildCost.totalBuildCost * 0.5;
  }
  const roundedTotalBuildCost = Math.ceil(effectiveTotalBuildCost);
  const availableEnergy = Math.floor(selectedNode.energy);
  const canAffordBuild = availableEnergy >= roundedTotalBuildCost + 1;
  const blockingObstacle = findTentacleBuildBlocker(selectedNode, hoveredNode, obstacles);
  const canBuildTentacle =
    canAffordBuild &&
    tentacleSlotUsage.hasFreeSlot &&
    canCreateTentacleConnection(selectedNode, hoveredNode, obstacles);

  return {
    type: 'build_new_tentacle',
    roundedBuildCost,
    roundedRangeSurcharge,
    roundedTotalBuildCost,
    availableEnergy,
    canAffordBuild,
    canBuildTentacle,
    isClashRoute,
    isBlockedByObstacle: !!blockingObstacle,
    activeOutgoingTentacles: tentacleSlotUsage.activeOutgoingTentacles,
    maxTentacleSlots: tentacleSlotUsage.maxTentacleSlots,
  };
}
