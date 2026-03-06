/* ================================================================
   NODE WARS v3 — Math & Geometry Utilities
   ================================================================ */

import { MAX_E, LVL_STEP, BUILD_B, BUILD_PX } from './constants.js';

/* ── MATH ── */
export const vd    = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const clamp = (v, lo, hi)      => Math.max(lo, Math.min(hi, v));
export const rnd   = (a, b)           => a + Math.random() * (b - a);

/* ── CELL PHYSICS ── */
export const elvl     = e  => clamp(Math.floor(e / LVL_STEP), 0, 5);
export const erad     = e  => 16 + (e / MAX_E) * 42;
export const bldC     = d  => BUILD_B + d * BUILD_PX;
export const maxRange = (e, dm) => Math.max(0, (e - BUILD_B) / (BUILD_PX + dm));

/** Attack efficiency: scales with fill % of cell. High fill = high pressure. */
export function efAtk(n) {
  const pct = n.energy / n.maxE;
  if (pct < 0.08) return 0.05 + pct * 0.50;
  return Math.max(0.12, clamp((pct - 0.04) / 0.55, 0, 1));
}

/** Damage multiplier per evolution level. Level 0=1.0, Level 5=2.1. */
export const domR      = lvl => 1 + lvl * 0.22;

/** Defense reduction per evolution level. Level 0=1.0, Level 5=1.6 (symmetric but milder). */
export const defR      = lvl => 1 + lvl * 0.12;

/** Wire efficiency: drops with distance (longer wire = more heat loss). */
export const wireEff   = d   => Math.max(0.55, 1 - d * 0.00045);

/** Travel time (s): how long for energy to cross the tentacle. */
export const travelT   = d   => Math.max(0.18, d / 160);

/** Regen scaling per level: level 0=1x, level 5=2.5x. */
export const regenMult = lvl => 1 + lvl * 0.30;

/** Random base regen for a freshly captured cell. */
export const baseRegen = ()  => 2.0 + Math.random() * 1.5;

/* ── GEOMETRY ── */

/** Segment-segment intersection test. Returns true if [a,b] intersects [c,d]. */
export function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const c   = d1x * d2y - d1y * d2x;
  if (Math.abs(c) < 1e-10) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / c;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / c;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Quadratic Bezier point at parameter t. */
export function bezPt(t, x0, y0, x1, y1, x2, y2) {
  const m = 1 - t;
  return { x: m * m * x0 + 2 * m * t * x1 + t * t * x2,
           y: m * m * y0 + 2 * m * t * y1 + t * t * y2 };
}

/** Find the t-parameter where a line segment crosses a Bezier curve. Returns -1 if no hit. */
export function findCutT(sx0, sy0, sx1, sy1, bx0, by0, cpx, cpy, bx1, by1) {
  let p = bezPt(0, bx0, by0, cpx, cpy, bx1, by1);
  for (let i = 1; i <= 24; i++) {
    const q = bezPt(i / 24, bx0, by0, cpx, cpy, bx1, by1);
    if (segX(sx0, sy0, sx1, sy1, p.x, p.y, q.x, q.y)) return (i - 0.5) / 24;
    p = q;
  }
  return -1;
}

/* ── CANVAS HELPERS ── */

/** Draw a regular polygon (or circle if sides < 3) centered at (x,y). */
export function poly(ctx, x, y, r, sides, a = 0) {
  ctx.beginPath();
  if (sides < 3) { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
  for (let i = 0; i <= sides; i++) {
    const ag = (i / sides) * Math.PI * 2 + a;
    i === 0
      ? ctx.moveTo(x + r * Math.cos(ag), y + r * Math.sin(ag))
      : ctx.lineTo(x + r * Math.cos(ag), y + r * Math.sin(ag));
  }
  ctx.closePath();
}

/** Draw a segment of a Bezier curve from t0 to t1 using N segments. */
export function drawBSeg(ctx, x0, y0, cx, cy, x1, y1, t0, t1, N = 16) {
  const p = bezPt(t0, x0, y0, cx, cy, x1, y1);
  ctx.moveTo(p.x, p.y);
  for (let i = 1; i <= N; i++) {
    const q = bezPt(t0 + (t1 - t0) * (i / N), x0, y0, cx, cy, x1, y1);
    ctx.lineTo(q.x, q.y);
  }
}

/** Draw a rounded rectangle path. r can be a number or { tl, tr, bl, br }. */
export function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl: r, tr: r, bl: r, br: r };
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br); ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl); ctx.quadraticCurveTo(x, y, x + r.tl, y);
}
