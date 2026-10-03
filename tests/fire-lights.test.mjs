import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';

// Regression: parallax fire lights (scrollFactorX 0.4) went through the same pinned
// Phaser 4.2.1 LightsManager.getLights raw-coordinate culling as the old moon, so
// on-screen fires were dropped at camera x 2560, 3500 and 3920. Uses the actual
// pinned getLights and TransformMatrix methods; no rendering.
const { Stage1, FIRE_PARALLAX, FIRE_LIGHT_CAP, addMoon, placeFires } = await import('../src/stage1.js');
const { q } = await import('../src/config.js');

const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), '66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de');
const begin = source.indexOf('var t='), end = source.lastIndexOf(',e={};function i(');
assert.ok(begin >= 0 && end > begin, 'Pinned webpack module-table boundaries found');
const modules = runInNewContext(`(${source.slice(begin + 6, end)})`, {}, { timeout: 1000, filename: 'phaser-fire-lights.vm.js' });
const cache = new Map();
const load = id => {
  if (!cache.has(id)) { const m = { exports: {} }; cache.set(id, m); modules[id](m, m.exports, load); }
  return cache.get(id).exports;
};
let definition;
modules[61356]({ exports: {} }, {}, id => {
  if (id === 83419) return function CaptureClass(def) { definition = def; return function Unused() {}; };
  if (id === 81491 || id === 20339) return load(id);
  return function Unavailable() { throw new Error(`unexpected dependency ${id}`); };
});
const Matrix = load(61340);

// World x / radius of the six shipped fires as laid out in Chromium (plates.json + FIRES).
const SHIPPED = [[185, 700], [1547, 700], [879, 420], [2493, 600], [2782, 700], [2067, 380]];
// Mirrors Phaser Light: willRender is false when setVisible(false) cleared the visible render flag.
const light = (x, radius, sfx = 1) => ({ x, baseX: x, y: 400, radius, scrollFactorX: sfx, scrollFactorY: 1, visible: true,
  willRender() { return this.visible; }, setVisible(v) { this.visible = v; return this; } });
const camera = (scrollX, scrollY = 0) => ({ scrollX, scrollY, matrixCombined: new Matrix(1, 0, 0, 1, -scrollX, -scrollY),
  worldView: { x: scrollX, y: scrollY, width: 1280, height: 720, centerX: scrollX + 640, centerY: scrollY + 360 } });
const select = (lights, cam) => new Set(definition.getLights.call({ lights, maxLights: 10 }, cam).map(e => e.light));
const screenX = (L, cam) => new Matrix().copyWithScrollFactorFrom(cam.matrixCombined, cam.scrollX, cam.scrollY,
  L.scrollFactorX, L.scrollFactorY).transformPoint(L.x, L.y).x;
const onScreen = (sx, r) => sx + r > 0 && sx - r < 1280;

test('fixture reproduces old parallax fires being culled while on screen', () => {
  const old = SHIPPED.map(([x, r]) => light(x, r, FIRE_PARALLAX));
  for (const x of [2560, 3500, 3920]) {
    const cam = camera(x), sel = select(old, cam);
    const missed = old.filter(L => onScreen(screenX(L, cam), L.radius) && !sel.has(L));
    assert.ok(missed.length >= 2, `camera ${x}: ${missed.length} on-screen fires unselected`);
  }
  assert.equal(select(old, camera(3500)).size, 0);
});

test('fires keep their parallax screen position and the nearest on-screen ones are always selected', () => {
  const fires = SHIPPED.map(([x, r]) => light(x, r));
  for (let x = 0; x <= 5200 - 1280; x += 20) for (const shake of [-24, 0, 24]) {
    const cam = camera(x + shake); placeFires(fires, cam.scrollX);
    const sel = select(fires, cam);
    const visible = fires.map(L => ({ L, sx: L.baseX - FIRE_PARALLAX * cam.scrollX })).filter(f => onScreen(f.sx, f.L.radius))
      .sort((a, b) => Math.abs(a.sx - 640) - Math.abs(b.sx - 640));
    for (const f of fires) assert.ok(Math.abs(screenX(f, cam) - (f.baseX - FIRE_PARALLAX * cam.scrollX)) < 1e-9);
    assert.deepEqual([...sel].sort((a, b) => a.baseX - b.baseX), visible.slice(0, FIRE_LIGHT_CAP).map(f => f.L).sort((a, b) => a.baseX - b.baseX),
      `camera ${cam.scrollX}`);
    assert.ok(sel.size <= FIRE_LIGHT_CAP);
  }
  for (const x of [2560, 3500, 3920]) { placeFires(fires, x); assert.ok(select(fires, camera(x)).size >= 3, `camera ${x}`); }
});

test('Stage1.updateCamera places fires on the final shaken scroll', () => {
  const fires = SHIPPED.map(([x, r]) => light(x, r)), moon = addMoon({ addLight: (x, y, radius) => ({ x, y, radius }) });
  for (const [camX, sx] of [[2560, 7], [3500, -9], [3920, 0]]) {
    const scene = { riley: { x: camX + 540, facing: 1 }, camX, camMax: camX, locked: false, zone: null, bounds: {}, moon, fires,
      fx: { shakeOffset: () => [sx, 0] }, cameras: { main: { setScroll() {} } } };
    Stage1.prototype.updateCamera.call(scene, 0);
    for (const L of fires) assert.equal(L.x, L.baseX + (1 - FIRE_PARALLAX) * (camX + sx));
    assert.ok(select(fires, camera(camX + sx)).size >= 3);
  }
});

test('?skip=boss keeps Riley at the arena start instead of the left wall', () => {
  q.set('skip', 'boss');
  try {
    const sim = stage1Simulation({ mode: null });
    for (let i = 0; i < 30; i++) sim.step();
    assert.equal(sim.s.riley.x, 3990);
    assert.ok(Math.abs(sim.s.camX - 3500) < 5);
    assert.equal(sim.s.zoneI, 2);
  } finally { q.delete('skip'); }
});
