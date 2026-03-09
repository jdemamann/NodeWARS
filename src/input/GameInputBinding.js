import { GAMEPLAY_RULES } from '../config/gameConfig.js';
import {
  createSlicePathStart,
  getCanvasPointFromClient,
  resolveHoverTrackingState,
  shouldPromoteTapToSlice,
  shouldTriggerTapAction,
} from './InputState.js';

const { input: INPUT_TUNING } = GAMEPLAY_RULES;

export function bindGameInputEvents(game) {
  const canvas = game.canvas;

  canvas.addEventListener('contextmenu', event => event.preventDefault());

  canvas.addEventListener('mousedown', event => {
    if (game.state !== 'playing' || game.paused) return;
    if (event.button === 2) {
      game._beginSlice(event.offsetX, event.offsetY);
      return;
    }
    if (event.button === 0) {
      game._beginMouseDragCandidate(event.offsetX, event.offsetY);
    }
  });

  canvas.addEventListener('mousemove', event => {
    game.mx = event.offsetX;
    game.my = event.offsetY;

    if (game.slicing && !game.paused) game._extendSlice(event.offsetX, event.offsetY);
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
  });

  canvas.addEventListener('mouseup', event => {
    if (event.button === 2) {
      game._endSlice();
      return;
    }
    if (game.state === 'playing' && !game.paused && event.button === 0) {
      const consumedByDrag = game._endMouseDrag(event.offsetX, event.offsetY);
      if (!consumedByDrag) game.click(event.offsetX, event.offsetY);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (!game.hoverPin) game.hoverNode = null;
    game._mouseDownStart = null;
    game._dragConnectSource = null;
    game._dragConnectActive = false;
  });

  canvas.addEventListener('touchstart', event => {
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
  }, { passive: false });

  canvas.addEventListener('touchmove', event => {
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
        game.slicing = true;
        game.slicePath = createSlicePathStart(game._tapStart.x, game._tapStart.y);
        game._extendSlice(touchX, touchY);
        game._tapStart = null;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', event => {
    event.preventDefault();
    clearTimeout(game._longPressTimer);

    if (game.slicing) {
      game._endSlice();
    } else if (game._tapStart && game.state === 'playing' && !game.paused) {
      const touchPoint = getCanvasPointFromClient(canvas, event.changedTouches[0].clientX, event.changedTouches[0].clientY);
      if (shouldTriggerTapAction(
        game._tapStart,
        Date.now(),
        touchPoint.x,
        touchPoint.y,
        INPUT_TUNING.TAP_MAX_DURATION_MS,
        INPUT_TUNING.TAP_MAX_DISTANCE_PX,
      )) {
        game.click(touchPoint.x, touchPoint.y);
      }
    }

    game._clearTouchState();
  }, { passive: false });

  canvas.addEventListener('touchcancel', () => game._clearTouchState());

  window.addEventListener('resize', () => game.resize());
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && game.state === 'playing' && game.cfg && !game.cfg.isTutorial) game.togglePause();
  });
}
