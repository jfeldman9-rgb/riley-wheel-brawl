import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';
import { audioParam } from './helpers/audio-param.mjs';
import { MusicDirector } from '../src/music.js';
import { MUSIC } from '../src/audio.js';
import '../src/stage6.js';
import { STAGE6_VOICES, VOICE_FILES } from '../src/stage6-voice.js';
import { CutscenePlayer, cutscenesEnabled } from '../src/cutscene.js';
import { q } from '../src/config.js';
import { videoEnv } from './stage6-hardening-fixtures.mjs';

const settle = () => new Promise(resolve => setImmediate(resolve));
const source = name => readFileSync(`src/${name}.js`, 'utf8').replace(/^import .*;\n/gm, '').replace(/^export \{.*\};\n/gm, '').replace(/^export /gm, '');
function audio() {
  const nodes = [], contexts = [], gestures = new EventEmitter(), pending = new Map(), timers = [];
  const node = kind => {
    const o = { kind, starts: 0, stops: 0, disconnects: 0,
      connect() {}, disconnect() { this.disconnects++; }, start() { this.starts++; }, stop() { this.stops++; },
      gain: audioParam(1, () => contexts[0].currentTime), frequency: audioParam(1, () => contexts[0].currentTime),
      Q: { value: 0 }, threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} };
    nodes.push(o); return o;
  };
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 24; this.destination = {}; contexts.push(this); }
    createGain() { return node('gain'); } createDynamicsCompressor() { return node('compressor'); }
    createBufferSource() { return node('buffer'); } createOscillator() { return node('oscillator'); } createBiquadFilter() { return node('filter'); }
    resume() { this.state = 'running'; return Promise.resolve(); } suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    decodeAudioData(bytes, done) { pending.set(bytes.id, done); }
  }
  const a = vm.runInNewContext(source('audio') + '\n({ MUSIC, unlock, audioUnlocked, installAudioLifecycle, say, registerLines, playTrack, stopSceneAudio, musicState })', {
    window: { AudioContext, addEventListener: gestures.on.bind(gestures), removeEventListener: gestures.off.bind(gestures) }, document: { hidden: false },
    fetch: async url => ({ ok: true, arrayBuffer: async () => ({ id: url.split('/').pop().replace('.mp3','') }) }),
    setTimeout(fn) { const t = { fn }; timers.push(t); return t; }, clearTimeout(t) { const i = timers.indexOf(t); if (i >= 0) timers.splice(i,1); } });
  Object.assign(a.MUSIC, { stage6: MUSIC.stage6, boss6: MUSIC.boss6 });
  a.registerLines({ belal_intro_01: ['BELAL', 'Another boy who thinks the Power makes him a man.'] });
  return { a, nodes, contexts, gestures, timers,
    async decode(id) { await settle(); assert.ok(pending.has(id), id); pending.get(id)({ id, duration: 73.2 }); await settle(); },
    started: () => nodes.filter(n => n.kind === 'buffer' && n.starts && !n.stops),
    flush() { contexts[0].currentTime += 5; for (const t of [...timers]) t.fn(); } };
}
function hooks(h) {
  const { quietStage6 } = vm.runInNewContext(source('stage6-audio') + '\n({ quietStage6 })', { stopSceneAudio: h.a.stopSceneAudio });
  return vm.runInNewContext(source('stage6-lifecycle') + '\n({ installStage6SceneHooks, restoreStage6Hooks })', {
    quietStage6,
    abortRandCall() {}, dropBlob() {}, warmRand() {}, linkTrollocs() {}, noteRileyKo() {},
  });
}
function kit(h) {
  const music = new MusicDirector(h.a.playTrack, 6);
  const s = { music, enemies: [], riley: { alive: true }, update() {}, rileyDied() { this.riley.alive = false; },
    continueGame() { this.riley.alive = true; this.music.resumeFight(); } };
  const k = { s, rand: {} }; hooks(h).installStage6SceneHooks(k); return k;
}


// Kimi review 2, finding 2: quietStage6 must reach the backend even when the director already holds no track.
test('quitting during the victory fade cuts the outgoing boss loop at once (quietStage6 with track null)', async () => {
  const h = audio(), k = kit(h); h.a.unlock(); k.s.music.set('boss'); await h.decode('music-boss6');
  assert.equal(h.started().filter(n => n.loop).length, 1);
  k.s.music.set('victory'); assert.equal(k.s.music.track, null);
  assert.equal(h.started().filter(n => n.loop).length, 1, 'boss loop is still fading out');
  hooks(h).restoreStage6Hooks(k);
  assert.equal(h.started().filter(n => n.loop).length, 0, 'teardown owns the fading loop');
});

// Kimi review 2, finding 1 (not reproduced): death -> game over -> Continue restarts exactly one fight loop.
test('death, game over, then Continue restarts exactly one fight loop', async () => {
  const h = audio(), k = kit(h); h.a.unlock(); k.s.music.set('stage'); await h.decode('music-stage6');
  k.s.rileyDied(); assert.equal(h.started().filter(n => n.loop).length, 0);
  k.s.music.set('gameover'); h.flush();
  // Base Stage1.continueGame calls music.resumeFight(); the hook's early deathAudio clear does not block it.
  k.s.continueGame(); await settle(); k.s.update(); await settle();
  assert.equal(k.s.music.state, 'stage'); assert.equal(h.started().filter(n => n.loop).length, 1);
});

// Kimi review 2, finding 3 (not reproduced): aborting a Rand video mid-play (death, quit) restores the duck.
test('abortRandCall mid-video restores gainMul and the fight state', async () => {
  const h = audio(), e = videoEnv(); h.a.unlock();
  e.scene.music = new MusicDirector(h.a.playTrack, 6); e.scene.music.set('boss'); await h.decode('music-boss6');
  const { quietStage6 } = vm.runInNewContext(source('stage6-audio') + '\n({ quietStage6 })', { stopSceneAudio: h.a.stopSceneAudio });
  const r = vm.runInNewContext(source('rand-call-cutscene') + '\n({ playCall, abortRandCall })', {
    CutscenePlayer, cutscenesEnabled, q, quietStage6, fetch: e.root.fetch, URL,
  });
  q.set('cutscenes', '1');
  try {
    assert.equal(r.playCall(e.scene, () => {}), true); assert.equal(e.scene.music.gainMul, 0.35);
    r.abortRandCall(e.scene);
    assert.equal(e.scene.music.gainMul, 1); assert.equal(e.scene.music.state, 'boss'); assert.equal(e.scene.cutscene, null);
  } finally { q.delete('cutscenes'); }
});

// Kimi review 2, finding 4 (not reproduced): after playTrack(null) a gesture resume restarts nothing.
test('a gesture after an immediate music stop does not restart a loop', async () => {
  const h = audio(); h.a.unlock(); h.a.playTrack('boss6'); await h.decode('music-boss6');
  h.a.playTrack(null, { fade: 0 }); assert.equal(h.started().length, 0);
  h.a.installAudioLifecycle({ events: { once() {}, on() {}, off() {} } });
  h.gestures.emit('pointerdown'); h.gestures.emit('touchend'); await settle();
  assert.equal(h.started().filter(n => n.loop).length, 0); assert.equal(h.a.musicState().current, null);
});
