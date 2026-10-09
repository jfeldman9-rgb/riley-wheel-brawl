import test from 'node:test';
import assert from 'node:assert/strict';
import { stage5Simulation, withSeed } from './helpers/stage5-harness.mjs';
import { BalthamelActor, StalkerActor, SporepodActor, AginorActor } from '../src/stage5-actors.js';
import { createStage5View } from '../src/stage5-view.js';

const run = fn => withSeed(1, () => { const h = stage5Simulation({ mode: null }); try { fn(h, h.s); } finally { h.destroy(); } });
function eye(s) {
  for (const e of s.enemies) e.destroy(); s.enemies = [];
  s.zoneI = 3; s.zone = s.zones[3]; s.bounds = { l: 3920, r: 5200 }; s.camX = s.camMax = 3920;
  s.riley.x = 4400; s.boss = new AginorActor(s, 4800, 630); s.boss.phase = 2; s.boss.hp = 198;
  const b = new BalthamelActor(s, 4440, 630); b.z = 0; b.state = 'idle';
  s.kit.ensureArena(); return b;
}

test('Green Man freezes Riley, combat projectiles and hazard clocks, then resumes once', () => run((h, s) => {
  const b = eye(s); b.catch(s.riley);
  s.spores = [{ alive: true, x: 4200, y: 630, tx: 4400, ty: 630, r: 90, t: 0.9, flight: 1 }];
  s.clouds = [{ x: 4400, y: 630, r: 90, t: 2 }];
  s.kit.startBeat(s.boss);
  assert.equal(s.riley.grabbedBy, null);
  const x = s.riley.x, st = s.riley.st, inv = s.riley.inv;
  s.inp.demo = { x: 1, y: 0, attack: true };
  for (let i = 0; i < 60; i++) h.step();
  assert.equal(s.riley.x, x); assert.equal(s.riley.st, st); assert.equal(s.riley.inv, inv);
  assert.equal(s.spores[0].t, 0.9); assert.equal(s.clouds[0].t, 2);
  assert.equal(s.kit.stats.greenman, 1);
  for (let i = 0; i < 90; i++) h.step();
  assert.equal(s.boss.phase, 3); assert.equal(s.kit.arena.frozen, false);
  assert.equal(s.kit.stats.greenman, 1); assert.equal(b.alive, false);
}));

test('beat pauses scene timers and animations and restores them on disposal', () => run((h, s) => {
  eye(s); s.time.paused = false; s.anims.globalTimeScale = 0.25;
  s.kit.startBeat(s.boss);
  assert.equal(s.time.paused, true); assert.equal(s.anims.globalTimeScale, 0);
  s.kit.clearHazards();
  assert.equal(s.time.paused, false); assert.equal(s.anims.globalTimeScale, 0.25);
}));

test('pause freezes the embrace and unpause keeps Riley held', () => run((h, s) => {
  const b = new BalthamelActor(s, 220, 630); b.z = 0; b.catch(s.riley);
  const hp = s.riley.hp, st = b.st, mash = b.mashN, chip = b.chipT;
  s.setPauseReason('manual', true);
  for (let i = 0; i < 180; i++) h.step();
  assert.equal(s.paused, true);
  assert.equal(s.riley.grabbedBy, b);
  assert.equal(b.state, 'holding');
  assert.equal(b.st, st);
  assert.equal(b.mashN, mash);
  assert.equal(b.chipT, chip);
  assert.equal(s.riley.hp, hp);
  s.onPress('pause');
  assert.equal(s.paused, false);
  assert.equal(s.riley.grabbedBy, b);
  assert.equal(b.state, 'holding');
  for (let i = 0; i < 6; i++) assert.equal(b.mash(), false);
  assert.equal(b.mash(), true);
  assert.equal(s.riley.grabbedBy, null);
  assert.equal(b.state, 'shoved');
}));

for (const exit of ['down', 'respawn', 'continue', 'clear', 'destroy', 'death']) test(`hold releases synchronously on ${exit}`, () => run((h, s) => {
  const b = new BalthamelActor(s, 220, 630); b.z = 0; b.catch(s.riley);
  if (exit === 'down') s.riley.setState('down', 'knockdown');
  if (exit === 'respawn') s.riley.respawn();
  if (exit === 'continue') { s.gameOver = true; s.continueGame(); }
  if (exit === 'clear') s.kit.clearHazards();
  if (exit === 'destroy') b.destroy();
  if (exit === 'death') { b.hp = 0; b.fall(); }
  assert.equal(s.riley.grabbedBy, null);
  assert.notEqual(b.state, 'holding'); assert.notEqual(b.state, 'lunge');
  assert.equal(s.grabBusy({}), false); assert.equal(s.attackTokens(), 0);
}));

for (const dt of [NaN, Infinity, -1, 0]) test(`Balthamel actor rejects dt ${dt}`, () => run((h, s) => {
  const b = new BalthamelActor(s, 300, 630); b.vx = 100;
  const before = [b.x, b.z, b.vz, b.vx, b.st];
  b.update(dt); b.physics(dt);
  assert.deepEqual([b.x, b.z, b.vz, b.vx, b.st], before);
}));

for (const type of ['stalker', 'sporepod']) test(`${type} never places directly on Riley`, () => run((h, s) => {
  s.zoneI = 0; s.zone = s.zones[0];
  const spot = s.kit.lay[type === 'stalker' ? 'lurks' : 'pods'][0];
  s.riley.x = spot.x; s.riley.y = spot.y;
  const e = type === 'stalker' ? new StalkerActor(s, -120, 630) : new SporepodActor(s, 300, 630);
  if (type === 'sporepod') e.dropIn();
  assert.ok(Math.hypot(e.x - s.riley.x, e.y - s.riley.y) >= 120);
}));

test('view destruction removes its lights, visuals and glimpse timer without Phaser shutdown', () => run((h, s) => {
  const v = s.kit.view; s.zoneI = 3; v.sync(s.kit); v.glimpse();
  const before = h.resources(); v.destroy();
  const after = h.resources();
  assert.ok(after.lights <= before.lights - 2);
  assert.ok(after.visuals < before.visuals);
  assert.ok(after.timers < before.timers);
}));

test('hazard view draws world telegraphs for hands, ring, spores and shadow-step', () => {
  const calls = [];
  const g = new Proxy({}, { get: (_, key) => (...args) => { calls.push([key, ...args]); return g; } });
  const scene = { zoneI: 3, add: { graphics: () => g }, enemies: [{ type: 'balthamel', state: 'step', dest: { x: 500, y: 630 } }], spores: [{ tx: 700, ty: 630, r: 90, t: 0.2, flight: 1 }], clouds: [], fx: {}, lightsOn: false };
  const view = createStage5View(scene);
  view.sync({ s: scene, blight: { trees: [], thorns: [], seeps: [] }, arena: { hands: [{ x: 300, y: 630, st: 0.3 }], ring: { x: 900, y: 630, r: 100, phase: 'grow' } } });
  for (const x of [300, 500, 700, 900]) assert.ok(calls.some(c => c[0] === 'strokeCircle' && c[1] === x), `tell at ${x}`);
});
