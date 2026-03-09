import { GAMEPLAY_RULES, NodeType } from '../../config/gameConfig.js';
import { computeDistanceSquared } from '../../math/simulationMath.js';
import { bus } from '../../core/EventBus.js';

const { world: WORLD_RULES } = GAMEPLAY_RULES;

export class VisibilitySystem {
  static updateRelay(game) {
    const nodes = game.nodes;
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (!node.isRelay) continue;
      if (node.owner !== 0 && node._prevOwner === 0) {
        bus.emit('relay:capture', node);
        game.fogDirty = true;
      }
      node._prevOwner = node.owner;
    }
  }

  static updateSignalTower(game, dt) {
    if (game.fogRevealTimer > 0) {
      game.fogRevealTimer = Math.max(0, game.fogRevealTimer - dt);
      if (game.fogRevealTimer === 0) game.fogDirty = true;
    }
    const nodes = game.nodes;
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (node.type !== NodeType.SIGNAL) continue;
      if (node.owner === 1 && node._prevOwner !== 1) {
        game.fogRevealTimer = WORLD_RULES.SIGNAL_REVEAL_DURATION_SEC;
        game.fogDirty = true;
        bus.emit('signal:capture', node);
      }
      node._prevOwner = node.owner;
    }
  }

  static updateFog(game, dt) {
    if (game.fogRevealTimer > 0) {
      const nodes = game.nodes;
      for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
        nodes[nodeIndex].inFog = false;
      }
      return;
    }
    if (!game.fogDirty) return;

    game._fogTimer = (game._fogTimer || 0) - dt;
    if (game._fogTimer > 0) return;
    game._fogTimer = WORLD_RULES.FOG_RECALC_INTERVAL_SEC;

    game.fogDirty = false;
    const nodes = game.nodes;
    const fogVisionRadiusSq = WORLD_RULES.FOG_VISION_RADIUS_PX * WORLD_RULES.FOG_VISION_RADIUS_PX;

    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      if (node.owner === 1) {
        node.inFog = false;
        continue;
      }
      let visible = false;
      for (let playerNodeIndex = 0; playerNodeIndex < nodes.length; playerNodeIndex += 1) {
        const playerNode = nodes[playerNodeIndex];
        if (playerNode.owner !== 1) continue;
        if (computeDistanceSquared(playerNode.x, playerNode.y, node.x, node.y) < fogVisionRadiusSq) {
          visible = true;
          break;
        }
      }
      node.inFog = !visible;
    }
  }
}
