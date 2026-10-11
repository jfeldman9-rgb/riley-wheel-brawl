// Blight backdrop. Procedural art, one sun, and the Eye / oak lights.
import { VW, VH, LANE_TOP, LANE_BOT, WORLD_W } from './config.js';
import { paintStage5Art, greenFrame } from './stage5-art.js';
import { paintBackdrop } from './stage5-art-bg.js';
import { LAYOUT5, STAGE5 } from './stage5-def.js';
import { createStage5Effects } from './stage5-effects.js';
import { plateRect, STREAMS, residentKeys } from './zone-stream.js';

const PLATES5 = ['bg5mid', 'bg5mid2', 'bg5mid3', 'bg5mid4'];
const FLOORS5 = ['bg5floor', 'bg5floor2', 'bg5floor3'];
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
      const n = scene.fx?.quality >= 2 ? 8 : 16;
      haze = [];
      for (let i = 0; i < n; i++) {
        const p = scene.add?.image?.(i * 340, 180 + (i % 3) * 30, 's5flare');
        p?.setAlpha?.(0.15); p?.setScrollFactor?.(0.2); p?.setDepth?.(-60);
        if (p) haze.push(p);
      }
    },
    sync(kit) {
      if (!effects) effects = createStage5Effects(scene);
      effects.sync(kit);
      const beat = kit?.arena;
      const showGreen = !!(beat?.green && beat.frozen);
      if (!showGreen) green?.setVisible?.(false);
      else {
        if (!green && scene.add?.sprite) {
          green = scene.add.sprite(beat.centre, 630, 's5green', 0);
          green.setOrigin?.(0.5, 0.96); green.setScale?.(2.75); green.setLighting?.(true);
          owned.push(green);
        }
        if (green) {
          const face = (scene.riley?.x ?? beat.centre) >= beat.centre ? -1 : 1;
          green.setVisible?.(true);
          green.setPosition?.(beat.centre + face * 72, 630);
          green.setFlipX?.(face < 0);
          green.setFrame?.(greenFrame(beat.green.state));
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
      const sig = [...keep].filter(k => k !== 'bg5far').sort().join(',');
      if (sig === view._plateSig) return;
      view._plateSig = sig;
      const plates = new Set([...PLATES5, ...FLOORS5]);
      for (let i = owned.length - 1; i >= 0; i--) {
        const o = owned[i], k = keyOf(o);
        if (!plates.has(k)) continue;
        o.destroy?.();
        owned.splice(i, 1);
        const lit = scene.backdropLit;
        const j = lit?.indexOf?.(o) ?? -1;
        if (j >= 0) lit.splice(j, 1);
      }
      const missing = [...keep].filter(k => plates.has(k) && !scene.textures?.exists?.(k));
      if (missing.length) paintBackdrop(scene, new Set(missing));
      placePlates(scene, keep, owned);
    },
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
      for (const L of new Set([view.sun, view.eye, view.oakLight, view.flare, ...(view.hazards || [])])) if (L) scene.lights?.removeLight?.(L);
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
    const rect = plateRect(PLATES5.indexOf(key), zones);
    const src = scene.textures.get(key).getSourceImage?.() || {};
    const mid = scene.add?.image?.(rect.x, LANE_TOP + 8, key);
    mid?.setOrigin?.(0, 1); mid?.setDepth?.(-50); mid?.setScale?.(rect.w / (src.width || 640));
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
  });
}
