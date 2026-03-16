/* ================================================================
   TwDelivery — Layer 1 TW Target-Side Delivery

   Owns the TentacleWars target-side delivery primitives for packet-native
   lanes. Called by TwFlow so Layer 2 no longer routes TW flow or
   burst/cut delivery through shared TentCombat helpers.
   ================================================================ */

import { areAlliedOwners } from '../systems/OwnerTeams.js';
import {
  applyTentacleWarsNeutralCaptureProgress,
} from './TwCaptureRules.js';
import {
  getTentacleWarsNeutralCaptureOwner,
  getTentacleWarsNeutralCaptureProgress,
  getTentacleWarsNeutralCaptureScore,
  setTentacleWarsNeutralCaptureProgress,
} from './TwNeutralCapture.js';
import {
  resolveTwNeutralCaptureTransition,
  resolveTwHostileCaptureTransition,
} from './TwOwnership.js';

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
 * Isolated here so callers do not mutate the node directly for this visual hint.
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
    resolveTwHostileCapture(channel, targetNode, sourceNode.owner);
  }

  return deliveredPacketEnergy;
}

/*
 * Applies a lump-sum TW payload to a target node (burst or cut-retraction path).
 * Handles all three ownership states and accepts contestFlash + burstPulse visual opts.
 * Replaces the TW branch of TentCombat.applyTentaclePayloadToTarget for this delivery path.
 */
export function applyTwBurstDelivery(channel, targetNode, sourceNode, amount, opts = {}) {
  const { contestFlash = 0, burstPulse = 0 } = opts;
  const directPayload = Math.max(0, amount);

  if (areAlliedOwners(targetNode.owner, sourceNode.owner)) {
    targetNode.energy = Math.min(targetNode.maxE, targetNode.energy + directPayload);
    return;
  }

  if (targetNode.owner === 0) {
    const currentProgress = getTentacleWarsNeutralCaptureProgress(targetNode, sourceNode.owner);
    const nextProgress = applyTentacleWarsNeutralCaptureProgress(currentProgress, directPayload);
    setTentacleWarsNeutralCaptureProgress(targetNode, sourceNode.owner, nextProgress);
    targetNode.cFlash = (targetNode.cFlash || 0) + contestFlash;
    if (burstPulse > 0) targetNode.burstPulse = Math.max(targetNode.burstPulse || 0, burstPulse);

    const captureScore = getTentacleWarsNeutralCaptureScore(targetNode, sourceNode.owner);
    if (captureScore >= Math.max(1, targetNode.captureThreshold || 1)) {
      resolveTwNeutralCapture(
        channel,
        targetNode,
        getTentacleWarsNeutralCaptureOwner(targetNode, sourceNode.owner),
        captureScore,
      );
    }
    return;
  }

  targetNode.energy -= directPayload;
  markNodeUnderAttack(targetNode);
  targetNode.cFlash = (targetNode.cFlash || 0) + contestFlash;
  if (burstPulse > 0) targetNode.burstPulse = Math.max(targetNode.burstPulse || 0, burstPulse);

  if (targetNode.energy <= 0) {
    resolveTwHostileCapture(channel, targetNode, sourceNode.owner);
  }
}

/*
 * Resolves a TW neutral capture through TwOwnership.
 */
function resolveTwNeutralCapture(channel, targetNode, newOwner, captureProgress) {
  resolveTwNeutralCaptureTransition(channel.game, targetNode, newOwner, captureProgress);
}

/*
 * Resolves a TW hostile capture through TwOwnership.
 */
function resolveTwHostileCapture(channel, targetNode, attackerOwner) {
  resolveTwHostileCaptureTransition(channel.game, channel, targetNode, attackerOwner);
}
