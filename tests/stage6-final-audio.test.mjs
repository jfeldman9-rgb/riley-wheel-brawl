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

test('Stage 6 voice ids and music loop bounds match the shipped manifest and files', () => {
  const ids = JSON.parse(readFileSync('assets/audio/stage6-voice-manifest.json')).present;
  assert.deepEqual([...ids].sort(), [...STAGE6_VOICES].sort()); assert.deepEqual([...VOICE_FILES].sort(), [...ids].sort());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(existsSync(`assets/audio/voice/${id}.mp3`));
  for (const id of ['stage6','boss6']) { const m = MUSIC[id]; assert.ok(existsSync(m.url)); assert.ok(m.loopStart >= 0 && m.loopEnd > m.loopStart); }
});

test('first captured gesture unlocks a suspended context with a voice queued before any gameplay press', async () => {
  const h = audio(); h.a.installAudioLifecycle({ events: new EventEmitter() });
  h.a.say('belal_intro_01'); await h.decode('belal_intro_01');
  assert.equal(h.contexts[0].state, 'suspended'); h.gestures.emit('pointerdown'); await settle();
  assert.equal(h.a.audioUnlocked(), true); assert.equal(h.contexts[0].state, 'running'); assert.equal(h.started().length, 1);
  h.contexts[0].state = 'suspended'; h.gestures.emit('touchend'); await settle(); assert.equal(h.contexts[0].state, 'running');
});

for (const exit of ['death', 'continue', 'dispose']) test(`Stage 6 ${exit} cancels speech, including a pending decode`, async () => {
  const h = audio(), k = kit(h); h.a.unlock(); k.s.music.set('boss'); await h.decode('music-boss6');
  h.a.say('belal_intro_01');
  if (exit === 'death') k.s.rileyDied(); else if (exit === 'continue') k.s.continueGame(); else hooks(h).restoreStage6Hooks(k);
  await h.decode('belal_intro_01');
  assert.equal(h.started().filter(n => n.buffer?.id === 'belal_intro_01').length, 0);
  if (exit !== 'continue') { h.flush(); assert.equal(h.started().filter(n => n.loop).length, 0); }
});

test('Riley death stops active speech and fight music; respawn resumes one boss loop', async () => {
  const h = audio(), k = kit(h); h.a.unlock(); k.s.music.set('boss'); await h.decode('music-boss6');
  h.a.say('belal_intro_01'); await h.decode('belal_intro_01'); const voice = h.started().find(n => n.buffer.id === 'belal_intro_01');
  k.s.rileyDied(); assert.equal(voice.stops, 1); h.flush(); assert.equal(h.started().length, 0);
  k.s.riley.alive = true; k.s.update(); await settle();
  assert.equal(h.started().filter(n => n.loop).length, 1); assert.equal(k.s.music.state, 'boss');
});

test('Rand video silences the actual backend and speech, then restores exactly one boss loop', async () => {
  const h = audio(), e = videoEnv(); h.a.unlock();
  e.scene.music = new MusicDirector(h.a.playTrack, 6); e.scene.music.set('boss'); await h.decode('music-boss6');
  h.a.say('belal_intro_01'); await h.decode('belal_intro_01');
  const { quietStage6 } = vm.runInNewContext(source('stage6-audio') + '\n({ quietStage6 })', { stopSceneAudio: h.a.stopSceneAudio });
  const r = vm.runInNewContext(source('rand-call-cutscene') + '\n({ playCall, abortRandCall })', {
    CutscenePlayer, cutscenesEnabled, q, quietStage6, fetch: e.root.fetch, URL,
  });
  q.set('cutscenes', '1');
  try {
    assert.equal(r.playCall(e.scene, () => {}), true); assert.ok(e.scene.cutscene);
    h.flush(); assert.equal(h.started().length, 0, 'gainMul alone never reaches audio.js');
    e.videos[0].fire('ended'); await settle();
    assert.equal(e.scene.music.state, 'boss'); assert.equal(h.started().filter(n => n.loop).length, 1);
    r.abortRandCall(e.scene);
  } finally { q.delete('cutscenes'); }
});

test('Stage 6 restarts during a pending music decode cannot create duplicate loops', async () => {
  const h = audio(); h.a.unlock(); h.a.playTrack('boss6'); h.a.playTrack('boss6', { restart: true });
  await h.decode('music-boss6'); assert.equal(h.started().filter(n => n.loop).length, 1);
  h.a.playTrack('boss6', { restart: true }); await settle(); assert.equal(h.started().filter(n => n.loop).length, 1);
  h.a.playTrack(null, { fade: 0 }); assert.equal(h.started().length, 0);
});

test('immediate Stage 6 music teardown also cancels the outgoing loop in an unfinished crossfade', async () => {
  const h=audio(); h.a.unlock(); h.a.playTrack('stage6'); await h.decode('music-stage6');
  h.a.playTrack('boss6',{fade:1.2}); await h.decode('music-boss6'); assert.equal(h.started().filter(n=>n.loop).length,2);
  h.a.playTrack(null,{fade:0}); assert.equal(h.started().filter(n=>n.loop).length,0);
  h.flush(); assert.equal(h.started().filter(n=>n.loop).length,0);
});
