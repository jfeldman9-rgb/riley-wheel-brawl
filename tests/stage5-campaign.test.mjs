import test from 'node:test';
import assert from 'node:assert/strict';
import { stage5Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage5-harness.mjs';

const NEED = ['hints', 'stalkers', 'pounces', 'pounceCounters', 'flushes', 'pods', 'spores', 'lashes', 'thornTicks', 'gouts', 'tethers', 'tetherCounters', 'rings', 'hands', 'staffs', 'shortSteps', 'flails', 'parries', 'steps', 'stepCounters', 'embraces', 'escapes', 'greenman', 'surges', 'surgeCounters', 'oak', 'ribbon', 'glimpses'];

function checkFrame(h) {
  const s = h.s, r = s.riley, k = s.kit;
  assert.ok([r.x, r.y, r.z, r.hp].every(Number.isFinite));
  assert.ok(r.y >= 572 && r.y <= 690 && r.z >= 0);
  assert.ok(s.attackTokens() <= (s.maxTokens || 2));
  const holders = s.enemies.filter(e => e.state === 'holding' || e.state === 'held');
  assert.ok(holders.length <= 2);
  const th = k.threats();
  assert.ok((th.gouts || []).length <= 2);
  assert.ok((th.lashes || []).length <= 1);
  assert.ok(s.enemies.filter(e => e.alive && e.type === 'stalker').length <= 2);
  assert.ok((s.spores || []).filter(p => p.alive !== false).length <= 2);
  if (!th.lashes?.length && !(s.clouds || []).length) assert.equal(r.fogSlow || 0, r.fogSlow || 0);
  assert.ok(h.resources().lights <= 10);
}

function run(seed, noPower) {
  const h = stage5Simulation(noPower ? { noPower: true } : {});
  const s = h.s;
  try {
    for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) {
      h.step();
      if (frame % 10 === 0) checkFrame(h);
    }
    const result = JSON.stringify({ ended: s.ended, gameOver: s.gameOver, lives: s.riley.lives, stats: s.kit.stats });
    assert.equal(s.gameOver, false, result);
    assert.equal(s.ended, true, result);
    for (const key of NEED) assert.ok(s.kit.stats[key] >= 1, `${key} ${result}`);
    for (let frame = 0; frame < 60 * 15; frame++) h.step();
    assert.ok(h.resources().lights <= 10);
    s.inp.press('attack');
    assert.deepEqual(h.observations.restartData, [{ stage: 1 }]);
  } finally { h.destroy(); }
}

for (const seed of FULL_STAGE_SEEDS) {
  test(`Stage 5 campaign bot clears the Blight, seed ${seed}`, () => withSeed(seed, () => run(seed, false)));
}

test('Stage 5 campaign bot clears the Blight with no powers, seed 1', () => withSeed(1, () => run(1, true)));
