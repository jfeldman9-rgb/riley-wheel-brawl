import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/stages.js';
import { paintStage7Art, STAGE7_CANVASES } from '../src/stage7-art.js';
import { PAINTED7 } from '../src/stage7-painted.js';

const texts = [];
function fakeCanvas() {
  const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() {} })
    : (k === 'fillText' || k === 'strokeText') ? s => texts.push(s) : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
  return { width: 0, height: 0, getContext: () => ctx };
}

test('Stage 7 queue loads only rows marked present (reused Stage 6 sheets today)', () => {
  const urls = [];
  const grab = a => { if (typeof a === 'string') { if (a.startsWith('assets/')) urls.push(a); } else if (Array.isArray(a)) a.forEach(grab); else if (a && typeof a === 'object') Object.values(a).forEach(grab); };
  const load = new Proxy({}, { get: (t, k) => ['on', 'off', 'once', 'setCORS'].includes(k) ? () => {} : (...args) => args.slice(1).forEach(grab) });
  const scene = { load, textures: { exists: () => false, get: () => null, remove() {} }, anims: { exists: () => false }, cache: { json: { get: () => undefined } }, events: { once() {}, off() {} } };
  STAGES[7].queue(scene);
  const present = new Set(PAINTED7.filter(r => r.present).flatMap(r => [r.url, r.atlas].filter(Boolean)));
  const stage7Urls = urls.filter(u => u.startsWith('assets/stage7/') || u.startsWith('assets/bg7/'));
  assert.deepEqual(stage7Urls, [], 'no missing Stage 7 file is ever requested');
  for (const u of urls) assert.ok(!/placeholder/i.test(u), u);
  for (const u of present) assert.ok(urls.includes(u), u);
});

test('code-drawn Stage 7 stand-ins draw no text and cover every painted key', () => {
  texts.length = 0;
  const made = new Set();
  const doc = globalThis.document || (globalThis.document = {});
  const prev = doc.createElement;
  doc.createElement = () => fakeCanvas();
  const scene = { textures: { exists: k => made.has(k), addCanvas: (key) => { made.add(key); const frames = []; return { add: (...f) => frames.push(f) }; } } };
  try {
    const painted = paintStage7Art(scene);
    assert.ok(painted.length > 0);
    for (const row of PAINTED7) assert.ok(made.has(row.key), row.key);
    for (const [key] of STAGE7_CANVASES) assert.ok(made.has(key), key);
    const before = made.size;
    paintStage7Art(scene);
    assert.equal(made.size, before, 'painting again creates no new canvas');
  } finally {
    if (prev) doc.createElement = prev; else delete doc.createElement;
  }
  assert.deepEqual(texts, [], 'no PLACEHOLDER stamp is ever drawn (the ?debug hatch is pattern only)');
});
