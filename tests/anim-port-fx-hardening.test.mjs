import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { Fighter } from '../src/fighter.js';

function withNoise(fn) {
  const random = Math.random; let calls = 0;
  Math.random = () => ++calls % 2 ? 0.75 : 0.25;
  try { return fn(() => calls); } finally { Math.random = random; }
}

test('shake is finite before update, holds on zero dt and recovers from invalid dt', () => {
  const h = stage1Simulation({ mode: null }), fx = h.s.fx;
  try {
    withNoise(() => {
      fx.trauma = 0.5;
      const out = fx.shakeOffset(); assert.ok(out[0] > 0 && out[1] < 0);
      const x = out[0], y = out[1];
      for (const dt of [0, NaN, undefined, Infinity, -1]) {
        fx.update(dt); assert.equal(fx.trauma, 0.5);
        assert.equal(fx.shakeOffset(), out); assert.equal(out[0], x); assert.equal(out[1], y);
      }
      fx.update(1 / 60); fx.shakeOffset(); assert.ok(out.every(Number.isFinite));
      fx.update(3600); fx.shakeOffset(); assert.deepEqual(out, [0, 0]);
    });
  } finally { h.destroy(); }
});

test('shake always draws x then y exactly twice and zero trauma clears every residual offset', () => {
  const h = stage1Simulation({ mode: null }), fx = h.s.fx;
  try {
    withNoise(calls => {
      const out = fx._out;
      for (const trauma of [0, 0.5, 1, 0]) {
        fx.trauma = trauma; const before = calls();
        assert.equal(fx.shakeOffset(), out); assert.equal(calls() - before, 2);
        if (trauma) { assert.ok(out[0] > 0 && out[1] < 0); }
        else { assert.deepEqual(out, [0, 0]); assert.equal(fx._sx, 0); assert.equal(fx._sy, 0); }
      }
    });
  } finally { h.destroy(); }
});

test('shake exponential response and trauma envelopes converge over equal wall time at 30/60/120 Hz', () => {
  const results = [];
  for (const hz of [30, 60, 120]) {
    const h = stage1Simulation({ mode: null }), fx = h.s.fx;
    try {
      withNoise(() => {
        for (let i = 0; i < hz / 10; i++) { fx.update(1 / hz); fx.trauma = 1; fx.shakeOffset(); }
        assert.ok(Math.abs(fx._sx - 5 * (1 - Math.exp(-6))) < 1e-12);
        assert.ok(Math.abs(fx._sy + 2.5 * (1 - Math.exp(-6))) < 1e-12);
        const envelope = [];
        for (let i = 0; i < hz / 2; i++) {
          fx.update(1 / hz); fx.shakeOffset();
          if ((i + 1) % (hz / 10) === 0) envelope.push(fx._sx);
        }
        results.push({ trauma: fx.trauma, x: fx._sx, envelope });
        for (let i = 0; i < hz; i++) { fx.update(1 / hz); fx.shakeOffset(); }
        assert.deepEqual(fx._out, [0, 0]);
      });
    } finally { h.destroy(); }
  }
  for (const r of results) {
    assert.ok(Math.abs(r.trauma - 0.1) < 1e-12);
    assert.ok(Math.abs(r.x - results[1].x) < 0.015);
    for (let i = 0; i < r.envelope.length; i++) assert.ok(Math.abs(r.envelope[i] - results[1].envelope[i]) < 0.07);
  }
});

test('impact flash retains the tuned scales, alpha cap and existing hitstop/slowmo values', () => {
  const h = stage1Simulation({ mode: null }), fx = h.s.fx;
  try {
    let scale, alpha; fx.flash.setScale = n => { scale = n; return fx.flash; };
    fx.flash.setAlpha = n => { alpha = n; return fx.flash; };
    for (const [kind, size, stop] of [['light', 0.55, 4], ['medium', 0.8, 6], ['heavy', 1.15, 9], ['finisher', 1.15, 14]]) {
      fx.hitstop = fx.slowmo = 0; fx.impact(kind, 100, 200);
      assert.equal(scale, size); assert.equal(alpha, 0.7); assert.equal(fx.flashT, 0.06 + stop / 120);
      assert.equal(fx.hitstop, stop / 60); assert.equal(fx.slowmo, kind === 'finisher' ? 0.26 : kind === 'heavy' ? 0.1 : 0);
      fx.update(0); assert.ok(alpha <= 0.7);
    }
  } finally { h.destroy(); }
});

test('fighter shudder retains its conditional single random draw and tuned amplitude', () => {
  const h = stage1Simulation({ mode: null }), r = h.s.riley;
  try {
    withNoise(calls => {
      r.shudder = 0; Fighter.prototype.sync.call(r); assert.equal(calls(), 0); assert.equal(r.sprite.x, r.x);
      r.shudder = 1; Fighter.prototype.sync.call(r); assert.equal(calls(), 1); assert.equal(r.sprite.x, r.x + 1);
    });
  } finally { h.destroy(); }
});
