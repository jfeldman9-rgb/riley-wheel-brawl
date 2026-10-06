import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { STAGE3 } from '../src/stages.js';
const frames = (h, n) => { for (let i = 0; i < n; i++) h.step(); };

test('a lethal knee clears the wave while the camera is moving and retires held ownership', () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s, 1502); s.zones = [];
    s.camX = s.camMax = 1100; s.bounds = { l: 1100, r: 2380 };
    s.zone = STAGE3.zones[1]; s.wave = 1; s.waveGap = 0; s.pending = [];
    const c = placeC(s, 92); c.hp = 1; s.riley.startGrab(c);
    frames(h, 10); s.inp.press('attack');
    frames(h, 60);
    assert.ok(s.camX > 1100, 'camera advanced during the lethal grab');
    assert.equal(c.alive, false); assert.equal(s.riley.held, null);
    assert.equal(c.heldBy, null); assert.equal(c.sprite.anims.paused, false);
    assert.equal(s.zone, null); assert.equal(s.locked, false);
    assert.equal(s.riley.busy, false);
  } finally { h.destroy(); }
}));


test('held cutthroat takes only its actual holder knee and retains the paused hold', () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s); const c = placeC(s, 92), R = s.riley;
    R.startGrab(c); R.setState('knee', 'knee');
    const knee = { anim: 'knee', dmg: 8, kind: 'medium', kb: 0 };
    assert.equal(c.canBeHit, false);
    assert.equal(c.takeHit(knee, { ...R }), false, 'impostor holder is rejected');
    assert.equal(c.takeHit({ dmg: 8, kind: 'medium' }, R), false, 'non-knee is rejected');
    assert.equal(c.takeHit(knee, R), true); assert.equal(c.hp, 26);
    assert.equal(c.state, 'held'); assert.equal(c.heldBy, R);
    assert.equal(c.sprite.anims.paused, true);
    assert.equal(c.takeHit(knee, R), true); assert.equal(c.hp, 18);
    R.held = null; assert.equal(c.takeHit(knee, R), false);
    assert.equal(c.hp, 18);
  } finally { h.destroy(); }
}));
