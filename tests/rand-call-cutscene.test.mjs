import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { q } from '../src/config.js';
import { createBag, resetRandCall, playCall, abortRandCall, prefetchRand, blobCount, dropBlob, RAND_IDS, BAG_KEY, installRandBless, removeRandBless } from '../src/rand-call-cutscene.js';
import { cutsceneWatchdog } from '../src/guard.js';

let blobN = 0;
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:rand-' + (++blobN);
  URL.revokeObjectURL = () => {};
}

class El {
  constructor(tag) { this.tag = tag; this.style = {}; this.attrs = {}; this.children = []; this.parent = null; this.ls = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; if (k === 'src') this._src = ''; }
  appendChild(c) { c.parent?.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; } }
  addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
  removeEventListener(t, f) { this.ls[t] = (this.ls[t] || []).filter(g => g !== f); }
  fire(t) { for (const f of [...(this.ls[t] || [])]) f({ type: t, preventDefault() {} }); }
}
class Video extends El {
  constructor(env) { super('video'); this.env = env; this._src = ''; this.poster = ''; this.muted = false; this.volume = 1; this.paused = true; this.ended = false; }
  get src() { return this._src; }
  set src(v) { this._src = v; this.paused = true; this.ended = false; }
  get currentTime() { return this.env.clock ? this.env.t / 1000 : 0; }
  set currentTime(v) { this._ct = v; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
}
function env() {
  const e = { t: 0, timers: new Map(), id: 0, clock: true, store: {} };
  const body = new El('body'); body.isBody = true;
  e.document = { hidden: false, body, createElement: tag => tag === 'video' ? (e.video = new Video(e)) : new El(tag) };
  e.root = {
    document: e.document, navigator: {}, console: { error() {} },
    performance: { now: () => e.t },
    setInterval: (f, ms) => { const id = ++e.id; e.timers.set(id, { f, ms, next: e.t + ms }); return id; },
    clearInterval: id => e.timers.delete(id),
    sessionStorage: { getItem: k => e.store[k] ?? null, setItem: (k, v) => { e.store[k] = String(v); } },
    fetch: () => Promise.resolve({ ok: true, blob: async () => new Blob(['rand']) }),
    innerWidth: 844, innerHeight: 390,
  };
  e.advance = ms => {
    const end = e.t + ms;
    while (true) {
      let due = null;
      for (const [id, T] of e.timers) if (T.next <= end && (!due || T.next < due[1].next)) due = [id, T];
      if (!due) break;
      e.t = due[1].next; due[1].next += due[1].ms; due[1].f();
    }
    e.t = end;
  };
  e.overlay = () => body.children.find(c => c.id === 'rwb-cutscene');
  return e;
}
function scene(e, over = {}) {
  const pauses = [];
  return {
    cutRoot: e.root, music: { state: 'stage', track: 'stage6', gainMul: 1, set(st) { this.state = st; } },
    setPauseReason(k, v) { pauses.push([k, v]); this.paused = v; },
    scene: { pause() {}, resume() {} },
    events: { once() {} },
    pauses,
    ...over,
  };
}
function clearQ() {
  for (const k of ['story', 'demo', 'autostart', 'nocutscenes', 'cutscenes', 'skip']) q.delete(k);
}

test('the bag never repeats back to back, including refills and a restored session', () => {
  const store = {};
  const mem = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  let n = 0;
  const rng = () => { n = (n * 17 + 3) % 1000; return n / 1000; };
  const bag = createBag(mem, rng);
  let prev = '';
  const seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const id = bag.next();
    assert.notEqual(id, prev, i);
    assert.ok(RAND_IDS.includes(id));
    prev = id; seen.add(id);
  }
  assert.equal(seen.size, 5);
  const again = createBag(mem, rng);
  assert.notEqual(again.next(), prev);
  const raw = JSON.parse(store[BAG_KEY]);
  assert.ok(RAND_IDS.includes(raw.last));
  const one = createBag({}, () => 0.5, ['R4']);
  assert.equal(one.next(), 'R4');
  assert.equal(one.next(), 'R4');
  const two = createBag({}, () => 0.1, ['R1', 'R2']);
  let prev2 = '';
  for (let i = 0; i < 40; i++) { const id = two.next(); assert.notEqual(id, prev2); prev2 = id; }
});

test('playCall is a no-op when cutscenes are off, and otherwise then() runs once', async () => {
  q.set('story', '0');
  resetRandCall();
  const e = env();
  let n = 0;
  assert.equal(playCall(scene(e), () => { n++; }), false);
  assert.equal(n, 0);
  clearQ();
  resetRandCall(e.root.sessionStorage, () => 0.2);
  const hows = [];
  const s = scene(e);
  assert.equal(playCall(s, how => hows.push(how)), true);
  assert.equal(s.music.gainMul, 0.35);
  assert.equal(s.paused, true);
  assert.ok(e.overlay());
  assert.equal(s.cutscene.rand, true);
  e.advance(200);
  assert.equal(hows.length, 0, 'a playing  clip is not cut at 200ms');
  e.advance(9800);
  assert.equal(hows.length, 0, 'a 10s clip is inside maxMs');
  e.video.fire('ended');
  assert.deepEqual(hows, ['end']);
  e.video.fire('ended');
  assert.equal(hows.length, 1);
  assert.equal(s.music.gainMul, 1);
  assert.equal(s.paused, false);
  assert.equal(e.overlay(), undefined);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(blobCount(), 1);
  dropBlob();
});

test('skip is guarded for 900ms, and stall, timeout and error each finish once', () => {
  clearQ();
  const e = env();
  resetRandCall(e.root.sessionStorage, () => 0.4);
  const hows = [];
  let flushed = 0;
  const s = scene(e, { inp: { flushPresses() { flushed++; } }, kit: {} });
  assert.equal(playCall(s, how => hows.push(how)), true);
  assert.ok(s.cutscene, hows.join());
  s.cutscene.press('attack');
  assert.equal(hows.length, 0, 'the 900ms guard holds the first press');
  e.advance(500);
  s.cutscene.press('attack');
  assert.equal(hows.length, 0, '500ms is still inside the guard');
  e.advance(500);
  assert.ok(s.cutscene, 'the clip is still up after the guard');
  s.cutscene.press('attack');
  assert.equal(s.cutscene, null);
  assert.deepEqual(hows, ['skip']);
  assert.equal(s.music.gainMul, 1);
  assert.ok(flushed >= 1);
  assert.equal(s.kit.flushInp, 1);

  const stall = env();
  resetRandCall(stall.root.sessionStorage, () => 0.5);
  const sh = [];
  playCall(scene(stall), how => sh.push(how));
  stall.advance(400);
  stall.clock = false;
  stall.advance(2000);
  assert.deepEqual(sh, ['stall']);

  const late = env();
  late.clock = false;
  resetRandCall(late.root.sessionStorage, () => 0.6);
  const th = [];
  playCall(scene(late), how => th.push(how));
  late.advance(1800);
  assert.deepEqual(th, ['timeout']);

  const bad = env();
  resetRandCall(bad.root.sessionStorage, () => 0.7);
  const eh = [];
  playCall(scene(bad), how => eh.push(how));
  bad.video.fire('error');
  assert.deepEqual(eh, ['error']);
});

test('abort leaves no overlay, no blob and no paused game, and does not run the strike', async () => {
  clearQ();
  const e = env();
  resetRandCall(e.root.sessionStorage, () => 0.3);
  await prefetchRand('R1', e.root.fetch);
  assert.equal(blobCount(), 1);
  const hows = [];
  const s = scene(e, { kit: { quality: 4 } });
  playCall(s, how => hows.push(how));
  let flushed = 0;
  s.inp = { flushPresses() { flushed++; } };
  abortRandCall(s);
  assert.deepEqual(hows, []);
  assert.ok(flushed >= 1);
  assert.equal(s.kit.flushInp, 1);
  assert.equal(s.cutscene, null);
  assert.equal(s.paused, false);
  assert.equal(e.overlay(), undefined);
  assert.equal(blobCount(), 0);
  clearQ();
});

test('a 10s clip keeps its progress so the 4s watchdog does not skip it, and 11s is the cap', () => {
  clearQ();
  const e = env();
  resetRandCall(e.root.sessionStorage, () => 0.2);
  const hows = [];
  const s = scene(e);
  assert.equal(playCall(s, how => hows.push(how)), true);
  const w = {};
  for (let n = 0; n < 40; n++) {
    e.advance(250);
    assert.equal(cutsceneWatchdog(s, e.t, w), false);
  }
  assert.ok(s.cutscene.i > 0);
  assert.deepEqual(hows, []);
  e.advance(1500);
  assert.deepEqual(hows, ['timeout']);
  clearQ();
});

test('the Stage 6 gesture blesses the Rand player and teardown removes it', () => {
  const e = env();
  const seen = [];
  e.document.addEventListener = (type, fn, cap) => { (e.document.ls = e.document.ls || []).push([type, fn, cap]); };
  e.document.removeEventListener = (type, fn) => { e.document.ls = (e.document.ls || []).filter(row => row[0] !== type || row[1] !== fn); };
  const s = scene(e);
  installRandBless(s);
  assert.equal(e.document.ls.length, 2);
  e.document.ls[0][1]();
  assert.equal(e.video.tag, 'video');
  removeRandBless();
  assert.equal(e.document.ls.length, 0);
});
