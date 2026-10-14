import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed } from './helpers/stage7-harness.mjs';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { Asmodean, ASMODEAN, bashRiley } from '../src/asmodean.js';
import { createNotes, reflectNote } from '../src/stage7-notes.js';
import { strikeRiley } from '../src/stage6-hurt.js';
import { installDialogKeys7 } from '../src/stage7-lifecycle.js';
import { STORY7_SCRIPT, STORY7_PANELS } from '../src/stage7.js';
import { LINES } from '../src/stage7-voice.js';
import { HUD } from '../src/hud.js';

function fixture(fn) {
  return withSeed(1, () => {
    const h = stage7Simulation({ mode: false }), s = h.s;
    h.setController(null);
    s.pending = []; s.enemies = []; s.zoneI = 3; s.zone = s.zones[3];
    s.camX = s.camMax = 3920; s.bounds = { l: 3920, r: 5200 }; s.kit._zone = 3;
    s.riley.x = 4680; s.riley.y = 630; s.riley.inv = 0;
    s.kit.notes.next = Infinity;
    const b = s.boss = new Asmodean(s, 4800, 630);
    s.enemies = [b];
    try { return fn(s, b, h); } finally { h.destroy(); }
  });
}
function captions(s) {
  const node = () => ({ text: '', setText(text) { this.text = text; return this; }, setAlpha() { return this; } });
  Object.assign(s.hud, { caption: HUD.prototype.caption, capWho: node(), capText: node(), capBg: node(), drawCaptionBackground() {} });
}

for (const dt of [1 / 120, 1 / 60, 0.25]) test(`one telegraphed bash hits once with ${dt}s frames`, () => fixture((s, b) => {
  b.face(-1); b.setState('attack'); b.counterUsed = false;
  let elapsed = 0;
  while (elapsed < ASMODEAN.bashTell - dt - 1e-6) {
    b.update(dt); elapsed += dt; assert.equal(s.riley.hp, 100);
  }
  while (elapsed < 1.2) { b.update(dt); elapsed += dt; }
  assert.equal(s.riley.hp, 88);
  assert.equal(b.counterUsed, true);
  assert.equal(s.riley.state, 'hurt');
  assert.ok(s.riley.vx < 0, 'knockback away from the boss');
  assert.ok(s.riley.inv >= 0.5);
}));

test('bash i-frames block contact, notes and shockwave for the full half second', () => fixture((s, b, h) => {
  assert.equal(bashRiley(b), true);
  const R = s.riley, hp = R.hp;
  for (let i = 0; i < 29; i++) {
    assert.equal(R.takeHit({ dmg: 11 }, b), false, 'melee contact obeys inv');
    assert.equal(bashRiley(b), false);
    assert.equal(strikeRiley(s, 16, { down: true, fromX: b.x }), false);
    const notes = createNotes(); notes.next = Infinity;
    notes.notes.push({ x: R.x + 3, y: R.y, dir: -1, age: 0, counterUsed: false });
    notes.step(1 / 120, s, b);
    assert.equal(R.hp, hp);
    // Production Riley animation and invulnerability clock, without new attacks.
    b.bashAt = b.channelAt = Infinity;
    h.step(1 / 60);
  }
  assert.ok(R.inv > 0);
  assert.equal(R.hp, 88);
  h.step(1 / 30);
  assert.equal(strikeRiley(s, 7), true, 'fresh attack after i-frames expires');
}));

test('simultaneous notes, a column and a shockwave cannot stack their damage', () => fixture((s, b) => {
  const notes = createNotes(); notes.next = Infinity;
  for (let i = 0; i < 4; i++) notes.notes.push({ x: s.riley.x + 3, y: s.riley.y, dir: -1, age: 0 });
  notes.step(1 / 120, s, b);
  assert.equal(s.riley.hp, 93);
  s.kit.arena.rain = { x: s.riley.x, t: 1, phase: 'strike', counterUsed: false, hits: new Set() };
  s.kit.arena.wave({ x: s.riley.x, y: s.riley.y });
  s.kit.arena.step(1 / 120, s, b);
  assert.equal(s.riley.hp, 93);
}));

test('three seconds of stationary contact without a telegraphed attack does no damage', () => fixture((s, b, h) => {
  b.bashAt = b.channelAt = Infinity;
  b.x = s.riley.x; s.riley.inv = 0;
  for (let i = 0; i < 180; i++) h.step();
  assert.equal(s.riley.hp, 100);
}));

for (const gate of ['god', 'inv', 'paused', 'cutscene', 'strike']) test(`bash and direct melee respect ${gate}`, () => fixture((s, b) => {
  if (gate === 'inv') s.riley.inv = 0.5;
  else if (gate === 'strike') s.kit.strike = {};
  else s[gate] = true;
  assert.equal(bashRiley(b), false);
  assert.equal(s.riley.takeHit({ dmg: 12, kb: 220 }, b), false);
  assert.equal(s.riley.hp, 100);
  assert.equal(s.riley.state, 'idle');
  s.kit.strike = null; s.cutscene = null; s.paused = false;
}));

for (const kind of ['three hits', 'throw']) test(`${kind}: stagger survives later hits, short reflection stun and state resets`, () => fixture((s, b) => {
  b.phase = 3; b.hp = 190;
  b.startChannel();
  if (kind === 'throw') b.takeHit({ dmg: 1, throw: true });
  else for (let i = 0; i < 3; i++) b.takeHit({ dmg: 1 });
  const origin = [b.x, b.y], brokenAt = b.clock;
  for (let i = 0; i < 167; i++) {
    if (i === 5) {
      b.takeHit({ dmg: 5, down: true });
      reflectNote(s.kit.notes, { gold: true, x: s.riley.x + 20 }, s, b);
      b.setState('down'); b.setState('hurt'); b.setState('idle');
      b.vx = 400; b.vy = 100; b.vz = 200;
      b.startChannel();
    }
    b.update(1 / 120); b.physics(1 / 120);
    assert.equal(b.state, 'stagger');
    assert.deepEqual([b.x, b.y], origin);
    assert.equal(b.counterUsed, true);
    assert.equal(s.kit.arena.shock, null);
  }
  assert.ok(b.clock - brokenAt < 1.4);
  b.update(1 / 60);
  assert.equal(b.state, 'idle');
  assert.ok(b.channelAt >= brokenAt + 4);
}));

test('stagger prevents new note phrases and column attacks', () => fixture((s, b) => {
  b.phase = 2; b.stagger(1.4);
  s.kit.notes.next = 0; s.kit.arena.next = 0;
  for (let i = 0; i < 160; i++) {
    b.update(1 / 120); s.kit.notes.step(1 / 120, s, b); s.kit.arena.step(1 / 120, s, b);
    assert.equal(s.kit.notes.pending.length, 0); assert.equal(s.kit.arena.rain, null);
  }
}));


test('veil warning allows held D movement and is a short skippable caption', () => fixture((s, b, h) => {
  captions(s); s.zoneI = 2; s.zone = s.zones[2]; s.kit._zone = 2;
  s.camX = s.camMax = 2560; s.bounds = { l: 2560, r: 3840 }; s.riley.x = 3000;
  s.caption(...LINES.st7_veil_01);
  assert.ok(s.hud.capT <= 1.2); assert.equal(s.kit.freezesRiley(), false);
  const x = s.riley.x;
  s.inp.held.right = true;
  for (let i = 0; i < 20; i++) h.step();
  assert.ok(s.riley.x > x + 40);
  s.onPress('pause'); assert.equal(s.hud.capT, 0); assert.equal(s.paused, false);
}));

test('dialog dismissal drains queued Phaser pause aliases and JustDown even after keyup', () => fixture(s => {
  captions(s);
  const keys = Object.fromEntries([27, 80, 13].map(code => [code, {
    isDown: true, _justDown: true, _justUp: true,
    reset() { this.isDown = this._justDown = this._justUp = false; },
  }]));
  const move = { keyCode: 65 }, queue = [{ keyCode: 27 }, move, { keyCode: 13 }, { keyCode: 80 }];
  s.input = { keyboard: { keys, manager: { queue } } };
  s.inp.buf.pause = s.inp.buf.start = s.inp.t;
  s.inp.held.pause = s.inp.held.start = true;
  s.caption(...LINES.st7_asmo_intro_01); s.onPress('pause');
  assert.deepEqual(queue, [move]);
  assert.ok(Object.values(keys).every(key => !key.isDown && !key._justDown && !key._justUp));
  assert.equal(s.inp.peek('pause'), false); assert.equal(s.inp.peek('start'), false);
  assert.equal(s.paused, false);
}));

// Models both window listeners and Phaser's key/JustDown/event/queue path.
// The reusable Chrome script exercises the actual plugin and CDP events.
function dom() {
  const saved = { add: globalThis.addEventListener, remove: globalThis.removeEventListener }, listeners = [];
  globalThis.addEventListener = (type, fn, capture) => listeners.push({ type, fn, capture: capture === true });
  globalThis.removeEventListener = (type, fn) => {
    const i = listeners.findIndex(l => l.type === type && l.fn === fn); if (i >= 0) listeners.splice(i, 1);
  };
  return {
    dispatch(type, repeat = false) {
      const e = { type, code: 'Escape', key: 'Escape', keyCode: 27, repeat, eventPhase: 1,
        target: { closest: () => null }, preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() { this.stopped = true; } };
      for (const capture of [true, false]) {
        e.eventPhase = capture ? 1 : 3;
        for (const l of listeners.slice()) if (!e.stopped && l.type === type && l.capture === capture) l.fn(e);
      }
      e.eventPhase = 0; return e;
    },
    restore() { globalThis.addEventListener = saved.add; globalThis.removeEventListener = saved.remove; },
  };
}
for (const story of [false, true]) for (const hold of [0, 120]) test(`${story ? 'opening story' : 'normal startBoss intro'} owns Esc (${hold}ms) before Phaser and through release`, () => {
  const events = dom(); let h;
  try {
    const queue = [], key = { isDown: false, _justDown: false, reset() { this.isDown = this._justDown = false; } };
    // Phaser is registered before Input and may pause from a scene keyboard event.
    addEventListener('keydown', e => { queue.push(e); key.isDown = key._justDown = true; h.s.onPress('pause'); });
    h = stage7Simulation({ mode: false }); h.setController(null);
    const s = h.s; captions(s);
    s.input = { keyboard: { keys: { 27: key }, manager: { queue } } };
    installDialogKeys7(s.kit);
    if (story) s.startCutscene(STORY7_SCRIPT, STORY7_PANELS, () => {});
    else {
      s.pending = []; s.enemies = []; s.zoneI = 2; s.zone = null;
      s.riley.x = 4200; s.camX = s.camMax = 3920; s.bounds = { l: 3920, r: 5200 };
      for (let i = 0; i < 120 && !s.boss; i++) h.step();
      assert.ok(s.boss); assert.equal(s.hud.capWho.text, 'ASMODEAN');
    }
    events.dispatch('keydown');
    assert.equal(s.cutscene, null); assert.equal(s.paused, false);
    assert.equal(s.hud.capT || 0, 0);
    for (let i = 0; i < hold / 10; i++) {
      events.dispatch('keydown', true); s.inp.clear(); h.step(0.01);
      s.onPress('pause'); assert.equal(s.paused, false);
    }
    assert.equal(queue.length, 0); assert.equal(key._justDown, false); assert.equal(key.isDown, false);
    events.dispatch('keyup');
    for (let i = 0; i < 30; i++) h.step();
    assert.equal(s.paused, false); assert.equal(s.inp.peek('pause'), false); assert.equal(!!s.inp.held.pause, false);
    events.dispatch('keydown'); assert.equal(s.paused, true);
    events.dispatch('keyup');
  } finally { h?.destroy(); events.restore(); }
});

test('Stage 1-6 legacy god hit reaction and damage remain unchanged', () => {
  for (const stage of [1, 2, 3, 4, 5, 6]) {
    const h = stage1Simulation({ stage, mode: false });
    try {
      const s = h.s; s.god = true; s.riley.inv = 0;
      assert.equal(s.riley.takeHit({ dmg: 12 }, { x: s.riley.x + 30 }), true);
      assert.equal(s.riley.hp, 88);
    } finally { h.destroy(); }
  }
});
