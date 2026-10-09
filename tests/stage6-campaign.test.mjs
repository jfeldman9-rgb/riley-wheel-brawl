import test from 'node:test';
import assert from 'node:assert/strict';
import { stage6Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage6-harness.mjs';

function checkFrame(h) {
  const s = h.s, r = s.riley, k = s.kit;
  assert.ok([r.x, r.y, r.z, r.hp].every(Number.isFinite));
  assert.ok(r.y >= 572 && r.y <= 690);
  assert.ok(s.attackTokens() <= (s.maxTokens || 2));
  const holders = s.enemies.filter(e => e.state === 'holding' || e.state === 'held');
  assert.ok(holders.length <= 1);
  assert.ok(s.enemies.filter(e => e.alive && e.type === 'grayman').length <= 1);
  const th = k.threats?.() || {};
  assert.ok((th.nets || []).length <= 1);
  assert.ok((th.lamps || []).length <= 1);
  assert.ok((th.lines || []).length <= (s.boss?.phase >= 3 ? 2 : 1));
  if ((th.rays || []).length) assert.equal(th.rays.length, 2);
  assert.ok(h.resources().lights <= 10);
}

function run(seed, rand, lag) {
  const h = stage6Simulation({ rand, lag });
  const s = h.s;
  try {
    for (let frame = 0; frame < 60 * 420 && !s.ended && !s.gameOver; frame++) {
      h.step();
      if (frame % 10 === 0) checkFrame(h);
    }
    const bossT = s.kit?.bossTime || 0;
    const calls = s.kit?.rand?.calls || 0;
    assert.equal(s.gameOver, false, JSON.stringify({ seed, rand, bossT, calls, hp: s.riley.hp }));
    assert.equal(s.ended, true, JSON.stringify({ seed, rand, bossT, calls, t: s.time.now }));
    for (let frame = 0; frame < 60 * 15; frame++) h.step();
    s.inp.press('attack');
    h.step();
    assert.deepEqual(h.observations.restartData, [{ stage: 1 }]);
    return { bossT, calls };
  } finally { h.destroy(); }
}

test('Stage 6 campaign clears 9 seeds with and without Rand, and Rand keeps 70 percent of the boss time', () => {
  withSeed(1, () => { const h = stage6Simulation({ rand: false }); h.destroy(); });
  const base = [];
  for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => base.push(run(seed, false)));
  FULL_STAGE_SEEDS.forEach((seed, i) => withSeed(seed, () => {
    const row = run(seed, true);
    assert.equal(base[i].calls, 0, seed);
    assert.ok(row.calls >= 1 && row.calls <= 3, `${seed} calls ${row.calls}`);
    const ratio = row.bossT / base[i].bossT;
    assert.ok(ratio >= 0.7 && ratio <= 1.02, `seed ${seed} boss ${row.bossT.toFixed(1)} / ${base[i].bossT.toFixed(1)} = ${ratio.toFixed(3)}`);
  }));
  const slow = [];
  for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => {
    try { run(seed, false, 0.25); }
    catch (err) { slow.push(seed + ' ' + (err && err.message)); }
  });
  assert.ok(FULL_STAGE_SEEDS.length - slow.length >= 8, slow.join('\n'));
});
