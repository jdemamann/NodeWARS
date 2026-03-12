/* ================================================================
   World systems coordinator

   Runs the optional layer on top of the core simulation: visibility,
   pulsars, vortexes, auto-retract, and camera follow.
   ================================================================ */

import { VortexSystem } from './world/VortexSystem.js';
import { PulsarSystem } from './world/PulsarSystem.js';
import { VisibilitySystem } from './world/VisibilitySystem.js';
import { AutoRetractSystem } from './world/AutoRetractSystem.js';
import { CameraSystem } from './world/CameraSystem.js';

export class WorldSystems {
  /* Canonical world-layer entry point.
     These mechanics are intentionally kept outside the core energy/tentacle loop. */
  static update(game, dt) {
    if (game.twMode?.isSandboxActive?.()) {
      WorldSystems.updateCamera(game, dt);
      return;
    }

    WorldSystems.updateVortex(game, dt);
    WorldSystems.updatePulsar(game, dt);
    WorldSystems.updateRelay(game);
    WorldSystems.updateSignalTower(game, dt);
    WorldSystems.updateFog(game, dt);
    WorldSystems.updateAutoRetract(game);
    WorldSystems.updateCamera(game, dt);
  }

  static updateVortex(game, dt) {
    VortexSystem.update(game, dt);
  }

  static updatePulsar(game, dt) {
    PulsarSystem.update(game, dt);
  }

  static updateRelay(game) {
    VisibilitySystem.updateRelay(game);
  }

  static updateFog(game, dt) {
    VisibilitySystem.updateFog(game, dt);
  }

  static updateSignalTower(game, dt) {
    VisibilitySystem.updateSignalTower(game, dt);
  }

  static updateAutoRetract(game) {
    AutoRetractSystem.update(game);
  }

  static updateCamera(game, dt) {
    CameraSystem.update(game, dt);
  }
}
