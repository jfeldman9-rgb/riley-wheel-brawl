import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FADE } from '../src/myrddraal.js';

for (const hz of [30, 60, 120]) {
  for (const timer of ['braveT', 'dispelT']) {
    test(`${timer} expiry counts only the unprotected fraction at ${hz} Hz`, () => withSeed(1, () => {
      const h = stage3Simulation({ mode: '' }), s = h.s;
      try {
        arena(s);
        const f = new Myrddraal(s, s.riley.x + 200, s.riley.y), dt = 1 / hz;
        f.auraOn = true;
        for (const initialFear of [0, 0.5, 1 - 0.75 * dt / FADE.fear.fill]) {
          for (const fraction of [0.25, 1]) {
            f.fear = initialFear; f.braveT = f.dispelT = 0;
            f[timer] = fraction * dt;
            const shaken = s.kit.stats.shaken || 0;
            f.tickFear(dt);
            const expected = Math.max(0, initialFear - fraction * dt / FADE.fear.fill) +
              (1 - fraction) * dt / FADE.fear.fill;
            assert.ok(Math.abs(f.fear - expected) < 1e-12,
              `${timer}=${fraction} frame: fear ${f.fear}, expected ${expected}`);
            assert.equal(f[timer], 0, 'expired timers clamp to zero');
            assert.equal(s.kit.stats.shaken || 0, shaken, 'expiry cannot shake a frame early');
          }
        }
      } finally { h.destroy(); }
    }));
  }
}

test('overlapping brave and dispel windows use their union before fear fills', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const f = new Myrddraal(s, s.riley.x + 200, s.riley.y);
    f.auraOn = true; f.fear = 0;
    f.braveT = 0.01; f.dispelT = 0.03;
    f.tickFear(0.04);
    assert.ok(Math.abs(f.fear - 0.01 / FADE.fear.fill) < 1e-12);
    assert.equal(f.braveT, 0); assert.equal(f.dispelT, 0);
  } finally { h.destroy(); }
}));
