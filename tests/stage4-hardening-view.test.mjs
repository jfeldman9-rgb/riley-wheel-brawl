import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { paintStage4Art, tex, sheet } from '../src/stage4-art.js';

function textureScene() {
  const keys = new Set(), calls = [], context = new Proxy({}, { get: (_, name) => name.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
  let canvases = 0;
  const prior = document.createElement;
  document.createElement = () => { canvases++; return { getContext: () => context }; };
  return { keys, calls, count: () => canvases, restore() { document.createElement = prior; }, scene: { textures: {
    exists: key => keys.has(key), addCanvas(key) { assert.equal(keys.has(key), false, `duplicate texture ${key}`); keys.add(key); calls.push(key); return { add() {} }; },
  } } };
}
test('restarts reuse procedural textures and regenerate a missing key without duplicates', () => {
  const t = textureScene();
  try {
    paintStage4Art(t.scene); const initial = t.count(); assert.ok(initial > 15);
    for (let i = 0; i < 4; i++) paintStage4Art(t.scene);
    assert.equal(t.count(), initial);
    t.keys.delete('s4tip'); paintStage4Art(t.scene);
    assert.equal(t.keys.has('s4tip'), true); assert.equal(t.count(), initial + 1);
    t.keys.clear(); paintStage4Art(t.scene); assert.equal(t.count(), initial * 2 + 1);
  } finally { t.restore(); }
});
test('tex and sheet skip existing keys before allocating canvas', () => {
  const t = textureScene();
  try {
    tex(t.scene, 'one', 1, 1, () => {}); sheet(t.scene, 'two', 2, 1, 1, () => {});
    tex(t.scene, 'one', 1, 1, () => assert.fail('draw twice')); sheet(t.scene, 'two', 2, 1, 1, () => assert.fail('draw twice'));
    assert.equal(t.count(), 2);
  } finally { t.restore(); }
});
test('view sync/budget reuse scratch collections in the warmed hot paths', () => {
  const h = stage4Simulation({ mode: null }), k = h.s.kit;
  try {
    k.view.sync(k); k.view.budget(0, true);
    const values = Object.values, filter = Array.prototype.filter, slice = Array.prototype.slice;
    try {
      Object.values = () => assert.fail('per-frame Object.values allocation');
      Array.prototype.filter = () => assert.fail('per-frame filter allocation');
      Array.prototype.slice = () => assert.fail('per-frame slice allocation');
      k.view.sync(k); k.view.budget(0, true);
    } finally { Object.values = values; Array.prototype.filter = filter; Array.prototype.slice = slice; }
  } finally { h.destroy(); }
});
test('shaft intensity follows the lights toggle for already-existing lights', () => {
  const h = stage4Simulation({ mode: null });
  try {
    const view = h.s.kit.view; view.budget(0, true); assert.ok(view.shaftLights.length);
    view.budget(0, false); assert.ok(view.shaftLights.every(L => L.intensity === 0));
    view.budget(0, true); assert.ok(view.shaftLights.every(L => L.intensity === 1.15));
  } finally { h.destroy(); }
});
