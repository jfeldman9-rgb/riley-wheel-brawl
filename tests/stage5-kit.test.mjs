import test from 'node:test';
import assert from 'node:assert/strict';
import { stage5Simulation, withSeed } from './helpers/stage5-harness.mjs';

test('the kit accepts governor levels 0 through 5 before and after build', () => withSeed(1, () => {
  const h = stage5Simulation({ mode: null });
  const s = h.s;
  try {
    assert.equal(typeof s.kit.setQuality, 'function');
    for (const level of [0, 1, 2, 3, 4, 5]) {
      assert.doesNotThrow(() => s.kit.setQuality(level));
      s.kit.update(1 / 60);
      assert.equal(s.fx.quality, level);
    }
    assert.ok(s.fires);
    assert.ok(Array.isArray(s.fires));
  } finally { h.destroy(); }
}));

test('a huge, zero, and non-finite delta does not throw or leave NaN on Riley', () => withSeed(1, () => {
  const h = stage5Simulation();
  const s = h.s;
  try {
    for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 5]) {
      assert.doesNotThrow(() => s.kit.update(dt));
      assert.ok(Number.isFinite(s.riley.x) && Number.isFinite(s.riley.hp));
    }
  } finally { h.destroy(); }
}));
