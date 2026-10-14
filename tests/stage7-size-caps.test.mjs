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

test('Stage 7 modules stay inside caps in the Stage 6 shape', () => {
  for (const f of ['src/stage7.js', 'src/shaido.js', 'src/stage7-lifecycle.js']) cap(f, 16384);
  for (const f of ['src/asmodean.js', 'src/bot-stage7.js', 'src/stage7-art.js', 'src/stage7-view.js', 'src/call7-cutscene.js']) cap(f, 12288);
  for (const f of ['src/moilan-call.js', 'src/stage7-hud.js', 'src/stage7-voice.js', 'src/stage7-notes.js']) cap(f, 8192);
  for (const f of ['src/stage7-def.js', 'src/stage7-sfx.js', 'src/stage7-paint.js', 'src/stage7-painted.js', 'src/stage7-arena.js', 'src/stage7-storm.js', 'src/stage7-street.js', 'src/stage7-tells.js']) cap(f, 6144);
  for (const f of ['src/stage7-actors.js', 'src/stage7-audio.js', 'src/stage7-freeze.js', 'src/stage7-hurt.js', 'src/stage7-load.js']) cap(f, 2048);
});

test('every Stage 7 source file is in the audit STAGE7 set (0 bytes against the gate)', () => {
  const data = JSON.parse(execFileSync('node', ['tools/audit-stage1.mjs'], { encoding: 'utf8' }));
  const names = readdirSync('src').filter(n => /^(stage7|moilan-call|call7-cutscene|shaido|asmodean|bot-stage7)/.test(n));
  assert.ok(names.length >= 20, names.length);
  for (const name of names) assert.ok(data.stage7.source.files.includes('src/' + name), name);
  assert.ok(data.stage7.source.bytes <= 192 * 1024, data.stage7.source.bytes);
  assert.equal(data.stage7.voices.count, 0, 'no st7 voice files ship yet; captions carry the lines');
});
