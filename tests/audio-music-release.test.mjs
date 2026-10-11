// Compressed music is released once a track decodes: only the in-flight load holds its bytes. An evicted track is
// downloaded again when it is selected, and a decode from a destroyed game cannot touch the next game's load.
// Production audio module with deterministic WebAudio/HTMLAudio stubs (lifecycle checks, not a listening test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';

const source = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness() {
  const nodes = [], contexts = [], fetches = [], decodes = [], failures = new Set();
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = kind => {
    const n = { kind, starts: [], connect() { return n; }, disconnect() {}, start(...args) { n.starts.push(args); }, stop() {},
      gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() };
    nodes.push(n); return n;
  };
  class AudioContext {
    constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 24; this.destination = {}; contexts.push(this); }
    createGain() { return node('gain'); }
    createDynamicsCompressor() { return node('compressor'); }
    createOscillator() { return node('oscillator'); }
    createBufferSource() { return node('buffer'); }
    createBiquadFilter() { return node('filter'); }
    createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
    decodeAudioData(bytes, resolve) { decodes.push({ id: bytes.id, resolve }); }
    suspend() { return Promise.resolve(); }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  const api = vm.runInNewContext(`${source.replace(/^export /gm, '')}\n({ unlock, playTrack, musicState, installAudioLifecycle });`, {
    window: { AudioContext, addEventListener() {}, removeEventListener() {} }, document: { hidden: false },
    setTimeout() {}, clearTimeout() {},
    fetch(url) {
      const id = url.match(/([^/]+)\.mp3$/)[1]; fetches.push(id);
      return Promise.resolve({ ok: !failures.has(id), arrayBuffer: () => Promise.resolve({ id }) });
    },
  });
  return { api, nodes, contexts, fetches, decodes, failures };
}

// Copy out of the vm realm so deepStrictEqual compares plain arrays.
const decodedTracks = h => [...h.api.musicState().decoded];
const fetched = (h, id) => h.fetches.filter(k => k === id).length;
const played = (h, id) => h.nodes.filter(n => n.kind === 'buffer' && n.buffer?.id === id && n.starts.length > 0).length;
async function decode(h, id, duration = 60) {
  await settle(); const d = h.decodes.filter(x => x.id === id).at(-1);
  assert.ok(d, `decode requested for ${id}`);
  d.resolve({ id, duration }); await settle();
}

test('a decoded track plays from its buffer without a second download', async () => {
  const h = harness(); h.api.unlock(); h.api.playTrack('boss2', { fade: 0 });
  await decode(h, 'music-boss2');
  assert.equal(fetched(h, 'music-boss2'), 1); assert.equal(played(h, 'music-boss2'), 1);
  assert.deepEqual(decodedTracks(h), ['boss2']);
});

test('a track evicted from memory is downloaded and decoded again when it is selected', async () => {
  const h = harness(); h.api.unlock();
  h.api.playTrack('stage2', { fade: 0 }); await decode(h, 'music-stage2');
  h.api.playTrack('boss2', { fade: 0 }); await decode(h, 'music-boss2');
  h.api.playTrack('stage3', { fade: 0 }); await decode(h, 'music-stage3'); // evicts stage2: stopped and not current
  assert.equal(h.api.musicState().decoded.includes('stage2'), false);
  h.api.playTrack('stage2', { fade: 0 }); await decode(h, 'music-stage2');
  assert.equal(fetched(h, 'music-stage2'), 2); assert.equal(played(h, 'music-stage2'), 2);
  assert.equal(h.api.musicState().current, 'stage2');
});

test('selecting a track again while its bytes are still loading shares the one download', async () => {
  const h = harness(); h.api.unlock();
  h.api.playTrack('boss3', { fade: 0 }); h.api.playTrack('boss3', { fade: 0 }); await settle();
  assert.equal(fetched(h, 'music-boss3'), 1);
  await decode(h, 'music-boss3', 60);
  assert.equal(played(h, 'music-boss3'), 1);
});

test('a failed download keeps nothing, and the next selection downloads again', async () => {
  const h = harness(); h.api.unlock(); h.failures.add('music-boss2');
  h.api.playTrack('boss2', { fade: 0 }); await settle();
  assert.equal(h.api.musicState().current, 'boss2'); assert.deepEqual(decodedTracks(h), []);
  h.failures.delete('music-boss2'); h.api.playTrack('boss2', { fade: 0 }); await decode(h, 'music-boss2');
  assert.equal(fetched(h, 'music-boss2'), 2); assert.deepEqual(decodedTracks(h), ['boss2']);
});

test('a decode that settles after the game is destroyed starts nothing and does not end the next game\'s load', async () => {
  const h = harness(), game = { events: new EventEmitter() };
  h.api.installAudioLifecycle(game); h.api.unlock(); h.api.playTrack('boss2', { fade: 0 }); await settle();
  game.events.emit('destroy');
  h.api.installAudioLifecycle(game); h.api.unlock(); h.api.playTrack('boss2', { fade: 0 }); await settle();
  const [stale, fresh] = h.decodes.filter(d => d.id === 'music-boss2');
  stale.resolve({ id: 'music-boss2', duration: 60 }); await settle();
  assert.equal(played(h, 'music-boss2'), 0, 'the stale decode starts nothing');
  h.api.playTrack('boss2', { fade: 0 }); await settle();
  assert.equal(fetched(h, 'music-boss2'), 2, 'the new game is still loading, so it does not download again');
  fresh.resolve({ id: 'music-boss2', duration: 60 }); await settle();
  assert.equal(played(h, 'music-boss2'), 1); assert.equal(h.contexts.length, 2);
});
