// Painted Aginor and Balthamel: provenance, hashes, and the atlas contract the actors rely on.
import './helpers/stage5-harness.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { PAINTED } = await import('../src/stage5-art.js');
const R = p => new URL('../' + p, import.meta.url);
const J = p => JSON.parse(readFileSync(R(p)));
const sha = p => createHash('sha256').update(readFileSync(R(p))).digest('hex');

test('Stage 5 ART_STATUS keeps the ChatGPT provenance, the pending-review approval and true hashes', () => {
  const status = J('assets/stage5/ART_STATUS.json');
  for (const key of ['s5agin', 's5balt', 'aginorPortrait']) {
    const e = status.entries.find(x => x.key === key);
    assert.ok(e, key);
    assert.equal(e.placeholder, false);
    assert.equal(e.source, 'chatgpt-image');
    assert.equal(e.art.approvedBy, 'approved by Jason F via Grok Bot 2026-10-09 pending review');
    assert.equal(e.art.tool, 'tools/stage5/process_bosses.py');
    assert.ok(existsSync(R(e.art.sourceFile)), e.art.sourceFile);
    assert.equal(sha(e.art.sourceFile), e.art.sourceSha256, e.art.sourceFile);
    for (const f of e.files) assert.equal(sha(f), e.sha256[f], f);
    const row = PAINTED.find(r => r.key === key);
    assert.ok(row?.present, `${key} is loaded`);
    assert.ok(e.files.includes(row.url));
  }
});

test('painted boss atlases: frame count, trimmed frames inside the cell, baseH matches PAINTED, palm on the tether frame', () => {
  for (const [key, n] of [['s5agin', 7], ['s5balt', 9]]) {
    const row = PAINTED.find(r => r.key === key);
    const at = J(row.atlas);
    const names = Object.keys(at.frames);
    assert.deepEqual(names.sort((a, b) => a - b), Array.from({ length: n }, (_, i) => String(i)), key);
    assert.equal(at.meta.baseH, row.baseH, `${key}: PAINTED.baseH is the tool's cell height / PX`);
    const { w: PW, h: PH } = at.meta.size;
    for (const f of Object.values(at.frames)) {
      const { frame: r, spriteSourceSize: s, sourceSize: c } = f;
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= PW && r.y + r.h <= PH);
      assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= c.w && s.y + s.h <= c.h);
      assert.equal(c.h / row.baseH, at.meta.px);
    }
    if (key === 's5agin') {
      const palm = at.frames['3'].palm;
      assert.ok(Array.isArray(palm) && palm[1] > 0 && palm[1] < at.frames['3'].sourceSize.h, 'palm above the feet');
    }
  }
});
