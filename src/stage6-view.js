// Stone backdrop: rain sheen, window flicker, Defenders, Callandor. Lights stay scarce.
import { VW, VH, LANE_TOP, WORLD_W, q } from './config.js';
import { paintStage6Art, STAGE6_CANVASES } from './stage6-art.js';
import { createStoneTells } from './stage6-tells.js';
import { isPainted, s6Scale } from './stage6-paint.js';
import { STAGE6 } from './stage6-def.js';
import { plateRect as plateRectOf, STREAMS, residentKeys, plateKeyList } from './zone-stream.js';

export const PLATES6 = Object.freeze(['bg6mid', 'bg6mid2', 'bg6mid3', 'bg6mid4']);
const FLOORS6 = ['bg6floor', 'bg6floor2', 'bg6floor3'];
const BACK6 = new Set(['bg6far', ...PLATES6, ...FLOORS6]);
export function plateRect(i, zones = STAGE6.zones) { return plateRectOf(i, zones); }
function keyOf(o) { return o?.texture?.key || o?.key; }

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
      const keep = residentKeys(scene, STREAMS[6]);
      const skip = new Set(plateKeyList(STREAMS[6]).filter(k => !keep.has(k)));
      if (q.get('story') === '0') for (const n of [1, 2, 3]) skip.add('story6p' + n);
      paintStage6Art(scene, skip);
      far = img(scene, 0, 0, 'bg6far');
      far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 8);
      if (far) owned.push(far);
      scene.backdropLit = scene.backdropLit || [];
      const lit = o => { if (o) { o.setLighting?.(scene.backdropIsLit !== false); scene.backdropLit.push(o); owned.push(o); } };
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
      const codeKey = x => flat.find(i => {
        const c0 = i ? zones[i - 1].l : 0, c1 = i + 1 < zones.length ? zones[i + 1].l : WORLD_W - VW;
        return x + 560 > 0.4 * c0 && x < 0.4 * c1 + VW;
      });
      for (let x = -40, i = 0; x < WORLD_W; x += 520, i++) {
        const zone = codeKey(x);
        if (zone === undefined) continue;
        const mid = scene.add?.image?.(x, LANE_TOP + 6, PLATES6[zone]);
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
        const tile = painted ? paintFloor(scene, key, x, w) : scene.add?.tileSprite?.(x, LANE_TOP - 16, 1900, FLOOR_H, key);
        if (!painted) { tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40); }
        lit(tile);
        // Painted seams crossfade: the left floor runs on past the edge in strips that fade out over SEAM6 px.
        if (painted && i > 0) floorSeam(scene, floorKeys[i - 1], edges[i - 1], x, FLOOR_H).forEach(lit);
      });
      ensureRain(scene);
      if (scene.add?.particles && scene.textures?.exists?.('raindrop')) {
        rain = scene.add.particles(0, 0, 'raindrop', { x: { min: -100, max: VW + 300 }, y: -40, lifespan: 900, speedY: { min: 900, max: 1200 }, speedX: { min: -180, max: -120 }, rotate: 12, scaleY: { min: 0.7, max: 1.1 }, alpha: { min: 0.25, max: 0.45 }, frequency: 18 });
        rain.setScrollFactor?.(0); rain.setDepth?.(4200);
        if (rain) owned.push(rain);
      }
      for (let i = 0; i < 4; i++) {
        const d = scene.add?.sprite?.(1500 + i * 70, 640, 's6def', i % 3);
        d?.setOrigin?.(0.5, 0.96); d?.setScale?.(s6Scale(scene, 's6def', 3.2)); d?.setDepth?.(980); d?.setAlpha?.(0.85);
        if (d) { defs.push(d); owned.push(d); }
      }
      call = scene.add?.sprite?.(4560, 620, 's6call', 0);
      // Painted Callandor is crystal, drawn in normal blend (ADD only suited the code stub).
      call?.setOrigin?.(0.5, 0.96); call?.setScale?.(s6Scale(scene, 's6call', 3.4)); call?.setBlendMode?.(isPainted(scene, 's6call') ? 'NORMAL' : 'ADD'); call?.setDepth?.(1100); call?.setVisible?.(false);
      if (call) owned.push(call);
      if (scene.lights?.addLight) {
        view.torches = [];
        view.light = scene.lights.addLight(400, 520, 280, 0xffc878, 0.6, 40);
        view.torches.push(view.light);
        for (let i = 0; i < 2; i++) view.torches.push(scene.lights.addLight(0, 0, 260, 0xffb45e, 0, 40));
      }
    },
    dropBackdrop(keep) {
      for (let i = owned.length - 1; i >= 0; i--) {
        const o = owned[i], k = keyOf(o);
        if (!BACK6.has(k) || keep.has(k)) continue;
        o.destroy?.();
        owned.splice(i, 1);
        const lit = scene.backdropLit, j = lit?.indexOf?.(o) ?? -1;
        if (j >= 0) lit.splice(j, 1);
      }
    },
    paintBackdrop(key) {
      const skip = new Set(STAGE6_CANVASES.map(row => row[0]));
      skip.delete(key);
      paintStage6Art(scene, skip);
    },
    showBackdrop(key) {
      if (!scene.textures?.exists?.(key) || owned.some(o => keyOf(o) === key)) return;
      const zones = STAGE6.zones;
      const lit = o => { if (o) { o.setLighting?.(scene.backdropIsLit !== false); scene.backdropLit = scene.backdropLit || []; scene.backdropLit.push(o); owned.push(o); } };
      const pi = PLATES6.indexOf(key);
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
      if (key === 'bg6far') {
        far = img(scene, 0, 0, 'bg6far');
        far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 8);
        if (far) owned.push(far);
        return;
      }
      const fi = FLOORS6.indexOf(key);
      if (fi < 0) return;
      const painted = isPainted(scene, key);
      const edges = painted ? [0, zones[2].l, zones[3].l, WORLD_W] : [0, 1800, 3600, WORLD_W];
      const x = edges[fi], w = Math.min(edges[fi + 1] + (painted ? 0 : 100), WORLD_W + 100) - x;
      const tile = painted ? paintFloor(scene, key, x, w) : scene.add?.tileSprite?.(x, LANE_TOP - 16, 1900, FLOOR_H, key);
      if (!painted) { tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40); }
      lit(tile);
      if (painted && fi > 0) floorSeam(scene, FLOORS6[fi - 1], edges[fi - 1], x, FLOOR_H).forEach(lit);
    },
    setQuality(n) { view.quality = n | 0; },
    move(camX) { far?.setTint?.(bolt > 0 ? 0xb9c7e8 : 0xffffff); },
    sync(kit) {
      tells.sync(kit?.stone);
      const q = view.quality || kit?.quality || kit?.s?.fx?.quality || 0;
      const zone = kit?.s?.zoneI ?? -1;
      if (rain) rain.setVisible?.(q < 2 && zone <= 0);
      flicker -= 1 / 60;
      if (flicker <= 0) { flicker = (q >= 2 ? 12 : 6) + Math.random() * 4; bolt = q >= 2 ? 0.08 : 0.16; }
      if (bolt > 0) bolt -= 1 / 60;
      far?.setTint?.(bolt > 0 ? 0xc5d4f5 : 0xffffff);
      const showDef = zone === 1;
      defs.forEach((d, i) => { d.setVisible?.(showDef); if (showDef) d.setFrame?.(Math.floor((kit?.s?.time?.now || 0) / 180 + i) % 3); });
      const boss = zone === 3 && kit?.s?.boss;
      const pulse = Math.sin((kit?.s?.time?.now || 0) / 280);
      call?.setVisible?.(!!boss);
      // The scene keeps its boss after the body leaves enemies; retain the final flare until the stage ends.
      const flare = kit?.s?.boss?.phase >= 3 || (kit?.s?.enemies || []).some(e => e.type === 'belal' && e.phase >= 3);
      call?.setFrame?.(flare ? 1 : 0);
      if (call && isPainted(scene, 's6call')) {
        call.setAlpha?.(flare ? 0.9 + 0.1 * pulse : 0.82 + 0.1 * pulse);
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
      const spots = scene.cache?.json?.get?.('lights6')?.lights || [];
      const cam = kit?.s?.camX || 0;
      const near = spots.filter(p => p.x > cam - 120 && p.x < cam + VW + 120)
        .sort((a, b) => Math.abs(a.x - cam - VW * 0.5) - Math.abs(b.x - cam - VW * 0.5));
      const litOn = kit?.s?.lightsOn !== false;
      (view.torches || []).forEach((L, i) => {
        if (boss && i === 0) { L.x = 4560; L.y = 520; L.radius = 280; L.intensity = litOn ? 1.1 : 0; return; }
        const spot = near[i];
        if (!spot || !litOn) { L.intensity = 0; return; }
        L.x = spot.x; L.y = spot.y; L.radius = spot.r || 260; L.intensity = spot.i || 1.2;
      });
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
    destroy() {
      tells.destroy(); for (const t of timers) t.remove?.(); timers.length = 0;
      for (const o of owned) o?.destroy?.(); owned.length = 0;
      for (const L of view.torches || []) scene.lights?.removeLight?.(L);
      view.torches = []; view.light = null;
    },
  };
  return view;
}
function ensureRain(scene) {
  if (scene.textures?.exists?.('raindrop') || !scene.textures?.createCanvas) return;
  const c = scene.textures.createCanvas('raindrop', 4, 40);
  if (!c?.getContext) return;
  const x = c.getContext();
  const g = x.createLinearGradient(0, 0, 0, 40);
  g.addColorStop(0, 'rgba(210,225,255,0)');
  g.addColorStop(1, 'rgba(225,235,255,0.9)');
  x.fillStyle = g; x.fillRect(1, 0, 2, 40); c.refresh?.();
}
function thisScene(scene) { return scene; }

const EMPTY = [];
export function stage6LightBudget(kit) {
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
  let n = 0;
  for (const L of list) {
    const on = s.lightsOn !== false && L.intensity > 0;
    const visible = on && n < 10;
    L.setVisible?.(visible);
    if (visible) n++;
  }
}

export const SEAM6 = 160;
const FLOOR_H = VH - LANE_TOP + 30;
// Uniform scale fits a tiling floor into the lane. The Heart is one image across its span.
function floorScale(scene, key, span) {
  const src = scene.textures?.get?.(key)?.source?.[0];
  if (!src?.width || !src?.height) return null;
  const sy = FLOOR_H / src.height;
  return key === 'bg6floor3' ? [span / src.width, sy] : [sy, sy];
}
function paintFloor(scene, key, x, w) {
  const tile = scene.add?.tileSprite?.(x, LANE_TOP - 16, w, FLOOR_H, key);
  tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40);
  const sc = floorScale(scene, key, w);
  if (sc) tile?.setTileScale?.(sc[0], sc[1]);
  return tile;
}
// Strips of the left floor's tileSprite continued past the seam at x, alpha stepping 1 -> 0 (no new textures).
export function floorSeam(scene, key, x0, x, h, n = 16) {
  const out = [], w = SEAM6 / n;
  if (!isPainted(scene, key)) return out;
  const sx = floorScale(scene, key, 1)?.[0] || 1;
  for (let k = 0; k < n; k++) {
    const t = scene.add?.tileSprite?.(x + k * w, LANE_TOP - 16, w, h, key);
    if (!t) continue;
    t.setOrigin?.(0, 0); t.setDepth?.(-39.9); t.setAlpha?.(1 - (k + 0.5) / n);
    t.setTileScale?.(sx, floorScale(scene, key, 1)?.[1] || sx);
    t.tilePositionX = (x + k * w - x0) / sx;
    out.push(t);
  }
  return out;
}
