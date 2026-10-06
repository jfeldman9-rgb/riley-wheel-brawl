// Stage 3 (Caemlyn) full-stage deterministic combat-logic integration with the campaign bot across the same seeds as
// Stage 1 and 2: production Stage1 in Stage 3 mode, Darkfriends, the Myrddraal, Stage3Hazards (roof tiles, shadow pools,
// copy wisps, bursts), the story beat, ribbon and drops. Logic only, not rendering or device evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed, FULL_STAGE_SEEDS } from './helpers/stage3-harness.mjs';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { Bot } from '../src/bot.js';
const { STAGE3 } = await import('../src/stages.js');
const { Myrddraal } = await import('../src/myrddraal.js');

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
    const margin = e.entering ? 260 : ['flee', 'fleeGetup', 'retreat'].includes(e.state) ? 1e9 : 0;
    assert.ok(e.x >= previousBounds.l - margin && e.x <= previousBounds.r + margin, `Enemy stays bounded: ${JSON.stringify({ type: e.type, x: e.x, state: e.state, previousBounds })}`);
  }
  const k = s.kit;
  assert.ok(k.tiles.length <= 1, 'tiles stay bounded');
  assert.ok(k.pools.length <= 1, 'pools stay bounded');
  assert.ok((s.boss?.copies?.length || 0) <= 2, 'copies stay bounded');
  const grabbers = s.enemies.filter(e => e.state === 'holding');
  assert.ok(grabbers.length <= 1, 'at most one grabber');
  if (grabbers.length === 1) assert.equal(r.grabbedBy, grabbers[0], 'grabbedBy is that enemy');
}

for (const seed of FULL_STAGE_SEEDS) {
  test(`Stage 3 campaign bot clears Caemlyn, seed ${seed}`, testContext => withSeed(seed, () => {
    const h = stage3Simulation({ mode: '1' }), s = h.s;
    try {
      assert.equal(s.stageNo, 3);
      assert.equal(s.riley.hp, 100);
      assert.equal(s.riley.lives, 3);
      assert.equal(s.god, false);
      const phases = new Set(), states = new Set();
      for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) {
        const previousBounds = { ...s.bounds };
        h.step();
        checkFrame(h, previousBounds);
        if (s.boss) {
          phases.add(s.boss.phase);
          states.add(s.boss.state);
        }
      }
      const result = JSON.stringify({ ...h.summary(), kit: s.kit.stats });
      testContext.diagnostic(`Stage 3 bot: ${s.kit.stats.grabs || 0} grabs, ${s.kit.stats.escapes || 0} escapes, ${s.kit.stats.tileHits || 0} tile hits, ${s.kit.stats.copiesPopped || 0} copies popped`);
      assert.equal(s.gameOver, false, result);
      assert.equal(s.ended, true, result);
      assert.ok(s.riley.lives > 0, result);
      assert.deepEqual(h.observations.zones, [0, 1, 2, 3], result);
      assert.deepEqual([...phases].sort(), [1, 2, 3], result);
      assert.ok(states.has('defeated') && !states.has('dead'), [...states].join());

      const st = s.kit.stats;
      assert.ok((st.blinks || 0) >= 1, result);
      assert.ok(((st.parries || 0) + (st.counters || 0)) >= 1, result);
      assert.ok((st.fears || 0) >= 1, result);
      assert.ok((st.dispels || 0) >= 1, result);
      assert.ok((st.splits || 0) >= 1, result);
      assert.ok((st.copiesPopped || 0) >= 1, result);
      assert.ok((st.grabs || 0) >= 1, result);
      assert.ok((st.escapes || 0) >= 1, result);
      assert.equal(st.ribbon, 1, result);
      assert.equal(st.glimpses, 1, result);

      assert.ok(h.observations.peak.liveEnemies <= 4, 'Wave populations stay bounded');
      for (const spawn of h.observations.spawns) {
        assert.ok(h.observations.entries.get(spawn.id).end !== null, `${spawn.type} entered`);
      }

      // settle 15 s
      for (let frame = 0; frame < 60 * 15; frame++) h.step();
      assert.equal(s.enemies.length, 0, result);
      const t = s.kit.threats();
      assert.deepEqual([t.tiles.length, t.drops.length, t.pools.length, t.copies.length, t.aura], [0, 0, 0, 0, false], result);
      const res15 = h.resources();
      assert.equal(res15.timers, 0, result);
      assert.equal(res15.tweens, 0, result);
      assert.ok(res15.lights <= 10, `lights ${res15.lights} <= 10`);

      // settle 5 s more
      for (let frame = 0; frame < 60 * 5; frame++) h.step();
      const res20 = h.resources();
      assert.deepEqual(res20, res15, 'resources unchanged between +15s and +20s');

      assert.equal(h.observations.hud.filter(e => e.method === 'stageClear').length, 1, result);
      s.inp.press('attack');
      assert.deepEqual(h.observations.restartData, [{ stage: 1 }], result);
    } finally {
      h.destroy();
    }
  }));
}

for (const seed of FULL_STAGE_SEEDS) {
  test(`Stage 3 grabs and tile hits stay in their target bands, seed ${seed}`, () => withSeed(seed, () => {
    const h = stage3Simulation({ mode: '1' }), s = h.s;
    try {
      for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) h.step();
      const stats = s.kit.stats;
      const detail = `seed ${seed}: grabs ${stats.grabs}, tileHits ${stats.tileHits}, lives ${s.riley.lives}, hp ${s.riley.hp}, ended ${s.ended}, gameOver ${s.gameOver}`;
      assert.equal(s.gameOver, false, detail);
      assert.equal(s.ended, true, detail);
      assert.ok(stats.grabs >= 1 && stats.grabs <= 6, detail);
      assert.ok(stats.tileHits >= 0 && stats.tileHits <= 4, detail);
    } finally {
      h.destroy();
    }
  }));
}

test('the Stage 3 bot mashes out of a hold and steps out of a marked tile band, and never runs in Stage 1 or 2', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '1' }), s = h.s;
  try {
    arena(s, 640);
    const c = placeC(s, 90);
    c.startHold(s.riley);
    for (let frame = 0; frame < 120 && s.riley.state === 'grabbed'; frame++) {
      h.step();
    }
    assert.notEqual(s.riley.state, 'grabbed', 'Riley mashes out within 2 s');
    assert.equal(s.kit.stats.escapes, 1, 'escapes stat incremented');

    // zone-2 arena and tile test
    s.zoneI = 2;
    s.zone = STAGE3.zones[2];
    s.locked = true;
    s.wave = 0;
    s.bounds = { l: STAGE3.zones[2].l, r: STAGE3.zones[2].r };
    s.camX = STAGE3.zones[2].l;
    s.riley.x = (s.bounds.l + s.bounds.r) / 2;
    s.riley.y = 630;
    s.kit.startTile();
    const tile = s.kit.tiles[0];
    let tileReached = false;
    for (let frame = 0; frame < 180; frame++) {
      h.step();
      if (tile.x !== null && ((tile.dir > 0 && tile.x >= s.riley.x) || (tile.dir < 0 && tile.x <= s.riley.x))) {
        tileReached = true;
        break;
      }
    }
    assert.ok(tileReached, 'tile reached Riley position');
    assert.ok(!tile.bands.includes(s.kit.bandOf(s.riley.y)), 'Riley band is unmarked before tile reaches Riley');

    // spy on Bot.prototype.evadeStage3 in Stage 1 and Stage 2
    let calls = 0;
    const origEvade3 = Bot.prototype.evadeStage3;
    Bot.prototype.evadeStage3 = function(...args) {
      calls++;
      return origEvade3.apply(this, args);
    };
    try {
      const h1 = stage1Simulation({ mode: '1', stage: 1 });
      try {
        for (let f = 0; f < 600; f++) h1.step();
      } finally {
        h1.destroy();
      }
      const h2 = stage1Simulation({ mode: '1', stage: 2 });
      try {
        for (let f = 0; f < 600; f++) h2.step();
      } finally {
        h2.destroy();
      }
      assert.equal(calls, 0, 'evadeStage3 called 0 times in Stage 1 and Stage 2');
    } finally {
      Bot.prototype.evadeStage3 = origEvade3;
    }
  } finally {
    h.destroy();
  }
}));

test('in phase 3 the Stage 3 bot attacks the real Myrddraal, not a shadow copy', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '1' }), s = h.s;
  try {
    arena(s, 640);
    const f = new Myrddraal(s, 780, 630);
    f.entering = false;
    f.introDone = true;
    f.hp = 100;
    f.phase = 3;
    f.cool = 9;
    f.lungeAt = 99;
    s.enemies.push(f);
    s.boss = f;
    f.makeCopies();
    f.copies[0].x = 560;
    f.copies[0].y = 630;
    f.copies[0].cool = 9;
    f.copies[0].lungeAt = 99;
    f.copies[1].x = 590;
    f.copies[1].y = 630;
    f.copies[1].cool = 9;
    f.copies[1].lungeAt = 99;
    const initialRealHp = f.hp;
    const initialRileyX = s.riley.x;
    let realHpDropped = false;
    let copyPopped = false;
    for (let frame = 0; frame < 180; frame++) {
      h.step();
      if (f.hp < initialRealHp) {
        realHpDropped = true;
        break;
      }
      if ((s.kit.stats.copiesPopped || 0) > 0) {
        copyPopped = true;
        break;
      }
    }
    assert.ok(realHpDropped, 'real boss hp drops');
    assert.equal(copyPopped, false, 'no copy popped before real boss hp drops');
    assert.ok(s.riley.x > initialRileyX, 'Riley x moved toward the real boss');
  } finally {
    h.destroy();
  }
}));
