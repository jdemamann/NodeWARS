export function getCanvasPointFromClient(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function createSlicePathStart(screenX, screenY) {
  return [{ x: screenX, y: screenY }];
}

export function appendSlicePoint(slicePath, screenX, screenY) {
  return [...slicePath, { x: screenX, y: screenY }];
}

export function createTapCandidate(screenX, screenY, startedAtMs) {
  return {
    x: screenX,
    y: screenY,
    t: startedAtMs,
  };
}

export function computePointerDelta(tapCandidate, screenX, screenY) {
  return {
    dx: screenX - tapCandidate.x,
    dy: screenY - tapCandidate.y,
  };
}

export function shouldPromoteTapToSlice(tapCandidate, screenX, screenY, dragThresholdPx) {
  const { dx, dy } = computePointerDelta(tapCandidate, screenX, screenY);
  return Math.hypot(dx, dy) > dragThresholdPx;
}

export function shouldTriggerTapAction(tapCandidate, endedAtMs, screenX, screenY, maxDurationMs, maxDistancePx) {
  const tapDuration = endedAtMs - tapCandidate.t;
  const { dx, dy } = computePointerDelta(tapCandidate, screenX, screenY);
  return tapDuration < maxDurationMs && Math.hypot(dx, dy) < maxDistancePx;
}

export function resolveHoverTrackingState({ hoverPin, hoverNode, hoveredNode }) {
  if (hoverPin) {
    return { hoverNode, hoverPin };
  }

  return {
    hoverNode: hoveredNode,
    hoverPin: false,
  };
}
