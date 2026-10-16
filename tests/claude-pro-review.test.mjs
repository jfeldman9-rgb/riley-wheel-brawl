// Findings from the third review that the Opus and Fable notes do not already cover.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { Stage1 } from '../src/stage1.js';
import { Stage5Kit } from '../src/stage5.js';
import { queueGrab, resetStage5Visit } from '../src/stage5-demand.js';
import { audit } from '../tools/audit-stage1.mjs';

test('a second Stage 5 visit queues the grab atlas again', () => {
  const s = {
    _s5bossArt: 1, _s5grab: 1, _s5grabWait: 1, _s5loial: 1, _loialWanted: true,
    _s5miss: new Set(['s5agin']),
    load: { json() {}, once() {}, off() {}, on() {}, isLoading() { return true; }, start() {}, image() {}, atlas() {} },
    textures: { exists: () => false },
    cache: { json: { get: () => null } },
    events: { once() {}, off() {} },
    anims: { get: () => null },
  };
  const urls = [];
  s.load.json = (_key, url) => urls.push(url);
  queueGrab(s);
  assert.deepEqual(urls, [], 'a latched visit skips the grab atlas');
  resetStage5Visit(s);
  assert.equal(s._s5bossArt, 0);
  assert.equal(s._s5grab, 0);
  assert.equal(s._s5grabWait, 0);
  assert.equal(s._s5loial, 0);
  assert.equal(s._loialWanted, false);
  assert.equal(s._s5miss.size, 0);
  queueGrab(s);
  assert.deepEqual(urls, ['assets/stage3/chars/riley3.anims.json']);
});

test('Stage5Kit.build clears the previous visit before the stage paints', () => {
  const s = { _s5bossArt: 1, _s5grab: 1, _s5loial: 1, _loialWanted: true, _s5miss: new Set(['s5agin']) };
  const kit = new Stage5Kit(s);
  try { kit.build(); } catch { /* build needs a live scene after the reset */ }
  assert.equal(s._s5bossArt, 0);
  assert.equal(s._s5grab, 0);
  assert.equal(s._s5loial, 0);
  assert.equal(s._loialWanted, false);
  assert.equal(s._s5miss.size, 0);
});

test('a held direction survives pause, a video, and a swallowed press', () => {
  const s = Object.create(Stage1.prototype);
  const inp = {
    held: { left: true }, keysDown: new Set(['KeyA']), buf: { attack: 0 },
    flushPresses() { this.buf = {}; },
    clear() { throw new Error('pause must not drop held keys'); },
  };
  Object.assign(s, {
    pauseReasons: new Set(), paused: false, started: true, ended: false, gameOver: false, cutscene: null,
    inp, scene: { pause() {}, resume() {} }, hud: { pauseLabel: { setVisible() {} } },
  });
  s.setPauseReason('manual', true);
  assert.equal(inp.held.left, true);
  assert.equal(inp.keysDown.has('KeyA'), true);
  assert.deepEqual(inp.buf, {});
  inp.buf = { attack: 1 };
  s.onPress('attack');
  assert.equal(inp.held.left, true);
  assert.deepEqual(inp.buf, {});
  s.setPauseReason('cutscene', true);
  s.cutscene = { press() { throw new Error('another pause reason swallows the press'); } };
  inp.buf = { jump: 1 };
  s.onPress('jump');
  assert.equal(inp.held.left, true);
  assert.deepEqual(inp.buf, {});
  s.cutscene = null;
  s.setPauseReason('manual', false);
  s.setPauseReason('cutscene', false);
  assert.equal(s.paused, false);
  assert.equal(inp.held.left, true);
});

test('Phaser does not open its own audio context', () => {
  const src = readFileSync('src/main.js', 'utf8');
  assert.match(src, /audio:\s*\{\s*noAudio:\s*true,\s*disableWebAudio:\s*true\s*\}/);
});

test('the texture dump samples story panels and a Stage 5 Loial summon', () => {
  const src = readFileSync('tools/stage5/texture-dump.mjs', 'utf8');
  assert.match(src, /story5p1/);
  assert.match(src, /story6p/);
  assert.match(src, /callLoial\(\)/);
  assert.match(src, /snapshot, 'loial'/);
  assert.match(src, /snapshot, 'story'/);
});

test('the pre-fight gate counts boot modules and drops bytes Stage 1 never fetches', () => {
  const data = audit();
  assert.equal(data.preFight.inventoryStatus, 'PASS');
  const fetched = new Set(data.preFight.files);
  for (const f of data.preFight.bootModules.files) assert.ok(fetched.has(f), f);
  for (const f of data.preFight.notFetched.files) assert.equal(fetched.has(f), false, f);
  assert.ok(data.preFight.notFetched.files.includes('assets/chars/byar-0.webp'));
  assert.ok(data.preFight.notFetched.files.includes('assets/props/prop-crate.webp'));
  assert.ok(data.preFight.notFetched.files.includes('assets/audio/voice/byar_intro_01.mp3'));
  assert.equal(data.preFight.notFetched.files.includes('assets/chars/byar.anims.json'), false);
  assert.equal(data.preFight.notFetched.files.some(f => f.includes('twix_panel')), false);
  assert.equal(fetched.has('assets/powers/twix_panel_1.jpg'), true);
  assert.equal(fetched.has('assets/chars/byar.anims.json'), true);
  assert.ok(data.preFight.bootModules.files.includes('src/page-base.js'));
  assert.ok(data.preFight.bootModules.files.includes('src/stage5.js'));
  assert.ok(data.preFight.bootModules.files.includes('src/stage6.js'));
  const sum = files => files.reduce((n, p) => n + statSync(p).size, 0);
  assert.equal(data.preFight.notFetched.bytes, sum(data.preFight.notFetched.files));
  assert.equal(data.preFight.bootModules.bytes, sum(data.preFight.bootModules.files));
  assert.ok(data.preFight.notFetched.bytes > 4_000_000);
  assert.ok(data.preFight.bootModules.bytes > 450_000);
});
