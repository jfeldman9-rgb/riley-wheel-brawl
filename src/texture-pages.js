// Compact lighting pages for Stages 4, 5 and 6. Same UVs, colour atlases and frames.
// A page is swapped only when that stage uses the small set AND the page has a
// file under assets/stage5/normals. Stage 4's cutthroat stays on its own normals.
// Any other stage reloads the originals, so leaving 4, 5 or 6 drops the small pages.
const COMPACT_STAGES = new Set([4, 5, 6]);
export const COMPACT_PAGES = new Set(['riley-0', 'riley-1', 'riley3-0', 'grunt-0', 'hound-0', 'spear-0', 'loial-0']);
// Phaser decodes its XHR images through blob URLs, which hide the asset directory.
const variants = new WeakMap();
export const COMPACT_NORMAL_DIR = 'assets/stage5/normals';

// The early campaign's original normals exceed the mobile source budget.
// Flat character lighting avoids those allocations without replacing art files.
export function flatCharacterNormals(scene) {
  return scene.loadedStage >= 1 && scene.loadedStage <= 3 && scene.mobileNormals === true;
}

export function usesCompactNormals(stageNo) {
  return COMPACT_STAGES.has(stageNo);
}

export function pageUsesCompact(stageNo, page) {
  return usesCompactNormals(stageNo) && COMPACT_PAGES.has(page);
}

// Drop every clip that still points at a page being replaced, including clips copied
// from it under another name (Stage 4's riley_grabbed / riley_escape). A stale clip
// would hand a sprite a destroyed frame and stop the renderer.
export function dropAnimsOnTextures(anims, keys) {
  const map = anims?.anims, names = [];
  const entries = map?.entries || {};
  for (const name of Object.keys(entries)) {
    const frames = entries[name]?.frames || [];
    if (frames.some(f => keys.includes(f.textureKey ?? f.frame?.texture?.key))) names.push(name);
  }
  for (const name of names) anims.get(name)?.destroy();
  return names;
}

export function normalPageDir(scene, page, dir, meta) {
  const compact = pageUsesCompact(scene.loadedStage, page);
  const variant = flatCharacterNormals(scene) ? 'flat' : compact;
  let pages = variants.get(scene.textures);
  if (!pages) { pages = new Map(); variants.set(scene.textures, pages); }
  const texture = scene.textures.get?.(page);
  const url = texture?.dataSource?.[0]?.image?.src;
  // Shared pages survive a switch. Replace a page when its normal variant differs
  // so a peak cannot retain both resolutions, and so leaving 4, 5 or 6 restores the originals.
  const previous = pages.has(page) ? pages.get(page) : texture?.dataSource?.length === 0 ? 'flat' : url ? url.includes('/stage5/normals/') : variant;
  if (scene.textures.exists(page) && previous !== variant) {
    for (const a of meta.anims || []) scene.anims?.get?.(a.name)?.destroy();
    if (scene.anims?.remove) dropAnimsOnTextures(scene.anims, [page, page + '_nl']);
    for (const key of [page, page + '_nl']) if (scene.textures.exists(key)) scene.textures.remove(key);
  }
  pages.set(page, variant);
  return compact ? COMPACT_NORMAL_DIR : dir;
}
