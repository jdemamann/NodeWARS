/* ================================================================
   Pulsar system

   Advances pulsar timers and injects energy into owned non-relay
   nodes when a pulse fires.
   ================================================================ */

import { GAMEPLAY_RULES } from '../../config/gameConfig.js';
import { computeDistanceSquared } from '../../math/simulationMath.js';
import { bus } from '../../core/EventBus.js';

const { world: WORLD_RULES } = GAMEPLAY_RULES;

export class PulsarSystem {
  static update(game, dt) {
    if (!game.pulsars?.length) return;

    const pulsars = game.pulsars;
    const nodes = game.nodes;

    for (let pulsarIndex = 0; pulsarIndex < pulsars.length; pulsarIndex += 1) {
      const pulsar = pulsars[pulsarIndex];
      pulsar.phase += dt * 0.8;
      pulsar.timer -= dt;
      pulsar.chargeTimer = Math.max(0, (pulsar.chargeTimer || 0) - dt);

      if (pulsar.timer <= WORLD_RULES.PULSAR_CHARGE_WARNING_SEC && pulsar.timer > 0 && pulsar.chargeTimer <= 0) {
        bus.emit('pulsar:charge', pulsar);
        pulsar.chargeTimer = WORLD_RULES.PULSAR_CHARGE_COOLDOWN_SEC;
        pulsar.charging = true;
      }

      if (pulsar.timer <= 0) {
        pulsar.timer = pulsar.interval;
        pulsar.charging = false;
        pulsar.pulse = 1;
        bus.emit('pulsar:fire', pulsar);

        const rangeSq = pulsar.r * pulsar.r;
        for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
          const node = nodes[nodeIndex];
          if (node.isRelay) continue;
          const distanceSq = computeDistanceSquared(node.x, node.y, pulsar.x, pulsar.y);
          const inRange = pulsar.isSuper || distanceSq < rangeSq;
          if (inRange && node.owner !== 0) {
            const share = pulsar.isSuper
              ? pulsar.strength * 0.55
              : pulsar.strength * (1 - Math.sqrt(distanceSq) / pulsar.r);
            node.energy = Math.min(node.maxE, node.energy + share);
            node.cFlash = 0.6;
            if (node.owner === 1) node.burstPulse = (node.burstPulse || 0) + (pulsar.isSuper ? 0.6 : 0.3);
          }
        }
      }

      pulsar.pulse = Math.max(0, (pulsar.pulse || 0) - dt * 0.9);
    }
  }
}
