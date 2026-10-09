// Compact Stage 5 lighting data uses the same UVs, colour atlases and animation frames.
// Both facing directions stay lit; other stages continue to load their original normals.
export function normalPageDir(scene, page, dir, meta) {
  const compact = scene.loadedStage === 5;
  const texture = scene.textures.get?.(page);
  const url = texture?.dataSource?.[0]?.image?.src;
  // Shared Riley/Loial/hound pages survive a switch. Replace a page when its normal
  // variant differs so a Stage 4 -> 5 peak cannot retain both resolutions.
  if (url && url.includes('/stage5/normals/') !== compact) {
    for (const a of meta.anims || []) if (scene.anims?.exists?.(a.name)) scene.anims.remove(a.name);
    for (const key of [page, page + '_nl']) if (scene.textures.exists(key)) scene.textures.remove(key);
  }
  return compact ? 'assets/stage5/normals' : dir;
}
