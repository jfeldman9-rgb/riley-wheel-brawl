import test from 'node:test';
import assert from 'node:assert/strict';
import { normalPageDir, dropAnimsOnTextures } from '../src/texture-pages.js';

// Stage 4 copies riley_hurt / riley_knockdown into riley_grabbed / riley_escape. Going 4 -> 5 swaps
// Riley's pages to the compact normals; any clip left on the destroyed page crashed the renderer
// the first time Balthamel grabbed Riley (frame.source null in TexturerImage).
function fakeScene(stage, srcUrl) {
  const tex = new Map([['riley-0', { dataSource: [{ image: { src: srcUrl } }] }], ['riley-0_nl', {}], ['grunt-0', {}]]);
  const clip = (pageKey, n) => ({ frames: Array.from({ length: n }, (_, i) => ({ textureKey: pageKey, frame: { name: 'f' + i, texture: { key: pageKey } } })) });
  const entries = { riley_hurt: clip('riley-0', 2), riley_grabbed: clip('riley-0', 2), riley_escape: clip('riley-0', 3), grunt_idle: clip('grunt-0', 2) };
  const removed = [];
  return {
    removed, entries, loadedStage: stage,
    textures: { exists: k => tex.has(k), get: k => tex.get(k), remove: k => { tex.delete(k); removed.push(k); } },
    anims: { anims: { entries }, exists: k => k in entries, get: k => (k in entries ? { destroy() { delete entries[k]; } } : undefined), remove: k => { delete entries[k]; } },
  };
}

test('4 -> 5 page swap also drops clips copied from the replaced page (riley_grabbed, riley_escape)', () => {
  const s = fakeScene(5, 'blob:assets/chars/normals/riley-0_n.webp');
  const dir = normalPageDir(s, 'riley-0', 'assets/chars', { anims: [{ name: 'riley_hurt' }] });
  assert.equal(dir, 'assets/stage5/normals');
  assert.deepEqual(s.removed, ['riley-0', 'riley-0_nl']);
  assert.equal('riley_hurt' in s.entries, false);
  assert.equal('riley_grabbed' in s.entries, false);
  assert.equal('riley_escape' in s.entries, false);
  assert.equal('grunt_idle' in s.entries, true, 'clips on other pages stay');
});

test('no swap when the normal variant already matches: clips and pages stay', () => {
  const s = fakeScene(5, 'blob:assets/stage5/normals/riley-0_n.webp');
  normalPageDir(s, 'riley-0', 'assets/chars', { anims: [{ name: 'riley_hurt' }] });
  assert.deepEqual(s.removed, []);
  assert.equal('riley_grabbed' in s.entries, true);
});

test('dropAnimsOnTextures matches by frame texture when textureKey is absent and tolerates bare managers', () => {
  const entries = { a: { frames: [{ frame: { texture: { key: 'p' } } }] }, b: { frames: [{ textureKey: 'q' }] } };
  const anims = { anims: { entries }, get: k => (k in entries ? { destroy() { delete entries[k]; } } : undefined), remove: k => delete entries[k] };
  assert.deepEqual(dropAnimsOnTextures(anims, ['p']), ['a']);
  assert.deepEqual(Object.keys(entries), ['b']);
  assert.deepEqual(dropAnimsOnTextures({ remove() {} }, ['p']), []);
});
