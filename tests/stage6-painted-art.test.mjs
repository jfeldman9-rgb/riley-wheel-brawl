import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dimensions } from '../tools/audit-stage1.mjs';
import { PAINTED6 } from '../src/stage6-painted.js';
import { PAINTED6_ROWS, CRATE6, SCALE6, queueStage6Painted, isPainted, s6Scale } from '../src/stage6-paint.js';
import { STAGE6, STAGE6_TEXTURES } from '../src/stage6-def.js';
import { STAGE6_CANVASES } from '../src/stage6-art.js';
import { createStage6View, plateRect, PLATES6 } from '../src/stage6-view.js';
import { WORLD_W, LANE_TOP } from '../src/config.js';

const tool = readFileSync('tools/stage6/process_art.py', 'utf8');
const BUDGET = Object.fromEntries([...tool.match(/BUDGET_MIB = \{([\s\S]*?)\n\}/)[1].matchAll(/'(\w+)': ([\d.]+)/g)].map(m => [m[1], +m[2]]));
const TOTAL = +tool.match(/TOTAL_MIB = ([\d.]+)/)[1];
const TRANSIENT = new Set(['story6p1', 'story6p2', 'story6p3']);
const mib = f => { const [w, h] = dimensions(readFileSync(f)); return w * h * 4 / 1048576; };
const present = PAINTED6.filter(r => r.present);

test('the painted manifest matches the files in the repo and every key has a budget', () => {
  for (const r of PAINTED6) {
    assert.equal(r.present, existsSync(r.url) && (!r.atlas || existsSync(r.atlas)), r.key);
    assert.ok(BUDGET[r.key] > 0, `${r.key} has a budget`);
    assert.ok(STAGE6_TEXTURES.includes(r.key), `${r.key} is released with Stage 6`);
  }
  for (const k of ['s6belal', 's6gray', 's6fade', 's6rand', 's6def', 'belalPortrait', 'randPortrait', 's6hatch', 's6oil', 's6lamp', 's6net', 's6streak', 's6call', 's6ribbon'])
    assert.ok(present.some(r => r.key === k), `${k} is painted`);
});

test('every painted sheet fits its decoded budget and the resident set fits the Stage 6 cap', () => {
  let total = 0;
  for (const r of present) {
    const m = mib(r.url);
    assert.ok(m <= BUDGET[r.key] + 1e-9, `${r.key} ${m.toFixed(3)} MiB > ${BUDGET[r.key]}`);
    if (!TRANSIENT.has(r.key)) total += m;
  }
  assert.ok(total <= TOTAL, `resident painted ${total.toFixed(2)} MiB > ${TOTAL}`);
  assert.ok(mib(CRATE6.url) < 1, 'the reused crate is queued without its normal map');
});

test('painted atlases keep the code-drawn frame numbers, origin and draw scale', () => {
  const want = { s6belal: 8, s6gray: 6, s6fade: 6, s6rand: 4, s6def: 3 };
  for (const [key, n] of Object.entries(want)) {
    const r = present.find(x => x.key === key), a = JSON.parse(readFileSync(r.atlas, 'utf8'));
    assert.deepEqual(Object.keys(a.frames).sort((x, y) => x - y), [...Array(n).keys()].map(String), key);
    assert.deepEqual(a.meta.origin, [0.5, 0.96]); assert.equal(a.meta.drawScale, SCALE6[key][1]);
    const [w, h] = dimensions(readFileSync(r.url)); assert.deepEqual([a.meta.size.w, a.meta.size.h], [w, h], key);
    for (const f of Object.values(a.frames)) assert.ok(f.frame.x + f.frame.w <= w && f.frame.y + f.frame.h <= h, key);
  }
  const frames = { s6hatch: 2, s6oil: 2, s6lamp: 3, s6net: 1, s6streak: 1, s6call: 2 };
  for (const [key, n] of Object.entries(frames)) {
    const r = present.find(x => x.key === key), [w, h] = dimensions(readFileSync(r.url));
    assert.deepEqual([w, h], [r.frameWidth * n, r.frameHeight], key);
  }
});

test('ART_STATUS lists every painted file with its hash and placeholder false', () => {
  const ents = ['assets/stage6/ART_STATUS.json', 'assets/bg6/ART_STATUS.json'].flatMap(p => JSON.parse(readFileSync(p, 'utf8')).entries);
  for (const r of present) {
    const e = ents.find(x => x.key === r.key); assert.ok(e, r.key); assert.equal(e.placeholder, false);
    for (const f of [r.url, r.atlas].filter(Boolean)) assert.equal(e.sha256[f], createHash('sha256').update(readFileSync(f)).digest('hex'), f);
  }
});

function fakeLoad() {
  const calls = [], handlers = {};
  const L = { calls, handlers,
    atlas: (k, u, a) => calls.push(['atlas', k, u, a]), spritesheet: (k, u, o) => calls.push(['sheet', k, u, o]), image: (k, u) => calls.push(['image', k, u]),
    on: (e, f) => { handlers[e] = f; }, once: (e, f) => { handlers['once:' + e] = f; }, off: (e) => { delete handlers[e]; } };
  return L;
}
test('the queue loads present rows by shape, skips loaded keys, and a failed file falls back to the painter', () => {
  const have = new Set(['crate']), removed = [];
  const scene = { load: fakeLoad(), textures: { exists: k => have.has(k), remove: k => { removed.push(k); have.delete(k); } }, events: { once() {}, off() {} } };
  const wanted = queueStage6Painted(scene);
  assert.ok(!wanted.has('crate'), 'a crate already resident from Stage 5 is reused');
  for (const r of PAINTED6) assert.equal(wanted.has(r.key), r.present, r.key);
  const atl = scene.load.calls.find(c => c[1] === 's6belal'); assert.equal(atl[0], 'atlas');
  const sh = scene.load.calls.find(c => c[1] === 's6lamp'); assert.deepEqual(sh[3], { frameWidth: 192, frameHeight: 192 });
  for (const k of wanted) assert.ok(scene.load.optionalAssetKeys.has(k), k);
  have.add('s6belal'); scene.load.handlers.loaderror({ key: 's6belal' }); assert.deepEqual(removed, ['s6belal']);
  scene.load.handlers['once:complete'](); assert.equal(scene.load.optionalAssetKeys.size, 0);
  const cold = { load: fakeLoad(), textures: { exists: () => false }, events: { once() {}, off() {} } };
  assert.ok(queueStage6Painted(cold).has('crate'));
  assert.equal(cold.load.calls.find(c => c[1] === 'crate')[2], 'assets/prop-crate.webp'.replace('assets/', 'assets/props/'));
  assert.equal(STAGE6.crateProp, 'crate'); assert.ok(STAGE6_CANVASES.some(([k]) => k === 'crate'), 'the crate has a code-drawn fallback');
});

const tex = painted => ({ exists: () => true, get: k => ({ source: [{ isCanvas: !painted.has(k) }], getSourceImage: () => ({ width: 1024 }) }) });
test('painted keys draw at the painted scale; code canvases keep the code scale', () => {
  const s = { textures: tex(new Set(['s6belal', 's6call'])) };
  assert.equal(isPainted(s, 's6belal'), true); assert.equal(isPainted(s, 's6gray'), false);
  assert.equal(s6Scale(s, 's6belal', 3.1), 1); assert.equal(s6Scale(s, 's6gray', 3.4), 3.4);
  assert.ok(Math.abs(s6Scale(s, 's6call', 3.4) - 0.68) < 1e-9);
  assert.equal(isPainted({}, 's6belal'), false); assert.equal(s6Scale({}, 's6belal', 3.1), 3.1);
});

function viewScene(painted) {
  const made = [];
  const make = (x, y, a, b, c) => { const key = typeof a === 'string' ? a : c; const o = { x, y, key, frame: typeof b === 'number' ? b : undefined, blend: null, scale: null, depth: 0, sf: 1, w: typeof a === 'number' ? a : undefined, visible: true, destroy() {} };
    for (const k of ['setOrigin', 'setDisplaySize', 'setAlpha', 'setTint', 'setLighting']) o[k] = () => o;
    o.setDepth = d => { o.depth = d; return o; }; o.setScale = v => { o.scale = v; return o; }; o.setScrollFactor = v => { o.sf = v; return o; };
    o.setBlendMode = m => { o.blend = m; return o; }; o.setFrame = f => { o.frame = f; return o; }; o.setVisible = v => { o.visible = v; return o; };
    made.push(o); return o; };
  const s = { textures: tex(painted), enemies: [], zoneI: 3, boss: {}, time: { now: 0 }, add: { image: (x, y, k, f) => make(x, y, k, f), sprite: (x, y, k, f) => make(x, y, k, f), tileSprite: (x, y, w, h, k) => make(x, y, w, h, k) } };
  return { s, made };
}
test('painted zone plates are world-locked per zone; missing plates keep the code tiles', () => {
  const all = viewScene(new Set(PLATES6)); createStage6View(all.s).buildBackdrop();
  for (const [i, key] of PLATES6.entries()) {
    const o = all.made.filter(m => m.key === key && m.sf === 1); assert.equal(o.length, 1, key);
    const r = plateRect(i); assert.equal(o[0].x, r.x); assert.equal(o[0].y, LANE_TOP + 8); assert.equal(o[0].scale, r.w / 1024);
  }
  assert.ok(!all.made.some(m => m.sf === 0.4), 'no code tiles under four painted plates');
  assert.equal(plateRect(0).x < -96, true); assert.ok(plateRect(3).x + plateRect(3).w > WORLD_W + 96);
  for (let i = 1; i < 4; i++) assert.ok(plateRect(i - 1).x + plateRect(i - 1).w - plateRect(i).x >= 96, `plates ${i - 1}/${i} overlap a full feather`);
  const none = viewScene(new Set()); createStage6View(none.s).buildBackdrop();
  assert.ok(none.made.filter(m => m.sf === 0.4).length >= 6); assert.ok(!none.made.some(m => PLATES6.includes(m.key) && m.sf === 1));
  const half = viewScene(new Set(['bg6mid', 'bg6mid2'])); createStage6View(half.s).buildBackdrop();
  const tiles = half.made.filter(m => m.sf === 0.4); assert.ok(tiles.length > 0 && tiles.every(t => t.x + 560 > 0.4 * STAGE6.zones[1].l), 'tiles only where the interior zones can see them');
});
test('painted floors meet at the zone edges and code floors keep the 1800 px layout', () => {
  const p = viewScene(new Set(['bg6floor', 'bg6floor2', 'bg6floor3'])); createStage6View(p.s).buildBackdrop();
  assert.deepEqual(p.made.filter(m => /^bg6floor/.test(m.key)).map(m => [m.x, m.w]), [[0, STAGE6.zones[2].l], [STAGE6.zones[2].l, STAGE6.zones[3].l - STAGE6.zones[2].l], [STAGE6.zones[3].l, WORLD_W - STAGE6.zones[3].l]]);
  const c = viewScene(new Set()); createStage6View(c.s).buildBackdrop();
  assert.deepEqual(c.made.filter(m => /^bg6floor/.test(m.key)).map(m => m.x), [0, 1800, 3600]);
});
test('painted Callandor draws in normal blend and flares from Be\'lal\'s third phase; Defenders use the painted scale', () => {
  const p = viewScene(new Set(['s6call', 's6def'])), v = createStage6View(p.s); v.buildBackdrop();
  const call = p.made.find(m => m.key === 's6call'); assert.equal(call.blend, 'NORMAL'); assert.ok(Math.abs(call.scale - 0.68) < 1e-9);
  p.s.enemies.push({ type: 'belal', phase: 2 }); v.sync({ s: p.s }); assert.equal(call.frame, 0);
  p.s.enemies[0].phase = 3; v.sync({ s: p.s }); assert.equal(call.frame, 1);
  assert.ok(p.made.filter(m => m.key === 's6def').every(d => d.scale === 1));
  const c = viewScene(new Set()); createStage6View(c.s).buildBackdrop(); assert.equal(c.made.find(m => m.key === 's6call').blend, 'ADD');
});
test('painted Fadelt keeps its own colours; the code stand-in keeps its red tint', async () => {
  const { Fadelt } = await import('../src/fadelt.js');
  for (const [painted, want] of [[true, 0xffffff], [false, 0xcc3344]]) {
    let tint = null; const sp = {}; for (const k of ['setPosition', 'setDepth', 'setAlpha', 'setScale', 'setFrame', 'setOrigin', 'destroy']) sp[k] = () => sp; sp.setTint = t => { tint = t; return sp; };
    const s = { textures: tex(new Set(painted ? ['s6fade'] : [])), add: { sprite: () => sp, image: () => sp, ellipse: () => sp }, enemies: [], riley: { x: 0, y: 630 } };
    const f = new Fadelt(s, 600, 630); f.sprite = sp; f.sync(); assert.equal(tint, want);
  }
});

test('Stage 6 boss-peak RGBA with the painted sheets and the reused crate stays under 120 MiB', async () => {
  const { STAGE6_CHARS } = await import('../src/stage6-def.js');
  const { COMPACT_NORMAL_DIR } = await import('../src/texture-pages.js');
  const files = [];
  for (const k of STAGE6_CHARS) {
    const meta = JSON.parse(readFileSync(`assets/chars/${k}.anims.json`, 'utf8'));
    for (const p of meta.pages) files.push(`${meta.dir || 'assets/chars'}/${p}.webp`, `${COMPACT_NORMAL_DIR}/${p}_n.webp`, `${COMPACT_NORMAL_DIR}/${p}_nl.webp`);
  }
  files.push('assets/stage3/chars/cutthroat-0.webp');
  for (const k of ['angreal', 'saangreal', 'lightning', 'fireshield', 'airwhip']) files.push(`assets/powers/pu_${k}.png`, `assets/powers/hud_${k}.png`);
  for (const f of ['fx_lightning.png', 'fx_fireshield.png', 'fx_airwhip.png']) files.push('assets/powers/' + f);
  for (const f of ['riley-portrait.webp', 'chief-portrait.webp', 'loial-portrait.webp', 'byar-portrait.webp']) files.push('assets/ui/' + f);
  // Story panels are freed at stage start, so they are not resident at the boss peak.
  files.push(...PAINTED6_ROWS.filter(r => r.present && !TRANSIENT.has(r.key)).map(r => r.url));
  const fileMiB = files.reduce((n, f) => n + mib(f), 0);
  const canvasMiB = STAGE6_CANVASES.reduce((n, [, w, h]) => n + w * h * 4, 0) / 1048576;
  assert.ok(fileMiB + canvasMiB < 120, `measured ${(fileMiB + canvasMiB).toFixed(2)} MiB`);
});
