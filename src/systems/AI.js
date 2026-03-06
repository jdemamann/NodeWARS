/* ================================================================
   NODE WARS v3 — AI System

   Key improvement: personality is now a strategy object instead of
   inline conditionals. Scoring weights are named constants.
   ================================================================ */

import { MAX_SLOTS, NodeType, TentState } from '../constants.js';
import { vd, bldC } from '../utils.js';
import { Tent } from '../entities/Tent.js';

/* ── AI PERSONALITY DEFINITIONS ── */
const PERSONALITIES = {
  expand: {
    expansionBonus:  22,
    attackBonus:      0,
    siegeBonus:       0,
    defensiveDampener: 0.5,
    energyThreshold:  22,
  },
  siege: {
    expansionBonus:   0,
    attackBonus:      0,
    siegeBonus:      18,
    defensiveDampener: 0.5,
    energyThreshold:  22,
  },
  aggressive: {
    expansionBonus:   0,
    attackBonus:     20,
    siegeBonus:       0,
    defensiveDampener: 0.5,
    energyThreshold:  22,
  },
};

function personalityFor(levelId) {
  if (levelId <= 3) return PERSONALITIES.expand;
  if (levelId <= 6) return PERSONALITIES.siege;
  return PERSONALITIES.aggressive;
}

export class AI {
  constructor(game, cfg) {
    this.game     = game;
    this.cfg      = cfg;
    this._timer   = 0;
    this._interval= cfg.aiMs;
  }

  update(dt) {
    this._timer += dt;
    if (this._timer < this._interval) return;
    this._timer = 0;

    /* Adaptive speed: faster when player dominates, slower when AI winning */
    const g = this.game;
    const pC = g.nodes.filter(n => n.owner === 1).length;
    const aiC= g.nodes.filter(n => n.owner === 2).length;
    const playerAdv = (pC - aiC) / Math.max(1, g.nodes.length);
    const speedMult = Math.max(0.45, Math.min(1.65, 1 - playerAdv * 0.5));
    this._interval  = this.cfg.aiMs * speedMult * (0.76 + Math.random() * 0.48);

    this._think();
  }

  _think() {
    const g           = this.game;
    const dm          = this.cfg.dm;
    const defensive   = g.aiDefensive > 0;
    const pers        = personalityFor(this.cfg.id || 0);
    const energyThresh= defensive ? 32 : pers.energyThreshold;

    /* Eligible sources: AI-owned, non-relay, enough energy, has free slots */
    const srcs = g.nodes.filter(n =>
      n.owner === 2 && !n.isRelay &&
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
          const underAtk  = g.tents.some(t => t.alive && t.source.owner === 2 && t.target === tgt) ? 18 : 0;
          sc = (defensive ? 20 : 55) + energyAdv * 0.5 + prox + underAtk + pers.attackBonus;

        } else if (tgt.owner === 2) {
          if (tgt.energy < tgt.maxE * 0.5) sc = 22 + prox + pers.siegeBonus;
          if (defensive && tgt.energy < tgt.maxE * 0.4) sc = 55 + prox;
        }

        if (sc > 0) moves.push({ src, tgt, sc, cost: bldC(d) });
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
}
