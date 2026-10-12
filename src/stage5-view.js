// Blight backdrop. Procedural art, one sun, and the Eye / oak lights.
import { VW, VH, LANE_TOP, LANE_BOT, WORLD_W } from './config.js';
import { paintStage5Art, greenFrame } from './stage5-art.js';
import { paintBackdrop as paintBg } from './stage5-art-bg.js';
import { paintCast } from './stage5-art-cast.js';
import { PAINTED5 } from './stage5-painted.js';
import { LAYOUT5, STAGE5 } from './stage5-def.js';
import { createStage5Effects } from './stage5-effects.js';
import { plateRect, STREAMS, residentKeys } from './zone-stream.js';
import { isPainted, s5Scale } from './stage5-paint.js';

const PLATES5 = ['bg5mid', 'bg5mid2', 'bg5mid3', 'bg5mid4'];
const FLOORS5 = ['bg5floor', 'bg5floor2', 'bg5floor3'];
// The boss garden's left feather sits on the tar plate. A locked camera at zone.l
// (the whole boss viewport) is already past the blend, so the plate reads as one span.
export const GARDEN_BLEND = 300;
export function gardenPlateRect(zones) {
  const z = zones[3];
  const x = z.l - GARDEN_BLEND;
  return { x, w: WORLD_W + 80 - x };
}
// Props sit on the far edge of the floor and always draw behind a fighter.
const FAR_FOOT = LANE_TOP + 8;
function dressFoot(frame, y) { return frame === 'lurk' ? y : Math.min(y, FAR_FOOT); }
function dressDepth(y) { return 1000 + Math.min(y, LANE_TOP) - 2; }
function keyOf(o) { return o?.texture?.key || o?.key; }
function isCode(scene, key) {
  const src = scene.textures?.get?.(key)?.source?.[0];
  return !src || src.isCanvas !== false;
}

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
  const owned = [];
  let effects, glimpseTimer, glimpse, green;
  const view = {
    sun: null, eye: null, oakLight: null, flare: null, quality: 5,
    buildBackdrop() {
      const keep = residentKeys(scene, STREAMS[5]);
      paintStage5Art(scene, keep);
      const far = img(scene, 0, 0, 'bg5far');
      if (far) owned.push(far);
      far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 20);
      scene.backdropLit = scene.backdropLit || [];
      view.layoutPlates(keep);
      view.sun = scene.lights?.addLight?.(VW * 0.8, 70, 1400, 0xffb070, 1.3, 200) || null;
      haze = [];
      const wash = scene.add?.image?.(VW * 0.5, 160, 's5mist');
      wash?.setOrigin?.(0.5, 0.5); wash?.setScrollFactor?.(0.15); wash?.setDepth?.(-60); wash?.setAlpha?.(0.65); wash?.setDisplaySize?.(VW, 280);
      if (wash) haze.push(wash);
    },
    sync(kit) {
      if (!effects) effects = createStage5Effects(scene);
      effects.sync(kit);
      placeDressing(scene, kit, owned, view);
      placeGlows(scene, kit, view);
      const beat = kit?.arena;
      const showGreen = !!(beat?.green && beat.frozen);
      if (!showGreen) green?.setVisible?.(false);
      else {
        if (!green && scene.add?.sprite) {
          green = scene.add.sprite(beat.centre, 630, 's5green', 0);
          green.setOrigin?.(0.5, 0.96); green.setLighting?.(true);
          owned.push(green);
        }
        if (green) {
          const face = (scene.riley?.x ?? beat.centre) >= beat.centre ? -1 : 1;
          green.setVisible?.(true);
          green.setPosition?.(beat.centre + face * 72, 630);
          green.setFlipX?.(face < 0);
          green.setFrame?.(greenFrame(beat.green.state));
          green.setScale?.(s5Scale(scene, 's5green', 2.75));
          green.setDepth?.(1000 + LANE_BOT + 24);
        }
      }
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
        view.eye.setColor?.(mode === 'oak' ? 0xc8f080 : mode === 'flare' ? 0xfff0c0 : 0xffe090);
        if (arena?.oak && mode === 'oak') { view.eye.x = arena.oak.x; view.eye.y = arena.oak.y; }
      }
      view.oakLight = mode === 'oak' ? view.eye : null;
      view.flare = mode === 'flare' ? view.eye : null;
      const hazards = [];
      const zz = Math.max(0, kit?.s?.zoneI || 0), cam = kit?.s?.camX || 0;
      for (const t of kit?.blight?.thorns || []) if (t.zone === zz && t.on && t.burn <= 0) hazards.push({ x: t.x, y: 640, color: 0xff4060 });
      for (const seep of kit?.blight?.seeps || []) if (seep.zone === zz && seep.phase !== 'gone') hazards.push({ x: seep.x, y: seep.y, color: 0xff7040 });
      hazards.sort((a, b) => Math.abs(a.x - cam - VW * 0.4) - Math.abs(b.x - cam - VW * 0.4));
      if (!view.hazards && hazards.length && scene.lights?.addLight) view.hazards = [0, 1].map(() => scene.lights.addLight(0, 0, 200, 0xff7040, 0, 30));
      (view.hazards || []).forEach((L, i) => {
        const h = on ? hazards[i] : null;
        L.intensity = h ? 0.85 : 0;
        if (!h) return;
        L.x = h.x; L.y = h.y; L.setColor?.(h.color);
      });
    },
    layoutPlates(keep) {
      const plates = new Set([...PLATES5, ...FLOORS5]);
      const have = [...keep].filter(k => plates.has(k) && scene.textures?.exists?.(k)).sort().join(',');
      const sig = [...keep].filter(k => k !== 'bg5far').sort().join(',') + '|' + have;
      if (sig === view._plateSig) return;
      view._plateSig = sig;
      for (let i = owned.length - 1; i >= 0; i--) {
        const o = owned[i], k = keyOf(o);
        if (!plates.has(k)) continue;
        o.destroy?.();
        owned.splice(i, 1);
        const lit = scene.backdropLit;
        const j = lit?.indexOf?.(o) ?? -1;
        if (j >= 0) lit.splice(j, 1);
      }
      const coming = k => { const row = PAINTED5.find(r => r.key === k); return !!(row?.present && !scene._s5miss?.has(k)); };
      const missing = [...keep].filter(k => plates.has(k) && !scene.textures?.exists?.(k) && !coming(k));
      if (missing.length) paintBg(scene, new Set(missing));
      placePlates(scene, keep, owned);
    },
    paintBackdrop(key) { paintBg(scene, new Set([key])); paintCast(scene); },
    moveSun(camX) { if (view.sun) view.sun.x = camX + VW * 0.8; },
    ensureBossLights() {},
    glimpse() {
      glimpseTimer?.remove?.(); glimpse?.destroy?.();
      const g = scene.add?.image?.(3600, LANE_TOP - 30, scene.textures?.exists?.('fade_far') ? 'fade_far' : 's5flare');
      glimpse = g;
      g?.setDepth?.(40); g?.setAlpha?.(0.85);
      glimpseTimer = scene.time?.delayedCall?.(2400, () => { g?.destroy?.(); glimpse = glimpseTimer = null; });
    },
    destroy() {
      glimpseTimer?.remove?.(); glimpse?.destroy?.(); green = null; effects?.destroy();
      for (const p of [...owned, ...haze]) p.destroy?.();
      for (const L of new Set([view.sun, view.eye, view.oakLight, view.flare, ...(view.hazards || []), ...(view.glows || [])])) if (L) scene.lights?.removeLight?.(L);
      view.glows = null;
      view.hazards = null;
      scene.backdropLit = (scene.backdropLit || []).filter(p => !owned.includes(p));
      owned.length = 0; view.sun = view.eye = view.oakLight = view.flare = null; haze = [];
    },
  };
  return view;
}

function placePlates(scene, keep, owned) {
  const zones = scene.stageDef?.zones || STAGE5.zones;
  const lit = o => { if (!o) return; o.setLighting?.(true); scene.backdropLit = scene.backdropLit || []; scene.backdropLit.push(o); owned.push(o); };
  const have = PLATES5.filter(k => keep.has(k) && scene.textures?.exists?.(k));
  const painted = have.filter(k => !isCode(scene, k));
  for (const key of painted) {
    const i = PLATES5.indexOf(key);
    const rect = key === 'bg5mid4' ? gardenPlateRect(zones) : plateRect(i, zones);
    const src = scene.textures.get(key).getSourceImage?.() || {};
    const mid = scene.add?.image?.(rect.x, LANE_TOP + 8, key);
    mid?.setOrigin?.(0, 1); mid?.setDepth?.(-50 + i * 0.1); mid?.setScale?.(rect.w / (src.width || 640));
    lit(mid);
  }
  const code = have.filter(k => isCode(scene, k));
  const legacy = !painted.length && code.every(k => k === 'bg5mid' || k === 'bg5mid2');
  if (legacy && code.length) {
    const mids = scene.fx?.quality >= 2 && code.includes('bg5mid') ? ['bg5mid'] : code;
    for (let i = 0, x = -40; x < WORLD_W; x += 640, i++) {
      const mid = scene.add?.image?.(x, LANE_TOP + 8, mids[i % mids.length]);
      mid?.setOrigin?.(0, 1); mid?.setScrollFactor?.(0.35); mid?.setDepth?.(-50);
      lit(mid);
    }
  } else {
    for (const key of code) {
      const rect = plateRect(PLATES5.indexOf(key), zones);
      for (let x = rect.x; x < rect.x + rect.w; x += 640) {
        const mid = scene.add?.image?.(x, LANE_TOP + 8, key);
        mid?.setOrigin?.(0, 1); mid?.setScrollFactor?.(0.35); mid?.setDepth?.(-50);
        lit(mid);
      }
    }
  }
  const edges = [0, zones[2].l, zones[3].l, WORLD_W];
  FLOORS5.forEach((key, i) => {
    if (!keep.has(key) || !scene.textures?.exists?.(key)) return;
    const x = edges[i], w = edges[i + 1] - x;
    const tile = scene.add?.tileSprite?.(x, LANE_TOP - 20, w, VH - LANE_TOP + 40, key);
    tile?.setOrigin?.(0, 0); tile?.setDepth?.(-40);
    lit(tile);
    // The seam keeps using the left floor. Skip it once that floor has left the resident set, or the strips outlive the texture.
    if (i > 0 && keep.has(FLOORS5[i - 1]) && !isCode(scene, FLOORS5[i - 1])) floorSeam(scene, FLOORS5[i - 1], edges[i - 1], x, VH - LANE_TOP + 40).forEach(lit);
  });
}

function floorSeam(scene, key, x0, x, h, n = 12) {
  const out = [], w = 96 / n;
  for (let k = 0; k < n; k++) {
    const t = scene.add?.tileSprite?.(x + k * w, LANE_TOP - 20, w, h, key);
    if (!t) continue;
    t.setOrigin?.(0, 0); t.setDepth?.(-39.9); t.setAlpha?.(1 - (k + 0.5) / n);
    t.tilePositionX = x + k * w - x0;
    out.push(t);
  }
  return out;
}

function layOf(scene, kit) {
  return kit?.lay || scene.cache?.json?.get?.('layout5') || LAYOUT5;
}
function placeDressing(scene, kit, owned, view) {
  const lay = layOf(scene, kit);
  const add = scene.add;
  if (view.trees && !scene.textures?.exists?.('s5tree')) {
    for (const sp of view.trees) sp.destroy?.();
    view.trees = null;
  }
  if (!view.trees && isPainted(scene, 's5tree') && add?.sprite) {
    view.trees = [];
    for (const t of lay.trees || []) {
      const y = dressFoot('tree', t.y);
      const sp = add.sprite(t.x, y, 's5tree', 0);
      sp.setOrigin?.(0.5, 1); sp.setDepth?.(dressDepth(y)); sp.setLighting?.(true); sp._tree = t;
      view.trees.push(sp); owned.push(sp);
    }
  }
  for (const sp of view.trees || []) {
    const t = sp._tree;
    const frame = t.ribbon && kit?.ribbonDropped ? 2 : t.lashed ? 1 : 0;
    sp.setFrame?.(frame);
  }
  const placeBits = (slot, key, bits) => {
    if (view[slot] && !scene.textures?.exists?.(key)) {
      for (const sp of view[slot]) sp.destroy?.();
      view[slot] = null;
    }
    if (view[slot]?.length || !isPainted(scene, key) || !add?.sprite || !bits.length) return;
    view[slot] = bits.map(([x, y, frame]) => {
      const fy = dressFoot(frame, y);
      const sp = add.sprite(x, fy, key, frame);
      sp._key = key;
      sp.setOrigin?.(0.5, 1); sp.setDepth?.(dressDepth(fy)); sp.setLighting?.(true);
      owned.push(sp);
      return sp;
    });
  };
  const decoBits = [];
  if (isPainted(scene, 's5deco')) {
    for (const s of lay.lurks || []) decoBits.push([s.x, s.y, 'lurk']);
    (lay.deco || []).forEach(d => decoBits.push([d.x, d.y, d.frame]));
  }
  placeBits('dress', 's5deco', decoBits);
  const gardenBits = [];
  if (isPainted(scene, 's5garden')) (lay.garden || []).forEach(d => gardenBits.push([d.x, d.y, d.frame]));
  placeBits('garden', 's5garden', gardenBits);
}
function placeGlows(scene, kit, view) {
  const list = scene.cache?.json?.get?.('lights5')?.lights;
  if (!list?.length || !scene.lights?.addLight) return;
  if (!isPainted(scene, 'bg5mid3') && !isPainted(scene, 'bg5mid4')) return;
  if (!view.glows) view.glows = [0, 1].map(() => scene.lights.addLight(0, 0, 220, 0xff7040, 0, 40));
  const cam = kit?.s?.camX || 0;
  const near = list.filter(L => L.x > cam - 160 && L.x < cam + VW + 160)
    .sort((a, b) => Math.abs(a.x - cam - VW * 0.45) - Math.abs(b.x - cam - VW * 0.45));
  view.glows.forEach((L, i) => {
    const h = near[i];
    L.intensity = h ? h.i : 0;
    if (!h) return;
    L.x = h.x; L.y = h.y; L.radius = h.r;
    const c = typeof h.color === 'number' ? h.color : parseInt(h.color, 16);
    L.setColor?.(c);
  });
}
