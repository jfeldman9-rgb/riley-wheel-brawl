// The shipped bg3 plates are the labelled half-res cards (1086x362). Full-res
// painted files are 2172 wide and are left untouched. Until those files land,
// draw the Caemlyn roofs into the same keys so a Stage 2 clear does not open
// on the placeholder cards. Queued URLs stay the repo-relative paths.
export const PLACEHOLDER_PLATE_W = 1086;
export const PLACEHOLDER_PLATE_H = 362;

export const STAGE3_PLATE_KEYS = Object.freeze([
  'far3_day', 'far3_night', 'mid3a', 'mid3b', 'floor3a', 'floor3b', 'floor3c',
]);

export function isPlaceholderPlate(image) {
  return !!image && image.width === PLACEHOLDER_PLATE_W && image.height === PLACEHOLDER_PLATE_H;
}

function defaultCanvas(w, h) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  canvas.width = w; canvas.height = h;
  return canvas.getContext('2d') ? canvas : null;
}

/** Replace placeholder-sized plates only. Returns how many keys were painted. */
export function paintStage3Art(scene, createCanvas = defaultCanvas) {
  const textures = scene?.textures;
  if (!textures || typeof textures.get !== 'function' || typeof createCanvas !== 'function') return 0;
  let painted = 0;
  for (const key of STAGE3_PLATE_KEYS) {
    try {
      if (textures.exists && !textures.exists(key)) continue;
      const image = textures.get(key)?.getSourceImage?.();
      if (!isPlaceholderPlate(image)) continue;
      const canvas = createCanvas(PLACEHOLDER_PLATE_W, PLACEHOLDER_PLATE_H);
      const g = canvas?.getContext?.('2d');
      if (!g) continue;
      drawPlate(g, key, PLACEHOLDER_PLATE_W, PLACEHOLDER_PLATE_H);
      if (typeof textures.remove === 'function') textures.remove(key);
      if (typeof textures.addCanvas === 'function') textures.addCanvas(key, canvas);
      else swapSource(textures.get(key), canvas);
      painted++;
    } catch { /* a failed plate keeps the texture the loader already fetched */ }
  }
  return painted;
}

function swapSource(texture, canvas) {
  const source = texture?.source && texture.source[0];
  if (!source) return;
  source.image = canvas;
  source.width = canvas.width;
  source.height = canvas.height;
  source.update?.();
  texture.refresh?.();
}

export function drawPlate(g, key, w, h) {
  if (key === 'floor3a') return cobbles(g, w, h, ['#4e463c', '#6d6254', '#7c6e5c', '#5a5146']);
  if (key === 'floor3b') return cobbles(g, w, h, ['#3e3a34', '#5c564c', '#6a6256', '#4a453e']);
  if (key === 'floor3c') return cobbles(g, w, h, ['#2c2e36', '#454a56', '#3a3e48', '#333640']);
  if (key === 'far3_night') return farSky(g, w, h, true);
  if (key === 'far3_day') return farSky(g, w, h, false);
  street(g, w, h, key === 'mid3b');
}

function vertical(g, w, h, stops) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  for (const [t, color] of stops) grad.addColorStop(t, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

function farSky(g, w, h, night) {
  vertical(g, w, h, night
    ? [[0, '#070b16'], [0.45, '#141c32'], [0.78, '#1b2438'], [1, '#121820']]
    : [[0, '#f0c48a'], [0.28, '#e07a4a'], [0.62, '#6a4a78'], [1, '#243048']]);
  g.fillStyle = night ? 'rgba(230,236,255,0.8)' : 'rgba(255,244,220,0.35)';
  for (let i = 0; i < (night ? 80 : 24); i++) {
    const x = (i * 97 + 13) % w;
    const y = (i * 53 + 7) % (h * 0.55);
    g.globalAlpha = i % 3 === 0 ? 0.9 : 0.4;
    g.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
  g.globalAlpha = 1;
  if (night) {
    const mx = w * 0.78, my = h * 0.22, r = 18;
    g.fillStyle = 'rgba(255,244,220,0.18)';
    g.beginPath(); g.arc(mx, my, 46, 0, 6.3); g.fill();
    g.fillStyle = '#f4ecd4';
    g.beginPath(); g.arc(mx, my, r, 0, 6.3); g.fill();
  }
  const base = h * 0.72;
  for (let i = 0; i < 28; i++) {
    const x = (i * 79) % (w + 40) - 20;
    const bw = 28 + (i % 5) * 10;
    const bh = 28 + (i % 7) * 12;
    g.fillStyle = night ? '#141820' : '#2a242c';
    g.fillRect(x, base - bh, bw, bh + 4);
    if (i % 2 === 0) {
      g.beginPath();
      g.moveTo(x - 4, base - bh);
      g.lineTo(x + bw / 2, base - bh - 16);
      g.lineTo(x + bw + 4, base - bh);
      g.fill();
    }
  }
}

function cobbles(g, w, h, colors) {
  const [grout, a, b, c] = colors;
  g.fillStyle = grout;
  g.fillRect(0, 0, w, h);
  // 181 divides 1086 and 362, so the repeat meets at both edges.
  const cell = 181;
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const alt = ((x / cell) + (y / cell)) % 2;
      stone(g, x + 3, y + 3, cell - 8, 84, alt ? a : b);
      stone(g, x + cell / 2, y + 92, cell / 2 - 8, 80, alt ? c : a);
      stone(g, x + 3, y + 92, cell / 2 - 10, 80, alt ? b : c);
    }
  }
}

function stone(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(x, y, w, 2);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x, y + h - 2, w, 2);
}

function street(g, w, h, yard) {
  vertical(g, w, h, yard
    ? [[0, '#1a2040'], [0.22, '#c46a4a'], [0.46, '#8a4038'], [1, '#1a1816']]
    : [[0, '#f2c99a'], [0.2, '#e4844e'], [0.42, '#6e4a62'], [1, '#241c18']]);
  // distant ridge of roofs behind the near street
  g.fillStyle = yard ? '#2a2428' : '#3a2c32';
  g.beginPath();
  g.moveTo(0, h * 0.46);
  for (let x = 0; x <= w; x += 36) {
    const peak = h * 0.34 + ((x / 36) % 3) * 8;
    g.lineTo(x, x % 72 === 0 ? peak : h * 0.46);
  }
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  const ground = h - 28;
  if (!yard) {
    shop(g, 18, ground, 150, 168, '#6b3a28', '#8c3038');
    shop(g, 156, ground, 120, 132, '#5c4634', '#1f4d3c');
    stall(g, 286, ground, 130);
    shop(g, 410, ground, 150, 150, '#70402c', '#8a5a28');
    inn(g, 575, ground, 470);
  } else {
    inn(g, 30, ground, 420);
    yardWall(g, 450, ground);
    shop(g, 690, ground, 160, 140, '#5a4030', '#7a3030');
    shop(g, 850, ground, 200, 168, '#4e382c', '#2a3a4a');
  }
  // street shadow where the plate meets the floor tiles
  const shade = g.createLinearGradient(0, h - 70, 0, h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = shade;
  g.fillRect(0, h - 70, w, 70);
}

function roof(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x - 8, y);
  g.lineTo(x + w * 0.5, y - h);
  g.lineTo(x + w + 8, y);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath();
  g.moveTo(x + w * 0.5, y - h);
  g.lineTo(x + w + 8, y);
  g.lineTo(x + w * 0.5, y);
  g.closePath();
  g.fill();
}

function windowLit(g, x, y, w, h) {
  g.fillStyle = '#2a1c12';
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = '#ffd27a';
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(90,50,20,0.45)';
  g.fillRect(x + w / 2 - 1, y, 2, h);
  g.fillRect(x, y + h / 2 - 1, w, 2);
}

function shop(g, x, base, w, bh, wall, awning) {
  g.fillStyle = wall;
  g.fillRect(x, base - bh, w, bh);
  roof(g, x, base - bh + 8, w, 36, '#6e2c28');
  g.fillStyle = awning;
  g.fillRect(x + 8, base - bh * 0.62, w - 16, 16);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 4; i++) g.fillRect(x + 14 + i * ((w - 20) / 4), base - bh * 0.62 + 16, 3, 10);
  windowLit(g, x + 16, base - bh * 0.48, 22, 28);
  windowLit(g, x + w - 42, base - bh * 0.48, 22, 28);
  g.fillStyle = '#3a2418';
  g.fillRect(x + w * 0.38, base - 48, 26, 48);
  g.fillStyle = '#c8b090';
  g.fillRect(x + 8, base - bh - 22, 8, 26);
}

function stall(g, x, base, w) {
  g.fillStyle = '#c4a060';
  g.beginPath();
  g.moveTo(x, base - 20);
  g.lineTo(x + 16, base - 78);
  g.lineTo(x + w - 16, base - 78);
  g.lineTo(x + w, base - 20);
  g.closePath();
  g.fill();
  g.fillStyle = '#8c3030';
  g.fillRect(x + 10, base - 92, w - 20, 16);
  g.fillStyle = '#6a4a30';
  g.fillRect(x + 8, base - 36, 6, 36);
  g.fillRect(x + w - 14, base - 36, 6, 36);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? '#d4543a' : '#e6c36a';
    g.beginPath(); g.arc(x + 28 + i * 24, base - 48, 8, 0, 6.3); g.fill();
  }
}

function inn(g, x, base, w) {
  g.fillStyle = '#d8d0c4';
  g.fillRect(x, base - 150, w, 150);
  g.fillStyle = '#6a2e28';
  g.fillRect(x - 6, base - 158, w + 12, 14);
  roof(g, x + 18, base - 150, w * 0.42, 48, '#5c2420');
  roof(g, x + w * 0.48, base - 150, w * 0.42, 40, '#3e4654');
  // hanging sign, no placeholder lettering
  g.fillStyle = '#3a2414';
  g.fillRect(x + w * 0.46, base - 188, 6, 40);
  g.fillStyle = '#e6c36a';
  g.fillRect(x + w * 0.34, base - 186, w * 0.28, 28);
  g.fillStyle = '#6a2e28';
  g.fillRect(x + w * 0.37, base - 180, w * 0.22, 6);
  g.fillRect(x + w * 0.4, base - 170, w * 0.16, 4);
  g.fillStyle = '#5a4636';
  g.fillRect(x + w * 0.42, base - 70, 36, 70);
  windowLit(g, x + 24, base - 110, 28, 36);
  windowLit(g, x + 70, base - 110, 28, 36);
  windowLit(g, x + w - 90, base - 110, 28, 36);
  windowLit(g, x + w - 46, base - 110, 22, 36);
  g.fillStyle = '#c8b090';
  g.fillRect(x + w * 0.22, base - 196, 10, 40);
  g.fillRect(x + w * 0.72, base - 188, 8, 32);
  // warm doorway light
  const glow = g.createRadialGradient(x + w * 0.45, base - 30, 4, x + w * 0.45, base - 20, 70);
  glow.addColorStop(0, 'rgba(255,200,110,0.55)');
  glow.addColorStop(1, 'rgba(255,200,110,0)');
  g.fillStyle = glow;
  g.fillRect(x + w * 0.3, base - 90, w * 0.3, 90);
}

function yardWall(g, x, base) {
  g.fillStyle = '#6e685c';
  g.fillRect(x, base - 70, 220, 70);
  g.fillStyle = '#4a463e';
  for (let i = 0; i < 8; i++) g.fillRect(x + 8 + i * 26, base - 64, 20, 10);
  g.fillStyle = '#2a241c';
  g.fillRect(x + 78, base - 48, 40, 48);
  g.fillStyle = '#8a9a48';
  g.beginPath(); g.arc(x + 40, base - 78, 16, 0, 6.3); g.fill();
  g.beginPath(); g.arc(x + 170, base - 84, 22, 0, 6.3); g.fill();
  g.fillStyle = '#3a342c';
  g.fillRect(x + 150, base - 120, 8, 50);
}
