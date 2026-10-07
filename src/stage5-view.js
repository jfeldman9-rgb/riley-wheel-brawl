// Blight backdrop. Procedural art, one sun, and the Eye / oak lights.
import { VW, VH, LANE_TOP, WORLD_W } from './config.js';
import { paintStage5Art } from './stage5-art.js';
import { LAYOUT5 } from './stage5-def.js';

export function sunAmbient(camX, keys = LAYOUT5.sunKeys) {
  let a = keys[0];
  for (const k of keys) if (camX >= k.x) a = k;
  return a.ambient;
}
function img(scene, x, y, key) {
  const s = scene.add?.image ? scene.add.image(x, y, key) : null;
  s?.setOrigin?.(0, 0);
  return s;
}
export function createStage5View(scene) {
  let haze = [];
  const view = {
    sun: null, eye: null, oakLight: null, flare: null, quality: 5,
    buildBackdrop() {
      paintStage5Art(scene);
      const far = img(scene, 0, 0, 'bg5far');
      far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 20);
      scene.backdropLit = scene.backdropLit || [];
      const mids = scene.fx?.quality >= 2 ? ['bg5mid'] : ['bg5mid', 'bg5mid2'];
      for (let i = 0, x = -40; x < WORLD_W; x += 640, i++) {
        const mid = scene.add?.image?.(x, LANE_TOP + 8, mids[i % mids.length]);
        mid?.setOrigin?.(0, 1); mid?.setScrollFactor?.(0.35); mid?.setDepth?.(-50); mid?.setLighting?.(true);
        if (mid) scene.backdropLit.push(mid);
      }
      const floors = ['bg5floor', 'bg5floor2', 'bg5floor3'];
      floors.forEach((key, i) => {
        const tile = scene.add?.tileSprite?.(i * 1800, LANE_TOP - 20, 1900, VH - LANE_TOP + 40, key);
        tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40); tile?.setLighting?.(true);
        if (tile) scene.backdropLit.push(tile);
      });
      view.sun = scene.lights?.addLight?.(VW * 0.8, 70, 1400, 0xffb070, 1.3, 200) || null;
      const n = scene.fx?.quality >= 2 ? 8 : 16;
      haze = [];
      for (let i = 0; i < n; i++) {
        const p = scene.add?.image?.(i * 340, 180 + (i % 3) * 30, 's5flare');
        p?.setAlpha?.(0.15); p?.setScrollFactor?.(0.2); p?.setDepth?.(-60);
        if (p) haze.push(p);
      }
    },
    sync(kit) {
      const q = kit?.s?.fx?.quality ?? 5;
      view.quality = q;
      const show = q < 2 ? haze.length : Math.ceil(haze.length / 2);
      haze.forEach((p, i) => p.setVisible?.(i < show));
      const arena = kit?.arena, on = kit?.s?.lightsOn !== false, boss = kit?.s?.zoneI === 3 && on;
      const hot = arena?.surge?.phase === 'hot';
      const oak = !!(arena?.oak?.light && arena.oak.open);
      // One feature light. Flare, then oak, then the Eye. The beat swaps the Eye for the oak.
      const mode = hot ? 'flare' : oak ? 'oak' : boss ? 'eye' : null;
      if (mode && !view.eye && scene.lights?.addLight) view.eye = scene.lights.addLight(4560, 600, 420, 0xffe090, 0, 80);
      if (view.eye) {
        view.eye.intensity = mode ? (mode === 'flare' ? 1.6 : mode === 'oak' ? 1.2 : 1.4) : 0;
        view.eye.color = mode === 'oak' ? 0xc8f080 : mode === 'flare' ? 0xfff0c0 : 0xffe090;
        if (arena?.oak && mode === 'oak') { view.eye.x = arena.oak.x; view.eye.y = arena.oak.y; }
      }
      view.oakLight = mode === 'oak' ? view.eye : null;
      view.flare = mode === 'flare' ? view.eye : null;
    },
    moveSun(camX) { if (view.sun) view.sun.x = camX + VW * 0.8; },
    ensureBossLights() {},
    glimpse() {
      const g = scene.add?.image?.(3600, LANE_TOP - 30, scene.textures?.exists?.('fade_far') ? 'fade_far' : 's5flare');
      g?.setDepth?.(40); g?.setAlpha?.(0.85);
      scene.time?.delayedCall?.(2400, () => g?.destroy?.());
    },
    destroy() { view.sun = view.eye = view.oakLight = view.flare = null; haze = []; },
  };
  return view;
}
