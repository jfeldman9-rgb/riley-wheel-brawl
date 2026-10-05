// Stage 3 audio tests: music loops, voices (ElevenLabs + Kokoro) and SFX.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { audioParam } from './helpers/audio-param.mjs';
import { stage1Simulation } from './helpers/stage1-simulation.mjs'; // ensures window/location/document stubs
import { MUSIC, EXTRA_VOICE, VOICE, sfx } from '../src/audio.js';
import { STAGE3 } from '../src/stages.js';
import { STAGE2_VOICES } from '../src/stage2.js';
import { STAGE3_VOICES } from '../src/stage3.js';
import { MusicDirector } from '../src/music.js';

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

function audio() {
  const nodes = [], els = [], fetches = [], decodes = [], timers = [];
  let context;
  const param = v => audioParam(v, () => context.currentTime);
  const node = kind => {
    const n = {
      kind, starts: [], stops: [], connections: [],
      connect(o) { this.connections.push(o); return o; },
      disconnect() {},
      start(...a) { this.starts.push(a); },
      stop(...a) { this.stops.push(a); },
      gain: param(1), frequency: param(0), Q: param(0),
      threshold: param(0), knee: param(0), ratio: param(0),
      attack: param(0), release: param(0),
    };
    nodes.push(n);
    return n;
  };
  class AudioContext {
    constructor() {
      context = this; this.currentTime = 0; this.sampleRate = 100;
      this.state = 'running'; this.destination = {};
    }
    createGain() { return node('gain'); }
    createDynamicsCompressor() { return node('comp'); }
    createOscillator() { return node('osc'); }
    createBufferSource() { return node('buffer'); }
    createBiquadFilter() { return node('filter'); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    createMediaElementSource() { return node('media'); }
    decodeAudioData(b, ok) { decodes.push(b.id); ok({ id: b.id, duration: 60 }); }
    resume() { return Promise.resolve(); }
  }
  class Audio {
    constructor(url) { this.url = url; this.paused = true; els.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const src = readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8').replace(/^import .*$/gm, '');
  const api = vm.runInNewContext(
    `${src.replace(/^export /gm, '')}\n({ unlock, playTrack, musicState, MUSIC, toggleMusic, setRain });`,
    {
      window: { AudioContext }, Audio, console, Math, Promise, Object, Array, JSON, Set, Map, Number, Float32Array, Error,
      setTimeout(fn, ms) { const t = { fn, ms, at: context.currentTime + ms / 1000 }; timers.push(t); return t; },
      clearTimeout(t) { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); },
      fetch(url) { const id = url.match(/([^/]+)\.mp3$/)[1]; fetches.push(id); return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve({ id }) }); },
      navigator: { userAgent: 'node' }, document: { addEventListener() {}, visibilityState: 'visible' }, addEventListener() {},
    }
  );
  const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
  const flush = () => { while (timers.length) { timers.sort((a, b) => a.at - b.at); const t = timers.shift(); context.currentTime = Math.max(context.currentTime, t.at); t.fn(); } };
  return { api, nodes, els, fetches, decodes, settle, flush, advance(secs) { context.currentTime += secs; }, get time() { return context.currentTime; } };
}

test('every Stage 3 voice id has a small mp3, a caption and an STT match of at least 0.8', () => {
  const ids = [
    'st3_story_01', 'st3_story_02', 'st3_story_03', 'st3_story_04', 'st3_story_05', 'st3_story_06',
    'cutthroat_intro_01', 'cutthroat_grab_01', 'riley_escape_01', 'riley_st3_roof_01',
    'riley_st3_glimpse_01', 'fade_intro_01', 'fade_mid_01', 'fade_split_01', 'riley_counter_01',
    'fade_defeat_01', 'riley_st3_victory_01', 'riley_st3_clear_01',
  ].sort();
  assert.deepEqual([...STAGE3_VOICES].sort(), ids);
  const stt = JSON.parse(readFileSync(new URL('../docs/stage3/voice-stt-check.json', import.meta.url)));
  const sttMap = new Map(stt.map(r => [r.id, r]));
  for (const id of ids) {
    const p = new URL(`../assets/audio/voice/${id}.mp3`, import.meta.url);
    assert.ok(existsSync(p), `file exists for ${id}`);
    const sz = statSync(p).size;
    assert.ok(sz > 2048, `${id} > 2 KB`);
    assert.ok(sz < 200 * 1024, `${id} < 200 KB`);
    const cap = EXTRA_VOICE[id];
    assert.ok(cap, `caption exists for ${id}`);
    assert.ok(typeof cap[0] === 'string' && cap[0].length > 0, `speaker for ${id}`);
    assert.ok(typeof cap[1] === 'string' && cap[1].length > 0, `text for ${id}`);
    const r = sttMap.get(id);
    assert.ok(r, `stt entry for ${id}`);
    assert.ok(r.word_match >= 0.8, `${id} word match ${r.word_match} >= 0.8`);
  }
});

test('the ElevenLabs takes are recorded with their model, voice and hash, and Stage 1/2 provenance is kept', () => {
  const man = JSON.parse(readFileSync(new URL('../assets/audio/stage3-voice-manifest.json', import.meta.url)));
  const elevenVoices = {
    st3_story_02: 'Grandfather Joe',
    st3_story_04: 'Grandfather Joe',
    cutthroat_intro_01: 'Eastend Steve',
    cutthroat_grab_01: 'Eastend Steve',
    fade_intro_01: 'Branok',
    fade_mid_01: 'Branok',
    fade_split_01: 'Branok',
    fade_defeat_01: 'Branok',
  };
  const elevenLines = man.lines.filter(l => l.source === 'elevenlabs');
  assert.equal(elevenLines.length, 8);
  for (const l of elevenLines) {
    assert.equal(l.source, 'elevenlabs');
    assert.equal(l.model, 'eleven_v4');
    assert.equal(l.voice, elevenVoices[l.id]);
    const fileBytes = readFileSync(new URL('../' + l.asset_path, import.meta.url));
    const h = createHash('sha256').update(fileBytes).digest('hex');
    assert.equal(l.sha256, h, `hash matches file for ${l.id}`);
  }
  const prov = readFileSync(new URL('../assets/audio/VOICE_PROVENANCE.md', import.meta.url), 'utf8');
  assert.ok(prov.includes('Grandfather Joe'));
  assert.ok(prov.includes('Eastend Steve'));
  assert.ok(prov.includes('Branok'));
  assert.ok(prov.includes('eleven_v4'));
  assert.ok(prov.includes('## Stage 2: Baerlon and the Whitecloaks (TTS)'));
});

test('the Kokoro Stage 3 lines reuse the Stage 2 Riley and narrator casts', () => {
  const s2Man = JSON.parse(readFileSync(new URL('../assets/audio/stage2-voice-manifest.json', import.meta.url)));
  const s3Man = JSON.parse(readFileSync(new URL('../assets/audio/stage3-voice-manifest.json', import.meta.url)));
  assert.deepEqual(s3Man.cast.riley, s2Man.cast.riley);
  assert.deepEqual(s3Man.cast.narrator, s2Man.cast.narrator);
  const kokoroLines = s3Man.lines.filter(l => l.source === 'kokoro');
  assert.equal(kokoroLines.length, 10);
  for (const l of kokoroLines) {
    const fileBytes = readFileSync(new URL('../' + l.asset_path, import.meta.url));
    const h = createHash('sha256').update(fileBytes).digest('hex');
    assert.equal(l.sha256, h, `hash matches file for ${l.id}`);
  }
});

test('Stage 3 music files exist with loop points inside the file, a loudness entry and recorded provenance', () => {
  const musMan = JSON.parse(readFileSync(new URL('../tools/music/music-manifest.json', import.meta.url)));
  const prov = readFileSync(new URL('../assets/audio/AUDIO_PROVENANCE.md', import.meta.url), 'utf8');
  assert.ok(prov.includes('music-stage3.mp3'));
  assert.ok(prov.includes('music-boss3.mp3'));
  for (const track of ['stage3', 'boss3']) {
    const m = MUSIC[track];
    const ent = musMan[track];
    assert.ok(m, `MUSIC has ${track}`);
    assert.ok(ent, `manifest has ${track}`);
    const filePath = new URL(`../${m.url}`, import.meta.url);
    assert.ok(existsSync(filePath), `${m.url} exists`);
    const sz = statSync(filePath).size;
    assert.ok(sz < 1.2 * 1024 * 1024, `${track} < 1.2 MB`);
    assert.equal(ent.loopStart, 0.25);
    assert.ok(Math.abs(ent.loopEnd - (0.25 + ent.loopSeconds)) < 1e-6);
    assert.equal(ent.bytes, sz);
    assert.ok(Number.isFinite(ent.lufs));
    assert.ok(Math.abs(m.loopEnd - ent.loopEnd) < 1e-6);
  }
});

test('MusicDirector for Stage 3 plays stage3, then boss3, then the victory silence', () => {
  const calls = [];
  const md = new MusicDirector(track => calls.push(track), 3);
  md.set('title');
  md.set('stage');
  md.set('boss');
  md.set('victory');
  assert.deepEqual(calls, ['title', 'stage3', 'boss3', null]);
});

test('the equal-power crossfade still holds into and out of boss3', async () => {
  const a = audio(); a.api.unlock();
  a.api.playTrack('stage3'); await a.settle(); a.advance(1);
  a.api.playTrack('boss3', { fade: 1.2 }); await a.settle();
  const down = trackGain(a, 'stage3'), up = trackGain(a, 'boss3');
  monotonic(down, a.time, 1.2, 1, 0);
  monotonic(up, a.time, 1.2, 0, a.api.MUSIC.boss3.gain);
  closeTo(down.valueAt(a.time + 0.6), Math.SQRT1_2, 'outgoing equal-power midpoint');
  closeTo(up.valueAt(a.time + 0.6), Math.SQRT1_2 * a.api.MUSIC.boss3.gain, 'incoming equal-power midpoint');

  a.advance(1.5); a.flush();
  a.api.playTrack('stage3', { fade: 1.0 }); await a.settle();
  const bossDown = trackGain(a, 'boss3'), st3Up = trackGain(a, 'stage3');
  monotonic(bossDown, a.time, 1.0, a.api.MUSIC.boss3.gain, 0);
  monotonic(st3Up, a.time, 1.0, 0, 1);
  closeTo(bossDown.valueAt(a.time + 0.5), Math.SQRT1_2 * a.api.MUSIC.boss3.gain, 'boss3 outgoing midpoint');
  closeTo(st3Up.valueAt(a.time + 0.5), Math.SQRT1_2, 'stage3 incoming midpoint');
});

test('the Stage 3 preload asks only for Stage 3 voices', () => {
  const s2Set = new Set(STAGE2_VOICES);
  for (const id of STAGE3_VOICES) {
    assert.ok(!s2Set.has(id), `overlap on ${id}`);
  }
  const s3Set = new Set(STAGE3_VOICES);
  const isS3OrVoice = id => s3Set.has(id) || Object.hasOwn(VOICE, id);
  for (const z of STAGE3.zones) {
    if (z.intro) assert.ok(isS3OrVoice(z.intro), `zone intro ${z.intro}`);
  }
  assert.ok(isS3OrVoice(STAGE3.boss.introVoice), 'boss introVoice');
  for (const L of Object.values(STAGE3.phaseLines)) {
    assert.ok(isS3OrVoice(L.say), `phase line ${L.say}`);
  }
  const bdSrc = STAGE3.bossDown.toString();
  const bdMatches = bdSrc.match(/say\('([^']+)'/g) || [];
  for (const m of bdMatches) {
    const id = m.replace(/^say\('/, '').replace(/'$/, '');
    assert.ok(isS3OrVoice(id), `bossDown line ${id}`);
  }
  assert.ok(isS3OrVoice('riley_st3_roof_01'));
  assert.ok(isS3OrVoice('riley_st3_glimpse_01'));
  assert.ok(isS3OrVoice('riley_counter_01'));
  assert.ok(isS3OrVoice('riley_escape_01'));
});

test('the new Stage 3 SFX are gated, quiet without an AudioContext, and draw no random numbers', () => {
  const sfxNames = ['hiss', 'shadowWhoosh', 'tileRattle', 'torchIgnite'];
  for (const name of sfxNames) {
    assert.equal(typeof sfx[name], 'function', `${name} is a function`);
  }
  const origRandom = Math.random;
  let randomCalls = 0;
  Math.random = () => { randomCalls++; return origRandom(); };
  try {
    for (const name of sfxNames) {
      for (let i = 0; i < 3; i++) {
        assert.doesNotThrow(() => sfx[name]());
      }
    }
    assert.equal(randomCalls, 0, 'headless SFX calls draw zero random numbers');
  } finally {
    Math.random = origRandom;
  }
});
