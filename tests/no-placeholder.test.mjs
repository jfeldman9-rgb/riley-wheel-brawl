// No player-visible "PLACEHOLDER" text without ?debug, Stages 1-4 (Jason saw it during the Stage 3 Fade fight).
// Two sources existed: the HUD "PLACEHOLDER ART" tag, and the four Stage 3 prop/FX sheets, which are labelled cards
// with "PLACEHOLDER <id> frame N" baked into the pixels (roof tiles, shadow pool, shadow burst, far Fade glimpse).
// Without ?debug the cards are never queued (code draws the same keys) and the tag never shows; ?debug keeps both.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
import { stage3Simulation } from './helpers/stage3-harness.mjs';
import { stage4Simulation } from './helpers/stage4-harness.mjs';

const { q } = await import('../src/config.js');
const { STAGES } = await import('../src/stages.js');
await import('../src/stage1.js');   // registers STAGES[n].queue
const { HUD, placeholderArt } = await import('../src/hud.js');
const { STAGE3_FX, paintStage3Fx } = await import('../src/stage3-fx-art.js');

const J = p => JSON.parse(readFileSync(p, 'utf8'));
// every shipped file an ART_STATUS marks placeholder: true
const PLACEHOLDER_FILES = new Set(['assets/stage3/ART_STATUS.json', 'assets/bg4/ART_STATUS.json', 'assets/cutscenes/ART_STATUS.json']
  .flatMap(p => J(p).entries.filter(e => e.placeholder === true).flatMap(e => e.files || [])));

const withDebug = (v, fn) => { if (v === null) q.delete('debug'); else q.set('debug', v); try { return fn(); } finally { q.delete('debug'); } };

/** Every asset URL a stage's production queue asks for, with the textures it creates by code. */
function queued(stage, { canvas = false } = {}) {
  const urls = [], made = new Map();
  const grab = a => { if (typeof a === 'string') { if (a.startsWith('assets/')) urls.push(a); } else if (Array.isArray(a)) a.forEach(grab); else if (a && typeof a === 'object') Object.values(a).forEach(grab); };
  const load = new Proxy({}, { get: (t, k) => ['on', 'off', 'once', 'setCORS'].includes(k) ? () => {} : (...args) => args.slice(1).forEach(grab) });
  const textures = { exists: k => made.has(k), get: () => null, remove() {} };
  if (canvas) textures.addCanvas = (key, c) => { const frames = []; made.set(key, { c, frames }); return { add: (...f) => frames.push(f) }; };
  const scene = { load, textures, anims: { exists: () => false }, cache: { json: { get: () => undefined } }, events: { once() {}, off() {} } };
  const doc = globalThis.document, el = doc.createElement;
  if (canvas) doc.createElement = () => fakeCanvas();
  try { STAGES[stage].queue(scene); } finally { if (canvas) { if (el) doc.createElement = el; else delete doc.createElement; } }
  return { urls, made };
}

const texts = [];
function fakeCanvas() {
  const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() {} })
    : (k === 'fillText' || k === 'strokeText') ? s => texts.push(s) : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
  return { width: 0, height: 0, getContext: () => ctx };
}

test('the labelled Stage 3 prop/FX cards ship only behind ?debug; players get code-drawn sheets on the same keys', () => {
  assert.deepEqual(Object.values(STAGE3_FX).map(id => `assets/stage3/props/${id}.webp`).filter(f => !PLACEHOLDER_FILES.has(f)), [], 'all four are placeholder art per ART_STATUS');
  for (const stage of [1, 2, 3, 4]) {
    for (const debug of [null, '0']) withDebug(debug, () => {
      const { urls } = queued(stage);
      assert.deepEqual(urls.filter(u => PLACEHOLDER_FILES.has(u)), [], `Stage ${stage} ?debug=${debug}: no placeholder file queued`);
    });
  }
  texts.length = 0;
  const { urls, made } = withDebug(null, () => queued(3, { canvas: true }));
  assert.deepEqual([...made.keys()].sort(), Object.keys(STAGE3_FX).sort());
  for (const [key, n] of Object.entries({ rooftiles: 4, shadowpool: 4, shadowburst: 6, fade_far: 4 })) {
    const { c, frames } = made.get(key);
    assert.equal(c.width, 256 * n, key); assert.equal(c.height, 256, key);
    assert.deepEqual(frames.map(f => f.slice(0, 6)), Array.from({ length: n }, (_, i) => [i, 0, i * 256, 0, 256, 256]), `${key} keeps the 256x256 frame grid`);
  }
  assert.deepEqual(texts, [], 'the stand-ins draw no text');
  assert.ok(!urls.some(u => u.startsWith('assets/stage3/props/')));
  // ?debug: the labelled cards load as before (debug tooling kept), nothing is painted over them
  const dbg = withDebug('', () => queued(3, { canvas: true }));
  assert.equal(dbg.made.size, 0);
  assert.deepEqual(dbg.urls.filter(u => PLACEHOLDER_FILES.has(u)).sort(), Object.values(STAGE3_FX).map(id => `assets/stage3/props/${id}.webp`).sort());
  // painting is idempotent and skips keys that already exist
  const again = { textures: { exists: k => made.has(k), addCanvas: () => assert.fail('repainted') } };
  const doc = globalThis.document; doc.createElement = () => fakeCanvas();
  try { assert.deepEqual(paintStage3Fx(again), []); } finally { delete doc.createElement; }
});

test('no shipped source renders the word placeholder except the ?debug HUD tag', () => {
  for (const f of readdirSync('src').filter(n => n.endsWith('.js'))) {
    const src = readFileSync(`src/${f}`, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    const lits = [...src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(m => m[2]).filter(s => /placeholder/i.test(s));
    if (f === 'hud.js') assert.deepEqual(lits, ['PLACEHOLDER ART'], f);
    else assert.deepEqual(lits, [], `${f}: ${lits.join(' | ')}`);
  }
  assert.ok(!readdirSync('src').some(f => /fillText|strokeText/.test(readFileSync(`src/${f}`, 'utf8'))), 'code-drawn art never draws text');
});

const SIMS = { 1: o => stage1Simulation({ ...o, stage: 1 }), 2: o => stage1Simulation({ ...o, stage: 2 }), 3: stage3Simulation, 4: stage4Simulation };

for (const stage of [1, 2, 3, 4]) {
  test(`Stage ${stage} bot run through the boss: no placeholder text in the HUD, and the tag stays hidden without ?debug`, () => withSeed(1, () => {
    const h = SIMS[stage]({ mode: '1' }), s = h.s;
    const used = new Set();
    for (const m of ['image', 'sprite']) { const f = s.add[m]; s.add[m] = (x, y, key, ...r) => { used.add(key); return f(x, y, key, ...r); }; }
    const hud = Object.create(HUD.prototype), shown = [];
    hud.phTag = { setVisible: on => shown.push(on) }; hud.phShown = false;
    let bossFrames = 0, forced = 0;
    try {
      for (let f = 0; f < 60 * 600 && !s.ended && !s.gameOver; f++) {
        h.step();
        if (s.boss) bossFrames++;
        if (f % 30 === 0) {
          // even with art reporting placeholder (a card meta, Stage 4's ph4), the tag does not show without ?debug
          s.metas.__card = { placeholder: true }; s.ph4 = true;
          if (placeholderArt(s)) forced++;
          hud.phReady = false; hud.updateWatermark(s);
          delete s.metas.__card; s.ph4 = false;
        }
      }
      assert.ok(bossFrames > 0, `the bot reached the Stage ${stage} boss`);
      assert.ok(forced > 0);
      assert.ok(!shown.includes(true), 'PLACEHOLDER ART tag never shown');
      const said = h.observations.hud.flatMap(e => e.args).flatMap(a => typeof a === 'string' ? [a] : a && typeof a === 'object' ? Object.values(a).filter(v => typeof v === 'string') : []);
      assert.deepEqual(said.filter(t => /placeholder/i.test(t)), []);
      if (stage === 3) {
        // the Fade fight draws its pools and bursts (and the rooftop tiles/glimpse) from the stand-in keys, which
        // without ?debug come from code, never from the labelled cards
        for (const k of ['shadowpool', 'shadowburst', 'rooftiles', 'fade_far']) assert.ok(used.has(k), `Stage 3 used ${k}`);
        const painted = withDebug(null, () => queued(3, { canvas: true }));
        for (const k of Object.keys(STAGE3_FX)) assert.ok(painted.made.has(k), `${k} is code-drawn`);
      }
      // the same run with ?debug shows the tag (the debug tooling still works)
      withDebug('1', () => { s.metas.__card = { placeholder: true }; s.ph4 = stage === 4; hud.phReady = false; hud.updateWatermark(s); delete s.metas.__card; s.ph4 = false; });
      assert.equal(shown.at(-1), true);
    } finally { h.destroy(); }
  }));
}
