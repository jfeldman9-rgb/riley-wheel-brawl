// Rhuidean backdrop: dusk Waste, fog veil, glass plaza. Lights stay scarce.
import { VW, VH, LANE_TOP, WORLD_W, q } from './config.js';
import { paintStage7Art, STAGE7_CANVASES } from './stage7-art.js';
import { createWasteTells } from './stage7-tells.js';
import { isPainted, s7Scale } from './stage7-paint.js';
import { STAGE7 } from './stage7-def.js';
import { plateRect as plateRectOf, STREAMS, residentKeys, plateKeyList } from './zone-stream.js';

export const PLATES7 = Object.freeze(['bg7mid', 'bg7mid2', 'bg7mid3', 'bg7mid4']);
const FLOORS7 = ['bg7floor', 'bg7floor2', 'bg7floor3'];
const BACK7 = new Set(['bg7far', ...PLATES7, ...FLOORS7]);
const FLOOR_H = VH - LANE_TOP + 30;
export function plateRect(i, zones = STAGE7.zones) { return plateRectOf(i, zones, STREAMS[7].bleed); }
function keyOf(o) { return o?.texture?.key || o?.key; }
function img(scene, x, y, key) {
  const s = scene.add?.image ? scene.add.image(x, y, key) : null;
  s?.setOrigin?.(0, 0);
  return s;
}

export function createStage7View(scene) {
  const owned = [], tells = createWasteTells(scene), timers = [];
  let far, dust, portal, veil;
  const view = {
    light: null, quality: 0,
    buildBackdrop() {
      const keep = residentKeys(scene, STREAMS[7]);
      const skip = new Set(plateKeyList(STREAMS[7]).filter(k => !keep.has(k)));
      if (q.get('story') === '0') for (const n of [1, 2, 3]) skip.add('story7p' + n);
      paintStage7Art(scene, skip);
      far = img(scene, 0, 0, 'bg7far');
      far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 8);
      if (far) owned.push(far);
      scene.backdropLit = scene.backdropLit || [];
      const lit = o => { if (o) { o.setLighting?.(scene.backdropIsLit !== false); scene.backdropLit.push(o); owned.push(o); } };
      const zones = STAGE7.zones;
      const flat = [];
      PLATES7.forEach((key, i) => {
        if (!scene.textures?.exists?.(key)) return;
        if (!isPainted(scene, key)) { flat.push(i); return; }
        const { x, w } = plateRect(i, zones), src = scene.textures.get(key).getSourceImage?.() || {};
        const mid = scene.add?.image?.(x, LANE_TOP + 8, key);
        mid?.setOrigin?.(0, 1); mid?.setDepth?.(-50 + i * 0.1); mid?.setScale?.(w / (src.width || 1024));
        lit(mid);
      });
      const codeKey = x => flat.find(i => {
        const c0 = i ? zones[i - 1].l : 0, c1 = i + 1 < zones.length ? zones[i + 1].l : WORLD_W - VW;
        return x + 560 > 0.4 * c0 && x < 0.4 * c1 + VW;
      });
      for (let x = -40, i = 0; x < WORLD_W; x += 520, i++) {
        const zone = codeKey(x);
        if (zone === undefined) continue;
        const mid = scene.add?.image?.(x, LANE_TOP + 6, PLATES7[zone]);
        mid?.setOrigin?.(0, 1); mid?.setScrollFactor?.(0.4); mid?.setDepth?.(-51); mid?.setDisplaySize?.(560, 150);
        lit(mid);
      }
      const floorKeys = ['bg7floor', 'bg7floor2', 'bg7floor3'];
      const painted = floorKeys.some(k => isPainted(scene, k));
      const edges = painted ? [0, zones[2].l, zones[3].l, WORLD_W] : [0, 1800, 3600, WORLD_W];
      floorKeys.forEach((key, i) => {
        if (!scene.textures?.exists?.(key)) return;
        const x = edges[i], w = Math.min(edges[i + 1] + (painted ? 0 : 100), WORLD_W + 100) - x;
        const tile = painted ? paintFloor(scene, key, x, w) : scene.add?.tileSprite?.(x, LANE_TOP - 16, 1900, FLOOR_H, key);
        if (!painted) { tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40); }
        lit(tile);
      });
      portal = scene.add?.sprite?.(300, 620, 's7portal', 1);
      portal?.setOrigin?.(0.5, 0.96); portal?.setScale?.(2.2); portal?.setDepth?.(980);
      if (portal) owned.push(portal);
      veil = scene.add?.image?.(2560, LANE_TOP + 8, 's7dust');
      veil?.setOrigin?.(0.5, 1); veil?.setDepth?.(-49); veil?.setDisplaySize?.(340, 300); veil?.setAlpha?.(0.55); veil?.setTint?.(0x9fc0e0);
      if (veil) owned.push(veil);
      dust = scene.add?.image?.(VW / 2, VH / 2, 's7dust');
      dust?.setScrollFactor?.(0); dust?.setDepth?.(4300); dust?.setDisplaySize?.(VW * 1.4, VH); dust?.setAlpha?.(0); dust?.setVisible?.(false);
      if (dust) owned.push(dust);
      if (scene.lights?.addLight) {
        view.torches = [];
        view.light = scene.lights.addLight(300, 520, 300, 0x8fe3ff, 0.9, 40);
        view.torches.push(view.light);
        view.torches.push(scene.lights.addLight(0, 0, 300, 0xffc878, 0, 40));
      }
    },
    dropBackdrop(keep) {
      for (let i = owned.length - 1; i >= 0; i--) {
        const o = owned[i], k = keyOf(o);
        if (!BACK7.has(k) || keep.has(k)) continue;
        o.destroy?.();
        owned.splice(i, 1);
        const lit = scene.backdropLit, j = lit?.indexOf?.(o) ?? -1;
        if (j >= 0) lit.splice(j, 1);
      }
    },
    paintBackdrop(key) {
      const skip = new Set(STAGE7_CANVASES.map(row => row[0]));
      skip.delete(key);
      paintStage7Art(scene, skip);
    },
    showBackdrop(key) {
      if (!scene.textures?.exists?.(key) || owned.some(o => keyOf(o) === key)) return;
      const zones = STAGE7.zones;
      const lit = o => { if (o) { o.setLighting?.(scene.backdropIsLit !== false); scene.backdropLit = scene.backdropLit || []; scene.backdropLit.push(o); owned.push(o); } };
      const pi = PLATES7.indexOf(key);
      if (pi >= 0) {
        if (!isPainted(scene, key)) {
          const mid = scene.add?.image?.(0, LANE_TOP + 6, key);
          mid?.setOrigin?.(0, 1); mid?.setScrollFactor?.(0.4); mid?.setDepth?.(-51); mid?.setDisplaySize?.(560, 150);
          lit(mid);
          return;
        }
        const { x, w } = plateRect(pi, zones), src = scene.textures.get(key).getSourceImage?.() || {};
        const mid = scene.add?.image?.(x, LANE_TOP + 8, key);
        mid?.setOrigin?.(0, 1); mid?.setDepth?.(-50 + pi * 0.1); mid?.setScale?.(w / (src.width || 1024));
        lit(mid);
        return;
      }
      if (key === 'bg7far') {
        far = img(scene, 0, 0, 'bg7far');
        far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 8);
        if (far) owned.push(far);
        return;
      }
      const fi = FLOORS7.indexOf(key);
      if (fi < 0) return;
      const painted = isPainted(scene, key);
      const edges = painted ? [0, zones[2].l, zones[3].l, WORLD_W] : [0, 1800, 3600, WORLD_W];
      const x = edges[fi], w = Math.min(edges[fi + 1] + (painted ? 0 : 100), WORLD_W + 100) - x;
      const tile = painted ? paintFloor(scene, key, x, w) : scene.add?.tileSprite?.(x, LANE_TOP - 16, 1900, FLOOR_H, key);
      if (!painted) { tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40); }
      lit(tile);
    },
    setQuality(n) { view.quality = n | 0; },
    move() {},
    sync(kit) {
      tells.sync(kit);
      const zone = kit?.s?.zoneI ?? -1;
      const storm = kit?.storm;
      const target = storm?.phase === 'gust' ? 0.35 : storm?.phase === 'tell' ? 0.18 : 0;
      const cur = dust?.alpha ?? 0;
      const next = cur + Math.sign(target - cur) * Math.min(Math.abs(target - cur), 0.02);
      dust?.setAlpha?.(next); dust?.setVisible?.(next > 0.01);
      const portalOn = zone === 0 && !kit?.portalOff;
      portal?.setVisible?.(portalOn);
      portal?.setFrame?.(portalOn ? 1 : 0);
      const cam = kit?.s?.camX || 0;
      const veilA = Math.max(0, Math.min(0.55, 0.55 * (1 - (cam - 2000) / 500)));
      veil?.setAlpha?.(veilA); veil?.setVisible?.(veilA > 0.02);
      const litOn = kit?.s?.lightsOn !== false;
      (view.torches || []).forEach((L, i) => {
        if (i === 0) {
          if (portalOn) { L.x = 300; L.y = 520; L.radius = 300; L.intensity = litOn ? 0.9 : 0; }
          else if (zone === 3) { L.x = 4600; L.y = 520; L.radius = 320; L.intensity = litOn ? 0.8 : 0; }
          else L.intensity = 0;
          return;
        }
        L.intensity = 0;
      });
      if (far) {
        const tint = zone >= 3 ? 0x8a9cc0 : zone >= 2 ? 0xb8c8e0 : 0xffffff;
        far.setTint?.(tint);
      }
    },
    glimpse() {
      const g = scene.add?.sprite?.((scene.camX || 0) + VW * 0.7, 620, 's7asmo', 2);
      g?.setOrigin?.(0.5, 0.96); g?.setDepth?.(1200); g?.setAlpha?.(0.9); g?.setScale?.(s7Scale(scene, 's7asmo', 1.6));
      if (g) owned.push(g);
      const timer = scene.time?.delayedCall?.(1600, () => g?.destroy?.());
      if (timer) timers.push(timer);
    },
    destroy() {
      tells.destroy(); for (const t of timers) t.remove?.(); timers.length = 0;
      for (const o of owned) o?.destroy?.(); owned.length = 0;
      for (const L of view.torches || []) scene.lights?.removeLight?.(L);
      view.torches = []; view.light = null;
    },
  };
  return view;
}

function floorScale(scene, key, span) {
  const src = scene.textures?.get?.(key)?.source?.[0];
  if (!src?.width || !src?.height) return null;
  const sy = FLOOR_H / src.height;
  return key === 'bg7floor3' ? [span / src.width, sy] : [sy, sy];
}
function paintFloor(scene, key, x, w) {
  const tile = scene.add?.tileSprite?.(x, LANE_TOP - 16, w, FLOOR_H, key);
  tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40);
  const sc = floorScale(scene, key, w);
  if (sc) tile?.setTileScale?.(sc[0], sc[1]);
  return tile;
}

const EMPTY = [];
export function stage7LightBudget(kit) {
  const s = kit?.s; if (!s) return;
  const list = [];
  const add = L => { if (L && !list.includes(L)) list.push(L); };
  add(s.heroLight);
  for (const L of s.beam?.lights || EMPTY) add(L);
  add(s.powers?.shield?.L);
  for (const b of s.powers?.bolts || EMPTY) add(b.L);
  for (const f of s.fireballs || EMPTY) add(f.light);
  add(s.fx?.hitLight);
  for (const b of s.fx?.booms || EMPTY) add(b.L);
  for (const p of s.patches || EMPTY) add(p.L);
  for (const p of s.pickups || EMPTY) add(p.L);
  for (const L of kit.view?.torches || EMPTY) add(L);
  add(kit.strike?.glow); add(kit.strike?.flash);
  let n = 0;
  for (const L of list) {
    const on = s.lightsOn !== false && L.intensity > 0;
    const visible = on && n < 10;
    L.setVisible?.(visible);
    if (visible) n++;
  }
}
