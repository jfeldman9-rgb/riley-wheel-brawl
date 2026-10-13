import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { VW } from '../src/config.js';
import { STREAMS, plateRect, residentZones, residentKeys, deferredPlateKeys } from '../src/zone-stream.js';
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

function uncovered(camX, zoneI, stage) {
  const plates = residentZones({ zoneI, camX, stageDef: stage }).map(i => plateRect(i, stage.zones));
  const viewR = camX + VW;
  let x = camX, gap = 0;
  for (const p of plates.slice().sort((a, b) => a.x - b.x)) {
    const right = p.x + p.w;
    if (right <= x) continue;
    if (p.x > viewR) break;
    if (p.x > x) gap += Math.min(p.x, viewR) - x;
    x = Math.max(x, right);
    if (x >= viewR) break;
  }
  if (x < viewR) gap += viewR - x;
  return gap;
}

test('the previous plate stays until the camera reaches the new plate, and the view stays covered', () => {
  for (const stage of [STAGE5, STAGE6]) {
    for (let z = 1; z < stage.zones.length; z++) {
      const edge = plateRect(z, stage.zones).x;
      const behind = edge - 232;
      const scene = { zoneI: z, camX: behind, stageDef: stage };
      assert.ok(residentZones(scene).includes(z - 1), `${stage.no} zone ${z} keeps ${z - 1} at cam ${behind}`);
      assert.ok(uncovered(behind, z, stage) <= 1, `${stage.no} zone ${z} gap ${uncovered(behind, z, stage)}`);
      let camX = behind;
      const target = stage.zones[z].l;
      for (let frame = 0; frame < 180; frame++) {
        camX += (target - camX) * Math.min(1, (1 / 60) * 5);
        const gap = uncovered(camX, z, stage);
        assert.ok(gap <= 1, `${stage.no} zone ${z} frame ${frame} cam ${camX.toFixed(2)} gap ${gap.toFixed(2)}`);
      }
      const caught = { zoneI: z, camX: edge - 1, stageDef: stage };
      assert.equal(residentZones(caught).includes(z - 1), false, `${stage.no} zone ${z} drops the previous plate once the camera arrives`);
      assert.ok(uncovered(edge - 1, z, stage) <= 1);
    }
  }
  assert.equal(residentZones({ zoneI: 2, stageDef: STAGE6 }).includes(1), false, 'a zone index alone still drops the previous plate');
});

test('Blight Stalker and Sporepod publish the name the HUD reads', () => {
  const scene = { enemies: [] };
  const stalker = new Stalker(scene, 0, 0);
  const pod = new Sporepod(scene, 0, 0);
  assert.equal(stalker.name, 'BLIGHT STALKER');
  assert.equal(pod.name, 'SPOREPOD');
});
