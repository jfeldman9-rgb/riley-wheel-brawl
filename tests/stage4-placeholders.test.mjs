// Stage 4 art prep: manifest, one prompt per item, labelled placeholders at the
// final pixel size. Placeholders are generated into a temp directory (never assets/).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dimensions, ROOT } from '../tools/audit-stage1.mjs';

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'tools/stage4/art-manifest.json'), 'utf8'));
const promptDir = resolve(ROOT, 'docs/stage4/prompts');
const house = readFileSync(resolve(ROOT, 'spike-art/HOUSE_STYLE.txt'), 'utf8');

test('art manifest covers every Stage 4 §7 group, frame totals, and sheet geometry', () => {
  assert.equal(manifest.stage, 4);
  assert.equal(manifest.formats.sheet.width, 1536);
  assert.equal(manifest.formats.sheet.height, 1024);
  assert.equal(manifest.formats.sheet.cells, 8);
  assert.deepEqual(manifest.formats.master, { width: 1024, height: 1536 });
  assert.deepEqual(manifest.formats.plate, { width: 2172, height: 724 });
  assert.equal(manifest.formats.normalMaps, 'spike-art/tools/nmap.py');
  assert.match(manifest.rileyRule, /16/);
  assert.match(manifest.rileyRule, /muscular/);
  assert.match(manifest.rileyRule, /glasses/);
  assert.match(manifest.rileyRule, /Asha'man/);
  assert.match(manifest.rileyRule, /never a kid/);
  assert.match(manifest.rileyRule, /riley\.jpg/);
  const ids = manifest.items.map(it => it.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const token of ['bg4-far', 'bg4-mid', 'bg4-mid2', 'bg4-floor', 'bg4-floor2', 'bg4-floor3',
    'prop-tower-a', 'prop-tower-b', 'prop-tower-c', 'prop-rubble', 'fx-vent', 'fx-tendril-seg',
    'fx-tendril-tip', 'fx-fog-bank', 'fx-fogwall', 'fx-moonshaft', 'fx-fogbolt', 'fx-ash',
    'cultist-master', 'draghkar-master', 'draghkar-portrait', 'riley-s4a',
    'story4_panel_1', 'story4_panel_2', 'story4_panel_3']) {
    assert.ok(ids.includes(token), token);
  }
  for (const base of ['bg4-mid', 'bg4-mid2', 'bg4-floor', 'bg4-floor2', 'bg4-floor3']) {
    assert.ok(ids.includes(base + '_n'), base + ' normal');
  }
  const frames = (group, kind) => manifest.items.filter(it => it.group === group && it.kind === kind)
    .reduce((sum, it) => sum + it.frames, 0);
  assert.equal(frames('cultist', 'sheet'), 40);
  assert.equal(frames('draghkar', 'sheet'), 64);
  assert.equal(frames('riley', 'sheet'), 8);
  assert.equal(manifest.characterFrames.total, 112);
  const towers = manifest.items.filter(it => it.id.startsWith('prop-tower-'));
  assert.equal(towers.length, 3);
  for (const tower of towers) assert.equal(tower.frames, 6);
  assert.equal(manifest.items.find(it => it.id === 'prop-rubble').frames, 2);
  assert.equal(manifest.items.find(it => it.id === 'fx-vent').frames, 4);
  assert.equal(manifest.items.find(it => it.id === 'fx-tendril-seg').frames, 2);
  assert.equal(manifest.items.find(it => it.id === 'fx-tendril-tip').frames, 4);
  assert.deepEqual([manifest.items.find(it => it.id === 'fx-fog-bank').width, manifest.items.find(it => it.id === 'fx-fog-bank').height], [2048, 256]);
  assert.equal(manifest.items.find(it => it.id === 'fx-fogwall').frames, 4);
  assert.equal(manifest.items.find(it => it.id === 'fx-ash').frames, 6);
  assert.equal(manifest.items.find(it => it.id === 'draghkar-portrait').width, 256);
  for (const it of manifest.items) {
    assert.equal(it.width % it.cols, 0, it.id);
    assert.equal(it.height % it.rows, 0, it.id);
    assert.ok(it.cols * it.rows >= it.frames, it.id);
    assert.ok(it.file.endsWith('.png'), it.id);
    if (it.kind === 'sheet' && it.frames === 8) assert.deepEqual([it.width, it.height], [1536, 1024], it.id);
    if (it.kind === 'master') assert.deepEqual([it.width, it.height], [1024, 1536], it.id);
    if (it.kind === 'plate') assert.deepEqual([it.width, it.height], [2172, 724], it.id);
    if (it.kind === 'story') assert.deepEqual([it.width, it.height], [1280, 720], it.id);
  }
  assert.equal(manifest.items.find(it => it.id === 'bg4-far').opaque, true);
  assert.equal(manifest.items.find(it => it.id === 'bg4-mid').opaque, false);
  assert.equal(manifest.items.find(it => it.id === 'riley-s4a').riley, true);
  assert.equal(manifest.items.find(it => it.id === 'story4_panel_2').riley, true);
  assert.equal(manifest.items.find(it => it.id === 'story4_panel_1').riley, false);
});

test('every manifest item has one prompt, and Riley prompts carry the on-model rule plus house style', () => {
  const files = readdirSync(promptDir).filter(name => name.endsWith('.json')).sort();
  assert.deepEqual(files, manifest.items.map(it => `${it.id}.json`).sort());
  for (const it of manifest.items) {
    const prompt = JSON.parse(readFileSync(join(promptDir, `${it.id}.json`), 'utf8'));
    assert.equal(prompt.id, it.id);
    assert.equal(prompt.file, it.file);
    assert.deepEqual(prompt.size, [it.width, it.height]);
    assert.equal(prompt.frames, it.frames);
    assert.equal(prompt.cols, it.cols);
    assert.equal(prompt.rows, it.rows);
    assert.equal(prompt.houseStyle, 'spike-art/HOUSE_STYLE.txt');
    assert.match(prompt.prompt, /Streets of Rage 4|HOUSE STYLE|nmap\.py/);
    if (!it.normal) assert.match(prompt.prompt, new RegExp(house.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    if (it.riley) {
      assert.match(prompt.prompt, /16/);
      assert.match(prompt.prompt, /muscular/);
      assert.match(prompt.prompt, /glasses/);
      assert.match(prompt.prompt, /Asha'man/);
      assert.match(prompt.prompt, /never a kid/);
      assert.match(prompt.prompt, /riley\.jpg/);
      assert.ok(prompt.attach.includes('riley.jpg'));
      assert.ok(prompt.attach.some(path => path.includes('master-side')));
    }
    if (it.normal) {
      assert.match(prompt.prompt, /nmap\.py/);
      assert.equal(prompt.normal, true);
    }
  }
});

test('placeholders match the manifest size and are byte-identical across runs', () => {
  const a = mkdtempSync(join(tmpdir(), 's4-art-a-'));
  const b = mkdtempSync(join(tmpdir(), 's4-art-b-'));
  try {
    for (const dir of [a, b]) {
      execFileSync('python3', ['tools/stage4/make_placeholders.py', dir], { cwd: ROOT });
    }
    const names = readdirSync(a).sort();
    assert.deepEqual(names, manifest.items.map(it => it.file).sort());
    assert.deepEqual(readdirSync(b).sort(), names);
    for (const it of manifest.items) {
      const left = readFileSync(join(a, it.file));
      const right = readFileSync(join(b, it.file));
      assert.deepEqual(dimensions(left), [it.width, it.height], it.id);
      assert.ok(left.equals(right), `${it.id} bytes differ between runs`);
      assert.ok(left.length > 32, it.id);
      // The label is drawn into the pixels; a second run matching byte for byte is the determinism check.
      assert.ok(left.includes(Buffer.from('IHDR')), it.id);
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});
