// Focused position fixtures for the production post-physics collision pass.
// Full-stage tests independently reproduce the same bug through inputs alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { Enemy } = await import('../src/enemies.js');

for (const side of ['left', 'right']) test(`enemy separation cannot push Riley beyond the ${side} wall`, () => withSeed(1, () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  try {
    const x = side === 'left' ? s.bounds.l + 40 : s.bounds.r - 40;
    s.riley.x = x; s.riley.face(side === 'left' ? 1 : -1);
    s.enemies.push(new Enemy(s, 'hound', x, s.riley.y));
    for (let frame = 0; frame < 10; frame++) {
      h.step();
      assert.ok(s.riley.x >= s.bounds.l + 40 && s.riley.x <= s.bounds.r - 40, 'Same margin as Fighter.physics');
    }
  } finally { h.destroy(); }
}));
