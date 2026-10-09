import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensions } from '../tools/audit-stage1.mjs';
import { queueCharPages } from '../src/assets.js';
import { STAGE5_CHARS } from '../src/stage5-def.js';

const chars = STAGE5_CHARS;
const metas = Object.fromEntries(chars.map(k => [k + '.A', JSON.parse(readFileSync(`${k === 'riley3' ? 'assets/stage3/chars' : 'assets/chars'}/${k}.anims.json`))]));
test('Stage 5 queues compact normal maps while retaining the exact existing colour atlases', () => {
  const atlases = [], images = [];
  queueCharPages({ loadedStage: 5, cache: { json: { get: k => metas[k] } }, textures: { exists: () => false },
    load: { atlas: row => atlases.push(row), image: (...row) => images.push(row) } }, chars);
  for (const row of atlases) {
    const dir = row.key.startsWith('riley3') ? 'assets/stage3/chars' : 'assets/chars';
    assert.equal(row.textureURL, `${dir}/${row.key}.webp`);
    assert.equal(row.atlasURL, `${dir}/${row.key}.json`);
    assert.equal(row.normalMap, `assets/stage5/normals/${row.key}_n.webp`);
  }
  for (const [key, url] of images) assert.equal(url, `assets/stage5/normals/${key}.webp`);
});
test('compact colour plus BOTH normal sets fit the Stage 5 resident budget with overhead reserved', () => {
  let bytes = 0;
  for (const m of Object.values(metas)) for (const p of m.pages) {
    const dir = m.dir || 'assets/chars';
    const [cw, ch] = dimensions(readFileSync(`${dir}/${p}.webp`)); bytes += cw * ch * 4;
    for (const suffix of ['_n', '_nl']) {
      const [ow, oh] = dimensions(readFileSync(`${dir}/${p}${suffix}.webp`));
      const [w, h] = dimensions(readFileSync(`assets/stage5/normals/${p}${suffix}.webp`));
      assert.equal(w, Math.ceil(ow / 3)); assert.equal(h, Math.ceil(oh / 3));
      bytes += w * h * 4;
    }
  }
  // The live WebKit dump uses 27.20 MiB outside character sources at rs=1.
  // Reserve 27.5 MiB for boss sheets, story, powers, HUD, props, FX and render targets.
  assert.ok(bytes + 27.5 * 2 ** 20 < 120 * 2 ** 20, `${bytes / 2 ** 20} MiB character sources`);
});
for (const stage of [4, 5]) test(`switch to Stage ${stage} evicts the opposite normal variant and its cached animation frames`, () => {
  const url = stage === 5 ? 'assets/chars/riley-0_n.webp' : 'assets/stage5/normals/riley-0_n.webp';
  const keys = new Set(['riley-0', 'riley-0_nl']), removed = [], anims = new Set(['riley_walk']);
  const rows = [];
  queueCharPages({ loadedStage: stage, cache: { json: { get: () => ({ pages: ['riley-0'], anims: [{ name: 'riley_walk' }] }) } },
    textures: { exists: k => keys.has(k), get: () => ({ dataSource: [{ image: { src: url } }] }), remove(k) { removed.push(k); keys.delete(k); } },
    anims: { exists: k => anims.has(k), remove: k => anims.delete(k) }, load: { atlas: r => rows.push(r), image() {} } }, ['riley']);
  assert.deepEqual(removed, ['riley-0', 'riley-0_nl']);
  assert.equal(anims.size, 0, 'animations must not retain frames from the freed texture');
  assert.equal(rows[0].normalMap, `${stage === 5 ? 'assets/stage5/normals' : 'assets/chars'}/riley-0_n.webp`);
});
