import test from 'node:test';
import assert from 'node:assert/strict';
import { kissScene } from './helpers/stage4-hardening-scene.mjs';
import { EventEmitter } from 'node:events';
import { stopSceneAudio, installAudioLifecycle } from '../src/audio.js';

const audioGame = { events: new EventEmitter() };
installAudioLifecycle(audioGame);
const nodes = [], originalFetch = globalThis.fetch;
const param = () => ({ value: 0, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
const node = () => {
  const n = { gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } };
  nodes.push(n); return n;
};
window.AudioContext = class {
  constructor() { this.currentTime = 0; this.sampleRate = 24; this.state = 'running'; this.destination = {}; }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createGain() { return node(); } createDynamicsCompressor() { return node(); }
  createBufferSource() { return node(); } createOscillator() { return node(); } createBiquadFilter() { return node(); }
  createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  decodeAudioData(_bytes, resolve) { resolve({ duration: 3, id: _bytes.id }); }
};
globalThis.fetch = async url => ({ ok: true, arrayBuffer: async () => ({ id: url }) });
const settle = () => new Promise(resolve => setImmediate(resolve));
for (const exit of ['cancel', 'actor destroy', 'actor dispose', 'clear hazards', 'defeat', 'shutdown', 'pause']) test(`croon hum stops on ${exit}`, async () => {
  const c = kissScene();
  try {
    c.d.state = 'grounded'; c.d.kissBetweenAction = false; c.d.croonIn = 0;
    c.d.update(1 / 60); assert.equal(c.d.state, 'croon');
    await settle(); const loop = nodes.filter(n => n.loop && n.buffer?.id === 'assets/audio/voice/draghkar_croon_01.mp3' && n.started && !n.stopped);
    assert.equal(loop.length, 1);
    if (exit === 'cancel') c.d.cancelCroon();
    if (exit === 'actor destroy') c.d.destroy();
    if (exit === 'actor dispose') c.d.dispose();
    if (exit === 'clear hazards') c.s.kit.clearHazards();
    if (exit === 'defeat') c.d.defeat();
    if (exit === 'shutdown') c.s.events.emit('shutdown');
    if (exit === 'pause') c.s.kit.onPause(true);
    assert.equal(loop[0].stopped, true);
    if (exit === 'actor dispose' || exit === 'clear hazards') {
      c.s.kit.onPause(false); await settle();
      assert.equal(nodes.filter(n => n.loop && n.buffer?.id === 'assets/audio/voice/draghkar_croon_01.mp3' && n.started && !n.stopped).length, 0);
    }
    if (exit === 'pause') {
      c.s.kit.onPause(false); await settle(); assert.equal(nodes.filter(n => n.loop && n.buffer?.id === 'assets/audio/voice/draghkar_croon_01.mp3' && n.started && !n.stopped).length, 1);
    }
  } finally { c.h.destroy(); stopSceneAudio(); }
});
for (const light of ['lightning', 'fireshield', 'balefire']) test(`${light} within 400px cancels croon through the real actor`, () => {
  const c = kissScene();
  try {
    c.d.startCroon();
    if (light === 'lightning') c.s.powers.bolts = [{ L: { x: c.d.x } }];
    if (light === 'fireshield') c.s.powers.active = kind => kind === 'fireshield';
    if (light === 'balefire') c.s.beam = { x0: c.d.x - 50, dir: 1, len: 100 };
    c.d.update(1 / 60); assert.notEqual(c.d.state, 'croon'); assert.equal(c.s.kit.stats.croonCancels, 1);
  } finally {
    c.s.beam = null; c.s.powers.bolts = []; c.h.destroy(); stopSceneAudio();
  }
});
test.after(() => { audioGame.events.emit('destroy'); globalThis.fetch = originalFetch; delete window.AudioContext; });
