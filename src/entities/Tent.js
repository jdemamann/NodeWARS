/* ================================================================
   NODE WARS v3 — Tent (Tentacle)

   Responsibilities: data model + physics update.
   Rendering is handled by TentRenderer.
   Orb spawning is delegated to OrbPool via the shouldSpawnOrb helper.
   ================================================================ */

import { TentState, GROW_PPS, ADV_PPS, EMBRYO, TIER_REGEN, GAME_BALANCE } from '../constants.js';
import { vd, bldC, travelT, domR, defR, clamp } from '../utils.js';
import { bus } from '../EventBus.js';

export class Tent {
  constructor(src, tgt, cost) {
    this.source = src;
    this.target = tgt;
    this.d      = vd(src.x, src.y, tgt.x, tgt.y);

    /* Derived physics constants (computed once at creation) */
    this.buildCost = cost ?? bldC(this.d);
    this.rate      = 5.5;            // kept for Orb spawning; no longer distance-based
    this.eff       = 1.0;            // heat loss removed; kept for renderer t.eff check
    this.tt        = travelT(this.d);
    this.pCap         = 300;         // pipe buffer cap
    this.maxBandwidth = (TIER_REGEN[src.level] ?? TIER_REGEN[0]) * GAME_BALANCE.TENTACLE_BANDWIDTH_TOLERANCE;

    /* State machine */
    this.state    = TentState.GROWING;
    this.reachT   = 0;        // 0→1: how far tip has grown
    this.reversed = false;    // true = flow direction inverted

    /* Clash state */
    this.clashT       = null;
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

    /* getCP() per-frame cache */
    this._cpF = -1;
    this._cpC = null;

    /* Owner tracking for virgin-→-enemy race condition */
    this._prevTgtOwner = tgt.owner;
  }

  /* ── Computed properties ── */
  get alive()   { return this.state !== TentState.DEAD; }
  get removed() { return this.state === TentState.DEAD; }

  /** Effective source (respects reversed flag). */
  get es() { return this.reversed ? this.target : this.source; }
  /** Effective target (respects reversed flag). */
  get et() { return this.reversed ? this.source : this.target; }

  /* ── Kill / retract ── */

  /**
   * kill(cutRatio)
   *
   * cutRatio = normalised position along the effective source→target axis where the cut landed.
   *   undefined / no param  → normal programmatic kill (retract, no refund)
   *   < 0.3  (near source)  → defensive refund: payload returned to source immediately
   *   > 0.7  (near target)  → kamikaze burst: payload rushes to target as a BURSTING wave
   *   0.3–0.7 (middle)      → normal cut: retract, energy lost
   *
   * Clash partner is handled before state changes:
   *   kamikaze → partner is also killed (defence destroyed)
   *   refund / normal → partner advances uncontested
   */
  kill(cutRatio) {
    if (this.state === TentState.DEAD      ||
        this.state === TentState.RETRACTING ||
        this.state === TentState.BURSTING) return;

    /* Always clear clash state immediately so the renderer doesn't show a stale spark */
    this.clashT = null;

    const payload    = this.paidCost + (this.energyInPipe || 0);
    const isKamikaze = cutRatio !== undefined && cutRatio > 0.7;
    const isRefund   = cutRatio !== undefined && cutRatio < 0.3;

    /* Step 1 — Disconnect and resolve clash partner */
    if (this.clashPartner) {
      const opp        = this.clashPartner;
      this.clashPartner = null;
      opp.clashPartner  = null;

      if (isKamikaze) {
        /* Destroy the opposing tentacle — burst goes through undefended */
        opp.kill();
      } else {
        /* Refund or normal cut — opponent wins the clash by default, let them advance */
        if (opp.alive) {
          opp.state  = TentState.ADVANCING;
          opp.reachT = 1 - (this.clashT ?? this.reachT);
          opp.clashT = null;
        }
      }
    }

    /* Step 2 — Clear pipe */
    this.energyInPipe = 0;
    this.pipeAge      = 0;

    /* Step 3 — Apply slice state */
    if (isKamikaze) {
      /* Tail rushes forward; impact is applied in _updateBursting when startT >= 1 */
      this.state         = TentState.BURSTING;
      this.startT        = cutRatio;
      this._burstPayload = payload;

    } else if (isRefund) {
      /* Defensive cut near source: return everything immediately */
      this.state  = TentState.RETRACTING;
      this.reachT = cutRatio;
      const src   = this.es;
      src.energy  = Math.min(src.maxE, src.energy + payload);

    } else {
      /* Normal kill or middle-zone cut: retract, energy is lost */
      if (this.cutPoint !== undefined && this.cutPoint > 0 && this.cutPoint < 1) {
        this.reachT = this.cutPoint;
      }

      /* Score: track explicit player retracts on non-owned targets */
      if (this.playerRetract && this.state === TentState.ACTIVE &&
          this.source?.owner === 1 && this.target?.owner !== 1) {
        if (this.game) this.game.wastedTents = (this.game.wastedTents || 0) + 1;
      }

      /* Decay contest contribution on retract from virgin cell */
      if (this.target?.owner === 0 && this.target.contest) {
        const ow = this.source.owner;
        if (this.target.contest[ow] > 0) {
          const penalty = this.target.contest[ow] * Math.min(1, this.reachT);
          this.target.contest[ow] = Math.max(0, this.target.contest[ow] - penalty * 0.6);
          if (this.target.contest[ow] < 0.5) this.target.contest[ow] = 0;
        }
      }

      this.state = TentState.RETRACTING;
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
    /* Instant clash: tentacle never physically grew, so only charge the base build
       cost (bldC), NOT the full range surcharge (d * dm). Charging the full buildCost
       here causes an abrupt single-frame energy drop that is not communicated to the
       player. The clash itself will drain the source via tentFeedPerSec during combat. */
    const baseCost = bldC(this.d);
    if (baseCost > 0 && this.source) {
      this.source.energy = Math.max(0, this.source.energy - baseCost);
    }
    this.paidCost = this.buildCost;  // mark fully paid so kill() won't refund
    this.state    = TentState.ACTIVE;
    this.reachT   = 1;
    this.pipeAge  = this.tt;         // pipe immediately full for instant counter-attacks
    bus.emit('tent:connect', this);
  }

  /* ── Bezier control point (animated wave) — cached per game frame ── */
  getCP() {
    const frame = this.game?._frame ?? -1;
    if (this._cpF === frame) return this._cpC;

    const s  = this.source, t = this.target;
    const mx = (s.x + t.x) * 0.5, my = (s.y + t.y) * 0.5;

    /* When clashing, both opposing tentacles (A→B and B→A) must share the same
       control point so their bezier paths are geometrically identical.
       Fix: always derive dx/dy from lower-id node → higher-id node, and seed
       the phase with the lower id. This guarantees B(1-u) = B'(u). */
    const nLow  = s.id < t.id ? s : t;
    const nHigh = s.id < t.id ? t : s;
    const dx  = nHigh.x - nLow.x, dy = nHigh.y - nLow.y;
    const len = Math.hypot(dx, dy) || 1;
    const w   = Math.sin(Date.now() * 0.0019 + nLow.id * 1.9) * len * 0.12;
    this._cpC = { x: mx + (-dy / len) * w, y: my + (dx / len) * w };
    this._cpF = frame;
    return this._cpC;
  }

  /* ── Main update ── */
  update(dt) {
    if (this.state === TentState.DEAD) return;
    this.age += dt;
    if (this.cutFlash > 0) this.cutFlash = Math.max(0, this.cutFlash - dt * 3);

    if (this.state === TentState.GROWING)    { this._updateGrowing(dt);    return; }
    if (this.state === TentState.RETRACTING) { this._updateRetracting(dt); return; }
    if (this.state === TentState.ADVANCING)  { this._updateAdvancing(dt);  return; }
    if (this.state === TentState.BURSTING)   { this._updateBursting(dt);   return; }

    /* ── ACTIVE ── */
    const s = this.es;

    if (s.owner === 0) { this.kill(); return; }
    /* Only kill for low energy when not in a clash — clashT resolves depletion naturally */
    if (!this.clashPartner && s.energy < 0.25) { this.kill(); return; }

    /* Race condition: virgin captured by AI while tentacle was growing toward it */
    const t_eff = this.et;
    if (t_eff.owner !== 0 && t_eff.owner !== s.owner && this._prevTgtOwner === 0) {
      this.state = TentState.RETRACTING;
      this._prevTgtOwner = t_eff.owner;
      return;
    }
    this._prevTgtOwner = t_eff.owner;

    if (this.clashPartner?.alive && this.clashPartner.state !== TentState.RETRACTING) {
      this._updateClash(dt);
    } else if (this.clashT !== null) {
      this.clashT = null; this.clashPartner = null;
      this.state = TentState.ADVANCING;
    } else {
      this.clashT = null; this.clashPartner = null;
      this._updateNormal(dt);
    }
  }

  /* ── Growing ── */
  _updateGrowing(dt) {
    /* Mid-air collision check BEFORE advancing reachT.
       If an opposing tentacle is also growing toward us and their combined reach crosses 1.0,
       they meet mid-air and immediately enter a clash at the collision point. */
    if (this.game) {
      const tents = this.game.tents;
      for (let i = 0; i < tents.length; i++) {
        const opp = tents[i];
        if (opp === this || opp.state !== TentState.GROWING) continue;
        if (opp.source !== this.target || opp.target !== this.source) continue;
        if (opp.es.owner === this.es.owner) continue;

        if (this.reachT + opp.reachT >= 1.0) {
          /* Snap collision point */
          opp.reachT       = 1.0 - this.reachT;
          this.state       = TentState.ACTIVE;
          opp.state        = TentState.ACTIVE;
          /* clashT = where each tent reached — their physical meeting point */
          this.clashT      = this.reachT;
          opp.clashT       = opp.reachT;
          /* Partial pipe fill proportional to how far they grew */
          this.pipeAge     = this.reachT * this.tt;
          opp.pipeAge      = opp.reachT * opp.tt;
          this.clashPartner = opp;
          opp.clashPartner  = this;
          /* resolveClashes() will re-link them next frame — no bus emit needed */
          return;
        }
      }
    }

    const prevT = this.reachT;
    this.reachT = Math.min(1, this.reachT + (GROW_PPS / this.d) * dt);
    const growFrac = this.reachT - prevT;
    const costThisFrame = this.buildCost * growFrac;
    this.source.energy  = Math.max(0, this.source.energy - costThisFrame);
    this.paidCost      += costThisFrame;

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
  _updateRetracting(dt) {
    this.reachT = Math.max(0, this.reachT - (GROW_PPS / this.d) * dt);
    if (this.reachT <= 0) this.state = TentState.DEAD;
  }

  /* ── Advancing (won clash, pushing through enemy territory) ── */
  _updateAdvancing(dt) {
    this.reachT = Math.min(1, this.reachT + (ADV_PPS / this.d) * dt);
    if (this.reachT >= 1) {
      this.state   = TentState.ACTIVE;
      this.pipeAge = this.tt;   // pipe already full — won clash, deliver immediately
    }
  }

  /* ── Normal active flow ── */
  _updateNormal(dt) {
    const s = this.es, t = this.et;
    if (!this.source || !this.target) return;

    const feed = Math.min(s.tentFeedPerSec || 0, this.maxBandwidth);

    /* Unified Pool: source ALWAYS pays feed * dt immediately.
       This is the "drain" side; GNode.update() is the "fill" side. Together they are zero-sum.
       Exception: relay nodes have no tier regen — draining them would permanently deplete them. */
    if (!s.isRelay) s.energy = Math.max(0, s.energy - feed * dt);

    /* Pipe delay: energy is in transit for tt seconds after the tentacle becomes ACTIVE.
       During filling: energyInPipe accumulates; target receives nothing yet.
       After filling: energyInPipe holds the steady-state in-transit amount; target receives energy. */
    this.pipeAge = Math.min(this.pipeAge + dt, this.tt * 4);
    const filling = this.pipeAge < this.tt;

    if (filling) {
      this.energyInPipe = Math.min(this.pCap, this.energyInPipe + feed * dt);
      this.flowRate = this.flowRate * 0.80;
      return;
    }

    /* Pipe flowing — steady state */
    this.energyInPipe = feed * this.tt;

    const relayMult = (s.isRelay && s.owner !== 0 && !s.inFog) ? 1.45 : 1.0;
    let delivered = 0;

    if (t.owner === s.owner) {
      /* ── FRIENDLY ── */
      const entering = feed * relayMult * dt;
      if (t.energy < t.maxE) t.energy = Math.min(t.maxE, t.energy + entering);
      t.inFlow = (t.inFlow || 0) + feed * relayMult;
      delivered = entering;

    } else if (t.owner === 0) {
      /* ── VIRGIN CAPTURE ──
         CAPTURE_SPEED_MULT compensates for the small tier-0 regen so early captures
         feel responsive while late-game pacing stays correct. */
      const contrib = feed * domR(s.level) * GAME_BALANCE.CAPTURE_SPEED_MULT * relayMult * dt;

      if (!t.contest) t.contest = {};
      if (!t.contest[s.owner]) t.contest[s.owner] = 0;
      t.contest[s.owner] += contrib;

      /* Rival contest cancellation */
      const rival    = s.owner === 1 ? 2 : 1;
      const rivScore = t.contest[rival] || 0;
      if (rivScore > 0) {
        const cancelRate = Math.min(t.contest[s.owner], rivScore) * 0.6;
        t.contest[s.owner] = Math.max(0, t.contest[s.owner] - cancelRate * dt);
        t.contest[rival]   = Math.max(0, rivScore            - cancelRate * dt);
      }

      if (t.contest[s.owner] >= (t.captureThreshold || EMBRYO)) {
        const bonus     = t.contest[s.owner] - EMBRYO;
        const prevOwner = t.owner;
        t.owner  = s.owner;
        t.regen  = 0;
        t.cFlash = 1; t.contest = null;
        t.energy = Math.min(t.maxE, t.energy + bonus * 0.5);
        if (this.game) this.game.fogDirty = true;
        bus.emit('node:owner_change', t, prevOwner);
        bus.emit('node:capture', t);
        this.game?.tents.forEach(ot => {
          if (ot.alive && ot.et === t && ot.es.owner !== t.owner) ot.kill();
        });
      }
      delivered = contrib;

    } else {
      /* ── ENEMY ATTACK ──
         domR: attacker level bonus; defR: defender level resistance.
         efAtk() now returns 1.0 (fill-% penalty removed — matches original Tentacle Wars). */
      const dmg = feed * domR(s.level) / defR(t.level) * GAME_BALANCE.ATTACK_DAMAGE_MULT * relayMult * dt;

      t.energy    -= dmg;
      t.underAttack = 1;
      delivered = feed * relayMult * dt;

      if (t.energy <= 0) {
        const overflow  = Math.abs(t.energy) * 0.10;
        const prevOwner = t.owner;
        t.owner  = s.owner;
        t.regen  = 0;
        t.energy = overflow;
        t.cFlash = 1; t.contest = null; t.shieldFlash = 0;
        if (this.game) this.game.fogDirty = true;
        bus.emit('node:owner_change', t, prevOwner);
        if (s.owner === 2) bus.emit('cell:lost', t);
        if (s.owner === 1) bus.emit('cell:killed_enemy', t);
        this.game?.tents.filter(ot => ot.alive && ot.es === t && ot.et.owner !== s.owner).forEach(ot => ot.kill());
        this.game?.tents.filter(ot => ot.alive && ot.et === t && ot.es.owner !== t.owner).forEach(ot => ot.kill());
      }
    }

    /* Visual flow rate (EMA) */
    const instRate = delivered / Math.max(dt, 0.001);
    this.flowRate  = this.flowRate * 0.80 + instRate * 0.20;
  }

  /* ── Clash (tug-of-war) ── */
  _updateClash(dt) {
    const s   = this.es;
    const opp = this.clashPartner;
    if (!opp?.alive) { this.clashPartner = null; return; }

    const feed = Math.min(s.tentFeedPerSec || 0, this.maxBandwidth);

    /* Unified Pool: source always pays — clash drains both nodes' stored energy.
       Relay nodes are exempt: they have no regen, so draining would permanently deplete them. */
    if (!s.isRelay) s.energy = Math.max(0, s.energy - feed * dt);

    /* Keep energyInPipe at steady state for vortex drain + visual */
    this.pipeAge      = Math.min(this.pipeAge + dt, this.tt * 4);
    this.energyInPipe = Math.min(this.pCap, feed * this.tt);
    this.clashSpark   = 0.7 + Math.sin(Date.now() * 0.012) * 0.3;

    /* Init clashT from where this tent physically reached.
       Mid-air collisions: reachT is the actual collision point (0 < reachT < 1).
       ACTIVE→ACTIVE clashes (counter-attacks, resolveClashes): reachT = 1.0 for both
       sides, so use 0.5 as the neutral midpoint — never let clashT start at 1.0. */
    if (this.clashT === null) this.clashT = this.reachT < 1.0 ? this.reachT : 0.5;

    /* Only the canonical tent (lower source.id) drives the shared clash front.
       The other tent mirrors, preventing double-movement per frame. */
    const isCanonical = this.source.id < this.target.id;
    if (!isCanonical) return;

    const oppFeed  = Math.min(opp.es?.tentFeedPerSec || 0, opp.maxBandwidth);
    const myForce  = feed    * domR(s.level);
    const oppForce = oppFeed * domR(this.et.level);

    this.clashT   += (myForce - oppForce) * GAME_BALANCE.CLASH_VOLATILITY * dt;
    opp.clashT     = 1 - this.clashT;
    opp.clashSpark = this.clashSpark;

    /* Resolve: first past 1.0 or 0.0 wins */
    if (this.clashT >= 1.0) {
      this.clashPartner = null;
      opp.clashPartner  = null;
      opp.kill();                        // opponent retracts
      this.state  = TentState.ADVANCING;
      this.clashT = null;

    } else if (this.clashT <= 0.0) {
      this.clashPartner = null;
      opp.clashPartner  = null;
      this.kill();                       // we retract
      opp.state   = TentState.ADVANCING;
      opp.clashT  = null;
    }
  }

  /* ── Bursting (kamikaze cut: tail rushes to target) ── */
  _updateBursting(dt) {
    this.startT = Math.min(1, this.startT + (ADV_PPS * 2 / this.d) * dt);

    if (this.startT < 1) return;

    /* Payload physically arrives at target — apply impact */
    const s       = this.es;
    const t       = this.et;
    const payload = this._burstPayload || 0;
    const dmg     = payload * domR(s.level) * GAME_BALANCE.SLICE_BURST_MULT;

    if (t.owner === s.owner) {
      /* Friendly target: boost their energy */
      t.energy = Math.min(t.maxE, t.energy + payload);

    } else if (t.owner === 0) {
      /* Neutral: contest points — may trigger capture */
      if (!t.contest) t.contest = {};
      if (!t.contest[s.owner]) t.contest[s.owner] = 0;
      t.contest[s.owner] += dmg;
      t.cFlash      = (t.cFlash || 0) + 0.8;
      t.burstPulse  = 1.0;

      if (t.contest[s.owner] >= (t.captureThreshold || EMBRYO)) {
        const over      = t.contest[s.owner] - EMBRYO;
        const prevOwner = t.owner;
        t.owner  = s.owner;
        t.regen  = 0;
        t.cFlash = 1; t.contest = null;
        t.energy = Math.min(t.maxE, t.energy + over * 0.5);
        if (this.game) this.game.fogDirty = true;
        bus.emit('node:owner_change', t, prevOwner);
        bus.emit('node:capture', t);
        this.game?.tents.forEach(ot => {
          if (ot.alive && ot.et === t && ot.es.owner !== t.owner) ot.kill();
        });
      }

    } else {
      /* Enemy: direct damage */
      t.energy    -= dmg;
      t.underAttack = 1;
      t.cFlash      = (t.cFlash || 0) + 0.8;
      t.burstPulse  = 1.0;

      if (t.energy <= 0) {
        const overflow  = Math.abs(t.energy) * 0.10;
        const prevOwner = t.owner;
        t.owner  = s.owner;
        t.regen  = 0;
        t.energy = overflow;
        t.cFlash = 1; t.contest = null; t.shieldFlash = 0;
        if (this.game) this.game.fogDirty = true;
        bus.emit('node:owner_change', t, prevOwner);
        if (s.owner === 2) bus.emit('cell:lost', t);
        if (s.owner === 1) bus.emit('cell:killed_enemy', t);
        this.game?.tents.filter(ot => ot.alive && ot.es === t && ot.et.owner !== s.owner).forEach(ot => ot.kill());
        this.game?.tents.filter(ot => ot.alive && ot.et === t && ot.es.owner !== t.owner).forEach(ot => ot.kill());
      }
    }

    this.state = TentState.DEAD;
  }
}
