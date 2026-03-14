/* ================================================================
   Player click resolution

   Converts a click into a semantic intent: select, retract, toggle,
   build, or clear. Game.js applies the returned intent to live state.
   ================================================================ */

import { getRetractableTentaclesForNode, findToggleableTentacle, getTentacleSlotUsage } from './PlayerTentacleInteraction.js';
import { canCreateTentacleConnection, computeTentacleBuildCost, findTentacleBuildBlocker } from './TentacleCommands.js';
import { TentState } from '../config/gameConfig.js';
import { areHostileOwners } from '../systems/OwnerTeams.js';

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
  obstacles = [],
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
  const blockingObstacle = findTentacleBuildBlocker(selectedNode, hitNode, obstacles);
  if (blockingObstacle || !canCreateTentacleConnection(selectedNode, hitNode, obstacles)) {
    return {
      type: 'blocked_by_obstacle',
      hitNode,
      blockingObstacle,
      buildCost,
    };
  }

  /* In TentacleWars the clash point is always at the lane midpoint, so a
     counter-tentacle only needs to grow halfway.  Halve the energy threshold
     when an active hostile tentacle already occupies the reverse route so that
     the click resolution agrees with the canvas preview. */
  let effectiveBuildCost = buildCost.totalBuildCost;
  if (selectedNode.simulationMode === 'tentaclewars') {
    const isClashRoute = tents.some(t =>
      t.alive &&
      t.state === TentState.ACTIVE &&
      t.effectiveSourceNode === hitNode &&
      t.effectiveTargetNode === selectedNode &&
      areHostileOwners(t.effectiveSourceNode.owner, selectedNode.owner),
    );
    if (isClashRoute) effectiveBuildCost = buildCost.totalBuildCost * 0.5;
  }

  if (selectedNode.energy < effectiveBuildCost + 1) {
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
