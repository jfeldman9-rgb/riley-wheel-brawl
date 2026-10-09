import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {}, BlendModes: { ADD: 1 } };
globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };

const { STAGES, stageFromQuery, maxStage } = await import('../src/stages.js');
const { STAGE_NAMES, clearPrompt } = await import('../src/hud.js');
const { STORY5_SCRIPT } = await import('../src/stage5.js');
const { stage5Simulation, withSeed } = await import('./helpers/stage5-harness.mjs');

const Q = s => new URLSearchParams(s);

test('Stage 5 is on the title arrows and a clear of Stage 4 continues into it', () => {
  assert.equal(maxStage(Q('')), 5);
  assert.equal(stageFromQuery(Q('stage=5')), 5);
  assert.match(STAGE_NAMES[5], /BLIGHT/);
  assert.match(clearPrompt(4, false, 5), /CONTINUE TO STAGE 5/);
  assert.match(clearPrompt(5, false, 1), /RETURN TO THE TITLE/);
  assert.deepEqual(STAGES[4].next(), { stage: 5, fromStage4: true, autostart: true });
  assert.deepEqual(STAGES[5].next(), { stage: 1 });
  assert.equal(STAGES[5].next().score, undefined);
  assert.equal(STAGES[5].next().lives, undefined);
  assert.equal(STORY5_SCRIPT.length, 5);
});

test('a fresh Stage 5 start resets score and lives', () => withSeed(1, () => {
  const h = stage5Simulation();
  try {
    assert.equal(h.s.stageNo, 5);
    assert.equal(h.s.riley.score, 0);
    assert.equal(h.s.riley.lives, 3);
    assert.equal(h.s.riley.hp, 100);
  } finally { h.destroy(); }
}));
