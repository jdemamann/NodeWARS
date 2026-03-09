/* ================================================================
   NODE WARS v3 — GameNode

   Responsibilities: data model + physics update.
   Rendering is handled by NodeRenderer — no canvas calls here.

   Key fix: NodeType enum replaces the dual type/isRelay pattern.
   'r' (RELAY) now handles both roles — isRelay is a computed getter.
   ================================================================ */

import { NodeType, LVL_STEP, TIER_REGEN, GAMEPLAY_RULES } from '../config/gameConfig.js';
import { computeEnergyLevel, computeNodeRadius } from '../math/simulationMath.js';
import { bus } from '../core/EventBus.js';

const { energy: GAME_BALANCE, progression: PROGRESSION_RULES, world: WORLD_RULES } = GAMEPLAY_RULES;

export class GameNode {
  constructor(id, x, y, energy, owner, type = NodeType.NORMAL) {
    this.id     = id;
    this.x      = x;
    this.y      = y;
    this.maxE   = 200;   // overridden per-level by Game.loadLevel via cfg.nodeEnergyCap
    this.energy = energy;
    this.owner  = owner;
    this.type   = type;

    this.regen  = 0; // deprecated — regen is now tier-based via TIER_REGEN[level]

    /* Visual state (read by NodeRenderer) */
    this.pulse      = Math.random() * Math.PI * 2;
    this.rot        = Math.random() * Math.PI * 2;
    this.cFlash     = 0;
    this.lvlFlash   = 0;
    this.shieldFlash= 0;
    this.burstPulse = 0;
    this.rFlash     = 0;
    this.spFlash    = 0;

    /* Gameplay state */
    this.selected   = false;
    this.underAttack= 0;
    this.contest    = null;   // { ownerId: score } for neutral capture races
    this.autoRetract= false;
    this.inFog      = false;

    /* Tentacle counts — maintained incrementally by Game.updateOutCounts() */
    this.outCount   = 0;

    /* Cascade: energy available to push into tentacles this frame */
    this.availPower = 0;
    this.inFlow     = 0;
    this.relayFeedBudget = 0;

    /* Pulsar countdown (only relevant for NodeType.PULSAR) */
    this.spTimer    = type === NodeType.PULSAR ? 4 + Math.random() * 4 : 0;

    /* Bunker / Signal Tower properties */
    this.isBunker         = false;  // set by Game._applyBunkers
    this.captureThreshold = WORLD_RULES.DEFAULT_CAPTURE_THRESHOLD;

    /* Level tracking for level-up event */
    this._prevLvl   = computeEnergyLevel(energy);
    /* Owner tracking for relay/signal capture events */
    this._prevOwner = owner;
  }

  /* ── Computed properties ── */
  get radius()  { return computeNodeRadius(this.energy, this.maxE); }
  get level()   { return computeEnergyLevel(this.energy); }
  get dispE()   { return Math.floor(this.energy); }
  get isRelay() { return this.type === NodeType.RELAY; }
  get maxSlots(){ return PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL[this.level]; }

  /* ── Physics update ── */
  update(dt, frenzyActive = false) {
    if (this.isRelay) {
      /* Relays: decay visual flashes only — no energy regen */
      this.cFlash      = Math.max(0, this.cFlash - dt * 2);
      this.rFlash      = Math.max(0, this.rFlash - dt * 2);
      this.shieldFlash = Math.max(0, (this.shieldFlash || 0) - dt * 2);
      this.lvlFlash    = Math.max(0, this.lvlFlash - dt * 2);
      this.underAttack = Math.max(0, this.underAttack - dt * 1.5);
      this.burstPulse  = Math.max(0, (this.burstPulse || 0) - dt * 3);
      return;
    }

    /* Energy regen — Unified Pool model:
       GameNode ALWAYS regenerates its full tier regen, regardless of outCount.
       Tent._updateNormal / _updateClash explicitly drain feed * dt from the source each frame.
       Net result: if regen == feed, energy stays flat (zero-sum). If feed > regen (clash),
       stored energy drains. No conditional branching needed — physics handles the balance. */
    if (this.owner !== 0) {
      const tierRegen = TIER_REGEN[this.level] ?? TIER_REGEN[0];
      const boost     = (frenzyActive && this.owner === 1) ? 1.10 : 1.0;
      this.energy     = Math.min(this.maxE, this.energy + tierRegen * boost * GAME_BALANCE.GLOBAL_REGEN_MULT * dt);
    }

    /* Decay visual flashes */
    this.cFlash      = Math.max(0, this.cFlash - dt * 2.5);
    this.rFlash      = Math.max(0, this.rFlash - dt * 3);
    this.shieldFlash = Math.max(0, (this.shieldFlash || 0) - dt * 2.5);
    this.lvlFlash    = Math.max(0, this.lvlFlash - dt * 1.8);
    this.burstPulse  = Math.max(0, (this.burstPulse || 0) - dt * 4);
    this.underAttack = Math.max(0, this.underAttack - dt * 1.8);
    this.spFlash     = Math.max(0, (this.spFlash || 0) - dt * 2.5);

    /* Rotation */
    this.rot += dt * 0.065 * (this.level + 1);

    /* Level-up event */
    const nl = this.level;
    if (nl > this._prevLvl) {
      this.lvlFlash = 1;
      bus.emit('node:levelup', this);
    }
    this._prevLvl = nl;

    /* Auto-retract: very low energy while under attack */
    if (
      this.underAttack > WORLD_RULES.AUTO_RETRACT_ATTACK_THRESHOLD &&
      this.energy < this.maxE * WORLD_RULES.AUTO_RETRACT_ENERGY_FRACTION &&
      this.owner !== 0
    ) {
      this.autoRetract = true;
    }
  }
}
