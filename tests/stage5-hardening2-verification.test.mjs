import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stage5Simulation, withSeed } from './helpers/stage5-harness.mjs';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { BalthamelActor, AginorActor } from '../src/stage5-actors.js';
import { Stalker, Sporepod } from '../src/blightspawn.js';

for (const hz of [30, 60, 120]) test(`held mash input counts once and seven fresh presses escape at ${hz} Hz`, () => withSeed(1, () => {
  const h = stage5Simulation({ mode: null });
  try {
    const s = h.s, R = s.riley, b = new BalthamelActor(s, R.x + 60, R.y); b.z = 0;
    b.catch(R); s.inp.held.attack = true; s.inp.press('attack');
    for (let i = 0; i < hz / 4; i++) { s.inp.update(1 / hz); R.grabbed(1 / hz, s.inp); }
    assert.equal(b.mashN, 1);
    for (let i = 0; i < 6; i++) { s.inp.press('attack'); R.grabbed(1 / hz, s.inp); }
    assert.equal(R.grabbedBy, null); assert.equal(b.state, 'shoved');
    assert.equal(s.attackTokens(), 0); assert.equal(s.grabBusy({}), false);
  } finally { h.destroy(); }
}));

test('live stalker and pod caps survive repeated spawns', () => withSeed(1, () => {
  const h = stage5Simulation({ mode: null });
  try {
    for (let i = 0; i < 8; i++) { new Stalker(h.s, 500, 630); new Sporepod(h.s, 800, 630); }
    assert.equal(h.s.enemies.filter(e => e.alive && e.type === 'stalker').length, 2);
    assert.equal(h.s.enemies.filter(e => e.alive && e.type === 'sporepod').length, 3);
  } finally { h.destroy(); }
}));

test('Stage 4 continues into Stage 5 once with fresh score, lives, kit and listeners', () => withSeed(1, () => {
  const h = stage4Simulation({ mode: null, followRestart: true });
  try {
    const s = h.s, oldKit = s.kit, oldRiley = s.riley;
    oldRiley.score = 12345; oldRiley.lives = 1;
    s.ended = s.clearShown = true; s.inp.press('attack'); h.step();
    for (let i = 0; i < 40; i++) h.step();
    assert.equal(s.stageNo, 5); assert.equal(s.riley.score, 0); assert.equal(s.riley.lives, 3);
    assert.notEqual(s.kit, oldKit); assert.notEqual(s.riley, oldRiley);
    assert.equal(oldKit.hooks.length, 0);
    assert.equal(s.inp.listeners.press.length, 1);
    assert.deepEqual(h.observations.restartData, [{ stage: 5, fromStage4: true, autostart: true }]);
    assert.equal(s.kit.arena, null); assert.deepEqual(s.spores, []); assert.deepEqual(s.clouds, []);
  } finally { h.destroy(); }
}));

for (const target of [1, 5]) test(`restart to stage ${target} during the beat releases holds and restores hooks`, () => withSeed(1, () => {
  const h = stage5Simulation({ mode: null, followRestart: true });
  try {
    const s = h.s, kit = s.kit, R = s.riley;
    s.zoneI = 3; s.zone = s.zones[3]; s.boss = new AginorActor(s, 4800, 630); s.boss.phase = 2;
    const b = new BalthamelActor(s, R.x + 50, R.y); b.catch(R);
    kit.startBeat(s.boss); s.scene.restart({ stage: target }); h.step();
    assert.equal(R.grabbedBy, null); assert.equal(kit.hooks.length, 0);
    assert.equal(s.stageNo, target); assert.equal(s.inp.listeners.press.length, 1);
    assert.equal(s.riley.fogSlow || 0, 0);
  } finally { h.destroy(); }
}));

test('new Stage 5 source avoids Safari 15 unsupported syntax and APIs', () => {
  const dir = new URL('../src/', import.meta.url);
  const names = readdirSync(dir).filter(n => /^stage5.*\.js$/.test(n) || ['aginor.js', 'balthamel.js', 'blightspawn.js', 'bot-stage5.js'].includes(n));
  for (const name of names) {
    const source = readFileSync(new URL(name, dir), 'utf8');
    assert.doesNotMatch(source, /\.at\s*\(|\.findLast(?:Index)?\s*\(|\bstructuredClone\s*\(|Object\.hasOwn\s*\(|\bstatic\s*\{|\(\?<[=!]/, name);
  }
});
