/* ================================================================
   Hazard renderer

   Draws vortex hazards and pulsar beacons.
   ================================================================ */

import { STATE } from '../core/GameState.js';
import { getCanvasCopyFont, getCanvasDisplayFont } from '../theme/uiFonts.js';

/** Apply shadow only when high-graphics mode is on. */
function sg(ctx, color, blur) {
  if (STATE.settings.graphicsMode === 'high') {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }
}

export class HazardRenderer {
  /* Draws the static TentacleWars campaign obstacle family. */
  static drawTentacleWarsObstacle(ctx, obstacle, time = 0) {
    if (obstacle.kind === 'capsule') {
      HazardRenderer._drawTentacleWarsCapsule(ctx, obstacle);
      return;
    }
    HazardRenderer._drawTentacleWarsCircle(ctx, obstacle, time);
  }

  /* Draws the static circular obstacle shell used in early TW layouts. */
  static _drawTentacleWarsCircle(ctx, obstacle, time = 0) {
    const pulse = 0.62 + Math.sin(time * 1.7 + obstacle.x * 0.01) * 0.08;
    ctx.save();
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      obstacle.x,
      obstacle.y,
      obstacle.r * 0.15,
      obstacle.x,
      obstacle.y,
      obstacle.r,
    );
    gradient.addColorStop(0, 'rgba(28,42,56,0.42)');
    gradient.addColorStop(0.7, 'rgba(16,26,38,0.28)');
    gradient.addColorStop(1, 'rgba(10,18,28,0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(112, 196, 214, ${0.36 * pulse})`;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.09 * pulse})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  /* Draws a static capsule blocker to match the authored TW obstacle spec. */
  static _drawTentacleWarsCapsule(ctx, obstacle) {
    const { ax, ay, bx, by, r } = obstacle;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) return;

    const nx = -dy / len;
    const ny = dx / len;
    const startAngle = Math.atan2(ny, nx);
    const endAngle = startAngle + Math.PI;

    const x1 = ax + nx * r;
    const y1 = ay + ny * r;
    const x2 = bx + nx * r;
    const y2 = by + ny * r;
    const x3 = bx - nx * r;
    const y3 = by - ny * r;
    const x4 = ax - nx * r;
    const y4 = ay - ny * r;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.arc(bx, by, r, startAngle, endAngle, false);
    ctx.lineTo(x4, y4);
    ctx.arc(ax, ay, r, endAngle, startAngle, false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(18, 28, 40, 0.52)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(210, 225, 235, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const gradient = ctx.createLinearGradient(ax, ay, bx, by);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(210,225,235,0.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.stroke();

    ctx.restore();
  }

  /* ── W2: Vortex hazards ── */
  static drawVortex(ctx, hz, time) {
    const x = hz.x, y = hz.y, r = hz.r, ph = hz.phase;
    const warn = hz._warn || 0;
    const highGraphics = STATE.settings.graphicsMode === 'high';

    /* ── Pulsing OFF state: dormant visual + countdown ring ── */
    if (hz.pulsing && !hz.pulseActive) {
      ctx.save();
      /* Faint outline */
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120,0,180,0.14)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([5, 12]);
      ctx.stroke();
      ctx.setLineDash([]);
      /* Countdown fill arc (0 → full as reactivation nears) */
      const prog = Math.min(1, hz.pulseTimer / (hz.pulsePeriod / 2));
      if (prog > 0.02) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
        ctx.strokeStyle = `rgba(200,60,255,${0.25 + prog * 0.45})`;
        ctx.lineWidth   = 3;
        sg(ctx, '#c040ff', 10 * prog);
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }
      ctx.restore();
      return;
    }

    ctx.save();

    /* Outer warning ring */
    const wAlpha = 0.07 + warn * 0.18 + Math.sin(time * 4) * 0.04;
    ctx.beginPath();
    ctx.arc(x, y, hz.warningR || r * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(180,0,255,${wAlpha})`;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5,8]);
    ctx.stroke();
    ctx.setLineDash([]);

    /* Dark core gradient */
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (highGraphics) {
      const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      grad.addColorStop(0,    'rgba(80,0,140,0.82)');
      grad.addColorStop(0.55, 'rgba(50,0,100,0.55)');
      grad.addColorStop(1,    'rgba(20,0,40,0)');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = 'rgba(72,0,115,0.28)';
    }
    ctx.fill();

    /* Spiral arms */
    for (let i = 0; i < 3; i++) {
      const a = ph + (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, a, a + 1.2);
      ctx.strokeStyle = `rgba(160,0,255,${0.35 + warn * 0.25})`;
      ctx.lineWidth   = 2.5;
      sg(ctx, '#a000ff', 12 + warn * 8);
      ctx.stroke();
    }

    /* Inner eye */
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,80,255,${0.4 + Math.sin(time * 8) * 0.15})`;
    sg(ctx, '#e060ff', 18);
    ctx.fill();
    ctx.shadowBlur  = 0;

    /* Particle sparks */
    if (highGraphics) {
      for (let i = 0; i < 5; i++) {
        const spa = ph * 2.1 + i * 1.26;
        const spr = r * (0.3 + 0.6 * ((i * 0.37 + ph * 0.5) % 1));
        ctx.beginPath();
        ctx.arc(x + Math.cos(spa) * spr, y + Math.sin(spa) * spr, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,100,255,${0.5 + i * 0.08})`;
        ctx.fill();
      }
    }

    /* Super-vortex: extra outer menace ring */
    if (hz.isSuper) {
      ctx.beginPath();
      ctx.arc(x, y, r * 1.72, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,0,255,${0.12 + Math.sin(time * 2.2) * 0.07})`;
      ctx.lineWidth   = 2;
      ctx.setLineDash([10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font          = getCanvasDisplayFont(9, 'bold');
      ctx.fillStyle     = `rgba(255,80,255,${0.7 + Math.sin(time * 4) * 0.2})`;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      sg(ctx, '#ff00ff', 14);
      ctx.fillText('Ⓢ VOID CORE', x, y + r * 1.72 + 14);
      ctx.shadowBlur    = 0;
    } else if (warn > 0.1) {
      /* Danger label when active */
      ctx.font          = getCanvasDisplayFont(9, 'bold');
      ctx.fillStyle     = `rgba(255,100,255,${warn * 0.9})`;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      sg(ctx, '#ff00ff', 10);
      ctx.fillText('VORTEX', x, y + r + 14);
      ctx.shadowBlur    = 0;
    }

    ctx.restore();
  }

  /* ── W3: Pulsar beacons ── */
  static drawPulsar(ctx, ps) {
    const x      = ps.x, y = ps.y, r = ps.r;
    const pulse  = ps.pulse || 0;
    const ph     = ps.phase || 0;
    const charge = ps.charging ? Math.max(0, 1.2 - (ps.timer || 0)) : 0;
    const cycleProgress = ps.interval ? Math.max(0, Math.min(1, 1 - ((ps.timer || 0) / ps.interval))) : 0;
    const highGraphics = STATE.settings.graphicsMode === 'high';
    ctx.save();

    /* Range ring */
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,160,0,${0.06 + pulse * 0.12})`;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4,10]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cycleProgress);
    ctx.strokeStyle = `rgba(255,210,80,${0.2 + cycleProgress * 0.35})`;
    ctx.lineWidth = 1.4;
    sg(ctx, '#ffc850', 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    /* Expanding pulse wave */
    if (pulse > 0.05) {
      const waveR = r * (1 - pulse) * 0.8 + r * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,50,${pulse * 0.7})`;
      ctx.lineWidth   = 2 + pulse * 3;
      sg(ctx, '#ffc800', 20 * pulse);
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    /* Charge ring */
    if (charge > 0) {
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2 * charge);
      ctx.strokeStyle = `rgba(255,200,50,${0.7 * charge})`;
      ctx.lineWidth   = 3;
      sg(ctx, '#ffaa00', 14 * charge);
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    /* Body radial gradient */
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    if (highGraphics) {
      const grd = ctx.createRadialGradient(x, y, 4, x, y, 22);
      grd.addColorStop(0,   'rgba(255,220,100,0.9)');
      grd.addColorStop(0.5, 'rgba(255,140,0,0.65)');
      grd.addColorStop(1,   'rgba(255,80,0,0)');
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = 'rgba(255,150,32,0.32)';
    }
    ctx.fill();

    if (highGraphics) {
      ctx.beginPath();
      ctx.arc(x, y, 30 + Math.sin(ph * 1.2) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,190,80,${0.12 + charge * 0.16})`;
      ctx.lineWidth = 1.2;
      sg(ctx, '#ffb347', 12);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    /* Rotating arms */
    for (let i = 0; i < (highGraphics ? 4 : 2); i++) {
      const a  = ph + (i / 4) * Math.PI * 2;
      const ax = x + Math.cos(a) * 14;
      const ay = y + Math.sin(a) * 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ax, ay);
      ctx.strokeStyle = `rgba(255,180,0,${0.45 + charge * 0.3})`;
      ctx.lineWidth   = 2;
      sg(ctx, '#ffcc00', 8);
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    ctx.font          = getCanvasDisplayFont(8, 'bold');
    ctx.fillStyle     = ps.isSuper ? 'rgba(255,240,100,0.9)' : 'rgba(255,200,80,0.7)';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.shadowColor   = ps.isSuper ? '#ffdd00' : 'transparent';
    ctx.shadowBlur    = ps.isSuper ? (highGraphics ? 10 : 0) : 0;
    ctx.fillText(ps.isSuper ? 'NEXUS CORE' : 'PULSAR', x, y + 28);
    ctx.font          = getCanvasCopyFont(6);
    ctx.fillStyle     = `rgba(255,225,130,${0.58 + charge * 0.25})`;
    ctx.fillText(charge > 0 ? 'CHARGING' : (pulse > 0.05 ? 'BURST' : 'READY'), x, y + 37);
    ctx.shadowBlur    = 0;

    /* Super-pulsar: extra broadcast range ring */
    if (ps.isSuper) {
      ctx.beginPath();
      ctx.arc(x, y, ps.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,0,${0.05 + (ps.pulse || 0) * 0.12})`;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([8, 16]);
      ctx.stroke();
      ctx.setLineDash([]);
      /* Expanding super-pulse wave */
      if ((ps.pulse || 0) > 0.05) {
        const wR = ps.r * (1 - ps.pulse * 0.85);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(30, wR), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,220,60,${ps.pulse * 0.5})`;
        ctx.lineWidth   = 3 + ps.pulse * 5;
        sg(ctx, '#ffcc00', 30 * ps.pulse);
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }
    }

    ctx.restore();
  }
}
