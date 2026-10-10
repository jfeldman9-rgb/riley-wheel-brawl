import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
import { stage3Simulation } from './helpers/stage3-harness.mjs';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { stage5Simulation } from './helpers/stage5-harness.mjs';
import { stage6Simulation } from './helpers/stage6-harness.mjs';
import { queueCharPages } from '../src/assets.js';
import { STAGES } from '../src/stages.js';
import { q } from '../src/config.js';
import { HUD } from '../src/hud.js';
import { audit } from '../tools/audit-stage1.mjs';

function statuses(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? statuses(dir + '/' + e.name) : e.name === 'ART_STATUS.json' ? [dir + '/' + e.name] : []); }
const marked = new Set(statuses('assets').flatMap(p => JSON.parse(readFileSync(p)).entries || []).filter(e => e.placeholder === true).flatMap(e => e.files || []));
for (const n of [1, 2, 3, 4, 5, 6]) test(`Stage ${n} queue requests no art marked placeholder`, () => {
  const urls = []; const grab = v => { if (typeof v === 'string') { if (v.startsWith('assets/')) urls.push(v); } else if (v && typeof v === 'object') Object.values(v).forEach(grab); };
  const load = new Proxy({}, { get: (_, k) => k === 'optionalAssetKeys' ? undefined : ['on', 'once', 'off', 'setCORS'].includes(k) ? () => {} : (...args) => args.slice(1).forEach(grab) });
  const s = { load, loadedStage: n, textures: { exists: () => false, get: () => null }, cache: { json: { get: key => { const name = key.replace(/\.A$/, ''); try { return JSON.parse(readFileSync(`assets/chars/${name}.anims.json`)); } catch { return undefined; } } } }, events: { once() {}, off() {} }, anims: { exists: () => false } };
  queueCharPages(s, STAGES[n].chars); STAGES[n].queue(s);
  assert.deepEqual(urls.filter(u => marked.has(u)), []);
});
const sims = [null, o => stage1Simulation({ ...o, stage: 1 }), o => stage1Simulation({ ...o, stage: 2 }), stage3Simulation, stage4Simulation, stage5Simulation, stage6Simulation];
for (const n of [1, 2, 3, 4, 5, 6]) test(`Stage ${n} through the boss draws no placeholder text without debug`, () => withSeed(1, () => {
  q.delete('debug'); const h = sims[n]({ mode: '1' }), s = h.s; const hud = Object.create(HUD.prototype); let shown = false, bossFrames = 0;
  hud.phTag = { setVisible(v) { shown ||= v; } };
  try {
    for (let i = 0; i < 60 * 600 && !s.ended && !s.gameOver; i++) { h.step(); if (s.boss) bossFrames++; if (i % 30 === 0) { hud.phReady = false; hud.phShown = false; hud.updateWatermark(s); } }
    assert.ok(bossFrames > 0); assert.equal(s.ended, true); assert.equal(s.gameOver, false); assert.equal(shown, false);
    const strings = h.observations.hud.flatMap(e => e.args).flatMap(a => typeof a === 'string' ? [a] : a && typeof a === 'object' ? Object.values(a).filter(v => typeof v === 'string') : []);
    assert.deepEqual(strings.filter(t => /placeholder/i.test(t)), []);
  } finally { h.destroy(); }
}));
for (const to of [1, 2, 3, 4, 5, 6]) test(`6 → ${to}: variant restoration invalidates stale animation frames and queues one page per key`, () => {
  const compact = to >= 5, keys = new Set(['riley-0', 'riley-0_nl']), deleted = [], atlas = [], images = [], removedAnims = [];
  const scene = { loadedStage: to, cache: { json: { get: () => ({ pages: ['riley-0'], anims: [{ name: 'riley_walk' }] }) } },
    textures: { exists: k => keys.has(k), get: () => ({ dataSource: [{ image: { src: 'http://localhost/assets/stage5/normals/riley-0_n.webp' } }] }), remove(k) { keys.delete(k); deleted.push(k); } },
    anims: { exists: () => true, remove: k => removedAnims.push(k) }, load: { atlas: row => atlas.push(row), image: (...a) => images.push(a) } };
  queueCharPages(scene, ['riley']);
  if (compact) { assert.deepEqual(deleted, []); assert.deepEqual(atlas, []); assert.deepEqual(images, []); assert.deepEqual(removedAnims, []); }
  else { assert.deepEqual(deleted, ['riley-0', 'riley-0_nl']); assert.deepEqual(removedAnims, ['riley_walk']); assert.equal(atlas.length, 1); assert.equal(images.length, 1); assert.equal(atlas[0].normalMap, 'assets/chars/riley-0_n.webp'); assert.equal(images[0][1], 'assets/chars/riley-0_nl.webp'); }
});
test('C3 audit includes all Stage 6 sibling modules and excludes them from the pre-fight budget', () => {
  const a = audit(); assert.ok(a.preFight.inventoryUpperBoundBytes < 25_000_000);
  const siblings = readdirSync('src').filter(f => /^(stage6|rand-call|belal|grayman|fadelt|bot-stage6).*\.js$/.test(f));
  for (const f of siblings) { assert.ok(a.stage6.source.files.includes('src/' + f), f); assert.ok(!a.preFight.files.includes('src/' + f), f); }
  assert.equal(a.stage6.source.status, 'PASS');
});
test('the production Stage 6 bot clears without powers', () => withSeed(1, () => {
  const h = stage6Simulation({ noPower: true });
  try { for (let i = 0; i < 60 * 420 && !h.s.ended && !h.s.gameOver; i++) h.step(); assert.equal(h.s.noPower, true); assert.equal(h.s.gameOver, false); assert.equal(h.s.ended, true); }
  finally { h.destroy(); }
}));

test('C4 every procedurally created Stage 6 canvas belongs to the release inventory', async () => {
  const { STAGE6_CANVASES } = await import('../src/stage6-art.js');
  const { STAGE6_TEXTURES } = await import('../src/stage6-def.js');
  assert.deepEqual(STAGE6_CANVASES.map(([key]) => key).filter(key => !STAGE6_TEXTURES.includes(key)), []);
});

for (const to of [1, 2, 3, 4, 5, 6]) test(`C4 blob-backed Phaser normals preserve/restore the actual loaded variant on 6 → ${to}`, () => {
  const keys = new Set(), atlas = [], images = [], removed = [], s = { loadedStage: 6,
    cache: { json: { get: () => ({ pages: ['riley-0'], anims: [{ name: 'riley_walk' }] }) } },
    textures: { exists: k => keys.has(k), get: k => keys.has(k) ? { dataSource: [{ image: { src: 'blob:http://localhost/normal' } }] } : undefined, remove(k) { keys.delete(k); removed.push(k); } },
    anims: { exists: () => true, remove() {} }, load: { atlas: row => atlas.push(row), image: (...a) => images.push(a) } };
  queueCharPages(s, ['riley']); keys.add('riley-0'); keys.add('riley-0_nl'); atlas.length = images.length = 0; s.loadedStage = to;
  queueCharPages(s, ['riley']);
  if (to >= 5) { assert.equal(atlas.length, 0); assert.equal(images.length, 0); assert.deepEqual(removed, []); }
  else { assert.deepEqual(removed, ['riley-0', 'riley-0_nl']); assert.equal(atlas.length, 1); assert.equal(atlas[0].normalMap, 'assets/chars/riley-0_n.webp'); }
});
