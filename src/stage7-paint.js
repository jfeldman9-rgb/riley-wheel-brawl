// Optional painted rows. present:false stays code-drawn.
import { PAINTED7 } from './stage7-painted.js';

export const PAINTED7_ROWS = PAINTED7;
const SCALE7 = Object.freeze({ s7dancer: [2.4, 1], s7veiled: [2.4, 1], s7asmo: [2.8, 1], s7moir: [2.6, 1], s7lan: [2.6, 1] });

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
  const cleanup = () => { for (const key of wanted) optional.delete(key); L.off?.('loaderror', drop); L.off?.('complete', cleanup); };
  L.on('loaderror', drop); L.once?.('complete', cleanup);
  return wanted;
}
export function isPainted(scene, key) {
  const src = scene?.textures?.get?.(key)?.source?.[0];
  return !!src && src.isCanvas === false;
}
export function s7Scale(scene, key, codeScale) {
  const r = SCALE7[key];
  return r && isPainted(scene, key) ? codeScale * r[1] / r[0] : codeScale;
}
