import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { STAGES, STAGE_CHARS, STAGE_TEXTURES } from '../src/stages.js';
import { STAGE7, STAGE7_CHARS, STAGE7_TEXTURES } from '../src/stage7-def.js';
import { STREAMS, deferredPlateKeys, residentKeys } from '../src/zone-stream.js';
import { STORY7_SCRIPT, STORY7_PANELS } from '../src/stage7.js';
import { LINES, STAGE7_VOICES } from '../src/stage7-voice.js';
import { STAGE_MUSIC } from '../src/music.js';
import { MUSIC } from '../src/audio.js';
import { STAGE_CLIPS } from '../src/cutscene.js';

test('STAGE7 def matches the plan: zones, waves, drops, crates, skip, boss', () => {
  assert.equal(STAGE7.no, 7);
  assert.equal(STAGE7.key, 'rhuidean');
  assert.deepEqual(STAGE7.zones.map(z => [z.at, z.l, z.r]), [[260, 0, 1280], [1500, 1240, 2520], [2800, 2560, 3840], [4140, 3920, 5200]]);
  assert.deepEqual(STAGE7.zones[0].waves, [[['grunt', 'L', 0], ['grunt', 'R', 1.0]], [['spear', 'R', 0], ['dancer', 'L', 0.8], ['grunt', 'R', 1.6]]]);
  assert.deepEqual(STAGE7.zones[1].waves, [[['dancer', 'R', 0], ['veiled', 'L', 0.6]], [['grunt', 'L', 0], ['dancer', 'R', 0.5], ['veiled', 'R', 1.2], ['spear', 'L', 1.8]]]);
  assert.deepEqual(STAGE7.zones[2].waves, [[['fadelt', 'R', 0], ['grunt', 'L', 0.4], ['dancer', 'R', 0.9]], [['veiled', 'T', 0], ['spear', 'L', 0.5], ['grunt', 'R', 1.0], ['dancer', 'L', 1.6]]]);
  assert.equal(STAGE7.zones[3].boss, true);
  assert.deepEqual(STAGE7.drops.map(d => d.kind), ['lightning', 'fireshield', 'airwhip', 'angreal', 'ter?', 'lightning']);
  assert.deepEqual(STAGE7.bossDrop, { phase: 2, kind: 'saangreal' });
  assert.equal(STAGE7.ribbon.zone, 1); assert.equal(STAGE7.ribbon.wave, 0);
  assert.deepEqual(STAGE7.crates, [[880, 600], [2140, 650], [3330, 610], [4600, 596]]);
  assert.equal(STAGE7.crateProp, 's7crate'); assert.equal(STAGE7.cratePlanks, 's7planks');
  assert.deepEqual(STAGE7.skipBoss, { zoneI: 2, x: 3990, camX: 3500 });
  assert.equal(STAGE7.boss.type, 'asmodean');
  assert.equal(STAGE7.boss.name, 'ASMODEAN');
  assert.equal(STAGE7.boss.introVoice, 'st7_asmo_intro_01');
  assert.equal(typeof STAGE7.kit, 'function');
  assert.equal(typeof STAGE7.queue, 'function');
  assert.equal(typeof STAGE7.start, 'function');
  assert.equal(STAGES[7], STAGE7);
});

test('roster drops the hound: only riley, grunt and spear atlases', () => {
  assert.deepEqual([...STAGE7_CHARS], ['riley', 'grunt', 'spear']);
  assert.deepEqual([...STAGE_CHARS[7]], ['riley', 'grunt', 'spear']);
  for (const z of STAGE7.zones) for (const w of z.waves || []) for (const [type] of w) assert.notEqual(type, 'hound');
});

test('STREAMS[7] streams bg7 plates; zones past the first two are deferred', () => {
  assert.equal(STREAMS[7].far, 'bg7far');
  assert.deepEqual(STREAMS[7].zones.map(z => [z.plate, z.floor]),
    [['bg7mid', 'bg7floor'], ['bg7mid2', 'bg7floor'], ['bg7mid3', 'bg7floor2'], ['bg7mid4', 'bg7floor3']]);
  const deferred = deferredPlateKeys(STREAMS[7]);
  for (const k of ['bg7mid3', 'bg7mid4', 'bg7floor2', 'bg7floor3']) assert.ok(deferred.includes(k), k);
  const resident = residentKeys({ zoneI: 0, stageDef: STAGE7 }, STREAMS[7]);
  assert.ok(resident.has('bg7far') && resident.has('bg7mid') && resident.has('bg7mid2') && resident.has('bg7floor'));
  assert.ok(!resident.has('bg7mid4'));
  for (const k of STAGE7_TEXTURES) assert.ok(STAGE_TEXTURES[7].includes(k), k);
});

test('story script: narrator first, Moiraine and Lan speak, Riley only named (panels show him from behind)', () => {
  assert.deepEqual(STORY7_SCRIPT.map(l => l.id), ['st7_story_01', 'st7_story_02', 'riley_st7_story_01', 'st7_story_03', 'st7_story_04']);
  assert.deepEqual(STORY7_SCRIPT.map(l => l.who), ['NARRATOR', 'NARRATOR', 'RILEY', 'MOIRAINE', 'LAN']);
  assert.equal(STORY7_PANELS.length, 3);
  for (const l of STORY7_SCRIPT) assert.ok(LINES[l.id], l.id);
});

test('every Stage 7 voice id carries the audit prefix, and the outro sets up Cairhien', () => {
  for (const id of STAGE7_VOICES) assert.match(id, /^(st7_|riley_st7_)/, id);
  assert.match(LINES.st7_clear_01[1], /Cairhien/);
  assert.equal(LINES.riley_st7_victory_01[1], "Hold on. I'm coming.");
});

test('music: Stage 7 ids resolve to files that exist (Stage 6 loops stand in)', async () => {
  await import('../src/stage7.js');
  assert.deepEqual(STAGE_MUSIC[7], { stage: 'stage7', boss: 'boss7' });
  const { existsSync } = await import('node:fs');
  for (const id of ['stage7', 'boss7']) {
    assert.ok(MUSIC[id], id);
    assert.ok(existsSync(MUSIC[id].url), MUSIC[id].url);
  }
});

test('no Stage 7 intro clip is registered until the file ships', () => {
  assert.equal(STAGE_CLIPS[7], undefined, 'a listed clip must exist with provenance (cutscene.test.mjs)');
});

test('audit prints every Stage 7 line and all pass; nothing Stage 7 sits in the pre-fight gate', () => {
  const data = JSON.parse(execFileSync('node', ['tools/audit-stage1.mjs'], { encoding: 'utf8' }));
  assert.equal(data.preFight.inventoryStatus, 'PASS');
  assert.ok(data.preFight.budgetBytes - data.preFight.inventoryUpperBoundBytes >= 50 * 1024, 'iOS hotfix headroom kept');
  const bad = data.preFight.files.filter(p => /stage7|moilan|call7|shaido|asmodean|bot-stage7|\/bg7\/|cutscenes\/(call7|stage7)/.test(p));
  assert.deepEqual(bad, []);
  assert.equal(data.stage7.source.status, 'PASS');
  assert.equal(data.stage7.source.budgetBytes, 192 * 1024);
  assert.equal(data.stage7.voices.status, 'PASS');
  assert.equal(data.stage7.voices.budgetBytes, 24 * 200 * 1024);
  assert.equal(data.stage7.music.status, 'PASS');
  assert.equal(data.stage7.music.budgetBytes, 2_400_000);
  assert.equal(data.stage7.art.status, 'PASS');
  assert.equal(data.stage7.art.budgetBytes, 6_000_000);
  assert.equal(data.cutscenes.callIns7.status, 'PASS');
  assert.equal(data.cutscenes.callIns7.budgetBytes, 9_000_000);
  assert.equal(data.cutscenes.stage7.status, 'PASS');
  assert.equal(data.cutscenes.stage7.budgetBytes, 2_000_000);
  assert.equal(data.cutscenes.source.status, 'PASS');
});
