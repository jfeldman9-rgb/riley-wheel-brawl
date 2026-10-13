import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the code-drawn texture estimate stays inside the iPhone gates', () => {
  const art = JSON.parse(readFileSync('docs/stage7/texture-art.json', 'utf8'));
  assert.match(art.method, /code-drawn/);
  assert.equal(art.paintedResidentMiB, 0);
  assert.ok(art.paintedResidentMiB <= art.paintedCapMiB);
  assert.ok(art.bossPeakSourceMiB <= art.bossPeakCapMiB);
  assert.ok(art.bossPeakSourceMiB <= 105);
  assert.ok(art.paintedCapMiB <= 12);
});
