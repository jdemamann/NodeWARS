/*
 * Purpose:
 * Layer 2 TentacleWars flow policy for packetized active lanes.
 *
 * Responsibilities:
 * - Advance packet accumulation and travel for active TW channels.
 * - Route delivered payload through the current shared delivery helpers.
 * - Keep the migration debt around target-side writes explicit and bounded.
 *
 * Runtime role:
 * Called from TwChannel during TW ACTIVE flow; operates on Tent instances during migration.
 */

import { GAME_BALANCE } from '../config/gameConfig.js';
import { computeTentacleSourceFeedRate } from '../systems/EnergyBudget.js';
import { areAlliedOwners } from '../systems/OwnerTeams.js';
import { advanceTentacleWarsLaneRuntime } from './TwPacketFlow.js';
import { drainSourceEnergy } from './TwChannel.js';
/*
 * Migration bridge:
 * These shared helpers still mutate target-side node state directly. Wave 3
 * replaces them with cleaner Layer 1/2 boundaries.
 */
import {
  applyTentacleEnemyAttackFlow,
  applyTentacleFriendlyFlow,
  applyTentacleNeutralCaptureFlow,
  applyTentaclePayloadToTarget,
} from '../entities/TentCombat.js';

export function getRelayFlowMultiplier(sourceNode) {
  return (sourceNode.isRelay && sourceNode.owner !== 0 && !sourceNode.inFog)
    ? GAME_BALANCE.RELAY_FLOW_MULT
    : 1;
}

/*
 * Applies already-computed payload to a target node through the existing shared
 * Tent/TentCombat delivery resolution path.
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
    // Migration debt: visual pressure hint still writes directly to the node.
    targetNode.underAttack = Math.max(targetNode.underAttack || 0, 1);
  }

  if (laneStep.deliveredPacketCount > 0) {
    const deliveredFeedRate = laneStep.deliveredPacketCount / Math.max(dt, 0.001);
    if (areAlliedOwners(targetNode.owner, sourceNode.owner)) {
      deliveredAmount = applyTentacleFriendlyFlow(targetNode, deliveredFeedRate, relayFlowMultiplier, dt);
    } else if (targetNode.owner === 0) {
      deliveredAmount = applyTentacleNeutralCaptureFlow(
        channel,
        targetNode,
        sourceNode,
        deliveredFeedRate,
        relayFlowMultiplier,
        dt,
      );
    } else {
      deliveredAmount = applyTentacleEnemyAttackFlow(
        channel,
        targetNode,
        sourceNode,
        deliveredFeedRate,
        relayFlowMultiplier,
        dt,
      );
    }
  }

  const instantFlowRate = deliveredAmount / Math.max(dt, 0.001);
  channel.flowRate = channel.flowRate * 0.80 + instantFlowRate * 0.20;
}
