import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';

const { Cutthroat, CUTTHROAT, GRAB_OK, RILEY_ATTACKS } = await import('../src/darkfriends.js');
const { WHITECLOAKS, Zealot } = await import('../src/whitecloaks.js');
const { STAGE3 } = await import('../src/stages.js');
const { ENEMY_CLASSES } = await import('../src/stage1.js');
const { TYPES } = await import('../src/enemies.js');

const F = 1 / 60;
const run = (h, secs, until) => {
  for (let i = 0; i < secs * 60; i++) {
    h.step();
    if (until && until()) return true;
  }
  return false;
};

function hold(h) {
  const s = h.s;
  const c = placeC(s, -220);
  c.startLunge();
  const ok = run(h, 1.2, () => c.state === 'holding');
  assert.ok(ok, 'cutthroat reaches holding');
  return c;
}

test('cutthroat: the grab lunge telegraphs a 0.45 s coil and calls kit.telegraph', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      let telegraphed = [];
      s.kit.telegraph = (e) => { telegraphed.push(e); };
      const c = placeC(s, -220);
      const startX = c.x;
      c.startLunge();
      assert.equal(telegraphed.length, 1);
      assert.equal(telegraphed[0], c);
      assert.ok(c.grabCool >= 5 && c.grabCool <= 8, `grabCool ${c.grabCool} in [5, 8]`);
      for (let i = 0; i < 60; i++) {
        h.step();
        if (c.st < 0.45 - F) {
          assert.equal(c.state, 'lunge');
          assert.equal(c.fi, 0, `frame index at st ${c.st} should be 0`);
          assert.equal(c.x, startX, `x should not move during coil`);
        } else if (c.st >= 0.45 + F) {
          assert.ok(c.fi >= 1, `fi ${c.fi} >= 1 at st ${c.st}`);
          assert.ok(c.x > startX, `x ${c.x} moved toward Riley from ${startX}`);
          break;
        }
      }
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: grabs a grounded Riley from behind, never airborne, down or getup', () => {
  withSeed(2, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      assert.equal(R.grabbedBy, c);
      assert.equal(Math.sign(c.x - R.x), -R.facing);
      assert.equal(s.kit.stats.grabs, 1);

      for (const st of GRAB_OK) {
        const stub = { x: c.x - 30, y: c.y, z: 0, alive: true, vulnerable: true, grabbedBy: null, state: st, facing: 1 };
        assert.equal(c.catchResult(stub), 'grab', `GRAB_OK state ${st} should give grab`);
      }
      for (const bad of [
        { z: 100, state: 'idle' },
        { z: 0, state: 'down' },
        { z: 0, state: 'getup' },
        { z: 0, state: 'air' },
        { z: 0, state: 'idle', vulnerable: false },
        { z: 0, state: 'idle', grabbedBy: {} },
      ]) {
        const stub = { x: c.x - 30, y: c.y, z: 0, alive: true, vulnerable: true, grabbedBy: null, facing: 1, ...bad };
        assert.equal(c.catchResult(stub), null, `bad state ${JSON.stringify(bad)} should give null`);
      }

      c.setState('approach', 'walk');
      R.grabbedBy = null;
      R.state = 'idle';
      const c2 = placeC(s, -220);
      c2.startLunge();
      R.down(1, {});
      assert.ok(run(h, 2.0, () => c2.state === 'approach'), 'c2 returns to approach');
      assert.equal(R.grabbedBy, null, 'Riley was not grabbed while down');
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: a Riley attacking toward him counters the lunge', () => {
  withSeed(3, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const c = placeC(s, 70);
      const stubToward = { x: c.x - 70, y: c.y, z: 0, alive: true, vulnerable: true, grabbedBy: null, state: 'combo2', atk: { active: [2], x1: 185 }, fi: 2, facing: 1 };
      assert.equal(c.catchResult(stubToward), 'counter');
      const stubAway = { ...stubToward, facing: -1 };
      assert.equal(c.catchResult(stubAway), 'grab');
      const stubBack = { ...stubToward, state: 'back', atk: { active: [2], x1: -185 }, facing: -1 };
      assert.equal(c.catchResult(stubBack), 'counter');

      arena(s);
      const R = s.riley;
      R.startCombo(2);
      while (R.fi !== 2) h.step();
      const cLive = placeC(s, 70);
      cLive.setState('lunge', 'lunge');
      cLive.st = 0.45;
      cLive.lungeDir = -1;
      cLive.face(-1);
      h.step();
      assert.ok(['hurt', 'down'].includes(cLive.state), `state ${cLive.state} in hurt/down`);
      assert.ok(cLive.hp < 34, `hp ${cLive.hp} < 34`);
      assert.equal(R.grabbedBy, null);
      assert.equal(s.kit.stats.counters, 1);
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: only one cutthroat lunges or holds at a time', () => {
  for (const seed of [1, 2, 3]) {
    withSeed(seed, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        arena(s);
        const c1 = placeC(s, -220);
        c1.cool = 0; c1.grabCool = 0;
        const c2 = placeC(s, 220);
        c2.cool = 0; c2.grabCool = 0;
        for (let i = 0; i < 6 * 60; i++) {
          h.step();
          const inGrab = [c1, c2].filter(c => c.state === 'lunge' || c.state === 'holding').length;
          assert.ok(inGrab <= 1, `frame ${i}: inGrab ${inGrab} must be <= 1`);
          if (c1.state === 'lunge') {
            assert.equal(s.grabBusy(c2), true, `frame ${i}: grabBusy(c2) must be true while c1 in lunge`);
          }
          if (c2.state === 'lunge') {
            assert.equal(s.grabBusy(c1), true, `frame ${i}: grabBusy(c1) must be true while c2 in lunge`);
          }
        }
      } finally {
        h.destroy();
      }
    });
  }
});

test('cutthroat: six quick presses break the hold; shoved for 1.2 s at x1.3 damage', () => {
  withSeed(5, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      for (let i = 0; i < 5; i++) {
        assert.equal(c.mash(), false, `mash ${i + 1} should return false`);
        for (let f = 0; f < 4; f++) h.step();
      }
      assert.equal(c.mash(), true, '6th mash returns true');
      assert.equal(R.grabbedBy, null);
      assert.equal(c.state, 'shoved');
      assert.equal(s.kit.stats.escapes, 1);
      const hp0 = c.hp;
      c.takeHit({ dmg: 10, kind: 'light', kb: 0 }, R);
      assert.ok(Math.abs(hp0 - c.hp - 13) < 1e-9, `10 * 1.3 = 13 dmg, actual ${hp0 - c.hp}`);

      c.gone = true;
      R.grabbedBy = null;
      R.state = 'idle';
      const c2 = placeC(s, -220);
      c2.startLunge();
      assert.ok(run(h, 1.2, () => c2.state === 'holding'));
      let escaped = false;
      let frame = 0;
      while (c2.state === 'holding' && frame < 2.4 * 60) {
        if (frame > 0 && frame % 12 === 0) {
          if (c2.mash()) {
            escaped = true;
            break;
          }
        }
        h.step();
        frame++;
      }
      assert.ok(escaped, 'escaped via mashing every 0.2s');
      assert.ok(c2.st < 2.4, `escaped at c2.st ${c2.st} < 2.4`);

      const c3 = placeC(s, -100);
      c3.setState('shoved', 'shoved');
      let shovedFrames = 0;
      while (c3.state === 'shoved' && shovedFrames < 120) {
        h.step();
        shovedFrames++;
      }
      assert.ok(Math.abs(shovedFrames - 72) <= 1, `shoved frames ${shovedFrames} should be 72 ±1`);
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: the mash count decays every 0.5 s even while Riley keeps pressing', () => {
  withSeed(6, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const c = hold(h);
      let frames = 0;
      let lastPressFrame = -999;
      let nextTick = 30;
      while (c.state === 'holding' && frames < 180) {
        if (frames > 0 && frames % 27 === 0) {
          c.mash();
          lastPressFrame = frames;
        }
        h.step();
        frames++;
        assert.ok(c.mashN <= 1, `frame ${frames}: mashN ${c.mashN} must be <= 1`);
        assert.ok(c.mashT < 0.5, `frame ${frames}: mashT ${c.mashT} must be < 0.5`);
        if (frames === nextTick + 1 && lastPressFrame < frames) {
          assert.equal(c.mashN, 0, `frame ${frames}: after 0.5s tick, mashN must be 0`);
          nextTick += 30;
        }
      }
      assert.equal(c.state, 'grabthrow');
      assert.equal(s.kit.stats.escapes || 0, 0);
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: exactly 3 chips of 2, then the timeout throw knocks Riley down for 8', () => {
  withSeed(7, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      const hp0 = R.hp;
      let prevHp = R.hp;
      const drops = [];
      let lastHoldingSt = 0;
      for (let i = 0; i < 2.6 * 60; i++) {
        if (c.state === 'holding') lastHoldingSt = c.st;
        h.step();
        if (R.hp < prevHp) {
          drops.push({ st: lastHoldingSt, drop: prevHp - R.hp });
          prevHp = R.hp;
        }
        if (c.state === 'grabthrow') break;
      }
      assert.equal(c.state, 'grabthrow');
      assert.ok(lastHoldingSt >= 2.4 - F && lastHoldingSt <= 2.4 + F, `lastHoldingSt ${lastHoldingSt} in [2.4 - F, 2.4 + F]`);
      const chips = drops.filter(d => d.drop === 2);
      assert.equal(chips.length, 3, 'exactly 3 chip drops of 2');
      assert.equal(c.chips, 3);
      for (const [idx, expectedSt] of [0.6, 1.2, 1.8].entries()) {
        assert.ok(Math.abs(chips[idx].st - expectedSt) <= F, `chip ${idx} st ${chips[idx].st} ≈ ${expectedSt} ±F`);
      }
      assert.equal(hp0 - R.hp, 14, `total damage 14 (6 chips + 8 throw)`);
      assert.equal(R.state, 'down');
      assert.equal(R.grabbedBy, null);
      assert.equal(s.kit.stats.throws, 1);

      c.gone = true;
      R.state = 'idle';
      R.hp = 3;
      R.grabbedBy = null;
      const c2 = placeC(s, -220);
      c2.startLunge();
      assert.ok(run(h, 1.2, () => c2.state === 'holding'));
      run(h, 2.2, () => c2.st >= 2.0);
      assert.equal(R.hp, 1, 'hp stays floored at 1 during chips');
      assert.equal(c2.chips, 3, 'all 3 chips registered');
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: while Riley is held nobody else can hurt him or take a token', () => {
  withSeed(8, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      const z = new Zealot(s, R.x + 120, R.y);
      z.entering = false;
      z.cool = 0;
      z.face(-1);
      s.enemies.push(z);
      assert.equal(s.attackTokens(), s.maxTokens);
      for (let i = 0; i < 1.5 * 60; i++) {
        assert.ok(!['attack', 'chargeup', 'charge'].includes(z.state), `zealot state ${z.state} should not attack`);
        assert.ok(s.attackTokens() <= s.maxTokens);
        const hpPrior = R.hp;
        s.resolveAttack(z, TYPES.zealot.atk);
        assert.equal(R.hp, hpPrior, 'Zealot resolveAttack does not hurt held Riley');
        h.step();
      }
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: a hazard hit or Loial breaks the hold', () => {
  withSeed(9, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      R.takeHit({ dmg: 9, kind: 'heavy', kb: 300, down: true }, { x: R.x - 1 });
      h.step();
      assert.equal(R.grabbedBy, null);
      assert.equal(c.state, 'approach');
      assert.equal(s.kit.stats.breaks, 1);

      arena(s, 360);
      const c2 = hold(h);
      assert.ok(s.callLoial(), 'callLoial succeeded');
      assert.ok(run(h, 2.3, () => c2.state !== 'holding'), 'c2 released from holding within 2.3s');
      assert.equal(R.grabbedBy, null);
      assert.equal(c2.state, 'down');
      assert.equal(s.kit.stats.breaks, 2);
    } finally {
      h.destroy();
    }
  });
});

test('cutthroat: drop-in shows a 0.7 s marker, cannot be hit while falling, lands in bounds', () => {
  for (let seed = 1; seed <= 10; seed++) {
    withSeed(seed, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        arena(s);
        s.kit.stats.dropins = 0;
        const e = s.spawn('cutthroat', 'T');
        assert.equal(e.entering, false);
        let fell = false;
        let landed = false;
        for (let i = 0; i < 1.6 * 60; i++) {
          if (e.state === 'approach') {
            landed = true;
            break;
          }
          if (e.st < 0.7 - F - 1e-6) {
            assert.equal(e.state, 'dropin');
            assert.equal(e.z, 0);
            assert.equal(e.sprite.alpha, 0);
            assert.equal(e.canBeHit, false);
          } else if (e.state === 'dropin' && e.falling) {
            fell = true;
            assert.ok(e.z > 0, `e.z ${e.z} > 0 while falling`);
            assert.equal(e.canBeHit, false, 'cannot be hit while falling');
          }
          h.step();
        }
        assert.ok(fell, 'cutthroat entered falling phase');
        assert.ok(landed, 'cutthroat landed in approach');
        assert.ok(e.x >= s.bounds.l + 40 && e.x <= s.bounds.r - 40, `x ${e.x} in bounds`);
        assert.ok(e.y >= 572 && e.y <= 690, `y ${e.y} in [572, 690]`);
        assert.equal(s.kit.stats.dropins, 1);

        const z = s.spawn('zealot', 'T');
        assert.equal(z.entering, true);
        assert.equal(z.x, s.zone.r + 120);
      } finally {
        h.destroy();
      }
    });
  }
});

test('cutthroat: KO alternates stars and flee, reproducibly from the seed', () => {
  function runRun(seed) {
    return withSeed(seed, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        arena(s);
        const R = s.riley;
        const initialStars = s.kit.stats.stars || 0;
        const log = [];
        for (let i = 0; i < 4; i++) {
          const c = placeC(s, -100);
          const fleeOnKO = c.fleeOnKO;
          let visitedFlee = false;
          c.takeHit({ dmg: 99, kind: 'heavy', kb: 300, down: true }, R);
          while (!c.gone) {
            if (c.state === 'flee') visitedFlee = true;
            h.step();
          }
          log.push([fleeOnKO, visitedFlee]);
        }
        const deltaStars = (s.kit.stats.stars || 0) - initialStars;
        return { log, deltaStars };
      } finally {
        h.destroy();
      }
    });
  }

  const run1 = runRun(11);
  assert.deepEqual(run1.log, [[false, false], [true, true], [false, false], [true, true]]);
  assert.equal(run1.deltaStars, 2);

  const run2 = runRun(11);
  assert.deepEqual(run1, run2);
});

test('Stage 3 waves match PLAN §1.2; cutthroat type and class registry', () => {
  const expectedWaves = [
    [[['cutthroat', 'R', 0], ['cutthroat', 'L', 1.2]], [['zealot', 'R', 0], ['cutthroat', 'L', 0.8]]],
    [[['cutthroat', 'R', 0], ['archer', 'R', 0.6]], [['cutthroat', 'L', 0], ['cutthroat', 'R', 0.5], ['zealot', 'R', 2.0]]],
    [[['cutthroat', 'T', 0], ['cutthroat', 'T', 0.9]], [['hound', 'R', 0], ['cutthroat', 'T', 0.6], ['cutthroat', 'L', 1.4]]],
    undefined
  ];
  assert.deepEqual(STAGE3.zones.map(z => z.waves), expectedWaves);
  assert.equal(STAGE3.zones[0].at, 260);
  assert.equal(STAGE3.zones[0].l, 0);
  assert.equal(STAGE3.zones[0].r, 1280);
  assert.equal(STAGE3.zones[0].intro, 'cutthroat_intro_01');
  assert.equal(STAGE3.zones[1].at, 1500);
  assert.equal(STAGE3.zones[1].l, 1240);
  assert.equal(STAGE3.zones[1].r, 2520);
  assert.equal(STAGE3.zones[2].at, 2800);
  assert.equal(STAGE3.zones[2].l, 2560);
  assert.equal(STAGE3.zones[2].r, 3840);
  assert.equal(STAGE3.zones[3].boss, true);

  for (const z of STAGE3.zones) {
    if (!z.waves) continue;
    for (const wave of z.waves) {
      for (const [type, side] of wave) {
        assert.ok(TYPES[type], `type ${type} in TYPES`);
        if (side === 'T') {
          assert.equal(type, 'cutthroat');
        }
      }
    }
  }

  assert.equal(TYPES.cutthroat.hp, 34);
  assert.equal(TYPES.cutthroat.atk.dmg, 8);
  assert.equal(ENEMY_CLASSES.cutthroat, Cutthroat);
  assert.deepEqual(Object.keys(WHITECLOAKS), ['zealot', 'archer', 'byar']);
});
