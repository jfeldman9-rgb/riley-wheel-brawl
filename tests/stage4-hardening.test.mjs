import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4Simulation, withSeed } from './helpers/stage4-harness.mjs';
import { createTowers } from '../src/stage4-towers.js';
import { createArena } from '../src/stage4-arena.js';

test('a stationary Riley is not stuck once the first street locks', () => {
  const h = stage4Simulation({ mode: null });
  const s = h.s;
  try {
    s.riley.x = 400;
    let progressed = false;
    for (let i = 0; i < 60 * 120 && !s.gameOver && !s.ended; i++) {
      h.step();
      if (s.zoneI >= 0 || s.riley.hp < 100 || s.enemies.some(e => e.alive)) progressed = true;
    }
    assert.equal(progressed, true);
    assert.ok(s.gameOver || s.riley.hp < 100 || s.zoneI >= 0);
  } finally { h.destroy(); }
});

test('no-power Riley still clears Shadar Logoth on melee', () => withSeed(1, () => {
  const h = stage4Simulation({ mode: '1', noPower: true });
  const s = h.s;
  try {
    assert.equal(s.noPower, true);
    for (let i = 0; i < 60 * 600 && !s.ended && !s.gameOver; i++) h.step();
    const detail = JSON.stringify({ ended: s.ended, gameOver: s.gameOver, lives: s.riley.lives, melee: s.kit.stats.meleeRecoils, hp: s.boss && s.boss.hp });
    assert.equal(s.gameOver, false, detail);
    assert.equal(s.ended, true, detail);
    assert.ok(s.kit.stats.meleeRecoils >= 1, detail);
  } finally { h.destroy(); }
}));

test('destroy mid-tendril, mid-collapse, mid-kiss and mid-wall leaves no hazards', () => {
  const h = stage4Simulation();
  const s = h.s;
  try {
    for (let i = 0; i < 60 * 6; i++) h.step();
    assert.ok(s.kit.fog.vents.length > 0);
    const towers = createTowers();
    towers.arm(2);
    towers.setWave(0);
    towers.step(2, { riley: { x: 3000, y: 630, hp: 80, state: 'idle' }, enemies: [], bands: [[572, 610], [610, 650], [650, 690]] });
    assert.ok(towers.towers.length >= 1);
    towers.dispose();
    assert.equal(towers.towers.length, 0);
    const arena = createArena();
    arena.step(1, { riley: { x: 4500, y: 630, hp: 40, state: 'croon' } });
    arena.dispose();
    assert.equal(arena.active, false);
    const boss = {
      released: false,
      gone: false,
      releaseHold() { this.released = true; s.riley.grabbedBy = null; s.riley.state = 'idle'; },
    };
    s.boss = boss;
    s.riley.state = 'grabbed';
    s.riley.grabbedBy = boss;
    s.kit.clearHazards();
    assert.equal(boss.released, true);
    assert.equal(boss.gone, true);
    assert.equal(s.riley.grabbedBy, null);
    assert.equal(s.kit.fog.tendrils.length, 0);
    assert.equal(s.fogBolts.length, 0);
    s.kit.destroy();
  } finally { h.destroy(); }
});
