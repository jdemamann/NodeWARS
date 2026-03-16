/*
 * Purpose:
 * Layer 2 TentacleWars flow policy for packetized active lanes.
 *
 * Responsibilities:
 * - Advance packet accumulation and travel for active TW channels.
 * - Route sustained delivered payload through TW-native Layer 1 delivery primitives.
 * - Keep cut/burst payload delivery on the shared path until the dedicated follow-up wave.
 *
 * Runtime role:
 * Called from TwChannel during TW ACTIVE flow; operates on Tent instances during migration.
 */

import { GAME_BALANCE } from '../config/gameConfig.js';
import { computeTentacleSourceFeedRate } from '../systems/EnergyBudget.js';
import { areAlliedOwners } from '../systems/OwnerTeams.js';
import { advanceTentacleWarsLaneRuntime } from './TwPacketFlow.js';
import { drainSourceEnergy } from './TwChannel.js';
import {
  applyTentaclePayloadToTarget,
} from '../entities/TentCombat.js';
import {
  applyTwEnemyAttack,
  applyTwFriendlyDelivery,
  applyTwNeutralCapture,
  markNodeUnderAttack,
} from './TwDelivery.js';

export function getRelayFlowMultiplier(sourceNode) {
  return (sourceNode.isRelay && sourceNode.owner !== 0 && !sourceNode.inFog)
    ? GAME_BALANCE.RELAY_FLOW_MULT
    : 1;
}

/*
 * Applies already-computed burst/cut payload through the shared Tent/TentCombat path.
 * Option X for Wave 3: keep this TW branch stable until cut/burst delivery moves into TwDelivery.
 */
export function applyTwPayloadToTarget(channel, targetNode, sourceNode, payloadAmount, opts = {}) {
  applyTentaclePayloadToTarget({
    tentacle: channel,
    targetNode,
    sourceNode,
    payloadAmount,
    ...opts,
  });
}

export function clearFlowState(channel) {
  channel.energyInPipe = 0;
  channel.pipeAge = 0;
  channel.packetAccumulatorUnits = 0;
  channel.packetTravelQueue = [];
}

/*
 * Advances one TW active-flow frame for the given channel.
 * Input: ACTIVE TW channel and delta time.
 * Output: packet state advanced, source-side drains routed through Layer 1, delivery resolved.
 */
export function advanceTwFlow(channel, dt) {
  const sourceNode = channel.effectiveSourceNode;
  const targetNode = channel.effectiveTargetNode;

  const baseThroughputPerSecond = computeTentacleSourceFeedRate(sourceNode, channel.maxBandwidth, dt);
  const excessShare = sourceNode.outCount > 0
    ? (sourceNode.excessFeed || 0) / sourceNode.outCount
    : 0;
  const relayFlowMultiplier = getRelayFlowMultiplier(sourceNode);

  const laneStep = advanceTentacleWarsLaneRuntime({
    accumulatorUnits: channel.packetAccumulatorUnits + excessShare,
    throughputPerSecond: baseThroughputPerSecond,
    deltaSeconds: dt,
    sourceAvailableEnergy: sourceNode.energy,
    queuedPacketTravelTimes: channel.packetTravelQueue,
    travelDurationSeconds: channel.travelDuration,
  });

  channel.packetAccumulatorUnits = laneStep.nextAccumulatorUnits;
  channel.packetTravelQueue = laneStep.nextQueuedPacketTravelTimes;

  const emittedEnergy = laneStep.emittedPacketCount;
  if (emittedEnergy > 0) {
    drainSourceEnergy(channel, emittedEnergy);
  }

  channel.energyInPipe = channel.packetTravelQueue.length;
  channel.pipeAge = channel.packetTravelQueue.length > 0
    ? channel.travelDuration - Math.min(...channel.packetTravelQueue)
    : 0;

  let deliveredAmount = 0;
  if (!areAlliedOwners(targetNode.owner, sourceNode.owner) && targetNode.owner !== 0) {
    markNodeUnderAttack(targetNode);
  }

  if (laneStep.deliveredPacketCount > 0) {
    const deliveredAmountUnits = laneStep.deliveredPacketCount * relayFlowMultiplier;
    if (areAlliedOwners(targetNode.owner, sourceNode.owner)) {
      deliveredAmount = applyTwFriendlyDelivery(targetNode, deliveredAmountUnits);
    } else if (targetNode.owner === 0) {
      deliveredAmount = applyTwNeutralCapture(
        channel,
        targetNode,
        sourceNode,
        deliveredAmountUnits,
      );
    } else {
      deliveredAmount = applyTwEnemyAttack(
        channel,
        targetNode,
        sourceNode,
        deliveredAmountUnits,
      );
    }
  }

  const instantFlowRate = deliveredAmount / Math.max(dt, 0.001);
  channel.flowRate = channel.flowRate * 0.80 + instantFlowRate * 0.20;
}
