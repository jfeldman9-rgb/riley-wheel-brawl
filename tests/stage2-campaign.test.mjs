// Stage 2 (Baerlon) full-stage deterministic combat-logic integration with the campaign bot across the same seeds as
// Stage 1: production Stage1 in Stage 2 mode, Whitecloaks, Byar, the Stage2Kit hazards (arrows, lobbed arrows,
// volleys, torches, stable beams), the story beat, ribbon and drops. Logic only, not rendering or device evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage1-simulation.mjs';
const { STAGE2 } = await import('../src/stages.js');

const expectedWaves = STAGE2.zones.flatMap((z, i) => z.boss ? [] : z.waves.map((w, j) => `${i}:${j}`));
const expectedSpawns = STAGE2.zones.flatMap((z, i) => z.boss ? [['byar', 'R', i, -1]] : z.waves.flatMap((w, j) => w.map(([type, side]) => [type, side, i, j])));

function checkFrame(h, previousBounds) {
  const s = h.s, r = s.riley;
  assert.ok([r.x, r.y, r.z, r.hp, s.camX, s.bounds.l, s.bounds.r].every(Number.isFinite), 'Finite player/camera state');
  assert.ok(s.bounds.l <= s.bounds.r && s.bounds.l >= 0 && s.bounds.r <= 5200, 'Camera remains in the world');
  assert.ok(r.x >= s.bounds.l && r.x <= s.bounds.r, `Player stays onscreen: ${JSON.stringify(h.summary())}`);
  assert.ok(r.y >= 572 && r.y <= 690 && r.z >= 0, 'Player remains in the ground lane with nonnegative height');
  assert.ok(s.attackTokens() <= s.maxTokens, 'No special attack bypasses the token cap');
  for (const e of s.enemies) {
    assert.ok([e.x, e.y, e.z, e.hp].every(Number.isFinite), `Finite ${e.type} state`);
    assert.ok(e.y >= 572 && e.y <= 690 && e.z >= 0, 'Enemy lane/height are valid');
    // fleeing Whitecloaks and the retreating boss walk off the street on purpose; everyone else stays bounded
    const margin = e.entering ? 260 : ['flee', 'fleeGetup', 'retreat'].includes(e.state) ? 1e9 : 0;
    assert.ok(e.x >= previousBounds.l - margin && e.x <= previousBounds.r + margin, `Enemy stays bounded: ${JSON.stringify({ type: e.type, x: e.x, state: e.state, previousBounds })}`);
  }
  const k = s.kit; assert.ok(k.arrows.length <= 4 && k.skyArrows.length <= 2 && k.torches.length <= 2 && k.beams.length <= 5, 'hazards stay bounded');
}

for (const seed of FULL_STAGE_SEEDS) {
  test(`Stage 2 campaign bot clears Baerlon, seed ${seed}`, () => withSeed(seed, () => {
    const h = stage1Simulation({ mode: '1', stage: 2 }), s = h.s;
    try {
      assert.equal(s.stageNo, 2); assert.equal(s.riley.hp, 100); assert.equal(s.riley.lives, 3); assert.equal(s.zoneI, -1); assert.equal(s.god, false);
      const phases = new Set(), states = new Set();
      for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) {
        const previousBounds = { ...s.bounds }; h.step(); checkFrame(h, previousBounds);
        if (s.boss) { phases.add(s.boss.phase); states.add(s.boss.state); }
      }
      const result = JSON.stringify({ ...h.summary(), kit: s.kit.stats });
      assert.equal(s.gameOver, false, result); assert.equal(s.ended, true, result); assert.ok(s.riley.lives > 0, result);
      assert.equal(s.storyResult, 'end', 'the story beat played through');
      assert.deepEqual(h.observations.zones, [0, 1, 2, 3]); assert.deepEqual(h.observations.waves, expectedWaves);
      assert.deepEqual(h.observations.spawns.slice(0, expectedSpawns.length).map(({ type, side, zone, wave }) => [type, side, zone, wave]), expectedSpawns);
      // all three boss phases, each with its signature move, and the kid-safe ending
      const b = s.boss; assert.deepEqual([...phases].sort(), [1, 2, 3], result);
      assert.ok(b.parries >= 1, result); assert.ok(b.volleys >= 1 && s.kit.stats.volleys === b.volleys, result); assert.ok(s.kit.barn, 'barn fire lit in phase 3');
      assert.ok(states.has('defeated') && states.has('retreat') && !states.has('dead'), [...states].join());
      // the stage's story moments each happen exactly once
      assert.equal(s.kit.stats.ribbon, 1, 'ribbon collected'); assert.equal(s.kit.stats.mudJoke, 1, 'one mud joke'); assert.ok(s.kit.collapsed, 'the stable came down');
      assert.ok(s.kit.stats.blocks >= 1 && s.kit.stats.arrows >= 1, result);
      assert.equal(h.observations.hud.filter(e => e.method === 'flashText' && /TWIX/.test(e.args[0])).length, 0, 'the Twix joke stays in Stage 1');
      assert.ok(h.observations.peak.liveEnemies <= 4, 'Wave populations stay bounded');
      for (const spawn of h.observations.spawns) assert.ok(h.observations.entries.get(spawn.id).end !== null, `${spawn.type} entered`);

      // effects settle after the clear
      for (let frame = 0; frame < 60 * 15; frame++) h.step();
      assert.equal(s.enemies.length, 0); assert.equal(s.fireballs.length, 0); assert.equal(s.patches.length, 0); assert.equal(s.fx.booms.length, 0);
      const t = s.kit.threats(); assert.deepEqual([t.arrows.length, t.sky.length, t.torches.length, t.beams.length, !!t.volley], [0, 0, 0, 0, false]);
      assert.equal(h.observations.deaths.length, h.observations.spawns.length);
      assert.equal(new Set(h.observations.deaths.map(e => e.id)).size, h.observations.deaths.length, 'Each enemy is beaten exactly once');
      const resources = h.resources();
      assert.equal(resources.timers, 0); assert.equal(resources.tweens, 0);
      assert.equal(resources.lights, h.baseline.lights + s.pickups.length + s.kit.barn.lights.length, 'only lanterns, the burning barn and uncollected pickups stay lit');
      assert.equal(h.observations.hud.filter(e => e.method === 'stageClear').length, 1);
      assert.equal(s.clearShown, true); s.inp.press('attack'); assert.deepEqual(h.observations.restartData, [{ stage: 1 }]);
    } finally { h.destroy(); }
  }));
}
