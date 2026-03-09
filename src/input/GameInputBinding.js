import { GAMEPLAY_RULES } from '../config/gameConfig.js';
import {
  getMonotonicInputTimestamp,
  getCanvasPointFromClient,
  resolveHoverTrackingState,
  shouldPromoteTapToSlice,
  shouldTriggerTapAction,
} from './InputState.js';

const { input: INPUT_TUNING } = GAMEPLAY_RULES;

function isSliceButtonStillPressed(buttons, slicePointerButton) {
  if (slicePointerButton === 2) return (buttons & 2) === 2;
  if (slicePointerButton === 0) return (buttons & 1) === 1;
  return buttons !== 0;
}

export function bindGameInputEvents(game) {
  const canvas = game.canvas;
  const removeListeners = [];
  const on = (target, eventName, handler, options) => {
    target.addEventListener(eventName, handler, options);
    removeListeners.push(() => target.removeEventListener(eventName, handler, options));
  };

  const handleCanvasContextMenu = event => {
    event.preventDefault();
    if (game.slicing && game._slicePointerButton === 2) game._endSlice();
  };
  on(canvas, 'contextmenu', handleCanvasContextMenu);

  const handleCanvasMouseDown = event => {
    if (game.state !== 'playing' || game.paused) return;
    if (event.button === 2) {
      event.preventDefault();
      game._beginSlice(event.offsetX, event.offsetY, 2);
      return;
    }
    if (event.button === 0) {
      game._beginMouseDragCandidate(event.offsetX, event.offsetY);
    }
  };
  on(canvas, 'mousedown', handleCanvasMouseDown);

  const handleCanvasMouseMove = event => {
    game.mx = event.offsetX;
    game.my = event.offsetY;

    if (game.slicing && !game.paused) {
      if (!isSliceButtonStillPressed(event.buttons, game._slicePointerButton)) {
        game._endSlice();
      } else {
        game._extendSlice(event.offsetX, event.offsetY);
      }
    }
    /* Drag-connect only extends on held primary-button motion once slicing has
       not claimed the gesture. */
    if (!game.slicing && !game.paused && (event.buttons & 1) === 1) game._extendMouseDrag(event.offsetX, event.offsetY);
    if (!game.hoverPin && game.state === 'playing' && !game.paused) {
      const hoveredNode = game._findHoverNodeAtScreenPoint(event.offsetX, event.offsetY);
      const nextHoverState = resolveHoverTrackingState({
        hoverPin: game.hoverPin,
        hoverNode: game.hoverNode,
        hoveredNode,
      });
      game.hoverNode = nextHoverState.hoverNode;
    }
  };
  on(canvas, 'mousemove', handleCanvasMouseMove);

  const handleCanvasMouseUp = event => {
    if (event.button === 2) {
      game._endSlice();
      return;
    }
    if (game.state === 'playing' && !game.paused && event.button === 0) {
      if (game.slicing && game._slicePointerButton === 0) {
        game._endSlice();
        return;
      }
      const consumedByDrag = game._endMouseDrag(event.offsetX, event.offsetY);
      if (!consumedByDrag) game.click(event.offsetX, event.offsetY);
    }
  };
  on(canvas, 'mouseup', handleCanvasMouseUp);

  const handleCanvasMouseLeave = () => {
    if (!game.hoverPin) game.hoverNode = null;
    if (game.slicing) game._endSlice();
    game._clearMouseGestureState();
  };
  on(canvas, 'mouseleave', handleCanvasMouseLeave);

  const handleCanvasTouchStart = event => {
    event.preventDefault();
    if (game.state !== 'playing' || game.paused) return;

    if (event.touches.length >= 2) {
      const touchPoint = getCanvasPointFromClient(canvas, event.touches[0].clientX, event.touches[0].clientY);
      game._beginSlice(touchPoint.x, touchPoint.y);
      return;
    }

    const touchPoint = getCanvasPointFromClient(canvas, event.touches[0].clientX, event.touches[0].clientY);
    game._beginTapCandidate(touchPoint.x, touchPoint.y);
    clearTimeout(game._longPressTimer);
    game._longPressTimer = setTimeout(() => {
      if (!game._tapStart) return;
      game._pinHoverNodeAtScreenPoint(touchPoint.x, touchPoint.y);
    }, INPUT_TUNING.LONG_PRESS_DURATION_MS);
  };
  on(canvas, 'touchstart', handleCanvasTouchStart, { passive: false });

  const handleCanvasTouchMove = event => {
    event.preventDefault();
    const touchPoint = getCanvasPointFromClient(canvas, event.touches[0].clientX, event.touches[0].clientY);
    const touchX = touchPoint.x;
    const touchY = touchPoint.y;
    game.mx = touchX;
    game.my = touchY;

    if (game.slicing && !game.paused) {
      game._extendSlice(touchX, touchY);
      return;
    }

    if (game._tapStart && !game.paused) {
      if (shouldPromoteTapToSlice(game._tapStart, touchX, touchY, INPUT_TUNING.TOUCH_SLICE_DRAG_THRESHOLD_PX)) {
        game._beginSlice(game._tapStart.x, game._tapStart.y, 2);
        game._extendSlice(touchX, touchY);
        game._tapStart = null;
        game._clickCandidateStart = null;
        game._clickCandidateNode = null;
      }
    }
  };
  on(canvas, 'touchmove', handleCanvasTouchMove, { passive: false });

  const handleCanvasTouchEnd = event => {
    event.preventDefault();
    clearTimeout(game._longPressTimer);

    if (game.slicing) {
      game._endSlice();
    } else if (game._tapStart && game.state === 'playing' && !game.paused) {
      const touchPoint = getCanvasPointFromClient(canvas, event.changedTouches[0].clientX, event.changedTouches[0].clientY);
      if (shouldTriggerTapAction(
        game._tapStart,
        getMonotonicInputTimestamp(),
        touchPoint.x,
        touchPoint.y,
        INPUT_TUNING.TAP_MAX_DURATION_MS,
        INPUT_TUNING.TAP_MAX_DISTANCE_PX,
      )) {
        game.click(touchPoint.x, touchPoint.y);
      }
    }

    game._clearTouchState();
  };
  on(canvas, 'touchend', handleCanvasTouchEnd, { passive: false });

  const handleCanvasTouchCancel = () => game._clearTouchState();
  on(canvas, 'touchcancel', handleCanvasTouchCancel);

  const handleWindowResize = () => game.resize();
  on(window, 'resize', handleWindowResize);
  /* Window-level cleanup guards prevent orphaned slice trails when the browser
     ends the gesture outside the canvas or suppresses the expected release path. */
  const handleWindowMouseUp = event => {
    if (event.button === 2 && game.slicing) game._endSlice();
    if (event.button === 0) {
      if (game.slicing && game._slicePointerButton === 0) game._endSlice();
      game._clearMouseGestureState();
    }
  };
  on(window, 'mouseup', handleWindowMouseUp);
  const handleWindowPointerUp = () => {
    if (game.slicing) game._endSlice();
    game._clearMouseGestureState();
  };
  on(window, 'pointerup', handleWindowPointerUp);
  const handleWindowPointerCancel = () => {
    if (game.slicing) game._endSlice();
    game._clearMouseGestureState();
  };
  on(window, 'pointercancel', handleWindowPointerCancel);
  const handleWindowContextMenu = event => {
    if (game.slicing) game._endSlice();
    event.preventDefault();
  };
  on(window, 'contextmenu', handleWindowContextMenu);
  const handleWindowBlur = () => {
    if (game.slicing) game._endSlice();
    game._clearMouseGestureState();
  };
  on(window, 'blur', handleWindowBlur);
  const handleDocumentVisibilityChange = () => {
    if (document.hidden && game.slicing) game._endSlice();
  };
  on(document, 'visibilitychange', handleDocumentVisibilityChange);
  const handleWindowKeyDown = event => {
    if (event.key === 'Escape' && game.state === 'playing' && game.cfg) game.togglePause();
  };
  on(window, 'keydown', handleWindowKeyDown);

  return function disposeGameInputEvents() {
    clearTimeout(game._longPressTimer);
    game._clearMouseGestureState();
    game._clearTouchState();
    removeListeners.splice(0).reverse().forEach(removeListener => removeListener());
  };
}
