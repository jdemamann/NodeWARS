/* ================================================================
   NODE WARS v3 — Game (loop coordinator)

   Owns the game loop, input handling, level loading, and the
   main update pipeline.  Rendering is delegated to Renderer.
   ================================================================ */

import { LEVELS, TentState, NodeType, MAX_SLOTS, TIER_REGEN } from './constants.js';
import { vd, vdSq, bldC, findCutT, maxRange, clamp, erad } from './utils.js';
import { bus }          from './EventBus.js';
import { STATE }        from './GameState.js';
import { T }            from './i18n.js';
import { GNode }        from './entities/GNode.js';
import { Tent }         from './entities/Tent.js';
import { OrbPool, FreeOrbPool, shouldSpawnOrb } from './entities/Orb.js';
import { AI }           from './systems/AI.js';
import { Tutorial }     from './systems/Tutorial.js';
import { Physics }      from './systems/Physics.js';
import { Renderer }     from './renderer/Renderer.js';
import { HUD }          from './ui/HUD.js';
import { showScr, showToast, showWorldBanner, endLevel } from './ui/Screens.js';
import { Audio as SFX } from './audio/Audio.js';
import { Music }        from './audio/Music.js';
import { IDS }          from './ui/IDS.js';

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

    this._utils     = makeUtils(this);
    this._lang      = STATE.curLang;

    this.tut        = new Tutorial(this);
    this.renderer   = new Renderer(canvas);
    this.hud        = new HUD();

    this.resize();
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

  /* ─────────────────────────────── LEVEL LOADING ── */
  loadLevel(idx) {
    const cfg = LEVELS.find(l => l.id === idx) || LEVELS[idx];
    if (!cfg) { console.error('Level not found:', idx); return; }
    this.cfg = cfg;
    STATE.curLvl = idx;

    this.nodes = []; this.tents = [];
    this.sel   = null; this.done = false; this.paused = false; this.scoreTime = 0;
    this.camX  = 0; this.camY = 0; this.fogDirty = true; this.fogRevealTimer = 0;
    this._fogTimer = 0; this.freeOrbPool = new FreeOrbPool(30);
    this._frenzyLog = []; this._aiCutLog = []; this.wastedTents = 0;
    this.frenzyCount = 0; this.cutsTotal = 0; this.frenzyTimer = 0;
    this.hoverNode = null; this.hoverPin = false;
    this.orbPool   = new OrbPool(150);

    const { W, H } = this;
    const N = cfg.nodes, MR = 118, mg = 82;

    if (cfg.tut) {
      this._loadTutLayout(cfg, W, H);
    } else {
      this._loadRandomLayout(cfg, N, MR, mg, W, H);
    }

    if (!cfg.tut) {
      this.hazards = [];
      this.pulsars = [];
      this._spawnHazards(cfg, W, H);
      this._spawnRelays(cfg, W, H);
      this._spawnPulsars(cfg, W, H);
      this._spawnSignalNodes(cfg, W, H);

      const w = cfg.w || 1;
      if (w !== this._lastWorld && this._lastWorld > 0) {
        SFX.worldEnter();
        showWorldBanner(w, STATE.curLang);
      }
      this._lastWorld = w || this._lastWorld;
    }

    /* Apply per-level energy cap to every node */
    const ec = cfg.ec || 200;
    for (let i = 0; i < this.nodes.length; i++) this.nodes[i].maxE = ec;

    this.ai    = new AI(this, cfg);          // owner 2 — red AI
    this.ai3   = cfg.ai3 > 0 ? new AI(this, cfg, 3) : null; // owner 3 — purple AI
    this.state = 'playing';

    /* World music */
    const wNum = cfg.w || 1;
    if (wNum === 2) Music.playVoid();
    else if (wNum === 3) Music.playNexus();
    else Music.playGenesis();

    this.hud.setLevel(cfg);
    this.hud.update(this);
  }

  _loadTutLayout(cfg, W, H) {
    const cx = W / 2, cy = H / 2;
    const tw = cfg.tutW || 1;
    const rnd = (a, b) => a + Math.random() * (b - a);

    if (tw === 1) {
      this.nodes.push(new GNode(0, cx * 0.28, cy, 55, 1));
      [[cx*0.64,cy*0.48,30],[cx*0.88,cy*0.88,35],[cx*0.62,cy*1.36,25],[cx*1.1,cy,20]].forEach((p,i) =>
        this.nodes.push(new GNode(i+1, p[0], p[1], p[2], 0)));
      this.hazards = []; this.pulsars = [];
    } else if (tw === 2) {
      this.nodes.push(new GNode(0, cx*0.28, cy, 55, 1));
      this.nodes.push(new GNode(1, cx*0.72, cy*0.6,  30, 0));
      this.nodes.push(new GNode(2, cx*0.72, cy*1.4,  28, 0));
      this.nodes.push(new GNode(3, cx*1.15, cy*0.55, 25, 0));
      const aiN = new GNode(4, cx*1.22, cy, 22, 2); aiN.energy = 20;
      this.nodes.push(aiN);
      this.hazards = [{ x:cx*0.72, y:cy*0.95, r:52, phase:0, drainRate:7, warningR:78, _drainCd:0 }];
      this.pulsars = [];
    } else if (tw === 3) {
      this.nodes.push(new GNode(0, cx*0.25, cy, 55, 1));
      const relay = new GNode(1, cx*0.72, cy, 0, 0, NodeType.RELAY);
      this.nodes.push(relay);
      this.nodes.push(new GNode(2, cx*1.08, cy*0.5,  28, 0));
      this.nodes.push(new GNode(3, cx*1.08, cy*1.5,  25, 0));
      const aiN = new GNode(4, cx*1.35, cy, 22, 2); aiN.energy = 20;
      this.nodes.push(aiN);
      this.hazards = [];
      this.pulsars = [{ x:cx*0.72, y:cy*0.18, r:180, timer:3, interval:4.5, strength:22, pulse:0, phase:0, chargeTimer:0 }];
    }

    this.tut.reset();
    this.tut.showStep();
    const tutbox = $id(IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'block';
  }

  _loadRandomLayout(cfg, N, MR, mg, W, H) {
    const rnd = (a, b) => a + Math.random() * (b - a);

    if (cfg.sym) {
      /* ── Symmetric layout (ECHO boss): mirror-image across vertical axis ── */
      const half = Math.floor(N / 2);              // nodes per side (e.g. 7 for N=15)
      const leftPts = [];
      for (let i = 0; i < half; i++) {
        let placed = false;
        for (let a = 0; a < 900 && !placed; a++) {
          const x = rnd(mg, W / 2 - 72);
          const y = rnd(mg, H - mg);
          const e = rnd(cfg.nr[0], cfg.nr[1]);
          const r2 = erad(e, cfg.ec || 200);
          let cl = true;
          for (const ln of leftPts) {
            const lr = erad(ln.e, cfg.ec || 200);
            if (vd(x,y,ln.x,ln.y)       < MR + r2 + lr) { cl = false; break; }
            if (vd(x,y,W - ln.x, ln.y)  < MR + r2 + lr) { cl = false; break; }
          }
          /* own mirror must not be too close */
          if (cl && W - 2 * x < MR * 1.1) cl = false;
          if (cl) { leftPts.push({ x, y, e }); placed = true; }
        }
      }
      let idx = 0;
      leftPts.forEach(p  => this.nodes.push(new GNode(idx++, p.x,     p.y, p.e, 0)));
      leftPts.forEach(p  => this.nodes.push(new GNode(idx++, W - p.x, p.y, p.e, 0)));
      /* center node for odd N */
      if (N % 2 === 1) {
        const ce = rnd(cfg.nr[0], cfg.nr[1]);
        this.nodes.push(new GNode(idx, W / 2, H / 2, ce, 0));
      }
    } else {
      /* ── Standard random layout ── */
      for (let i = 0; i < N; i++) {
        let ok = false;
        for (let a = 0; a < 900 && !ok; a++) {
          const x = rnd(mg, W - mg), y = rnd(mg, H - mg);
          const e = rnd(cfg.nr[0], cfg.nr[1]);
          const r2 = erad(e, cfg.ec || 200);
          let cl = true;
          for (const n of this.nodes) if (vd(x,y,n.x,n.y) < MR + r2 + n.radius) { cl = false; break; }
          if (cl) { this.nodes.push(new GNode(i, x, y, e, 0)); ok = true; }
        }
      }
    }

    /* Assign player (leftmost), red AI (rightmost), purple AI (topmost remaining) */
    const sorted = [...this.nodes].sort((a, b) => a.x - b.x);
    sorted[0].owner  = 1;
    sorted[0].energy = cfg.pE || 22;

    // Red AI (owner 2): rightmost candidate slice
    const redCount = cfg.ai || 0;
    const aiC = sorted.slice(Math.max(1, sorted.length - redCount * 2));
    aiC.sort(() => Math.random() - 0.5);
    for (let i = 0; i < redCount && i < aiC.length; i++) {
      aiC[i].owner  = 2;
      aiC[i].energy = (cfg.aiE || 22) + rnd(-5, 8);
    }

    // Purple AI (owner 3): topmost neutral nodes — creates a distinct map position
    const purpleCount = cfg.ai3 || 0;
    if (purpleCount > 0) {
      const neutrals = sorted.slice(1).filter(n => n.owner === 0);
      neutrals.sort((a, b) => a.y - b.y);
      for (let i = 0; i < purpleCount && i < neutrals.length; i++) {
        neutrals[i].owner  = 3;
        neutrals[i].energy = (cfg.aiE3 || cfg.aiE || 22) + rnd(-5, 8);
      }
    }

    /* Apply bunker upgrades to neutral normal nodes */
    if (cfg.bk) this._applyBunkers(cfg);

    const tutbox = $id(IDS.TUTBOX);
    if (tutbox) tutbox.style.display = 'none';
  }

  _applyBunkers(cfg) {
    const neutrals = this.nodes.filter(n => n.owner === 0 && !n.isRelay && n.type === NodeType.NORMAL);
    const shuffled = [...neutrals].sort(() => Math.random() - 0.5);
    const count    = Math.min(cfg.bk, shuffled.length);
    for (let i = 0; i < count; i++) {
      shuffled[i].energy            = 140;   // level 2 energy
      shuffled[i].isBunker          = true;
      shuffled[i].captureThreshold  = 60;    // 3× the normal embryo cost
    }
  }

  _spawnHazards(cfg, W, H) {
    const rnd     = (a, b) => a + Math.random() * (b - a);
    const mvCount = cfg.mvhz || 0;
    const total   = cfg.hz   || 0;

    for (let h = 0; h < total; h++) {
      const isSuper   = !!(cfg.supervhz) && h === total - 1;
      const isMoving  = h < mvCount;
      const isPulsing = !!(cfg.pchz);
      const hr        = isSuper ? 105 : 55 + rnd(0, 25);

      let placed = false;
      for (let a = 0; a < 400 && !placed; a++) {
        const hx = rnd(110, W - 110), hy = rnd(110, H - 110);
        let ok = true;
        for (const n of this.nodes) if (Math.hypot(n.x-hx, n.y-hy) < hr + n.radius + 55) { ok = false; break; }
        for (const ex of this.hazards) if (Math.hypot(ex.x-hx, ex.y-hy) < hr + ex.r + 40) { ok = false; break; }
        if (ok) {
          this.hazards.push({
            x: hx, y: hy,
            ax: hx, ay: hy,          // anchor for moving vortexes
            r: hr,
            phase:    rnd(0, Math.PI * 2),
            drainRate: isSuper ? 18 : 6,
            warningR:  hr * 1.5,
            _drainCd:  0,
            _warn:     0,
            isSuper,
            /* Moving */
            moving:     isMoving,
            movePhase:  rnd(0, Math.PI * 2),
            movePhaseY: rnd(0, Math.PI * 2),
            moveR:      isMoving ? 45 + rnd(0, 30) : 0,
            /* Pulsing */
            pulsing:     isPulsing,
            pulseActive: true,
            pulseTimer:  rnd(0, (cfg.pchz || 5) / 2),  // stagger initial phase
            pulsePeriod: cfg.pchz || 5,
          });
          placed = true;
        }
      }
    }
  }

  _spawnRelays(cfg, W, H) {
    const rnd      = (a, b) => a + Math.random() * (b - a);
    const fortress = cfg.bkrl || 0;   // first N relays are fortresses

    for (let r = 0; r < (cfg.rl || 0); r++) {
      let placed = false;
      for (let a = 0; a < 400 && !placed; a++) {
        const rx = rnd(90, W - 90), ry = rnd(90, H - 90);
        let ok = true;
        for (const n of this.nodes) if (Math.hypot(n.x-rx, n.y-ry) < 90) { ok = false; break; }
        if (ok) {
          const rn = new GNode(this.nodes.length, rx, ry, 0, 0, NodeType.RELAY);
          /* Relay Fortress: hard to capture */
          const relayIdx = this.nodes.filter(n => n.isRelay).length;
          if (relayIdx < fortress) {
            rn.isBunker         = true;
            rn.captureThreshold = 60;
          }
          this.nodes.push(rn);
          placed = true;
        }
      }
    }
  }

  _spawnPulsars(cfg, W, H) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    let psIdx = 0;
    for (let p = 0; p < (cfg.ps || 0); p++) {
      const isSuper = !!(cfg.superps) && psIdx === 0;
      let placed = false;
      for (let a = 0; a < 400 && !placed; a++) {
        const px = rnd(100, W - 100), py = rnd(100, H - 100);
        let ok = true;
        for (const n of this.nodes) if (Math.hypot(n.x-px, n.y-py) < 80) { ok = false; break; }
        for (const ex of this.pulsars) if (Math.hypot(ex.x-px, ex.y-py) < 120) { ok = false; break; }
        if (ok) {
          this.pulsars.push({
            x: px, y: py,
            r:        isSuper ? Math.min(W, H) * 0.78 : 130 + rnd(-20, 30),
            timer:    rnd(3, 6),
            interval: isSuper ? 9 : 4.5,
            strength: isSuper ? 45 : 22,
            pulse: 0, phase: 0, chargeTimer: 0,
            isSuper,
          });
          psIdx++;
          placed = true;
        }
      }
    }
  }

  _spawnSignalNodes(cfg, W, H) {
    if (!cfg.sig) return;
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let s = 0; s < cfg.sig; s++) {
      let placed = false;
      for (let a = 0; a < 400 && !placed; a++) {
        const sx = rnd(W * 0.25, W * 0.75);
        const sy = rnd(H * 0.2,  H * 0.8);
        let ok = true;
        for (const n of this.nodes) if (Math.hypot(n.x - sx, n.y - sy) < 100) { ok = false; break; }
        if (ok) {
          const sn             = new GNode(this.nodes.length, sx, sy, 0, 0, NodeType.SIGNAL);
          sn.captureThreshold  = 30;  // slightly harder than EMBRYO=20
          this.nodes.push(sn);
          placed = true;
        }
      }
    }
  }

  /* ─────────────────────────────── UPDATE ── */
  update(dt) {
    this._frame++;
    if (this.state !== 'playing' || this.paused || this.done) return;
    this.time     += dt;
    this._lang     = STATE.curLang;
    if (!this.cfg.tut && !this.done) this.scoreTime += dt;

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

    /* World systems */
    Physics.updateVortex(this, dt);
    Physics.updatePulsar(this, dt);
    Physics.updateRelay(this);
    Physics.updateSignalTower(this, dt);
    Physics.updateFog(this, dt);
    Physics.updateAutoRetract(this);
    Physics.updateCamera(this, dt);

    /* Tent updates */
    for (let _i = 0; _i < this.tents.length; _i++) {
      const _t = this.tents[_i];
      _t.update(dt);
      /* Orb spawning delegated to OrbPool */
      if (_t.alive && (_t.state === TentState.ACTIVE || _t.state === TentState.ADVANCING)) {
        if (shouldSpawnOrb(_t, dt)) {
          this.orbPool.get(_t, false);
        }
        const _s = _t.es;
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

    /* AI */
    this.ai.update(dt);
    if (this.ai3) this.ai3.update(dt);

    /* HUD */
    this.hud.update(this);

    /* Debug info + energy validation logs (once per second in debug mode) */
    if (STATE.settings.debug && Math.floor(this.time) !== Math.floor(this.time - dt)) {
      const el = $id(IDS.DEBUG_INFO_TEXT);
      if (el) {
        const pN  = this.nodes.filter(n => n.owner === 1 && !n.isRelay).length;
        const aiN = this.nodes.filter(n => n.owner === 2 && !n.isRelay).length;
        const ai3N= this.nodes.filter(n => n.owner === 3 && !n.isRelay).length;
        const pTents = this.tents.filter(t => t.alive && t.es?.owner === 1);
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
            .filter(t => t.alive && t.es === n)
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
            t.et.owner === t.es.owner ? 'FRIENDLY' :
            t.et.owner === 0          ? 'CAPTURE'  : 'ATTACK';
          console.log(
            `  TENT[${ttype}] ${t.es.id}→${t.et.id}` +
            ` flow=${t.flowRate.toFixed(2)}/s pipe=${t.energyInPipe.toFixed(1)} eff=${t.eff.toFixed(2)}`
          );
        });
        console.groupEnd();
      }
    }

    /* Tutorial */
    if (this.cfg.tut) {
      this.tut.tick(this);
      if (!this.done && !this.nodes.some(n => n.owner === 1 && !n.isRelay)) {
        this.done = true;
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
    if (e2 === 0 && e3 === 0) { this.done = true; endLevel(true, this); }
    else if (p === 0)          { this.done = true; endLevel(false, this); }
  }

  calcScore() {
    if (!this.cfg || this.cfg.tut) return null;
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
        byRoute.set(`${t.es.id}-${t.et.id}`, t);
      }
    });

    this.tents.forEach(t => {
      if (!t.alive || t.clashPartner || t.state !== TentState.ACTIVE) return;
      const opp = byRoute.get(`${t.et.id}-${t.es.id}`);
      if (opp && !opp.clashPartner && opp.es.owner !== t.es.owner) {
        t.clashPartner = opp; opp.clashPartner = t;
        if (prevPartner.get(t) !== opp) SFX.clash(); /* only new clashes */
      }
    });
  }

  /* ─────────────────────────────── INPUT ── */
  click(x, y) {
    const cx = x - (this.camX || 0), cy = y - (this.camY || 0);
    const hit = this.nodes.find(n => n.type !== NodeType.HAZARD && vdSq(cx, cy, n.x, n.y) <= (n.radius + 12) * (n.radius + 12));

    if (!hit) { this.clearSel(); this.hoverPin = false; this.hoverNode = null; return; }

    if (hit.owner !== 1) {
      if (this.hoverPin && this.hoverNode === hit) { this.hoverPin = false; this.hoverNode = null; }
      else { this.hoverNode = hit; this.hoverPin = true; }
    }

    if (hit.owner === 1) {
      if (this.sel === hit) {
        /* Re-click: retract all outgoing tents */
        const killed = this.tents.filter(t =>
          t.alive && ((!t.reversed && t.source === hit) || (t.reversed && t.target === hit))
        );
        killed.forEach(t => { t.playerRetract = true; t.kill(); });
        this.clearSel();
        if (killed.length) SFX.retract();
        showToast(killed.length ? T('tentRetracted') : T('noLinks'));
        return;
      }
      if (!this.sel || this.sel.owner !== 1) {
        this.clearSel(); this.sel = hit; hit.selected = true; SFX.select(); return;
      }
    }

    if (!this.sel) return;
    if (this.sel === hit) { this.clearSel(); return; }

    /* Toggle reverse on existing link */
    const fwd = this.tents.find(t => t.alive && t.source === this.sel && t.target === hit);
    if (fwd) {
      if (hit.owner === this.sel.owner) { fwd.reversed = !fwd.reversed; showToast(fwd.reversed ? T('flowRev') : T('flowRest')); }
      else showToast(T('cantReverse'));
      this.clearSel(); return;
    }
    const bwd = this.tents.find(t => t.alive && t.source === hit && t.target === this.sel && hit.owner === this.sel.owner);
    if (bwd) { bwd.reversed = !bwd.reversed; showToast(bwd.reversed ? T('flowRev') : T('flowRest')); this.clearSel(); return; }

    /* Slot check */
    const lo   = this._utils.liveOut(this.sel);
    const maxT = MAX_SLOTS[this.sel.level];
    if (lo >= maxT) { showToast(T('slotsFullMsg', lo + '/' + maxT)); this.clearSel(); return; }

    /* Energy cost — must match maxRange() and HUD display.
       Total cost = base build cost (BUILD_B + d×BUILD_PX) + range surcharge (d×dm).
       The dm field acts as an extra per-pixel cost that scales with world difficulty,
       making long-range tentacles progressively more expensive in harder worlds. */
    const d          = vd(this.sel.x, this.sel.y, hit.x, hit.y);
    const baseCost   = bldC(d);
    const rangeCost  = d * this.cfg.dm;
    const cost       = baseCost + rangeCost;
    if (this.sel.energy < cost + 1) {
      hit.rFlash = 1;
      showToast(T('needEnergy', Math.ceil(cost+1), Math.ceil(baseCost), Math.ceil(rangeCost), Math.floor(this.sel.energy)));
      this.clearSel(); return;
    }

    const nt = new Tent(this.sel, hit, cost);
    nt.game  = this;
    /* Keep outCount in sync so liveOut() reads correctly before next updateOutCounts */
    this.sel.outCount = (this.sel.outCount || 0) + 1;

    /* If an active enemy tentacle already goes the other way, skip growing
       and enter clash immediately — "tug of war" starts at once */
    const opposing = this.tents.find(o =>
      o.alive && o.state === TentState.ACTIVE &&
      o.es === hit && o.et === this.sel
    );
    if (opposing) nt.activateImmediate();

    SFX.buildStart();
    this.tents.push(nt);
    this.clearSel();
  }

  clearSel() { if (this.sel) this.sel.selected = false; this.sel = null; }

  checkSlice() {
    if (this.slicePath.length < 2) return;
    const p1 = this.slicePath[this.slicePath.length - 2];
    const p2 = this.slicePath[this.slicePath.length - 1];

    this.tents.forEach(t => {
      if (!t.alive) return;
      const cuttable = t.source && t.target &&
        (t.source.owner === 1 || (t.reversed && t.target.owner === 1));
      if (!cuttable) return;

      const cp    = t.getCP();
      const cutT  = findCutT(p1.x, p1.y, p2.x, p2.y, t.source.x, t.source.y, cp.x, cp.y, t.target.x, t.target.y);
      if (cutT < 0) return;

      /* actualCut = normalised position along effective source→target axis.
           < 0.3  → defensive refund (energy returns to source)
           > 0.7  → kamikaze burst   (payload rushes to target via BURSTING state)
           0.3–0.7 → normal cut      (retract, energy lost) */
      const actualCut = t.reversed ? (1 - cutT) : cutT;
      const srcNode   = t.reversed ? t.target : t.source;
      const tgtNode   = t.reversed ? t.source : t.target;

      t.cutPoint = actualCut;
      t.cutFlash = 0.6;

      /* All energy distribution is handled inside kill() and _updateBursting() */
      t.kill(actualCut);

      SFX.cut();
      srcNode.cFlash = (srcNode.cFlash || 0) + 0.6;
      this.cutsTotal = (this.cutsTotal || 0) + 1;

      /* Track AI cuts for reactive defence */
      if (srcNode.owner === 1 && t.source.owner === 2) {
        const now = this.time;
        this._aiCutLog.push(now);
        this._aiCutLog = this._aiCutLog.filter(ts => now - ts < 5);
        if (this._aiCutLog.length >= 2) {
          this.aiDefensive = 8.0;
          this._aiCutLog   = [];
          bus.emit('ai:defensive');
        }
      }

      /* Frenzy trigger */
      if (srcNode.owner === 1) {
        const now = this.time;
        this._frenzyLog.push(now);
        this._frenzyLog = this._frenzyLog.filter(ts => now - ts < 1.5);
        if (this._frenzyLog.length >= 3) {
          this.frenzyTimer = 4.0;
          this.frenzyCount = (this.frenzyCount || 0) + 1;
          this._frenzyLog  = [];
          showToast('⚡ FRENZY! +35% REGEN');
          SFX.frenzy();
          bus.emit('frenzy:start');
        }

        const pct = Math.round((1 - actualCut) * 100);
        showToast('✂ ' + pct + '% → ' + (tgtNode.owner === srcNode.owner ? 'ALLY' : 'TARGET'));
      }
    });
  }

  updateTip() {
    if (!this.sel || !this.cfg || this.paused) {
      const dc = $id(IDS.DC); if (dc) dc.classList.remove('on');
      return;
    }
    const camX = this.camX || 0, camY = this.camY || 0;
    const hov  = this.nodes.find(n =>
      n !== this.sel && vdSq(this.mx - camX, this.my - camY, n.x, n.y) <= (n.radius + 16) * (n.radius + 16)
    );
    const el = $id(IDS.DC);
    if (!el) return;
    if (hov) {
      const d    = vd(this.sel.x, this.sel.y, hov.x, hov.y);
      const cost = Math.ceil(bldC(d));
      const range= Math.ceil(d * this.cfg.dm);
      const tot  = cost + range;
      const have = Math.floor(this.sel.energy);
      const ok   = have >= tot + 1;
      const lu   = this._utils.liveOut(this.sel);
      const slots= MAX_SLOTS[this.sel.level] - lu;
      const fwd  = this.tents.find(t => t.alive && t.source === this.sel && t.target === hov);
      const bwd  = this.tents.find(t => t.alive && t.source === hov && t.target === this.sel && hov.owner === this.sel.owner);
      const ex   = fwd || bwd;
      el.style.left = (this.mx + 18) + 'px';
      el.style.top  = (this.my + 58) + 'px';
      if (ex) {
        const rev = (fwd && fwd.reversed) || (bwd && !bwd.reversed);
        const fr  = ex ? Math.round(ex.flowRate) : 0;
        el.textContent   = 'CLICK → ' + (rev ? T('flowRest') : T('flowRev')) + (fr > 1 ? ' | FLOW:' + fr + 'e/s' : '');
        el.style.color        = '#f5c518';
        el.style.borderColor  = 'rgba(245,197,24,0.3)';
      } else {
        const ok2 = ok && slots > 0;
        el.textContent  = 'BUILD:' + cost + ' RNG:' + range + ' TOT:' + tot + '  ' + (ok ? '✓' : '✗ ' + (tot-have)) + '  SLT:' + lu + '/' + MAX_SLOTS[this.sel.level];
        el.style.color       = ok2 ? '#00e5ff' : '#ff3d5a';
        el.style.borderColor = ok2 ? 'rgba(0,229,255,0.3)' : 'rgba(255,61,90,0.3)';
      }
      el.classList.add('on');
    } else {
      el.classList.remove('on');
    }
  }

  togglePause() {
    if (this.cfg && this.cfg.tut) return;
    this.paused = !this.paused;
    if (this.paused) {
      $id(IDS.PINFO).textContent   = T('phaseSuffix', this.cfg.id, this.cfg.name);
      $id(IDS.BTN_RESUME).textContent = T('resume');
      $id(IDS.BTN_PRL).textContent    = T('phaseSelect');
      $id(IDS.BTN_PRR).textContent    = T('restart');
      $id(IDS.BTN_PSKIP).textContent  = T('skip');
      $id(IDS.BTN_PMENU).textContent  = T('mainMenu');
      $id(IDS.PPSAVE).textContent     = T('progSaved');
      showScr('pause');
      Music.playMenu();
    } else {
      showScr(null);
      const w = this.cfg ? this.cfg.w || 1 : 1;
      if (w === 2) Music.playVoid();
      else if (w === 3) Music.playNexus();
      else Music.playGenesis();
    }
  }

  /* ─────────────────────────────── EVENTS ── */
  bindEvents() {
    const c = this.canvas;
    c.addEventListener('contextmenu', e => e.preventDefault());

    c.addEventListener('mousedown', e => {
      if (this.state !== 'playing' || this.paused) return;
      if (e.button === 2) { this.slicing = true; this.slicePath = [{ x: e.offsetX, y: e.offsetY }]; }
    });
    c.addEventListener('mousemove', e => {
      this.mx = e.offsetX; this.my = e.offsetY;
      if (this.slicing && !this.paused) { this.slicePath.push({ x: e.offsetX, y: e.offsetY }); this.checkSlice(); }
      if (!this.hoverPin && this.state === 'playing' && !this.paused) {
        const camX = this.camX || 0, camY = this.camY || 0;
        this.hoverNode = this.nodes.find(n =>
          !n.isRelay && vdSq(e.offsetX - camX, e.offsetY - camY, n.x, n.y) <= (n.radius + 14) * (n.radius + 14)
        ) || null;
      }
    });
    c.addEventListener('mouseup', e => {
      if (e.button === 2) { this.slicing = false; this.slicePath = []; return; }
      if (this.state === 'playing' && !this.paused && e.button === 0) this.click(e.offsetX, e.offsetY);
    });
    c.addEventListener('mouseleave', () => { if (!this.hoverPin) this.hoverNode = null; });

    /* Touch */
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      if (this.state !== 'playing' || this.paused) return;
      const rect = c.getBoundingClientRect();
      if (e.touches.length >= 2) {
        const t = e.touches[0];
        this.slicing = true;
        this.slicePath = [{ x: t.clientX - rect.left, y: t.clientY - rect.top }];
      } else {
        const t = e.touches[0];
        const tx = t.clientX - rect.left, ty = t.clientY - rect.top;
        this._tapStart = { x: tx, y: ty, t: Date.now() };
        this.mx = tx; this.my = ty;
        clearTimeout(this._longPressTimer);
        this._longPressTimer = setTimeout(() => {
          if (!this._tapStart) return;
          const camX = this.camX || 0, camY = this.camY || 0;
          const hit  = this.nodes.find(n =>
            !n.isRelay && vdSq(tx - camX, ty - camY, n.x, n.y) <= (n.radius + 14) * (n.radius + 14)
          );
          if (hit) { this.hoverNode = hit; this.hoverPin = true; }
        }, 400);
      }
    }, { passive: false });

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const t    = e.touches[0];
      const cx   = t.clientX - rect.left, cy2 = t.clientY - rect.top;
      this.mx = cx; this.my = cy2;
      if (this.slicing && !this.paused) {
        this.slicePath.push({ x: cx, y: cy2 }); this.checkSlice();
      } else if (this._tapStart && !this.paused) {
        const dx = cx - this._tapStart.x, dy = cy2 - this._tapStart.y;
        if (Math.hypot(dx, dy) > 20) {
          this.slicing   = true;
          this.slicePath = [{ x: this._tapStart.x, y: this._tapStart.y }, { x: cx, y: cy2 }];
          this.checkSlice();
          this._tapStart = null;
        }
      }
    }, { passive: false });

    c.addEventListener('touchend', e => {
      e.preventDefault();
      clearTimeout(this._longPressTimer);
      const rect = c.getBoundingClientRect();
      if (this.slicing) {
        this.slicing = false; this.slicePath = [];
      } else if (this._tapStart && this.state === 'playing' && !this.paused) {
        const t  = e.changedTouches[0];
        const cx = t.clientX - rect.left, cy2 = t.clientY - rect.top;
        const dt2= Date.now() - this._tapStart.t;
        const dx = cx - this._tapStart.x, dy = cy2 - this._tapStart.y;
        if (dt2 < 600 && Math.hypot(dx, dy) < 22) this.click(cx, cy2);
      }
      this._tapStart = null; this.slicing = false; this.slicePath = [];
    }, { passive: false });

    c.addEventListener('touchcancel', () => {
      clearTimeout(this._longPressTimer);
      this.slicing = false; this.slicePath = []; this._tapStart = null;
    });

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.state === 'playing' && this.cfg && !this.cfg.tut) this.togglePause();
    });

    const hpause = $id(IDS.HPAUSE);
    if (hpause) hpause.addEventListener('click', () => this.togglePause());
    const tutNext = $id(IDS.TUT_NEXT);
    if (tutNext) tutNext.addEventListener('click', () => this.tut.advance());
    const hlang = $id(IDS.HLANG);
    if (hlang) hlang.addEventListener('click', () => {
      import('./i18n.js').then(m => { m.toggleLang(); if (this.cfg && this.cfg.tut) this.tut.showStep(); });
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
    if (!this.paused) {
      this.update(dt);
      this.renderer.render(this);
    }
    requestAnimationFrame(this.loop);
  }
}
