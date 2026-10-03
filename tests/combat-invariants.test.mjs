// Seeded input-only state stress. This exercises production Stage1.create/update,
// Input, fighters and FX through semantic held directions and buffered presses.
// Actor HP/lives/positions/states/cooldowns, wave data and combat tuning are never
// written by this controller. Renderer/audio/particles/HUD/tweens/scene clock
// and scene disposal are explicit helper stubs; its animation clock is pinned-Phaser contract-tested.
// These checks are combat-logic evidence, not human difficulty, rendered gameplay,
// performance, browser memory, hardware or acceptance evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';

function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const intervals = [1 / 60, 1 / 60, 1 / 60, 1 / 30, 1 / 45];
const holdStates = new Set(['grab', 'hold', 'knee', 'throw']);
const deadStates = new Set(['down', 'dead']);
const seedSet = [1, 2, 3, 7, 19, 31, 73, 97];

for (const seed of seedSet) test(`seeded real inputs preserve combat ownership/liveness, seed ${seed}`, () => withSeed(seed, () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  // A separate controller PRNG makes input decisions independent of incidental
  // production random calls. World randomness still uses withSeed above.
  const random = seededRandom(seed ^ 0x91ac5), recentInputs = [], deadSince = new Map(), deaths = new Set();
  let frame = 0, activeSeconds = 0, observedDeaths = 0;
  const context = message => `${message}; seed=${seed}, frame=${frame}, inputs=${JSON.stringify(recentInputs)}, state=${JSON.stringify(h.summary())}`;
  // Build the detailed snapshot only on failure, keeping this CI sweep cheap.
  const check = (condition, message) => { if (!condition) assert.fail(context(message)); };
  const equal = (actual, expected, message) => { if (actual !== expected) assert.equal(actual, expected, context(message)); };
  const remember = input => { recentInputs.push([frame, ...input]); if (recentInputs.length > 20) recentInputs.shift(); };
  const press = action => { remember([action]); s.inp.press(action); };
  const resolveAttack = s.resolveAttack;
  s.resolveAttack = function(attacker, attack) {
    equal(attacker.alive, true, 'Dead actors cannot resolve new attacks');
    check(!attacker.entering, 'Invulnerable entering actors cannot resolve attacks');
    return resolveAttack.call(this, attacker, attack);
  };
  try {
    // A bounded exploration budget, not a clearance time or success threshold.
    // The controller may finish, lose lives, continue, or remain in combat.
    for (frame = 0; frame < 18000 && !s.ended; frame++) {
      const r = s.riley;
      if (s.gameOver) press('start');
      if (frame % 13 === 0) {
        const nearest = s.enemies.filter(e => e.alive).sort((a, b) =>
          Math.hypot(a.x - r.x, (a.y - r.y) * 2) - Math.hypot(b.x - r.x, (b.y - r.y) * 2))[0];
        const choice = random(); let x = 0, y = 0, run = false;
        if (!nearest) x = 1;
        else {
          x = choice < 0.7 ? Math.sign(nearest.x - r.x) : choice < 0.83 ? -Math.sign(nearest.x - r.x) : 0;
          y = Math.abs(nearest.y - r.y) > 6 && random() < 0.85 ? Math.sign(nearest.y - r.y) : random() < 0.45 ? Math.floor(random() * 3) - 1 : 0;
          run = random() < 0.12;
        }
        // Semantic keyboard-equivalent input, not a combat-state shortcut.
        s.inp.held = { left: x < 0, right: x > 0, up: y < 0, down: y > 0, run };
        remember(['axes', x, y, run]);
      }
      if (random() < 0.055) press('attack');
      if (random() < 0.012) press('jump');
      if (random() < 0.004) press('special');
      if (random() < 0.0008) press('pause');
      if (s.paused && random() < 0.04) press(random() < 0.5 ? 'start' : 'pause');
      const dt = intervals[frame % intervals.length], wasPaused = s.paused;
      const pauseSnapshot = () => JSON.stringify({ time: s.time.now, r: [r.x, r.y, r.z, r.hp, r.state, r.st, r.lives],
        enemies: s.enemies.map(e => [e.id, e.x, e.y, e.z, e.hp, e.state, e.st]), resources: h.resources() });
      const frozen = wasPaused ? pauseSnapshot() : null;
      h.step(dt);
      if (wasPaused) { equal(pauseSnapshot(), frozen, 'Paused combat and scene timers stay frozen'); continue; }
      activeSeconds += dt;

      check([r.x, r.y, r.z, r.hp, r.saidin, r.lives, s.camX].every(Number.isFinite), 'Finite player state');
      check(r.hp >= 0 && r.hp <= r.maxHp && r.saidin >= 0 && r.saidin <= 100 && r.lives >= 0, 'Player counters remain valid');
      equal(r.alive, r.hp > 0, 'Player life flag agrees with HP');
      if (s.gameOver) equal(r.lives, 0, 'Game-over follows the last life');
      if (r.held?.alive) {
        check(holdStates.has(r.state), 'Live held enemy requires a holding player state');
        equal(r.held.heldBy, r, 'Player held reference is reciprocal');
        equal(r.held.state, 'held', 'Player held reference names a held enemy');
        check(!r.held.entering, 'Entering enemies cannot become held');
      }
      // A lethal knee may leave Riley's reference until its next combat update;
      // the dead enemy must already have detached its heldBy reference.
      if (r.held && !r.held.alive) equal(r.held.heldBy, null, 'A dead held target releases ownership');
      for (const e of s.enemies) {
        check([e.x, e.y, e.z, e.hp].every(Number.isFinite), `Finite enemy ${e.id}`);
        equal(e.alive, e.hp > 0, `Enemy ${e.id} life flag agrees with HP`);
        if (e.state === 'held') {
          equal(e.heldBy, r, `Held enemy ${e.id} has a holder`);
          equal(r.held, e, `Held enemy ${e.id} is owned reciprocally`);
        }
        if (e.heldBy) equal(e.state, 'held', `Enemy ${e.id} has no stale holder outside held state`);
        if (!e.alive) {
          check(deadStates.has(e.state), `Dead enemy ${e.id} cannot return to combat`);
          if (!deadSince.has(e.id)) deadSince.set(e.id, activeSeconds);
          check(activeSeconds - deadSince.get(e.id) < 30, `Dead enemy ${e.id} cannot persist indefinitely`);
        }
      }
      for (; observedDeaths < h.observations.deaths.length; observedDeaths++) {
        const { id } = h.observations.deaths[observedDeaths];
        check(!deaths.has(id), `Enemy ${id} death is emitted only once`); deaths.add(id);
      }
    }
    check(h.observations.spawns.length > 0, 'Inputs reached real combat');
    check(deaths.size > 0, 'Inputs exercised production enemy deaths');
  } finally { h.destroy(); }
}));
