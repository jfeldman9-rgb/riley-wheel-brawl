// No player-visible "PLACEHOLDER" text without ?debug, Stages 1-4 (Jason saw it during the Stage 3 Fade fight).
// Two sources existed: the HUD "PLACEHOLDER ART" tag, and the four Stage 3 prop/FX sheets, which were labelled cards
// with "PLACEHOLDER <id> frame N" baked into the pixels (roof tiles, shadow pool, shadow burst, far Fade glimpse).
// The sheets are now painted ChatGPT art for everyone (code-drawn stand-ins only replace a file that fails to load),
// and the tag shows only under ?debug, and only while some art is still marked placeholder.
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

test('the Stage 3 prop/FX sheets are painted art for everyone; the code-drawn stand-ins only fill a sheet that failed', () => {
  const files = Object.values(STAGE3_FX).map(id => `assets/stage3/props/${id}.webp`);
  assert.deepEqual(files.filter(f => PLACEHOLDER_FILES.has(f)), [], 'none of the four is placeholder art per ART_STATUS');
  assert.deepEqual(J('assets/stage3/ART_STATUS.json').entries.filter(e => e.placeholder !== false).map(e => e.id), [], 'Stage 3 has no placeholder art left');
  for (const stage of [1, 2, 3, 4]) {
    for (const debug of [null, '0', '1']) withDebug(debug, () => {
      const { urls } = queued(stage);
      assert.deepEqual(urls.filter(u => PLACEHOLDER_FILES.has(u)), [], `Stage ${stage} ?debug=${debug}: no placeholder file queued`);
    });
  }
  // Stage 3 queues the four painted sheets with or without ?debug and paints nothing at queue time
  for (const debug of [null, '1']) {
    const { urls, made } = withDebug(debug, () => queued(3, { canvas: true }));
    assert.equal(made.size, 0, `?debug=${debug}: nothing code-drawn while the files load`);
    assert.deepEqual(urls.filter(u => u.startsWith('assets/stage3/props/')).sort(), [...files].sort());
  }
  // the kit paints whatever is still missing once loading is over (a failed file), before it builds anything
  const build = readFileSync('src/stage3.js', 'utf8').match(/\n  build\(\) \{[\s\S]*?this\.makeTextures\(\)/)?.[0] || '';
  assert.match(build, /paintStage3Fx\(s\)/, 'Stage3Kit.build() code-draws the sheets that failed to load');
  // the stand-ins keep the 256x256 grid, draw no text, and paint only the missing keys
  texts.length = 0;
  const doc = globalThis.document, made = new Map();
  const scene = { textures: { exists: k => made.has(k) || k !== 'shadowburst', addCanvas: (key, c) => { const frames = []; made.set(key, { c, frames }); return { add: (...f) => frames.push(f) }; } } };
  doc.createElement = () => fakeCanvas();
  try {
    assert.deepEqual(paintStage3Fx(scene), ['shadowburst'], 'only the failed sheet is code-drawn');
    const all = new Map(), every = { textures: { exists: k => all.has(k), addCanvas: (key, c) => { const frames = []; all.set(key, { c, frames }); return { add: (...f) => frames.push(f) }; } } };
    assert.deepEqual(paintStage3Fx(every).sort(), Object.keys(STAGE3_FX).sort());
    for (const [key, n] of Object.entries({ rooftiles: 4, shadowpool: 4, shadowburst: 6, fade_far: 4 })) {
      const { c, frames } = all.get(key);
      assert.equal(c.width, 256 * n, key); assert.equal(c.height, 256, key);
      assert.deepEqual(frames.map(f => f.slice(0, 6)), Array.from({ length: n }, (_, i) => [i, 0, i * 256, 0, 256, 256]), `${key} keeps the 256x256 frame grid`);
    }
    assert.deepEqual(paintStage3Fx(every), [], 'painting is idempotent');
  } finally { delete doc.createElement; }
  assert.deepEqual(texts, [], 'the stand-ins draw no text');
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
        // the Fade fight draws its pools and bursts (and the rooftop tiles/glimpse) from the painted sheets' keys
        for (const k of ['shadowpool', 'shadowburst', 'rooftiles', 'fade_far']) assert.ok(used.has(k), `Stage 3 used ${k}`);
        // and nothing left in Stage 3 gives the ?debug tag a reason to show: no placeholder meta, plates or FX sheet
        assert.equal(placeholderArt(s), false, 'Stage 3 reports no placeholder art');
      }
      // the same run with ?debug shows the tag (the debug tooling still works)
      withDebug('1', () => { s.metas.__card = { placeholder: true }; s.ph4 = stage === 4; hud.phReady = false; hud.updateWatermark(s); delete s.metas.__card; s.ph4 = false; });
      assert.equal(shown.at(-1), true);
    } finally { h.destroy(); }
  }));
}

test('Stage 6 queue loads no placeholder file and paints nothing up front', () => {
  for (const p of ['assets/stage6/ART_STATUS.json', 'assets/bg6/ART_STATUS.json', 'assets/cutscenes/rand/ART_STATUS.json']) {
    assert.deepEqual(J(p).entries.filter(e => e.placeholder === true), [], p);
  }
  for (const debug of [null, '0', '1']) withDebug(debug, () => {
    const { urls, made } = queued(6, { canvas: true });
    assert.equal(made.size, 0, `?debug=${debug}: Stage 6 queue does not code-draw`);
    assert.deepEqual(urls.filter(u => PLACEHOLDER_FILES.has(u)), [], `Stage 6 ?debug=${debug}`);
  });
});
