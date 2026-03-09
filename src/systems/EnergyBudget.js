import { TIER_REGEN, GAME_BALANCE } from '../config/gameConfig.js';

export function captureRelayFeedBudget(node) {
  return node.isRelay ? (node.inFlow || 0) : 0;
}

export function computeNodeSourceBudget(node) {
  if (node.isRelay) return node.relayFeedBudget || 0;
  const tierRegen = TIER_REGEN[node.level] ?? TIER_REGEN[0];
  return tierRegen * GAME_BALANCE.GLOBAL_REGEN_MULT;
}

export function computeNodeTentacleFeedRate(node) {
  const outgoingTentacles = Math.max(1, node.outCount);
  const attackPressure = Math.max(0, Math.min(1, node.underAttack || 0));
  const outputMultiplier = 1 - attackPressure * GAME_BALANCE.UNDER_ATTACK_OUTPUT_DAMPING_MAX;
  return computeNodeSourceBudget(node) * outputMultiplier / outgoingTentacles;
}

export function computeTentacleSourceFeedRate(sourceNode, maxBandwidth, dt) {
  const relayStoredBudget = sourceNode.isRelay
    ? sourceNode.energy / Math.max(dt, 0.001)
    : Infinity;

  return Math.min(sourceNode.tentFeedPerSec || 0, maxBandwidth, relayStoredBudget);
}
