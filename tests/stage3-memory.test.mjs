// Stage 3 texture budget, stage-switch residency, and restart/zone leak gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { dimensions } from '../tools/audit-stage1.mjs';
import { stage3Simulation, withSeed } from './helpers/stage3-harness.mjs';

const { Stage1 } = await import('../src/stage1.js');
const { STAGE_CHARS, STAGE_TEXTURES } = await import('../src/stages.js');
const { budgetStage3Lights, stage3Threats } = await import('../src/stage3-lights.js');
const { installStage3Suspension } = await import('../src/stage3-suspension.js');

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const json = path => JSON.parse(read(path));
const MB = 1024 * 1024;

function charMeta(key) {
  const dir = ['riley3', 'cutthroat', 'fade'].includes(key) ? 'assets/stage3/chars' : 'assets/chars';
  return json(`${dir}/${key}.anims.json`);
}

test('Stage 3 resident texture estimate (colour, _n and _nl pages, plus plates) is at most 110 MB', t => {
  let bytes = 0;
  for (const key of ['cutthroat', 'fade', 'riley3']) {
    for (const page of charMeta(key).pages) {
      for (const suffix of ['', '_n', '_nl']) {
        const file = `assets/stage3/chars/${page}${suffix}.webp`;
        const [w, h] = dimensions(read(file));
        bytes += w * h * 4;
      }
    }
  }
  for (const name of readdirSync(new URL('../assets/bg3/', import.meta.url))) {
    if (!/\.(webp|jpg|png)$/.test(name)) continue;
    const [w, h] = dimensions(read('assets/bg3/' + name));
    bytes += w * h * 4;
  }
  t.diagnostic(`Stage 3 pages + plates RGBA8 ${(bytes / MB).toFixed(2)} MB`);
  assert.ok(bytes <= 110 * MB, `resident estimate ${bytes} exceeds 110 MB`);
});

test('switching stages 1 → 3 → 2 → 3 → 1 leaves only the current stage art resident', () => {
  const kitKeys = ['raindrop', 'lanemark', 'guardmark', 'landing', 'ring'];
  const extras = stage => (stage === 1 ? [] : ['arrow', 'ribbon', ...kitKeys]);
  const keysFor = stage => {
    const keys = new Set([...(STAGE_TEXTURES[stage] || []), ...extras(stage)]);
    for (const key of STAGE_CHARS[stage] || []) {
      for (const page of charMeta(key).pages) { keys.add(page); keys.add(page + '_nl'); }
    }
    return keys;
  };
  const resident = new Set(keysFor(1));
  const scene = {
    textures: {
      exists: key => resident.has(key),
      remove: key => { resident.delete(key); },
    },
    anims: { exists: () => false, remove() {} },
    cache: { json: { get: key => charMeta(key.replace(/\.A$/, '')) } },
  };
    const go = (to, from) => {
    Stage1.prototype.releaseStage.call(scene, to, from);
    for (const key of keysFor(to)) resident.add(key);
    for (const stage of [1, 2, 3]) if (stage !== to) {
      for (const key of keysFor(stage)) {
        if (keysFor(to).has(key)) continue;
        assert.equal(resident.has(key), false, `${key} from stage ${stage} still resident on stage ${to}`);
      }
    }
    for (const key of STAGE_TEXTURES[to]) assert.equal(resident.has(key), true, `${key} released while on stage ${to}`);
  };
  go(3, 1);
  go(2, 3);
  go(3, 2);
  go(1, 3);
  for (const key of ['arrow', 'ribbon', ...kitKeys]) assert.equal(resident.has(key), false, `${key} survived the return to stage 1`);
});

test('three Stage 3 restarts and zone changes return listeners and resources to baseline', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '1', followRestart: true });
  const s = h.s;
  const listeners = () => ({
    key: s.inp.listeners.key?.length || 0,
    press: s.inp.listeners.press?.length || 0,
    shutdown: s.events.listenerCount('shutdown'),
  });
  try {
    const baseListeners = listeners();
    const settle = () => {
      s.scene.restart({ stage: 3, autostart: true });
      h.step();
      for (let i = 0; i < 40 && !s.started; i++) h.step();
      assert.equal(s.started, true);
    };
    settle();
    const base = h.resources();
    for (let n = 0; n < 3; n++) {
      for (let i = 0; i < 180; i++) h.step();
      s.continueGame();
      settle();
      assert.deepEqual(h.resources(), base, `resources after restart ${n}`);
      assert.deepEqual(listeners(), baseListeners, `listeners after restart ${n}`);
    }
    const zones = new Set([s.zoneI]);
    for (let i = 0; i < 6000 && zones.size < 3; i++) {
      h.step();
      if (s.zoneI !== undefined) zones.add(s.zoneI);
      assert.deepEqual(listeners(), baseListeners);
    }
    assert.ok(zones.size >= 2, `expected a zone transition, saw ${[...zones]}`);
    settle();
    assert.deepEqual(h.resources(), base, 'resources after zone transitions');
    assert.deepEqual(listeners(), baseListeners);
  } finally { h.destroy(); }
}));

test('Stage 3 light budget and threat reads reuse one record', () => withSeed(2, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const kit = h.s.kit;
    budgetStage3Lights(kit);
    const budget = kit.lightBudget, lights = kit._budgetLights, seen = kit._budgetSeen;
    const threats = stage3Threats(kit);
    for (let i = 0; i < 30; i++) {
      budgetStage3Lights(kit);
      assert.equal(stage3Threats(kit), threats);
    }
    assert.equal(kit.lightBudget, budget);
    assert.equal(kit._budgetLights, lights);
    assert.equal(kit._budgetSeen, seen);
    kit.tiles.push({ bands: [0], markers: [] });
    assert.equal(threats.tiles, kit.tiles);
    assert.equal(threats.tiles.length, 1);
    kit.tiles.length = 0;
  } finally { h.destroy(); }
}));

test('hidden and blur listeners do not accumulate across Stage 3 suspend cycles', () => {
  const events = new EventEmitter();
  const s = { game: { events, hasFocus: true }, setPauseReason() {} };
  const count = () => ['hidden', 'visible', 'blur', 'focus'].reduce((n, ev) => n + events.listenerCount(ev), 0);
  assert.equal(count(), 0);
  for (let i = 0; i < 6; i++) {
    const off = installStage3Suspension(s);
    assert.equal(count(), 4);
    off();
    assert.equal(count(), 0);
  }
});
