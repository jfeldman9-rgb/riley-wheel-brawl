import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import './helpers/stage4-harness.mjs';

const { queueStage4 } = await import('../src/stage4.js');
const { createStage4View, painted, stage4Placeholder, PLATES } = await import('../src/stage4-view.js');
const { STAGE4_TEXTURES } = await import('../src/stage4-def.js');

const PLATE_FILES = {
  bg4far: 'assets/bg4/bg4-far.jpg', bg4mid: 'assets/bg4/bg4-mid.webp', bg4mid2: 'assets/bg4/bg4-mid2.webp',
  bg4floor: 'assets/bg4/bg4-floor.jpg', bg4floor2: 'assets/bg4/bg4-floor2.jpg', bg4floor3: 'assets/bg4/bg4-floor3.jpg',
  story4p1: 'assets/story/story4_panel_1.jpg', story4p2: 'assets/story/story4_panel_2.jpg', story4p3: 'assets/story/story4_panel_3.jpg',
};
const SIZES = { bg4far: [1280, 602], bg4mid: [1280, 502], bg4mid2: [1280, 588], bg4floor: [1080, 360], bg4floor2: [1080, 360], bg4floor3: [1080, 360] };

function loaderScene(existing = new Set()) {
  const images = new Map();
  const rec = (k, u) => images.set(k, u);
  return {
    images,
    textures: { exists: k => existing.has(k) },
    cache: { json: { get: () => null } },
    load: { image: rec, atlas: rec, json: rec, spritesheet: rec, audio: rec, on() {}, once() {} },
  };
}

test('queueStage4 loads the painted plates and panels under the procedural keys, and they are released with stage 4', () => {
  const s = loaderScene();
  queueStage4(s);
  for (const [k, file] of Object.entries(PLATE_FILES)) {
    assert.equal(s.images.get(k), file, k);
    assert.ok(existsSync(new URL('../' + file, import.meta.url)), file);
    assert.ok(STAGE4_TEXTURES.includes(k), `${k} is released on leaving stage 4`);
  }
  const again = loaderScene(new Set(Object.keys(PLATE_FILES)));
  queueStage4(again);
  for (const k of Object.keys(PLATE_FILES)) assert.equal(again.images.has(k), false, `${k} is not reloaded`);
});

function viewScene(kind) {
  const made = [], added = [];
  const texture = key => {
    if (!key) return null;
    const real = kind === 'painted' || (kind === 'farOnly' && key === 'bg4far');
    const [width, height] = SIZES[key] || [64, 64];
    return { source: [real ? { width, height, isCanvas: false } : { width: 32, height: 32, isCanvas: true }] };
  };
  const add = (type) => (x, y, ...rest) => {
    const key = type === 'tileSprite' ? rest[2] : rest[0];
    const o = { type, x, y, key, w: rest[0], h: rest[1], calls: {} };
    const t = texture(key); o.width = t?.source[0].width; o.height = t?.source[0].height;
    const p = new Proxy(o, { get: (tg, prop) => prop in tg ? tg[prop] : (...args) => { tg.calls[prop] = args; return p; } });
    made.push(o); return p;
  };
  return {
    made, added,
    textures: { exists: () => true, get: texture },
    add: { image: add('image'), tileSprite: add('tileSprite') },
    lights: { addLight: (x, y, r) => { const L = { x, y, r }; added.push(L); return L; } },
  };
}

test('painted plates lay out at native size with the moon light on the painted moon; code-drawn ones keep the old layout', () => {
  const s = viewScene('painted');
  const v = createStage4View(s);
  v.buildBackdrop();
  const mids = s.made.filter(o => o.key === 'bg4mid' || o.key === 'bg4mid2');
  assert.deepEqual(mids.map(o => [o.key, o.x, o.y]), [['bg4mid', 0, PLATES.midY], ['bg4mid2', 1280 - PLATES.overlap, PLATES.midY]]);
  assert.equal(mids[0].calls.setScrollFactor[0], PLATES.par);
  // the mid run covers the camera's whole travel at its parallax
  assert.ok(2 * 1280 - PLATES.overlap >= (5200 - 1280) * PLATES.par + 1280);
  const floors = s.made.filter(o => o.type === 'tileSprite');
  assert.ok(floors.every(f => Math.abs(f.calls.setTileScale[0] - 188 / 360) < 1e-9));
  assert.ok(floors.some(f => f.key === 'bg4floor2' && f.x === 1800 - PLATES.feather), 'feathered hand-off into floor2');
  assert.deepEqual([s.added[0].x, s.added[0].y], PLATES.moon);
  v.moveMoon(1000);
  assert.equal(s.added[0].x, 1000 + PLATES.moon[0]);

  const f = viewScene('canvas');
  const fv = createStage4View(f);
  fv.buildBackdrop();
  assert.ok(f.made.filter(o => o.key === 'bg4mid' || o.key === 'bg4mid2').length > 4, 'fallback repeats the painted-at-boot silhouettes');
  assert.deepEqual(f.made.filter(o => o.type === 'tileSprite').map(o => o.x), [0, 1800, 3600]);
  assert.deepEqual([f.added[0].x, f.added[0].y], [1280 * 0.85, 90]);
});

test('the placeholder check reports code-drawn art only', () => {
  assert.equal(painted(viewScene('painted'), 'bg4far'), true);
  assert.equal(painted(viewScene('canvas'), 'bg4far'), false);
  assert.equal(painted({}, 'bg4far'), false);
  // cultist and Draghkar sheets are still drawn by code
  const s = viewScene('painted');
  const get = s.textures.get;
  s.textures.get = k => k === 's4cult' ? { source: [{ width: 8, height: 8, isCanvas: true }] } : get(k);
  assert.equal(stage4Placeholder(s), true);
  s.textures.exists = k => !['s4cult', 's4drag', 'draghkarPortrait'].includes(k);
  assert.equal(stage4Placeholder(s), false);
});

test('ART_STATUS records every painted Stage 4 file with a matching hash and grokbot-image provenance', () => {
  const status = JSON.parse(readFileSync(new URL('../assets/bg4/ART_STATUS.json', import.meta.url)));
  const painted = status.entries.filter(e => !e.placeholder);
  assert.deepEqual(painted.map(e => e.files[0]).sort(), Object.values(PLATE_FILES).sort());
  for (const e of painted) {
    const file = e.files[0];
    assert.equal(createHash('sha256').update(readFileSync(new URL('../' + file, import.meta.url))).digest('hex'), e.sha256[file], file);
    assert.equal(e.source, 'grokbot-image');
    assert.ok(existsSync(new URL('../' + e.art.sourceFile, import.meta.url)), e.art.sourceFile);
  }
  assert.deepEqual(status.entries.filter(e => e.placeholder).map(e => e.key).sort(), ['draghkarPortrait', 's4cult', 's4drag']);
});
