// Production combat/lifecycle methods with explicit renderer and scene-clock stubs.
// These tests are not rendering, device-performance, or acceptance evidence.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {} };
globalThis.document = { getElementById: () => null, querySelector: () => null, addEventListener() {} };
globalThis.addEventListener = () => {};
const { Stage1 } = await import('../src/stage1.js');
const { Riley } = await import('../src/riley.js');
const { Enemy, Chieftain } = await import('../src/enemies.js');

function visual() {
  const v = {
    alpha: 1, rotation: 0,
    anims: { isPlaying: true, currentFrame: { index: 1 }, currentAnim: { frames: [{ index: 1 }, { index: 2 }, { index: 3 }] },
      pause() { this.paused = true; }, resume() { this.paused = false; }, setCurrentFrame(f) { this.currentFrame = f; } },
    play() { this.anims.isPlaying = true; this.anims.paused = false; return this; },
    destroy() { this.destroyed = true; }, stop() { this.emitting = false; return this; },
  };
  for (const name of ['setScale', 'setAlpha', 'setOrigin', 'setLighting', 'setTint', 'clearTint', 'setPosition', 'setRotation', 'setDepth', 'setBlendMode', 'emitParticleAt']) v[name] = () => v;
  return v;
}

function arena() {
  const s = Object.create(Stage1.prototype), pending = [], events = [];
  const meta = { scale: 1, pages: ['test'], canvas: [100, 100], baseline: 100, anims: [{ pages: [0], frames: ['test'] }] };
  Object.assign(s, {
    metas: Object.fromEntries(['riley', 'chief', 'grunt', 'hound'].map(key => [key, meta])),
    add: { image: visual, sprite: visual, particles: visual }, anims: { exists: () => true },
    enemies: [], carts: [], patches: [], fireballs: [], pickups: [], barrels: [], fires: [],
    bounds: { l: 0, r: 1280 }, zone: { l: 0, r: 1280, boss: true }, maxTokens: 2,
    fx: { trauma: 0, impact() {}, boom() {}, thump() {}, debris: visual(), snowPuff: visual(), embers: visual() },
    lights: { addLight: () => ({}), removeLight() {} },
    time: { now: 0, delayedCall(ms, fn) { pending.push({ at: this.now + ms, fn }); } },
    hud: { gameOver() { events.push('gameOver'); }, stageClear() { events.push('stageClear'); }, hideGameOver() { events.push('hideGameOver'); } },
    scene: { restart() { events.push('restart'); }, pause() {}, resume() {} }, inp: { clear() {} }, caption() {},
    god: false, runId: 1, started: true, ended: false, victoryPending: false, gameOver: false, paused: false,
    pauseReasons: new Set(), clearShown: false, time0: 0,
  });
  s.riley = new Riley(s, 300, 630); s.boss = new Chieftain(s, 700, 630); s.enemies.push(s.boss);
  return { s, events, advance(ms) {
    const end = s.time.now + ms;
    while (true) {
      pending.sort((a, b) => a.at - b.at);
      if (!pending.length || pending[0].at > end) break;
      const next = pending.shift(); s.time.now = next.at; next.fn();
    }
    s.time.now = end;
  } };
}

function killBoss(s) { s.boss.takeHit({ dmg: s.boss.maxHp, kind: 'heavy', down: true }, s.riley); }

test('boss death cancels the second hound after the first has already spawned', () => {
  const { s, advance } = arena();
  s.summonHounds(s.boss); advance(0);
  assert.equal(s.enemies.filter(e => e.type === 'hound').length, 1);
  killBoss(s); advance(500);
  assert.equal(s.victoryPending, true);
  assert.equal(s.enemies.filter(e => e.type === 'hound').length, 1);
  assert.equal(s.enemies.filter(e => e.alive).length, 0);
});

for (const invalidation of ['dead', 'different boss', 'different run', 'victory', 'ended', 'gameOver']) {
  test(`pending summons reject ${invalidation}`, () => {
    const { s, advance } = arena();
    s.summonHounds(s.boss);
    if (invalidation === 'dead') s.boss.alive = false;
    if (invalidation === 'different boss') s.boss = { alive: true };
    if (invalidation === 'different run') s.runId++;
    if (invalidation === 'victory') s.victoryPending = true;
    if (invalidation === 'ended') s.ended = true;
    if (invalidation === 'gameOver') s.gameOver = true;
    advance(500);
    assert.equal(s.enemies.filter(e => e.type === 'hound').length, 0);
  });
}

test('ordinary boss summons still create exactly two hounds', () => {
  const { s, advance } = arena();
  s.summonHounds(s.boss); advance(500);
  assert.equal(s.enemies.filter(e => e.type === 'hound' && e.alive).length, 2);
});

test('in-flight cart and fire patch cannot kill or hurt Riley after boss death; attack restarts', () => {
  const { s, events, advance } = arena();
  const r = s.riley; r.hp = 1; r.lives = 1;
  s.carts.push({ s: visual(), L: {}, trail: visual(), x0: r.x, y0: r.y, z0: 330, tx: r.x, ty: r.y, t: 0.84, T: 0.85, spin: 1 });
  killBoss(s); s.updateCarts(1 / 60);
  assert.equal(s.carts.length, 0); assert.equal(s.patches.length, 1);
  assert.equal(r.hp, 1); assert.equal(r.lives, 1); assert.equal(r.alive, true);
  r.hp = 20; s.updateCarts(0.6); assert.equal(r.hp, 20);
  advance(7400);
  assert.deepEqual(events, ['stageClear']); assert.equal(s.gameOver, false); assert.equal(s.ended, true);
  assert.equal(r.takeHit({ dmg: 100 }, { x: r.x - 1 }), false);
  s.onPress('attack'); assert.deepEqual(events, ['stageClear', 'restart']);
});

test('pending Riley death cannot overwrite an already-committed victory', () => {
  const { s, events, advance } = arena();
  s.riley.hp = 1; s.riley.lives = 1;
  s.riley.takeHit({ dmg: 10 }, s.boss);
  assert.equal(s.riley.lives, 0);
  killBoss(s); advance(7400);
  assert.deepEqual(events, ['stageClear']); assert.equal(s.gameOver, false);
});

test('a later boss death replaces already-shown game-over and attack replays rather than continues', () => {
  const { s, events, advance } = arena();
  // Explicit last-life fixture; normal damage and both production terminal
  // timers run. No such state writes are used by the full-stage input tests.
  s.riley.hp = 1; s.riley.lives = 1;
  s.riley.takeHit({ dmg: 10 }, s.boss); advance(1600);
  assert.equal(s.gameOver, true); assert.deepEqual(events, ['gameOver']);
  killBoss(s);
  assert.equal(s.victoryPending, true); assert.equal(s.gameOver, false);
  assert.deepEqual(events, ['gameOver', 'hideGameOver']);
  assert.equal(s.riley.hp, 0); assert.equal(s.riley.lives, 0, 'Victory does not grant replacement lives');
  advance(7400); s.onPress('attack');
  assert.deepEqual(events, ['gameOver', 'hideGameOver', 'stageClear', 'restart']);
  assert.equal(s.riley.lives, 0, 'Replay never takes the continue branch');
});

test('repeated bossDown cannot schedule multiple clear cards', () => {
  const { s, events, advance } = arena();
  killBoss(s); s.bossDown(s.boss); advance(7400);
  assert.deepEqual(events, ['stageClear']);
});

for (const lives of [1, 2]) test(`ordinary Riley death with ${lives} lives still ${lives === 1 ? 'ends the game' : 'respawns'}`, () => {
  const { s, events, advance } = arena();
  s.riley.hp = 1; s.riley.lives = lives;
  s.riley.takeHit({ dmg: 10 }, s.boss); advance(1600);
  assert.equal(s.riley.lives, lives - 1);
  assert.equal(s.gameOver, lives === 1); assert.equal(s.riley.alive, lives > 1);
  assert.deepEqual(events, lives === 1 ? ['gameOver'] : []);
});

for (const state of ['grab', 'hold', 'knee', 'throw']) test(`Riley dying during ${state} releases its held enemy`, () => {
  const { s, advance } = arena(), r = s.riley, e = new Enemy(s, 'grunt', 392, 630);
  s.enemies.push(e); r.startGrab(e); r.setState(state); r.hp = 1;
  r.takeHit({ dmg: 10 }, s.boss);
  assert.equal(r.held, null); assert.equal(e.heldBy, null); assert.equal(e.state, 'approach');
  assert.equal(e.sprite.anims.paused, false); assert.equal(e.alive, true);
  advance(1600); assert.equal(r.alive, true);
});

test('interrupted airkick landing clears the per-jump attack latch', () => {
  const { s } = arena(), r = s.riley;
  r.setState('airkick', 'airkick'); r.kicked = true; r.z = 80;
  r.takeHit({ dmg: 5 }, s.boss); r.z = 0; r.onLand();
  assert.equal(r.state, 'hurt'); assert.equal(r.kicked, false);
  r.setState('air', 'jump_rise'); r.vz = 100; r.jumpVx = 0;
  r.air(1 / 60, { x: 0, y: 0, take: action => action === 'attack' });
  assert.equal(r.state, 'airkick'); assert.equal(r.kicked, true);
});

test('boss charge respects the same two-attack token limit as melee', () => {
  const { s } = arena(), c = s.boss;
  c.phase = 2; c.nextRoar = 10; c.cool = 0;
  const a = new Enemy(s, 'hound', 400, 630), b = new Enemy(s, 'hound', 500, 630);
  a.setState('attack'); b.setState('attack'); s.enemies.push(a, b);
  const old = Math.random; Math.random = () => 0.5;
  try {
    c.think(0); assert.notEqual(c.state, 'charge'); assert.equal(s.attackTokens(), 2);
    a.setState('approach'); c.think(0); assert.equal(c.state, 'charge'); assert.equal(s.attackTokens(), 2);
  } finally { Math.random = old; }
});

test('Start starts the title, while Esc/P pause still leaves it alone', () => {
  const { s, events } = arena(); s.started = false; s.start = () => events.push('start');
  s.onPress('pause'); assert.deepEqual(events, []);
  s.onPress('start'); assert.deepEqual(events, ['start']);
});

test('Start toggles manual pause during gameplay and cannot dismiss the report', () => {
  const { s } = arena();
  s.onPress('start'); assert.equal(s.paused, true); assert.equal(s.pauseReasons.has('manual'), true);
  s.onPress('start'); assert.equal(s.paused, false);
  s.setPauseReason('report', true); s.onPress('start');
  assert.equal(s.paused, true); assert.equal(s.pauseReasons.has('manual'), false);
  s.setPauseReason('report', false);
});

test('Start continues game-over and replays the completed stage', () => {
  const { s, events } = arena();
  s.gameOver = true; s.riley.alive = false; s.riley.hp = 0; s.riley.lives = 0;
  s.onPress('start'); assert.equal(s.gameOver, false); assert.equal(s.riley.alive, true); assert.equal(s.riley.lives, 3);
  assert.deepEqual(events, ['hideGameOver']);
  s.ended = true; s.clearShown = true; s.onPress('start');
  assert.deepEqual(events, ['hideGameOver', 'restart']);
});

test('failed initial create remains inert when Phaser subsequently calls update', () => {
  const previous = window.__rwbStartup;
  window.__rwbStartup = { failed: true };
  try {
    const s = new Stage1();
    assert.doesNotThrow(() => s.create());
    assert.equal(s.riley, undefined); assert.equal(s.enemies, undefined);
    for (let frame = 0; frame < 10; frame++) assert.doesNotThrow(() => s.update(frame * 16.7, 16.7));
    assert.equal(s.riley, undefined); assert.equal(s.enemies, undefined);
  } finally { if (previous === undefined) delete window.__rwbStartup; else window.__rwbStartup = previous; }
});

test('uninitialized scene update never samples or starts combat', () => {
  const s = new Stage1();
  assert.doesNotThrow(() => s.update(0, 16.7));
  assert.equal(s.started, undefined); assert.equal(s.riley, undefined);
});
