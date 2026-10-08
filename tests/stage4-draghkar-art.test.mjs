import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import './helpers/stage4-harness.mjs';

const { queueStage4 } = await import('../src/stage4.js');
const { STAGE4_TEXTURES } = await import('../src/stage4-def.js');
const { dragFrame } = await import('../src/stage4-art-cast.js');
const { DraghkarActor } = await import('../src/stage4-actors.js');

const SHEET = 'assets/bg4/s4drag.webp', PORTRAIT = 'assets/bg4/draghkar-portrait.webp';
const CELL = [480, 400];

function loaderScene(existing = new Set()) {
  const images = new Map(), sheets = new Map();
  return {
    images, sheets,
    textures: { exists: k => existing.has(k) },
    cache: { json: { get: () => null } },
    load: { image: (k, u) => images.set(k, u), atlas: () => {}, json: () => {}, spritesheet: (k, u, cfg) => sheets.set(k, { u, cfg }), audio: () => {}, on() {}, once() {} },
  };
}
function webpSize(file) {
  const b = readFileSync(new URL('../' + file, import.meta.url));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 12, 16), 'VP8X', `${file} is an extended (alpha) WebP`);
  return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
}

test('queueStage4 loads the painted Draghkar sheet and portrait under the procedural keys', () => {
  const s = loaderScene();
  queueStage4(s);
  assert.deepEqual(s.sheets.get('s4drag'), { u: SHEET, cfg: { frameWidth: CELL[0], frameHeight: CELL[1] } });
  assert.equal(s.images.get('draghkarPortrait'), PORTRAIT);
  for (const f of [SHEET, PORTRAIT]) assert.ok(existsSync(new URL('../' + f, import.meta.url)), f);
  for (const k of ['s4drag', 'draghkarPortrait']) assert.ok(STAGE4_TEXTURES.includes(k), `${k} is released with stage 4`);
  // already loaded (or painted by the fallback): not queued again
  const again = loaderScene(new Set(['s4drag', 'draghkarPortrait']));
  queueStage4(again);
  assert.equal(again.sheets.has('s4drag'), false);
  assert.equal(again.images.has('draghkarPortrait'), false);
});

test('the painted sheet has one cell per dragFrame pose and stays inside the Stage 4 memory budget', () => {
  const [w, h] = webpSize(SHEET);
  assert.deepEqual([w, h], [10 * CELL[0], CELL[1]]);
  const frames = new Set();
  const states = ['perch', 'takeoff', 'intro', 'swoop_tell', 'swoop_dive', 'grounded', 'land_recovery', 'claw', 'buffet', 'croon', 'kiss_tell', 'kiss_lunge', 'kiss_hold', 'reels', 'kiss_recoil', 'counter_down', 'down', 'getup', 'defeated', 'ash'];
  for (const st of states) for (const t of [0, 0.15, 0.3]) frames.add(dragFrame(st, t));
  assert.deepEqual([...frames].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  // decoded RGBA: under 7.5 MiB for the sheet (the painter's 1800x250 canvas is no longer made)
  assert.ok(w * h * 4 / 2 ** 20 < 7.5);
  // portrait: 136 px source for the 68 px boss-bar slot
  const pb = readFileSync(new URL('../' + PORTRAIT, import.meta.url));
  assert.equal(pb.toString('ascii', 8, 12), 'WEBP');
});

test('the actor scales a 400 px painted cell to the painter\'s 250 px footprint at 1.62', () => {
  const sp = { frame: { height: CELL[1] }, scaleV: 0, setOrigin(x, y) { sp.origin = [x, y]; }, setDepth() {}, setScale(v) { sp.scaleV = v; }, setFrame(f) { sp.f = f; }, setLighting() {}, setAlpha() {}, flipX: false };
  const d = { type: 'draghkar', state: 'croon', st: 0.5, x: 100, y: 640, z: 0, sprite: sp };
  DraghkarActor.prototype.sync.call(d);
  assert.equal(sp.f, 5);
  assert.ok(Math.abs(sp.scaleV - 1.62 * 250 / 400) < 1e-9);
  assert.ok(Math.abs(CELL[1] * sp.scaleV - 405) < 1e-9, 'displayed cell height matches the painter cell (250 x 1.62)');
  assert.deepEqual(sp.origin, [0.5, 0.96]);
});

test('ART_STATUS keeps the ChatGPT provenance and Jason\'s approval for the Draghkar art', () => {
  const status = JSON.parse(readFileSync(new URL('../assets/bg4/ART_STATUS.json', import.meta.url)));
  for (const key of ['s4drag', 'draghkarPortrait']) {
    const e = status.entries.find(x => x.key === key);
    assert.equal(e.placeholder, false);
    assert.equal(e.source, 'chatgpt-image');
    assert.match(e.art.approvedBy, /Jason F via Grok Bot, 2026-10-07/);
    assert.equal(e.art.tool, 'tools/stage4/process_draghkar.py');
    assert.ok(existsSync(new URL('../' + e.art.sourceFile, import.meta.url)), e.art.sourceFile);
  }
});
