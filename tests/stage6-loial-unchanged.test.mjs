import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { callInFor } from '../src/rand-call.js';
import { STAGE_CHARS, STAGES } from '../src/stages.js';
import { stage5Simulation } from './helpers/stage5-harness.mjs';

test('stages 1-5 still call Loial and do not queue Rand', () => {
  for (const n of [1, 2, 3, 4, 5]) assert.equal(callInFor(n), 'loial', n);
  assert.equal(callInFor(6), 'rand');
  assert.equal(callInFor(7), 'rand');
  for (const n of [1, 5]) assert.ok(STAGE_CHARS[n].includes('loial'), n);
  assert.ok(!STAGE_CHARS[6].includes('loial'));
  const urls = [];
  const load = new Proxy({}, { get: () => (...args) => args.slice(1).forEach(a => { if (typeof a === 'string' && a.startsWith('assets/')) urls.push(a); }) });
  const scene = { load, textures: { exists: () => false }, cache: { json: { get: () => undefined } }, anims: { exists: () => false } };
  for (const n of [1, 2, 3, 4, 5]) if (STAGES[n].queue) STAGES[n].queue(scene);
  assert.deepEqual(urls.filter(u => /rand|s6rand|belal/i.test(u)), []);
});

test('a stage 5 scene has no Rand state', () => {
  const h = stage5Simulation({ mode: null });
  try {
    assert.equal(h.s.stageNo, 5);
    assert.equal(h.s.kit?.rand, undefined);
    assert.equal(typeof h.s.callLoial, 'function');
  } finally { h.destroy(); }
});
