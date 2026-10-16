import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage4Simulation } from './helpers/stage4-harness.mjs';

const read = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');

test('Stage 4 uses the shared input path and does not construct its own', () => {
  const main = read('main.js');
  const stage1 = read('stage1.js');
  assert.match(main, /new Input\(/);
  assert.match(stage1, /this\.inp = this\.game\.inp/);
  assert.doesNotMatch(read('input.js'), /stage4|draghkar|cultist/i);
  for (const file of ['stage4.js', 'stage4-actors.js', 'stage4-hazards.js', 'stage4-towers.js', 'stage4-arena.js', 'stage4-view.js', 'bot-stage4.js', 'bot.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /from '\.\/input\.js'/, file);
    assert.doesNotMatch(src, /new Input\(/, file);
  }
  const h = stage4Simulation();
  try {
    assert.equal(h.s.inp, h.s.game.inp);
    assert.equal(typeof h.s.inp.press, 'function');
    assert.equal(typeof h.s.inp.take, 'function');
  } finally { h.destroy(); }
});
