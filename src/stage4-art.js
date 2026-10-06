// Boot-time canvas textures for Shadar Logoth. Same keys the stage already uses.
import { paintBackdrop } from './stage4-art-bg.js';
import { paintFog } from './stage4-art-fog.js';
import { paintCast } from './stage4-art-cast.js';
export { dragFrame, cultFrame } from './stage4-art-cast.js';

export function canPaint(scene) {
  return !!(scene?.textures && typeof document !== 'undefined' && document.createElement);
}

export function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  scene.textures.addCanvas?.(key, c);
}

export function sheet(scene, key, n, fw, fh, draw) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas');
  c.width = fw * n; c.height = fh;
  const g = c.getContext('2d');
  for (let i = 0; i < n; i++) {
    g.save();
    g.translate(i * fw, 0);
    g.beginPath(); g.rect(0, 0, fw, fh); g.clip();
    draw(g, i, fw, fh);
    g.restore();
  }
  const image = scene.textures.addCanvas?.(key, c);
  if (image?.add) for (let i = 0; i < n; i++) image.add(i, 0, i * fw, 0, fw, fh);
}

export function paintStage4Art(scene) {
  if (!canPaint(scene)) return;
  paintBackdrop(scene);
  paintFog(scene);
  paintCast(scene);
}
