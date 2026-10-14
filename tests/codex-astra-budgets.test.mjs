import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { queueCharPages } from '../src/assets.js';
import { STAGE_CHARS } from '../src/stages.js';
import { q } from '../src/config.js';
import { audit, dimensions } from '../tools/audit-stage1.mjs';
import { STAGE_CLIPS } from '../src/cutscene.js';

function meta(k) { return JSON.parse(readFileSync(`assets/${['riley3', 'cutthroat', 'fade'].includes(k) ? 'stage3/' : ''}chars/${k}.anims.json`, 'utf8')); }
for (const stage of [1, 2, 3]) test(`mobile Stage ${stage} character allocations stay below the texture target without changing art`, () => {
  q.set('touch', '1');
  const atlas = [], images = [];
  try {
    queueCharPages({ loadedStage: stage, mobileNormals: true, cache: { json: { get: k => meta(k.replace(/\.A$/, '')) } }, textures: { exists: () => false }, load: { atlas: r => atlas.push(r), image: (key, url) => images.push(url) } }, STAGE_CHARS[stage]);
    assert.ok(atlas.length > 0);
    assert.equal(atlas.some(r => r.normalMap), false, 'no attached normal allocation on constrained early stages');
    assert.deepEqual(images, [], 'no mirrored normal allocation');
    const rgba = atlas.reduce((n, r) => { const [w, h] = dimensions(readFileSync(r.textureURL)); return n + w * h * 4; }, 0);
    // This checks the reported character-source excess, not a rendered peak.
    assert.ok(rgba < 120 * 1024 * 1024, `${rgba} character bytes`);
  } finally { q.delete('touch'); }
});

test('switching an original-normal page into and out of mobile flat lighting destroys both old normal sources', () => {
  const m = meta('riley'), keys = new Map(), requests = [], removed = [];
  keys.set('riley-0', { dataSource: [{ image: { src: 'blob:normal' } }] });
  keys.set('riley-0_nl', {});
  const s = { loadedStage: 1, mobileNormals: true, cache: { json: { get: () => ({ ...m, pages: ['riley-0'] }) } },
    anims: { get: () => ({ destroy() {} }), remove() {}, anims: { entries: {} } },
    textures: { exists: k => keys.has(k), get: k => keys.get(k), remove(k) { removed.push(k); keys.delete(k); } },
    load: { atlas(r) { requests.push(r); keys.set(r.key, { dataSource: r.normalMap ? [{}] : [] }); }, image(k) { keys.set(k, {}); } } };
  q.set('touch', '1');
  try { queueCharPages(s, ['riley']); }
  finally { q.delete('touch'); }
  assert.deepEqual(removed, ['riley-0', 'riley-0_nl']);
  assert.equal(requests[0].normalMap, undefined);
  s.mobileNormals = false;
  queueCharPages(s, ['riley']);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].normalMap, 'assets/chars/riley-0_n.webp');
  assert.equal(keys.has('riley-0_nl'), true);
});

test('the cold-start-through-combat gate includes every default intro clip and reports its combined overage', () => {
  const a = audit(), cold = a.coldStartThroughCombat;
  assert.ok(cold, 'a story-on inventory must accompany the historical preFight category');
  const media = STAGE_CLIPS.intro.flatMap(id => ['mp4', 'jpg'].map(ext => `assets/cutscenes/${id}.${ext}`));
  assert.deepEqual(cold.introFiles, media);
  for (const path of [...media, ...a.preFight.files, ...a.preFight.bootModules.files]) assert.ok(cold.files.includes(path), path);
  assert.equal(new Set(cold.files).size, cold.files.length);
  assert.equal(cold.inventoryUpperBoundBytes, cold.files.reduce((n, p) => n + statSync(p).size, 0));
  assert.equal(cold.inventoryStatus, 'FAIL', 'category PASS must not hide streamed intro bytes');
  assert.ok(cold.inventoryUpperBoundBytes > cold.budgetBytes);
  assert.equal(a.preFight.inventoryStatus, 'PASS', 'the separately defined asset category remains reviewable');
});
