import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed } from './helpers/stage7-harness.mjs';
import { playCall7, resetCall7Bags } from '../src/call7-cutscene.js';

test('playCall7 does not wait, and a stage 7 scene can spend a charge', () => {
  resetCall7Bags();
  let ran = 0;
  playCall7({ kit: {}, cutRoot: { sessionStorage: { getItem: () => null, setItem() {} }, navigator: {} } }, 'duo', () => { ran++; });
  assert.equal(ran, 1);
  withSeed(1, () => {
    const h = stage7Simulation({ mode: null });
    try {
      const s = h.s;
      assert.equal(s.stageNo, 7);
      assert.equal(s.kit.call.charges, 1);
      s.zoneI = 0; s.zone = s.zones[0]; s.bounds = { l: s.zone.l, r: s.zone.r };
      const e = s.spawn('grunt', 'R');
      e.entering = false; e.x = s.riley.x + 90; e.y = s.riley.y;
      s.inp.press('assist');
      h.step();
      assert.equal(s.kit.call.calls, 1);
      assert.ok(s.kit.strike);
    } finally { h.destroy(); resetCall7Bags(); }
  });
});
