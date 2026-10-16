// Called during preload, after outgoing sprites have shut down. Reloading a
// mismatched variant lets TextureManager destroy every attached normal source.
export function normalizeCrate(scene, lit) {
  const T = scene.textures;
  if (!T?.exists?.('crate')) return;
  const sources = T.get?.('crate')?.dataSource;
  if (sources && !!sources.length !== lit) T.remove('crate');
}
