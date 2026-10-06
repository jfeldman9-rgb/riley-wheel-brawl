import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { MusicDirector } from '../src/music.js';
import { bark, LINES } from '../src/stage4-voice.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('court gate selects boss4 exactly once and continue/restart restore their fight music', () => {
  const h = stage4Simulation({ mode: null, followRestart: true }), s = h.s, calls = [];
  try {
    s.music = new MusicDirector((id, options) => calls.push([id, options]), 4); s.music.set('stage');
    s.enemies = []; s.zone = null; s.zoneI = 2; s.riley.x = 4141; s.updateZones(1 / 60);
    for (let i = 0; i < 10; i++) s.updateZones(1 / 60);
    assert.equal(calls.filter(([id]) => id === 'boss4').length, 1);
    s.music.set('gameover'); s.continueGame(); assert.equal(s.music.track, 'boss4'); assert.equal(calls[calls.length - 1][1].restart, false);
    s.scene.restart({ stage: 4 }); h.step(); s.start(); assert.equal(s.music.track, 'stage4');
  } finally { h.destroy(); }
});
test('stage 4 barks keep the accepted 8-second per-type throttle', () => {
  const s = { time: { now: 0 }, caption() {} };
  bark(s, 'fog', 'riley_fog_01'); assert.equal(s._s4bark.fog, 0);
  s.time.now = 7999; bark(s, 'fog', 'riley_fog_01'); assert.equal(s._s4bark.fog, 0);
  s.time.now = 8000; bark(s, 'fog', 'riley_fog_01'); assert.equal(s._s4bark.fog, 8000);
});
test('missing Stage 4 audio is silent and a pending croon cannot start after teardown', async () => {
  const source = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
  let pending, starts = 0;
  const p = () => ({ value: 0, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ gain: p(), threshold: p(), knee: p(), ratio: p(), attack: p(), release: p(), connect() {}, disconnect() {}, start() { starts++; }, stop() {} });
  class Context {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { return node(); } createDynamicsCompressor() { return node(); } createBufferSource() { return node(); }
    createMediaElementSource() { return node(); }
    decodeAudioData(_bytes, success) { pending = success; }
  }
  class Media {
    constructor() { this.paused = true; this.currentTime = 0; }
    play() { return Promise.reject(Error('missing media')); }
    pause() { this.paused = true; }
  }
  let missing = true;
  const api = vm.runInNewContext(source.replace(/^export /gm, '') + '\n({ registerLines, playLoop, stopLoop, stopSceneAudio, preloadClips, playTrack, loop: () => loopSrc, id: () => loopId });', {
    window: { AudioContext: Context }, Audio: Media, setTimeout, clearTimeout,
    fetch: async () => ({ ok: !missing, arrayBuffer: async () => new ArrayBuffer(1) }),
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  api.registerLines(LINES); api.preloadClips(Object.keys(LINES)); api.playLoop('draghkar_croon_01');
  await settle(); assert.equal(starts, 0); assert.equal(api.loop(), null);
  api.playTrack('stage4', { fade: 0 }); await settle();
  api.playTrack('boss4', { fade: 0 }); await settle();
  api.playTrack(null, { fade: 0 }); assert.equal(starts, 0);
  api.stopSceneAudio(); assert.equal(api.id(), null);
  missing = false; api.playLoop('draghkar_croon_01'); await settle(); assert.equal(typeof pending, 'function');
  api.stopSceneAudio(); pending({ duration: 3 }); await settle(); assert.equal(starts, 0); assert.equal(api.loop(), null);
});
