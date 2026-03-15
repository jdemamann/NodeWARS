/* ================================================================
   Background renderer

   Draws the world background: solid fill, hex-dot grid, scanline,
   and ambient glow from player cells.
   ================================================================ */

import { THEMES } from '../config/gameConfig.js';
import { STATE }  from '../core/GameState.js';

export class BGRenderer {
  constructor() {
    this._gridCanvas    = null;
    this._gridW         = 0;
    this._gridH         = 0;
    this._lastWorld     = -1;
    this._lastGridColor = null;
    this._glowCache     = new Map(); // nodeId → { img: OffscreenCanvas, r: radius }
  }

  /* Pre-render node ambient glow to an OffscreenCanvas — reuse across frames. */
  _buildNodeGlow(n) {
    const r = n.radius;
    const cached = this._glowCache.get(n.id);
    if (cached && cached.r === r) return cached.img;

    const size = Math.ceil(r * 3.5) * 2 + 4;
    const oc = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(size, size)
      : (() => { const c = document.createElement('canvas'); c.width = c.height = size; return c; })();
    const gc  = oc.getContext('2d');
    const cx  = size / 2;
    const grad = gc.createRadialGradient(cx, cx, 0, cx, cx, r * 3.5);
    grad.addColorStop(0, 'rgba(0,229,255,0.055)');
    grad.addColorStop(1, 'rgba(0,229,255,0)');
    gc.fillStyle = grad;
    gc.fillRect(0, 0, size, size);

    this._glowCache.set(n.id, { img: oc, r });
    return oc;
  }

  /* Lazily build (or rebuild) the static hex-dot grid texture.
     Invalidates when world, canvas size, or theme grid color changes. */
  _buildGrid(W, H, world, gridColor) {
    if (
      this._gridCanvas     &&
      this._gridW         === W    &&
      this._gridH         === H    &&
      this._lastWorld     === world &&
      this._lastGridColor === gridColor
    ) return;

    const oc = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(W, H)
      : document.createElement('canvas');
    oc.width  = W;
    oc.height = H;
    const gc = oc.getContext('2d');

    const gs = 52;
    gc.strokeStyle = gridColor;
    gc.lineWidth   = 1;
    for (let x = 0; x < W + gs; x += gs) {
      for (let y = 0; y < H + gs; y += gs) {
        const ox = (y / gs % 2) * gs * 0.5;
        gc.beginPath();
        gc.arc(x + ox, y, 2, 0, Math.PI * 2);
        gc.stroke();
      }
    }

    this._gridCanvas    = oc;
    this._gridW         = W;
    this._gridH         = H;
    this._lastWorld     = world;
    this._lastGridColor = gridColor;
  }

  draw(ctx, game, W, H) {
    const world = game.cfg ? (game.cfg.worldId || 0) : 0;
    const t     = game.time;
    const highGraphics = STATE.settings.graphicsMode === 'high';
    const isTentacleWarsMode = game.twMode?.isTentacleWarsActive?.() || game.cfg?.isTentacleWarsCampaign || game.cfg?.isTentacleWarsSandbox;

    /* Resolve active theme — fall back to the canonical default UI theme. */
    const theme = THEMES[STATE.settings.theme] || THEMES.AURORA;

    /* World-specific background fill from theme */
    ctx.fillStyle = world === 2 ? theme.bgW2 : world === 3 ? theme.bgW3 : theme.bgW1;
    ctx.fillRect(0, 0, W, H);

    /* Static hex-dot grid — rebuilt only when theme or world changes */
    const gridColor = highGraphics ? theme.grid : theme.grid.replace('0.12', '0.07').replace('0.08', '0.05');
    this._buildGrid(W, H, world, gridColor);
    ctx.drawImage(this._gridCanvas, 0, 0);

    /* Slow-drifting scanline — simple fillRect avoids gradient creation per frame */
    if (highGraphics) {
      const scan = (t * 8) % H;
      ctx.fillStyle = 'rgba(0,229,255,0.011)';
      ctx.fillRect(0, scan - 22, W, 44);
    }

    /* Ambient glow around player cells — uses cached OffscreenCanvas per node */
    const camX = game.camX || 0;
    const camY = game.camY || 0;
    if (game.nodes) {
      if (highGraphics) {
        game.nodes
          .filter(n => n.owner === 1 && n.energy > 20)
          .forEach(n => {
            const img    = this._buildNodeGlow(n);
            const half   = img.width / 2;
            const pulse  = 0.65 + Math.sin(t * 1.8 + n.pulse) * 0.35;
            ctx.globalAlpha = pulse;
            ctx.drawImage(img, n.x + camX - half, n.y + camY - half);
          });
      }
      ctx.globalAlpha = 1;
    }

    if (isTentacleWarsMode) {
      const vignette = ctx.createRadialGradient(W * 0.52, H * 0.44, Math.min(W, H) * 0.06, W * 0.52, H * 0.44, Math.max(W, H) * 0.78);
      vignette.addColorStop(0, 'rgba(0,24,44,0)');
      vignette.addColorStop(1, 'rgba(2,8,18,0.46)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = highGraphics ? 0.5 : 0.28;
      for (let i = 0; i < 16; i += 1) {
        const phase = t * (0.08 + i * 0.01);
        const x = (i * 137 + phase * 23) % (W + 40) - 20;
        const y = (i * 91 + phase * 11) % (H + 40) - 20;
        const radius = 1.2 + (i % 4) * 0.6;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? 'rgba(0,229,255,0.09)' : 'rgba(192,64,255,0.06)';
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
