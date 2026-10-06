import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {}, BlendModes: { ADD: 1 } };
globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };

const { STAGES, stageEnabled, maxStage, stageFromQuery, resolveStage, STAGE_CHARS, STAGE_TEXTURES } = await import('../src/stages.js');
const { Stage1 } = await import('../src/stage1.js');

// Frozen literal snapshots from ae700b1 baseline
const SNAPSHOT_1 = {
  zones: [
    { at: 260, l: 0, r: 1280, intro: 'trolloc_intro_01', waves: [[['grunt', 'R', 0], ['grunt', 'R', 1.4]], [['grunt', 'L', 0], ['spear', 'R', 0.6]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['spear', 'R', 0], ['grunt', 'R', 0.7]], [['hound', 'L', 0], ['grunt', 'R', 0.4], ['grunt', 'R', 2.0]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['hound', 'R', 0], ['hound', 'L', 0.5]], [['spear', 'R', 0], ['grunt', 'L', 0.6], ['hound', 'R', 1.6]]] },
    { at: 4140, l: 3920, r: 5200, boss: true },
  ],
  drops: [
    { zone: 0, wave: 0, kind: 'angreal', delay: 1.2 },
    { zone: 0, wave: 1, kind: 'fireshield', delay: 1.0 },
    { zone: 1, wave: 0, kind: 'lightning', delay: 1.0 },
    { zone: 1, wave: 1, kind: 'twix', delay: 1.4 },
    { zone: 2, wave: 0, kind: 'airwhip', delay: 1.0 },
    { zone: 2, wave: 1, kind: 'ter?', delay: 1.0 },
  ],
  bossDrop: { phase: 2, kind: 'saangreal' },
  crates: [[880, 600], [2140, 650], [3330, 610], [4600, 596]],
  skipBoss: { zoneI: 2, x: 3990, camX: 3500 },
  chars: ['riley', 'grunt', 'spear', 'hound', 'chief', 'loial'],
  textures: ['far', 'mid0', 'mid1', 'floor', 'floor2', 'cart', 'barrel', 'staves'],
};

const SNAPSHOT_2 = {
  zones: [
    { at: 260, l: 0, r: 1280, intro: 'zealot_intro_01', waves: [[['zealot', 'R', 0], ['zealot', 'R', 1.6]], [['archer', 'R', 0], ['zealot', 'L', 0.8]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['zealot', 'R', 0], ['archer', 'R', 0.6]], [['zealot', 'L', 0], ['archer', 'R', 0.5], ['zealot', 'R', 2.0]]] },
    { at: 2800, l: 2560, r: 3840, stable: true, intro: 'riley_st2_stable_01', waves: [[['hound', 'R', 0], ['hound', 'L', 0.6]], [['zealot', 'R', 0], ['archer', 'L', 0.6], ['hound', 'R', 1.6]]] },
    { at: 4140, l: 3920, r: 5200, boss: true },
  ],
  drops: [
    { zone: 0, wave: 0, kind: 'angreal', delay: 1.2 },
    { zone: 0, wave: 1, kind: 'airwhip', delay: 1.0 },
    { zone: 1, wave: 0, kind: 'lightning', delay: 1.0 },
    { zone: 1, wave: 1, kind: 'fireshield', delay: 1.4 },
    { zone: 2, wave: 0, kind: 'ter?', delay: 1.0 },
    { zone: 2, wave: 1, kind: 'angreal', delay: 1.0 },
  ],
  bossDrop: { phase: 2, kind: 'saangreal' },
  crates: [[880, 600], [2140, 650], [3330, 610], [4600, 596]],
  skipBoss: { zoneI: 2, x: 3990, camX: 3500 },
  chars: ['riley', 'zealot', 'archer', 'hound', 'byar', 'loial'],
  textures: ['far2', 'mid2a', 'mid2b', 'floor2a', 'floor2b', 'crate', 'planks', 'beam2', 'arrow', 'torch', 'ribbon', 'barnburn2', 'barnflame_roof', 'barnflame_eave', 'barnflame_door', 'story_panel_1', 'story_panel_2', 'story_panel_3'],
};

test('STAGES[1] and STAGES[2] zones, drops, bossDrop, crates, skipBoss, chars and textures deep-equal frozen literal snapshots', () => {
  for (const [snap, stage] of [[SNAPSHOT_1, STAGES[1]], [SNAPSHOT_2, STAGES[2]]]) {
    assert.deepEqual(stage.zones, snap.zones);
    assert.deepEqual(stage.drops, snap.drops);
    assert.deepEqual(stage.bossDrop, snap.bossDrop);
    assert.deepEqual(stage.crates, snap.crates);
    assert.deepEqual(stage.skipBoss, snap.skipBoss);
    assert.deepEqual(stage.chars, snap.chars);
    assert.deepEqual(stage.textures, snap.textures);
  }
});

test('stageFromQuery: stage=3 -> 1, stage=3&s3=1 -> 3, stage=4&s3=1 -> 1, stage=2&s3=1 -> 2', () => {
  const Q = s => new URLSearchParams(s);
  assert.equal(stageFromQuery(Q('stage=3')), 1);
  assert.equal(stageFromQuery(Q('stage=3&s3=1')), 3);
  assert.equal(stageFromQuery(Q('stage=4&s3=1')), 1);
  assert.equal(stageFromQuery(Q('stage=2&s3=1')), 2);
});

test('resolveStage({stage:3}, Q("")) -> 1, and resolveStage({stage:3}, Q("s3=1")) -> 3', () => {
  const Q = s => new URLSearchParams(s);
  assert.equal(resolveStage({ stage: 3 }, Q('')), 1);
  assert.equal(resolveStage({ stage: 3 }, Q('s3=1')), 3);
});

test('maxStage(Q("")) -> 2, and maxStage(Q("s3=1")) -> 3', () => {
  const Q = s => new URLSearchParams(s);
  assert.equal(maxStage(Q('')), 2);
  assert.equal(maxStage(Q('s3=1')), 3);
});

test('releasing: loading 3 after 2 releases only non-shared keys, loading 1 after 3 releases every Stage 3 key', () => {
  const meta = k => {
    try {
      return JSON.parse(readFileSync(new URL(`../assets/chars/${k}.anims.json`, import.meta.url)));
    } catch {
      return { pages: [`${k}-0`], anims: [] };
    }
  };
  const createMockScene = (textures, chars) => {
    const residentTex = new Set(textures);
    const removedTex = [];
    const residentPages = new Set(chars.flatMap(k => {
      const m = meta(k);
      return m ? m.pages.flatMap(pg => [pg, pg + '_nl']) : [];
    }));
    for (const p of residentPages) residentTex.add(p);

    return {
      textures: {
        exists: k => residentTex.has(k),
        remove: k => { residentTex.delete(k); removedTex.push(k); },
      },
      anims: {
        exists: () => false,
        remove: () => {},
      },
      cache: {
        json: {
          get: k => {
            const m = k.match(/^(.+)\.A$/);
            return m ? meta(m[1]) : undefined;
          },
        },
      },
      releaseStage: Stage1.prototype.releaseStage,
      residentTex,
      removedTex,
      residentPages,
    };
  };

  // Case A: Resident has Stage 2 textures and chars, loading Stage 3
  const sceneA = createMockScene(STAGE_TEXTURES[2], STAGE_CHARS[2]);
  sceneA.releaseStage(3, 2);

  // crate and planks stay resident
  assert.ok(sceneA.residentTex.has('crate'), 'crate stays');
  assert.ok(sceneA.residentTex.has('planks'), 'planks stay');

  // non-shared Stage 2 textures are removed
  const nonSharedStage2Tex = STAGE_TEXTURES[2].filter(t => t !== 'crate' && t !== 'planks');
  for (const k of nonSharedStage2Tex) {
    assert.ok(sceneA.removedTex.includes(k), `non-shared texture removed: ${k}`);
  }

  // byar is released (only character in Stage 2 not in Stage 3)
  assert.ok(sceneA.removedTex.some(k => k.startsWith('byar-')), 'byar pages released');
  // shared characters stay: riley, zealot, archer, hound, loial
  for (const k of ['riley', 'zealot', 'archer', 'hound', 'loial']) {
    assert.ok(!sceneA.removedTex.some(t => t.startsWith(k + '-')), `${k} stays resident`);
  }

  // Case B: Resident has Stage 3 textures and chars, loading Stage 1
  const sceneB = createMockScene(STAGE_TEXTURES[3], ['riley', 'hound', 'loial']);
  sceneB.releaseStage(1, 3);

  // every Stage 3 texture is removed
  for (const k of STAGE_TEXTURES[3]) {
    assert.ok(sceneB.removedTex.includes(k), `Stage 3 texture removed: ${k}`);
  }
});

test('flag-on clear target for Stage 2 is Stage 3; flag-off stays Stage 1', () => {
  const Q = s => new URLSearchParams(s);
  assert.deepEqual(STAGES[2].next(Q('s3=1')), { stage: 3, fromStage2: true, autostart: true });
  assert.deepEqual(STAGES[2].next(Q('')), { stage: 1 });
});
