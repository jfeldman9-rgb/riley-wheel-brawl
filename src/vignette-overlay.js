// Static stand-in for Phaser's FilterVignette. The filter forces a full-screen
// camera render target (14 MiB at render scale 2). This image is one 256×144
// texture, scroll-locked, and uses the same mix the shader does:
//   vignette = sin((distance / radius) * 3.14 * strength), mix(scene, black, vignette).
// The HUD is a later scene, so it stays above this the way it stayed above the filter.
import { VW, VH } from './config.js';

export const VIGNETTE_KEY = 'rwbVignette';
export const VIGNETTE_W = 256, VIGNETTE_H = 144;
export const VIGNETTE_RADIUS = 0.95, VIGNETTE_STRENGTH = 0.35;
const SHADER_PI = 3.14;

export function vignetteMix(u, v, radius = VIGNETTE_RADIUS, strength = VIGNETTE_STRENGTH, x = 0.5, y = 0.5) {
  const d = Math.hypot(u - x, v - (1 - y));
  if (d > radius) return 1;
  return Math.sin((d / radius) * SHADER_PI * strength);
}

const distances = new Map();
function distanceTable(w, h) {
  const key = w + 'x' + h;
  let table = distances.get(key);
  if (table) return table;
  table = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    for (let x = 0; x < w; x++) table[y * w + x] = Math.hypot((x + 0.5) / w - 0.5, v - 0.5);
  }
  distances.set(key, table);
  return table;
}

export function paintVignette(ctx, w, h, strength = VIGNETTE_STRENGTH, radius = VIGNETTE_RADIUS) {
  const table = distanceTable(w, h);
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const k = SHADER_PI * strength;
  for (let i = 0; i < table.length; i++) {
    const d = table[i];
    const mix = d > radius ? 1 : Math.sin((d / radius) * k);
    data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(mix * 255)));
  }
  ctx.putImageData(img, 0, 0);
}

/** Scene image with a `.strength` setter so the Myrddraal pulse still darkens the edges. */
export function mountVignetteOverlay(scene, strength = VIGNETTE_STRENGTH) {
  const overlay = {
    overlay: true,
    _strength: strength,
    image: null,
    get strength() { return this._strength; },
    set strength(v) {
      const n = +v;
      if (!Number.isFinite(n) || n === this._strength) return;
      this._strength = n;
      this.repaint();
    },
    repaint() {
      const tex = scene.textures?.get?.(VIGNETTE_KEY);
      const ctx = tex?.getContext?.() || tex?.context;
      if (!ctx) return;
      paintVignette(ctx, VIGNETTE_W, VIGNETTE_H, this._strength);
      tex.refresh?.();
    },
    destroy() {
      this.image?.destroy?.();
      this.image = null;
      if (scene.textures?.exists?.(VIGNETTE_KEY)) scene.textures.remove?.(VIGNETTE_KEY);
    },
  };
  const T = scene.textures;
  if (T?.createCanvas && !T.exists?.(VIGNETTE_KEY)) {
    const canvas = T.createCanvas(VIGNETTE_KEY, VIGNETTE_W, VIGNETTE_H);
    const ctx = canvas?.getContext?.() || canvas?.context;
    if (ctx) paintVignette(ctx, VIGNETTE_W, VIGNETTE_H, strength);
    canvas?.refresh?.();
  } else overlay.repaint();
  const img = scene.add?.image?.(0, 0, VIGNETTE_KEY);
  img?.setOrigin?.(0, 0);
  img?.setScrollFactor?.(0);
  img?.setDepth?.(8000);
  img?.setDisplaySize?.(VW, VH);
  img?.setLighting?.(false);
  overlay.image = img || null;
  return overlay;
}
