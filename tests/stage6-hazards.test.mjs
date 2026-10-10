import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStone, threatsOf, BANDS } from '../src/stage6-arena.js';
import { withSeed } from './helpers/stage1-simulation.mjs';

function world(zone, riley, extra = {}) {
  const scene = { riley, paused: false, cutscene: null, god: false };
  const stone = createStone();
  return { stone, w: { scene, riley, enemies: extra.enemies || [], zone, bounds: extra.bounds || { l: 0, r: 1280 }, fireballs: [], belal: extra.belal || null, stone } };
}

test('a dock net tells for a second, hits for 10, and a live tell can be cancelled', () => {
  const R = { x: 400, y: 640, hp: 80, maxHp: 100, alive: true, z: 0, state: 'idle' };
  const { stone, w } = world(0, R);
  withSeed(1, () => { for (let i = 0; i < 100; i++) stone.step(1 / 60, w); });
  const tell = stone.nets.find(n => n.phase === 'tell');
  assert.ok(tell, 'a net is winding up');
  assert.equal(threatsOf(stone, 0).nets.length, 1);
  stone.cancelTells(0, 1280);
  assert.equal(stone.nets.filter(n => n.phase === 'tell').length, 0);
  const band = BANDS[1];
  R.y = (band[0] + band[1]) / 2; R.x = 500;
  stone.nets.push({ zone: 0, band: 1, x: 500, t: 0.99, phase: 'tell' });
  stone.step(0.02, w);
  assert.equal(R.hp, 70);
  assert.equal(stone.snare, 0.8);
});

test('a lamp knocks down into a pool, and Netweaver lines leave a safe band', () => {
  const R = { x: 1600, y: 630, hp: 100, maxHp: 100, alive: true, z: 0, state: 'idle' };
  const { stone, w } = world(1, R, { bounds: { l: 1240, r: 2520 } });
  withSeed(2, () => { for (let i = 0; i < 180; i++) stone.step(1 / 60, w); });
  const lamp = stone.lamps.find(n => n.phase === 'swing');
  assert.ok(lamp);
  lamp.t = 1.09;
  R.x = lamp.x; R.y = lamp.y;
  stone.step(0.02, w);
  assert.ok(R.hp <= 88);
  assert.equal(R.state, 'down');
  assert.ok(stone.pools.length >= 1);
  const boss = { alive: true, phase: 2 };
  const heart = world(3, { ...R, state: 'idle', hp: 100, x: 4300, y: 630 }, { belal: boss, bounds: { l: 3920, r: 5200 } });
  heart.w.belal = boss;
  withSeed(3, () => { for (let i = 0; i < 400; i++) heart.stone.step(1 / 60, heart.w); });
  const used = new Set(heart.stone.lines.map(n => n.band));
  assert.ok(heart.stone.lines.length <= 1);
  assert.ok(used.size < 3);
  boss.phase = 3;
  withSeed(4, () => { for (let i = 0; i < 500; i++) heart.stone.step(1 / 60, heart.w); });
  assert.ok(heart.stone.lines.length <= 2);
  assert.equal(heart.stone.rays.length, 3);
  assert.equal(heart.stone.rays.filter(r => !r.on).length, 1);
});
