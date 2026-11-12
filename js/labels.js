import * as THREE from 'three';

/**
 * Creates or updates a crisp HiDPI CanvasTexture Sprite for 3D labels
 */
export function createTextSprite(text, options = {}) {
  const canvas = document.createElement('canvas');
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthTest: options.depthTest ?? false,
      depthWrite: false,
    })
  );
  sprite.renderOrder = options.renderOrder ?? 20;
  updateTextSprite(sprite, text, options);
  return sprite;
}

export function updateTextSprite(sprite, text, options = {}) {
  const {
    subtext = '',
    bgColor = 'rgba(10, 16, 32, 0.86)',
    borderColor = 'rgba(148, 163, 184, 0.45)',
    textColor = '#f8fafc',
    subColor = '#94a3b8',
    fontSize = 30,
    scale = 0.011,
  } = options;

  const canvas = sprite.material.map.image;
  const ctx = canvas.getContext('2d');
  const dpr = 2;

  ctx.font = `700 ${fontSize * dpr}px "JetBrains Mono", monospace`;
  const mainWidth = ctx.measureText(text).width;

  let subWidth = 0;
  if (subtext) {
    ctx.font = `500 ${Math.round(fontSize * 0.68) * dpr}px "Inter", sans-serif`;
    subWidth = ctx.measureText(subtext).width;
  }

  const padX = 22 * dpr;
  const padY = 13 * dpr;
  const w = Math.max(110 * dpr, Math.ceil(Math.max(mainWidth, subWidth) + padX * 2));
  const h = subtext ? Math.ceil(fontSize * 2.15 * dpr + padY * 1.4) : Math.ceil(fontSize * 1.35 * dpr + padY * 1.4);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  } else {
    ctx.clearRect(0, 0, w, h);
  }

  // Pill background
  const r = 14 * dpr;
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.5 * dpr;

  roundRect(ctx, 3 * dpr, 3 * dpr, w - 6 * dpr, h - 6 * dpr, r);
  ctx.fill();
  ctx.stroke();

  // Main text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontSize * dpr}px "JetBrains Mono", monospace`;
  const mainY = subtext ? h * 0.38 : h * 0.52;
  ctx.fillText(text, w / 2, mainY);

  // Optional subtitle
  if (subtext) {
    ctx.fillStyle = subColor;
    ctx.font = `600 ${Math.round(fontSize * 0.66) * dpr}px "Inter", sans-serif`;
    ctx.fillText(subtext, w / 2, h * 0.74);
  }

  sprite.material.map.needsUpdate = true;
  sprite.scale.set((w / dpr) * scale, (h / dpr) * scale, 1);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
