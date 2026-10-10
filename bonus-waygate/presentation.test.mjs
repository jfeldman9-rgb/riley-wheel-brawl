import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { sfx } from '../src/audio.js';
import { MusicDirector, STAGE_MUSIC } from '../src/music.js';

const P = createRequire(import.meta.url)('./presentation.js');
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

test('Waygate cues fire the stage sound effects, and the red-flash tell is not the strike', () => {
  const heard = [];
  const fake = {};
  for (const name of Object.keys(sfx)) fake[name] = (...args) => heard.push([name, ...args]);
  const expect = {
    hit: 'hit',
    whiff: 'whiff',
    kick: 'swing',
    jump: 'jump',
    land: 'land',
    step: 'step',
    grunt: 'grumble',
    death: 'thud',
    fireball: 'fire',
    boom: 'boom',
    balefire: 'balefire',
    crack: 'creak',
    fall: 'fall',
    tell: 'glint',
    strike: 'impact',
    checkpoint: 'pickup',
    wave: 'horn',
    clear: 'levelClear',
    gameover: 'gameOver',
    hurt: 'hurt'
  };
  for (const [event, method] of Object.entries(expect)) {
    heard.length = 0;
    assert.equal(P.playCue(fake, event, event === 'hit'), true, event);
    assert.equal(heard.length, 1, `${event} should fire once`);
    assert.equal(heard[0][0], method, event);
  }
  assert.equal(heard[0][0], 'hurt');
  heard.length = 0;
  P.playCue(fake, 'tell');
  const tell = heard[0][0];
  heard.length = 0;
  P.playCue(fake, 'strike');
  assert.notEqual(heard[0][0], tell, 'the red flash needs its own cue');
  assert.equal(P.playCue(fake, 'nope'), false);
  assert.equal(P.playCue(null, 'hit'), false);
  assert.doesNotThrow(() => {
    for (const event of Object.keys(expect)) P.playCue(sfx, event, false);
  });
});

test('the Ways backdrop is at least three parallax layers under the texture cap', () => {
  assert.ok(P.BACKDROP_LAYERS.length >= 3);
  const factors = P.BACKDROP_LAYERS.map((layer) => layer.scrollFactor);
  assert.equal(new Set(factors).size, factors.length, 'each layer scrolls at its own rate');
  assert.ok(factors.filter((n) => n > 0).length >= 3, 'three layers should actually parallax');
  assert.ok(P.BACKDROP_LAYERS.some((layer) => layer.name === 'void'));
  assert.ok(P.BACKDROP_LAYERS.some((layer) => layer.name === 'islands'));
  assert.ok(P.BACKDROP_LAYERS.some((layer) => layer.name === 'machin' && layer.scrollFactor === 0));
  for (const tex of Object.values(P.TEXTURES)) {
    assert.ok(tex.w <= P.TEXTURE_LIMIT && tex.h <= P.TEXTURE_LIMIT, tex.key);
    assert.ok(tex.w >= 2 && tex.h >= 2);
  }
  assert.equal(STAGE_MUSIC[P.MUSIC_STAGE].stage, 'stage2');
  assert.equal(STAGE_MUSIC[P.MUSIC_STAGE].boss, 'boss2');
  const log = [];
  const director = new MusicDirector((id, opts) => log.push([id, opts.fade]), P.MUSIC_STAGE);
  director.set('title');
  director.set('stage');
  director.set('boss');
  director.set('victory');
  assert.deepEqual(log.map((row) => row[0]), ['title', 'stage2', 'boss2', null]);
});

test('the Waygate scene wires those cues and layers through the stage audio modules', () => {
  const game = read('./game.js');
  const boot = read('./boot-input.js');
  const html = read('./index.html');
  assert.match(html, /presentation\.js/);
  assert.match(boot, /from\s+['"]\.\.\/src\/audio\.js['"]/);
  assert.match(boot, /from\s+['"]\.\.\/src\/music\.js['"]/);
  assert.match(boot, /import\(\s*['"]\.\.\/src\/fx\.js['"]\s*\)/);
  assert.match(game, /new window\.WaygateFX/);
  assert.match(game, /setBlendMode\('ADD'\)/);
  assert.match(game, /'ember'/);
  assert.match(game, /fx\.boom/);
  assert.match(game, /dmg: 14/);
  assert.match(game, /680 \* dt/);
  assert.match(game, /riley_cast/);
  assert.match(boot, /assets\/audio\//);
  assert.match(boot, /\.\.\/'\s*\+\s*url/);
  assert.match(game, /backdropLayers/);
  assert.match(game, /WaygatePresentation/);
  assert.match(game, /installAudioLifecycle/);
  assert.match(game, /unlockAudio|audio\.unlock|\.unlock\(\)/);
  assert.match(game, /toggleMute/);
  assert.match(game, /toggleMusic/);
  for (const event of ['hit', 'whiff', 'kick', 'jump', 'land', 'step', 'grunt', 'death', 'fireball', 'boom', 'balefire', 'crack', 'fall', 'tell', 'strike', 'checkpoint', 'wave', 'clear']) {
    assert.match(game, new RegExp(`cue\\('${event}'`), `missing cue ${event}`);
  }
  assert.doesNotMatch(game, /\bsay\s*\(/);
  assert.doesNotMatch(game, /preloadVoices/);
  assert.doesNotMatch(boot, /preloadVoices/);
  assert.match(read('./ART-PROMPTS.md'), /Machin Shin/);
  assert.match(read('./ART-PROMPTS.md'), /Guiding stone/);
});
