// Explicit right-edge spawn fixture; interactions afterward use real movement,
// production grab selection and timed input, never forced grab/damage methods.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';

test('an entering enemy cannot be grabbed into an invulnerable two-knee hold', () => withSeed(1, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, r = s.riley;
  try {
    h.step();
    s.zoneI = 0; s.zone = { l: 0, r: 1280, waves: [] }; s.locked = true; s.wave = 0;
    s.bounds = { l: 0, r: 1280 }; s.camX = s.camMax = 0;
    r.x = 1180; r.y = 630;
    const e = s.spawn('grunt', 'R'); e.x = 1270; e.y = 630; e.cool = 1;
    s.inp.held.right = true; h.step(); s.inp.held.right = false;
    assert.equal(e.entering, true); assert.equal(e.grabbable, false);
    assert.notEqual(r.held, e); assert.notEqual(e.state, 'held');
    // Give the entering actor room through actual movement, then normal grab
    // eligibility is restored once the scene observes it inside the arena.
    s.inp.held.left = true;
    for (let frame = 0; frame < 90 && e.entering; frame++) h.step();
    s.inp.held.left = false;
    assert.equal(e.entering, false); assert.equal(e.alive, true);
    assert.equal(e.hp, 42, 'Blocked boundary grab causes no phantom knee damage');
  } finally { h.destroy(); }
}));

for (const side of ['L', 'R']) for (const type of ['grunt', 'spear', 'hound', 'chief']) {
  test(`${type} enters from ${side} without immune attacks or a wall-hugging-player stall`, () => withSeed(2, () => {
    const h = stage1Simulation({ mode: null }), s = h.s, r = s.riley;
    try {
      h.step(); s.zoneI = 0; s.zone = { l: 0, r: 1280, boss: true }; s.locked = true;
      s.bounds = { l: 0, r: 1280 }; s.camX = s.camMax = 0;
      r.x = side === 'R' ? 1240 : 40; r.y = 630;
      const e = s.spawn(type, side); e.y = r.y;
      const count = s.enemies.length;
      for (let frame = 0; frame < 60 * 5 && e.entering; frame++) {
        h.step();
        assert.equal(r.hp, 100, 'An immune entrant cannot damage Riley');
        assert.ok(!['attack', 'sweep', 'charge', 'roar', 'lift', 'hurl'].includes(e.state), 'Entry owns movement before combat decisions');
        assert.equal(s.carts.length, 0); assert.equal(s.enemies.length, count);
      }
      assert.equal(e.entering, false, 'Entrance completes with the player stationary against either wall');
      assert.ok(e.x > s.bounds.l + 60 && e.x < s.bounds.r - 60);
    } finally { h.destroy(); }
  }));
}

test('phase-three boss entry rejects offscreen specials and the defensive attack resolver blocks entrants', () => withSeed(3, () => {
  const h = stage1Simulation({ mode: null }), s = h.s, r = s.riley;
  try {
    h.step(); s.zoneI = 3; s.zone = { l: 0, r: 1280, boss: true }; s.locked = true;
    r.x = 1240; r.y = 630;
    const e = s.boss = s.spawn('chief', 'R'); e.y = r.y; e.hp = 100; e.phase = 3; e.cool = 0; e.nextRoar = 0; e.nextCart = 0;
    s.resolveAttack(e, e.T.atk); assert.equal(r.hp, 100);
    for (let frame = 0; frame < 60 * 5 && e.entering; frame++) {
      h.step(); assert.equal(s.enemies.length, 1); assert.equal(s.carts.length, 0);
      assert.equal(e.state, 'approach'); assert.equal(r.hp, 100);
    }
    assert.equal(e.entering, false);
  } finally { h.destroy(); }
}));

test('boss victory lets an entering summoned hound finish dying and release its visuals', () => withSeed(4, () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  try {
    h.step(); s.zoneI = 3; s.zone = { l: 0, r: 1280, boss: true }; s.locked = true;
    const boss = s.boss = s.spawn('chief', 'R'); boss.x = 900; boss.y = s.riley.y; boss.entering = false;
    s.summonHounds(boss); h.step();
    const hound = s.enemies.find(e => e.type === 'hound');
    assert.ok(hound); assert.equal(hound.entering, true); assert.equal(hound.alive, true);
    boss.takeHit({ dmg: boss.maxHp, kind: 'heavy', down: true }, s.riley);
    assert.equal(s.victoryPending, true); assert.equal(hound.alive, false); assert.equal(hound.state, 'down');
    for (let frame = 0; frame < 60 * 20; frame++) {
      h.step();
      assert.ok(!['approach', 'wait', 'attack', 'getup'].includes(hound.state), 'Entry cannot revive death into combat AI');
    }
    assert.equal(s.enemies.length, 0); assert.equal(hound.gone, true);
    assert.equal(hound.sprite.dead, true); assert.equal(hound.shadow.dead, true);
    assert.equal(h.observations.spawns.filter(e => e.type === 'hound').length, 1, 'Second pending summon stays canceled');
    assert.equal(h.observations.deaths.filter(e => e.id === hound.id).length, 1);
    assert.equal(s.ended, true); assert.equal(s.gameOver, false);
  } finally { h.destroy(); }
}));
