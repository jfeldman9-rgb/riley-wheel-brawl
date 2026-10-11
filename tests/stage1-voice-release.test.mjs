// Twix and power-up lines are freed when a run leaves Stage 1. Restarts keep them, a later drop or say loads them
// again and they still play, and a line that is playing or waiting to play is never freed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';

// The simulation helper sets the window/Phaser globals. Add the WebAudio context and fetch that real clip loads need.
const fetched = [], started = [], sources = [];
function node() {
  const self = {
    gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
    frequency: { value: 440, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
    connect() { return self; }, disconnect() {}, start() {}, stop() {},
  };
  return self;
}
class FakeAudioContext {
  // A real clock: audio fade timers poll currentTime, and a frozen clock would keep the process alive forever.
  constructor() { this.t0 = performance.now(); this.state = 'running'; this.sampleRate = 8000; this.destination = {}; }
  get currentTime() { return (performance.now() - this.t0) / 1000; }
  createGain() { return node(); }
  createDynamicsCompressor() { const n = node(); n.threshold = n.knee = n.ratio = n.attack = n.release = { value: 0 }; return n; }
  createOscillator() { return node(); }
  createBufferSource() { const n = node(); n.start = () => started.push(n.buffer?.id); sources.push(n); return n; }
  createBiquadFilter() { const n = node(); n.Q = { value: 1 }; return n; }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  decodeAudioData(bytes, ok) { ok({ id: bytes.id, duration: 1 }); }
  suspend() { return Promise.resolve(); }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
globalThis.window.AudioContext = FakeAudioContext;
// Stage 1 starts its stream music, which needs an HTMLAudio element. Playback is stubbed; the element is never heard.
globalThis.Audio = class { constructor(url) { this.url = url; this.paused = true; this.currentTime = 0; this.volume = 1; this.muted = false; } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } };
globalThis.fetch = async url => {
  const id = url.match(/([^/]+)\.mp3$/)[1]; fetched.push(id);
  return { ok: true, arrayBuffer: async () => ({ id }) };
};

const { Stage1 } = await import('../src/stage1.js');
const { residentClipIds, say } = await import('../src/audio.js');
const { POWERS } = await import('../src/powers.js');
const { TWIX_SCRIPT } = await import('../src/twix.js');

const DROPS = ['angreal', 'saangreal', 'lightning', 'fireshield', 'airwhip', 'twix'];
const TWIX = ['riley_twix_01', ...TWIX_SCRIPT.map(l => l.id)];
const EXTRA = [...TWIX, ...Object.values(POWERS).map(p => p.voice).filter(Boolean)];
const resident = id => residentClipIds().includes(id);
const dt = 1 / 60;

async function flush() { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); }
// Stage1.releaseStage on a scene stub with no textures to remove, as in stage3-voice-release.
const scene = { textures: { exists: () => false, remove() {} }, anims: { exists: () => false, remove() {} }, cache: { json: { get: () => ({ pages: [], anims: [] }) } } };
const release = to => Stage1.prototype.releaseStage.call(scene, to);
async function run() {
  const h = stage1Simulation({ mode: null });
  for (let f = 0; f < 30; f++) h.step(dt);
  assert.equal(h.s.started, true);
  await flush();
  return h;
}
const drop = (h, kind) => h.s.dropPickup(h.s.riley.x, h.s.riley.y, kind);

test('leaving Stage 1 frees every Twix and power-up line but keeps the shared Stage 1 narration', async () => {
  const h = await run();
  for (const kind of DROPS) drop(h, kind);
  await flush();
  for (const id of EXTRA) assert.equal(resident(id), true, `${id} loads when dropped`);
  release(2);
  for (const id of EXTRA) assert.equal(resident(id), false, `${id} freed when leaving Stage 1`);
  assert.equal(resident('st1_narrator_01'), true, 'shared Stage 1 narration stays resident');
  h.destroy();
});

test('a Stage 1 restart keeps the lines, and a later run loads them again and they still play', async () => {
  const h = await run();
  drop(h, 'twix'); await flush();
  const loads = fetched.length;
  release(1); // continue or restart inside Stage 1
  for (const id of TWIX) assert.equal(resident(id), true, `${id} kept on restart`);
  drop(h, 'twix'); await flush();
  assert.equal(fetched.length, loads, 'a restart re-uses the resident lines');
  release(2); // the run ends
  for (const id of TWIX) assert.equal(resident(id), false, `${id} freed`);
  const playsBefore = started.length;
  drop(h, 'twix'); await flush();
  for (const id of TWIX) assert.equal(resident(id), true, `${id} loads again when dropped`);
  say('riley_twix_01'); await flush();
  assert.ok(started.slice(playsBefore).includes('riley_twix_01'), 'the reloaded Twix line plays');
  h.destroy();
});

test('a line that is waiting to play or still playing survives a stage release until it ends', async () => {
  const h = await run();
  drop(h, 'angreal'); await flush(); release(2);
  assert.equal(resident('riley_angreal_01'), false);
  const playsBefore = started.length;
  say('riley_angreal_01'); // requested, the download has not settled yet
  release(2);
  assert.equal(resident('riley_angreal_01'), true, 'a pending line is kept');
  await flush();
  const voice = sources.filter(n => n.buffer?.id === 'riley_angreal_01').at(-1);
  assert.ok(started.slice(playsBefore).includes('riley_angreal_01'), 'the pending line still plays');
  release(2);
  assert.equal(resident('riley_angreal_01'), true, 'a playing line is kept');
  voice.onended();
  release(2);
  assert.equal(resident('riley_angreal_01'), false, 'a finished line is freed');
  h.destroy();
});

test('ending the run mid-line stops the speech, and the stage release then frees the line', async () => {
  const h = await run();
  drop(h, 'twix'); await flush();
  say('riley_twix_01'); await flush();
  assert.equal(resident('riley_twix_01'), true);
  h.destroy(); // scene shutdown runs stopSceneAudio before the next scene preloads
  release(2);
  assert.equal(resident('riley_twix_01'), false);
});
