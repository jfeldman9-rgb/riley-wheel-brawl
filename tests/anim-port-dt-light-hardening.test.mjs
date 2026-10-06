import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
import { Bot } from '../src/bot.js';
import { Enemy } from '../src/enemies.js';

function harness() {
  return withSeed(4, () => {
    const h = stage1Simulation({ mode: null }), s = h.s;
    s.bot = new Bot(s, { mode: '1' });
    s.started = true;
    const e = new Enemy(s, 'grunt', 480, 640);
    e.entering = false; e.vx = 220; s.enemies.push(e);
    s.riley.vx = 160; s.heroLightX = 20;
    return h;
  });
}

function pose(s) {
  return {
    bot: s.bot.t, fx: s.fx._dt,
    riley: [s.riley.x, s.riley.y, s.riley.z, s.riley.st, s.riley.hp, s.riley.state, s.riley.vx],
    enemies: s.enemies.map(e => [e.x, e.y, e.z, e.st, e.hp, e.state, e.vx]),
    light: s.heroLightX, lightX: s.heroLight.x,
  };
}

test('NaN and negative frame deltas match a zero step for bot, fx, Riley, enemies and the hero light', () => {
  const zero = harness();
  try {
    zero.s.update(500, 0);
    const still = pose(zero.s);
    for (const deltaMs of [NaN, -1, -50, -Infinity]) {
      const h = harness();
      try {
        h.s.update(500, deltaMs);
        assert.deepEqual(pose(h.s), still);
        assert.equal(h.s.fx._dt, 0);
        assert.equal(h.s.bot.t, 0);
        assert.ok(h.s.enemies.length > 0);
      } finally { h.destroy(); }
    }
    const moved = harness();
    try {
      const deltaMs = 1000 / 60;
      moved.s.update(500, deltaMs);
      const dt = Math.min(deltaMs, 50) / 1000;
      assert.equal(moved.s.fx._dt, dt);
      assert.equal(moved.s.bot.t, dt);
      assert.notDeepEqual(pose(moved.s), still);
      moved.s.heroLightX = 0; moved.s.riley.vx = 0; moved.s.bot = null; moved.s.started = false;
      for (const e of moved.s.enemies) e.vx = 0;
      const x = moved.s.riley.x;
      moved.s.update(600, deltaMs);
      assert.equal(moved.s.riley.x, x);
      assert.equal(moved.s.heroLightX, (x + moved.s.riley.facing * 30) * (1 - Math.exp(-dt * 12)));
      moved.s.update(700, 80);
      assert.equal(moved.s.fx._dt, 0.05);
    } finally { moved.destroy(); }
  } finally { zero.destroy(); }
});

test('hero light y is set at create and continue snaps x to the post-respawn target', () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  try {
    assert.equal(s.heroLight.y, s.riley.y - 300 - s.riley.z);
    assert.equal(s.heroLight.x, s.heroLightX);
    s.riley.x = 1400; s.riley.facing = -1; s.heroLightX = 80; s.heroLight.x = 80; s.gameOver = true;
    s.continueGame();
    assert.equal(s.heroLightX, 1400 - 30);
    assert.notEqual(s.heroLightX, 80);
  } finally { h.destroy(); }
});
