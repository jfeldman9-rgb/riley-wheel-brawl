// Stone backdrop: rain sheen, window flicker, Defenders, Callandor. Lights stay scarce.
import { VW, VH, LANE_TOP, WORLD_W } from './config.js';
import { paintStage6Art } from './stage6-art.js';
import { createStoneTells } from './stage6-tells.js';
import { isPainted, s6Scale } from './stage6-paint.js';
import { STAGE6 } from './stage6-def.js';

export const PLATES6 = Object.freeze(['bg6mid', 'bg6mid2', 'bg6mid3', 'bg6mid4']);
// Painted zone plate i: world-locked behind its zone, 48 px past each inner edge so the 96 px feathers cross-blend,
// and 128 px past the world ends so the outer feathers stay off screen.
export function plateRect(i, zones = STAGE6.zones) {
  const l = zones[i].l, last = i + 1 >= zones.length, r = last ? WORLD_W : zones[i + 1].l;
  const x = i ? l - 48 : -128;
  return { x, w: r + (last ? 128 : 48) - x };
}

function img(scene, x, y, key) {
  const s = scene.add?.image ? scene.add.image(x, y, key) : null;
  s?.setOrigin?.(0, 0);
  return s;
}

export function createStage6View(scene) {
  const owned = [], tells = createStoneTells(scene), timers = [];
  let far, rain, defs = [], call, rays = [], flicker = 2, bolt = 0;
  const view = {
    light: null, quality: 0,
    buildBackdrop() {
      paintStage6Art(scene);
      far = img(scene, 0, 0, 'bg6far');
      far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 8);
      if (far) owned.push(far);
      scene.backdropLit = scene.backdropLit || [];
      const lit = o => { if (o) { o.setLighting?.(true); scene.backdropLit.push(o); owned.push(o); } };
      const zones = STAGE6.zones;
      const flat = [];
      PLATES6.forEach((key, i) => {
        if (!isPainted(scene, key)) { flat.push(i); return; }
        const { x, w } = plateRect(i, zones), src = scene.textures.get(key).getSourceImage?.() || {};
        const mid = scene.add?.image?.(x, LANE_TOP + 8, key);
        mid?.setOrigin?.(0, 1); mid?.setDepth?.(-50 + i * 0.1); mid?.setScale?.(w / (src.width || 1024));
        lit(mid);
      });
      // Zones without a painted plate keep the code-drawn tiles on the 0.4 parallax strip (below painted plates).
      const seen = x => flat.some(i => {
        const c0 = i ? zones[i - 1].l : 0, c1 = i + 1 < zones.length ? zones[i + 1].l : WORLD_W - VW;
        return x + 560 > 0.4 * c0 && x < 0.4 * c1 + VW;
      });
      for (let x = -40, i = 0; x < WORLD_W; x += 520, i++) {
        if (!seen(x)) continue;
        const mid = scene.add?.image?.(x, LANE_TOP + 6, i % 2 ? 'bg6mid2' : 'bg6mid');
        mid?.setOrigin?.(0, 1); mid?.setScrollFactor?.(0.4); mid?.setDepth?.(-51); mid?.setDisplaySize?.(560, 150);
        lit(mid);
      }
      // Painted floors meet at the zone edges (quay to the hall at the gate, the Heart's red stone from the boss
      // zone); code-drawn floors keep the 1800 px layout.
      const floorKeys = ['bg6floor', 'bg6floor2', 'bg6floor3'];
      const painted = floorKeys.some(k => isPainted(scene, k));
      const edges = painted ? [0, zones[2].l, zones[3].l, WORLD_W] : [0, 1800, 3600, WORLD_W];
      floorKeys.forEach((key, i) => {
        const x = edges[i], w = Math.min(edges[i + 1] + (painted ? 0 : 100), WORLD_W + 100) - x;
        const tile = scene.add?.tileSprite?.(x, LANE_TOP - 16, painted ? w : 1900, VH - LANE_TOP + 30, key);
        tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40); lit(tile);
      });
      rain = scene.add?.tileSprite?.(0, 0, VW, VH, 's6storm');
      rain?.setScrollFactor?.(0); rain?.setDepth?.(4200); rain?.setAlpha?.(0.18); rain?.setBlendMode?.('ADD');
      if (rain) owned.push(rain);
      for (let i = 0; i < 4; i++) {
        const d = scene.add?.sprite?.(1500 + i * 70, 640, 's6def', i % 3);
        d?.setOrigin?.(0.5, 0.96); d?.setScale?.(s6Scale(scene, 's6def', 3.2)); d?.setDepth?.(980); d?.setAlpha?.(0.85);
        if (d) { defs.push(d); owned.push(d); }
      }
      call = scene.add?.sprite?.(4560, 620, 's6call', 0);
      // Painted Callandor is crystal, drawn in normal blend (ADD only suited the code stub).
      call?.setOrigin?.(0.5, 0.96); call?.setScale?.(s6Scale(scene, 's6call', 3.4)); call?.setBlendMode?.(isPainted(scene, 's6call') ? 'NORMAL' : 'ADD'); call?.setDepth?.(1100); call?.setVisible?.(false);
      if (call) owned.push(call);
      if (scene.lights?.addLight) view.light = scene.lights.addLight(400, 520, 280, 0xffc878, 0.6, 40);
    },
    setQuality(n) { view.quality = n | 0; },
    move(camX) { far?.setTint?.(bolt > 0 ? 0xb9c7e8 : 0xffffff); },
    sync(kit) {
      tells.sync(kit?.stone);
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
      const pulse = Math.sin((kit?.s?.time?.now || 0) / 280);
      call?.setVisible?.(!!boss);
      if (call && isPainted(scene, 's6call')) {
        const flare = (kit?.s?.enemies || []).some(e => e.type === 'belal' && e.phase >= 3);
        call.setFrame?.(flare ? 1 : 0); call.setAlpha?.(flare ? 0.9 + 0.1 * pulse : 0.82 + 0.1 * pulse);
      } else call?.setAlpha?.(0.55 + 0.35 * pulse);
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
      g?.setScrollFactor?.(0); g?.setDepth?.(3000); g?.setAlpha?.(0.9); g?.setScale?.(s6Scale(scene, 's6rand', 1.2));
      if (g) owned.push(g);
      const timer = scene.time?.delayedCall?.(1600, () => g?.destroy?.());
      if (timer) timers.push(timer);
    },
    randSprite(x, y) {
      const s = scene.add?.sprite?.(x, y, 's6rand', 1);
      s?.setOrigin?.(0.5, 0.96); s?.setScale?.(s6Scale(scene, 's6rand', 1.4)); s?.setDepth?.(1400);
      return s;
    },
    destroy() { tells.destroy(); for (const t of timers) t.remove?.(); timers.length = 0; for (const o of owned) o?.destroy?.(); owned.length = 0; if (view.light) scene.lights?.removeLight?.(view.light); },
  };
  return view;
}
function thisScene(scene) { return scene; }
