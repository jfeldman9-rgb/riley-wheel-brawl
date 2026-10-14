import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stageFromQuery, resolveStage, stageEnabled, maxStage, STAGES } from '../src/stages.js';
import { callInFor } from '../src/rand-call.js';
import { plateRect, STREAMS } from '../src/zone-stream.js';
import { STAGE6 } from '../src/stage6-def.js';

const Q = s => new URLSearchParams(s);

test('T1: ?stage=7 needs ?s7=1; integers only; data wins over the URL', () => {
  assert.equal(stageFromQuery(Q('stage=7')), 1, 'no s7 flag stays on Stage 1');
  assert.equal(stageFromQuery(Q('stage=7&s7=1')), 7);
  assert.equal(stageFromQuery(Q('stage=7&s7=0')), 1);
  assert.equal(stageFromQuery(Q('stage=2.5')), 1, 'a fractional stage is not a stage');
  assert.equal(stageFromQuery(Q('stage=6.5&s7=1')), 1);
  assert.equal(stageFromQuery(Q('stage=8&s7=1')), 1);
  assert.equal(stageFromQuery(Q('stage=6&s6=0')), 1);
  assert.equal(stageFromQuery(Q('stage=6')), 6);
  assert.equal(resolveStage({ stage: 7 }, Q('stage=2&s7=1')), 7, 'restart data wins');
  assert.equal(resolveStage({ stage: 7 }, Q('stage=2')), 2, 'disabled data falls back to the URL');
  assert.equal(resolveStage({ stage: 2.5 }, Q('stage=3')), 3);
  assert.equal(stageEnabled(7, Q('s7=1')), true);
  assert.equal(stageEnabled(7, Q('')), false);
  assert.equal(maxStage(Q('')), 6);
  assert.equal(maxStage(Q('s7=1')), 7);
  assert.equal(maxStage(Q('s6=0')), 5);
});

test('T1: call-in switch is Loial 1-5, Rand 6, Moiraine/Lan 7+', () => {
  for (const n of [1, 2, 3, 4, 5]) assert.equal(callInFor(n), 'loial', n);
  assert.equal(callInFor(6), 'rand');
  assert.equal(callInFor(7), 'moilan');
  assert.equal(callInFor(8), 'moilan');
});

test('T1: Stage 6 flows to 7 only when s7=1, and Stage 7 loops to Stage 1', () => {
  assert.deepEqual(STAGE6.next(Q('s7=1')), { stage: 7, fromStage6: true, autostart: true });
  assert.deepEqual(STAGE6.next(Q('')), { stage: 1 });
  assert.deepEqual(STAGES[7].next(), { stage: 1 });
});

test('T1: Stage 6 plateRect output is unchanged; Stage 7 feathers every seam', () => {
  const zones = STAGES[6].zones;
  const bleed56 = [128, 48, 0, 48, 128];
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(plateRect(i, zones, STREAMS[6].bleed), plateRect(i, zones, bleed56), i);
    assert.deepEqual(plateRect(i, zones), plateRect(i, zones, bleed56), 'default bleed is the 5-6 shape');
  }
  assert.deepEqual([...STREAMS[7].bleed], [128, 48, 48, 48, 128]);
  // Zone 2 of Stage 6 starts exactly on the seam (0 bleed); Stage 7 overlaps by 48.
  assert.equal(plateRect(2, zones, STREAMS[6].bleed).x, zones[2].l);
  assert.equal(plateRect(2, STAGES[7].zones, STREAMS[7].bleed).x, STAGES[7].zones[2].l - 48);
});

test('T1: Riley and the world freeze through kit predicates, not a hard-coded 6', () => {
  const riley = readFileSync('src/riley.js', 'utf8');
  const stage1 = readFileSync('src/stage1.js', 'utf8');
  assert.match(riley, /kit\?\.freezesRiley\?\.\(\)/);
  assert.match(stage1, /kit\?\.freezesWorld\?\.\(\)/);
  assert.doesNotMatch(riley, /stageNo === 6/);
  const hud6 = readFileSync('src/stage6-hud.js', 'utf8');
  assert.doesNotMatch(hud6, /stageNo >= 6|n >= 6/, 'Stage 6 HUD must not repaint Stage 7');
  const pages = readFileSync('src/texture-pages.js', 'utf8');
  assert.match(pages, /COMPACT_STAGES = new Set\(\[5, 6, 7\]\)/);
  const bot = readFileSync('src/bot-stage4.js', 'utf8');
  assert.match(bot, /stageNo === 7\) return stage7Bot/);
});
