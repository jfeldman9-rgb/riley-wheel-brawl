import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FADE } from '../src/myrddraal.js';

for (const state of ['grab', 'hold', 'knee', 'throw']) {
  test(`a fear shake during Riley's ${state} releases his held enemy`, () => withSeed(1, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s, R = s.riley;
    try {
      arena(s);
      const f = new Myrddraal(s, R.x + 200, R.y);
      Object.assign(f, { entering: false, introDone: true, auraOn: true, cool: 99, nextBlink: 99 });
      s.enemies.push(f);
      const c = placeC(s, 92);
      R.startGrab(c);
      R.setState(state, state);
      f.fear = 1 - (1 / 60) / FADE.fear.fill / 2;
      h.step();
      assert.equal(R.state, 'hurt');
      assert.equal(s.kit.stats.shaken, 1);
      assert.equal(R.held, null, 'shake cannot leave Riley owning an enemy');
      assert.equal(c.heldBy, null);
      assert.notEqual(c.state, 'held', 'enemy must leave its indefinitely frozen pose');
      assert.equal(c.sprite.anims.paused, false);
      f.cool = 99;
      for (let i = 0; i < 45; i++) h.step();
      assert.equal(R.state, 'idle');
      assert.equal(R.held, null);
      assert.notEqual(c.state, 'held');
    } finally { h.destroy(); }
  }));
}
