/* ================================================================
   NODE WARS v3 — GNode (Game Node)

   Responsibilities: data model + physics update.
   Rendering is handled by NodeRenderer — no canvas calls here.

   Key fix: NodeType enum replaces the dual type/isRelay pattern.
   'r' (RELAY) now handles both roles — isRelay is a computed getter.
   ================================================================ */

import { NodeType, MAX_E, LVL_STEP, MAX_SLOTS } from '../constants.js';
import { elvl, erad, regenMult, baseRegen } from '../utils.js';
import { bus } from '../EventBus.js';

export class GNode {
  constructor(id, x, y, energy, owner, type = NodeType.NORMAL) {
    this.id     = id;
    this.x      = x;
    this.y      = y;
    this.maxE   = MAX_E;
    this.energy = energy;
    this.owner  = owner;
    this.type   = type;

    this.regen  = owner < 1 ? 0 : baseRegen();

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
    this.contest    = null;   // { 1: score, 2: score } for virgin capture
    this.autoRetract= false;
    this.inFog      = false;

    /* Tentacle counts — maintained incrementally by Game.updateOutCounts() */
    this.outCount   = 0;

    /* Cascade: energy available to push into tentacles this frame */
    this.availPower = 0;
    this.inFlow     = 0;

    /* Pulsar countdown (only relevant for NodeType.PULSAR) */
    this.spTimer    = type === NodeType.PULSAR ? 4 + Math.random() * 4 : 0;

    /* Bunker / Signal Tower properties */
    this.isBunker         = false;  // set by Game._applyBunkers
    this.captureThreshold = 20;     // overridden to 60 for bunkers; matches EMBRYO by default

    /* Level tracking for level-up event */
    this._prevLvl   = elvl(energy);
    /* Owner tracking for relay/signal capture events */
    this._prevOwner = owner;
  }

  /* ── Computed properties ── */
  get radius()  { return erad(this.energy); }
  get level()   { return elvl(this.energy); }
  get dispE()   { return Math.floor(this.energy); }
  get isRelay() { return this.type === NodeType.RELAY; }
  get maxSlots(){ return MAX_SLOTS[this.level]; }

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

    /* Energy regen */
    if (this.owner !== 0) {
      const scaledRegen = this.regen * regenMult(this.level);
      const boost       = (frenzyActive && this.owner === 1) ? 1.35 : 1.0;
      this.energy       = Math.min(this.maxE, this.energy + scaledRegen * boost * dt);
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
    if (this.underAttack > 0.88 && this.energy < this.maxE * 0.08 && this.owner !== 0) {
      this.autoRetract = true;
    }
  }
}
