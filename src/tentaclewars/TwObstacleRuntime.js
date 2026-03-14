/* ================================================================
   TentacleWars obstacle runtime

   Scales authored TentacleWars obstacle shapes into runtime-space
   blockers and exposes the canonical lane-blocking check shared by
   player input, preview, and AI.
   ================================================================ */

/* Scales one authored obstacle into the live campaign viewport. */
export function scaleTentacleWarsObstacle(obstacleData, viewport) {
  const minDimension = Math.min(viewport.width, viewport.height);
  const shape = obstacleData?.shape;

  if (shape?.kind === 'circle') {
    return {
      id: obstacleData.id,
      kind: 'circle',
      x: viewport.x + viewport.width * shape.cx,
      y: viewport.y + viewport.height * shape.cy,
      r: minDimension * shape.radius,
    };
  }

  if (shape?.kind === 'capsule') {
    return {
      id: obstacleData.id,
      kind: 'capsule',
      ax: viewport.x + viewport.width * shape.ax,
      ay: viewport.y + viewport.height * shape.ay,
      bx: viewport.x + viewport.width * shape.bx,
      by: viewport.y + viewport.height * shape.by,
      r: minDimension * shape.radius,
    };
  }

  throw new Error(`TentacleWars obstacle runtime received unsupported shape kind "${shape?.kind || 'unknown'}"`);
}

/* Computes the shortest distance from a circle center to a line segment. */
function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLengthSquared = abx * abx + aby * aby;
  if (abLengthSquared <= 0.000001) {
    return Math.hypot(px - ax, py - ay);
  }

  const projection = ((px - ax) * abx + (py - ay) * aby) / abLengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));
  const closestX = ax + abx * clampedProjection;
  const closestY = ay + aby * clampedProjection;
  return Math.hypot(px - closestX, py - closestY);
}

/* Returns whether two segments intersect, including collinear overlap. */
function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const epsilon = 0.000001;
  /* Measures turn direction while tolerating tiny floating-point noise. */
  const orientation = (px, py, qx, qy, rx, ry) => {
    const value = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
    if (Math.abs(value) <= epsilon) return 0;
    return value > 0 ? 1 : 2;
  };
  /* Treats collinear overlap as an intersection for blocker semantics. */
  const onSegment = (px, py, qx, qy, rx, ry) =>
    qx <= Math.max(px, rx) + epsilon &&
    qx + epsilon >= Math.min(px, rx) &&
    qy <= Math.max(py, ry) + epsilon &&
    qy + epsilon >= Math.min(py, ry);

  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(ax, ay, cx, cy, bx, by)) return true;
  if (o2 === 0 && onSegment(ax, ay, dx, dy, bx, by)) return true;
  if (o3 === 0 && onSegment(cx, cy, ax, ay, dx, dy)) return true;
  if (o4 === 0 && onSegment(cx, cy, bx, by, dx, dy)) return true;
  return false;
}

/* Computes the shortest distance between two finite line segments. */
export function segmentSegmentDistance(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
  return Math.min(
    distancePointToSegment(ax, ay, cx, cy, dx, dy),
    distancePointToSegment(bx, by, cx, cy, dx, dy),
    distancePointToSegment(cx, cy, ax, ay, bx, by),
    distancePointToSegment(dx, dy, ax, ay, bx, by),
  );
}

/* Returns the first obstacle that blocks the proposed direct lane, if any. */
export function findBlockingTentacleWarsObstacle(obstacles, sourceNode, targetNode) {
  if (!Array.isArray(obstacles) || !sourceNode || !targetNode) return null;

  for (const obstacle of obstacles) {
    if (!obstacle) continue;

    if (obstacle.kind === 'circle') {
      const distanceToLane = distancePointToSegment(
        obstacle.x,
        obstacle.y,
        sourceNode.x,
        sourceNode.y,
        targetNode.x,
        targetNode.y,
      );
      if (distanceToLane < obstacle.r) return obstacle;
      continue;
    }

    if (obstacle.kind === 'capsule') {
      const distanceToLane = segmentSegmentDistance(
        sourceNode.x,
        sourceNode.y,
        targetNode.x,
        targetNode.y,
        obstacle.ax,
        obstacle.ay,
        obstacle.bx,
        obstacle.by,
      );
      if (distanceToLane < obstacle.r) return obstacle;
    }
  }

  return null;
}

/* Canonical gate for TentacleWars lane creation across player, AI, and preview. */
export function canCreateTentacleWarsLane(obstacles, sourceNode, targetNode) {
  return !findBlockingTentacleWarsObstacle(obstacles, sourceNode, targetNode);
}
