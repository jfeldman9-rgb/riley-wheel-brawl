import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { Draghkar, DRAGHKAR } from '../src/draghkar.js';

const root = resolve(import.meta.dirname, '..');

function makeScene(over = {}) {
  return {
    riley: {
      x: 640, y: 600, hp: 100, alive: true, state: 'idle', facing: 1, attackFrame: false,
      ...(over.riley || {}),
    },
    enemies: [],
    fireballs: over.fireballs || [],
    grabBusy: false,
    paused: !!over.paused,
    ...(over.scene || {}),
  };
}

test('draghkar module stays inside 16384 byte cap and has no Stage 3 imports', () => {
  const path = resolve(root, 'src/draghkar.js');
  const size = statSync(path).size;
  const src = readFileSync(path, 'utf8');
  assert.ok(size <= 16384, `size ${size} exceeds 16384`);
  assert.doesNotMatch(src, /from\s+['"]|require\(/);
  assert.equal(DRAGHKAR.hp, 560);
  assert.equal(DRAGHKAR.phase2Threshold, 560 * 0.66);
  assert.equal(DRAGHKAR.phase3Threshold, 560 * 0.33);
});

test('perched state is untargetable and receives 0.6x damage reduction when hit', () => {
  const s = makeScene();
  const d = new Draghkar(s, 640, 600);
  assert.equal(d.hp, 560);
  assert.equal(d.state, 'perch');
  assert.equal(d.untargetable, true);
  assert.equal(d.isAirborne, true);
  assert.equal(d.getDamageMultiplier(), 0.6);

  d.takeHit({ dmg: 100 });
  assert.equal(d.hp, 560 - 60); // 100 * 0.6 = 60
});

test('swoop tell is >= 0.9 s and displays screech, floor shadow, and lane-band arrow', () => {
  const s = makeScene();
  const d = new Draghkar(s, 640, 600);
  d.startSwoop(1, 1);
  assert.equal(d.state, 'swoop_tell');
  assert.ok(DRAGHKAR.swoopTell >= 0.9, 'swoop tell must be >= 0.9 s');
  assert.equal(d.screech, true);
  assert.equal(d.floorShadow, true);
  assert.equal(d.laneBandArrow, true);

  // Update just before 0.9s
  d.update(DRAGHKAR.swoopTell - 1 / 120);
  assert.equal(d.state, 'swoop_tell');
  assert.equal(d.screech, true);

  // Cross 0.9s threshold
  d.update(1 / 120);
  assert.equal(d.state, 'swoop_dive');
  assert.equal(d.screech, false);
  assert.equal(d.floorShadow, false);
  assert.equal(d.laneBandArrow, false);
});

test('swoop dive deals 14 damage and knocks Riley down if not countered', () => {
  const s = makeScene({ riley: { x: 400, y: 600, hp: 100, state: 'idle' } });
  const d = new Draghkar(s, 0, 600);
  d.state = 'swoop_dive';
  d.swoopDir = 1;
  d.x = 350;

  d.update(1 / 120); // Moves past Riley at 1100 px/s
  assert.equal(s.riley.hp, 86);
  assert.equal(s.riley.state, 'down');
});

test('swoop hit by fireball or lightning knocks Draghkar out of air: downed 2s at 1.5x with COUNTER', () => {
  const s = makeScene();
  const d = new Draghkar(s, 640, 600);
  d.state = 'swoop_dive';

  let countered = false;
  d.deps.onCounter = () => { countered = true; };

  // Hit with fireball during dive
  const hpBefore = d.hp;
  d.takeHit({ dmg: 40, kind: 'fireball' }, s.riley);

  assert.equal(d.state, 'counter_down');
  assert.equal(d.counter, true);
  assert.equal(countered, true);
  assert.equal(d.hp, hpBefore - 40 * 1.5); // 1.5x damage

  // Stays down for 2.0s
  d.update(1.9);
  assert.equal(d.state, 'counter_down');
  d.update(0.15);
  assert.equal(d.state, 'getup');
});

test('swoop hit by facing active attack frame knocks Draghkar out of air', () => {
  const s = makeScene({
    riley: { x: 500, y: 600, facing: 1, attackFrame: true },
  });
  const d = new Draghkar(s, 700, 600);
  d.state = 'swoop_dive';
  d.swoopDir = -1; // diving towards Riley from right to left

  d.takeHit({ dmg: 20 }, s.riley);
  assert.equal(d.state, 'counter_down');
  assert.equal(d.counter, true);
});

test('swoop hit from behind does not trigger counter', () => {
  const s = makeScene({
    riley: { x: 500, y: 600, facing: -1, attackFrame: true }, // facing away
  });
  const d = new Draghkar(s, 700, 600);
  d.state = 'swoop_dive';
  const hpBefore = d.hp;
  d.takeHit({ dmg: 20 }, s.riley);

  assert.notEqual(d.state, 'counter_down');
  assert.equal(d.counter, false);
  assert.equal(d.hp, hpBefore - 20 * 0.6); // takes normal airborne 0.6x
});

test('landing recovery is 1.2 s at 1.3x damage taken', () => {
  const s = makeScene();
  const d = new Draghkar(s, 640, 600);
  d.state = 'land_recovery';
  d.st = 0;

  assert.equal(d.getDamageMultiplier(), 1.3);
  const hpBefore = d.hp;
  d.takeHit({ dmg: 10 }, s.riley);
  assert.equal(d.hp, hpBefore - 13); // 10 * 1.3 = 13

  d.update(1.19);
  assert.equal(d.state, 'land_recovery');
  d.update(0.02);
  assert.equal(d.state, 'grounded');
});

test('grounded claw 2-string deals 10 then 12, second knocks down; buffet pushes 300 for 4 dmg', () => {
  const s = makeScene({ riley: { x: 700, y: 600, hp: 100, state: 'idle' } });
  const d = new Draghkar(s, 640, 600);
  d.state = 'grounded';
  assert.equal(d.startClaw(), true);
  assert.equal(d.state, 'claw');

  // Claw hit 1
  d.update(0.3);
  assert.equal(s.riley.hp, 90);
  assert.equal(s.riley.state, 'idle'); // Not knocked down

  // Advance to claw hit 2
  d.update(0.2); // claw step 2
  d.update(0.3);
  assert.equal(s.riley.hp, 78);
  assert.equal(s.riley.state, 'down'); // Knocked down

  // Recover to grounded
  d.update(0.4);
  assert.equal(d.state, 'grounded');

  // Wing buffet
  s.riley.hp = 100;
  s.riley.state = 'idle';
  s.riley.x = 700;
  assert.equal(d.startBuffet(), true);
  d.update(0.35);
  assert.equal(s.riley.hp, 96);
  assert.equal(s.riley.x, 700 + 300);
});

test('phase changes at 66% and 33%; Phase 2 drops Saangreal and spawns 2 cultists', () => {
  const s = makeScene();
  let saangrealDropped = false;
  let cultistsSpawned = 0;
  let phaseRecorded = 1;

  const d = new Draghkar(s, 640, 600, {
    dropSaangreal: () => { saangrealDropped = true; },
    spawnCultists: count => { cultistsSpawned += count; },
    onBossPhase: (boss, ph) => { phaseRecorded = ph; },
  });

  assert.equal(d.phase, 1);

  // Drop below 66% (369.6)
  d.hp = 369;
  d.checkPhase();
  assert.equal(d.phase, 2);
  assert.equal(phaseRecorded, 2);
  assert.equal(saangrealDropped, true);
  assert.equal(cultistsSpawned, 2);

  // Drop below 33% (184.8)
  d.hp = 184;
  d.checkPhase();
  assert.equal(d.phase, 3);
  assert.equal(phaseRecorded, 3);

  // Defeat at 0 HP
  let defeated = false;
  d.deps.onBossDefeat = () => { defeated = true; };
  d.hp = 0;
  d.takeHit({ dmg: 10 });
  assert.equal(d.alive, false);
  assert.equal(d.state, 'defeated');
  assert.equal(defeated, true);
});

test('30, 60, and 120 Hz produce bit-for-bit identical state and numbers', () => {
  function runSim(hz) {
    const s = makeScene({ riley: { x: 700, y: 600, hp: 100 } });
    const d = new Draghkar(s, 640, 600);
    d.state = 'swoop_tell';
    d.st = 0;
    d.swoopDir = 1;
    d.x = 0;

    const frames = Math.round(2.0 * hz);
    const dt = 1 / hz;
    for (let i = 0; i < frames; i++) {
      d.update(dt);
    }
    return { x: d.x, y: d.y, hp: d.hp, state: d.state, st: d.st };
  }

  const res30 = runSim(30);
  const res60 = runSim(60);
  const res120 = runSim(120);

  assert.deepEqual(res30, res60, '30 Hz and 60 Hz must match identically');
  assert.deepEqual(res60, res120, '60 Hz and 120 Hz must match identically');
});

test('simulation produces no NaN and no stuck states across 1000 frames', () => {
  const s = makeScene({ riley: { x: 640, y: 600, hp: 100 } });
  const d = new Draghkar(s, 640, 600);

  const seenStates = new Set();
  for (let i = 0; i < 1000; i++) {
    d.update(1 / 60);
    seenStates.add(d.state);
    assert.ok(Number.isFinite(d.x), `x is NaN or infinite at step ${i}`);
    assert.ok(Number.isFinite(d.y), `y is NaN or infinite at step ${i}`);
    assert.ok(Number.isFinite(d.hp), `hp is NaN or infinite at step ${i}`);
    assert.ok(Number.isFinite(d.st), `st is NaN or infinite at step ${i}`);
  }

  assert.ok(seenStates.size >= 3, `Expected multiple states visited, got ${[...seenStates].join(', ')}`);
});
