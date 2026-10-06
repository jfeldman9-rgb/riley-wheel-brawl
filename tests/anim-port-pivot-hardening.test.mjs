import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { Fighter } from '../src/fighter.js';
import { ANIM_PIVOT_X } from '../src/anim-pivot.js';
import { TYPES } from '../src/enemies.js';
import { LOIAL_DEF } from '../src/loial.js';

function fighter(def = { prefix: 'unknown_' }, meta) {
  const f = Object.create(Fighter.prototype);
  Object.assign(f, { def, meta, cur: '', scene: { anims: { exists: () => true } },
    sprite: { originX: 0.5, originY: 1, anims: {}, play() {},
      setOrigin(x, y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); this.originX = x; this.originY = y; } } });
  return f;
}

test('play keeps a finite origin when an unlisted type has no anchor or pivot metadata', () => {
  for (const meta of [undefined, {}, { canvas: [] }, { baseline: 800, canvas: [816, 0] }, { baseline: NaN, canvas: [816, 1024] }]) {
    const f = fighter(undefined, meta); f.play('walk');
    assert.equal(f.sprite.originX, 0.5); assert.equal(f.sprite.originY, 1);
  }
  const f = fighter({ prefix: 'future_', anchorX: NaN }, { baseline: 900, canvas: [816, 1024] });
  f.play('walk'); assert.equal(f.sprite.originX, 0.5); assert.equal(f.sprite.originY, 900 / 1024);
});

test('shipped enemies, Whitecloaks, Loial and bosses retain table or definition pivots', () => {
  for (const stage of [1, 2]) {
    const h = stage1Simulation({ stage, mode: null });
    try {
      for (const def of [h.s.riley.def, LOIAL_DEF, ...Object.values(TYPES).map(t => t.def)]) {
        const meta = h.s.metas[def.key]; if (!meta) continue;
        const f = fighter(def, meta);
        for (const anim of meta.anims) {
          f.play(anim.name.slice(def.prefix.length));
          assert.equal(f.sprite.originX, ANIM_PIVOT_X[anim.name] ?? def.anchorX);
          assert.equal(f.sprite.originY, meta.baseline / meta.canvas[1]);
        }
      }
    } finally { h.destroy(); }
  }
});

test('same-animation fast path still skips pivot updates', () => {
  const f = fighter({ prefix: 'riley_' }, {}); f.cur = 'riley_jump_rise';
  f.sprite.play = f.sprite.setOrigin = () => assert.fail('repeated play must stay cheap');
  f.play('jump_rise', 0.3, false); assert.equal(f.sprite.anims.timeScale, 0.3);
});
