import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { sfx } from '../src/audio.js';
import { drawStage3Meters } from '../src/hud.js';

function pen() {
  return {
    arcs: [],
    lineStyle() { return this; },
    strokeCircle() { return this; },
    beginPath() { return this; },
    arc(...args) { this.arcs.push(args); return this; },
    strokePath() { return this; },
  };
}

test('each counted mash ticks once, and nothing ticks outside a grab', () => withSeed(7, () => {
  assert.match(sfx.mash.toString(), /gate\('mash',\s*40\)/);
  const orig = sfx.mash;
  let ticks = 0;
  sfx.mash = () => { ticks++; };
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s;
    arena(s);
    const g = pen();
    const c = placeC(s, -46);
    c.startHold(s.riley);
    drawStage3Meters(s, g);
    assert.equal(ticks, 0, 'arming the ring is not a mash');
    c.mash();
    g.arcs.length = 0;
    drawStage3Meters(s, g);
    assert.equal(ticks, 1);
    assert.ok(g.arcs.some(a => a[2] === 28), 'the ring pops on a counted mash');
    c.mash();
    drawStage3Meters(s, g);
    assert.equal(ticks, 2);
    c.releaseHold('break');
    s.riley.grabbedBy = null;
    s.riley.state = 'idle';
    c.mashN = 4;
    drawStage3Meters(s, g);
    assert.equal(ticks, 2, 'no tick once Riley is out of the grab');
  } finally {
    sfx.mash = orig;
    h.destroy();
  }
}));

test('a cutthroat coil glint lasts the whole 0.45 s and a zealot glint stays short', () => withSeed(8, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s;
    arena(s);
    const c = placeC(s, -200);
    const before = s.kit.sticks.length;
    c.startLunge();
    const added = s.kit.sticks.slice(before);
    assert.equal(added.length, 2);
    assert.ok(added.every(k => k.life === 0.45));
    const zealotBefore = s.kit.sticks.length;
    s.kit.telegraph({ type: 'zealot', x: 300, y: 620, facing: 1 });
    const zealot = s.kit.sticks.slice(zealotBefore);
    assert.equal(zealot.length, 1);
    assert.equal(zealot[0].life, 0.15);
  } finally { h.destroy(); }
}));
