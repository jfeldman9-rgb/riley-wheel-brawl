import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dimensions } from '../tools/audit-stage1.mjs';
import { queueCharPages } from '../src/assets.js';
import { STAGE7_CHARS } from '../src/stage7-def.js';
import { STAGE7_CANVASES, canvasRgba } from '../src/stage7-art.js';
import { PAINTED7 } from '../src/stage7-painted.js';
import { COMPACT_NORMAL_DIR, usesCompactNormals } from '../src/texture-pages.js';

const px = p => { const [w, h] = dimensions(readFileSync(p)); return w * h * 4; };
const mib = n => n / 1048576;

// Plan section 5.2 decoded caps for the painted sheets, when the real art lands.
const PAINTED_CAPS = { s7dancer: 1.25, s7veiled: 1.15, s6fade: 1.10, s7asmo: 2.10, s7moir: 0.80, s7lan: 0.97,
  s7note: 0.09, s7column: 0.66, s7shard: 0.13, s7earth: 0.38, s7shield: 0.25, s7dust: 0.50, s7ring: 0.08, s7portal: 0.25 };

test('Stage 7 uses compact normals and only three atlas fighters (no hound pages)', () => {
  assert.deepEqual([...STAGE7_CHARS], ['riley', 'grunt', 'spear']);
  assert.equal(usesCompactNormals(7), true);
  assert.equal(usesCompactNormals(1), false);
  const metas = Object.fromEntries(STAGE7_CHARS.map(k => [k + '.A', JSON.parse(readFileSync(`assets/chars/${k}.anims.json`))]));
  const atlases = [], images = [];
  queueCharPages({ loadedStage: 7, cache: { json: { get: k => metas[k] } }, textures: { exists: () => false },
    load: { atlas: row => atlases.push(row), image: (...row) => images.push(row) } }, STAGE7_CHARS);
  assert.ok(atlases.length > 0);
  for (const row of atlases) assert.equal(row.normalMap, `${COMPACT_NORMAL_DIR}/${row.key}_n.webp`);
  assert.ok(!atlases.some(r => /hound/.test(r.key)));
});

test('boss-peak estimate stays under the 105 MiB gate with the code-drawn cast resident', () => {
  const files = [];
  for (const k of STAGE7_CHARS) {
    const meta = JSON.parse(readFileSync(`assets/chars/${k}.anims.json`, 'utf8'));
    const dir = meta.dir || 'assets/chars';
    for (const p of meta.pages) {
      files.push(`${dir}/${p}.webp`);
      files.push(`${COMPACT_NORMAL_DIR}/${p}_n.webp`);
      files.push(`${COMPACT_NORMAL_DIR}/${p}_nl.webp`);
    }
  }
  for (const k of ['angreal', 'saangreal', 'lightning', 'fireshield', 'airwhip']) {
    files.push(`assets/powers/pu_${k}.png`);
    files.push(`assets/powers/hud_${k}.png`);
  }
  for (const f of ['fx_lightning.png', 'fx_fireshield.png', 'fx_airwhip.png']) files.push('assets/powers/' + f);
  for (const f of ['riley-portrait.webp', 'chief-portrait.webp', 'loial-portrait.webp', 'byar-portrait.webp']) files.push('assets/ui/' + f);
  assert.ok(!files.some(f => f.includes('hound')));
  const fileBytes = files.reduce((n, f) => n + px(f), 0);
  // Present painted rows (reused Stage 6 sheets today) count at their real decoded size.
  let painted = 0;
  for (const row of PAINTED7) if (row.present && existsSync(row.url)) painted += px(row.url);
  const total = fileBytes + painted + canvasRgba();
  assert.ok(mib(total) <= 105, `measured ${mib(total).toFixed(2)} MiB`);
  assert.ok(mib(fileBytes) > 40);
  assert.ok(mib(canvasRgba()) < 1, 'code-drawn stand-ins are tiny');
  assert.ok(mib(painted + canvasRgba()) <= 12, 'painted resident cap (plan section 7.1)');
});

test('every painted row that ships later has a decoded cap, and absent rows stay code-drawn', () => {
  const canvasKeys = new Set(STAGE7_CANVASES.map(r => r[0]));
  for (const row of PAINTED7) {
    assert.ok(canvasKeys.has(row.key), `${row.key} has a code-drawn fallback`);
    if (row.present) assert.ok(existsSync(row.url), row.url);
    if (PAINTED_CAPS[row.key] && row.present && existsSync(row.url)) {
      assert.ok(mib(px(row.url)) <= PAINTED_CAPS[row.key] + 0.05, `${row.key} over its plan cap`);
    }
  }
  const capTotal = Object.values(PAINTED_CAPS).reduce((a, b) => a + b, 0) + 0.21;
  assert.ok(capTotal <= 12, `plan caps sum to ${capTotal.toFixed(2)} MiB`);
});
