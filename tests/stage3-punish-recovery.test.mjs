import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FADE } from '../src/myrddraal.js';

for (const state of ['hurt', 'down', 'getup']) {
  test(`copy punish survives ${state} recovery until the boss can lunge`, () => withSeed(7, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      arena(s);
      const f = new Myrddraal(s, 900, 630);
      f.entering = false; f.introDone = true; f.cool = 99; f.nextBlink = 99;
      s.enemies.push(f);
      f.setState(state, state === 'down' ? 'knockdown' : state, 0.5);
      f.onCopyPopped({});
      let elapsed = 0;
      while (f.state !== 'lunge' && elapsed < 3) {
        h.step(); elapsed += 1 / 60;
      }
      assert.ok(elapsed > FADE.split.wrongHitPunish, 'recovery outlasts the old expiry');
      assert.equal(f.state, 'lunge');
      assert.equal(f.forceLungeT, 0);
    } finally { h.destroy(); }
  }));
}
