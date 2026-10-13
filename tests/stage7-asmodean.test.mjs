import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PHRASES, freeBand, BEAT, BASH_TELL, clampDamage } from '../src/stage7-notes.js';
import { Asmodean, ASMODEAN } from '../src/asmodean.js';
import { shockTouches, SHOCK } from '../src/stage7-arena.js';

function scene() {
  return { enemies: [], add: {}, riley: { x: 4000, y: 630, z: 0, facing: 1, attackFrame: false }, bounds: { l: 3920, r: 5200 }, onBossPhase() {}, onEnemyDie() {} };
}

test('every phrase leaves a band free, and tells are a beat', () => {
  for (const p of PHRASES) assert.ok(freeBand(p) >= 0, JSON.stringify(p.bands));
  assert.equal(BEAT, 0.625);
  assert.ok(BASH_TELL >= 0.55);
  assert.equal(ASMODEAN.hp, 600);
});

test('a 500 point hit stops on the next gate and does not skip a phase', () => {
  const a = new Asmodean(scene(), 4500, 630);
  a.takeHit({ dmg: 500 });
  assert.equal(a.hp, 396);
  assert.equal(a.phase, 2);
  a.invuln = false; a.beat = false;
  a.takeHit({ dmg: 500 });
  assert.equal(a.hp, 198);
  assert.equal(a.phase, 3);
  a.invuln = false; a.beat = false;
  let phase = 1;
  const boss = { hp: 600, maxHp: 600, phase: 1 };
  for (let i = 0; i < 1000; i++) {
    const dmg = 1 + (i * 17) % 80;
    const before = boss.phase;
    clampDamage(boss, dmg, false);
    if (boss.phase < 3 && boss.hp <= Math.floor(boss.maxHp * (boss.phase === 1 ? 0.66 : 0.33))) {
      boss.phase++;
      if (boss.phase === 2) boss.hp = Math.floor(boss.maxHp * 0.66);
      else if (boss.phase === 3) boss.hp = Math.floor(boss.maxHp * 0.33);
    }
    assert.ok(boss.phase - before <= 1);
    phase = boss.phase;
  }
  assert.equal(phase, 3);
});

test('channel breaks on the third hit or a throw, and a jump clears the shock', () => {
  const a = new Asmodean(scene(), 4500, 630);
  a.phase = 3; a.startChannel();
  assert.equal(a.takeHit({ dmg: 5 }), true);
  assert.equal(a.state, 'channel');
  a.takeHit({ dmg: 5 });
  assert.equal(a.state, 'channel');
  a.takeHit({ dmg: 5 });
  assert.equal(a.state, 'stun');
  const b = new Asmodean(scene(), 4500, 630);
  b.phase = 3; b.startChannel();
  b.takeHit({ dmg: 5, anim: 'throw' });
  assert.equal(b.state, 'stun');
  const shock = { x: 100, r: 40 };
  assert.equal(shockTouches({ x: 140, z: 0 }, shock), true);
  assert.equal(shockTouches({ x: 140, z: SHOCK.jumpZ + 1 }, shock), false);
});

test('a reflected note deals 4 percent and staggers', () => {
  const a = new Asmodean(scene(), 4500, 630);
  a.reflect();
  assert.equal(a.hp, 600 - 24);
  assert.equal(a.state, 'stagger');
  assert.equal(a.staggerLeft, 0.8);
});
