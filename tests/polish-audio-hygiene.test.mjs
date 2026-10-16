// Job 3 (audio & hygiene) regression checks: non-finite synth params must never
// reach an AudioParam ramp, and the ribbon/thorn actions that play a cue in
// Stages 2-3 must not be silent in Stages 4-6.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { audioParam } from './helpers/audio-param.mjs';

const src = name => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');

function harness() {
  const nodes = [], contexts = [], gestures = new EventEmitter();
  const param = (v = 0) => audioParam(v, () => contexts.at(-1).currentTime);
  const node = kind => {
    const n = { kind, gain: param(1), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(),
      connect() {}, disconnect() {}, start() {}, stop() {} };
    nodes.push(n); return n;
  };
  class AudioContext {
    constructor() { this.currentTime = 0; this.sampleRate = 24; this.state = 'running'; this.destination = {}; contexts.push(this); }
    createGain() { return node('gain'); } createDynamicsCompressor() { return node('compressor'); }
    createOscillator() { return node('oscillator'); } createBufferSource() { return node('buffer'); } createBiquadFilter() { return node('filter'); }
    createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) }; }
    resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); }
  }
  const api = vm.runInNewContext(`${src('audio').replace(/^export /gm, '')}\n({ tone, noise, unlock })`, {
    window: { AudioContext, addEventListener: gestures.on.bind(gestures), removeEventListener: gestures.off.bind(gestures) },
    document: { hidden: false }, setTimeout, clearTimeout, fetch: async () => ({ ok: false }),
  });
  return { api, nodes };
}

test('tone/noise never schedule a non-finite AudioParam value', () => {
  const { api, nodes } = harness(); api.unlock();
  assert.doesNotThrow(() => api.tone({ f0: NaN, f1: NaN, vol: NaN, dur: NaN, delay: NaN, attack: NaN }));
  assert.doesNotThrow(() => api.noise({ f0: Infinity, f1: -Infinity, vol: NaN, dur: NaN, delay: NaN, q: NaN }));
  assert.doesNotThrow(() => api.tone({ f0: 440, f1: 220, vol: 0.2, dur: 0.1 }));
  for (const n of nodes) for (const p of [n.gain, n.frequency]) for (const [, v] of p.events) assert.ok(Number.isFinite(v), `${n.kind} scheduled ${v}`);
});

test('Stages 4-6 ribbon drop/collect play the Stage 2 fall/pickup cues', () => {
  for (const name of ['stage4', 'stage5', 'stage6']) {
    const body = src(name);
    assert.match(body, /dropRibbon\(\) \{[\s\S]{0,500}?sfx\.fall\(\)/, name);
    assert.match(body, /collectRibbon\([^)]*\) \{[\s\S]{0,200}?sfx\.pickup\(\)/, name);
  }
});

test('Stage 5 thorn ticks play the existing thornPulse cue', () => {
  assert.match(src('stage5'), /onThorn\(\) \{[\s\S]{0,120}?cue\('thornPulse'\)/);
  assert.ok(src('stage5-sfx').includes('thornPulse:'));
});

test('Stage 5 music tracks are registered once (in audio.js)', () => {
  assert.ok(!src('stage5').includes('MUSIC.stage5 ='));
  assert.ok(!src('stage5').includes('MUSIC.boss5 ='));
});
