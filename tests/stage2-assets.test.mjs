// Stage 2 asset structure: the new character atlases (same geometry rules as Stage 1's), at least five painted frames
// for every attack, the Stage 2 voice lines and music files present, provenance recorded, and iPad-friendly sizes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { dimensions, ROOT } from '../tools/audit-stage1.mjs';
globalThis.location = { search: '' }; globalThis.window = { devicePixelRatio: 1 };
const { ALL_CHARS, CHARS } = await import('../src/assets.js');
const { STAGE2_VOICES, STORY_SCRIPT, STORY_PANELS } = await import('../src/stage2.js');
const { MUSIC } = await import('../src/audio.js');
const bytes = path => readFileSync(resolve(ROOT, path));
const json = path => JSON.parse(bytes(path));
const inside = (r, w, h) => [r.x, r.y, r.w, r.h].every(Number.isInteger) && r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= w && r.y + r.h <= h;
const NEW = ALL_CHARS.filter(k => !CHARS.includes(k));

test('Stage 2 adds exactly the zealot, the archer and Jaret Byar', () => assert.deepEqual([...NEW].sort(), ['archer', 'byar', 'zealot']));

for (const key of NEW) {
  const meta = json(`assets/chars/${key}.anims.json`);
  test(`${key} atlas: colour and both normal maps agree; packed frames inside the atlas and canvas, no overlap`, () => {
    const sourceSize = { w: Math.round(meta.canvas[0] * meta.scale), h: Math.round(meta.canvas[1] * meta.scale) };
    for (const page of meta.pages) {
      const atlas = json(`assets/chars/${page}.json`), color = dimensions(bytes(`assets/chars/${page}.webp`));
      assert.deepEqual(color, [atlas.meta.size.w, atlas.meta.size.h], page);
      assert.ok(color[0] <= 4096 && color[1] <= 4096, `${page} fits an iPad texture`);
      const normal = dimensions(bytes(`assets/chars/${page}_n.webp`)), flipped = dimensions(bytes(`assets/chars/${page}_nl.webp`));
      assert.deepEqual(flipped, normal); assert.equal(normal[0] * color[1], normal[1] * color[0]);
      const frames = Object.entries(atlas.frames);
      for (const [name, d] of frames) {
        assert.ok(inside(d.frame, atlas.meta.size.w, atlas.meta.size.h), name); assert.deepEqual(d.sourceSize, sourceSize, name);
        assert.ok(inside(d.spriteSourceSize, d.sourceSize.w, d.sourceSize.h), name);
      }
      for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) {
        const a = frames[i][1].frame, b = frames[j][1].frame;
        assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `${frames[i][0]} overlaps ${frames[j][0]}`);
      }
      for (const a of meta.anims) for (const f of a.frames) assert.ok(atlas.frames[f] || meta.pages.length > 1, `${a.name}: ${f} packed`);
    }
  });
}

// every attack is at least five distinct painted frames (a multi-state attack counts its whole sequence)
const ATTACKS = { zealot: [['zealot_slash'], ['zealot_chargeup', 'zealot_charge', 'zealot_slam']], archer: [['archer_shoot'], ['archer_skyshot']],
  byar: [['byar_combo'], ['byar_riposte'], ['byar_volley'], ['byar_torch'], ['byar_rushup', 'byar_rush', 'byar_rushend']] };   // byar_rage (4 frames) is a roar, not a hit
for (const [key, attacks] of Object.entries(ATTACKS)) test(`${key}: every attack has at least five distinct painted frames`, () => {
  const meta = json(`assets/chars/${key}.anims.json`), byName = Object.fromEntries(meta.anims.map(a => [a.name, a]));
  for (const seq of attacks) {
    for (const n of seq) assert.ok(byName[n], `${n} exists`);
    const frames = new Set(seq.flatMap(n => byName[n].frames));
    assert.ok(frames.size >= 5, `${seq.join('+')}: ${frames.size} frames`);
  }
});

test('Stage 2 voice lines all exist, are small, and the story script only uses them', () => {
  assert.ok(STAGE2_VOICES.length >= 19);
  for (const id of STAGE2_VOICES) { const p = resolve(ROOT, `assets/audio/voice/${id}.mp3`); assert.ok(existsSync(p), id); assert.ok(statSync(p).size < 200e3, id); }
  for (const l of STORY_SCRIPT) assert.ok(STAGE2_VOICES.includes(l.id), l.id);
  const m = json('assets/audio/stage2-voice-manifest.json'); assert.ok(m.engine && m.cast);
});
test('story panels are 1280x720 JPEGs and the Byar portrait is square', () => {
  for (const p of STORY_PANELS) assert.deepEqual(dimensions(bytes(p.url)), [1280, 720], p.url);
  const d = dimensions(bytes('assets/ui/byar-portrait.webp')); assert.equal(d[0], d[1]);
});
test('music: every track file exists, stays iPad-sized, and its provenance and licence are recorded', () => {
  const prov = bytes('assets/audio/AUDIO_PROVENANCE.md').toString();
  for (const [id, M] of Object.entries(MUSIC)) {
    const size = statSync(resolve(ROOT, M.url)).size; assert.ok(size < (M.stream ? 3e6 : 1.2e6), `${id}: ${size} bytes`);
    assert.ok(prov.includes(M.url.split('/').pop()), `${id} documented`);
  }
  assert.match(prov, /licen[cs]e/i); assert.doesNotMatch(prov, /\bunknown licen/i);
});
test('Stage 2 backdrop layers fit iPad textures and lights.json is well formed', () => {
  for (const f of ['bg2-far.jpg', 'bg2-mid.webp', 'bg2-mid2.webp', 'bg2-floor.jpg', 'bg2-floor2.jpg']) {
    const d = dimensions(bytes(`assets/bg2/${f}`)); assert.ok(d[0] <= 4096 && d[1] <= 4096, f);
  }
  const L = json('assets/bg2/lights.json');
  assert.ok(L.lanterns.length >= 8 && L.lanterns.every(l => l.length === 5 && l.every(Number.isFinite)));
  assert.ok(L.barnFire.length >= 1 && L.rain && L.lightning);
});
