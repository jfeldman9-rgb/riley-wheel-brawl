import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStreet, RING } from '../src/stage7-street.js';

function scene(over = {}) {
  return {
    zoneI: 2, zone: { boss: false }, wave: 0, pending: [{ t: 1 }],
    riley: { x: 3000, y: 630, z: 0, state: 'idle', hp: 100 },
    enemies: [{ alive: true, type: 'grunt', x: 3000, y: 630, hp: 40, die() { this.alive = false; this.hp = 0; } }],
    ...over,
  };
}

test('a ring waits 9s, skips a grab, and hits once', () => {
  const street = createStreet();
  const grabbed = scene({ riley: { x: 3000, y: 630, z: 0, state: 'grabbed', hp: 100 } });
  street.step(grabbed, 9);
  assert.equal(street.ring, null);
  const street2 = createStreet();
  const s = scene();
  street2.step(s, 8.9);
  assert.equal(street2.ring, null);
  street2.step(s, 0.2);
  assert.equal(street2.ring.phase, 'tell');
  const before = s.enemies[0].hp;
  street2.step(s, RING.tell);
  assert.equal(street2.ring.phase, 'strike');
  assert.equal(s.enemies[0].hp, before - RING.enemy);
  street2.step(s, 0.05);
  assert.equal(s.enemies[0].hp, before - RING.enemy);
  assert.equal(RING.tell >= 0.5, true);
});
