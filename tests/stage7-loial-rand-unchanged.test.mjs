import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
import { stage6Simulation } from './helpers/stage6-harness.mjs';
import { callInFor } from '../src/rand-call.js';

test('Stages 1-5 keep Loial and Stage 6 keeps Rand (kit and call-in identity)', () => {
  for (const n of [1, 2, 3, 4, 5]) assert.equal(callInFor(n), 'loial', n);
  assert.equal(callInFor(6), 'rand');
  assert.equal(callInFor(7), 'moilan');
  // Stage 1 runs its plain scene: no Stage 7 kit, no call7 state.
  withSeed(1, () => {
    const h = stage1Simulation({ mode: '1', stage: 1 });
    try {
      for (let i = 0; i < 240 && !h.s.started; i++) h.step();
      assert.equal(h.s.stageNo, 1);
      assert.ok(!h.s.kit || !h.s.kit.call7, 'no Moiraine/Lan state on Stage 1');
    } finally { h.destroy(); }
  });
  // Stage 6 runs the Rand kit.
  withSeed(1, () => {
    const h = stage6Simulation({ rand: false });
    try {
      assert.equal(h.s.stageNo, 6);
      assert.ok(h.s.kit.rand, 'Rand state on Stage 6');
      assert.ok(!h.s.kit.call7, 'no Moiraine/Lan state on Stage 6');
    } finally { h.destroy(); }
  });
});

test('no Stage 1-6 module references Stage 7 art, audio or clips', () => {
  const files = ['src/stage2.js', 'src/stage3.js', 'src/stage4.js', 'src/stage5.js', 'src/stage6.js',
    'src/stage5-def.js', 'src/loial.js'];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /stage7|bg7|s7[a-z]|st7_|call7|moilan/i, f);
  }
  // stage6-def may only point onward to 7 behind the s7 flag.
  const def6 = readFileSync('src/stage6-def.js', 'utf8');
  assert.match(def6, /s7.*=== '1' \? \{ stage: 7/);
});
