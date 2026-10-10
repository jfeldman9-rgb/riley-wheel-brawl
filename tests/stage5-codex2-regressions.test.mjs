import './helpers/stage5-harness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createStartupGuard } from '../src/startup.js';
import { queuePainted } from '../src/stage5-art.js';
import { createArena, RING } from '../src/stage5-arena.js';
import { preloadClips, say, stopSceneAudio } from '../src/audio.js';
import { Stage3Hazards } from '../src/stage3-hazards.js';

for (const key of ['s5agin', 's5balt', 'aginorPortrait']) test(`cold Stage 5 startup survives optional painted ${key} failure`, () => {
  const root = { document: { getElementById() { return null; } } };
  const guard = createStartupGuard(root), load = new EventEmitter(), events = new EventEmitter();
  load.atlas = load.image = () => {};
  const scene = { load, events, textures: { exists: () => false } };
  guard.watchLoader(load); // Production registers the guard BEFORE the optional painter.
  queuePainted(scene);
  load.emit('loaderror', { key: key === 's5balt' ? 'json' : key, multiFile: key === 's5balt' ? { key } : undefined });
  assert.equal(guard.failed, false);
  load.emit('complete');
  assert.equal(load.listenerCount('loaderror'), 0);
  assert.equal(events.listenerCount('shutdown'), 0);
  assert.equal(guard.ready(), true);
  guard.destroy();
});

test('required character failures still fail startup with optional bosses queued', () => {
  const guard = createStartupGuard({}), load = new EventEmitter(); load.atlas = load.image = () => {};
  guard.watchLoader(load);
  queuePainted({ load, events: new EventEmitter(), textures: { exists: () => false } });
  load.emit('loaderror', { key: 'riley-0' });
  assert.equal(guard.failed, true); guard.destroy(); load.emit('complete');
});

test('Phase 3 resumes ring scheduling after Phase 2 suppressed it', () => {
  const arena = createArena(), boss = { x: 4800, y: 630, alive: true, phase: 2, hp: 198, maxHp: 600 };
  const world = { aginor: boss, riley: { x: 4400, y: 630, alive: true, state: 'idle', hp: 100 } };
  arena.step(1 / 60, world);
  boss.phase = 3;
  let rings = 0; world.onRing = () => rings++;
  for (let i = 0; i < 60 * (RING.every[1] + 1); i++) arena.step(1 / 60, world);
  assert.ok(rings >= 1, 'a normal Phase 3 ring tell must begin within its existing 9–11s cooldown');
});

test('Stage 5 voice preload and captions work without Safari 15-missing Object.hasOwn', () => {
  const saved = Object.hasOwn; Object.hasOwn = undefined;
  try {
    assert.doesNotThrow(() => preloadClips(['st5_story_01']));
    let caption;
    assert.doesNotThrow(() => say('st5_story_01', (who, text) => { caption = [who, text]; }));
    assert.equal(caption[0], 'NARRATOR');
    assert.match(caption[1], /Ways/);
  } finally { Object.hasOwn = saved; stopSceneAudio(); }
});

test('campaign roof warning works without Safari 15-missing Array.at', () => {
  const saved = Array.prototype.at; Array.prototype.at = undefined;
  const marker = new Proxy({}, { get: () => () => marker });
  const kit = { s: { riley: { y: 630 }, camX: 0, caption() {} }, tiles: [], stats: { tiles: 0 }, bandOf: () => 1, img: () => marker, hint() {}, roofSaid: true };
  try { assert.doesNotThrow(() => Stage3Hazards.prototype.startTile.call(kit)); assert.equal(kit.tiles.length, 1); }
  finally { Array.prototype.at = saved; }
});
