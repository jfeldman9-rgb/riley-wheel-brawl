import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Aginor } from '../src/aginor.js';
import { Balthamel, BALTH } from '../src/balthamel.js';
import { Sporepod } from '../src/blightspawn.js';
import { createArena } from '../src/stage5-arena.js';
import { strikeRiley } from '../src/stage5-hurt.js';

function bare() {
  const riley = { x: 1000, y: 630, z: 0, hp: 40, maxHp: 100, saidin: 100, alive: true, state: 'idle', inv: 0, facing: 1, score: 0, enterGrabbed() { this.state = 'grabbed'; }, leaveGrabbed() { this.state = 'idle'; } };
  const scene = { riley, enemies: [], bands: [[572, 610], [611, 650], [651, 690]], bounds: { l: 0, r: 2000 }, kit: {}, maxTokens: 2 };
  return { scene, riley };
}

test('burst after the beat still enters phase 3 before burning', () => {
  const { scene } = bare(), phases = [];
  const a = new Aginor(scene, 1400, 630, { onPhase: (_, p) => phases.push(p) });
  a.takeHit({ dmg: 10000 });
  a.beatFired = true; a.markBeat();
  a.takeHit({ dmg: 10000 });
  assert.deepEqual(phases, [2, 3]);
  assert.equal(a.hp, 198);
  a.takeHit({ dmg: 10000 });
  assert.equal(a.state, 'burn');
});

test('phase 2 timeout fires even when repeated hits keep Aginor hurt', () => {
  const { scene } = bare(); let beats = 0;
  const a = new Aginor(scene, 1400, 630, { onBeat() { beats++; a.invuln = true; }, frozen: () => a.invuln });
  a.phase = 2; a.p2t = 49.99; a.state = 'hurt';
  for (let i = 0; i < 120; i++) { a.st = 0; a.update(1 / 120); }
  assert.equal(beats, 1);
});

for (const state of ['down', 'dead']) test(`oak cannot heal Riley in ${state}`, () => {
  const { scene, riley } = bare(), arena = createArena({ left: 0, right: 2000 });
  riley.state = state; riley.hp = state === 'dead' ? 0 : 20; riley.alive = state !== 'dead';
  const hp = riley.hp;
  arena.oakStep(0.5, { scene, riley });
  assert.equal(riley.hp, hp);
});

for (const hz of [30, 60, 120]) test(`oak heals exactly 1 HP/s and caps at 50% at ${hz} Hz`, () => {
  const { scene, riley } = bare(), arena = createArena({ left: 0, right: 2000 });
  riley.hp = 49.5;
  for (let i = 0; i < hz; i++) arena.oakStep(1 / hz, { scene, riley });
  assert.equal(riley.hp, 50);
  riley.hp = 20;
  for (let i = 0; i < hz; i++) arena.oakStep(1 / hz, { scene, riley });
  assert.ok(Math.abs(riley.hp - 21) < 1e-8);
});

for (const protect of ['inv', 'dead', 'story', 'beat', 'god']) test(`tether drain respects ${protect}`, () => {
  const { scene, riley } = bare(); const a = new Aginor(scene, 1200, 630);
  a.hp = 500; a.state = 'tether'; a.locked = true; a.tickT = 0.49;
  if (protect === 'inv') { riley.inv = 2; riley.state = 'getup'; }
  if (protect === 'dead') riley.alive = false;
  if (protect === 'story') scene.cutscene = {};
  if (protect === 'beat') scene.kit.arena = { frozen: true };
  if (protect === 'god') scene.god = true;
  a.tether(0.02);
  assert.equal(riley.hp, 40); assert.equal(riley.saidin, 100); assert.equal(a.hp, 500);
});

for (const protect of ['story', 'beat']) test(`direct hazard strike respects ${protect}`, () => {
  const { scene, riley } = bare();
  if (protect === 'story') scene.cutscene = {}; else scene.kit.arena = { frozen: true };
  assert.equal(strikeRiley(scene, 10, { dot: true }), false);
  assert.equal(riley.hp, 40);
});

test('flail hits once per strike, including the second strike', () => {
  const { scene, riley } = bare(), b = new Balthamel(scene, 1060, 630);
  b.startFlail(); b.st = BALTH.tell + 0.05; b.flail(0.01, riley);
  assert.equal(riley.hp, 31);
  b.flail(0.01, riley); assert.equal(riley.hp, 31);
  b.st = BALTH.tell + 0.2; b.flail(0.01, riley);
  b.st = BALTH.tell + 0.4; b.flail(0.01, riley);
  assert.equal(riley.hp, 20);
  b.flail(0.01, riley); assert.equal(riley.hp, 20);
});

test('three swelling pods cannot exceed two spores at launch', () => {
  const { scene } = bare();
  for (let i = 0; i < 3; i++) { const p = new Sporepod(scene, 100 + i * 200, 630); p.state = 'attack'; p.st = 0.59; }
  for (const p of scene.enemies) p.update(0.02);
  assert.equal(scene.spores.length, 2);
  assert.equal(scene.enemies.filter(p => p.state === 'attack').length, 0);
});

test('bone hand tell pauses while Riley is down or getting up', () => {
  const { scene, riley } = bare(), arena = createArena();
  const a = new Aginor(scene, 1400, 630);
  arena.hands = [{ x: riley.x, y: riley.y, st: 0.5, phase: 'tell' }];
  for (const state of ['down', 'getup', 'grabbed']) { riley.state = state; arena.handStep(1, a, { scene, riley }); assert.equal(arena.hands[0]?.st, 0.5); }
});

for (const type of ['stalker', 'sporepod', 'aginor']) test(`${type} death animation retires the actor without another death callback`, async () => {
  const { Stalker } = await import('../src/blightspawn.js');
  const { scene } = bare(); let deaths = 0; scene.onEnemyDie = () => deaths++;
  const C = { stalker: Stalker, sporepod: Sporepod, aginor: Aginor }[type];
  const e = new C(scene, 200, 630, { onDefeat: () => deaths++ });
  e.alive = false; e.state = 'dead'; e.st = 0;
  for (let i = 0; i < 120; i++) e.update(1 / 120);
  assert.equal(e.gone, true); assert.equal(deaths, 0);
});

test('walking into the oak breaks a tether already locked outside it', () => {
  const { scene, riley } = bare();
  const a = new Aginor(scene, 1200, 630, { oakBlocks: () => true });
  a.state = 'tether'; a.locked = true; a.tickT = 0.49;
  a.tether(0.02);
  assert.equal(a.locked, false); assert.equal(riley.hp, 40);
});

test('cleared tar flats never restart tells or slow Riley while walking to the exit', async () => {
  const { createBlight } = await import('../src/stage5-blight.js');
  const { scene, riley } = bare();
  const b = createBlight({ seeps: [{ x: riley.x, y: riley.y, zone: 2 }] });
  b.seeps[0].cool = 0; b.clearZone(2);
  b.step(0.5, { scene, riley, zone: 2 });
  assert.equal(b.seeps[0].phase, 'gone'); assert.equal(riley.fogSlow || 0, 0);
});

test('coil cannot grab during getup invulnerability after Riley returns to idle', () => {
  const { scene, riley } = bare(), b = new Balthamel(scene, 1060, 630);
  riley.inv = 2;
  b.startCoil(); b.st = BALTH.coil; b.coil(0.01, riley);
  assert.notEqual(b.state, 'holding'); assert.equal(riley.grabbedBy || null, null);
});

test('a new bone-hand tell cannot consume the frame that created it', () => {
  const { scene, riley } = bare(), arena = createArena(); const a = new Aginor(scene, 1200, 630);
  arena.handsAt = 0;
  arena.handStep(10, a, { scene, riley });
  assert.equal(riley.hp, 40); assert.equal(arena.hands[0]?.st, 0);
});
test('a new wither-ring tell starts at zero rather than consuming tab-resume time', () => {
  const { scene, riley } = bare(), arena = createArena(); const a = new Aginor(scene, 1200, 630);
  arena.ringAt = 0;
  arena.ringStep(10, a, { scene, riley });
  assert.equal(arena.ring.phase, 'tell'); assert.equal(arena.ring.st, 0); assert.equal(riley.hp, 40);
});

test('phase 2 timeout fires once and stops remaining substeps when the beat starts mid-frame', () => {
  const { scene } = bare(); let frozen = false, beats = 0;
  const a = new Aginor(scene, 1400, 630, { frozen: () => frozen, onBeat() { frozen = true; beats++; } });
  a.phase = 2; a.p2t = 49.99;
  a.update(1 / 30);
  assert.equal(beats, 1); assert.ok(a.st <= 2 / 120 + 1e-8);
});
