// Per-animation pivots: every shipped key is in range, and the committed table
// is exactly what a fresh generator run emits. No existing test file is edited.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANIM_PIVOT_X } from '../src/anim-pivot.js';
import { generatePivots, renderPivotModule, PIVOT_KEYS } from '../tools/gen-anim-pivots.mjs';

test('committed anim pivots match a fresh generator run and stay in [0.40, 0.60]', () => {
  const { map } = generatePivots();
  const committed = readFileSync(new URL('../src/anim-pivot.js', import.meta.url), 'utf8');
  assert.equal(committed, renderPivotModule(map));
  assert.deepEqual(ANIM_PIVOT_X, map);
  const names = [];
  for (const key of PIVOT_KEYS) {
    const meta = JSON.parse(readFileSync(new URL(`../assets/chars/${key}.anims.json`, import.meta.url), 'utf8'));
    for (const anim of meta.anims) {
      names.push(anim.name);
      const px = ANIM_PIVOT_X[anim.name];
      assert.equal(typeof px, 'number', anim.name);
      assert.ok(px >= 0.40 && px <= 0.60, `${anim.name} pivot ${px} outside [0.40, 0.60]`);
    }
  }
  assert.deepEqual(Object.keys(ANIM_PIVOT_X).sort(), names.sort());
  assert.equal(typeof ANIM_PIVOT_X.riley_run, 'number');
});
