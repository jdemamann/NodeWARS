/* ================================================================
   NODE WARS v3 — Node Renderer

   Static methods: draw a single GameNode onto a 2D canvas context.
   All canvas calls are here; GameNode itself has zero draw logic.
   ================================================================ */

import { GAMEPLAY_RULES, NodeType, EMBRYO } from '../config/gameConfig.js';
import { ownerColor, ownerRelayCoreColor } from '../theme/ownerPalette.js';
import { computeEnergyLevel, maxRange } from '../math/simulationMath.js';
import { getContestContributorOwners, getDisplayContestEntries } from '../systems/NeutralContest.js';
import { drawPolygon } from './canvasPrimitives.js';
import { STATE } from '../core/GameState.js';
import { getCanvasCopyFont, getCanvasDisplayFont } from '../theme/uiFonts.js';

const { progression: PROGRESSION_RULES, render: RENDER_RULES } = GAMEPLAY_RULES;

const SIDES = [0,3,4,6,8,10];

function nodeCol(n) {
  return ownerColor(n.owner, n.level, '#5a6878');
}

function contestColor(owner, score) {
  return ownerColor(owner, computeEnergyLevel(score), '#93a0af');
}

function colorWithAlpha(hexColor, alpha) {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return hexColor;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function drawNodeHull(ctx, x, y, radius, sides, angle) {
  if (!sides || sides < 3) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    return;
  }
  drawPolygon(ctx, x, y, radius, sides, angle);
}

/** Apply shadow only when high-graphics mode is on. */
function sg(ctx, color, blur) {
  if (STATE.settings.graphicsMode === 'high') {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }
}

export class NodeRenderer {
  static draw(ctx, n, time, sel, dm, frenzyActive) {
    const fogAlpha = n.inFog ? 0.28 : 1.0;
    const highGraphics = STATE.settings.graphicsMode === 'high';
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
      RENDER_RULES.NODE.RANGE_RING_THRESHOLDS.forEach((threshold, index) => {
        const color = RENDER_RULES.NODE.RANGE_RING_COLORS[index];
        ctx.beginPath();
        ctx.arc(n.x, n.y, mr * threshold, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth   = threshold === 1 ? 1.8 : 1;
        ctx.setLineDash(threshold === 1 ? [5,4] : [2,10]);
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
      const maxT = PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL[lvl];
      const used = n.outCount;
      for (let i = 0; i < maxT; i++) {
        const a2 = (-Math.PI / 2) + (i / maxT) * Math.PI * 2;
        const rx = n.x + (r + RENDER_RULES.NODE.SLOT_RING_OFFSET_PX) * Math.cos(a2);
        const ry = n.y + (r + RENDER_RULES.NODE.SLOT_RING_OFFSET_PX) * Math.sin(a2);
        ctx.beginPath();
        ctx.arc(rx, ry, RENDER_RULES.NODE.SLOT_DOT_RADIUS_PX, 0, Math.PI * 2);
        ctx.fillStyle   = i < used ? '#00e5ff' : 'rgba(0,229,255,0.18)';
        ctx.globalAlpha = 0.85;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* Neutral capture ring.
       The main ring only shows the current leader against the node's real
       capture threshold so contested nodes never look falsely completed. */
    if (n.owner === 0 && n.contest && !n.inFog) {
      const captureThreshold = Math.max(1, n.captureThreshold || EMBRYO);
      const contestEntries = getDisplayContestEntries(n);
      const leadingEntry = contestEntries[0] || null;
      const leadingFraction = leadingEntry
        ? Math.min(1, leadingEntry.score / captureThreshold)
        : 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth   = 3;
      ctx.stroke();

      if (leadingEntry) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 5, -Math.PI / 2, -Math.PI / 2 + leadingFraction * Math.PI * 2);
        ctx.strokeStyle = contestColor(leadingEntry.owner, leadingEntry.score);
        ctx.lineWidth   = 3.5;
        sg(ctx, ctx.strokeStyle, 8);
        ctx.globalAlpha = 0.9;
        ctx.stroke();

        const contributorOwners = getContestContributorOwners(leadingEntry);
        if (contributorOwners.length > 1) {
          const secondaryOwner = contributorOwners.find(owner => owner !== leadingEntry.owner);
          if (secondaryOwner != null) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, r + 2, -Math.PI / 2, -Math.PI / 2 + leadingFraction * Math.PI * 2);
            ctx.strokeStyle = ownerColor(secondaryOwner, Math.min(n.level, 4), '#c040ff');
            ctx.lineWidth = 1.25;
            ctx.globalAlpha = 0.85;
            ctx.setLineDash([2.5, 4.5]);
            sg(ctx, ctx.strokeStyle, 5);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      contestEntries.slice(1).forEach((entry, index) => {
        const rivalFraction = Math.min(1, entry.score / captureThreshold);
        const startAngle = -Math.PI / 2 + index * 0.28;
        const color = contestColor(entry.owner, entry.score);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 9, startAngle, startAngle + rivalFraction * Math.PI * 1.4);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        sg(ctx, color, 5);
        ctx.stroke();
      });

      if (contestEntries.length > 1) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 11.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245,197,24,0.65)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      if (leadingEntry) {
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 1.1);
        const leadColor = contestColor(leadingEntry.owner, leadingEntry.score);
        glow.addColorStop(0, colorWithAlpha(leadColor, 0.22));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 0.92, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.globalAlpha = Math.min(0.45, 0.14 + leadingFraction * 0.2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.font          = getCanvasCopyFont(7);
      ctx.fillStyle     = contestEntries.length > 1 ? '#f5c518' : 'rgba(255,255,255,0.42)';
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      const pct         = Math.round(leadingFraction * 100);
      const label       = contestEntries.length > 1 ? `${pct}% ⚔` : (pct > 0 ? pct + '%' : '○');
      ctx.fillText(label, n.x, n.y + r + 13);
      ctx.restore();
    }

    /* Overflow glow */
    if (n.owner !== 0 && n.energy >= n.maxE * 0.94 && n.outCount > 0) {
      ctx.save();
      ctx.globalAlpha = 0.1 + Math.sin(time * 4 + n.pulse) * 0.07;
      sg(ctx, '#f5c518', 22);
      drawPolygon(ctx, n.x, n.y, r + 9, sides, ang);
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
      drawPolygon(ctx, n.x, n.y, r + 13, sides, ang);
      ctx.strokeStyle = atkCol;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.restore();
    }

    /* Critical combat warning for collapsing friendly nodes. */
    if (
      n.owner === 1 &&
      n.underAttack >= RENDER_RULES.NODE.CRITICAL_ATTACK_THRESHOLD &&
      n.energy <= n.maxE * RENDER_RULES.NODE.CRITICAL_ENERGY_FRACTION
    ) {
      const warningPulse = 0.55 + Math.sin(time * 10) * 0.35;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 18, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,61,90,${0.45 + warningPulse * 0.35})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      sg(ctx, '#ff3d5a', 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.font = getCanvasDisplayFont(8, 'bold');
      ctx.fillStyle = '#ffb0b8';
      ctx.globalAlpha = 0.75 + warningPulse * 0.2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CRIT', n.x, n.y - r - 20);
      ctx.restore();
    }

    /* Frenzy tint */
    if (frenzyActive && n.owner === 1) {
      ctx.save();
      ctx.globalAlpha = 0.5 * (0.3 + Math.sin(time * 15) * 0.15);
      sg(ctx, '#f5c518', 30);
      drawNodeHull(ctx, n.x, n.y, r * 1.8, sides, ang);
      ctx.fillStyle   = '#f5c518';
      ctx.fill();
      ctx.restore();
    }

    /* Ambient halo */
    ctx.save();
    ctx.globalAlpha = fogAlpha * (n.owner === 0 ? 0.09 : 0.18 + lvl * 0.05);
    sg(ctx, col, 22 + lvl * 8);
    drawNodeHull(ctx, n.x, n.y, r * 1.5, sides, ang);
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
      if (highGraphics) ctx.shadowBlur = 40;
      drawNodeHull(ctx, n.x, n.y, r * (1 + lf * 0.65), sides, ang);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.font         = getCanvasDisplayFont(Math.round(10 + lf * 6), 'bold');
      ctx.fillStyle    = col;
      ctx.globalAlpha  = lf * 0.95;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      if (highGraphics) ctx.shadowBlur = 20;
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
      drawNodeHull(ctx, n.x, n.y, r * (1 + n.cFlash * 0.9), sides, ang);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 4 * n.cFlash;
      ctx.stroke();
      ctx.restore();
    }

    /* Range flash (not-enough-energy indicator) */
    if (n.rFlash > 0) {
      ctx.save();
      ctx.globalAlpha = n.rFlash * 0.8;
      drawNodeHull(ctx, n.x, n.y, r + 8, sides, ang);
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
      drawNodeHull(ctx, n.x, n.y, r + 10, sides, ang + Math.sin(time * 2.8) * 0.14);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2;
      ctx.setLineDash([5,4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* Body fill */
    ctx.save();
    drawNodeHull(ctx, n.x, n.y, r, sides, ang);
    if (highGraphics) {
      const bodyGradient = ctx.createRadialGradient(n.x - r * 0.24, n.y - r * 0.28, r * 0.1, n.x, n.y, r * 1.06);
      bodyGradient.addColorStop(0, colorWithAlpha(col, n.owner === 0 ? 0.18 : 0.46));
      bodyGradient.addColorStop(0.55, colorWithAlpha(col, n.owner === 0 ? 0.07 : 0.22));
      bodyGradient.addColorStop(1, 'rgba(4,8,14,0.02)');
      ctx.fillStyle   = bodyGradient;
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle   = col;
      ctx.globalAlpha = n.owner === 0 ? 0.06 : 0.14 + lvl * 0.04;
    }
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth   = n.owner === 0 ? 1 : 1.5 + lvl * 0.34;
    ctx.globalAlpha = n.owner === 0 ? 0.24 : 0.88;
    ctx.stroke();
    ctx.restore();

    /* Core nucleus gives nodes more depth and makes stored energy feel alive. */
    const energyPct = n.maxE > 0 ? Math.max(0, Math.min(1, n.energy / n.maxE)) : 0;
    if (highGraphics) {
      ctx.save();
      const nucleusRadius = r * (n.owner === 0 ? 0.28 : 0.34 + energyPct * 0.08);
      const nucleusGradient = ctx.createRadialGradient(n.x - nucleusRadius * 0.18, n.y - nucleusRadius * 0.22, 0, n.x, n.y, nucleusRadius);
      nucleusGradient.addColorStop(0, colorWithAlpha('#ffffff', n.owner === 0 ? 0.16 : 0.28 + energyPct * 0.18));
      nucleusGradient.addColorStop(0.4, colorWithAlpha(col, n.owner === 0 ? RENDER_RULES.STYLE.NODE_NEUTRAL_CORE_ALPHA : RENDER_RULES.STYLE.NODE_CORE_GLOW_ALPHA));
      nucleusGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, nucleusRadius, 0, Math.PI * 2);
      ctx.fillStyle = nucleusGradient;
      ctx.globalAlpha = n.inFog ? 0.4 : 1;
      ctx.fill();
      ctx.restore();
    }

    /* Specular arc keeps the polygon from feeling flat. */
    if (highGraphics) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.82, -Math.PI * 0.86 + ang * 0.18, -Math.PI * 0.28 + ang * 0.18);
      ctx.strokeStyle = colorWithAlpha('#ffffff', RENDER_RULES.STYLE.NODE_SPECULAR_ALPHA);
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.globalAlpha = n.inFog ? 0.12 : 1;
      ctx.stroke();
      ctx.restore();
    }

    /* Inner polygon (lvl 2+) */
    if (lvl >= 2 && n.owner !== 0) {
      ctx.save();
      drawPolygon(ctx, n.x, n.y, r * 0.38, sides, -ang * 1.8);
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
      if (highGraphics) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.16 + pct * 0.22);
        ctx.lineWidth   = 1.1;
        ctx.globalAlpha = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    /* Energy number */
    const fs = Math.max(9, n.radius * 0.42);
    ctx.save();
    ctx.font          = getCanvasCopyFont(fs, 'bold');
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
      const mx = PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL[lvl];
      ctx.save();
      ctx.font          = getCanvasCopyFont(7);
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
      ctx.font         = getCanvasCopyFont(7);
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
    const rc = ownerColor(n.owner, Math.max(n.level, 2), '#40ffbb');
    const rb = n.owner !== 0;
    const highGraphics = STATE.settings.graphicsMode === 'high';
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
    rg2.addColorStop(0, ownerRelayCoreColor(n.owner));
    rg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = rg2;
    ctx.fill();

    if (highGraphics) {
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(time * 0.55);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const rr = r * 0.48;
        i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = colorWithAlpha(rc, 0.18);
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha('#ffffff', 0.18);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    if (!rb) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(64,255,187,0.45)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 6]);
      ctx.globalAlpha = fogAlpha * (0.45 + Math.sin(time * 4.2) * 0.15);
      ctx.stroke();
      ctx.setLineDash([]);
    }

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

      for (let i = 0; i < 3; i++) {
        const sweepAngle = time * 1.2 + (i / 3) * Math.PI * 2;
        const arrowRadius = r + 14;
        const arrowX = n.x + Math.cos(sweepAngle) * arrowRadius;
        const arrowY = n.y + Math.sin(sweepAngle) * arrowRadius;
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(sweepAngle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fillStyle = rc;
        ctx.globalAlpha = fogAlpha * 0.65;
        sg(ctx, rc, 8);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.font          = getCanvasDisplayFont(7, 'bold');
    ctx.fillStyle     = rc;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.globalAlpha   = fogAlpha * (n.inFog ? 0.3 : 1);
    ctx.fillText(n.isBunker && n.owner === 0 ? 'FORT' : 'RELAY', n.x, n.y);
    if (!n.inFog) {
      ctx.font = getCanvasCopyFont(6);
      ctx.fillStyle = rc;
      ctx.globalAlpha = fogAlpha * (rb ? 0.72 : 0.55);
      ctx.fillText(rb ? 'FLOW +' : 'CAPTURE', n.x, n.y + r + 13);
    }
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
    const highGraphics = STATE.settings.graphicsMode === 'high';

    /* ── Signal Tower ── */
    if (n.type === NodeType.SIGNAL) {
      const sigCol = n.owner === 1
        ? '#00ff88'
        : ownerColor(n.owner, Math.max(n.level, 2), '#f5c518');
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
      if (n.owner !== 0) {
        ctx.beginPath();
        ctx.arc(x, y, 46, 0, Math.PI * 2);
        ctx.strokeStyle = sigCol;
        ctx.lineWidth = 1.1;
        ctx.globalAlpha = fogA * 0.24;
        ctx.setLineDash([7, 9]);
        ctx.stroke();
        ctx.setLineDash([]);
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
      if (n.owner !== 0) {
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x, y - 12);
        ctx.lineTo(x + 12, y);
        ctx.lineTo(x, y + 12);
        ctx.closePath();
        ctx.strokeStyle = colorWithAlpha(sigCol, 0.28);
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      /* Label */
      ctx.font          = getCanvasDisplayFont(7, 'bold');
      ctx.fillStyle     = sigCol;
      ctx.globalAlpha   = fogA * (n.inFog ? 0.3 : 0.75);
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('SIGNAL', x, y + 22);
      if (n.owner !== 0) {
        ctx.font = getCanvasCopyFont(6);
        ctx.globalAlpha = fogA * 0.62;
        ctx.fillText('REVEAL', x, y + 31);
      }
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
        if (highGraphics) ctx.shadowBlur = 24;
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
      ctx.font          = getCanvasCopyFont(10, 'bold');
      ctx.fillStyle     = '#ff8090';
      ctx.globalAlpha   = 0.9;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('⊗', x, y);
      ctx.restore();
    }
  }
}
