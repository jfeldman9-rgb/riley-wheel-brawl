import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The mid3a -> mid3b join is the inn's corner: mid3a is cut at CORNER, mid3b sits OVERLAP plate px under it.
// stage3.js places mid3b at mid3a.x + displayWidth - overlap * scale, so plates.json must carry the tool's number.
test('Stage 3 mid plates overlap at the inn corner by the amount the plate tool baked in', () => {
  const plates = JSON.parse(readFileSync(new URL('../assets/bg3/plates.json', import.meta.url)));
  const tool = readFileSync(new URL('../tools/stage3/process_bg3_plates.py', import.meta.url), 'utf8');
  const W = +tool.match(/^W, H = (\d+), \d+/m)[1];
  const corner = +tool.match(/^CORNER = (\d+)/m)[1];
  const feather = +tool.match(/^FEATHER = (\d+)/m)[1];
  assert.equal(plates.overlap, W - corner + feather);
  assert.ok(plates.overlap > 0 && plates.overlap < 200);
  assert.match(tool, /corner_cut\(mid\('bg3-mid'/);
  assert.match(tool, /corner_shade\(mid\('bg3-mid2'/);
});
