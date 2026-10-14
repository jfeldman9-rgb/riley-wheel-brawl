import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation } from './helpers/stage7-harness.mjs';
import { Asmodean, ASMODEAN, ASMO_FX, CHANNEL_BANNER } from '../src/asmodean.js';
import { paintedScale } from '../src/stage7-fighter.js';
import { callEffect, CALL7 } from '../src/moilan-call.js';

function setup() {
  const h = stage7Simulation(), s = h.s;
  const b = new Asmodean(s, 4800, 630); s.boss = b; s.enemies.push(b);
  if (s.kit?.notes) s.kit.notes.pending.length = 0;
  const R = s.riley; R.x = b.x - 120; R.y = b.y; R.z = 0; R.inv = 0;
  b.face(-1);
  return { h, s, b, R };
}

test('a landed Asmodean bash lowers Riley HP after a telegraph', () => {
  const { h, b, R } = setup();
  try {
    b.setState('attack'); b.counterUsed = false;
    const hp = R.hp;
    b.step(ASMODEAN.bashTell - 0.1);
    assert.equal(R.hp, hp, 'no damage during the tell');
    b.step(0.11);
    assert.equal(R.hp, hp - ASMODEAN.bashDmg);
    assert.ok(['hurt', 'down'].includes(R.state), 'Riley flinches');
  } finally { h.destroy(); }
});

test('mashing early in the tell does not cancel the bash; a late parry still does', () => {
  const { h, b, R } = setup();
  try {
    b.setState('attack'); b.counterUsed = false; b.step(0.1);
    b.takeHit({ dmg: 4 }, R);
    assert.equal(b.state, 'attack');
    b.step(ASMODEAN.bashTell);
    assert.ok(R.hp < 100);
    b.setState('attack'); b.counterUsed = false; b.step(ASMODEAN.bashTell - 0.05);
    b.takeHit({ dmg: 4 }, R);
    assert.equal(b.state, 'stagger');
  } finally { h.destroy(); }
});

test('Riley behind Asmodean is safe, and dy=30 in the lane is a hit', () => {
  const { h, s, b, R } = setup();
  try {
    b.face(1);
    R.x = b.x - 80;
    R.y = b.y;
    b.setState('attack');
    b.counterUsed = false;
    const hp = R.hp;
    b.step(ASMODEAN.bashTell);
    assert.equal(R.hp, hp, '80px behind a right-facing bash is safe');
    b.setState('attack');
    b.counterUsed = false;
    R.x = b.x - 30;
    R.inv = 0;
    b.step(ASMODEAN.bashTell);
    assert.equal(R.hp, hp - ASMODEAN.bashDmg, 'the 40px slack behind him still connects');
    b.setState('attack');
    b.counterUsed = false;
    R.x = b.x + 100;
    R.y = b.y + 30;
    R.z = R.vz = 0;
    R.inv = 0;
    R.hp = hp;
    s.kit.damageUntil = 0;
    b.step(ASMODEAN.bashTell);
    assert.equal(R.hp, hp - ASMODEAN.bashDmg, 'dy=30 is inside the lane');
  } finally { h.destroy(); }
});

test('a hit flash decays during a helper strike without advancing the boss', () => {
  const { h, s, b } = setup();
  try {
    b.hitFlash = ASMO_FX.hitFlash;
    b.breakFlash = ASMO_FX.breakFlash;
    const clock = b.clock;
    s.kit.strike = { helper: 'duo', t: 0, duration: 5, targets: [], resolved: true };
    b.update(0.2);
    assert.equal(b.hitFlash, 0);
    assert.ok(b.breakFlash < ASMO_FX.breakFlash);
    assert.equal(b.clock, clock, 'the strike early-return still skips the AI');
    h.step(ASMO_FX.breakFlash);
    assert.equal(b.hitFlash, 0);
    assert.equal(b.breakFlash, 0);
    assert.equal(b.clock, clock);
  } finally { h.destroy(); }
});

test('an assist on a channeling boss is a channel break, not a one-second stagger', () => {
  const { h, s, b } = setup();
  try {
    const texts = [];
    s.hud.flashText = (t) => texts.push(t);
    b.phase = 3;
    b.hp = 400;
    b.clock = 3;
    b.beat = b.invuln = false;
    b.startChannel();
    b.channelAt = b.clock + 1;
    callEffect(b, 'duo');
    assert.equal(b.state, 'stagger');
    assert.equal(b.staggerFor, CALL7.stagger);
    assert.ok(b.staggerUntil >= b.clock + CALL7.stagger - 1e-6);
    assert.ok(b.channelStaggerUntil >= b.clock + CALL7.stagger - 1e-6);
    assert.ok(b.channelAt >= b.clock + ASMODEAN.breakCooldown - 1e-6);
    assert.ok(b.breakFlash > 0);
    assert.ok(texts.includes('CHANNEL BROKEN'));
    assert.ok(texts.includes(CHANNEL_BANNER));
    b.startChannel();
    assert.equal(b.state, 'stagger', 'the break window still owns the cast');
    b.channelStaggerUntil = 0;
    b.staggerUntil = 0;
    b.setState('idle');
    b.beat = b.invuln = false;
    b.hp = 400;
    texts.length = 0;
    callEffect(b, 'lan');
    assert.equal(b.state, 'stagger');
    assert.ok(Math.abs(b.staggerUntil - b.clock - CALL7.stagger) < 1e-6);
    assert.equal(b.channelStaggerUntil, 0);
    assert.ok(!texts.includes('CHANNEL BROKEN'));
  } finally { h.destroy(); }
});

test('a missing attacker flinches Asmodean back from the way he faces', () => {
  const { h, b } = setup();
  try {
    b.face(1);
    b.takeHit({ dmg: 1 });
    assert.equal(b.flinchDir, -1);
    b.face(-1);
    b.takeHit({ dmg: 1 });
    assert.equal(b.flinchDir, 1);
  } finally { h.destroy(); }
});

test('the parry logic window stays at st>=0.5; a get-ready pose is not a parry', () => {
  const { h, b, R } = setup();
  try {
    b.setState('attack');
    b.counterUsed = false;
    b.step(0.42);
    b.takeHit({ dmg: 4 }, R);
    assert.equal(b.state, 'attack');
  } finally { h.destroy(); }
});

test('Asmodean is boss-sized with a matching hurtbox', () => {
  const { h, b } = setup();
  try {
    assert.ok(145 * paintedScale('s7asmo') >= 251, 'at least Belal idle height');
    assert.equal(b.def.shadowW, ASMODEAN.shadowW);
    assert.ok(ASMODEAN.shadowW > 130);
  } finally { h.destroy(); }
});
