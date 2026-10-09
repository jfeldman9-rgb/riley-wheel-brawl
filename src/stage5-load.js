// Stage 5 preload, including the shared painted grab/escape poses from Stage 3.
import { queueCharPages } from './assets.js';
import { queuePowerArt } from './powers.js';
import { queuePainted } from './stage5-art.js';

function queueRiley(scene) {
  const L = scene.load;
  if (scene.cache.json.get('riley3.A')) { queueCharPages(scene, ['riley3']); return; }
  L.json('riley3.A', 'assets/stage3/chars/riley3.anims.json');
  const event = 'filecomplete-json-riley3.A';
  const ready = () => queueCharPages(scene, ['riley3']);
  const cleanup = () => {
    L.off?.(event, ready); L.off?.('complete', cleanup);
    scene.events?.off?.('shutdown', cleanup);
  };
  L.once?.(event, ready); L.once?.('complete', cleanup);
  scene.events?.once?.('shutdown', cleanup);
}

export function queueStage5(scene) {
  const L = scene.load, has = k => scene.textures.exists(k);
  if (!has('crate')) L.image('crate', ['assets/props/prop-crate.webp', 'assets/props/prop-crate_n.webp']);
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  if (!scene.cache.json.get('layout5')) L.json('layout5', 'assets/bg5/layout.json');
  queueRiley(scene);
  queuePainted(scene);
  queuePowerArt(scene, { twix: false });
}
