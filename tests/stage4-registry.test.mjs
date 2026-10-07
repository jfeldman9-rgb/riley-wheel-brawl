import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {}, BlendModes: { ADD: 1 } };
globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };

const { stageEnabled, maxStage, stageFromQuery, resolveStage, STAGE_CHARS, STAGES } = await import('../src/stages.js');
const { STAGE_MUSIC } = await import('../src/music.js');

const Q = s => new URLSearchParams(s);

test('stages 1–5 stay enabled with no flags; s3 and s4 do not change stage 4 or 5 selection', () => {
  for (const query of ['', 's3=1', 's4=1', 's3=1&s4=1']) {
    for (const n of [1, 2, 3, 4, 5]) assert.equal(stageEnabled(n, Q(query)), true, `${n} ${query}`);
    assert.equal(stageEnabled(6, Q(query)), false, query);
    assert.equal(maxStage(Q(query)), 5, query);
  }
  assert.equal(stageFromQuery(Q('')), 1);
  assert.equal(stageFromQuery(Q('s4=1')), 1);
  assert.equal(stageFromQuery(Q('stage=4')), 4);
  assert.equal(stageFromQuery(Q('stage=4&s3=1')), 4);
  assert.equal(stageFromQuery(Q('stage=4&s4=1')), 4);
  assert.equal(stageFromQuery(Q('stage=3&s4=1')), 3);
  assert.equal(stageFromQuery(Q('stage=3')), 3);
  assert.equal(stageFromQuery(Q('stage=5')), 5);
  assert.equal(stageFromQuery(Q('stage=5&s4=1')), 5);
  assert.equal(resolveStage({ stage: 4 }, Q('')), 4);
  assert.equal(resolveStage({ stage: 4 }, Q('s4=1')), 4);
  assert.equal(resolveStage({ stage: 5 }, Q('')), 5);
  assert.equal(resolveStage({ stage: 3 }, Q('')), 3);
  assert.equal(resolveStage(null, Q('stage=4&s4=1')), 4);
  assert.equal(resolveStage(null, Q('stage=5')), 5);
  assert.equal(resolveStage({ stage: 1 }, Q('stage=4')), 1);
});

test('stage 4 registers its cast, music ids, and a title restart', () => {
  assert.deepEqual(STAGE_CHARS[4], ['riley', 'cutthroat', 'hound', 'loial', 'cultist', 'draghkar']);
  assert.equal(STAGE_MUSIC[4].stage, 'stage4');
  assert.equal(STAGE_MUSIC[4].boss, 'boss4');
  assert.equal(STAGES[4].boss.type, 'draghkar');
  assert.equal(STAGES[4].boss.name, 'THE DRAGHKAR');
  const into5 = { stage: 5, fromStage4: true, autostart: true };
  assert.deepEqual(STAGES[4].next(), into5);
  assert.deepEqual(STAGES[4].next(Q('')), into5);
  assert.deepEqual(STAGES[4].next(Q('s4=1')), into5);
  assert.equal(STAGE_MUSIC[5].stage, 'stage5');
  assert.equal(STAGE_MUSIC[5].boss, 'boss5');
  assert.equal(STAGES[5].boss.type, 'aginor');
  assert.deepEqual(STAGES[5].next(), { stage: 1 });
  const into4 = { stage: 4, fromStage3: true, autostart: true };
  assert.deepEqual(STAGES[3].next(Q('')), into4);
  assert.deepEqual(STAGES[3].next(Q('s4=1')), into4);
  assert.deepEqual(STAGES[2].next(Q('')), { stage: 3, fromStage2: true, autostart: true });
});
