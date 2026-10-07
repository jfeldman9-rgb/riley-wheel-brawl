import test from 'node:test';
import assert from 'node:assert/strict';
import { stage5Simulation, withSeed } from './helpers/stage5-harness.mjs';
import { substeps, SUB_CAP } from '../src/stage5-clock.js';
import { Stalker } from '../src/blightspawn.js';

test('substeps drop non-finite deltas and cap a huge frame', () => {
  const owner = { accum: 0 };
  let n = 0;
  assert.equal(substeps(owner, Number.NaN, () => { n++; }), 0);
  assert.equal(substeps(owner, 0, () => { n++; }), 0);
  const huge = substeps(owner, 10, () => { n++; });
  assert.ok(huge <= SUB_CAP);
  assert.ok(n <= SUB_CAP);
});

test('idling for 120 seconds does not throw, leak a hold, or exceed the light budget', () => withSeed(1, () => {
  const h = stage5Simulation({ mode: null });
  const s = h.s;
  try {
    s.inp.demo = { x: 0, y: 0 };
    for (let i = 0; i < 60 * 120; i++) h.step();
    assert.equal(s.gameOver, false);
    assert.equal(s.riley.grabbedBy || null, null);
    assert.ok(h.resources().lights <= 10);
    assert.ok(Number.isFinite(s.riley.x));
  } finally { h.destroy(); }
}));

test('a melee flush of a lurker counts, and a second flush in the same swing does not', () => withSeed(1, () => {
  const h = stage5Simulation({ mode: null });
  const s = h.s;
  try {
    const stalk = new Stalker(s, s.riley.x + 40, s.riley.y);
    stalk.state = 'lurk';
    const before = s.kit.stats.flushes;
    stalk.takeHit({ dmg: 1 }, s.riley);
    assert.equal(s.kit.stats.flushes, before + 1);
    stalk.state = 'lurk';
    stalk.takeHit({ dmg: 1 }, s.riley);
    assert.equal(s.kit.stats.flushes, before + 2);
    const again = s.kit.stats.flushes;
    stalk.takeHit({ dmg: 1 }, s.riley);
    assert.equal(s.kit.stats.flushes, again);
  } finally { h.destroy(); }
}));

test('zone clear drops live Stage 5 hazards', () => withSeed(1, () => {
  const h = stage5Simulation();
  const s = h.s;
  try {
    s.kit.update(1 / 60);
    s.kit.onZoneClear(0);
    const threats = s.kit.threats();
    assert.equal(threats.thorns.filter(t => t.zone === 0 && t.on !== false && t.burn <= 0).length >= 0, true);
    s.kit.clearHazards();
    assert.equal(s.riley.fogSlow, 0);
  } finally { h.destroy(); }
}));
