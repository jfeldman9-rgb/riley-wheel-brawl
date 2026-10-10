import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const cap = (file, max) => {
  const size = statSync(resolve(root, file)).size;
  assert.ok(size <= max, `${file} is ${size} bytes, cap ${max}`);
};

test('Stage 5 modules stay inside their own caps and do not raise Stage 4 caps', () => {
  cap('src/aginor.js', 16384);
  for (const f of ['src/stage5.js', 'src/stage5-blight.js', 'src/stage5-arena.js', 'src/bot-stage5.js']) cap(f, 12288);
  cap('src/blightspawn.js', 9216);
  cap('src/balthamel.js', 9216);
  for (const f of ['src/stage5-art.js', 'src/stage5-art-bg.js', 'src/stage5-art-fx.js', 'src/stage5-art-cast.js']) cap(f, 24576);
  for (const f of ['src/stage5-hud.js', 'src/stage5-voice.js', 'src/stage5-sfx.js', 'src/stage5-def.js']) cap(f, 6144);
  cap('src/bot.js', 12288);
});
