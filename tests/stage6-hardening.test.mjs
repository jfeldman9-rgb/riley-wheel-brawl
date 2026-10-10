import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage6Simulation, withSeed } from './helpers/stage6-harness.mjs';
import { Stage6Kit } from '../src/stage6.js';

const stub = () => { const o = { setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, setDisplaySize() { return o; }, setLighting() { return o; }, setAlpha() { return o; }, setBlendMode() { return o; }, setScale() { return o; }, setVisible() { return o; }, setFrame() { return o; }, destroy() {} }; return o; };

test('quality can be set before build, and bad deltas do not throw', () => {
  const s = {
    fx: {}, enemies: [], riley: { y: 640, fogSlow: 0, alive: true },
    add: { image: stub, sprite: stub, tileSprite: stub },
    textures: { exists: () => true },
    lights: { addLight() { return { x: 0 }; }, removeLight() {} },
    time: { delayedCall() {} },
  };
  const kit = new Stage6Kit(s);
  kit.setQuality(2);
  assert.equal(kit.quality, 2);
  kit.build();
  assert.equal(kit.view.quality, 2);
  kit.update(Number.NaN);
  kit.update(0);
  kit.update(100);
  assert.equal(kit.bossTime, 0);
  kit.destroy();
});

test('idling 120 seconds does not end the run or blow the light budget', () => withSeed(1, () => {
  const h = stage6Simulation({ mode: null });
  const s = h.s;
  try {
    s.inp.demo = { x: 0, y: 0 };
    for (let i = 0; i < 60 * 120; i++) h.step();
    assert.equal(s.gameOver, false);
    assert.equal(s.ended, false);
    assert.equal(s.riley.grabbedBy || null, null);
    assert.ok(h.resources().lights <= 10);
    assert.ok(Number.isFinite(s.riley.x));
  } finally { h.destroy(); }
}));

test('200 random inputs do not throw or produce a non-finite Riley', () => withSeed(7, () => {
  const h = stage6Simulation({ mode: null });
  const s = h.s;
  try {
    const keys = ['attack', 'jump', 'special', 'power', 'assist'];
    for (let i = 0; i < 200; i++) {
      s.inp.demo = { x: (i % 3) - 1, y: ((i >> 1) % 3) - 1, run: i % 2 === 0 };
      if (i % 5 === 0) s.inp.press(keys[i % keys.length]);
      h.step();
    }
    assert.ok([s.riley.x, s.riley.y, s.riley.hp].every(Number.isFinite));
  } finally { h.destroy(); }
}));
