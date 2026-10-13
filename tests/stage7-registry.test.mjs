import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { stageEnabled, maxStage, stageFromQuery, resolveStage, STAGES, STAGE_CHARS } from '../src/stages.js';

const Q = s => new URLSearchParams(s);

test('stage 7 is off unless s7=1, and stage=7 alone is stage 1', () => {
  assert.equal(stageEnabled(7, Q('')), false);
  assert.equal(stageEnabled(7, Q('s7=1')), true);
  assert.equal(stageEnabled(7, Q('s7=0')), false);
  assert.equal(maxStage(Q('')), 6);
  assert.equal(maxStage(Q('s6=0')), 5);
  assert.equal(maxStage(Q('s7=1')), 7);
  assert.equal(stageFromQuery(Q('stage=7')), 1);
  assert.equal(stageFromQuery(Q('stage=7&s7=1')), 7);
  assert.equal(resolveStage({ stage: 7 }, Q('')), 1);
  assert.equal(resolveStage({ stage: 7 }, Q('s7=1')), 7);
  assert.deepEqual(STAGE_CHARS[7], ['riley', 'grunt', 'spear']);
});

test('stage 6 returns to the title unless s7=1, and stage 7 returns to the title', () => {
  assert.deepEqual(STAGES[6].next(), { stage: 1 });
  assert.deepEqual(STAGES[6].next(Q('s6=1')), { stage: 1 });
  assert.deepEqual(STAGES[6].next(Q('s7=1')), { stage: 7, fromStage6: true, autostart: true });
  assert.deepEqual(STAGES[7].next(), { stage: 1 });
  assert.equal(STAGES[7].boss.type, 'asmodean');
  assert.equal(STAGES[7].music.stage, 'stage7');
});

test('protected files are untouched', () => {
  execFileSync('git', ['diff', '--exit-code', '--', 'src/input.js', 'src/hud.js', 'lib', 'index.html'], { stdio: 'pipe' });
});
