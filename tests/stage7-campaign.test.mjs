import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage7-harness.mjs';

function checkFrame(h) {
  const s = h.s, r = s.riley;
  assert.ok([r.x, r.y, r.z, r.hp].every(Number.isFinite));
  assert.ok(r.y >= 572 && r.y <= 690);
  assert.ok(s.attackTokens() <= (s.maxTokens || 2));
  assert.ok(h.resources().lights <= 10);
}

function run(seed, call7, lag) {
  const h = stage7Simulation({ call7, lag });
  const s = h.s;
  try {
    for (let frame = 0; frame < 60 * 540 && !s.ended && !s.gameOver; frame++) {
      h.step();
      if (frame % 30 === 0) checkFrame(h);
    }
    const bossT = s.kit?.bossTime || 0;
    const calls = s.kit?.call?.calls || 0;
    const z1 = s.kit?.z1Deaths || 0, gust = s.kit?.gustDeaths || 0;
    assert.equal(s.gameOver, false, JSON.stringify({ seed, call7, bossT, calls, hp: s.riley.hp, zone: s.zoneI }));
    assert.equal(s.ended, true, JSON.stringify({ seed, call7, bossT, calls, t: s.time.now, zone: s.zoneI, hp: s.riley.hp }));
    if (z1 > 0) assert.ok(gust / z1 <= 0.3, `gust deaths ${gust}/${z1}`);
    for (let frame = 0; frame < 60 * 15; frame++) h.step();
    s.inp.press('attack');
    h.step();
    assert.deepEqual(h.observations.restartData, [{ stage: 1 }]);
    const tells = (s.kit?.hurtLog || []).filter(e => e && e.tell < 0.5);
    assert.deepEqual(tells, []);
    return { bossT, calls };
  } finally { h.destroy(); }
}

test('Stage 7 campaign clears 9 seeds, and calls stay inside 70 to 102 percent of boss time', () => {
  const base = [];
  for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => base.push(run(seed, false)));
  FULL_STAGE_SEEDS.forEach((seed, i) => withSeed(seed, () => {
    const row = run(seed, true);
    assert.equal(base[i].calls, 0, seed);
    assert.ok(row.calls >= 1 && row.calls <= 3, `${seed} calls ${row.calls}`);
    const ratio = row.bossT / base[i].bossT;
    assert.ok(ratio >= 0.7 && ratio <= 1.02, `seed ${seed} boss ${row.bossT.toFixed(1)} / ${base[i].bossT.toFixed(1)} = ${ratio.toFixed(3)}`);
    console.log(JSON.stringify({ seed, off: +base[i].bossT.toFixed(1), on: +row.bossT.toFixed(1), ratio: +ratio.toFixed(3), calls: row.calls }));
  }));
  const slow = [];
  for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => {
    try { run(seed, false, 0.25); }
    catch (err) { slow.push(seed + ' ' + (err && err.message)); }
  });
  console.log(JSON.stringify({ lag250: FULL_STAGE_SEEDS.length - slow.length, of: FULL_STAGE_SEEDS.length, fail: slow }));
  assert.ok(FULL_STAGE_SEEDS.length - slow.length >= 8, slow.join('\n'));
});
