/* ================================================================
   Player click resolution

   Converts a click into a semantic intent: select, retract, toggle,
   build, or clear. Game.js applies the returned intent to live state.
   ================================================================ */

import { getRetractableTentaclesForNode, findToggleableTentacle, getTentacleSlotUsage } from './PlayerTentacleInteraction.js';
import { computeTentacleBuildCost } from './TentacleCommands.js';

export function resolvePinnedHoverState(hoverNode, hoverPin, hitNode, playerOwner = 1) {
  if (!hitNode || hitNode.owner === playerOwner) {
    return { hoverNode, hoverPin };
  }

  if (hoverPin && hoverNode === hitNode) {
    return { hoverNode: null, hoverPin: false };
  }

  return {
    hoverNode: hitNode,
    hoverPin: true,
  };
}

export function resolvePlayerClickIntent({
  selectedNode,
  hitNode,
  tents,
  liveOut,
  distanceCostMultiplier,
  playerOwner = 1,
}) {
  if (!hitNode) {
    return { type: 'clear_selection' };
  }

  if (hitNode.owner === playerOwner) {
    if (selectedNode === hitNode) {
      return {
        type: 'retract_node_tentacles',
        node: hitNode,
        retractableTentacles: getRetractableTentaclesForNode(tents, hitNode),
      };
    }

    if (!selectedNode || selectedNode.owner !== playerOwner) {
      return {
        type: 'select_player_node',
        node: hitNode,
      };
    }
  }

  if (!selectedNode) {
    return { type: 'no_action' };
  }

  if (selectedNode === hitNode) {
    return { type: 'clear_selection' };
  }

  const toggleableTentacle = findToggleableTentacle(tents, selectedNode, hitNode);
  if (toggleableTentacle) {
    return {
      type: 'toggle_existing_tentacle',
      toggleableTentacle,
    };
  }

  const tentacleSlotUsage = getTentacleSlotUsage(selectedNode, liveOut);
  if (!tentacleSlotUsage.hasFreeSlot) {
    return {
      type: 'no_free_slots',
      tentacleSlotUsage,
    };
  }

  const buildCost = computeTentacleBuildCost(selectedNode, hitNode, distanceCostMultiplier);
  if (selectedNode.energy < buildCost.totalBuildCost + 1) {
    return {
      type: 'insufficient_energy',
      hitNode,
      buildCost,
    };
  }

  return {
    type: 'build_tentacle',
    sourceNode: selectedNode,
    targetNode: hitNode,
    buildCost,
  };
}
