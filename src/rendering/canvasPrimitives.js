/* ================================================================
   NODE WARS v3 — Canvas Primitives
   ================================================================ */

/** Draw a regular polygon (or circle if sides < 3) centered at (x,y). */
export function drawPolygon(ctx, x, y, radius, sideCount, angle = 0) {
  ctx.beginPath();
  if (sideCount < 3) {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    return;
  }

  for (let index = 0; index <= sideCount; index += 1) {
    const pointAngle = (index / sideCount) * Math.PI * 2 + angle;
    const pointX = x + radius * Math.cos(pointAngle);
    const pointY = y + radius * Math.sin(pointAngle);
    if (index === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
}

/** Draw a rounded rectangle path. r can be a number or { tl, tr, bl, br }. */
export function drawRoundedRect(ctx, x, y, width, height, radius) {
  const corners = typeof radius === 'number'
    ? { tl: radius, tr: radius, bl: radius, br: radius }
    : radius;

  ctx.moveTo(x + corners.tl, y);
  ctx.lineTo(x + width - corners.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + corners.tr);
  ctx.lineTo(x + width, y + height - corners.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - corners.br, y + height);
  ctx.lineTo(x + corners.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - corners.bl);
  ctx.lineTo(x, y + corners.tl);
  ctx.quadraticCurveTo(x, y, x + corners.tl, y);
}
