/* ================================================================
   NODE WARS v3 — Physics System

   Handles: vortex drain (W2), pulsar broadcast (W3), relay owner
   events, fog of war, auto-retract, camera follow.

   Extracted from Game.update() to reduce God Object scope.
   ================================================================ */

import { FOG_R, NodeType, TentState } from '../constants.js';
import { bezPt } from '../utils.js';
import { bus } from '../EventBus.js';

export class Physics {
  /* ── W2: Vortex hazard drain ── */
  static updateVortex(game, dt) {
    if (!game.hazards?.length) return;

    game.hazards.forEach(hz => {
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
        return;
      }

      hz._warn = 0;

      game.tents.forEach(t => {
        if (!t.alive || !t.source || !t.target) return;
        if (t.state !== TentState.ACTIVE && t.state !== TentState.ADVANCING) return;

        const cp  = t.getCP();
        const pts = [
          bezPt(0.25, t.source.x, t.source.y, cp.x, cp.y, t.target.x, t.target.y),
          bezPt(0.50, t.source.x, t.source.y, cp.x, cp.y, t.target.x, t.target.y),
          bezPt(0.75, t.source.x, t.source.y, cp.x, cp.y, t.target.x, t.target.y),
        ];

        pts.forEach(pt => {
          const d = Math.hypot(pt.x - hz.x, pt.y - hz.y);
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
        });
      });

      hz._warn = Math.max(0, (hz._warn || 0) - dt * 2);
    });
  }

  /* ── W3: Pulsar broadcast ── */
  static updatePulsar(game, dt) {
    if (!game.pulsars?.length) return;

    game.pulsars.forEach(ps => {
      ps.phase      += dt * 0.8;
      ps.timer      -= dt;
      ps.chargeTimer = Math.max(0, (ps.chargeTimer || 0) - dt);

      if (ps.timer <= 1.2 && ps.timer > 0 && ps.chargeTimer <= 0) {
        bus.emit('pulsar:charge', ps);
        ps.chargeTimer = 0.8;
        ps.charging    = true;
      }

      if (ps.timer <= 0) {
        ps.timer   = ps.interval;
        ps.charging= false;
        ps.pulse   = 1;
        bus.emit('pulsar:fire', ps);

        game.nodes.forEach(n => {
          if (n.isRelay) return;
          const d = Math.hypot(n.x - ps.x, n.y - ps.y);
          const inRange = ps.isSuper || d < ps.r;
          if (inRange && n.owner !== 0) {
            const share = ps.isSuper
              ? ps.strength * 0.55              // uniform broadcast for super-pulsar
              : ps.strength * (1 - d / ps.r);
            n.energy    = Math.min(n.maxE, n.energy + share);
            n.cFlash    = 0.6;
            if (n.owner === 1) n.burstPulse = (n.burstPulse || 0) + (ps.isSuper ? 0.6 : 0.3);
          }
        });
      }

      ps.pulse = Math.max(0, (ps.pulse || 0) - dt * 0.9);
    });
  }

  /* ── W3: Relay capture detection ── */
  static updateRelay(game) {
    game.nodes.forEach(n => {
      if (!n.isRelay) return;
      if (n.owner !== 0 && n._prevOwner === 0) {
        bus.emit('relay:capture', n);
        game.fogDirty = true;
      }
      n._prevOwner = n.owner;
    });
  }

  /* ── Fog of war (recomputed only when fogDirty) ── */
  static updateFog(game) {
    /* Signal Tower reveal: full visibility for player for 8 seconds */
    if (game.fogRevealTimer > 0) {
      game.nodes.forEach(n => { n.inFog = false; });
      return;
    }
    if (!game.fogDirty) return;
    game.fogDirty = false;
    const playerCells = game.nodes.filter(n => n.owner === 1);
    game.nodes.forEach(n => {
      n.inFog = n.owner !== 1 && !playerCells.some(p => Math.hypot(p.x - n.x, p.y - n.y) < FOG_R);
    });
  }

  /* ── W3 Signal Tower: capture triggers fog reveal ── */
  static updateSignalTower(game, dt) {
    if (game.fogRevealTimer > 0) {
      game.fogRevealTimer = Math.max(0, game.fogRevealTimer - dt);
      /* When timer expires, re-enable normal fog */
      if (game.fogRevealTimer === 0) game.fogDirty = true;
    }
    game.nodes.forEach(n => {
      if (n.type !== NodeType.SIGNAL) return;
      if (n.owner === 1 && n._prevOwner !== 1) {
        game.fogRevealTimer = 8.0;
        game.fogDirty       = true;
        bus.emit('signal:capture', n);
      }
      n._prevOwner = n.owner;
    });
  }

  /* ── Auto-retract: pull back tentacles from dying cells ── */
  static updateAutoRetract(game) {
    game.nodes.forEach(n => {
      if (!n.autoRetract) return;
      n.autoRetract = false;
      const killed = game.tents.filter(t =>
        t.alive && !t.reversed && t.source === n && t.target.owner !== n.owner
      );
      killed.forEach(t => t.kill());
      if (n.owner === 1 && killed.length > 0) {
        bus.emit('autoretract', n);
      }
    });
  }

  /* ── Camera soft-follow: centroid of player cells ── */
  static updateCamera(game, dt) {
    const pN = game.nodes.filter(n => n.owner === 1 && !n.isRelay);
    if (!pN.length) return;
    const cx = pN.reduce((s, n) => s + n.x, 0) / pN.length - game.W / 2;
    const cy = pN.reduce((s, n) => s + n.y, 0) / pN.length - game.H / 2;
    const tX = Math.max(-60, Math.min(60, -cx * 0.18));
    const tY = Math.max(-60, Math.min(60, -cy * 0.18));
    game.camX += (tX - game.camX) * Math.min(1, dt * 1.8);
    game.camY += (tY - game.camY) * Math.min(1, dt * 1.8);
  }

  /* ── outCount + tentFeedPerSec: computed once per frame ── */
  static updateOutCounts(game) {
    /* Save last frame's inFlow before resetting — used for triangle feedback */
    game.nodes.forEach(n => {
      n._prevInFlow = n.inFlow || 0;
      n.outCount    = 0;
      n.inFlow      = 0;
    });

    game.tents.forEach(t => {
      if (!t.alive || t.state === TentState.DEAD || t.state === TentState.RETRACTING) return;
      const src = t.reversed ? t.target : t.source;
      src.outCount++;
    });

    /* tentFeedPerSec: energy rate available to each outgoing tentacle.
       Design rules:
         • Normal (not full, not attacked) : half regen per tentacle
         • Overflow (energy = maxE, not attacked) : full regen per tentacle
           (the regen that would be capped/wasted flows out instead)
         • Under attack : own regen is reserved for defense; no self-feed
         • Triangle feedback : friendly inFlow from last frame always adds on top
    */
    game.nodes.forEach(n => {
      const { regenMult } = game._utils;
      const baseRegen  = (n.regen || 0) * regenMult(n.level);
      const isAttacked = n.underAttack > 0.5;
      const isFull     = n.energy >= n.maxE * 0.99;

      let selfFeed = 0;
      if (!isAttacked) {
        selfFeed = baseRegen * 0.5;         // base: half regen per tentacle
        if (isFull) selfFeed = baseRegen;   // overflow: full regen flows out
      }

      /* Triangle / cascade feedback — only passes through when node is NOT full.
         A full node already converts its own regen to outflow (selfFeed = baseRegen).
         Adding prevInFlow on top when full causes exponential amplification in loops. */
      n.tentFeedPerSec = Math.max(0, selfFeed + (isFull ? 0 : (n._prevInFlow || 0)));
    });
  }
}
