// Production audio module with deterministic WebAudio/HTMLAudio stubs. These are
// lifecycle checks, not a listening test or a claim about physical-device audio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { audioParam } from './helpers/audio-param.mjs';

const source = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness({ mediaSourceFails = false, resumeFails = false, contextState = 'running', decodeReturnsPromise = false, initiallyHidden = false, suspendFails = false } = {}) {
  const nodes = [], contexts = [], media = [], fetches = [], decodes = new Map(), failures = new Set();
  const game = { events: new EventEmitter() }, gestures = new EventEmitter(), timers = [];
  const param = (value = 0) => { const context = contexts.at(-1); return audioParam(value, () => context.currentTime); };
  function node(kind) {
    const n = { kind, connections: [], starts: [], stops: [], disconnects: 0, onended: null,
      connect(other) { this.connections.push(other); return other; },
      disconnect() { this.connections = []; this.disconnects++; },
      start(...args) { this.starts.push(args); }, stop(...args) { this.stops.push(args); },
      finish() { if (this.onended) this.onended(); },
      gain: param(1), frequency: param(), Q: param(), threshold: param(), knee: param(),
      ratio: param(), attack: param(), release: param(),
    };
    nodes.push(n); return n;
  }
  class AudioContext {
    constructor() { this.currentTime = 0; this.sampleRate = 24; this.state = contextState; this.destination = {}; this.resumeCalls = 0; this.suspendCalls = 0; this.closeCalls = 0; this.resumeFails = resumeFails; contexts.push(this); }
    createGain() { return node('gain'); }
    createDynamicsCompressor() { return node('compressor'); }
    createOscillator() { return node('oscillator'); }
    createBufferSource() { return node('buffer'); }
    createBiquadFilter() { return node('filter'); }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createMediaElementSource() { if (mediaSourceFails) throw Error('media source unavailable'); return node('media'); }
    decodeAudioData(bytes, resolve, reject) {
      if (!decodeReturnsPromise) { decodes.set(bytes.id, { resolve, reject }); return; }
      return new Promise((resolvePromise, rejectPromise) => decodes.set(bytes.id, {
        resolve(buf) { resolve(buf); resolvePromise(buf); },
        reject() { reject(); rejectPromise(Error('decode failed')); },
      }));
    }
    resume() { this.resumeCalls++; if (this.resumeFails) return Promise.reject(Error('resume blocked')); this.state = 'running'; return Promise.resolve(); }
    suspend() { this.suspendCalls++; if (suspendFails) return Promise.reject(Error('suspend blocked')); this.state = 'suspended'; return Promise.resolve(); }
    close() { this.closeCalls++; this.state = 'closed'; return Promise.resolve(); }
  }
  class Audio {
    constructor(url) { this.url = url; this.plays = 0; this.pauses = 0; this.volume = 1; this.muted = false; this.paused = true; this.currentTime = 0; media.push(this); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.pauses++; this.paused = true; }
    removeAttribute(name) { if (name === 'src') this.sourceRemoved = true; }
    load() { this.loads = (this.loads || 0) + 1; }
  }
  const api = vm.runInNewContext(`${source.replace(/^export /gm, '')}\n({ sfx, say, unlock, playMusic, playTrack, musicState, setRain, toggleMusic, toggleMute, preloadVoices, installAudioLifecycle, stopSceneAudio: typeof stopSceneAudio === 'function' ? stopSceneAudio : undefined });`, {
    window: { AudioContext, addEventListener: gestures.on.bind(gestures), removeEventListener: gestures.off.bind(gestures) }, Audio, document: { hidden: initiallyHidden },
    setTimeout(fn, ms) { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimeout(timer) { const i = timers.indexOf(timer); if (i >= 0) timers.splice(i, 1); },
    fetch(url) {
      const id = url.match(/([^/]+)\.mp3$/)[1]; fetches.push(id);
      return Promise.resolve({ ok: !failures.has(id), arrayBuffer: () => Promise.resolve({ id }) });
    },
  });
  return { api, nodes, contexts, media, fetches, failures, game, gestures, timers, decodes,
    async decode(id, duration = 2) {
      await settle(); assert.ok(decodes.has(id), `expected a decode request for ${id}`);
      decodes.get(id).resolve({ id, duration }); await settle();
    },
    async failDecode(id) {
      await settle(); assert.ok(decodes.has(id), `expected a decode request for ${id}`);
      decodes.get(id).reject(); await settle();
    },
    voices: () => nodes.filter(n => n.kind === 'buffer' && n.buffer?.id && n.starts.length),
    transients: () => nodes.filter(n => (n.kind === 'buffer' || n.kind === 'oscillator') && n.starts.length),
  };
}

test('later interrupting speech wins even when earlier decoding finishes last', async () => {
  const h = harness(), captions = [];
  h.api.say('st1_narrator_01', (...cap) => captions.push(cap));
  h.api.say('trolloc_intro_01', (...cap) => captions.push(cap));
  await h.decode('trolloc_intro_01'); await h.decode('st1_narrator_01');
  assert.deepEqual(h.voices().map(n => n.buffer.id), ['trolloc_intro_01']);
  assert.equal(captions.at(-1)[0], 'TROLLOC');
});

test('repeated requests for the same pending clip start only the latest request', async () => {
  const h = harness(); h.api.say('st1_narrator_01'); h.api.say('st1_narrator_01');
  await h.decode('st1_narrator_01');
  assert.equal(h.fetches.length, 1); assert.equal(h.voices().length, 1);
});

test('preloading shares cached clip promises with speech and repeated preloads', async () => {
  const h = harness(); h.api.preloadVoices(); h.api.preloadVoices(); h.api.say('st1_narrator_01');
  await h.decode('st1_narrator_01');
  // 20 Stage 1 lines + 5 restored 1.1 lines (Loial call/charge/done/spent, balefire).
  assert.equal(h.fetches.length, 25); assert.equal(new Set(h.fetches).size, 25);
  assert.equal(h.voices().length, 1);
});

test('a stale decode failure cannot release a newer pending voice channel', async () => {
  const h = harness(); h.api.say('st1_narrator_01'); h.api.say('trolloc_intro_01');
  await h.failDecode('st1_narrator_01'); h.api.say('riley_combo_01', null, false);
  assert.deepEqual(h.fetches, ['st1_narrator_01', 'trolloc_intro_01']);
  await h.decode('trolloc_intro_01'); assert.equal(h.voices().length, 1);
});

test('a pending line reserves the voice channel against non-interrupting combat barks', async () => {
  const h = harness(), captions = [];
  h.api.say('st1_narrator_01', (...cap) => captions.push(cap));
  h.api.say('riley_combo_01', (...cap) => captions.push(cap), false);
  await h.decode('st1_narrator_01');
  assert.deepEqual(h.fetches, ['st1_narrator_01']);
  assert.deepEqual(captions.map(c => c[0]), ['NARRATOR']);
});

test('a non-interrupting bark cannot replace the caption of playing dialogue', async () => {
  const h = harness(), captions = [];
  h.api.say('st1_narrator_01', (...cap) => captions.push(cap)); await h.decode('st1_narrator_01');
  h.api.say('riley_combo_01', (...cap) => captions.push(cap), false); await settle();
  assert.equal(captions.length, 1); assert.equal(h.voices()[0].stops.length, 0);
});

test('new interrupting speech stops and disconnects the old line before waiting for decode', async () => {
  const h = harness(); h.api.say('st1_narrator_01'); await h.decode('st1_narrator_01');
  const old = h.voices()[0]; h.api.say('trolloc_intro_01');
  assert.equal(old.stops.length, 1); assert.equal(old.disconnects, 1);
  await h.decode('trolloc_intro_01');
  assert.equal(h.voices().length, 2);
});

test('a naturally ended voice disconnects and releases the channel', async () => {
  const h = harness(); h.api.say('st1_narrator_01'); await h.decode('st1_narrator_01');
  const voice = h.voices()[0]; voice.finish();
  assert.equal(voice.disconnects, 1);
  h.api.say('riley_combo_01', null, false); await h.decode('riley_combo_01');
  assert.equal(h.voices().length, 2);
});

test('an old queued ended callback cannot clear a replacement voice', async () => {
  const h = harness(); h.api.say('st1_narrator_01'); await h.decode('st1_narrator_01');
  const old = h.voices()[0], oldEnded = old.onended;
  h.api.say('trolloc_intro_01'); await h.decode('trolloc_intro_01'); oldEnded();
  h.api.say('riley_combo_01', null, false); await settle();
  assert.equal(old.disconnects, 1); assert.equal(h.voices().length, 2);
  assert.deepEqual(h.fetches, ['st1_narrator_01', 'trolloc_intro_01']);
});

test('muting before initialization remains silent when music initializes the graph', () => {
  const h = harness(); assert.equal(h.api.toggleMute(), true); h.api.playMusic();
  assert.equal(h.nodes.find(n => n.kind === 'gain').gain.value, 0);
  assert.equal(h.media[0].muted, true);
});

test('muting then unmuting cannot revive a voice requested before mute', async () => {
  const h = harness(); h.api.say('st1_narrator_01');
  h.api.toggleMute(); h.api.toggleMute(); await h.decode('st1_narrator_01');
  assert.equal(h.voices().length, 0);
});

test('muted speech still captions but cannot begin after unmute', async () => {
  const h = harness(), captions = []; h.api.toggleMute();
  h.api.say('riley_combo_01', (...cap) => captions.push(cap)); h.api.toggleMute();
  await settle();
  // Preloading is allowed while muted; any completion must stay silent.
  if (h.fetches.includes('riley_combo_01')) await h.decode('riley_combo_01');
  assert.equal(captions.length, 1); assert.equal(h.voices().length, 0);
});

test('muting stops playing dialogue and delayed one-shot sounds', async () => {
  const h = harness(); h.api.say('st1_narrator_01'); await h.decode('st1_narrator_01'); h.api.sfx.levelClear();
  const playing = h.transients(); assert.equal(playing.length, 8); h.api.toggleMute();
  for (const n of playing) { assert.equal(n.stops.at(-1).length, 0); assert.equal(n.disconnects, 1); }
  h.api.toggleMute(); assert.equal(h.transients().length, playing.length);
});

test('HTMLAudio fallback respects global mute before and after initialization', () => {
  const h = harness({ mediaSourceFails: true }); h.api.toggleMute(); h.api.playMusic();
  assert.equal(h.media[0].muted, true); assert.equal(h.media[0].volume, 0.34);
  h.api.toggleMute(); assert.equal(h.media[0].muted, false);
  h.api.toggleMute(); assert.equal(h.media[0].muted, true);
});

test('music toggled off before start can be turned on afterward', () => {
  const h = harness(); assert.equal(h.api.toggleMusic(), false); h.api.playMusic();
  assert.equal(h.media.length, 0); assert.equal(h.api.toggleMusic(), true);
  assert.equal(h.media.length, 1); assert.equal(h.media[0].plays, 1);
  assert.equal(h.media[0].url, 'assets/audio/music-main.mp3'); assert.equal(h.media[0].loop, true);
});

test('music preference does not start music on an unstarted title screen', () => {
  const h = harness(); h.api.toggleMusic(); h.api.toggleMusic(); h.api.unlock();
  assert.equal(h.media.length, 0);
});

test('later unlocks cannot re-enable music that the user turned off', () => {
  const h = harness(); h.api.playMusic(); h.api.toggleMusic(); h.api.unlock();
  assert.equal(h.media.length, 1); assert.equal(h.media[0].pauses, 1); assert.equal(h.media[0].plays, 1);
});

test('scene shutdown invalidates pending speech while preserving cached clips for the next run', async () => {
  const h = harness(); h.api.say('st1_narrator_01');
  assert.equal(typeof h.api.stopSceneAudio, 'function'); h.api.stopSceneAudio();
  await h.decode('st1_narrator_01'); assert.equal(h.voices().length, 0);
  h.api.say('st1_narrator_01'); await settle();
  assert.equal(h.voices().length, 1); assert.equal(h.fetches.length, 1);
});

test('scene shutdown stops and disconnects voice/SFX without pausing selected music', async () => {
  const h = harness(); h.api.playMusic(); h.api.say('st1_narrator_01'); await h.decode('st1_narrator_01');
  h.api.sfx.jump(); h.api.sfx.levelClear(); const transients = h.transients();
  assert.equal(typeof h.api.stopSceneAudio, 'function'); h.api.stopSceneAudio(); h.api.stopSceneAudio();
  for (const n of transients) { assert.equal(n.stops.at(-1).length, 0); assert.equal(n.disconnects, 1); }
  assert.equal(h.media[0].pauses, 0); assert.equal(h.media[0].plays, 1);
  const duck = h.nodes.filter(n => n.kind === 'gain')[1]; assert.equal(duck.gain.value, 1);
});

test('one-shot oscillator/filter/gain nodes disconnect after natural completion', () => {
  const h = harness(); h.api.unlock(); const baseline = h.nodes.length; h.api.sfx.jump();
  for (const n of h.transients()) n.finish();
  for (const n of h.nodes.slice(baseline)) assert.equal(n.disconnects, 1, `${n.kind} should disconnect`);
});

test('finished one-shots are released rather than retained for scene shutdown', () => {
  const h = harness(); h.api.unlock(); const baseline = h.nodes.length;
  for (let i = 0; i < 100; i++) {
    h.api.sfx.jump(); for (const n of h.transients()) n.finish();
  }
  h.api.stopSceneAudio();
  for (const n of h.nodes.slice(baseline)) {
    assert.equal(n.disconnects, 1); assert.equal(n.onended, null); assert.equal(n.connections.length, 0);
    if (n.starts.length) assert.equal(n.stops.length, 1, 'only the original scheduled stop remains');
  }
});

test('sound gates throttle at AudioContext time zero and reset between scenes', () => {
  const h = harness(); h.api.unlock(); h.api.sfx.swing(); h.api.sfx.swing();
  assert.equal(h.transients().length, 1);
  assert.equal(typeof h.api.stopSceneAudio, 'function'); h.api.stopSceneAudio(); h.api.sfx.swing();
  assert.equal(h.transients().length, 2);
});

test('temporary fetch failures release the channel and can be retried', async () => {
  const h = harness(); h.failures.add('st1_narrator_01'); h.api.say('st1_narrator_01'); await settle();
  h.failures.delete('st1_narrator_01'); h.api.say('st1_narrator_01', null, false); await h.decode('st1_narrator_01');
  assert.equal(h.fetches.length, 2); assert.equal(h.voices().length, 1);
});

test('decode callback and promise rejection are both handled, allowing a retry', async () => {
  const h = harness({ decodeReturnsPromise: true }); h.api.say('st1_narrator_01');
  await h.failDecode('st1_narrator_01'); h.api.say('st1_narrator_01', null, false); await h.decode('st1_narrator_01');
  assert.equal(h.fetches.length, 2); assert.equal(h.voices().length, 1);
});

test('unknown voice IDs neither fetch assets nor interrupt approved dialogue', async () => {
  const h = harness(); h.api.say('st1_narrator_01');
  assert.equal(h.api.say('unknown'), undefined); await h.decode('st1_narrator_01');
  assert.deepEqual(h.fetches, ['st1_narrator_01']); assert.equal(h.voices().length, 1);
});

test('unlock handles a rejected browser resume without an unhandled rejection', async () => {
  const h = harness({ contextState: 'suspended', resumeFails: true }); h.api.unlock(); await settle();
  assert.equal(h.contexts.length, 1);
});

test('unlock resumes both suspended and iOS interrupted contexts, without touching running or closed contexts', async () => {
  for (const state of ['suspended', 'interrupted', 'running', 'closed']) {
    const h = harness({ contextState: state }); h.api.unlock(); await settle();
    assert.equal(h.contexts[0].resumeCalls, ['suspended', 'interrupted'].includes(state) ? 1 : 0, state);
  }
});

test('Phaser hidden/visible suspends the whole graph and resumes music, rain and speech without restarting sources', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playTrack('boss2');
  await h.decode('music-boss2'); h.api.setRain(true);
  h.api.say('byar_mid_01'); await h.decode('byar_mid_01');
  const context = h.contexts[0], sources = h.transients(); context.currentTime = 3;
  h.game.events.emit('hidden'); await settle();
  assert.equal(context.state, 'suspended'); assert.equal(context.suspendCalls, 1);
  assert.equal(h.api.musicState().current, 'boss2');
  for (const source of sources) { assert.equal(source.starts.length, 1); assert.equal(source.stops.length, 0); }
  h.game.events.emit('visible'); await settle();
  assert.equal(context.state, 'running'); assert.equal(context.resumeCalls, 1);
  assert.equal(h.transients().length, sources.length); assert.equal(context.currentTime, 3);
});

test('hidden/visible pauses the streamed theme and HTMLAudio fallback at the same position', async () => {
  for (const fallback of [false, true]) {
    const h = harness({ mediaSourceFails: fallback }); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playMusic();
    const el = h.media[0]; el.currentTime = 71.5;
    h.game.events.emit('hidden'); await settle();
    assert.equal(el.paused, true); assert.equal(el.pauses, 1);
    h.game.events.emit('visible'); await settle();
    assert.equal(el.paused, false); assert.equal(el.plays, 2); assert.equal(el.currentTime, 71.5);
    assert.equal(h.api.musicState().current, 'stage1');
  }
});

test('a tab hidden before audio initialization suspends a new context and never starts a stream in the background', async () => {
  const h = harness({ initiallyHidden: true }); h.api.installAudioLifecycle(h.game); h.api.playMusic(); h.api.unlock(); await settle();
  assert.equal(h.contexts[0].state, 'suspended'); assert.equal(h.contexts[0].resumeCalls, 0);
  assert.equal(h.media[0].plays, 0); assert.equal(h.media[0].paused, true);
  h.game.events.emit('visible'); await settle();
  assert.equal(h.contexts[0].state, 'running'); assert.equal(h.media[0].plays, 1);
});

test('visibility alone does not unlock an untouched title screen or create an audio context', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game);
  h.game.events.emit('hidden'); h.game.events.emit('visible'); await settle();
  assert.equal(h.contexts.length, 0); assert.equal(h.media.length, 0);
});

test('returning to the tab preserves music-off and mute preferences', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playMusic();
  h.game.events.emit('hidden'); h.api.toggleMusic(); h.api.toggleMute(); await settle();
  h.game.events.emit('visible'); await settle();
  assert.equal(h.api.musicState().on, false); assert.equal(h.media[0].plays, 1); assert.equal(h.media[0].muted, true);
  assert.equal(h.nodes.find(n => n.kind === 'gain').gain.value, 0);
  h.api.toggleMusic(); assert.equal(h.media[0].plays, 2); assert.equal(h.media[0].muted, true);
});

test('switching the selected stream while hidden waits for visibility instead of starting fallback audio', async () => {
  const h = harness({ mediaSourceFails: true }); h.api.installAudioLifecycle(h.game); h.api.unlock();
  h.game.events.emit('hidden'); h.api.playMusic(); await settle();
  assert.equal(h.media[0].plays, 0);
  h.game.events.emit('visible'); await settle(); assert.equal(h.media[0].plays, 1);
});

test('rejected interrupted resume can be retried by a later gesture and never re-enables music', async () => {
  const h = harness({ contextState: 'interrupted', resumeFails: true }); h.api.installAudioLifecycle(h.game); h.api.toggleMusic(); h.api.unlock(); await settle();
  const context = h.contexts[0]; assert.equal(context.resumeCalls, 1); assert.equal(context.state, 'interrupted');
  context.resumeFails = false; h.api.unlock(); await settle();
  assert.equal(context.resumeCalls, 2); assert.equal(context.state, 'running'); assert.equal(h.api.musicState().on, false);
});

test('rapid hide/show/hide settles suspended and a late resume completion cannot leave hidden audio running', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playMusic();
  const context = h.contexts[0]; let completeResume;
  context.resume = () => { context.resumeCalls++; return new Promise(resolve => { completeResume = () => { context.state = 'running'; resolve(); }; }); };
  h.game.events.emit('hidden'); await settle(); h.game.events.emit('visible'); h.game.events.emit('hidden');
  completeResume(); await settle();
  assert.equal(context.state, 'suspended'); assert.equal(h.media[0].paused, true);
});

test('a late suspend completion after visibility resumes the context again', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playMusic();
  const context = h.contexts[0]; let completeSuspend;
  context.suspend = () => { context.suspendCalls++; return new Promise(resolve => { completeSuspend = () => { context.state = 'suspended'; resolve(); }; }); };
  h.game.events.emit('hidden'); h.game.events.emit('visible'); completeSuspend(); await settle();
  assert.equal(context.state, 'running'); assert.equal(h.media[0].paused, false);
});

test('game destruction removes the audio listeners and cannot resume audio afterward', async () => {
  const h = harness(); const lifecycle = h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playMusic();
  assert.equal(h.game.events.listenerCount('hidden'), 1); h.game.events.emit('destroy'); lifecycle.destroy();
  for (const event of ['hidden', 'visible', 'destroy']) assert.equal(h.game.events.listenerCount(event), 0);
  for (const event of ['pointerdown', 'touchend', 'keydown']) assert.equal(h.gestures.listenerCount(event), 0);
  h.game.events.emit('visible'); await settle();
  assert.equal(h.contexts[0].state, 'closed'); assert.equal(h.media[0].paused, true);
});

test('a rejected suspend pauses the HTMLAudio fallback and produces no unhandled rejection', async () => {
  const h = harness({ mediaSourceFails: true, suspendFails: true }); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playMusic();
  h.game.events.emit('hidden'); await settle();
  assert.equal(h.contexts[0].suspendCalls, 1); assert.equal(h.media[0].paused, true);
});

test('captured pointer, touch and key gestures recover an interrupted graph even when scene input does not call unlock', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); const context = h.contexts[0];
  for (const event of ['pointerdown', 'touchend', 'keydown']) {
    context.state = 'interrupted'; const before = context.resumeCalls;
    h.gestures.emit(event); await settle();
    assert.equal(context.resumeCalls, before + 1, event); assert.equal(context.state, 'running', event);
  }
  h.game.events.emit('hidden'); await settle(); const before = context.resumeCalls;
  h.gestures.emit('keydown'); await settle(); assert.equal(context.resumeCalls, before, 'background gesture cannot resume audio');
});

test('lifecycle gesture listeners do not create a context before the game has unlocked audio', () => {
  const h = harness(); h.api.installAudioLifecycle(h.game);
  for (const event of ['pointerdown', 'touchend', 'keydown']) h.gestures.emit(event);
  assert.equal(h.contexts.length, 0); assert.equal(h.media.length, 0);
});

test('thunder main noise is reduced to 0.30 while secondary noise and bass retain their mix levels', () => {
  const h = harness(); h.api.unlock(); const first = h.nodes.length; h.api.sfx.thunder();
  const peaks = h.nodes.slice(first).filter(n => n.kind === 'gain').map(n => n.gain.events.find(e => e[0] === 'lin')[1]);
  assert.deepEqual(peaks, [0.3, 0.2, 0.25]);
});

test('hiding mid-crossfade cannot discard the outgoing source before its suspended gain ramp finishes', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playTrack('stage2');
  await h.decode('music-stage2'); const context = h.contexts[0]; context.currentTime = 1;
  h.api.playTrack('boss2', { fade: 1.2 }); await h.decode('music-boss2'); context.currentTime = 1.4;
  const outgoing = h.transients().find(n => n.buffer?.id === 'music-stage2');
  h.game.events.emit('hidden'); await settle();
  h.timers.shift().fn(); assert.equal(outgoing.stops.length, 0, 'wall time cannot finish a frozen audio ramp');
  h.game.events.emit('visible'); await settle(); context.currentTime = 2.21;
  h.timers.shift().fn(); assert.equal(outgoing.stops.length, 1); assert.equal(outgoing.disconnects, 1);
});

test('rain cleanup also waits for the audio clock when hidden during its fade-out', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.setRain(true);
  const context = h.contexts[0]; context.currentTime = 3;
  const rain = h.transients(); h.api.setRain(false); h.game.events.emit('hidden'); await settle();
  h.timers.shift().fn(); for (const source of rain) assert.equal(source.stops.length, 0);
  h.game.events.emit('visible'); await settle(); context.currentTime = 4.5;
  h.timers.shift().fn(); for (const source of rain) { assert.equal(source.stops.length, 1); assert.equal(source.disconnects, 1); }
});

test('terminal game destruction disposes music, active and fading rain, speech and SFX without recurring cleanup timers', async () => {
  const h = harness(); const lifecycle = h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playTrack('stage2');
  await h.decode('music-stage2'); const context = h.contexts[0]; context.currentTime = 1;
  h.api.playTrack('boss2', { fade: 1.2 }); await h.decode('music-boss2');
  h.api.setRain(true); context.currentTime = 1.4; h.api.setRain(false); h.api.setRain(true);
  h.api.say('byar_mid_01'); await h.decode('byar_mid_01'); h.api.sfx.jump();
  const sources = h.transients(), queuedCallbacks = h.timers.map(t => t.fn);
  assert.equal(h.timers.length, 2, 'outgoing music and old rain have pending cleanup');
  h.game.events.emit('hidden'); await settle(); h.game.events.emit('destroy'); lifecycle.destroy(); await settle();
  assert.equal(context.state, 'closed'); assert.equal(context.closeCalls, 1); assert.equal(h.timers.length, 0);
  assert.equal(h.api.musicState().current, null); assert.equal(h.api.musicState().decoded.length, 0);
  for (const source of sources) {
    assert.equal(source.stops.at(-1).length, 0, `${source.kind} stopped immediately`);
    assert.equal(source.disconnects, 1, `${source.kind} disconnected once`);
  }
  for (const node of h.nodes) assert.equal(node.disconnects, 1, `${node.kind} graph node released`);
  // A callback already queued by the browser must not recreate its timer.
  for (const callback of queuedCallbacks) callback();
  assert.equal(h.timers.length, 0); assert.equal(h.transients().length, sources.length);
});

test('terminal destruction releases the streamed media source as well as closing its context', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playMusic();
  const el = h.media[0], source = h.nodes.find(n => n.kind === 'media'); h.game.events.emit('destroy'); await settle();
  assert.equal(el.paused, true); assert.equal(el.sourceRemoved, true); assert.equal(el.loads, 1);
  assert.equal(source.disconnects, 1); assert.equal(h.contexts[0].state, 'closed');
});

test('a music decode from a destroyed game cannot start an orphan source in a new game selecting the same track', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playTrack('stage2'); await settle();
  const oldDecode = h.decodes.get('music-stage2'); assert.ok(oldDecode);
  h.game.events.emit('destroy'); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.playTrack('stage2'); await settle();
  assert.equal(h.contexts.length, 2); assert.notEqual(h.decodes.get('music-stage2'), oldDecode);
  oldDecode.resolve({ id: 'stale-music-stage2', duration: 70 }); await settle();
  assert.equal(h.transients().length, 0, 'stale decode stays stopped');
  await h.decode('music-stage2', 70);
  assert.equal(h.transients().length, 1); assert.equal(h.transients()[0].buffer.id, 'music-stage2');
  assert.equal(h.contexts[1].state, 'running');
});

test('destroying before a voice fetch decodes cannot revive speech or touch a missing audio context', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock(); h.api.say('byar_mid_01');
  h.game.events.emit('destroy'); await h.decode('byar_mid_01');
  assert.equal(h.voices().length, 0); assert.equal(h.contexts[0].state, 'closed'); assert.equal(h.timers.length, 0);
});

test('destroying an untouched game does not initialize audio just to dispose it', () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.game.events.emit('destroy');
  assert.equal(h.contexts.length, 0); assert.equal(h.timers.length, 0); assert.equal(h.media.length, 0);
});
