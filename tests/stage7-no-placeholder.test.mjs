import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { paintStage7Art } from '../src/stage7-art.js';

test('stage 7 sources do not draw the word placeholder or any text', () => {
  const files = readdirSync('src').filter(n => /^(stage7|moilan-call|call7-cutscene|shaido|asmodean|bot-stage7)/.test(n));
  assert.ok(files.length >= 20);
  for (const f of files) {
    const src = readFileSync('src/' + f, 'utf8');
    assert.equal(/fillText|strokeText/.test(src), false, f);
    const stripped = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    const lits = [...stripped.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(m => m[2]).filter(s => /placeholder/i.test(s));
    assert.deepEqual(lits, [], f);
  }
});

test('code-drawn stand-ins issue no text calls', () => {
  const texts = [];
  const made = new Map();
  const ctx = new Proxy({}, {
    get: (t, k) => k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} })
      : (k === 'fillText' || k === 'strokeText') ? s => texts.push(s) : () => {},
    set: (t, k, v) => { t[k] = v; return true; },
  });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
  const scene = { textures: { exists: () => false, addCanvas: (key, c) => { made.set(key, c); return { add() {} }; } } };
  try {
    paintStage7Art(scene);
    assert.ok(made.has('bg7far'));
    assert.ok(made.has('s7asmo'));
    assert.deepEqual(texts, []);
  } finally { delete globalThis.document.createElement; }
});
