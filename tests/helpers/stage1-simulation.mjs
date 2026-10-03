// Headless logic harness. Runs production Stage1.create/update, combat, camera,
// Bot, Input and FX timing with shipped animation frame holds.
// Phaser rendering, audio output, particles, HUD drawing, tweens and scene clock
// are explicit stubs. Resource counts concern these logical handles, not GPU,
// browser memory, frame cadence, visual playability or physical-device gates.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { createFrameClock, startFrameClock, advanceFrameClock } from './animation-clock.mjs';

globalThis.location = { search: process.env.RWB_SEARCH || '' };   // RWB_SEARCH: a child-process probe of URL params (default: none)
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {}, BlendModes: { ADD: 1 }, Renderer: { WebGL: { RenderNodes: { SubmitterQuad: class { setRenderOptions() {} } } } } };
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true });

const { Stage1 } = await import('../../src/stage1.js');
const { Bot } = await import('../../src/bot.js');
const { Input } = await import('../../src/input.js');
const { perf } = await import('../../src/perf.js');
const readJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const metas = Object.fromEntries(['riley', 'chief', 'hound', 'grunt', 'spear', 'loial', 'zealot', 'archer', 'byar'].map(key => [key, readJSON(`../../assets/chars/${key}.anims.json`)]));
const animations = Object.fromEntries(Object.values(metas).flatMap(m => m.anims.map(a => [a.name, a])));
const plates = readJSON('../../assets/bg/plates.json');
const staves = Object.keys(readJSON('../../assets/props/staves.json').frames);
const planks = Object.keys(readJSON('../../assets/props/planks.json').frames);
const jsonCache = { plates, plates2: readJSON('../../assets/bg2/plates.json'), lights2: readJSON('../../assets/bg2/lights.json') };

export function withSeed(seed, fn) {
  const random = Math.random, tick = perf.tick;
  Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  perf.tick = () => {}; // Synthetic time must never become performance evidence.
  try { return fn(); } finally { Math.random = random; perf.tick = tick; }
}

// Seed 97 retains an exploratory run for regression coverage. Combo counts are
// recorded from this final harness, never assumed from an earlier clock stub.
export const FULL_STAGE_SEEDS = [1, 2, 3, 4, 5, 10, 20, 100, 97];
export const FULL_STAGE_MODES = ['1', 'boss-coverage'];

// stage: 2 creates the scene as Stage 2 (Baerlon). followRestart: forward scene.restart(data) into the next create(data)
// (the default keeps the original data-less restart, which recreates the stage the harness started with).
export function stage1Simulation({ mode = '1', stage, followRestart = false } = {}) {
  const visuals = new Set(), lights = new Set(), timers = [], tweens = [], fighters = new Set();
  let wallTime = 0, restartRequested = false, restartData, controllerMode = mode, hudLaunchRequested = false;
  const observations = { spawns: [], deaths: [], zones: [], waves: [], entries: new Map(), hud: [], peak: {}, restarts: 0, restartData: [] };
  const peak = values => { for (const [key, value] of Object.entries(values)) observations.peak[key] = Math.max(observations.peak[key] || 0, value); };
  function visual(x = 0, y = 0, key = '') {
    const anims = createFrameClock();
    const v = {
      anims, x, y, key, alpha: 1, rotation: 0, width: 2048, height: 1024, displayWidth: 2048, emitting: false,
      destroy() { this.dead = true; visuals.delete(this); },
      play(name) {
        const data = animations[name]; assert.ok(data, `Shipped animation exists: ${name}`);
        startFrameClock(anims, data); return this;
      },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setAlpha(alpha) { this.alpha = alpha; return this; },
      setRotation(rotation) { this.rotation = rotation; return this; },
      setScale(scale) { this.displayWidth = this.width * scale; return this; },
      stop() { this.emitting = false; return this; },
    };
    for (const method of ['setLighting', 'setDepth', 'setTint', 'clearTint', 'setOrigin', 'setBlendMode', 'setVisible', 'emitParticleAt', 'setScrollFactor', 'setTileScale', 'setTilePosition', 'fillGradientStyle', 'fillRect', 'generateTexture', 'setDisplaySize']) v[method] = () => v;
    visuals.add(v); return v;
  }
  function animate(dt, globalTimeScale) {
    for (const v of visuals) advanceFrameClock(v.anims, dt, globalTimeScale);
  }
  const s = new Stage1();
  const camera = { setOrigin() {}, setZoom() {}, setRoundPixels() {}, setScroll(x, y) { this.x = x; this.y = y; },
    filters: { internal: { remove() {}, addParallelFilters() { return { top: { addThreshold() {}, addBlur() {} }, blend: {} }; } }, external: { addVignette() { return {}; }, remove() {} } } };
  const hud = {};
  for (const method of ['caption', 'hideTitle', 'bossBar', 'target', 'combo', 'go', 'flashText', 'togglePerf', 'hideGameOver', 'gameOver', 'stageClear', 'showCutscene', 'cutsceneLine', 'hideCutscene', 'titleSelect', 'ribbon']) hud[method] = (...args) => observations.hud.push({ method, at: s.time.now, args });
  Object.assign(s, {
    events: new EventEmitter(), cameras: { main: camera },
    add: { image: visual, sprite: visual, tileSprite: visual, particles(x, y, key, config) { const v = visual(x, y, key); v.emitting = config.emitting !== false; return v; } },
    make: { graphics: () => visual() },
    textures: { exists: () => true, get: key => ({ source: [{}], getSourceImage: () => ({ width: 2048, height: 1024 }), getFrameNames: () => key === 'staves' ? staves : key === 'planks' ? planks : [] }) },
    cache: { json: { get: key => jsonCache[key] || metas[key.replace(/\.A$/, '')] } },
    anims: { exists: key => !!animations[key], globalTimeScale: 1 },
    lights: { enable() { return this; }, setAmbientColor() {}, addLight(x, y, radius, color, intensity) { const L = { x, y, radius, color, intensity, visible: true, setScrollFactor() { return this; }, setVisible(v) { this.visible = v; return this; } }; lights.add(L); return L; }, removeLight(L) { lights.delete(L); } },
    time: { now: 0, delayedCall(ms, fn) { const timer = { delay: ms, elapsed: 0, fn, remove() { const i = timers.indexOf(this); if (i >= 0) timers.splice(i, 1); } }; timers.push(timer); return timer; } },
    tweens: { add(config) { tweens.push({ config, elapsed: 0, counter: false }); }, addCounter(config) { tweens.push({ config, elapsed: 0, counter: true }); } },
    scene: { launch() { hudLaunchRequested = true; }, get: () => hud, pause() {}, resume() {}, stop() {}, restart(data) { observations.restarts++; observations.restartData.push(data); restartData = data; restartRequested = true; } },
    game: { inp: new Input(), rs: 1, governor() {} },
  });
  const spawn = s.spawn, die = s.onEnemyDie;
  s.spawn = function(type, side) { const e = spawn.call(this, type, side); fighters.add(e); observations.spawns.push({ type, side, zone: this.zoneI, wave: this.wave, at: this.time.now, id: e.id, run: this.runId }); observations.entries.set(e.id, { start: this.time.now, end: null }); return e; };
  s.onEnemyDie = function(e) { observations.deaths.push({ type: e.type, id: e.id, at: this.time.now, run: this.runId }); return die.call(this, e); };
  s.create(stage ? { stage } : undefined);
  s.bot = mode ? new Bot(s, { mode }) : null;
  s.inp.press('start');
  const baseline = { visuals: visuals.size, lights: lights.size };
  function shutdown() {
    s.events.emit('shutdown'); timers.length = 0; tweens.length = 0;
    hudLaunchRequested = false;
    // Explicit SceneManager/display-list cleanup stub. Source listeners and
    // Stage1.create are real; Phaser's renderer/HUD shutdown is not exercised.
    for (const v of visuals) v.destroy();
    lights.clear(); fighters.clear();
  }
  function observe() {
    if (s.zone && !observations.zones.includes(s.zoneI)) observations.zones.push(s.zoneI);
    const wave = `${s.zoneI}:${s.wave}`;
    if (s.zone && !s.zone.boss && s.wave >= 0 && !observations.waves.includes(wave)) observations.waves.push(wave);
    for (const e of fighters) {
      const entry = observations.entries.get(e.id);
      if (entry.end === null && !e.entering) entry.end = s.time.now;
    }
    peak({ visuals: visuals.size, lights: lights.size, timers: timers.length, tweens: tweens.length, enemies: s.enemies.length, liveEnemies: s.enemies.filter(e => e.alive).length,
      fireballs: s.fireballs.length, carts: s.carts.length, patches: s.patches.length, pickups: s.pickups.length, booms: s.fx.booms.length });
  }
  return {
    s, observations, baseline, fighters,
    setController(mode) { controllerMode = mode; s.bot = mode ? new Bot(s, { mode }) : null; s.inp.clear(); },
    resources() { return { visuals: visuals.size, lights: lights.size, timers: timers.length, tweens: tweens.length }; },
    step(dt = 1 / 60) {
      if (restartRequested) {
        restartRequested = false; shutdown(); s.create(followRestart ? restartData : (stage ? { stage } : undefined));
        s.bot = controllerMode ? new Bot(s, { mode: controllerMode }) : null;
      }
      wallTime += dt * 1000;
      s.inp.update(dt); // The game-step input hook keeps running while paused.
      // Scene.launch queues HUD creation. Input can request Start first; this
      // explicit deferred HUD stub performs the production readiness handshake.
      if (hudLaunchRequested) {
        hudLaunchRequested = false; s.hudReady = true;
        if (s.startRequested) s.start();
        window.__rwbStartup?.ready();
      }
      // Explicit HUD-scene stub: the HUD scene keeps updating while Stage1 is
      // paused, and production HUD.update drives the Twix cutscene clock.
      if (s.paused) { s.tickCutscene?.(dt); return; }
      // Pinned CoreScene UpdateList precedes DefaultScene Clock/TweenManager.
      animate(dt, s.anims.globalTimeScale);
      // Phaser Clock.now uses game time, while timer elapsed uses only active
      // scene deltas. A pause must not fast-forward delayed callbacks on resume.
      s.time.now = wallTime;
      for (const timer of timers.slice()) {
        timer.elapsed += dt * 1000;
        if (timer.elapsed >= timer.delay) { timer.remove(); timer.fn(); }
      }
      for (const tween of tweens.slice()) {
        const { config } = tween; tween.elapsed += dt * 1000;
        const elapsed = tween.elapsed - (config.delay || 0);
        if (elapsed < 0) continue;
        const progress = Math.min(1, elapsed / (config.duration || 1));
        if (tween.counter && config.onUpdate) config.onUpdate({ getValue: () => config.from + (config.to - config.from) * progress });
        if (progress >= 1) { tweens.splice(tweens.indexOf(tween), 1); config.onComplete?.(); }
      }
      s.update(s.time.now, dt * 1000); observe();
    },
    summary() { return { seconds: s.time.now / 1000, zone: s.zoneI, wave: s.wave, ended: s.ended, gameOver: s.gameOver, hp: s.riley.hp, lives: s.riley.lives, score: s.riley.score, maxCombo: s.riley.maxCombo,
      player: { x: s.riley.x, y: s.riley.y, state: s.riley.state }, boss: s.boss && { hp: s.boss.hp, state: s.boss.state, phase: s.boss.phase },
      enemies: s.enemies.map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, hp: e.hp, entering: e.entering, state: e.state })),
      zones: observations.zones, waves: observations.waves, peak: observations.peak, coverage: s.bot?.coverage }; },
    destroy: shutdown,
  };
}
