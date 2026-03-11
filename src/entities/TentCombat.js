/* ================================================================
   Tent combat helpers

   Contains the state-independent parts of tentacle combat and payload
   resolution. Tent.js uses these helpers to keep active flow, neutral
   contest, and clash math readable.
   ================================================================ */

import { EMBRYO, GAME_BALANCE } from '../config/gameConfig.js';
import {
  computeAttackLevelMultiplier,
  computeDefenseLevelMultiplier,
} from '../math/simulationMath.js';
import { areAlliedOwners, areHostileOwners } from '../systems/OwnerTeams.js';
import {
  getContestCaptureOwner,
  getContestCaptureScore,
  shouldIgnoreAlliedContestContribution,
} from '../systems/NeutralContest.js';

export function applyTentaclePayloadToTarget({
  tentacle,
  targetNode,
  sourceNode,
  payloadAmount,
  contestFlash = 0,
  burstPulse = 0,
  damageMultiplier = 1,
}) {
  // Burst and split cuts both end up here so ownership, neutral contest, and
  // direct enemy damage share the same resolution rules.
  const directDamage = payloadAmount * computeAttackLevelMultiplier(sourceNode.level) * damageMultiplier;

  if (areAlliedOwners(targetNode.owner, sourceNode.owner)) {
    targetNode.energy = Math.min(targetNode.maxE, targetNode.energy + payloadAmount);
    return;
  }

  if (targetNode.owner === 0) {
    /* Neutral capture can be coalition-aware. In 'sum' mode red + purple raw
       contributions stay separate for ownership identity, but threshold checks
       are evaluated on the combined coalition pressure. In 'lockout' mode the
       second allied owner simply stays out of the capture race. */
    if (shouldIgnoreAlliedContestContribution(targetNode, sourceNode.owner)) return;

    tentacle._applyNeutralContestContribution(targetNode, sourceNode.owner, directDamage);
    targetNode.cFlash = (targetNode.cFlash || 0) + contestFlash;
    if (burstPulse > 0) targetNode.burstPulse = Math.max(targetNode.burstPulse || 0, burstPulse);

    const captureScore = getContestCaptureScore(targetNode, sourceNode.owner);
    if (captureScore >= (targetNode.captureThreshold || EMBRYO)) {
      tentacle._captureNeutralTarget(
        targetNode,
        getContestCaptureOwner(targetNode, sourceNode.owner),
        captureScore,
      );
    }
    return;
  }

  targetNode.energy -= directDamage;
  targetNode.underAttack = 1;
  targetNode.cFlash = (targetNode.cFlash || 0) + contestFlash;
  if (burstPulse > 0) targetNode.burstPulse = Math.max(targetNode.burstPulse || 0, burstPulse);

  if (targetNode.energy <= 0) {
    tentacle._defeatEnemyTarget(targetNode, sourceNode.owner);
  }
}

export function applyTentacleFriendlyFlow(targetNode, feedRate, relayFlowMultiplier, dt) {
  const incomingEnergy = feedRate * relayFlowMultiplier * dt;
  if (targetNode.energy < targetNode.maxE) {
    targetNode.energy = Math.min(targetNode.maxE, targetNode.energy + incomingEnergy);
  }
  targetNode.inFlow = (targetNode.inFlow || 0) + feedRate * relayFlowMultiplier;
  return incomingEnergy;
}

export function applyTentacleNeutralCaptureFlow(tentacle, targetNode, sourceNode, feedRate, relayFlowMultiplier, dt) {
  /* Keep the same coalition rule in the sustained-flow path as in burst/split
     payload application so neutral capture behavior stays consistent. */
  if (shouldIgnoreAlliedContestContribution(targetNode, sourceNode.owner)) return 0;

  const contestContribution =
    feedRate * computeAttackLevelMultiplier(sourceNode.level) * GAME_BALANCE.CAPTURE_SPEED_MULT * relayFlowMultiplier * dt;

  tentacle._applyNeutralContestContribution(targetNode, sourceNode.owner, contestContribution);
  tentacle._cancelRivalContestProgress(targetNode, sourceNode.owner, contestContribution * 0.9);

  const captureScore = getContestCaptureScore(targetNode, sourceNode.owner);
  if (captureScore >= (targetNode.captureThreshold || EMBRYO)) {
    tentacle._captureNeutralTarget(
      targetNode,
      getContestCaptureOwner(targetNode, sourceNode.owner),
      captureScore,
    );
  }

  return contestContribution;
}

export function applyTentacleEnemyAttackFlow(tentacle, targetNode, sourceNode, feedRate, relayFlowMultiplier, dt) {
  if (!areHostileOwners(targetNode.owner, sourceNode.owner)) {
    return applyTentacleFriendlyFlow(targetNode, feedRate, relayFlowMultiplier, dt);
  }

  const damageAmount =
    feedRate *
    computeAttackLevelMultiplier(sourceNode.level) /
    computeDefenseLevelMultiplier(targetNode.level) *
    GAME_BALANCE.ATTACK_DAMAGE_MULT *
    relayFlowMultiplier *
    dt;

  targetNode.energy -= damageAmount;
  targetNode.underAttack = 1;

  if (targetNode.energy <= 0) {
    tentacle._defeatEnemyTarget(targetNode, sourceNode.owner);
  }

  return feedRate * relayFlowMultiplier * dt;
}

export function computeTentacleClashForces(tentacle, opposingTentacle, feedRate) {
  // Clash force is intentionally bandwidth-based rather than stored-payload
  // based so the front keeps reflecting live lane pressure.
  const opposingFeedRate = Math.min(
    opposingTentacle.effectiveSourceNode?.tentFeedPerSec || 0,
    opposingTentacle.maxBandwidth,
  );

  return {
    myForce: feedRate * computeAttackLevelMultiplier(tentacle.effectiveSourceNode.level),
    opposingForce: opposingFeedRate * computeAttackLevelMultiplier(tentacle.effectiveTargetNode.level),
  };
}
