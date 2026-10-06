import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, withSeed } from './helpers/stage3-harness.mjs';
import { STORY3_SCRIPT, STORY3_PANELS } from '../src/stage3.js';

for (const reason of ['report', 'graphics-context']) {
  test(`Stage 3 story ignores advances and skips during ${reason} suspension`, () => withSeed(8, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      s.startCutscene(STORY3_SCRIPT, STORY3_PANELS, () => s.music.set('stage'));
      const cs = s.cutscene;
      s.tickCutscene(1);
      s.setPauseReason(reason, true);
      const before = [cs.i, cs.t, cs.elapsed];
      for (const action of ['attack', 'jump', 'special', 'start', 'pause']) {
        s.tickCutscene(2); s.onPress(action);
        assert.equal(s.cutscene, cs);
        assert.deepEqual([cs.i, cs.t, cs.elapsed], before);
        assert.equal(s.music.state, 'cutscene');
        assert.equal(s.paused, true);
      }
      s.setPauseReason(reason, false);
      s.onPress('attack');
      assert.equal(cs.i, 1);
      s.onPress('start');
      assert.equal(s.cutscene, null);
      assert.equal(s.paused, false);
      assert.equal(s.music.state, 'stage');
    } finally { h.destroy(); }
  }));
}

test('resuming a manually paused Stage 3 story preserves its line before skip', () => withSeed(8, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    s.startCutscene(STORY3_SCRIPT, STORY3_PANELS);
    const cs = s.cutscene;
    cs.t = 1;
    s.setPauseReason('manual', true);
    s.onPress('attack');
    assert.equal(cs.i, 0);
    s.onPress('pause');
    assert.equal(s.pauseReasons.has('manual'), false);
    assert.equal(s.cutscene, cs);
    assert.equal(s.paused, true, 'the story still owns the gameplay pause');
    s.onPress('attack');
    assert.equal(cs.i, 1);
    s.onPress('start');
    assert.equal(s.paused, false);
  } finally { h.destroy(); }
}));
