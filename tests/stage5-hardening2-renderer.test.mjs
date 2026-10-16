import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createStage5View } from '../src/stage5-view.js';

// Load the actual Light implementation without booting the browser entry point.
const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
const begin = source.indexOf('var t='), end = source.lastIndexOf(',e={};function i(');
assert.ok(begin >= 0 && end > begin);
const modules = runInNewContext(`(${source.slice(begin + 6, end)})`, {}, { timeout: 1000 });
const cache = new Map();
const load = id => {
  // Load only Light's actual mixins, avoiding unrelated DOM-facing components.
  if (id === 31401) return { Origin: load(27387), ScrollFactor: load(80227), Visible: load(59715) };
  if (!cache.has(id)) { const m = { exports: {} }; cache.set(id, m); modules[id](m, m.exports, load); }
  return cache.get(id).exports;
};
const Light = load(41432);

for (const mode of ['eye', 'oak', 'flare']) test(`Stage 5 ${mode} retint preserves pinned Phaser Light's color vector`, () => {
  let vector;
  const scene = { zoneI: 3, fx: { quality: 2 }, lightsOn: true, enemies: [], spores: [], clouds: [], lights: {
    addLight(x, y, radius, color, intensity, z) {
      const light = new Light(x, y, radius, ((color >>> 16) & 255) / 255, ((color >>> 8) & 255) / 255, (color & 255) / 255, intensity, z);
      vector = light.color; return light;
    }, removeLight() {},
  } };
  const view = createStage5View(scene), arena = {};
  if (mode === 'oak') arena.oak = { x: 4560, y: 630, open: true, light: true };
  if (mode === 'flare') arena.surge = { phase: 'hot' };
  view.sync({ s: scene, arena });
  assert.equal(view.eye.color, vector);
  assert.ok([vector.r, vector.g, vector.b].every(Number.isFinite));
  const expected = mode === 'oak' ? 0xc8f080 : mode === 'flare' ? 0xfff0c0 : 0xffe090;
  assert.equal(vector.r, ((expected >>> 16) & 255) / 255);
  assert.equal(vector.g, ((expected >>> 8) & 255) / 255);
  assert.equal(vector.b, (expected & 255) / 255);
  view.destroy();
});
