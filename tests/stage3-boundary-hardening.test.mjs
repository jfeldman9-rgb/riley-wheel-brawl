import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FadeCopy } from '../src/myrddraal.js';

for (const hz of [30, 60, 120]) {
  test(`hold damage and timeout use elapsed time at ${hz} Hz`, () => withSeed(6, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      arena(s);
      const c = placeC(s, -46); c.startHold(s.riley);
      let frames = 0;
      while (c.state === 'holding' && frames < 4 * hz) { h.step(1 / hz); frames++; }
      assert.ok(Math.abs(frames / hz - 2.4) <= 1 / hz + 1e-9);
      assert.equal(c.chips, 3);
      assert.equal(s.riley.hp, 86);
      assert.equal(s.riley.state, 'down');
      assert.equal(s.riley.grabbedBy, null);
      assert.equal(s.kit.stats.throws, 1);
    } finally { h.destroy(); }
  }));
}

test('pausing during escape freezes the pose and resumes with exactly one shove effect', () => withSeed(6, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const c = placeC(s, -46); c.startHold(s.riley);
    for (let i = 0; i < 6; i++) c.mash();
    const R = s.riley, pose = [R.state, R.st, R.fi, c.st];
    let impacts = 0;
    const impact = s.fx.impact.bind(s.fx);
    s.fx.impact = (...args) => { impacts++; return impact(...args); };
    s.setPauseReason('manual', true);
    for (let i = 0; i < 180; i++) h.step();
    assert.deepEqual([R.state, R.st, R.fi, c.st], pose);
    assert.equal(impacts, 0);
    s.setPauseReason('manual', false);
    for (let i = 0; i < 90; i++) h.step();
    assert.equal(R.state, 'idle'); assert.equal(R.lastGrabber, null);
    assert.equal(impacts, 1);
    assert.equal(s.kit.stats.escapes, 1);
  } finally { h.destroy(); }
}));

for (const stage of [1, 2, 3]) {
  test(`leaving a grab and boss abilities for Stage ${stage} clears the old run`, () => withSeed(6, () => {
    const h = stage3Simulation({ mode: '', followRestart: true }), s = h.s;
    try {
      arena(s);
      const c = placeC(s, -46); c.startHold(s.riley);
      const oldR = s.riley, kit = s.kit;
      const f = new Myrddraal(s, 1000, 630);
      f.entering = false; f.introDone = true; f.auraOn = true;
      s.enemies.push(f); f.makeCopies(); f.pool = { x: 800, y: 630 };
      const vig = s.vignette;
      vig.strength = 0.75;
      s.scene.restart({ stage }); h.step();
      assert.equal(s.stageNo, stage);
      assert.equal(oldR.grabbedBy, null);
      assert.equal(kit.destroyed, true);
      assert.equal(f.pool, null); assert.equal(f.copies.length, 0); assert.equal(f.auraOn, false);
      assert.equal(vig.strength, 0.35);
      assert.ok(!s.enemies.some(e => e instanceof FadeCopy));
      // This harness's renderer does not initialize filter properties itself.
      s.vignette.strength = 0.35;
      for (let i = 0; i < 60; i++) {
        h.step();
        assert.equal(s.vignette.strength, 0.35);
      }
      assert.equal(s.inp.listeners.press.length, 1);
      assert.equal(s.inp.listeners.key.length, 1);
    } finally { h.destroy(); }
  }));
}

for (const state of ['intro', 'fear', 'split', 'blinkout', 'blinkin', 'attack', 'lunge', 'stagger']) {
  test(`killing the boss during ${state} cannot rearm abilities or block victory`, () => withSeed(6, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      arena(s);
      const f = new Myrddraal(s, 1000, 630);
      f.entering = false; f.introDone = true;
      s.enemies.push(f); s.boss = f;
      f.makeCopies(); f.auraOn = true; f.pendingFear = f.pendingSplit = true;
      f.setState(state, state === 'attack' ? 'slash' : state);
      f.takeHit({ dmg: 9999, kind: 'heavy' }, s.riley);
      assert.equal(f.state, 'defeated'); assert.equal(f.alive, false);
      for (let i = 0; i < 720 && !s.clearShown; i++) h.step();
      assert.equal(s.ended, true); assert.equal(s.clearShown, true);
      assert.equal(f.pendingFear, false); assert.equal(f.pendingSplit, false);
      assert.equal(f.copies.length, 0);
      assert.equal(s.vignette.strength, 0.35);
      assert.equal(h.observations.hud.filter(o => o.method === 'stageClear').length, 1);
    } finally { h.destroy(); }
  }));
}
