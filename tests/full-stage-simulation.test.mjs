// Full-stage deterministic combat-logic integration, not rendered playability,
// natural human difficulty, loading, GPU-memory or physical-device FPS evidence.
// Production Stage1.create/update/camera, Riley, enemies, Bot, Input and FX run
// from normal starting state. See helper for explicit renderer/audio/clock stubs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed, FULL_STAGE_SEEDS, FULL_STAGE_MODES } from './helpers/stage1-simulation.mjs';

const expectedWaves = ['0:0', '0:1', '1:0', '1:1', '2:0', '2:1'];
const expectedSpawns = [
  ['grunt', 'R', 0, 0], ['grunt', 'R', 0, 0], ['grunt', 'L', 0, 1], ['spear', 'R', 0, 1],
  ['spear', 'R', 1, 0], ['grunt', 'R', 1, 0], ['hound', 'L', 1, 1], ['grunt', 'R', 1, 1], ['grunt', 'R', 1, 1],
  ['hound', 'R', 2, 0], ['hound', 'L', 2, 0], ['spear', 'R', 2, 1], ['grunt', 'L', 2, 1], ['hound', 'R', 2, 1],
  ['chief', 'R', 3, -1],
];

function checkFrame(h, previousBounds) {
  const s = h.s, r = s.riley;
  assert.ok([r.x, r.y, r.z, r.hp, s.camX, s.bounds.l, s.bounds.r].every(Number.isFinite), 'Finite player/camera state');
  assert.ok(s.bounds.l <= s.bounds.r && s.bounds.l >= 0 && s.bounds.r <= 5200, 'Camera remains in the world');
  assert.ok(r.x >= s.bounds.l && r.x <= s.bounds.r, `Player stays onscreen: ${JSON.stringify(h.summary())}`);
  assert.ok(r.y >= 572 && r.y <= 690 && r.z >= 0, 'Player remains in the ground lane with nonnegative height');
  assert.ok(s.attackTokens() <= s.maxTokens, 'No special attack bypasses the token cap');
  if (r.held) assert.equal(r.held.entering, false, 'No invulnerable entering actor can become the held target');
  for (const e of s.enemies) {
    assert.ok([e.x, e.y, e.z, e.hp].every(Number.isFinite), `Finite ${e.type} state`);
    assert.ok(e.y >= 572 && e.y <= 690 && e.z >= 0, 'Enemy lane/height are valid');
    // Physics uses the frame's prior bounds; updateCamera may then lock a new
    // zone while old corpses fade. Entering actors have an intentional margin.
    const margin = e.entering ? 260 : 0;
    assert.ok(e.x >= previousBounds.l - margin && e.x <= previousBounds.r + margin,
      `Enemy stays bounded: ${JSON.stringify({ type: e.type, x: e.x, state: e.state, entering: e.entering, previousBounds })}`);
  }
}

for (const mode of FULL_STAGE_MODES) for (const seed of FULL_STAGE_SEEDS) {
  test(`full stage clears all waves using ${mode === '1' ? 'normal demo' : 'boss-coverage'} inputs, seed ${seed}`, () => withSeed(seed, () => {
    const h = stage1Simulation({ mode }), s = h.s;
    try {
      assert.equal(s.riley.hp, 100); assert.equal(s.riley.lives, 3); assert.equal(s.riley.saidin, 100);
      assert.equal(s.riley.x, 180); assert.equal(s.zoneI, -1); assert.equal(s.enemies.length, 0); assert.equal(s.god, false);
      // A hang-detection deadline is independent of the unchanged device gates.
      // No HP, phase, cooldown, positions, inventory or life writes occur here.
      for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) {
        const previousBounds = { ...s.bounds }; h.step(); checkFrame(h, previousBounds);
      }
      const result = JSON.stringify(h.summary());
      assert.equal(s.gameOver, false, result); assert.equal(s.ended, true, result);
      assert.equal(s.boss.alive, false, result); assert.ok(s.riley.lives > 0, result);
      assert.deepEqual(h.observations.zones, [0, 1, 2, 3]); assert.deepEqual(h.observations.waves, expectedWaves);
      assert.deepEqual(h.observations.spawns.slice(0, 15).map(({ type, side, zone, wave }) => [type, side, zone, wave]), expectedSpawns);
      for (const spawn of h.observations.spawns.slice(0, 15)) {
        const entry = h.observations.entries.get(spawn.id);
        assert.ok(entry.end !== null, `${spawn.type} in zone ${spawn.zone} actually entered`);
        assert.ok(entry.end - entry.start < 60000, 'Entry cannot remain stalled indefinitely');
      }
      assert.ok(h.observations.peak.liveEnemies <= 3, 'Wave/summon populations stay bounded');
      assert.ok(h.observations.peak.enemies <= 6, 'Expired corpses do not accumulate between waves');
      if (mode === 'boss-coverage') assert.equal(s.bot.coverage.complete, true, result);

      // Let transient effects finish naturally after clear. Verify logical
      // ownership/destruction only, never infer GPU allocation or device safety.
      for (let frame = 0; frame < 60 * 15; frame++) h.step();
      assert.equal(s.enemies.length, 0); assert.equal(s.fireballs.length, 0); assert.equal(s.carts.length, 0);
      assert.equal(s.patches.length, 0); assert.equal(s.fx.booms.length, 0);
      assert.equal(h.observations.deaths.length, h.observations.spawns.length);
      assert.equal(new Set(h.observations.deaths.map(e => e.id)).size, h.observations.deaths.length, 'Each enemy dies exactly once');
      const resources = h.resources(), broken = s.barrels.filter(b => b.broken).length;
      assert.equal(resources.timers, 0); assert.equal(resources.tweens, 0);
      assert.equal(resources.lights, h.baseline.lights + s.pickups.length, 'Only known uncollected-pickup lights remain');
      assert.equal(resources.visuals, h.baseline.visuals - 2 * broken + 2 * s.pickups.length, 'Only static scene, Riley and remaining pickups/barrels own visuals');
      assert.equal(h.observations.hud.filter(e => e.method === 'stageClear').length, 1);
      assert.equal(h.observations.hud.filter(e => e.method === 'gameOver').length, 0);
      assert.equal(s.clearShown, true); s.inp.press('attack'); assert.equal(h.observations.restarts, 1);
    } finally { h.destroy(); }
  }));
}

for (const [name, intervals] of [['30 Hz', [1 / 30]], ['20 Hz', [1 / 20]], ['jittered', [1 / 60, 1 / 45, 1 / 30, 1 / 24]]]) {
  for (const mode of FULL_STAGE_MODES) test(`synthetic ${name} update intervals retain full-stage progression (${mode})`, () => withSeed(1, () => {
    const h = stage1Simulation({ mode }), s = h.s;
    try {
      let frame = 0;
      while (!s.ended && !s.gameOver && s.time.now < 600000) {
        const previousBounds = { ...s.bounds };
        h.step(intervals[frame++ % intervals.length]); checkFrame(h, previousBounds);
      }
      const result = JSON.stringify(h.summary());
      assert.equal(s.gameOver, false, result); assert.equal(s.ended, true, result);
      assert.deepEqual(h.observations.waves, expectedWaves);
      if (mode === 'boss-coverage') assert.equal(s.bot.coverage.complete, true, result);
    } finally { h.destroy(); }
  }));
}

test('natural death, pause, respawn and game-over continue all preserve the full-stage run', () => withSeed(7, () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  try {
    // Real movement inputs enter the first fight; standing still lets ordinary
    // enemy attacks deplete normal health/lives without writing either counter.
    s.inp.held.right = true;
    for (let frame = 0; frame < 30; frame++) h.step();
    s.inp.held.right = false;
    for (let frame = 0; frame < 60 * 120 && s.riley.alive; frame++) h.step();
    assert.equal(s.riley.alive, false); assert.equal(s.riley.lives, 2); assert.equal(s.gameOver, false);
    s.inp.press('pause');
    const snapshot = JSON.stringify({ time: s.time.now, x: s.riley.x, hp: s.riley.hp, lives: s.riley.lives, resources: h.resources() });
    for (let frame = 0; frame < 60 * 10; frame++) h.step();
    assert.equal(JSON.stringify({ time: s.time.now, x: s.riley.x, hp: s.riley.hp, lives: s.riley.lives, resources: h.resources() }), snapshot);
    assert.equal(s.riley.alive, false, 'Paused scene timers cannot respawn the player');
    s.inp.press('pause');
    for (let frame = 0; frame < 60 * 3 && !s.riley.alive; frame++) h.step();
    assert.equal(s.riley.alive, true); assert.equal(s.riley.hp, 100); assert.equal(s.riley.lives, 2);
    for (let frame = 0; frame < 60 * 180 && !s.gameOver; frame++) h.step();
    assert.equal(s.gameOver, true); assert.equal(s.riley.lives, 0); assert.equal(s.ended, false);
    const spawnCount = h.observations.spawns.length;
    s.inp.press('start');
    assert.equal(s.gameOver, false); assert.equal(s.riley.alive, true); assert.equal(s.riley.lives, 3);
    assert.equal(h.observations.spawns.length, spawnCount, 'Continue keeps the current wave');
    h.setController('1');
    for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) h.step();
    assert.equal(s.ended, true, JSON.stringify(h.summary())); assert.equal(s.gameOver, false);
    assert.deepEqual(h.observations.waves, expectedWaves);
    assert.equal(h.observations.hud.filter(e => e.method === 'gameOver').length, 1);
    assert.equal(h.observations.hud.filter(e => e.method === 'stageClear').length, 1);
  } finally { h.destroy(); }
}));

test('pausing the committed victory freezes its timers and resumes to one clear card', () => withSeed(1, () => {
  const h = stage1Simulation({ mode: 'boss-coverage' }), s = h.s;
  try {
    for (let frame = 0; frame < 60 * 600 && !s.victoryPending && !s.gameOver; frame++) h.step();
    assert.equal(s.victoryPending, true); assert.equal(s.ended, false);
    s.inp.press('start'); assert.equal(s.paused, true);
    const now = s.time.now;
    for (let frame = 0; frame < 60 * 20; frame++) h.step();
    assert.equal(s.time.now, now); assert.equal(s.ended, false);
    s.inp.press('start');
    for (let frame = 0; frame < 60 * 9; frame++) h.step();
    assert.equal(s.ended, true); assert.equal(s.clearShown, true); assert.equal(s.gameOver, false);
    assert.equal(h.observations.hud.filter(e => e.method === 'stageClear').length, 1);
  } finally { h.destroy(); }
}));

test('clear replay recreates normal state and completes a second full run without stale inputs or actors', () => withSeed(2, () => {
  const h = stage1Simulation({ mode: '1' }), s = h.s;
  try {
    for (let frame = 0; frame < 60 * 600 && !s.clearShown && !s.gameOver; frame++) h.step();
    assert.equal(s.clearShown, true, JSON.stringify(h.summary()));
    const oldRiley = s.riley, oldBot = s.bot, firstRun = s.runId;
    s.inp.press('attack'); h.step();
    assert.equal(s.runId, firstRun + 1); assert.notEqual(s.riley, oldRiley); assert.notEqual(s.bot, oldBot);
    assert.equal(oldRiley.sprite.dead, true, 'Explicit display-list shutdown stub destroys old scene visuals');
    assert.equal(s.inp.listeners.press.length, 1); assert.equal(s.inp.listeners.key.length, 1);
    assert.equal(s.inp.peek('attack'), false); assert.equal(s.started, false);
    assert.equal(s.riley.hp, 100); assert.equal(s.riley.lives, 3); assert.equal(s.riley.saidin, 100);
    assert.equal(s.riley.score, 0); assert.equal(s.riley.maxCombo, 0); assert.equal(s.riley.x, 180);
    assert.equal(s.zoneI, -1); assert.equal(s.boss, null); assert.equal(s.enemies.length, 0);
    assert.equal(s.ended, false); assert.equal(s.victoryPending, false); assert.equal(s.gameOver, false);
    assert.equal(s.barrels.length, 4); assert.ok(s.barrels.every(b => !b.broken));
    assert.equal(h.resources().lights, h.baseline.lights); assert.equal(h.resources().visuals, h.baseline.visuals);
    s.inp.press('start');
    for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) h.step();
    assert.equal(s.ended, true, JSON.stringify(h.summary())); assert.equal(s.gameOver, false);
    assert.deepEqual(h.observations.spawns.filter(e => e.run === s.runId).slice(0, 15).map(({ type, side, zone, wave }) => [type, side, zone, wave]), expectedSpawns);
    assert.equal(h.observations.hud.filter(e => e.method === 'stageClear').length, 2);
    assert.equal(h.observations.hud.filter(e => e.method === 'gameOver').length, 0);
  } finally { h.destroy(); }
}));
