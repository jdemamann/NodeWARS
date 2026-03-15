/* ================================================================
   Player tentacle interaction helpers

   Shared helpers for click and drag flows: slot accounting, retract
   lookup, and toggle detection for already-existing lanes.
   ================================================================ */

import { findDirectedTentacle } from './TentacleCommands.js';

export function getRetractableTentaclesForNode(tents, node) {
  return tents.filter(tentacle =>
    tentacle.alive &&
    ((!tentacle.reversed && tentacle.source === node) || (tentacle.reversed && tentacle.target === node))
  );
}

export function findToggleableTentacle(tents, sourceNode, targetNode) {
  const forwardTentacle = findDirectedTentacle(tents, sourceNode, targetNode);
  if (forwardTentacle) {
    return {
      tentacle: forwardTentacle,
      canToggle: targetNode.owner === sourceNode.owner,
      isFlowReversed: !!forwardTentacle.reversed,
    };
  }

  const backwardTentacle = targetNode.owner === sourceNode.owner
    ? findDirectedTentacle(tents, targetNode, sourceNode)
    : null;

  if (!backwardTentacle) return null;

  return {
    tentacle: backwardTentacle,
    canToggle: true,
    isFlowReversed: !backwardTentacle.reversed,
  };
}

export function getTentacleSlotUsage(sourceNode, liveOut) {
  const activeOutgoingTentacles = liveOut(sourceNode);
  const maxTentacleSlots = sourceNode.maxSlots;

  return {
    activeOutgoingTentacles,
    maxTentacleSlots,
    remainingTentacleSlots: maxTentacleSlots - activeOutgoingTentacles,
    hasFreeSlot: activeOutgoingTentacles < maxTentacleSlots,
  };
}
