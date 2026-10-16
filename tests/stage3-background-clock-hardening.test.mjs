import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal } from '../src/myrddraal.js';

// Phaser's handlers change loop timing/focus; they do not stop Game.step or
// pause scene clocks. Emit the actual events, including Phaser's own handlers.
const source = readFileSync('lib/phaser.min.js', 'utf8');
const pinned = pattern => {
  const match = source.match(pattern); assert.ok(match);
  return runInNewContext(`(${match[1]})`, { m: { PAUSE: 'pause', RESUME: 'resume' } });
};
const onHidden = pinned(/onHidden:(function\(\)\{.*?\}),pause:/);
const onBlur = pinned(/onBlur:(function\(\)\{.*?\}),onFocus:/);

function background(s) {
  s.game.events = new EventEmitter(); s.game.hasFocus = true;
  s.game.loop = { pause() {}, blur() {} };
  s.game.events.on('hidden', () => onHidden.call(s.game));
  s.game.events.on('blur', () => onBlur.call(s.game));
  s.kit.start();
}

for (const event of ['hidden', 'blur']) test(`${event} freezes Stage 3 combat, cast, hazards, powers and scene timers`, () => withSeed(3, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s); background(s);
    const f = new Myrddraal(s, 840, 630);
    Object.assign(f, { entering: false, introDone: true, auraOn: true, fear: 0.4, braveT: 1.2, dispelT: 4, cool: 99, nextBlink: 99 });
    f.T.speed = 0; s.enemies.push(f);
    s.powers.activate('angreal'); s.powers.activate('lightning');
    s.riley.startPowerCast('lightning'); s.riley.inv = 0.75;
    s.kit.startTile(); s.callLoial();
    let fired = 0; s.time.delayedCall(300, () => fired++);
    const snap = () => [f.t, f.st, f.fi, f.fear, f.braveT, f.dispelT, f.auraK,
      s.riley.st, s.riley.fi, s.riley.inv, s.riley.state, s.powers.left('boost'),
      s.powers.left('ter'), s.kit.tiles[0]?.t, s.loial?.age, fired];
    const before = snap();
    s.game.events.emit(event);
    for (let i = 0; i < 180; i++) h.step();
    assert.deepEqual(snap(), before, 'background time must not advance any gameplay clock');
    s.setPauseReason('manual', true);
    s.game.events.emit(event === 'hidden' ? 'visible' : 'focus');
    h.step(); assert.deepEqual(snap(), before, 'manual pause survives background recovery');
    s.setPauseReason('manual', false);
    h.step();
    assert.ok(Math.abs(f.t - before[0] - 1 / 60) < 1e-12);
    assert.equal(fired, 0, 'delayed callback must not expire instantly on resume');
    for (let i = 0; i < 20; i++) h.step();
    assert.equal(fired, 1, 'callback resumes and runs once');
  } finally { h.destroy(); }
}));

test('overlapping blur/hidden events resume only after both recover and detach on shutdown', () => withSeed(3, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s); background(s);
    const events = s.game.events;
    s.game.events.emit('blur'); s.game.events.emit('hidden');
    s.game.events.emit('visible');
    assert.equal(s.paused, true);
    s.game.events.emit('focus'); assert.equal(s.paused, false);
    // Repeated installation/start must not multiply handlers.
    s.kit.start();
    assert.equal(events.listenerCount('focus'), 1);
    s.kit.destroy();
    assert.equal(events.listenerCount('focus'), 0);
    assert.equal(events.listenerCount('visible'), 0);
    events.emit('blur'); assert.equal(s.paused, false, 'retired kit cannot lock scene input');
  } finally { h.destroy(); }
}));

test('restart inherits current background state and keeps one listener set; leaving Stage 3 detaches it', () => withSeed(3, () => {
  const h = stage3Simulation({ mode: '', followRestart: true }), s = h.s;
  try {
    arena(s); background(s);
    const events = s.game.events;
    document.hidden = true; s.game.hasFocus = false;
    events.emit('hidden'); events.emit('blur');
    const oldKit = s.kit;
    s.scene.restart({ stage: 3, autostart: true });
    for (let i = 0; i < 20; i++) h.step();
    assert.equal(oldKit.destroyed, true);
    assert.equal(s.started, true); assert.equal(s.paused, true);
    assert.equal(events.listenerCount('focus'), 1);
    assert.equal(events.listenerCount('visible'), 1);
    document.hidden = false; s.game.hasFocus = true;
    events.emit('visible'); assert.equal(s.paused, true);
    events.emit('focus'); assert.equal(s.paused, false);
    s.scene.restart({ stage: 2 }); h.step();
    assert.equal(events.listenerCount('focus'), 0);
    assert.equal(events.listenerCount('visible'), 0);
    events.emit('hidden'); events.emit('blur');
    assert.equal(s.paused, false, 'retired Stage 3 callbacks cannot pause Stage 2');
  } finally { document.hidden = false; h.destroy(); }
}));
