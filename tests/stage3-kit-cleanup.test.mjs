import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal } from '../src/myrddraal.js';
import { Stage3Kit } from '../src/stage3.js';

test('Stage 3 kit teardown releases holds, boss abilities, inherited hazards, particles and lights once', () => withSeed(5, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    s.kit.destroy();
    const get = s.cache.json.get.bind(s.cache.json);
    const data = Object.fromEntries(['lights3', 'plates3'].map(k => [k, JSON.parse(readFileSync(`assets/bg3/${k === 'lights3' ? 'lights' : 'plates'}.json`))]));
    s.cache.json.get = k => data[k] || get(k);
    const kit = s.kit = new Stage3Kit(s);
    const lightsBefore = h.resources().lights;
    kit.build();
    const sun = kit.sun;
    s.camX = 3920; kit.update(0.1);
    const owned = [...kit.halos, ...kit.emitters.map(e => e.em), s.snowFront];
    const c = placeC(s, -46); c.startHold(s.riley);
    const f = new Myrddraal(s, 1000, 630);
    f.entering = false; f.introDone = true; f.auraOn = true;
    s.enemies.push(f); f.makeCopies();
    f.pool = { x: 900, y: 630 };
    let poolsEnded = 0;
    kit.shadowPoolEnd = () => poolsEnded++;
    s.vignette.strength = 0.75;
    for (const L of s.fires) { L.baseR = L.radius; L.radius *= 0.7; }
    kit.glint(640, 500, 0xffffff); kit.koStars(c);
    kit.fireArrow(c); kit.markSky(c);
    const hazards = [...kit.sticks.map(e => e.img), ...kit.stars.flatMap(e => e.imgs), ...kit.arrows.map(e => e.img), ...kit.skyArrows.flatMap(e => [e.mark, e.shadow])];
    assert.ok(sun);
    assert.ok(owned.length > 4);
    kit.destroy();
    assert.equal(s.riley.grabbedBy, null);
    assert.equal(f.copies.length, 0); assert.equal(f.pool, null);
    assert.equal(f.auraOn, false); assert.equal(poolsEnded, 1);
    assert.equal(s.vignette.strength, 0.35);
    for (const L of s.fires) assert.equal(L.radius, L.baseR);
    for (const v of [...owned, ...hazards]) assert.equal(v.dead, true, v.key);
    assert.equal(h.resources().lights, lightsBefore);
    kit.destroy();
    assert.equal(poolsEnded, 1);
  } finally { h.destroy(); }
}));
