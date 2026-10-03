// Production audio module with deterministic WebAudio/HTMLAudio stubs. These are
// lifecycle checks, not a listening test or a claim about physical-device audio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness({ mediaSourceFails = false, resumeFails = false, contextState = 'running', decodeReturnsPromise = false } = {}) {
  const nodes = [], contexts = [], media = [], fetches = [], decodes = new Map(), failures = new Set();
  function param(value = 0) {
    return { value, events: [],
      setValueAtTime(v, t) { this.value = v; this.events.push(['set', v, t]); },
      linearRampToValueAtTime(v, t) { this.events.push(['linear', v, t]); },
      exponentialRampToValueAtTime(v, t) { this.events.push(['exponential', v, t]); },
      cancelScheduledValues(t) { this.events.push(['cancel', t]); },
    };
  }
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
    constructor() { this.currentTime = 0; this.sampleRate = 24; this.state = contextState; this.destination = {}; contexts.push(this); }
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
    resume() { return resumeFails ? Promise.reject(Error('resume blocked')) : Promise.resolve(); }
  }
  class Audio {
    constructor(url) { this.url = url; this.plays = 0; this.pauses = 0; this.volume = 1; this.muted = false; media.push(this); }
    play() { this.plays++; return Promise.resolve(); }
    pause() { this.pauses++; }
  }
  const api = vm.runInNewContext(`${source.replace(/^export /gm, '')}\n({ sfx, say, unlock, playMusic, toggleMusic, toggleMute, preloadVoices, stopSceneAudio: typeof stopSceneAudio === 'function' ? stopSceneAudio : undefined });`, {
    window: { AudioContext }, Audio,
    fetch(url) {
      const id = url.match(/([^/]+)\.mp3$/)[1]; fetches.push(id);
      return Promise.resolve({ ok: !failures.has(id), arrayBuffer: () => Promise.resolve({ id }) });
    },
  });
  return { api, nodes, contexts, media, fetches, failures,
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
  assert.equal(h.fetches.length, 20); assert.equal(new Set(h.fetches).size, 20);
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
