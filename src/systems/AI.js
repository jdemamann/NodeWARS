/* ================================================================
   NODE WARS v3 — AI System

   Key improvement: personality is now a strategy object instead of
   inline conditionals. Scoring weights are named constants.
   ================================================================ */

import { MAX_SLOTS, NodeType, TentState } from '../constants.js';
import { vd, bldC, domR, defR } from '../utils.js';
import { Tent } from '../entities/Tent.js';
import { bus } from '../EventBus.js';

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
     Its signature move is _checkStrategicCuts() — bursting pipe energy
     directly into player nodes for instant captures. */
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
   * @param {object} cfg   — Level config (aiMs, dm, id, …)
   * @param {number} owner — Which owner this AI controls (2 = red, 3 = purple)
   */
  constructor(game, cfg, owner = 2) {
    this.game     = game;
    this.cfg      = cfg;
    this.owner    = owner;
    this._timer   = 0;
    this._interval= cfg.aiMs;
  }

  update(dt) {
    this._timer += dt;
    if (this._timer < this._interval) return;
    this._timer = 0;

    /* Adaptive speed: faster when player dominates, slower when AI winning */
    const g   = this.game;
    const pC  = g.nodes.filter(n => n.owner === 1).length;
    const aiC = g.nodes.filter(n => n.owner === this.owner).length;
    const playerAdv = (pC - aiC) / Math.max(1, g.nodes.length);
    const speedMult = Math.max(0.45, Math.min(1.65, 1 - playerAdv * 0.5));
    this._interval  = this.cfg.aiMs * speedMult * (0.76 + Math.random() * 0.48);

    /* Purple AI checks strategic cuts every tick (independent of _think timer) */
    if (this.owner === 3) this._checkStrategicCuts(g);

    this._think();
  }

  _think() {
    const g           = this.game;
    const dm          = this.cfg.dm;
    const defensive   = g.aiDefensive > 0;
    const pers        = personalityFor(this.cfg.id || 0, this.owner);
    const energyThresh= defensive ? 32 : pers.energyThreshold;

    /* Eligible sources: AI-owned, non-relay, enough energy, has free slots */
    const srcs = g.nodes.filter(n =>
      n.owner === this.owner && !n.isRelay &&
      n.energy > energyThresh &&
      n.outCount < MAX_SLOTS[n.level]
    );
    if (!srcs.length) return;

    const moves = [];

    srcs.forEach(src => {
      g.nodes.forEach(tgt => {
        if (tgt === src || tgt.type === NodeType.HAZARD || tgt.isRelay) return;
        /* Skip if link already exists */
        if (g.tents.some(t => t.alive && !t.reversed && t.source === src && t.target === tgt)) return;
        /* Recheck slot */
        if (src.outCount >= MAX_SLOTS[src.level]) return;

        const d   = vd(src.x, src.y, tgt.x, tgt.y);
        const tot = bldC(d) + d * dm;
        if (src.energy < tot + 1) return;

        const prox = 300 / (d + 60);
        let sc = 0;

        if (tgt.owner === 0) {
          const contest  = (tgt.contest?.[1]) || 0;
          sc = 72 + prox + pers.expansionBonus - tgt.energy * 0.2 - contest * 1.8;
          if (defensive) sc *= pers.defensiveDampener;

        } else if (tgt.owner === 1) {
          const energyAdv = src.energy - tgt.energy;
          const underAtk  = g.tents.some(t => t.alive && t.source.owner === this.owner && t.target === tgt) ? 18 : 0;
          sc = (defensive ? 20 : 55) + energyAdv * 0.5 + prox + underAtk + pers.attackBonus;

        } else if (tgt.owner === this.owner) {
          if (tgt.energy < tgt.maxE * 0.5) sc = 22 + prox + pers.siegeBonus;
          if (defensive && tgt.energy < tgt.maxE * 0.4) sc = 55 + prox;
        }

        if (sc > 0) moves.push({ src, tgt, sc, cost: bldC(d) + d * dm });
      });
    });

    /* Pick top 2 non-conflicting moves */
    moves.sort((a, b) => b.sc - a.sc);
    const used = new Set();
    let picked = 0;

    for (const m of moves) {
      if (picked >= 2) break;
      if (used.has(m.src.id)) continue;
      used.add(m.src.id);
      const t = new Tent(m.src, m.tgt, m.cost);
      t.game  = g;
      /* If an active opposing tentacle already exists, skip growing — instant clash */
      const opposing = g.tents.find(o =>
        o.alive && o.state === TentState.ACTIVE &&
        o.es === m.tgt && o.et === m.src
      );
      if (opposing) t.activateImmediate();
      g.tents.push(t);
      picked++;
    }
  }

  /**
   * Purple AI (owner 3) strategic cut mechanic.
   *
   * For each active purple tentacle targeting a player node, check whether
   * the energy stored in the pipe (energyInPipe) is large enough to
   * overwhelm the target. If so, simulate a cut near the target (cutRatio 0.85)
   * to burst all pipe energy into the player node as damage — potentially
   * capturing it in a single decisive move, just like a skilled player cut.
   *
   * Trigger condition: pipe holds ≥ 65% of target's current energy.
   * This prevents wasteful cuts; the purple AI only cuts when it's worth it.
   */
  _checkStrategicCuts(g) {
    g.tents.forEach(t => {
      if (!t.alive || t.state !== TentState.ACTIVE) return;

      const src = t.es, tgt = t.et;
      if (src.owner !== 3 || tgt.owner !== 1) return;

      /* Only cut when the pipe is charged enough to be decisive */
      const pipe = t.energyInPipe || 0;
      if (pipe < tgt.energy * 0.65) return;

      /* Simulate cut at ratio 0.85 (near target): all pipe energy → target.
         Formula mirrors Game.checkSlice() burst path (actualCut > 0.7). */
      const dmg = pipe * 0.9 * domR(src.level) / defR(tgt.level);
      tgt.energy    -= dmg;
      tgt.underAttack = 1;

      if (tgt.energy <= 0) {
        const prevOwner = tgt.owner;
        tgt.owner  = src.owner;
        tgt.regen  = 0;
        tgt.energy = Math.abs(tgt.energy) * 0.10;
        tgt.cFlash = 1;
        tgt.contest = null;
        g.fogDirty  = true;
        bus.emit('node:owner_change', tgt, prevOwner);
        bus.emit('cell:lost', tgt);
        /* Retract all tentacles that now point the wrong way */
        g.tents.forEach(ot => {
          if (!ot.alive) return;
          if (ot.es === tgt && ot.et.owner !== src.owner) ot.kill();
          if (ot.et === tgt && ot.es.owner !== tgt.owner) ot.kill();
        });
      }

      /* Retract this tentacle — the burst is spent */
      t.kill();
    });
  }
}
