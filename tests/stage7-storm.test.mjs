import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorm, pushStorm, veilSpawn } from '../src/stage7-storm.js';

test('a gust waits out a grab, then pushes X only', () => {
  const storm = createStorm();
  storm.arm();
  storm.step(2, true);
  assert.equal(storm.phase, 'wait');
  storm.step(2, false);
  assert.equal(storm.phase, 'tell');
  storm.step(2.5, false);
  assert.equal(storm.gusting, true);
  const scene = { bounds: { l: 0, r: 5200 }, riley: { x: 400, y: 630, z: 0 }, enemies: [{ alive: true, x: 500, y: 640 }], inp: { x: 0 } };
  const y = scene.riley.y;
  pushStorm(scene, storm, 1);
  assert.equal(scene.riley.y, y);
  assert.ok(scene.riley.x > 400);
  scene.riley.x = 40;
  pushStorm(scene, storm, 5);
  assert.ok(scene.riley.x >= 40);
});

test('a silhouetted spawn has no hitbox for 0.6s', () => {
  const proto = { get canBeHit() { return true; }, update() { this.ran = true; }, sync() {}, sprite: { setAlpha() {} } };
  const e = Object.create(proto);
  veilSpawn(e);
  assert.equal(e.canBeHit, false);
  e.update(0.6);
  assert.equal(e.canBeHit, true);
});
