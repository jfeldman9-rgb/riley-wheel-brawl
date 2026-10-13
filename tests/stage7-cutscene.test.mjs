import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { playCall7, blobCount, warmCall, resetCall7Bags, prefetch, dropBlob } from '../src/call7-cutscene.js';

test('the strike starts in the same turn whether or not a clip exists', () => {
  resetCall7Bags();
  const store = { m: new Map(), getItem(k) { return this.m.get(k) || null; }, setItem(k, v) { this.m.set(k, v); } };
  const scene = { cutRoot: { sessionStorage: store, navigator: { webdriver: true } }, kit: {} };
  const times = [];
  for (const helper of ['moiraine', 'lan', 'duo']) {
    let at = 0;
    const before = blobCount();
    playCall7(scene, helper, () => { at = 1; });
    times.push(at);
    assert.ok(blobCount() <= 1);
    assert.ok(before <= 1);
    assert.ok(store.getItem('rwb-call7-bag-' + helper));
  }
  assert.deepEqual(times, [1, 1, 1]);
  warmCall({ kit: { quality: 0 }, fx: { quality: 0 }, cutRoot: { sessionStorage: store } }, 'lan');
  prefetch('moiraine');
  assert.equal(blobCount(), 1);
  prefetch('lan');
  assert.equal(blobCount(), 1);
  dropBlob();
  assert.equal(blobCount(), 0);
  resetCall7Bags();
});
