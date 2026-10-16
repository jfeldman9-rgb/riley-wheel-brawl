import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal } from '../src/myrddraal.js';

test('boss lunge decisions use the current random source rather than the import-time source', () => withSeed(3, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const f = new Myrddraal(s, 940, 630);
    s.enemies.push(f); f.entering = false; f.introDone = true; f.cool = 0; f.nextBlink = 99;
    const saved = Math.random;
    let calls = 0;
    try {
      Math.random = () => { calls++; return 0.99; };
      f.think(0);
      assert.equal(calls, 1);
      assert.notEqual(f.state, 'lunge');
      Math.random = () => 0;
      f.think(0);
      assert.equal(f.state, 'lunge');
    } finally { Math.random = saved; }
  } finally { h.destroy(); }
}));

test('the shadow-copy attack order and timers repeat under the same seed', () => {
  const run = () => withSeed(35, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      arena(s);
      const f = new Myrddraal(s, 940, 630);
      s.enemies.push(f); f.entering = false; f.introDone = true;
      const orders = [];
      for (let i = 0; i < 20; i++) {
        f.clearCopies(false); f.makeCopies();
        orders.push([f.lungeAt, ...f.copies.map(c => c.lungeAt)]);
      }
      return orders;
    } finally { h.destroy(); }
  });
  assert.deepEqual(run(), run());
});
