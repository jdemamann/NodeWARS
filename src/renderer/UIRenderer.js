/* ================================================================
   NODE WARS v3 — UI Renderer

   Canvas-drawn UI elements that overlay the game world:
     • Info panel (hover tooltip for enemy/neutral cells)
     • Frenzy bar
     • Slicer line
     • Preview line (selection → cursor)
   ================================================================ */

import { MAX_SLOTS } from '../constants.js';
import { bldC, maxRange } from '../utils.js';
import { roundRect } from '../utils.js';

const CP = ['#00b8d9','#00ccb8','#00e5ff','#55faff','#ffffff','#ffffaa'];
const CE = ['#c01830','#ee1e3e','#ff3d5a','#ff7090','#ffb8c8','#ffddee'];

export class UIRenderer {
  /* ── Info panel (hover tooltip) ── */
  static drawInfoPanel(ctx, game, W, H) {
    const n = game.hoverNode;
    if (!n || game.state !== 'playing') return;
    if (n.isRelay)    { game.hoverNode = null; game.hoverPin = false; return; }

    const t          = game.time;
    const isPlayer   = n.owner === 1;
    const isNeutral  = n.owner === 0;
    const isEnemy    = n.owner === 2;
    const lvl        = n.level;
    const energy     = Math.round(n.energy);
    const maxE       = n.maxE;
    const fillPct    = Math.round((energy / maxE) * 100);
    const col        = isPlayer  ? CP[Math.min(lvl, CP.length - 1)]
                     : isNeutral ? '#7a8fa0'
                     : CE[Math.min(lvl, CE.length - 1)];
    const colBg      = isPlayer  ? 'rgba(8,22,42,0.94)'
                     : isNeutral ? 'rgba(30,40,55,0.94)'
                     : 'rgba(40,10,18,0.94)';
    const colBdr     = isPlayer  ? 'rgba(0,180,220,0.45)'
                     : isNeutral ? 'rgba(120,150,175,0.45)'
                     : 'rgba(220,40,60,0.45)';

    /* Highlight ring on hovered cell */
    const ncx   = n.x + (game.camX || 0);
    const ncy   = n.y + (game.camY || 0);
    const pulse = 0.55 + Math.sin(t * 6) * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ncx, ncy, n.radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = pulse;
    ctx.setLineDash([4,5]); ctx.stroke(); ctx.setLineDash([]);
    if (game.hoverPin) {
      ctx.beginPath(); ctx.arc(ncx, ncy - n.radius - 14, 3, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fill();
    }
    ctx.restore();

    /* Labels */
    const lang = game._lang || 'en';
    const LABEL = lang === 'pt' ? {
      title_neutral:'CÉLULA NEUTRA', title_enemy:'CÉLULA INIMIGA', title_player:'CÉLULA ALIADA',
      level:'NÍVEL', energy:'ENERGIA', regen:'REGEN', slots:'SLOTS',
      sent:'ENVIADOS', slots_free:'LIVRES', incoming:'ATACANDO',
      capture:'CAPTURA', contested:'DISPUTADA', threat:'AMEAÇA A VOCÊ',
      shield:'ESCUDO ATIVO', overflow:'TRANSBORDANDO', pin:'[clique p/ fixar]',
      flow_in:'ENTRADA', flow_out:'SAÍDA', under_attack:'SOB ATAQUE',
    } : {
      title_neutral:'NEUTRAL CELL', title_enemy:'ENEMY CELL', title_player:'FRIENDLY CELL',
      level:'LEVEL', energy:'ENERGY', regen:'REGEN', slots:'SLOTS',
      sent:'SENT', slots_free:'FREE', incoming:'ATTACKING YOU',
      capture:'CAPTURE', contested:'CONTESTED', threat:'THREAT TO YOU',
      shield:'SHIELD ACTIVE', overflow:'OVERFLOWING', pin:'[click to pin]',
      flow_in:'FLOW IN', flow_out:'FLOW OUT', under_attack:'UNDER ATTACK',
    };

    const baseRegenRate= isNeutral ? 0 : +(n.regen * (1 + n.level * 0.30)).toFixed(1);
    const cascadeIn    = isNeutral ? 0 : +Math.max(0, n._prevInFlow || 0).toFixed(1);
    const regen        = isNeutral ? 0 : +(baseRegenRate + cascadeIn).toFixed(1);
    const totalSlots   = MAX_SLOTS[Math.min(lvl, MAX_SLOTS.length - 1)];
    const activeSent   = game._utils.liveOut(n);
    const incomingAtk  = game.tents.filter(t2 =>
      t2.alive && t2.source && t2.target &&
      (t2.state === 'active' || t2.state === 'advancing') &&
      t2.target === n && t2.source.owner !== n.owner
    ).length;
    const EMBRYO_VAL = 20;
    const contestPct = isNeutral && n.contest
      ? Math.round((Math.max(0, ...Object.values(n.contest)) / EMBRYO_VAL) * 100)
      : 0;
    const contested  = isNeutral && n.contest && Object.keys(n.contest).length > 1;
    const threatStr  = isEnemy ? (
      incomingAtk === 0 ? 'NONE' : incomingAtk === 1 ? 'LOW' : incomingAtk <= 2 ? 'MODERATE' : 'HIGH'
    ) : null;
    const threatCol  = {NONE:'#4a5e72', LOW:'#f5c518', MODERATE:'#ff7090', HIGH:'#ff3d5a'};

    const rows = [];
    rows.push({ label: LABEL.level,  value: lvl + ' / ' + (MAX_SLOTS.length - 1) });
    rows.push({ label: LABEL.energy, value: energy + ' / ' + maxE,
                bar: { pct: fillPct / 100, col: isPlayer ? CP[Math.min(lvl, 4)] : isNeutral ? '#7a8fa0' : CE[Math.min(lvl, 4)] } });
    if (!isNeutral) {
      const regenVal = cascadeIn > 0.2
        ? '+' + baseRegenRate + ' (+' + cascadeIn + ') e/s'
        : '+' + regen + ' e/s';
      rows.push({ label: LABEL.regen, value: regenVal });
      const eIn  = +(game.tents.filter(t2 => t2.alive && t2.state === 'active' && t2.target === n && t2.source.owner === n.owner)
        .reduce((s, t2) => s + (t2.flowRate || 0), 0)).toFixed(1);
      const eOut = +(game.tents.filter(t2 => t2.alive && t2.state === 'active' && t2.source === n && t2.target.owner !== n.owner)
        .reduce((s, t2) => s + (t2.flowRate || 0), 0)).toFixed(1);
      if (eIn  > 0) rows.push({ label: LABEL.flow_in,  value: '+' + eIn  + ' e/s', accentCol:'#00ff9d' });
      if (eOut > 0) rows.push({ label: LABEL.flow_out, value: '-' + eOut + ' e/s', accentCol:'#ff7090' });
    }
    rows.push({ label: LABEL.slots,
      value: isNeutral ? '—' : activeSent + ' / ' + totalSlots,
      sub: isNeutral ? null : (totalSlots - activeSent > 0 ? (totalSlots - activeSent) + ' ' + LABEL.slots_free : null)
    });
    if (isPlayer && incomingAtk > 0) {
      rows.push({ label: LABEL.under_attack, value: incomingAtk + '×', accent: true, accentCol: '#ff3d5a' });
    }
    if (isEnemy) {
      rows.push({ label: LABEL.incoming, value: incomingAtk > 0 ? incomingAtk + '×' : (lang === 'pt' ? 'NENHUM' : 'NONE'), accent: incomingAtk > 0 });
      rows.push({ label: LABEL.threat, value: threatStr, accent: true, accentCol: threatCol[threatStr] || '#4a5e72' });
    }
    if (isNeutral && n.contest) {
      rows.push({ label: LABEL.capture, value: contestPct + '%', bar: { pct: contestPct / 100, col: '#00e5ff' }, accent: contestPct > 0 });
      if (contested) rows.push({ label: LABEL.contested, value: '⚔', accent: true, accentCol: '#f5c518' });
    }
    if (!isNeutral && energy >= maxE * 0.95) {
      rows.push({ label: LABEL.overflow, value: '●', accent: true, accentCol: '#f5c518' });
    }
    if (!isNeutral && energy >= maxE * 0.95 && incomingAtk === 0) {
      rows.push({ label: LABEL.shield, value: '◈', accent: true, accentCol: '#55faff' });
    }

    const PW = 168, ROW = 17, PAD = 10;
    const titleH = 24;
    const PH = titleH + PAD + rows.length * ROW + PAD + 12;
    let px = ncx + n.radius + 18, py = ncy - PH / 2;
    if (px + PW > W - 8) px = ncx - n.radius - PW - 18;
    if (px < 8) px = 8;
    py = Math.max(8, Math.min(H - PH - 8, py));

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18;
    ctx.fillStyle   = colBg;
    ctx.beginPath(); roundRect(ctx, px, py, PW, PH, 7); ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = colBdr; ctx.lineWidth = 1.2;
    ctx.beginPath(); roundRect(ctx, px, py, PW, PH, 7); ctx.stroke();
    ctx.fillStyle   = col; ctx.globalAlpha = 0.55;
    ctx.beginPath(); roundRect(ctx, px, py, PW, 3, { tl:7, tr:7, bl:0, br:0 }); ctx.fill();
    ctx.globalAlpha = 1;
    const title = isPlayer ? LABEL.title_player : isNeutral ? LABEL.title_neutral : LABEL.title_enemy;
    ctx.font = 'bold 8.5px "Orbitron",sans-serif';
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowColor = col; ctx.shadowBlur = 6;
    ctx.fillText(title, px + PAD, py + 3 + titleH / 2);
    ctx.shadowBlur = 0;
    if (!game.hoverPin) {
      ctx.font = '7px "Share Tech Mono",monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.textAlign = 'right';
      ctx.fillText(LABEL.pin, px + PW - PAD, py + 3 + titleH / 2);
    } else {
      ctx.font = 'bold 7px "Share Tech Mono",monospace';
      ctx.fillStyle = col; ctx.globalAlpha = 0.7; ctx.textAlign = 'right';
      ctx.fillText('◈ PINNED', px + PW - PAD, py + 3 + titleH / 2);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = colBdr; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(px + PAD, py + titleH + 3); ctx.lineTo(px + PW - PAD, py + titleH + 3); ctx.stroke();

    rows.forEach((row, ri) => {
      const ry = py + titleH + PAD + ri * ROW + ROW / 2;
      ctx.font = '7px "Share Tech Mono",monospace';
      ctx.fillStyle = 'rgba(180,200,220,0.55)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(row.label, px + PAD, ry);
      ctx.font = 'bold 9px "Share Tech Mono",monospace';
      ctx.fillStyle = row.accentCol || (row.accent ? col : 'rgba(220,235,255,0.92)');
      ctx.textAlign = 'right';
      ctx.fillText(row.value || '', px + PW - PAD, ry);
      if (row.sub) {
        ctx.font = '7px "Share Tech Mono",monospace';
        ctx.fillStyle = 'rgba(0,229,255,0.45)'; ctx.textAlign = 'right';
        ctx.fillText(row.sub, px + PW - PAD, ry + 9);
      }
      if (row.bar) {
        const bx = px + PAD, bw = PW - PAD * 2, bh = 2.5, by2 = ry + 8;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); roundRect(ctx, bx, by2, bw, bh, 1.5); ctx.fill();
        if (row.bar.pct > 0) {
          ctx.fillStyle = row.bar.col; ctx.globalAlpha = 0.75;
          ctx.beginPath(); roundRect(ctx, bx, by2, bw * Math.min(1, row.bar.pct), bh, 1.5); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });

    /* Connector line */
    const cx2 = ncx + n.radius * (px < ncx ? -1 : 1) * 1;
    const px2  = px < ncx ? px + PW : px;
    ctx.strokeStyle = colBdr; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
    ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(cx2, ncy); ctx.lineTo(px2, py + PH / 2); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ── Frenzy bar ── */
  static drawFrenzy(ctx, game, W, H) {
    if (game.frenzyTimer <= 0) return;
    const t     = game.frenzyTimer / 4.0;
    const pulse = 0.7 + Math.sin(Date.now() * 0.012) * 0.3;
    ctx.save();
    ctx.fillStyle = 'rgba(245,197,24,0.12)';
    ctx.fillRect(0, H + 50 - 6, W * t, 5);
    ctx.fillStyle = 'rgba(245,197,24,' + (0.7 * pulse) + ')';
    ctx.shadowColor = '#f5c518'; ctx.shadowBlur = 10;
    ctx.fillRect(0, H + 50 - 6, W * t, 5);
    ctx.font = 'bold 11px "Orbitron",sans-serif';
    ctx.fillStyle = 'rgba(245,197,24,' + (0.9 * pulse) + ')';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 16;
    ctx.fillText('⚡ FRENZY  ' + game.frenzyTimer.toFixed(1) + 's', W / 2, H + 50 - 18);
    ctx.restore();
  }

  /* ── Slicer line ── */
  static drawSlicer(ctx, game) {
    if (!game.slicing || game.slicePath.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(game.slicePath[0].x, game.slicePath[0].y);
    game.slicePath.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85;
    ctx.shadowColor = '#f5c518'; ctx.shadowBlur = 10; ctx.setLineDash([5,3]);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  /* ── Preview line (selected → cursor) ── */
  static drawPreview(ctx, game) {
    if (!game.sel || !game.cfg || game.paused) return;
    const camX = game.camX || 0, camY = game.camY || 0;
    const sx = game.sel.x + camX, sy = game.sel.y + camY;
    const cmx = game.mx - camX, cmy = game.my - camY;

    /* Snap to nearest node within 60px */
    let tx = game.mx, ty = game.my, snapNode = null;
    game.nodes.forEach(n => {
      if (n === game.sel) return;
      const nd = Math.hypot(n.x - cmx, n.y - cmy);
      if (nd < 60 && (!snapNode || nd < Math.hypot(snapNode.x - cmx, snapNode.y - cmy))) snapNode = n;
    });
    if (snapNode) { tx = snapNode.x + camX; ty = snapNode.y + camY; }

    const dx = tx - sx, dy = ty - sy;
    const d  = Math.hypot(dx, dy);
    if (d < 18) return;

    const dm       = game.cfg.dm;
    const maxReach = maxRange(game.sel.energy - 1, dm);
    const reach    = Math.min(d, maxReach);
    const canFire  = game.sel.energy >= bldC(d) + 1 &&
                     game._utils.liveOut(game.sel) < MAX_SLOTS[game.sel.level] &&
                     (!snapNode || snapNode !== game.sel);
    const nx = dx / d, ny = dy / d;
    const reachX = sx + nx * reach, reachY = sy + ny * reach;

    ctx.save();
    if (reach > 0) {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(reachX, reachY);
      ctx.strokeStyle = canFire ? 'rgba(0,229,255,0.75)' : 'rgba(245,197,24,0.7)';
      ctx.lineWidth   = 2; ctx.setLineDash([5,5]);
      ctx.shadowColor = canFire ? '#00e5ff' : '#f5c518'; ctx.shadowBlur = 6; ctx.stroke();
      ctx.beginPath(); ctx.arc(reachX, reachY, 3, 0, Math.PI * 2);
      ctx.fillStyle   = canFire ? '#00e5ff' : '#f5c518'; ctx.globalAlpha = 0.85;
      ctx.shadowBlur  = 10; ctx.fill();
    }
    if (reach < d) {
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(reachX, reachY); ctx.lineTo(tx, ty);
      ctx.strokeStyle = 'rgba(255,61,90,0.35)'; ctx.lineWidth = 1.2; ctx.setLineDash([3,9]); ctx.stroke();
    }
    const cost = bldC(d);
    ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.globalAlpha = 0.8;
    ctx.font = '8px "Share Tech Mono",monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = canFire ? '#00e5ff' : '#ff3d5a';
    ctx.fillText(Math.ceil(cost) + 'e', tx + 14, ty - 8);
    if (!canFire && d > maxReach + 5) {
      ctx.fillStyle = 'rgba(255,61,90,0.6)'; ctx.font = '7px "Share Tech Mono",monospace';
      ctx.fillText('-' + Math.ceil(d - maxReach) + 'px', tx + 14, ty + 3);
    }
    ctx.restore();
  }
}
