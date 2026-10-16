import test from 'node:test';
import assert from 'node:assert/strict';
import { kissScene } from './helpers/stage4-hardening-scene.mjs';
import { placeC } from './helpers/stage3-harness.mjs';
import { Draghkar } from '../src/draghkar.js';

function held(c) { assert.equal(c.d.state, 'kiss_hold'); assert.equal(c.R.grabbedBy, c.d); }
test('kiss releases Riley\'s real held enemy before taking ownership', () => {
  const c = kissScene();
  try {
    const enemy = placeC(c.s, 80); c.R.startGrab(enemy);
    c.R.attackFrame = true; c.R.facing = 1;
    c.hold(); held(c);
    assert.equal(c.R.held, null); assert.equal(enemy.heldBy, null); assert.notEqual(enemy.state, 'held');
  } finally { c.h.destroy(); }
});
test('cutthroat lunge reserves ownership before it reaches Riley', () => {
  const c = kissScene();
  try {
    const enemy = placeC(c.s, 80); enemy.setState('lunge', 'lunge');
    assert.equal(c.s.grabBusy(c.d), true);
    assert.equal(c.d.startKiss(), false);
  } finally { c.h.destroy(); }
});
test('disposing an unrelated Draghkar cannot release another holder or change Riley\'s state', () => {
  const c = kissScene();
  try {
    c.hold(); held(c);
    new Draghkar(c.s).dispose();
    assert.equal(c.R.state, 'grabbed'); assert.equal(c.R.grabbedBy, c.d); assert.equal(c.s._kissBusy, true);
  } finally { c.h.destroy(); }
});
for (const exit of ['down', 'death', 'respawn', 'continue', 'boss defeat', 'shutdown']) test(`kiss releases synchronously on ${exit}`, () => {
  const c = kissScene();
  try {
    c.hold(); held(c);
    if (exit === 'down') c.R.setState('down', 'knockdown');
    if (exit === 'death') { c.R.alive = false; c.s.rileyDied(); }
    if (exit === 'respawn') c.R.respawn();
    if (exit === 'continue') c.s.continueGame();
    if (exit === 'boss defeat') c.d.defeat();
    if (exit === 'shutdown') c.s.events.emit('shutdown');
    assert.equal(c.R.grabbedBy, null); assert.equal(c.s._kissBusy, false);
    assert.notEqual(c.d.state, 'kiss_hold'); assert.equal(c.s.attackTokens(), 0);
  } finally { c.h.destroy(); }
});
test('successful Loial call breaks the kiss in the same call', () => {
  const c = kissScene();
  try {
    c.hold(); held(c);
    assert.equal(c.s.callLoial(), true);
    assert.equal(c.R.grabbedBy, null); assert.equal(c.s._kissBusy, false); assert.equal(c.d.state, 'reels');
  } finally { c.h.destroy(); }
});
for (const hz of [30, 60, 120]) test(`held input counts once and pause preserves mash/hold clocks at ${hz}Hz`, () => {
  const c = kissScene();
  try {
    c.hold(); held(c); c.d.st = c.d.holdElapsed = c.d.decayElapsed = 0;
    c.s.inp.clear(); c.s.inp.press('attack');
    for (let i = 0; i < hz / 2; i++) { c.R.update(1 / hz, c.s.inp); c.d.update(1 / hz); }
    assert.equal(c.R.hp, 97); assert.equal(c.d.mashCount, 0);
    c.d.mash(); const before = [c.d.st, c.d.holdElapsed, c.d.decayElapsed, c.d.mashCount, c.R.hp];
    c.s.paused = true; c.d.update(2); c.d.mash();
    assert.deepEqual([c.d.st, c.d.holdElapsed, c.d.decayElapsed, c.d.mashCount, c.R.hp], before);
    c.s.paused = false; c.d.update(0.5);
    assert.equal(c.R.hp, 94); assert.equal(c.d.mashCount, 0);
  } finally { c.h.destroy(); }
});
for (const miss of ['airborne']) test(`kiss lunge cannot catch ${miss} Riley`, () => {
  const c = kissScene();
  try {
    c.R.z = 100; c.R.attackFrame = true; c.R.facing = 1;
    c.hold(); assert.equal(c.R.grabbedBy, null); assert.notEqual(c.d.state, 'kiss_hold');
  } finally { c.h.destroy(); }
});
test('grounded landing is a GRAB_OK state for the kiss', () => {
  const c = kissScene();
  try {
    c.R.setState('land', 'land'); c.hold(); held(c);
  } finally { c.h.destroy(); }
});
