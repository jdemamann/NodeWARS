/*
 * Purpose:
 * Layer 1 lane primitives for TentacleWars channels during the extraction phase.
 *
 * Responsibilities:
 * - Own invariant-preserving lane energy operations.
 * - Resolve refunding vs destructive unwind consistently.
 * - Provide the future single write surface for lane-driven node.energy changes.
 *
 * Runtime role:
 * Operates on Tent instances during migration; Tent.js delegates TW lifecycle into this module.
 */

import { TentState } from '../config/gameConfig.js';
import { ADV_PPS, GROW_PPS } from '../config/gameConfig.js';
import { bus } from '../core/EventBus.js';
import { areHostileOwners } from '../systems/OwnerTeams.js';
import { resolveGrowingTentacleCollision } from '../entities/TentRules.js';

function clearEconomicPayload(channel) {
  channel.paidCost = 0;
  channel.energyInPipe = 0;
  channel._burstPayload = 0;
}

function clearClashVisualState(channel) {
  channel.clashPartner = null;
  channel.clashVisualT = null;
  channel.clashApproachActive = false;
}

function resolveClashPartnerOnCut(channel, preserveClashT) {
  if (!channel.clashPartner) return;

  const partner = channel.clashPartner;
  clearClashVisualState(channel);
  clearClashVisualState(partner);

  if (!partner.alive) return;

  partner.state = TentState.ADVANCING;
  partner.reachT = 1 - (preserveClashT ? (channel.clashT ?? channel.reachT) : channel.reachT);
  partner.clashT = null;
}

/*
 * Performs the canonical refund-preserving retract path for an active lane.
 * Input: migrating channel instance carrying committed payload and optional clash partner.
 * Output: source refunded, payload cleared, lane enters RETRACTING, partner advances if present.
 */
export function retract(channel) {
  channel.clashT = null;
  resolveClashPartnerOnCut(channel, false);

  const refundAmount = (channel.paidCost || 0) + (channel.energyInPipe || 0);
  channel.effectiveSourceNode.energy += refundAmount;
  clearEconomicPayload(channel);
  channel.state = TentState.RETRACTING;
}

/*
 * Destroys committed payload without refund while preserving the visible collapse animation.
 * Input: migrating channel instance whose source ownership was invalidated.
 * Output: payload cleared, lane enters RETRACTING, partner advances from the clash point.
 */
export function collapseCommittedPayload(channel) {
  if (channel.state === TentState.DEAD) return;

  resolveClashPartnerOnCut(channel, true);
  clearEconomicPayload(channel);
  channel.cutFlash = 0;
  channel.reachT = channel.state === TentState.GROWING
    ? channel.reachT
    : Math.max(channel.reachT, 1);
  channel.state = TentState.RETRACTING;
}

export function getCommittedPayload(channel) {
  return channel.state === TentState.BURSTING
    ? (channel._burstPayload || 0)
    : ((channel.paidCost || 0) + (channel.energyInPipe || 0));
}

export function drainSourceEnergy(channel, amount) {
  channel.effectiveSourceNode.energy = Math.max(0, channel.effectiveSourceNode.energy - amount);
}

export function partialRefund(channel, amount) {
  channel.effectiveSourceNode.energy += amount;
}

export function beginBurst(channel, payload, startT) {
  channel.state = TentState.BURSTING;
  channel._burstPayload = payload;
  channel.startT = startT;
}

export function transfer(channel, energy) {
  channel.effectiveSourceNode.energy -= energy;
  channel.effectiveTargetNode.energy += energy;
}

/*
 * Routes the current TW channel through its state-specific lifecycle branch.
 * Input: migrating Tent instance acting as a Layer 1 channel plus delta time.
 * Output: one frame of TW lifecycle advancement with NW delegated elsewhere.
 */
export function advanceLifecycle(channel, dt) {
  if (channel.state === TentState.DEAD) return;
  channel.age = (channel.age || 0) + dt;
  if (channel.cutFlash > 0) {
    channel.cutFlash = Math.max(0, channel.cutFlash - dt * 3);
  }

  if (channel.state === TentState.GROWING) {
    advanceGrowing(channel, dt);
    return;
  }
  if (channel.state === TentState.RETRACTING) {
    advanceRetracting(channel, dt);
    return;
  }
  if (channel.state === TentState.ADVANCING) {
    advanceAdvancing(channel, dt);
    return;
  }
  if (channel.state === TentState.BURSTING) {
    advanceBursting(channel, dt);
    return;
  }
  advanceActive(channel, dt);
}

function advanceGrowing(channel, dt) {
  if (channel.game && resolveGrowingTentacleCollision(channel, channel.game.tents)) return;

  const previousReach = channel.reachT;
  const intendedReach = Math.min(1, channel.reachT + (GROW_PPS / channel.distance) * dt);
  const intendedGrowthFraction = intendedReach - previousReach;
  const maxAffordableGrowthFraction = channel.buildCost > 0
    ? Math.max(0, channel.source.energy) / channel.buildCost
    : intendedGrowthFraction;
  const actualGrowthFraction = Math.max(0, Math.min(intendedGrowthFraction, maxAffordableGrowthFraction));
  const actualCost = channel.buildCost * actualGrowthFraction;

  channel.reachT = previousReach + actualGrowthFraction;
  channel.source.energy = Math.max(0, channel.source.energy - actualCost);
  channel.paidCost += actualCost;

  if (channel.reachT >= 1) {
    const remainder = Math.max(0, channel.buildCost - channel.paidCost);
    if (remainder > 0) channel.source.energy = Math.max(0, channel.source.energy - remainder);
    channel.paidCost = channel.buildCost;
    bus.emit('tent:connect', channel);
    channel.state = TentState.ACTIVE;
    channel.pipeAge = 0;
  }
}

function advanceRetracting(channel, dt) {
  if (channel.twCutRetraction) {
    channel._advanceTwCutRetraction(dt);
    return;
  }

  channel.reachT = Math.max(0, channel.reachT - (GROW_PPS / channel.distance) * dt);
  if (channel.reachT <= 0) channel.state = TentState.DEAD;
}

function advanceAdvancing(channel, dt) {
  channel.reachT = Math.min(1, channel.reachT + (ADV_PPS / channel.distance) * dt);
  if (channel.reachT >= 1) {
    channel.state = TentState.ACTIVE;
    channel.pipeAge = channel.travelDuration;
  }
}

function advanceBursting(channel, dt) {
  channel.startT = Math.min(1, channel.startT + (ADV_PPS * 2 / channel.distance) * dt);
  if (channel.startT < 1) return;

  const sourceNode = channel.effectiveSourceNode;
  const targetNode = channel.effectiveTargetNode;
  const payload = channel._burstPayload || 0;
  channel._applyPayloadToTarget(targetNode, sourceNode, payload, {
    contestFlash: 0.8,
    burstPulse: 1.0,
    damageMultiplier: sourceNode.simulationMode === 'tentaclewars' ? 1 : undefined,
  });
  channel.state = TentState.DEAD;
}

function advanceActive(channel, dt) {
  const sourceNode = channel.effectiveSourceNode;

  if (sourceNode.owner === 0) {
    retract(channel);
    return;
  }

  if (!channel.clashPartner && sourceNode.energy < 0.25) {
    retract(channel);
    return;
  }

  const effectiveTarget = channel.effectiveTargetNode;
  if (areHostileOwners(effectiveTarget.owner, sourceNode.owner) &&
      channel._previousTargetOwner === 0) {
    channel.state = TentState.RETRACTING;
    channel._previousTargetOwner = effectiveTarget.owner;
    return;
  }
  channel._previousTargetOwner = effectiveTarget.owner;

  if (channel.clashPartner?.alive && channel.clashPartner.state !== TentState.RETRACTING) {
    channel._updateClashState(dt);
  } else if (channel.clashT !== null) {
    channel.clashT = null;
    channel.clashVisualT = null;
    channel.clashApproachActive = false;
    channel.clashPartner = null;
    channel.state = TentState.ADVANCING;
  } else {
    channel.clashT = null;
    channel.clashVisualT = null;
    channel.clashApproachActive = false;
    channel.clashPartner = null;
    channel._updateActiveFlowState(dt);
  }
}
