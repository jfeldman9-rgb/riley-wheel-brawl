import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { Stage3Kit } from '../src/stage3.js';
import { budgetStage3Lights, stageLightLine } from '../src/stage3-lights.js';

// Run the shipped Phaser selector: a headless light count alone misses its
// distance culling when an unbudgeted sun pushes the renderer over maxLights.
const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
const begin = source.indexOf('var t='), end = source.lastIndexOf(',e={};function i(');
const modules = runInNewContext(`(${source.slice(begin + 6, end)})`, {}, { timeout: 1000 });
const cache = new Map();
const load = id => {
  if (!cache.has(id)) { const m = { exports: {} }; cache.set(id, m); modules[id](m, m.exports, load); }
  return cache.get(id).exports;
};
let definition;
modules[61356]({ exports: {} }, {}, id => {
  if (id === 19186) { const m = { exports: {} }; modules[id](m, m.exports, () => ({ features: { stableSort: false } })); return m.exports; }
  if (id === 83419) return function Capture(def) { definition = def; return function() {}; };
  if (id === 81491 || id === 20339) return load(id);
  return function() { throw new Error(`Unexpected Phaser dependency ${id}`); };
});
const cam = { worldView: { x: 0, y: 0, width: 1280, height: 720, centerX: 640, centerY: 360 } };

for (const cap of [10, 6]) test(`Balefire preserves Riley's renderer light with the sun and a ${cap}-light cap`, () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s, 40);
    s.kit.destroy();
    const get = s.cache.json.get.bind(s.cache.json);
    const cfg = JSON.parse(readFileSync('assets/bg3/lights.json'));
    s.cache.json.get = key => key === 'lights3' ? cfg : get(key);
    const kit = s.kit = new Stage3Kit(s); kit.build();
    const all = new Set([s.heroLight, kit.sun, s.fx.hitLight]);
    const add = s.lights.addLight.bind(s.lights), remove = s.lights.removeLight.bind(s.lights);
    s.lights.addLight = (...args) => { const L = add(...args); all.add(L); return L; };
    s.lights.removeLight = L => { all.delete(L); return remove(L); };
    s.lights.getMaxVisibleLights = () => cap;
    // Enough accumulated pickup lights to fill the default budget alongside the
    // hero, beam and impact. Sun + these ten used to reach eleven candidates.
    for (let i = 0; i < 7; i++) s.dropPickup(500 + i * 20, 610, 'heal');
    placeC(s, 450);
    s.riley.face(1); s.riley.startBalefire(); s.fireBalefire(s.riley);
    s.heroLight.x = s.riley.x - 90; s.heroLight.y = s.riley.y - 300;
    s.fx.hitLight.intensity = 1;
    const select = () => {
      for (const L of all) L.willRender = function() { return this.visible; };
      return new Set(definition.getLights.call({ lights: [...all], maxLights: cap, sortByDistance: definition.sortByDistance }, cam).map(v => v.light));
    };
    kit.applyLightBudget();
    assert.ok(select().has(s.heroLight), 'Phaser must select the hero even at the left wall');
    assert.ok([...all].filter(L => L.visible).length <= cap, 'sun participates in the budget');
    const beamLights = [...s.beam.lights];
    s.endBalefire(); s.updateBalefire(0.3); kit.applyLightBudget();
    assert.equal(s.beam, null);
    assert.ok(all.has(s.heroLight)); assert.ok(select().has(s.heroLight));
    for (const L of beamLights) assert.ok(!all.has(L));
    s.powers.activate('fireshield'); kit.applyLightBudget();
    assert.ok(select().has(s.powers.shield.L), 'fear-dispelling shield light remains selected');
    s.powers.clearAll(); kit.applyLightBudget();
    assert.ok(select().has(s.heroLight), 'light pool recovers after effect cleanup');
  } finally { h.destroy(); }
}));

test('a 3-light cap keeps the hero, one dispel light and the hit flash, and booms sit below patches', () => {
  const lamp = (intensity = 1) => ({ intensity, visible: true, setVisible(v) { this.visible = v; } });
  const hero = lamp(), bolt = lamp(), hit = lamp(), patch = lamp(), pickup = lamp(), boom = lamp(), wall = lamp(), sun = lamp();
  const lights = [hero, bolt, hit, patch, pickup, boom, wall, sun];
  const restore = () => { for (const L of lights) L.visible = true; };
  let cap = 3;
  const s = {
    stageNo: 3,
    heroLight: hero,
    powers: { bolts: [{ L: bolt }] },
    fireballs: [],
    fx: { hitLight: hit, booms: [{ L: boom }] },
    patches: [{ L: patch }],
    pickups: [{ L: pickup }],
    fires: [wall],
    lights: { getMaxVisibleLights: () => cap },
  };
  const kit = { s, torches: [], sun };
  s.kit = kit;
  const visible = () => lights.filter(L => L.visible);
  restore();
  budgetStage3Lights(kit);
  assert.deepEqual(visible(), [hero, bolt, hit]);
  assert.equal(kit.lightBudget.active, 3);
  assert.equal(kit.lightBudget.candidates, 8);
  assert.equal(kit.lightBudget.cap, 3);
  assert.equal(kit.lightBudget.peak, 8);
  cap = 6;
  restore();
  budgetStage3Lights(kit);
  assert.deepEqual(visible(), [hero, bolt, hit, patch, pickup, boom]);
  assert.equal(wall.visible, false);
  assert.equal(sun.visible, false);
  assert.ok(kit.lightBudget.peak >= kit.lightBudget.candidates);
  boom.intensity = wall.intensity = sun.intensity = 0;
  restore();
  budgetStage3Lights(kit);
  assert.equal(kit.lightBudget.candidates, 5);
  assert.equal(kit.lightBudget.peak, 8);
  assert.equal(boom.visible, false);
  assert.equal(wall.visible, false);
  assert.equal(sun.visible, false);
  assert.equal(stageLightLine(s), 'L 5/5/6 pk 8');
});
