// Softlock audit regressions. Phaser's hasFocus stays false until a focus event;
// these cases do not pre-set hasFocus = true.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { TILE_BANDS, TILES } from '../src/stage3-hazards.js';
import { STAGE3 } from '../src/stages.js';
import { VW } from '../src/config.js';
import { CUTTHROAT } from '../src/darkfriends.js';
import { FadeCopy, Myrddraal } from '../src/myrddraal.js';

const { Stage1 } = await import('../src/stage1.js');

test('Stage 3 stays unpaused when the document is focused and a press clears a focus-only pause', () => withSeed(3, () => {
  const prev = document.hasFocus;
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    document.hasFocus = () => true;
    arena(s);
    s.game.events = new EventEmitter();
    s.game.hasFocus = false;
    s.kit.suspendCleanup = null;
    s.kit.start();
    assert.equal(s.pauseReasons.has('window-blur'), false, 'document focus wins over Phaser hasFocus false');
    assert.equal(s.paused, false);

    s.game.events.emit('blur');
    assert.equal(s.paused, true);
    s.onPress('attack');
    assert.equal(s.pauseReasons.has('window-blur'), false);
    assert.equal(s.pauseReasons.has('manual'), false);
    assert.equal(s.paused, false);

    s.game.events.emit('blur');
    s.onPress('start');
    assert.equal(s.paused, false);
    assert.equal(s.pauseReasons.has('manual'), false, 'focus-only Start does not toggle manual');

    s.setPauseReason('manual', true);
    s.setPauseReason('window-blur', true);
    s.onPress('start');
    assert.equal(s.pauseReasons.has('window-blur'), false);
    assert.equal(s.pauseReasons.has('manual'), false);

    let pressed = null;
    s.cutscene = { press(a) { pressed = a; } };
    s.setPauseReason('cutscene', true);
    s.setPauseReason('window-blur', true);
    s.onPress('attack');
    assert.equal(pressed, 'attack', 'a press still advances a story card');
    assert.equal(s.pauseReasons.has('window-blur'), false);
    assert.equal(s.pauseReasons.has('cutscene'), true);
    s.cutscene = null;
    s.setPauseReason('cutscene', false);

    delete document.hasFocus;
    s.kit.suspendCleanup?.();
    s.kit.suspendCleanup = null;
    s.game.hasFocus = false;
    s.kit.start();
    assert.equal(s.pauseReasons.has('window-blur'), true, 'without document.hasFocus, Phaser hasFocus false still pauses');
  } finally {
    if (prev) document.hasFocus = prev;
    else delete document.hasFocus;
    h.destroy();
  }
}));

test('a held Riley is not targeted by a new roof tile', () => withSeed(4, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = { ...STAGE3.zones[2], waves: [] }; s.locked = true; s.wave = 0; s.waveGap = 0;
    kit.tileT = 0.05;
    const c = placeC(s, -46);
    c.startHold(s.riley);
    const before = kit.tileT, tiles = kit.stats.tiles;
    for (let i = 0; i < 60; i++) h.step();
    assert.equal(s.riley.grabbedBy, c);
    assert.equal(kit.tiles.length, 0);
    assert.equal(kit.stats.tiles, tiles);
    assert.equal(kit.tileHits ?? kit.stats.tileHits, 0);
    assert.equal(kit.tileT, before, 'the warning clock waits out the hold');
  } finally { h.destroy(); }
}));

test('every marked roof band draws a tile, and an unmarked sprite band cannot hit', () => withSeed(5, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = { ...STAGE3.zones[2], waves: [] }; s.locked = true; s.wave = 0;
    const random = Math.random;
    Math.random = () => 0;
    kit.startTile();
    Math.random = random;
    const tile = kit.tiles[0];
    assert.equal(tile.bands.length, 2);
    tile.t = TILES.warn;
    kit.updateTiles(1 / 60);
    assert.equal(tile.imgs.length, tile.bands.length);
    assert.equal(tile.img, tile.imgs[0]);
    for (const b of tile.bands) {
      const [y0, y1] = TILE_BANDS[b];
      const im = tile.imgs.find(i => i.band === b);
      assert.ok(im, `band ${b} has a sprite`);
      assert.ok(im.y >= y0 && im.y <= y1, `sprite y ${im.y} inside band ${b}`);
    }
    const ghost = [0, 1, 2].find(b => !tile.bands.includes(b));
    tile.bands.push(ghost);
    const [y0, y1] = TILE_BANDS[ghost];
    s.riley.y = (y0 + y1) / 2;
    s.riley.inv = 0; s.riley.z = 0;
    const hp = s.riley.hp, hits = kit.stats.tileHits;
    tile.x = s.riley.x;
    kit.updateTiles(1 / 60);
    assert.equal(kit.stats.tileHits, hits);
    assert.equal(s.riley.hp, hp, 'a marked band with no tile does not hit');

    const drawn = tile.imgs.slice();
    tile.dir = 1;
    tile.x = s.camX + VW + 200;
    kit.updateTiles(1 / 60);
    assert.equal(kit.tiles.length, 0);
    assert.ok(drawn.every(im => im.dead), 'sweep destroys every band sprite');

    Math.random = () => 0;
    kit.startTile();
    Math.random = random;
    const tile2 = kit.tiles[0];
    tile2.t = TILES.warn;
    kit.updateTiles(1 / 60);
    const drawn2 = tile2.imgs.slice();
    kit.clearHazards();
    assert.equal(kit.tiles.length, 0);
    assert.ok(drawn2.every(im => im.dead), 'clearHazards destroys every band sprite');
  } finally { h.destroy(); }
}));

test('escaping a cutthroat grants i-frames that block a chain grab', () => withSeed(6, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const c = placeC(s, -46);
    c.startHold(s.riley);
    for (let i = 0; i < CUTTHROAT.mashNeed; i++) c.mash();
    assert.equal(s.riley.state, 'escape');
    for (let i = 0; i < 180 && s.riley.state !== 'idle'; i++) h.step();
    assert.equal(s.riley.state, 'idle');
    assert.ok(s.riley.inv > 0.4 && s.riley.inv <= 0.45, `inv ${s.riley.inv} covers one lunge window`);

    const b = placeC(s, 40);
    b.setState('lunge', 'lunge');
    b.st = CUTTHROAT.coil + 0.05;
    b.lungeDir = Math.sign(s.riley.x - b.x) || -1;
    b.y = s.riley.y;
    h.step();
    assert.equal(s.riley.grabbedBy, null);
    assert.ok(s.riley.inv > 0);
  } finally { h.destroy(); }
}));

test('game over freezes new tiles, waves and Fade-copy lunges', () => withSeed(7, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    s.zoneI = 2; s.zone = { ...STAGE3.zones[2] }; s.locked = true; s.wave = 0; s.waveGap = 0;
    s.enemies = [];
    kit.tileT = 0.05;
    s.gameOver = true;
    s.riley.alive = false;
    const boss = new Myrddraal(s, 900, 630);
    boss.entering = false; boss.introDone = true;
    const copy = new FadeCopy(s, s.riley.x + 80, s.riley.y, boss);
    copy.lungeAt = 0;
    s.enemies.push(copy);
    const before = [kit.tileT, kit.stats.tiles, s.wave, s.zoneI];
    for (let i = 0; i < 90; i++) h.step();
    assert.deepEqual([kit.tileT, kit.stats.tiles, s.wave, s.zoneI], before);
    assert.notEqual(copy.state, 'lunge');
  } finally { h.destroy(); }
}));

test('fear decays during i-frames and does not shake the frame they end', () => withSeed(8, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const R = s.riley;
    const f = new Myrddraal(s, R.x, R.y);
    Object.assign(f, { entering: false, introDone: true, auraOn: true, fear: 0.85, braveT: 0, dispelT: 0, cool: 99, nextBlink: 99 });
    f.T.speed = 0;
    s.enemies.push(f);
    s.boss = f;
    R.inv = 1.2; R.state = 'idle';
    for (let i = 0; i < 30; i++) h.step();
    assert.ok(R.inv > 0);
    assert.ok(f.fear < 0.85, `fear ${f.fear} should decay while invulnerable`);
    for (let i = 0; i < 90 && R.inv > 0; i++) h.step();
    assert.ok(R.inv <= 0);
    assert.ok(f.fear < 1);
    assert.notEqual(R.state, 'hurt');
  } finally { h.destroy(); }
}));

test('a dead Riley stays down on the clear screen', () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const R = s.riley;
    s.victoryPending = true;
    R.alive = false; R.hp = 0;
    R.setState('down', 'knockdown');
    R.st = 98.5; R.z = 0;
    for (let i = 0; i < 130; i++) h.step();
    assert.equal(R.state, 'down');
    assert.equal(R.alive, false);
  } finally { h.destroy(); }
}));

test('a hit that interrupts an escape clears lastGrabber', () => withSeed(10, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const c = placeC(s, -46);
    c.startHold(s.riley);
    for (let i = 0; i < CUTTHROAT.mashNeed; i++) c.mash();
    assert.equal(s.riley.state, 'escape');
    assert.equal(s.riley.lastGrabber, c);
    s.riley.inv = 0; s.riley.hp = 40; s.riley.hurtStreak = 0;
    s.riley.takeHit({ dmg: 1, kind: 'light', kb: 10 }, { x: s.riley.x - 30, team: 1 });
    assert.equal(s.riley.state, 'hurt');
    assert.equal(s.riley.lastGrabber, null);
  } finally { h.destroy(); }
}));

test('leaving Stage 3 releases the Fade portrait', () => {
  const resident = new Set(['fadePortrait', 'arrow', 'far3_day']);
  const scene = {
    textures: {
      exists: key => resident.has(key),
      remove: key => { resident.delete(key); },
    },
    anims: { exists: () => false, remove() {} },
    cache: { json: { get: () => null } },
  };
  Stage1.prototype.releaseStage.call(scene, 1, 3);
  assert.equal(resident.has('fadePortrait'), false);
  assert.equal(resident.has('arrow'), false);
});
