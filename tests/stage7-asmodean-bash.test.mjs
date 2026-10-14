import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation } from './helpers/stage7-harness.mjs';
import { Asmodean, ASMODEAN } from '../src/asmodean.js';
import { paintedScale } from '../src/stage7-fighter.js';

function setup() {
  const h = stage7Simulation(), s = h.s;
  const b = new Asmodean(s, 4800, 630); s.boss = b; s.enemies.push(b);
  if (s.kit?.notes) s.kit.notes.pending.length = 0;
  const R = s.riley; R.x = b.x - 120; R.y = b.y; R.z = 0; R.inv = 0;
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

test('Asmodean is boss-sized with a matching hurtbox', () => {
  const { h, b } = setup();
  try {
    assert.ok(145 * paintedScale('s7asmo') >= 251, 'at least Belal idle height');
    assert.equal(b.def.shadowW, ASMODEAN.shadowW);
    assert.ok(ASMODEAN.shadowW > 130);
  } finally { h.destroy(); }
});
