import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {}, BlendModes: { ADD: 1 } };
globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };

const { stageEnabled, maxStage, stageFromQuery, resolveStage, STAGE_CHARS, STAGES } = await import('../src/stages.js');
const { STAGE_MUSIC } = await import('../src/music.js');

const Q = s => new URLSearchParams(s);

test('s4=1 unlocks stage 4 and implies stage 3; stage=4 without the flag stays stage 1', () => {
  assert.equal(stageEnabled(4, Q('')), false);
  assert.equal(stageEnabled(4, Q('s4=1')), true);
  assert.equal(stageEnabled(3, Q('s4=1')), true);
  assert.equal(stageEnabled(3, Q('')), false);
  assert.equal(maxStage(Q('')), 2);
  assert.equal(maxStage(Q('s3=1')), 3);
  assert.equal(maxStage(Q('s4=1')), 4);
  assert.equal(stageFromQuery(Q('stage=4')), 1);
  assert.equal(stageFromQuery(Q('stage=4&s3=1')), 1);
  assert.equal(stageFromQuery(Q('stage=4&s4=1')), 4);
  assert.equal(stageFromQuery(Q('stage=3&s4=1')), 3);
  assert.equal(resolveStage({ stage: 4 }, Q('')), 1);
  assert.equal(resolveStage({ stage: 4 }, Q('s4=1')), 4);
  assert.equal(resolveStage(null, Q('stage=4&s4=1')), 4);
});

test('stage 4 registers its cast, music ids, and a title restart', () => {
  assert.deepEqual(STAGE_CHARS[4], ['riley', 'cutthroat', 'hound', 'loial', 'cultist', 'draghkar']);
  assert.equal(STAGE_MUSIC[4].stage, 'stage4');
  assert.equal(STAGE_MUSIC[4].boss, 'boss4');
  assert.equal(STAGES[4].boss.type, 'draghkar');
  assert.equal(STAGES[4].boss.name, 'THE DRAGHKAR');
  assert.deepEqual(STAGES[4].next(), { stage: 1 });
  assert.deepEqual(STAGES[3].next(Q('')), { stage: 1 });
  assert.deepEqual(STAGES[3].next(Q('s4=1')), { stage: 4, fromStage3: true, autostart: true });
});
