import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

test('controls, HUD, touch layout, pinned Phaser and entrypoint are byte-identical to HEAD', () => {
  assert.equal(execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', 'src/input.js', 'src/hud.js', 'lib', 'index.html'], { encoding: 'utf8' }), '');
});
test('existing tests and helpers have no working-tree edits', () => {
  assert.equal(execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', 'tests'], { encoding: 'utf8' }), '');
});
test('all shipped source avoids Safari 15 unsupported APIs and syntax', () => {
  const forbidden = /\.(?:at|findLast|findLastIndex|toSorted|toReversed|toSpliced|with)\s*\(|\bstructuredClone\s*\(|\bObject\.hasOwn\s*\(|\bstatic\s*\{|\(\?<([=!])/;
  for (const f of readdirSync('src').filter(f => f.endsWith('.js'))) {
    const src = readFileSync('src/' + f, 'utf8');
    assert.ok(!forbidden.test(src), f);
    if (src.includes('requestVideoFrameCallback')) assert.match(src, /(?:typeof|if).*requestVideoFrameCallback/, f);
    if (/^(stage6|rand-call|belal|grayman|fadelt)/.test(f)) assert.ok(!/placeholder/i.test(src), f);
  }
});
