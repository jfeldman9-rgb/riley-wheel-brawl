// Painted Stone of Tear art (docs/stage6/ART.md). Rows come from src/stage6-painted.js, written by
// tools/stage6/process_art.py: present rows are queued, failed or absent ones stay code-drawn (src/stage6-art.js
// fills any key that is still missing when the backdrop is built).
import { PAINTED6 } from './stage6-painted.js';

// The shared painted crate (no normal map: 0.9 MiB instead of 1.8). Stages 2-5 load the same key.
export const CRATE6 = Object.freeze({ key: 'crate', url: 'assets/props/prop-crate.webp', present: true });
export const PAINTED6_ROWS = Object.freeze([...PAINTED6, CRATE6]);

// [code scale the actor used for the code-drawn cell, scale for the painted sheet]. Painted characters are painted
// at 1 px per screen px (atlas meta.drawScale 1). Other uses of the same key keep their ratio to the main use
// (the gallery glimpse 1.2 / 3.4, the call sprite 1.4 / 3.4). Callandor's sword is about 200 px tall on screen.
export const SCALE6 = Object.freeze({
  s6belal: [3.1, 1], s6gray: [3.4, 1], s6fade: [3.2, 1], s6rand: [3.4, 1], s6def: [3.2, 1],
  s6call: [3.4, 0.68], s6hatch: [1, 1],
});

// Same contract as Stage 5's queuePainted: optional keys, and a failed file drops its key so the painter fills it.
function failedKey(file) { return file?.multiFile?.key || file?.key; }
export function queueStage6Painted(scene, rows = PAINTED6_ROWS) {
  const L = scene.load, wanted = new Set();
  for (const row of rows) {
    if (!row?.present || !row.key || !row.url || scene.textures.exists(row.key)) continue;
    wanted.add(row.key);
    if (row.atlas) L.atlas(row.key, row.url, row.atlas);
    else if (row.frameWidth) L.spritesheet(row.key, row.url, { frameWidth: row.frameWidth, frameHeight: row.frameHeight });
    else L.image(row.key, row.url);
  }
  if (!wanted.size || typeof L.on !== 'function') return wanted;
  const optional = L.optionalAssetKeys instanceof Set ? L.optionalAssetKeys : (L.optionalAssetKeys = new Set());
  for (const key of wanted) optional.add(key);
  const drop = file => { const key = failedKey(file); if (wanted.has(key) && scene.textures?.exists?.(key)) scene.textures.remove(key); };
  const cleanup = () => {
    for (const key of wanted) optional.delete(key);
    L.off?.('loaderror', drop); L.off?.('complete', cleanup); scene.events?.off?.('shutdown', cleanup);
  };
  L.on('loaderror', drop); L.once?.('complete', cleanup); scene.events?.once?.('shutdown', cleanup);
  return wanted;
}

/** True when key is a loaded painted file, not a code canvas. */
export function isPainted(scene, key) {
  const T = scene?.textures;
  if (!T?.exists?.(key)) return false;
  const src = T.get?.(key)?.source?.[0];
  return !!src && src.isCanvas === false;
}

export function s6Scale(scene, key, codeScale) {
  const r = SCALE6[key];
  return r && isPainted(scene, key) ? codeScale * r[1] / r[0] : codeScale;
}
