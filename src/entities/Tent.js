/* ================================================================
   Tent entity — TentacleWars runtime

   Thin lifecycle dispatcher. All state-specific behaviour routes
   through TwChannel.advanceLifecycle and the Layer 1/2 TW modules.
   NodeWARS legacy code removed (see git tag v-nw-tw-complete).
   ================================================================ */

import { TentState, GAME_BALANCE } from '../config/gameConfig.js';
import {
  computeDistance,
  computeTravelDuration,
} from '../math/simulationMath.js';
import { bus } from '../core/EventBus.js';
import { computeTentacleWarsBuildCost } from '../tentaclewars/TwTentacleEconomy.js';
import { getTentacleWarsPacketRateForGrade } from '../tentaclewars/TwGradeTable.js';
import { advanceLifecycle } from '../tentaclewars/TwChannel.js';
import { applyTwSliceCut } from '../tentaclewars/TwCombat.js';

export class Tent {
  constructor(sourceNode, targetNode, buildCost) {
    this.source = sourceNode;
    this.target = targetNode;
    this.distanceValue = computeDistance(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);

    /* Derived physics constants (computed once at creation) */
    this.buildCost = buildCost ?? computeTentacleWarsBuildCost(
      this.distanceValue, undefined, sourceNode?.twCostNormalizer,
    );
    this.rate      = 5.5;    // kept for Orb spawning
    this.eff       = 1.0;    // kept for renderer t.eff check
    this.travelDurationValue = computeTravelDuration(this.distanceValue);
    this.pipeCapacityValue   = 300;
    this.maxBandwidth = getTentacleWarsPacketRateForGrade(sourceNode.level)
      * GAME_BALANCE.TENTACLE_BANDWIDTH_TOLERANCE;

    /* State machine */
    this.state    = TentState.GROWING;
    this.reachT   = 0;
    this.reversed = false;

    /* Clash state */
    this.clashT              = null;
    this.clashVisualT        = null;
    this.clashApproachActive = false;
    this.clashPartner        = null;
    this.clashSpark          = 0;

    /* Pipe model */
    this.paidCost               = 0;
    this.energyInPipe           = 0;
    this.pipeAge                = 0;
    this.startT                 = 0;
    this._burstPayload          = 0;
    this.packetAccumulatorUnits = 0;
    this.packetTravelQueue      = [];

    /* Visual */
    this.flowRate        = 0;
    this.cutPoint        = undefined;
    this.cutFlash        = 0;
    this.age             = 0;
    this._orbTimer       = 0;
    this.twCutRetraction = null;

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
   * All gameplay-triggered cuts route through here so player slicing and
   * purple AI strategic cuts stay mechanically identical.
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
    this.packetAccumulatorUnits = 0;
    this.packetTravelQueue = [];
  }

  /* Expose the economically committed lane payload for capture cleanup. */
  getCommittedPayloadForOwnershipCleanup() {
    return this.state === TentState.BURSTING
      ? (this._burstPayload || 0)
      : ((this.paidCost || 0) + (this.energyInPipe || 0));
  }

  _refundToSourceNode(sourceNode, amount) {
    /* Retract / refund rules must restore the full invested payload.
       Do not clamp here, or partially-built tentacles can silently lose
       refunded energy when the source is already near its nominal cap. */
    sourceNode.energy += amount;
  }

  /* Advance the opposing clash partner when this lane is cut or retracted. */
  _resolveClashPartnerOnCut(isBurstStyleCut) {
    if (!this.clashPartner) return;

    const opposingTentacle = this.clashPartner;
    this.clashPartner        = null;
    this.clashVisualT        = null;
    this.clashApproachActive = false;
    opposingTentacle.clashPartner        = null;
    opposingTentacle.clashVisualT        = null;
    opposingTentacle.clashApproachActive = false;

    if (isBurstStyleCut) {
      opposingTentacle.kill();
      return;
    }

    if (opposingTentacle.alive) {
      opposingTentacle.state  = TentState.ADVANCING;
      opposingTentacle.reachT = 1 - (this.clashT ?? this.reachT);
      opposingTentacle.clashT = null;
    }
  }

  /* Collapse the lane after ownership loss without refunding its payload. */
  collapseForOwnershipLoss() {
    if (this.state === TentState.DEAD) return;
    this._resolveClashPartnerOnCut(false);
    this._clearEconomicPayload();
    this.cutFlash = 0;
    this.reachT = this.state === TentState.GROWING ? this.reachT : Math.max(this.reachT, 1);
    this.state = TentState.RETRACTING;
  }

  /**
   * kill(cutRatio)
   *
   * cutRatio defined   → TW slice: applyTwSliceCut handles payload geometry
   * cutRatio undefined → programmatic retract: full payload refunded to source
   *
   * Clash partner is advanced uncontested on programmatic retract.
   * TW slice partner resolution is handled inside applyTwSliceCut.
   */
  kill(cutRatio) {
    if (this.state === TentState.DEAD      ||
        this.state === TentState.RETRACTING ||
        this.state === TentState.BURSTING) return;

    this.clashT              = null;
    this.clashVisualT        = null;
    this.clashApproachActive = false;

    const payload = this.paidCost + (this.energyInPipe || 0);

    if (cutRatio !== undefined) {
      applyTwSliceCut(this, cutRatio, payload);
      return;
    }

    /* Programmatic retract: refund the full invested payload to source. */
    this._resolveClashPartnerOnCut(false);
    this._clearPipeState();
    const sourceNode = this.effectiveSourceNode;
    this._refundToSourceNode(sourceNode, payload);
    this._clearEconomicPayload();
    this.state = TentState.RETRACTING;
  }

  killBoth() {
    const partner = this.clashPartner;
    this.kill();
    if (partner?.alive) partner.kill();
  }

  /**
   * Skip the GROWING phase — used when a counter-attack tentacle is created
   * against an already-active opposing tentacle (instant tug-of-war start).
   */
  activateImmediate() {
    if (this.buildCost > 0 && this.source) {
      this.source.energy = Math.max(0, this.source.energy - this.buildCost);
    }
    this.paidCost = this.buildCost;
    this.state    = TentState.ACTIVE;
    this.reachT   = 1;
    this.pipeAge  = this.travelDuration;
    bus.emit('tent:connect', this);
  }

  initializeFreshClashVisual(sharedVisualFront) {
    /* ACTIVE↔ACTIVE clashes animate toward the midpoint rather than snapping.
       Only pin once the approach animation has already completed. */
    this.clashT              = sharedVisualFront;
    this.clashVisualT        = sharedVisualFront;
    this.clashApproachActive = true;
    this.clashSpark          = Math.max(this.clashSpark || 0, 0.55);
  }

  /* ── Bezier control point (animated wave) — cached per game frame ── */
  getControlPoint() {
    const frame = this.game?._frame ?? -1;
    if (this._controlPointCacheFrame === frame) return this._controlPointCacheValue;

    const sourceNode = this.source;
    const targetNode = this.target;
    const midpointX = (sourceNode.x + targetNode.x) * 0.5;
    const midpointY = (sourceNode.y + targetNode.y) * 0.5;

    /* When clashing, both opposing tentacles share the same control point so
       their bezier paths are geometrically identical. Derive dx/dy from the
       lower-id node to guarantee B(1-u) = B'(u). */
    const lowerIdNode  = sourceNode.id < targetNode.id ? sourceNode : targetNode;
    const higherIdNode = sourceNode.id < targetNode.id ? targetNode : sourceNode;
    const deltaX = higherIdNode.x - lowerIdNode.x;
    const deltaY = higherIdNode.y - lowerIdNode.y;
    const segmentLength   = Math.hypot(deltaX, deltaY) || 1;
    const simulationTime  = this.game?.time || 0;
    const waveOffset = Math.sin(simulationTime * 1.9 + lowerIdNode.id * 1.9) * segmentLength * 0.12;
    this._controlPointCacheValue = {
      x: midpointX + (-deltaY / segmentLength) * waveOffset,
      y: midpointY + (deltaX  / segmentLength) * waveOffset,
    };
    this._controlPointCacheFrame = frame;
    return this._controlPointCacheValue;
  }

  getCP() {
    return this.getControlPoint();
  }

  /* ── Main update — all lifecycle routing through TwChannel ── */
  update(dt) {
    if (this.state === TentState.DEAD) return;
    advanceLifecycle(this, dt);
  }
}
