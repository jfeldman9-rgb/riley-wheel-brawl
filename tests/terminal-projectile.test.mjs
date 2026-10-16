// Explicit terminal-order fixture. Actor state is set only to construct this
// narrow last-life case; production projectiles, damage, FX, timers and input
// run afterward. Full-stage simulation tests use normal input-only progression.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';

test('last fireball can replace already-shown game-over with a replayable victory', () => withSeed(1, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, r = s.riley;
  try {
    s.zoneI = 3; s.zone = { boss: true, l: 3920, r: 5200 }; s.locked = true;
    s.bounds = { l: 3920, r: 5200 }; s.camX = s.camMax = 3920;
    r.x = 3960; r.y = 630; r.hp = 1; r.lives = 1;
    s.boss = s.spawn('chief', 'R');
    const c = s.boss; c.x = 5130; c.y = 630; c.entering = false; c.hp = 10; c.state = 'stunned'; c.st = 0; c.phase = 3;
    s.spawnFireball(r);
    s.hitTarget({ x: r.x + 50, facing: -1 }, r, { dmg: 7, kind: 'heavy', kb: 160 });

    // No fixture writes after this point. An already-airborne fireball must
    // travel across the arena while the genuine last-life timer expires.
    for (let frame = 0; frame < 650; frame++) h.step();
    const terminal = h.observations.hud.filter(e => ['gameOver', 'hideGameOver', 'stageClear'].includes(e.method));
    assert.deepEqual(terminal.map(e => e.method), ['gameOver', 'hideGameOver', 'stageClear']);
    assert.ok(terminal[0].at < terminal[1].at && terminal[1].at < terminal[2].at);
    assert.equal(c.alive, false); assert.equal(s.gameOver, false); assert.equal(s.ended, true); assert.equal(s.clearShown, true);
    assert.equal(r.hp, 0); assert.equal(r.lives, 0);
    s.inp.press('attack');
    assert.equal(h.observations.restarts, 1); assert.equal(r.lives, 0, 'No accidental Continue branch');
  } finally { h.destroy(); }
}));
