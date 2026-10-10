// Stage 5 groundwork for the painted Forsaken: scale rule, tether palm, story release, recoil frame, lean texture list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
await import('./helpers/stage5-harness.mjs'); // browser globals for src/config.js

const { scaleFor, freeStory5, PAINTED } = await import('../src/stage5-art.js');
const { baltFrame, aginFrame } = await import('../src/stage5-art-cast.js');
const { tetherLine } = await import('../src/stage5-hud.js');
const { STAGE5_TEXTURES } = await import('../src/stage5-def.js');
const { BG5FAR_SIZE } = await import('../src/stage5-art-bg.js');

test('a painted cell taller than the painter is scaled to the painter footprint (Stage 4 rule)', () => {
  assert.equal(scaleFor({ height: 180 }, 2, 180), 2, 'procedural Aginor cell keeps 2.0');
  assert.equal(scaleFor({ height: 360, realHeight: 360 }, 2, 180), 1, 'a 360 px painted cell draws at 1.0');
  assert.equal(scaleFor({ height: 211, realHeight: 340 }, 2.35, 170), 2.35 * 170 / 340, 'trimmed frames use the untrimmed cell');
  assert.equal(scaleFor({ height: 170 }, 2.35, 170), 2.35);
  assert.equal(scaleFor(undefined, 1.15), 1.15);
  for (const row of PAINTED.filter(r => r.atlas)) assert.ok(row.baseH > 0, row.key);
});

test('the tether line starts at the painted palm when the frame carries one, else 90 px up as before', () => {
  const riley = { x: 900, y: 640 };
  const boss = { x: 500, y: 640, z: 0, facing: 1, state: 'tether', locked: true, sprite: { scaleX: 1, frame: { customData: {} } } };
  const s = { stageNo: 5, boss, riley };
  assert.deepEqual(tetherLine(s), { x0: 500, y0: 550, x1: 900, y1: 590, locked: true });
  boss.sprite.frame.customData.palm = [96, 215];
  assert.deepEqual(tetherLine(s), { x0: 596, y0: 425, x1: 900, y1: 590, locked: true });
  boss.facing = -1; boss.sprite.scaleX = -2;
  const l = tetherLine(s);
  assert.equal(l.x0, 500 - 192); assert.equal(l.y0, 640 - 430);
  boss.state = 'idle';
  assert.equal(tetherLine(s), null);
});

test('story panels are freed after the story, never while the cutscene still shows them', () => {
  const keys = new Set(['story5p1', 'story5p2', 'story5p3', 'bg5far']);
  const scene = { cutscene: {}, textures: { exists: k => keys.has(k), remove: k => keys.delete(k) } };
  assert.equal(freeStory5(scene), 0);
  scene.cutscene = null;
  assert.equal(freeStory5(scene), 3);
  assert.deepEqual([...keys], ['bg5far']);
  assert.equal(freeStory5(scene), 0);
  assert.equal(freeStory5({ textures: { exists: () => true } }), 0, 'a stub without remove is left alone');
  const src = readFileSync('src/stage5.js', 'utf8');
  assert.match(src, /startCutscene\(STORY5_SCRIPT, STORY5_PANELS, \(\) => \{[^}]*freeStory5\(scene\)/, 'freed in the story end callback');
  assert.match(src, /story === false\) \{[^}]*freeStory5\(scene\)/, 'freed at once when the story is skipped');
});

test('Balthamel flinches standing (frame 8); only down lies flat; the painter has 9 frames', () => {
  assert.equal(baltFrame('hurt'), 8); assert.equal(baltFrame('shoved'), 8);
  assert.equal(baltFrame('down'), 6); assert.equal(baltFrame('vines'), 7); assert.equal(baltFrame('dead'), 7);
  assert.deepEqual(['drop', 'idle', 'attack', 'step', 'lunge', 'holding'].map(baltFrame), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(['idle', 'hurt', 'attack', 'tether', 'step', 'staggered', 'burn', 'dead'].map(aginFrame), [0, 1, 2, 3, 4, 5, 6, 6]);
  assert.match(readFileSync('src/stage5-art-cast.js', 'utf8'), /sheet\(scene, 's5balt', 9, 110, 170,/);
});

test('only sampled Stage 5 textures are made; bg5far is the half-size gradient', () => {
  const dead = ['s5lash', 's5thorn', 's5seep', 's5gout', 's5spore', 's5ring', 's5tether', 's5hand', 's5oak', 's5ash', 's5tree'];
  const src = readdirSync('src').filter(f => f.endsWith('.js')).map(f => readFileSync(`src/${f}`, 'utf8')).join('\n');
  for (const k of dead) {
    assert.ok(!STAGE5_TEXTURES.includes(k), k);
    assert.ok(!src.includes(`'${k}'`), `${k} is not made or sampled anywhere`);
  }
  assert.deepEqual(BG5FAR_SIZE, [640, 210]);
  assert.ok(!/painted5|painted\.json/.test(readFileSync('src/stage5.js', 'utf8')), 'no racing JSON manifest');
});
