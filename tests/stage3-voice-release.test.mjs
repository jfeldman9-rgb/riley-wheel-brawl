// Stage switches must drop the other stage's decoded voice lines.
import test from 'node:test';
import assert from 'node:assert/strict';

function node() {
  const self = {
    gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
    frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() { return self; }, disconnect() {}, start() {}, stop() {},
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
  decodeAudioData(_bytes, ok) { const buf = { duration: 0.2 }; ok?.(buf); return Promise.resolve(buf); }
  suspend() { return Promise.resolve(); }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

async function flush() {
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
}

test('switching stages releases the other stage\'s voice clips and keeps them released', async () => {
  globalThis.location = { search: '' };
  globalThis.document = { hidden: false, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  globalThis.window = { devicePixelRatio: 1, AudioContext: FakeAudioContext };
  globalThis.Phaser = { Scene: class {}, BlendModes: { ADD: 1 }, Renderer: { WebGL: { RenderNodes: { SubmitterQuad: class { setRenderOptions() {} } } } } };
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array(8).buffer });

  const { preloadClips, residentClipIds } = await import('../src/audio.js');
  const { Stage1 } = await import('../src/stage1.js');
  const { STAGE2_VOICES } = await import('../src/stage2.js');
  const { STAGE3_VOICES } = await import('../src/stage3.js');

  preloadClips(STAGE2_VOICES);
  preloadClips(STAGE3_VOICES);
  await flush();
  const before = new Set(residentClipIds());
  for (const id of STAGE2_VOICES) assert.equal(before.has(id), true, `${id} was not cached`);
  for (const id of STAGE3_VOICES) assert.equal(before.has(id), true, `${id} was not cached`);

  const scene = {
    textures: { exists: () => false, remove() {} },
    anims: { exists: () => false, remove() {} },
    cache: { json: { get: () => ({ pages: [], anims: [] }) } },
  };
  const release = (to, from) => Stage1.prototype.releaseStage.call(scene, to, from);
  release(3, 2);
  await flush();
  const onStage3 = new Set(residentClipIds());
  for (const id of STAGE2_VOICES) assert.equal(onStage3.has(id), false, `${id} stayed resident on stage 3`);
  for (const id of STAGE3_VOICES) assert.equal(onStage3.has(id), true, `${id} was dropped while staying on stage 3`);

  release(1, 3);
  await flush();
  const onStage1 = new Set(residentClipIds());
  for (const id of [...STAGE2_VOICES, ...STAGE3_VOICES]) assert.equal(onStage1.has(id), false, `${id} stayed resident on stage 1`);
  assert.equal(residentClipIds().length, before.size - STAGE2_VOICES.length - STAGE3_VOICES.length);
});
