import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, withSeed } from './helpers/stage3-harness.mjs';
import { STORY3_SCRIPT, STORY3_PANELS } from '../src/stage3.js';

for (const stage of [1, 2, 3]) {
  test(`restarting a Stage 3 story into Stage ${stage} retires its callbacks`, () => withSeed(7, () => {
    const h = stage3Simulation({ mode: '', followRestart: true }), s = h.s;
    try {
      let completed = 0;
      s.startCutscene(STORY3_SCRIPT, STORY3_PANELS, () => completed++);
      const old = s.cutscene;
      s.scene.restart({ stage }); h.step();
      assert.equal(s.stageNo, stage);
      assert.equal(s.cutscene, null);
      assert.equal(s.cutsceneAfter, null);
      assert.equal(old.done, true);
      assert.equal(s.paused, false);
      const calls = h.observations.hud.length;
      old.next(); old.press('start'); old.update(60); old.onEnd('end');
      assert.equal(completed, 0);
      assert.equal(h.observations.hud.length, calls);
      let newCompleted = 0;
      s.startCutscene(STORY3_SCRIPT, STORY3_PANELS, () => newCompleted++);
      const current = s.cutscene;
      old.onEnd('skip');
      assert.equal(s.cutscene, current);
      assert.equal(s.paused, true);
      s.onPress('start');
      assert.equal(newCompleted, 1);
      assert.equal(completed, 0);
      assert.equal(s.paused, false);
      assert.equal(s.inp.listeners.press.length, 1);
      assert.equal(s.inp.listeners.key.length, 1);
    } finally { h.destroy(); }
  }));
}

test('a Stage 3 story callback cannot leak into the Stage 1 Twix completion', () => withSeed(7, () => {
  const h = stage3Simulation({ mode: '', followRestart: true }), s = h.s;
  try {
    let completed = 0;
    s.startCutscene(STORY3_SCRIPT, STORY3_PANELS, () => completed++);
    s.scene.restart({ stage: 1 }); h.step();
    s.music.set('stage');
    assert.equal(s.startTwixCutscene(), true);
    s.onPress('start');
    assert.equal(completed, 0);
    assert.equal(s.music.state, 'stage');
  } finally { h.destroy(); }
}));
