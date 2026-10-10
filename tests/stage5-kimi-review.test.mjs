// Regressions for the Kimi review of the Stage 5 core files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { stage5Simulation, withSeed } from './helpers/stage5-harness.mjs';
import { Aginor } from '../src/aginor.js';
import { createArena } from '../src/stage5-arena.js';
import { AginorActor, BalthamelActor } from '../src/stage5-actors.js';
import { clearStage5Zone, installStage5SceneHooks, restoreStage5Hooks } from '../src/stage5-lifecycle.js';
import { queuePainted, paintStage5Art, freeStory5 } from '../src/stage5-art.js';
import { bark } from '../src/stage5-voice.js';

const run = fn => withSeed(1, () => { const h = stage5Simulation({ mode: null }); try { fn(h, h.s); } finally { h.destroy(); } });

function bare() {
  const riley = { x: 800, y: 630, z: 0, hp: 80, alive: true, state: 'idle', facing: 1, grabbedBy: null, fogSlow: 0 };
  const scene = { riley, enemies: [], koCount: 0, bounds: { l: 0, r: 4000 }, paused: false, time: { now: 0, paused: false }, anims: { globalTimeScale: 1 }, tweens: { timeScale: 1 } };
  return { scene, riley };
}
function eye(s) {
  for (const e of s.enemies) e.destroy(); s.enemies = [];
  s.zoneI = 3; s.zone = s.zones[3]; s.bounds = { l: 3920, r: 5200 }; s.camX = s.camMax = 3920;
  s.riley.x = 4400; s.boss = new AginorActor(s, 4800, 630); s.boss.phase = 2; s.boss.hp = 198;
  const b = new BalthamelActor(s, 4440, 630); b.z = 0; b.state = 'idle';
  s.kit.ensureArena(); return b;
}
function fakeCanvas() {
  const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() {} }) : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
  return { width: 0, height: 0, getContext: () => ctx };
}

test('a beat callback that never freezes still lifts the 33% floor', () => {
  const { scene } = bare();
  let beats = 0;
  const a = new Aginor(scene, 1200, 630, { onBeat() { beats++; } });
  a.phase = 2; a.hp = 300; a.p2t = 50; a.state = 'idle';
  a.update(1 / 60);
  assert.equal(beats, 1);
  assert.equal(a.beatFired, true);
  assert.equal(a.beatDone, true);
  assert.equal(a.phase, 2);
  assert.equal(a.hp, 300);
  a.takeHit({ dmg: 99999 });
  assert.equal(a.phase, 3);
  assert.equal(a.hp, Math.floor(a.maxHp * 0.33));
  a.takeHit({ dmg: 99999 });
  assert.equal(a.state, 'burn');
  assert.equal(a.hp, 0);
});

test('a freezing beat stays invulnerable until the cinematic marks it', () => {
  const { scene } = bare();
  let frozen = false, beats = 0;
  const a = new Aginor(scene, 1200, 630, { frozen: () => frozen, onBeat() { frozen = true; beats++; a.invuln = true; a.beatFired = true; } });
  a.phase = 2; a.hp = 198; a.p2t = 50;
  a.update(1 / 30);
  assert.equal(beats, 1);
  assert.equal(a.beatDone, false);
  assert.equal(a.invuln, true);
  assert.equal(a.takeHit({ dmg: 99999 }), false);
  assert.equal(a.hp, 198);
  assert.equal(a.phase, 2);
});

test('disposing a live beat still opens phase 3 on the next update', () => {
  const { scene, riley } = bare();
  const world = { scene, riley, aginor: null, balthamel: null, onGreen() {}, onBeatEnd() {} };
  const arena = createArena(world);
  const a = new Aginor(scene, 2000, 630, { frozen: () => arena.frozen });
  world.aginor = a;
  a.phase = 2; a.hp = 198;
  assert.equal(arena.startBeat(a, null, world), true);
  assert.equal(a.beatFired, true);
  assert.equal(a.beatDone, false);
  assert.equal(scene.time.paused, true);
  assert.equal(a.takeHit({ dmg: 40 }), false);
  arena.dispose();
  assert.equal(scene.time.paused, false);
  assert.equal(scene.anims.globalTimeScale, 1);
  assert.equal(a.beatDone, false);
  assert.equal(a.invuln, true);
  a.update(1 / 60);
  assert.equal(a.beatDone, true);
  assert.equal(a.invuln, false);
  assert.equal(a.phase, 3);
  a.takeHit({ dmg: 99999 });
  assert.equal(a.state, 'burn');
});

test('death during a beat resumes the scene clock, and quit restores animation time', () => run((h, s) => {
  eye(s);
  s.time.paused = false; s.anims.globalTimeScale = 1; s.tweens.timeScale = 1;
  s.kit.startBeat(s.boss);
  assert.equal(s.time.paused, true);
  assert.equal(s.anims.globalTimeScale, 0);
  assert.equal(s.tweens.timeScale, 0);
  s.rileyDied();
  assert.equal(s.time.paused, false);
  assert.equal(s.anims.globalTimeScale, 0);
  assert.equal(s.tweens.timeScale, 0);
  s.kit.destroy();
  assert.equal(s.time.paused, false);
  assert.equal(s.anims.globalTimeScale, 1);
  assert.equal(s.tweens.timeScale, 1);
}));

test('restart during a beat does not boot the next fight with a frozen clock', () => run((h, s) => {
  eye(s);
  s.time.paused = false; s.anims.globalTimeScale = 1; s.tweens.timeScale = 1;
  s.kit.startBeat(s.boss);
  s.scene.restart({ stage: 5 });
  h.step();
  assert.equal(h.s.time.paused, false);
  assert.equal(h.s.anims.globalTimeScale, 1);
  assert.equal(h.s.tweens.timeScale, 1);
  assert.equal(!!h.s.kit.arena?.frozen, false);
}));

test('a painted load error drops that key and the painter fills it', () => {
  const keys = new Set();
  const loadEvents = new EventEmitter();
  const sceneEvents = new EventEmitter();
  const scene = {
    textures: {
      exists: k => keys.has(k),
      remove(k) { keys.delete(k); },
      addCanvas(key) { keys.add(key); return { add() {} }; },
    },
    load: {
      on: (e, fn) => loadEvents.on(e, fn),
      off: (e, fn) => loadEvents.off(e, fn),
      once: (e, fn) => loadEvents.once(e, fn),
      atlas() {}, image() {}, spritesheet() {},
    },
    events: sceneEvents,
  };
  queuePainted(scene);
  keys.add('s5agin'); keys.add('s5balt'); keys.add('aginorPortrait'); keys.add('crate');
  let seen = 0;
  loadEvents.on('loaderror', () => { seen++; });
  loadEvents.emit('loaderror', { key: 's5agin' });
  loadEvents.emit('loaderror', { key: 'json', multiFile: { key: 's5balt' } });
  loadEvents.emit('loaderror', { key: 'aginorPortrait' });
  loadEvents.emit('loaderror', { key: 'crate' });
  assert.equal(seen, 4);
  assert.equal(keys.has('crate'), true);
  for (const key of ['s5agin', 's5balt', 'aginorPortrait']) assert.equal(keys.has(key), false, key);
  const prev = globalThis.document.createElement;
  globalThis.document.createElement = () => fakeCanvas();
  try { paintStage5Art(scene); }
  finally { if (prev) globalThis.document.createElement = prev; else delete globalThis.document.createElement; }
  for (const key of ['s5agin', 's5balt', 'aginorPortrait']) assert.equal(keys.has(key), true, key);
  loadEvents.emit('complete');
  loadEvents.emit('loaderror', { key: 's5agin' });
  assert.equal(keys.has('s5agin'), true);
});

test('story panels skipped during a cutscene are freed once it ends', () => {
  const keys = new Set(['story5p1', 'story5p2', 'story5p3']);
  const scene = {
    cutscene: { id: 1 }, paused: false, update() {},
    textures: { exists: k => keys.has(k), remove: k => keys.delete(k) },
  };
  const kit = { s: scene };
  installStage5SceneHooks(kit);
  try {
    assert.equal(freeStory5(scene), 0);
    assert.equal(typeof scene._s5freeStory, 'function');
    scene.update(0, 16);
    assert.equal(keys.size, 3);
    scene.cutscene = null;
    scene.update(0, 16);
    assert.equal(keys.size, 0);
    assert.equal(scene._s5freeStory, null);
  } finally { restoreStage5Hooks(kit); }
});

test('zone clear empties the live spore and cloud arrays', () => {
  const spores = [{ t: 1 }], clouds = [{ t: 2 }];
  const kit = { s: { spores, clouds, riley: { fogSlow: 0.4 } }, blight: { clearZone() {} } };
  clearStage5Zone(kit, 2);
  assert.equal(kit.s.spores, spores);
  assert.equal(kit.s.clouds, clouds);
  assert.equal(spores.length, 0);
  assert.equal(clouds.length, 0);
  assert.equal(kit.s.riley.fogSlow, 0);
});

test('the bark gap uses wall time, so a frozen scene clock cannot stall the next line', () => {
  const scene = { time: { now: 0, paused: true }, caption() {} };
  const saved = globalThis.performance;
  let t = 5000;
  globalThis.performance = { now: () => t };
  try {
    bark(scene, 'stalk', 'riley_st5_stalk_01');
    assert.equal(scene._s5bark.stalk, 5000);
    t += 1000;
    bark(scene, 'stalk', 'riley_st5_stalk_01');
    assert.equal(scene._s5bark.stalk, 5000);
    t += 8000;
    bark(scene, 'stalk', 'riley_st5_stalk_01');
    assert.equal(scene._s5bark.stalk, 14000);
    assert.equal(scene.time.now, 0);
  } finally { globalThis.performance = saved; }
});
