import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const cap = (file, max) => {
  const size = statSync(resolve(root, file)).size;
  assert.ok(size <= max, `${file} is ${size} bytes, cap ${max}`);
};

test('Stage 6 modules stay inside the plan caps', () => {
  cap('src/belal.js', 16384);
  for (const f of ['src/stage6.js', 'src/stage6-arena.js', 'src/bot-stage6.js', 'src/rand-call.js']) cap(f, 12288);
  for (const f of ['src/grayman.js', 'src/fadelt.js', 'src/rand-call-cutscene.js']) cap(f, 9216);
  cap('src/stage6-art.js', 24576);
  for (const f of ['src/stage6-hud.js', 'src/stage6-voice.js', 'src/stage6-sfx.js', 'src/stage6-def.js']) cap(f, 6144);
});

test('no Stage 6 file is inside the pre-fight gate', () => {
  const out = execFileSync('node', ['tools/audit-stage1.mjs'], { encoding: 'utf8' });
  const data = JSON.parse(out);
  const bad = (data.preFight.files || []).filter(p => /stage6|rand-call|belal|grayman|fadelt|bot-stage6|\/bg6\/|cutscenes\/rand/.test(p));
  assert.deepEqual(bad, []);
  const names = readdirSync('src').filter(n => /^(stage6|rand-call|belal|grayman|fadelt|bot-stage6)/.test(n));
  for (const name of names) assert.ok(data.stage6.source.files.includes('src/' + name), name);
  assert.equal(data.preFight.inventoryStatus, 'PASS');
  assert.equal(data.cutscenes.randCalls.budgetBytes, 7_500_000);
});
