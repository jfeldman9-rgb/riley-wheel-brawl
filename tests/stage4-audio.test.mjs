// Stage 4 audio prep. Voice files are not fabricated: the TTS script must exit without
// writing them when Kokoro and ElevenLabs are unavailable. Synth cues and the manifest are real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { STAGE4_CUES, playStage4Sfx } from '../src/stage4-sfx.js';

const root = resolve(import.meta.dirname, '..');
const audio = JSON.parse(readFileSync(resolve(root, 'tools/stage4/audio-manifest.json'), 'utf8'));
const music = JSON.parse(readFileSync(resolve(root, 'tools/stage4/music-manifest.json'), 'utf8'));
const QUOTES = [
  'Come... rest...',
  'Such a bright soul. Give it to me.',
  'The fog is my garden.',
  '(wordless hum, 3 second loop)',
  '(defeat shriek)',
  'The fog answers us!',
  'Mashadar, feed!',
  'He burns... it burns!',
  "Don't touch the fog.",
  'Off me!',
  'Not today!',
  "That tower's coming down!",
  'There, on the bridge!',
  'Light it up.',
  'Sing to the ash.',
  'The Fade fled Caemlyn by night. Its trail ran east, to a city no map still names.',
  'Aridhol. Moiraine said never go in.',
  'He went in.',
  'Stay... and be welcome... forever.',
  'Riley walked in.',
  'The trail goes underground. A Waygate.',
  'Riley, the Ways are dark. Nobody goes into the Ways.',
  'Then show me how.',
];

test('the voice manifest lists every Stage 4 line with speaker, text, file and engine', () => {
  assert.equal(audio.stage, 4);
  assert.deepEqual(audio.sfx, ['fogGurgle', 'towerCrack', 'screech', 'croonChord']);
  assert.deepEqual(audio.music, ['music-stage4', 'music-boss4']);
  const texts = audio.lines.map(row => row.text);
  for (const quote of QUOTES) assert.ok(texts.includes(quote), quote);
  const ids = new Set();
  for (const row of audio.lines) {
    assert.equal(typeof row.speaker, 'string');
    assert.equal(typeof row.text, 'string');
    assert.ok(row.text.length > 0, row.id);
    assert.match(row.file, /^assets\/audio\/voice\/.+\.mp3$/);
    assert.ok(row.engine === 'kokoro' || row.engine === 'elevenlabs', row.id);
    assert.ok(!ids.has(row.id), row.id);
    ids.add(row.id);
    if (row.speaker === 'RILEY' || row.speaker === 'LOIAL') assert.equal(row.engine, 'kokoro', row.id);
    if (['DRAGHKAR', 'CULTIST', 'NARRATOR', 'MORDETH'].includes(row.speaker)) assert.equal(row.engine, 'elevenlabs', row.id);
  }
  const off = audio.lines.find(row => row.id === 'riley_fog_off_02');
  assert.equal(off.variantOf, 'riley_fog_off_01');
  assert.equal(audio.lines.find(row => row.id === 'draghkar_croon_01').loop, true);
});

test('the music plan names stage 4 and the boss, and the renderer calls compose.py', () => {
  for (const key of ['stage4', 'boss4']) {
    const row = music[key];
    assert.match(row.file, /^music-(stage4|boss4)\.mp3$/);
    assert.equal(typeof row.title, 'string');
    assert.equal(typeof row.doc, 'string');
    assert.ok(row.bpm > 0 && row.bars > 0);
    assert.match(row.target, /^assets\/audio\/music-/);
  }
  assert.equal(music.rendered, false);
  const script = readFileSync(resolve(root, 'tools/stage4/compose_stage4.py'), 'utf8');
  assert.match(script, /tools\/music\/compose\.py/);
  assert.match(script, /TRACKS/);
  assert.match(script, /No music files were written/);
});

test('synth cues play in the Stage 2 oscillator style and render deterministic WAVs over 2 KB', () => {
  assert.deepEqual(Object.keys(STAGE4_CUES), audio.sfx);
  const nodes = [];
  const make = kind => {
    const node = {
      kind,
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      Q: { value: 1 },
      connect() {},
      start() { node.started = true; },
      stop() {},
    };
    nodes.push(node);
    return node;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 22050,
    destination: {},
    createOscillator: () => make('oscillator'),
    createGain: () => make('gain'),
    createBiquadFilter: () => make('filter'),
    createBuffer: (_ch, length) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => make('buffer'),
  };
  for (const name of audio.sfx) assert.equal(playStage4Sfx(ctx, ctx.destination, name), true);
  assert.equal(playStage4Sfx(ctx, ctx.destination, 'not-a-cue'), false);
  assert.ok(nodes.some(node => node.kind === 'oscillator' && node.started));
  assert.ok(nodes.some(node => node.kind === 'buffer' && node.started));
  const a = mkdtempSync(join(tmpdir(), 's4-sfx-a-'));
  const b = mkdtempSync(join(tmpdir(), 's4-sfx-b-'));
  try {
    for (const dir of [a, b]) execFileSync('python3', ['tools/stage4/synth_sfx.py', dir], { cwd: root });
    for (const name of audio.sfx) {
      const left = readFileSync(join(a, `${name}.wav`));
      const right = readFileSync(join(b, `${name}.wav`));
      assert.ok(left.length > 2048, name);
      assert.ok(left.equals(right), name);
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test('the TTS script exits without writing voice files when the engines are missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 's4-tts-'));
  const script = readFileSync(resolve(root, 'tools/stage4/tts_stage4_lines.py'), 'utf8');
  assert.match(script, /audio-manifest\.json/);
  assert.match(script, /No voice files were written/);
  assert.doesNotMatch(script, /silence|b'\\x00'|zeros\(/);
  try {
    const result = spawnSync('python3', ['tools/stage4/tts_stage4_lines.py', dir], {
      cwd: root, encoding: 'utf8', env: { ...process.env, ELEVENLABS_API_KEY: '' },
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /No voice files were written/);
    assert.equal(readdirSync(dir).filter(name => name.endsWith('.mp3')).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the music script exits without writing loops when fluidsynth is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 's4-music-'));
  try {
    const result = spawnSync('python3', ['tools/stage4/compose_stage4.py', dir], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /No music files were written/);
    assert.equal(readdirSync(dir).filter(name => name.endsWith('.mp3')).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const rendered = ['stage4', 'boss4'].map(key => music[key].target).filter(path => existsSync(resolve(root, path)));
test('rendered stage 4 music is over 2 KB and loops', { skip: rendered.length === 2 ? false : 'fluidsynth and FluidR3_GM.sf2 are not installed, so music-stage4.mp3 and music-boss4.mp3 were not rendered. tools/stage4/compose_stage4.py exits without writing them. Loop points are checked only after a real render.' }, () => {
  for (const path of rendered) assert.ok(statSync(resolve(root, path)).size > 2048, path);
  execFileSync('python3', ['tools/music/check_loops.py', resolve(root, 'assets/audio')], { cwd: root });
});

test('stage 4 voice STT', { skip: 'Kokoro is not installed and ELEVENLABS_API_KEY is unset, so tts_stage4_lines.py wrote no voice files. There is nothing to recognize. STT is not reported as a pass.' }, () => {
  assert.fail('STT should not run without voice files');
});
