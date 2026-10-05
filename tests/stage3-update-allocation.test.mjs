import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { Stage3Kit, timeOfDay } from '../src/stage3.js';
import { Myrddraal, FADE } from '../src/myrddraal.js';

test('time-of-day interpolation can reuse storage without changing its fresh-result contract', () => {
  const keys = JSON.parse(readFileSync('assets/bg3/lights.json')).timeKeys;
  const out = {};
  for (const input of [keys, keys.slice(0, 1), [], undefined]) {
    for (const x of [-500, 0, 1300, 2500, 3920, 6000]) {
      assert.equal(timeOfDay(x, input, out), out);
      assert.deepEqual(out, timeOfDay(x, input));
      assert.notEqual(timeOfDay(x, input), timeOfDay(x, input));
    }
  }
});

test('Stage 3 update reuses lighting state and avoids copying empty hazard collections', () => withSeed(2, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const kit = s.kit;
    const tod = kit.tod;
    for (const field of ['arrows', 'skyArrows', 'stars', 'sticks']) {
      kit[field].slice = () => { throw new Error(`empty ${field} copied`); };
    }
    for (let i = 0; i < 120; i++) {
      kit.update(1 / 120);
      assert.equal(kit.tod, tod);
    }
    const img = s.add.image(100, 600, 'glow');
    kit.sticks = [{ img, t: 0, life: 0.1 }];
    kit.update(0.6);
    assert.equal(img.dead, true, 'populated collections still advance and expire');
  } finally { h.destroy(); }
}));

test('boss hit eligibility and final slash reuse their state table and hit descriptor', () => withSeed(2, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const f = new Myrddraal(s, 940, 630);
    f.entering = false; f.introDone = true;
    const tables = new Set(), saved = Array.prototype.includes;
    try {
      Array.prototype.includes = function(...args) { tables.add(this); return saved.apply(this, args); };
      for (let i = 0; i < 120; i++) void f.canBeHit;
    } finally { Array.prototype.includes = saved; }
    assert.equal(tables.size, 1);
    const hits = [];
    s.resolveAttack = (_, hit) => hits.push(hit);
    f.startAttack();
    f.sprite.anims.currentFrame = { index: f.atk.active.at(-1) + 1 };
    for (let i = 0; i < 120; i++) f.attacking();
    assert.equal(new Set(hits).size, 1);
    assert.deepEqual(hits[0], { ...f.T.atk, ...FADE.thrust });
  } finally { h.destroy(); }
}));

test('all eight mash directions remain distinct and neutral never counts as a press', () => withSeed(2, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s);
    const c = placeC(s, -46); c.startHold(s.riley);
    let presses = 0;
    c.mash = () => { presses++; return false; };
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
      const inp = { x, y, take: () => false }, before = presses;
      s.riley.grabbed(0, inp); s.riley.grabbed(0, inp);
      assert.equal(presses - before, x || y ? 1 : 0);
    }
    assert.equal(presses, 8);
  } finally { h.destroy(); }
}));
