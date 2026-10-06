import test from 'node:test';
import assert from 'node:assert/strict';
import { kissScene } from './helpers/stage4-hardening-scene.mjs';
import { createArena } from '../src/stage4-arena.js';
import { createFog } from '../src/stage4-hazards.js';
import { createTowers } from '../src/stage4-towers.js';

for (const wall of ['court', 'street']) test(`${wall} wall contact breaks a kiss without knockdown`, () => {
  const c = kissScene();
  try {
    c.hold(); assert.equal(c.R.grabbedBy, c.d);
    const hazards = wall === 'court' ? createArena({ left: 800, right: 2080 }) : createTowers();
    if (wall === 'street') hazards.setWall({ x: 800, zoneL: 800, zoneR: 2080 });
    hazards.step(1 / 60, { riley: c.R });
    assert.equal(c.R.grabbedBy, null); assert.equal(c.d.state, 'reels'); assert.equal(c.R.state, 'idle');
    assert.ok(c.R.hp < 100); assert.equal(c.s._kissBusy, false);
  } finally { c.h.destroy(); }
});
test('tower and fog grip release kiss ownership synchronously', () => {
  const c = kissScene();
  try {
    c.hold(); c.s.kit.towerHit(c.R); assert.equal(c.R.grabbedBy, null); assert.equal(c.R.state, 'down');
    c.R.setState('idle', 'idle'); c.d.kissCooldown = 0; c.d.kissBetweenAction = true; c.hold();
    const fog = createFog(); const w = { riley: c.R }; const v = fog.addVent({ x: 400, y: c.R.y, zone: 1 });
    c.R.state = 'idle'; fog.tryEmit(v, w); fog.step(0.8, w);
    fog.tendrils[0].tip.x = c.R.x; c.R.fogContact = 239;
    fog.step(1 / 120, w);
    assert.equal(c.R.grabbedBy, null); assert.equal(c.R.state, 'down');
  } finally { c.h.destroy(); }
});
for (const state of ['grabbed', 'down', 'getup', 'story', 'pause']) test(`no vent tell can begin during ${state}`, () => {
  const fog = createFog(), w = { riley: { x: 800, y: 630, hp: 100, state: 'idle', alive: true } };
  if (state === 'story') w.story = true; else if (state === 'pause') w.paused = true; else w.riley.state = state;
  const v = fog.addVent({ x: 0, y: 630 });
  assert.equal(fog.tryEmit(v, w), null); assert.equal(v.phase, 'idle');
});
test('fog grip freezes at the precise substep across 30/60/120Hz and fractional frames', () => {
  const results = [30, 60, 120, 240].map(hz => {
    const fog = createFog(), R = { x: 400, y: 630, hp: 100, state: 'idle', alive: true };
    const w = { riley: R }; const v = fog.addVent({ x: 0, y: R.y, zone: 1 });
    fog.tryEmit(v, w); fog.step(0.8, w); const t = fog.tendrils[0]; t.tip.x = R.x;
    R.fogContact = 1;
    for (let i = 0; i < hz * 2; i++) fog.step(1 / hz, w);
    assert.equal(R.hp, 78); assert.equal(R.state, 'down'); assert.equal(R.fogContact, 0);
    R.state = 'getup'; fog.step(0.4, w); R.state = 'idle'; fog.step(2, w);
    assert.equal(R.fogImmuneTicks, 0); assert.equal(R.hp, 78);
    return { life: t.life, x: t.tip.x, hp: R.hp, contact: R.fogContact };
  });
  for (const result of results) assert.deepEqual(result, results[0]);
});
test('court walls freeze all clocks during pause/story, then resume', () => {
  for (const flag of ['paused', 'story']) {
    const a = createArena(); const R = { x: 4500, y: 630, hp: 100 };
    a.step(0.1, { riley: R }); const before = [a.left, a.right, a.swoop, R.hp];
    a.step(2, { riley: R, [flag]: true });
    assert.deepEqual([a.left, a.right, a.swoop, R.hp], before);
    a.step(0.1, { riley: R }); assert.ok(a.left > before[0]);
  }
});
test('last-wave clear retires live tower tells, rubble, street wall and fog before the exit', () => {
  const c = kissScene();
  try {
    const k = c.s.kit; c.s.enemies = []; c.s.boss = null; c.s.zoneI = 2; c.s.wave = 1;
    c.s.zone = { l: 2560, r: 3840, waves: [[], []] }; c.R.x = 3500; k._zone = 2; k._wave = 1;
    k.towers.arm(2); k.towers.setWave(1); k.towers.setWall({ x: 2560, zoneL: 2560, zoneR: 3840 });
    k.towers.step(2, k.world()); assert.ok(k.towers.towers.some(t => !t.harmless));
    const v = k.fog.addVent({ x: 3100, y: 630, zone: 2 }); k.fog.tryEmit(v, k.world()); k.fog.step(0.8, k.world());
    k.onZoneClear(2); c.s.zone = null; c.s.wave = 2;
    for (let i = 0; i < 600; i++) k.update(1 / 60);
    assert.equal(k.towers.towers.length, 0); assert.equal(k.towers.rubble.length, 0); assert.equal(k.towers.zoneWall, null);
    assert.equal(k.fog.tendrils.length, 0); assert.equal(k.fog.vents.some(v => v.zone === 2 && v.phase === 'tell'), false);
  } finally { c.h.destroy(); }
});
test('wall pushback/re-advance race preserves width and starts, including enrage, kiss and defeat', () => {
  const a = createArena(), R = { x: 4560, y: 630, hp: 100, state: 'grabbed' };
  for (let i = 0; i < 2000; i++) {
    a.step(i % 3 ? 1 / 30 : 0.05, { riley: R, holdWalls: i > 1500 });
    if (i % 217 === 0) { a.pushLight('left'); a.pushLight('right'); }
    assert.ok(a.width >= 640); assert.ok(a.left >= 3920); assert.ok(a.right <= 5200);
  }
  a.dispose(); assert.equal(a.active, false); assert.equal(a.swoop, null);
});
function alongTower() {
  const towers = createTowers(), R = { x: 3000, y: 630, hp: 100, alive: true, state: 'idle' };
  const world = { riley: R, enemies: [], bands: [[572, 610], [610, 650], [650, 690]] };
  towers.arm(2); towers.setWave(0); towers.step(1.3, world); towers.step(1.6, world); towers.step(7, world);
  assert.equal(towers.towers[0].along, true);
  return { towers, world, R };
}
test('an along-street tower hits its full marked band, even far from the prop x', () => {
  const { towers, world, R } = alongTower(); let hits = 0;
  R.x = 2800; world.onTowerHit = () => hits++;
  towers.step(1.6, world); assert.equal(hits, 1);
});
test('tower damage to enemies obeys the marked band and along-street footprint', () => {
  const { towers, world } = alongTower(); const x = towers.towers[0].x;
  const safe = { x, y: 680, hp: 100, alive: true }, inside = { x: 3650, y: 630, hp: 100, alive: true };
  world.enemies = [safe, inside]; towers.step(1.6, world);
  assert.equal(safe.hp, 100); assert.equal(inside.hp, 70);
});
test('bot avoids an along-street tower band even far from the prop x', async () => {
  const { stage4Bot } = await import('../src/bot-stage4.js'); const c = kissScene();
  try {
    c.s.enemies = []; c.s.boss = null; c.s.locked = true; c.R.setState('idle', 'idle');
    c.s.kit.threats = () => ({ towers: [{ x: 1100, width: 360, along: true, band: [610, 650], safeY: 604 }] });
    stage4Bot({ s: c.s, t: 1 });
    assert.equal(c.s.inp.demo.x, 0); assert.equal(c.s.inp.demo.y, -1); assert.equal(c.s.inp.demo.run, true);
  } finally { c.h.destroy(); }
});
