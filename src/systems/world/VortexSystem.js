import { TentState } from '../../config/gameConfig.js';
import { bus } from '../../core/EventBus.js';

export class VortexSystem {
  static update(game, dt) {
    if (!game.hazards?.length) return;

    const hazards = game.hazards;
    const tentacles = game.tents;

    for (let hazardIndex = 0; hazardIndex < hazards.length; hazardIndex += 1) {
      const hazard = hazards[hazardIndex];
      hazard.phase += dt * 1.3;

      if (hazard.moving) {
        hazard.x = hazard.ax + Math.sin(game.time * 0.38 + hazard.movePhase) * hazard.moveR;
        hazard.y = hazard.ay + Math.sin(game.time * 0.29 + hazard.movePhaseY) * hazard.moveR * 0.7;
      }

      if (hazard.pulsing) {
        hazard.pulseTimer += dt;
        const halfPeriod = hazard.pulsePeriod / 2;
        if (hazard.pulseTimer >= halfPeriod) {
          hazard.pulseActive = !hazard.pulseActive;
          hazard.pulseTimer = 0;
        }
      }

      hazard._drainCd = Math.max(0, (hazard._drainCd || 0) - dt);

      if (hazard.pulsing && !hazard.pulseActive) {
        hazard._warn = Math.max(0, (hazard._warn || 0) - dt * 3);
        continue;
      }

      hazard._warn = 0;

      for (let tentacleIndex = 0; tentacleIndex < tentacles.length; tentacleIndex += 1) {
        const tentacle = tentacles[tentacleIndex];
        if (!tentacle.alive || !tentacle.source || !tentacle.target) continue;
        if (tentacle.state !== TentState.ACTIVE && tentacle.state !== TentState.ADVANCING) continue;

        const controlPoint = tentacle.getControlPoint();
        const sourceX = tentacle.source.x;
        const sourceY = tentacle.source.y;
        const targetX = tentacle.target.x;
        const targetY = tentacle.target.y;
        const controlX = controlPoint.x;
        const controlY = controlPoint.y;

        for (let sampleIndex = 0; sampleIndex < 3; sampleIndex += 1) {
          const sampleT = 0.25 * (sampleIndex + 1);
          const sampleInvT = 1 - sampleT;
          const pointX = sampleInvT * sampleInvT * sourceX + 2 * sampleInvT * sampleT * controlX + sampleT * sampleT * targetX;
          const pointY = sampleInvT * sampleInvT * sourceY + 2 * sampleInvT * sampleT * controlY + sampleT * sampleT * targetY;
          const deltaX = pointX - hazard.x;
          const deltaY = pointY - hazard.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          if (distance < hazard.r) {
            const intensity = 1 - distance / hazard.r;
            const drain = hazard.drainRate * intensity * dt;
            tentacle.energyInPipe = Math.max(0, (tentacle.energyInPipe || 0) - drain);
            const effectiveSourceNode = tentacle.effectiveSourceNode || tentacle.source;
            if (effectiveSourceNode) {
              effectiveSourceNode.energy = Math.max(0.5, effectiveSourceNode.energy - drain * 0.3);
            }
            hazard._warn = 1;
            if (hazard._drainCd <= 0 && Math.random() < 0.15) {
              bus.emit('hazard:drain', hazard);
              hazard._drainCd = 0.3;
            }
          }
        }
      }

      hazard._warn = Math.max(0, (hazard._warn || 0) - dt * 2);
    }
  }
}
