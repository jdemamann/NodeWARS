/* ================================================================
   NODE WARS v3 — Tent (Tentacle)

   Responsibilities: data model + physics update.
   Rendering is handled by TentRenderer.
   Orb spawning is delegated to OrbPool via the shouldSpawnOrb helper.
   ================================================================ */

import { TentState, GROW_PPS, ADV_PPS, EMBRYO, TIER_REGEN, GAME_BALANCE, CUT_RULES } from '../config/gameConfig.js';
import { computeTentacleClashFeedRate, computeTentacleSourceFeedRate } from '../systems/EnergyBudget.js';
import { applyOwnershipChange } from '../systems/Ownership.js';
import {
  computeDistance,
  computeBuildCost,
  computeTravelDuration,
  clamp,
} from '../math/simulationMath.js';
import { bus } from '../core/EventBus.js';
import { classifyTentacleCut, resolveGrowingTentacleCollision } from './TentRules.js';
import {
  applyTentaclePayloadToTarget,
  applyTentacleFriendlyFlow,
  applyTentacleNeutralCaptureFlow,
  applyTentacleEnemyAttackFlow,
  computeTentacleClashForces,
} from './TentCombat.js';

export class Tent {
  constructor(sourceNode, targetNode, buildCost) {
    this.source = sourceNode;
    this.target = targetNode;
    this.distanceValue = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);

    /* Derived physics constants (computed once at creation) */
    this.buildCost = buildCost ?? computeBuildCost(this.distanceValue);
    this.rate      = 5.5;            // kept for Orb spawning; no longer distance-based
    this.eff       = 1.0;            // heat loss removed; kept for renderer t.eff check
    this.travelDurationValue = computeTravelDuration(this.distanceValue);
    this.pipeCapacityValue   = 300;  // pipe buffer cap
    this.maxBandwidth = (TIER_REGEN[sourceNode.level] ?? TIER_REGEN[0]) * GAME_BALANCE.TENTACLE_BANDWIDTH_TOLERANCE;

    /* State machine */
    this.state    = TentState.GROWING;
    this.reachT   = 0;        // 0→1: how far tip has grown
    this.reversed = false;    // true = flow direction inverted

    /* Clash state */
    this.clashT       = null;
    this.clashVisualT = null;
    this.clashApproachActive = false;
    this.clashPartner = null;
    this.clashSpark   = 0;

    /* Pipe model */
    this.paidCost     = 0;
    this.energyInPipe = 0;
    this.pipeAge      = 0;
    this.startT       = 0;           // tail position for BURSTING state (0 = source end)
    this._burstPayload = 0;          // energy payload carried by a kamikaze burst

    /* Visual */
    this.flowRate    = 0;
    this.cutPoint    = undefined;
    this.cutFlash    = 0;
    this.age         = 0;
    this._orbTimer   = 0;

    /* Scoring */
    this.playerRetract = false;

    /* Back-reference to game (set externally after construction) */
    this.game = null;

    /* Control-point cache for bezier rendering, keyed by game frame. */
    this._controlPointCacheFrame = -1;
    this._controlPointCacheValue = null;

    /* Owner tracking for virgin-→-enemy race condition */
    this._previousTargetOwner = targetNode.owner;
  }

  /* ── Computed properties ── */
  get alive()   { return this.state !== TentState.DEAD; }
  get removed() { return this.state === TentState.DEAD; }

  /** Descriptive alias for the currently active source after reversals. */
  get effectiveSourceNode() { return this.reversed ? this.target : this.source; }
  /** Descriptive alias for the currently active target after reversals. */
  get effectiveTargetNode() { return this.reversed ? this.source : this.target; }
  /** Descriptive alias for the tentacle travel duration. */
  get travelDuration() { return this.travelDurationValue; }
  /** Descriptive alias for the tentacle distance. */
  get distance() { return this.distanceValue; }
  /** Descriptive alias for the pipe buffer capacity. */
  get pipeCapacity() { return this.pipeCapacityValue; }

  /**
   * Canonical slice/burst entry point.
   *
   * All gameplay-triggered cuts that should respect the standard refund /
   * retract / burst rules must route through this helper so player slicing
   * and purple AI strategic cuts stay mechanically identical.
   */
  applySliceCut(cutRatio) {
    this.cutPoint = cutRatio;
    this.cutFlash = 0.6;
    this.kill(cutRatio);
  }

  _clearEconomicPayload() {
    this.paidCost = 0;
    this.energyInPipe = 0;
    this._burstPayload = 0;
  }

  _clearPipeState() {
    this.energyInPipe = 0;
    this.pipeAge = 0;
  }

  _refundToSourceNode(sourceNode, amount) {
    /* Retract / refund rules must restore the full invested payload.
       Do not clamp here, or partially-built tentacles can silently lose
       refunded energy when the source is already near its nominal cap. */
    sourceNode.energy += amount;
  }

  _applyNeutralContestContribution(targetNode, owner, amount) {
    if (!targetNode.contest) targetNode.contest = {};
    if (!targetNode.contest[owner]) targetNode.contest[owner] = 0;
    targetNode.contest[owner] += amount;
  }

  _cancelRivalContestProgress(targetNode, attackingOwner, cancelAmount) {
    if (!targetNode.contest) return;

    const rivalEntries = Object.keys(targetNode.contest)
      .map(Number)
      .filter(owner => owner !== attackingOwner && (targetNode.contest[owner] || 0) > 0)
      .map(owner => ({ owner, score: targetNode.contest[owner] || 0 }));

    if (!rivalEntries.length || cancelAmount <= 0) return;

    const totalRivalScore = rivalEntries.reduce((sum, rivalEntry) => sum + rivalEntry.score, 0);
    if (totalRivalScore <= 0) return;

    for (const rivalEntry of rivalEntries) {
      const rivalShare = cancelAmount * (rivalEntry.score / totalRivalScore);
      targetNode.contest[rivalEntry.owner] = Math.max(0, rivalEntry.score - rivalShare);
    }
  }

  _captureNeutralTarget(targetNode, newOwner, captureProgress) {
    const bonusEnergy = captureProgress - EMBRYO;
    applyOwnershipChange({
      game: this.game,
      node: targetNode,
      newOwner,
      startingEnergy: Math.min(targetNode.maxE, targetNode.energy + bonusEnergy * 0.5),
      previousOwner: targetNode.owner,
      wasNeutralCapture: true,
    });
  }

  _defeatEnemyTarget(targetNode, attackerOwner) {
    const overflowEnergy = Math.abs(targetNode.energy) * 0.10;
    applyOwnershipChange({
      game: this.game,
      node: targetNode,
      newOwner: attackerOwner,
      startingEnergy: overflowEnergy,
      previousOwner: targetNode.owner,
      attackerOwner,
    });
  }

  _applyPayloadToTarget(targetNode, sourceNode, payloadAmount, {
    contestFlash = 0,
    burstPulse = 0,
    damageMultiplier = 1,
  } = {}) {
    applyTentaclePayloadToTarget({
      tentacle: this,
      targetNode,
      sourceNode,
      payloadAmount,
      contestFlash,
      burstPulse,
      damageMultiplier,
    });
  }

  _applyImmediateTargetEffect(targetNode, sourceNode, payloadAmount) {
    this._applyPayloadToTarget(targetNode, sourceNode, payloadAmount, {
      contestFlash: 0.6,
      damageMultiplier: 1,
    });
  }

  _getRelayFlowMultiplier(sourceNode) {
    return (sourceNode.isRelay && sourceNode.owner !== 0 && !sourceNode.inFog)
      ? GAME_BALANCE.RELAY_FLOW_MULT
      : 1.0;
  }

  _applyFriendlyFlow(targetNode, feedRate, relayFlowMultiplier, dt) {
    return applyTentacleFriendlyFlow(targetNode, feedRate, relayFlowMultiplier, dt);
  }

  _applyNeutralCaptureFlow(targetNode, sourceNode, feedRate, relayFlowMultiplier, dt) {
    return applyTentacleNeutralCaptureFlow(this, targetNode, sourceNode, feedRate, relayFlowMultiplier, dt);
  }

  _applyEnemyAttackFlow(targetNode, sourceNode, feedRate, relayFlowMultiplier, dt) {
    return applyTentacleEnemyAttackFlow(this, targetNode, sourceNode, feedRate, relayFlowMultiplier, dt);
  }

  /* ── Kill / retract ── */

  _resolveClashPartnerOnCut(isBurstStyleCut) {
    if (!this.clashPartner) return;

    const opposingTentacle = this.clashPartner;
    this.clashPartner = null;
    this.clashVisualT = null;
    this.clashApproachActive = false;
    opposingTentacle.clashPartner = null;
    opposingTentacle.clashVisualT = null;
    opposingTentacle.clashApproachActive = false;

    if (isBurstStyleCut) {
      opposingTentacle.kill();
      return;
    }

    if (opposingTentacle.alive) {
      opposingTentacle.state = TentState.ADVANCING;
      opposingTentacle.reachT = 1 - (this.clashT ?? this.reachT);
      opposingTentacle.clashT = null;
    }
  }

  /**
   * kill(cutRatio)
   *
   * cutRatio = normalised position along the effective source→target axis where the cut landed.
   *   undefined / no param  → normal programmatic kill (retract, refund to source)
   *   < 0.3  (near source)  → kamikaze burst: payload rushes to target as a BURSTING wave
   *   > 0.7  (near target)  → defensive refund: payload returned to source immediately
   *   0.3–0.7 (middle)      → split cut: source share refunds, target share lands immediately
   *
   * Clash partner is handled before state changes:
   *   kamikaze → partner is also killed (defence destroyed)
   *   refund / retract / split → partner advances uncontested
   */
  kill(cutRatio) {
    if (this.state === TentState.DEAD      ||
        this.state === TentState.RETRACTING ||
        this.state === TentState.BURSTING) return;

    this.clashT = null;
    this.clashVisualT = null;
    this.clashApproachActive = false;

    /* Calculate total energy in the pipe (Paid build cost + Energy in transit) */
    const payload = this.paidCost + (this.energyInPipe || 0);

    /* Cut zones (0.0 = source, 1.0 = target) */
    const { isKamikaze, isRefund, isMiddle } = classifyTentacleCut(cutRatio, CUT_RULES);
    const isProgrammaticRetract = cutRatio === undefined;

    /* Resolve tug-of-war (Clash) before changing state.
       Only a near-source burst destroys the opposing tentacle outright.
       Refunds, retracts, and middle cuts should release the clash front. */
    this._resolveClashPartnerOnCut(isKamikaze);

    this._clearPipeState();

    if (isKamikaze) {
      /* 100% of the payload flies to the target */
      this.state         = TentState.BURSTING;
      this.startT        = cutRatio;
      this._burstPayload = payload;
      this.paidCost = 0;
      this.energyInPipe = 0;

    } else if (isProgrammaticRetract) {
      /* Retracting a tentacle returns the invested payload to the source node. */
      const sourceNode = this.effectiveSourceNode;
      this._refundToSourceNode(sourceNode, payload);
      this._clearEconomicPayload();
      this.state = TentState.RETRACTING;

    } else if (isRefund) {
      /* 100% of the payload snaps back to the source */
      this.state  = TentState.RETRACTING;
      if (cutRatio !== undefined) {
        this.reachT = cutRatio;
      }
      const sourceNode = this.effectiveSourceNode;
      this._refundToSourceNode(sourceNode, payload);
      this._clearEconomicPayload();

    } else if (isMiddle) {
      /* PROPORTIONAL ENERGY SPLIT */
      const srcShare = payload * cutRatio;
      const tgtShare = payload * (1 - cutRatio);
      
      const sourceNode = this.effectiveSourceNode;
      const targetNode = this.effectiveTargetNode;

      /* 1. Source gets its share back immediately */
      this._refundToSourceNode(sourceNode, srcShare);

      /* 2. Target receives its share instantly (as damage or healing/capture) */
      this._applyImmediateTargetEffect(targetNode, sourceNode, tgtShare);

      /* Track wasted player tents for final score (if it's the player) */
      if (this.playerRetract && this.state === TentState.ACTIVE &&
          this.source?.owner === 1 && this.target?.owner !== 1) {
        if (this.game) this.game.wastedTents = (this.game.wastedTents || 0) + 1;
      }

      /* Visually retract the remaining tentacle from the cut point */
      this.state  = TentState.RETRACTING;
      this.reachT = cutRatio;
      this._clearEconomicPayload();
    }
  }

  killBoth() {
    const partner = this.clashPartner;
    this.kill();
    if (partner?.alive) partner.kill();
  }

  /**
   * Skip the GROWING phase — used when a counter-attack tentacle is created
   * against an already-active opposing tentacle (instant "tug of war" start).
   */
  activateImmediate() {
    /* Instant clash skips only the visible growth phase.
       The economic commitment stays identical to a normal tentacle build so
       preview, validation, AI scoring, and actual debit all use one rule. */
    if (this.buildCost > 0 && this.source) {
      this.source.energy = Math.max(0, this.source.energy - this.buildCost);
    }
    this.paidCost = this.buildCost;
    this.state    = TentState.ACTIVE;
    this.reachT   = 1;
    this.pipeAge  = this.travelDuration; // pipe immediately full for instant counter-attacks
    bus.emit('tent:connect', this);
  }

  initializeFreshClashVisual(sharedVisualFront) {
    /* ACTIVE↔ACTIVE clashes should not pop into the midpoint.
       Start from the incumbent side and linearly push the visible and logical
       clash front to the exact lane midpoint before normal tug-of-war begins. */
    this.clashT = sharedVisualFront;
    this.clashVisualT = sharedVisualFront;
    this.clashApproachActive = true;
    this.clashSpark = Math.max(this.clashSpark || 0, 0.55);
  }

  /* ── Bezier control point (animated wave) — cached per game frame ── */
  getControlPoint() {
    const frame = this.game?._frame ?? -1;
    if (this._controlPointCacheFrame === frame) return this._controlPointCacheValue;

    const sourceNode = this.source;
    const targetNode = this.target;
    const midpointX = (sourceNode.x + targetNode.x) * 0.5;
    const midpointY = (sourceNode.y + targetNode.y) * 0.5;

    /* When clashing, both opposing tentacles (A→B and B→A) must share the same
       control point so their bezier paths are geometrically identical.
       Fix: always derive dx/dy from lower-id node → higher-id node, and seed
       the phase with the lower id. This guarantees B(1-u) = B'(u). */
    const lowerIdNode = sourceNode.id < targetNode.id ? sourceNode : targetNode;
    const higherIdNode = sourceNode.id < targetNode.id ? targetNode : sourceNode;
    const deltaX = higherIdNode.x - lowerIdNode.x;
    const deltaY = higherIdNode.y - lowerIdNode.y;
    const segmentLength = Math.hypot(deltaX, deltaY) || 1;
    const simulationTime = this.game?.time || 0;
    const waveOffset = Math.sin(simulationTime * 1.9 + lowerIdNode.id * 1.9) * segmentLength * 0.12;
    this._controlPointCacheValue = {
      x: midpointX + (-deltaY / segmentLength) * waveOffset,
      y: midpointY + (deltaX / segmentLength) * waveOffset,
    };
    this._controlPointCacheFrame = frame;
    return this._controlPointCacheValue;
  }

  getCP() {
    return this.getControlPoint();
  }

  /* ── Main update ── */
  update(dt) {
    if (this.state === TentState.DEAD) return;
    this.age += dt;
    if (this.cutFlash > 0) this.cutFlash = Math.max(0, this.cutFlash - dt * 3);

    if (this.state === TentState.GROWING)    { this._updateGrowingState(dt);    return; }
    if (this.state === TentState.RETRACTING) { this._updateRetractingState(dt); return; }
    if (this.state === TentState.ADVANCING)  { this._updateAdvancingState(dt);  return; }
    if (this.state === TentState.BURSTING)   { this._updateBurstingState(dt);   return; }

    this._updateActiveState(dt);
  }

  _updateActiveState(dt) {
    const sourceNode = this.effectiveSourceNode;

    if (sourceNode.owner === 0) { this.kill(); return; }
    /* Only kill for low energy when not in a clash — clashT resolves depletion naturally */
    if (!this.clashPartner && sourceNode.energy < 0.25) { this.kill(); return; }

    /* Race condition: virgin captured by AI while tentacle was growing toward it */
    const effectiveTarget = this.effectiveTargetNode;
    if (effectiveTarget.owner !== 0 && effectiveTarget.owner !== sourceNode.owner && this._previousTargetOwner === 0) {
      this.state = TentState.RETRACTING;
      this._previousTargetOwner = effectiveTarget.owner;
      return;
    }
    this._previousTargetOwner = effectiveTarget.owner;

    if (this.clashPartner?.alive && this.clashPartner.state !== TentState.RETRACTING) {
      this._updateClashState(dt);
    } else if (this.clashT !== null) {
      this.clashT = null; this.clashVisualT = null; this.clashApproachActive = false; this.clashPartner = null;
      this.state = TentState.ADVANCING;
    } else {
      this.clashT = null; this.clashVisualT = null; this.clashApproachActive = false; this.clashPartner = null;
      this._updateActiveFlowState(dt);
    }
  }

  /* ── Growing ── */
  _updateGrowingState(dt) {
    /* Mid-air growth collision is isolated in a helper so the growth state stays
       focused on build-cost charging and state progression. */
    if (this.game && resolveGrowingTentacleCollision(this, this.game.tents)) return;

    const previousReach = this.reachT;
    const intendedReach = Math.min(1, this.reachT + (GROW_PPS / this.distance) * dt);
    const intendedGrowthFraction = intendedReach - previousReach;
    const maxAffordableGrowthFraction = this.buildCost > 0
      ? Math.max(0, this.source.energy) / this.buildCost
      : intendedGrowthFraction;
    const actualGrowthFraction = Math.max(0, Math.min(intendedGrowthFraction, maxAffordableGrowthFraction));
    const actualCost = this.buildCost * actualGrowthFraction;

    this.reachT = previousReach + actualGrowthFraction;
    this.source.energy = Math.max(0, this.source.energy - actualCost);
    this.paidCost += actualCost;

    if (this.reachT >= 1) {
      const remainder = Math.max(0, this.buildCost - this.paidCost);
      if (remainder > 0) this.source.energy = Math.max(0, this.source.energy - remainder);
      this.paidCost = this.buildCost;
      bus.emit('tent:connect', this);
      this.state   = TentState.ACTIVE;
      this.pipeAge = 0;
    }
  }

  /* ── Retracting ── */
  _updateRetractingState(dt) {
    this.reachT = Math.max(0, this.reachT - (GROW_PPS / this.distance) * dt);
    if (this.reachT <= 0) this.state = TentState.DEAD;
  }

  /* ── Advancing (won clash, pushing through enemy territory) ── */
  _updateAdvancingState(dt) {
    this.reachT = Math.min(1, this.reachT + (ADV_PPS / this.distance) * dt);
    if (this.reachT >= 1) {
      this.state   = TentState.ACTIVE;
      this.pipeAge = this.travelDuration; // pipe already full — won clash, deliver immediately
    }
  }

  /* ── Normal active flow ── */
  _updateActiveFlowState(dt) {
    const sourceNode = this.effectiveSourceNode;
    const targetNode = this.effectiveTargetNode;
    if (!this.source || !this.target) return;

    const feedRate = computeTentacleSourceFeedRate(sourceNode, this.maxBandwidth, dt);

    /* Final relay rule:
       Normal nodes spend regen-backed output immediately.
       Relay nodes may only forward energy they already hold from upstream flow, so relay
       output always drains stored relay energy and can never create free feed. */
    sourceNode.energy = Math.max(0, sourceNode.energy - feedRate * dt);

    /* Pipe delay: energy is in transit for the tentacle travel duration after it becomes ACTIVE.
       During filling: energyInPipe accumulates; target receives nothing yet.
       After filling: energyInPipe holds the steady-state in-transit amount; target receives energy. */
    this.pipeAge = Math.min(this.pipeAge + dt, this.travelDuration * 4);
    const isPipeFilling = this.pipeAge < this.travelDuration;

    if (isPipeFilling) {
      this.energyInPipe = Math.min(this.pipeCapacity, this.energyInPipe + feedRate * dt);
      this.flowRate = this.flowRate * 0.80;
      return;
    }

    /* Pipe flowing — steady state */
    this.energyInPipe = feedRate * this.travelDuration;

    const relayFlowMultiplier = this._getRelayFlowMultiplier(sourceNode);
    let deliveredAmount = 0;

    if (targetNode.owner === sourceNode.owner) {
      deliveredAmount = this._applyFriendlyFlow(targetNode, feedRate, relayFlowMultiplier, dt);

    } else if (targetNode.owner === 0) {
      /* CAPTURE_SPEED_MULT compensates for the small tier-0 regen so early captures
         feel responsive while late-game pacing stays correct. */
      deliveredAmount = this._applyNeutralCaptureFlow(targetNode, sourceNode, feedRate, relayFlowMultiplier, dt);

    } else {
      /* Attack and defense level multipliers keep higher-tier nodes stronger. */
      deliveredAmount = this._applyEnemyAttackFlow(targetNode, sourceNode, feedRate, relayFlowMultiplier, dt);
    }

    /* Visual flow rate (EMA) */
    const instantFlowRate = deliveredAmount / Math.max(dt, 0.001);
    this.flowRate  = this.flowRate * 0.80 + instantFlowRate * 0.20;
  }

  /* ── Clash (tug-of-war) ── */

  _prepareClashState(feedRate, dt) {
    this.pipeAge = Math.min(this.pipeAge + dt, this.travelDuration * 4);
    this.energyInPipe = Math.min(this.pipeCapacity, feedRate * this.travelDuration);
    const simulationTime = this.game?.time || 0;
    this.clashSpark = 0.7 + Math.sin(simulationTime * 12) * 0.3;

    /* Init clashT from where this tent physically reached.
       Mid-air collisions: reachT is the actual collision point (0 < reachT < 1).
       ACTIVE→ACTIVE clashes (counter-attacks, resolveClashes): reachT = 1.0 for both
       sides, so use 0.5 as the neutral midpoint — never let clashT start at 1.0. */
    if (this.clashT === null) this.clashT = this.reachT < 1.0 ? this.reachT : 0.5;
    if (this.clashVisualT === null) this.clashVisualT = this.clashT;
  }

  _updateClashApproach(opposingTentacle, dt) {
    const midpoint = 0.5;
    const advanceFraction = (GROW_PPS / Math.max(this.distance, 1)) * dt;
    const approachStep = Math.max(0.001, advanceFraction);
    const approachedFront =
      this.clashT < midpoint
        ? Math.min(midpoint, this.clashT + approachStep)
        : Math.max(midpoint, this.clashT - approachStep);

    this.clashT = approachedFront;
    this.clashVisualT = approachedFront;
    opposingTentacle.clashT = 1 - approachedFront;
    opposingTentacle.clashVisualT = 1 - approachedFront;

    const reachedMidpoint = Math.abs(approachedFront - midpoint) <= 0.0001;
    if (reachedMidpoint) {
      this.clashT = midpoint;
      this.clashVisualT = midpoint;
      this.clashApproachActive = false;
      opposingTentacle.clashT = midpoint;
      opposingTentacle.clashVisualT = midpoint;
      opposingTentacle.clashApproachActive = false;
    }
  }

  _updateClashVisualFront(opposingTentacle, dt) {
    const actualVisualFront = this.clashT;
    const approachRate = GAME_BALANCE.CLASH_VISUAL_APPROACH_SPEED;
    this.clashVisualT += (actualVisualFront - this.clashVisualT) * Math.min(1, approachRate * dt);
    opposingTentacle.clashVisualT = 1 - this.clashVisualT;
  }

  _drainClashSourceBudget(sourceNode, dt) {
    const feedRate = computeTentacleClashFeedRate(sourceNode, this.maxBandwidth, dt);

    /* Relay nodes obey the same pass-through rule during clashes:
       they can contest only with energy already buffered from upstream. */
    sourceNode.energy = Math.max(0, sourceNode.energy - feedRate * dt);
    return feedRate;
  }

  _isCanonicalClashDriver() {
    return this.source.id < this.target.id;
  }

  _computeClashForces(opposingTentacle, feedRate) {
    return computeTentacleClashForces(this, opposingTentacle, feedRate);
  }

  _updateClashFront(opposingTentacle, feedRate, dt) {
    const { myForce, opposingForce } = this._computeClashForces(opposingTentacle, feedRate);
    this.clashT += (myForce - opposingForce) * GAME_BALANCE.CLASH_VOLATILITY * dt;
    opposingTentacle.clashT = 1 - this.clashT;
    opposingTentacle.clashSpark = this.clashSpark;
  }

  _resolveClashOutcome(opposingTentacle) {
    /* Resolve: first past 1.0 or 0.0 wins */
    if (this.clashT >= 1.0) {
      this.clashPartner = null;
      this.clashVisualT = null;
      this.clashApproachActive = false;
      opposingTentacle.clashPartner = null;
      opposingTentacle.clashVisualT = null;
      opposingTentacle.clashApproachActive = false;
      opposingTentacle.kill(); // opponent retracts
      this.state = TentState.ADVANCING;
      this.clashT = null;
      return;
    }

    if (this.clashT <= 0.0) {
      this.clashPartner = null;
      this.clashVisualT = null;
      this.clashApproachActive = false;
      opposingTentacle.clashPartner = null;
      opposingTentacle.clashVisualT = null;
      opposingTentacle.clashApproachActive = false;
      this.kill(); // we retract
      opposingTentacle.state = TentState.ADVANCING;
      opposingTentacle.clashT = null;
    }
  }

  _updateClashState(dt) {
    const sourceNode = this.effectiveSourceNode;
    const opposingTentacle = this.clashPartner;
    if (!opposingTentacle?.alive) { this.clashPartner = null; this.clashVisualT = null; this.clashApproachActive = false; return; }

    const feedRate = this._drainClashSourceBudget(sourceNode, dt);
    this._prepareClashState(feedRate, dt);

    /* Only the canonical tent (lower source.id) drives the shared clash front.
       The other tent mirrors, preventing double-movement per frame. */
    if (!this._isCanonicalClashDriver()) return;

    if (this.clashApproachActive || opposingTentacle.clashApproachActive) {
      this._updateClashApproach(opposingTentacle, dt);
      return;
    }

    this._updateClashFront(opposingTentacle, feedRate, dt);
    this._updateClashVisualFront(opposingTentacle, dt);
    this._resolveClashOutcome(opposingTentacle);
  }

  /* ── Bursting (kamikaze cut: tail rushes to target) ── */
  _updateBurstingState(dt) {
    this.startT = Math.min(1, this.startT + (ADV_PPS * 2 / this.distance) * dt);

    if (this.startT < 1) return;

    /* Payload physically arrives at target — apply impact */
    const sourceNode = this.effectiveSourceNode;
    const targetNode = this.effectiveTargetNode;
    const payload = this._burstPayload || 0;
    this._applyPayloadToTarget(targetNode, sourceNode, payload, {
      contestFlash: 0.8,
      burstPulse: 1.0,
      damageMultiplier: GAME_BALANCE.SLICE_BURST_MULT,
    });

    this.state = TentState.DEAD;
  }
}
