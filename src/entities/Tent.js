/* ================================================================
   NODE WARS v3 — Tent (Tentacle)

   Responsibilities: data model + physics update.
   Rendering is handled by TentRenderer.
   Orb spawning is delegated to OrbPool via the shouldSpawnOrb helper.
   ================================================================ */

import { TentState, GROW_PPS, ADV_PPS, EMBRYO, TIER_REGEN, GAME_BALANCE } from '../constants.js';
import { vd, bldC, wireEff, travelT, efAtk, domR, defR, clamp } from '../utils.js';
import { bus } from '../EventBus.js';

export class Tent {
  constructor(src, tgt, cost) {
    this.source = src;
    this.target = tgt;
    this.d      = vd(src.x, src.y, tgt.x, tgt.y);

    /* Derived physics constants (computed once at creation) */
    this.buildCost = cost ?? bldC(this.d);
    this.rate      = 5.5;            // kept for Orb spawning; no longer distance-based
    this.eff       = wireEff(this.d);
    this.tt        = travelT(this.d);
    this.pCap         = 300;         // pipe buffer cap (for clash energyInPipe)
    // Hard bandwidth cap: tier regen × tolerance (default 1.1 = 10% headroom).
    // This makes maxBandwidth a real constraint — previously it was 10–35 e/s and never reached.
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
  kill() {
    if (this.state === TentState.DEAD || this.state === TentState.RETRACTING) return;

    /* If cut mid-way, retract from cut point */
    if (this.cutPoint !== undefined && this.cutPoint > 0 && this.cutPoint < 1) {
      this.reachT = this.cutPoint;
    }

    /* Refund unpaid build cost if still growing */
    if (this.state === TentState.GROWING && this.buildCost > 0) {
      const unspent = Math.max(0, this.buildCost - this.paidCost);
      if (unspent > 0) this.source.energy = Math.min(this.source.maxE, this.source.energy + unspent);
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

    this.state        = TentState.RETRACTING;
    this.clashPartner = null;
    this.energyInPipe = 0;
    this.pipeAge      = 0;
  }

  killBoth() {
    this.kill();
    if (this.clashPartner?.alive) this.clashPartner.kill();
  }

  /**
   * Skip the GROWING phase — used when a counter-attack tentacle is created
   * against an already-active opposing tentacle (instant "tug of war" start).
   */
  activateImmediate() {
    const remaining = Math.max(0, this.buildCost - this.paidCost);
    if (remaining > 0 && this.source) {
      this.source.energy = Math.max(0, this.source.energy - remaining);
    }
    this.paidCost = this.buildCost;
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

    /* ── ACTIVE ── */
    this.pipeAge = Math.min(this.pipeAge + dt, this.tt * 4);
    const s = this.es;

    if (s.owner === 0 || s.energy < 0.25) { this.kill(); return; }

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

    /* ramp: 0→1 over tt seconds after becoming ACTIVE.
       The tentacle is the "road" — it must fill before energy arrives at destination.
       Nothing is delivered to the target while ramp < 1. */
    const ramp      = Math.min(1, this.pipeAge / this.tt);
    const pipeReady = ramp >= 1;

    const eff       = this.eff;
    const relayMult = (s.isRelay && s.owner !== 0 && !s.inFog) ? 1.45 : 1.0;

    /* Feed rate: energy/s this tentacle receives from its source node.
       Half regen per tentacle (not divided by outCount — each tent is independently powered).
       Overflow nodes push their full regen. Under-attack nodes stop self-feeding.
       Triangle partners always add their inFlow on top (cascade feedback). */
    const feed = Math.min(s.tentFeedPerSec || 0, this.maxBandwidth);

    let delivered = 0;

    if (t.owner === s.owner) {
      /* ── FRIENDLY: distribute regen / overflow / triangle energy ── */
      if (pipeReady) {
        const entering = feed * eff * relayMult * dt;
        if (t.energy < t.maxE) {
          t.energy = Math.min(t.maxE, t.energy + entering);
        }
        /* Track inFlow rate (e/s) for next frame's triangle feedback */
        t.inFlow = (t.inFlow || 0) + feed * eff * relayMult;
        delivered = entering;
      }

    } else if (t.owner === 0) {
      /* ── VIRGIN CAPTURE ──
         contrib is scaled by CAPTURE_SPEED_MULT (default 4.0) so that a tier-0 node
         captures a neutral cell in ~6s instead of ~24s. This compensates for the low
         tier-0 regen (0.5 e/s) that would otherwise make early-game captures painfully slow.
         Late-game nodes (tier 4-5) are already fast, so the multiplier feels natural there too. */
      if (pipeReady) {
        const entering = feed * eff * relayMult * dt;
        const contrib  = entering * domR(s.level) * GAME_BALANCE.CAPTURE_SPEED_MULT;

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
          const bonus = t.contest[s.owner] - EMBRYO;
          const prevOwner = t.owner;
          t.owner  = s.owner;
          t.regen  = 0; // tier-based — no longer used directly
          t.cFlash = 1; t.contest = null;
          t.energy = Math.min(t.maxE, t.energy + bonus * 0.5);
          if (this.game) this.game.fogDirty = true;
          bus.emit('node:owner_change', t, prevOwner);
          bus.emit('node:capture', t);
          this.game?.tents.forEach(ot => {
            if (ot.alive && ot.et === t && ot.es.owner !== t.owner) ot.kill();
          });
        }
        delivered = entering;
      }

    } else {
      /* ── ENEMY ATTACK ──
         Source pays commit immediately (energy in transit).
         Damage only lands when pipe is full (pipeReady).
         Distance cost is already captured by buildCost, wireEff, and tt. */
      const pressure = efAtk(s);
      const commit   = feed * pressure * dt;
      s.energy = Math.max(0.5, s.energy - Math.min(commit, s.energy * 0.96));

      if (pipeReady) {
        const entering = commit * eff * relayMult;
        /* domR: attacker level bonus; defR: defender level resistance.
           ATTACK_DAMAGE_MULT scales overall combat aggression without touching level scaling. */
        const dmg = entering * domR(s.level) / defR(t.level) * GAME_BALANCE.ATTACK_DAMAGE_MULT;

        t.energy    -= dmg;
        t.underAttack = 1;

        if (t.energy <= 0) {
          const overflow = Math.abs(t.energy) * 0.10;
          const prevOwner = t.owner;
          t.owner  = s.owner;
          t.regen  = 0; // tier-based — no longer used directly
          t.energy = overflow;
          t.cFlash = 1; t.contest = null; t.shieldFlash = 0;
          if (this.game) this.game.fogDirty = true;
          bus.emit('node:owner_change', t, prevOwner);
          if (s.owner === 2) bus.emit('cell:lost', t);
          if (s.owner === 1) bus.emit('cell:killed_enemy', t);
          this.game?.tents.filter(ot => ot.alive && ot.es === t && ot.et.owner !== s.owner).forEach(ot => ot.kill());
          this.game?.tents.filter(ot => ot.alive && ot.et === t && ot.es.owner !== t.owner).forEach(ot => ot.kill());
        }
        delivered = entering;
      }
    }

    /* Pipe model: tracks energy in transit (used for clash force calculation).
       Fills during ramp-up; settles to steady-state content when pipe is ready. */
    if (!pipeReady) {
      this.energyInPipe = Math.min(this.pCap,
        this.energyInPipe + feed * eff * relayMult * dt * 0.5);
    } else {
      this.energyInPipe = feed * eff * relayMult * this.tt;
    }

    /* Visual flow rate (EMA) */
    const instRate = delivered / Math.max(dt, 0.001);
    this.flowRate  = this.flowRate * 0.80 + instRate * 0.20;
  }

  /* ── Clash (tug-of-war) ── */
  _updateClash(dt) {
    const s  = this.es, t = this.et;
    const opp = this.clashPartner;
    if (!opp?.alive) { this.clashPartner = null; return; }

    /* Same feed model as normal attack: tentFeedPerSec drives commit. */
    const feed     = s.tentFeedPerSec || 0;
    const pressure = efAtk(s);
    const commit   = feed * pressure * dt;
    s.energy = Math.max(0.5, s.energy - Math.min(commit, s.energy * 0.96));

    const entering = commit * this.eff;
    const ramp     = Math.min(1, this.pipeAge / this.tt);
    this.energyInPipe = Math.min(this.pCap,
      Math.max(0, this.energyInPipe + entering * (1 - ramp) * 0.5 + entering * ramp * 0.3));

    const myPow  = Math.max(0.1, this.energyInPipe) * domR(s.level);
    const oppPow = Math.max(0.1, opp.energyInPipe || 0) * domR(t.level);
    const tot    = myPow + oppPow;

    if (this.clashT === null) this.clashT = 0.5;
    this.clashT  = clamp(this.clashT + (myPow - oppPow) / tot * 0.14 * dt, 0.05, 0.95);
    opp.clashT   = clamp(1 - this.clashT, 0.05, 0.95);
    this.clashSpark = 0.7 + Math.sin(Date.now() * 0.012) * 0.3;

    /* Breakthrough: direct damage if clash front past 85% */
    if (this.clashT > 0.85) {
      const breachDmg = (this.clashT - 0.85) * myPow * dt * 3.0;
      t.energy     -= breachDmg;
      t.underAttack = 1;
      if (t.energy <= 0) {
        t.energy = Math.abs(t.energy) * 0.10;
        const prevOwner = t.owner;
        t.owner  = s.owner;
        t.regen  = 0; // tier-based — no longer used directly
        t.cFlash = 1;
        if (this.game) this.game.fogDirty = true;
        bus.emit('node:owner_change', t, prevOwner);
        this.kill(); opp?.kill();
      }
    }
    if (s.energy < 1.5) this.kill();
  }
}
