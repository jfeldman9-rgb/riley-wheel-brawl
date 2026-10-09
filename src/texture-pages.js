// Compact lighting pages shared by Stages 5 and 6. Same UVs, colour atlases and frames.
// Any other stage reloads the original normals, so leaving 5 or 6 drops the small pages.
const COMPACT_STAGES = new Set([5, 6]);
export const COMPACT_NORMAL_DIR = 'assets/stage5/normals';

export function usesCompactNormals(stageNo) {
  return COMPACT_STAGES.has(stageNo);
}

export function normalPageDir(scene, page, dir, meta) {
  const compact = usesCompactNormals(scene.loadedStage);
  const texture = scene.textures.get?.(page);
  const url = texture?.dataSource?.[0]?.image?.src;
  // Shared pages survive a switch. Replace a page when its normal variant differs
  // so a peak cannot retain both resolutions, and so leaving 5 or 6 restores the originals.
  if (url && url.includes('/stage5/normals/') !== compact) {
    for (const a of meta.anims || []) if (scene.anims?.exists?.(a.name)) scene.anims.remove(a.name);
    for (const key of [page, page + '_nl']) if (scene.textures.exists(key)) scene.textures.remove(key);
  }
  return compact ? COMPACT_NORMAL_DIR : dir;
}
