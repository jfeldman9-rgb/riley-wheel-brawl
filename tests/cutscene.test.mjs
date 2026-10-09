// Video cutscenes: the streamed <video> controller (skip, failure/stall fallback, muted fallback, cleanup),
// test-mode gating, once-per-session memory, and the stage hooks (pause, routing, shutdown) on a fake DOM.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { CutscenePlayer, STAGE_CLIPS, SKIP_ACTIONS, cutscenesEnabled, createSeen, START_MS, STALL_MS, GUARD_MS, SEEN_KEY } from '../src/cutscene.js';
import { cutsceneWatchdog } from '../src/guard.js';
import { audit } from '../tools/audit-stage1.mjs';

globalThis.Phaser = globalThis.Phaser || { Scene: class {} };
const { installCutscenes, silence } = await import('../src/cutscene-hooks.js');

class FakeEl {
  constructor(tag) { this.tag = tag; this.style = {}; this.attrs = {}; this.children = []; this.parent = null; this.ls = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; if (k === 'src') this._src = ''; if (k === 'poster') this.poster = ''; }
  appendChild(c) { c.parent?.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) { this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; } }
  addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
  removeEventListener(t, f) { this.ls[t] = (this.ls[t] || []).filter(g => g !== f); }
  fire(t, e = {}) { for (const f of [...(this.ls[t] || [])]) f({ type: t, preventDefault() { this.prevented = true; }, ...e }); }
  get inPage() { let n = this; while (n.parent) n = n.parent; return n.isBody === true; }
}
class FakeVideo extends FakeEl {
  constructor(env) { super('video'); this.env = env; this._src = ''; this.poster = ''; this.muted = false; this.volume = 1; this.currentTime = 0; this.paused = true; this.ended = false; this.loads = 0; this.plays = []; }
  get src() { return this._src; }
  set src(v) { this._src = v; this.currentTime = 0; this.paused = true; this.ended = false; }
  play() {
    const r = this.env.playResult({ src: this._src, muted: this.muted, video: this });
    this.plays.push({ src: this._src, muted: this.muted });
    if (r instanceof Error) return Promise.reject(r);
    this.paused = false; return Promise.resolve();
  }
  pause() { this.paused = true; }
  load() { this.loads++; this.currentTime = 0; }
}
function env({ playResult = () => null, query = '', webdriver = false } = {}) {
  const e = { t: 0, timers: new Map(), id: 0, playResult, store: {}, captured: {} };
  const body = new FakeEl('body'); body.isBody = true;
  e.document = { hidden: false, body, createElement: tag => tag === 'video' ? (e.video = new FakeVideo(e)) : new FakeEl(tag) };
  e.root = {
    document: e.document, navigator: { webdriver }, console: { error() {} },
    performance: { now: () => e.t },
    setInterval: (f, ms) => { const id = ++e.id; e.timers.set(id, { f, ms, next: e.t + ms }); return id; },
    clearInterval: id => e.timers.delete(id),
    sessionStorage: { getItem: k => e.store[k] ?? null, setItem: (k, v) => { e.store[k] = String(v); } },
    addEventListener: (t, f, cap) => { (e.captured[t] = e.captured[t] || []).push(f); },
    removeEventListener: (t, f) => { e.captured[t] = (e.captured[t] || []).filter(g => g !== f); },
    innerWidth: 844, innerHeight: 390,
  };
  e.query = new URLSearchParams(query);
  e.advance = ms => { const end = e.t + ms; while (true) { let due = null; for (const [id, T] of e.timers) if (T.next <= end && (!due || T.next < due[1].next)) due = [id, T]; if (!due) break; e.t = due[1].next; due[1].next += due[1].ms; due[1].f(); } e.t = end; };
  e.flush = () => new Promise(r => setTimeout(r, 0));
  e.overlay = () => e.document.body.children.find(c => c.id === 'rwb-cutscene');
  e.playing = (secs = 0.25) => { e.video.currentTime += secs; };   // simulate decode progress
  return e;
}
const clip = id => `assets/cutscenes/${id}.mp4`;

test('gating: on for players, off in demo/skip/autostart/story=0/webdriver unless ?cutscenes=1; ?nocutscenes=1 wins', () => {
  const q = s => new URLSearchParams(s);
  assert.equal(cutscenesEnabled(q(''), {}), true);
  assert.equal(cutscenesEnabled(q('?stage=3'), {}), true);
  for (const s of ['?demo=1', '?skip=boss', '?autostart=1', '?story=0', '?stage=2&autostart=1&resume=1', '?demo=1&god=1']) {
    assert.equal(cutscenesEnabled(q(s), {}), false, s);
    assert.equal(cutscenesEnabled(q(s + '&cutscenes=1'), {}), true, s + ' + cutscenes=1');
  }
  assert.equal(cutscenesEnabled(q(''), { webdriver: true }), false);
  assert.equal(cutscenesEnabled(q('?cutscenes=1'), { webdriver: true }), true);
  assert.equal(cutscenesEnabled(q('?nocutscenes=1'), {}), false);
  assert.equal(cutscenesEnabled(q('?nocutscenes=1&cutscenes=1'), {}), false);
  assert.equal(cutscenesEnabled(q('?cutscenes=0'), {}), false);
  assert.equal(cutscenesEnabled(q('?nocutscenes=0'), {}), true);
});

test('seen memory persists in sessionStorage and survives a broken store', () => {
  const store = {}; const s = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  const a = createSeen(s); a.add('intro'); a.add(3);
  assert.deepEqual(JSON.parse(store[SEEN_KEY]), ['intro', '3']);
  const b = createSeen(s); assert.equal(b.has('intro'), true); assert.equal(b.has(3), true); assert.equal(b.has(2), false);
  const bad = createSeen({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  bad.add('x'); assert.equal(bad.has('x'), true);
  assert.equal(createSeen(undefined).has('x'), false);
});

test('a sequence plays clip by clip, then removes the video from the page and clears its src', async () => {
  const e = env(), p = new CutscenePlayer(e.root); const done = [];
  const h = p.play(STAGE_CLIPS.intro, { done: how => done.push(how), touch: true });
  assert.equal(p.active, true);
  const ov = e.overlay(); assert.ok(ov, 'overlay in the page');
  assert.equal(ov.style.zIndex, '80'); assert.equal(ov.style.position, 'fixed');
  assert.equal(e.video.parent, ov); assert.equal(e.video.getAttribute('playsinline'), ''); assert.equal(e.video.style.objectFit, 'contain');
  assert.equal(ov.children.find(c => c.id === 'rwb-cutscene-hint').textContent, 'TAP TO SKIP ▶▶');
  assert.equal(e.video.src, clip('twinkletoes')); assert.equal(e.video.poster, 'assets/cutscenes/twinkletoes.jpg');
  assert.equal(e.video.muted, false);
  e.video.fire('ended'); assert.equal(e.video.src, clip('moiraine'));
  e.video.fire('ended'); assert.equal(e.video.src, clip('intro'));
  e.video.fire('ended'); assert.equal(e.video.src, clip('intro_battle'), 'the battle edit plays right after intro_v2');
  assert.deepEqual(done, []);
  e.video.fire('ended');
  assert.deepEqual(done, ['end']);
  assert.equal(p.active, false); assert.equal(h.active, false);
  assert.equal(e.overlay(), undefined, 'overlay removed'); assert.equal(e.video.inPage, false, 'video element out of the page');
  assert.equal(e.video.src, ''); assert.equal(e.video.poster, ''); assert.ok(e.video.loads >= 1, 'load() after clearing src frees the decoder');
  assert.equal(e.timers.size, 0, 'stall timer cleared');
  assert.deepEqual(e.video.ls.ended || [], []); assert.deepEqual(e.video.ls.error || [], []);
  e.video.fire('ended'); assert.deepEqual(done, ['end'], 'no callbacks after finish');
});

test('a tap skips only the current clip (each clip has its own guard); Start/Esc skips the rest of the sequence', () => {
  const e = env(), p = new CutscenePlayer(e.root); const done = [];
  const h = p.play(STAGE_CLIPS.intro, { done: how => done.push(how) });
  e.overlay().fire('touchend'); assert.equal(e.video.src, clip('twinkletoes'), 'the tap that started play cannot skip it');
  e.advance(GUARD_MS + 10);
  const tap = () => { let prevented = false; for (const f of e.overlay().ls.touchend) f({ type: 'touchend', preventDefault() { prevented = true; } }); return prevented; };
  assert.equal(tap(), true, 'touchend default prevented: no ghost click into the game');
  assert.equal(e.video.src, clip('moiraine')); assert.deepEqual(done, []);
  tap(); assert.equal(e.video.src, clip('moiraine'), 'a double tap does not skip two clips');
  e.advance(GUARD_MS + 10); e.overlay().fire('click'); assert.equal(e.video.src, clip('intro'));
  e.advance(GUARD_MS + 10); h.skip('press'); assert.equal(e.video.src, clip('intro_battle'));
  e.advance(GUARD_MS + 10); tap(); assert.deepEqual(done, ['skip'], 'skipping the last clip ends the run');
  assert.equal(e.overlay(), undefined); assert.equal(e.video.src, '');
  const e2 = env(), p2 = new CutscenePlayer(e2.root); const d2 = [];
  const h2 = p2.play(STAGE_CLIPS.intro, { done: how => d2.push(how) });
  assert.equal(h2.skip('press', true), false); e2.advance(GUARD_MS + 10); h2.skip('press', true); h2.skip('press', true);
  assert.deepEqual(d2, ['skip']); assert.equal(e2.video.plays.filter(x => x.src).length, 1, 'skip-all: the later clips never load');
  assert.equal(new CutscenePlayer(env().root).play(['stage3']).active, true);
  assert.ok(SKIP_ACTIONS.has('attack') && SKIP_ACTIONS.has('start') && SKIP_ACTIONS.has('pause') && !SKIP_ACTIONS.has('left') && !SKIP_ACTIONS.has('run'));
});

test('a load error or a refused play skips that clip silently and the sequence carries on', async () => {
  const e = env({ playResult: ({ src }) => src.includes('moiraine') ? Object.assign(new Error('nope'), { name: 'NotSupportedError' }) : null });
  const p = new CutscenePlayer(e.root); const done = [];
  p.play(STAGE_CLIPS.intro, { done: how => done.push(how) });
  e.video.fire('error'); assert.equal(e.video.src, clip('moiraine'));
  await e.flush(); assert.equal(e.video.src, clip('intro'), 'refused play() moves on');
  e.video.fire('error'); assert.equal(e.video.src, clip('intro_battle'));
  e.video.fire('error'); assert.deepEqual(done, ['end']);
  assert.equal(e.overlay(), undefined);
});

test('autoplay with sound blocked falls back to muted, and a later gesture unmutes', async () => {
  const e = env({ playResult: ({ muted }) => muted ? null : Object.assign(new Error('gesture'), { name: 'NotAllowedError' }) });
  const p = new CutscenePlayer(e.root); const done = [];
  p.play(['stage2', 'stage3'], { done: how => done.push(how) });
  await e.flush();
  assert.equal(e.video.muted, true); assert.deepEqual(e.video.plays.map(x => x.muted), [false, true]);
  e.video.fire('ended'); assert.equal(e.video.muted, true, 'stays muted for the next clip');
  p.bless(); assert.equal(e.video.muted, false, 'a real gesture unmutes');
  assert.ok(p.log.includes('stage2:muted') && p.log.includes('unmuted'));
  e.video.fire('ended'); assert.deepEqual(done, ['end']);
  // muted autoplay refused too: skip
  const e2 = env({ playResult: () => Object.assign(new Error('gesture'), { name: 'NotAllowedError' }) });
  const p2 = new CutscenePlayer(e2.root); const d2 = [];
  p2.play(['stage4'], { done: how => d2.push(how) }); await e2.flush(); await e2.flush();
  assert.deepEqual(d2, ['end']); assert.equal(e2.overlay(), undefined);
});

test('bless before any clip calls play() once on the bare element (iOS sound unlock) and never throws', async () => {
  const e = env(), p = new CutscenePlayer(e.root);
  p.bless(); p.bless();
  assert.equal(e.video.plays.length, 1); assert.equal(e.video.inPage, false, 'not put in the page');
  const broken = new CutscenePlayer({ document: { createElement() { throw new Error('no DOM'); } } });
  assert.doesNotThrow(() => broken.bless());
});

test('stall fallback: no first frame in START_MS, or no progress for STALL_MS, skips that clip; hidden time does not count', () => {
  const e = env(), p = new CutscenePlayer(e.root); const done = [];
  p.play(['stage1', 'stage2', 'stage3'], { done: how => done.push(how) });
  e.advance(START_MS - 300); assert.equal(e.video.src, clip('stage1'));
  e.advance(600); assert.equal(e.video.src, clip('stage2'), 'never started: timeout');
  for (let i = 0; i < 12; i++) { e.playing(); e.advance(250); }
  assert.equal(e.video.src, clip('stage2'), 'progressing clip keeps playing');
  e.document.hidden = true; e.advance(STALL_MS * 3); assert.equal(e.video.src, clip('stage2'), 'background tab is not a stall');
  e.document.hidden = false; e.advance(STALL_MS - 300); assert.equal(e.video.src, clip('stage2'));
  e.advance(600); assert.equal(e.video.src, clip('stage3'), 'stalled mid-play');
  assert.ok(p.log.includes('stage1:timeout') && p.log.includes('stage2:stall'));
  e.advance(START_MS + 300); assert.deepEqual(done, ['end']);
  assert.equal(e.overlay(), undefined); assert.equal(e.timers.size, 0);
});

test('abort cleans up without calling back (scene shutdown mid-clip)', () => {
  const e = env(), p = new CutscenePlayer(e.root); const done = [];
  const h = p.play(['stage3'], { done: how => done.push(how) });
  h.abort();
  assert.deepEqual(done, []); assert.equal(p.active, false); assert.equal(e.overlay(), undefined); assert.equal(e.video.src, ''); assert.equal(e.timers.size, 0);
});

function fakeScene(stageNo = 2) {
  const ev = {};
  const music = { state: 'title', track: 'title', log: [], calls: [], backend(id, o) { this.calls.push([id, o]); } };
  return {
    stageNo, runId: 1, started: true, ended: false, gameOver: false, victoryPending: false, cutscene: null,
    pauseReasons: new Set(), paused: false, music, inp: { isTouch: true },
    game: { isPaused: false, n: 0, pause() { this.isPaused = true; this.n++; }, resume() { this.isPaused = false; } },
    setPauseReason(r, on) { if (on) this.pauseReasons.add(r); else this.pauseReasons.delete(r); this.paused = this.pauseReasons.size > 0; },
    events: { once(t, f) { (ev[t] = ev[t] || []).push(f); }, off(t, f) { ev[t] = (ev[t] || []).filter(g => g !== f); }, emit(t) { const fs = ev[t] || []; ev[t] = []; fs.forEach(f => f()); }, count: t => (ev[t] || []).length },
    // the real Stage1.onPress routes a press to scene.cutscene.press while a cutscene owns the screen
    onPress(a) { if (this.cutscene) return this.cutscene.press(a); },
  };
}
function rig(query = '', opts = {}) {
  const e = env({ query, ...opts });
  const calls = [];
  const stages = { 1: { start: s => calls.push(['start', 1]) }, 2: { start: s => calls.push(['start', 2, s.paused, !!s.cutscene]) }, 3: { start: s => calls.push(['start', 3]) }, 4: { start: s => calls.push(['start', 4]) } };
  class Scene { startBoss() { calls.push(['boss', this.stageNo, this.paused]); } }
  const api = installCutscenes({ root: e.root, stages, Scene, query: e.query });
  return { e, api, stages, Scene, calls };
}

test('hooks: stage start plays its clip paused under the cutscene reason, then hands off to the story panels', () => {
  const { e, api, stages, calls } = rig();
  const s = fakeScene(2);
  stages[2].start(s);
  assert.deepEqual(calls, [], 'story panels wait for the clip');
  assert.equal(s.paused, true); assert.deepEqual([...s.pauseReasons], ['cutscene']);
  assert.equal(s.cutscene.video, 2); assert.equal(e.video.src, clip('stage2'));
  assert.equal(s.music.state, 'silent'); assert.deepEqual(s.music.calls, [[null, { fade: 0.5 }]], 'music fades out fast');
  s.onPress('left'); s.onPress('run'); e.advance(GUARD_MS + 10); s.onPress('right');
  assert.ok(e.overlay(), 'stick moves do not skip');
  s.onPress('attack');
  assert.deepEqual(calls, [['start', 2, false, false]], 'unpaused, stand-in cutscene cleared, then the stage start runs');
  assert.equal(s.game.isPaused, false); assert.equal(s.game.n, 1, 'the game loop was paused for the clip and resumed after');
  assert.equal(e.overlay(), undefined); assert.equal(s.events.count('shutdown'), 0, 'shutdown listener removed');
  assert.deepEqual(api.seen.keys(), ['2']);
});

test('hooks: once per session: a restart or a reload into the same stage does not replay', () => {
  const { e, stages, calls, api } = rig();
  const s = fakeScene(3); stages[3].start(s); e.video.fire('ended');
  stages[3].start(fakeScene(3));
  assert.deepEqual(calls, [['start', 3], ['start', 3]]);
  assert.equal(api.plays.length, 1);
  // a fresh page in the same tab session (freeze-guard reload) reads the stored list
  const r2 = rig(); r2.e.store[SEEN_KEY] = e.store[SEEN_KEY];
  const r3 = (() => { const x = env(); x.store[SEEN_KEY] = e.store[SEEN_KEY]; const c = []; const st = { 3: { start: () => c.push(3) } }; installCutscenes({ root: x.root, stages: st, Scene: class {}, query: x.query }); st[3].start(fakeScene(3)); return { x, c }; })();
  assert.deepEqual(r3.c, [3]); assert.equal(r3.x.overlay(), undefined);
});

test('hooks: test and bot modes never create a video unless ?cutscenes=1', () => {
  for (const q of ['?demo=1', '?skip=boss', '?autostart=1', '?story=0', '?nocutscenes=1']) {
    const { e, stages, calls, Scene } = rig(q);
    stages[2].start(fakeScene(2)); const b = Object.assign(new Scene(), fakeScene(1)); b.startBoss();
    assert.deepEqual(calls, [['start', 2, false, false], ['boss', 1, false]], q);
    assert.equal(e.video, undefined, `${q}: no video element at all`);
  }
  const wd = rig('', { webdriver: true }); wd.stages[4].start(fakeScene(4)); assert.equal(wd.e.video, undefined);
  const on = rig('?demo=1&cutscenes=1'); on.stages[4].start(fakeScene(4)); assert.equal(on.e.video.src, clip('stage4'));
});

test('hooks: intro sequence on Stage 1 start, the Chieftain clip before the boss only on Stage 1', () => {
  const { e, stages, Scene, calls } = rig();
  const s1 = fakeScene(1); stages[1].start(s1);
  assert.equal(e.video.src, clip('twinkletoes'));
  e.video.fire('ended'); e.video.fire('ended'); assert.equal(e.video.src, clip('intro'));
  e.advance(GUARD_MS + 10); s1.onPress('attack'); assert.equal(e.video.src, clip('intro_battle'), 'an action skips just intro_v2');
  assert.deepEqual(calls, []);
  e.advance(GUARD_MS + 10); s1.onPress('start'); assert.deepEqual(calls, [['start', 1]], 'Start skips the rest');
  const boss = Object.assign(new Scene(), fakeScene(1)); boss.startBoss();
  assert.deepEqual(calls.length, 1, 'boss waits for its clip'); assert.equal(e.video.src, clip('stage1'));
  e.advance(GUARD_MS + 10); boss.onPress('jump'); assert.deepEqual(calls[1], ['boss', 1, false]);
  const b2 = Object.assign(new Scene(), fakeScene(2)); b2.startBoss(); assert.deepEqual(calls[2], ['boss', 2, false], 'other bosses start at once');
  const again = Object.assign(new Scene(), fakeScene(1)); again.startBoss(); assert.deepEqual(calls[3], ['boss', 1, false], 'Chieftain clip only once');
  // a finished or lost stage never gets a clip
  const r = rig(); const over = Object.assign(new r.Scene(), fakeScene(1), { gameOver: true }); over.startBoss(); assert.equal(r.e.video, undefined);
});

test('hooks: scene shutdown mid-clip aborts the video and never runs the stage start', () => {
  const { e, stages, calls } = rig();
  const s = fakeScene(4); stages[4].start(s);
  s.events.emit('shutdown');
  assert.equal(e.overlay(), undefined); assert.equal(e.video.src, ''); assert.equal(e.timers.size, 0);
  e.video.fire('ended'); assert.deepEqual(calls, []);
});

test('hooks: install is idempotent and wraps each start once', () => {
  const { e, stages, Scene, api } = rig();
  const start2 = stages[2].start, boss = Scene.prototype.startBoss;
  assert.equal(installCutscenes({ root: e.root, stages, Scene, query: e.query }), api);
  assert.equal(stages[2].start, start2); assert.equal(Scene.prototype.startBoss, boss);
  assert.deepEqual(Object.keys(e.captured).filter(k => e.captured[k].length).sort(), ['click', 'keydown', 'touchend']);
  assert.equal(installCutscenes({ root: {} }), null, 'no DOM, no install');
});

test('the freeze watchdog sees progress through the stand-in, and its next() skips a frozen clip', () => {
  const { e, stages } = rig();
  const s = fakeScene(2); stages[2].start(s); const cs = s.cutscene, w = {};
  cutsceneWatchdog(s, 0, w);
  for (let t = 250; t <= 8000; t += 250) { e.playing(); e.advance(250); cutsceneWatchdog(s, t, w); }
  assert.equal(e.video.src, clip('stage2'), 'a playing clip is never advanced by the watchdog');
  assert.ok(cs.i > 0);
  cs.next(); assert.equal(e.overlay(), undefined, 'watchdog next() moves past the only clip'); assert.equal(s.cutscene, null);
});

test('silence() fades the director out once and leaves fightState for the stage to resume', () => {
  const m = { state: 'stage', track: 'stage1', fightState: 'stage', log: [], calls: [], backend(id, o) { this.calls.push([id, o]); } };
  silence(m); silence(m);
  assert.equal(m.state, 'silent'); assert.equal(m.track, null); assert.equal(m.fightState, 'stage'); assert.equal(m.calls.length, 1);
  assert.doesNotThrow(() => silence(null));
});

test('shipped clips: every clip the game can play exists, H.264/AAC MP4 with faststart, posters small, provenance complete', () => {
  const status = JSON.parse(readFileSync('assets/cutscenes/ART_STATUS.json', 'utf8'));
  const ids = [...new Set(Object.values(STAGE_CLIPS).flat())].sort();
  assert.deepEqual(status.entries.map(x => x.id).sort(), ids);
  let total = 0;
  for (const id of ids) {
    const mp4 = `assets/cutscenes/${id}.mp4`, jpg = `assets/cutscenes/${id}.jpg`;
    assert.ok(existsSync(mp4) && existsSync(jpg), id);
    const b = readFileSync(mp4), size = b.length; total += size + statSync(jpg).size;
    // ~1.5-3 MB each; the 18 s battle edit at CRF 27 is the one exception (~4.4 MB)
    assert.ok(size >= 1_000_000 && size <= (id === 'intro_battle' ? 4_700_000 : 3_200_000), `${id} ${size} bytes`);
    assert.ok(statSync(jpg).size < 60_000, `${id} poster`);
    assert.equal(b.toString('ascii', 4, 8), 'ftyp');
    assert.ok(b.indexOf('moov') < b.indexOf('mdat'), `${id}: moov before mdat (+faststart) so it streams`);
    assert.ok(b.indexOf('avc1') > 0 && b.indexOf('mp4a') > 0, `${id}: H.264 + AAC`);
    const e = status.entries.find(x => x.id === id);
    assert.equal(e.source, 'grok-imagine'); assert.equal(e.placeholder, false);
    assert.match(e.art.approvedBy, /Jason.*Grok Bot.*2026-10-07/);
    assert.match(e.art.sourceSha256, /^[0-9a-f]{64}$/);
    assert.equal(e.bytes[mp4], size);
  }
  assert.ok(total < 22_000_000, `total ${total}`);
  assert.equal(existsSync('assets/cutscenes/stage5.mp4'), false, 'Stage 5 is not live: its clip does not ship yet');
  const a = audit();
  assert.equal(a.preFight.inventoryStatus, 'PASS');
  assert.equal(a.cutscenes.source.status, 'PASS'); assert.deepEqual(a.cutscenes.source.files.sort(), ['src/cutscene-hooks.js', 'src/cutscene.js']);
  assert.equal(a.cutscenes.clips.status, 'PASS'); assert.equal(a.cutscenes.clips.bytes, total);
  const main = readFileSync('src/main.js', 'utf8');
  assert.match(main, /installCutscenes\(\);/);
  assert.doesNotMatch(readFileSync('index.html', 'utf8'), /cutscene/, 'no index.html change');
});

test('hooks: game loop paused during the clip; a pause someone else owns (graphics loss) is left alone', () => {
  const { e, stages } = rig();
  const s = fakeScene(3); stages[3].start(s);
  assert.equal(s.game.isPaused, true, 'nothing renders under the video');
  e.video.fire('ended'); assert.equal(s.game.isPaused, false);
  const r = rig(); const s2 = fakeScene(4); s2.game.isPaused = true; r.stages[4].start(s2);
  r.e.video.fire('ended'); assert.equal(s2.game.isPaused, true, 'not ours to resume'); assert.equal(s2.game.n, 0);
  const r3 = rig(); const s3 = fakeScene(2); r3.stages[2].start(s3); s3.events.emit('shutdown'); assert.equal(s3.game.isPaused, false, 'abort resumes too');
});

test('a gamepad button skips (polled by the player while the game loop is paused); a button held at start does not', () => {
  const e = env(); const pads = [{ buttons: [{ pressed: true }, { pressed: false }] }];
  e.root.navigator.getGamepads = () => pads;
  const p = new CutscenePlayer(e.root); const done = [];
  p.play(['stage2'], { done: how => done.push(how) });
  e.advance(GUARD_MS + 500); assert.deepEqual(done, [], 'held from before the clip');
  pads[0].buttons[0].pressed = false; e.playing(); e.advance(250);
  pads[0].buttons[1].pressed = true; e.playing(); e.advance(250);
  assert.deepEqual(done, ['skip']); assert.ok(p.log.includes('skip:pad'));
});

test('the video sits on the game canvas rect (iPhone shell offset) and follows resizes; no rect falls back to contain', () => {
  const e = env(); const p = new CutscenePlayer(e.root);
  let rect = { left: 113, top: 0, right: 806, bottom: 390, width: 693, height: 390 };
  p.play(['stage3'], { frame: () => rect });
  assert.deepEqual([e.video.style.position, e.video.style.left, e.video.style.width, e.video.style.height], ['absolute', '113px', '693px', '390px']);
  const hint = e.overlay().children.find(c => c.id === 'rwb-cutscene-hint');
  assert.equal(hint.style.right, '48px'); assert.equal(hint.style.bottom, '10px');
  rect = { left: 0, top: 20, right: 390, bottom: 239, width: 390, height: 219 };
  e.captured.resize.forEach(f => f()); assert.equal(e.video.style.top, '20px'); assert.equal(e.video.style.width, '390px');
  e.video.fire('ended'); assert.equal((e.captured.resize || []).length, 0, 'resize listener removed');
  p.play(['stage4'], { frame: () => { throw new Error('no canvas'); } });
  assert.equal(e.video.style.width, '100%'); assert.equal(e.video.style.position, 'static');
});
