// Stage 3 placeholder verification: manifest coverage, exact asset dimensions,
// atlas structure and packing, prompt quoting, isolation from Stage 1 audit,
// deterministic sha256 hashes, and flat normal map lossless encoding.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { dimensions, ROOT } from '../tools/audit-stage1.mjs';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
const { STAGES, STAGE_CHARS, STAGE_TEXTURES, SHARED_TEXTURES } = await import('../src/stages.js');

const bytes = path => readFileSync(resolve(ROOT, path));
const json = path => JSON.parse(bytes(path));
const inside = (r, w, h) =>
  [r.x, r.y, r.w, r.h].every(Number.isInteger) &&
  r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 &&
  r.x + r.w <= w && r.y + r.h <= h;

const M = json('tools/stage3/art-manifest.json');
const S = json('assets/stage3/ART_STATUS.json');
const sha = p => createHash('sha256').update(bytes(p)).digest('hex');

const EXPECTED_PROMPT_IDS = [
  'cutthroat-master',
  'cutthroat-a',
  'cutthroat-b',
  'cutthroat-c',
  'cutthroat-d',
  'cutthroat-e',
  'riley-s3a',
  'fade-master',
  'fade-a',
  'fade-b',
  'fade-c',
  'fade-d',
  'fade-e',
  'fade-f',
  'fade-g',
  'fade-portrait',
  'bg3-far-day',
  'bg3-far-night',
  'bg3-mid',
  'bg3-mid2',
  'bg3-floor',
  'bg3-floor2',
  'bg3-floor3',
  'prop-rooftiles',
  'fx-shadowpool',
  'fx-shadowburst',
  'fx-fade-far',
  'story3-1',
  'story3-2',
  'story3-3',
];

test('Stage 3 art manifest covers the ART LIST exactly', () => {
  assert.deepEqual(Object.keys(M.prompts).sort(), [...EXPECTED_PROMPT_IDS].sort());

  let totalFrames = 0;
  const charTotals = {};

  for (const c of M.chars) {
    let charCount = 0;
    for (const sheet of c.sheets) {
      const sheetFrames = sheet.anims.reduce((sum, [, holds]) => sum + holds.length, 0);
      assert.equal(sheetFrames, 8, `${sheet.id} has exactly 8 frames`);
      for (const [anim, holds] of sheet.anims) {
        assert.ok(holds.length > 0, `${sheet.id} anim ${anim} has positive frame count`);
        for (const hold of holds) {
          assert.ok(Number.isInteger(hold), `hold ${hold} in ${sheet.id} ${anim} is integer`);
          assert.ok(hold >= 90, `hold ${hold} in ${sheet.id} ${anim} is >= 90 ms`);
        }
      }
      charCount += sheetFrames;
    }
    charTotals[c.key] = charCount;
    totalFrames += charCount;
  }

  assert.equal(charTotals.cutthroat, 40, 'cutthroat has 40 frames');
  assert.equal(charTotals.fade, 56, 'fade has 56 frames');
  assert.equal(charTotals.riley3, 8, 'riley3 has 8 frames');
  assert.equal(totalFrames, 104, 'character frames total 104');
});

test('every Stage 3 image exists at its exact size', () => {
  for (const img of M.images) {
    const dims = dimensions(bytes(img.file));
    assert.deepEqual(dims, img.size, `${img.file} dimensions match`);

    if (img.normal) {
      const normDims = dimensions(bytes(img.normal));
      assert.deepEqual(normDims, img.size, `${img.normal} dimensions match`);
    }

    if (img.kind === 'strip') {
      assert.equal(img.size[0], img.frames * 256, `${img.id} width equals frames * 256`);
      assert.equal(img.size[1], 256, `${img.id} height equals 256`);
    }
  }
});

for (const char of M.chars) {
  test(`${char.key} atlas: pages, normals and frames are well formed`, () => {
    const meta = json(`${char.dir}/${char.key}.anims.json`);
    assert.equal(meta.dir, 'assets/stage3/chars');
    assert.deepEqual(meta.canvas, char.canvas);
    assert.equal(meta.baseline, char.baseline);
    assert.equal(meta.scale, char.scale);

    const sourceSize = {
      w: Math.round(meta.canvas[0] * meta.scale),
      h: Math.round(meta.canvas[1] * meta.scale),
    };

    for (const page of meta.pages) {
      const atlas = json(`${char.dir}/${page}.json`);
      const color = dimensions(bytes(`${char.dir}/${page}.webp`));
      assert.deepEqual(color, [atlas.meta.size.w, atlas.meta.size.h], `${page} size matches atlas meta`);
      assert.ok(color[0] <= 4096 && color[1] <= 4096, `${page} dimensions fit iPad texture`);

      const normal = dimensions(bytes(`${char.dir}/${page}_n.webp`));
      const normalL = dimensions(bytes(`${char.dir}/${page}_nl.webp`));
      assert.deepEqual(normal, color, `${page}_n dims match color page`);
      assert.deepEqual(normalL, color, `${page}_nl dims match color page`);

      const frames = Object.entries(atlas.frames);
      for (const [name, d] of frames) {
        assert.ok(inside(d.frame, atlas.meta.size.w, atlas.meta.size.h), `${name} inside page`);
        assert.deepEqual(d.sourceSize, sourceSize, `${name} sourceSize matches round(canvas * scale)`);
        assert.ok(inside(d.spriteSourceSize, d.sourceSize.w, d.sourceSize.h), `${name} spriteSourceSize inside sourceSize`);
      }

      for (let i = 0; i < frames.length; i++) {
        for (let j = i + 1; j < frames.length; j++) {
          const a = frames[i][1].frame;
          const b = frames[j][1].frame;
          const overlaps = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          assert.ok(!overlaps, `${frames[i][0]} overlaps ${frames[j][0]} on page ${page}`);
        }
      }
    }

    const animsByName = Object.fromEntries(meta.anims.map(a => [a.name, a]));

    for (const a of meta.anims) {
      assert.equal(a.frames.length, a.holds.length, `${a.name} frames.length === holds.length`);
      assert.equal(a.holds.length, a.pages.length, `${a.name} holds.length === pages.length`);
      for (let i = 0; i < a.frames.length; i++) {
        const frameName = a.frames[i];
        const pageIdx = a.pages[i];
        const pageName = meta.pages[pageIdx];
        const atlas = json(`${char.dir}/${pageName}.json`);
        assert.ok(atlas.frames[frameName], `${frameName} packed on page ${pageName}`);
      }
    }

    const manifestAnims = char.sheets.flatMap(s => s.anims);
    assert.equal(meta.anims.length, manifestAnims.length, `${char.key} anim count matches manifest`);

    for (const [animName, holds, loop] of manifestAnims) {
      const fullAnimName = `${char.prefix}${animName}`;
      const a = animsByName[fullAnimName];
      assert.ok(a, `${fullAnimName} exists in anims.json`);
      assert.equal(a.frames.length, holds.length, `${fullAnimName} frame count`);
      assert.deepEqual(a.holds, holds, `${fullAnimName} holds`);
      assert.equal(a.loop, loop, `${fullAnimName} loop flag`);
    }
  });
}

test('placeholder flags agree between anims.json and ART_STATUS', () => {
  for (const char of M.chars) {
    const anims = json(`${char.dir}/${char.key}.anims.json`);
    const expected = S.entries.filter(e => e.char === char.key).some(e => e.placeholder);
    assert.equal(anims.placeholder, expected, `${char.key} anims.placeholder agrees with ART_STATUS`);
  }

  const entryIds = S.entries.map(e => e.id).sort();
  assert.deepEqual(entryIds, Object.keys(M.prompts).sort(), 'entry ids equal manifest prompt ids');
  assert.ok(Array.isArray(S.facingFlips), 'facingFlips is an array');
});

test('every prompt file exists, is untried, and quotes PLAN §4.2', () => {
  const planText = bytes('docs/stage3/PLAN.md').toString('utf8');

  for (const e of S.entries) {
    assert.ok(existsSync(resolve(ROOT, e.prompt)), `${e.prompt} exists`);
    const p = json(e.prompt);
    assert.ok(p.tool, `${e.id} prompt has tool`);
    assert.equal(typeof p.tries, 'number', `${e.id} prompt has tries`);
    assert.ok(Array.isArray(p.prompts) && typeof p.prompts[0] === 'string', `${e.id} prompt has prompts[0] string`);

    if (e.placeholder) {
      assert.equal(p.tries, 0, `${e.id} tries === 0 when placeholder`);
    }

    const snippet = p.prompts[0].slice(0, 120);
    assert.ok(planText.includes(snippet), `PLAN.md includes first 120 chars for ${e.id}`);

    for (const f of e.files) {
      assert.ok(existsSync(resolve(ROOT, f)), `${f} exists for entry ${e.id}`);
    }
  }
});

test('Stage 3 art stays out of boot and the Stage 1 audit, and matches the T1 registry', () => {
  const auditedDirRegex = /^assets\/(chars|bg|props|ui|powers)\//;

  const allPaths = [
    ...M.chars.map(c => c.dir),
    ...M.images.flatMap(img => [img.file, img.normal].filter(Boolean)),
    ...S.entries.flatMap(e => e.files),
    ...M.chars.map(c => json(`${c.dir}/${c.key}.anims.json`).dir),
  ];

  for (const p of allPaths) {
    assert.ok(!auditedDirRegex.test(p), `${p} stays out of audited directories`);
  }

  assert.ok(STAGE_CHARS[3].includes('riley3'), 'STAGE_CHARS[3] has riley3');
  assert.ok(STAGE_CHARS[3].includes('cutthroat'), 'STAGE_CHARS[3] has cutthroat');
  assert.ok(STAGE_CHARS[3].includes('fade'), 'STAGE_CHARS[3] has fade');

  for (const k of ['riley3', 'cutthroat', 'fade']) {
    assert.ok(existsSync(resolve(ROOT, `assets/stage3/chars/${k}.anims.json`)), `${k}.anims.json exists`);
  }

  const nonPortraitKeys = M.images.filter(img => img.kind !== 'portrait').map(img => img.key);
  const combinedKeys = [...nonPortraitKeys, ...SHARED_TEXTURES].sort();
  assert.deepEqual(combinedKeys, [...STAGE_TEXTURES[3]].sort(), 'image keys plus SHARED_TEXTURES match STAGE_TEXTURES[3]');

  const portrait = M.images.find(img => img.kind === 'portrait');
  assert.ok(portrait, 'portrait exists in manifest images');
  assert.equal(portrait.key, STAGES[3].boss.portrait, 'portrait key matches STAGES[3].boss.portrait');
});

test('committed placeholder files match their recorded sha256', () => {
  for (const e of S.entries) {
    assert.deepEqual(Object.keys(e.sha256).sort(), [...e.files].sort(), `${e.id} sha256 keys match files[]`);
    if (e.placeholder) {
      for (const f of e.files) {
        assert.equal(sha(f), e.sha256[f], `sha256 for ${f} in ${e.id} matches committed bytes`);
      }
    }
  }
});

test('placeholder normal maps are flat lossless cards', () => {
  for (const e of S.entries) {
    if (e.placeholder) {
      for (const f of e.files) {
        if (f.endsWith('_n.webp') || f.endsWith('_nl.webp')) {
          const buf = bytes(f);
          assert.equal(buf.subarray(0, 4).toString('latin1'), 'RIFF', `${f} starts with RIFF`);
          assert.equal(buf.subarray(8, 12).toString('latin1'), 'WEBP', `${f} WEBP tag`);
          assert.equal(buf.subarray(12, 16).toString('latin1'), 'VP8L', `${f} VP8L lossless tag`);
          assert.ok(buf.length < 16384, `${f} size (${buf.length} bytes) is < 16 KB`);
        }
      }
    }
  }

  for (const char of M.chars) {
    const meta = json(`${char.dir}/${char.key}.anims.json`);
    for (const page of meta.pages) {
      const pn = `${char.dir}/${page}_n.webp`;
      const pnl = `${char.dir}/${page}_nl.webp`;
      assert.deepEqual(dimensions(bytes(pn)), dimensions(bytes(pnl)), `${page} _n and _nl have equal dimensions`);
      assert.notEqual(sha(pn), sha(pnl), `${page} _n and _nl have different sha256`);
    }
  }
});
