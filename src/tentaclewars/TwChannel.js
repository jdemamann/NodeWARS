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
