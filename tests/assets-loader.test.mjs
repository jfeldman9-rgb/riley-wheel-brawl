import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARS, queueCharPages } from '../src/assets.js';

const metas = new Map(CHARS.map(key => [key + '.A', JSON.parse(readFileSync(new URL(`../assets/chars/${key}.anims.json`, import.meta.url)))]));
const pages = [...metas.values()].flatMap(meta => meta.pages);
function scene(cached = [], metadata = metas) {
  const keys = new Set(cached), atlases = [], images = [];
  return { atlases, images,
    cache: { json: { get: key => metadata.get(key) } },
    textures: { exists: key => keys.has(key) },
    load: { atlas: config => atlases.push(config), image: (...args) => images.push(args) } };
}

test('cold load queues every shipped atlas and both normal-map directions unchanged', () => {
  const s = scene(); queueCharPages(s);
  assert.deepEqual(s.atlases, pages.map(key => ({ key, textureURL: `assets/chars/${key}.webp`, normalMap: `assets/chars/${key}_n.webp`, atlasURL: `assets/chars/${key}.json` })));
  assert.deepEqual(s.images, pages.map(key => [key + '_nl', `assets/chars/${key}_nl.webp`]));
});

test('repeated scene restarts queue no cached atlas JSON or mirrored-normal images', () => {
  const s = scene(pages.flatMap(key => [key, key + '_nl']));
  for (let restart = 0; restart < 20; restart++) queueCharPages(s);
  assert.deepEqual(s.atlases, []); assert.deepEqual(s.images, []);
});

test('cached color atlases do not suppress missing mirrored-normal images', () => {
  const s = scene(pages); queueCharPages(s);
  assert.deepEqual(s.atlases, []);
  assert.deepEqual(s.images, pages.map(key => [key + '_nl', `assets/chars/${key}_nl.webp`]));
});

test('cached mirrored-normal images do not suppress missing color/normal atlases', () => {
  const s = scene(pages.map(key => key + '_nl')); queueCharPages(s);
  assert.deepEqual(s.atlases.map(config => config.key), pages);
  assert.deepEqual(s.images, []);
});

test('cache guards apply independently to each page and missing metadata remains harmless', () => {
  const s = scene(['riley-0', 'riley-1_nl'], new Map([['riley.A', { pages: ['riley-0', 'riley-1'] }]]));
  queueCharPages(s);
  assert.deepEqual(s.atlases.map(config => config.key), ['riley-1']);
  assert.deepEqual(s.images, [['riley-0_nl', 'assets/chars/riley-0_nl.webp']]);
});
