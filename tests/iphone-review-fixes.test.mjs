// Review fixes: touch render scale, vignette overlay, quality floor, compact
// Stage 4 pages, plate-stream shutdown, and the cutthroat atlas release.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { VW, VH, chooseRenderScale, bloomOnByDefault, coarsePointer } from '../src/config.js';
import { installGovernor, readQualityFloor, QUALITY_FLOOR_KEY, tierScale } from '../src/quality-governor.js';
import { installGraphicsLifecycle } from '../src/graphics-lifecycle.js';
import { vignetteMix, paintVignette, VIGNETTE_W, VIGNETTE_H } from '../src/vignette-overlay.js';
import { queueCharPages } from '../src/assets.js';
import { COMPACT_NORMAL_DIR, pageUsesCompact } from '../src/texture-pages.js';
import { createPlateStream } from '../src/zone-stream.js';
import { queuePlate as queuePlate6 } from '../src/stage6-paint.js';
import { queuePlate as queuePlate5 } from '../src/stage5-paint.js';
import { Stage6Kit } from '../src/stage6.js';
import { Stage5Kit } from '../src/stage5.js';
import { ART } from '../src/powers.js';
import { STAGE6 } from '../src/stage6-def.js';

test('touch and iOS start at 1.5 or the fitted canvas, and a mouse keeps the old scale', () => {
  assert.equal(chooseRenderScale({ dpr: 3, coarse: false }), 2);
  assert.equal(chooseRenderScale({ dpr: 1, coarse: false }), 1);
  assert.equal(chooseRenderScale({ dpr: 3, coarse: true }), 1.5);
  assert.equal(chooseRenderScale({ dpr: 3, coarse: true, cssHeight: 390, gameHeight: VH }), 1.5);
  assert.equal(chooseRenderScale({ dpr: 2, coarse: true, cssHeight: 280, gameHeight: VH }), 1);
  assert.equal(chooseRenderScale({ dpr: 3, coarse: true, rsQuery: '2' }), 2);
  assert.equal(chooseRenderScale({ dpr: 1, coarse: false, rsQuery: '1.25' }), 1.25);
  assert.equal(chooseRenderScale({ dpr: 3, coarse: false, rsQuery: '9' }), 2);
  const search = get => ({ get });
  assert.equal(bloomOnByDefault(search(() => null), true), false);
  assert.equal(bloomOnByDefault(search(() => null), false), true);
  assert.equal(bloomOnByDefault(search(k => k === 'bloom' ? '1' : null), true), true);
  assert.equal(bloomOnByDefault(search(k => k === 'bloom' ? '0' : null), false), false);
  assert.equal(coarsePointer({ matchMedia: () => ({ matches: true }) }, search(() => null)), true);
  assert.equal(coarsePointer({ matchMedia: () => ({ matches: true }) }, search(k => k === 'touch' ? '0' : null)), false);
  assert.equal(coarsePointer({}, search(k => k === 'touch' ? '1' : null)), true);
});

test('the overlay vignette matches the shader mix and stays one small texture', () => {
  const ctx = {
    image: null,
    createImageData(w, h) { this.image = { data: new Uint8ClampedArray(w * h * 4) }; return this.image; },
    putImageData() {},
  };
  paintVignette(ctx, VIGNETTE_W, VIGNETTE_H, 0.35, 0.95);
  const alpha = (x, y) => ctx.image.data[(y * VIGNETTE_W + x) * 4 + 3];
  const expect = (x, y) => Math.round(vignetteMix((x + 0.5) / VIGNETTE_W, (y + 0.5) / VIGNETTE_H) * 255);
  assert.equal(alpha(128, 72), expect(128, 72));
  assert.equal(alpha(0, 0), expect(0, 0));
  assert.ok(alpha(128, 72) < 8, 'the centre stays open');
  assert.ok(alpha(0, 0) > alpha(128, 72), 'the corner darkens');
  assert.equal(VIGNETTE_W * VIGNETTE_H * 4, 256 * 144 * 4);
});

test('a lost context records a quality floor and restorewebgl applies it', () => {
  const mem = {};
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); } },
  });
  const st = { runId: 1, fx: {}, started: true, setBloom(v) { this.bloom = v; }, setBackdropLit() {}, snowFront: {} };
  const game = {
    rs: 2, scale: { resize(w, h) { this.size = [w, h]; } }, scene: { getScene: () => st },
    renderer: { gl: { getExtension: () => null, getParameter: () => 'gpu' } },
  };
  installGovernor(game, { q: new URLSearchParams(''), rs0: 2, vw: VW, vh: VH, meter: { lastSampleMs: 10 }, floor: 0 });
  assert.equal(game.keepLoweredQuality(false), 3);
  assert.equal(game.rs, 2, 'context loss does not touch GL');
  assert.equal(mem[QUALITY_FLOOR_KEY], '3');
  assert.equal(readQualityFloor(), 3);
  game.keepLoweredQuality(true);
  assert.equal(st.fx.quality, 3);
  assert.equal(st.bloom, false);
  assert.equal(game.rs, tierScale(3, 2));
  assert.equal(game.rs, 1.5);

  const pinned = { runId: 1, fx: {}, started: true, setBloom() {}, setBackdropLit() {} };
  const pinnedGame = { rs: 2, scale: { resize() {} }, scene: { getScene: () => pinned }, renderer: { gl: { getExtension: () => null, getParameter: () => 'gpu' } } };
  installGovernor(pinnedGame, { q: new URLSearchParams('q=5'), rs0: 2, vw: VW, vh: VH, meter: {}, floor: 3 });
  pinnedGame.governor();
  assert.equal(pinned.fx.quality, 5, '?q=5 still wins over the stored floor');
  assert.equal(pinnedGame.rs, 1);

  const renderer = new EventEmitter();
  renderer.contextLost = false;
  renderer.gl = { isContextLost: () => false };
  const calls = [];
  const host = {
    renderer, events: new EventEmitter(), isPaused: false,
    pause() { this.isPaused = true; }, resume() { this.isPaused = false; },
    inp: { clear() {} }, keepLoweredQuality(apply) { calls.push(apply); },
    scene: { getScene: () => null },
  };
  installGraphicsLifecycle({ game: host, meter: { setSuspended() {} }, getStage: () => null });
  renderer.emit('losewebgl');
  renderer.emit('restorewebgl');
  assert.deepEqual(calls, [false, true]);

  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /explicitRs \? 0 : bootFloor/);
  assert.match(main, /tierScale\(bootFloor, RS0\)/);
  const stage = readFileSync(new URL('../src/stage1.js', import.meta.url), 'utf8');
  assert.ok(stage.indexOf("this.events.once('shutdown'") < stage.indexOf('this.kit.build()'));
});

test('Stage 4 uses compact normals where the pages exist and leaves cutthroat on its own sheet', () => {
  const metas = {};
  for (const k of ['riley', 'hound', 'loial']) metas[k + '.A'] = JSON.parse(readFileSync(`assets/chars/${k}.anims.json`, 'utf8'));
  metas['cutthroat.A'] = JSON.parse(readFileSync('assets/stage3/chars/cutthroat.anims.json', 'utf8'));
  const atlases = [], images = [];
  queueCharPages({
    loadedStage: 4,
    cache: { json: { get: k => metas[k] } },
    textures: { exists: () => false },
    load: { atlas: row => atlases.push(row), image: (...row) => images.push(row) },
  }, ['riley', 'hound', 'loial', 'cutthroat']);
  assert.ok(atlases.some(row => row.key === 'riley-0' && row.normalMap === `${COMPACT_NORMAL_DIR}/riley-0_n.webp`));
  assert.ok(atlases.some(row => row.key === 'hound-0' && row.normalMap === `${COMPACT_NORMAL_DIR}/hound-0_n.webp`));
  assert.ok(atlases.some(row => row.key === 'loial-0' && row.normalMap === `${COMPACT_NORMAL_DIR}/loial-0_n.webp`));
  assert.ok(images.some(([key, url]) => key === 'riley-0_nl' && url === `${COMPACT_NORMAL_DIR}/riley-0_nl.webp`));
  const cut = atlases.find(row => row.key === 'cutthroat-0');
  assert.equal(cut.normalMap, 'assets/stage3/chars/cutthroat-0_n.webp');
  assert.equal(pageUsesCompact(4, 'riley-0'), true);
  assert.equal(pageUsesCompact(4, 'cutthroat-0'), false);
  assert.equal(pageUsesCompact(3, 'riley3-0'), false);
  assert.equal(pageUsesCompact(5, 'grunt-0'), true);
  assert.equal(pageUsesCompact(1, 'riley-0'), false);
});

function plateLoader() {
  const listeners = { complete: [], shutdown: [], loaderror: [] };
  let present = false;
  const scene = {
    textures: { exists: () => present, remove() {} },
    load: {
      image() {}, atlas() {}, spritesheet() {},
      on(ev, fn) { listeners[ev].push(fn); },
      once(ev, fn) { listeners[ev].push(fn); },
      off(ev, fn) { listeners[ev] = listeners[ev].filter(f => f !== fn); },
      isLoading: () => true,
      start() {},
    },
    events: {
      once(ev, fn) { listeners[ev].push(fn); },
      off(ev, fn) { listeners[ev] = listeners[ev].filter(f => f !== fn); },
    },
  };
  return { scene, listeners, arrive() { present = true; } };
}

for (const [name, queue, key] of [['stage 6', queuePlate6, 'bg6mid3'], ['stage 5', queuePlate5, 'bg5mid3']]) {
  test(`${name} plate load does not paint a stand-in when the scene shuts down`, () => {
    const { scene, listeners } = plateLoader();
    let result = 'pending';
    assert.equal(queue(scene, key, ok => { result = ok; }), true);
    for (const fn of [...listeners.shutdown]) fn();
    assert.equal(result, 'pending', 'shutdown is not a failed load');
    for (const fn of [...listeners.complete]) fn();
    assert.equal(result, 'pending', 'shutdown already detached the completion');
    const again = plateLoader();
    let loaded = null;
    queue(again.scene, key, ok => { loaded = ok; });
    again.arrive();
    for (const fn of [...again.listeners.complete]) fn();
    assert.equal(loaded, true);
  });
}

test('a plate stream ignores a load that finishes after the kit is gone', () => {
  const paints = [];
  const view = {
    showBackdrop(key) { paints.push(key); },
    paintBackdrop(key) { paints.push('paint:' + key); },
  };
  let finish = null;
  const stream = createPlateStream(
    { zoneI: 3, stageDef: STAGE6, textures: { exists: () => false, remove() {} } },
    6, view, (key, done) => { finish = () => done(false); return true; });
  stream.sync();
  stream.destroy();
  finish();
  assert.deepEqual(paints, []);
});

test('stage kits drop the plate stream before the rest of the view', () => {
  for (const Kit of [Stage6Kit, Stage5Kit]) {
    const order = [];
    const kit = new Kit({ enemies: [], riley: null, spores: [], clouds: [] });
    kit.backdrops = { destroy() { order.push('plates'); } };
    kit.view = { destroy() { order.push('view'); }, sync() {} };
    kit.destroy();
    assert.deepEqual(order, ['plates', 'view']);
  }
});

test('Stage 6 releases the cutthroat atlas at zone 2 once none are still on screen', () => {
  const keys = new Set(['cutthroat-0']);
  const removed = [];
  const scene = (zoneI, enemies = [], pending = []) => ({
    zoneI, enemies, pending,
    textures: { exists: k => keys.has(k), remove(k) { if (keys.delete(k)) removed.push(k); } },
    cache: { json: { get: () => ({ pages: ['cutthroat-0'], anims: [{ name: 'cutthroat_walk' }] }) } },
    anims: { get: () => ({ destroy() {} }) },
  });
  const hold = new Stage6Kit(scene(2, [{ type: 'cutthroat', gone: false }]));
  hold.releaseCutthroats();
  assert.deepEqual(removed, []);
  const waiting = new Stage6Kit(scene(2, [], [{ type: 'cutthroat' }]));
  waiting.releaseCutthroats();
  assert.deepEqual(removed, []);
  const early = new Stage6Kit(scene(1, []));
  early.releaseCutthroats();
  assert.deepEqual(removed, []);
  const kit = new Stage6Kit(scene(2, [{ type: 'cutthroat', gone: true }, { type: 'grunt', gone: false }]));
  kit.releaseCutthroats();
  kit.releaseCutthroats();
  assert.deepEqual(removed, ['cutthroat-0']);
});

test('the lightning reference sheet is outside the shipped powers folder', () => {
  assert.equal(ART.rileyLightning.url, 'art-in/powers/riley_lightning.png');
  assert.equal(existsSync(new URL('../art-in/powers/riley_lightning.png', import.meta.url)), true);
  assert.equal(existsSync(new URL('../assets/powers/riley_lightning.png', import.meta.url)), false);
  const list = readFileSync(new URL('../assets/powers/ART_LIST.md', import.meta.url), 'utf8');
  assert.match(list, /art-in\/powers\/riley_lightning\.png/);
  assert.match(list, /does not ship it/);
});
