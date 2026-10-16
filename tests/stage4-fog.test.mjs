// Pure Mashadar fog core. No Phaser scene: createFog() plus a plain world object.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createFog, safeStripWidth, FOG } from '../src/stage4-hazards.js';

const root = resolve(import.meta.dirname, '..');
const src = readFileSync(resolve(root, 'src/stage4-hazards.js'), 'utf8');

function world(over = {}) {
  return {
    riley: { x: 800, y: 600, hp: 100, state: 'idle', alive: true, ...(over.riley || {}) },
    enemies: over.enemies || [],
    story: !!over.story, paused: !!over.paused, lastWave: !!over.lastWave,
    exitX: over.exitX, exitBand: over.exitBand,
  };
}
function fogWith(over, deps) {
  const fog = createFog(deps);
  const w = world(over);
  return { fog, w };
}
const step = (fog, w, seconds, hz = 120) => {
  const n = Math.round(seconds * hz);
  const dt = 1 / hz;
  for (let i = 0; i < n; i++) fog.step(dt, w);
};

test('fog core stays under the size cap and does not import Phaser or Stage 3', () => {
  assert.ok(statSync(resolve(root, 'src/stage4-hazards.js')).size <= 12288);
  assert.doesNotMatch(src, /from\s+['"]|require\(/);
  assert.match(src, /lightNear/);
  assert.equal(FOG.tell, 0.8);
  assert.equal(FOG.steer, 90);
  assert.equal(FOG.reach, 520);
  assert.equal(FOG.spawnClear, 300);
  assert.equal(FOG.lightR, 260);
});

test('a vent tells for 0.8s, then the tip chases at 90 px/s out to 520 px and retracts over 1s', () => {
  const { fog, w } = fogWith({ riley: { x: 2000, y: 600 } });
  const vent = fog.addVent({ x: 0, y: 600, zone: 1 });
  assert.equal(fog.tryEmit(vent, w).phase, 'tell');
  step(fog, w, 0.8 - 1 / 120);
  assert.equal(fog.tendrils.length, 0, 'still in the tell');
  step(fog, w, 1 / 120);
  assert.equal(fog.tendrils.length, 1);
  assert.equal(fog.tendrils[0].tip.x, 0);
  assert.equal(fog.tendrils[0].segments.length, 8);
  step(fog, w, 2);
  assert.equal(fog.tendrils[0].tip.x, 180);
  assert.equal(fog.tendrils[0].phase, 'chase');
  step(fog, w, 4);
  assert.equal(fog.tendrils[0].tip.x, 520);
  assert.equal(fog.tendrils[0].phase, 'retract');
  const before = fog.tendrils[0].tip.x;
  step(fog, w, 0.5);
  assert.ok(fog.tendrils[0].tip.x < before);
  step(fog, w, 0.5);
  assert.equal(fog.tendrils.length, 0);
  assert.equal(vent.phase, 'idle');
});

test('the tip never enters a moonshaft', () => {
  const { fog, w } = fogWith({ riley: { x: 800, y: 600 } });
  fog.setMoonshafts([{ x: 200, y: 600, r: 40 }]);
  const vent = fog.addVent({ x: 0, y: 600, zone: 1 });
  fog.tryEmit(vent, w);
  step(fog, w, 6);
  for (const t of fog.tendrils) {
    assert.ok(Math.hypot(t.tip.x - 200, t.tip.y - 600) >= 40 - 1e-6);
    for (const p of t.segments) assert.ok(Math.hypot(p.x - 200, p.y - 600) >= 40 - 1e-6 || p.x <= 160);
  }
  assert.ok(fog.tendrils[0].tip.x <= 160);
});

test('contact is 3 damage and 30% slow per 0.5s, and 2s of contact is a 10 damage knockdown plus 2s immunity after getup', () => {
  const { fog, w } = fogWith({ riley: { x: 400, y: 600, hp: 100 } });
  const vent = fog.addVent({ x: 0, y: 600, zone: 1 });
  fog.tryEmit(vent, w);
  step(fog, w, 0.8);
  const pin = () => { fog.tendrils[0].tip.x = w.riley.x; fog.tendrils[0].tip.y = w.riley.y; };
  pin();
  step(fog, w, 0.5);
  pin();
  assert.equal(w.riley.hp, 97);
  assert.equal(w.riley.fogSlow, 0.3);
  step(fog, w, 1.5);
  assert.equal(w.riley.hp, 78, 'four contact ticks plus the grip');
  assert.equal(w.riley.state, 'down');
  const hp = w.riley.hp;
  step(fog, w, 1);
  assert.equal(w.riley.hp, hp, 'frozen while down');
  w.riley.state = 'getup';
  step(fog, w, 0.4);
  assert.equal(w.riley.hp, hp);
  w.riley.state = 'idle';
  step(fog, w, 2);
  assert.equal(w.riley.hp, hp, 'immune for 2s after getup');
  assert.equal(w.riley.fogImmuneTicks, 0);
  step(fog, w, 0.5);
  assert.equal(w.riley.hp, hp - 3);
});

test('tendrils hurt a cutthroat the same way, and knocking a cultist in deals 20', () => {
  const cultist = { id: 1, x: 400, y: 600, hp: 30, type: 'cultist', alive: true, state: 'approach', knocked: true };
  const cut = { id: 2, x: 400, y: 600, hp: 40, type: 'cutthroat', alive: true, state: 'approach' };
  const { fog, w } = fogWith({ riley: { x: 900, y: 600 }, enemies: [cultist, cut] });
  const vent = fog.addVent({ x: 0, y: 600, zone: 1 });
  fog.tryEmit(vent, w);
  step(fog, w, 0.8);
  const pin = () => { fog.tendrils[0].tip.x = 400; fog.tendrils[0].tip.y = 600; };
  pin();
  fog.step(1 / 120, w);
  assert.equal(cultist.hp, 10);
  assert.equal(cultist.knocked, false);
  pin();
  fog.step(1 / 120, w);
  assert.equal(cultist.hp, 10, 'the 20 damage impulse does not repeat');
  for (let i = 0; i < 60; i++) { pin(); fog.step(1 / 120, w); }
  assert.equal(cut.hp, 37);
  assert.equal(cut.fogSlow, 0.3);
  assert.ok(cultist.hp < 10, 'the same contact tick hits the cultist');
});

test('lightNear at r=260 recoils the tendril and dormants the vent for 5s; melee recoils for 1.5s', () => {
  const seen = [];
  const { fog, w } = fogWith({ riley: { x: 800, y: 600 } }, {
    lightNear: (world, x, r) => { seen.push(r); return x >= 90; },
  });
  const vent = fog.addVent({ x: 0, y: 600, zone: 1 });
  fog.tryEmit(vent, w);
  for (let i = 0; i < 400 && vent.phase !== 'dormant'; i++) fog.step(1 / 120, w);
  assert.ok(seen.length > 0 && seen.every(r => r === 260));
  assert.equal(vent.phase, 'dormant');
  assert.equal(fog.tryEmit(vent, w), null);
  step(fog, w, 5 - 1 / 120);
  assert.equal(vent.phase, 'dormant');
  step(fog, w, 1 / 120);
  assert.equal(vent.phase, 'idle');
  assert.equal(fog.tendrils.length, 0);

  const melee = createFog();
  const mw = world({ riley: { x: 800, y: 600 } });
  const mv = melee.addVent({ x: 0, y: 600, zone: 1 });
  melee.tryEmit(mv, mw);
  step(melee, mw, 2);
  const tip = melee.tendrils[0];
  const x0 = tip.tip.x;
  assert.equal(melee.melee(tip.id), true);
  mw.riley.x = tip.tip.x;
  mw.riley.y = tip.tip.y;
  const hp = mw.riley.hp;
  step(melee, mw, 0.5);
  assert.ok(tip.tip.x < x0);
  assert.equal(mw.riley.hp, hp, 'melee recoil does not keep biting');
  assert.equal(tip.phase, 'recoil');
  step(melee, mw, 1);
  assert.equal(tip.phase, 'chase');
});

test('caps are one tendril in zone 0 and two elsewhere, and nothing spawns within 300 px', () => {
  const { fog, w } = fogWith({ riley: { x: 0, y: 600 } });
  const near = fog.addVent({ x: 299, y: 600, zone: 1 });
  const edge = fog.addVent({ x: 300, y: 600, zone: 1 });
  const diag = fog.addVent({ x: 200, y: 800, zone: 1 });
  assert.equal(fog.tryEmit(near, w), null);
  assert.ok(hypot(200, 200) < 300);
  w.riley.x = 0; w.riley.y = 600;
  diag.x = 200; diag.y = 800;
  assert.equal(fog.tryEmit(diag, w), null);
  w.riley.x = 0;
  assert.equal(fog.tryEmit(edge, w).phase, 'tell');
  const z0 = createFog();
  const zw = world({ riley: { x: 0, y: 600 } });
  const a = z0.addVent({ x: 400, y: 600, zone: 0 });
  const b = z0.addVent({ x: 500, y: 600, zone: 0 });
  assert.ok(z0.tryEmit(a, zw));
  assert.equal(z0.tryEmit(b, zw), null);
  const z1 = createFog();
  const w1 = world({ riley: { x: 0, y: 600 } });
  const vents = [400, 500, 700].map(x => z1.addVent({ x, y: 600, zone: 1 }));
  assert.ok(z1.tryEmit(vents[0], w1));
  assert.ok(z1.tryEmit(vents[1], w1));
  assert.equal(z1.tryEmit(vents[2], w1), null);
});

function hypot(x, y) { return Math.hypot(x, y); }

test('a 200 px safe strip stays inside 400 px, and a cleared wave exit is not blocked', () => {
  const riley = { x: 1000, y: 600 };
  const wall = { vent: { x: 600, y: 600 }, tip: { x: 1400, y: 600 } };
  assert.ok(safeStripWidth([wall], [], riley) < 200);
  assert.ok(safeStripWidth([wall], [{ x: 1000, y: 600, r: 100 }], riley) >= 200);
  const { fog, w } = fogWith({ riley: { x: 1000, y: 600 } });
  fog.addVent({ x: 650, y: 600, zone: 1 });
  fog.addVent({ x: 1350, y: 600, zone: 1 });
  for (const v of fog.vents) assert.ok(fog.tryEmit(v, w));
  step(fog, w, 4);
  assert.ok(safeStripWidth(fog.tendrils, fog.moonshafts, w.riley) >= 200);

  const exit = createFog();
  const ew = world({ riley: { x: 800, y: 600 }, lastWave: true, exitX: 400 });
  const ev = exit.addVent({ x: 0, y: 600, zone: 1 });
  const blocked = exit.addVent({ x: 400, y: 600, zone: 1 });
  assert.equal(exit.tryEmit(blocked, ew), null);
  assert.ok(exit.tryEmit(ev, ew));
  step(exit, ew, 4);
  assert.ok(exit.tendrils[0].tip.x <= 320);
});

test('tendrils freeze while Riley is grabbed, down, getup, or the stage is in a story or pause', () => {
  for (const freeze of ['grabbed', 'down', 'getup', 'story', 'paused']) {
    const { fog, w } = fogWith({ riley: { x: 800, y: 600 } });
    const vent = fog.addVent({ x: 0, y: 600, zone: 1 });
    fog.tryEmit(vent, w);
    step(fog, w, 0.4);
    const ticks = vent.ticks;
    if (freeze === 'story') w.story = true;
    else if (freeze === 'paused') w.paused = true;
    else w.riley.state = freeze;
    step(fog, w, 3);
    assert.equal(vent.ticks, ticks, freeze);
    assert.equal(fog.tendrils.length, 0, freeze);
    w.story = false; w.paused = false; w.riley.state = 'idle';
    step(fog, w, 0.4);
    assert.equal(fog.tendrils.length, 1, freeze);
    assert.equal(fog.tendrils[0].tip.x, 0, freeze);
  }
});

test('30, 60 and 120 Hz produce the same fog result', () => {
  const run = hz => {
    const fog = createFog();
    const w = world({ riley: { x: 800, y: 600, hp: 100 } });
    fog.addVent({ x: 0, y: 600, zone: 1 });
    fog.tryEmit(fog.vents[0], w);
    step(fog, w, 3, hz);
    const t = fog.tendrils[0];
    const mid = { x: t.tip.x, y: t.tip.y, phase: t.phase, hp: w.riley.hp, segs: t.segments.length };
    step(fog, w, 4.5, hz);
    return { mid, later: fog.tendrils.length ? { x: fog.tendrils[0].tip.x, phase: fog.tendrils[0].phase } : { gone: true }, hp: w.riley.hp };
  };
  const a = run(30), b = run(60), c = run(120);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
  assert.equal(a.mid.x, 198);
  assert.equal(a.mid.phase, 'chase');
});

test('dispose clears vents, tendrils and moonshafts', () => {
  const { fog, w } = fogWith();
  fog.setMoonshafts([{ x: 100, y: 600, r: 50 }]);
  const vent = fog.addVent({ x: 0, y: 600, zone: 1 });
  fog.tryEmit(vent, w);
  step(fog, w, 1);
  assert.ok(fog.tendrils.length === 1 && fog.vents.length === 1 && fog.moonshafts.length === 1);
  fog.dispose();
  assert.equal(fog.vents.length, 0);
  assert.equal(fog.tendrils.length, 0);
  assert.equal(fog.moonshafts.length, 0);
  fog.step(1, w);
  assert.equal(fog.addVent({ x: 1, y: 1, zone: 1 }), null);
  assert.equal(fog.tendrils.length, 0);
});
