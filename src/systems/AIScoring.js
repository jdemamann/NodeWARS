import { NodeType } from '../config/gameConfig.js';
import { computeDistance } from '../math/simulationMath.js';
import { getContestCaptureScore } from './NeutralContest.js';
import { areAlliedOwners, areHostileOwners } from './OwnerTeams.js';

export function buildAiTacticalState(game, owner, aiRules) {
  const ownedNodes = game.nodes.filter(node => node.owner === owner && !node.isRelay);
  const playerNodes = game.nodes.filter(node => node.owner === 1 && !node.isRelay);
  const neutralNodes = game.nodes.filter(node => node.owner === 0 && !node.isRelay);

  const lowEnergyOwnedNodes = ownedNodes.filter(node => node.energy < node.maxE * aiRules.RECOVER_LOW_ENERGY_FRACTION).length;
  const pressuredOwnedNodes = ownedNodes.filter(node => node.underAttack > 0.25).length;
  const finishablePlayerNodes = playerNodes.filter(node => node.energy < node.maxE * aiRules.FINISH_PLAYER_ENERGY_FRACTION).length;
  const pressuredPlayerNodes = playerNodes.filter(node => node.underAttack > aiRules.FINISH_PRESSURE_THRESHOLD).length;
  const neutralRatio = neutralNodes.length / Math.max(1, game.nodes.length);

  if (finishablePlayerNodes > 0 || pressuredPlayerNodes >= 2) return 'finish';
  if (pressuredOwnedNodes >= aiRules.SUPPORT_UNDER_ATTACK_NODE_THRESHOLD) return 'support';
  if (lowEnergyOwnedNodes >= Math.max(1, Math.ceil(ownedNodes.length * 0.5))) return 'recover';
  if (neutralRatio >= aiRules.EXPAND_NEUTRAL_RATIO_THRESHOLD) return 'expand';
  return 'pressure';
}

export function buildRelayContext(game, owner, targetNode, relayContextRadiusPx, tentState) {
  let centrality = 0;
  let friendlyRouteValue = 0;
  let playerRouteValue = 0;
  let neutralRouteValue = 0;

  for (const node of game.nodes) {
    if (node === targetNode || node.type === NodeType.HAZARD) continue;
    const distance = computeDistance(targetNode.x, targetNode.y, node.x, node.y);
    const weight = Math.max(0, 1 - distance / relayContextRadiusPx);
    if (weight <= 0) continue;

    centrality += weight;
    if (node.owner === owner && !node.isRelay) friendlyRouteValue += weight;
    else if (node.owner === 1 && !node.isRelay) playerRouteValue += weight;
    else if (node.owner === 0 && !node.isRelay) neutralRouteValue += weight;
  }

  let playerRelayLinks = 0;
  let enemyPressure = 0;
  for (const tentacle of game.tents) {
    if (!tentacle.alive || (tentacle.state !== tentState.ACTIVE && tentacle.state !== tentState.ADVANCING)) continue;
    if (tentacle.effectiveSourceNode === targetNode && tentacle.effectiveSourceNode.owner === 1) playerRelayLinks += 1;
    if (tentacle.effectiveTargetNode === targetNode && tentacle.effectiveSourceNode.owner === 1) enemyPressure += 1;
  }

  return {
    centrality,
    friendlyRouteValue,
    playerRouteValue,
    neutralRouteValue,
    playerRelayLinks,
    enemyPressure,
  };
}

export function buildTargetPressureContext(game, owner, targetNode, tentState) {
  let alliedIncomingLanes = 0;
  let hostileIncomingLanes = 0;
  let alliedExistingPressure = 0;

  for (const tentacle of game.tents) {
    if (!tentacle.alive) continue;
    if (tentacle.state !== tentState.ACTIVE && tentacle.state !== tentState.ADVANCING) continue;
    if (tentacle.effectiveTargetNode !== targetNode) continue;

    if (areAlliedOwners(tentacle.effectiveSourceNode.owner, owner)) {
      alliedIncomingLanes += 1;
      alliedExistingPressure += tentacle.energyInPipe || 0;
    } else if (areHostileOwners(tentacle.effectiveSourceNode.owner, owner)) {
      hostileIncomingLanes += 1;
    }
  }

  return {
    alliedIncomingLanes,
    hostileIncomingLanes,
    alliedExistingPressure,
  };
}

export function scoreStructuralWeakness({
  game,
  sourceNode,
  targetNode,
  pressureContext,
  aiRules,
}) {
  if (targetNode.owner !== 1 || targetNode.isRelay) return 0;

  let score = 0;
  const exposedOutCount = targetNode.outCount || 0;
  if (exposedOutCount >= aiRules.PLAYER_EXPOSED_OUTCOUNT_THRESHOLD) {
    score += exposedOutCount * aiRules.PLAYER_EXPOSED_SUPPORT_PENALTY;
  }

  if (targetNode.energy < targetNode.maxE * aiRules.PLAYER_THIN_DEFENSE_ENERGY_FRACTION) {
    score += aiRules.PLAYER_THIN_DEFENSE_BONUS;
  }

  if (pressureContext.alliedIncomingLanes === 0) {
    score += aiRules.PLAYER_EXPOSED_SUPPORT_PENALTY;
  }

  const nearestPlayerSupportDistance = game.nodes.reduce((bestDistance, node) => {
    if (node === targetNode || node.owner !== 1 || node.isRelay) return bestDistance;
    const distance = computeDistance(targetNode.x, targetNode.y, node.x, node.y);
    return Math.min(bestDistance, distance);
  }, Infinity);

  if (nearestPlayerSupportDistance > aiRules.PLAYER_ISOLATED_DISTANCE_PX) {
    score += aiRules.PLAYER_ISOLATED_NODE_BONUS;
  }

  const sourceDistance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
  if (sourceDistance > aiRules.PLAYER_ISOLATED_DISTANCE_PX && exposedOutCount >= 1) {
    score += aiRules.PLAYER_ISOLATED_NODE_BONUS * 0.5;
  }

  return score;
}

export function scoreSliceOpportunity({
  game,
  owner,
  tentacle,
  tacticalState,
  aiRules,
}) {
  const sourceNode = tentacle.effectiveSourceNode;
  const targetNode = tentacle.effectiveTargetNode;
  if (sourceNode.owner !== owner || targetNode.owner !== 1) return -Infinity;
  if (!tentacle.alive || tentacle.energyInPipe <= 0) return -Infinity;

  const pipeEnergy = tentacle.energyInPipe || 0;
  const pipeTargetRatio = pipeEnergy / Math.max(targetNode.energy, 1);
  let score = pipeTargetRatio * aiRules.SLICE_PIPE_TARGET_RATIO_BONUS;

  if (targetNode.energy < targetNode.maxE * aiRules.SLICE_LOW_PLAYER_ENERGY_FRACTION) {
    score += aiRules.SLICE_LOW_PLAYER_ENERGY_BONUS;
  }
  if (targetNode.underAttack > 0.15) score += aiRules.SLICE_EXISTING_PRESSURE_BONUS;
  if ((targetNode.outCount || 0) >= aiRules.PLAYER_EXPOSED_OUTCOUNT_THRESHOLD) {
    score += aiRules.SLICE_OVEREXTENDED_PLAYER_BONUS;
  }
  if (tentacle.distance >= aiRules.SLICE_LONG_LANE_MIN_PX) score += aiRules.SLICE_LONG_LANE_BONUS;
  if (tentacle.clashPartner) score += aiRules.SLICE_CLASH_BREAK_BONUS;
  if (sourceNode.isRelay) score += aiRules.SLICE_RELAY_STRIKE_BONUS;
  if (tacticalState === 'finish') score += 10;
  if (owner === 3) score += 8;

  return score;
}

export function scoreRelayTarget({
  game,
  owner,
  sourceNode,
  targetNode,
  proximityScore,
  isDefensive,
  personality,
  totalBuildCost,
  aiRules,
  tentState,
}) {
  const relayContext = buildRelayContext(game, owner, targetNode, aiRules.RELAY_CONTEXT_RADIUS_PX, tentState);
  const playerContestProgress = targetNode.contest?.[1] || 0;
  const ownContestProgress = targetNode.contest?.[owner] || 0;
  const captureRequirement = Math.max(targetNode.captureThreshold || 20, targetNode.energy || 0);
  const remainingEnergyAfterBuild = sourceNode.energy - totalBuildCost;

  let score = 54 + proximityScore;
  score += relayContext.centrality * 15;
  score += relayContext.friendlyRouteValue * 7;
  score += relayContext.neutralRouteValue * 5;
  score += relayContext.playerRouteValue * (targetNode.owner === 1 ? 12 : 6);
  score += relayContext.playerRelayLinks * 16;
  score += playerContestProgress * 0.9;
  score += ownContestProgress * 0.4;

  if (targetNode.owner === 0) {
    score += 18 + personality.expansionBonus;
    score -= captureRequirement * 0.45;
  } else if (targetNode.owner === 1) {
    score += 26 + personality.attackBonus;
    score -= targetNode.energy * 0.35;
  } else if (areAlliedOwners(targetNode.owner, owner)) {
    score = 12 + proximityScore + personality.siegeBonus + relayContext.playerRouteValue * 4;
    if (targetNode.owner !== owner) score += 10;
    if (targetNode.energy < captureRequirement * 0.4) score += 10;
  }

  const losingRisk =
    relayContext.playerRouteValue * 10 +
    relayContext.enemyPressure * 14 +
    Math.max(0, captureRequirement - remainingEnergyAfterBuild) * 0.55 -
    relayContext.friendlyRouteValue * 6;

  score -= losingRisk;
  if (remainingEnergyAfterBuild < captureRequirement * 0.45) score -= 24;
  if (isDefensive) score *= targetNode.owner === owner ? 1.0 : personality.defensiveDampener;
  return score;
}

export function buildMoveScore({
  game,
  owner,
  sourceNode,
  targetNode,
  proximityScore,
  isDefensive,
  personality,
  totalBuildCost,
  aiRules,
  tentState,
  tacticalState,
}) {
  const pressureContext = buildTargetPressureContext(game, owner, targetNode, tentState);

  if (targetNode.isRelay) {
    return scoreRelayTarget({
      game,
      owner,
      sourceNode,
      targetNode,
      proximityScore,
      isDefensive,
      personality,
      totalBuildCost,
      aiRules,
      tentState,
    });
  }

  if (targetNode.owner === 0) {
    const playerContestProgress = targetNode.contest?.[1] || 0;
    const alliedContestProgress = getContestCaptureScore(targetNode, owner);
    let score =
      72 +
      proximityScore +
      personality.expansionBonus +
      alliedContestProgress * aiRules.ALLIED_CONTEST_CONTINUATION_BONUS -
      targetNode.energy * 0.2 -
      playerContestProgress * 1.8;
    if (pressureContext.alliedIncomingLanes >= 1 && alliedContestProgress > (targetNode.captureThreshold || 20) * 0.4) score += 8;
    if (pressureContext.alliedIncomingLanes >= 2) score -= aiRules.OVERCOMMIT_NEUTRAL_TARGET_PENALTY;
    if (tacticalState === 'expand') score += aiRules.TACTICAL_EXPAND_NEUTRAL_BONUS;
    if (isDefensive) score *= personality.defensiveDampener;
    return score;
  }

  if (targetNode.owner === 1) {
    const energyAdvantage = sourceNode.energy - targetNode.energy;
    const existingPressureBonus = game.tents.some(tentacle =>
      tentacle.alive && tentacle.source.owner === owner && tentacle.target === targetNode
    ) ? 18 : 0;
    let score = (isDefensive ? 20 : 55) + energyAdvantage * 0.5 + proximityScore + existingPressureBonus + personality.attackBonus;
    if (targetNode.energy < targetNode.maxE * 0.35) score += aiRules.PLAYER_KILL_CONFIRM_BONUS;
    if (targetNode.underAttack > 0.2) score += aiRules.PLAYER_UNDER_ATTACK_PRESSURE_BONUS;
    if ((targetNode.outCount || 0) >= 2) score += aiRules.PLAYER_HIGH_OUTCOUNT_PUNISH_BONUS;
    if (pressureContext.alliedIncomingLanes >= 2 && targetNode.energy > targetNode.maxE * 0.4) score -= aiRules.OVERCOMMIT_PLAYER_TARGET_PENALTY;
    score += scoreStructuralWeakness({
      game,
      sourceNode,
      targetNode,
      pressureContext,
      aiRules,
    });
    if (tacticalState === 'pressure') score += aiRules.TACTICAL_PRESSURE_PLAYER_BONUS;
    if (tacticalState === 'finish') score += aiRules.TACTICAL_FINISH_PLAYER_BONUS;
    if (tacticalState === 'recover') score *= aiRules.TACTICAL_RECOVER_PLAYER_ATTACK_DAMPENER;

    if (owner === 3) {
      if (targetNode.energy < targetNode.maxE * 0.35) score += 18;
      if (targetNode.underAttack > 0.2) score += 10;
      if (existingPressureBonus > 0) score += 12;
      if (pressureContext.alliedExistingPressure > targetNode.energy * 0.6) score += 10;
    }

    return score;
  }

  if (areAlliedOwners(targetNode.owner, owner)) {
    const alliedSupportBonus = targetNode.owner !== owner ? 10 : 0;
    const alliedUnderPlayerPressure = targetNode.underAttack > 0.18 || pressureContext.hostileIncomingLanes > 0;
    if (alliedUnderPlayerPressure) {
      let score = 58 + proximityScore + alliedSupportBonus + aiRules.ALLIED_SUPPORT_UNDER_ATTACK_BONUS;
      if (tacticalState === 'support' || tacticalState === 'recover') score += aiRules.TACTICAL_SUPPORT_ALLY_BONUS;
      return score;
    }
    if (targetNode.energy < targetNode.maxE * 0.5) return 22 + proximityScore + personality.siegeBonus + alliedSupportBonus;
    if (isDefensive && targetNode.energy < targetNode.maxE * 0.4) return 55 + proximityScore + alliedSupportBonus;
    if (targetNode.owner !== owner && targetNode.energy < targetNode.maxE * 0.75) return 16 + proximityScore + alliedSupportBonus;
  }

  return 0;
}

export function scoreRelayOriginAdjustment(sourceNode, distance, totalBuildCost, aiRules) {
  if (!sourceNode.isRelay) return 0;

  const remainingRelayEnergy = sourceNode.energy - totalBuildCost;
  let adjustment = 0;
  if (distance > aiRules.RELAY_CONTEXT_RADIUS_PX * 0.45) adjustment -= 12;
  if (distance > aiRules.RELAY_CONTEXT_RADIUS_PX * 0.7) adjustment -= 18;
  if (remainingRelayEnergy < totalBuildCost * 0.35) adjustment -= 16;
  return adjustment;
}
