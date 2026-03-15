/* ================================================================
   TentacleWars AI

   Owns the first TentacleWars-specific enemy behavior layer. It is
   intentionally separate from the stable NodeWARS AI and tuned for
   packet pressure, overflow-ready sources, support triangles, and
   purple slice denial in the sandbox prototype.
   ================================================================ */

import { NodeType, TentState } from '../config/gameConfig.js';
import { Tent } from '../entities/Tent.js';
import { canCreateTentacleConnection } from '../input/TentacleCommands.js';
import { computeDistance } from '../math/simulationMath.js';
import { areHostileOwners } from '../systems/OwnerTeams.js';
import { TW_BALANCE } from './TwBalance.js';
import { computeTentacleWarsBuildCost } from './TwTentacleEconomy.js';
import {
  buildTentacleWarsMoveScore,
  scoreTentacleWarsSliceOpportunity,
} from './TwAIScoring.js';

export class TwAI {
  /*
   * Keep the interface aligned with the existing AI class so Game can swap
   * implementations at mode-load time without branching the full update loop.
   */
  constructor(game, cfg, owner = 2) {
    this.game = game;
    this.cfg = cfg;
    this.owner = owner;
    this._timer = 0;
    this._interval = cfg.aiThinkIntervalSeconds || TW_BALANCE.AI_THINK_INTERVAL_SEC;
    this._sliceCooldown = 0;
  }

  /*
   * The sandbox AI keeps a small think loop plus a frame-driven purple slice
   * check so denial pressure can appear between normal build decisions.
   */
  update(dt) {
    this._timer += dt;
    this._sliceCooldown = Math.max(0, this._sliceCooldown - dt);

    if (this.owner === 3 && TW_BALANCE.AI_PURPLE_ENABLES_SLICE) {
      this._checkPurpleSlicePressure();
    }

    if (this._timer < this._interval) return;
    this._timer = 0;
    this._think();
  }

  /* Only sources with free slots and usable energy are allowed to launch. */
  _canUseSourceNode(sourceNode) {
    return sourceNode.owner === this.owner &&
      (sourceNode.outCount || 0) < sourceNode.maxSlots &&
      sourceNode.energy >= TW_BALANCE.AI_ENERGY_THRESHOLD;
  }

  /*
   * The sandbox still uses the live Tent entity, so immediate hostile clashes
   * can be reused as-is while the rest of the mode-specific simulation grows.
   */
  _createTentacleMove(sourceNode, targetNode, buildCost) {
    if (!canCreateTentacleConnection(sourceNode, targetNode, this.game.twObstacles)) return;

    const tentacle = new Tent(sourceNode, targetNode, buildCost);
    tentacle.game = this.game;
    sourceNode.outCount = (sourceNode.outCount || 0) + 1;

    const opposingTentacle = this.game.tents.find(existingTentacle =>
      existingTentacle.alive &&
      existingTentacle.state === TentState.ACTIVE &&
      existingTentacle.effectiveSourceNode === targetNode &&
      existingTentacle.effectiveTargetNode === sourceNode &&
      areHostileOwners(existingTentacle.effectiveSourceNode.owner, sourceNode.owner)
    );

    if (opposingTentacle) {
      tentacle.activateImmediate();
    }

    this.game.tents.push(tentacle);
  }

  /* Phase 1 keeps move generation simple and lets scoring carry the behavior. */
  _think() {
    const sourceNodes = this.game.nodes.filter(sourceNode => this._canUseSourceNode(sourceNode));
    if (!sourceNodes.length) return;

    const candidateMoves = [];
    sourceNodes.forEach(sourceNode => {
      this.game.nodes.forEach(targetNode => {
        if (targetNode === sourceNode || targetNode.type === NodeType.HAZARD) return;
        if (sourceNode.owner === targetNode.owner) {
          if (targetNode.underAttack <= 0) return;
        }

        const directLaneExists = this.game.tents.some(tentacle =>
          tentacle.alive &&
          !tentacle.reversed &&
          tentacle.source === sourceNode &&
          tentacle.target === targetNode
        );
        if (directLaneExists) return;
        if (!canCreateTentacleConnection(sourceNode, targetNode, this.game.twObstacles)) return;

        const distance = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
        const buildCost = computeTentacleWarsBuildCost(distance, undefined, sourceNode?.twCostNormalizer);
        if (sourceNode.energy < buildCost + 1) return;

        const score = buildTentacleWarsMoveScore({
          game: this.game,
          owner: this.owner,
          sourceNode,
          targetNode,
          totalBuildCost: buildCost,
        });

        if (score <= 0) return;
        candidateMoves.push({ sourceNode, targetNode, score, buildCost });
      });
    });

    candidateMoves.sort((leftMove, rightMove) => rightMove.score - leftMove.score);
    if (TW_BALANCE.AI_DEBUG_SCORING) {
      const label = `[TwAI:${this.owner === 3 ? 'Purple' : 'Red'}]`;
      console.debug(`${label} think() — sources:${sourceNodes.length} candidates:${candidateMoves.length}`);
      for (const move of candidateMoves) {
        console.debug(`  [move] node${move.sourceNode.id} → node${move.targetNode.id}  score=${move.score.toFixed(2)}`);
      }
    }

    const usedSourceIds = new Set();
    let movesPicked = 0;

    for (const move of candidateMoves) {
      if (movesPicked >= TW_BALANCE.AI_MAX_MOVES_PER_THINK) break;
      if (usedSourceIds.has(move.sourceNode.id)) continue;
      usedSourceIds.add(move.sourceNode.id);
      this._createTentacleMove(move.sourceNode, move.targetNode, move.buildCost);
      if (TW_BALANCE.AI_DEBUG_SCORING) {
        const label = `[TwAI:${this.owner === 3 ? 'Purple' : 'Red'}]`;
        console.debug(`  ✓ selected: node${move.sourceNode.id} → node${move.targetNode.id}`);
      }
      movesPicked += 1;
    }
  }

  /*
   * Purple uses the canonical slice path when a hostile lane is charged enough
   * to convert pipe energy into a disruptive burst tempo spike.
   */
  _checkPurpleSlicePressure() {
    if (this._sliceCooldown > 0) return;

    const sliceCandidates = [];
    this.game.tents.forEach(tentacle => {
      if (!tentacle.alive) return;
      if (tentacle.state !== TentState.ACTIVE && tentacle.state !== TentState.ADVANCING) return;
      if (tentacle.effectiveSourceNode.owner !== this.owner) return;
      if (!areHostileOwners(this.owner, tentacle.effectiveTargetNode.owner)) return;

      const pipeRatio = (tentacle.energyInPipe || 0) / Math.max(1, tentacle.effectiveTargetNode.energy);
      if (pipeRatio < TW_BALANCE.AI_PURPLE_SLICE_PIPE_TARGET_RATIO) return;

      const score = scoreTentacleWarsSliceOpportunity({ tentacle, owner: this.owner });
      if (score >= TW_BALANCE.AI_PURPLE_SLICE_SCORE_THRESHOLD) {
        sliceCandidates.push({ tentacle, score });
      }
    });

    if (!sliceCandidates.length) return;
    sliceCandidates.sort((leftCandidate, rightCandidate) => rightCandidate.score - leftCandidate.score);

    sliceCandidates[0].tentacle.applySliceCut(0.15);
    if (TW_BALANCE.AI_DEBUG_SCORING) {
      const best = sliceCandidates[0];
      console.debug(
        `[TwAI:Purple] slice applied — src:node${best.tentacle.effectiveSourceNode?.id} → tgt:node${best.tentacle.effectiveTargetNode?.id}  score=${best.score.toFixed(2)}`
      );
    }
    this._sliceCooldown = TW_BALANCE.AI_PURPLE_SLICE_COOLDOWN_SEC;
  }
}
