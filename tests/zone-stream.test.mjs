import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { STREAMS, plateRect, residentKeys, deferredPlateKeys } from '../src/zone-stream.js';
import { STAGE5 } from '../src/stage5-def.js';
import { STAGE6 } from '../src/stage6-def.js';
import { Stalker, Sporepod } from '../src/blightspawn.js';

function scene(zoneI, stage) {
  return { zoneI, stageDef: stage };
}

test('a locked camera keeps the current zone and the next, then drops the previous plate and floor', () => {
  const plan = STREAMS[5];
  const boot = residentKeys(scene(undefined, STAGE5), plan);
  assert.deepEqual([...boot].sort(), ['bg5far', 'bg5floor', 'bg5mid', 'bg5mid2'].sort());
  const gate = residentKeys(scene(1, STAGE5), plan);
  assert.ok(gate.has('bg5mid2') && gate.has('bg5mid3') && gate.has('bg5floor') && gate.has('bg5floor2'));
  assert.equal(gate.has('bg5mid'), false);
  const heart = residentKeys(scene(3, STAGE5), plan);
  assert.deepEqual([...heart].sort(), ['bg5far', 'bg5floor3', 'bg5mid4'].sort());
  assert.deepEqual(deferredPlateKeys(plan).sort(), ['bg5floor2', 'bg5floor3', 'bg5mid3', 'bg5mid4'].sort());
});

test('stage 6 frees the quay floor only when the camera locks onto the hall', () => {
  const plan = STREAMS[6];
  const quay = residentKeys(scene(0, STAGE6), plan);
  assert.ok(quay.has('bg6floor') && quay.has('bg6mid') && quay.has('bg6mid2'));
  assert.equal(quay.has('bg6mid3'), false);
  const hall = residentKeys(scene(2, STAGE6), plan);
  assert.ok(hall.has('bg6mid3') && hall.has('bg6floor2') && hall.has('bg6mid4'));
  assert.equal(hall.has('bg6floor'), false);
  assert.equal(hall.has('bg6mid2'), false);
});

test('the sea-gate meets the Great Hall on the zone edge', () => {
  const feather = [96, 0, 96];
  for (let i = 1; i < 4; i++) {
    const a = plateRect(i - 1, STAGE6.zones), b = plateRect(i, STAGE6.zones);
    assert.equal(a.x + a.w - b.x, feather[i - 1], i);
  }
  assert.ok(plateRect(0, STAGE6.zones).x < -96);
  assert.ok(plateRect(3, STAGE6.zones).x + plateRect(3, STAGE6.zones).w > 5200 + 96);
});

test('Blight Stalker and Sporepod publish the name the HUD reads', () => {
  const scene = { enemies: [] };
  const stalker = new Stalker(scene, 0, 0);
  const pod = new Sporepod(scene, 0, 0);
  assert.equal(stalker.name, 'BLIGHT STALKER');
  assert.equal(pod.name, 'SPOREPOD');
});
