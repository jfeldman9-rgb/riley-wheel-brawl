import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { sfx } from '../src/audio.js';
import { playFearCues } from '../src/stage3-lights.js';
import { drawStage3Meters, auraRing } from '../src/hud.js';
import { Myrddraal, FADE } from '../src/myrddraal.js';

function pen() {
  return {
    arcs: [], styles: [],
    lineStyle(...args) { this.styles.push(args); return this; },
    strokeCircle() { return this; },
    beginPath() { return this; },
    arc(...args) { this.arcs.push(args); return this; },
    strokePath() { return this; },
  };
}

test('aura ring tracks auraActive and dispel', () => withSeed(3, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s;
    arena(s);
    const boss = new Myrddraal(s, 500, 630);
    boss.entering = false;
    boss.introDone = true;
    boss.auraOn = true;
    boss.dispelT = 0;
    boss.auraK = 0.4;
    boss.phase = 2;
    s.boss = boss;
    s.camX = 80;
    assert.equal(FADE.fear.radius, 220);
    assert.equal(boss.auraActive, true);
    const ring = auraRing(boss);
    assert.equal(ring.radius, 220);
    assert.equal(ring.alpha, 0.4);
    const g = pen();
    drawStage3Meters(s, g);
    const floor = g.arcs.filter(a => a[2] === 220);
    assert.equal(floor.length, 2, 'lane-clipped ring is two arcs of the true circle');
    assert.ok(floor.every(a => a[0] === 420 && a[1] === 630));
    assert.ok(g.styles.some(a => a[0] === 3 && a[1] === 0xff00ff && Math.abs(a[2] - 0.4) < 1e-9));
    boss.auraK = 0;
    const quiet = pen();
    drawStage3Meters(s, quiet);
    assert.equal(quiet.arcs.filter(a => a[2] === 220).length, 0);
    assert.equal(auraRing(boss).alpha, 0);
    boss.auraK = 1;
    boss.dispelT = FADE.fear.dispel;
    assert.equal(boss.auraActive, false);
    assert.equal(auraRing(boss), null);
    const dispelled = pen();
    drawStage3Meters(s, dispelled);
    assert.equal(dispelled.arcs.filter(a => a[2] === 220).length, 0);
    boss.dispelT = 0;
    boss.auraOn = false;
    assert.equal(auraRing(boss), null);
  } finally { h.destroy(); }
}));

test('dread stays quiet under 60% and while calm, and each shake stings once', () => withSeed(4, () => {
  assert.match(sfx.dread.toString(), /gate\('dread',\s*350\)/);
  assert.match(sfx.shaken.toString(), /gate\('shaken',\s*200\)/);
  const origDread = sfx.dread, origShaken = sfx.shaken;
  let dread = 0, stings = 0;
  sfx.dread = () => { dread++; };
  sfx.shaken = () => { stings++; };
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s, kit = s.kit;
    arena(s);
    const boss = new Myrddraal(s, s.riley.x, s.riley.y);
    boss.entering = false;
    boss.introDone = true;
    boss.auraOn = true;
    boss.hp = boss.maxHp * 0.5;
    boss.phase = 2;
    boss.pendingFear = false;
    boss.cool = 99;
    boss.nextBlink = 999;
    boss.lungeAt = 999;
    boss.T.speed = 0;
    s.boss = boss;
    s.enemies = [boss];
    s.riley.inv = 0;
    s.riley.state = 'idle';
    s.riley.z = 0;
    let crossed = false;
    for (let i = 0; i < 400 && !(crossed && dread > 0); i++) {
      boss.x = s.riley.x; boss.y = s.riley.y;
      h.step();
      if (boss.fear < 0.6) assert.equal(dread, 0, `dread while fear is ${boss.fear}`);
      else crossed = true;
    }
    assert.ok(crossed, 'fear reaches 60% inside the aura');
    assert.ok(dread > 0, 'heartbeat starts once the meter is past 60% and still rising');

    const mid = dread;
    s.riley.inv = 1;
    boss.fear = 0.7;
    playFearCues(kit);
    boss.fear = 0.85;
    playFearCues(kit);
    s.riley.inv = 0;
    s.riley.state = 'hurt';
    boss.fear = 0.9;
    playFearCues(kit);
    boss.fear = 0.95;
    playFearCues(kit);
    assert.equal(dread, mid, 'no dread while invulnerable or hurt');
    s.riley.state = 'idle';
    boss.braveT = 0;
    boss.fear = 0.96;
    playFearCues(kit);
    boss.fear = 0.99;
    playFearCues(kit);
    assert.ok(dread > mid);

    kit._shakenSeen = kit.stats.shaken || 0;
    const base = kit.stats.shaken || 0;
    stings = 0;
    s.riley.inv = 0;
    boss.cool = 99;
    boss.nextBlink = 999;
    for (let i = 0; i < 20 * 60; i++) {
      boss.x = s.riley.x; boss.y = s.riley.y; boss.vx = 0; boss.T.speed = 0;
      h.step();
    }
    assert.equal(stings, (kit.stats.shaken || 0) - base);
    assert.ok(stings > 0, 'phase 2 shakes at least once in 20 s');
  } finally {
    sfx.dread = origDread;
    sfx.shaken = origShaken;
    h.destroy();
  }
}));
