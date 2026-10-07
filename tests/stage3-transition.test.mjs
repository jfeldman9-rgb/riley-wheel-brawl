import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { STAGE2, resolveStage } from '../src/stages.js';
import { ensureStage3Plates, isPlaceholderPlate, STAGE3_PLATE_W, STAGE3_PLATE_H } from '../src/stage3-art.js';
import { directoryBaseHref, resolvePageAsset } from '../src/page-base.js';
import { audit } from '../tools/audit-stage1.mjs';

const PAGES = 'https://jfeldman9-rgb.github.io/riley-wheel-brawl/';

globalThis.Phaser = globalThis.Phaser || { Scene: class {} };
const { queueStage3 } = await import('../src/stage3.js');
const { placeholderArt } = await import('../src/hud.js');

test('stage 2 hands the campaign to stage 3 on relative case-exact bg3 paths', () => {
  const data = STAGE2.next(new URLSearchParams(''));
  assert.deepEqual(data, { stage: 3, fromStage2: true, autostart: true });
  assert.equal(resolveStage(data, new URLSearchParams('')), 3);
  assert.equal(resolveStage(data, new URLSearchParams('stage=2')), 3);
  const queued = [];
  const scene = {
    load: {
      image: (key, url) => queued.push([].concat(url)),
      spritesheet: (key, url) => queued.push([url]),
      json: (key, url) => queued.push([url]),
      atlas: (key, image, json) => queued.push([image, json]),
      once() {}, on() {}, off() {},
    },
    textures: { exists: () => false },
    cache: { json: { get: () => undefined } },
    events: { once() {}, off() {} },
  };
  queueStage3(scene);
  const urls = queued.flat();
  const names = new Set(readdirSync(new URL('../assets/bg3/', import.meta.url)));
  const bg3 = urls.filter(u => u.startsWith('assets/bg3/'));
  assert.ok(bg3.length >= 7);
  for (const url of urls) {
    assert.equal(url.startsWith('/'), false, url);
    assert.equal(/^[a-z][a-z0-9+.-]*:/i.test(url), false, url);
    assert.equal(url.includes('assets/bg2/'), false, url);
    assert.equal(url.includes('assets/BG3/'), false, url);
  }
  for (const url of bg3) {
    const base = url.slice('assets/bg3/'.length);
    assert.ok(names.has(base), `${base} must match assets/bg3 casing`);
    assert.equal(existsSync(new URL('../' + url, import.meta.url)), true, url);
  }
  assert.ok(bg3.includes('assets/bg3/bg3-mid.webp'));
  assert.ok(bg3.includes('assets/bg3/bg3-floor.jpg'));
  assert.ok(bg3.includes('assets/bg3/plates.json'));
  assert.equal(directoryBaseHref(PAGES), PAGES);
  assert.equal(directoryBaseHref(PAGES.slice(0, -1)), PAGES);
  assert.equal(directoryBaseHref(PAGES + 'index.html'), PAGES + 'index.html');
  for (const url of bg3) assert.equal(resolvePageAsset(PAGES.slice(0, -1), url), PAGES + url, url);
  const gate = audit();
  assert.equal(gate.preFight.inventoryStatus, 'PASS');
  assert.ok(gate.preFight.inventoryUpperBoundBytes <= 25_000_000);
  assert.equal(gate.iosHotfix.source.status, 'PASS');
  assert.ok(gate.iosHotfix.source.bytes <= gate.iosHotfix.source.budgetBytes);
});

test('half-res stage 3 plates are painted once and full-size sources are left alone', () => {
  const prior = globalThis.document;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => mockCtx() }) };
  try {
    const scene = plateScene(STAGE3_PLATE_W, STAGE3_PLATE_H);
    assert.equal(isPlaceholderPlate(scene, 'mid3a'), true);
    assert.equal(ensureStage3Plates(scene), true);
    assert.equal(scene.stage3Painted, true);
    assert.equal(scene.textures.get('mid3a').source[0].image.width, STAGE3_PLATE_W);
    assert.equal(scene.textures.get('floor3a').source[0].image.height, STAGE3_PLATE_H);
    const full = plateScene(2172, 724);
    assert.equal(ensureStage3Plates(full), false);
    assert.equal(full.stage3Painted, undefined);
    const sim = plateScene(2048, 1024);
    assert.equal(ensureStage3Plates(sim), false);
  } finally {
    globalThis.document = prior;
  }
});

test('painted stage 3 hides the placeholder tag and every other stage keeps it', () => {
  const metas = { cutthroat: { placeholder: true } };
  const cached = { cache: { json: { get: () => ({ placeholder: true }) } } };
  assert.equal(placeholderArt({ stageNo: 3, metas, stage3Painted: true }), false);
  assert.equal(placeholderArt({ stageNo: 3, metas }), true);
  assert.equal(placeholderArt({ stageNo: 4, stage3Painted: true }), true);
  assert.equal(placeholderArt({ stageNo: 2, ...cached }), false);
  assert.equal(placeholderArt({ stageNo: 1, ...cached, stage3Painted: true }), false);
});

function plateScene(w, h) {
  const textures = new Map();
  for (const key of ['far3_day', 'far3_night', 'mid3a', 'mid3b', 'floor3a', 'floor3b', 'floor3c']) {
    const image = { width: w, height: h };
    textures.set(key, { getSourceImage: () => image, source: [{ image, width: w, height: h, flipY: false }] });
  }
  return { textures: { get: key => textures.get(key) } };
}

function mockCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(_t, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad;
      return () => {};
    },
    set() { return true; },
  });
}
