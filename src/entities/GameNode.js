/* ================================================================
   Game node entity

   Owns node-side simulation state such as energy, regen, level sync,
   and world-specialized flags. Rendering is handled by NodeRenderer.
   ================================================================ */

import { NodeType, GAMEPLAY_RULES } from '../config/gameConfig.js';
import { computeNodeRadius, computeStableNodeLevel } from '../math/simulationMath.js';
import { bus } from '../core/EventBus.js';
import { computeNodeDisplayRegenRate } from '../systems/EnergyBudget.js';
import {
  computeTentacleWarsGradeFromEnergy,
  getTentacleWarsMaxTentacleSlots,
} from '../tentaclewars/TwGradeTable.js';

const { progression: PROGRESSION_RULES, world: WORLD_RULES } = GAMEPLAY_RULES;

export class GameNode {
  constructor(id, x, y, energy, owner, type = NodeType.NORMAL) {
    this.id     = id;
    this.x      = x;
    this.y      = y;
    this.maxE   = 200;   // overridden per-level by Game.loadLevel via cfg.nodeEnergyCap
    this.energy = energy;
    this.owner  = owner;
    this.type   = type;

    this.regen  = 0; // legacy field retained for compatibility; live regen is tier-based

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
    this.contest    = null;   // { ownerId: rawScore } for neutral capture races; coalition summing is resolved by NeutralContest helpers
    this.autoRetract= false;
    this.inFog      = false;

    /* Tentacle counts — maintained incrementally by Game.updateOutCounts() */
    this.outCount   = 0;

    /* Per-frame flow bookkeeping */
    this.availPower = 0;
    this.inFlow     = 0;
    this.relayFeedBudget = 0;
    this.twOverflowBudget = 0;
    this.simulationMode = 'nodewars';

    /* Pulsar countdown (only relevant for NodeType.PULSAR) */
    this.spTimer    = type === NodeType.PULSAR ? 4 + Math.random() * 4 : 0;

    /* Bunker / Signal Tower properties */
    this.isBunker         = false;  // set by Game._applyBunkers
    this.captureThreshold = WORLD_RULES.DEFAULT_CAPTURE_THRESHOLD;

    /* Level tracking uses hysteresis so capped nodes do not thrash
       between adjacent levels when energy hovers around a threshold. */
    this._levelValue = computeStableNodeLevel(energy, this.maxE);
    this._prevLvl   = this._levelValue;
    /* Owner tracking for relay/signal capture events */
    this._prevOwner = owner;
  }

  /* ── Computed properties ── */
  get radius()  { return computeNodeRadius(this.energy, this.maxE); }
  get level()   { return this._levelValue; }
  get dispE()   { return Math.floor(this.energy); }
  get isRelay() { return this.type === NodeType.RELAY; }
  get maxSlots(){
    return this.simulationMode === 'tentaclewars'
      ? getTentacleWarsMaxTentacleSlots()
      : PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL[this.level];
  }

  syncLevelFromEnergy() {
    this._levelValue = this.simulationMode === 'tentaclewars'
      ? computeTentacleWarsGradeFromEnergy(this.energy, this._levelValue)
      : computeStableNodeLevel(this.energy, this.maxE, this._levelValue);
    this._prevLvl = this._levelValue;
  }

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

    /* Energy regen:
       Nodes regenerate by tier first.
       Tentacles then drain their share explicitly, so feeder nodes can stay flat,
       grow slowly, or drain depending on outgoing commitment and clash pressure. */
    if (this.owner !== 0) {
      if (this.energy < this.maxE) {
        this.energy = Math.min(this.maxE, this.energy + computeNodeDisplayRegenRate(this, frenzyActive) * dt);
      }
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
    const nextLevel = this.simulationMode === 'tentaclewars'
      ? computeTentacleWarsGradeFromEnergy(this.energy, this._levelValue)
      : computeStableNodeLevel(this.energy, this.maxE, this._levelValue);
    if (nextLevel > this._prevLvl) {
      this.lvlFlash = 1;
      bus.emit('node:levelup', this);
    }
    this._levelValue = nextLevel;
    this._prevLvl = nextLevel;

    /* Auto-retract: very low energy while under attack */
    if (
      this.simulationMode !== 'tentaclewars' &&
      this.underAttack > WORLD_RULES.AUTO_RETRACT_ATTACK_THRESHOLD &&
      this.energy < this.maxE * WORLD_RULES.AUTO_RETRACT_ENERGY_FRACTION &&
      this.owner !== 0
    ) {
      this.autoRetract = true;
    }
  }
}
