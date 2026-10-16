import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Balthamel, BALTH } from '../src/balthamel.js';

function world() {
  const riley = { x: 100, y: 630, z: 0, hp: 100, alive: true, state: 'idle', facing: 1, grabbedBy: null, enterGrabbed() { this.state = 'grabbed'; }, leaveGrabbed() { this.state = 'idle'; }, face() {} };
  const scene = {
    riley, enemies: [], koCount: 0, bounds: { l: 0, r: 2000 },
    kit: { onEmbrace() {}, onEscape() {}, onFlail() {}, onParry() {}, onCoil() {}, onStep() {}, onBalthDown() {} },
    grabBusy() { return false; },
  };
  const b = new Balthamel(scene, 160, 630);
  b.state = 'idle';
  return { scene, riley, b };
}

test('the embrace is mash 7 inside 2.8 seconds, and a break releases the hold', () => {
  const { riley, b } = world();
  assert.equal(BALTH.mash, 7);
  assert.equal(BALTH.hold, 2.8);
  b.startCoil();
  b.st = BALTH.coil;
  b.coil(0.016, riley);
  assert.equal(b.state, 'holding');
  assert.equal(riley.grabbedBy, b);
  for (let i = 0; i < 6; i++) assert.equal(b.mash(), false);
  assert.equal(b.mash(), true);
  assert.equal(b.state, 'shoved');
  assert.equal(riley.grabbedBy, null);
  b.catch(riley);
  assert.equal(b.state, 'holding');
  b.releaseHold('break');
  assert.equal(riley.grabbedBy, null);
  assert.notEqual(b.state, 'holding');
});

test('a facing active frame on the first flail string is the one parry', () => {
  const { scene, riley, b } = world();
  let parries = 0;
  scene.kit.onParry = () => { parries++; };
  b.startFlail();
  b.st = BALTH.tell + 0.05;
  riley.attackFrame = true;
  riley.facing = Math.sign(b.x - riley.x) || 1;
  b.flail(0.016, riley);
  assert.equal(parries, 1);
  assert.equal(b.state, 'hurt');
  b.startFlail();
  b.st = BALTH.tell + 0.05;
  riley.attackFrame = false;
  b.flail(0.016, riley);
  assert.equal(parries, 1);
});
