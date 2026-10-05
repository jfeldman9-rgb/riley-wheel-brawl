import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';

for (const action of ['death', 'down', 'respawn', 'continue', 'destroy']) {
  test(`a hold releases synchronously on ${action}`, () => withSeed(2, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      arena(s);
      const R = s.riley, c = placeC(s, -46);
      c.startHold(R);
      assert.equal(R.grabbedBy, c);
      if (action === 'death') {
        s.god = false;
        R.takeHit({ dmg: 999, down: true }, { x: R.x - 1 });
        assert.equal(R.alive, false);
        assert.equal(R.state, 'down');
      } else if (action === 'down') R.down(1, {});
      else if (action === 'respawn') R.respawn();
      else if (action === 'continue') { s.gameOver = true; s.continueGame(); }
      else c.destroy();
      assert.equal(R.grabbedBy, null, 'no stale owner before the next scene update');
      assert.equal(R.lastGrabber, null);
      assert.notEqual(R.state, 'grabbed');
      assert.equal(s.kit.stats.breaks, 1);
      if (action !== 'destroy') {
        h.step();
        assert.notEqual(c.state, 'holding');
        assert.equal(s.kit.stats.breaks, 1, 'release counted once');
      }
    } finally { h.destroy(); }
  }));
}

test('a second or repeated startHold cannot steal ownership or reset mash progress', () => withSeed(8, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const R = s.riley, a = placeC(s, -46), b = placeC(s, 46);
    a.startHold(R); a.mash();
    a.startHold(R); b.startHold(R);
    assert.equal(R.grabbedBy, a);
    assert.equal(a.mashN, 1);
    assert.notEqual(b.state, 'holding');
    assert.equal(s.kit.stats.grabs, 1);
    for (let i = 0; i < 5; i++) a.mash();
    assert.equal(R.state, 'escape');
    assert.equal(s.kit.stats.escapes, 1);
  } finally { h.destroy(); }
}));
