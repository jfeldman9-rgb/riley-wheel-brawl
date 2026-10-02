// node --test tests/bot-boss-simulation.test.mjs
// Headless logic integration, not a device/performance/rendering pass.
// Uses actual Stage1, Riley, Enemy, Bot, Input, shipped animation holds and damage.
// Renderer/audio are stubs; animation/clock advance at 60 Hz. No fighter HP/phase,
// boss attack/cooldown, movement, inventory or lives are altered after construction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {} };
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { getElementById: () => null, querySelector: () => null };
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true });
const { Stage1 } = await import('../src/stage1.js');
const { Riley } = await import('../src/riley.js');
const { Chieftain } = await import('../src/enemies.js');
const { Bot } = await import('../src/bot.js');
const { Input } = await import('../src/input.js');
const { perf } = await import('../src/perf.js');
const metas = Object.fromEntries(['riley', 'chief', 'hound', 'grunt', 'spear'].map(key => [
  key, JSON.parse(readFileSync(new URL(`../assets/chars/${key}.anims.json`, import.meta.url))),
]));
const animations = Object.fromEntries(Object.values(metas).flatMap(m => m.anims.map(a => [a.name, a])));

function harness() {
  const visuals = [];
  function visual() {
    const anims = {
      isPlaying: false, currentFrame: { index: 1 }, currentAnim: { frames: [] }, timeScale: 1, paused: false,
      pause() { this.paused = true; }, resume() { this.paused = false; },
      setCurrentFrame(frame) { this.currentFrame = frame; this.index = frame.index - 1; this.elapsed = 0; },
    };
    const v = {
      anims, alpha: 1, rotation: 0,
      destroy() { this.dead = true; },
      play(key) {
        const data = animations[key]; assert.ok(data, `Shipped animation exists: ${key}`);
        Object.assign(anims, { data, index: 0, elapsed: 0, currentAnim: { frames: data.frames.map((_, i) => ({ index: i + 1 })) }, isPlaying: true, paused: false });
        anims.currentFrame = anims.currentAnim.frames[0]; return this;
      },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setAlpha(alpha) { this.alpha = alpha; return this; },
      setRotation(rotation) { this.rotation = rotation; return this; },
      stop() { this.emitting = false; return this; },
    };
    for (const name of ['setLighting', 'setScale', 'setDepth', 'setTint', 'clearTint', 'setOrigin', 'setBlendMode', 'emitParticleAt']) v[name] = () => v;
    visuals.push(v); return v;
  }
  function animate(dt, globalTimeScale) {
    for (const v of visuals) {
      const a = v.anims;
      if (v.dead || !a.isPlaying || a.paused) continue;
      a.elapsed += dt * 1000 * globalTimeScale * a.timeScale;
      // Phaser 4.2.1 uses each nonzero frame duration instead of msPerFrame.
      while (a.elapsed >= a.data.holds[a.index]) {
        a.elapsed -= a.data.holds[a.index]; a.index++;
        if (a.index >= a.data.frames.length) {
          if (a.data.loop) a.index = 0;
          else { a.isPlaying = false; a.index = a.data.frames.length - 1; break; }
        }
        a.currentFrame = a.currentAnim.frames[a.index];
      }
    }
  }
  const s = Object.create(Stage1.prototype), pending = [];
  s.time = { now: 0, delayedCall(ms, fn) { pending.push({ at: this.now + ms, fn }); } };
  Object.assign(s, {
    metas, add: { image: visual, sprite: visual, particles: visual },
    anims: { exists: key => !!animations[key], globalTimeScale: 1 },
    lights: { addLight: () => ({}), removeLight() {} },
    enemies: [], fireballs: [], carts: [], patches: [], pickups: [], barrels: [], fires: [],
    fx: {
      quality: 0, hitstop: 0, slowmo: 0, trauma: 0, update() {},
      impact(kind) { this.hitstop = Math.max(this.hitstop, ({ light: 4, medium: 6, heavy: 9, finisher: 14 }[kind] || 0) / 60); },
      thump() {}, boom() {}, snowPuff: visual(), embers: visual(), debris: visual(),
    },
    // Construct the arena directly; this test does not claim wave/entry coverage.
    bounds: { l: 0, r: 1280 }, zone: { l: 0, r: 1280, boss: true }, zoneI: 3, locked: true, maxTokens: 2,
    started: true, ended: false, gameOver: false, timeScale: 1, lightsOn: false, heroLight: {}, camX: 0, time0: 0,
    hud: { target() {}, combo() {}, flashText() {}, stageClear() {}, gameOver() {} },
    game: { governor() {} }, caption() {}, updateCamera() {}, god: false,
  });
  s.inp = new Input(); s.riley = new Riley(s, 200, 630); s.boss = new Chieftain(s, 1000, 630);
  s.enemies.push(s.boss); s.bot = new Bot(s, { mode: 'boss-coverage' });
  return {
    s,
    step() {
      const dt = 1 / 60; s.time.now += dt * 1000;
      for (const p of pending.slice()) if (p.at <= s.time.now) { pending.splice(pending.indexOf(p), 1); p.fn(); }
      animate(dt, s.anims.globalTimeScale);
      // Mirrors the game's pre-step input hook (also active while scene is paused).
      s.inp.update(dt); s.update(s.time.now, dt * 1000);
    },
  };
}

for (const initialSeed of [1, 2, 3, 4, 5, 10, 20, 100]) {
  test(`input-only coverage naturally clears boss arena, seed ${initialSeed}`, () => {
    const previousRandom = Math.random, previousTick = perf.tick;
    let seed = initialSeed;
    Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    perf.tick = () => {}; // Synthetic time is not renderer performance evidence.
    try {
      const { s, step } = harness();
      assert.equal(s.riley.hp, 100); assert.equal(s.riley.lives, 3); assert.equal(s.boss.hp, 360);
      // A deadline detects hangs. Success still requires actual clear and all evidence.
      for (let frame = 0; frame < 60 * 300 && !s.ended && !s.gameOver; frame++) step();
      const result = JSON.stringify({ seconds: s.time.now / 1000, hp: s.boss.hp, state: s.boss.state, coverage: s.bot.coverage });
      assert.equal(s.gameOver, false, result);
      assert.equal(s.boss.alive, false, result);
      assert.equal(s.ended, true, result);
      assert.equal(s.bot.coverage.complete, true, result);
      assert.ok(s.riley.lives > 0, result);
      assert.deepEqual(s.bot.coverage.phases, [1, 2, 3]);
    } finally { Math.random = previousRandom; perf.tick = previousTick; }
  });
}
