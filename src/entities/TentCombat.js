import { EMBRYO, GAME_BALANCE } from '../config/gameConfig.js';
import {
  computeAttackLevelMultiplier,
  computeDefenseLevelMultiplier,
} from '../math/simulationMath.js';

export function applyTentaclePayloadToTarget({
  tentacle,
  targetNode,
  sourceNode,
  payloadAmount,
  contestFlash = 0,
  burstPulse = 0,
  damageMultiplier = 1,
}) {
  const directDamage = payloadAmount * computeAttackLevelMultiplier(sourceNode.level) * damageMultiplier;

  if (targetNode.owner === sourceNode.owner) {
    targetNode.energy = Math.min(targetNode.maxE, targetNode.energy + payloadAmount);
    return;
  }

  if (targetNode.owner === 0) {
    tentacle._applyNeutralContestContribution(targetNode, sourceNode.owner, directDamage);
    targetNode.cFlash = (targetNode.cFlash || 0) + contestFlash;
    if (burstPulse > 0) targetNode.burstPulse = Math.max(targetNode.burstPulse || 0, burstPulse);

    if ((targetNode.contest[sourceNode.owner] || 0) >= (targetNode.captureThreshold || EMBRYO)) {
      tentacle._captureNeutralTarget(targetNode, sourceNode.owner, targetNode.contest[sourceNode.owner]);
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
  const contestContribution =
    feedRate * computeAttackLevelMultiplier(sourceNode.level) * GAME_BALANCE.CAPTURE_SPEED_MULT * relayFlowMultiplier * dt;

  tentacle._applyNeutralContestContribution(targetNode, sourceNode.owner, contestContribution);
  tentacle._cancelRivalContestProgress(targetNode, sourceNode.owner, contestContribution * 0.9);

  if ((targetNode.contest[sourceNode.owner] || 0) >= (targetNode.captureThreshold || EMBRYO)) {
    tentacle._captureNeutralTarget(targetNode, sourceNode.owner, targetNode.contest[sourceNode.owner]);
  }

  return contestContribution;
}

export function applyTentacleEnemyAttackFlow(tentacle, targetNode, sourceNode, feedRate, relayFlowMultiplier, dt) {
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
  const opposingFeedRate = Math.min(
    opposingTentacle.effectiveSourceNode?.tentFeedPerSec || 0,
    opposingTentacle.maxBandwidth,
  );

  return {
    myForce: feedRate * computeAttackLevelMultiplier(tentacle.effectiveSourceNode.level),
    opposingForce: opposingFeedRate * computeAttackLevelMultiplier(tentacle.effectiveTargetNode.level),
  };
}
