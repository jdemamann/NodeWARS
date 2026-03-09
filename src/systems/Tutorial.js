/* ================================================================
   NODE WARS v3 — Tutorial System
   Handles tutorial step logic, ghost-cursor drawing, and UI.
   ================================================================ */

import { getTutorialSteps, T } from '../localization/i18n.js';
import { STATE } from '../core/GameState.js';
import { computeBezierPoint } from '../math/bezierGeometry.js';
import { GAMEPLAY_RULES, NodeType, TentState } from '../config/gameConfig.js';
import { DOM_IDS } from '../ui/DomIds.js';
import { fadeGo, showScr, buildWorldTabs, syncWorldTab } from '../ui/ScreenController.js';

const { render: RENDER_RULES } = GAMEPLAY_RULES;

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
    const tutorialWorldId = this.game.cfg?.tutorialWorldId || 1;
    return getTutorialSteps(STATE.curLang, tutorialWorldId);
  }

  get cur() { return this.steps[this.step]; }

  reset() {
    this.step = 0; this.done = false; this.actionDone = false;
    this.had_sel = false; this.had_tent = false; this.had_capture = false;
    this.had_retract = false; this.had_cut = false; this.needsCut = false;
  }

  isRigid() {
    return !!this.game.cfg?.isTutorial && !this.done;
  }

  _getPrimaryPlayerNode() {
    return this.game.nodes.find(node => node.owner === 1 && !node.isRelay) || null;
  }

  _getExpectedNeutralTarget() {
    const primaryPlayerNode = this._getPrimaryPlayerNode();
    if (!primaryPlayerNode) return null;

    const neutralNodes = this.game.nodes.filter(node => node.owner === 0 && !node.isRelay);
    return neutralNodes.reduce((bestNode, node) => {
      if (!bestNode) return node;
      const bestDistance = Math.hypot(bestNode.x - primaryPlayerNode.x, bestNode.y - primaryPlayerNode.y);
      const nodeDistance = Math.hypot(node.x - primaryPlayerNode.x, node.y - primaryPlayerNode.y);
      return nodeDistance < bestDistance ? node : bestNode;
    }, null);
  }

  _getExpectedRelayTarget() {
    return this.game.nodes.find(node => node.isRelay && node.owner !== 1) || null;
  }

  _hasTutorialPlayerTentacle() {
    return this.game.tents.some(
      tentacle => tentacle.alive &&
        (tentacle.state === TentState.ACTIVE || tentacle.state === TentState.GROWING) &&
        tentacle.source?.owner === 1
    );
  }

  allowsClickIntent(clickIntent) {
    if (!this.isRigid()) return true;

    const currentAction = this.cur?.action;
    const primaryPlayerNode = this._getPrimaryPlayerNode();
    const expectedNeutralTarget = this._getExpectedNeutralTarget();
    const expectedRelayTarget = this._getExpectedRelayTarget();

    switch (currentAction) {
      case 'read':
      case 'done':
        return false;
      case 'select':
        return clickIntent.type === 'select_player_node' && clickIntent.node === primaryPlayerNode;
      case 'tentacle':
      case 'capture':
        if (clickIntent.type === 'select_player_node') return clickIntent.node === primaryPlayerNode;
        if (clickIntent.type === 'build_tentacle') {
          return clickIntent.sourceNode === primaryPlayerNode && clickIntent.targetNode === expectedNeutralTarget;
        }
        return false;
      case 'capture_relay':
        if (clickIntent.type === 'select_player_node') return clickIntent.node === primaryPlayerNode;
        if (clickIntent.type === 'build_tentacle') {
          return clickIntent.sourceNode === primaryPlayerNode && clickIntent.targetNode === expectedRelayTarget;
        }
        return false;
      case 'retract':
        if (clickIntent.type === 'select_player_node') return clickIntent.node === primaryPlayerNode;
        return clickIntent.type === 'retract_node_tentacles';
      case 'cut':
        if (!this._hasTutorialPlayerTentacle()) {
          if (clickIntent.type === 'select_player_node') return clickIntent.node === primaryPlayerNode;
          if (clickIntent.type === 'build_tentacle') {
            return clickIntent.sourceNode === primaryPlayerNode && clickIntent.targetNode === expectedNeutralTarget;
          }
        }
        return false;
      default:
        return false;
    }
  }

  canStartDragConnect(sourceNode) {
    if (!this.isRigid()) return true;

    const currentAction = this.cur?.action;
    const primaryPlayerNode = this._getPrimaryPlayerNode();
    return (currentAction === 'tentacle' || currentAction === 'capture' || currentAction === 'capture_relay' ||
      (currentAction === 'cut' && !this._hasTutorialPlayerTentacle())) &&
      sourceNode === primaryPlayerNode;
  }

  filterDragConnectTarget(sourceNode, targetNode) {
    if (!this.isRigid()) return targetNode;
    if (!sourceNode || !targetNode) return null;

    const currentAction = this.cur?.action;
    if (currentAction === 'tentacle' || currentAction === 'capture' || currentAction === 'cut') {
      return targetNode === this._getExpectedNeutralTarget() ? targetNode : null;
    }
    if (currentAction === 'capture_relay') {
      return targetNode === this._getExpectedRelayTarget() ? targetNode : null;
    }
    return null;
  }

  canStartSlice() {
    if (!this.isRigid()) return true;
    return this.cur?.action === 'cut' && this._hasTutorialPlayerTentacle();
  }

  filterSliceCuts(sliceCuts) {
    if (!this.isRigid()) return sliceCuts;
    if (this.cur?.action !== 'cut') return [];

    const playerTentacle = this.game.tents.find(
      tentacle => tentacle.alive &&
        (tentacle.state === TentState.ACTIVE || tentacle.state === TentState.GROWING) &&
        tentacle.source?.owner === 1
    );

    if (!playerTentacle) return [];
    return sliceCuts.filter(sliceCut => sliceCut.tentacle === playerTentacle);
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
    const btn = document.getElementById(DOM_IDS.TUT_NEXT);
    if (!btn) return;
    const isLast = this.step >= this.steps.length - 1;
    const tw = this.game.cfg?.tutorialWorldId || 1;
    btn.textContent = isLast
      ? (tw > 1 ? T('startWorld' + tw) || T('startCampaign') : T('startCampaign'))
      : 'NEXT →';
    btn.style.display = 'inline-block';
  }

  showStep() {
    const s = this.cur; if (!s) return;
    if (s.action === 'read' || s.action === 'done') this.actionDone = true;

    const tw = this.game.cfg?.tutorialWorldId || 1;
    const tc = ({ 1:'#00ff9d', 2:'#c040ff', 3:'#ff9020' })[tw] || '#00ff9d';

    const titleEl = document.getElementById(DOM_IDS.TUT_TITLE);
    if (titleEl) { titleEl.textContent = s.title; titleEl.style.color = tc; }

    const badgeEl = document.getElementById(DOM_IDS.TUT_BADGE);
    if (badgeEl) {
      const wn = { 1:'WORLD 1: GENESIS', 2:'WORLD 2: THE VOID', 3:'WORLD 3: NEXUS PRIME' }[tw];
      badgeEl.textContent = wn || '';
      badgeEl.style.color = tc;
      badgeEl.style.display = tw > 1 ? 'block' : 'none';
    }

    const textEl = document.getElementById(DOM_IDS.TUT_TEXT);
    if (textEl) textEl.innerHTML = s.text;

    /* Step dots */
    const dotsEl = document.getElementById(DOM_IDS.TUT_STEPS);
    if (dotsEl) {
      dotsEl.innerHTML = this.steps.map((_, i) =>
        `<div class="tstep${i < this.step ? ' done' : i === this.step ? ' on' : ''}"></div>`
      ).join('');
    }

    const btn = document.getElementById(DOM_IDS.TUT_NEXT);
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

    const box = document.getElementById(DOM_IDS.TUTBOX);
    if (box) box.style.display = 'block';
  }

  advance() {
    const s = this.cur;
    if (!this.actionDone && s?.action !== 'read' && s?.action !== 'done') return;
    this.step++;
    if (this.step >= this.steps.length) {
      const box = document.getElementById(DOM_IDS.TUTBOX);
      if (box) box.style.display = 'none';
      this.done = true;
      const nextLvl = STATE.getNextLevelId(this.game.cfg?.id) ?? 1;
      /* Tutorials are optional onboarding. Completing one should route the
         player into the first real phase of that world without making the
         tutorial itself a required campaign gate. */
      const tw      = this.game.cfg?.tutorialWorldId || 1;
      STATE.recordTutorialCompletion(tw, this.game.cfg?.id);
      STATE.setCurrentLevel(nextLvl);
      STATE.save();
      fadeGo(() => { showScr(null); this.game.loadLevel(nextLvl); });
      return;
    }
    this.actionDone = false;
    this.showStep();
  }

  exit() {
    this.game.paused = true;
    const tutorialBox = document.getElementById(DOM_IDS.TUTBOX);
    if (tutorialBox) tutorialBox.style.display = 'none';
    this.done = true;
    syncWorldTab();
    buildWorldTabs();
    showScr('levels');
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
      case 'tentacle': return neutral ? { node: neutral, fromNode: pNode, r: neutral.radius + 16, label: s.hint, cx: 'drag' } : null;
      case 'retract':  return { node: pNode,   r: pNode.radius + 16,   label: s.hint, cx: 'click' };
      case 'capture_relay': {
        const relay = nodes.find(n => n.isRelay && n.owner !== 1);
        return relay
          ? { node: relay, fromNode: pNode, r: relay.radius + 16, label: s.hint, cx: 'drag' }
          : { node: pNode, r: pNode.radius + 16, label: s.hint, cx: 'click' };
      }
      case 'cut': {
        const tent = game.tents.find(t => t.alive && (t.state === TentState.ACTIVE || t.state === TentState.GROWING) && t.source?.owner === 1);
        if (tent) {
          const cp = tent.getCP();
          const mp = computeBezierPoint(0.5, tent.source.x, tent.source.y, cp.x, cp.y, tent.target.x, tent.target.y);
          return { x: mp.x, y: mp.y, label: s.hint, r: 16, cx: 'scissors', direct: true, cutTentacle: tent };
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
    const fromX = g.fromNode ? g.fromNode.x + _cx : null;
    const fromY = g.fromNode ? g.fromNode.y + _cy : null;
    const H   = ctx.canvas.height;
    const pulse = Math.sin(time * 5) * 0.5 + 0.5;

    ctx.save();
    ctx.shadowColor = '#00ff9d';

    if (g.fromNode) {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(gx, gy);
      ctx.strokeStyle = '#00ff9d';
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.4 + pulse * 0.22;
      ctx.setLineDash(RENDER_RULES.TUTORIAL.GUIDE_DASH);
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(gx, gy, RENDER_RULES.TUTORIAL.DRAG_RELEASE_RING_RADIUS_PX + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff9d';
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.55 + pulse * 0.2;
      ctx.stroke();
    }

    if (g.cutTentacle) {
      const cp = g.cutTentacle.getCP();
      const left = computeBezierPoint(0.22, g.cutTentacle.source.x + _cx, g.cutTentacle.source.y + _cy, cp.x + _cx, cp.y + _cy, g.cutTentacle.target.x + _cx, g.cutTentacle.target.y + _cy);
      const right = computeBezierPoint(0.78, g.cutTentacle.source.x + _cx, g.cutTentacle.source.y + _cy, cp.x + _cx, cp.y + _cy, g.cutTentacle.target.x + _cx, g.cutTentacle.target.y + _cy);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.55 + pulse * 0.25;
      ctx.setLineDash([4, 4]);
      ctx.shadowColor = '#f5c518';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowColor = '#00ff9d';
    }

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
    } else if (g.cx === 'drag') {
      ctx.save();
      ctx.translate(gx, iconY);
      if (!useAbove) ctx.scale(1, -1);
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(6, -2);
      ctx.lineTo(6, -6);
      ctx.lineTo(14, 0);
      ctx.lineTo(6, 6);
      ctx.lineTo(6, 2);
      ctx.lineTo(-10, 2);
      ctx.closePath();
      ctx.fillStyle = '#00ff9d';
      ctx.globalAlpha = 0.92 + pulse * 0.08;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.restore();
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
    const tw  = game.cfg?.tutorialWorldId || 1;
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
        ctx.beginPath();
        ctx.arc(relay.x, relay.y, relay.radius + 24, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,0.35)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 3; i++) {
          const a = sw + (i/3)*Math.PI*2, rr = relay.radius + 20;
          ctx.beginPath(); ctx.arc(relay.x + Math.cos(a)*rr, relay.y + Math.sin(a)*rr, 3, 0, Math.PI*2);
          ctx.fillStyle = '#00e5ff'; ctx.globalAlpha = 0.6; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10; ctx.fill();
        }
        if (pN) {
          ctx.beginPath();
          ctx.moveTo(pN.x, pN.y);
          ctx.lineTo(relay.x, relay.y);
          ctx.strokeStyle = 'rgba(0,229,255,0.35)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      if (ps) {
        ctx.beginPath();
        ctx.arc(ps.x, ps.y, ps.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,144,32,0.18)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
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
