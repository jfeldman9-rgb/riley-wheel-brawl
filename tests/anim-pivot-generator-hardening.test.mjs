import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePivots, renderPivotModule } from '../tools/gen-anim-pivots.mjs';

function fixture(change = () => {}) {
  const files = {
    'assets/chars/fixture.anims.json': { pages: ['fixture-0'], anims: [{ name: 'fixture_walk', frames: ['a'], pages: [0] }] },
    'assets/chars/fixture-0.json': { frames: { a: { spriteSourceSize: { x: 40, w: 20 }, sourceSize: { w: 100 } } } },
  };
  change(files);
  return path => { if (!files[path]) throw new Error(`missing ${path}`); return files[path]; };
}

test('pivot generator rejects missing atlas pages with character and page context', () => {
  assert.throws(() => generatePivots(['fixture'], fixture(f => delete f['assets/chars/fixture-0.json'])), /fixture-0/);
  assert.throws(() => generatePivots(['fixture'], fixture(f => f['assets/chars/fixture.anims.json'].anims[0].pages[0] = 1)), /fixture_walk.*a/);
});

test('pivot generator rejects missing frames, zero source widths and invalid geometry', () => {
  for (const mutate of [
    f => delete f['assets/chars/fixture-0.json'].frames.a,
    f => f['assets/chars/fixture-0.json'].frames.a.sourceSize.w = 0,
    f => f['assets/chars/fixture-0.json'].frames.a.spriteSourceSize.x = NaN,
    f => f['assets/chars/fixture.anims.json'].anims[0].frames = [],
  ]) assert.throws(() => generatePivots(['fixture'], fixture(mutate)), /fixture_walk/);
});

test('pivot generation stays deterministic without mutating input data', () => {
  const read = fixture();
  const first = generatePivots(['fixture'], read), second = generatePivots(['fixture'], read);
  assert.deepEqual(first, { map: { fixture_walk: 0.5 }, counts: { fixture_walk: 1 } });
  assert.equal(renderPivotModule(first.map), renderPivotModule(second.map));
  assert.equal(renderPivotModule(generatePivots().map), renderPivotModule(generatePivots().map));
});
