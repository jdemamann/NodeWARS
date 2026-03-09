/* ================================================================
   NODE WARS v3 — Renderer (coordinator)

   Orchestrates the full render pipeline each frame:
     1. Camera shake
     2. Background (BGRenderer)
     3. Preview line (UIRenderer)
     4. Camera translate (world objects)
        a. Hazards (HazardRenderer)
        b. Pulsars (HazardRenderer)
        c. Tentacles + orbs (TentRenderer)
        d. Free orbs
        e. Nodes (NodeRenderer)
     5. End camera translate
     6. Tutorial overlay (Tutorial.draw)
     7. Info panel, frenzy bar, slicer (UIRenderer)
     8. End camera shake
   ================================================================ */

import { BGRenderer }     from './BGRenderer.js';
import { NodeRenderer }   from './NodeRenderer.js';
import { TentRenderer }   from './TentRenderer.js';
import { HazardRenderer } from './HazardRenderer.js';
import { UIRenderer }     from './UIRenderer.js';
import { STATE }          from '../core/GameState.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this._backgroundRenderer = new BGRenderer();
  }

  render(game) {
    const renderStartTime = performance.now();
    const context = this.context;
    const canvasWidth   = this.canvas.width;
    const canvasHeight  = this.canvas.height;

    /* ── Camera shake ── */
    let shaking = false;
    if (game.shake > 0) {
      game.shakeDir += 1.7;
      const shakeOffsetX = Math.cos(game.shakeDir) * game.shake;
      const shakeOffsetY = Math.sin(game.shakeDir * 1.3) * game.shake;
      context.save();
      context.translate(shakeOffsetX, shakeOffsetY);
      game.shake = Math.max(0, game.shake - 0.6);
      shaking = true;
    }

    /* ── Background ── */
    this._backgroundRenderer.draw(context, game, canvasWidth, canvasHeight);

    /* ── Preview line (screen space, before camera translate) ── */
    UIRenderer.drawPreview(context, game);

    /* ── World objects (camera-space) ── */
    const camX = game.camX || 0;
    const camY = game.camY || 0;
    context.save();
    context.translate(camX | 0, camY | 0);

    /* Hazards */
    if (game.hazards) {
      game.hazards.forEach(vortex => HazardRenderer.drawVortex(context, vortex, game.time));
    }

    /* Pulsars */
    if (game.pulsars) {
      game.pulsars.forEach(pulsar => HazardRenderer.drawPulsar(context, pulsar));
    }

    /* Tentacles */
    const frenzyActive = game.frenzyTimer > 0;
    game.tents.forEach(tentacle => TentRenderer.draw(context, tentacle));

    /* Tentacle flow orbs */
    game.orbPool.draw(context);

    /* Free orbs (post-cut particles, pooled) */
    game.freeOrbPool.draw(context);

    /* Nodes */
    game.nodes.forEach(node =>
      NodeRenderer.draw(context, node, game.time, game.sel, game.cfg ? game.cfg.distanceCostMultiplier : null, frenzyActive)
    );

    context.restore(); // end camera translate

    /* ── Tutorial overlay ── */
    if (game.cfg && game.cfg.isTutorial && !game.tut.done) {
      game.tut.draw(context, game, game.time);
    }

    /* ── Screen-space UI ── */
    UIRenderer.drawVisualEvents(context, game);
    UIRenderer.drawPhaseStatus(context, game, canvasWidth, canvasHeight);
    UIRenderer.drawInfoPanel(context, game, canvasWidth, canvasHeight);
    UIRenderer.drawFrenzy(context, game, canvasWidth, canvasHeight);
    UIRenderer.drawSlicer(context, game);
    UIRenderer.drawPhaseOutcome(context, game, canvasWidth, canvasHeight);

    /* ── End shake ── */
    if (shaking) context.restore();

    context.globalAlpha = 1;

    const frameMs = performance.now() - renderStartTime;
    game.renderStats = {
      frameMs,
      avgFrameMs: game.renderStats?.avgFrameMs
        ? game.renderStats.avgFrameMs * 0.9 + frameMs * 0.1
        : frameMs,
      nodeCount: game.nodes.length,
      tentCount: game.tents.length,
      hazardCount: game.hazards?.length || 0,
      pulsarCount: game.pulsars?.length || 0,
      orbCount: game.orbPool?.count || 0,
      freeOrbCount: game.freeOrbPool?.count || 0,
      visualEventCount: game.visualEvents?.length || 0,
      graphicsMode: STATE.settings.graphicsMode || 'low',
    };
  }
}
