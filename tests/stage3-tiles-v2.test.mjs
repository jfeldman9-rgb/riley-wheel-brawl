// Stage 3 roof tiles v2: the re-rolled tile row (Jason asked for it after PR #40, whose v1 spin rattled).
// Provenance of every painted Stage 3 prop/FX sheet, and the v2 tile sheet's shape, source and frame order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const R = p => new URL('../' + p, import.meta.url);
const J = p => JSON.parse(readFileSync(R(p), 'utf8'));
const sha = p => createHash('sha256').update(readFileSync(R(p))).digest('hex');
const S = J('assets/stage3/ART_STATUS.json');
const FX = ['prop-rooftiles', 'fx-shadowpool', 'fx-shadowburst', 'fx-fade-far'];

/** Width and height of a lossless (VP8L) WebP from its header. */
function webpSize(p) {
  const b = readFileSync(R(p));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  assert.equal(b.toString('ascii', 12, 16), 'VP8L', `${p} is lossless WebP (lossy chroma brings the key colour back)`);
  assert.equal(b[20], 0x2f);
  const v = b.readUInt32LE(21);
  return [(v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1];
}

test('every painted Stage 3 prop/FX sheet names a committed source whose bytes match its sha256', () => {
  for (const id of FX) {
    const e = S.entries.find(x => x.id === id);
    assert.ok(e && e.placeholder === false && e.source === 'chatgpt-image', id);
    assert.match(e.art.approvedBy, /^Jason F via Grok Bot, 2026-10-08/, id);
    assert.ok(existsSync(R(e.art.sourceFile)), `${id}: ${e.art.sourceFile}`);
    assert.equal(sha(e.art.sourceFile), e.art.sourceSha256, `${id}: source bytes unchanged`);
    for (const f of e.files) assert.equal(sha(f), e.sha256[f], f);
  }
});

test('roof tiles come from the v2 re-roll, four 256 px frames, lossless, v1 recorded as superseded', () => {
  const e = S.entries.find(x => x.id === 'prop-rooftiles');
  assert.equal(e.art.sourceFile, 'art-in/stage3fx/fx-tiles-v2.src.png');
  assert.equal(e.art.sourceSha256, '72174dbb9c306732725361eabee6e2af99d909eb526a6522ed8cd3a997e40fcd');
  assert.deepEqual(webpSize('assets/stage3/props/prop-rooftiles.webp'), [1024, 256]);
  assert.notEqual(e.sha256['assets/stage3/props/prop-rooftiles.webp'], e.art.supersedes.sha256, 'not the PR #40 sheet');
  assert.equal(e.art.supersedes.sourceFile, 'art-in/stage3fx/fx-collage-a.src.png');
  // the other three sheets keep their PR #40 bytes and sizes
  assert.deepEqual(webpSize('assets/stage3/props/fx-shadowpool.webp'), [1024, 256]);
  assert.deepEqual(webpSize('assets/stage3/props/fx-shadowburst.webp'), [1536, 256]);
  assert.deepEqual(webpSize('assets/stage3/props/fx-fade-far.webp'), [1024, 256]);
});

test('the tile prompt records both tries and the re-roll as prompts[2]', () => {
  const p = J('docs/stage3/prompts/prop-rooftiles.json');
  assert.equal(p.tries, 2);
  assert.equal(p.prompts.length, 3);
  assert.match(p.prompts[2], /chatgpt\.com\/c\/6ac74d28-fd70-83e8-8838-c007eaf698a5/);
  assert.match(p.prompts[2], /fx-tiles-v2\.src\.png/);
  assert.equal(p.rejections.length, 1);
});

test('process_fx.py reads the v2 tile source, keys it with no pink cap and plays it in painted order', () => {
  const py = readFileSync(R('tools/stage3/process_fx.py'), 'utf8');
  assert.match(py, /SRC_T = os\.path\.join\(ROOT, 'art-in', 'stage3fx', 'fx-tiles-v2\.src\.png'\)/);
  assert.match(py, /^TILE_ORDER = \[0, 1, 2, 3\]$/m);
  assert.match(py, /\('prop-rooftiles', strip\(tiles\(t\), False, 0\.0\), False, 0\.0\)/);
  assert.match(readFileSync(R('docs/stage3/FX-ART.md'), 'utf8'), /Tile order 1, 2, 3, 4/);
});
