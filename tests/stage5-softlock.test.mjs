import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Aginor } from '../src/aginor.js';
import { Balthamel } from '../src/balthamel.js';
import { createArena, BEAT } from '../src/stage5-arena.js';
import { stage5Simulation, withSeed } from './helpers/stage5-harness.mjs';

function bare() {
  const riley = { x: 800, y: 630, z: 0, hp: 80, alive: true, state: 'idle', facing: 1, grabbedBy: null, fogSlow: 0 };
  const scene = { riley, enemies: [], koCount: 0, bounds: { l: 0, r: 4000 }, paused: false, time: { now: 0 } };
  return { scene, riley };
}

test('phase 2 ends on the 50 second timer and the beat keeps Aginor alive', () => {
  const { scene } = bare();
  let beats = 0;
  const a = new Aginor(scene, 1200, 630, { onBeat() { beats++; } });
  a.phase = 2;
  a.state = 'idle';
  a.p2t = BEAT.p2 - 0.2;
  a.update(0.5);
  assert.ok(beats >= 1);
  a.invuln = true;
  const hp = a.hp;
  assert.equal(a.canBeHit, false);
  assert.equal(a.takeHit({ dmg: 9999 }), false);
  assert.equal(a.hp, hp);
  assert.equal(a.alive, true);
});

test('a tether does not lock while Riley is held, and a grab breaks a live tether', () => {
  const { scene, riley } = bare();
  const a = new Aginor(scene, riley.x + 80, riley.y);
  riley.grabbedBy = { type: 'balthamel' };
  a.tetherCd = 0;
  a.startTether();
  assert.notEqual(a.state, 'tether');
  riley.grabbedBy = null;
  a.startTether();
  assert.equal(a.state, 'tether');
  a.st = 2;
  a.locked = true;
  riley.grabbedBy = { type: 'balthamel' };
  a.tether(1 / 60);
  assert.equal(a.locked, false);
});

test('a second coil cannot grab Riley, and dying releases the hold in the same call', () => withSeed(1, () => {
  const h = stage5Simulation({ mode: null });
  const s = h.s;
  try {
    const b = new Balthamel(s, s.riley.x + 40, s.riley.y);
    const other = new Balthamel(s, s.riley.x + 80, s.riley.y);
    b.catch(s.riley);
    assert.equal(s.riley.grabbedBy, b);
    other.state = 'lunge';
    other.st = 1;
    other.coil(0.05, s.riley);
    assert.notEqual(other.state, 'holding');
    assert.equal(s.riley.grabbedBy, b);
    s.riley.fogSlow = 0.7;
    s.rileyDied();
    assert.equal(s.riley.grabbedBy, null);
    assert.notEqual(b.state, 'holding');
    s.kit.clearHazards();
    assert.equal(s.riley.fogSlow, 0);
  } finally { h.destroy(); }
}));

test('the Green Man beat keeps only Aginor invulnerable, then seizes Balthamel', () => {
  const { scene, riley } = bare();
  const world = { scene, riley, aginor: null, balthamel: null, onGreen() {}, onBeatEnd() {}, onRing() {}, onHands() {} };
  const arena = createArena(world);
  const a = new Aginor(scene, 2000, 630);
  world.aginor = a;
  const b = new Balthamel(scene, 1900, 630);
  world.balthamel = b;
  b.invuln = false;
  arena.startBeat(a, b, world);
  assert.equal(a.invuln, true);
  assert.ok(!b.invuln);
  assert.equal(b.alive, true);
  arena.hands = [{ x: 1, y: 1, st: 0, phase: 'tell' }];
  arena.ring = { st: 0, phase: 'tell', r: 0, x: 1, y: 1, hit: false };
  arena.beat.t = BEAT.dur;
  arena.step(0.05, world);
  assert.equal(arena.beat.done, true);
  assert.equal(a.beatDone, true);
  assert.equal(b.alive, false);
  assert.equal(a.invuln, false);
});
