/* ================================================================
   Tent renderer

   Draws a single tentacle and its particles onto the canvas. All
   canvas calls live here; Tent itself contains no rendering logic.
   ================================================================ */

import { GAMEPLAY_RULES, TentState } from '../config/gameConfig.js';
import { ownerColor } from '../theme/ownerPalette.js';
import { areAlliedOwners, areHostileOwners } from '../systems/OwnerTeams.js';
import { computeBezierPoint, drawBezierSegment } from '../math/bezierGeometry.js';
import { STATE } from '../core/GameState.js';
import { getCanvasCopyFont } from '../theme/uiFonts.js';

const { render: RENDER_RULES } = GAMEPLAY_RULES;

/* Build a filled organic body along a quadratic bezier.
   High graphics uses a wider root bulb, slight mid-body narrowing, and a small
   normal wobble so the silhouette reads more like tissue than a flat strip. */
function drawOrganicTaperedPath(ctx, sx, sy, cpx, cpy, ex, ey, t0, t1, widthBase, widthTip, segmentCount, {
  organicWobblePx = 0,
  rootBulbScale = 1.2,
  midTaperScale = 0.8,
  tipTaperScale = 0.2,
  time = 0,
  clashCenter = null,
  clashDistortionPx = 0,
} = {}) {
  // The body is built as a filled silhouette instead of a stroked curve so
  // high-graphics mode can read as tissue/pressure rather than a flat line.
  const N    = segmentCount;
  const left = [], right = [];
  const dt   = (t1 - t0) * 0.001;
  for (let i = 0; i <= N; i++) {
    const tv = t0 + (t1 - t0) * (i / N);
    const pt = computeBezierPoint(tv, sx, sy, cpx, cpy, ex, ey);
    const tA = computeBezierPoint(Math.max(0, tv - dt), sx, sy, cpx, cpy, ex, ey);
    const tB = computeBezierPoint(Math.min(1, tv + dt), sx, sy, cpx, cpy, ex, ey);
    const txv = tB.x - tA.x, tyv = tB.y - tA.y;
    const tlen = Math.hypot(txv, tyv) || 1;
    const nx = -tyv / tlen, ny = txv / tlen;
    const progress = i / N;
    const rootProfile = Math.max(0, 1 - progress * 2.2);
    const bodyProfile = Math.sin(progress * Math.PI);
    const tipProfile = Math.max(0, (progress - 0.72) / 0.28);
    let halfWidth =
      widthBase * (1 - progress) +
      widthTip * progress +
      widthBase * rootProfile * (rootBulbScale - 1) +
      widthBase * bodyProfile * (midTaperScale - 1) +
      widthTip * tipProfile * (tipTaperScale - 1);

    const wobble = organicWobblePx > 0
      ? Math.sin(time * 0.007 + progress * 11.5) * organicWobblePx * bodyProfile
      : 0;
    const clashFalloff = clashCenter == null ? 0 : Math.max(0, 1 - Math.abs(progress - clashCenter) / 0.16);
    const clashPush = clashDistortionPx * clashFalloff;

    halfWidth = Math.max(0.35, halfWidth);
    left.push( { x: pt.x + nx * (halfWidth + wobble + clashPush), y: pt.y + ny * (halfWidth + wobble + clashPush) });
    right.push({ x: pt.x - nx * (halfWidth - wobble + clashPush), y: pt.y - ny * (halfWidth - wobble + clashPush) });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i <= N; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = N; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
}

function drawAttachmentRoot(ctx, x, y, color, radius, highGraphics) {
  ctx.save();
  if (highGraphics) {
    ctx.beginPath();
    ctx.arc(x, y, radius * RENDER_RULES.TENTACLE.ROOT_COLLAR_SCALE, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(color, 0.09);
    sg(ctx, color, 14);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = colorWithAlpha(color, highGraphics ? 0.24 : 0.14);
  sg(ctx, color, highGraphics ? 10 : 0);
  ctx.fill();

  if (highGraphics) {
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * radius * 0.45, y + Math.sin(angle) * radius * 0.45);
      ctx.lineTo(x + Math.cos(angle) * radius * 1.35, y + Math.sin(angle) * radius * 1.35);
      ctx.strokeStyle = colorWithAlpha(color, 0.2);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha('#ffffff', 0.12);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawTargetGrip(ctx, x, y, color, radius, time, highGraphics) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = colorWithAlpha(color, highGraphics ? 0.35 : 0.22);
  ctx.lineWidth = highGraphics ? 1.6 : 1;
  ctx.setLineDash([3, 4]);
  ctx.lineDashOffset = -(time * 0.02 % 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawTransferSignature(ctx, tentacle, x, y, color, time, highGraphics) {
  const targetNode = tentacle.effectiveTargetNode;
  const sourceNode = tentacle.effectiveSourceNode;
  const isFriendlyTransfer = areAlliedOwners(targetNode.owner, sourceNode.owner);
  const isNeutralTransfer = targetNode.owner === 0;
  const isAttackTransfer = areHostileOwners(targetNode.owner, sourceNode.owner);
  const isRelaySurge = sourceNode.isRelay && sourceNode.owner !== 0;
  const baseRadius = Math.max(8, targetNode.radius * RENDER_RULES.TENTACLE.TARGET_IMPACT_RING_SCALE);

  ctx.save();

  if (isFriendlyTransfer && !isRelaySurge) {
    ctx.beginPath();
    ctx.arc(x, y, baseRadius * (0.92 + Math.sin(time * 0.006) * 0.06), 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha(color, RENDER_RULES.TENTACLE.ALLY_FEED_PULSE_ALPHA);
    ctx.lineWidth = highGraphics ? 1.4 : 1;
    ctx.setLineDash([4, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (isNeutralTransfer) {
    ctx.beginPath();
    ctx.arc(x, y, baseRadius * 0.92, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha('#f5c518', 0.18);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (isAttackTransfer) {
    ctx.beginPath();
    ctx.arc(x, y, baseRadius * (0.88 + Math.sin(time * 0.01) * 0.08), 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha(color, RENDER_RULES.TENTACLE.ATTACK_IMPACT_ALPHA);
    ctx.lineWidth = highGraphics ? 1.8 : 1.1;
    sg(ctx, color, highGraphics ? 8 : 0);
    ctx.stroke();

    if (highGraphics) {
      for (let spikeIndex = 0; spikeIndex < 4; spikeIndex += 1) {
        const angle = time * 0.004 + (spikeIndex / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * baseRadius * 0.45, y + Math.sin(angle) * baseRadius * 0.45);
        ctx.lineTo(x + Math.cos(angle) * baseRadius * 1.08, y + Math.sin(angle) * baseRadius * 1.08);
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.16);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  if (isRelaySurge) {
    // Relay-fed lanes should look amplified so players can read that the lane
    // is being backed by infrastructure rather than a normal direct feed.
    ctx.beginPath();
    ctx.arc(x, y, baseRadius * 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha('#ffffff', RENDER_RULES.TENTACLE.RELAY_SURGE_ALPHA);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 4]);
    ctx.lineDashOffset = -(time * 0.025 % 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function tentCol(tent) {
  const src = tent.reversed ? tent.target : tent.source;
  return ownerColor(src.owner, src.level);
}

/** Apply shadow only when high-graphics mode is on. */
function sg(ctx, color, blur) {
  if (STATE.settings.graphicsMode === 'high') {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }
}

function colorWithAlpha(hexColor, alpha) {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return hexColor;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

/* Approximate bezier length for glyph spacing without introducing render-only physics. */
function estimateBezierLength(sx, sy, cpx, cpy, ex, ey, t0, t1, samples = 18) {
  let total = 0;
  let previous = computeBezierPoint(t0, sx, sy, cpx, cpy, ex, ey);
  for (let sampleIndex = 1; sampleIndex <= samples; sampleIndex += 1) {
    const t = t0 + (t1 - t0) * (sampleIndex / samples);
    const point = computeBezierPoint(t, sx, sy, cpx, cpy, ex, ey);
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return total;
}

/* Sample a truthful subset of real packets when the queue gets too dense to render all at once. */
function sampleTentacleWarsPacketProgresses(packetTravelQueue, travelDuration, maxVisiblePackets) {
  const safeDuration = Math.max(0.0001, travelDuration || 1);
  const progresses = (packetTravelQueue || [])
    .map(remainingTime => 1 - remainingTime / safeDuration)
    .filter(progress => Number.isFinite(progress))
    .map(progress => Math.max(0, Math.min(1, progress)))
    .sort((left, right) => left - right);

  if (progresses.length <= maxVisiblePackets) return progresses;

  const sampled = [];
  const lastIndex = progresses.length - 1;
  for (let visibleIndex = 0; visibleIndex < maxVisiblePackets; visibleIndex += 1) {
    const sourceIndex = Math.round((visibleIndex / Math.max(1, maxVisiblePackets - 1)) * lastIndex);
    sampled.push(progresses[sourceIndex]);
  }
  return sampled;
}

/* Draw the TentacleWars lane as a contiguous chain of filled diamonds — the biological
   "spine" pillar from the original. Each diamond sits flush with its neighbours along the
   bezier so the lane reads as physical mass rather than a data wire. */
function drawTentacleWarsChain(ctx, {
  esx,
  esy,
  etx,
  ety,
  controlPoint,
  laneStart,
  laneEnd,
  color,
  flowRatio,
  level,
  highGraphics,
}) {
  if (laneEnd - laneStart < 0.02) return;

  const laneLength = estimateBezierLength(esx, esy, controlPoint.x, controlPoint.y, etx, ety, laneStart, laneEnd);
  const d = 4.5 + level * 0.25 + flowRatio * 0.9;
  const spacing = d * 2.0 + 1.8;
  const glyphCount = Math.max(2, Math.floor(laneLength / spacing));

  /* Dark spine fills the gaps between diamonds and gives each one a thin dark border. */
  ctx.save();
  ctx.beginPath();
  drawBezierSegment(ctx, esx, esy, controlPoint.x, controlPoint.y, etx, ety, laneStart, laneEnd);
  ctx.strokeStyle = colorWithAlpha('#06111f', 0.78);
  ctx.lineWidth = d * 1.6;
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i <= glyphCount; i += 1) {
    const laneT = laneStart + (laneEnd - laneStart) * (i / glyphCount);
    const pt = computeBezierPoint(laneT, esx, esy, controlPoint.x, controlPoint.y, etx, ety);
    const ahead = computeBezierPoint(Math.min(1, laneT + 0.008), esx, esy, controlPoint.x, controlPoint.y, etx, ety);
    const behind = computeBezierPoint(Math.max(0, laneT - 0.008), esx, esy, controlPoint.x, controlPoint.y, etx, ety);
    const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);

    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(angle);

    /* Filled diamond body — vertices along and across the lane axis. */
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(0, d);
    ctx.lineTo(-d, 0);
    ctx.lineTo(0, -d);
    ctx.closePath();
    ctx.fillStyle = colorWithAlpha(color, 0.93);
    if (highGraphics) sg(ctx, color, 5);
    ctx.fill();

    /* Upper-face highlight gives a subtle convex depth to each link. */
    if (highGraphics) {
      ctx.beginPath();
      ctx.moveTo(-d, 0);
      ctx.lineTo(0, -d);
      ctx.lineTo(d, 0);
      ctx.strokeStyle = colorWithAlpha('#ffffff', 0.28);
      ctx.lineWidth = 0.9;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha('#ffffff', 0.38);
      ctx.fill();
    }

    ctx.restore();
  }
}

/* Draw the split TentacleWars cut retraction so both halves snap back visibly. */
function drawTentacleWarsCutRetraction(ctx, tentacle, {
  esx,
  esy,
  etx,
  ety,
  controlPoint,
  color,
  level,
  renderNow,
  highGraphics,
}) {
  const cutRetraction = tentacle.twCutRetraction;
  if (!cutRetraction) return;

  const segments = [
    { start: 0, end: cutRetraction.sourceFront },
    { start: cutRetraction.targetFront, end: 1 },
  ].filter(segment => segment.end - segment.start > 0.003);

  drawAttachmentRoot(ctx, esx, esy, color, Math.max(3, 2.6 + level * 0.4), highGraphics);
  drawTargetGrip(ctx, etx, ety, color, Math.max(4, 5.2 + level * 0.3), renderNow, highGraphics);

  segments.forEach(segment => {
    ctx.save();
    ctx.beginPath();
    drawBezierSegment(ctx, esx, esy, controlPoint.x, controlPoint.y, etx, ety, segment.start, segment.end);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10 + level * 0.8;
    ctx.globalAlpha = 0.13;
    sg(ctx, color, highGraphics ? 18 : 10);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    drawOrganicTaperedPath(
      ctx,
      esx,
      esy,
      controlPoint.x,
      controlPoint.y,
      etx,
      ety,
      segment.start,
      segment.end,
      1.8 + level * 0.18,
      0.45,
      highGraphics ? RENDER_RULES.TENTACLE.BEZIER_SEGMENTS : 8,
      {
        organicWobblePx: highGraphics ? RENDER_RULES.TENTACLE.ORGANIC_WOBBLE_PX * 0.35 : 0,
        rootBulbScale: RENDER_RULES.TENTACLE.ROOT_BULB_SCALE,
        midTaperScale: RENDER_RULES.TENTACLE.MID_TAPER_SCALE,
        tipTaperScale: RENDER_RULES.TENTACLE.TIP_TAPER_SCALE,
        time: renderNow,
      },
    );
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.84;
    ctx.fill();
    ctx.restore();

    if (highGraphics) {
      ctx.save();
      ctx.beginPath();
      drawBezierSegment(ctx, esx, esy, controlPoint.x, controlPoint.y, etx, ety, segment.start, segment.end);
      ctx.strokeStyle = colorWithAlpha('#ffffff', 0.24);
      ctx.lineWidth = 1.15;
      sg(ctx, '#ffffff', 6);
      ctx.stroke();
      ctx.restore();
    }
  });
}

/* Draw truthful energy packets from the live packet queue so the TW lane is audit-friendly. */
function drawTentacleWarsEnergyPackets(ctx, {
  esx,
  esy,
  etx,
  ety,
  controlPoint,
  packetTravelQueue,
  travelDuration,
  laneStart,
  laneEnd,
  highGraphics,
}) {
  if (laneEnd - laneStart < 0.08) return;

  const packetProgresses = sampleTentacleWarsPacketProgresses(packetTravelQueue, travelDuration, 12);
  for (const progress of packetProgresses) {
    if (progress < laneStart || progress > laneEnd) continue;
    const laneT = laneStart + (laneEnd - laneStart) * ((progress - laneStart) / Math.max(0.0001, laneEnd - laneStart));
    const packetPoint = computeBezierPoint(laneT, esx, esy, controlPoint.x, controlPoint.y, etx, ety);
    const packetRadius = highGraphics ? 6.0 : 4.8;
    const tangentAhead = computeBezierPoint(Math.min(1, laneT + 0.01), esx, esy, controlPoint.x, controlPoint.y, etx, ety);
    const packetAngle = Math.atan2(tangentAhead.y - packetPoint.y, tangentAhead.x - packetPoint.x);
    const packetColor = '#f5c800';

    ctx.save();
    ctx.translate(packetPoint.x, packetPoint.y);
    ctx.rotate(packetAngle);
    ctx.beginPath();
    ctx.ellipse(-packetRadius * 0.2, 0, packetRadius * 2.35, packetRadius * 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha('#02060d', 0.42);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-packetRadius * 0.4, 0, packetRadius * 2, packetRadius * 1.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(packetColor, 0.30);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, packetRadius * 1.15, packetRadius * 0.82, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(packetColor, 0.95);
    sg(ctx, packetColor, highGraphics ? 14 : 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(packetRadius * 0.32, 0, Math.max(0.8, packetRadius * 0.34), 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha('#fff5a8', 0.42);
    ctx.fill();
    ctx.restore();
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
    const isTentacleWarsLane = t.effectiveSourceNode?.simulationMode === 'tentaclewars';
    let twEsx = esx;
    let twEsy = esy;
    let twEtx = etx;
    let twEty = ety;
    if (isTentacleWarsLane) {
      const rawDx = etx - esx;
      const rawDy = ety - esy;
      const rawLen = Math.hypot(rawDx, rawDy) || 1;
      const nx = rawDx / rawLen;
      const ny = rawDy / rawLen;
      const srcNode = t.reversed ? tg : s;
      const tgtNode = t.reversed ? s : tg;
      twEsx = esx + nx * srcNode.radius;
      twEsy = esy + ny * srcNode.radius;
      twEtx = etx - nx * tgtNode.radius;
      twEty = ety - ny * tgtNode.radius;
    }
    const highGraphics = STATE.settings.graphicsMode === 'high';
    const segmentCount = highGraphics ? RENDER_RULES.TENTACLE.BEZIER_SEGMENTS : Math.max(6, Math.floor(RENDER_RULES.TENTACLE.BEZIER_SEGMENTS * 0.58));
    const renderNow = (t.game?.time || 0) * 1000;

    if (t.twCutRetraction) {
      drawTentacleWarsCutRetraction(ctx, t, {
        esx: twEsx,
        esy: twEsy,
        etx: twEtx,
        ety: twEty,
        controlPoint: cp,
        color: col,
        level: lvl,
        renderNow,
        highGraphics,
      });

      if (t.cutFlash > 0 && t.cutPoint !== undefined) {
        const sp = computeBezierPoint(t.cutPoint, twEsx, twEsy, cp.x, cp.y, twEtx, twEty);
        const alpha = t.cutFlash;
        const r2 = 18 + alpha * 14;
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
        ctx.restore();
      }
      return;
    }

    const activeClashFront = t.clashVisualT ?? t.clashT;
    const isClash = activeClashFront != null;
    const atk     = s.owner !== tg.owner;
    const isRev   = t.reversed;
    const visEnd  = isClash ? (isRev ? 1 - activeClashFront : activeClashFront) : t.reachT;
    const isGrow  = t.state === TentState.GROWING;
    const isAnim  = isGrow || t.state === TentState.RETRACTING || t.state === TentState.BURSTING;
    const isAdv   = t.state === TentState.ADVANCING;
    /* startT > 0 only during BURSTING: tail advances toward target, shrinking the visible segment */
    const sT      = t.startT || 0;

    /* Reversed dashed overlay */
    if (isRev && (t.state === TentState.ACTIVE || t.state === TentState.ADVANCING)) {
      ctx.save();
      ctx.beginPath();
      drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, Math.max(sT, 0.02), visEnd * 0.98);
      ctx.strokeStyle = 'rgba(245,197,24,0.22)';
      ctx.lineWidth   = 3;
      ctx.setLineDash(RENDER_RULES.TENTACLE.REVERSED_DASH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* Flow intensity */
    const FR      = Math.min(t.flowRate / 18, 1);
    const glowW   = isTentacleWarsLane ? 6 + FR * 8 : 10 + FR * 14;
    const glowA   = isTentacleWarsLane ? (0.035 + lvl * 0.008) + FR * 0.06 : (0.055 + lvl * 0.014) + FR * 0.12;
    const glowBlur= isTentacleWarsLane ? 10 + FR * 12 : 16 + FR * 24;
    const now     = renderNow;

    ctx.save();
    ctx.beginPath();
    drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, sT, visEnd);
    ctx.strokeStyle  = col;
    ctx.lineWidth    = glowW;
    ctx.globalAlpha  = glowA;
    sg(ctx, col, glowBlur);
    ctx.stroke();
    ctx.restore();

    /* Outer membrane gives the tentacle a more organic silhouette. */
    if (highGraphics) {
      const membraneWidth = glowW * (atk && !isRev ? 0.5 : 0.38);
      ctx.save();
      ctx.beginPath();
      drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, sT, visEnd);
      ctx.strokeStyle = colorWithAlpha(
        col,
        isTentacleWarsLane
          ? (atk && !isRev ? 0.12 + FR * 0.04 : 0.09 + FR * 0.03)
          : (atk && !isRev ? 0.22 + FR * 0.08 : 0.16 + FR * 0.05),
      );
      ctx.lineWidth = membraneWidth;
      ctx.globalAlpha = 1;
      sg(ctx, col, 8 + FR * 10);
      ctx.stroke();
      ctx.restore();
    }

    /* Growing tip */
    if (isGrow && t.reachT > 0) {
      const tipPt    = computeBezierPoint(visEnd, esx, esy, cp.x, cp.y, etx, ety);
      const costProg = t.paidCost / Math.max(0.01, t.buildCost);
      const tipPulse = 0.7 + Math.sin(renderNow * 0.022) * 0.3;
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
    if (FR > RENDER_RULES.TENTACLE.HIGH_FLOW_THRESHOLD && t.state === TentState.ACTIVE) {
      ctx.save();
      ctx.beginPath();
      drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, Math.max(sT, 0.02), visEnd * 0.98);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 + FR * 0.28) + ')';
      ctx.lineWidth   = 1 + FR * 2.5;
      ctx.globalAlpha = 1;
      sg(ctx, '#fff', 8 + FR * 16);
      ctx.stroke();
      ctx.restore();
    }

    /* Tapered core body */
    const baseW  = isTentacleWarsLane
      ? (isAnim ? 0.95 : (isAdv ? 1.55 + lvl * 0.24 : atk && !isRev ? 1.35 + lvl * 0.18 : 1.05))
      : (isAnim ? 1.1 : (isAdv ? 2 + lvl * 0.4 : atk && !isRev ? 1.8 + lvl * 0.28 : 1.3));
    const baseA  = isTentacleWarsLane
      ? (isAnim ? 0.42 : (isAdv ? 0.84 : atk && !isRev ? 0.74 : 0.46))
      : (isAnim ? 0.48 : (isAdv ? 0.95 : atk && !isRev ? 0.88 : 0.5));
    const fullW  = baseW + FR * (isTentacleWarsLane ? (atk ? 1.35 : 0.9) : (atk ? 2.5 : 1.5));
    const alpha  = baseA + FR * (isTentacleWarsLane ? (atk ? 0.04 : 0.10) : (atk ? 0.08 : 0.18));
    /* Half-widths: thick at base, tapered at tip */
    const wBase  = fullW * (isAnim ? 0.8 : 1.2);
    const wTip   = Math.max(0.35, fullW * 0.18);

    if (!isAnim) {
      drawAttachmentRoot(ctx, esx, esy, col, Math.max(3, wBase * 1.55), highGraphics);
      drawTargetGrip(ctx, etx, ety, col, Math.max(4, wTip * 5.4), now, highGraphics);
      drawTransferSignature(ctx, t, etx, ety, col, now, highGraphics);
    }
    ctx.save();
    if (isTentacleWarsLane) {
      drawTentacleWarsChain(ctx, {
        esx: twEsx,
        esy: twEsy,
        etx: twEtx,
        ety: twEty,
        controlPoint: cp,
        laneStart: sT,
        laneEnd: visEnd,
        color: col,
        flowRatio: FR,
        level: lvl,
        highGraphics,
      });
    } else if (!atk || isRev) {
      /* Friendly / reversed: dashed bezier stroke — replaces expensive segment loop */
      ctx.beginPath();
      drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, sT, visEnd);
      ctx.strokeStyle    = col;
      ctx.lineWidth      = wBase * 2;
      ctx.globalAlpha    = alpha;
      ctx.setLineDash(RENDER_RULES.TENTACLE.FRIENDLY_DASH);
      ctx.lineDashOffset = -(renderNow * 0.025 % 23);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    } else {
      drawOrganicTaperedPath(ctx, esx, esy, cp.x, cp.y, etx, ety, sT, visEnd, wBase, wTip, segmentCount, {
        organicWobblePx: highGraphics ? RENDER_RULES.TENTACLE.ORGANIC_WOBBLE_PX : 0,
        rootBulbScale: RENDER_RULES.TENTACLE.ROOT_BULB_SCALE,
        midTaperScale: RENDER_RULES.TENTACLE.MID_TAPER_SCALE,
        tipTaperScale: RENDER_RULES.TENTACLE.TIP_TAPER_SCALE,
        time: now,
        clashCenter: isClash ? (isRev ? 1 - activeClashFront : activeClashFront) : null,
        clashDistortionPx: isClash ? RENDER_RULES.TENTACLE.CLASH_DISTORTION_PX : 0,
      });
      ctx.fillStyle   = col;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.restore();

    /* Bright flow spine keeps the tentacle from reading as a flat tube. */
    if (!isTentacleWarsLane && highGraphics && visEnd - sT > 0.02) {
      ctx.save();
      ctx.beginPath();
      drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, Math.min(visEnd - 0.01, sT + 0.015), Math.max(sT + 0.02, visEnd * 0.985));
      ctx.strokeStyle = colorWithAlpha('#ffffff', 0.18 + FR * 0.3);
      ctx.lineWidth = Math.max(0.8, wTip * 1.2);
      ctx.globalAlpha = 1;
      sg(ctx, '#ffffff', 4 + FR * 10);
      ctx.stroke();
      ctx.restore();
    }

    /* Animated flow pulses make active tentacles feel pressurised instead of static. */
    if (!isTentacleWarsLane && highGraphics && t.state === TentState.ACTIVE && visEnd - sT > 0.18) {
      ctx.save();
      const pulseCount = RENDER_RULES.TENTACLE.FLOW_PULSE_COUNT;
      const pulseSpan = RENDER_RULES.TENTACLE.FLOW_PULSE_SPAN;
      for (let pulseIndex = 0; pulseIndex < pulseCount; pulseIndex++) {
        const phase = ((now * 0.00055 * (1 + FR * 0.8)) + pulseIndex / pulseCount) % 1;
        const pulseCenter = sT + (visEnd - sT) * phase;
        const pulseStart = Math.max(sT, pulseCenter - pulseSpan * 0.5);
        const pulseEnd = Math.min(visEnd, pulseCenter + pulseSpan * 0.5);
        if (pulseEnd - pulseStart < 0.015) continue;
        ctx.beginPath();
        drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, pulseStart, pulseEnd);
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.16 + FR * 0.28);
        ctx.lineWidth = Math.max(1, wTip * 2.2);
        ctx.globalAlpha = 0.7;
        sg(ctx, '#ffffff', 5 + FR * 8);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (!isTentacleWarsLane && highGraphics && atk && !isRev && visEnd - sT > 0.12) {
      ctx.save();
      for (let bandIndex = 0; bandIndex < 4; bandIndex += 1) {
        const bandCenter = sT + (visEnd - sT) * (0.12 + bandIndex * 0.18 + Math.sin(now * 0.002 + bandIndex) * 0.03);
        const bandStart = Math.max(sT, bandCenter - 0.018);
        const bandEnd = Math.min(visEnd, bandCenter + 0.018);
        if (bandEnd - bandStart < 0.01) continue;
        ctx.beginPath();
        drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, bandStart, bandEnd);
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.11 + FR * 0.16);
        ctx.lineWidth = Math.max(0.8, wTip * 1.35);
        ctx.globalAlpha = 0.75;
        ctx.stroke();
      }
      ctx.restore();
    }

    if (!isTentacleWarsLane && highGraphics && !isClash && t.state === TentState.ACTIVE) {
      const sourceNode = t.effectiveSourceNode;
      const targetNode = t.effectiveTargetNode;
      if (sourceNode.isRelay && sourceNode.owner !== 0 && visEnd - sT > 0.18) {
        ctx.save();
        ctx.beginPath();
        drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, sT + 0.02, Math.min(visEnd, sT + 0.22));
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.18);
        ctx.lineWidth = Math.max(1.1, wBase * 0.65);
        ctx.globalAlpha = 0.8;
        sg(ctx, '#ffffff', 8);
        ctx.stroke();
        ctx.restore();
      } else if (areAlliedOwners(targetNode.owner, sourceNode.owner) && visEnd - sT > 0.25) {
        ctx.save();
        ctx.beginPath();
        drawBezierSegment(ctx, esx, esy, cp.x, cp.y, etx, ety, sT + 0.18, Math.min(visEnd, sT + 0.34));
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.12);
        ctx.lineWidth = Math.max(0.8, wTip * 1.1);
        ctx.globalAlpha = 0.65;
        ctx.stroke();
        ctx.restore();
      }
    }

    /* During clash visEnd is already capped at the clash front (line 487), so packets
       naturally stop before the collision point — the !isClash guard was wrong. */
    if (isTentacleWarsLane && t.state === TentState.ACTIVE) {
      /* During clash, packets were emitted with travelDuration * clashT so they
         reach the midpoint in the correct time. Pass the same halved duration to
         the packet sampler so progress values map correctly to [0, 1]. */
      const packetTravelDuration = (isClash && activeClashFront != null)
        ? (t.travelDuration || 1) * activeClashFront
        : (t.travelDuration || 1);
      drawTentacleWarsEnergyPackets(ctx, {
        esx: twEsx,
        esy: twEsy,
        etx: twEtx,
        ety: twEty,
        controlPoint: cp,
        packetTravelQueue: t.packetTravelQueue || [],
        travelDuration: packetTravelDuration,
        laneStart: Math.max(sT, 0.04),
        laneEnd: Math.max(Math.max(sT, 0.04), visEnd * 0.96),
        highGraphics,
      });
    }

    /* Non-active tip dot — not shown during BURSTING (tail rushing to target, no stationary tip) */
    if (t.state !== TentState.ACTIVE && t.state !== TentState.BURSTING) {
      const tip   = computeBezierPoint(visEnd, esx, esy, cp.x, cp.y, etx, ety);
      const sz    = (isAdv ? 4.5 : 3.5) + lvl * 0.65;
      const pulse = 0.8 + Math.sin(renderNow * 0.009) * 0.22;
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
      if (highGraphics) ctx.shadowBlur = 20;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, sz * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.88;
      if (highGraphics) ctx.shadowBlur = 6;
      ctx.fill();
      for (let ri = 0; ri < 2; ri++) {
        const ph = renderNow * 0.006 + ri * Math.PI;
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
      const p1 = computeBezierPoint(ap - 0.09, esx, esy, cp.x, cp.y, etx, ety);
      const p2 = computeBezierPoint(ap,        esx, esy, cp.x, cp.y, etx, ety);
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
        const mid = computeBezierPoint(0.5, esx, esy, cp.x, cp.y, etx, ety);
        ctx.font          = getCanvasCopyFont(8);
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
      const ct    = isRev ? 1 - activeClashFront : activeClashFront;
      const sp    = computeBezierPoint(ct, esx, esy, cp.x, cp.y, etx, ety);
      const spark = t.clashSpark;
      const now   = renderNow;

      ctx.save();

      /* Pulsing outer ring */
      const pulse = 0.65 + Math.sin(now * 0.008) * 0.35;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, (isTentacleWarsLane ? 11 + spark * 5 : 14 + spark * 8) * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = isTentacleWarsLane ? colorWithAlpha(col, 0.7) : '#f5c518';
      ctx.lineWidth = isTentacleWarsLane ? 1.2 : 1.5;
      ctx.globalAlpha = spark * 0.55 * pulse;
      sg(ctx, isTentacleWarsLane ? col : '#f5c518', isTentacleWarsLane ? 16 : 28);
      ctx.stroke();

      /* Mid ring */
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, isTentacleWarsLane ? 5.5 + spark * 3.5 : 7 + spark * 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = isTentacleWarsLane ? 1.35 : 2;
      ctx.globalAlpha = spark * 0.72;
      sg(ctx, '#fff', 14);
      ctx.stroke();

      /* Core hot dot */
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3.5 + spark * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.92;
      if (highGraphics) ctx.shadowBlur = 16;
      ctx.fill();

      if (highGraphics) {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 10 + spark * 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = colorWithAlpha(col, 0.28 + spark * 0.22);
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(sp.x - 9, sp.y);
        ctx.lineTo(sp.x + 9, sp.y);
        ctx.moveTo(sp.x, sp.y - 9);
        ctx.lineTo(sp.x, sp.y + 9);
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.22 + spark * 0.12);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* 8 spark rays, rotating */
      const rayLen = isTentacleWarsLane ? 6 + spark * 7 : 10 + spark * 12;
      for (let i = 0; i < (isTentacleWarsLane ? 6 : 8); i++) {
        const a = (i / (isTentacleWarsLane ? 6 : 8)) * Math.PI * 2 + now * 0.004;
        const r0 = 4, r1 = r0 + rayLen * (0.5 + spark * 0.5);
        ctx.beginPath();
        ctx.moveTo(sp.x + r0 * Math.cos(a), sp.y + r0 * Math.sin(a));
        ctx.lineTo(sp.x + r1 * Math.cos(a), sp.y + r1 * Math.sin(a));
        ctx.strokeStyle = isTentacleWarsLane ? (i % 2 === 0 ? '#ffffff' : col) : (i % 2 === 0 ? '#f5c518' : col);
        ctx.lineWidth = isTentacleWarsLane ? 0.95 : 1.2;
        ctx.globalAlpha = spark * (isTentacleWarsLane ? 0.42 : 0.55);
        sg(ctx, isTentacleWarsLane ? col : '#f5c518', isTentacleWarsLane ? 6 : 10);
        ctx.stroke();
      }

      /* CLASH label (only from one side to avoid duplicate — draw from non-reversed only) */
      if (!isRev) {
        ctx.font = getCanvasCopyFont(isTentacleWarsLane ? 8 : 7);
        ctx.fillStyle = '#f5c518';
        ctx.globalAlpha = (isTentacleWarsLane ? 0.92 : 0.78) + Math.sin(now * 0.006) * (isTentacleWarsLane ? 0.14 : 0.22);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        sg(ctx, '#f5c518', isTentacleWarsLane ? 14 : 8);
        ctx.fillText('CLASH', sp.x, sp.y - RENDER_RULES.TENTACLE.CLASH_LABEL_Y_OFFSET_PX);
      }

      ctx.restore();
    }

    /* Overflow cascade indicator */
    if (t.state === TentState.ACTIVE && !isClash && t.effectiveSourceNode.energy >= t.effectiveSourceNode.maxE * 0.93) {
      const mp = computeBezierPoint(0.5, esx, esy, cp.x, cp.y, etx, ety);
      ctx.font         = getCanvasCopyFont(9);
      ctx.fillStyle    = '#f5c518';
      ctx.globalAlpha  = 0.52 + Math.sin(renderNow * 0.005) * 0.3;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u00bb', mp.x, mp.y - 10);
      ctx.globalAlpha  = 1;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    /* Pipe fill arc indicator */
    if (t.state === TentState.ACTIVE && t.pipeAge < t.travelDuration * 1.1 && t.energyInPipe > 0.05) {
      const fillRatio = Math.min(1, t.energyInPipe / t.pipeCapacity);
      const rampPct   = Math.min(1, t.pipeAge / t.travelDuration);
      const fadeOut   = 1 - Math.max(0, (rampPct - 0.85) / 0.25);
      const arcAlpha  = 0.65 * fadeOut;
      if (arcAlpha > 0.02) {
        const targetRadius = t.effectiveTargetNode.radius;
        const arcSpan= fillRatio * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(etx, ety, targetRadius + 7, -Math.PI / 2, -Math.PI / 2 + arcSpan);
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
      const sp  = computeBezierPoint(t.cutPoint, esx, esy, cp2.x, cp2.y, etx, ety);
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
        if (highGraphics) ctx.shadowBlur = 8;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
