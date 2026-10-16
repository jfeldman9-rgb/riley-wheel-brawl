import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?q=5&rs=2' };
globalThis.window = { devicePixelRatio: 2 };
globalThis.document = { getElementById: () => null, querySelector: () => null };
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false });
const steps = {}, calls = []; let poolClears = 0;
const st = { runId: 1, fx: {}, snowFront: {}, started: true,
  setBloom(v) { calls.push(['bloom', v]); }, setBackdropLit(v) { calls.push(['backdrop', v]); },
  cameras: { main: { setZoom() {} } } };
globalThis.Phaser = {
  Scene: class {}, WEBGL: 2, Scale: { FIT: 1, CENTER_BOTH: 1 },
  Game: class {
    constructor() { this.events = { on: (k, fn) => steps[k] = fn }; this.scene = { getScene: () => st };
      this.scale = { resize() {} }; this.renderer = { gl: { getExtension: () => null, getParameter: () => 'test GPU' },
        drawingContextPool: { clear() { poolClears++; } } }; }
  },
};
await import('../src/main.js');
test('quality tier is reapplied when the scene recreates effects', () => {
  const game = window.__game; game.governor(1 / 60);
  assert.equal(st.fx.quality, 5); assert.equal(game.rs, 1); assert.equal(st.snowFront.frequency, 240);
  st.runId++; st.fx = {}; st.snowFront = {}; calls.length = 0;
  game.governor(1 / 60);
  assert.equal(st.fx.quality, 5); assert.equal(st.snowFront.frequency, 240);
  assert.deepEqual(calls, [['bloom', false], ['backdrop', false]]);
});
test('quality transitions release idle targets without clearing every gameplay frame', () => {
  const game = window.__game;
  assert.ok(poolClears > 0, 'prior bloom/scale transitions cleared released targets');
  const before = poolClears;
  game.governor(1 / 60); game.governor(1 / 60); game.setRS(game.rs);
  assert.equal(poolClears, before);
  game.setRS(1.5); assert.equal(poolClears, before + 1);
});
test('input is polled from the game step independently of a paused gameplay scene', () => {
  const deltas = []; window.__game.inp.update = dt => deltas.push(dt);
  steps.step(1000, 16); steps.step(1100, 100);
  assert.deepEqual(deltas, [0.016, 0.05]);
});
