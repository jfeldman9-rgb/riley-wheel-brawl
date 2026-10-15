import { normalizeCrate } from './crate-texture.js';
// Stage 5 preload. Boss sheets, Loial and the grab atlas wait until they are needed.
import { queuePowerArt } from './powers.js';
import { bootPaintRows, queueStage5Painted } from './stage5-paint.js';

export function queueStage5(scene) {
  normalizeCrate(scene, false);
  const L = scene.load, has = k => scene.textures.exists(k);
  if (!has('crate')) L.image('crate', 'assets/props/prop-crate.webp');
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  if (!scene.cache.json.get('layout5')) L.json('layout5', 'assets/bg5/layout.json');
  if (!scene.cache.json.get('lights5')) L.json('lights5', 'assets/bg5/lights.json');
  queueStage5Painted(scene, bootPaintRows());
  queuePowerArt(scene, { twix: false });
}
