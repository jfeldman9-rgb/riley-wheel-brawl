import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
import { Stage1 } from '../src/stage1.js';

function lighting() {
  const h = stage1Simulation({ mode: null }), s = h.s;
  s.started = false; s.updateCamera = () => {}; // Isolate the light from gameplay camera look-ahead.
  return h;
}

test('hero light is positioned before the first update and reset on scene restart', () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  try {
    assert.equal(s.heroLightX, s.riley.x + s.riley.facing * 30);
    assert.equal(s.heroLight.x, s.heroLightX);
    s.heroLightX = NaN; s.scene.restart(); h.step(0);
    assert.equal(s.heroLightX, s.riley.x + s.riley.facing * 30);
    assert.equal(s.heroLight.x, s.heroLightX);
    s.gameOver = true; s.continueGame(); h.step();
    assert.ok(Number.isFinite(s.heroLightX)); assert.equal(s.heroLight.x, s.heroLightX);
  } finally { h.destroy(); }
});

test('hero light recovers uninitialized easing state and missing facing without NaN', () => {
  const h = lighting(), s = h.s;
  try {
    for (const previous of [undefined, NaN]) {
      s.heroLightX = previous; s.riley.facing = undefined;
      s.update(0, 0); assert.equal(s.heroLightX, s.riley.x); assert.equal(s.heroLight.x, s.riley.x);
    }
  } finally { h.destroy(); }
});

test('hero light uses unscaled render dt in slowmo and timeScale modes', () => {
  for (const [slowmo, timeScale] of [[0, 1], [0.1, 1], [0, 0.25], [0.1, 0.25]]) {
    const h = lighting(), s = h.s;
    try {
      s.heroLightX = 0; s.fx.slowmo = slowmo; s.timeScale = timeScale;
      s.update(0, 1000 / 60);
      const expected = (s.riley.x + s.riley.facing * 30) * (1 - Math.exp(-12 / 60));
      assert.ok(Math.abs(s.heroLightX - expected) < 1e-12);
      assert.equal(s.anims.globalTimeScale, slowmo ? 0.3 : timeScale);
      assert.equal(s.fx._dt, 1 / 60);
    } finally { h.destroy(); }
  }
});

test('hero light stays frozen through hitstop and eases by one frame on exit', () => {
  const h = lighting(), s = h.s;
  try {
    s.heroLightX = 0; s.fx.hitstop = 0.02;
    for (let i = 0; i < 2; i++) { s.update(i * 1000 / 60, 1000 / 60); assert.equal(s.heroLightX, 0); assert.equal(s.anims.globalTimeScale, 0); }
    s.update(100, 1000 / 60);
    assert.ok(Math.abs(s.heroLightX - 210 * (1 - Math.exp(-12 / 60))) < 1e-12);
  } finally { h.destroy(); }
});

test('hero light converges over equal wall time at 30/60/120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    const h = lighting(), s = h.s;
    try {
      s.heroLightX = 0;
      for (let i = 0; i < hz / 2; i++) s.update(i * 1000 / hz, 1000 / hz);
      assert.ok(Math.abs(s.heroLightX - 210 * (1 - Math.exp(-6))) < 1e-10);
      s.update(1000, 3600000); assert.ok(Number.isFinite(s.heroLightX)); assert.ok(s.heroLightX <= 210);
    } finally { h.destroy(); }
  }
});

test('camera scroll rounding accepts only finite positive scales and follows governor changes', () => withSeed(1, () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  try {
    s.camX = s.camMax = 100.3; s.riley.x = 650; s.fx.shakeOffset = () => [0.12, -0.31];
    for (const [gameRS, sceneRS, expectedRS] of [[Infinity, 2, 2], [-1, 2, 2], [0, 2, 2], [NaN, NaN, 1], [undefined, undefined, 1], [1.5, 2, 1.5], [1, 2, 1]]) {
      s.game.rs = gameRS; s.rs = sceneRS;
      Stage1.prototype.updateCamera.call(s, 0);
      assert.equal(s.cameras.main.x, Math.round(100.42 * expectedRS) / expectedRS);
      assert.equal(s.cameras.main.y, Math.round(-0.31 * expectedRS) / expectedRS);
      assert.equal(s.camX, 100.3); assert.equal(s.camMax, 100.3);
      assert.equal(s.bounds.l, 100.3);
    }
  } finally { h.destroy(); }
}));
