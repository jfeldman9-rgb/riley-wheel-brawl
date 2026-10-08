// T3: Stage3Kit backdrop, floors, time of day and Stage 3 loading (docs/stage3/specs/T3.md §7).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';   // installs Phaser, window, location, document

const { timeOfDay, lerpColor, queueStage3, Stage3Kit, TOD_FALLBACK, STAGE3_ATLASES } = await import('../src/stage3.js');
const { Stage1, placeFires } = await import('../src/stage1.js');
const { q, VW } = await import('../src/config.js');
const { queueCharPages, ALL_CHARS } = await import('../src/assets.js');
const { STAGES, STAGE3, STAGE_CHARS, STAGE_TEXTURES } = await import('../src/stages.js');

const J = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const LIGHTS = J('assets/bg3/lights.json'), PLATES = J('assets/bg3/plates.json');
const L = c => 0.2126 * (c >> 16) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255);
const hex = v => typeof v === 'string' ? parseInt(v, 16) : v;
const onDisk = u => existsSync(new URL('../' + u, import.meta.url));
const KEYS = LIGHTS.timeKeys;

function obj(extra = {}) {
  const o = {
    alpha: 1, scrollFactor: 1, width: 2172, height: 724, displayWidth: 2172, x: 0, y: 0,
    setOrigin() { return o; }, setScrollFactor(x) { o.scrollFactor = x; return o; }, setScale(k) { o.displayWidth = o.width * k; return o; },
    setDepth(d) { o.depth = d; return o; }, setAlpha(a) { o.alpha = a; return o; }, setLighting(v) { o.lit = v; return o; }, setTint(t) { o.tint = t; return o; },
    setTileScale() { return o; }, setTilePosition() { return o; }, setBlendMode() { return o; }, setVisible() { return o; }, setPosition() { return o; }, destroy() {},
    ...extra,
  };
  return o;
}
function fakeScene({ camX = 0, quality = 0, fireCap, json = { lights3: LIGHTS, plates3: PLATES } } = {}) {
  const active = new Set();
  const s = {
    camX, fireCap, lightsOn: true, backdropLit: [], enemies: [], riley: { x: camX + 400, y: 630, facing: 1 }, hud: null,
    time: { now: 0, delayedCall() {} }, ambientCalls: 0, lastAmbient: undefined,
    add: {
      image: (x, y, key) => obj({ x, y, key }), tileSprite: (x, y, w, h, key) => obj({ x, y, key, width: w }),
      particles: (x, y, key, cfg = {}) => { const p = obj({ key, frequency: cfg.frequency, emitting: cfg.emitting !== false }); p.stop = () => { p.emitting = false; return p; }; return p; },
    },
    lights: {
      active,
      addLight(x, y, radius, color, intensity) { const Lt = { x, y, radius, color, intensity, visible: true, setVisible(v) { this.visible = v; return this; } }; active.add(Lt); return Lt; },
      removeLight(Lt) { active.delete(Lt); },
      setAmbientColor(c) { s.lastAmbient = c; s.ambientCalls++; },
    },
    cache: { json: { get: k => json[k] } },
    textures: { exists: () => true, get: () => ({ getSourceImage: () => ({ width: 2172, height: 724 }) }) },
    fx: { quality, embers: { emitParticleAt() {} }, snowPuff: {} },
  };
  return s;
}
function recLoader(cached = {}, resident = []) {
  const queued = [], callbacks = [];
  const scene = {
    queued, callbacks, cached,
    load: {
      image: (key, url) => queued.push({ kind: 'image', key, urls: [url].flat() }),
      atlas: (key, tex, atl) => typeof key === 'object' ? queued.push({ kind: 'atlas', key: key.key, cfg: key, urls: [key.textureURL, key.normalMap, key.atlasURL] }) : queued.push({ kind: 'atlas', key, urls: [tex, atl] }),
      spritesheet: (key, url, frame) => queued.push({ kind: 'spritesheet', key, urls: [url], frame }),
      json: (key, url) => queued.push({ kind: 'json', key, urls: [url] }),
      once: (ev, fn) => callbacks.push({ ev, fn }),
    },
    textures: { exists: k => resident.includes(k) },
    cache: { json: { get: k => scene.cached[k] } },
  };
  return scene;
}
const built = (opts) => { const s = fakeScene(opts), kit = new Stage3Kit(s); kit.build(); return { s, kit }; };
const at = (s, kit, camX, dt = 1 / 60) => { s.camX = camX; kit.update(dt); };

test('timeOfDay grows darker monotonically and clamps', () => {
  let prev = null;
  for (let x = -500; x <= 6000; x += 5) {
    const d = timeOfDay(x, KEYS);
    for (const k of ['farMix', 't', 'torchK']) assert.ok(d[k] >= 0 && d[k] <= 1, `${k} in [0,1] at ${x}`);
    if (prev) {
      assert.ok(L(d.ambient) <= L(prev.ambient), `luminance never rises at ${x}`);
      assert.ok(d.sunI <= prev.sunI, `sunI never rises at ${x}`);
      for (const k of ['farMix', 't', 'torchK']) assert.ok(d[k] >= prev[k], `${k} never falls at ${x}`);
    }
    assert.equal(d.torchK, d.t);
    prev = d;
  }
  const k0 = KEYS[0], kl = KEYS.at(-1);
  for (const x of [-500, -1, k0.x]) assert.deepEqual(timeOfDay(x, KEYS), { t: 0, ambient: hex(k0.ambient), farMix: k0.farMix, sunI: k0.sunI, torchK: 0 });
  for (const x of [kl.x, kl.x + 1, 6000]) assert.deepEqual(timeOfDay(x, KEYS), { t: 1, ambient: hex(kl.ambient), farMix: kl.farMix, sunI: kl.sunI, torchK: 1 });
  assert.deepEqual(timeOfDay(1, []), TOD_FALLBACK);
  assert.deepEqual(timeOfDay(1, undefined), TOD_FALLBACK);
  const one = timeOfDay(777, [KEYS[1]]);
  assert.equal(one.t, 0);
  assert.deepEqual(one, { t: 0, ambient: hex(KEYS[1].ambient), farMix: KEYS[1].farMix, sunI: KEYS[1].sunI, torchK: 0 });
  assert.equal(lerpColor(0x000000, 0xffffff, 0.5), 0x808080);
});

test('bg3 data files fit the Stage 3 registry', () => {
  for (let i = 1; i < KEYS.length; i++) {
    assert.ok(KEYS[i].x > KEYS[i - 1].x, 'x strictly increasing');
    const a = hex(KEYS[i - 1].ambient), b = hex(KEYS[i].ambient);
    for (const sh of [16, 8, 0]) assert.ok(((b >> sh) & 255) <= ((a >> sh) & 255), `ambient channel ${sh} non-increasing at key ${i}`);
  }
  assert.equal(KEYS[0].farMix, 0); assert.equal(KEYS.at(-1).farMix, 1);
  assert.equal(KEYS[0].sunI, 1); assert.equal(KEYS.at(-1).sunI, 0);
  assert.equal(STAGE3.zones[3].r - VW, 3920);
  assert.ok(KEYS.at(-1).x <= STAGE3.zones[3].r - VW);
  assert.equal(LIGHTS.capOnScreen, 4);
  for (const t of LIGHTS.torches) {
    assert.equal(t.length, 6); assert.ok(t.every(n => typeof n === 'number'));
    assert.ok(t[0] === 0 || t[0] === 1); assert.ok(t[5] >= 0 && t[5] <= 1);
  }
  const F = PLATES.floors;
  assert.equal(F[0].from, 0); assert.equal(F.at(-1).to, 5200);
  for (let i = 1; i < F.length; i++) assert.equal(F[i].from, F[i - 1].to, 'floors contiguous');
  for (const f of F) {
    assert.ok(STAGE_TEXTURES[3].includes(f.key), f.key);
    assert.ok(!STAGE_TEXTURES[1].includes(f.key) && !STAGE_TEXTURES[2].includes(f.key), f.key);
  }
  const d = timeOfDay(STAGE3.skipBoss.camX, KEYS);
  assert.ok(d.sunI > 0); assert.ok(d.farMix >= LIGHTS.atmos.nightFrom);
  assert.ok(LIGHTS.torches.some(t => t[5] > d.t));
});

test('torches ignite by time of day and never exceed the on-screen cap', () => {
  const { s, kit } = built();
  assert.equal(kit.torchSpots.length, LIGHTS.torches.length);
  assert.equal(s.fires.length, 0, 'unlit spots own no light');
  for (let x = 0; x <= 3920; x += 20) {
    at(s, kit, x);
    const lit = [];
    for (const p of kit.torchSpots) {
      assert.equal(!!p.L, p.litAt <= kit.tod.torchK, `spot litAt ${p.litAt} at camX ${x}`);
      if (p.L) lit.push(p.L);
    }
    assert.deepEqual(new Set(s.fires), new Set(lit)); assert.equal(s.fires.length, lit.length);
    placeFires(s.fires, x, s.fireCap);
    assert.ok(s.fires.filter(f => f.visible).length <= LIGHTS.capOnScreen, `visible torches at ${x}`);
  }
  assert.equal(kit.stats.torchesLit, LIGHTS.torches.length);
  // flare: ramp to 1.3*I at 0.4 s, settle to I by 0.7 s
  const f = built();
  at(f.s, f.kit, 0.3 * 3900, 0);
  const spot = f.kit.torchSpots.find(p => p.L), I = spot.I;
  const seen = [];
  for (let i = 1; i <= 7; i++) { f.kit.update(0.1); seen.push(spot.L.baseI); }
  assert.ok(Math.abs(seen[3] - 1.3 * I) < 1e-6, 'peak 1.3*I at 0.4 s');
  assert.ok(Math.max(...seen) <= 1.3 * I + 1e-6);
  assert.ok(seen[2] < 1.3 * I && seen[4] < 1.3 * I);
  assert.ok(Math.abs(seen[6] - I) < 1e-6, 'settled to I by 0.7 s');
});

test('the sun fades out, is removed by the boss zone, and a restart rebuilds it', () => {
  const { s, kit } = built();
  assert.ok(kit.sun); assert.equal(kit.sun.intensity, 1.1);
  at(s, kit, 0); assert.equal(kit.sun.intensity, 1.1);
  const sun = kit.sun; let last = sun.intensity;
  for (let x = 0; x <= 3920; x += 20) {
    at(s, kit, x);
    if (kit.sun) { assert.ok(kit.sun.intensity <= last, `sun never rises at ${x}`); last = kit.sun.intensity; }
  }
  assert.equal(kit.sun, null); assert.ok(!s.lights.active.has(sun)); assert.equal(kit.stats.sunRemoved, 1); assert.equal(kit.sunGone, true);
  const n = s.lights.active.size;
  at(s, kit, 0);
  assert.equal(kit.sun, null); assert.equal(kit.stats.sunRemoved, 1); assert.equal(s.lights.active.size, n, 'sun not re-added');
  // a restart with a stale camera: build ignores camX, the first update removes the sun
  const r = built({ camX: 3920 });
  assert.ok(r.kit.sun); assert.equal(r.kit.sun.intensity, 1.1);
  const rs = r.kit.sun; r.kit.update(0);
  assert.equal(r.kit.sun, null); assert.ok(!r.s.lights.active.has(rs)); assert.equal(r.kit.stats.sunRemoved, 1);
  const fresh = built();
  assert.ok(fresh.kit.sun); fresh.kit.update(0); assert.equal(fresh.kit.sun.intensity, 1.1);
});

test('ambient follows the time of day, and ?lit=0 keeps ambientUnlit', () => {
  const { s, kit } = built();
  for (const x of [0, 1240, 2560, 3920]) { at(s, kit, x); assert.equal(s.lastAmbient, timeOfDay(x, KEYS).ambient, `ambient at ${x}`); }
  s.backdropIsLit = false;
  for (const x of [0, 1240, 2560, 3920]) { at(s, kit, x); assert.equal(s.lastAmbient, 0x5a6482); }
  s.backdropIsLit = true; s.lightsOn = false;
  const calls = s.ambientCalls; at(s, kit, 1240);
  assert.equal(s.ambientCalls, calls, 'lights off: no setAmbientColor');
  assert.equal(kit.ambientUnlit, 0x5a6482);
});

test('quality level 2 thins every Stage 3 particle layer', () => {
  const { s, kit } = built();
  assert.equal(s.snowFront.frequency, 70);
  s.fx.quality = 2; at(s, kit, 0);
  assert.equal(kit.motes.frequency, 200);
  assert.equal(kit.nightLayer, null);
  at(s, kit, 3920);
  assert.ok(kit.nightLayer); assert.equal(kit.nightLayer.frequency, 300);
  s.fx.quality = 0; at(s, kit, 3920);
  assert.equal(kit.motes.frequency, 60); assert.equal(kit.nightLayer.frequency, 90);
  assert.equal(kit.tod.farMix, 1); assert.equal(kit.motes.emitting, false); assert.equal(kit.dayStopped, true);
  const d = built(); at(d.s, d.kit, 0);
  assert.equal(d.kit.motes.emitting, true); assert.equal(d.kit.motes.frequency, 60);
});

test('the Stage 3 kit resets the fire cap (no leak from Stage 2\'s rage)', () => {
  const { s } = built({ fireCap: 5 });
  assert.equal(s.fireCap, 4);
  q.set('s3', '1');
  const h = stage1Simulation({ mode: '', stage: 2, followRestart: true });
  try {
    h.s.fireCap = 5;
    h.s.scene.restart({ stage: 3 });
    h.step();
    assert.equal(h.s.stageNo, 3);
    assert.ok(h.s.kit instanceof Stage3Kit);
    assert.equal(h.s.fireCap, 4);
    assert.ok(h.s.snowFront !== undefined && h.s.snowFront !== null);
  } finally { q.delete('s3'); h.destroy(); }
});

test('Stage 3 kit answers every hook the scene, Whitecloaks and bot call', () => {
  const { kit } = built();
  for (const m of 'build start destroy update onZoneClear clearHazards threats dropRibbon collectRibbon koStars telegraph glint hint onBlock onGuardBreak claimMudJoke fireArrow loseSkyArrow archerBusy markSky'.split(' ')) {
    assert.equal(typeof kit[m], 'function', m);
  }
  assert.equal(kit.claimMudJoke({}), false);
  assert.equal(kit.ribbons, 0);
  assert.equal(typeof kit.stats, 'object');
  const t = kit.threats();
  for (const k of ['arrows', 'sky', 'beams', 'torches']) assert.ok(Array.isArray(t[k]), k);
  assert.equal(t.volley, null);
  assert.doesNotThrow(() => kit.start());
  assert.equal(STAGES[3].kit, Stage3Kit);
  assert.equal(STAGES[3].queue.name, 'queueStage3All');
});

test('queueStage3 queues every Stage 3 texture and re-queues what Stage 2 release drops', () => {
  const r = recLoader();
  queueStage3(r);
  const texKeys = new Set(r.queued.filter(e => e.kind !== 'json').map(e => e.key)), allKeys = new Set(r.queued.map(e => e.key));
  const FX = ['rooftiles', 'shadowpool', 'shadowburst', 'fade_far'];
  // The prop/FX sheets are labelled PLACEHOLDER cards: without ?debug they are never queued (code draws them).
  for (const k of STAGE_TEXTURES[3]) if (!FX.includes(k)) assert.ok(texKeys.has(k), `queued ${k}`);
  for (const k of FX) assert.ok(!texKeys.has(k), `card not queued without ?debug: ${k}`);
  assert.ok(!r.queued.some(e => e.urls.some(u => u.startsWith('assets/stage3/props/'))));
  for (const k of ['arrow', 'ribbon', 'fadePortrait']) assert.ok(texKeys.has(k), `queued ${k}`);
  for (const k of ['plates3', 'lights3']) assert.ok(allKeys.has(k), `queued ${k}`);
  q.set('debug', '1');
  try {
    const rd = recLoader();
    queueStage3(rd);
    for (const k of FX) {
      const e = rd.queued.find(x => x.key === k);
      assert.equal(e.kind, 'spritesheet', k); assert.equal(e.frame.frameWidth, 256); assert.equal(e.frame.frameHeight, 256);
      assert.ok(onDisk(e.urls[0]), e.urls[0]);
    }
  } finally { q.delete('debug'); }
  for (const e of r.queued) for (const u of e.urls) {
    assert.ok(!u.startsWith('assets/bg/') && !u.startsWith('assets/bg2/'), u);
    assert.ok(onDisk(u), `on disk: ${u}`);
  }
  // Stage 2 -> 3: releaseStage(3, 2) drops arrow/ribbon (not in STAGE_TEXTURES[3]); queueStage3 re-queues them
  const resident = new Set(STAGE_TEXTURES[2]);
  const mock = {
    textures: { exists: k => resident.has(k), remove: k => resident.delete(k) },
    anims: { exists: () => false, remove() {} },
    cache: { json: { get: () => undefined } },
  };
  Stage1.prototype.releaseStage.call(mock, 3, 2);
  assert.ok(!resident.has('arrow') && !resident.has('ribbon'));
  const r2 = recLoader({}, [...resident]);
  queueStage3(r2);
  const k2 = r2.queued.map(e => e.key);
  for (const k of ['arrow', 'ribbon']) assert.ok(k2.includes(k), `re-queued ${k}`);
  for (const k of ['crate', 'planks']) assert.ok(!k2.includes(k), `still resident, not queued: ${k}`);
});

test('Stage 3 atlases load from assets/stage3/chars; Stage 1/2 URLs unchanged', () => {
  const D = 'assets/stage3/chars';
  const M = Object.fromEntries(STAGE3_ATLASES.map(k => [k, J(`${D}/${k}.anims.json`)]));
  assert.deepEqual([...STAGE3_ATLASES], STAGE_CHARS[3].filter(k => !ALL_CHARS.includes(k)));
  for (const k of STAGE3_ATLASES) assert.equal(M[k].dir, D);
  const r = recLoader();
  queueStage3(r);
  for (const k of STAGE3_ATLASES) {
    const e = r.queued.filter(x => x.key === k + '.A');
    assert.equal(e.length, 1); assert.equal(e[0].kind, 'json'); assert.deepEqual(e[0].urls, [`${D}/${k}.anims.json`]);
    assert.equal(r.callbacks.filter(c => c.ev === 'filecomplete-json-' + k + '.A').length, 1);
  }
  assert.equal(r.callbacks.length, STAGE3_ATLASES.length);
  for (const k of STAGE3_ATLASES) r.cached[k + '.A'] = M[k];
  const before = r.queued.length;
  for (const c of r.callbacks) c.fn();
  const pages = r.queued.slice(before);
  for (const k of STAGE3_ATLASES) for (const p of M[k].pages) {
    const a = pages.find(e => e.kind === 'atlas' && e.key === p);
    assert.ok(a, `atlas ${p}`);
    assert.deepEqual(a.cfg, { key: p, textureURL: `${D}/${p}.webp`, normalMap: `${D}/${p}_n.webp`, atlasURL: `${D}/${p}.json` });
    const nl = pages.find(e => e.kind === 'image' && e.key === p + '_nl');
    assert.ok(nl, `${p}_nl`); assert.deepEqual(nl.urls, [`${D}/${p}_nl.webp`]);
  }
  for (const e of pages) for (const u of e.urls) { assert.ok(u.startsWith(D + '/'), u); assert.ok(onDisk(u), `on disk: ${u}`); }
  // cached metas: nothing re-queued
  const r2 = recLoader({ ...r.cached });
  queueStage3(r2);
  assert.ok(!r2.queued.some(e => e.key.endsWith('.A'))); assert.equal(r2.callbacks.length, 0);
  // Stage 1/2 characters: URLs byte-identical to before (no dir in their metas)
  const metas = Object.fromEntries(ALL_CHARS.map(k => [k + '.A', J(`assets/chars/${k}.anims.json`)]));
  const r3 = recLoader(metas);
  queueCharPages(r3, ALL_CHARS);
  const expect = ALL_CHARS.flatMap(k => metas[k + '.A'].pages.flatMap(p => [`assets/chars/${p}.webp`, `assets/chars/${p}_n.webp`, `assets/chars/${p}.json`, `assets/chars/${p}_nl.webp`]));
  assert.deepEqual(r3.queued.flatMap(e => e.urls), expect);
});
