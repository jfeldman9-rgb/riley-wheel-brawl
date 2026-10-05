import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FADE } from '../src/myrddraal.js';
import { LIGHTNING } from '../src/powers.js';

function fade(s) {
  arena(s);
  const f = new Myrddraal(s, s.riley.x + 200, s.riley.y);
  Object.assign(f, { entering: false, introDone: true, auraOn: true, cool: 99, nextBlink: 99 });
  f.T.speed = 0;
  s.enemies.push(f);
  return f;
}

for (const hz of [30, 60, 120]) {
  for (const mode of ['fill', 'brave', 'dispel']) {
    test(`${mode} fear clock freezes through nested pauses at ${hz} Hz`, () => withSeed(1, () => {
      const h = stage3Simulation({ mode: '' }), s = h.s;
      try {
        const f = fade(s), dt = 1 / hz;
        f.fear = 0.4;
        if (mode === 'brave') f.braveT = 1.25;
        if (mode === 'dispel') f.dispelT = 2;
        const snap = () => [f.braveT, f.fear, f.dispelT, f.auraK, f.t, f.fi, s.riley.st, s.riley.fi];
        const before = snap();
        s.setPauseReason('manual', true);
        s.setPauseReason('report', true);
        s.setPauseReason('graphics', true);
        for (let i = 0; i < hz * 3; i++) h.step(dt);
        assert.deepEqual(snap(), before);
        s.setPauseReason('manual', false);
        s.setPauseReason('report', false);
        for (let i = 0; i < hz; i++) h.step(dt);
        assert.deepEqual(snap(), before, 'the last pause reason still freezes gameplay');
        s.setPauseReason('graphics', false);
        h.step(dt);
        const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} vs ${b}`);
        near(f.fear, 0.4 + (mode === 'fill' ? dt : -dt) / FADE.fear.fill);
        near(f.braveT, mode === 'brave' ? 1.25 - dt : 0);
        near(f.dispelT, mode === 'dispel' ? 2 - dt : 0);
        assert.equal(s.kit.stats.shaken || 0, 0);
      } finally { h.destroy(); }
    }));
  }
}

for (const stage of [1, 2, 3]) {
  test(`restart into Stage ${stage} clears the retired boss's brave and fear`, () => withSeed(1, () => {
    const h = stage3Simulation({ mode: '', followRestart: true }), s = h.s;
    try {
      const f = fade(s);
      f.braveT = FADE.fear.brave; f.fear = 0.8;
      s.scene.restart({ stage }); h.step();
      assert.equal(s.stageNo, stage);
      assert.equal(f.braveT, 0); assert.equal(f.fear, 0); assert.equal(f.auraOn, false);
      assert.ok(!s.enemies.includes(f));
    } finally { h.destroy(); }
  }));
}

test('clearAbilities clears brave immediately and a new aura can fill again', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    const f = fade(s);
    f.braveT = FADE.fear.brave; f.fear = 0.8;
    f.clearAbilities();
    assert.equal(f.braveT, 0); assert.equal(f.fear, 0); assert.equal(f.auraOn, false);
    f.auraOn = true; f.tickFear(1 / 60);
    assert.ok(f.fear > 0);
  } finally { h.destroy(); }
}));

test('a lightning cast killing the boss on its aura frame cannot rearm fear or copies', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s, R = s.riley;
  try {
    const f = fade(s);
    s.boss = f;
    f.hp = 1; f.phase = 3; f.auraOn = false;
    f.fear = 0.99; f.braveT = FADE.fear.brave; f.pendingSplit = true;
    f.makeCopies(); f.startFear();
    f.sprite.anims.setCurrentFrame(f.sprite.anims.currentAnim.frames[FADE.fear.auraFrame]);
    R.face(1); R.startPowerCast('lightning');
    R.sprite.anims.setCurrentFrame(R.sprite.anims.currentAnim.frames[
      R.cur === 'riley_lightning' ? LIGHTNING.fireFrame : 2]);
    h.step();
    assert.equal(R.cast_fired, true); assert.equal(R.state, 'cast');
    assert.equal(f.alive, false); assert.equal(f.state, 'defeated');
    assert.equal(f.auraOn, false); assert.equal(f.auraActive, false);
    assert.equal(f.braveT, 0); assert.equal(f.fear, 0);
    assert.equal(f.copies.length, 0); assert.equal(f.pendingSplit, false);
    assert.equal(s.kit.stats.shaken || 0, 0);
    assert.equal(s.kit.stats.fears || 0, 0);
    for (let i = 0; i < 720 && !s.clearShown; i++) h.step();
    assert.equal(s.clearShown, true);
    assert.equal(h.observations.hud.filter(o => o.method === 'stageClear').length, 1);
  } finally { h.destroy(); }
}));

test('fear decays during a real cutthroat hold and escape without disrupting mash or shove', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s, R = s.riley;
  try {
    const f = fade(s), c = placeC(s, -46);
    c.startHold(R); f.fear = 0.99;
    let prev = f.fear;
    for (let i = 0; i < 5; i++) {
      s.inp.press('attack'); h.step();
      assert.equal(R.state, 'grabbed'); assert.equal(R.grabbedBy, c);
      assert.ok(f.fear < prev); prev = f.fear;
    }
    s.inp.press('attack'); h.step();
    assert.equal(R.state, 'escape'); assert.equal(R.grabbedBy, null);
    assert.equal(s.kit.stats.escapes, 1);
    let impacts = 0;
    const impact = s.fx.impact.bind(s.fx);
    s.fx.impact = (...args) => { impacts++; return impact(...args); };
    for (let i = 0; i < 120 && R.state === 'escape'; i++) {
      assert.ok(f.fear <= prev); prev = f.fear;
      h.step();
    }
    assert.equal(R.state, 'idle'); assert.equal(R.lastGrabber, null);
    assert.equal(impacts, 1); assert.equal(s.kit.stats.shaken || 0, 0);
  } finally { h.destroy(); }
}));

for (const state of ['down', 'getup']) {
  test(`fear decays while Riley is ${state}`, () => withSeed(1, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      const f = fade(s);
      s.riley.setState(state, state === 'down' ? 'knockdown' : 'getup');
      f.fear = 0.99;
      h.step();
      assert.equal(s.riley.state, state);
      assert.ok(f.fear < 0.99); assert.equal(s.kit.stats.shaken || 0, 0);
    } finally { h.destroy(); }
  }));
}

for (const hz of [30, 60, 120]) {
  test(`brave remains 2.5 s and shake duty cycle stays below 25% at ${hz} Hz`, () => withSeed(1, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      const f = fade(s), dt = 1 / hz, shakes = [];
      let hurtFrames = 0, count = 0;
      assert.equal(FADE.fear.brave, 2.5);
      for (let i = 0; i < hz * 20; i++) {
        const brave = f.braveT;
        h.step(dt);
        if (brave >= dt) assert.equal(f.fear, 0, 'a full brave frame cannot fill');
        if (s.riley.state === 'hurt') hurtFrames++;
        if ((s.kit.stats.shaken || 0) > count) {
          shakes.push((i + 1) * dt); count++;
          assert.equal(f.braveT, 2.5);
        }
      }
      assert.equal(count, 5);
      assert.ok(hurtFrames / (hz * 20) <= 0.25);
      for (let i = 1; i < shakes.length; i++) {
        assert.ok(shakes[i] - shakes[i - 1] >= 2.5 + FADE.fear.fill - dt - 1e-12);
      }
    } finally { h.destroy(); }
  }));
}
