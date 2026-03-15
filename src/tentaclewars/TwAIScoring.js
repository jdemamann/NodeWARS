/* ================================================================
   TentacleWars AI scoring

   Builds lightweight move and slice scores for the TentacleWars
   sandbox. The first phase focuses on packet pressure, support
   triangles, overflow-ready sources, and purple slice denial.
   ================================================================ */

import { computeDistance } from '../math/simulationMath.js';
import { TentState } from '../config/gameConfig.js';
import { areAlliedOwners, areHostileOwners } from '../systems/OwnerTeams.js';
import { TW_BALANCE } from './TwBalance.js';

/*
 * Overflow pressure matters more when the source is already saturated, because
 * the prototype mode is meant to reward support triangles and full-cell spill.
 */
function computeOverflowPressureBonus(sourceNode, balance = TW_BALANCE) {
  if (!sourceNode || sourceNode.maxE <= 0) return 0;
  const energyRatio = sourceNode.energy / sourceNode.maxE;
  return energyRatio >= 0.9 ? balance.AI_OVERFLOW_READY_BONUS : 0;
}

/*
 * Treat an existing allied lane to the same target as a simple support
 * triangle signal. It is not a full graph search, but it captures the
 * behavior we want in phase 1 without overfitting the prototype.
 */
function computeSupportTriangleBonus(game, sourceNode, targetNode, owner, balance = TW_BALANCE) {
  const alliedSupportExists = game.tents.some(tentacle =>
    tentacle.alive &&
    tentacle.source !== sourceNode &&
    tentacle.target === targetNode &&
    tentacle.source.owner === owner
  );
  if (alliedSupportExists) return balance.AI_SUPPORT_TRIANGLE_BONUS;

  const nearbyOwnedSupportNode = game.nodes.some(candidateNode =>
    candidateNode !== sourceNode &&
    candidateNode.owner === owner &&
    computeDistance(candidateNode.x, candidateNode.y, targetNode.x, targetNode.y) <= balance.AI_SUPPORT_PROXIMITY_PX
  );
  return nearbyOwnedSupportNode ? balance.AI_SUPPORT_TRIANGLE_BONUS * 0.5 : 0;
}

/*
 * Favor low-energy and already-pressured hostile targets so the prototype AI
 * feels decisive instead of spreading energy too thinly.
 */
function computeHostilePressureScore(targetNode, owner, balance = TW_BALANCE) {
  if (!areHostileOwners(owner, targetNode.owner)) return 0;

  let score = balance.AI_HOSTILE_FINISH_BONUS * (1 - Math.min(1, targetNode.energy / Math.max(1, targetNode.maxE)));
  score += (targetNode.underAttack || 0) * balance.AI_EXISTING_PRESSURE_BONUS;
  if (targetNode.owner === 1) score += balance.AI_HOSTILE_PLAYER_TARGET_BONUS;
  if ((targetNode.outCount || 0) <= 1) score += 6;
  return score;
}

/*
 * Neutral capture pressure stays deliberately simple in phase 1: cheaper cells
 * and already-contested neutrals should attract stacked AI attention.
 */
function computeNeutralPressureScore(game, targetNode, owner, balance = TW_BALANCE) {
  if (targetNode.owner !== 0) return 0;

  const capturePressure = (targetNode.contest?.[owner] || 0) * 0.8;
  const energyDiscount = 1 - Math.min(1, targetNode.energy / Math.max(1, targetNode.maxE));
  return balance.AI_NEUTRAL_CAPTURE_BONUS * energyDiscount + capturePressure;
}

/*
 * Supporting allied cells under pressure is how the first TentacleWars AI
 * prototype starts to express triangle play without a bespoke packet sim yet.
 */
function computeAlliedSupportScore(targetNode, owner, balance = TW_BALANCE) {
  if (!areAlliedOwners(owner, targetNode.owner)) return 0;
  if (targetNode.underAttack <= 0) return 0;
  return balance.AI_ALLIED_SUPPORT_BONUS * Math.max(0.3, targetNode.underAttack);
}

/*
 * Convert a source-target pair into a move score tuned for the TentacleWars
 * sandbox. Distance still matters, but structural pressure dominates.
 */
export function buildTentacleWarsMoveScore({
  game,
  owner,
  sourceNode,
  targetNode,
  totalBuildCost,
  balance = TW_BALANCE,
}) {
  const distance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
  const distanceScore = balance.AI_DISTANCE_PRESSURE_FACTOR / (distance + 60);
  const overflowBonus = computeOverflowPressureBonus(sourceNode, balance);
  const supportTriangleBonus = computeSupportTriangleBonus(game, sourceNode, targetNode, owner, balance);
  const hostilePressureScore = computeHostilePressureScore(targetNode, owner, balance);
  const neutralPressureScore = computeNeutralPressureScore(game, targetNode, owner, balance);
  const alliedSupportScore = computeAlliedSupportScore(targetNode, owner, balance);
  const economicPenalty = totalBuildCost * 0.22;

  return distanceScore + overflowBonus + supportTriangleBonus +
    hostilePressureScore + neutralPressureScore + alliedSupportScore - economicPenalty;
}

/*
 * Purple should cut when a charged hostile lane can convert pipe energy into
 * burst pressure. The score intentionally rewards overflow-ready sources and
 * already-weakened targets.
 */
export function scoreTentacleWarsSliceOpportunity({
  tentacle,
  owner,
  balance = TW_BALANCE,
}) {
  const targetNode = tentacle.effectiveTargetNode;
  const sourceNode = tentacle.effectiveSourceNode;
  if (!targetNode || !sourceNode) return 0;
  if (!areHostileOwners(owner, targetNode.owner)) return 0;

  let score = balance.AI_PURPLE_SLICE_HOSTILE_TARGET_BONUS;
  score += (tentacle.energyInPipe || 0) * 0.35;
  score += Math.max(0, 1 - targetNode.energy / Math.max(1, targetNode.maxE)) * 20;
  if (sourceNode.energy >= sourceNode.maxE * 0.9) score += balance.AI_PURPLE_SLICE_OVERFLOW_SOURCE_BONUS;
  if (tentacle.state === TentState.ADVANCING) score += 8;
  return score;
}
