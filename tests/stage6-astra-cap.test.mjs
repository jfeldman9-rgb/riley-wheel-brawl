import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { q } from '../src/config.js';
import { CutscenePlayer, MAX_CLIP_MS } from '../src/cutscene.js';
import { playCall, abortRandCall, resetRandCall, removeRandBless } from '../src/rand-call-cutscene.js';
import { videoEnv } from './stage6-hardening-fixtures.mjs';

// Astra review: Rand's 11 s cap must hold against wall-clock time even while the video keeps creeping forward.
const slow = (e, rate) => { e.clock = false; for (const v of e.videos) Object.defineProperty(v, 'currentTime', { configurable: true, get: () => e.t * rate / 1000 }); };
function rand(e) { q.set('cutscenes', '1'); resetRandCall(e.root.sessionStorage, () => 0.3); }
function cleanup(e) { abortRandCall(e.scene); removeRandBless(); q.delete('cutscenes'); }

test('Rand clip creeping at 0.05 media s per 250 ms tick still ends by the 11 s wall-clock cap', () => {
  const e = videoEnv(); rand(e); const results = [];
  try {
    assert.equal(playCall(e.scene, how => results.push(how)), true); slow(e, 0.2);
    e.advance(10500); assert.ok(e.scene.cutscene, 'still playing before the cap');
    e.advance(1000);
    assert.equal(e.scene.cutscene, null, 'gameplay resumes by about 11 s'); assert.equal(e.scene.paused, false);
    assert.deepEqual(results, ['timeout']);
  } finally { cleanup(e); }
});

test('hidden time does not count toward the Rand cap', () => {
  const e = videoEnv(); rand(e); const results = [];
  try {
    playCall(e.scene, how => results.push(how)); slow(e, 0.2);
    e.advance(5000); e.root.document.hidden = true; e.advance(30000); e.root.document.hidden = false;
    assert.ok(e.scene.cutscene, 'hidden 30 s did not end the clip'); assert.deepEqual(results, []);
    e.advance(5500); assert.ok(e.scene.cutscene, '10.5 s visible: still playing');
    e.advance(1000); assert.equal(e.scene.cutscene, null); assert.deepEqual(results, ['timeout']);
  } finally { cleanup(e); }
});

test('intro cutscenes (no maxMs option) are unchanged: a slow clip keeps playing past 30 s while it progresses', () => {
  const e = videoEnv(), p = new CutscenePlayer(e.root), done = [];
  assert.equal(p.maxMs, MAX_CLIP_MS); assert.equal(p.capMs, null);
  p.play(['intro_battle'], { done: how => done.push(how) }); slow(e, 0.2);
  e.advance(45000); assert.deepEqual(done, [], 'progressing intro clip is not cut by a wall-clock cap');
  p.video.fire('ended'); assert.deepEqual(done, ['end']);
});

test('intro battle clip (about 15 s) plays to its end at normal speed', () => {
  const e = videoEnv(), p = new CutscenePlayer(e.root), done = [];
  p.play(['intro_battle'], { done: how => done.push(how) });
  e.advance(15200); assert.deepEqual(done, []); p.video.fire('ended');
  assert.deepEqual(done, ['end']); assert.ok(p.log.includes('intro_battle:ended'), p.log.join());
});
