// Painted Rhuidean art. Rows come from src/stage7-painted.js, written by
// tools/stage7/process_art.py: present rows are queued, failed or absent ones stay code-drawn.
import { PAINTED7 } from './stage7-painted.js';

export const PAINTED7_ROWS = PAINTED7;

export const SCALE7 = Object.freeze({
  s7dancer: [3.2, 1], s7veiled: [3.2, 1], s7asmo: [3.1, 1], s7moir: [3.2, 1], s7lan: [3.2, 1],
});

function failedKey(file) { return file?.multiFile?.key || file?.key; }
export function queueStage7Painted(scene, rows = PAINTED7_ROWS) {
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

export function queuePlate(scene, key, done) {
  const row = PAINTED7_ROWS.find(r => r.key === key);
  if (!row?.present || !row.url || scene.textures?.exists?.(key)) return false;
  const wanted = queueStage7Painted(scene, [row]);
  if (!wanted?.size) return false;
  const L = scene.load;
  const fin = () => {
    L.off?.('complete', fin);
    scene.events?.off?.('shutdown', fin);
    done?.(!!scene.textures?.exists?.(key));
  };
  L.once?.('complete', fin);
  scene.events?.once?.('shutdown', fin);
  if (typeof L.isLoading !== 'function' || !L.isLoading()) L.start?.();
  return true;
}

export function isPainted(scene, key) {
  const T = scene?.textures;
  if (!T?.exists?.(key)) return false;
  const src = T.get?.(key)?.source?.[0];
  return !!src && src.isCanvas === false;
}

export function s7Scale(scene, key, codeScale) {
  const r = SCALE7[key];
  return r && isPainted(scene, key) ? codeScale * r[1] / r[0] : codeScale;
}
