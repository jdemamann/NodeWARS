/* ================================================================
   NODE WARS v3 — AI System

   Key improvement: personality is now a strategy object instead of
   inline conditionals. Scoring weights are named constants.
   ================================================================ */

import { GAMEPLAY_RULES, NodeType, TentState } from '../config/gameConfig.js';
import { computeBuildCost, computeDistance } from '../math/simulationMath.js';
import { Tent } from '../entities/Tent.js';
import { getContestCaptureScore } from './NeutralContest.js';
import { areAlliedOwners, areHostileOwners } from './OwnerTeams.js';

const { progression: PROGRESSION_RULES, ai: AI_RULES } = GAMEPLAY_RULES;

/* ── AI PERSONALITY DEFINITIONS ── */
const PERSONALITIES = {
  expand: {
    expansionBonus:    22,
    attackBonus:        0,
    siegeBonus:         0,
    defensiveDampener: 0.5,
    energyThreshold:   22,
  },
  siege: {
    expansionBonus:     0,
    attackBonus:        0,
    siegeBonus:        18,
    defensiveDampener: 0.5,
    energyThreshold:   22,
  },
  aggressive: {
    expansionBonus:     0,
    attackBonus:       20,
    siegeBonus:         0,
    defensiveDampener: 0.5,
    energyThreshold:   22,
  },
  /* Purple cutthroat: maximum aggression, almost never retreats.
     Its signature move is _checkStrategicCuts() — an opportunistic source-side
     burst cut routed through the same canonical slice path as the player. */
  cutthroat: {
    expansionBonus:     8,
    attackBonus:       38,
    siegeBonus:        12,
    defensiveDampener: 0.9, // nearly ignores defensive state
    energyThreshold:   18, // attacks with less energy than normal AI
  },
};

function personalityFor(levelId, owner = 2) {
  if (owner === 3) return PERSONALITIES.cutthroat;
  if (levelId <= 3) return PERSONALITIES.expand;
  if (levelId <= 6) return PERSONALITIES.siege;
  return PERSONALITIES.aggressive;
}

export class AI {
  /**
   * @param {object} game  — Game instance
   * @param {object} cfg   — Level config (aiThinkIntervalSeconds, distanceCostMultiplier, id, …)
   * @param {number} owner — Which owner this AI controls (2 = red, 3 = purple)
   */
  constructor(game, cfg, owner = 2) {
    this.game     = game;
    this.cfg      = cfg;
    this.owner    = owner;
    this._timer   = 0;
    this._interval= cfg.aiThinkIntervalSeconds;
  }

  update(dt) {
    this._timer += dt;

    /* Purple AI checks opportunistic burst cuts continuously so a charged lane
       can convert into pressure immediately, independent of build-think pacing. */
    if (this.owner === 3) this._checkStrategicCuts(this.game);

    if (this._timer < this._interval) return;
    this._timer = 0;

    /* Adaptive speed: faster when player dominates, slower when AI winning */
    const game = this.game;
    const playerNodeCount = game.nodes.filter(node => node.owner === 1).length;
    const aiNodeCount = game.nodes.filter(node => node.owner === this.owner).length;
    const playerAdvantage = (playerNodeCount - aiNodeCount) / Math.max(1, game.nodes.length);
    const speedMult = Math.max(
      AI_RULES.SPEED_MULT_MIN,
      Math.min(AI_RULES.SPEED_MULT_MAX, 1 - playerAdvantage * AI_RULES.PLAYER_ADVANTAGE_SPEED_FACTOR)
    );
    const aiThinkIntervalSeconds = this.cfg.aiThinkIntervalSeconds;
    this._interval = aiThinkIntervalSeconds * speedMult *
      (AI_RULES.INTERVAL_JITTER_BASE + Math.random() * AI_RULES.INTERVAL_JITTER_RANGE);

    this._think();
  }

  _buildRelayContext(targetNode) {
    const game = this.game;
    let centrality = 0;
    let friendlyRouteValue = 0;
    let playerRouteValue = 0;
    let neutralRouteValue = 0;

    for (const node of game.nodes) {
      if (node === targetNode || node.type === NodeType.HAZARD) continue;
      const distance = computeDistance(targetNode.x, targetNode.y, node.x, node.y);
      const weight = Math.max(0, 1 - distance / AI_RULES.RELAY_CONTEXT_RADIUS_PX);
      if (weight <= 0) continue;

      /* Central relays are stronger because they can touch more nearby routes with
         shorter, cheaper follow-up links. */
      centrality += weight;

      if (node.owner === this.owner && !node.isRelay) friendlyRouteValue += weight;
      else if (node.owner === 1 && !node.isRelay) playerRouteValue += weight;
      else if (node.owner === 0 && !node.isRelay) neutralRouteValue += weight;
    }

    let playerRelayLinks = 0;
    let enemyPressure = 0;
    for (const tentacle of game.tents) {
      if (!tentacle.alive || (tentacle.state !== TentState.ACTIVE && tentacle.state !== TentState.ADVANCING)) continue;
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

  _scoreRelayTarget(sourceNode, targetNode, proximityScore, isDefensive, personality, totalBuildCost) {
    const relayContext = this._buildRelayContext(targetNode);
    const playerContestProgress = targetNode.contest?.[1] || 0;
    const ownContestProgress = targetNode.contest?.[this.owner] || 0;
    const captureRequirement = Math.max(targetNode.captureThreshold || 20, targetNode.energy || 0);
    const remainingEnergyAfterBuild = sourceNode.energy - totalBuildCost;

    /* Relay scoring terms:
       - centrality: nearby node density means the relay can shape more routes
       - route value: friendly + neutral neighbors make the relay a launch point
       - player influence: stealing or contesting player relay space is worth extra
       - losing risk: avoid low-budget grabs into strong player coverage */
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
    } else if (areAlliedOwners(targetNode.owner, this.owner)) {
      score = 12 + proximityScore + personality.siegeBonus + relayContext.playerRouteValue * 4;
      if (targetNode.owner !== this.owner) score += 10;
      if (targetNode.energy < captureRequirement * 0.4) score += 10;
    }

    const losingRisk =
      relayContext.playerRouteValue * 10 +
      relayContext.enemyPressure * 14 +
      Math.max(0, captureRequirement - remainingEnergyAfterBuild) * 0.55 -
      relayContext.friendlyRouteValue * 6;

    score -= losingRisk;

    if (remainingEnergyAfterBuild < captureRequirement * 0.45) score -= 24;
    if (isDefensive) score *= targetNode.owner === this.owner ? 1.0 : personality.defensiveDampener;

    return score;
  }

  _buildMoveScore(sourceNode, targetNode, proximityScore, isDefensive, personality, totalBuildCost) {
    if (targetNode.isRelay) {
      return this._scoreRelayTarget(sourceNode, targetNode, proximityScore, isDefensive, personality, totalBuildCost);
    }

    if (targetNode.owner === 0) {
      const playerContestProgress = targetNode.contest?.[1] || 0;
      const alliedContestProgress = getContestCaptureScore(targetNode, this.owner);
      let score =
        72 +
        proximityScore +
        personality.expansionBonus +
        alliedContestProgress * 0.35 -
        targetNode.energy * 0.2 -
        playerContestProgress * 1.8;
      if (isDefensive) score *= personality.defensiveDampener;
      return score;
    }

    if (targetNode.owner === 1) {
      const energyAdvantage = sourceNode.energy - targetNode.energy;
      const existingPressureBonus = this.game.tents.some(tentacle =>
        tentacle.alive && tentacle.source.owner === this.owner && tentacle.target === targetNode
      ) ? 18 : 0;
      let score = (isDefensive ? 20 : 55) + energyAdvantage * 0.5 + proximityScore + existingPressureBonus + personality.attackBonus;

      if (this.owner === 3) {
        /* Purple AI should feel more like a kill-confirm faction than red AI:
           prioritize already-weakened player nodes, existing pressure lanes,
           and heavily contested player positions over passive macro play. */
        if (targetNode.energy < targetNode.maxE * 0.35) score += 18;
        if (targetNode.underAttack > 0.2) score += 10;
        if (existingPressureBonus > 0) score += 12;
      }

      return score;
    }

    if (areAlliedOwners(targetNode.owner, this.owner)) {
      const alliedSupportBonus = targetNode.owner !== this.owner ? 10 : 0;
      if (targetNode.energy < targetNode.maxE * 0.5) return 22 + proximityScore + personality.siegeBonus + alliedSupportBonus;
      if (isDefensive && targetNode.energy < targetNode.maxE * 0.4) return 55 + proximityScore + alliedSupportBonus;
      if (targetNode.owner !== this.owner && targetNode.energy < targetNode.maxE * 0.75) {
        return 16 + proximityScore + alliedSupportBonus;
      }
    }

    return 0;
  }

  _createTentacleMove(sourceNode, targetNode, buildCost) {
    const tentacle = new Tent(sourceNode, targetNode, buildCost);
    tentacle.game = this.game;

    /* Keep slot accounting consistent with the player path until the next
       Physics.updateOutCounts() recomputes the frame-wide totals. */
    sourceNode.outCount = (sourceNode.outCount || 0) + 1;

    const opposingTentacle = this.game.tents.find(existingTentacle =>
      existingTentacle.alive &&
      existingTentacle.state === TentState.ACTIVE &&
      existingTentacle.effectiveSourceNode === targetNode &&
      existingTentacle.effectiveTargetNode === sourceNode
    );
    if (opposingTentacle && areHostileOwners(opposingTentacle.effectiveSourceNode.owner, sourceNode.owner)) {
      tentacle.activateImmediate();
    }

    this.game.tents.push(tentacle);
  }

  _canUseSourceNode(sourceNode, energyThreshold) {
    if (sourceNode.owner !== this.owner) return false;
    if (sourceNode.outCount >= PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL[sourceNode.level]) return false;

    if (!sourceNode.isRelay) {
      return sourceNode.energy > energyThreshold;
    }

    const relayHasUsableBudget =
      (sourceNode.relayFeedBudget || 0) > 0 ||
      (sourceNode.tentFeedPerSec || 0) > 0;

    return relayHasUsableBudget && sourceNode.energy > Math.max(8, energyThreshold * 0.35);
  }

  _scoreRelayOriginAdjustment(sourceNode, distance, totalBuildCost) {
    if (!sourceNode.isRelay) return 0;

    const remainingRelayEnergy = sourceNode.energy - totalBuildCost;
    let adjustment = 0;

    /* Relay launches should prefer short tactical follow-ups backed by real
       buffered energy instead of turning every captured relay into long-range spam. */
    if (distance > AI_RULES.RELAY_CONTEXT_RADIUS_PX * 0.45) adjustment -= 12;
    if (distance > AI_RULES.RELAY_CONTEXT_RADIUS_PX * 0.7) adjustment -= 18;
    if (remainingRelayEnergy < totalBuildCost * 0.35) adjustment -= 16;

    return adjustment;
  }

  _think() {
    const game = this.game;
    const distanceCostMultiplier = this.cfg.distanceCostMultiplier;
    const isDefensive = game.aiDefensive > 0;
    const personality = personalityFor(this.cfg.id || 0, this.owner);
    const energyThreshold = isDefensive ? AI_RULES.DEFENSIVE_ENERGY_THRESHOLD : personality.energyThreshold;

    /* Eligible sources: AI-owned nodes with usable energy and free slots.
       Owned relays are allowed when they actually hold buffered pass-through budget. */
    const sourceNodes = game.nodes.filter(node =>
      this._canUseSourceNode(node, energyThreshold)
    );
    if (!sourceNodes.length) return;

    const moves = [];

    sourceNodes.forEach(sourceNode => {
      game.nodes.forEach(targetNode => {
        if (targetNode === sourceNode || targetNode.type === NodeType.HAZARD) return;
        /* Skip if link already exists */
        if (game.tents.some(tentacle => tentacle.alive && !tentacle.reversed && tentacle.source === sourceNode && tentacle.target === targetNode)) return;
        /* Recheck slot */
        if (sourceNode.outCount >= PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL[sourceNode.level]) return;

        const distance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
        const totalBuildCost = computeBuildCost(distance) + distance * distanceCostMultiplier;
        if (sourceNode.energy < totalBuildCost + 1) return;

        const proximityScore = 300 / (distance + 60);
        let score = this._buildMoveScore(
          sourceNode,
          targetNode,
          proximityScore,
          isDefensive,
          personality,
          totalBuildCost,
        );

        score += this._scoreRelayOriginAdjustment(sourceNode, distance, totalBuildCost);

        if (score > 0) moves.push({ sourceNode, targetNode, score, buildCost: totalBuildCost });
      });
    });

    /* Pick top 2 non-conflicting moves */
    moves.sort((leftMove, rightMove) => rightMove.score - leftMove.score);
    const usedSourceIds = new Set();
    let picked = 0;

    for (const move of moves) {
      if (picked >= 2) break;
      if (usedSourceIds.has(move.sourceNode.id)) continue;
      usedSourceIds.add(move.sourceNode.id);
      this._createTentacleMove(move.sourceNode, move.targetNode, move.buildCost);
      picked++;
    }
  }

  /**
   * Purple AI (owner 3) strategic cut mechanic.
   *
   * For each active purple tentacle targeting a player node, check whether
   * the energy stored in the pipe is large enough to justify a decisive
   * source-side burst cut. The actual damage / capture outcome is not
   * computed here: it must go through the canonical tent slice path.
   *
   * Trigger condition: pipe holds ≥ 65% of target's current energy.
   * This prevents wasteful cuts; the purple AI only cuts when it's worth it.
   */
  _checkStrategicCuts(game) {
    const strategicCutRatio = AI_RULES.STRATEGIC_CUT_RATIO;

    game.tents.forEach(tentacle => {
      if (!tentacle.alive || tentacle.state !== TentState.ACTIVE) return;

      const sourceNode = tentacle.effectiveSourceNode;
      const targetNode = tentacle.effectiveTargetNode;
      if (sourceNode.owner !== 3 || targetNode.owner !== 1) return;

      /* Only cut when the pipe is charged enough to be decisive */
      const pipeEnergy = tentacle.energyInPipe || 0;
      if (pipeEnergy < targetNode.energy * AI_RULES.STRATEGIC_CUT_PIPE_TARGET_RATIO) return;

      /* Canonical slice/burst entry point: reuse the same path as player cuts
         so burst timing, clash handling, capture, and balance stay unified. */
      tentacle.applySliceCut(strategicCutRatio);
    });
  }
}
