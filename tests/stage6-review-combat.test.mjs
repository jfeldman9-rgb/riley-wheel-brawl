import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Belal, BELAL } from '../src/belal.js';
import { randEffect } from '../src/rand-call.js';
import { stage6Simulation, withSeed } from './helpers/stage6-harness.mjs';

test('lethal Riley hit during Rand stagger completes erase and the real bossDown path exactly once', () => withSeed(1, () => {
  const h = stage6Simulation({ mode: null }), s = h.s;
  try {
    s.enemies.forEach(e => e.destroy()); s.enemies = []; s.pending = []; s.zones = [];
    s.zoneI = s.kit._zone = 3; s.riley.x = 600; s.riley.y = 630;
    const b = s.boss = new Belal(s, 700, 630); b.phase = 3; b.hp = 39;
    const original = s.onEnemyDie; let deaths = 0;
    s.onEnemyDie = function(e) { if (e === b) deaths++; return original.call(this, e); };
    assert.equal(randEffect(b).dmg, 38); assert.equal(b.hp, 1);
    assert.ok(b.randStagger > 0); assert.equal(b.takeHit({ dmg: 5 }), true);
    assert.equal(b.state, 'erase');
    for (let i = 0; i < 120; i++) b.update(1 / 60);
    assert.equal(b.alive, false); assert.equal(b.state, 'dead'); assert.equal(b.gone, true);
    assert.equal(deaths, 1); assert.equal(s.victoryPending, true);
  } finally { h.destroy(); }
}));

for (const origin of ['counter', 'channel break', 'ordinary hit']) test(`lethal ${origin} preserves terminal states against temporary timers and repeated hits`, () => {
  let deaths = 0;
  const s = { enemies: [], kit: {}, riley: { x: 500, y: 630, alive: true, state: 'combo1', attackFrame: true, facing: 1 }, onEnemyDie() { deaths++; } };
  const b = new Belal(s, 600, 630); b.phase = 3; b.hp = 1;
  if (origin === 'counter') { b.startFlurry(); b.hitI = 3; b.st = BELAL.tells[3] - 0.1; b.update(1 / 60); }
  else { b.state = origin === 'channel break' ? 'channel' : 'stagger'; b.takeHit({ dmg: 5, down: true }); }
  assert.equal(b.state, 'erase'); assert.equal(b.takeHit({ dmg: 100 }), false);
  // Terminal dispatch must win even if a stale temporary timer remains.
  b.randStagger = 2; b.update(1.2);
  assert.equal(b.state, 'dead'); assert.equal(b.alive, false); assert.equal(deaths, 1);
  b.randStagger = 2; b.update(0.5);
  assert.equal(b.state, 'dead'); assert.equal(b.gone, true); assert.equal(deaths, 1);
});

for (const dir of [-1, 1]) for (const timing of ['tell', 'active']) test(`lunge ${timing} aborts when Riley enters the ${dir < 0 ? 'left' : 'right'} 140px wall zone`, () => {
  const s = { enemies: [], kit: {}, bounds: { l: 0, r: 1200 }, attackTokens: () => 0,
    riley: { x: dir < 0 ? 200 : 1000, y: 630, alive: true, hp: 100, state: 'idle', inv: 0 } };
  const b = new Belal(s, 600, 630); b.cool = 0;
  b.update(1 / 60); assert.equal(b.state, 'tell'); assert.equal(b.facing, dir);
  if (timing === 'active') {
    for (let i = 0; i < 43; i++) b.update(1 / 60);
    assert.equal(b.state, 'lunge');
    // A retreat near a wall just as the lunge arrives could otherwise connect.
    b.x = dir < 0 ? 175 : 1025;
  }
  s.riley.x = dir < 0 ? 140 : 1060;
  if (timing === 'tell') b.st = BELAL.lungeTell - 0.01;
  const x = b.x; b.update(1 / 60);
  assert.equal(b.state, 'idle'); assert.equal(b.x, x); assert.equal(s.riley.hp, 100);
  assert.ok(b.cool > 0 && b.cool <= 0.7); assert.equal(b.counterUsed, false);
  if (timing === 'active') {
    for (let i = 0; i < 120; i++) b.update(1 / 60);
    assert.ok(s.riley.hp < 100, 'a cancelled lunge still permits close wall-pinned flurries');
  }
});

test('wall protection permits a lunge moving away from the pinned wall', () => {
  const s = { enemies: [], kit: {}, bounds: { l: 0, r: 1200 }, riley: { x: 140, y: 630, alive: true, hp: 100, state: 'idle' } };
  const b = new Belal(s, 60, 630); b.face(1); b.startLunge(); b.st = BELAL.lungeTell;
  b.update(1 / 60); assert.equal(b.state, 'lunge');
  b.update(1 / 60); assert.ok(b.x > 60);
});
