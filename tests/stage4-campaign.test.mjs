import test from 'node:test';
import assert from 'node:assert/strict';
import { stage4Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage4-harness.mjs';

const NEED = ['tendrils', 'meleeRecoils', 'lightRecoils', 'towers', 'zoneWall', 'swoops', 'swoopCounters', 'croons', 'croonCancels', 'kisses', 'kissEscapes', 'walls', 'fogSwoops', 'rubble', 'chants', 'ribbon', 'glimpses', 'hints', 'summons'];

function checkFrame(h, previousBounds) {
  const s = h.s, r = s.riley;
  assert.ok([r.x, r.y, r.z, r.hp].every(Number.isFinite));
  assert.ok(r.y >= 572 && r.y <= 690 && r.z >= 0);
  assert.ok(s.attackTokens() <= s.maxTokens);
  const chase = s.kit.fog.tendrils.filter(t => t.phase === 'chase' || t.phase === 'tell' || t.phase === 'retract');
  assert.ok(chase.length <= (s.zoneI === 0 ? 1 : 2), `tendrils ${chase.length}`);
  assert.ok(s.kit.towers.towers.filter(t => t.phase === 'tell' && !t.harmless).length <= 1);
  assert.ok((s.fogBolts || []).filter(b => b.alive !== false).length <= 2);
  if (s.kit.arena?.active) assert.ok(s.kit.arena.width >= 640, `walls ${s.kit.arena.width}`);
  const holders = s.enemies.filter(e => e.state === 'kiss_hold' || e.state === 'holding');
  assert.ok(holders.length <= 1);
  if (r.state === 'grabbed') assert.equal(r.grabbedBy, holders[0]);
  for (const e of s.enemies) {
    assert.ok([e.x, e.y, e.z, e.hp].every(Number.isFinite), e.type);
    assert.ok(e.z >= 0);
    if (e.type !== 'draghkar') assert.ok(e.y >= 572 && e.y <= 690);
    const margin = e.type === 'draghkar' ? 400 : e.entering ? 260 : e.state === 'flee' ? 1e9 : 80;
    assert.ok(e.x >= previousBounds.l - margin && e.x <= previousBounds.r + margin, `${e.type} ${e.state} ${e.x}`);
  }
  assert.ok(h.resources().lights <= 10);
}

for (const seed of FULL_STAGE_SEEDS) {
  test(`Stage 4 campaign bot clears Shadar Logoth, seed ${seed}`, () => withSeed(seed, () => {
    const h = stage4Simulation({ mode: '1' }), s = h.s;
    try {
      assert.equal(s.stageNo, 4);
      assert.equal(s.god, false);
      for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) {
        const previousBounds = { ...s.bounds };
        h.step();
        checkFrame(h, previousBounds);
      }
      const result = JSON.stringify({ ended: s.ended, gameOver: s.gameOver, lives: s.riley.lives, stats: s.kit.stats });
      assert.equal(s.gameOver, false, result);
      assert.equal(s.ended, true, result);
      assert.ok(s.riley.lives > 0, result);
      for (const key of NEED) assert.ok(s.kit.stats[key] >= 1, `${key} ${result}`);
      for (let frame = 0; frame < 60 * 15; frame++) h.step();
      assert.ok(h.resources().lights <= 10);
      s.inp.press('attack');
      assert.deepEqual(h.observations.restartData, [{ stage: 1 }]);
    } finally { h.destroy(); }
  }));
}
