// No dependencies: node --test tests/boss-combat.test.mjs
// Production combat methods; rendering/audio/timer services are small explicit stubs.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
const { Enemy, Chieftain } = await import('../src/enemies.js');

function visual() {
  const v = {
    alpha: 1, anims: { isPlaying: true, currentFrame: { index: 1 }, currentAnim: { frames: [{ index: 1 }, { index: 2 }, { index: 3 }] },
      pause() { this.paused = true; }, resume() { this.paused = false; }, setCurrentFrame(f) { this.currentFrame = f; } },
    play() { this.anims.isPlaying = true; this.anims.paused = false; return this; },
  };
  for (const name of ['setScale', 'setAlpha', 'setOrigin', 'setLighting', 'setTint', 'clearTint']) v[name] = () => v;
  return v;
}
function scene() {
  let now = 0;
  const pending = [];
  const meta = { scale: 1, pages: ['test'], canvas: [100, 100], baseline: 100, anims: [{ pages: [0], frames: ['test'] }] };
  const s = {
    metas: { chief: meta, grunt: meta, hound: meta }, add: { image: visual, sprite: visual }, anims: { exists: () => true },
    riley: { x: 100, y: 630, z: 0, alive: true, state: 'idle' }, enemies: [], bounds: { l: 0, r: 1280 }, maxTokens: 2,
    attackTokens: () => 0, separation: () => 0, deathEvents: [], phases: [], summons: 0, carts: 0, wallHits: [],
    time: { delayedCall(ms, fn) { pending.push({ at: now + ms, fn }); } },
    advance(ms) { now += ms; for (const p of pending.slice()) if (p.at <= now) { pending.splice(pending.indexOf(p), 1); p.fn(); } },
    fx: { trauma: 0, impact() {}, thump() {}, snowPuff: { emitParticleAt() {} } },
    dustLater() {}, onEnemyAttack() {}, resolveAttack() {}, onEnemyDie(e) { this.deathEvents.push(e); },
    onBossPhase(e, p) { this.phases.push(p); }, summonHounds() { this.summons++; }, throwCart() { this.carts++; }, wallHit(x) { this.wallHits.push(x); },
  };
  return s;
}
function chief() { const s = scene(); const c = new Chieftain(s, 700, 630); s.enemies.push(c); return { s, c }; }
const hit = { dmg: 5, kind: 'light', kb: 120 };
function withRandom(value, fn) { const old = Math.random; Math.random = () => value; try { return fn(); } finally { Math.random = old; } }

for (const state of ['attack', 'sweep']) {
  test(`lethal light hit ends armored ${state} exactly once`, () => {
    const { s, c } = chief(); c.setState(state); c.hp = 5;
    assert.equal(c.takeHit(hit, s.riley), true);
    assert.equal(c.alive, false); assert.equal(c.hp, 0); assert.equal(c.state, 'down');
    assert.equal(s.deathEvents.length, 1);
    assert.equal(c.takeHit(hit, s.riley), false); assert.equal(s.deathEvents.length, 1);
  });
  test(`nonlethal light hit preserves ${state} armor and full normal damage`, () => {
    const { s, c } = chief(); c.setState(state);
    assert.equal(c.takeHit(hit, s.riley), true); assert.equal(c.hp, 355); assert.equal(c.state, state);
    assert.equal(c.takeHit({ ...hit, kind: 'heavy' }, s.riley), true); assert.equal(c.state, 'hurt');
  });
}

test('ordinary hits cross all phases without writing HP or phase', () => {
  const { s, c } = chief();
  // Complete only the renderer's animation stub; run real knockdown physics/recovery.
  // The actor starts at its production 360 HP and receives real 5-damage jabs.
  for (let attempt = 0; attempt < 200 && c.phase < 3; attempt++) {
    c.takeHit(hit, s.riley);
    for (let frame = 0; frame < 30; frame++) {
      c.sprite.anims.isPlaying = false;
      c.update(1 / 60); c.physics(1 / 60); s.advance(1000 / 60);
    }
  }
  assert.equal(c.phase, 3); assert.deepEqual(s.phases, [2, 3]);
  assert.ok(c.hp > 0 && c.hp <= c.maxHp * 0.33);
});

test('phase 2 thinks into roar, schedules one summon, and recovers on time', () => {
  const { s, c } = chief(); c.hp = c.maxHp * 0.66; c.cool = 0;
  c.update(0); assert.equal(c.phase, 2); assert.equal(c.state, 'roar');
  s.advance(449); assert.equal(s.summons, 0); s.advance(1); assert.equal(s.summons, 1);
  c.update(1.1); assert.equal(c.state, 'roar'); c.update(0.001); assert.equal(c.state, 'approach');
  s.advance(5000); assert.equal(s.summons, 1);
});

test('dead boss cannot deliver a delayed roar summon', () => {
  const { s, c } = chief(); c.hp = 100; c.cool = 0; c.update(0);
  assert.equal(c.state, 'roar'); c.takeHit({ ...hit, dmg: 200 }, s.riley);
  assert.equal(c.alive, false); s.advance(450); assert.equal(s.summons, 0);
});

test('natural phase 2 decision charges into wall, stuns, and takes bonus damage', () => withRandom(0.5, () => {
  const { s, c } = chief(); c.hp = 230; c.cool = 0; c.phase = 2; c.nextRoar = 10;
  c.update(0); assert.equal(c.state, 'charge'); assert.equal(c.chargeDir, -1);
  for (let i = 0; i < 120 && c.state === 'charge'; i++) { c.update(1 / 60); c.physics(1 / 60); }
  assert.equal(c.state, 'stunned'); assert.equal(s.wallHits.length, 1);
  const before = c.hp; c.takeHit({ ...hit, dmg: 8 }, s.riley); assert.equal(c.hp, before - 10); assert.equal(c.state, 'stunned');
  c.update(2.2); assert.equal(c.state, 'stunned'); c.update(0.001); assert.equal(c.state, 'approach');
}));

test('phase 3 respects cart range then performs lift → one hurl → recovery', () => {
  const { s, c } = chief(); c.hp = 100; c.phase = 3; c.nextRoar = 10; c.nextCart = 0; c.cool = 0;
  s.riley.x = c.x - 260; c.update(0); assert.notEqual(c.state, 'lift');
  s.riley.x = c.x - 261; c.update(0); assert.equal(c.state, 'lift');
  c.update(0.55); assert.equal(s.carts, 0); c.update(0.001); assert.equal(c.state, 'hurl'); assert.equal(s.carts, 1);
  c.update(0.5); assert.equal(c.state, 'hurl'); c.update(0.001); assert.equal(c.state, 'approach'); assert.equal(s.carts, 1);
});

test('held enemy only takes its actual holder’s knee, retaining held state', () => {
  const s = scene(), e = new Enemy(s, 'grunt', 300, 630), holder = { x: 200, state: 'knee', held: e };
  e.grabbed(holder); const knee = { anim: 'knee', dmg: 8, kind: 'medium', kb: 0 };
  assert.equal(e.canBeHit, false); assert.equal(e.takeHit(knee, { ...holder }), false);
  assert.equal(e.takeHit(hit, holder), false); assert.equal(e.hp, 42);
  assert.equal(e.takeHit(knee, holder), true); assert.equal(e.hp, 34); assert.equal(e.state, 'held');
  holder.held = null; assert.equal(e.takeHit(knee, holder), false);
  holder.held = e; holder.state = 'idle'; assert.equal(e.takeHit(knee, holder), false);
  e.release(); assert.equal(e.heldBy, null); assert.equal(e.state, 'approach');
});

test('lethal knee awards one death; throw clears holder identity', () => {
  const s = scene(), e = new Enemy(s, 'grunt', 300, 630), holder = { x: 200, state: 'knee', held: e };
  e.grabbed(holder); e.hp = 8;
  assert.equal(e.takeHit({ anim: 'knee', dmg: 8, kind: 'medium' }, holder), true);
  assert.equal(e.alive, false); assert.equal(e.heldBy, null); assert.equal(s.deathEvents.length, 1);
  assert.equal(e.sprite.anims.paused, false);
  const thrown = new Enemy(s, 'grunt', 300, 630); thrown.grabbed(holder); thrown.throwFrom(holder, -1);
  assert.equal(thrown.heldBy, null); assert.equal(thrown.state, 'thrown');
});

for (const lethal of [false, true]) test(`thrown body resumes animation on landing and ${lethal ? 'finishes dying' : 'gets up'}`, () => {
  const s = scene(), e = new Enemy(s, 'grunt', 300, 630), holder = { x: 200 };
  if (lethal) e.hp = 10;
  e.throwFrom(holder, 1); assert.equal(e.sprite.anims.paused, true);
  for (let frame = 0; frame < 120 && e.state === 'thrown'; frame++) { e.update(1 / 60); e.physics(1 / 60); }
  assert.equal(e.state, 'down'); assert.equal(e.sprite.anims.paused, false); assert.equal(e.sprite.anims.currentFrame.index, 3);
  assert.equal(e.alive, !lethal); assert.equal(s.deathEvents.length, lethal ? 1 : 0);
  e.sprite.anims.isPlaying = false; e.update(1);
  assert.equal(e.state, lethal ? 'dead' : 'getup');
});
