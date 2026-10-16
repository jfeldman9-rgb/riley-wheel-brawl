import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, withSeed } from './helpers/stage3-harness.mjs';
import { HUD, placeholderArt } from '../src/hud.js';
import { q } from '../src/config.js';

for (const stage of [1, 2]) {
  test(`Stage ${stage} ignores cached Stage 3 placeholder plates with s3 off`, () => withSeed(10, () => {
    const h = stage3Simulation({ mode: '', followRestart: true }), s = h.s;
    try {
      const get = s.cache.json.get.bind(s.cache.json);
      const plates = { placeholder: true };
      s.cache.json.get = k => k === 'plates3' ? plates : get(k);
      assert.equal(placeholderArt(s), true);
      q.delete('s3');
      s.scene.restart({ stage }); h.step();
      assert.equal(s.stageNo, stage);
      assert.equal(s.cache.json.get('plates3'), plates, 'JSON survives texture release');
      assert.equal(placeholderArt(s), false);
      const hud = Object.create(HUD.prototype), shown = [];
      hud.phTag = { setVisible: on => shown.push(on) };
      hud.phShown = true;
      hud.updateWatermark(s);
      assert.deepEqual(shown, [false]);
    } finally { h.destroy(); }
  }));
}

test('watermark cache follows the active stage even when metadata references are reused', () => {
  const hud = Object.create(HUD.prototype), shown = [], metas = {};
  const cache = { json: { get: () => ({ placeholder: true }) } };
  const plates = { placeholder: true };
  cache.json.get = () => plates;
  hud.phTag = { setVisible: on => shown.push(on) };
  hud.phShown = false;
  q.set('debug', '1');
  try {
    hud.updateWatermark({ stageNo: 3, metas, cache });
    hud.updateWatermark({ stageNo: 1, metas, cache });
    hud.updateWatermark({ stageNo: 2, metas, cache });
    assert.deepEqual(shown, [true, false]);
    hud.updateWatermark({ stageNo: 3, metas, cache });
    assert.deepEqual(shown, [true, false, true]);
  } finally { q.delete('debug'); }
});
