import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PAINTED6_ROWS, queueStage6Painted, isPainted } from '../src/stage6-paint.js';
import { paintStage6Art, STAGE6_CANVASES } from '../src/stage6-art.js';
import { createStage6View, plateRect, floorSeam, SEAM6 } from '../src/stage6-view.js';
import { WORLD_W, VW, LANE_TOP } from '../src/config.js';

function scene(painted = []) {
  const textures = new Map(painted.map(key => [key, { source: [{ isCanvas: false }], getSourceImage: () => ({ width: 1024 }) }]));
  const made = [], load = new EventEmitter(), events = new EventEmitter(), queued = [];
  for (const type of ['image', 'atlas', 'spritesheet']) load[type] = (...args) => queued.push([type, ...args]);
  const obj = (x, y, key, kind, frame = 0) => {
    const o = { x, y, key, kind, frame, scrollFactor: 1,
      setOrigin(x, y) { this.origin = [x, y]; return this; }, setDepth(v) { this.depth = v; return this; },
      setScrollFactor(v) { this.scrollFactor = v; return this; }, setDisplaySize(w, h) { this.w = w; this.h = h; return this; },
      setScale(v) { this.scale = v; return this; }, setFrame(v) { this.frame = v; return this; },
      setLighting(v) { this.lit = v; return this; }, setVisible(v) { this.visible = v; return this; },
      setAlpha(v) { this.alpha = v; return this; }, setTint() { return this; }, setBlendMode(v) { this.blend = v; return this; }, destroy() { this.destroyed = true; } };
    made.push(o); return o;
  };
  return { made, queued, load, events, textures: {
    exists: key => textures.has(key), get: key => textures.get(key), remove: key => textures.delete(key),
    addCanvas(key) { const t = { source: [{ isCanvas: true }], add() {} }; textures.set(key, t); return t; } },
    add: { image: (x,y,k) => obj(x,y,k,'image'), sprite: (x,y,k,f) => obj(x,y,k,'sprite',f),
      tileSprite: (x,y,w,h,k) => Object.assign(obj(x,y,k,'tile'), { w,h }) } };
}
function canvas(fn) {
  const old = globalThis.document;
  const gradient = { addColorStop() {} }, g = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => gradient : () => {} });
  globalThis.document = { createElement: () => ({ getContext: () => g }) };
  try { return fn(); } finally { if (old === undefined) delete globalThis.document; else globalThis.document = old; }
}

test('cold all-file failures create code canvases for every painted key including interior plates', () => canvas(() => {
  const s = scene(); queueStage6Painted(s);
  for (const r of PAINTED6_ROWS) s.load.emit('loaderror', { key: r.key, multiFile: r.atlas ? { key: r.key } : undefined });
  s.load.emit('complete'); paintStage6Art(s);
  for (const r of PAINTED6_ROWS) {
    assert.ok(s.textures.exists(r.key), `${r.key} missing after fallback`);
    assert.equal(isPainted(s, r.key), false, r.key);
    assert.ok(STAGE6_CANVASES.some(([k]) => k === r.key), `${r.key} absent from canvas inventory`);
  }
  assert.equal(s.load.optionalAssetKeys.size, 0); assert.equal(s.load.listenerCount('loaderror'), 0);
  assert.equal(s.events.listenerCount('shutdown'), 0);
}));

test('one failed interior plate uses code tiles rather than rescaling resident painted exterior plates', () => canvas(() => {
  const s = scene(PAINTED6_ROWS.map(r => r.key).filter(k => k !== 'bg6mid3'));
  const v = createStage6View(s); v.buildBackdrop();
  const tiles = s.made.filter(o => o.scrollFactor === 0.4);
  assert.ok(tiles.length > 0);
  for (const t of tiles) { assert.equal(isPainted(s, t.key), false, t.key); assert.equal(t.key, 'bg6mid3'); assert.equal(t.lit, true); }
  v.destroy(); assert.ok(s.made.every(o => o.destroyed));
}));

for (const part of ['image', 'json']) test(`atlas ${part} failure falls back and cleans optional keys on shutdown`, () => canvas(() => {
  const s = scene(['crate']); queueStage6Painted(s);
  assert.equal(s.queued.some(c => c[1] === 'crate'), false);
  s.load.emit('loaderror', { type: part, key: 's6belal', multiFile: { key: 's6belal' } });
  s.events.emit('shutdown'); paintStage6Art(s);
  assert.equal(isPainted(s, 's6belal'), false); assert.equal(isPainted(s, 'crate'), true);
  assert.equal(s.load.optionalAssetKeys.size, 0); assert.equal(s.load.listenerCount('loaderror'), 0);
  assert.equal(s.load.listenerCount('complete'), 0);
}));

for (const painted of [false, true]) test(`Callandor ${painted ? 'painted' : 'code fallback'} flares through Be'lal retirement and resets in a fresh view`, () => canvas(() => {
  const s = scene(painted ? ['s6call'] : []), v = createStage6View(s); v.buildBackdrop();
  const call = s.made.find(o => o.key === 's6call'), boss = { type: 'belal', phase: 3, alive: true };
  const kit = { s: { zoneI: 3, boss, enemies: [boss], time: { now: 0 } } };
  v.sync(kit); assert.equal(call.frame, 1); assert.equal(call.blend, painted ? 'NORMAL' : 'ADD');
  boss.alive = false; kit.s.enemies = []; v.sync(kit); assert.equal(call.frame, 1, 'boss reference retains its final phase after body retirement');
  kit.s.boss = { type: 'belal', phase: 1, alive: true }; v.sync(kit); assert.equal(call.frame, 0);
  kit.s.zoneI = 0; kit.s.boss = null; v.sync(kit); assert.equal(call.visible, false);
  v.destroy(); const next = createStage6View(s); next.buildBackdrop();
  const fresh = s.made.filter(o => o.key === 's6call').pop(); assert.equal(fresh.frame, 0); next.destroy();
}));

test('clamped camera never exposes world plate ends; floor seams are contiguous lit strips with one left-floor sample per pixel', () => canvas(() => {
  const s = scene(PAINTED6_ROWS.map(r => r.key)), v = createStage6View(s); v.buildBackdrop();
  for (let cam = 0; cam <= WORLD_W - VW; cam += 1) {
    const rects = [0,1,2,3].map(i => plateRect(i));
    assert.ok(rects[0].x < cam); assert.ok(rects[3].x + rects[3].w > cam + VW);
    for (let i = 1; i < rects.length; i++) assert.equal(rects[i-1].x + rects[i-1].w - rects[i].x, 96);
  }
  const strips = floorSeam(s, 'bg6floor', 0, 2560, 180);
  assert.equal(strips.length, 16);
  strips.forEach((t,i) => { assert.equal(t.x, 2560 + i * 10); assert.equal(t.tilePositionX, t.x); assert.equal(t.w, 10); assert.ok(t.alpha > 0 && t.alpha < 1); });
  assert.equal(strips[15].x + strips[15].w, 2560 + SEAM6);
  assert.ok(s.made.filter(o => o.kind === 'tile' && o.depth === -40).every(o => o.x + o.w <= WORLD_W));
  assert.ok(s.made.filter(o => o.depth === -39.9).slice(0,32).every(o => o.lit));
  v.destroy();
}));
