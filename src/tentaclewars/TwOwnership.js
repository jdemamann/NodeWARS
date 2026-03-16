/* ================================================================
   TwOwnership — Layer 1 TW Ownership Transition Primitives

   Owns the TentacleWars ownership-change transitions that follow
   packet delivery. Called exclusively from TwDelivery so Layer 2
   has no direct dependency on Tent.js instance methods for ownership.
   ================================================================ */

import { TentState } from '../config/gameConfig.js';
import { applyOwnershipChange } from '../systems/Ownership.js';
import {
  resolveTentacleWarsNeutralCapture,
  resolveTentacleWarsHostileCapture,
} from './TwCaptureRules.js';

/*
 * Applies the TW neutral capture transition to a node.
 * Computes carryover starting energy from capture progress and delegates
 * the ownership commit to applyOwnershipChange (Layer 3 write surface).
 */
export function resolveTwNeutralCaptureTransition(game, targetNode, newOwner, captureProgress) {
  const neutralCapture = resolveTentacleWarsNeutralCapture(
    captureProgress,
    targetNode.captureThreshold || 0,
    targetNode.energy,
  );
  applyOwnershipChange({
    game,
    node: targetNode,
    newOwner,
    startingEnergy: Math.min(targetNode.maxE, neutralCapture.nextEnergy),
    previousOwner: targetNode.owner,
    wasNeutralCapture: true,
  });
}

/*
 * Applies the TW hostile capture transition to a node.
 * Collects released outgoing payload from live lanes, computes reset+carryover
 * starting energy, and delegates the ownership commit to applyOwnershipChange.
 */
export function resolveTwHostileCaptureTransition(game, channel, targetNode, attackerOwner) {
  const releasedOutgoingEnergy = game?.tents
    ?.filter(tentacle =>
      tentacle !== channel &&
      tentacle.alive &&
      tentacle.state !== TentState.RETRACTING &&
      tentacle.effectiveSourceNode === targetNode,
    )
    .reduce((sum, tentacle) => sum + (tentacle.getCommittedPayloadForOwnershipCleanup?.() || 0), 0) || 0;

  const hostileCapture = resolveTentacleWarsHostileCapture(
    Math.max(0, -targetNode.energy),
    releasedOutgoingEnergy,
  );
  applyOwnershipChange({
    game,
    node: targetNode,
    newOwner: attackerOwner,
    startingEnergy: Math.min(targetNode.maxE, hostileCapture.nextEnergy),
    previousOwner: targetNode.owner,
    attackerOwner,
    suppressOutgoingTentacleRefunds: true,
  });
}
