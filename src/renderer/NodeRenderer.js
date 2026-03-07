/* ================================================================
   NODE WARS v3 — Node Renderer

   Static methods: draw a single GNode onto a 2D canvas context.
   All canvas calls are here; GNode itself has zero draw logic.
   ================================================================ */

import { MAX_SLOTS, NodeType, EMBRYO } from '../constants.js';
import { elvl, maxRange, poly } from '../utils.js';
import { STATE } from '../GameState.js';

/* Colour palettes per level (0-5) */
const CP = ['#00b8d9','#00ccb8','#00e5ff','#55faff','#ffffff','#ffffaa'];
const CE = ['#c01830','#ee1e3e','#ff3d5a','#ff7090','#ffb8c8','#ffddee'];
const SIDES = [0,3,4,6,8,10];

function nodeCol(n) {
  if (n.owner === 1) return CP[Math.min(n.level, CP.length - 1)];
  if (n.owner === 2) return CE[Math.min(n.level, CE.length - 1)];
  return '#5a6878';
}

/** Apply shadow only when high-graphics mode is on. */
function sg(ctx, color, blur) {
  if (STATE.settings.highGraphics) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }
}

export class NodeRenderer {
  static draw(ctx, n, time, sel, dm, frenzyActive) {
    const fogAlpha = n.inFog ? 0.28 : 1.0;
    const lvl  = n.level;
    const sides= SIDES[lvl];
    const ang  = n.rot;
    const bp   = n.burstPulse || 0;
    const r    = n.radius * (1 + Math.sin(time * 2.2 + n.pulse) * 0.027 + bp * 0.18);

    /* ── RELAY node ── */
    if (n.isRelay) {
      NodeRenderer._drawRelay(ctx, n, r, ang, time, fogAlpha);
      return;
    }

    const col = nodeCol(n);

    /* Follicles */
    if (n.owner !== 0) {
      const fc = [4,7,11,15,20,28][Math.min(lvl, 5)];
      const fl = r * 0.38;
      ctx.save();
      for (let i = 0; i < fc; i++) {
        const base = (i / fc) * Math.PI * 2 + ang * 0.7;
        const wave = Math.sin(time * 3.1 + i * 1.38) * 0.27;
        const bx   = n.x + r * Math.cos(base),  by = n.y + r * Math.sin(base);
        const ex   = n.x + (r + fl) * Math.cos(base + wave), ey = n.y + (r + fl) * Math.sin(base + wave);
        const mx2  = n.x + (r + fl * 0.5) * Math.cos(base + wave * 0.5);
        const my2  = n.y + (r + fl * 0.5) * Math.sin(base + wave * 0.5);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(mx2, my2, ex, ey);
        ctx.strokeStyle  = col;
        ctx.lineWidth    = 0.65 + lvl * 0.11;
        ctx.globalAlpha  = fogAlpha * (0.26 + lvl * 0.07);
        sg(ctx, col, 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* Range ring when selected */
    if (n.selected && dm) {
      const mr = maxRange(n.energy, dm);
      ctx.save();
      [[0.33,'rgba(0,229,255,0.05)'],[0.66,'rgba(0,229,255,0.045)'],[1,'rgba(0,229,255,0.18)']].forEach(([f, c]) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, mr * f, 0, Math.PI * 2);
        ctx.strokeStyle = c;
        ctx.lineWidth   = f === 1 ? 1.8 : 1;
        ctx.setLineDash(f === 1 ? [5,4] : [2,10]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      if (mr > 30) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, mr, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,0.5)';
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
      const maxT = MAX_SLOTS[lvl], used = n.outCount;
      for (let i = 0; i < maxT; i++) {
        const a2 = (-Math.PI / 2) + (i / maxT) * Math.PI * 2;
        const rx = n.x + (r + 17) * Math.cos(a2);
        const ry = n.y + (r + 17) * Math.sin(a2);
        ctx.beginPath();
        ctx.arc(rx, ry, 2.8, 0, Math.PI * 2);
        ctx.fillStyle   = i < used ? '#00e5ff' : 'rgba(0,229,255,0.18)';
        ctx.globalAlpha = 0.85;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* Embryo capture arcs for virgin cells */
    if (n.owner === 0 && n.contest && !n.inFog) {
      const EMBRYO = 20; // matches constants.js
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth   = 3;
      ctx.stroke();
      let sA = -Math.PI / 2;
      [1, 2].forEach(ow => {
        const sc = n.contest[ow] || 0;
        if (sc <= 0) return;
        const frac = (sc / EMBRYO) * Math.PI * 2;
        const c    = ow === 1 ? CP[elvl(sc)] : CE[elvl(sc)];
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 5, sA, sA + frac);
        ctx.strokeStyle = c;
        ctx.lineWidth   = 3;
        sg(ctx, c, 8);
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        sA += frac;
      });
      ctx.restore();
      ctx.save();
      ctx.font          = '7px "Share Tech Mono"';
      ctx.fillStyle     = 'rgba(255,255,255,0.42)';
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      const maxContest  = Math.max(...Object.values(n.contest || {}).concat([0]));
      const EMBRYO_VAL  = 20;
      const pct         = Math.round((maxContest / EMBRYO_VAL) * 100);
      ctx.fillText(pct > 0 ? pct + '%' : '○', n.x, n.y + r + 13);
      ctx.restore();
    }

    /* Overflow glow */
    if (n.owner !== 0 && n.energy >= n.maxE * 0.94 && n.outCount > 0) {
      ctx.save();
      ctx.globalAlpha = 0.1 + Math.sin(time * 4 + n.pulse) * 0.07;
      sg(ctx, '#f5c518', 22);
      poly(ctx, n.x, n.y, r + 9, sides, ang);
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    /* Under-attack ring */
    if (n.underAttack > 0) {
      const atkCol = n.owner === 1 ? '#ff3d5a' : '#f5c518';
      ctx.save();
      ctx.globalAlpha = n.underAttack * 0.42;
      sg(ctx, atkCol, 26);
      poly(ctx, n.x, n.y, r + 13, sides, ang);
      ctx.strokeStyle = atkCol;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.restore();
    }

    /* Frenzy tint */
    if (frenzyActive && n.owner === 1) {
      ctx.save();
      ctx.globalAlpha = 0.5 * (0.3 + Math.sin(Date.now() * 0.015) * 0.15);
      sg(ctx, '#f5c518', 30);
      poly(ctx, n.x, n.y, r * 1.8, sides, ang);
      ctx.fillStyle   = '#f5c518';
      ctx.fill();
      ctx.restore();
    }

    /* Ambient halo */
    ctx.save();
    ctx.globalAlpha = fogAlpha * (n.owner === 0 ? 0.09 : 0.18 + lvl * 0.05);
    sg(ctx, col, 22 + lvl * 8);
    poly(ctx, n.x, n.y, r * 1.5, sides, ang);
    ctx.fillStyle   = col;
    ctx.fill();
    ctx.restore();

    /* Level-up flash */
    if (n.lvlFlash > 0) {
      const lf = n.lvlFlash;
      ctx.save();
      ctx.globalAlpha = lf * 0.7;
      sg(ctx, col, 50);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * (1 + lf * 1.2), 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.globalAlpha = lf * 0.9;
      if (STATE.settings.highGraphics) ctx.shadowBlur = 40;
      poly(ctx, n.x, n.y, r * (1 + lf * 0.65), sides, ang);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.font         = `bold ${Math.round(10 + lf * 6)}px 'Orbitron',sans-serif`;
      ctx.fillStyle    = col;
      ctx.globalAlpha  = lf * 0.95;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      if (STATE.settings.highGraphics) ctx.shadowBlur = 20;
      ctx.fillText('LVL ' + (lvl + 1), n.x, n.y - r - 18 - lf * 10);
      ctx.restore();
    }

    /* Shield flash */
    if (n.shieldFlash > 0) {
      const sf = n.shieldFlash;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 8 + sf * 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth   = 2.5;
      ctx.globalAlpha = sf * 0.8;
      sg(ctx, '#f5c518', 14 * sf);
      ctx.stroke();
      ctx.restore();
    }

    /* Capture flash */
    if (n.cFlash > 0) {
      ctx.save();
      ctx.globalAlpha = n.cFlash * 0.72;
      poly(ctx, n.x, n.y, r * (1 + n.cFlash * 0.9), sides, ang);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 4 * n.cFlash;
      ctx.stroke();
      ctx.restore();
    }

    /* Range flash (not-enough-energy indicator) */
    if (n.rFlash > 0) {
      ctx.save();
      ctx.globalAlpha = n.rFlash * 0.8;
      poly(ctx, n.x, n.y, r + 8, sides, ang);
      ctx.strokeStyle = '#ff3d5a';
      ctx.lineWidth   = 2.5;
      sg(ctx, '#ff3d5a', 12);
      ctx.stroke();
      ctx.restore();
    }

    /* Selection dashed ring */
    if (n.selected) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(time * 7) * 0.45;
      poly(ctx, n.x, n.y, r + 10, sides, ang + Math.sin(time * 2.8) * 0.14);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2;
      ctx.setLineDash([5,4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* Body fill */
    ctx.save();
    poly(ctx, n.x, n.y, r, sides, ang);
    ctx.fillStyle   = col;
    ctx.globalAlpha = n.owner === 0 ? 0.05 : 0.12 + lvl * 0.04;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth   = n.owner === 0 ? 1 : 1.5 + lvl * 0.34;
    ctx.globalAlpha = n.owner === 0 ? 0.24 : 0.88;
    ctx.stroke();
    ctx.restore();

    /* Inner polygon (lvl 2+) */
    if (lvl >= 2 && n.owner !== 0) {
      ctx.save();
      poly(ctx, n.x, n.y, r * 0.38, sides, -ang * 1.8);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1;
      ctx.globalAlpha = 0.17 + lvl * 0.07;
      ctx.stroke();
      ctx.restore();
    }

    /* Energy arc */
    if (n.owner !== 0) {
      const pct = n.energy / n.maxE;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.68, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2.5;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.restore();
    }

    /* Energy number */
    const fs = Math.max(9, n.radius * 0.42);
    ctx.save();
    ctx.font          = `bold ${fs}px "Share Tech Mono"`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = col;
    ctx.globalAlpha   = n.inFog ? 0 : (n.owner === 0 ? 0.36 : 1);
    sg(ctx, col, 5);
    if (!n.inFog) ctx.fillText(n.dispE, n.x, n.y);
    ctx.restore();

    /* Level dots */
    if (lvl > 0) {
      const dw = (lvl - 1) * 7;
      for (let i = 0; i < lvl; i++) {
        ctx.beginPath();
        ctx.arc(n.x - dw / 2 + i * 7, n.y + r + 8, 2.2, 0, Math.PI * 2);
        ctx.fillStyle   = col;
        ctx.globalAlpha = 0.7;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* Out-count indicator */
    if (n.owner !== 0 && n.outCount > 0) {
      const mx = MAX_SLOTS[lvl];
      ctx.save();
      ctx.font          = '7px "Share Tech Mono"';
      ctx.fillStyle     = n.outCount >= mx ? '#f5c518' : col;
      ctx.globalAlpha   = 0.6;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('\u2192' + n.outCount + '/' + mx, n.x, n.y - r - 10);
      ctx.restore();
    }

    /* Bunker node: golden fortress ring (unowned only — once captured it loses the ring) */
    if (n.isBunker && n.owner === 0) {
      const pulse = 0.65 + Math.sin(time * 2.3 + n.pulse) * 0.35;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a  = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const rr = r + 14;
        ctx.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth   = 2;
      ctx.globalAlpha = fogAlpha * 0.7 * pulse;
      sg(ctx, '#f5c518', 10);
      ctx.stroke();
      ctx.shadowBlur  = 0;
      /* Capture progress fraction against reinforced threshold */
      const thresh  = n.captureThreshold || EMBRYO;
      const maxScore= Math.max(...Object.values(n.contest || {}).concat([0]));
      if (maxScore > 0) {
        const frac = Math.min(1, maxScore / thresh);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.strokeStyle = '#f5c518';
        ctx.lineWidth   = 2.5;
        ctx.globalAlpha = fogAlpha * 0.85;
        ctx.stroke();
      }
      ctx.font         = '7px "Share Tech Mono"';
      ctx.fillStyle    = '#f5c518';
      ctx.globalAlpha  = fogAlpha * 0.65;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FORT', n.x, n.y + r + 16);
      ctx.restore();
    }

    /* Hazard / special type overlays */
    NodeRenderer._drawSpecial(ctx, n, time);
  }

  /* ── Relay node visual ── */
  static _drawRelay(ctx, n, r, ang, time, fogAlpha) {
    const rc = n.owner === 1 ? '#00e5ff' : n.owner === 2 ? '#ff4060' : '#40ffbb';
    const rb = n.owner !== 0;
    ctx.save();
    ctx.globalAlpha = fogAlpha;

    /* Outer hex ring */
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a  = ang + (i / 6) * Math.PI * 2;
      const rr = r + 10;
      ctx.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.strokeStyle = rc;
    ctx.lineWidth   = 2.5;
    sg(ctx, rc, 14 + Math.sin(time * 3) * 4);
    ctx.stroke();
    ctx.shadowBlur  = 0;

    /* Inner gradient fill */
    const rg2 = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
    rg2.addColorStop(0, n.owner === 1 ? 'rgba(0,229,255,0.55)' : n.owner === 2 ? 'rgba(255,40,80,0.45)' : 'rgba(60,255,180,0.25)');
    rg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = rg2;
    ctx.fill();

    /* Rotating boost particles when captured */
    if (rb) {
      for (let i = 0; i < 4; i++) {
        const a  = (i / 4) * Math.PI * 2 + time * 1.5;
        const ar = r * 0.45;
        const ax = n.x + Math.cos(a) * ar;
        const ay = n.y + Math.sin(a) * ar;
        ctx.beginPath();
        ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
        ctx.fillStyle   = rc;
        ctx.globalAlpha = fogAlpha * (0.5 + Math.sin(time * 3 + i) * 0.4);
        ctx.fill();
      }
    }

    ctx.font          = 'bold 7px "Orbitron",sans-serif';
    ctx.fillStyle     = rc;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.globalAlpha   = fogAlpha * (n.inFog ? 0.3 : 1);
    ctx.fillText(n.isBunker && n.owner === 0 ? 'FORT' : 'RELAY', n.x, n.y);
    ctx.restore();

    /* Relay Fortress: golden outer ring when still neutral */
    if (n.isBunker && n.owner === 0) {
      const pulse = 0.65 + Math.sin(time * 2.3 + (n.pulse || 0)) * 0.35;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 18, 0, Math.PI * 2);
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth   = 2;
      ctx.globalAlpha = fogAlpha * 0.6 * pulse;
      ctx.setLineDash([6, 6]);
      sg(ctx, '#f5c518', 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur  = 0;
      ctx.restore();
    }
  }

  /* ── Hazard / pulsar type node overlays ── */
  static _drawSpecial(ctx, n, t) {
    const x = n.x, y = n.y;
    const fl = n.spFlash || 0;

    /* ── Signal Tower ── */
    if (n.type === NodeType.SIGNAL) {
      const sigCol = n.owner === 1 ? '#00ff88' : n.owner === 2 ? '#ff4060' : '#f5c518';
      const fogA   = n.inFog ? 0.28 : 1.0;
      ctx.save();
      /* 3 expanding signal rings emanating outward */
      for (let ri = 0; ri < 3; ri++) {
        const phase  = ((t * 0.55 + ri * 0.333) % 1.0);
        const rr     = 8 + phase * 36;
        const alpha  = (1 - phase) * 0.45;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = sigCol;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = fogA * alpha;
        ctx.stroke();
      }
      /* Core dot */
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      const sg2 = ctx.createRadialGradient(x, y, 0, x, y, 8);
      sg2.addColorStop(0, sigCol);
      sg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle   = sg2;
      ctx.globalAlpha = fogA * 0.9;
      sg(ctx, sigCol, 14);
      ctx.fill();
      ctx.shadowBlur  = 0;
      /* 4 radiating antenna lines */
      for (let i = 0; i < 4; i++) {
        const a  = (i / 4) * Math.PI * 2 + t * 0.45;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
        ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
        ctx.strokeStyle = sigCol;
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = fogA * 0.55;
        sg(ctx, sigCol, 6);
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }
      /* Label */
      ctx.font          = 'bold 7px "Orbitron",sans-serif';
      ctx.fillStyle     = sigCol;
      ctx.globalAlpha   = fogA * (n.inFog ? 0.3 : 0.75);
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('SIGNAL', x, y + 22);
      ctx.restore();
      return;
    }

    if (n.type === NodeType.HAZARD) {
      ctx.save();
      for (let ri = 0; ri < 3; ri++) {
        const rr = 16 + ri * 12;
        const a0 = t * (0.9 + ri * 0.35) * (ri % 2 ? -1 : 1);
        ctx.beginPath();
        for (let i = 0; i <= 32; i++) {
          const a  = a0 + (i / 32) * Math.PI * 2;
          const rs = rr + Math.sin(i * 1.2 + t * 3) * 3;
          i === 0 ? ctx.moveTo(x + Math.cos(a) * rs, y + Math.sin(a) * rs)
                  : ctx.lineTo(x + Math.cos(a) * rs, y + Math.sin(a) * rs);
        }
        ctx.strokeStyle = ri === 0 ? '#ff1a3a' : ri === 1 ? '#880015' : '#440008';
        ctx.lineWidth   = 1.8 - ri * 0.4;
        sg(ctx, '#ff0020', 10 + ri * 5);
        ctx.globalAlpha = 0.55 - ri * 0.1;
        ctx.stroke();
      }
      if (fl > 0) {
        ctx.beginPath();
        ctx.arc(x, y, 52, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff3d5a';
        ctx.lineWidth   = 2;
        ctx.globalAlpha = fl * 0.7;
        if (STATE.settings.highGraphics) ctx.shadowBlur = 24;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, 'rgba(200,10,30,.95)');
      g.addColorStop(1, 'rgba(8,0,4,.8)');
      ctx.fillStyle   = g;
      ctx.globalAlpha = 0.95;
      sg(ctx, '#ff0020', 16);
      ctx.fill();
      ctx.font          = 'bold 10px monospace';
      ctx.fillStyle     = '#ff8090';
      ctx.globalAlpha   = 0.9;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('⊗', x, y);
      ctx.restore();
    }
  }
}
