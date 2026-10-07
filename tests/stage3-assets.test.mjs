// Stage 3 asset and provenance tests: atlas geometry, distinct painted frames per attack,
// Riley ae700b1 hash lock, prompt existence and quoting, provenance checks, and mirror detection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { dimensions, ROOT } from '../tools/audit-stage1.mjs';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };

const bytes = path => readFileSync(resolve(ROOT, path));
const json = path => JSON.parse(bytes(path));
const sha = path => createHash('sha256').update(bytes(path)).digest('hex');
const inside = (r, w, h) =>
  [r.x, r.y, r.w, r.h].every(Number.isInteger) &&
  r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 &&
  r.x + r.w <= w && r.y + r.h <= h;

export const RILEY_AE700B1 = Object.freeze({
  'riley-0.webp': '9b7cd5b6f3e281abc06d0b2b7b02e0806c1782410f3581ecb595fb256cf81d62',
  'riley-0_n.webp': 'e9cf69aea6d656dd8befb21a18552ab24b3eb9ba1ed6fc0e06df5e045a188271',
  'riley-0_nl.webp': 'da1b466a0d3db1c4902cc043ac0f021fa63d75fe542ad46445f7e8c32fa2a814',
  'riley-0.json': '242efb27bf101c31930365111cc7101d1ee65f3e5a4c4138ef8b7150460d2bf0',
  'riley-1.webp': 'b3cb6ca80b0f4758ba8cd599f361d7ca733bb23a94bef1142898d28f105c85f0',
  'riley-1_n.webp': '03f95813adbe5c31575c14b75a2cd9d378e909ebe215e3d1921c316d2fa814f1',
  'riley-1_nl.webp': 'bec0f3ce7b33343cd19517f93925b4a597c2810de8feeef48a248a981e5abc56',
  'riley-1.json': '108a28fcff7dc0d9dff4b28b9a6cc7ae84da27888aa4b8196fd0123196a3b9e2',
  'riley.anims.json': '7ac00fcc0c9b9d9bd694f6b305c71649b30e646771de517935c4d5016f8f65d9',
});

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

// Jason approved the Grok Bot background stills on 2026-10-07 (PR #30), the character reskins of
// existing painted sheets and the three Grok Bot story panels the same day. Only these ids may use those sources,
// and each must carry its provenance block.
export const APPROVED_STILLS = Object.freeze({
  'grokbot-image': Object.freeze(['bg3-far-day', 'bg3-far-night', 'bg3-mid', 'bg3-mid2', 'bg3-floor', 'bg3-floor2', 'bg3-floor3', 'story3-1', 'story3-2', 'story3-3']),
  reskin: Object.freeze(EXPECTED_PROMPT_IDS.slice(0, EXPECTED_PROMPT_IDS.indexOf('fade-portrait') + 1)),
});

export function provenanceErrors(entry, prompt) {
  const errors = [];
  if (entry.placeholder === false) {
    const approved = APPROVED_STILLS[entry.source]?.includes(entry.id) && entry.art?.approvedBy && entry.art?.sourceSha256;
    if (!['chatgpt', 'gemini'].includes(entry.source) && !approved) {
      errors.push(`invalid source: ${entry.source}`);
    }
    if (typeof prompt?.tries !== 'number' || prompt.tries < 1) {
      errors.push(`tries must be >= 1, got ${prompt?.tries}`);
    }
    if (!entry.contactSheet || !existsSync(resolve(ROOT, entry.contactSheet))) {
      errors.push(`missing contactSheet: ${entry.contactSheet}`);
    }
  }
  return errors;
}

function isFacingFlip(flips, aName, bName) {
  if (!Array.isArray(flips)) return false;
  return flips.some(item => {
    if (Array.isArray(item)) {
      return (item[0] === aName && item[1] === bName) || (item[1] === aName && item[0] === bName);
    }
    if (typeof item === 'object' && item !== null) {
      return (item.a === aName && item.b === bName) || (item.b === aName && item.a === bName);
    }
    if (typeof item === 'string') {
      return item === `${aName}:${bName}` || item === `${bName}:${aName}` || item === aName || item === bName;
    }
    return false;
  });
}

function verifyAtlas(metaRelPath, expected) {
  const meta = json(metaRelPath);
  assert.equal(meta.dir, 'assets/stage3/chars');
  assert.deepEqual(meta.canvas, expected.canvas);
  assert.equal(meta.baseline, expected.baseline);
  assert.equal(meta.scale, expected.scale);
  assert.equal(meta.pages.length, expected.pages);

  for (const page of meta.pages) {
    const atlas = json(`${meta.dir}/${page}.json`);
    const color = dimensions(bytes(`${meta.dir}/${page}.webp`));
    assert.deepEqual(color, [atlas.meta.size.w, atlas.meta.size.h], `${page} matches atlas size`);
    assert.ok(color[0] <= 4096 && color[1] <= 4096, `${page} fits iPad texture`);

    // Shared character atlases ship half-resolution normals; normalScale records that.
    const normalDims = color.map(v => Math.round(v * (meta.normalScale ?? 1)));
    const normal = dimensions(bytes(`${meta.dir}/${page}_n.webp`));
    const normalL = dimensions(bytes(`${meta.dir}/${page}_nl.webp`));
    assert.deepEqual(normal, normalDims, `${page}_n dims match color`);
    assert.deepEqual(normalL, normalDims, `${page}_nl dims match color`);

    for (const [name, d] of Object.entries(atlas.frames)) {
      assert.ok(inside(d.frame, atlas.meta.size.w, atlas.meta.size.h), `${name} inside page`);
    }
  }
}

test('cutthroat atlas matches PLAN §4.1: canvas 900×600, baseline 570, pack scale 0.62, one page', () => {
  verifyAtlas('assets/stage3/chars/cutthroat.anims.json', {
    canvas: [900, 600],
    baseline: 570,
    scale: 0.62,
    pages: 1,
  });
});

test('riley3 atlas matches PLAN §4.1: canvas 960×640, baseline 610, pack scale 0.85, one page', () => {
  verifyAtlas('assets/stage3/chars/riley3.anims.json', {
    canvas: [960, 640],
    baseline: 610,
    scale: 0.85,
    pages: 1,
  });
});

test('fade atlas matches PLAN §4.1: canvas 1100×700, baseline 670, pack scale 0.6, two pages', () => {
  verifyAtlas('assets/stage3/chars/fade.anims.json', {
    canvas: [1100, 700],
    baseline: 670,
    scale: 0.6,
    pages: 2,
  });
});

test('cutthroat: every attack has at least five distinct painted frames (hold and grabthrow count as one)', () => {
  const meta = json('assets/stage3/chars/cutthroat.anims.json');
  const animsByName = Object.fromEntries(meta.anims.map(a => [a.name, a]));
  const frameHashes = json('docs/stage3/frame-hashes.json');
  const hashMap = Object.fromEntries(frameHashes.frames.map(f => [f.name, f.hash]));

  const attacks = [
    { name: 'slash', seq: ['cutthroat_slash'], min: 5 },
    { name: 'lunge', seq: ['cutthroat_lunge'], min: 5 },
    { name: 'hold+grabthrow', seq: ['cutthroat_hold', 'cutthroat_grabthrow'], min: 6 },
  ];

  for (const { name, seq, min } of attacks) {
    for (const anim of seq) {
      assert.ok(animsByName[anim], `${anim} exists in cutthroat anims`);
    }
    const frames = seq.flatMap(anim => animsByName[anim].frames);
    const hashes = frames.map(f => {
      assert.ok(hashMap[f], `frame ${f} has hash`);
      return hashMap[f];
    });
    const distinct = new Set(hashes);
    assert.ok(distinct.size >= 5, `${name} has ${distinct.size} distinct painted frames (expected >= 5)`);
    assert.ok(distinct.size >= min, `${name} has ${distinct.size} distinct frames (expected >= ${min})`);
  }
});

test('fade: every attack has at least five distinct painted frames', () => {
  const meta = json('assets/stage3/chars/fade.anims.json');
  const animsByName = Object.fromEntries(meta.anims.map(a => [a.name, a]));
  const frameHashes = json('docs/stage3/frame-hashes.json');
  const hashMap = Object.fromEntries(frameHashes.frames.map(f => [f.name, f.hash]));

  const attacks = [
    { name: 'slash', seq: ['fade_slash'], min: 6 },
    { name: 'lunge', seq: ['fade_lunge'], min: 5 },
    { name: 'blinkout+blinkin', seq: ['fade_blinkout', 'fade_blinkin'], min: 8 },
    { name: 'fear', seq: ['fade_fear'], min: 5 },
    { name: 'split', seq: ['fade_split'], min: 5 },
  ];

  for (const { name, seq, min } of attacks) {
    for (const anim of seq) {
      assert.ok(animsByName[anim], `${anim} exists in fade anims`);
    }
    const frames = seq.flatMap(anim => animsByName[anim].frames);
    const hashes = frames.map(f => {
      assert.ok(hashMap[f], `frame ${f} has hash`);
      return hashMap[f];
    });
    const distinct = new Set(hashes);
    assert.ok(distinct.size >= 5, `${name} has ${distinct.size} distinct painted frames (expected >= 5)`);
    assert.ok(distinct.size >= min, `${name} has ${distinct.size} distinct frames (expected >= ${min})`);
  }
});

test('riley3 has riley_grabbed (4) and riley_escape (4), and Riley\'s own atlas is byte-identical to ae700b1', () => {
  const meta = json('assets/stage3/chars/riley3.anims.json');
  const animsByName = Object.fromEntries(meta.anims.map(a => [a.name, a]));

  assert.ok(animsByName.riley_grabbed, 'riley_grabbed exists in riley3.anims.json');
  assert.equal(animsByName.riley_grabbed.frames.length, 4, 'riley_grabbed has 4 frames');

  assert.ok(animsByName.riley_escape, 'riley_escape exists in riley3.anims.json');
  assert.equal(animsByName.riley_escape.frames.length, 4, 'riley_escape has 4 frames');

  for (const [file, expectedSha] of Object.entries(RILEY_AE700B1)) {
    const filePath = `assets/chars/${file}`;
    assert.ok(existsSync(resolve(ROOT, filePath)), `${filePath} exists`);
    assert.equal(sha(filePath), expectedSha, `${filePath} matches ae700b1 sha256`);
  }
});

test('every ART_STATUS entry names an existing prompt file with a tool, a tries count and its PLAN §4.2 prompt', () => {
  const S = json('assets/stage3/ART_STATUS.json');
  const planText = bytes('docs/stage3/PLAN.md').toString('utf8');

  const entryIds = S.entries.map(e => e.id);
  assert.deepEqual(entryIds, EXPECTED_PROMPT_IDS, 'ART_STATUS entry ids deep-equal PLAN §4.1 prompt ids');

  for (const e of S.entries) {
    assert.ok(existsSync(resolve(ROOT, e.prompt)), `${e.prompt} exists`);
    const p = json(e.prompt);
    assert.ok(p.tool, `${e.id} prompt has tool`);
    assert.equal(typeof p.tries, 'number', `${e.id} prompt has tries count`);
    assert.ok(Array.isArray(p.prompts) && typeof p.prompts[0] === 'string', `${e.id} prompt has prompts[0] string`);
    const snippet = p.prompts[0].slice(0, 120);
    assert.ok(planText.includes(snippet), `PLAN.md includes prompt snippet for ${e.id}`);
  }
});

test('every real (non-placeholder) art entry records its source, tries and contact sheet', (t) => {
  const S = json('assets/stage3/ART_STATUS.json');
  const realEntries = S.entries.filter(e => !e.placeholder);
  t.diagnostic(`real entries: ${realEntries.length}`);
  const approved = Object.values(APPROVED_STILLS).flat();
  assert.deepEqual(realEntries.map(e => e.id), EXPECTED_PROMPT_IDS.filter(id => approved.includes(id)), 'the approved plates, story panels and character reskins are the only real entries');

  for (const e of realEntries) {
    const p = json(e.prompt);
    assert.deepEqual(provenanceErrors(e, p), []);
  }

  const existingPath = 'assets/stage3/ART_STATUS.json';
  const fakeGrok = { placeholder: false, source: 'grok', contactSheet: existingPath };
  const fakeTries0 = { placeholder: false, source: 'chatgpt', contactSheet: existingPath };
  const fakeMissingContact = { placeholder: false, source: 'gemini', contactSheet: 'assets/nonexistent-contact.jpg' };
  const fakeGood = { placeholder: false, source: 'chatgpt', contactSheet: existingPath };

  const err1 = provenanceErrors(fakeGrok, { tries: 1 });
  assert.ok(err1.length > 0, 'fake with grok source should produce error');
  assert.ok(err1.some(msg => msg.includes('source')));

  const err2 = provenanceErrors(fakeTries0, { tries: 0 });
  assert.ok(err2.length > 0, 'fake with tries: 0 should produce error');
  assert.ok(err2.some(msg => msg.includes('tries')));

  const err3 = provenanceErrors(fakeMissingContact, { tries: 2 });
  assert.ok(err3.length > 0, 'fake with missing contactSheet should produce error');
  assert.ok(err3.some(msg => msg.includes('contactSheet')));

  const fakeUnlisted = { id: 'fade-a', placeholder: false, source: 'grokbot-image', contactSheet: existingPath, art: { approvedBy: 'x', sourceSha256: 'x' } };
  assert.ok(provenanceErrors(fakeUnlisted, { tries: 1 }).some(msg => msg.includes('source')), 'grokbot-image is limited to the approved plates and panels');

  const err4 = provenanceErrors(fakeGood, { tries: 1 });
  assert.deepEqual(err4, [], 'fake good entry produces no errors');
});

test('no Stage 3 frame is a horizontal mirror of another frame unless listed in facingFlips', () => {
  const H = json('docs/stage3/frame-hashes.json');
  const S = json('assets/stage3/ART_STATUS.json');

  for (const [pagePath, expectedSha] of Object.entries(H.pages)) {
    assert.ok(existsSync(resolve(ROOT, pagePath)), `${pagePath} exists`);
    assert.equal(sha(pagePath), expectedSha, `${pagePath} sha256 is fresh`);
  }

  for (const charKey of ['cutthroat', 'fade', 'riley3']) {
    const meta = json(`assets/stage3/chars/${charKey}.anims.json`);
    for (const page of meta.pages) {
      const pagePath = `${meta.dir}/${page}.webp`;
      assert.ok(pagePath in H.pages, `Stage 3 page ${pagePath} is listed in frame-hashes.json`);
    }
  }

  const facingFlips = S.facingFlips || [];
  const stage3Frames = H.frames.filter(f => f.stage === 3);

  for (const a of stage3Frames) {
    for (const b of H.frames) {
      if (a.page === b.page && a.name === b.name) continue;
      if (a.hash === b.hash) continue;

      if (a.flip === b.hash) {
        assert.ok(
          isFacingFlip(facingFlips, a.name, b.name),
          `Frame ${a.name} (${a.page}) is a horizontal mirror of ${b.name} (${b.page}), not in facingFlips`
        );
      }
    }
  }
});
