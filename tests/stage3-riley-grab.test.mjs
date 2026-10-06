import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { GRABBED } from '../src/riley.js';
import { CUTTHROAT } from '../src/darkfriends.js';
import { Zealot } from '../src/whitecloaks.js';

const F = 1 / 60;

function steps(h, n) {
  for (let i = 0; i < n; i++) h.step();
}

function runUntil(h, maxFrames, until) {
  for (let i = 0; i < maxFrames; i++) {
    if (until()) return i;
    h.step();
    if (until()) return i + 1;
  }
  return -1;
}

function hold(h) {
  const s = h.s;
  const c = placeC(s, -220);
  c.startLunge();
  const ok = runUntil(h, 72, () => c.state === 'holding') > 0;
  assert.ok(ok, 'cutthroat reaches holding');
  assert.equal(s.riley.state, 'grabbed');
  assert.equal(c.st, 0);
  assert.equal(c.mashN, 0);
  assert.equal(c.mashT, 0);
  return c;
}

function press(h, a) {
  h.s.inp.press(a);
  h.step();
}

function mashEvery(h, n, gap, onPress) {
  for (let i = 0; i < n; i++) {
    if (i) steps(h, gap - 1);
    press(h, 'attack');
    if (onPress) onPress(i + 1);
  }
}

test('riley3 atlas provides riley_grabbed and riley_escape', () => {
  const r3Raw = fs.readFileSync('assets/stage3/chars/riley3.anims.json', 'utf8');
  const r3 = JSON.parse(r3Raw);
  assert.equal(r3.dir, 'assets/stage3/chars');

  const grabbed = r3.anims.find(a => a.name === 'riley_grabbed');
  assert.ok(grabbed, 'riley_grabbed anim exists');
  assert.equal(grabbed.frames.length, 4);
  assert.deepEqual(grabbed.holds, [130, 130, 130, 130]);
  assert.equal(grabbed.loop, true);

  const escape = r3.anims.find(a => a.name === 'riley_escape');
  assert.ok(escape, 'riley_escape anim exists');
  assert.deepEqual(escape.holds, [120, 90, 160, 200]);
  assert.equal(escape.loop, false);

  for (const a of [grabbed, escape]) {
    for (const f of a.frames) {
      assert.ok(f.startsWith('riley3_'), `frame ${f} must start with riley3_`);
    }
  }

  assert.deepEqual(r3.pages, ['riley3-0']);

  const r1Raw = fs.readFileSync('assets/chars/riley.anims.json', 'utf8');
  const r1 = JSON.parse(r1Raw);
  assert.deepEqual(r3.canvas, r1.canvas);
  assert.deepEqual(r3.baseline, r1.baseline);
  assert.deepEqual(r3.scale, r1.scale);

  assert.equal(GRABBED.shoveFrame, 1);
  assert.equal(CUTTHROAT.mashNeed, 6);
  assert.equal(CUTTHROAT.mashDecay, 0.5);
});

test('riley: six presses inside one decay window escape with riley_escape and the frame-1 shove beat', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      assert.equal(R.cur, 'riley_grabbed');
      assert.equal(R.busy, true);
      assert.equal(R.grabbedBy, c);

      const impacts = [];
      const origImpact = s.fx.impact.bind(s.fx);
      s.fx.impact = (...args) => {
        impacts.push(args);
        return origImpact(...args);
      };

      mashEvery(h, 6, 4, (k) => {
        if (k <= 5) {
          assert.equal(R.state, 'grabbed');
          assert.equal(c.mashN, k);
        }
      });

      assert.ok(c.st < CUTTHROAT.mashDecay, `c.st ${c.st} < ${CUTTHROAT.mashDecay}`);
      assert.equal(R.state, 'escape');
      assert.equal(R.cur, 'riley_escape');
      assert.equal(R.grabbedBy, null);
      assert.equal(c.state, 'shoved');
      assert.equal(c.hp, 34);
      assert.equal(s.kit.stats.escapes, 1);

      let fiFrames = 0;
      while (R.fi < 1 && fiFrames <= 12) {
        h.step();
        fiFrames++;
      }
      assert.equal(R.fi, 1);
      assert.equal(impacts.length, 1);
      assert.equal(impacts[0][0], 'medium');

      let idleFrames = 0;
      while (R.state !== 'idle' && idleFrames <= 36) {
        h.step();
        idleFrames++;
      }
      assert.equal(R.state, 'idle');
      assert.equal(R.facing, Math.sign(c.x - R.x));
      assert.equal(R.lastGrabber, null);
    } finally {
      h.destroy();
    }
  });
});

test('riley: presses 0.15 s apart decay to 5 and do not escape; a seventh in rhythm does', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);

      mashEvery(h, 6, 9, () => {
        assert.equal(R.state, 'grabbed');
      });

      assert.equal(c.mashN, 5);
      assert.equal(c.state, 'holding');
      assert.equal(R.grabbedBy, c);
      assert.equal(R.cur, 'riley_grabbed');
      assert.equal(s.kit.stats.escapes || 0, 0);
      assert.ok(c.st > 0.75 && c.st < 0.8, `0.75 < c.st ${c.st} < 0.8`);

      steps(h, 8);
      press(h, 'attack');

      assert.equal(R.state, 'escape');
      assert.equal(R.grabbedBy, null);
      assert.equal(c.state, 'shoved');
      assert.equal(s.kit.stats.escapes, 1);
    } finally {
      h.destroy();
    }
  });
});

test('riley: while grabbed, presses and new directions only count as mash', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);

      const z0 = R.z, sp = R.saidin, fb = s.fireballs.length;
      press(h, 'jump');
      press(h, 'special');
      press(h, 'power');

      assert.equal(c.mashN, 3);
      assert.equal(R.state, 'grabbed');
      assert.equal(R.z, z0);
      assert.equal(R.saidin, sp);
      assert.equal(s.fireballs.length, fb);
      assert.ok(!s.beam);

      s.inp.held.left = true;
      h.step();
      assert.equal(c.mashN, 4);

      h.step();
      assert.equal(c.mashN, 4);

      s.inp.held.left = false;
      s.inp.held.right = true;
      h.step();
      assert.equal(c.mashN, 5);

      s.inp.held.right = false;
      h.step();
      assert.equal(c.mashN, 5);

      s.inp.held.right = true;
      h.step();
      assert.equal(R.state, 'escape');

      s.inp.held = {};
    } finally {
      h.destroy();
    }
  });

  withSeed(2, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      s.inp.held.left = true;
      const c = placeC(s, -220);
      c.startLunge();
      const ok = runUntil(h, 72, () => c.state === 'holding') > 0;
      assert.ok(ok);
      assert.equal(c.mashN, 0);
      h.step();
      assert.equal(c.mashN, 0);
      s.inp.held.left = false;
      h.step();
      assert.equal(c.mashN, 0);
      s.inp.held = {};
    } finally {
      h.destroy();
    }
  });
});

test('riley: a held Riley is drawn in front of the grabber', () => {
  const rec = function (d) { this.depth = d; return this; };

  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      R.sprite.setDepth = rec;
      const c = hold(h);
      c.sprite.setDepth = rec;
      h.step();
      assert.ok(R.sprite.depth > c.sprite.depth, `R.depth ${R.sprite.depth} > c.depth ${c.sprite.depth}`);
      assert.equal(Math.sign(c.x - R.x), -R.facing);
    } finally {
      h.destroy();
    }
  });

  withSeed(2, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      R.y = 572;
      R.sprite.setDepth = rec;
      const c = placeC(s, -220);
      c.y = 572;
      c.startLunge();
      const ok = runUntil(h, 72, () => c.state === 'holding') > 0;
      assert.ok(ok);
      c.sprite.setDepth = rec;
      h.step();
      assert.ok(R.sprite.depth > c.sprite.depth, `R.depth ${R.sprite.depth} > c.depth ${c.sprite.depth} at y=572`);
    } finally {
      h.destroy();
    }
  });
});

test('riley: only hazards reach a grabbed Riley; death or respawn clears the hold', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      const hp0 = R.hp;

      const zealot = new Zealot(s, R.x + 100, R.y);
      const zHit = R.takeHit({ dmg: 9, kind: 'medium', kb: 100 }, zealot);
      assert.equal(zHit, false);

      const arrowHit = R.takeHit({ dmg: 5, kind: 'medium', kb: 200 }, { x: R.x - 20 });
      assert.equal(arrowHit, false);
      assert.equal(R.hp, hp0);
      assert.equal(R.state, 'grabbed');

      s.god = false;
      const hazHit = R.takeHit({ dmg: 999, kind: 'heavy', kb: 300, down: true }, { x: R.x - 1 });
      assert.equal(hazHit, true);
      assert.equal(R.alive, false);

      h.step();
      assert.equal(R.grabbedBy, null);
      assert.equal(c.state, 'approach');
      assert.equal(s.kit.stats.breaks, 1);

      const respawned = runUntil(h, 120, () => R.alive) > 0;
      assert.ok(respawned, 'respawned within 120 frames');
      assert.equal(R.state, 'getup');
      assert.equal(R.grabbedBy, null);
      assert.notEqual(c.state, 'holding');
    } finally {
      h.destroy();
    }
  });

  withSeed(2, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      R.respawn();
      h.step();
      assert.equal(R.grabbedBy, null);
      assert.equal(c.state, 'approach');
      assert.equal(R.state, 'getup');
      assert.equal(s.kit.stats.breaks, 1);
    } finally {
      h.destroy();
    }
  });
});

test('riley: pausing freezes the hold, chip and mash timers', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      arena(s);
      const R = s.riley;
      const c = hold(h);
      const hp0 = R.hp;

      steps(h, 39);
      press(h, 'attack');
      press(h, 'attack');

      assert.equal(c.chips, 1);
      assert.equal(c.mashN, 2);
      assert.equal(R.hp, hp0 - 2);

      const snap = {
        cst: c.st,
        mashN: c.mashN,
        mashT: c.mashT,
        chips: c.chips,
        cstate: c.state,
        rhp: R.hp,
        rst: R.st,
        rstate: R.state,
        rfi: R.fi,
        rcur: R.cur,
        gb: R.grabbedBy === c,
      };

      s.setPauseReason('manual', true);
      s.inp.press('attack');
      steps(h, 180);

      const snapAfter = {
        cst: c.st,
        mashN: c.mashN,
        mashT: c.mashT,
        chips: c.chips,
        cstate: c.state,
        rhp: R.hp,
        rst: R.st,
        rstate: R.state,
        rfi: R.fi,
        rcur: R.cur,
        gb: R.grabbedBy === c,
      };
      assert.deepEqual(snapAfter, snap);

      s.setPauseReason('manual', false);

      const n = runUntil(h, 150, () => c.state === 'grabthrow');
      const expectedSteps = Math.round((CUTTHROAT.holdMax - snap.cst) / F);
      assert.ok(Math.abs(n - expectedSteps) <= 2, `throw timing n=${n}, expected=${expectedSteps}`);
      assert.equal(c.chips, 3);
      assert.equal(hp0 - R.hp, 14);
      assert.equal(R.state, 'down');
      assert.equal(R.grabbedBy, null);
      assert.equal(s.kit.stats.throws, 1);
      assert.equal(s.kit.stats.escapes || 0, 0);
    } finally {
      h.destroy();
    }
  });
});
