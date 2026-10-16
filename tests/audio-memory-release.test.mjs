// Compressed music is released after decode, and Twix / power-up lines are released with the stage.
// Playback that is already sounding or queued is left alone; a later drop or restart can load it again.
import test from 'node:test';
import assert from 'node:assert/strict';

const fetches = [];
const waits = [];
const voices = [];
const musicSources = [];
let hold = false;

function node() {
  const self = {
    gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
    frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() { return self; },
    disconnect() { self.disconnects = (self.disconnects || 0) + 1; },
    start() {
      self.starts = (self.starts || 0) + 1;
      if (self.buffer) (String(self.buffer.id).startsWith('music-') ? musicSources : voices).push(self);
    },
    stop() { self.stops = (self.stops || 0) + 1; },
  };
  return self;
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 8000; this.destination = {}; }
  createGain() { return node(); }
  createDynamicsCompressor() {
    const n = node();
    n.threshold = n.knee = n.ratio = n.attack = n.release = { value: 0 };
    return n;
  }
  createOscillator() { return node(); }
  createBufferSource() { return node(); }
  createBiquadFilter() { const n = node(); n.Q = { value: 1 }; return n; }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  createMediaElementSource() { return node(); }
  decodeAudioData(bytes, ok, fail) {
    const buf = { id: bytes.id, duration: 0.4 };
    if (!hold) { ok?.(buf); return Promise.resolve(buf); }
    waits.push({ id: bytes.id, ok: () => ok?.(buf), fail: () => fail?.() });
    return new Promise(() => {});
  }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
class FakeAudio {
  constructor(url) { this.url = url; this.paused = true; this.currentTime = 0; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute() {}
  load() {}
}
function emitter() {
  const map = new Map();
  return {
    on(name, fn) { const list = map.get(name) || []; list.push(fn); map.set(name, list); },
    off(name, fn) { const list = map.get(name) || []; const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); },
    emit(name) { for (const fn of [...(map.get(name) || [])]) fn(); },
  };
}
function count(id) { return fetches.filter(item => item === id).length; }
function takeWait(id) {
  const i = waits.findIndex(item => item.id === id);
  assert.ok(i >= 0, `decode queued for ${id}`);
  return waits.splice(i, 1)[0];
}
async function flush() {
  for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
}

globalThis.location = { search: '' };
globalThis.document = { hidden: false, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
globalThis.window = {
  devicePixelRatio: 1,
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  addEventListener() {},
  removeEventListener() {},
};
globalThis.Audio = FakeAudio;
globalThis.Phaser = { Scene: class {}, BlendModes: { ADD: 1 }, Renderer: { WebGL: { RenderNodes: { SubmitterQuad: class { setRenderOptions() {} } } } } };
globalThis.fetch = async url => {
  const id = String(url).match(/([^/]+)\.mp3$/)[1];
  fetches.push(id);
  return { ok: true, arrayBuffer: async () => ({ id }) };
};

const { preloadClips, releaseClips, residentClipIds, say, playTrack, musicState, unlock, installAudioLifecycle, stopSceneAudio } = await import('../src/audio.js');
const { Stage1 } = await import('../src/stage1.js');
const { STAGE2_VOICES } = await import('../src/stage2.js');
const { STAGE3_VOICES } = await import('../src/stage3.js');
const { POWERS } = await import('../src/powers.js');
const { TWIX_SCRIPT } = await import('../src/twix.js');
await flush();

const POWER_IDS = ['riley_angreal_01', 'riley_saangreal_01', 'riley_lightning_01', 'riley_fireshield_01', 'riley_airwhip_01'];
const TWIX_IDS = ['riley_twix_01', ...TWIX_SCRIPT.map(line => line.id)];
const DROP_IDS = [...TWIX_IDS, ...POWER_IDS];

let game, life;
function scene() {
  return {
    textures: { exists: () => false, remove() {} },
    anims: { exists: () => false, remove() {} },
    cache: { json: { get: () => ({ pages: [], anims: [] }) } },
  };
}
function release(to, from) { Stage1.prototype.releaseStage.call(scene(), to, from); }
function sprite() {
  const box = {};
  for (const key of ['setBlendMode', 'setScale', 'setTint', 'setDepth', 'setPosition', 'setAlpha']) box[key] = () => box;
  return box;
}
function pickupScene() {
  return {
    ...scene(),
    add: { image: () => sprite() },
    lights: { addLight: () => ({}) },
    pickups: [],
    powers: { dropped: [] },
    twixDropped: false,
  };
}
function playing(id) { return voices.filter(source => source.buffer?.id === id && source.starts); }
function playingMusic(id) { return musicSources.filter(source => source.buffer?.id === id && source.starts); }

async function reset() {
  if (game) { game.events.emit('destroy'); life.destroy(); }
  await flush();
  hold = false;
  waits.length = 0; voices.length = 0; musicSources.length = 0; fetches.length = 0;
  game = { events: emitter() };
  life = installAudioLifecycle(game);
  unlock();
  await flush();
}

test('decoded music drops its compressed fetch and can be decoded again after eviction', async () => {
  await reset();
  hold = true;
  playTrack('title', { fade: 0 });
  playTrack('title', { fade: 0 });
  await flush();
  assert.equal(count('music-title'), 1, 'in-flight decode shares one fetch');
  assert.ok(musicState().compressed.includes('title'));
  takeWait('music-title').ok();
  await flush();
  assert.equal(playingMusic('music-title').length, 1);
  assert.ok(musicState().decoded.includes('title'));
  assert.ok(!musicState().compressed.includes('title'), 'compressed bytes released after decode');

  playTrack('stage2', { fade: 0 });
  await flush(); takeWait('music-stage2').ok(); await flush();
  assert.deepEqual(musicState().decoded, ['stage2'], 'the stopped track buffer is freed once its source has stopped');
  playTrack('boss2', { fade: 0 });
  await flush(); takeWait('music-boss2').ok(); await flush();
  assert.ok(!musicState().decoded.includes('title'), 'oldest decoded track was evicted');
  assert.deepEqual(musicState().compressed, [], 'settled tracks keep no compressed buffer');

  const before = count('music-title');
  playTrack('title', { fade: 0 });
  playTrack('title', { fade: 0 });
  await flush();
  assert.equal(count('music-title'), before + 1, 'evicted track refetches once');
  assert.ok(musicState().compressed.includes('title'));
  takeWait('music-title').ok();
  await flush();
  assert.equal(playingMusic('music-title').length, 2, 'evicted track plays again');
  assert.ok(musicState().decoded.includes('title'));
  assert.ok(!musicState().compressed.includes('title'));
});

test('a failed music decode releases the compressed buffer and a later play fetches again', async () => {
  await reset();
  hold = true;
  playTrack('boss3', { fade: 0 });
  await flush();
  takeWait('music-boss3').fail();
  await flush();
  assert.ok(!musicState().compressed.includes('boss3'));
  assert.ok(!musicState().decoded.includes('boss3'));
  playTrack('boss3', { fade: 0 });
  await flush();
  assert.equal(count('music-boss3'), 2);
  takeWait('music-boss3').ok();
  await flush();
  assert.equal(playingMusic('music-boss3').length, 1);
  assert.ok(!musicState().compressed.includes('boss3'));
});

test('a stale music decode cannot drop the compressed fetch of a new context', async () => {
  await reset();
  hold = true;
  playTrack('stage2', { fade: 0 });
  await flush();
  const stale = takeWait('music-stage2');
  game.events.emit('destroy'); life.destroy();
  await flush();
  assert.deepEqual(musicState().compressed, []);
  game = { events: emitter() };
  life = installAudioLifecycle(game);
  unlock();
  playTrack('stage2', { fade: 0 });
  await flush();
  assert.equal(count('music-stage2'), 2);
  assert.ok(musicState().compressed.includes('stage2'));
  stale.ok();
  await flush();
  assert.equal(playingMusic('music-stage2').length, 0, 'stale decode stays stopped');
  assert.ok(musicState().compressed.includes('stage2'), 'stale epoch must not delete the new fetch');
  takeWait('music-stage2').ok();
  await flush();
  assert.equal(playingMusic('music-stage2').length, 1);
  assert.ok(!musicState().compressed.includes('stage2'));
});

test('leaving a stage releases idle Twix and power-up clips and keeps the stage lines that stay', async () => {
  await reset();
  assert.deepEqual(POWER_IDS, Object.values(POWERS).map(power => power.voice).filter(Boolean));
  preloadClips(DROP_IDS);
  preloadClips(STAGE2_VOICES);
  preloadClips(STAGE3_VOICES);
  say('riley_combo_01');
  await flush();
  for (const id of [...DROP_IDS, ...STAGE2_VOICES, ...STAGE3_VOICES]) assert.ok(residentClipIds().includes(id), id);
  release(2, 1);
  const onStage2 = new Set(residentClipIds());
  for (const id of DROP_IDS) assert.equal(onStage2.has(id), false, `${id} stayed after leaving stage 1`);
  for (const id of STAGE2_VOICES) assert.equal(onStage2.has(id), true, `${id} was dropped while staying on stage 2`);
  for (const id of STAGE3_VOICES) assert.equal(onStage2.has(id), false, `${id} stayed on stage 2`);
  assert.equal(onStage2.has('riley_combo_01'), true, 'shared Stage 1 lines stay cached');
  preloadClips(STAGE3_VOICES);
  await flush();
  release(3, 2);
  const onStage3 = new Set(residentClipIds());
  for (const id of STAGE3_VOICES) assert.equal(onStage3.has(id), true, id);
  for (const id of STAGE2_VOICES) assert.equal(onStage3.has(id), false, id);
  for (const id of DROP_IDS) assert.equal(onStage3.has(id), false, id);
});

test('a stage restart frees idle drop clips, and the next drop plays them again', async () => {
  await reset();
  const board = pickupScene();
  Stage1.prototype.dropPower.call(board, 100, 600, 'twix');
  Stage1.prototype.dropPower.call(board, 140, 600, 'angreal');
  await flush();
  for (const id of [...TWIX_IDS, 'riley_angreal_01']) assert.equal(count(id), 1, id);
  Stage1.prototype.dropPower.call(board, 180, 600, 'angreal');
  await flush();
  assert.equal(count('riley_angreal_01'), 1, 'a second drop on the same visit reuses the clip');
  release(1, 1);
  for (const id of DROP_IDS) assert.equal(residentClipIds().includes(id), false, id);
  Stage1.prototype.dropPower.call(board, 200, 600, 'twix');
  Stage1.prototype.dropPower.call(board, 220, 600, 'lightning');
  await flush();
  for (const id of TWIX_IDS) assert.equal(count(id), 2, `${id} reloaded after restart`);
  assert.equal(count('riley_lightning_01'), 1);
  say('riley_twix_01');
  say('riley_lightning_01');
  await flush();
  assert.equal(playing('riley_lightning_01').length, 1, 'power line plays after a restart preload');
  assert.equal(count('riley_twix_01'), 2);
});

test('continue keeps drop clips cached so the next line does not refetch', async () => {
  await reset();
  preloadClips(['riley_airwhip_01', 'riley_twix_01']);
  await flush();
  Stage1.prototype.continueGame.call({
    riley: { lives: 1, score: 8, respawn() {}, x: 20, facing: 1 },
    hud: { hideGameOver() {} },
    music: { resumeFight() {} },
    gameOver: true,
  });
  assert.ok(residentClipIds().includes('riley_airwhip_01'));
  assert.ok(residentClipIds().includes('riley_twix_01'));
  say('riley_airwhip_01');
  await flush();
  assert.equal(count('riley_airwhip_01'), 1);
  assert.equal(playing('riley_airwhip_01').length, 1);
});

test('a drop line that is about to play or still playing is not freed until it ends', async () => {
  await reset();
  hold = true;
  say('riley_fireshield_01');
  await flush();
  assert.equal(count('riley_fireshield_01'), 1);
  release(4, 1);
  assert.ok(residentClipIds().includes('riley_fireshield_01'), 'queued line stays until it can play');
  takeWait('riley_fireshield_01').ok();
  await flush();
  const live = playing('riley_fireshield_01');
  assert.equal(live.length, 1);
  assert.equal(live[0].stops || 0, 0);
  release(1, 4);
  assert.ok(residentClipIds().includes('riley_fireshield_01'), 'playing line stays resident');
  assert.equal(live[0].stops || 0, 0, 'release does not stop the line');
  say('riley_fireshield_01');
  await flush();
  assert.equal(count('riley_fireshield_01'), 1, 'a replay of the live line does not refetch');
  const again = playing('riley_fireshield_01').at(-1);
  assert.notEqual(again, live[0]);
  assert.equal(again.stops || 0, 0);
  assert.ok(residentClipIds().includes('riley_fireshield_01'));
  again.onended();
  assert.ok(!residentClipIds().includes('riley_fireshield_01'), 'line is freed once it ends');
  hold = false;
  say('riley_fireshield_01');
  await flush();
  assert.equal(count('riley_fireshield_01'), 2, 'the line can play again after it was freed');
  assert.equal(playing('riley_fireshield_01').length, 3);
});

test('shutdown then stage release drops a queued drop line, and a later say still plays', async () => {
  await reset();
  hold = true;
  say('twix_09');
  await flush();
  stopSceneAudio();
  takeWait('twix_09').ok();
  await flush();
  assert.equal(playing('twix_09').length, 0, 'shutdown cancels the queued line');
  release(2, 1);
  assert.ok(!residentClipIds().includes('twix_09'));
  hold = false;
  say('twix_09');
  await flush();
  assert.equal(count('twix_09'), 2);
  assert.equal(playing('twix_09').length, 1);
});

test('releaseClips still drops an idle stage line and leaves a queued one until shutdown', async () => {
  await reset();
  hold = true;
  preloadClips(['st2_story_01']);
  say('byar_intro_01');
  await flush();
  releaseClips(STAGE2_VOICES);
  assert.ok(!residentClipIds().includes('st2_story_01'));
  assert.ok(residentClipIds().includes('byar_intro_01'));
  stopSceneAudio();
  takeWait('byar_intro_01').ok();
  await flush();
  assert.equal(playing('byar_intro_01').length, 0);
  assert.ok(!residentClipIds().includes('byar_intro_01'));
});
