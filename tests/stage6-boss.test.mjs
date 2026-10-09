import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Belal, BELAL } from '../src/belal.js';

const stub = () => { const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setTint() { return o; }, setBlendMode() { return o; }, setVisible() { return o; }, destroy() {} }; return o; };
function make() {
  const scene = { riley: { x: 2000, y: 630, facing: 1, alive: true, hp: 100, maxHp: 100, state: 'idle', attackFrame: false }, enemies: [], attackTokens: () => 0, maxTokens: 2, bounds: { l: 0, r: 5200 }, paused: false, add: { image: stub, sprite: stub }, hud: { flashText() {} }, kit: {}, onBossPhase() {} };
  return new Belal(scene, 800, 630);
}

test('phase damage stops at the gates and phase 3 can end him', () => {
  const b = make();
  assert.equal(b.maxHp, 640);
  assert.equal(b.hasCallandor, false);
  b.hp = 450; b.invuln = false; b.beat = false; b.state = 'idle';
  b.takeHit({ dmg: 40 });
  assert.equal(b.hp, Math.floor(640 * 0.66));
  assert.equal(b.phase, 2);
  b.invuln = false; b.beat = false; b.state = 'idle'; b.st = 1;
  b.hp = 250;
  b.takeHit({ dmg: 50 });
  assert.equal(b.hp, Math.floor(640 * 0.33));
  assert.equal(b.phase, 3);
  b.invuln = false; b.beat = false; b.state = 'idle';
  b.takeHit({ dmg: 500 });
  assert.equal(b.state, 'erase');
  assert.equal(b.hasCallandor, false);
  assert.equal(b.hp, 0);
});

test('only the fourth flurry hit counters, a channel never takes Callandor, and the counter latches', () => {
  const b = make();
  b.invuln = false; b.beat = false; b.state = 'attack'; b.hitI = 0; b.st = 0.2;
  b.scene.riley.x = b.x - 40; b.scene.riley.attackFrame = true; b.scene.riley.state = 'combo1'; b.scene.riley.facing = 1;
  b.takeHit({ dmg: 12 });
  assert.equal(b.state, 'attack');
  b.hitI = 3; b.counterUsed = false; b.st = 0.5;
  b.takeHit({ dmg: 12 });
  assert.equal(b.state, 'stagger');
  assert.equal(b.counterUsed, true);
  const hp = b.hp;
  b.takeHit({ dmg: 12 });
  assert.ok(b.hp <= hp);
  assert.notEqual(b.state, 'attack');
  b.state = 'channel'; b.st = 0; b.hasCallandor = false; b.counterUsed = false;
  b.update(BELAL.channel);
  assert.equal(b.hasCallandor, false);
  assert.equal(b.state === 'stagger' || b.state === 'channel', true);
  assert.ok(BELAL.tells[0] >= 0.55);
  assert.ok(BELAL.lungeTell >= 0.7);
});

test('flurry hits are 6, 6, 8 and 14, and the fourth hit stays counterable after three connections', () => {
  const b = make();
  b.x = 1000; b.scene.riley.x = 940; b.scene.riley.hurtStreak = 3;
  b.invuln = false; b.beat = false; b.cool = 0; b.state = 'attack'; b.hitI = 0; b.st = 0; b.struck = false;
  const drops = [];
  let prev = b.scene.riley.hp;
  for (let i = 0; i < 360 && drops.length < 3; i++) {
    b.update(1 / 60);
    if (b.scene.riley.hp < prev) { drops.push(prev - b.scene.riley.hp); prev = b.scene.riley.hp; }
  }
  assert.deepEqual(drops, [6, 6, 8]);
  assert.equal(b.scene.riley.hurtStreak, 0);
  assert.notEqual(b.scene.riley.state, 'down');
  b.hitI = 3; b.st = BELAL.tells[3] - 0.1; b.struck = false; b.counterUsed = false; b.state = 'attack';
  b.scene.riley.attackFrame = true; b.scene.riley.state = 'combo1'; b.scene.riley.facing = 1; b.scene.riley.x = b.x - 40;
  b.update(1 / 60);
  assert.equal(b.state, 'stagger');
});

test('a wall pin allows at most three hits in a row, and a snare or a getup blocks the next flurry', () => {
  const run = (x, bx) => {
    const b = make();
    b.scene.bounds = { l: 0, r: 4000 };
    b.x = bx; b.scene.riley.x = x; b.scene.riley.y = 630;
    b.invuln = false; b.beat = false; b.cool = 0;
    let prev = b.scene.riley.hp, streak = 0, max = 0, last = -1, hits = 0;
    for (let n = 0; n < 60 * 60; n++) {
      const t = n / 60;
      b.scene.riley.x = x; b.scene.riley.vx = 0; b.scene.riley.inv = 0; b.scene.riley.alive = true;
      if (b.scene.riley.hp < 40) b.scene.riley.hp = 80;
      prev = b.scene.riley.hp;
      b.update(1 / 60);
      if (b.scene.riley.hp < prev) {
        hits++;
        streak = last >= 0 && t - last < 0.85 ? streak + 1 : 1;
        max = Math.max(max, streak); last = t;
      }
    }
    assert.ok(hits > 0, 'he still swings at a pinned Riley');
    assert.ok(max <= 3, max);
  };
  run(20, 90);
  run(3980, 3900);
  const held = make();
  held.x = 1000; held.scene.riley.x = 940; held.scene.riley.fogSlow = 0.6;
  held.invuln = false; held.beat = false; held.cool = 0; held.st = 2;
  for (let i = 0; i < 120; i++) held.update(1 / 60);
  assert.equal(held.state, 'idle');
  held.scene.riley.fogSlow = 0; held.scene.kit.snareCool = 0.4; held.st = 2;
  for (let i = 0; i < 30; i++) held.update(1 / 60);
  assert.equal(held.state, 'idle');
  held.scene.kit.snareCool = 0; held.scene.kit.getupCool = 0.8; held.st = 2;
  for (let i = 0; i < 60; i++) held.update(1 / 60);
  assert.notEqual(held.state, 'attack');
  const weaving = make();
  weaving.scene.bands = [[572, 611], [612, 651], [652, 690]];
  weaving.scene.kit.stone = { lines: [{ band: 1, phase: 'tell' }] };
  weaving.x = 1000; weaving.scene.riley.x = 900; weaving.scene.riley.y = 630;
  weaving.invuln = false; weaving.beat = false; weaving.cool = 0; weaving.st = 2; weaving.state = 'idle';
  for (let i = 0; i < 90; i++) weaving.update(1 / 60);
  assert.equal(weaving.state, 'idle');
});
