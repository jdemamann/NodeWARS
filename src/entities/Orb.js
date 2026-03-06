/* ================================================================
   NODE WARS v3 — Orb & FreeOrb with Object Pool
   Eliminates per-frame GC pressure from constant new Orb() allocation.
   ================================================================ */

import { bezPt, clamp } from '../utils.js';
import { CP, CE, ORB_IVB } from '../constants.js';

/* ── ORB (tentacle energy particle) ── */

export class Orb {
  constructor() { this._reset(); }

  _reset() {
    this.tent = null;
    this.rev  = false;
    this.pos  = 0;
    this.spd  = 0;
    this.dead = false;
  }

  init(tent, rev = false) {
    this.tent = tent;
    this.rev  = rev;
    this.pos  = rev ? 1 : 0;
    const fr  = Math.min(tent.flowRate / 18, 1);
    const base = (0.22 + (tent.rate - 6.5) * 0.009) * (1 + fr * 0.9);
    this.spd  = base * (rev ? -1 : 1);
    this.dead = false;
    return this;
  }

  update(dt) {
    this.pos += this.spd * dt;
    const s = this.tent.clashT != null ? this.tent.clashT : 1;
    if (!this.rev && this.pos >= s) this.dead = true;
    if ( this.rev && this.pos <= 0) this.dead = true;
  }

  draw(ctx) {
    const tn  = this.tent;
    const src = tn.reversed ? tn.target : tn.source;
    const tgt = tn.reversed ? tn.source : tn.target;
    const cp  = tn.getCP();
    const pos = bezPt(clamp(this.pos, 0, 1), src.x, src.y, cp.x, cp.y, tgt.x, tgt.y);
    const lvl = src.level;
    const col = src.owner === 1 ? CP[lvl] : CE[lvl];
    const sz  = 2 + lvl * 0.32 + (this.rev ? 0.7 : 0);

    const ramp  = Math.min(1, (tn.pipeAge || 0) / (tn.tt || 0.3));
    const alpha = (this.rev ? 0.6 : 0.9) * Math.max(0.15, ramp);

    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, sz, 0, Math.PI * 2);
    ctx.fillStyle   = col;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 7;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.restore();
  }
}

/* ── ORB POOL ── */

export class OrbPool {
  constructor(capacity = 150) {
    this._pool   = Array.from({ length: capacity }, () => new Orb());
    this._active = [];
  }

  get(tent, rev = false) {
    const o = this._pool.pop() || new Orb();
    o.init(tent, rev);
    this._active.push(o);
    return o;
  }

  update(dt) {
    let i = this._active.length;
    while (i--) {
      const o = this._active[i];
      o.update(dt);
      if (o.dead) {
        this._pool.push(o);
        this._active.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const o of this._active) o.draw(ctx);
  }

  /** Remove orbs belonging to a specific tent (called on tent death). */
  killForTent(tent) {
    let i = this._active.length;
    while (i--) {
      if (this._active[i].tent === tent) {
        this._pool.push(this._active[i]);
        this._active.splice(i, 1);
      }
    }
  }

  get count() { return this._active.length; }
}

/* ── FREE ORB (post-cut energy burst particle) ── */

export class FreeOrb {
  constructor(x, y, tx, ty, col, energy) {
    this.x = x; this.y = y;
    this.tx = tx; this.ty = ty;
    this.col = col; this.energy = energy;
    this.alive = true; this.age = 0;
    const d = Math.hypot(tx - x, ty - y) || 1;
    this.vx = (tx - x) / d * 280;
    this.vy = (ty - y) / d * 280;
  }

  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.hypot(this.tx - this.x, this.ty - this.y) < 8 || this.age > 2) this.alive = false;
    return this.alive;
  }

  draw(ctx) {
    const a = Math.max(0, 1 - this.age / 0.8);
    ctx.save();
    ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = this.col; ctx.globalAlpha = a * 0.9;
    ctx.shadowColor = this.col; ctx.shadowBlur = 8;
    ctx.fill(); ctx.restore();
  }
}

/* ── ORB SPAWNING LOGIC (used by Tent) ── */

/** Returns true if a new orb should spawn this frame, given dt and flow rate. */
export function shouldSpawnOrb(tent, dt) {
  const fr  = Math.min(tent.flowRate / 18, 1);
  const iv  = Math.max(0.07, ORB_IVB / (tent.rate / 7) * (1 - fr * 0.65));
  tent._orbTimer = (tent._orbTimer || 0) + dt;
  if (tent._orbTimer >= iv) { tent._orbTimer = 0; return true; }
  return false;
}
