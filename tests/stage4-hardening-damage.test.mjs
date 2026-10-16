import test from 'node:test';
import assert from 'node:assert/strict';
import { kissScene } from './helpers/stage4-hardening-scene.mjs';
import { Cultist } from '../src/cultists.js';

for (const protectedState of ['down', 'getup', 'invulnerable', 'other holder', 'dead']) test(`Draghkar strikes respect ${protectedState} Riley`, () => {
  const c = kissScene();
  try {
    if (protectedState === 'down' || protectedState === 'getup') c.R.setState(protectedState, protectedState === 'down' ? 'knockdown' : 'getup');
    if (protectedState === 'invulnerable') c.R.inv = 1;
    if (protectedState === 'other holder') { c.R.grabbedBy = { type: 'cutthroat', releaseHold() {} }; c.R.state = 'grabbed'; }
    if (protectedState === 'dead') c.R.alive = false;
    c.d.x = c.R.x - 100; c.d.state = 'claw'; c.d.clawStep = 1; c.d.st = 0.24;
    c.d.update(1 / 60); assert.equal(c.R.hp, 100);
  } finally { c.R.grabbedBy = null; c.h.destroy(); }
});
test('Draghkar fatal strike uses Riley\'s death path exactly once, and god mode floors HP', () => {
  const c = kissScene();
  try {
    c.d.x = c.R.x - 100; c.d.state = 'claw'; c.d.clawStep = 1; c.d.st = 0.24; c.R.hp = 5;
    c.d.update(1 / 60); assert.equal(c.R.hp, 0); assert.equal(c.R.alive, false); assert.equal(c.R.lives, 2);
    c.d.update(0.3); assert.equal(c.R.lives, 2);
    c.R.respawn(); c.R.setState('idle', 'idle'); c.R.inv = 0; c.R.hp = 5; c.s.god = true;
    c.d.state = 'claw'; c.d.clawStep = 1; c.d.hitRileyThisMove = false; c.d.st = 0.24;
    c.d.update(1 / 60); assert.equal(c.R.hp, 1); assert.equal(c.R.alive, true);
  } finally { c.h.destroy(); }
});
test('only the kisser can hold an attack token; new cultist windups are refused', () => {
  const c = kissScene();
  try {
    c.hold(); const cult = new Cultist(c.s, 400, 630);
    assert.equal(cult.startBolt(), false); assert.equal(cult.startChant(), false); assert.equal(cult.startShove(), false);
    assert.equal(c.R.hp, 100);
  } finally { c.h.destroy(); }
});
test('a kiss cannot reserve tokens on top of an existing cultist windup', () => {
  const c = kissScene();
  try {
    const cult = new Cultist(c.s, 400, 630); cult.startChant();
    assert.equal(c.d.startKiss(), false);
    cult.takeHit({ dmg: 1 }, c.R); c.hold(); assert.equal(c.R.grabbedBy, c.d);
    assert.equal(cult.state, 'dazed'); assert.equal(c.s.attackTokens(), c.s.maxTokens);
  } finally { c.h.destroy(); }
});
for (const fatal of ['chip', 'timeout']) test(`fatal kiss ${fatal} completes Riley's death path in the same update`, () => {
  const c = kissScene();
  try {
    c.hold(); assert.equal(c.R.grabbedBy, c.d);
    c.R.hp = fatal === 'chip' ? 3 : 17;
    c.d.holdElapsed = fatal === 'chip' ? 0.49 : 0;
    c.d.st = fatal === 'chip' ? 0 : 2.99;
    c.d.update(0.02);
    assert.equal(c.R.grabbedBy, null); assert.equal(c.R.hp, 0); assert.equal(c.R.alive, false);
    assert.equal(c.R.state, 'down'); assert.equal(c.R.lives, 2); assert.equal(c.s._kissBusy, false);
    c.d.update(0.1); assert.equal(c.R.lives, 2);
  } finally { c.h.destroy(); }
});
