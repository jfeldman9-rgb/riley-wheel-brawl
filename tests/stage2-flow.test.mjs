// Stage flow: Stage 1 clear -> story beat -> Stage 2 -> clear -> Stage 1; the title stage select; the ?stage=2 URL
// parameter (child process, since location.search is read at module load); and the music state machine both as pure
// logic (MusicDirector) and on the production audio backend (playTrack crossfades, decoded-track residency).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { audioParam } from './helpers/audio-param.mjs';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { stageFromQuery, resolveStage, STAGE_CHARS, STAGE2 } = await import('../src/stages.js');
const { STORY_SCRIPT, STORY_PANELS, STAGE_TEXTURES } = await import('../src/stage2.js');
const { MusicDirector, STAGE_MUSIC, FADES } = await import('../src/music.js');
const { TWIX_ART_KEYS } = await import('../src/powers.js');

test('stage selection from URL and restart data: only 1 or 2, data wins over the URL', () => {
  const Q = s => new URLSearchParams(s);
  assert.equal(stageFromQuery(Q('stage=2')), 2); assert.equal(stageFromQuery(Q('')), 1);
  for (const bad of ['stage=3', 'stage=0', 'stage=abc', 'stage=-2', 'stage=2.5']) assert.equal(stageFromQuery(Q(bad)), 1, bad);
  assert.equal(resolveStage({ stage: 1 }, Q('stage=2')), 1); assert.equal(resolveStage({ stage: 2 }, Q('')), 2);
  assert.equal(resolveStage({}, Q('stage=2')), 2); assert.equal(resolveStage(undefined, Q('stage=2')), 2); assert.equal(resolveStage({ stage: 7 }, Q('')), 1);
});

test('each stage loads only its own enemies; shared characters (Riley, hounds, Loial) stay resident', () => {
  assert.deepEqual(STAGE_CHARS[2].filter(k => !STAGE_CHARS[1].includes(k)).sort(), ['archer', 'byar', 'zealot']);
  for (const k of ['riley', 'hound', 'loial']) assert.ok(STAGE_CHARS[1].includes(k) && STAGE_CHARS[2].includes(k));
  assert.equal(new Set([...STAGE_TEXTURES[1], ...STAGE_TEXTURES[2]]).size, STAGE_TEXTURES[1].length + STAGE_TEXTURES[2].length);
});

const probe = search => JSON.parse(execFileSync(process.execPath, [new URL('./helpers/stage-query-probe.mjs', import.meta.url).pathname], { env: { ...process.env, RWB_SEARCH: search }, encoding: 'utf8' }));
test('?stage=2 loads Baerlon (and releases Stage 1 art), builds Stage 2 and, with story=0, starts straight into the fight', () => {
  const r = probe('?stage=2&story=0&autostart=1');
  assert.equal(r.stageNo, 2); assert.equal(r.kit, true); assert.equal(r.started, true); assert.equal(r.cutscene, false); assert.equal(r.music, 'stage');
  for (const k of ['zealot-0', 'archer-0', 'byar-0', 'far2', 'mid2a', 'floor2a', 'story_panel_1', 'plates2', 'lights2']) assert.ok(r.queued.includes(k), k);
  for (const k of ['grunt-0', 'chief-0', 'far', 'mid0', ...TWIX_ART_KEYS]) { assert.ok(!r.queued.includes(k), `not loaded: ${k}`); assert.ok(r.removed.includes(k), `released: ${k}`); }
  assert.ok(!r.removed.some(k => /^(riley|hound|loial)-/.test(k)), 'shared atlases stay');
  assert.equal(r.zones, STAGE2.zones.length); assert.equal(r.boss, true);
});
test('without ?stage the game is Stage 1 exactly as before and releases Stage 2 art', () => {
  const r = probe('?autostart=1');
  assert.equal(r.stageNo, 1); assert.equal(r.kit, false); assert.equal(r.music, 'stage');
  for (const k of ['grunt-0', 'chief-0', 'far', ...TWIX_ART_KEYS]) assert.ok(r.queued.includes(k), k);
  for (const k of ['zealot-0', 'byar-0', 'far2', 'story_panel_1']) { assert.ok(!r.queued.includes(k)); assert.ok(r.removed.includes(k), k); }
});
test('?stage=2 without story=0 opens on the story beat', () => {
  const r = probe('?stage=2&autostart=1'); assert.equal(r.stageNo, 2); assert.equal(r.cutscene, true); assert.equal(r.music, 'cutscene');
});

test('campaign: beating the Chieftain leads to the story beat, then Stage 2; clearing Stage 2 returns to Stage 1', () => withSeed(1, () => {
  const h = stage1Simulation({ mode: '1', followRestart: true }), s = h.s;
  try {
    const until = (cond, secs) => { for (let i = 0; i < secs * 60 && !cond(); i++) { h.step(); if (s.clearShown) s.inp.press('attack'); } return cond(); };
    assert.equal(s.stageNo, 1); assert.equal(s.kit, null);
    assert.ok(until(() => h.observations.restarts === 1, 600), 'Stage 1 cleared and continued');
    assert.deepEqual(h.observations.restartData[0], { stage: 2, fromStage1: true, autostart: true });
    h.step(); assert.equal(s.stageNo, 2); assert.ok(s.kit);
    assert.ok(until(() => s.cutscene, 2), 'story beat autostarts');
    const shown = h.observations.hud.filter(e => e.method === 'showCutscene').at(-1);
    assert.equal(shown.args[1], STORY_PANELS); assert.equal(s.music.state, 'cutscene'); assert.equal(s.paused, true);
    const lines = h.observations.hud.length;
    assert.ok(until(() => !s.cutscene, 60), 'story beat ends');
    const said = h.observations.hud.slice(lines - 1).filter(e => e.method === 'cutsceneLine').map(e => e.args[0].id);
    assert.ok(said.length >= STORY_SCRIPT.length - 1);
    assert.equal(s.storyResult, 'end'); assert.equal(s.music.state, 'stage'); assert.equal(s.paused, false);
    assert.ok(until(() => s.ended || s.gameOver, 600)); assert.equal(s.gameOver, false, 'the bot clears Stage 2');
    assert.ok(until(() => h.observations.restarts === 2, 30)); assert.deepEqual(h.observations.restartData[1], { stage: 1 });
    h.step(); assert.equal(s.stageNo, 1); assert.equal(s.kit, null);
  } finally { h.destroy(); }
}));

test('title stage select: arrows choose a stage (clamped 1..2), starting another stage reloads with autostart', () => withSeed(2, () => {
  const h = stage1Simulation({ mode: '', followRestart: true }), s = h.s;
  try {
    s.selectStage(-1); assert.equal(s.titleSel || s.stageNo, 1, 'already on Stage 1: nothing to change');
    s.selectStage(1); assert.equal(s.titleSel, 2); s.selectStage(1); assert.equal(s.titleSel, 2);
    s.selectStage(-1); assert.equal(s.titleSel, 1); s.selectStage(1);
    assert.deepEqual(h.observations.hud.filter(e => e.method === 'titleSelect').map(e => e.args[0]), [2, 1, 2]);
    assert.equal(s.music.state, 'title');
    h.step(); assert.deepEqual(h.observations.restartData, [{ stage: 2, autostart: true }]); assert.equal(s.started, false);
    h.step(); assert.equal(s.stageNo, 2);
    for (let i = 0; i < 60 && !s.started; i++) h.step(); assert.equal(s.started, true); assert.ok(s.cutscene);
  } finally { h.destroy(); }
}));

// ---------------- music ----------------
function director(stageNo) { const calls = []; const d = new MusicDirector((track, o) => calls.push({ track, ...o }), stageNo); return { d, calls }; }
test('music director: each stage has its own fight and boss tracks; menus and story beats use the title theme', () => {
  assert.deepEqual(STAGE_MUSIC[1], { stage: 'stage1', boss: 'boss1' }); assert.deepEqual(STAGE_MUSIC[2], { stage: 'stage2', boss: 'boss2' });
  for (const n of [1, 2]) {
    const { d, calls } = director(n);
    d.set('title'); d.set('cutscene'); d.set('stage'); d.set('boss'); d.set('victory'); d.set('clear');
    assert.deepEqual(calls.map(c => c.track), ['title', STAGE_MUSIC[n].stage, STAGE_MUSIC[n].boss, null, 'title'], `stage ${n}`);
  }
});
test('music director: crossfade lengths, boss intro restarts, cutscene round trips resume', () => {
  const { d, calls } = director(2);
  d.set('stage'); d.set('boss');
  assert.equal(calls[1].fade, FADES.toBoss); assert.equal(calls[1].restart, true);
  d.set('cutscene'); assert.equal(calls[2].track, 'title'); assert.equal(calls[2].fade, FADES.toCutscene);
  d.resumeFight(); assert.equal(calls[3].track, 'boss2'); assert.equal(calls[3].restart, false, 'back from a cutscene the boss track resumes'); assert.equal(calls[3].fade, FADES.fromCutscene);
  d.set('gameover'); assert.equal(calls[4].track, null); d.resumeFight(); assert.equal(calls[5].restart, false); assert.equal(calls[5].fade, FADES.resume);
  const n = calls.length; assert.equal(d.set('boss'), false); assert.equal(d.set('nonsense'), false); assert.equal(calls.length, n, 'no-ops never restart a track');
  const t = director(1); t.d.set('title'); t.d.set('cutscene'); assert.equal(t.calls.length, 1, 'same track: no crossfade');
});
test('music during play: Stage 2 runs story -> stage -> boss -> victory; Stage 1 keeps stage -> Twix campfire -> stage -> boss', () => {
  for (const [stage, want] of [[2, ['cutscene', 'stage', 'boss']], [1, ['stage', 'cutscene', 'stage', 'boss']]]) withSeed(5, () => {
    const h = stage1Simulation({ mode: '1', stage }), s = h.s, seen = [];
    try {
      for (let i = 0; i < 60 * 600 && !s.ended && !s.gameOver; i++) { h.step(); if (s.music.state !== seen.at(-1)) seen.push(s.music.state); }
      assert.equal(s.ended, true);
      const firstFight = seen.indexOf(want[0]); assert.ok(firstFight >= 0, seen.join());
      assert.deepEqual(seen.slice(firstFight, firstFight + want.length), want, seen.join());
      if (stage === 2) assert.ok(!seen.slice(firstFight + 1).includes('cutscene'), 'no Twix campfire in Stage 2');
      assert.ok(['victory', 'clear'].includes(seen.at(-1)), seen.join());
      assert.ok(s.music.log.every(e => e.track === null || e.track === 'title' || e.track === STAGE_MUSIC[stage].stage || e.track === STAGE_MUSIC[stage].boss));
    } finally { h.destroy(); }
  });
});

// production audio backend with WebAudio stubs (structure only; not a listening test)
function audio() {
  const nodes = [], els = [], fetches = [], decodes = [], timers = [];
  let context;
  const param = v => audioParam(v, () => context.currentTime);
  const node = kind => { const n = { kind, starts: [], stops: [], connections: [], connect(o) { this.connections.push(o); return o; }, disconnect() {}, start(...a) { this.starts.push(a); }, stop(...a) { this.stops.push(a); }, gain: param(1), frequency: param(0), Q: param(0), threshold: param(0), knee: param(0), ratio: param(0), attack: param(0), release: param(0) }; nodes.push(n); return n; };
  class AudioContext { constructor() { context = this; this.currentTime = 0; this.sampleRate = 100; this.state = 'running'; this.destination = {}; }
    createGain() { return node('gain'); } createDynamicsCompressor() { return node('comp'); } createOscillator() { return node('osc'); } createBufferSource() { return node('buffer'); } createBiquadFilter() { return node('filter'); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; } createMediaElementSource() { return node('media'); }
    decodeAudioData(b, ok) { decodes.push(b.id); ok({ id: b.id, duration: 60 }); } resume() { return Promise.resolve(); } }
  class Audio { constructor(url) { this.url = url; this.paused = true; els.push(this); } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } }
  const src = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '');
  const api = vm.runInNewContext(`${src.replace(/^export /gm, '')}\n({ unlock, playTrack, musicState, MUSIC, toggleMusic, setRain });`, {
    window: { AudioContext }, Audio, console, Math, Promise, Object, Array, JSON, Set, Map, Number, Float32Array, Error,
    setTimeout(fn, ms) { const t = { fn, ms, at: context.currentTime + ms / 1000 }; timers.push(t); return t; }, clearTimeout(t) { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); },
    fetch(url) { const id = url.match(/([^/]+)\.mp3$/)[1]; fetches.push(id); return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve({ id }) }); },
    navigator: { userAgent: 'node' }, document: { addEventListener() {}, visibilityState: 'visible' }, addEventListener() {},
  });
  const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
  const flush = () => { while (timers.length) { timers.sort((a, b) => a.at - b.at); const t = timers.shift(); context.currentTime = Math.max(context.currentTime, t.at); t.fn(); } };
  return { api, nodes, els, fetches, decodes, settle, flush, advance(secs) { context.currentTime += secs; }, get time() { return context.currentTime; } };
}
test('audio backend: loop points and gains are sane; tracks loop sample-accurately on their loop region', async () => {
  const a = audio(), M = a.api.MUSIC;
  for (const id of ['title', 'boss1', 'stage2', 'boss2']) {
    assert.ok(M[id].loopEnd - M[id].loopStart > 30, id); assert.ok(M[id].gain > 0.5 && M[id].gain <= 1, id);
  }
  a.api.unlock(); a.api.playTrack('stage2', { fade: 0 }); await a.settle();
  const src = a.nodes.filter(n => n.kind === 'buffer' && n.buffer?.id === 'music-stage2').at(-1);
  assert.ok(src, 'stage2 buffer started'); assert.equal(src.loop, true);
  assert.equal(src.loopStart, M.stage2.loopStart); assert.equal(src.loopEnd, M.stage2.loopEnd);
  assert.deepEqual(a.api.musicState().current, 'stage2');
});
test('audio backend: crossfades are equal-power ramps, boss restarts from the top, and at most two tracks stay decoded', async () => {
  const a = audio(); a.api.unlock();
  a.api.playTrack('stage2', { fade: 0 }); await a.settle();
  a.api.playTrack('boss2', { fade: 1.2, restart: true }); await a.settle();
  const boss = a.nodes.filter(n => n.kind === 'buffer' && n.buffer?.id === 'music-boss2').at(-1);
  assert.equal(boss.starts[0][1], a.api.MUSIC.boss2.loopStart, 'boss starts at the top of its loop region');
  const ramps = a.nodes.filter(n => n.kind === 'gain' && n.gain.events.filter(e => e[0] === 'lin').length >= 8);
  assert.ok(ramps.length >= 2, 'one track ramps up while the other ramps down');
  const up = ramps.map(n => n.gain.events.filter(e => e[0] === 'lin').map(e => e[1])).find(v => v.at(-1) > 0.5);
  const mid = up[3]; assert.ok(mid > up.at(-1) * 0.6, `equal-power curve (midpoint ${mid})`);
  a.flush();
  a.api.playTrack('title', { fade: 1 }); await a.settle(); a.flush();
  a.api.playTrack('stage2', { fade: 1 }); await a.settle(); a.flush();
  assert.ok(a.api.musicState().decoded.length <= 2, a.api.musicState().decoded.join());
  assert.equal(a.api.musicState().current, 'stage2');
});

const closeTo = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} vs ${expected}`);
function monotonic(param, fromTime, duration, from, to) {
  closeTo(param.valueAt(fromTime), from, 'fade starts at the live gain');
  let previous = from;
  for (let i = 1; i <= 64; i++) {
    const value = param.valueAt(fromTime + duration * i / 64);
    assert.ok(value >= Math.min(from, to) - 1e-9 && value <= Math.max(from, to) + 1e-9, 'gain stays within endpoints');
    assert.ok(to >= from ? value >= previous - 1e-9 : value <= previous + 1e-9, 'gain moves monotonically toward its target');
    previous = value;
  }
  closeTo(previous, to, 'fade reaches its endpoint');
}
const trackSource = (a, id) => a.nodes.filter(n => n.kind === 'buffer' && n.buffer?.id === `music-${id}`).at(-1);
const trackGain = (a, id) => trackSource(a, id).connections[0].gain;

test('AudioParam fake: .value assignment schedules at now, while ramp scheduling leaves the current value alone', () => {
  let time = 0;
  const param = audioParam(0, () => time);
  param.setValueAtTime(0, 0); param.linearRampToValueAtTime(1, 2);
  assert.equal(param.value, 0); time = 1; assert.equal(param.value, 0.5);
  param.value = 0.9;
  assert.deepEqual(param.events.at(-1), ['set', 0.9, 1]); assert.equal(param.value, 0.9);
  closeTo(param.valueAt(1.5), 0.95, 'new set value replaces the live curve at now');
});

test('audio backend: every sample of a music crossfade is monotonic with no immediate endpoint jump', async () => {
  const a = audio(); a.api.unlock(); a.api.playTrack('stage2'); await a.settle(); a.advance(1);
  a.api.playTrack('boss2', { fade: 1.2 }); await a.settle();
  const down = trackGain(a, 'stage2'), up = trackGain(a, 'boss2');
  monotonic(down, a.time, 1.2, 1, 0); monotonic(up, a.time, 1.2, 0, a.api.MUSIC.boss2.gain);
  closeTo(down.valueAt(a.time + 0.6), Math.SQRT1_2, 'outgoing equal-power midpoint');
  closeTo(up.valueAt(a.time + 0.6), Math.SQRT1_2 * a.api.MUSIC.boss2.gain, 'incoming equal-power midpoint');
});

test('audio backend: overlapping track changes fade from the instantaneous partial gain', async () => {
  const a = audio(); a.api.unlock(); a.api.playTrack('stage2'); await a.settle(); a.advance(1);
  a.api.playTrack('boss2', { fade: 1.2 }); await a.settle(); a.advance(0.43);
  const boss = trackGain(a, 'boss2'), before = boss.value;
  assert.ok(before > 0 && before < a.api.MUSIC.boss2.gain);
  a.api.playTrack('title', { fade: 1 }); await a.settle();
  monotonic(boss, a.time, 1, before, 0); monotonic(trackGain(a, 'title'), a.time, 1, 0, 1);
  a.flush(); assert.equal(a.api.musicState().current, 'title');
});

test('audio backend: reversing a crossfade does not restart or jump the outgoing track', async () => {
  const a = audio(); a.api.unlock(); a.api.playTrack('stage2'); await a.settle(); a.advance(1);
  a.api.playTrack('boss2', { fade: 1.2 }); await a.settle(); a.advance(0.43);
  const stage = trackGain(a, 'stage2'), boss = trackGain(a, 'boss2'), stageBefore = stage.value, bossBefore = boss.value;
  const originalSource = trackSource(a, 'stage2');
  assert.ok(stageBefore > 0 && stageBefore < 1);
  a.api.playTrack('stage2', { fade: 0.8 }); await a.settle();
  monotonic(stage, a.time, 0.8, stageBefore, 1); monotonic(boss, a.time, 0.8, bossBefore, 0);
  a.flush(); assert.equal(trackSource(a, 'stage2'), originalSource); assert.equal(originalSource.stops.length, 0);
});

test('audio backend: immediate music changes apply the gain at now without leftover ramps', async () => {
  const a = audio(); a.api.unlock(); a.api.playTrack('stage2'); await a.settle(); a.advance(0.1);
  a.api.playTrack('stage2', { fade: 0 });
  closeTo(trackGain(a, 'stage2').value, 1, 'zero-duration change');
  closeTo(trackGain(a, 'stage2').valueAt(a.time + 2), 1, 'cancelled initial ramp cannot change it later');
});

test('audio backend: rain fade-in and an overlapping fade-out are continuous and monotonic', () => {
  const a = audio(); a.api.unlock(); const first = a.nodes.length; a.api.setRain(true);
  const gain = a.nodes.slice(first).find(n => n.kind === 'gain').gain;
  monotonic(gain, a.time, 2.5, 0, 1); a.advance(0.73);
  const before = gain.value; assert.ok(before > 0 && before < 1);
  a.api.setRain(false); monotonic(gain, a.time, 1.2, before, 0); a.flush();
});
