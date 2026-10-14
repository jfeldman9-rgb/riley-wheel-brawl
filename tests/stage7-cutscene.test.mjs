import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CALL7_POOLS, bagKey, createBag7, prefetchCall7, dropBlob7, blobCount7, playCall7, resetCall7 } from '../src/call7-cutscene.js';
import { q } from '../src/config.js';

const store = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
let seed = 7;
const rng = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

test('one shuffle bag per helper, persisted in sessionStorage, no immediate repeat', () => {
  assert.deepEqual(Object.keys(CALL7_POOLS), ['moiraine', 'lan', 'duo']);
  assert.equal(bagKey('lan'), 'rwb-call7-bag-lan');
  const st = store();
  const bag = createBag7(st, rng, CALL7_POOLS.moiraine, bagKey('moiraine'));
  const first = bag.next(), second = bag.next();
  assert.notEqual(first, second);
  assert.deepEqual([first, second].sort(), ['M1', 'M2']);
  // A fresh bag over the same storage (page reload) does not replay the last clip first.
  const bag2 = createBag7(st, rng, CALL7_POOLS.moiraine, bagKey('moiraine'));
  assert.notEqual(bag2.next(), second);
  resetCall7(store(), rng);
});

test('prefetch holds at most one blob; a new prediction replaces it; drop frees it', async () => {
  dropBlob7();
  assert.equal(blobCount7(), 0);
  const fetcher = async url => ({ ok: true, blob: async () => new Blob(['x'], { type: 'video/mp4' }) });
  assert.equal(await prefetchCall7('moiraine', 'M1', fetcher), true);
  assert.equal(blobCount7(), 1);
  assert.equal(await prefetchCall7('lan', 'L2', fetcher), true);
  assert.equal(blobCount7(), 1, 'still one blob after the prediction changed');
  const gone = async () => ({ ok: false });
  assert.equal(await prefetchCall7('duo', 'D1', gone), false);
  assert.equal(blobCount7(), 0, 'a 404 clip holds nothing');
  dropBlob7();
});

test('with cutscenes off (or no clip shipped) playCall7 declines and the caller strikes at once', () => {
  q.set('nocutscenes', '1');
  try {
    let ran = false;
    const scene = { cutscene: null, setPauseReason() {}, music: null };
    const played = playCall7(scene, 'moiraine', () => { ran = true; });
    assert.equal(played, false);
    assert.equal(ran, false, 'the lifecycle runs the strike itself when playCall7 declines');
  } finally { q.delete('nocutscenes'); }
});

test('clip ids stay inside the call7 budget folder and every helper has two takes planned', () => {
  for (const [helper, ids] of Object.entries(CALL7_POOLS)) {
    assert.equal(ids.length, 2, helper);
    for (const id of ids) assert.match(id, /^[MLD][12]$/);
  }
});
