// Production audio module with deterministic WebAudio/HTMLAudio stubs. These are
// lifecycle checks, not a listening test or a claim about physical-device audio.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { audioParam } from './audio-param.mjs';

const source = readFileSync(new URL('../../src/audio.js', import.meta.url), 'utf8');
export const settle = () => new Promise(resolve => setImmediate(resolve));

export function harness({ mediaSourceFails = false, resumeFails = false, contextState = 'running', decodeReturnsPromise = false, initiallyHidden = false, suspendFails = false } = {}) {
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

