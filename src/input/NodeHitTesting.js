import { NodeType } from '../config/gameConfig.js';
import { computeDistanceSquared } from '../math/simulationMath.js';

export function hasNodeHit(node, worldX, worldY, hitPaddingPx) {
  return computeDistanceSquared(worldX, worldY, node.x, node.y) <= (node.radius + hitPaddingPx) * (node.radius + hitPaddingPx);
}

export function findNodeAtWorldPoint(nodes, worldX, worldY, hitPaddingPx, { excludeHazards = true } = {}) {
  return nodes.find(node => {
    if (excludeHazards && node.type === NodeType.HAZARD) return false;
    return hasNodeHit(node, worldX, worldY, hitPaddingPx);
  }) || null;
}
