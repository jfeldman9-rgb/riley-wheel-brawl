// Structural sprite-atlas checks, deliberately not pixel-hash or palette locks.
// New painted artwork is welcome; clipped/overlapping geometry is not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHARS } from '../src/assets.js';
import { dimensions, ROOT } from '../tools/audit-stage1.mjs';
const bytes = path => readFileSync(resolve(ROOT, path));
const json = path => JSON.parse(bytes(path));
const inside = (rect, width, height) => Number.isInteger(rect.x) && Number.isInteger(rect.y) &&
  Number.isInteger(rect.w) && Number.isInteger(rect.h) && rect.x >= 0 && rect.y >= 0 &&
  rect.w > 0 && rect.h > 0 && rect.x + rect.w <= width && rect.y + rect.h <= height;

for (const key of CHARS) {
  const meta = json(`assets/chars/${key}.anims.json`);
  test(`${key} atlas dimensions and both normal-map directions share the correct aspect ratio`, () => {
    for (const page of meta.pages) {
      const atlas = json(`assets/chars/${page}.json`), color = dimensions(bytes(`assets/chars/${page}.webp`));
      assert.deepEqual(color, [atlas.meta.size.w, atlas.meta.size.h], page);
      const normal = dimensions(bytes(`assets/chars/${page}_n.webp`));
      const flipped = dimensions(bytes(`assets/chars/${page}_nl.webp`));
      assert.deepEqual(flipped, normal, `${page}: flipped normal geometry`);
      assert.equal(normal[0] * color[1], normal[1] * color[0], `${page}: normal-map aspect ratio`);
      assert.ok(normal.every(n => n > 0));
    }
  });
  test(`${key} packed frames stay inside atlas and registered canvas without overlap`, () => {
    const sourceSize = { w: Math.round(meta.canvas[0] * meta.scale), h: Math.round(meta.canvas[1] * meta.scale) };
    for (const page of meta.pages) {
      const atlas = json(`assets/chars/${page}.json`), frames = Object.entries(atlas.frames);
      for (const [name, data] of frames) {
        assert.ok(inside(data.frame, atlas.meta.size.w, atlas.meta.size.h), `${name}: packed rectangle`);
        assert.deepEqual(data.sourceSize, sourceSize, `${name}: registered canvas`);
        assert.ok(inside(data.spriteSourceSize, data.sourceSize.w, data.sourceSize.h), `${name}: trimmed bounds`);
        assert.equal(data.spriteSourceSize.w, data.rotated ? data.frame.h : data.frame.w, `${name}: trim width`);
        assert.equal(data.spriteSourceSize.h, data.rotated ? data.frame.w : data.frame.h, `${name}: trim height`);
      }
      for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) {
        const a = frames[i][1].frame, b = frames[j][1].frame;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.equal(overlap, false, `${frames[i][0]} overlaps ${frames[j][0]}`);
      }
    }
  });
}

test('static dimension audit accepts PNG headers for future genuine generated art', () => {
  const header = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(header);
  header.write('IHDR',12); header.writeUInt32BE(1536,16); header.writeUInt32BE(1024,20);
  assert.deepEqual(dimensions(header), [1536,1024]);
  assert.throws(() => dimensions(Buffer.from('not an image')), /Unsupported image header/);
});
