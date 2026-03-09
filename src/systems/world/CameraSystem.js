import { GAMEPLAY_RULES } from '../../config/gameConfig.js';

const { world: WORLD_RULES } = GAMEPLAY_RULES;

export class CameraSystem {
  static update(game, dt) {
    const nodes = game.nodes;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (node.owner === 1 && !node.isRelay) {
        sumX += node.x;
        sumY += node.y;
        count += 1;
      }
    }
    if (!count) return;

    const targetCameraX = Math.max(
      -WORLD_RULES.CAMERA_MAX_OFFSET_PX,
      Math.min(WORLD_RULES.CAMERA_MAX_OFFSET_PX, -(sumX / count - game.W / 2) * WORLD_RULES.CAMERA_FOLLOW_STRENGTH),
    );
    const targetCameraY = Math.max(
      -WORLD_RULES.CAMERA_MAX_OFFSET_PX,
      Math.min(WORLD_RULES.CAMERA_MAX_OFFSET_PX, -(sumY / count - game.H / 2) * WORLD_RULES.CAMERA_FOLLOW_STRENGTH),
    );
    game.camX += (targetCameraX - game.camX) * Math.min(1, dt * WORLD_RULES.CAMERA_SMOOTHING);
    game.camY += (targetCameraY - game.camY) * Math.min(1, dt * WORLD_RULES.CAMERA_SMOOTHING);
  }
}
