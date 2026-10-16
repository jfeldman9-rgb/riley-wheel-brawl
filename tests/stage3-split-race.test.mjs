import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FadeCopy, FADE } from '../src/myrddraal.js';

test('parrying on the phase-three boundary cancels the queued split until resplit expires', () => withSeed(4, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const f = new Myrddraal(s, 1000, 630);
    f.entering = false; f.introDone = true; f.nextBlink = 99;
    s.enemies.push(f);
    f.startAttack(); f.hp = 140;
    f.update(0);
    assert.equal(f.phase, 3); assert.equal(f.pendingSplit, true);
    f.takeHit({ dmg: 1, kind: 'light' }, s.riley);
    assert.equal(f.state, 'stagger');
    const delay = f.resplitT;
    assert.ok(delay >= FADE.split.every[0]);
    for (let frame = 0; frame < 900; frame++) {
      h.step();
      const live = s.enemies.filter(e => e instanceof FadeCopy && e.alive);
      assert.ok(live.length <= FADE.split.copies, `frame ${frame}: orphaned copies`);
      assert.deepEqual(live, f.copies);
      if ((frame + 1) / 60 < delay) assert.equal(live.length, 0, 'no premature split');
    }
    assert.equal(s.kit.stats.splits, 1);
    assert.equal(f.copies.length, 2);
    f.takeHit({ dmg: 9999, kind: 'heavy' }, s.riley);
    assert.equal(f.alive, false);
    assert.equal(f.pendingSplit, false);
    assert.equal(f.copies.length, 0);
    for (let frame = 0; frame < 180; frame++) h.step();
    assert.ok(!s.enemies.some(e => e instanceof FadeCopy && e.alive));
  } finally { h.destroy(); }
}));
