import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { DraghkarActor } from '../src/stage4-actors.js';
import { createArena } from '../src/stage4-arena.js';
import { createFog } from '../src/stage4-hazards.js';
import { Cultist } from '../src/cultists.js';

for (const state of ['tendril', 'collapse', 'kiss', 'croon', 'P3']) test(`shutdown during ${state} releases resources and scene hooks`, () => {
  const h = stage4Simulation({ mode: null }), s = h.s, k = s.kit, R = s.riley;
  try {
    s.enemies = []; s.zoneI = 3; s.zone = { l: 0, r: 1280, boss: true }; R.x = 740; R.y = 630; R.z = 0; R.setState('idle', 'idle');
    const d = new DraghkarActor(s, 700, 630); s.boss = d; d.phase = 2; d.hp = 300; d.kissBetweenAction = true;
    if (state === 'kiss') { d.startKiss(); d.update(0.61); d.update(0.05); assert.equal(R.grabbedBy, d); }
    if (state === 'croon') d.startCroon();
    if (state === 'P3') k.arena = createArena();
    if (state === 'collapse') { k.towers.arm(2); k.towers.setWave(0); k.towers.step(2, k.world()); }
    if (state === 'tendril') { const v = k.fog.addVent({ x: 0, y: 630, zone: 3 }); k.fog.tryEmit(v, k.world()); k.fog.step(0.8, k.world()); }
    h.destroy();
    assert.deepEqual(h.resources(), { visuals: 0, lights: 0, timers: 0, tweens: 0 });
    assert.equal(R.grabbedBy, null); assert.equal(k.fog.vents.length, 0); assert.equal(k.towers.towers.length, 0); assert.equal(k.arena?.active || false, false);
    for (const key of ['update', 'rileyDied', 'callLoial']) assert.equal(Object.prototype.hasOwnProperty.call(s, key), false, key);
    assert.equal(Object.prototype.hasOwnProperty.call(R, 'setState'), false);
  } finally { h.destroy(); }
});
test('restart and Stage 4 to Stage 1 switch reapply/remove only the new scene\'s hooks', () => {
  const h = stage4Simulation({ mode: null, followRestart: true }), s = h.s;
  try {
    const retired = s.kit, R = s.riley;
    s.scene.restart({ stage: 4 }); h.step(); s.start();
    assert.equal(retired.hooks.length, 0); assert.notEqual(s.riley, R);
    assert.equal(Object.prototype.hasOwnProperty.call(R, 'setState'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(s, 'update'), true);
    s.scene.restart({ stage: 1 }); h.step();
    assert.equal(s.stageNo, 1); assert.equal(s.kit, null);
    for (const key of ['update', 'rileyDied', 'callLoial']) assert.equal(Object.prototype.hasOwnProperty.call(s, key), false, key);
  } finally { h.destroy(); }
});
test('a lethal fog knock impulse retires a chanting cultist synchronously', () => {
  const fog = createFog(), R = { x: 800, y: 630, hp: 100, alive: true, state: 'idle' }, s = { riley: R, enemies: [] };
  const c = new Cultist(s, 400, 630); c.hp = 20; c.knocked = true; c.startChant();
  const v = fog.addVent({ x: 0, y: 630, zone: 1 }); fog.tryEmit(v, s); fog.step(0.8, s); fog.tendrils[0].tip.x = c.x;
  fog.step(1 / 120, s); assert.equal(c.hp, 0); assert.equal(c.alive, false); assert.notEqual(c.state, 'chant');
});
test('clearing a kiss tell releases its reserved token immediately', () => {
  const h = stage4Simulation({ mode: null }), s = h.s;
  try {
    s.enemies = []; s.riley.x = 740; s.riley.setState('idle', 'idle');
    const d = new DraghkarActor(s, 700, s.riley.y); s.boss = d; d.phase = 2; d.kissBetweenAction = true;
    assert.equal(d.startKiss(), true); assert.equal(s.attackTokens(), s.maxTokens);
    s.kit.clearHazards(); assert.equal(s.attackTokens(), 0);
  } finally { h.destroy(); }
});
