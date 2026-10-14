import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStreet, stepStreet, clearStreetZone, bandOfY, STREET } from '../src/stage7-street.js';
import { VOLLEY_BANDS } from '../src/stages.js';

function world(over = {}) {
  return {
    zone: 2, waveActive: true, scene: null,
    riley: { x: 500, y: (VOLLEY_BANDS[1][0] + VOLLEY_BANDS[1][1]) / 2, z: 0, hp: 100, alive: true },
    enemies: [], ...over,
  };
}
function run(street, secs, w, dt = 1 / 60) { w.scene = w.scene || w; for (let t = 0; t < secs; t += dt) stepStreet(street, dt, w); }

test('one ring every 9 s while a Z2 wave is active, on Riley\'s band, 1.1 s tell then strike', () => {
  const st = createStreet();
  const w = world();
  let rings = 0; w.onRing = () => rings++;
  run(st, STREET.every - 0.1, w);
  assert.equal(st.ring, null);
  run(st, 0.2, w);
  assert.ok(st.ring); assert.equal(rings, 1);
  assert.equal(st.ring.band, bandOfY(w.riley.y));
  assert.equal(st.ring.x, w.riley.x);
  assert.equal(st.ring.phase, 'tell');
  // Move Riley clear so the strike whiffs, then let it finish.
  run(st, STREET.tell - 0.3, w);
  w.riley.x += 400;
  run(st, 0.4, w);
  assert.equal(st.ring.phase, 'strike');
  run(st, STREET.strike, w);
  assert.equal(st.ring, null);
  assert.equal(w.riley.hp, 100, 'leaving the ring avoids it');
});

test('the strike hits Riley once (counter latch) for 9 and enemies for 30; jumping avoids it', () => {
  const st = createStreet(); st.at = 0;
  const hits = [];
  const foe = { x: 500, y: (VOLLEY_BANDS[1][0] + VOLLEY_BANDS[1][1]) / 2, alive: true, type: 'grunt', takeHit(h) { hits.push(h.dmg); } };
  const w = world({ enemies: [foe] });
  run(st, STREET.tell + STREET.strike, w);
  assert.equal(w.riley.hp, 100 - STREET.dmg);
  assert.deepEqual(hits, [STREET.enemyDmg], 'each enemy is hit once per strike');
  // Airborne: no hit.
  const st2 = createStreet(); st2.at = 0;
  const w2 = world();
  run(st2, 0.1, w2);
  w2.riley.z = 80;
  run(st2, STREET.tell + STREET.strike, w2);
  assert.equal(w2.riley.hp, 100);
});

test('never on a grabbed band, never outside Z2, gone for good once Z2 clears', () => {
  const st = createStreet(); st.at = 0;
  const w = world();
  w.riley.grabbedBy = {};
  run(st, 3, w);
  assert.equal(st.ring, null, 'the grabbed band is exempt');
  w.riley.grabbedBy = null;
  run(st, 0.5, w);
  assert.ok(st.ring);
  clearStreetZone(st, 2);
  assert.equal(st.ring, null);
  run(st, 20, w);
  assert.equal(st.ring, null);
  const st2 = createStreet(); st2.at = 0;
  run(st2, 10, world({ zone: 1 }));
  assert.equal(st2.ring, null);
  const st3 = createStreet(); st3.at = 0;
  run(st3, 10, world({ waveActive: false }));
  assert.equal(st3.ring, null, 'no ring between waves');
});
