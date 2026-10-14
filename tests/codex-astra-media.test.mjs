import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
const decodes = new Map(), sources = [];
let context;
function node() {
  const n = { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() { return n; }, disconnect() { this.disconnected = true; }, start() { sources.push(this); }, stop() { this.stopped = true; } };
  return n;
}
class Context {
  constructor() { context = this; this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createGain() { return node(); }
  createDynamicsCompressor() { const n = node(); for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = { value: 0 }; return n; }
  createBufferSource() { return node(); }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  decodeAudioData(bytes, ok) { decodes.set(bytes.id, () => ok({ id: bytes.id, duration: 72 })); return new Promise(() => {}); }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
globalThis.window.AudioContext = Context;
globalThis.fetch = async url => ({ ok: true, arrayBuffer: async () => ({ id: String(url).match(/music-([^.]+)\.mp3/)[1] }) });
globalThis.document = { hidden: false };
globalThis.Audio = class { constructor() { this.paused = true; this.currentTime = 0; } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } removeAttribute() {} load() {} };
const audio = await import('../src/audio.js');
const { CutscenePlayer } = await import('../src/cutscene.js');
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
let game, lifecycle;
async function reset() {
  if (game) { game.events.emit('destroy'); lifecycle.destroy(); }
  decodes.clear(); sources.length = 0;
  game = { events: new EventEmitter() }; lifecycle = audio.installAudioLifecycle(game);
  audio.unlock(); await flush(); audio.playTrack(null, { fade: 0 });
  if (audio.isMuted()) audio.toggleMute();
}
const ids = ['title', 'boss1', 'stage2', 'boss2', 'stage3'];
for (const order of [ids, [...ids].reverse(), ['boss2', 'title', 'stage3', 'boss1', 'stage2']]) test(`obsolete delayed music decodes are discarded in order ${order.join(',')}`, async () => {
  await reset();
  for (const id of ids) audio.playTrack(id, { fade: 0 });
  await flush();
  for (const id of order) { assert.ok(decodes.has(id)); decodes.get(id)(); await flush(); assert.ok(audio.musicState().decoded.length <= 2); }
  assert.deepEqual(audio.musicState().decoded, ['stage3']);
  assert.deepEqual(sources.filter(s => s.buffer?.id).map(s => s.buffer.id), ['stage3']);
  assert.deepEqual(audio.musicState().compressed, []);
});
test('late decode eviction preserves a sounding crossfade until its source stops', async () => {
  await reset();
  audio.playTrack('title', { fade: 0 }); await flush(); decodes.get('title')(); await flush();
  const outgoing = sources.find(s => s.buffer?.id === 'title');
  audio.playTrack('boss1', { fade: 0.001 }); await flush();
  decodes.get('boss1')(); await flush();
  assert.equal(outgoing.stopped, undefined);
  assert.deepEqual(new Set(audio.musicState().decoded), new Set(['title', 'boss1']));
  context.currentTime = 1;
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(outgoing.stopped, true); assert.equal(outgoing.disconnected, true);
  assert.deepEqual(audio.musicState().decoded, ['boss1']);
});
test('music toggle and scene exit prevent abandoned late buffers from playing or staying resident', async () => {
  await reset();
  for (const id of ids) audio.playTrack(id, { fade: 0 });
  await flush(); audio.toggleMusic(); audio.playTrack(null, { fade: 0 });
  for (const id of ids) decodes.get(id)(); await flush();
  assert.equal(sources.filter(s => s.buffer?.id).length, 0);
  assert.ok(audio.musicState().decoded.length <= 1);
  audio.toggleMusic(); audio.playTrack(null, { fade: 0 });
  assert.deepEqual(audio.musicState().decoded, []);
});

class Element extends EventEmitter {
  constructor(tag) { super(); this.tag = tag; this.style = {}; this.children = []; this.paused = true; this.ended = false; this.currentTime = 0; this.muted = false; }
  setAttribute() {} removeAttribute(k) { this[k] = ''; }
  appendChild(c) { this.children.push(c); }
  remove() { this.removed = true; }
  addEventListener(e, fn) { this.on(e, fn); } removeEventListener(e, fn) { this.off(e, fn); }
  play() { this.plays = (this.plays || []).concat(this.muted); this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; } load() {}
}
function media() {
  let now = 0, tick;
  const doc = new Element('document'); doc.hidden = false; doc.body = new Element('body'); doc.createElement = tag => new Element(tag);
  const root = { document: doc, navigator: {}, performance: { now: () => now }, setInterval(fn) { tick = fn; return 1; }, clearInterval() { tick = null; } };
  const p = new CutscenePlayer(root);
  return { p, doc, setTime(t) { now = t; }, tick() { tick?.(); }, hide() { doc.hidden = true; doc.emit('visibilitychange'); }, show() { doc.hidden = false; doc.emit('visibilitychange'); } };
}
for (const hiddenTicks of [false, true]) test(`video watchdog excludes 60 seconds hidden ${hiddenTicks ? 'with timer ticks' : 'with suspended timers'}`, () => {
  const e = media(), done = [];
  const h = e.p.play(['stage2'], { done: how => done.push(how) });
  e.setTime(1000); e.p.video.currentTime = 1; e.tick();
  e.hide();
  e.setTime(61000); if (hiddenTicks) e.tick();
  e.show(); e.tick();
  assert.equal(h.active, true); assert.deepEqual(done, []);
  assert.equal(e.p.run.clipT0, 60000);
  e.setTime(63250); e.tick(); assert.equal(h.active, true, 'visible stall allowance remains');
  e.setTime(64250); e.tick(); assert.equal(h.active, false, 'visible stalls still terminate');
  assert.deepEqual(done, ['end']); assert.equal(e.doc.listenerCount('visibilitychange'), 0);
});
test('N mute applies to ordinary and Rand video players, including new clips and gesture blessing', async () => {
  await reset(); audio.toggleMute();
  const ordinary = media(), rand = media();
  const handles = [ordinary.p.play(['stage2', 'stage3']), rand.p.play(['R1'])];
  for (const e of [ordinary, rand]) {
    assert.equal(e.p.video.muted, true); assert.equal(e.p.video.plays[0], true);
    e.p.bless(); assert.equal(e.p.video.muted, true);
    e.p.run.muted = true; e.p.bless(); assert.equal(e.p.video.muted, true, 'blessing clears autoplay fallback without overriding user mute');
  }
  audio.toggleMute();
  assert.equal(ordinary.p.video.muted, false); assert.equal(rand.p.video.muted, false);
  audio.toggleMute(); ordinary.p.video.emit('ended');
  assert.equal(ordinary.p.video.muted, true, 'the next clip inherits mute');
  for (const h of handles) h.abort();
  audio.toggleMute();
  assert.equal(ordinary.p.video.muted, true, 'disposed players no longer subscribe');
  game.events.emit('destroy'); lifecycle.destroy();
});
