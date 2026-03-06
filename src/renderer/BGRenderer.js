/* ================================================================
   NODE WARS v3 — Background Renderer

   Draws the world background: solid fill, hex-dot grid, scanline,
   and ambient glow from player cells.

   The hex grid is pre-rendered to an OffscreenCanvas once and
   composited each frame — avoids re-stroking hundreds of dots at
   60 fps.
   ================================================================ */

export class BGRenderer {
  constructor() {
    this._gridCanvas = null;
    this._gridW = 0;
    this._gridH = 0;
    this._lastWorld = -1;
    this._glowCache = new Map(); // nodeId → { img: OffscreenCanvas, r: radius }
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

  /* Lazily build (or rebuild) the static hex-dot grid texture. */
  _buildGrid(W, H, world) {
    if (
      this._gridCanvas &&
      this._gridW === W &&
      this._gridH === H &&
      this._lastWorld === world
    ) return;

    const oc = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(W, H)
      : document.createElement('canvas');
    oc.width  = W;
    oc.height = H;
    const gc = oc.getContext('2d');

    const gs = 52;
    gc.strokeStyle = 'rgba(0,229,255,0.016)';
    gc.lineWidth   = 1;
    for (let x = 0; x < W + gs; x += gs) {
      for (let y = 0; y < H + gs; y += gs) {
        const ox = (y / gs % 2) * gs * 0.5;
        gc.beginPath();
        gc.arc(x + ox, y, 2, 0, Math.PI * 2);
        gc.stroke();
      }
    }

    this._gridCanvas = oc;
    this._gridW      = W;
    this._gridH      = H;
    this._lastWorld  = world;
  }

  draw(ctx, game, W, H) {
    const world = game.cfg ? (game.cfg.w || 0) : 0;
    const t     = game.time;

    /* World-specific background fill */
    const bgColor = world === 2 ? '#070415' : world === 3 ? '#080602' : '#04070f';
    ctx.fillStyle  = bgColor;
    ctx.fillRect(0, 0, W, H);

    /* Static hex-dot grid */
    this._buildGrid(W, H, world);
    ctx.drawImage(this._gridCanvas, 0, 0);

    /* Slow-drifting scanline — simple fillRect avoids gradient creation per frame */
    const scan = (t * 8) % H;
    ctx.fillStyle = 'rgba(0,229,255,0.011)';
    ctx.fillRect(0, scan - 22, W, 44);

    /* Ambient glow around player cells — uses cached OffscreenCanvas per node */
    const camX = game.camX || 0;
    const camY = game.camY || 0;
    if (game.nodes) {
      game.nodes
        .filter(n => n.owner === 1 && n.energy > 20)
        .forEach(n => {
          const img    = this._buildNodeGlow(n);
          const half   = img.width / 2;
          const pulse  = 0.65 + Math.sin(t * 1.8 + n.pulse) * 0.35;
          ctx.globalAlpha = pulse;
          ctx.drawImage(img, n.x + camX - half, n.y + camY - half);
        });
      ctx.globalAlpha = 1;
    }
  }
}
