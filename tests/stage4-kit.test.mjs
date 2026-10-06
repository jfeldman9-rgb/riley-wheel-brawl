import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { LAYOUT } from '../src/stage4-view.js';

test('the kit builds fog, moonshafts and a light budget without throwing', () => {
  const h = stage4Simulation();
  const s = h.s;
  try {
    assert.equal(s.stageNo, 4);
    assert.ok(Array.isArray(s.fires));
    assert.equal(s.fireCap, 2);
    assert.equal(s.kit.shafts.length, LAYOUT.shafts.length);
    assert.ok(s.kit.fog.vents.length >= 2);
    for (let i = 0; i < 60 * 8; i++) h.step();
    assert.equal(s.kit.stats.hints, 1);
    assert.ok(s.kit.stats.tendrils >= 1 || s.kit.fog.tendrils.length >= 1);
    assert.ok(h.resources().lights <= 10);
    s.kit.destroy();
    assert.equal(s.kit.fog.tendrils.length, 0);
    assert.equal(s.kit.fog.vents.length, 0);
  } finally { h.destroy(); }
});
