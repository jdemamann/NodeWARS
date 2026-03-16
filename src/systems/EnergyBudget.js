/* ================================================================
   Energy budget helpers

   Canonical helpers for per-node regen and outgoing lane budgets.
   Rendering and gameplay should both use these helpers when they need
   displayed or effective regen values.
   ================================================================ */

import { TIER_REGEN, GAME_BALANCE } from '../config/gameConfig.js';
import { getTentacleWarsPacketRateForGrade } from '../tentaclewars/TwGradeTable.js';
import { TW_BALANCE } from '../tentaclewars/TwBalance.js';

export function captureRelayFeedBudget(node) {
  return node.isRelay ? (node.inFlow || 0) : 0;
}

export function computeNodeDisplayRegenRate(node, frenzyActive = false) {
  if (!node || node.isRelay || node.owner === 0) return 0;
  if (node.simulationMode === 'tentaclewars') {
    return getTentacleWarsPacketRateForGrade(node.level);
  }
  const tierRegen = TIER_REGEN[node.level] ?? TIER_REGEN[0];
  const boost = frenzyActive && node.owner === 1 ? GAME_BALANCE.FRENZY_REGEN_MULT : 1.0;
  return tierRegen * GAME_BALANCE.GLOBAL_REGEN_MULT * boost;
}

export function computeNodeSourceBudget(node) {
  if (node.isRelay) return node.relayFeedBudget || 0;
  return computeNodeDisplayRegenRate(node, false);
}

export function computeNodeTentacleFeedRate(node) {
  if (node.simulationMode === 'tentaclewars') {
    const outgoingTentacles = Math.max(1, node.outCount);
    // TW support lanes do not spend the full packet budget outward; this
    // retained share keeps the source cell self-regenerating while it feeds.
    const selfFraction = TW_BALANCE.TW_SELF_REGEN_FRACTION ?? 0;
    return computeNodeSourceBudget(node) * (1 - selfFraction) / outgoingTentacles;
  }

  const outgoingTentacles = Math.max(1, node.outCount);
  const attackPressure = Math.max(0, Math.min(1, node.underAttack || 0));
  const outputMultiplier = 1 - attackPressure * GAME_BALANCE.UNDER_ATTACK_OUTPUT_DAMPING_MAX;
  if (node.isRelay) {
    return computeNodeSourceBudget(node) * outputMultiplier / outgoingTentacles;
  }

  const feedShare = 1 - GAME_BALANCE.SELF_REGEN_FRACTION;
  return computeNodeSourceBudget(node) * outputMultiplier * feedShare / outgoingTentacles;
}

export function computeTentacleSourceFeedRate(sourceNode, maxBandwidth, dt) {
  const relayStoredBudget = sourceNode.isRelay
    ? sourceNode.energy / Math.max(dt, 0.001)
    : Infinity;

  return Math.min(sourceNode.tentFeedPerSec || 0, maxBandwidth, relayStoredBudget);
}

export function computeTentacleClashFeedRate(sourceNode, maxBandwidth, dt) {
  if (sourceNode.isRelay) {
    return computeTentacleSourceFeedRate(sourceNode, maxBandwidth, dt);
  }

  const outgoingTentacles = Math.max(1, sourceNode.outCount);
  const attackPressure = Math.max(0, Math.min(1, sourceNode.underAttack || 0));
  const outputMultiplier = 1 - attackPressure * GAME_BALANCE.UNDER_ATTACK_OUTPUT_DAMPING_MAX;
  const fullCommittedShare =
    computeNodeSourceBudget(sourceNode) * outputMultiplier / outgoingTentacles;
  const clashRate = fullCommittedShare * GAME_BALANCE.CLASH_DRAIN_MULTIPLIER;

  return Math.min(clashRate, maxBandwidth, sourceNode.energy / Math.max(dt, 0.001));
}
