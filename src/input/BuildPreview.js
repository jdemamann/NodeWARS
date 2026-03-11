/* ================================================================
   Build preview model

   Produces the tooltip model shown while the player hovers a possible
   target. It returns plain data so Game.js and the renderer can stay
   decoupled from preview logic.
   ================================================================ */

import { computeTentacleBuildCost } from './TentacleCommands.js';
import { findToggleableTentacle, getTentacleSlotUsage } from './PlayerTentacleInteraction.js';

export function buildPlayerTentaclePreview({
  selectedNode,
  hoveredNode,
  tents,
  liveOut,
  distanceCostMultiplier,
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
  const roundedTotalBuildCost = Math.ceil(buildCost.totalBuildCost);
  const availableEnergy = Math.floor(selectedNode.energy);
  const canAffordBuild = availableEnergy >= roundedTotalBuildCost + 1;
  const canBuildTentacle = canAffordBuild && tentacleSlotUsage.hasFreeSlot;

  return {
    type: 'build_new_tentacle',
    roundedBuildCost,
    roundedRangeSurcharge,
    roundedTotalBuildCost,
    availableEnergy,
    canAffordBuild,
    canBuildTentacle,
    activeOutgoingTentacles: tentacleSlotUsage.activeOutgoingTentacles,
    maxTentacleSlots: tentacleSlotUsage.maxTentacleSlots,
  };
}
