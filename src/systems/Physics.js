/* ================================================================
   NODE WARS v3 — Physics System

   Handles: vortex drain (W2), pulsar broadcast (W3), relay owner
   events, fog of war, auto-retract, camera follow.

   Extracted from Game.update() to reduce God Object scope.
   ================================================================ */

import { FOG_R, NodeType, TentState, TIER_REGEN, GAME_BALANCE } from '../constants.js';
import { bezPt, vdSq } from '../utils.js';
import { bus } from '../EventBus.js';

export class Physics {
  /* ── W2: Vortex hazard drain ── */
  static updateVortex(game, dt) {
    if (!game.hazards?.length) return;

    const hazards = game.hazards;
    const tents   = game.tents;

    for (let hi = 0; hi < hazards.length; hi++) {
      const hz = hazards[hi];
      hz.phase += dt * 1.3;

      /* Moving vortex: sinusoidal drift around anchor */
      if (hz.moving) {
        hz.x = hz.ax + Math.sin(game.time * 0.38 + hz.movePhase)  * hz.moveR;
        hz.y = hz.ay + Math.sin(game.time * 0.29 + hz.movePhaseY) * hz.moveR * 0.7;
      }

      /* Pulsing vortex: toggle active/inactive on half-period cycle */
      if (hz.pulsing) {
        hz.pulseTimer += dt;
        const half = hz.pulsePeriod / 2;
        if (hz.pulseTimer >= half) {
          hz.pulseActive = !hz.pulseActive;
          hz.pulseTimer  = 0;
        }
      }

      hz._drainCd = Math.max(0, (hz._drainCd || 0) - dt);

      /* Skip drain while inactive (pulsing OFF state) */
      if (hz.pulsing && !hz.pulseActive) {
        hz._warn = Math.max(0, (hz._warn || 0) - dt * 3);
        continue;
      }

      hz._warn = 0;

      for (let ti = 0; ti < tents.length; ti++) {
        const t = tents[ti];
        if (!t.alive || !t.source || !t.target) continue;
        if (t.state !== TentState.ACTIVE && t.state !== TentState.ADVANCING) continue;

        const cp  = t.getCP();
        /* Inline three bezier sample points to avoid allocating an array of objects */
        const sx  = t.source.x, sy  = t.source.y;
        const tx2 = t.target.x, ty2 = t.target.y;
        const cpx = cp.x,       cpy = cp.y;

        for (let bi = 0; bi < 3; bi++) {
          const bt  = 0.25 * (bi + 1);   // 0.25, 0.50, 0.75
          const bm  = 1 - bt;
          const ptx = bm * bm * sx + 2 * bm * bt * cpx + bt * bt * tx2;
          const pty = bm * bm * sy + 2 * bm * bt * cpy + bt * bt * ty2;
          const dx  = ptx - hz.x, dy = pty - hz.y;
          const d   = Math.sqrt(dx * dx + dy * dy);
          if (d < hz.r) {
            const intensity = 1 - d / hz.r;
            const drain     = hz.drainRate * intensity * dt;
            t.energyInPipe  = Math.max(0, (t.energyInPipe || 0) - drain);
            if (t.source) t.source.energy = Math.max(0.5, t.source.energy - drain * 0.3);
            hz._warn = 1;
            if (hz._drainCd <= 0 && Math.random() < 0.15) {
              bus.emit('hazard:drain', hz);
              hz._drainCd = 0.3;
            }
          }
        }
      }

      hz._warn = Math.max(0, (hz._warn || 0) - dt * 2);
    }
  }

  /* ── W3: Pulsar broadcast ── */
  static updatePulsar(game, dt) {
    if (!game.pulsars?.length) return;

    const pulsars = game.pulsars;
    const nodes   = game.nodes;

    for (let pi = 0; pi < pulsars.length; pi++) {
      const ps = pulsars[pi];
      ps.phase      += dt * 0.8;
      ps.timer      -= dt;
      ps.chargeTimer = Math.max(0, (ps.chargeTimer || 0) - dt);

      if (ps.timer <= 1.2 && ps.timer > 0 && ps.chargeTimer <= 0) {
        bus.emit('pulsar:charge', ps);
        ps.chargeTimer = 0.8;
        ps.charging    = true;
      }

      if (ps.timer <= 0) {
        ps.timer    = ps.interval;
        ps.charging = false;
        ps.pulse    = 1;
        bus.emit('pulsar:fire', ps);

        const rSq = ps.r * ps.r;
        for (let ni = 0; ni < nodes.length; ni++) {
          const n = nodes[ni];
          if (n.isRelay) continue;
          const dSq     = vdSq(n.x, n.y, ps.x, ps.y);
          const inRange = ps.isSuper || dSq < rSq;
          if (inRange && n.owner !== 0) {
            const share = ps.isSuper
              ? ps.strength * 0.55
              : ps.strength * (1 - Math.sqrt(dSq) / ps.r);
            n.energy    = Math.min(n.maxE, n.energy + share);
            n.cFlash    = 0.6;
            if (n.owner === 1) n.burstPulse = (n.burstPulse || 0) + (ps.isSuper ? 0.6 : 0.3);
          }
        }
      }

      ps.pulse = Math.max(0, (ps.pulse || 0) - dt * 0.9);
    }
  }

  /* ── W3: Relay capture detection ── */
  static updateRelay(game) {
    const nodes = game.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.isRelay) continue;
      if (n.owner !== 0 && n._prevOwner === 0) {
        bus.emit('relay:capture', n);
        game.fogDirty = true;
      }
      n._prevOwner = n.owner;
    }
  }

  /* ── Fog of war (throttled: at most 2× per second when fogDirty) ── */
  static updateFog(game, dt) {
    /* Signal Tower reveal: full visibility for player for 8 seconds */
    if (game.fogRevealTimer > 0) {
      const nodes = game.nodes;
      for (let i = 0; i < nodes.length; i++) nodes[i].inFog = false;
      return;
    }
    if (!game.fogDirty) return;

    /* Throttle: run heavy nested loop at most 2× per second */
    game._fogTimer = (game._fogTimer || 0) - dt;
    if (game._fogTimer > 0) return;
    game._fogTimer = 0.5;

    game.fogDirty = false;
    const nodes    = game.nodes;
    const FOG_R_SQ = FOG_R * FOG_R;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.owner === 1) { n.inFog = false; continue; }
      let visible = false;
      for (let j = 0; j < nodes.length; j++) {
        const p = nodes[j];
        if (p.owner !== 1) continue;
        if (vdSq(p.x, p.y, n.x, n.y) < FOG_R_SQ) { visible = true; break; }
      }
      n.inFog = !visible;
    }
  }

  /* ── W3 Signal Tower: capture triggers fog reveal ── */
  static updateSignalTower(game, dt) {
    if (game.fogRevealTimer > 0) {
      game.fogRevealTimer = Math.max(0, game.fogRevealTimer - dt);
      /* When timer expires, re-enable normal fog */
      if (game.fogRevealTimer === 0) game.fogDirty = true;
    }
    const nodes = game.nodes;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.type !== NodeType.SIGNAL) continue;
      if (n.owner === 1 && n._prevOwner !== 1) {
        game.fogRevealTimer = 8.0;
        game.fogDirty       = true;
        bus.emit('signal:capture', n);
      }
      n._prevOwner = n.owner;
    }
  }

  /* ── Auto-retract: pull back tentacles from dying cells ── */
  static updateAutoRetract(game) {
    const nodes = game.nodes;
    const tents = game.tents;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.autoRetract) continue;
      n.autoRetract = false;
      let killedAny = false;
      for (let j = 0; j < tents.length; j++) {
        const t = tents[j];
        if (t.alive && !t.reversed && t.source === n && t.target.owner !== n.owner) {
          t.kill();
          killedAny = true;
        }
      }
      if (n.owner === 1 && killedAny) {
        bus.emit('autoretract', n);
      }
    }
  }

  /* ── Camera soft-follow: centroid of player cells ── */
  static updateCamera(game, dt) {
    const nodes = game.nodes;
    let sumX = 0, sumY = 0, count = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.owner === 1 && !n.isRelay) { sumX += n.x; sumY += n.y; count++; }
    }
    if (!count) return;
    const tX = Math.max(-60, Math.min(60, -(sumX / count - game.W / 2) * 0.18));
    const tY = Math.max(-60, Math.min(60, -(sumY / count - game.H / 2) * 0.18));
    game.camX += (tX - game.camX) * Math.min(1, dt * 1.8);
    game.camY += (tY - game.camY) * Math.min(1, dt * 1.8);
  }

  /* ── outCount + tentFeedPerSec: computed once per frame ── */
  static updateOutCounts(game) {
    const nodes = game.nodes;
    const tents = game.tents;

    for (let i = 0; i < nodes.length; i++) {
      const n    = nodes[i];
      n.outCount = 0;
      n.inFlow   = 0;
    }

    for (let i = 0; i < tents.length; i++) {
      const t = tents[i];
      if (!t.alive || t.state === TentState.DEAD || t.state === TentState.RETRACTING) continue;
      const src = t.reversed ? t.target : t.source;
      src.outCount++;
    }

    /* tentFeedPerSec: Unified Pool model.
       Tier regen is divided equally among active tentacles. Each tent drains this amount
       from the source per second (in _updateNormal / _updateClash). GNode always adds the
       full tier regen. Net flow = 0 when outCount matches the split. Tents drain MORE than
       regen during clashes, drawing down stored energy — correct Tentacle Wars behavior.
       Under attack: no outgoing feed (energy reserved for defense). */
    for (let i = 0; i < nodes.length; i++) {
      const n          = nodes[i];
      const isAttacked = n.underAttack > 0.5;
      const outSlots   = Math.max(1, n.outCount);
      const tierRegen  = TIER_REGEN[n.level] ?? TIER_REGEN[0];
      n.tentFeedPerSec = isAttacked ? 0 : (tierRegen / outSlots) * GAME_BALANCE.GLOBAL_REGEN_MULT;
    }
  }
}
