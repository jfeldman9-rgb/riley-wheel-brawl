// Stone backdrop: rain sheen, window flicker, Defenders, Callandor. Lights stay scarce.
import { VW, VH, LANE_TOP, WORLD_W } from './config.js';
import { paintStage6Art } from './stage6-art.js';
import { bandY } from './stage6-arena.js';

function img(scene, x, y, key) {
  const s = scene.add?.image ? scene.add.image(x, y, key) : null;
  s?.setOrigin?.(0, 0);
  return s;
}

export function createStage6View(scene) {
  const owned = [];
  let far, rain, defs = [], call, rays = [], flicker = 2, bolt = 0;
  const view = {
    light: null, quality: 0,
    buildBackdrop() {
      paintStage6Art(scene);
      far = img(scene, 0, 0, 'bg6far');
      far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 8);
      if (far) owned.push(far);
      scene.backdropLit = scene.backdropLit || [];
      for (let x = -40, i = 0; x < WORLD_W; x += 520, i++) {
        const mid = scene.add?.image?.(x, LANE_TOP + 6, i % 2 ? 'bg6mid2' : 'bg6mid');
        mid?.setOrigin?.(0, 1); mid?.setScrollFactor?.(0.4); mid?.setDepth?.(-50); mid?.setDisplaySize?.(560, 150); mid?.setLighting?.(true);
        if (mid) { scene.backdropLit.push(mid); owned.push(mid); }
      }
      ['bg6floor', 'bg6floor2', 'bg6floor3'].forEach((key, i) => {
        const tile = scene.add?.tileSprite?.(i * 1800, LANE_TOP - 16, 1900, VH - LANE_TOP + 30, key);
        tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40); tile?.setLighting?.(true);
        if (tile) { scene.backdropLit.push(tile); owned.push(tile); }
      });
      rain = scene.add?.tileSprite?.(0, 0, VW, VH, 's6storm');
      rain?.setScrollFactor?.(0); rain?.setDepth?.(4200); rain?.setAlpha?.(0.18); rain?.setBlendMode?.('ADD');
      if (rain) owned.push(rain);
      for (let i = 0; i < 4; i++) {
        const d = scene.add?.sprite?.(1500 + i * 70, 640, 's6def', i % 3);
        d?.setOrigin?.(0.5, 0.96); d?.setScale?.(3.2); d?.setDepth?.(980); d?.setAlpha?.(0.85);
        if (d) { defs.push(d); owned.push(d); }
      }
      call = scene.add?.sprite?.(4560, 620, 's6call', 0);
      call?.setOrigin?.(0.5, 0.96); call?.setScale?.(3.4); call?.setBlendMode?.('ADD'); call?.setDepth?.(1100); call?.setVisible?.(false);
      if (call) owned.push(call);
      if (scene.lights?.addLight) view.light = scene.lights.addLight(400, 520, 280, 0xffc878, 0.6, 40);
    },
    setQuality(n) { view.quality = n | 0; },
    move(camX) { far?.setTint?.(bolt > 0 ? 0xb9c7e8 : 0xffffff); },
    sync(kit) {
      const q = view.quality || kit?.quality || kit?.s?.fx?.quality || 0;
      const zone = kit?.s?.zoneI ?? -1;
      if (rain) {
        const show = q < 2 && zone <= 0;
        rain.setVisible?.(show);
        if (show && rain.tilePositionX !== undefined) rain.tilePositionX = (kit?.s?.camX || 0) * 0.3;
      }
      flicker -= 1 / 60;
      if (flicker <= 0) { flicker = (q >= 2 ? 12 : 6) + Math.random() * 4; bolt = q >= 2 ? 0.08 : 0.16; }
      if (bolt > 0) bolt -= 1 / 60;
      far?.setTint?.(bolt > 0 ? 0xc5d4f5 : 0xffffff);
      const showDef = zone === 1;
      defs.forEach((d, i) => { d.setVisible?.(showDef); if (showDef) d.setFrame?.(Math.floor((kit?.s?.time?.now || 0) / 180 + i) % 3); });
      const boss = zone === 3 && kit?.s?.boss;
      call?.setVisible?.(!!boss); call?.setAlpha?.(0.55 + 0.35 * Math.sin((kit?.s?.time?.now || 0) / 280));
      if (boss && !rays.length && kit?.s?.add?.image) {
        for (let i = 0; i < 3; i++) {
          const r = kit.s.add.image(4300 + i * 180, 80, 's6ray');
          r.setOrigin?.(0.5, 0); r.setBlendMode?.('ADD'); r.setDepth?.(80); r.setDisplaySize?.(48, 520); r.setAlpha?.(0.35);
          rays.push(r); owned.push(r);
        }
      }
      const on = kit?.stone?.rays || [];
      rays.forEach((r, i) => r.setVisible?.(!!boss && !!on.find(x => x.band === i && x.on)));
      if (view.light) {
        view.light.x = boss ? 4560 : 640 + (kit?.s?.camX || 0) * 0.2;
        view.light.intensity = kit?.s?.lightsOn === false ? 0 : boss ? 1.1 : 0.55;
      }
    },
    glimpse() {
      const g = img(thisScene(scene), (scene.camX || 0) + VW * 0.7, 180, 's6rand');
      g?.setScrollFactor?.(0); g?.setDepth?.(3000); g?.setAlpha?.(0.9); g?.setScale?.(1.2);
      if (g) owned.push(g);
      scene.time?.delayedCall?.(1600, () => g?.destroy?.());
    },
    randSprite(x, y) {
      const s = scene.add?.sprite?.(x, y, 's6rand', 1);
      s?.setOrigin?.(0.5, 0.96); s?.setScale?.(1.4); s?.setDepth?.(1400);
      return s;
    },
    destroy() { for (const o of owned) o?.destroy?.(); owned.length = 0; if (view.light) scene.lights?.removeLight?.(view.light); },
  };
  return view;
}
function thisScene(scene) { return scene; }
