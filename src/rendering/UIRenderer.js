/* ================================================================
   NODE WARS v3 — UI Renderer

   Canvas-drawn UI elements that overlay the game world:
     • transient world-space feedback events
     • Info panel (hover tooltip for enemy/neutral cells)
     • Frenzy bar
     • Slicer line
     • Preview line (selection → cursor)
     • phase-outcome overlay
   ================================================================ */

import { GAMEPLAY_RULES, MAX_SLOTS } from '../config/gameConfig.js';
import { ownerColor, ownerPanelTheme } from '../theme/ownerPalette.js';
import { computeBuildCost, maxRange } from '../math/simulationMath.js';
import { computeNodeDisplayRegenRate } from '../systems/EnergyBudget.js';
import { drawRoundedRect } from './canvasPrimitives.js';

const { input: INPUT_TUNING, progression: PROGRESSION_RULES, render: RENDER_RULES } = GAMEPLAY_RULES;

function colorWithAlpha(hexColor, alpha) {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return hexColor;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

export class UIRenderer {
  static drawVisualEvents(ctx, game) {
    if (!game.visualEvents?.length) return;

    game.visualEvents.forEach(event => {
      const progress = Math.max(0, Math.min(1, event.age / event.duration));
      const x = event.x + (game.camX || 0);
      const y = event.y + (game.camY || 0);
      const color = ownerColor(event.owner || 0, 3, event.type === 'loss' ? '#ff5d7a' : '#8cb4d6');
      const alpha = 1 - progress;

      ctx.save();
      if (event.type === 'pulse') {
        const pulseRadius = 18 + progress * 72;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = colorWithAlpha('#ffc34a', 0.4 * alpha);
        ctx.lineWidth = 2 + (1 - progress) * 2.5;
        ctx.stroke();
      } else {
        const ringRadius = 18 + progress * 38;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = colorWithAlpha(color, 0.55 * alpha);
        ctx.lineWidth = event.type === 'structure' ? 2.6 : 2.1;
        if (event.type === 'structure') ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(x, y, 8 + progress * 18, 0, Math.PI * 2);
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.18 * alpha);
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      if (event.label) {
        ctx.font = 'bold 8px "Orbitron",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colorWithAlpha(color, 0.9 * alpha);
        ctx.fillText(event.label, x, y - 24 - progress * 10);
      }
      ctx.restore();
    });
  }

  static drawPhaseOutcome(ctx, game, W, H) {
    if (!game.phaseOutcome) return;

    const pulse = 0.55 + Math.sin((game.time || 0) * 8) * 0.15;
    const win = game.phaseOutcome === 'win';
    const label = win ? 'DOMINATED' : 'OVERRUN';
    const color = win ? '#00ff9d' : '#ff4d74';

    ctx.save();
    ctx.fillStyle = win ? `rgba(0,255,157,${0.045 + pulse * 0.04})` : `rgba(255,77,116,${0.05 + pulse * 0.04})`;
    ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 28px "Orbitron",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colorWithAlpha(color, 0.75 + pulse * 0.18);
    ctx.fillText(label, W / 2, H * 0.34);
    ctx.font = 'bold 10px "Share Tech Mono",monospace';
    ctx.fillStyle = colorWithAlpha('#ffffff', 0.55 + pulse * 0.18);
    ctx.fillText(game.cfg?.name || '', W / 2, H * 0.34 + 26);
    ctx.restore();
  }

  /* Retained as an optional compact phase brief, but intentionally not wired
     into the live render path after the always-on version proved too noisy. */
  static drawPhaseStatus(ctx, game, W, H) {
    if (!game.cfg || game.state !== 'playing') return;

    const { cfg } = game;
    const isTutorial = !!cfg.isTutorial;
    const lang = game._lang || 'en';
    const playerNodes = game.nodes.filter(node => node.owner === 1 && !node.isRelay).length;
    const enemyNodes = game.nodes.filter(node => node.owner !== 0 && node.owner !== 1 && !node.isRelay).length;
    const contestedNeutrals = game.nodes.filter(node => node.owner === 0 && node.contest && Object.values(node.contest).some(score => score > 0)).length;
    const panelX = RENDER_RULES.UI.PHASE_PANEL_X_PX;
    const panelY = RENDER_RULES.UI.PHASE_PANEL_Y_PX;
    const panelWidth = RENDER_RULES.UI.PHASE_PANEL_WIDTH_PX;

    const mechanicChips = [];
    if (cfg.vortexCount) mechanicChips.push({ label: cfg.hasSuperVortex ? 'VOID CORE' : (lang === 'pt' ? 'VÓRTEX' : 'VORTEX'), color: '#c040ff' });
    if (cfg.relayCount) mechanicChips.push({ label: lang === 'pt' ? 'RELAY' : 'RELAY', color: '#00e5ff' });
    if (cfg.pulsarCount) mechanicChips.push({ label: cfg.hasSuperPulsar ? 'NEXUS CORE' : 'PULSAR', color: '#ffb347' });
    if (cfg.signalTowerCount) mechanicChips.push({ label: lang === 'pt' ? 'SINAL' : 'SIGNAL', color: '#7dff8d' });
    if (cfg.bunkerCount || cfg.fortifiedRelayCount) mechanicChips.push({ label: lang === 'pt' ? 'FORT' : 'FORT', color: '#f5c518' });
    if (cfg.purpleEnemyCount) mechanicChips.push({ label: lang === 'pt' ? 'ROXO' : 'PURPLE', color: '#c040ff' });

    const objectiveText = isTutorial
      ? (lang === 'pt' ? 'Aprenda a mecânica destacada e avance.' : 'Learn the highlighted mechanic and advance.')
      : (enemyNodes > 0
          ? (lang === 'pt'
            ? `Domine o mapa: ${enemyNodes} núcleo(s) inimigo(s) restantes`
            : `Dominate the map: ${enemyNodes} enemy core(s) remaining`)
          : (lang === 'pt' ? 'Campo limpo. Finalize a fase.' : 'Field is clear. Finish the phase.'));

    const parText = !isTutorial && cfg.par
      ? `PAR ${Math.max(0, cfg.par - Math.floor(game.scoreTime))}s`
      : (lang === 'pt' ? 'TUTORIAL' : 'TUTORIAL');

    const playerStatus = lang === 'pt'
      ? `VOCÊ ${playerNodes} · NEUTROS ${contestedNeutrals}`
      : `YOU ${playerNodes} · NEUTRALS ${contestedNeutrals}`;
    const enemyStatus = lang === 'pt'
      ? `INIMIGOS ${enemyNodes}`
      : `ENEMIES ${enemyNodes}`;

    const chipRows = Math.ceil(mechanicChips.length / 3);
    const panelHeight = Math.max(
      RENDER_RULES.UI.PHASE_PANEL_MIN_HEIGHT_PX,
      58 + chipRows * 16 + (objectiveText ? 16 : 0)
    );

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(6,12,22,0.76)';
    ctx.beginPath();
    drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    const accent = cfg.worldId === 2 ? '#c040ff' : cfg.worldId === 3 ? '#ff9a36' : '#00e5ff';
    ctx.strokeStyle = `rgba(255,255,255,0.08)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 10);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    drawRoundedRect(ctx, panelX, panelY, panelWidth, 3, { tl: 10, tr: 10, bl: 0, br: 0 });
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = 'bold 8px "Orbitron",sans-serif';
    ctx.fillStyle = accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const phasePrefix = isTutorial
      ? (lang === 'pt' ? 'TUTORIAL' : 'TUTORIAL')
      : `${lang === 'pt' ? 'FASE' : 'PHASE'} ${cfg.id}`;
    ctx.fillText(phasePrefix, panelX + 10, panelY + 12);

    ctx.font = 'bold 11px "Orbitron",sans-serif';
    ctx.fillStyle = 'rgba(235,245,255,0.96)';
    ctx.fillText(cfg.name, panelX + 10, panelY + 28);

    ctx.font = '7px "Share Tech Mono",monospace';
    ctx.fillStyle = 'rgba(173,193,215,0.82)';
    ctx.fillText(`${playerStatus}   ${enemyStatus}`, panelX + 10, panelY + 42);

    ctx.textAlign = 'right';
    ctx.fillStyle = !isTutorial && cfg.par ? '#f5c518' : accent;
    ctx.fillText(parText, panelX + panelWidth - 10, panelY + 12);

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(190,210,228,0.88)';
    ctx.fillText(objectiveText, panelX + 10, panelY + 56);

    mechanicChips.forEach((chip, chipIndex) => {
      const row = Math.floor(chipIndex / 3);
      const col = chipIndex % 3;
      const chipX = panelX + 10 + col * 68;
      const chipY = panelY + 67 + row * 16;
      ctx.fillStyle = colorWithAlpha(chip.color, 0.18);
      ctx.beginPath();
      drawRoundedRect(ctx, chipX, chipY, 60, 12, 6);
      ctx.fill();
      ctx.strokeStyle = colorWithAlpha(chip.color, 0.35);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      drawRoundedRect(ctx, chipX, chipY, 60, 12, 6);
      ctx.stroke();
      ctx.font = 'bold 6px "Share Tech Mono",monospace';
      ctx.fillStyle = chip.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chip.label, chipX + 30, chipY + 6.5);
    });

    ctx.restore();
  }

  /* ── Info panel (hover tooltip) ── */
  static drawInfoPanel(ctx, game, W, H) {
    const n = game.hoverNode;
    if (!n || game.state !== 'playing') return;

    const t          = game.time;
    const isRelay    = n.isRelay;
    const isPlayer   = n.owner === 1;
    const isNeutral  = n.owner === 0;
    const isEnemy    = n.owner !== 0 && n.owner !== 1;
    const lvl        = n.level;
    const energy     = Math.round(n.energy);
    const maxE       = n.maxE;
    const fillPct    = Math.round((energy / maxE) * 100);
    const col        = ownerColor(n.owner, lvl);
    const theme      = ownerPanelTheme(n.owner);
    const colBg      = theme.bg;
    const colBdr     = theme.border;

    /* Highlight ring on hovered cell */
    const ncx   = n.x + (game.camX || 0);
    const ncy   = n.y + (game.camY || 0);
    const pulse = 0.55 + Math.sin(t * 6) * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ncx, ncy, n.radius + RENDER_RULES.UI.HOVER_RING_OFFSET_PX, 0, Math.PI * 2);
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = pulse;
    ctx.setLineDash(RENDER_RULES.UI.PANEL_CONNECTOR_DASH); ctx.stroke(); ctx.setLineDash([]);
    if (game.hoverPin) {
      ctx.beginPath();
      ctx.arc(ncx, ncy - n.radius - RENDER_RULES.UI.HOVER_PIN_Y_OFFSET_PX, 3, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fill();
    }
    ctx.restore();

    /* Labels */
    const lang = game._lang || 'en';
    const LABEL = lang === 'pt' ? {
      title_neutral:'CÉLULA NEUTRA', title_enemy:'CÉLULA INIMIGA', title_player:'CÉLULA ALIADA', title_relay:'RETRANSMISSOR',
      level:'NÍVEL', energy:'ENERGIA', regen:'REGEN', slots:'SLOTS',
      sent:'ENVIADOS', slots_free:'LIVRES', incoming:'ATACANDO',
      capture:'CAPTURA', contested:'DISPUTADA', contest_leader:'LÍDER', contest_target:'META', threat:'AMEAÇA A VOCÊ',
      shield:'ESCUDO ATIVO', overflow:'TRANSBORDANDO', pin:'[clique p/ fixar]', relay_buffer:'BUFFER',
      flow_in:'ENTRADA', flow_out:'SAÍDA', under_attack:'SOB ATAQUE',
    } : {
      title_neutral:'NEUTRAL CELL', title_enemy:'ENEMY CELL', title_player:'FRIENDLY CELL', title_relay:'RELAY NODE',
      level:'LEVEL', energy:'ENERGY', regen:'REGEN', slots:'SLOTS',
      sent:'SENT', slots_free:'FREE', incoming:'ATTACKING YOU',
      capture:'CAPTURE', contested:'CONTESTED', contest_leader:'LEADER', contest_target:'TARGET', threat:'THREAT TO YOU',
      shield:'SHIELD ACTIVE', overflow:'OVERFLOWING', pin:'[click to pin]', relay_buffer:'BUFFER',
      flow_in:'FLOW IN', flow_out:'FLOW OUT', under_attack:'UNDER ATTACK',
    };

    const frenzyActive = game.frenzyTimer > 0 && n.owner === 1;
    const regen        = isNeutral ? 0 : +computeNodeDisplayRegenRate(n, frenzyActive).toFixed(1);
    const totalSlots = PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL[
      Math.min(lvl, PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL.length - 1)
    ];
    const activeSent   = game._utils.liveOut(n);
    const incomingAtk  = game.tents.filter(t2 =>
      t2.alive && t2.source && t2.target &&
      (t2.state === 'active' || t2.state === 'advancing') &&
      t2.target === n && t2.source.owner !== n.owner
    ).length;
    const captureThreshold = Math.max(1, n.captureThreshold || 10);
    const contestEntries = isNeutral && n.contest
      ? [1, 2, 3]
        .map(owner => ({ owner, score: n.contest[owner] || 0 }))
        .filter(entry => entry.score > 0)
        .sort((left, right) => right.score - left.score)
      : [];
    const leadingContest = contestEntries[0] || null;
    const contestPct = leadingContest
      ? Math.round((leadingContest.score / captureThreshold) * 100)
      : 0;
    const contested  = contestEntries.length > 1;
    const threatStr  = isEnemy ? (
      incomingAtk === 0 ? 'NONE' : incomingAtk === 1 ? 'LOW' : incomingAtk <= 2 ? 'MODERATE' : 'HIGH'
    ) : null;
    const threatCol  = {NONE:'#4a5e72', LOW:'#f5c518', MODERATE:'#ff7090', HIGH:'#ff3d5a'};
    const ownerLabel = owner => {
      if (owner === 1) return lang === 'pt' ? 'JOGADOR' : 'PLAYER';
      if (owner === 2) return lang === 'pt' ? 'VERMELHO' : 'RED';
      if (owner === 3) return lang === 'pt' ? 'ROXO' : 'PURPLE';
      return lang === 'pt' ? 'NEUTRO' : 'NEUTRAL';
    };

    const rows = [];
    rows.push({
      label: LABEL.level,
      value: isRelay ? 'RELAY' : lvl + ' / ' + (PROGRESSION_RULES.MAX_TENTACLE_SLOTS_PER_LEVEL.length - 1),
    });
    rows.push({ label: LABEL.energy, value: energy + ' / ' + maxE,
                bar: { pct: fillPct / 100, col: ownerColor(n.owner, Math.min(lvl, 4)) } });
    if (isRelay) {
      rows.push({ label: LABEL.relay_buffer, value: (n.relayFeedBudget || 0).toFixed(1) + ' e/s' });
    } else if (!isNeutral) {
      const regenVal = '+' + regen + ' e/s';
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
      const contestColor = leadingContest ? ownerColor(leadingContest.owner, Math.min(lvl, 4)) : '#00e5ff';
      rows.push({
        label: LABEL.capture,
        value: contestPct + '%',
        bar: { pct: contestPct / 100, col: contestColor },
        accent: contestPct > 0,
        accentCol: leadingContest ? contestColor : undefined,
      });
      if (leadingContest) {
        rows.push({
          label: LABEL.contest_leader,
          value: ownerLabel(leadingContest.owner),
          accent: true,
          accentCol: contestColor,
          sub: `${Math.round(leadingContest.score)} / ${captureThreshold}`,
        });
      } else {
        rows.push({ label: LABEL.contest_target, value: captureThreshold.toString() });
      }
      if (contested) {
        rows.push({
          label: LABEL.contested,
          value: '⚔',
          accent: true,
          accentCol: '#f5c518',
          sub: contestEntries.slice(1).map(entry => ownerLabel(entry.owner)).join(' · '),
        });
      }
    }
    if (!isNeutral && energy >= maxE * 0.95) {
      rows.push({ label: LABEL.overflow, value: '●', accent: true, accentCol: '#f5c518' });
    }
    if (!isNeutral && energy >= maxE * 0.95 && incomingAtk === 0) {
      rows.push({ label: LABEL.shield, value: '◈', accent: true, accentCol: '#55faff' });
    }

    const PW = RENDER_RULES.UI.PANEL_WIDTH_PX;
    const ROW = RENDER_RULES.UI.PANEL_ROW_HEIGHT_PX;
    const PAD = RENDER_RULES.UI.PANEL_PADDING_PX;
    const titleH = RENDER_RULES.UI.PANEL_TITLE_HEIGHT_PX;
    const PH = titleH + PAD + rows.length * ROW + PAD + 12;
    let px = ncx + n.radius + 18, py = ncy - PH / 2;
    if (px + PW > W - RENDER_RULES.UI.PANEL_EDGE_MARGIN_PX) px = ncx - n.radius - PW - 18;
    if (px < RENDER_RULES.UI.PANEL_EDGE_MARGIN_PX) px = RENDER_RULES.UI.PANEL_EDGE_MARGIN_PX;
    py = Math.max(RENDER_RULES.UI.PANEL_EDGE_MARGIN_PX, Math.min(H - PH - RENDER_RULES.UI.PANEL_EDGE_MARGIN_PX, py));

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18;
    ctx.fillStyle   = colBg;
    ctx.beginPath(); drawRoundedRect(ctx, px, py, PW, PH, 7); ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = colBdr; ctx.lineWidth = 1.2;
    ctx.beginPath(); drawRoundedRect(ctx, px, py, PW, PH, 7); ctx.stroke();
    ctx.fillStyle   = col; ctx.globalAlpha = 0.55;
    ctx.beginPath(); drawRoundedRect(ctx, px, py, PW, 3, { tl:7, tr:7, bl:0, br:0 }); ctx.fill();
    ctx.globalAlpha = 1;
    const title = isRelay ? LABEL.title_relay : isPlayer ? LABEL.title_player : isNeutral ? LABEL.title_neutral : LABEL.title_enemy;
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
        ctx.beginPath(); drawRoundedRect(ctx, bx, by2, bw, bh, 1.5); ctx.fill();
        if (row.bar.pct > 0) {
          ctx.fillStyle = row.bar.col; ctx.globalAlpha = 0.75;
          ctx.beginPath(); drawRoundedRect(ctx, bx, by2, bw * Math.min(1, row.bar.pct), bh, 1.5); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });

    /* Connector line */
    const cx2 = ncx + n.radius * (px < ncx ? -1 : 1) * 1;
    const px2  = px < ncx ? px + PW : px;
    ctx.strokeStyle = colBdr; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
    ctx.setLineDash(RENDER_RULES.UI.PANEL_CONNECTOR_DASH);
    ctx.beginPath(); ctx.moveTo(cx2, ncy); ctx.lineTo(px2, py + PH / 2); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ── Frenzy bar ── */
  static drawFrenzy(ctx, game, W, H) {
    if (game.frenzyTimer <= 0) return;
    const t     = game.frenzyTimer / 4.0;
    const pulse = 0.7 + Math.sin((game.time || 0) * 12) * 0.3;
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
    const isPrimarySlice = game._slicePointerButton === 0;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(game.slicePath[0].x, game.slicePath[0].y);
    game.slicePath.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = isPrimarySlice ? '#00e5ff' : '#f5c518';
    ctx.lineWidth = isPrimarySlice ? 2 : 2.5;
    ctx.globalAlpha = isPrimarySlice ? 0.55 : 0.85;
    ctx.shadowColor = isPrimarySlice ? '#00e5ff' : '#f5c518';
    ctx.shadowBlur = isPrimarySlice ? 6 : 10;
    ctx.setLineDash(RENDER_RULES.UI.SLICER_DASH);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  /* ── Preview line (selected → cursor) ── */
  static drawPreview(ctx, game) {
    if (!game.sel || !game.cfg || game.paused) return;
    const camX = game.camX || 0, camY = game.camY || 0;
    const sx = game.sel.x + camX, sy = game.sel.y + camY;
    const cmx = game.mx - camX, cmy = game.my - camY;

    /* Snap to nearest node within the configured assist radius */
    let targetScreenX = game.mx;
    let targetScreenY = game.my;
    let snappedTargetNode = null;
    game.nodes.forEach(node => {
      if (node === game.sel) return;
      const snapDistance = Math.hypot(node.x - cmx, node.y - cmy);
      if (
        snapDistance < INPUT_TUNING.NODE_SNAP_DISTANCE_PX &&
        (!snappedTargetNode || snapDistance < Math.hypot(snappedTargetNode.x - cmx, snappedTargetNode.y - cmy))
      ) {
        snappedTargetNode = node;
      }
    });
    if (snappedTargetNode) {
      targetScreenX = snappedTargetNode.x + camX;
      targetScreenY = snappedTargetNode.y + camY;
    }

    const deltaX = targetScreenX - sx;
    const deltaY = targetScreenY - sy;
    const distanceToCursor = Math.hypot(deltaX, deltaY);
    if (distanceToCursor < RENDER_RULES.UI.PREVIEW_MIN_DISTANCE_PX) return;

    const distanceCostMultiplier = game.cfg.distanceCostMultiplier;
    const maxReach = maxRange(game.sel.energy - 1, distanceCostMultiplier);
    const reachableDistance = Math.min(distanceToCursor, maxReach);
    const canFire  = game.sel.energy >= computeBuildCost(distanceToCursor) + distanceToCursor * distanceCostMultiplier + 1 &&
                     game._utils.liveOut(game.sel) < MAX_SLOTS[game.sel.level] &&
                     (!snappedTargetNode || snappedTargetNode !== game.sel);
    const normalizedX = deltaX / distanceToCursor;
    const normalizedY = deltaY / distanceToCursor;
    const reachX = sx + normalizedX * reachableDistance;
    const reachY = sy + normalizedY * reachableDistance;

    ctx.save();
    if (reachableDistance > 0) {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(reachX, reachY);
      ctx.strokeStyle = canFire ? 'rgba(0,229,255,0.75)' : 'rgba(245,197,24,0.7)';
      ctx.lineWidth   = 2; ctx.setLineDash(RENDER_RULES.UI.PREVIEW_REACH_DASH);
      ctx.shadowColor = canFire ? '#00e5ff' : '#f5c518'; ctx.shadowBlur = 6; ctx.stroke();
      ctx.beginPath(); ctx.arc(reachX, reachY, 3, 0, Math.PI * 2);
      ctx.fillStyle   = canFire ? '#00e5ff' : '#f5c518'; ctx.globalAlpha = 0.85;
      ctx.shadowBlur  = 10; ctx.fill();
    }
    if (reachableDistance < distanceToCursor) {
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(reachX, reachY); ctx.lineTo(targetScreenX, targetScreenY);
      ctx.strokeStyle = 'rgba(255,61,90,0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash(RENDER_RULES.UI.PREVIEW_OVERFLOW_DASH);
      ctx.stroke();
    }
    const buildCost = computeBuildCost(distanceToCursor) + distanceToCursor * distanceCostMultiplier;
    ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.globalAlpha = 0.8;
    ctx.font = '8px "Share Tech Mono",monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = canFire ? '#00e5ff' : '#ff3d5a';
    ctx.fillText(Math.ceil(buildCost) + 'e', targetScreenX + 14, targetScreenY - 8);
    if (!canFire && distanceToCursor > maxReach + 5) {
      ctx.fillStyle = 'rgba(255,61,90,0.6)'; ctx.font = '7px "Share Tech Mono",monospace';
      ctx.fillText('-' + Math.ceil(distanceToCursor - maxReach) + 'px', targetScreenX + 14, targetScreenY + 3);
    }
    ctx.restore();
  }
}
