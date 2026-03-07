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

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._bg    = new BGRenderer();
  }

  render(game) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;

    /* ── Camera shake ── */
    let shaking = false;
    if (game.shake > 0) {
      game.shakeDir += 1.7;
      const sx = Math.cos(game.shakeDir) * game.shake;
      const sy = Math.sin(game.shakeDir * 1.3) * game.shake;
      ctx.save();
      ctx.translate(sx, sy);
      game.shake = Math.max(0, game.shake - 0.6);
      shaking = true;
    }

    /* ── Background ── */
    this._bg.draw(ctx, game, W, H);

    /* ── Preview line (screen space, before camera translate) ── */
    UIRenderer.drawPreview(ctx, game);

    /* ── World objects (camera-space) ── */
    const camX = game.camX || 0;
    const camY = game.camY || 0;
    ctx.save();
    ctx.translate(camX | 0, camY | 0);

    /* Hazards */
    if (game.hazards) {
      game.hazards.forEach(hz => HazardRenderer.drawVortex(ctx, hz, game.time));
    }

    /* Pulsars */
    if (game.pulsars) {
      game.pulsars.forEach(ps => HazardRenderer.drawPulsar(ctx, ps));
    }

    /* Tentacles */
    const frenzyActive = game.frenzyTimer > 0;
    game.tents.forEach(t => TentRenderer.draw(ctx, t));

    /* Tentacle flow orbs */
    game.orbPool.draw(ctx);

    /* Free orbs (post-cut particles, pooled) */
    game.freeOrbPool.draw(ctx);

    /* Nodes */
    game.nodes.forEach(n =>
      NodeRenderer.draw(ctx, n, game.time, game.sel, game.cfg ? game.cfg.dm : null, frenzyActive)
    );

    ctx.restore(); // end camera translate

    /* ── Tutorial overlay ── */
    if (game.cfg && game.cfg.tut && !game.tut.done) {
      game.tut.draw(ctx, game, game.time);
    }

    /* ── Screen-space UI ── */
    UIRenderer.drawInfoPanel(ctx, game, W, H);
    UIRenderer.drawFrenzy(ctx, game, W, H);
    UIRenderer.drawSlicer(ctx, game);

    /* ── End shake ── */
    if (shaking) ctx.restore();

    ctx.globalAlpha = 1;
  }
}
