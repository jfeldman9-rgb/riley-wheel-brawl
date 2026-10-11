// Stage 5 preload. Boss sheets, Loial and the grab atlas wait until they are needed.
import { queuePowerArt } from './powers.js';

export function queueStage5(scene) {
  const L = scene.load, has = k => scene.textures.exists(k);
  if (!has('crate')) L.image('crate', 'assets/props/prop-crate.webp');
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  if (!scene.cache.json.get('layout5')) L.json('layout5', 'assets/bg5/layout.json');
  queuePowerArt(scene, { twix: false });
}
