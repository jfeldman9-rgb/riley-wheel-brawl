import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { audit, ROOT } from '../tools/audit-stage1.mjs';
const data = audit();
test('pre-fight static inventory stays within unchanged 25 MB budget', () => {
  assert.ok(data.preFight.inventoryUpperBoundBytes <= 25_000_000, JSON.stringify(data.preFight));
});
test('every animation points to a real nonempty packed frame with a positive hold', () => {
  for (const c of data.characters) {
    const m = JSON.parse(readFileSync(resolve(ROOT,`assets/chars/${c.key}.anims.json`)));
    for (const a of m.anims) {
      assert.equal(a.frames.length,a.pages.length); assert.equal(a.frames.length,a.holds.length);
      for (let i=0;i<a.frames.length;i++) {
        const page=m.pages[a.pages[i]], atlas=JSON.parse(readFileSync(resolve(ROOT,`assets/chars/${page}.json`)));
        assert.ok(atlas.frames[a.frames[i]], `${a.name}: missing ${a.frames[i]}`);
        assert.ok(a.holds[i]>0, `${a.name}: invalid duration`);
        for (const suffix of ['.webp','_n.webp','_nl.webp']) assert.ok(existsSync(resolve(ROOT,`assets/chars/${page}${suffix}`)));
      }
    }
  }
});
test('asset ledger honestly retains unmet animation targets', () => {
  for (const c of data.characters.filter(c=>c.target!==null)) {
    assert.equal(c.densityStatus,c.frames>=c.target?'PASS':'FAIL');
    assert.equal(c.target,c.key==='riley'?150:40);
  }
  assert.equal(data.physicalDeviceGate,'UNMEASURED');
  assert.ok(data.textureEstimate.rgbaBaseBytes>0);
});
