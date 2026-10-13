import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { callInFor } from '../src/rand-call.js';
import { plateRect, STREAMS } from '../src/zone-stream.js';
import { STAGE6 } from '../src/stage6-def.js';
import { STAGE7 } from '../src/stage7-def.js';
import { Stage6Kit } from '../src/stage6.js';
import { MusicDirector, STAGE_MUSIC } from '../src/music.js';
import { usesCompactNormals } from '../src/texture-pages.js';

test('call-ins split at 6 and 7, and Stage 6 freeze matches the old predicate', () => {
  assert.equal(callInFor(5), 'loial');
  assert.equal(callInFor(6), 'rand');
  assert.equal(callInFor(7), 'moilan');
  const kit = new Stage6Kit({ cutscene: null });
  assert.equal(kit.freezesRiley(), false);
  assert.equal(kit.freezesWorld(), false);
  kit.strike = { t: 0 };
  assert.equal(kit.freezesRiley(), true);
  assert.equal(kit.freezesWorld(), true);
  kit.strike = null; kit.s.cutscene = {};
  assert.equal(kit.freezesWorld(), true);
});

test('stage 6 plate rects stay on the sea-gate bleed', () => {
  const want = [{ x: -128, w: 1416 }, { x: 1192, w: 1368 }, { x: 2560, w: 1408 }, { x: 3872, w: 1456 }];
  for (let i = 0; i < 4; i++) {
    const r = plateRect(i, STAGE6.zones);
    assert.equal(r.x, want[i].x, i);
    assert.equal(r.w, want[i].w, i);
    assert.deepEqual(plateRect(i, STAGE6.zones, STREAMS[6].bleed), r);
  }
  const feather = [96, 96, 96];
  for (let i = 1; i < 4; i++) {
    const a = plateRect(i - 1, STAGE7.zones, STREAMS[7].bleed);
    const b = plateRect(i, STAGE7.zones, STREAMS[7].bleed);
    assert.equal(a.x + a.w - b.x, feather[i - 1], i);
  }
});

test('stage 7 music is a row, not a mutation of the frozen table', () => {
  assert.equal(STAGE_MUSIC[7], undefined);
  assert.deepEqual(STAGE_MUSIC[6], { stage: 'stage6', boss: 'boss6' });
  const calls = [];
  const m = new MusicDirector(id => calls.push(id), 7);
  assert.equal(m.stageNo, 7);
  m.set('stage'); m.set('boss');
  assert.deepEqual(calls, ['stage7', 'boss7']);
  assert.equal(usesCompactNormals(7), true);
  assert.equal(usesCompactNormals(4), false);
});
