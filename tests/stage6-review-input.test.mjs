import test from 'node:test';
import assert from 'node:assert/strict';
import { stage6Simulation, withSeed } from './helpers/stage6-harness.mjs';
import { q } from '../src/config.js';
import { callRand } from '../src/stage6-lifecycle.js';
import { abortRandCall, resetRandCall } from '../src/rand-call-cutscene.js';
import { videoEnv } from './stage6-hardening-fixtures.mjs';
import { Input } from '../src/input.js';

test('gamepad Start held after a Rand skip cannot leak a manual pause before the first resumed scene update', () => {
  const e = videoEnv(), h = withSeed(1, () => stage6Simulation({ mode: null })), s = h.s;
  let down = false;
  const old = navigator.getGamepads;
  navigator.getGamepads = e.root.navigator.getGamepads = () => [{ index: 0, id: 'review-pad', axes: [0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: down && i === 9 })) }];
  s.cutRoot = e.root; q.set('cutscenes', '1'); resetRandCall();
  s.enemies.push({ type: 'grunt', alive: true, x: 300, y: 630, hp: 10, maxHp: 10, sync() {} });
  try {
    s.inp.update(1 / 60); assert.equal(callRand(s.kit), true);
    // Phaser Game.step emits no input STEP during a game-owned video pause.
    e.advance(1000); down = true; e.advance(250);
    assert.ok(s.kit.strike); assert.equal(s.cutscene, null);
    // main.js polls input before Stage1.update and its Stage 6 flush wrapper.
    s.inp.update(1 / 60);
    assert.equal(s.pauseReasons.has('manual'), false); assert.equal(s.paused, false);
    for (let i = 0; i < 121; i++) { s.inp.update(1 / 60); s.update(i * 17, 1000 / 60); }
    assert.equal(s.kit.strike, null);
    down = false; s.inp.update(1 / 60); down = true; s.inp.update(1 / 60);
    assert.equal(s.pauseReasons.has('manual'), true, 'a fresh press still pauses');
  } finally { abortRandCall(s); h.destroy(); navigator.getGamepads = old; q.delete('cutscenes'); }
});

for (const kind of ['keyboard', 'touch']) test(`${kind} skip, held controls and release produce no resumed attack; a fresh press still works`, () => {
  const e = videoEnv(), h = withSeed(1, () => stage6Simulation({ mode: null })), s = h.s;
  const listeners = new Map(), add = globalThis.addEventListener, get = document.getElementById;
  const touch = e.root.document.createElement('button'); touch.classList = { add() {}, remove() {} };
  const stick = e.root.document.createElement('div'), knob = e.root.document.createElement('div');
  globalThis.addEventListener = (name, fn) => listeners.set(name, fn);
  document.getElementById = id => ({ tbA: touch, stick, knob })[id] || null;
  const inp = s.inp = s.game.inp = new Input();
  inp.on('press', a => s.onPress(a));
  const key = (type, repeat = false) => listeners.get(type)({ code: 'KeyE', repeat, preventDefault() {} });
  const touchEvent = type => touch.listeners.emit(type, { preventDefault() {}, changedTouches: [] });
  s.cutRoot = e.root; q.set('cutscenes', '1'); resetRandCall();
  s.enemies.push({ type: 'grunt', alive: true, x: 300, y: 630, hp: 10, maxHp: 10, sync() {} });
  try {
    if (kind === 'touch') touchEvent('touchstart');
    assert.equal(callRand(s.kit), true); e.advance(900);
    if (kind === 'keyboard') key('keydown');
    else {
      let prevented = false;
      const overlay = e.root.document.body.children[0];
      overlay.listeners.emit('touchend', { type: 'touchend', preventDefault() { prevented = true; } });
      assert.equal(prevented, true); touchEvent('touchend'); assert.equal(inp.touchHeld.attack, false);
    }
    assert.ok(s.kit.strike);
    for (let i = 0; i < 121; i++) { inp.update(1 / 60); s.update(i * 17, 1000 / 60); }
    assert.equal(s.kit.strike, null);
    s.enemies = []; s.zones = []; s.pending = [];
    if (kind === 'keyboard') key('keydown', true);
    inp.update(1 / 60); s.update(2100, 1000 / 60);
    assert.equal(s.riley.state, 'idle'); assert.equal(inp.peek('attack'), false);
    if (kind === 'keyboard') { key('keyup'); key('keydown'); }
    else touchEvent('touchstart');
    inp.update(1 / 60); s.update(2117, 1000 / 60);
    assert.equal(s.riley.state, 'combo1');
  } finally {
    abortRandCall(s); h.destroy(); globalThis.addEventListener = add; document.getElementById = get; q.delete('cutscenes');
  }
});
