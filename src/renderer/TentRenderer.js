/* ================================================================
   NODE WARS v3 — Tentacle Renderer

   Static methods: draw a single Tent (plus its orbs) onto a 2D
   canvas context. All canvas calls live here; Tent has no draw
   logic of its own.
   ================================================================ */

import { TentState } from '../constants.js';
import { bezPt, drawBSeg } from '../utils.js';
import { STATE } from '../GameState.js';

/* Build a filled tapered polygon along a quadratic bezier.
   t0..t1 is the visible range; widthBase/widthTip are half-widths at each end. */
function drawTaperedPath(ctx, sx, sy, cpx, cpy, ex, ey, t0, t1, widthBase, widthTip) {
  const N    = 12;
  const left = [], right = [];
  const dt   = (t1 - t0) * 0.001;
  for (let i = 0; i <= N; i++) {
    const tv = t0 + (t1 - t0) * (i / N);
    const pt = bezPt(tv, sx, sy, cpx, cpy, ex, ey);
    const tA = bezPt(Math.max(0, tv - dt), sx, sy, cpx, cpy, ex, ey);
    const tB = bezPt(Math.min(1, tv + dt), sx, sy, cpx, cpy, ex, ey);
    const txv = tB.x - tA.x, tyv = tB.y - tA.y;
    const tlen = Math.hypot(txv, tyv) || 1;
    const nx = -tyv / tlen, ny = txv / tlen;
    const w  = widthBase + (widthTip - widthBase) * (i / N);
    left.push( { x: pt.x + nx * w, y: pt.y + ny * w });
    right.push({ x: pt.x - nx * w, y: pt.y - ny * w });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i <= N; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = N; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
}

const CP = ['#00b8d9','#00ccb8','#00e5ff','#55faff','#ffffff','#ffffaa'];
const CE = ['#c01830','#ee1e3e','#ff3d5a','#ff7090','#ffb8c8','#ffddee'];

function tentCol(tent) {
  const src = tent.reversed ? tent.target : tent.source;
  const lvl = src.level;
  return src.owner === 1 ? CP[Math.min(lvl, CP.length - 1)]
                         : CE[Math.min(lvl, CE.length - 1)];
}

/** Apply shadow only when high-graphics mode is on. */
function sg(ctx, color, blur) {
  if (STATE.settings.highGraphics) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }
}

export class TentRenderer {
  static draw(ctx, t) {
    if (t.state === TentState.DEAD) return;

    const s   = t.source, tg = t.target;
    const cp  = t.getCP();
    const esx = t.reversed ? tg.x : s.x, esy = t.reversed ? tg.y : s.y;
    const etx = t.reversed ? s.x : tg.x, ety = t.reversed ? s.y : tg.y;
    const src = t.reversed ? tg : s;
    const lvl = src.level;
    const col = tentCol(t);

    const isClash = t.clashT != null;
    const atk     = s.owner !== tg.owner;
    const isRev   = t.reversed;
    const visEnd  = isClash ? (isRev ? 1 - t.clashT : t.clashT) : t.reachT;
    const isGrow  = t.state === TentState.GROWING;
    const isAnim  = isGrow || t.state === TentState.RETRACTING;
    const isAdv   = t.state === TentState.ADVANCING;

    /* Low-efficiency dim overlay */
    if (t.eff < 0.79 && t.state === TentState.ACTIVE && !isClash) {
      ctx.save();
      ctx.beginPath();
      drawBSeg(ctx, esx, esy, cp.x, cp.y, etx, ety, 0, visEnd);
      ctx.strokeStyle = 'rgba(245,197,24,0.09)';
      ctx.lineWidth   = 5;
      ctx.stroke();
      ctx.restore();
    }

    /* Reversed dashed overlay */
    if (isRev && (t.state === TentState.ACTIVE || t.state === TentState.ADVANCING)) {
      ctx.save();
      ctx.beginPath();
      drawBSeg(ctx, esx, esy, cp.x, cp.y, etx, ety, 0.02, visEnd * 0.98);
      ctx.strokeStyle = 'rgba(245,197,24,0.22)';
      ctx.lineWidth   = 3;
      ctx.setLineDash([3,6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* Flow intensity */
    const FR      = Math.min(t.flowRate / 18, 1);
    const glowW   = 10 + FR * 14;
    const glowA   = (0.055 + lvl * 0.014) + FR * 0.12;
    const glowBlur= 16 + FR * 24;

    ctx.save();
    ctx.beginPath();
    drawBSeg(ctx, esx, esy, cp.x, cp.y, etx, ety, 0, visEnd);
    ctx.strokeStyle  = col;
    ctx.lineWidth    = glowW;
    ctx.globalAlpha  = glowA;
    sg(ctx, col, glowBlur);
    ctx.stroke();
    ctx.restore();

    /* Growing tip */
    if (isGrow && t.reachT > 0) {
      const tipPt    = bezPt(visEnd, esx, esy, cp.x, cp.y, etx, ety);
      const costProg = t.paidCost / Math.max(0.01, t.buildCost);
      const tipPulse = 0.7 + Math.sin(Date.now() * 0.022) * 0.3;
      ctx.save();
      ctx.beginPath();
      ctx.arc(tipPt.x, tipPt.y, 5 + lvl * 0.5, 0, Math.PI * 2);
      ctx.fillStyle   = col;
      ctx.globalAlpha = tipPulse * 0.9;
      sg(ctx, col, 14);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tipPt.x, tipPt.y, (8 + lvl) * (1 - costProg * 0.5), 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = tipPulse * 0.4 * (1 - costProg);
      ctx.stroke();
      ctx.restore();
    }

    /* High-flow bright inner glow */
    if (FR > 0.15 && t.state === TentState.ACTIVE) {
      ctx.save();
      ctx.beginPath();
      drawBSeg(ctx, esx, esy, cp.x, cp.y, etx, ety, 0.02, visEnd * 0.98);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 + FR * 0.28) + ')';
      ctx.lineWidth   = 1 + FR * 2.5;
      ctx.globalAlpha = 1;
      sg(ctx, '#fff', 8 + FR * 16);
      ctx.stroke();
      ctx.restore();
    }

    /* Tapered core body */
    const baseW  = isAnim ? 1.1 : (isAdv ? 2 + lvl * 0.4 : atk && !isRev ? 1.8 + lvl * 0.28 : 1.3);
    const baseA  = isAnim ? 0.48 : (isAdv ? 0.95 : atk && !isRev ? 0.88 : 0.5);
    const fullW  = baseW + FR * (atk ? 2.5 : 1.5);
    const alpha  = baseA + FR * (atk ? 0.08 : 0.18);
    /* Half-widths: thick at base, tapered at tip */
    const wBase  = fullW * (isAnim ? 0.8 : 1.2);
    const wTip   = Math.max(0.35, fullW * 0.18);
    ctx.save();
    if (!atk || isRev) {
      /* Friendly / reversed: dashed bezier stroke — replaces expensive segment loop */
      ctx.beginPath();
      drawBSeg(ctx, esx, esy, cp.x, cp.y, etx, ety, 0, visEnd);
      ctx.strokeStyle    = col;
      ctx.lineWidth      = wBase * 2;
      ctx.globalAlpha    = alpha;
      ctx.setLineDash([15, 8]);
      ctx.lineDashOffset = -(Date.now() * 0.025 % 23);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    } else {
      drawTaperedPath(ctx, esx, esy, cp.x, cp.y, etx, ety, 0, visEnd, wBase, wTip);
      ctx.fillStyle   = col;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.restore();

    /* Non-active tip dot */
    if (t.state !== TentState.ACTIVE) {
      const tip   = bezPt(visEnd, esx, esy, cp.x, cp.y, etx, ety);
      const sz    = (isAdv ? 4.5 : 3.5) + lvl * 0.65;
      const pulse = 0.8 + Math.sin(Date.now() * 0.009) * 0.22;
      ctx.save();
      if (isAdv) {
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, sz * 2.2 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45;
        sg(ctx, col, 22); ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, sz * 1.8 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.28;
      sg(ctx, col, 14); ctx.stroke();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = 0.93;
      if (STATE.settings.highGraphics) ctx.shadowBlur = 20;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, sz * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.88;
      if (STATE.settings.highGraphics) ctx.shadowBlur = 6;
      ctx.fill();
      for (let ri = 0; ri < 2; ri++) {
        const ph = Date.now() * 0.006 + ri * Math.PI;
        const rs = sz * (1.1 + 0.7 * Math.abs(Math.sin(ph)));
        ctx.beginPath(); ctx.arc(tip.x, tip.y, rs, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.2 * Math.abs(Math.cos(ph)); ctx.stroke();
      }
      ctx.restore();
    }

    /* Direction arrow + REV label */
    if ((t.state === TentState.ACTIVE || t.state === TentState.ADVANCING) && !isClash) {
      const ap = isAdv ? visEnd * 0.94 : 0.94;
      const p1 = bezPt(ap - 0.09, esx, esy, cp.x, cp.y, etx, ety);
      const p2 = bezPt(ap,        esx, esy, cp.x, cp.y, etx, ety);
      const ag = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const as = 5.5 + lvl * 1.3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - as * Math.cos(ag - 0.45), p2.y - as * Math.sin(ag - 0.45));
      ctx.lineTo(p2.x - as * Math.cos(ag + 0.45), p2.y - as * Math.sin(ag + 0.45));
      ctx.closePath();
      ctx.fillStyle   = col;
      ctx.globalAlpha = isAdv ? 1 : 0.88;
      ctx.fill();
      if (isRev) {
        const mid = bezPt(0.5, esx, esy, cp.x, cp.y, etx, ety);
        ctx.font          = '8px "Share Tech Mono"';
        ctx.fillStyle     = '#f5c518';
        ctx.globalAlpha   = 0.78;
        ctx.textAlign     = 'center';
        ctx.textBaseline  = 'middle';
        ctx.fillText('REV', mid.x, mid.y - 10);
      }
      ctx.restore();
    }

    /* Clash: tug-of-war front line spark */
    if (isClash) {
      const ct    = isRev ? 1 - t.clashT : t.clashT;
      const sp    = bezPt(ct, esx, esy, cp.x, cp.y, etx, ety);
      const spark = t.clashSpark;
      const now   = Date.now();

      ctx.save();

      /* Pulsing outer ring */
      const pulse = 0.65 + Math.sin(now * 0.008) * 0.35;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, (14 + spark * 8) * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 1.5;
      ctx.globalAlpha = spark * 0.55 * pulse;
      sg(ctx, '#f5c518', 28);
      ctx.stroke();

      /* Mid ring */
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 7 + spark * 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.globalAlpha = spark * 0.72;
      sg(ctx, '#fff', 14);
      ctx.stroke();

      /* Core hot dot */
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3.5 + spark * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.92;
      if (STATE.settings.highGraphics) ctx.shadowBlur = 16;
      ctx.fill();

      /* 8 spark rays, rotating */
      const rayLen = 10 + spark * 12;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + now * 0.004;
        const r0 = 4, r1 = r0 + rayLen * (0.5 + spark * 0.5);
        ctx.beginPath();
        ctx.moveTo(sp.x + r0 * Math.cos(a), sp.y + r0 * Math.sin(a));
        ctx.lineTo(sp.x + r1 * Math.cos(a), sp.y + r1 * Math.sin(a));
        ctx.strokeStyle = i % 2 === 0 ? '#f5c518' : col;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = spark * 0.55;
        sg(ctx, '#f5c518', 10);
        ctx.stroke();
      }

      /* CLASH label (only from one side to avoid duplicate — draw from non-reversed only) */
      if (!isRev) {
        ctx.font = '7px "Share Tech Mono"';
        ctx.fillStyle = '#f5c518';
        ctx.globalAlpha = 0.78 + Math.sin(now * 0.006) * 0.22;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        sg(ctx, '#f5c518', 8);
        ctx.fillText('CLASH', sp.x, sp.y - 18);
      }

      ctx.restore();
    }

    /* Overflow cascade indicator */
    if (t.state === TentState.ACTIVE && !isClash && t.es.energy >= t.es.maxE * 0.93) {
      const mp = bezPt(0.5, esx, esy, cp.x, cp.y, etx, ety);
      ctx.font         = '9px "Share Tech Mono"';
      ctx.fillStyle    = '#f5c518';
      ctx.globalAlpha  = 0.52 + Math.sin(Date.now() * 0.005) * 0.3;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u00bb', mp.x, mp.y - 10);
      ctx.globalAlpha  = 1;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    /* Pipe fill arc indicator */
    if (t.state === TentState.ACTIVE && t.pipeAge < t.tt * 1.1 && t.energyInPipe > 0.05) {
      const fillRatio = Math.min(1, t.energyInPipe / t.pCap);
      const rampPct   = Math.min(1, t.pipeAge / t.tt);
      const fadeOut   = 1 - Math.max(0, (rampPct - 0.85) / 0.25);
      const arcAlpha  = 0.65 * fadeOut;
      if (arcAlpha > 0.02) {
        const tgtR   = t.et.radius;
        const arcSpan= fillRatio * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(etx, ety, tgtR + 7, -Math.PI / 2, -Math.PI / 2 + arcSpan);
        ctx.strokeStyle = col;
        ctx.lineWidth   = 3;
        ctx.globalAlpha = arcAlpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    /* Cut spark */
    if (t.cutFlash > 0 && t.cutPoint !== undefined) {
      const cp2 = t.getCP();
      const sp  = bezPt(t.cutPoint, esx, esy, cp2.x, cp2.y, etx, ety);
      const alpha = t.cutFlash;
      const r2    = 18 + alpha * 14;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,197,24,' + (alpha * 0.18) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r2 * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.9) + ')';
      sg(ctx, '#f5c518', 20 * alpha);
      ctx.fill();
      for (let a = 0; a < 6; a++) {
        const ang2 = a * Math.PI / 3 + t.age * 4;
        const len  = 8 + alpha * 12;
        ctx.beginPath();
        ctx.moveTo(sp.x + Math.cos(ang2) * 4, sp.y + Math.sin(ang2) * 4);
        ctx.lineTo(sp.x + Math.cos(ang2) * len, sp.y + Math.sin(ang2) * len);
        ctx.strokeStyle = 'rgba(245,197,24,' + (alpha * 0.8) + ')';
        ctx.lineWidth   = 1.5;
        if (STATE.settings.highGraphics) ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
