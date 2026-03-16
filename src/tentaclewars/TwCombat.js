/* ================================================================
   TwCombat — Layer 2: TW Clash / Cut Policy

   Owns the TentacleWars clash front, cut retraction payout, and
   slice-cut resolution. Operates on a migrating channel instance
   (currently Tent) and uses TwChannel Layer 1 primitives for all
   source-side economic mutations.
   ================================================================ */

import { ADV_PPS, GAME_BALANCE, GROW_PPS, TentState } from '../config/gameConfig.js';
import { clamp } from '../math/simulationMath.js';
import { computeTentacleClashFeedRate } from '../systems/EnergyBudget.js';
import { TW_BALANCE } from './TwBalance.js';
import { advanceTentacleWarsLaneRuntime } from './TwPacketFlow.js';
import { resolveTentacleWarsCutDistribution } from './TwCutRules.js';
import {
  clearEconomicPayload,
  drainSourceEnergy,
  partialRefund,
  resolveClashPartnerOnCut,
} from './TwChannel.js';
import { applyTwPayloadToTarget, clearFlowState } from './TwFlow.js';

/*
 * Applies the canonical TW slice-cut geometry and arms the retract payout.
 * Input: active channel, cut ratio along effective source->target axis, committed payload.
 * Output: channel enters RETRACTING with twCutRetraction configured and clash cleared.
 */
export function applyTwSliceCut(channel, cutRatio, payload) {
  const { effectiveCutRatio, sourceShare, targetShare } = resolveTentacleWarsCutDistribution(payload, cutRatio);

  resolveClashPartnerOnCut(channel, false);
  clearFlowState(channel);

  channel.state = TentState.RETRACTING;
  channel.reachT = effectiveCutRatio;
  channel.startT = 0;
  channel.twCutRetraction = {
    cutRatio: effectiveCutRatio,
    sourceShare,
    targetShare,
    sourceReleased: 0,
    targetReleased: 0,
    sourceFront: effectiveCutRatio,
    targetFront: effectiveCutRatio,
    initialSourceSpan: Math.max(effectiveCutRatio, 0.000001),
    initialTargetSpan: Math.max(1 - effectiveCutRatio, 0.000001),
  };
  clearEconomicPayload(channel);
}

/*
 * Advances one frame of the TW cut-retraction payout.
 * Input: RETRACTING channel with twCutRetraction state.
 * Output: progressive source refund + target payout until the lane dies.
 */
export function advanceTwCutRetraction(channel, dt) {
  const cutRetraction = channel.twCutRetraction;
  if (!cutRetraction) return;

  const retractionStep = (GROW_PPS / channel.distance) * dt;
  const nextSourceFront = Math.max(0, cutRetraction.sourceFront - retractionStep);
  const nextTargetFront = Math.min(1, cutRetraction.targetFront + retractionStep);

  const sourceProgress = cutRetraction.initialSourceSpan > 0
    ? clamp((cutRetraction.cutRatio - nextSourceFront) / cutRetraction.initialSourceSpan, 0, 1)
    : 1;
  const targetProgress = cutRetraction.initialTargetSpan > 0
    ? clamp((nextTargetFront - cutRetraction.cutRatio) / cutRetraction.initialTargetSpan, 0, 1)
    : 1;

  const desiredSourceReleased = cutRetraction.sourceShare * sourceProgress;
  const desiredTargetReleased = cutRetraction.targetShare * targetProgress;
  const sourceDelta = desiredSourceReleased - cutRetraction.sourceReleased;
  const targetDelta = desiredTargetReleased - cutRetraction.targetReleased;

  if (sourceDelta > 0) partialRefund(channel, sourceDelta);
  if (targetDelta > 0) {
    applyTwPayloadToTarget(
      channel,
      channel.effectiveTargetNode,
      channel.effectiveSourceNode,
      targetDelta,
      { contestFlash: 0, damageMultiplier: 1 },
    );
    channel.effectiveTargetNode.cFlash = Math.max(channel.effectiveTargetNode.cFlash || 0, 0.6);
  }

  cutRetraction.sourceReleased = desiredSourceReleased;
  cutRetraction.targetReleased = desiredTargetReleased;
  cutRetraction.sourceFront = nextSourceFront;
  cutRetraction.targetFront = nextTargetFront;

  const sourceDone = nextSourceFront <= 0.0001;
  const targetDone = nextTargetFront >= 0.9999;
  if (!sourceDone || !targetDone) return;

  const sourceRemainder = cutRetraction.sourceShare - cutRetraction.sourceReleased;
  const targetRemainder = cutRetraction.targetShare - cutRetraction.targetReleased;
  if (sourceRemainder > 0) partialRefund(channel, sourceRemainder);
  if (targetRemainder > 0) {
    applyTwPayloadToTarget(
      channel,
      channel.effectiveTargetNode,
      channel.effectiveSourceNode,
      targetRemainder,
      { contestFlash: 0.6, damageMultiplier: 1 },
    );
  }

  channel.twCutRetraction = null;
  channel.state = TentState.DEAD;
}

/*
 * Initializes the shared TW clash presentation/runtime fields for this frame.
 * Keeps the front pinned to midpoint unless an approach animation is active.
 */
function prepareTwClashState(channel, feedRate, dt) {
  channel.pipeAge = Math.min(channel.pipeAge + dt, channel.travelDuration * 4);
  channel.energyInPipe = Math.min(channel.pipeCapacity, feedRate * channel.travelDuration);
  const simulationTime = channel.game?.time || 0;
  channel.clashSpark = 0.7 + Math.sin(simulationTime * 12) * 0.3;

  if (!channel.clashApproachActive) {
    channel.clashT = 0.5;
    channel.clashVisualT = 0.5;
  }
}

/*
 * Advances the optional TW clash approach animation toward the midpoint.
 * Both paired tentacles share mirrored clashT/clashVisualT values.
 */
function updateTwClashApproach(channel, opposingTentacle, dt) {
  const midpoint = 0.5;
  const advanceFraction = (GROW_PPS / Math.max(channel.distance, 1)) * dt;
  const approachStep = Math.max(0.001, advanceFraction);
  const approachedFront =
    channel.clashT < midpoint
      ? Math.min(midpoint, channel.clashT + approachStep)
      : Math.max(midpoint, channel.clashT - approachStep);

  channel.clashT = approachedFront;
  channel.clashVisualT = approachedFront;
  opposingTentacle.clashT = 1 - approachedFront;
  opposingTentacle.clashVisualT = 1 - approachedFront;

  if (Math.abs(approachedFront - midpoint) > 0.0001) return;

  channel.clashT = midpoint;
  channel.clashVisualT = midpoint;
  channel.clashApproachActive = false;
  opposingTentacle.clashT = midpoint;
  opposingTentacle.clashVisualT = midpoint;
  opposingTentacle.clashApproachActive = false;
}

/*
 * Applies the asymmetric TW clash damage model after shared pressure is known.
 * The losing source takes direct damage and, below threshold, all its outgoing
 * tentacles retract while the winner advances.
 */
function applyTwClashDamage(channel, opposingTentacle, dt) {
  const sourceNode = channel.effectiveSourceNode;
  const opposingSource = opposingTentacle.effectiveSourceNode;

  const myExcessShare = sourceNode.outCount > 0
    ? (sourceNode.excessFeed || 0) / sourceNode.outCount
    : 0;
  const opposingExcessShare = opposingSource.outCount > 0
    ? (opposingSource.excessFeed || 0) / opposingSource.outCount
    : 0;
  const myPressure = computeTentacleClashFeedRate(sourceNode, channel.maxBandwidth, dt) + myExcessShare;
  const opposingPressure =
    computeTentacleClashFeedRate(opposingSource, opposingTentacle.maxBandwidth, dt) + opposingExcessShare;
  const netDamage = Math.abs(myPressure - opposingPressure);

  if (netDamage === 0) return;

  const iAmWinner = myPressure >= opposingPressure;
  const winnerTentacle = iAmWinner ? channel : opposingTentacle;
  const loserTentacle = iAmWinner ? opposingTentacle : channel;
  const losingSource = loserTentacle.effectiveSourceNode;

  drainSourceEnergy(loserTentacle, netDamage * dt); // Layer 1 write surface
  if (losingSource.energy >= TW_BALANCE.TW_RETRACT_CRITICAL_ENERGY) return;

  const losingTents = (channel.game?.tents ?? []).filter(t =>
    t.alive &&
    t.state !== TentState.DEAD &&
    t.state !== TentState.RETRACTING &&
    (t.reversed ? t.target : t.source) === losingSource,
  );

  channel.clashPartner = null;
  channel.clashVisualT = null;
  channel.clashApproachActive = false;
  opposingTentacle.clashPartner = null;
  opposingTentacle.clashVisualT = null;
  opposingTentacle.clashApproachActive = false;
  loserTentacle.clashT = null;

  for (const tentacle of losingTents) {
    tentacle.kill();
  }

  winnerTentacle.state = TentState.ADVANCING;
  winnerTentacle.clashT = null;
}

/*
 * Advances one frame of the TW clash runtime.
 * Input: ACTIVE channel already paired with an opposing clash partner.
 * Output: flowRate/packet visuals maintained, clash midpoint handled, and the
 * canonical driver applies asymmetric damage + auto-retract resolution.
 */
export function advanceTwClash(channel, dt) {
  const sourceNode = channel.effectiveSourceNode;
  const opposingTentacle = channel.clashPartner;
  if (!opposingTentacle?.alive) {
    channel.clashPartner = null;
    channel.clashVisualT = null;
    channel.clashApproachActive = false;
    return;
  }

  const feedRate = computeTentacleClashFeedRate(sourceNode, channel.maxBandwidth, dt);
  drainSourceEnergy(channel, feedRate * dt);
  prepareTwClashState(channel, feedRate, dt);

  const excessShare = sourceNode.outCount > 0
    ? (sourceNode.excessFeed || 0) / sourceNode.outCount
    : 0;
  const localPressure = computeTentacleClashFeedRate(sourceNode, channel.maxBandwidth, dt) + excessShare;
  channel.flowRate = channel.flowRate * 0.80 + localPressure * 0.20;

  const clashStep = advanceTentacleWarsLaneRuntime({
    accumulatorUnits: channel.packetAccumulatorUnits + excessShare,
    throughputPerSecond: computeTentacleClashFeedRate(sourceNode, channel.maxBandwidth, dt),
    deltaSeconds: dt,
    sourceAvailableEnergy: sourceNode.energy,
    queuedPacketTravelTimes: channel.packetTravelQueue,
    travelDurationSeconds: channel.travelDuration * (channel.clashT ?? 0.5),
  });
  channel.packetAccumulatorUnits = clashStep.nextAccumulatorUnits;
  channel.packetTravelQueue = clashStep.nextQueuedPacketTravelTimes;

  if (!(channel.source.id < channel.target.id)) return;

  if (channel.clashApproachActive || opposingTentacle.clashApproachActive) {
    updateTwClashApproach(channel, opposingTentacle, dt);
    return;
  }

  channel.clashT = 0.5;
  opposingTentacle.clashT = 0.5;
  if (!channel.clashApproachActive && !opposingTentacle.clashApproachActive) {
    channel.clashVisualT = 0.5;
    opposingTentacle.clashVisualT = 0.5;
  }
  opposingTentacle.clashSpark = channel.clashSpark;
  applyTwClashDamage(channel, opposingTentacle, dt);
}
