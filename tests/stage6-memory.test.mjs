import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensions } from '../tools/audit-stage1.mjs';
import { STAGE6_CANVASES } from '../src/stage6-art.js';
import { STAGE6_CHARS } from '../src/stage6-def.js';

const px = p => { const [w, h] = dimensions(readFileSync(p)); return w * h * 4; };
const mib = n => n / 1048576;

test('Stage 6 boss-peak RGBA stays near the plan and does not load the dropped sheets', () => {
  assert.deepEqual([...STAGE6_CHARS], ['riley', 'grunt', 'spear', 'hound']);
  const files = [];
  for (const k of STAGE6_CHARS) {
    const meta = JSON.parse(readFileSync(`assets/chars/${k}.anims.json`, 'utf8'));
    const dir = meta.dir || 'assets/chars';
    for (const p of meta.pages) for (const f of [`${dir}/${p}.webp`, `${dir}/${p}_n.webp`, `${dir}/${p}_nl.webp`]) files.push(f);
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
  assert.ok(mib(total) < 132, `measured ${mib(total).toFixed(2)} MiB`);
  assert.ok(mib(fileBytes) > 100);
});
