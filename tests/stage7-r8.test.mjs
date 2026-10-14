import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed } from './helpers/stage7-harness.mjs';
import { Asmodean, ASMODEAN, bashRiley } from '../src/asmodean.js';
import { strikeRiley } from '../src/stage6-hurt.js';
import { HUD } from '../src/hud.js';
import { LINES } from '../src/stage7-voice.js';
import { STORY7_SCRIPT, STORY7_PANELS } from '../src/stage7.js';
import { installDialogKeys7 } from '../src/stage7-lifecycle.js';
import { queueStage7Painted } from '../src/stage7-load.js';
import { EventEmitter } from 'node:events';

function fixture(fn) {
  return withSeed(1, () => {
    const h = stage7Simulation({ mode: false }), s = h.s;
    h.setController(null); s.pending = []; s.enemies = [];
    s.zoneI = s.kit._zone = 3; s.zone = s.zones[3];
    s.camX = s.camMax = 3920; s.bounds = { l: 3920, r: 5200 };
    s.riley.x = 4680; s.riley.y = 630; s.riley.inv = 0;
    const b = s.boss = new Asmodean(s, 4800, 630); s.enemies = [b];
    b.bashAt = b.channelAt = Infinity; s.kit.notes.next = Infinity;
    const node = () => ({ text: '', setText(text) { this.text = text; return this; }, setAlpha() { return this; } });
    Object.assign(s.hud, { caption: HUD.prototype.caption, capWho: node(), capText: node(), capBg: node(), drawCaptionBackground() {} });
    try { return fn(s, b, h); } finally { h.destroy(); }
  });
}

for (const dt of [0.1, 0.15]) {
  test(`Stage 7 consumes the full ${dt * 1000}ms frame on its combat clock`, () => fixture((s, b, h) => {
    const t = b.clock;
    h.step(dt);
    assert.ok(Math.abs(b.clock - t - dt) < 1 / 120 + 1e-8);
  }));

  for (const story of [false, true]) test(`${dt * 1000}ms: quick Esc dismisses ${story ? 'story' : 'live boss intro'} and fresh Esc pauses`, () => {
    const listeners = [], savedAdd = globalThis.addEventListener, savedRemove = globalThis.removeEventListener;
    globalThis.addEventListener = (type, fn, capture) => listeners.push({ type, fn, capture: capture === true });
    globalThis.removeEventListener = (type, fn) => { const i = listeners.findIndex(l => l.type === type && l.fn === fn); if (i >= 0) listeners.splice(i, 1); };
    try { fixture((s, b, h) => {
      installDialogKeys7(s.kit);
      const dispatch = type => {
        const event = { type, code: 'Escape', keyCode: 27, target: { closest: () => null },
          preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        for (const capture of [true, false]) {
          event.eventPhase = capture ? 1 : 3;
          for (const l of listeners.slice()) if (!event.stopped && l.type === type && l.capture === capture) l.fn(event);
        }
        event.eventPhase = 0;
      };
      if (story) s.startCutscene(STORY7_SCRIPT, STORY7_PANELS, () => {});
      else {
        s.enemies = []; s.boss = null; s.zoneI = 2; s.zone = null; s.locked = false; s.riley.x = 4200;
        for (let i = 0; i < 30 && !s.boss; i++) h.step(dt);
        assert.ok(s.boss); assert.equal(s.hud.capWho.text, 'ASMODEAN');
      }
      dispatch('keydown'); dispatch('keyup'); // Both edges before the next frame.
      assert.equal(s.cutscene, null); assert.equal(s.hud.capT || 0, 0);
      for (let elapsed = 0; elapsed < 2; elapsed += dt) {
        h.step(dt); assert.equal(s.paused, false); assert.equal(s.inp.peek('pause'), false);
      }
      dispatch('keydown'); dispatch('keyup'); assert.equal(s.paused, true);
    }); } finally { globalThis.addEventListener = savedAdd; globalThis.removeEventListener = savedRemove; }
  });

  test(`${dt * 1000}ms: one bash swing costs at most 12 HP without god mode`, () => fixture((s, b, h) => {
    b.setState('attack'); b.counterUsed = false; s.god = false;
    for (let elapsed = 0; elapsed < 1.2; elapsed += dt) {
      s.riley.x = b.x - 100; s.riley.y = b.y;
      h.step(dt); assert.ok(s.riley.hp >= 88);
    }
    assert.equal(s.riley.hp, 88); assert.equal(b.counterUsed, true);
  }));

  test(`${dt * 1000}ms: all Asmodean damage shares a half-second window, contact included`, () => fixture((s, b, h) => {
    const hits = [], start = s.kit.clock;
    const attempt = fn => { const hp = s.riley.hp; fn(); if (s.riley.hp < hp) hits.push(s.kit.clock - start); };
    for (let elapsed = 0; elapsed < 2; elapsed += dt) {
      s.riley.x = b.x - 100; s.riley.y = b.y; s.riley.z = 0;
      attempt(() => bashRiley(b));
      attempt(() => s.riley.takeHit({ dmg: 11 }, b));
      attempt(() => strikeRiley(s, 16, { fromX: b.x }));
      s.kit.notes.notes.push({ x: s.riley.x + 3, y: s.riley.y, dir: -1, age: 0 });
      attempt(() => s.kit.notes.step(1 / 120, s, b));
      s.kit.arena.wave({ x: s.riley.x, y: s.riley.y });
      attempt(() => s.kit.arena.step(1 / 120, s, b));
      h.step(dt);
    }
    assert.ok(hits.length >= 2, 'fresh damage eventually becomes available');
    for (let i = 1; i < hits.length; i++) assert.ok(hits[i] - hits[i - 1] >= 0.5 - 1e-8, JSON.stringify(hits));
  }));

  test(`${dt * 1000}ms: a reaction resetting inv cannot shorten Asmodean's damage window`, () => fixture((s, b, h) => {
    assert.equal(bashRiley(b), true);
    let elapsed = 0;
    while (elapsed + dt < 0.5 - 1e-8) {
      h.step(dt); elapsed += dt;
      s.riley.inv = 0;
      assert.equal(s.riley.takeHit({ dmg: 11 }, b), false, 'contact remains gated');
      assert.equal(strikeRiley(s, 16), false, 'direct damage remains gated');
    }
    assert.equal(s.riley.hp, 88);
  }));

  test(`${dt * 1000}ms: three-hit break freezes Asmodean for at least 1.4 game seconds`, () => fixture((s, b, h) => {
    b.phase = 3; b.hp = 190; b.startChannel();
    for (let i = 0; i < 3; i++) b.takeHit({ dmg: 1 });
    const origin = [b.x, b.y], start = s.kit.clock;
    while (s.kit.clock - start + dt < ASMODEAN.stun - 1e-8) {
      b.startChannel(); b.setState('attack'); b.vx = 400; b.vy = 100; b.vz = 200;
      h.step(dt);
      assert.equal(b.state, 'stagger'); assert.deepEqual([b.x, b.y], origin);
      assert.equal(s.kit.arena.shock, null); assert.equal(b.counterUsed, true);
    }
    while (s.kit.clock - start < 1.4 - 1e-8) h.step(dt);
    assert.ok(b.clock >= 1.4 - 1 / 120, 'boss recovery and scene use the same game clock');
    assert.ok(b.channelAt >= 4);
  }));

  test(`${dt * 1000}ms: held D moves Riley throughout the veil line and its dismissal`, () => fixture((s, b, h) => {
    s.enemies = []; s.boss = null; s.zoneI = s.kit._zone = 2; s.zone = s.zones[2];
    s.camX = s.camMax = 2560; s.bounds = { l: 2560, r: 3840 }; s.riley.x = 3000;
    s.caption(...LINES.st7_veil_01); s.inp.held.right = true;
    const x = s.riley.x; h.step(dt);
    assert.ok(s.riley.x > x + 200 * dt, 'moves during caption at ordinary walk speed');
    s.onPress('pause'); const after = s.riley.x; h.step(dt);
    assert.ok(s.riley.x > after + 200 * dt, 'dismissal preserves a physically held direction');
  }));
}

for (const dt of [0.1, 0.15]) test(`${dt * 1000}ms: Stage 7 does not double-add textures on reload or late completion`, () => fixture((s, b, h) => {
  h.step(dt);
  const keys = ['bg7floor', 'bg7floor2', 'bg7floor3', 'bg7mid', 'bg7mid2', 'bg7mid3', 'bg7mid4', 's7shield', 's7ring', 's7moir', 's7lan', 's7earth'];
  const resident = new Set(), writes = [], files = [];
  const load = new EventEmitter(); load.list = new Set();
  load.image = load.spritesheet = load.atlas = key => {
    const file = { key, addToCache() { assert.equal(resident.has(key), false, `duplicate texture: ${key}`); resident.add(key); writes.push(key); } };
    load.list.add(file); files.push(file);
  };
  s.load = load; s.textures = { exists: key => resident.has(key) }; delete s._s7q;
  const rows = keys.map(key => ({ key, url: `${key}.webp`, present: true }));
  queueStage7Painted(s, keys, rows); queueStage7Painted(s, keys, rows);
  assert.equal(files.length, keys.length);
  // A demand deadline/restart can put a texture under the key before onProcess/cache insertion.
  for (const file of files) { resident.add(file.key); file.addToCache(); }
  assert.equal(writes.length, 0);
  load.emit('complete');
  queueStage7Painted(s, keys, rows); assert.equal(files.length, keys.length);
  // Streamed-out plates must be reloadable in the same scene.
  resident.delete('bg7floor2'); queueStage7Painted(s, ['bg7floor2'], rows);
  assert.equal(files.length, keys.length + 1); files.at(-1).addToCache();
}));

test('Stage 7 WebAudio loop setters receive finite bounds after a delayed decode', async () => {
  const { MUSIC, playTrack, stopSceneAudio } = await import('../src/audio.js');
  const savedContext = window.AudioContext, savedFetch = globalThis.fetch;
  const savedMusic = { ...MUSIC.boss7 }, sources = [];
  let finishDecode;
  const param = () => ({ value: 1, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} });
  const node = () => ({ gain: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect() {}, disconnect() {}, stop() {} });
  window.AudioContext = class {
    constructor() { this.currentTime = 0; this.destination = {}; }
    createGain() { return node(); }
    createDynamicsCompressor() { return node(); }
    decodeAudioData(bytes, done) { finishDecode = () => done({ duration: 73.273469 }); }
    createBufferSource() {
      const n = node();
      for (const key of ['loopStart', 'loopEnd']) Object.defineProperty(n, key, {
        get() { return this['_' + key]; },
        set(value) { assert.ok(Number.isFinite(value), key); this['_' + key] = value; },
      });
      n.start = (when, offset) => { assert.ok(Number.isFinite(offset)); sources.push(n); };
      return n;
    }
  };
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
  try {
    playTrack('boss7', { fade: 0 });
    for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
    assert.ok(finishDecode);
    MUSIC.boss7.loopStart = NaN; MUSIC.boss7.loopEnd = Infinity;
    finishDecode();
    for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(sources.length, 1); assert.equal(sources[0].loopStart, 0.25);
    assert.equal(sources[0].loopEnd, 72.977279);
  } finally {
    playTrack(null, { fade: 0 }); stopSceneAudio(); Object.assign(MUSIC.boss7, savedMusic);
    window.AudioContext = savedContext; globalThis.fetch = savedFetch;
  }
});
