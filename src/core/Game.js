/* ================================================================
   NODE WARS v3 — Game (loop coordinator)

   Owns the game loop, input handling, level loading, and the
   main update pipeline.  Rendering is delegated to Renderer.
   ================================================================ */

import { LEVELS, TentState, NodeType, TIER_REGEN, GAMEPLAY_RULES } from '../config/gameConfig.js';
import { clamp, computeDistance, computeDistanceSquared, computeNodeRadius } from '../math/simulationMath.js';
import { bus }          from './EventBus.js';
import { STATE }        from './GameState.js';
import { T }            from '../localization/i18n.js';
import { GameNode }     from '../entities/GameNode.js';
import { Tent }         from '../entities/Tent.js';
import { OrbPool, FreeOrbPool, shouldSpawnOrb } from '../entities/Orb.js';
import { AI }           from '../systems/AI.js';
import { Tutorial }     from '../systems/Tutorial.js';
import { Physics }      from '../systems/Physics.js';
import { WorldSystems } from '../systems/WorldSystems.js';
import { applyFixedWorldFeatures, applyNeutralBunkers, populateFixedNodes, populateWorldFeatures } from '../systems/WorldSetup.js';
import { Renderer }     from '../rendering/Renderer.js';
import { HUD }          from '../ui/HUD.js';
import { showScr, showToast, showWorldBanner, endLevel } from '../ui/ScreenController.js';
import { SoundEffects as SFX } from '../audio/SoundEffects.js';
import { Music }        from '../audio/Music.js';
import { DOM_IDS }      from '../ui/DomIds.js';
import { findNodeAtWorldPoint } from '../input/NodeHitTesting.js';
import {
  findOpposingActiveTentacle,
} from '../input/TentacleCommands.js';
import { resolvePinnedHoverState, resolvePlayerClickIntent } from '../input/PlayerClickResolution.js';
import { buildPlayerTentaclePreview } from '../input/BuildPreview.js';
import {
  appendSlicePoint,
  createSlicePathStart,
  createTapCandidate,
} from '../input/InputState.js';
import { getLatestSliceSegment, scanPlayerSliceCuts } from '../input/SliceCutting.js';
import {
  applyPlayerSliceCut,
  buildPlayerSliceToastMessage,
  recordPlayerFrenzyCut,
  recordReactiveDefenseCut,
} from '../input/PlayerSliceEffects.js';
import { bindGameInputEvents } from '../input/GameInputBinding.js';
import { getFixedCampaignLayout } from '../levels/FixedCampaignLayouts.js';

const { input: INPUT_TUNING } = GAMEPLAY_RULES;

function $id(id) { return document.getElementById(id); }

/* Utilities bundle injected into sub-systems that need them */
function makeUtils(game) {
  return {
    liveOut(n) {
      /* outCount is updated every frame by Physics.updateOutCounts — reuse it directly */
      return n.outCount || 0;
    },
    starsFor(sc) {
      if (sc === null || sc <= 0) return 0;
      if (sc >= 700) return 3;
      if (sc >= 430) return 2;
      if (sc >= 200) return 1;
      return 0;
    },
  };
}

export class Game {
  constructor(canvas) {
    this.canvas     = canvas;
    this.W          = canvas.width;
    this.H          = canvas.height;

    this.nodes      = [];
    this.tents      = [];
    this.hazards      = [];
    this.pulsars      = [];
    this.orbPool      = new OrbPool(150);
    this.freeOrbPool  = new FreeOrbPool(30);
    this.visualEvents = [];

    this.sel        = null;
    this.hoverNode  = null;
    this.hoverPin   = false;

    this.time       = 0;
    this.scoreTime  = 0;
    this.state      = 'idle';
    this.cfg        = null;
    this.ai         = null;
    this.ai3        = null;

    this.frenzyTimer = 0;
    this.frenzyCount = 0;
    this._frenzyLog  = [];
    this._aiCutLog   = [];
    this.aiDefensive = 0;
    this.wastedTents = 0;
    this.cutsTotal   = 0;

    this.shake      = 0;
    this.shakeDir   = 0;
    this.camX       = 0;
    this.camY       = 0;
    this.fogDirty   = true;
    this._fogTimer  = 0;
    this._lastWorld = 0;

    this.fogRevealTimer = 0;

    this._frame     = 0;

    this.done       = false;
    this.paused     = false;
    this.slicing    = false;
    this.slicePath  = [];
    this.mx         = 0;
    this.my         = 0;
    this.lastT      = 0;
    this._mouseDownStart = null;
    this._dragConnectSource = null;
    this._dragConnectActive = false;

    this._utils     = makeUtils(this);
    this._lang      = STATE.curLang;

    this.tut        = new Tutorial(this);
    this.renderer   = new Renderer(canvas);
    this.hud        = new HUD();
    this.phaseOutcome = null;
    this.fps = 0;
    this._fpsAccumulator = 0;
    this._fpsFrames = 0;
    this.renderStats = {
      frameMs: 0,
      avgFrameMs: 0,
      nodeCount: 0,
      tentCount: 0,
      hazardCount: 0,
      pulsarCount: 0,
      orbCount: 0,
      freeOrbCount: 0,
      visualEventCount: 0,
      graphicsMode: STATE.settings.graphicsMode || 'low',
    };

    this.resize();
    this._bindVisualFeedbackEvents();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const W = window.innerWidth  || document.documentElement.clientWidth  || screen.width;
    const H = (window.innerHeight || document.documentElement.clientHeight || screen.height) - 50;
    this.canvas.width  = Math.max(W, 200);
    this.canvas.height = Math.max(H, 200);
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  _bindVisualFeedbackEvents() {
    bus.on('node:capture', node => {
      this.visualEvents.push({
        type: 'capture',
        x: node.x,
        y: node.y,
        owner: node.owner,
        age: 0,
        duration: 0.9,
        label: 'CAPTURE',
      });
    });
    bus.on('cell:killed_enemy', node => {
      this.visualEvents.push({
        type: 'capture',
        x: node.x,
        y: node.y,
        owner: 1,
        age: 0,
        duration: 1.0,
        label: 'BREACH',
      });
    });
    bus.on('cell:lost', node => {
      this.visualEvents.push({
        type: 'loss',
        x: node.x,
        y: node.y,
        owner: node.owner,
        age: 0,
        duration: 1.0,
        label: 'LOSS',
      });
    });
    bus.on('relay:capture', node => {
      this.visualEvents.push({
        type: 'structure',
        x: node.x,
        y: node.y,
        owner: node.owner,
        age: 0,
        duration: 1.1,
        label: 'RELAY',
      });
    });
    bus.on('signal:capture', node => {
      this.visualEvents.push({
        type: 'structure',
        x: node.x,
        y: node.y,
        owner: node.owner,
        age: 0,
        duration: 1.1,
        label: 'SIGNAL',
      });
    });
    bus.on('pulsar:fire', pulsar => {
      this.visualEvents.push({
        type: 'pulse',
        x: pulsar.x,
        y: pulsar.y,
        owner: 0,
        age: 0,
        duration: 0.8,
        label: pulsar.isSuper ? 'CORE' : 'PULSE',
      });
    });
  }

  _findNodeAtScreenPoint(screenX, screenY, hitPaddingPx = INPUT_TUNING.CLICK_HIT_PADDING_PX) {
    const worldX = screenX - (this.camX || 0);
    const worldY = screenY - (this.camY || 0);
    return findNodeAtWorldPoint(this.nodes, worldX, worldY, hitPaddingPx, { excludeHazards: true });
  }

  _findHoverNodeAtScreenPoint(screenX, screenY) {
    const worldX = screenX - (this.camX || 0);
    const worldY = screenY - (this.camY || 0);
    return findNodeAtWorldPoint(this.nodes, worldX, worldY, INPUT_TUNING.HOVER_HIT_PADDING_PX, { excludeHazards: false });
  }

  /* ─────────────────────────────── LEVEL LOADING ── */
  loadLevel(idx) {
    const cfg = LEVELS.find(l => l.id === idx) || LEVELS[idx];
    if (!cfg) { console.error('Level not found:', idx); return; }
    this.cfg = cfg;
    STATE.setCurrentLevel(idx);

    this.nodes = []; this.tents = [];
    this.sel   = null; this.done = false; this.paused = false; this.scoreTime = 0;
    this.camX  = 0; this.camY = 0; this.fogDirty = true; this.fogRevealTimer = 0;
    this._fogTimer = 0; this.freeOrbPool = new FreeOrbPool(30);
    this._frenzyLog = []; this._aiCutLog = []; this.wastedTents = 0;
    this.frenzyCount = 0; this.cutsTotal = 0; this.frenzyTimer = 0;
    this.hoverNode = null; this.hoverPin = false;
    this.orbPool   = new OrbPool(150);
    this.visualEvents = [];
    this.phaseOutcome = null;

    const { W, H } = this;
    const N = cfg.nodes, MR = 118, mg = 82;

    const fixedLayout = getFixedCampaignLayout(cfg.id, W, H);

    if (fixedLayout) {
      populateFixedNodes(this, fixedLayout);
      applyFixedWorldFeatures(this, fixedLayout);
      this._finalizeLoadedLayout(cfg);
    } else if (cfg.isTutorial) {
      this._loadTutLayout(cfg, W, H);
    } else {
      this._loadRandomLayout(cfg, N, MR, mg, W, H);
    }

    if (!cfg.isTutorial && !fixedLayout) {
      populateWorldFeatures(this, cfg, W, H);
    }

    this._finalizeLoadedLayout(cfg);

    /* Apply per-level energy cap to every node */
    const nodeEnergyCap = cfg.nodeEnergyCap || 200;
    for (let i = 0; i < this.nodes.length; i++) this.nodes[i].maxE = nodeEnergyCap;

    this.ai    = new AI(this, cfg);          // owner 2 — red AI
    this.ai3   = cfg.purpleEnemyCount > 0 ? new AI(this, cfg, 3) : null; // owner 3 — purple AI
    this.state = 'playing';

    /* World music */
    const worldId = cfg.worldId || 1;
    if (worldId === 2) Music.playVoid();
    else if (worldId === 3) Music.playNexus();
    else Music.playGenesis();

    this.hud.setLevel(cfg);
    this.hud.update(this);
  }

  _loadTutLayout(cfg, W, H) {
    const cx = W / 2, cy = H / 2;
    const tutorialWorldId = cfg.tutorialWorldId || 1;
    const rnd = (a, b) => a + Math.random() * (b - a);

    if (tutorialWorldId === 1) {
      this.nodes.push(new GameNode(0, cx * 0.28, cy, 55, 1));
      [[cx*0.64,cy*0.48,30],[cx*0.88,cy*0.88,35],[cx*0.62,cy*1.36,25],[cx*1.1,cy,20]].forEach((p,i) =>
        this.nodes.push(new GameNode(i+1, p[0], p[1], p[2], 0)));
      this.hazards = []; this.pulsars = [];
    } else if (tutorialWorldId === 2) {
      this.nodes.push(new GameNode(0, cx*0.28, cy, 55, 1));
      this.nodes.push(new GameNode(1, cx*0.72, cy*0.6,  30, 0));
      this.nodes.push(new GameNode(2, cx*0.72, cy*1.4,  28, 0));
      this.nodes.push(new GameNode(3, cx*1.15, cy*0.55, 25, 0));
      const aiN = new GameNode(4, cx*1.22, cy, 22, 2); aiN.energy = 20;
      this.nodes.push(aiN);
      this.hazards = [{ x:cx*0.72, y:cy*0.95, r:52, phase:0, drainRate:7, warningR:78, _drainCd:0 }];
      this.pulsars = [];
    } else if (tutorialWorldId === 3) {
      this.nodes.push(new GameNode(0, cx*0.25, cy, 55, 1));
      const relay = new GameNode(1, cx*0.72, cy, 0, 0, NodeType.RELAY);
      this.nodes.push(relay);
      this.nodes.push(new GameNode(2, cx*1.08, cy*0.5,  28, 0));
      this.nodes.push(new GameNode(3, cx*1.08, cy*1.5,  25, 0));
      const aiN = new GameNode(4, cx*1.35, cy, 22, 2); aiN.energy = 20;
      this.nodes.push(aiN);
      this.hazards = [];
      this.pulsars = [{ x:cx*0.72, y:cy*0.18, r:180, timer:3, interval:4.5, strength:22, pulse:0, phase:0, chargeTimer:0 }];
    }

    this.tut.reset();
    this.tut.showStep();
    const tutbox = $id(DOM_IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'block';
  }

  _finalizeLoadedLayout(cfg) {
    const tutbox = $id(DOM_IDS.TUTBOX);
    if (cfg.isTutorial) {
      this.tut.reset();
      this.tut.showStep();
      if (tutbox) tutbox.style.display = 'block';
    } else if (tutbox) {
      tutbox.style.display = 'none';
    }

    const worldId = cfg.worldId || 1;
    if (worldId !== this._lastWorld && this._lastWorld > 0) {
      SFX.worldEnter();
      showWorldBanner(worldId, STATE.curLang);
    }
    this._lastWorld = worldId || this._lastWorld;
  }

  _loadRandomLayout(cfg, N, MR, mg, W, H) {
    const rnd = (a, b) => a + Math.random() * (b - a);

    if (cfg.isSymmetricLayout) {
      /* ── Symmetric layout (ECHO boss): mirror-image across vertical axis ── */
      const half = Math.floor(N / 2);              // nodes per side (e.g. 7 for N=15)
      const leftPts = [];
      for (let i = 0; i < half; i++) {
        let placed = false;
        for (let a = 0; a < 900 && !placed; a++) {
          const x = rnd(mg, W / 2 - 72);
          const y = rnd(mg, H - mg);
          const e = rnd(cfg.neutralEnergyRange[0], cfg.neutralEnergyRange[1]);
          const r2 = computeNodeRadius(e, cfg.nodeEnergyCap || 200);
          let cl = true;
          for (const ln of leftPts) {
            const lr = computeNodeRadius(ln.e, cfg.nodeEnergyCap || 200);
            if (computeDistance(x, y, ln.x, ln.y) < MR + r2 + lr) { cl = false; break; }
            if (computeDistance(x, y, W - ln.x, ln.y) < MR + r2 + lr) { cl = false; break; }
          }
          /* own mirror must not be too close */
          if (cl && W - 2 * x < MR * 1.1) cl = false;
          if (cl) { leftPts.push({ x, y, e }); placed = true; }
        }
      }
      let idx = 0;
      leftPts.forEach(p  => this.nodes.push(new GameNode(idx++, p.x,     p.y, p.e, 0)));
      leftPts.forEach(p  => this.nodes.push(new GameNode(idx++, W - p.x, p.y, p.e, 0)));
      /* center node for odd N */
      if (N % 2 === 1) {
        const ce = rnd(cfg.neutralEnergyRange[0], cfg.neutralEnergyRange[1]);
        this.nodes.push(new GameNode(idx, W / 2, H / 2, ce, 0));
      }
    } else {
      /* ── Standard random layout ── */
      for (let i = 0; i < N; i++) {
        let ok = false;
        for (let a = 0; a < 900 && !ok; a++) {
          const x = rnd(mg, W - mg), y = rnd(mg, H - mg);
          const e = rnd(cfg.neutralEnergyRange[0], cfg.neutralEnergyRange[1]);
          const r2 = computeNodeRadius(e, cfg.nodeEnergyCap || 200);
          let cl = true;
          for (const n of this.nodes) if (computeDistance(x, y, n.x, n.y) < MR + r2 + n.radius) { cl = false; break; }
          if (cl) { this.nodes.push(new GameNode(i, x, y, e, 0)); ok = true; }
        }
      }
    }

    /* Assign player (leftmost), red AI (rightmost), purple AI (topmost remaining) */
    const sorted = [...this.nodes].sort((a, b) => a.x - b.x);
    sorted[0].owner  = 1;
    sorted[0].energy = cfg.playerStartEnergy || 22;

    // Red AI (owner 2): rightmost candidate slice
    const redCount = cfg.enemyCount || 0;
    const aiC = sorted.slice(Math.max(1, sorted.length - redCount * 2));
    aiC.sort(() => Math.random() - 0.5);
    for (let i = 0; i < redCount && i < aiC.length; i++) {
      aiC[i].owner  = 2;
      aiC[i].energy = (cfg.enemyStartEnergy || 22) + rnd(-5, 8);
    }

    // Purple AI (owner 3): topmost neutral nodes — creates a distinct map position
    const purpleCount = cfg.purpleEnemyCount || 0;
    if (purpleCount > 0) {
      const neutrals = sorted.slice(1).filter(n => n.owner === 0);
      neutrals.sort((a, b) => a.y - b.y);
      for (let i = 0; i < purpleCount && i < neutrals.length; i++) {
        neutrals[i].owner  = 3;
        neutrals[i].energy = (cfg.purpleEnemyStartEnergy || cfg.enemyStartEnergy || 22) + rnd(-5, 8);
      }
    }

    /* Apply bunker upgrades to neutral normal nodes */
    applyNeutralBunkers(this, cfg);

    const tutbox = $id(DOM_IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'none';
  }

  /* ─────────────────────────────── UPDATE ── */
  update(dt) {
    this._frame++;
    if (this.state !== 'playing' || this.paused || this.done) return;
    this.time     += dt;
    this._lang     = STATE.curLang;
    if (!this.cfg.isTutorial && !this.done) this.scoreTime += dt;

    /* OutCounts must be first (tentacles read them) */
    Physics.updateOutCounts(this);

    this.resolveClashes();

    /* Frenzy countdown */
    if (this.frenzyTimer > 0) {
      const prev = this.frenzyTimer;
      this.frenzyTimer = Math.max(0, this.frenzyTimer - dt);
      if (prev > 0 && this.frenzyTimer === 0) {
        SFX.frenzyEnd();
        bus.emit('frenzy:end');
      }
    }

    if (this.aiDefensive > 0) this.aiDefensive = Math.max(0, this.aiDefensive - dt);

    /* Node updates */
    const frenzyActive = this.frenzyTimer > 0;
    for (let _i = 0; _i < this.nodes.length; _i++) this.nodes[_i].update(dt, frenzyActive);

    /* World-layer systems stay outside the core simulation bookkeeping. */
    WorldSystems.update(this, dt);

    /* Tent updates */
    for (let _i = 0; _i < this.tents.length; _i++) {
      const _t = this.tents[_i];
      _t.update(dt);
      /* Orb spawning delegated to OrbPool */
      if (_t.alive && (_t.state === TentState.ACTIVE || _t.state === TentState.ADVANCING)) {
        if (shouldSpawnOrb(_t, dt)) {
          this.orbPool.get(_t, false);
        }
        const _s = _t.effectiveSourceNode;
        if (_s.energy >= _s.maxE * 0.93 && _s.outCount > 1 && Math.random() < 0.22) {
          this.orbPool.get(_t, true);
        }
      }
    }
    for (let i = this.tents.length - 1; i >= 0; i--) {
      if (this.tents[i].state === TentState.DEAD) this.tents.splice(i, 1);
    }

    /* Orb pool */
    this.orbPool.update(dt);

    /* Free orbs (pooled — no allocation) */
    this.freeOrbPool.update(dt);
    for (let visualIndex = this.visualEvents.length - 1; visualIndex >= 0; visualIndex--) {
      const visualEvent = this.visualEvents[visualIndex];
      visualEvent.age += dt;
      if (visualEvent.age >= visualEvent.duration) this.visualEvents.splice(visualIndex, 1);
    }

    /* AI */
    this.ai.update(dt);
    if (this.ai3) this.ai3.update(dt);

    /* HUD */
    this.hud.update(this);

    /* Debug info + energy validation logs (once per second in debug mode) */
    if (STATE.settings.debug && Math.floor(this.time) !== Math.floor(this.time - dt)) {
      const el = $id(DOM_IDS.DEBUG_INFO_TEXT);
      if (el) {
        const pN  = this.nodes.filter(n => n.owner === 1 && !n.isRelay).length;
        const aiN = this.nodes.filter(n => n.owner === 2 && !n.isRelay).length;
        const ai3N= this.nodes.filter(n => n.owner === 3 && !n.isRelay).length;
        const pTents = this.tents.filter(t => t.alive && t.effectiveSourceNode?.owner === 1);
        const totalFlow = pTents.reduce((s, t) => s + (t.flowRate || 0), 0).toFixed(1);
        el.innerHTML =
          `Nodes: ${this.nodes.length} (P:${pN} R:${aiN} Pu:${ai3N}) | Tents: ${this.tents.length} | T: ${this.time.toFixed(1)}s<br>` +
          `Player flow out: ${totalFlow}/s`;
      }

      /* Console energy-flow validation (read: temporarily enabled during testing) */
      if (this.nodes.some(n => n.owner !== 0)) {
        console.groupCollapsed(`[ENERGY t=${this.time.toFixed(0)}s]`);
        this.nodes.filter(n => n.owner !== 0 && !n.isRelay).forEach(n => {
          const regen   = TIER_REGEN[n.level] ?? TIER_REGEN[0];
          const outFlow = this.tents
            .filter(t => t.alive && t.effectiveSourceNode === n)
            .reduce((s, t) => s + (t.flowRate || 0), 0);
          const label   = n.owner === 1 ? 'PLAYER' : 'AI';
          console.log(
            `NODE${n.id}[${label}] E=${n.energy.toFixed(1)}/${n.maxE}` +
            ` regen=${regen.toFixed(2)}/s avail=${(n.availPower || 0).toFixed(2)}/s` +
            ` inFlow=${(n._prevInFlow || 0).toFixed(2)}/s outFlow=${outFlow.toFixed(2)}/s` +
            ` slots=${n.outCount}/${n.maxSlots}`
          );
        });
        this.tents.filter(t => t.alive && t.state === TentState.ACTIVE).forEach(t => {
          const ttype =
            t.effectiveTargetNode.owner === t.effectiveSourceNode.owner ? 'FRIENDLY' :
            t.effectiveTargetNode.owner === 0 ? 'CAPTURE' : 'ATTACK';
          console.log(
            `  TENT[${ttype}] ${t.effectiveSourceNode.id}→${t.effectiveTargetNode.id}` +
            ` flow=${t.flowRate.toFixed(2)}/s pipe=${t.energyInPipe.toFixed(1)} eff=${t.eff.toFixed(2)}`
          );
        });
        console.groupEnd();
      }
    }

    /* Tutorial */
    if (this.cfg.isTutorial) {
      this.tut.tick(this);
      if (!this.done && !this.nodes.some(n => n.owner === 1 && !n.isRelay)) {
        this.done = true;
        this.phaseOutcome = 'lose';
        setTimeout(() => { SFX.lose(); this.loadLevel(STATE.curLvl); }, 1500);
      }
    } else if (!this.done) {
      this.checkWin();
    }

    this.updateTip();
  }

  checkWin() {
    const real = this.nodes.filter(n => !n.isRelay);
    const p  = real.filter(n => n.owner === 1).length;
    const e2 = real.filter(n => n.owner === 2).length;
    const e3 = real.filter(n => n.owner === 3).length;
    if (e2 === 0 && e3 === 0) {
      this.done = true;
      this.phaseOutcome = 'win';
      endLevel(true, this);
    }
    else if (p === 0) {
      this.done = true;
      this.phaseOutcome = 'lose';
      endLevel(false, this);
    }
  }

  calcScore() {
    if (!this.cfg || this.cfg.isTutorial) return null;
    const par       = this.cfg.par || 120;
    const t2        = this.scoreTime;
    const timeRatio = (t2 - par) / par;
    const timeFactor= clamp(1 - timeRatio * 1.4, -1.5, 1.15);
    const timeScore = Math.round(400 * timeFactor);
    const wastePen  = Math.min(200, (this.wastedTents || 0) * 25);
    const bonus     = Math.min(90, (this.frenzyCount || 0) * 30) + Math.min(80, (this.cutsTotal || 0) * 10);
    return Math.max(0, Math.min(1000, 400 + timeScore + bonus - wastePen));
  }

  resolveClashes() {
    /* Save previous pairs to avoid calling SFX on already-active clashes */
    const prevPartner = new Map();
    this.tents.forEach(t => {
      if (t.alive && t.state === TentState.ACTIVE && t.clashPartner) {
        prevPartner.set(t, t.clashPartner);
      }
    });

    /* Build route map: "srcId-tgtId" → tent for O(1) clash lookup instead of O(n²) find */
    const byRoute = new Map();
    this.tents.forEach(t => {
      if (t.alive && t.state === TentState.ACTIVE) {
        t.clashPartner = null;
        byRoute.set(`${t.effectiveSourceNode.id}-${t.effectiveTargetNode.id}`, t);
      }
    });

    this.tents.forEach(t => {
      if (!t.alive || t.clashPartner || t.state !== TentState.ACTIVE) return;
      const opp = byRoute.get(`${t.effectiveTargetNode.id}-${t.effectiveSourceNode.id}`);
      if (opp && !opp.clashPartner && opp.effectiveSourceNode.owner !== t.effectiveSourceNode.owner) {
        t.clashPartner = opp; opp.clashPartner = t;
        if (prevPartner.get(t) !== opp) SFX.clash(); /* only new clashes */
      }
    });
  }

  /* ─────────────────────────────── INPUT ── */
  click(x, y) {
    const hit = this._findNodeAtScreenPoint(x, y);

    if (!hit) {
      this.clearSel();
      this.hoverPin = false;
      this.hoverNode = null;
      return;
    }

    this._syncPinnedHoverFromClick(hit);

    const clickIntent = resolvePlayerClickIntent({
      selectedNode: this.sel,
      hitNode: hit,
      tents: this.tents,
      liveOut: node => this._utils.liveOut(node),
      distanceCostMultiplier: this.cfg.distanceCostMultiplier,
    });

    this._applyPlayerClickIntent(clickIntent);
  }

  clearSel() { if (this.sel) this.sel.selected = false; this.sel = null; }

  _syncPinnedHoverFromClick(hitNode) {
    const nextPinnedHoverState = resolvePinnedHoverState(this.hoverNode, this.hoverPin, hitNode);
    this.hoverNode = nextPinnedHoverState.hoverNode;
    this.hoverPin = nextPinnedHoverState.hoverPin;
  }

  _applyPlayerClickIntent(clickIntent) {
    switch (clickIntent.type) {
      case 'clear_selection':
        this.clearSel();
        return;
      case 'select_player_node':
        this.clearSel();
        this.sel = clickIntent.node;
        this.sel.selected = true;
        SFX.select();
        return;
      case 'retract_node_tentacles':
        clickIntent.retractableTentacles.forEach(tentacle => {
          tentacle.playerRetract = true;
          tentacle.kill();
        });
        this.clearSel();
        if (clickIntent.retractableTentacles.length) SFX.retract();
        showToast(clickIntent.retractableTentacles.length ? T('tentRetracted') : T('noLinks'));
        return;
      case 'toggle_existing_tentacle':
        if (clickIntent.toggleableTentacle.canToggle) {
          clickIntent.toggleableTentacle.tentacle.reversed = !clickIntent.toggleableTentacle.tentacle.reversed;
          showToast(clickIntent.toggleableTentacle.tentacle.reversed ? T('flowRev') : T('flowRest'));
        } else {
          showToast(T('cantReverse'));
        }
        this.clearSel();
        return;
      case 'no_free_slots':
        showToast(
          T(
            'slotsFullMsg',
            clickIntent.tentacleSlotUsage.activeOutgoingTentacles + '/' + clickIntent.tentacleSlotUsage.maxTentacleSlots
          )
        );
        this.clearSel();
        return;
      case 'insufficient_energy':
        clickIntent.hitNode.rFlash = 1;
        showToast(
          T(
            'needEnergy',
            Math.ceil(clickIntent.buildCost.totalBuildCost + 1),
            Math.ceil(clickIntent.buildCost.baseBuildCost),
            Math.ceil(clickIntent.buildCost.rangeSurcharge),
            Math.floor(this.sel.energy)
          )
        );
        this.clearSel();
        return;
      case 'build_tentacle':
        this._createPlayerTentacle(clickIntent.sourceNode, clickIntent.targetNode, clickIntent.buildCost.totalBuildCost);
        this.clearSel();
        return;
      case 'no_action':
      default:
        return;
    }
  }

  _createPlayerTentacle(sourceNode, targetNode, totalBuildCost) {
    const newTentacle = new Tent(sourceNode, targetNode, totalBuildCost);
    newTentacle.game  = this;

    /* Keep outCount in sync so liveOut() reads correctly before next updateOutCounts. */
    sourceNode.outCount = (sourceNode.outCount || 0) + 1;

    /* If an active enemy tentacle already goes the other way, skip growing
       and enter clash immediately — "tug of war" starts at once. */
    const opposingTentacle = findOpposingActiveTentacle(this.tents, sourceNode, targetNode);
    if (opposingTentacle) newTentacle.activateImmediate();

    SFX.buildStart();
    this.tents.push(newTentacle);
  }

  checkSlice() {
    const sliceSegment = getLatestSliceSegment(this.slicePath);
    const sliceCuts = scanPlayerSliceCuts(this.tents, sliceSegment);

    sliceCuts.forEach(sliceCut => this._applyPlayerSliceCut(sliceCut));
  }

  _applyPlayerSliceCut(sliceCut) {
    applyPlayerSliceCut(sliceCut, {
      onCutApplied: currentSliceCut => {
        SFX.cut();
        currentSliceCut.effectiveSourceNode.cFlash = (currentSliceCut.effectiveSourceNode.cFlash || 0) + 0.6;
        this.cutsTotal = (this.cutsTotal || 0) + 1;
      },
      onReactiveDefenseCut: currentSliceCut => this._recordReactiveDefenseCut(currentSliceCut),
      onPlayerFrenzyCut: currentSliceCut => this._recordPlayerFrenzyCut(currentSliceCut),
    });
  }

  _recordReactiveDefenseCut(sliceCut) {
    const sliceState = {
      now: this.time,
      aiCutLog: this._aiCutLog,
      aiDefensiveDuration: this.aiDefensive,
    };
    recordReactiveDefenseCut(sliceCut, sliceState, () => bus.emit('ai:defensive'));
    this._aiCutLog = sliceState.aiCutLog;
    this.aiDefensive = sliceState.aiDefensiveDuration;
  }

  _recordPlayerFrenzyCut(sliceCut) {
    const sliceState = {
      now: this.time,
      frenzyLog: this._frenzyLog,
      frenzyDuration: this.frenzyTimer,
      frenzyCount: this.frenzyCount || 0,
    };
    recordPlayerFrenzyCut(sliceCut, sliceState, () => {
      showToast('⚡ FRENZY! +35% REGEN');
      SFX.frenzy();
      bus.emit('frenzy:start');
    });
    this._frenzyLog = sliceState.frenzyLog;
    this.frenzyTimer = sliceState.frenzyDuration;
    this.frenzyCount = sliceState.frenzyCount;
    showToast(buildPlayerSliceToastMessage(sliceCut));
  }

  updateTip() {
    if (!this.sel || !this.cfg || this.paused) {
      const dc = $id(DOM_IDS.DC); if (dc) dc.classList.remove('on');
      return;
    }
    const hoveredNode = this._findNodeAtScreenPoint(this.mx, this.my, 16);
    const hoverTargetNode = hoveredNode !== this.sel ? hoveredNode : null;
    const el = $id(DOM_IDS.DC);
    if (!el) return;
    if (hoverTargetNode) {
      const previewModel = buildPlayerTentaclePreview({
        selectedNode: this.sel,
        hoveredNode: hoverTargetNode,
        tents: this.tents,
        liveOut: node => this._utils.liveOut(node),
        distanceCostMultiplier: this.cfg.distanceCostMultiplier,
      });
      el.style.left = (this.mx + 18) + 'px';
      el.style.top  = (this.my + 58) + 'px';
      if (previewModel?.type === 'toggle_existing_tentacle') {
        el.textContent = 'CLICK → ' + (previewModel.isFlowReversed ? T('flowRest') : T('flowRev')) +
          (previewModel.roundedFlowRate > 1 ? ' | FLOW:' + previewModel.roundedFlowRate + 'e/s' : '');
        el.style.color        = '#f5c518';
        el.style.borderColor  = 'rgba(245,197,24,0.3)';
      } else if (previewModel?.type === 'build_new_tentacle') {
        el.textContent =
          'BUILD:' + previewModel.roundedBuildCost +
          ' RNG:' + previewModel.roundedRangeSurcharge +
          ' TOT:' + previewModel.roundedTotalBuildCost +
          '  ' + (previewModel.canAffordBuild ? '✓' : '✗ ' + (previewModel.roundedTotalBuildCost - previewModel.availableEnergy)) +
          '  SLT:' + previewModel.activeOutgoingTentacles + '/' + previewModel.maxTentacleSlots;
        el.style.color       = previewModel.canBuildTentacle ? '#00e5ff' : '#ff3d5a';
        el.style.borderColor = previewModel.canBuildTentacle ? 'rgba(0,229,255,0.3)' : 'rgba(255,61,90,0.3)';
      } else {
        el.classList.remove('on');
        return;
      }
      el.classList.add('on');
    } else {
      el.classList.remove('on');
    }
  }

  _beginSlice(screenX, screenY) {
    this.slicing = true;
    this.slicePath = createSlicePathStart(screenX, screenY);
  }

  _beginMouseDragCandidate(screenX, screenY) {
    this._mouseDownStart = { x: screenX, y: screenY };
    this._dragConnectSource = this._findNodeAtScreenPoint(screenX, screenY);
    this._dragConnectActive = false;
  }

  _extendMouseDrag(screenX, screenY) {
    if (!this._mouseDownStart || !this._dragConnectSource) return;
    if (this._dragConnectSource.owner !== 1) return;

    const distance = Math.hypot(screenX - this._mouseDownStart.x, screenY - this._mouseDownStart.y);
    if (distance < INPUT_TUNING.DRAG_CONNECT_THRESHOLD_PX) return;

    if (!this._dragConnectActive) {
      this.clearSel();
      this.sel = this._dragConnectSource;
      this.sel.selected = true;
      this._dragConnectActive = true;
    }
  }

  _endMouseDrag(screenX, screenY) {
    const dragSourceNode = this._dragConnectSource;
    const wasDragConnectActive = this._dragConnectActive;
    this._mouseDownStart = null;
    this._dragConnectSource = null;
    this._dragConnectActive = false;

    if (!wasDragConnectActive || !dragSourceNode) return false;

    const hitNode = this._findNodeAtScreenPoint(screenX, screenY);
    const clickIntent = resolvePlayerClickIntent({
      selectedNode: dragSourceNode,
      hitNode,
      tents: this.tents,
      liveOut: node => this._utils.liveOut(node),
      distanceCostMultiplier: this.cfg.distanceCostMultiplier,
    });
    this._applyPlayerClickIntent(clickIntent);
    return true;
  }

  _extendSlice(screenX, screenY) {
    this.mx = screenX;
    this.my = screenY;
    this.slicePath = appendSlicePoint(this.slicePath, screenX, screenY);
    this.checkSlice();
  }

  _endSlice() {
    this.slicing = false;
    this.slicePath = [];
  }

  _pinHoverNodeAtScreenPoint(screenX, screenY) {
    const hoveredNode = this._findHoverNodeAtScreenPoint(screenX, screenY);
    if (hoveredNode) {
      this.hoverNode = hoveredNode;
      this.hoverPin = true;
    }
  }

  _beginTapCandidate(screenX, screenY) {
    this._tapStart = createTapCandidate(screenX, screenY, Date.now());
    this.mx = screenX;
    this.my = screenY;
  }

  _clearTouchState() {
    clearTimeout(this._longPressTimer);
    this._tapStart = null;
    this._endSlice();
  }

  togglePause() {
    if (this.cfg && this.cfg.isTutorial) return;
    this.paused = !this.paused;
    if (this.paused) {
      $id(DOM_IDS.PINFO).textContent   = T('phaseSuffix', this.cfg.id, this.cfg.name);
      $id(DOM_IDS.BTN_RESUME).textContent = T('resume');
      $id(DOM_IDS.BTN_PRL).textContent    = T('phaseSelect');
      $id(DOM_IDS.BTN_PRR).textContent    = T('restart');
      $id(DOM_IDS.BTN_PSKIP).textContent  = T('skip');
      $id(DOM_IDS.BTN_PMENU).textContent  = T('mainMenu');
      $id(DOM_IDS.PPSAVE).textContent     = T('progSaved');
      showScr('pause');
      Music.playMenu();
    } else {
      showScr(null);
      const w = this.cfg ? this.cfg.worldId || 1 : 1;
      if (w === 2) Music.playVoid();
      else if (w === 3) Music.playNexus();
      else Music.playGenesis();
    }
  }

  /* ─────────────────────────────── EVENTS ── */
  bindEvents() {
    bindGameInputEvents(this);

    const hpause = $id(DOM_IDS.HPAUSE);
    if (hpause) hpause.addEventListener('click', () => this.togglePause());
    const tutNext = $id(DOM_IDS.TUT_NEXT);
    if (tutNext) tutNext.addEventListener('click', () => this.tut.advance());
    const hlang = $id(DOM_IDS.HLANG);
    if (hlang) hlang.addEventListener('click', () => {
      import('../localization/i18n.js').then(m => { m.toggleLang(); if (this.cfg && this.cfg.isTutorial) this.tut.showStep(); });
    });
  }

  /* ─────────────────────────────── LOOP ── */
  loop(ts) {
    if (!ts) ts = performance.now();
    if (!this.lastT) this.lastT = ts;
    const dt = Math.min((ts - this.lastT) / 1000, 0.05);
    /* While paused, advance lastT so dt stays near zero when we resume —
       preventing any time accumulation from "catching up" after a long pause. */
    this.lastT = ts;
    this._fpsAccumulator += dt;
    this._fpsFrames += 1;
    if (this._fpsAccumulator >= 0.4) {
      this.fps = this._fpsFrames / this._fpsAccumulator;
      this._fpsAccumulator = 0;
      this._fpsFrames = 0;
    }
    if (!this.paused) {
      this.update(dt);
      this.renderer.render(this);
    }
    requestAnimationFrame(this.loop);
  }
}
