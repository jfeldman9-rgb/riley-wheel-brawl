import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensions } from '../tools/audit-stage1.mjs';
import { queueCharPages } from '../src/assets.js';
import { STAGE6_CANVASES } from '../src/stage6-art.js';
import { STAGE6_CHARS } from '../src/stage6-def.js';
import { COMPACT_NORMAL_DIR } from '../src/texture-pages.js';

const px = p => { const [w, h] = dimensions(readFileSync(p)); return w * h * 4; };
const mib = n => n / 1048576;

test('Stage 6 boss-peak RGBA stays near the plan and does not load the dropped sheets', () => {
  assert.deepEqual([...STAGE6_CHARS], ['riley', 'grunt', 'spear', 'hound']);
  const files = [];
  for (const k of STAGE6_CHARS) {
    const meta = JSON.parse(readFileSync(`assets/chars/${k}.anims.json`, 'utf8'));
    const dir = meta.dir || 'assets/chars';
    for (const p of meta.pages) {
      files.push(`${dir}/${p}.webp`);
      files.push(`${COMPACT_NORMAL_DIR}/${p}_n.webp`);
      files.push(`${COMPACT_NORMAL_DIR}/${p}_nl.webp`);
    }
  }
  files.push('assets/stage3/chars/cutthroat-0.webp');
  for (const k of ['angreal', 'saangreal', 'lightning', 'fireshield', 'airwhip']) {
    files.push(`assets/powers/pu_${k}.png`);
    files.push(`assets/powers/hud_${k}.png`);
  }
  for (const f of ['fx_lightning.png', 'fx_fireshield.png', 'fx_airwhip.png']) files.push('assets/powers/' + f);
  for (const f of ['riley-portrait.webp', 'chief-portrait.webp', 'loial-portrait.webp', 'byar-portrait.webp']) files.push('assets/ui/' + f);
  assert.ok(!files.some(f => f.includes('loial-') && f.includes('chars')));
  assert.ok(!files.some(f => f.includes('cutthroat-0_n') || f.includes('fade') || f.includes('twix') || f.includes('riley_lightning')));
  const fileBytes = files.reduce((n, f) => n + px(f), 0);
  const canvasBytes = STAGE6_CANVASES.reduce((n, [, w, h]) => n + w * h * 4, 0)
    + 128 * 128 * 4 + 64 * 64 * 4 + 64 * 64 * 4 + 40 * 6 * 4 + 12 * 12 * 4 + 14 * 5 * 4 + 4 * 4 * 4 + 200 * 4 * 4 + 8 * 720 * 4;
  const total = fileBytes + canvasBytes;
  assert.ok(canvasBytes < 2 * 1048576, mib(canvasBytes));
  assert.ok(mib(total) < 120, `measured ${mib(total).toFixed(2)} MiB`);
  assert.ok(mib(fileBytes) > 40);
});

test('Stage 6 queues the shared compact normals, and leaving it restores the original pages', () => {
  const metas = Object.fromEntries(STAGE6_CHARS.map(k => [k + '.A', JSON.parse(readFileSync(`assets/chars/${k}.anims.json`))]));
  const atlases = [], images = [];
  queueCharPages({ loadedStage: 6, cache: { json: { get: k => metas[k] } }, textures: { exists: () => false },
    load: { atlas: row => atlases.push(row), image: (...row) => images.push(row) } }, STAGE6_CHARS);
  assert.ok(atlases.length > 0);
  for (const row of atlases) assert.equal(row.normalMap, `${COMPACT_NORMAL_DIR}/${row.key}_n.webp`);
  for (const [key, url] of images) assert.equal(url, `${COMPACT_NORMAL_DIR}/${key}.webp`);
  const keys = new Set(['riley-0', 'riley-0_nl']), removed = [], rows = [];
  queueCharPages({ loadedStage: 1, cache: { json: { get: () => ({ pages: ['riley-0'], anims: [{ name: 'riley_walk' }] }) } },
    textures: { exists: k => keys.has(k), get: () => ({ dataSource: [{ image: { src: `${COMPACT_NORMAL_DIR}/riley-0_n.webp` } }] }), remove(k) { removed.push(k); keys.delete(k); } },
    anims: { exists: () => true, remove() {} }, load: { atlas: r => rows.push(r), image() {} } }, ['riley']);
  assert.deepEqual(removed, ['riley-0', 'riley-0_nl']);
  assert.equal(rows[0].normalMap, 'assets/chars/riley-0_n.webp');
  assert.equal(rows[0].textureURL, 'assets/chars/riley-0.webp');
});
