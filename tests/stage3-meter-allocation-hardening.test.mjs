import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { mashRing, fearArc, drawStage3Meters } from '../src/hud.js';

test('meter helpers accept reusable storage and retain independent default snapshots', () => {
  const R = { state: 'grabbed', grabbedBy: { mashN: 2 } };
  const s = { stageNo: 3, riley: R, boss: { alive: true, phase: 2, auraOn: true, fear: 0.4 } };
  const out = {};
  assert.equal(mashRing(R, out), out);
  assert.equal(out.fill, 1 / 3);
  assert.equal(fearArc(s, out), out);
  assert.equal(out.fill, 0.4);
  const before = mashRing(R);
  R.grabbedBy.mashN = 3;
  assert.equal(mashRing(R).fill, 0.5);
  assert.equal(before.fill, 1 / 3);
  assert.notEqual(fearArc(s), fearArc(s));
  s.boss.fear = 2;
  assert.equal(fearArc(s, out).fill, 1);
  s.boss.alive = false;
  assert.equal(fearArc(s, out), null);
});

test('drawing active and inactive Stage 3 meters supplies the same storage every frame', () => {
  const source = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  // Observe arguments at the real drawing call sites without changing rendering.
  const { draw, calls } = vm.runInNewContext(`${source}
    const calls = [], originalMash = mashRing, originalFear = fearArc;
    mashRing = (r, out) => { calls.push(out); return originalMash(r, out); };
    fearArc = (s, out) => { calls.push(out); return originalFear(s, out); };
    ({ draw: drawStage3Meters, calls });`, {
    Phaser: { Scene: class {} }, VH: 720, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  });
  const R = { x: 600, y: 630, state: 'grabbed', grabbedBy: { mashN: 2 } };
  const s = { stageNo: 3, riley: R, boss: { alive: true, phase: 2, auraOn: true, fear: 0.4 } };
  const arcs = [], g = { arc: (...args) => arcs.push(args) };
  draw(s, g);
  assert.equal(arcs.length, 2);
  assert.ok(Math.abs(arcs[0][4] - (-Math.PI / 2 + Math.PI * 2 / 3)) < 1e-10);
  assert.ok(Math.abs(arcs[1][4] - (-Math.PI / 2 + Math.PI * 2 * 0.4)) < 1e-10);
  for (let i = 0; i < 600; i++) draw(s, {});
  R.state = 'idle'; s.stageNo = 1;
  for (let i = 0; i < 600; i++) draw(s, {});
  assert.ok(calls[0] && typeof calls[0] === 'object');
  assert.equal(new Set(calls).size, 1);
  assert.ok(calls.every(out => out === calls[0]));
});

for (const stage of [1, 2, 3]) {
  test(`Stage ${stage} restart mid-mash leaves no old HUD ring`, () => withSeed(11, () => {
    const h = stage3Simulation({ mode: '', followRestart: true }), s = h.s;
    try {
      arena(s);
      const c = placeC(s, -46); c.startHold(s.riley); c.mash(); c.mash();
      const oldR = s.riley;
      const rings = [], g = { strokeCircle: (...args) => rings.push(args) };
      drawStage3Meters(s, g);
      assert.equal(rings.length, 1);
      s.scene.restart({ stage }); h.step();
      assert.equal(oldR.grabbedBy, null);
      rings.length = 0; drawStage3Meters(s, g);
      assert.equal(rings.length, 0);
      assert.equal(mashRing(s.riley), null);
    } finally { h.destroy(); }
  }));
}
