/* ================================================================
   NODE WARS v3 — AI System

   Key improvement: personality is now a strategy object instead of
   inline conditionals. Scoring weights are named constants.
   ================================================================ */

import { GAMEPLAY_RULES, NodeType, TentState } from '../config/gameConfig.js';
import { computeBuildCost, computeDistance } from '../math/simulationMath.js';
import { Tent } from '../entities/Tent.js';
import { areAlliedOwners, areHostileOwners } from './OwnerTeams.js';
import {
  buildAiTacticalState,
  buildMoveScore,
  scoreRelayOriginAdjustment,
  scoreSliceOpportunity,
} from './AIScoring.js';

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
    this._sliceCooldown = 0;
    this._tacticalState = 'pressure';
  }

  update(dt) {
    this._timer += dt;
    this._sliceCooldown = Math.max(0, this._sliceCooldown - dt);
    this._tacticalState = buildAiTacticalState(this.game, this.owner, AI_RULES);

    /* Slice pressure is checked independently from build-think pacing so the
       coalition can convert charged lanes into tempo spikes mid-fight. */
    this._checkStrategicCuts(this.game);

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

  _think() {
    const game = this.game;
    const distanceCostMultiplier = this.cfg.distanceCostMultiplier;
    const isDefensive = game.aiDefensive > 0;
    const personality = personalityFor(this.cfg.id || 0, this.owner);
    const energyThreshold = isDefensive ? AI_RULES.DEFENSIVE_ENERGY_THRESHOLD : personality.energyThreshold;
    const tacticalState = this._tacticalState;

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
        let score = buildMoveScore({
          game,
          owner: this.owner,
          sourceNode,
          targetNode,
          proximityScore,
          isDefensive,
          personality,
          totalBuildCost,
          aiRules: AI_RULES,
          tentState: TentState,
          tacticalState,
        });

        score += scoreRelayOriginAdjustment(sourceNode, distance, totalBuildCost, AI_RULES);

        if (score > 0) moves.push({ sourceNode, targetNode, score, buildCost: totalBuildCost });
      });
    });

    /* Pick top 2 non-conflicting moves */
    moves.sort((leftMove, rightMove) => rightMove.score - leftMove.score);
    const usedSourceIds = new Set();
    const targetPickCounts = new Map();
    let picked = 0;

    for (const move of moves) {
      if (picked >= 2) break;
      if (usedSourceIds.has(move.sourceNode.id)) continue;
      const targetPickCount = targetPickCounts.get(move.targetNode.id) || 0;
      const canDoubleFocusPlayer =
        move.targetNode.owner === 1 &&
        move.score >= AI_RULES.ALLOW_MULTI_SOURCE_PLAYER_FOCUS_THRESHOLD;
      if (targetPickCount > 0 && !canDoubleFocusPlayer) continue;
      usedSourceIds.add(move.sourceNode.id);
      targetPickCounts.set(move.targetNode.id, targetPickCount + 1);
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
    if (this._sliceCooldown > 0) return;

    const strategicCutRatio = AI_RULES.STRATEGIC_CUT_RATIO;
    const sliceScoreThreshold = this.owner === 3
      ? AI_RULES.PURPLE_SLICE_SCORE_THRESHOLD
      : AI_RULES.RED_SLICE_SCORE_THRESHOLD;

    const sliceCandidates = [];
    game.tents.forEach(tentacle => {
      if (!tentacle.alive) return;
      if (tentacle.state !== TentState.ACTIVE && tentacle.state !== TentState.ADVANCING) return;

      const sourceNode = tentacle.effectiveSourceNode;
      const targetNode = tentacle.effectiveTargetNode;
      if (sourceNode.owner !== this.owner || targetNode.owner !== 1) return;

      const pipeEnergy = tentacle.energyInPipe || 0;
      if (pipeEnergy < targetNode.energy * AI_RULES.STRATEGIC_CUT_PIPE_TARGET_RATIO) return;

      const score = scoreSliceOpportunity({
        game,
        owner: this.owner,
        tentacle,
        tacticalState: this._tacticalState,
        aiRules: AI_RULES,
      });

      if (score >= sliceScoreThreshold) {
        sliceCandidates.push({ tentacle, score });
      }
    });

    if (!sliceCandidates.length) return;
    sliceCandidates.sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score);
    sliceCandidates[0].tentacle.applySliceCut(strategicCutRatio);
    this._sliceCooldown = this.owner === 3
      ? AI_RULES.PURPLE_SLICE_COOLDOWN_SEC
      : AI_RULES.RED_SLICE_COOLDOWN_SEC;
  }
}
