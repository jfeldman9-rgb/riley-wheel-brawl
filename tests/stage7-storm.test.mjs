import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorm, stepStorm, applyGust, stormPush, isBraced, markSpawn, stepSilhouettes, STORM } from '../src/stage7-storm.js';

const W = (over = {}) => ({ zone: 1, waveActive: true, zoneCleared: false, grabbed: false, striking: false, ...over });
function run(storm, secs, w, dt = 1 / 60) { for (let t = 0; t < secs; t += dt) stepStorm(storm, dt, w); }

test('cycle: first gust 2 s after arming, 2.5 s tell, 4 s gust, direction alternates', () => {
  const st = createStorm(1);
  run(st, 10, W());
  assert.equal(st.phase, 'wait', 'not armed, no storm');
  st.armed = true;
  let told = 0, gusted = 0;
  const w = W({ onTell: () => told++, onGust: () => gusted++ });
  run(st, STORM.firstDelay - 0.1, w);
  assert.equal(st.phase, 'wait');
  run(st, 0.2, w);
  assert.equal(st.phase, 'tell'); assert.equal(told, 1);
  run(st, STORM.tell, w);
  assert.equal(st.phase, 'gust'); assert.equal(gusted, 1);
  assert.equal(st.dir, 1);
  run(st, STORM.gust, w);
  assert.equal(st.phase, 'wait');
  assert.equal(st.gusts, 1);
  assert.equal(st.dir, -1, 'next gust blows the other way');
  // Full cycle from tell start to next tell start is 14 s.
  run(st, STORM.cycle - STORM.tell - STORM.gust, w);
  assert.equal(st.phase, 'tell');
  assert.equal(told, 2);
});

test('no gust starts while Riley is grabbed or a call strike is playing', () => {
  for (const over of [{ grabbed: true }, { striking: true }]) {
    const st = createStorm(1); st.armed = true;
    run(st, 10, W(over));
    assert.equal(st.phase, 'wait', JSON.stringify(over));
    run(st, 0.1, W());
    assert.equal(st.phase, 'tell', 'starts at once when the hold clears');
  }
});

test('the storm ends when Z1 clears and never runs outside Z1', () => {
  const st = createStorm(1); st.armed = true;
  run(st, 3, W({ zone: 0 }));
  assert.equal(st.phase, 'wait'); assert.equal(st.done, false);
  run(st, 0.1, W({ zoneCleared: true }));
  assert.equal(st.done, true);
  run(st, 5, W());
  assert.equal(st.phase, 'wait');
});

test('gust push moves only X, respects zone bounds, and bracing halves it for Riley', () => {
  const st = createStorm(1); st.phase = 'gust';
  const riley = { x: 500, y: 630, z: 0 };
  const foe = { x: 500, y: 600 };
  // inpX -1 pushes into a +1 wind: braced.
  assert.equal(isBraced(riley, -1, 1), true);
  assert.equal(stormPush(st, true, true), STORM.push * 0.5);
  assert.equal(stormPush(st, false, true), STORM.push);
  applyGust(st, [riley, foe], 1, { l: 0, r: 1280 }, riley, -1);
  assert.equal(riley.x, 500 + 35);
  assert.equal(foe.x, 500 + 70);
  assert.equal(riley.y, 630); assert.equal(foe.y, 600);
  const edge = { x: 1270, y: 630, z: 0 };
  applyGust(st, [edge], 1, { l: 0, r: 1280 }, riley, 0);
  assert.equal(edge.x, 1240, 'clamped inside the zone');
  assert.equal(stormPush({ phase: 'wait', dir: 1 }, true, false), 0);
});

test('storm spawns are silhouettes for 0.6 s: entering (no hitbox), alpha 0.4 to 1', () => {
  const st = createStorm(1); st.phase = 'gust';
  const e = { x: 10, y: 630 };
  markSpawn(st, e);
  assert.equal(e.entering, true);
  assert.equal(e._s7sil, STORM.sil);
  stepSilhouettes([e], 0.3);
  assert.ok(e._s7sil > 0 && e.entering);
  assert.ok(e._s7alpha >= 0.4 && e._s7alpha < 1, e._s7alpha);
  stepSilhouettes([e], 0.31);
  assert.equal(e._s7sil, 0);
  assert.equal(e._s7alpha, 1);
  const calm = createStorm(1);
  const e2 = {};
  markSpawn(calm, e2);
  assert.equal(e2._s7sil, undefined, 'no silhouette outside a gust');
});
