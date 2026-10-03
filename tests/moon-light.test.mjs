import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

// Regression: the camera-fixed moon was culled at later camera positions.
// Pinned Phaser 4.2.1 LightsManager.getLights tests raw light x/y against
// camera.worldView before scroll factors are applied in the lighting uniforms,
// so the old scrollFactorX=0 moon (world x 1088) vanished at camera x 3500/3920.
// This exercises the actual pinned getLights and TransformMatrix methods with
// the production addMoon/placeMoon and Stage1.updateCamera. No rendering.
globalThis.location ??= { search: '' };
globalThis.window ??= { devicePixelRatio: 1 };
globalThis.Phaser ??= { Scene: class {}, BlendModes: { ADD: 1 } };
globalThis.addEventListener ??= () => {};
const { Stage1, MOON_X, MOON_Y, addMoon, placeMoon } = await import('../src/stage1.js');

const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), '66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de');
const begin = source.indexOf('var t='), end = source.lastIndexOf(',e={};function i(');
assert.ok(begin >= 0 && end > begin, 'Pinned webpack module-table boundaries found');
const modules = runInNewContext(`(${source.slice(begin + 6, end)})`, {}, { timeout: 1000, filename: 'phaser-lights-contract.vm.js' });
const cache = new Map();
const load = id => {
  if (!cache.has(id)) { const m = { exports: {} }; cache.set(id, m); modules[id](m, m.exports, load); }
  return cache.get(id).exports;
};
// Capture the LightsManager class definition; only its pure culling helpers are supplied.
let definition;
modules[61356]({ exports: {} }, {}, id => {
  if (id === 83419) return function CaptureClass(def) { definition = def; return function Unused() {}; };
  if (id === 81491 || id === 20339) return load(id);
  return function Unavailable() { throw new Error(`unexpected dependency ${id}`); };
});
assert.equal(typeof definition?.getLights, 'function');
const Matrix = load(61340);

// Phaser Light defaults: scrollFactor 1/1; production must not override them.
function recordingLights() {
  const calls = [];
  return { calls, addLight(x, y, radius, color, intensity, z) {
    calls.push(['addLight', x, y, radius, color, intensity, z]);
    return { x, y, radius, scrollFactorX: 1, scrollFactorY: 1, willRender: () => true,
      setScrollFactor(sx, sy = sx) { calls.push(['setScrollFactor', sx, sy]); this.scrollFactorX = sx; this.scrollFactorY = sy; return this; } };
  } };
}
function camera(scrollX, scrollY = 0) {
  return { scrollX, scrollY, matrixCombined: new Matrix(1, 0, 0, 1, -scrollX, -scrollY),
    worldView: { x: scrollX, y: scrollY, width: 1280, height: 720, centerX: scrollX + 640, centerY: scrollY + 360 } };
}
const selected = (light, cam) => definition.getLights.call({ lights: [light], maxLights: 10 }, cam).some(e => e.light === light);
const projected = (light, cam) => new Matrix().copyWithScrollFactorFrom(cam.matrixCombined, cam.scrollX, cam.scrollY,
  light.scrollFactorX, light.scrollFactorY).transformPoint(light.x, light.y);
const CAMERA_XS = [0, 1240, 2560, 3500, 3920];

test('fixture reproduces the old scrollFactorX=0 moon being culled in the boss area', () => {
  const old = { x: MOON_X, y: MOON_Y, radius: 1500, scrollFactorX: 0, scrollFactorY: 1, willRender: () => true };
  assert.deepEqual(CAMERA_XS.map(x => selected(old, camera(x))), [true, true, true, false, false]);
  for (const x of CAMERA_XS) assert.equal(projected(old, camera(x)).x, MOON_X);
});

test('moon is a world-space light, selected at every camera x with the same projected position', () => {
  const lights = recordingLights(), moon = addMoon(lights);
  assert.deepEqual(lights.calls, [['addLight', 1088, 60, 1500, 0xa8c0ff, 1.25, 260]]);
  assert.equal(moon.scrollFactorX, 1); assert.equal(moon.scrollFactorY, 1);
  for (let x = 0; x <= 5200 - 1280; x += 20) for (const shake of [-24, 0, 24]) for (const sy of [-12, 0, 12]) {
    const cam = camera(x + shake, sy); placeMoon(moon, cam.scrollX);
    assert.ok(selected(moon, cam), `moon selected at camera x ${cam.scrollX}`);
    const p = projected(moon, cam);
    assert.equal(p.x, MOON_X); assert.equal(p.y, MOON_Y - sy); // vertical behavior unchanged (scrollFactorY 1)
  }
});

test('Stage1.updateCamera keeps the moon on the final (shaken) camera scroll', () => {
  const moon = addMoon(recordingLights());
  for (const [camX, sx, sy] of [[0, 0, 0], [3500, 9, -4], [3920, -11, 6]]) {
    let scroll;
    const scene = { riley: { x: camX + 540, facing: 1 }, camX, camMax: camX, locked: false, zone: null, bounds: {}, moon,
      fx: { shakeOffset: () => [sx, sy] }, cameras: { main: { setScroll: (x, y) => { scroll = [x, y]; } } } };
    Stage1.prototype.updateCamera.call(scene, 0);
    assert.deepEqual(scroll, [camX + sx, sy]);
    assert.equal(moon.x, scroll[0] + MOON_X);
    assert.ok(selected(moon, camera(scroll[0], scroll[1])));
  }
});
