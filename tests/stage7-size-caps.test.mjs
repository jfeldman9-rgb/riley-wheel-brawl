import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

test('stage 7 audit lines pass and stay out of the pre-fight sum', () => {
  const data = JSON.parse(execFileSync('node', ['tools/audit-stage1.mjs'], { encoding: 'utf8' }));
  assert.equal(data.preFight.inventoryStatus, 'PASS');
  assert.ok(data.preFight.budgetBytes - data.preFight.inventoryUpperBoundBytes >= 50 * 1024);
  assert.equal(data.stage7.source.status, 'PASS');
  assert.ok(data.stage7.source.bytes <= 192 * 1024);
  assert.equal(data.stage7.voices.status, 'PASS');
  assert.equal(data.stage7.voices.budgetBytes, 24 * 200 * 1024);
  assert.equal(data.stage7.music.status, 'PASS');
  assert.equal(data.stage7.art.status, 'PASS');
  assert.equal(data.cutscenes.callIns7.status, 'PASS');
  assert.equal(data.cutscenes.callIns7.budgetBytes, 9_000_000);
  assert.equal(data.cutscenes.stage7.status, 'PASS');
  assert.equal(data.cutscenes.source.status, 'PASS');
  const names = readdirSync('src').filter(n => /^(stage7|moilan-call|call7-cutscene|shaido|asmodean|bot-stage7)/.test(n));
  for (const name of names) assert.ok(data.stage7.source.files.includes('src/' + name), name);
  const leaked = (data.preFight.files || []).filter(p => /stage7|moilan|shaido|asmodean|call7|bot-stage7|\/bg7\//.test(p));
  assert.deepEqual(leaked, []);
});
