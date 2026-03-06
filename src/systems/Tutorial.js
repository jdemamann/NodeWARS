/* ================================================================
   NODE WARS v3 — Tutorial System
   Handles tutorial step logic, ghost-cursor drawing, and UI.
   ================================================================ */

import { LANG, T } from '../i18n.js';
import { STATE } from '../GameState.js';
import { bezPt } from '../utils.js';
import { NodeType, TentState } from '../constants.js';
import { IDS } from '../ui/IDS.js';
import { fadeGo, showScr } from '../ui/Screens.js';

export class Tutorial {
  constructor(game) {
    this.game        = game;
    this.step        = 0;
    this.done        = false;
    this.ghostAnim   = 0;
    this.actionDone  = false;

    /* State flags for action detection */
    this.had_sel     = false;
    this.had_tent    = false;
    this.had_capture = false;
    this.had_retract = false;
    this.had_cut     = false;
    this.needsCut    = false;
  }

  get steps() {
    const w = this.game.cfg?.tutW || 1;
    return LANG[STATE.curLang]['tut' + (w > 1 ? w : '')] || LANG[STATE.curLang].tut;
  }

  get cur() { return this.steps[this.step]; }

  reset() {
    this.step = 0; this.done = false; this.actionDone = false;
    this.had_sel = false; this.had_tent = false; this.had_capture = false;
    this.had_retract = false; this.had_cut = false; this.needsCut = false;
  }

  /* ── Called each frame by Game.update ── */
  tick(game) {
    this.ghostAnim = (this.ghostAnim + 0.02) % 1;
    const s = this.cur;
    if (!s || this.actionDone) return;

    const wasActionDone = this.actionDone;
    const nodes = game.nodes, tents = game.tents;
    const pNode = nodes.find(n => n.owner === 1 && !n.isRelay);

    switch (s.action) {
      case 'read':    this.actionDone = true; break;
      case 'select':  if (game.sel?.owner === 1) { this.had_sel = true; this.actionDone = true; } break;
      case 'tentacle':
        if (tents.some(t => t.alive && t.source?.owner === 1)) { this.had_tent = true; this.actionDone = true; }
        break;
      case 'capture':
        if (nodes.some(n => n.owner === 1 && n !== pNode && !n.isRelay)) { this.had_capture = true; this.actionDone = true; }
        break;
      case 'retract':
        if (this.had_capture && !tents.some(t => t.alive && t.source?.owner === 1)) { this.had_retract = true; this.actionDone = true; }
        break;
      case 'cut':
        if (!this.needsCut && tents.some(t => t.alive && t.source?.owner === 1)) this.needsCut = true;
        if (this.needsCut && !tents.some(t => t.alive && t.source?.owner === 1) && this.had_retract) { this.had_cut = true; this.actionDone = true; }
        break;
      case 'done': this.actionDone = true; break;
      case 'capture_relay':
        if (nodes.some(n => n.isRelay && n.owner === 1)) this.actionDone = true;
        break;
    }

    if (this.actionDone && !wasActionDone) this._revealNext();
  }

  _revealNext() {
    const btn = document.getElementById(IDS.TUT_NEXT);
    if (!btn) return;
    const isLast = this.step >= this.steps.length - 1;
    const tw = this.game.cfg?.tutW || 1;
    btn.textContent = isLast
      ? (tw > 1 ? T('startWorld' + tw) || T('startCampaign') : T('startCampaign'))
      : 'NEXT →';
    btn.style.display = 'inline-block';
  }

  showStep() {
    const s = this.cur; if (!s) return;
    if (s.action === 'read' || s.action === 'done') this.actionDone = true;

    const tw = this.game.cfg?.tutW || 1;
    const tc = ({ 1:'#00ff9d', 2:'#c040ff', 3:'#ff9020' })[tw] || '#00ff9d';

    const titleEl = document.getElementById(IDS.TUT_TITLE);
    if (titleEl) { titleEl.textContent = s.title; titleEl.style.color = tc; }

    const badgeEl = document.getElementById(IDS.TUT_BADGE);
    if (badgeEl) {
      const wn = { 1:'WORLD 1: GENESIS', 2:'WORLD 2: THE VOID', 3:'WORLD 3: NEXUS PRIME' }[tw];
      badgeEl.textContent = wn || '';
      badgeEl.style.color = tc;
      badgeEl.style.display = tw > 1 ? 'block' : 'none';
    }

    const textEl = document.getElementById(IDS.TUT_TEXT);
    if (textEl) textEl.innerHTML = s.text;

    /* Step dots */
    const dotsEl = document.getElementById(IDS.TUT_STEPS);
    if (dotsEl) {
      dotsEl.innerHTML = this.steps.map((_, i) =>
        `<div class="tstep${i < this.step ? ' done' : i === this.step ? ' on' : ''}"></div>`
      ).join('');
    }

    const btn = document.getElementById(IDS.TUT_NEXT);
    if (btn) {
      const isLast = this.step >= this.steps.length - 1;
      if (isLast) {
        btn.textContent = tw > 1 ? T('startWorld' + tw) || T('startCampaign') : T('startCampaign');
        btn.style.display = 'inline-block';
      } else if (this.actionDone) {
        btn.textContent = 'NEXT →';
        btn.style.display = 'inline-block';
      } else {
        btn.style.display = 'none';
      }
    }

    const box = document.getElementById(IDS.TUTBOX);
    if (box) box.style.display = 'block';
  }

  advance() {
    const s = this.cur;
    if (!this.actionDone && s?.action !== 'read' && s?.action !== 'done') return;
    this.step++;
    if (this.step >= this.steps.length) {
      const box = document.getElementById(IDS.TUTBOX);
      if (box) box.style.display = 'none';
      this.done = true;
      const tw      = this.game.cfg?.tutW || 1;
      const nextLvl = { 1:1, 2:12, 3:23 }[tw] || 1;
      /* Mark tutorial completed and unlock the corresponding world */
      STATE.completed = Math.max(STATE.completed, tw === 1 ? 0 : tw === 2 ? 11 : 22);
      STATE.curLvl    = nextLvl;
      STATE.save();
      fadeGo(() => { showScr(null); this.game.loadLevel(nextLvl); });
      return;
    }
    this.actionDone = false;
    this.showStep();
  }

  /* ── Ghost cursor target ── */
  _ghostTarget(game) {
    const s = this.cur; if (!s) return null;
    const nodes  = game.nodes;
    const pNode  = nodes.find(n => n.owner === 1);
    if (!pNode) return null;

    const neutrals = nodes.filter(n => n.owner === 0);
    const nearest  = neutrals.reduce((best, n) => {
      const d = Math.hypot(n.x - pNode.x, n.y - pNode.y);
      return (!best || d < best.d) ? { n, d } : best;
    }, null);
    const neutral = nearest?.n || null;

    switch (s.action) {
      case 'select':   return { node: pNode,   r: pNode.radius + 16,   label: s.hint, cx: 'click' };
      case 'tentacle': return neutral ? { node: neutral, r: neutral.radius + 16, label: s.hint, cx: 'click' } : null;
      case 'retract':  return { node: pNode,   r: pNode.radius + 16,   label: s.hint, cx: 'click' };
      case 'capture_relay': {
        const relay = nodes.find(n => n.isRelay && n.owner !== 1);
        return relay
          ? { node: relay, r: relay.radius + 16, label: s.hint, cx: 'click' }
          : { node: pNode, r: pNode.radius + 16, label: s.hint, cx: 'click' };
      }
      case 'cut': {
        const tent = game.tents.find(t => t.alive && (t.state === TentState.ACTIVE || t.state === TentState.GROWING) && t.source?.owner === 1);
        if (tent) {
          const cp = tent.getCP();
          const mp = bezPt(0.5, tent.source.x, tent.source.y, cp.x, cp.y, tent.target.x, tent.target.y);
          return { x: mp.x, y: mp.y, label: s.hint, r: 16, cx: 'scissors', direct: true };
        }
        return { node: pNode, r: pNode.radius + 16, label: s.hint, cx: 'click' };
      }
      default: return null;
    }
  }

  /* ── Draw ghost cursor ── */
  draw(ctx, game, time) {
    const s2 = this.cur;
    /* For "read" steps, show world-specific visual indicator */
    if (s2?.action === 'read') {
      this._drawReadIndicator(ctx, game, time);
      return;
    }

    const g = this._ghostTarget(game); if (!g) return;
    const _cx = game.camX || 0, _cy = game.camY || 0;
    const gx  = (g.node ? g.node.x : g.x) + _cx;
    const gy  = (g.node ? g.node.y : g.y) + _cy;
    const gr  = g.node ? g.node.radius + 16 : g.r;
    const H   = ctx.canvas.height;
    const pulse = Math.sin(time * 5) * 0.5 + 0.5;

    ctx.save();
    ctx.shadowColor = '#00ff9d';

    /* Pulsing rings */
    ctx.beginPath(); ctx.arc(gx, gy, gr + 6 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2; ctx.globalAlpha = 0.45 + pulse * 0.4; ctx.shadowBlur = 20; ctx.stroke();
    ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 1.5; ctx.setLineDash([5,5]); ctx.globalAlpha = 0.65; ctx.shadowBlur = 8; ctx.stroke();
    ctx.setLineDash([]);

    /* Corner ticks */
    const tick = 10, off = gr + 3;
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(gx + sx*off, gy + sy*(off-tick)); ctx.lineTo(gx + sx*off, gy + sy*off); ctx.lineTo(gx + (sx*(off-tick)), gy + sy*off);
      ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + pulse * 0.3; ctx.shadowBlur = 10; ctx.stroke();
    });

    /* Cursor icon */
    const above    = gy - gr - 60 > 0;
    const below    = gy + gr + 60 < H;
    const useAbove = above || !below;
    const BOUNCE   = Math.sin(time * 3.5) * 7;
    const iconY    = useAbove ? gy - gr - 52 + BOUNCE : gy + gr + 52 + BOUNCE;

    if (g.cx === 'scissors') {
      ctx.font = 'bold 24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#00ff9d'; ctx.globalAlpha = 0.88 + pulse * 0.12; ctx.shadowBlur = 16;
      ctx.fillText('\u2702', gx, iconY);
    } else {
      ctx.save();
      ctx.translate(gx, iconY);
      if (!useAbove) ctx.scale(1, -1);
      ctx.beginPath();
      ctx.moveTo(0,-12); ctx.lineTo(0,7); ctx.lineTo(3.5,3.5); ctx.lineTo(6,10);
      ctx.lineTo(8,9); ctx.lineTo(5.5,2.5); ctx.lineTo(10,2.5); ctx.closePath();
      ctx.fillStyle = '#00ff9d'; ctx.globalAlpha = 0.92 + pulse * 0.08; ctx.shadowBlur = 14; ctx.fill();
      const rr = 7 + pulse * 16;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 1.2; ctx.globalAlpha = (1-pulse)*0.6; ctx.shadowBlur = 8; ctx.stroke();
      ctx.restore();
    }

    /* Dashed stem */
    const stemStart = useAbove ? iconY + 18 : iconY - 18;
    const stemEnd   = useAbove ? gy - gr - 4 : gy + gr + 4;
    if (Math.abs(stemEnd - stemStart) > 8) {
      ctx.beginPath(); ctx.moveTo(gx, stemStart); ctx.lineTo(gx, stemEnd);
      ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 1.5; ctx.setLineDash([4,5]);
      ctx.globalAlpha = 0.38 + pulse * 0.22; ctx.shadowBlur = 6; ctx.stroke(); ctx.setLineDash([]);
      const tipDir = useAbove ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(gx, stemEnd+tipDir); ctx.lineTo(gx-5, stemEnd-tipDir*7); ctx.lineTo(gx+5, stemEnd-tipDir*7); ctx.closePath();
      ctx.fillStyle = '#00ff9d'; ctx.globalAlpha = 0.65 + pulse * 0.3; ctx.fill();
    }

    /* Hint label */
    if (g.label) {
      const ly = useAbove ? gy + gr + 14 : gy - gr - 26;
      ctx.font = 'bold 10px "Share Tech Mono"'; ctx.textAlign = 'center';
      ctx.textBaseline = useAbove ? 'top' : 'bottom';
      ctx.fillStyle = '#00ff9d'; ctx.globalAlpha = 0.82 + pulse * 0.16; ctx.shadowBlur = 10;
      ctx.fillText(g.label, gx, ly);
    }

    ctx.restore();
  }

  _drawReadIndicator(ctx, game, time) {
    const pN  = game.nodes.find(n => n.owner === 1);
    const tw  = game.cfg?.tutW || 1;
    const _cx = game.camX || 0, _cy = game.camY || 0;

    ctx.save();
    ctx.translate(_cx, _cy);

    if (tw === 2 && game.hazards?.length) {
      const hz = game.hazards[0];
      const sw = (time * 1.2) % (Math.PI * 2);
      for (let i = 0; i < 4; i++) {
        const a = sw + (i/4)*Math.PI*2;
        ctx.beginPath(); ctx.arc(hz.x + Math.cos(a)*(hz.r+20), hz.y + Math.sin(a)*(hz.r+20), 3.5, 0, Math.PI*2);
        ctx.fillStyle = '#c040ff'; ctx.globalAlpha = 0.55 + i*0.1; ctx.shadowColor = '#c040ff'; ctx.shadowBlur = 12; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r+20, sw, sw+Math.PI*0.9);
      ctx.strokeStyle = 'rgba(180,0,255,0.4)'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.stroke();

    } else if (tw === 3 && (game.pulsars?.length || game.nodes.some(n => n.isRelay))) {
      const relay = game.nodes.find(n => n.isRelay);
      const ps    = game.pulsars?.[0];
      const sw    = (time * 0.8) % (Math.PI * 2);
      if (relay) {
        for (let i = 0; i < 3; i++) {
          const a = sw + (i/3)*Math.PI*2, rr = relay.radius + 20;
          ctx.beginPath(); ctx.arc(relay.x + Math.cos(a)*rr, relay.y + Math.sin(a)*rr, 3, 0, Math.PI*2);
          ctx.fillStyle = '#00e5ff'; ctx.globalAlpha = 0.6; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10; ctx.fill();
        }
      }
      if (ps) {
        for (let i = 0; i < 3; i++) {
          const a = -sw + (i/3)*Math.PI*2;
          ctx.beginPath(); ctx.arc(ps.x + Math.cos(a)*28, ps.y + Math.sin(a)*28, 3, 0, Math.PI*2);
          ctx.fillStyle = '#ff9020'; ctx.globalAlpha = 0.6; ctx.shadowColor = '#ff9020'; ctx.shadowBlur = 10; ctx.fill();
        }
      }

    } else if (pN) {
      const sw = (time * 0.6) % (Math.PI * 2), r2 = pN.radius + 28;
      for (let i = 0; i < 3; i++) {
        const a = sw + (i/3)*Math.PI*2;
        ctx.beginPath(); ctx.arc(pN.x + Math.cos(a)*r2, pN.y + Math.sin(a)*r2, 4, 0, Math.PI*2);
        ctx.fillStyle = '#00ff9d'; ctx.globalAlpha = 0.5 + i*0.15; ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 10; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(pN.x, pN.y, r2, sw, sw+Math.PI*0.7);
      ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.35; ctx.shadowBlur = 8; ctx.stroke();
    }

    ctx.restore();
  }
}
