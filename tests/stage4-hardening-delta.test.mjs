import test from 'node:test';
import assert from 'node:assert/strict';
import { kissScene } from './helpers/stage4-hardening-scene.mjs';
import { createFog } from '../src/stage4-hazards.js';
import { createTowers } from '../src/stage4-towers.js';
import { createArena } from '../src/stage4-arena.js';
import { Cultist, updateFogBolts } from '../src/cultists.js';
import { Draghkar } from '../src/draghkar.js';

for (const dt of [NaN, -1, 0, Infinity, -Infinity]) test(`invalid/zero dt ${dt} is inert in every Stage 4 clock`, () => {
  const R = { x: 800, y: 630, hp: 100, alive: true, state: 'idle' }, s = { riley: R, enemies: [], fogBolts: [] };
  const fog = createFog(), v = fog.addVent({ x: 0, y: 630 }); fog.tryEmit(v, s);
  const towers = createTowers(); towers.arm(2); towers.setWall({ x: 0, zoneL: 0, zoneR: 1280 });
  const arena = createArena({ left: 0, right: 1280 });
  const cult = new Cultist(s, 500, 630); cult.startChant();
  const d = new Draghkar(s); d.state = 'croon'; d.phase = 2;
  const bolt = { x: 0, y: 630, vx: 260, t: 0, alive: true }; s.fogBolts.push(bolt);
  const snap = () => [R.x, R.hp, v.ticks, towers.zoneWall.x, towers.towers[0].t, arena.left, arena.right, arena.swoop, cult.x, cult.st, cult.shoveCool, d.x, d.st, d.accum, bolt.x, bolt.t];
  const before = snap(); fog.step(dt, s); towers.step(dt, s); arena.step(dt, s); cult.update(dt); d.update(dt); updateFogBolts(s, dt);
  assert.deepEqual(snap(), before);
});
test('kit and actor physics reject invalid deltas before any position or timer changes', () => {
  const c = kissScene();
  try {
    c.s.kit._zone = c.s.zoneI; c.s.kit._wave = c.s.wave;
    c.d.vx = 50;
    for (const dt of [NaN, -1, 0, Infinity]) {
      const before = [c.d.x, c.d.vx, c.d.st, c.R.x, c.R.hp];
      c.d.update(dt); c.d.physics(dt); c.s.kit.update(dt);
      assert.deepEqual([c.d.x, c.d.vx, c.d.st, c.R.x, c.R.hp], before);
    }
  } finally { c.h.destroy(); }
});
test('Stage 4 scene update rejects bad browser deltas and clamps tab-resume time', () => {
  const c = kissScene();
  try {
    c.s.bot = null;
    for (const ms of [NaN, -1, 0, Infinity]) {
      const before = [c.R.x, c.R.hp, c.R.st, c.d.st]; c.s.update(c.s.time.now, ms);
      assert.deepEqual([c.R.x, c.R.hp, c.R.st, c.d.st], before);
    }
    c.s.update(c.s.time.now, 1e100);
    assert.ok(c.R.st <= 0.05); assert.ok(Number.isFinite(c.R.x)); assert.ok(Number.isFinite(c.d.st));
  } finally { c.h.destroy(); }
});
test('paused and story scenes cannot advance a croon, chant or projectile', () => {
  const c = kissScene();
  try {
    c.d.startCroon(); const x = c.R.x, st = c.d.st;
    c.s.paused = true; c.d.update(2); assert.equal(c.R.x, x); assert.equal(c.d.st, st);
    const cult = new Cultist(c.s, 0, 630); cult.startChant();
    c.s.fogBolts.push({ x: 0, y: 630, vx: 260, t: 0, alive: true });
    cult.update(1); updateFogBolts(c.s, 1); assert.equal(cult.st, 0); assert.equal(c.s.fogBolts[0].x, 0);
    c.s.paused = false; c.s.cutscene = {}; c.d.update(2); cult.update(1); updateFogBolts(c.s, 1);
    assert.equal(c.R.x, x); assert.equal(c.d.st, st); assert.equal(cult.st, 0); assert.equal(c.s.fogBolts[0].x, 0);
    c.s.cutscene = null;
  } finally { c.h.destroy(); }
});
test('huge finite direct deltas stay bounded and finite in every core', () => {
  const R = { x: 800, y: 630, hp: 100, alive: true, state: 'idle' }, s = { riley: R, enemies: [], fogBolts: [] };
  const fog = createFog(), v = fog.addVent({ x: 0, y: 630 }); fog.tryEmit(v, s); fog.step(1e100, s);
  const towers = createTowers(); towers.arm(2); towers.setWall({ x: 0, zoneL: 0, zoneR: 1280 }); towers.step(1e100, s);
  const arena = createArena({ left: 0, right: 1280 }); arena.step(1e100, s); assert.ok(arena.width >= 640);
  const cult = new Cultist(s, 400, 630); cult.startChant(); cult.update(1e100);
  const d = new Draghkar(s); d.update(1e100);
  s.fogBolts.push({ x: 0, y: 630, vx: 260, t: 0, alive: true }); updateFogBolts(s, 1e100);
  assert.ok([R.x, R.hp, towers.zoneWall.x, arena.left, arena.right, cult.x, cult.st, d.x, d.st, d.accum].every(Number.isFinite));
  assert.equal(s.fogBolts.length, 0);
});
