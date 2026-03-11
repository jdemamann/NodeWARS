/* ================================================================
   Node hit testing

   Shared pointer hit-test helpers for mouse, touch, hover, and drag
   targeting. Returns the closest valid node under the pointer so UI
   interactions stay stable when nodes overlap visually.
   ================================================================ */

import { NodeType } from '../config/gameConfig.js';
import { computeDistanceSquared } from '../math/simulationMath.js';

export function hasNodeHit(node, worldX, worldY, hitPaddingPx) {
  return computeDistanceSquared(worldX, worldY, node.x, node.y) <= (node.radius + hitPaddingPx) * (node.radius + hitPaddingPx);
}

export function findNodeAtWorldPoint(nodes, worldX, worldY, hitPaddingPx, { excludeHazards = true } = {}) {
  let closestNode = null;
  let closestDistanceSquared = Infinity;

  nodes.forEach(node => {
    if (excludeHazards && node.type === NodeType.HAZARD) return;
    if (!hasNodeHit(node, worldX, worldY, hitPaddingPx)) return;

    const distanceSquared = computeDistanceSquared(worldX, worldY, node.x, node.y);
    if (distanceSquared < closestDistanceSquared) {
      closestDistanceSquared = distanceSquared;
      closestNode = node;
    }
  });

  return closestNode;
}
