/* ================================================================
   Bezier geometry

   Shared geometry helpers for tentacle curves, slicing, and orb
   interpolation along bezier paths.
   ================================================================ */

/** Segment-segment intersection test. Returns true if [a,b] intersects [c,d]. */
export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const segmentOneX = bx - ax;
  const segmentOneY = by - ay;
  const segmentTwoX = dx - cx;
  const segmentTwoY = dy - cy;
  const cross = segmentOneX * segmentTwoY - segmentOneY * segmentTwoX;
  if (Math.abs(cross) < 1e-10) return false;

  const firstFactor = ((cx - ax) * segmentTwoY - (cy - ay) * segmentTwoX) / cross;
  const secondFactor = ((cx - ax) * segmentOneY - (cy - ay) * segmentOneX) / cross;
  return firstFactor >= 0 && firstFactor <= 1 && secondFactor >= 0 && secondFactor <= 1;
}

/** Quadratic Bezier point at parameter t. */
export function computeBezierPoint(t, x0, y0, x1, y1, x2, y2) {
  const inverseT = 1 - t;
  return {
    x: inverseT * inverseT * x0 + 2 * inverseT * t * x1 + t * t * x2,
    y: inverseT * inverseT * y0 + 2 * inverseT * t * y1 + t * t * y2,
  };
}

/** Find the t-parameter where a line segment crosses a Bezier curve. Returns -1 if no hit. */
export function findBezierCutRatio(segmentStartX, segmentStartY, segmentEndX, segmentEndY, curveStartX, curveStartY, controlPointX, controlPointY, curveEndX, curveEndY) {
  let previousPoint = computeBezierPoint(0, curveStartX, curveStartY, controlPointX, controlPointY, curveEndX, curveEndY);
  for (let index = 1; index <= 24; index += 1) {
    const nextPoint = computeBezierPoint(index / 24, curveStartX, curveStartY, controlPointX, controlPointY, curveEndX, curveEndY);
    if (segmentsIntersect(segmentStartX, segmentStartY, segmentEndX, segmentEndY, previousPoint.x, previousPoint.y, nextPoint.x, nextPoint.y)) {
      return (index - 0.5) / 24;
    }
    previousPoint = nextPoint;
  }
  return -1;
}

/** Draw a segment of a Bezier curve from t0 to t1 using N segments. */
export function drawBezierSegment(ctx, x0, y0, cx, cy, x1, y1, t0, t1, segmentCount = 16) {
  const startPoint = computeBezierPoint(t0, x0, y0, cx, cy, x1, y1);
  ctx.moveTo(startPoint.x, startPoint.y);
  for (let index = 1; index <= segmentCount; index += 1) {
    const point = computeBezierPoint(t0 + (t1 - t0) * (index / segmentCount), x0, y0, cx, cy, x1, y1);
    ctx.lineTo(point.x, point.y);
  }
}
