import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Belal, BELAL } from '../src/belal.js';

// Astra review: a Netweaver snare that lands after the lunge tell starts must stop the lunge (16 dmg + knockdown).
const setup = () => {
  const s = { enemies: [], kit: {}, bounds: { l: 0, r: 2000 }, attackTokens: () => 0,
    riley: { x: 900, y: 605, alive: true, hp: 100, state: 'idle', inv: 0 } };
  const b = new Belal(s, 600, 605); b.cool = 0;
  b.update(1 / 60); assert.equal(b.state, 'tell');
  s.riley.y = 620; // into a firing band: 15 px lane difference still inside the lunge's 34 px
  return { s, b };
};
const snares = { fog: s => { s.riley.fogSlow = 1; }, postSnare: s => { s.kit.snareCool = 0.4; } };

for (const [kind, apply] of Object.entries(snares)) for (const timing of ['tell', 'active']) test(`Be'lal lunge aborts when a ${kind} snare lands during the ${timing}`, () => {
  const { s, b } = setup();
  if (timing === 'tell') { apply(s); }
  else {
    while (b.state === 'tell') b.update(1 / 60);
    assert.equal(b.state, 'lunge'); apply(s);
    const x0 = b.x; b.update(1 / 60);
    assert.equal(b.state, 'idle', 'next lunge substep aborts'); assert.ok(Math.abs(b.x - x0) < 5, 'aborted lunge stops (a lunge frame moves about 22 px)');
    assert.ok(b.cool > 0.6 && b.cool <= 0.7);
  }
  let sawLunge = false;
  for (let i = 0; i < 90 && s.riley.hp === 100; i++) { b.update(1 / 60); if (b.state === 'lunge') sawLunge = true; }
  assert.equal(s.riley.hp, 100, 'no lunge damage on a snared Riley');
  assert.equal(s.riley.state === 'down', false);
  if (timing === 'tell') assert.equal(sawLunge, false, 'tell aborts instead of converting');
});

test('aborted snared lunge uses the 0.7 s cooldown, and an unsnared lunge still connects', () => {
  const { s, b } = setup(); s.riley.fogSlow = 1;
  while (b.state === 'tell') b.update(1 / 60);
  assert.equal(b.state, 'idle'); assert.ok(b.cool > 0.6 && b.cool <= 0.7, String(b.cool)); assert.equal(b.counterUsed, false);
  const c = setup();
  for (let i = 0; i < 90 && c.s.riley.hp === 100; i++) c.b.update(1 / 60);
  assert.ok(c.s.riley.hp < 100, 'control: unsnared lunge hits');
});
