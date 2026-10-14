import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage7-harness.mjs';

function checkFrame(h) {
  const s = h.s, r = s.riley, k = s.kit;
  assert.ok([r.x, r.y, r.z, r.hp].every(Number.isFinite));
  assert.ok(r.y >= 572 && r.y <= 690);
  assert.ok(s.attackTokens() <= (s.maxTokens || 2), 'attack tokens stay capped');
  const th = k.threats?.() || {};
  assert.ok(!th.ring || typeof th.ring === 'object');
  assert.ok(h.resources().lights <= 10, 'lights stay in budget');
  if (s.boss?.alive) {
    if (s.boss.phase === 1) assert.ok(s.boss.hp > Math.floor(s.boss.maxHp * 0.66) - 40, 'phase 1 above its gate');
    if (s.boss.phase === 2) assert.ok(s.boss.hp > Math.floor(s.boss.maxHp * 0.33) - 40, 'phase 2 above its gate');
  }
}

function run(seed, call, lag) {
  const h = stage7Simulation({ call, lag });
  const s = h.s;
  try {
    for (let frame = 0; frame < 60 * 420 && !s.ended && !s.gameOver; frame++) {
      h.step();
      if (frame % 10 === 0) checkFrame(h);
    }
    const bossT = s.kit?.bossTime || 0;
    const calls = s.kit?.call7?.calls || 0;
    assert.equal(s.gameOver, false, JSON.stringify({ seed, call, bossT, calls, hp: s.riley.hp }));
    assert.equal(s.ended, true, JSON.stringify({ seed, call, bossT, calls, t: s.time.now }));
    assert.ok((s.kit?.stats?.yields || 0) > 0, 'Shaido yielded during the run');
    for (let frame = 0; frame < 60 * 15; frame++) h.step();
    s.inp.press('attack');
    h.step();
    assert.deepEqual(h.observations.restartData, [{ stage: 1 }], 'Stage 7 loops to Stage 1 until Stage 8 exists');
    return { bossT, calls };
  } finally { h.destroy(); }
}

test('Stage 7 campaign clears 9 seeds with and without the call-in; aggregate boss time keeps 70-102 percent', () => {
  withSeed(1, () => { const h = stage7Simulation({ call: false }); h.destroy(); });
  const base = [];
  for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => base.push(run(seed, false)));
  const on = [];
  FULL_STAGE_SEEDS.forEach((seed, i) => withSeed(seed, () => {
    const row = run(seed, true);
    on.push(row);
    assert.equal(base[i].calls, 0, seed);
    assert.ok(row.calls >= 1 && row.calls <= 3, `${seed} calls ${row.calls}`);
    console.log(JSON.stringify({ seed, off: +base[i].bossT.toFixed(1), on: +row.bossT.toFixed(1), ratio: +(row.bossT / base[i].bossT).toFixed(3), calls: row.calls }));
  }));
  const offTotal = base.reduce((n, r) => n + r.bossT, 0);
  const onTotal = on.reduce((n, r) => n + r.bossT, 0);
  const ratio = onTotal / offTotal;
  assert.ok(ratio >= 0.7 && ratio <= 1.02, `aggregate boss time ${onTotal.toFixed(1)} / ${offTotal.toFixed(1)} = ${ratio.toFixed(3)}`);
  const slow = [];
  for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => {
    try { run(seed, false, 0.25); }
    catch (err) { slow.push(seed + ' ' + (err && err.message)); }
  });
  console.log(JSON.stringify({ lag250: FULL_STAGE_SEEDS.length - slow.length, of: FULL_STAGE_SEEDS.length, fail: slow }));
  assert.ok(FULL_STAGE_SEEDS.length - slow.length >= 8, slow.join('\n'));
});
