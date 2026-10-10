import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { q } from '../src/config.js';
import { CutscenePlayer } from '../src/cutscene.js';
import { playCall, abortRandCall, resetRandCall, installRandBless, removeRandBless, prefetchRand, dropBlob, blobCount, createBag } from '../src/rand-call-cutscene.js';
import { videoEnv, deferred } from './stage6-hardening-fixtures.mjs';

function enabled(e) { q.set('cutscenes', '1'); resetRandCall(e.root.sessionStorage, () => 0.3); }
function cleanup(e) { abortRandCall(e.scene); removeRandBless(); q.delete('cutscenes'); }

test('late prefetch cannot recreate a blob after disposal', async () => {
  dropBlob(); const d = deferred(); const p = prefetchRand('R1', () => d.promise);
  await Promise.resolve(); dropBlob();
  d.resolve({ ok: true, blob: async () => new Blob(['clip']) });
  assert.equal(await p, false); assert.equal(blobCount(), 0); dropBlob();
});
test('overlapping prefetches keep only the newest URL and revoke superseded URLs', async () => {
  const a = deferred(), b = deferred(), made = [], revoked = [];
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { const u = 'blob:' + made.length; made.push(u); return u; };
  URL.revokeObjectURL = u => revoked.push(u);
  try {
    const pa = prefetchRand('R1', () => a.promise), pb = prefetchRand('R2', () => b.promise);
    b.resolve({ ok: true, blob: async () => new Blob(['b']) }); assert.equal(await pb, true);
    a.resolve({ ok: true, blob: async () => new Blob(['a']) }); assert.equal(await pa, false);
    assert.equal(made.length, 1); assert.equal(blobCount(), 1); dropBlob(); assert.deepEqual(revoked, made);
  } finally { dropBlob(); URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});
test('Rand plays the gesture-blessed second element, reuses it, and never replaces the main player', () => {
  const e = videoEnv(); enabled(e);
  const main = new CutscenePlayer(e.root); const mainVideo = main.element();
  try {
    installRandBless(e.scene); e.root.document.fire('pointerdown'); const blessed = e.videos[1];
    playCall(e.scene, () => {});
    assert.equal(e.videos.length, 2); assert.equal(e.videos[1], blessed);
    assert.equal(blessed.parent?.parent, e.root.document.body);
    assert.equal(blessed.playsInline, true); assert.equal(blessed.getAttribute('webkit-playsinline'), '');
    blessed.fire('ended'); playCall(e.scene, () => {}); assert.equal(e.videos.length, 2);
    abortRandCall(e.scene); assert.equal(blessed.src, ''); assert.equal(blessed.paused, true);
    assert.equal(main.video, mainVideo); assert.equal(e.root.document.body.children.length, 0); assert.equal(e.timers.size, 0);
  } finally { cleanup(e); }
});
test('successful calls do not accumulate shutdown listeners', () => {
  const e = videoEnv(); enabled(e);
  try { for (let n = 0; n < 3; n++) { playCall(e.scene, () => {}); e.videos[e.videos.length - 1].fire('ended'); assert.equal(e.scene.events.listenerCount('shutdown'), 0); } }
  finally { cleanup(e); }
});
test('finishing a clip preserves a concurrent manual/hidden pause', () => {
  const e = videoEnv(); enabled(e);
  try { playCall(e.scene, () => {}); e.scene.setPauseReason('visibility', true); const before = e.scene.scene.resumes; e.videos[0].fire('ended'); assert.equal(e.scene.paused, true); assert.equal(e.scene.scene.resumes, before); }
  finally { cleanup(e); }
});
test('DOM construction failure leaves no cutscene, duck, or pause and returns the immediate-strike path', () => {
  const e = videoEnv(); enabled(e); e.root.document.createElement = () => { throw new Error('unavailable'); };
  try { assert.equal(playCall(e.scene, () => {}), false); assert.equal(e.scene.cutscene, null); assert.equal(e.scene.paused, false); assert.equal(e.scene.music.gainMul, 0.7); }
  finally { cleanup(e); }
});
for (const n of [1, 2, 3, 4, 5]) test(`rotation bag N=${n} visits every clip per refill and restores without repeats`, () => {
  const e = videoEnv(), ids = Array.from({ length: n }, (_, i) => 'R' + (i + 1)); let bag = createBag(e.root.sessionStorage, () => 0.3, ids), prev;
  for (let cycle = 0; cycle < 20; cycle++) { const seen = []; for (let i = 0; i < n; i++) { const id = bag.next(); if (n > 1) assert.notEqual(id, prev); prev = id; seen.push(id); } assert.deepEqual(seen.sort(), ids); bag = createBag(e.root.sessionStorage, () => 0.3, ids); }
});
for (const mode of ['404', 'decode', 'refused', 'muted', 'stall', 'no-start', 'skip', 'pad']) test(`zero installed clips / ${mode}: one strike callback, released player/timer/input/music`, async () => {
  const e = videoEnv(); enabled(e); const results = [];
  if (mode === 'refused') e.refused = { name: 'NotSupportedError' };
  if (mode === 'muted') { let n = 0; const create = e.root.document.createElement; e.root.document.createElement = tag => { const v = create(tag); if (tag === 'video') v.play = function() { e.plays.push({ muted: this.muted }); if (!n++) return Promise.reject({ name: 'NotAllowedError' }); this.paused = false; return Promise.resolve(); }; return v; }; }
  if (mode === 'no-start') e.clock = false;
  let pad = false; if (mode === 'pad') e.root.navigator.getGamepads = () => [{ buttons: [{ pressed: pad }] }];
  try {
    playCall(e.scene, how => results.push(how)); await Promise.resolve(); await Promise.resolve();
    const v = e.videos[0];
    if (mode === '404' || mode === 'decode') v.fire('error');
    if (mode === 'muted') { assert.deepEqual(e.plays.map(p => p.muted), [false, true]); v.fire('ended'); }
    if (mode === 'stall') { e.advance(500); e.clock = false; e.advance(2000); }
    if (mode === 'no-start') e.advance(2000);
    if (mode === 'skip') { e.advance(899); e.scene.cutscene.press('jump'); assert.equal(results.length, 0); e.advance(1); e.scene.cutscene.press('jump'); }
    if (mode === 'pad') { e.advance(1000); pad = true; e.advance(250); }
    assert.equal(results.length, 1); v.fire('ended'); v.fire('error'); assert.equal(results.length, 1);
    assert.equal(e.timers.size, 0); assert.equal(e.root.document.body.children.length, 0); assert.equal(v.src, ''); assert.equal(v.paused, true);
    assert.equal(e.scene.music.gainMul, 0.7); assert.ok(e.scene.inp.flushes > 0); assert.equal(e.scene.kit.flushInp, 1);
  } finally { cleanup(e); }
});

for (const alreadyPaused of [false, true]) test(`Rand video freezes rendering and restores only its own game pause (prior=${alreadyPaused})`, () => {
  const e = videoEnv(); enabled(e);
  const g = e.scene.game = { isPaused: alreadyPaused, pauses: 0, resumes: 0, pause() { this.pauses++; this.isPaused = true; }, resume() { this.resumes++; this.isPaused = false; } };
  try { playCall(e.scene, () => {}); assert.equal(g.isPaused, true); e.videos[0].fire('ended'); assert.equal(g.isPaused, alreadyPaused); assert.equal(g.pauses, alreadyPaused ? 0 : 1); assert.equal(g.resumes, alreadyPaused ? 0 : 1); }
  finally { cleanup(e); }
});
test('a synchronous play failure does not retain a stale call handle or shutdown listener', () => {
  const e = videoEnv(); enabled(e); const create = e.root.document.createElement;
  e.root.document.createElement = tag => { const v = create(tag); if (tag === 'video') v.play = () => { throw new Error('decode'); }; return v; }; const results = [];
  try { playCall(e.scene, why => results.push(why)); assert.deepEqual(results, ['error']); assert.equal(e.scene.events.listenerCount('shutdown'), 0); assert.equal(e.timers.size, 0); assert.equal(e.scene.cutscene, null); }
  finally { cleanup(e); }
});
