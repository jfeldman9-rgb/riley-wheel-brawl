import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const { stageEnabled, maxStage, stageFromQuery, resolveStage, STAGES, STAGE_CHARS } = await import('../src/stages.js');
const { STAGE_MUSIC } = await import('../src/music.js');
const { stage6Say, STAGE6_VOICES } = await import('../src/stage6-voice.js');

const Q = s => new URLSearchParams(s);

test('stage 6 stays behind s6=1', () => {
  assert.equal(stageEnabled(6, Q('')), false);
  assert.equal(stageEnabled(6, Q('s4=1')), false);
  assert.equal(stageEnabled(6, Q('s5=1')), false);
  assert.equal(stageEnabled(6, Q('s6=1')), true);
  assert.equal(maxStage(Q('')), 5);
  assert.equal(maxStage(Q('s6=0')), 5);
  assert.equal(maxStage(Q('s6=1')), 6);
  assert.equal(stageFromQuery(Q('stage=6')), 1);
  assert.equal(stageFromQuery(Q('stage=6&s6=1')), 6);
  assert.equal(resolveStage({ stage: 6 }, Q('')), 1);
  assert.equal(resolveStage({ stage: 6 }, Q('s6=1')), 6);
  for (const n of [1, 2, 3, 4, 5]) assert.equal(stageEnabled(n, Q('')), true);
});

test('stage 5 returns to the title unless s6=1, and stage 6 always returns to the title', () => {
  assert.deepEqual(STAGES[5].next(), { stage: 1 });
  assert.deepEqual(STAGES[5].next(Q('')), { stage: 1 });
  assert.deepEqual(STAGES[5].next(Q('s3=1')), { stage: 1 });
  assert.deepEqual(STAGES[5].next(Q('s6=1')), { stage: 6, fromStage5: true, autostart: true });
  assert.deepEqual(STAGES[6].next(), { stage: 1 });
  assert.deepEqual(STAGES[6].next(Q('s6=1')), { stage: 1 });
  assert.equal(STAGES[6].boss.type, 'belal');
  assert.equal(STAGES[6].zones.length, 4);
  assert.deepEqual(STAGE_MUSIC[6], { stage: 'stage6', boss: 'boss6' });
  assert.ok(!STAGE_CHARS[6].includes('loial'));
  assert.ok(STAGE_CHARS[6].includes('riley'));
});

test('missing voice files stay captions', () => {
  const said = [];
  stage6Say('riley_st6_rand_wait_01', (who, text) => said.push(`${who}:${text}`));
  assert.deepEqual(said, ['RILEY:Rand needs a breather.']);
  assert.ok(STAGE6_VOICES.length >= 24);
  const manifest = JSON.parse(readFileSync('assets/audio/stage6-voice-manifest.json', 'utf8'));
  assert.deepEqual(manifest.present, []);
  assert.match(readFileSync('index.html', 'utf8'), /id="tbL"[^>]*>CALL</);
});

test('stage 6 uses the stage 4 input test, and the protected files are unchanged', () => {
  assert.equal(existsSync('tests/stage4-input.test.mjs'), true);
  assert.equal(existsSync('tests/stage5-input.test.mjs'), false);
  for (const name of readdirSync('src')) {
    if (!/^(stage6|rand-call|belal|grayman|fadelt|bot-stage6)/.test(name)) continue;
    const src = readFileSync('src/' + name, 'utf8');
    assert.doesNotMatch(src, /from '\.\/input\.js'/, name);
    assert.doesNotMatch(src, /new Input\(/, name);
  }
  execFileSync('git', ['diff', '--exit-code', '--', 'src/input.js', 'src/hud.js', 'lib', 'index.html'], { stdio: 'pipe' });
});
