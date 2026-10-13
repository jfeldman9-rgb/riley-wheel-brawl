// Painted Blight art. Rows are written by tools/stage5/process_art.py. A missing file stays code-drawn.
import { PAINTED5, SCALE5 } from './stage5-painted.js';

export { PAINTED5, SCALE5 };

const SHEET5 = [
  ['s5tree', 's5deco', 's5stalk', 's5pod', 's5thorn', 's5spore', 's5cloud'],
  ['s5tree', 's5deco', 's5stalk', 's5pod', 's5thorn', 's5spore', 's5cloud'],
  ['s5deco', 's5stalk', 's5pod', 's5thorn', 's5seep', 's5spore', 's5cloud'],
  ['s5garden', 's5green', 's5tether', 's5hand', 's5ring'],
];
const BOOT_PLATES = ['bg5far', 'bg5mid', 'bg5mid2', 'bg5floor'];

function failedKey(file) { return file?.multiFile?.key || file?.key; }

export function sheetKeys(zoneI) {
  let z = zoneI;
  if (typeof z !== 'number' || z < 0) z = 0;
  const keys = new Set(SHEET5[z] || []);
  for (const k of SHEET5[z + 1] || []) keys.add(k);
  return keys;
}

export function bootPaintRows() {
  const keep = sheetKeys(0);
  for (const k of BOOT_PLATES) keep.add(k);
  return PAINTED5.filter(r => keep.has(r.key));
}

export function queueStage5Painted(scene, rows = bootPaintRows()) {
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
  const drop = file => {
    const key = failedKey(file);
    scene._s5miss = scene._s5miss || new Set();
    if (key) scene._s5miss.add(key);
    if (wanted.has(key) && scene.textures?.exists?.(key)) scene.textures.remove(key);
  };
  const cleanup = () => {
    for (const key of wanted) optional.delete(key);
    L.off?.('loaderror', drop); L.off?.('complete', cleanup); scene.events?.off?.('shutdown', cleanup);
  };
  L.on('loaderror', drop); L.once?.('complete', cleanup); scene.events?.once?.('shutdown', cleanup);
  return wanted;
}

export function queuePlate(scene, key, done) {
  const row = PAINTED5.find(r => r.key === key);
  if (!row?.present || !row.url || scene.textures?.exists?.(key)) return false;
  const wanted = queueStage5Painted(scene, [row]);
  if (!wanted?.size) return false;
  const L = scene.load;
  let settled = false;
  const fin = () => {
    if (settled) return;
    settled = true;
    L.off?.('complete', fin);
    scene.events?.off?.('shutdown', detach);
    done?.(!!scene.textures?.exists?.(key));
  };
  // Shutdown is not a failed load. The loader has already reset, so calling
  // done(false) paints a canvas stand-in under the real key and a restart
  // then keeps that stand-in forever.
  const detach = () => {
    if (settled) return;
    settled = true;
    L.off?.('complete', fin);
    scene.events?.off?.('shutdown', detach);
  };
  L.once?.('complete', fin);
  scene.events?.once?.('shutdown', detach);
  if (typeof L.isLoading !== 'function' || !L.isLoading()) L.start?.();
  return true;
}

export function isPainted(scene, key) {
  const T = scene?.textures;
  if (!T?.exists?.(key)) return false;
  const src = T.get?.(key)?.source?.[0];
  return !!src && src.isCanvas === false;
}

export function s5Scale(scene, key, codeScale) {
  const r = SCALE5[key];
  return r && isPainted(scene, key) ? codeScale * r[1] / r[0] : codeScale;
}

// A stalker or pod can still be on screen when its zone's sheet drops out of the set.
// Removing the texture then turns that sprite into Phaser's green missing tile.
function sheetInUse(scene, key) {
  const lists = [scene.children?.list, scene.sys?.displayList?.list];
  for (const list of lists) {
    if (!list) continue;
    for (const o of list) if (o?.scene && o.texture?.key === key) return true;
  }
  return false;
}
const KEEP_IF_SHOWN = new Set(['s5stalk', 's5pod', 's5green']);

// Drop sheets the camera has left, and queue the ones for this zone and the next.
export function syncSheets(scene) {
  if (!scene?.textures?.exists) return;
  const keep = sheetKeys(scene.zoneI);
  for (const row of PAINTED5) {
    if (!row.key || row.key.startsWith('bg5') || row.key.startsWith('story')) continue;
    if (keep.has(row.key) || !scene.textures.exists(row.key) || !scene.textures.remove) continue;
    if (KEEP_IF_SHOWN.has(row.key) && sheetInUse(scene, row.key)) continue;
    scene.textures.remove(row.key);
  }
  const rows = PAINTED5.filter(r => keep.has(r.key));
  const wanted = queueStage5Painted(scene, rows);
  if (wanted?.size && (typeof scene.load.isLoading !== 'function' || !scene.load.isLoading())) scene.load.start?.();
}
