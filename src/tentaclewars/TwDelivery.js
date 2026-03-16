/* ================================================================
   TwDelivery — Layer 1 TW Target-Side Delivery

   Owns the TentacleWars target-side delivery primitives for packet-native
   lanes. Called by TwFlow so Layer 2 no longer routes sustained TW flow
   through shared TentCombat helpers.
   ================================================================ */

import {
  applyTentacleWarsNeutralCaptureProgress,
} from './TwCaptureRules.js';
import {
  getTentacleWarsNeutralCaptureOwner,
  getTentacleWarsNeutralCaptureProgress,
  getTentacleWarsNeutralCaptureScore,
  setTentacleWarsNeutralCaptureProgress,
} from './TwNeutralCapture.js';

/*
 * Applies allied packet delivery to a TW target.
 * Caps stored energy at maxE, routes excess into pendingExcessFeed, and tracks inflow.
 */
export function applyTwFriendlyDelivery(targetNode, amount) {
  const incomingEnergy = Math.max(0, amount);
  const availableRoom = Math.max(0, targetNode.maxE - targetNode.energy);
  const absorbedEnergy = Math.min(availableRoom, incomingEnergy);
  const overflowEnergy = Math.max(0, incomingEnergy - absorbedEnergy);

  if (absorbedEnergy > 0) {
    targetNode.energy = Math.min(targetNode.maxE, targetNode.energy + absorbedEnergy);
  }
  if (overflowEnergy > 0) {
    targetNode.pendingExcessFeed = (targetNode.pendingExcessFeed || 0) + overflowEnergy;
  }
  targetNode.inFlow = (targetNode.inFlow || 0) + incomingEnergy;
  return incomingEnergy;
}

/*
 * Marks a TW target as under hostile packet pressure.
 * Isolated here so TwFlow does not mutate the node directly for this visual hint.
 */
export function markNodeUnderAttack(targetNode) {
  targetNode.underAttack = Math.max(targetNode.underAttack || 0, 1);
}

/*
 * Applies neutral-capture packet delivery for TW.
 * Advances owner-scoped progress, refreshes cFlash, and resolves capture when threshold is met.
 */
export function applyTwNeutralCapture(channel, targetNode, sourceNode, amount) {
  const deliveredPacketEnergy = Math.max(0, amount);
  const currentProgress = getTentacleWarsNeutralCaptureProgress(targetNode, sourceNode.owner);
  const nextProgress = applyTentacleWarsNeutralCaptureProgress(currentProgress, deliveredPacketEnergy);
  setTentacleWarsNeutralCaptureProgress(targetNode, sourceNode.owner, nextProgress);
  targetNode.cFlash = (targetNode.cFlash || 0) + 0.35;

  const captureScore = getTentacleWarsNeutralCaptureScore(targetNode, sourceNode.owner);
  if (captureScore >= Math.max(1, targetNode.captureThreshold || 1)) {
    resolveTwNeutralCapture(
      channel,
      targetNode,
      getTentacleWarsNeutralCaptureOwner(targetNode, sourceNode.owner),
      captureScore,
    );
  }

  return deliveredPacketEnergy;
}

/*
 * Applies hostile packet delivery for TW.
 * Subtracts target energy, marks attack pressure, and resolves hostile capture when depleted.
 */
export function applyTwEnemyAttack(channel, targetNode, sourceNode, amount) {
  const deliveredPacketEnergy = Math.max(0, amount);
  targetNode.energy -= deliveredPacketEnergy;
  markNodeUnderAttack(targetNode);

  if (targetNode.energy <= 0) {
    resolveTwHostileCapture(channel, targetNode, sourceNode.owner, deliveredPacketEnergy);
  }

  return deliveredPacketEnergy;
}

/*
 * Resolves a TW neutral capture through the current named ownership pass-through.
 * Wave 4 can extract this terminal transition fully out of Tent.js.
 */
function resolveTwNeutralCapture(channel, targetNode, newOwner, captureProgress) {
  channel._captureNeutralTarget(targetNode, newOwner, captureProgress);
}

/*
 * Resolves a TW hostile capture through the current named ownership pass-through.
 * Wave 4 can extract this terminal transition fully out of Tent.js.
 */
function resolveTwHostileCapture(channel, targetNode, attackerOwner, offensivePayload) {
  channel._defeatEnemyTarget(targetNode, attackerOwner, offensivePayload);
}
