// Runtime stand-in for the labelled 1086×362 Stage 3 plates. Real 2172×724
// paintings replace these the moment their width is no longer the half-res card.
// Drawing is deterministic (no Math.random) and runs once per Stage 3 build.

export const STAGE3_PLATE_W = 1086;
export const STAGE3_PLATE_H = 362;

const PLATE_KEYS = ['far3_day', 'far3_night', 'mid3a', 'mid3b', 'floor3a', 'floor3b', 'floor3c'];

function sourceOf(scene, key) {
  const tex = scene?.textures?.get?.(key);
  const image = tex?.getSourceImage?.();
  if (!tex || !image) return null;
  return { tex, image, source: tex.source?.[0] || null };
}

export function isPlaceholderPlate(scene, key) {
  const src = sourceOf(scene, key);
  return !!src && src.image.width === STAGE3_PLATE_W && src.image.height === STAGE3_PLATE_H;
}

function grad(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) gr.addColorStop(t, c);
  return gr;
}

function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

function poly(g, pts, color) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

function house(g, x, ground, w, wallH, wall, roof, win) {
  rect(g, x, ground - wallH, w, wallH, wall);
  poly(g, [x - 4, ground - wallH + 1, x + w * 0.5, ground - wallH - Math.max(18, w * 0.38), x + w + 4, ground - wallH + 1], roof);
  rect(g, x + w * 0.22, ground - wallH * 0.62, Math.max(6, w * 0.14), wallH * 0.22, win);
  rect(g, x + w * 0.58, ground - wallH * 0.62, Math.max(6, w * 0.14), wallH * 0.22, win);
  rect(g, x + w * 0.4, ground - wallH * 0.38, Math.max(8, w * 0.16), wallH * 0.38, '#2a211c');
}

function skyDay(g, w, h) {
  g.fillStyle = grad(g, 0, 0, 0, h, [[0, '#8ec4ea'], [0.45, '#f2c98a'], [0.72, '#e8945a'], [1, '#c46a4a']]);
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,244,220,0.85)';
  g.beginPath(); g.ellipse(w * 0.18, h * 0.22, 70, 22, 0, 0, 6.3); g.fill();
  g.beginPath(); g.ellipse(w * 0.62, h * 0.16, 90, 18, 0, 0, 6.3); g.fill();
  const ground = h * 0.78;
  for (let i = 0; i < 14; i++) {
    const x = 20 + i * 78, bh = 40 + (i % 4) * 18;
    rect(g, x, ground - bh, 46, bh, i % 3 ? '#d7c3a4' : '#efe2cc');
    poly(g, [x - 2, ground - bh, x + 23, ground - bh - 28, x + 48, ground - bh], '#b85a3c');
  }
  poly(g, [w * 0.42, ground, w * 0.48, h * 0.28, w * 0.5, ground], '#f4efe4');
  poly(g, [w * 0.5, ground, w * 0.56, h * 0.22, w * 0.6, ground], '#f7f1e4');
  g.fillStyle = '#e6d7a8';
  g.beginPath(); g.ellipse(w * 0.53, h * 0.34, 28, 16, 0, 0, 6.3); g.fill();
}

function skyNight(g, w, h) {
  g.fillStyle = grad(g, 0, 0, 0, h, [[0, '#070b18'], [0.5, '#1a2748'], [1, '#24344a']]);
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4f7ff';
  for (let i = 0; i < 70; i++) {
    const x = (i * 97 + 13) % w, y = (i * 53 + 7) % (h * 0.55);
    g.globalAlpha = i % 3 === 0 ? 0.95 : 0.45;
    g.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
  g.globalAlpha = 1;
  const mx = w * 0.78, my = h * 0.2;
  const glow = g.createRadialGradient(mx, my, 4, mx, my, 70);
  glow.addColorStop(0, 'rgba(255,250,230,0.9)');
  glow.addColorStop(1, 'rgba(255,250,230,0)');
  g.fillStyle = glow;
  g.beginPath(); g.arc(mx, my, 70, 0, 6.3); g.fill();
  const ground = h * 0.78;
  for (let i = 0; i < 14; i++) {
    const x = 20 + i * 78, bh = 40 + (i % 4) * 18;
    rect(g, x, ground - bh, 46, bh, '#1c2433');
    poly(g, [x - 2, ground - bh, x + 23, ground - bh - 28, x + 48, ground - bh], '#141820');
    if (i % 2 === 0) rect(g, x + 16, ground - bh + 10, 5, 6, '#e7b15a');
  }
  poly(g, [w * 0.42, ground, w * 0.48, h * 0.28, w * 0.5, ground], '#d9e4f2');
  poly(g, [w * 0.5, ground, w * 0.56, h * 0.22, w * 0.6, ground], '#e7eef8');
}

function midMarket(g, w, h) {
  const ground = h - 8, half = w / 2;
  for (let i = 0; i < 7; i++) house(g, 18 + i * 74, ground, 62, 78 + (i % 3) * 16, i % 2 ? '#c9b292' : '#dfd0b4', '#9c3b32', '#f3d48a');
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 100;
    rect(g, x, ground - 46, 54, 46, i % 2 ? '#8e2f3a' : '#245c86');
    rect(g, x + 4, ground - 52, 46, 8, '#f2e2b0');
    rect(g, x + 8, ground - 28, 16, 14, '#6b4a2e');
  }
  rect(g, 8, ground - 150, 36, 150, '#d5d0c6');
  g.fillStyle = '#efeae2';
  g.beginPath(); g.arc(26, ground - 168, 22, 0, 6.3); g.fill();
  house(g, half + 30, ground, 200, 150, '#e4d5bf', '#8d3a32', '#ffd78a');
  rect(g, half + 90, ground - 168, 28, 22, '#6a5038');
  rect(g, half + 250, ground - 70, 90, 70, '#8d6844');
  poly(g, [half + 246, ground - 70, half + 295, ground - 108, half + 344, ground - 70], '#7a342c');
  g.fillStyle = '#f6e7c2';
  g.fillRect(half + 108, ground - 118, 36, 28);
  g.strokeStyle = '#6a5038';
  g.lineWidth = 2;
  g.strokeRect(half + 108, ground - 118, 36, 28);
}

function midRoofs(g, w, h) {
  const ground = h - 6, half = w / 2;
  for (let i = 0; i < 8; i++) {
    const x = 10 + i * 66, hw = 58, rise = 22 + (i % 3) * 8;
    poly(g, [x, ground - 20, x + hw * 0.5, ground - 20 - rise, x + hw, ground - 20], i % 2 ? '#a84332' : '#6e7278');
    rect(g, x + hw * 0.4, ground - 70 - (i % 4) * 10, 10, 40, '#5c4636');
  }
  rect(g, 40, ground - 28, w * 0.42, 10, '#8d9390');
  rect(g, half, ground - 120, 28, 120, '#d9d3c8');
  rect(g, half + 8, ground - 150, 12, 36, '#2f6b3a');
  for (let i = 0; i < 4; i++) rect(g, half + 50 + i * 70, ground - 36, 56, 30, '#1d4a32');
  g.fillStyle = '#d5dbe4';
  g.beginPath(); g.ellipse(half + 280, ground - 28, 34, 12, 0, 0, 6.3); g.fill();
  g.fillStyle = '#9bb7d4';
  g.beginPath(); g.ellipse(half + 280, ground - 40, 16, 8, 0, 0, 6.3); g.fill();
  poly(g, [half + 360, ground, half + 400, ground - 160, half + 430, ground], '#e7eef6');
  poly(g, [half + 430, ground, half + 470, ground - 190, half + 510, ground], '#f4f7fb');
  rect(g, half + 200, ground - 90, 8, 70, '#2a241c');
  g.fillStyle = '#3a342c';
  g.beginPath(); g.arc(half + 204, ground - 96, 8, 0, 6.3); g.fill();
}

function cobbles(g, w, h, stone, gap, tint) {
  g.fillStyle = gap;
  g.fillRect(0, 0, w, h);
  const cw = 181;
  for (let y = 0; y < h; y += 28) {
    const shift = (y / 28) % 2 ? 16 : 0;
    for (let x = -cw; x < w + cw; x += 36) {
      rect(g, x + shift, y + 3, 30, 20, stone);
      rect(g, x + shift + 4, y + 6, 10, 4, tint);
    }
  }
}

function floorCobble(g, w, h) { cobbles(g, w, h, '#b7aa96', '#8d8070', 'rgba(255,236,200,0.35)'); }
function floorWood(g, w, h) {
  g.fillStyle = '#6e553f';
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 181) {
    rect(g, x, 0, 2, h, '#4a3828');
    rect(g, x + 90, 40, 70, 8, '#8a6a48');
    rect(g, x + 20, h * 0.55, w > 0 ? 50 : 0, 6, '#5a4030');
  }
  rect(g, 0, 0, w, 18, '#a34b38');
}
function floorGarden(g, w, h) {
  g.fillStyle = '#1c3a2c';
  g.fillRect(0, 0, w, h);
  rect(g, 0, h * 0.28, w, h * 0.44, '#d5d8dc');
  for (let x = 0; x < w; x += 181) rect(g, x + 70, h * 0.36, 8, h * 0.28, '#c5c9ce');
  rect(g, 0, h * 0.72, w, 10, '#3d6a4e');
}

const DRAW = {
  far3_day: skyDay,
  far3_night: skyNight,
  mid3a: midMarket,
  mid3b: midRoofs,
  floor3a: floorCobble,
  floor3b: floorWood,
  floor3c: floorGarden,
};

function upload(scene, tex, canvas) {
  const source = tex.source?.[0];
  if (!source) return false;
  source.image = canvas;
  source.width = canvas.width;
  source.height = canvas.height;
  source.isCanvas = true;
  const renderer = scene.sys?.renderer || scene.game?.renderer;
  if (renderer?.createCanvasTexture) source.glTexture = renderer.createCanvasTexture(canvas, false, !!source.flipY);
  else if (typeof source.update === 'function') source.update();
  return true;
}

/** Replace half-res labelled plates in place. Returns true when the market plate was painted. */
export function ensureStage3Plates(scene) {
  if (!scene?.textures || typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
  if (!isPlaceholderPlate(scene, 'mid3a')) return false;
  let painted = false;
  for (const key of PLATE_KEYS) {
    if (!isPlaceholderPlate(scene, key)) continue;
    const src = sourceOf(scene, key);
    const canvas = document.createElement('canvas');
    canvas.width = STAGE3_PLATE_W;
    canvas.height = STAGE3_PLATE_H;
    const g = canvas.getContext('2d');
    if (!g) continue;
    DRAW[key](g, STAGE3_PLATE_W, STAGE3_PLATE_H);
    if (upload(scene, src.tex, canvas)) painted = painted || key === 'mid3a';
  }
  if (painted) scene.stage3Painted = true;
  return painted;
}
export const p3 = ensureStage3Plates;
