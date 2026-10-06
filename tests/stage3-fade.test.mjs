import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';

const { Myrddraal, FadeCopy, FADE, poolSpot, lightNear, calmMotion } = await import('../src/myrddraal.js');
const { TYPES } = await import('../src/enemies.js');
const { ENEMY_CLASSES } = await import('../src/stage1.js');
const { STAGE3 } = await import('../src/stages.js');
const { Stage3Kit } = await import('../src/stage3.js');
const { q } = await import('../src/config.js');

const F = 1 / 60;
const run = (h, secs, until) => {
  for (let i = 0; i < secs * 60; i++) {
    h.step();
    if (until && until()) return true;
  }
  return false;
};

function vig(s) {
  const ext = s.cameras.main.filters.external;
  ext.addVignette = (x, y, radius, strength) => ({ x, y, radius, strength });
  s.vignette = ext.addVignette(0.5, 0.5, 0.95, 0.35);
  return s.vignette;
}

function litRec(s) {
  const origSprite = s.add.sprite.bind(s.add);
  s.add.sprite = (...args) => {
    const spr = origSprite(...args);
    spr.setLighting = function(on) {
      this.lit = on;
      (this.litCalls ||= []).push(on);
      return this;
    };
    spr.setTint = function(...a) {
      (this.tints ||= []).push(a);
      return this;
    };
    spr.setTintFill = function(...a) {
      (this.tints ||= []).push(a);
      return this;
    };
    return spr;
  };
}

function place(h) {
  const s = h.s;
  arena(s, 640);
  vig(s);
  litRec(s);
  s.riley.y = 630;
  const f = new Myrddraal(s, s.riley.x + 300, s.riley.y);
  f.entering = false;
  f.introDone = true;
  f.cool = 9;
  f.nextBlink = 99;
  s.enemies.push(f);
  s.boss = f;
  h.step();
  return f;
}

function toPhase(h, f, n) {
  f.hp = (n === 2 ? 0.66 : 0.33) * 440 - 1;
  h.step();
  assert.equal(f.phase, n, `phase should be ${n}`);
  f.pendingFear = f.pendingSplit = false;
  f.setState('approach', 'walk');
  f.cool = 9;
  f.nextBlink = 99;
}

function armAura(h, dx = 200) {
  const s = h.s;
  const f = place(h);
  toPhase(h, f, 2);
  f.T.speed = 0;
  s.riley.x = f.x - dx;
  s.riley.y = f.y;
  s.riley.facing = 1;
  f.startFear();
  assert.ok(run(h, 2, () => f.auraActive), 'aura must become active');
  f.cool = 9;
  return f;
}

function hold(h, f) { h.step(); f.cool = 9; }

function torch(s, x = 400) {
  const L = s.lights.addLight(x, 500, 400, 0xff9a48, 1);
  Object.assign(L, { baseX: x, baseI: 1, par: 0 });
  s.fires.push(L);
  return L;
}

const jab = Object.freeze({ dmg: 10, kind: 'medium', kb: 100 });

// Test 1
test('fade: data matches PLAN §1.4 and the fade atlas has every anim', () => {
  assert.equal(TYPES.fade.hp, 440);
  assert.equal(TYPES.fade.def.hp, 440);
  assert.equal(TYPES.fade.speed, 110);
  assert.equal(TYPES.fade.pref, 210);
  assert.deepEqual(TYPES.fade.cool, [0.9, 1.5]);
  assert.equal(TYPES.fade.score, 7000);
  assert.equal(TYPES.fade.boss, true);
  assert.deepEqual(TYPES.fade.atk.active, [2, 4]);
  assert.equal(TYPES.fade.atk.dmg, 12);
  assert.equal(TYPES.fade.atk.kind, 'medium');

  assert.deepEqual(FADE.blink, { every: [4, 6], everyP2: [6, 8], poolWarn: 0.6, counterFrames: [2, 3], behind: 110, edge: 70 });
  assert.deepEqual(FADE.fear.vig, [0.35, 0.75]);
  assert.equal(FADE.fear.torchDim, 0.7);
  assert.equal(FADE.fear.radius, 220);
  assert.equal(FADE.fear.fill, 1.6);
  assert.equal(FADE.fear.shaken, 0.7);
  assert.equal(FADE.fear.brave, 1.2);
  assert.equal(FADE.fear.dispel, 4);
  assert.equal(FADE.fear.dispelRange, 400);

  assert.equal(TYPES.fadecopy.def.key, 'fade');
  assert.equal(TYPES.fadecopy.def.prefix, 'fade_');
  assert.equal(TYPES.fadecopy.hp, 1);
  assert.equal(TYPES.fadecopy.boss, false);

  const meta = JSON.parse(readFileSync(new URL('../assets/stage3/chars/fade.anims.json', import.meta.url)));
  assert.equal(meta.dir, 'assets/stage3/chars');
  assert.equal(meta.anims.length, 15);
  for (const a of meta.anims) {
    assert.ok(a.name.startsWith('fade_'), `anim ${a.name} must start with fade_`);
  }
  const blinkin = meta.anims.find(a => a.name === 'fade_blinkin');
  assert.deepEqual(blinkin.holds, [100, 110, 120, 160]);

  const rileyMeta = JSON.parse(readFileSync(new URL('../assets/chars/riley.anims.json', import.meta.url)));
  const rileyHurt = rileyMeta.anims.find(a => a.name === 'riley_hurt');
  const hurtHoldSum = rileyHurt.holds.reduce((acc, v) => acc + v, 0);
  assert.equal(hurtHoldSum, FADE.fear.hurtMs);

  assert.equal(ENEMY_CLASSES.fade, Myrddraal);
  assert.ok(ENEMY_CLASSES.cutthroat);
});

// Test 2
test('fade: phases change at 66% and 33%; lines, flash and the sa\'angreal at phase 2', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const f = place(h);
      f.hp = 0.66 * 440 - 1;
      h.step();
      assert.equal(f.phase, 2);
      assert.ok(f.pendingFear || f.state === 'fear');
      assert.ok(h.s.powerDrops?.some(d => d.kind === 'saangreal'));
      const flashes = h.observations.hud.filter(o => o.method === 'flashText').map(o => o.args[0]);
      assert.ok(flashes.includes(STAGE3.phaseLines[2].flash));

      f.hp = 0.33 * 440 - 1;
      h.step();
      assert.equal(f.phase, 3);
      assert.ok(f.pendingSplit || f.state === 'split');
      const flashes2 = h.observations.hud.filter(o => o.method === 'flashText').map(o => o.args[0]);
      assert.ok(flashes2.includes(STAGE3.phaseLines[3].flash));
    } finally {
      h.destroy();
    }
  });
});

// Test 3
test('fade: the blink pool shows ≥ 0.6 s before blinkin, behind Riley, inside bounds', () => {
  for (let seed = 1; seed <= 5; seed++) {
    withSeed(seed, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        const f = place(h);
        f.cool = 0;
        f.nextBlink = 0;
        s.riley.facing = 1;

        let t0 = null, x0 = null, t1 = null;
        let elapsed = 0;
        for (let i = 0; i < 300; i++) {
          h.step();
          elapsed += F;
          if (f.pool && t0 === null) {
            t0 = elapsed;
            x0 = f.pool.x;
            assert.ok(f.pool.x < s.riley.x, `pool.x ${f.pool.x} should be behind riley ${s.riley.x}`);
            assert.ok(f.pool.x >= s.bounds.l + 70 && f.pool.x <= s.bounds.r - 70, `pool.x in bounds ±70`);
            assert.ok(f.pool.y >= 578 && f.pool.y <= 684, `pool.y ${f.pool.y} in 578..684`);
            assert.equal(f.canBeHit, false);
            assert.equal(f.sprite.alpha, 0);
          }
          if (t0 !== null && f.state === 'blinkin' && t1 === null) {
            t1 = elapsed;
            assert.ok(t1 - t0 >= 0.6 - 1e-9, `t1 - t0 ${t1 - t0} >= 0.6`);
            assert.ok(Math.abs(f.x - x0) < 1, `f.x ${f.x} should be at pool.x ${x0}`);
            assert.equal(f.pool, null);
            break;
          }
        }
        assert.ok(t1 !== null, 'must reach blinkin');
      } finally {
        h.destroy();
      }
    });
  }
  const pureSpot = poolSpot({ x: 50, y: 630, facing: 1 }, { l: 0, r: 1280 });
  assert.ok(pureSpot.x > 50, 'poolSpot flips in front when behind is out of bounds');
});

// Test 4
test('fade: blinkin frames 2–3 counter (stagger, ×1.5); other blink frames take ×0.6', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      f.setState('blinkin', 'blinkin');
      f.sprite.anims.currentFrame = { index: 3 };
      assert.equal(f.fi, 2);
      const hp0 = f.hp;
      assert.equal(f.takeHit(jab, s.riley), true);
      assert.equal(hp0 - f.hp, 15);
      assert.equal(f.state, 'stagger');
      assert.equal(s.kit.stats.counters, 1);

      const hp1 = f.hp;
      assert.equal(f.takeHit(jab, s.riley), true);
      assert.equal(hp1 - f.hp, 15);

      let staggerFrames = 0;
      while (f.state === 'stagger') {
        h.step();
        staggerFrames++;
        if (staggerFrames > 120) break;
      }
      assert.ok(Math.abs(staggerFrames - 84) <= 2, `staggerFrames ${staggerFrames} should be ~84 (1.4s)`);

      f.setState('blinkout', 'blinkout');
      const hp2 = f.hp;
      assert.equal(f.takeHit(jab, s.riley), true);
      assert.equal(hp2 - f.hp, 6);

      f.setState('blinkin', 'blinkin');
      f.sprite.anims.currentFrame = { index: 1 };
      assert.equal(f.fi, 0);
      const hp3 = f.hp;
      assert.equal(f.takeHit(jab, s.riley), true);
      assert.equal(hp3 - f.hp, 6);
      assert.equal(f.state, 'blinkin');

      f.state = 'sunk';
      assert.equal(f.takeHit(jab, s.riley), false);
    } finally {
      h.destroy();
    }
  });
});

// Test 5
test('fade: inside the aura for fear.fill Riley is shaken for 0.7 s; outside the meter decays', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      toPhase(h, f, 2);
      f.T.speed = 0;
      s.riley.x = f.x - 200;
      s.riley.y = f.y;
      f.startFear();

      const okAura = run(h, 2.0, () => f.auraActive);
      assert.ok(okAura, 'aura must become active');
      f.cool = 9;

      let auraFrames = 0;
      const rileyHp0 = s.riley.hp;
      while (s.riley.state !== 'hurt') {
        h.step();
        auraFrames++;
        if (f.state === 'approach') f.cool = 9;
        if (auraFrames > 120) break;
      }
      assert.ok(Math.abs(auraFrames - FADE.fear.fill * 60) <= 3, `auraFrames ${auraFrames} should be ~${FADE.fear.fill * 60}`);
      assert.equal(s.riley.hp, rileyHp0);
      assert.equal(s.kit.stats.shaken, 1);

      let hurtFrames = 0;
      while (s.riley.state === 'hurt') {
        h.step();
        hurtFrames++;
        if (hurtFrames > 60) break;
      }
      assert.ok(Math.abs(hurtFrames - 42) <= 3, `hurtFrames ${hurtFrames} should be ~42 (0.7s)`);

      s.riley.x = f.x - 700;
      let lastFear = f.fear;
      for (let i = 0; i < 90; i++) {
        h.step();
        assert.ok(f.fear <= lastFear + 1e-9, `fear ${f.fear} should not increase from ${lastFear}`);
        lastFear = f.fear;
      }
      assert.equal(f.fear, 0);
    } finally {
      h.destroy();
    }
  });
});

// Test 6
test('fade: fireball, lightning, fire shield and Balefire within 400 px each clear the aura for 4 s', () => {
  const sources = [
    { name: 'fireball', trigger: (s) => s.spawnFireball(s.riley) },
    { name: 'lightning', trigger: (s) => s.powers.fireLightning(s.riley) },
    { name: 'fireshield', trigger: (s) => s.powers.activate('fireshield') },
    { name: 'balefire', trigger: (s) => { s.riley.saidin = 100; s.fireBalefire(s.riley); } },
  ];

  for (const { name, trigger } of sources) {
    withSeed(1, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        const f = place(h);
        toPhase(h, f, 2);
        f.startFear();
        run(h, 2.0, () => f.auraActive);
        assert.ok(f.auraActive);

        s.riley.x = f.x - 250;
        s.riley.facing = 1;
        trigger(s);
        assert.equal(lightNear(s, f.x, 400), name);
        s.fx.hitstop = 0;
        s.fx.slowmo = 0;
        h.step();

        assert.equal(f.auraActive, false);
        assert.ok(f.dispelT > 3.9, `dispelT ${f.dispelT} should be > 3.9`);
        assert.equal(s.kit.stats.dispels, 1);

        if (name === 'fireball') {
          while (s.fireballs?.length || s.fx.hitstop > 0 || s.fx.slowmo > 0) h.step();
          f.cool = 99; f.lungeAt = 99;
          let stepsToAura = 0;
          while (!f.auraActive) {
            f.cool = 99; f.lungeAt = 99;
            s.fx.hitstop = 0; s.fx.slowmo = 0;
            h.step();
            stepsToAura++;
            if (stepsToAura > 300) break;
          }
          assert.ok(Math.abs(stepsToAura - 240) <= 2, `stepsToAura ${stepsToAura} should be ~240 (4s)`);
        }
      } finally {
        h.destroy();
      }
    });
  }

  // Fifth sim: out of range
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      toPhase(h, f, 2);
      f.startFear();
      run(h, 2.0, () => f.auraActive);

      s.riley.x = 340;
      f.x = 1240;
      s.riley.facing = -1;
      s.spawnFireball(s.riley);
      h.step();
      assert.equal(f.auraActive, true);
    } finally {
      h.destroy();
    }
  });
});

// Test 7
test('fade: the vignette deepens to 0.75, returns to exactly 0.35, and does not pulse in calm mode', () => {
  q.set('flash', '0');
  try {
    withSeed(1, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        const f = place(h);
        torch(s);
        const n0 = h.resources().lights;

        toPhase(h, f, 2);
        s.powerDrops = [];
        f.startFear();
        run(h, 2.0, () => f.auraK === 1);

        for (let i = 0; i < 30; i++) {
          h.step();
          assert.ok(Math.abs(s.vignette.strength - 0.75) < 1e-9, `vignette strength ${s.vignette.strength} === 0.75`);
          assert.ok(Math.abs(s.fires[0].radius - 280) < 1e-9, `torch radius ${s.fires[0].radius} === 280`);
        }

        s.spawnFireball(s.riley);
        h.step();
        assert.ok(f.dispelT > 0);

        while (s.fireballs?.length || s.fx.booms?.length || s.fx.hitstop > 0 || s.fx.slowmo > 0) h.step();
        for (let i = 0; i < 20; i++) h.step();
        assert.equal(s.vignette.strength, 0.35);
        assert.equal(s.fires[0].radius, 400);

        assert.equal(h.resources().lights, n0);
      } finally {
        h.destroy();
      }
    });
  } finally {
    q.delete('flash');
  }

  // Calm mode via matchMedia
  const origMM = globalThis.matchMedia;
  const origBody = globalThis.document?.body;
  if (globalThis.document) globalThis.document.body = { classList: { add() {}, remove() {} } };
  globalThis.matchMedia = () => ({ matches: true });
  try {
    assert.equal(calmMotion(), true);
    withSeed(1, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        const f = place(h);
        toPhase(h, f, 2);
        f.startFear();
        run(h, 2.0, () => f.auraK === 1);
        for (let i = 0; i < 30; i++) {
          h.step();
          assert.ok(Math.abs(s.vignette.strength - 0.75) < 1e-9);
        }
      } finally {
        h.destroy();
      }
    });
  } finally {
    globalThis.matchMedia = origMM;
    if (globalThis.document) globalThis.document.body = origBody;
  }

  // Active pulse mode
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      toPhase(h, f, 2);
      f.startFear();
      run(h, 2.0, () => f.auraK === 1);
      const strengths = [];
      for (let i = 0; i < 60; i++) {
        h.step();
        strengths.push(s.vignette.strength);
        assert.ok(s.vignette.strength >= 0.72 && s.vignette.strength <= 0.78, `strength ${s.vignette.strength} in [0.72, 0.78]`);
      }
      assert.ok(new Set(strengths).size > 5, 'vignette should pulse and not be constant');

      s.vignette = null;
      for (let i = 0; i < 60; i++) h.step();
    } finally {
      h.destroy();
    }
  });
});

// Test 8
test('fade: split makes exactly 2 unlit copies with the fade frames, no tint and no shadow; the real one stays lit', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      toPhase(h, f, 3);
      f.startSplit();
      run(h, 2.0, () => f.copies.length === 2);

      assert.equal(f.copies.length, 2);
      for (const c of f.copies) {
        assert.ok(c instanceof FadeCopy);
        assert.equal(c.isCopy, true);
        assert.equal(c.T.def.key, 'fade');
        assert.equal(c.T.def.prefix, 'fade_');
        assert.equal(c.meta, f.meta);
        assert.ok(c.cur.startsWith('fade_'));
        assert.equal(c.hp, 1);
        assert.equal(c.sprite.lit, false);
        assert.equal(c.sprite.litCalls.at(-1), false);
        const lastIdx = c.sprite.litCalls.lastIndexOf(false);
        assert.equal(c.sprite.litCalls.slice(lastIdx).includes(true), false);
      }

      assert.equal(f.isCopy, false);
      assert.equal(f.sprite.lit, true);
      assert.deepEqual(f.sprite.litCalls, [true]);

      for (let i = 0; i < 180; i++) {
        h.step();
        for (const c of f.copies) {
          if (c.alive) {
            assert.equal(c.sprite.lit, false);
            assert.ok(!c.sprite.tints || c.sprite.tints.length === 0);
          }
        }
        assert.equal(f.sprite.lit, true);
      }

      h.step();
      for (const c of f.copies) {
        if (c.alive) assert.equal(c.shadow.alpha, 0);
      }
      assert.ok(f.shadow.alpha > 0);

      for (let i = 0; i < 600; i++) {
        h.step();
        const liveCopies = s.enemies.filter(e => e instanceof FadeCopy && e.alive);
        assert.ok(liveCopies.length <= 2, `live copies ${liveCopies.length} <= 2`);
      }
    } finally {
      h.destroy();
    }
  });
});

// Test 9
test('fade: popping a copy makes the real one lunge within 0.3 s', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      toPhase(h, f, 3);
      f.startSplit();
      run(h, 2.0, () => f.copies.length === 2);

      f.setState('approach', 'walk');
      f.cool = 9;
      const c = f.copies[0];
      assert.equal(c.takeHit(jab, s.riley), true);
      h.step();
      assert.equal(c.gone, true);
      assert.ok(!s.enemies.includes(c));

      let lungeFrames = 0;
      while (f.state !== 'lunge') {
        h.step();
        lungeFrames++;
        if (lungeFrames > 30) break;
      }
      assert.ok(lungeFrames <= 19, `lungeFrames ${lungeFrames} <= 19 (0.3s + 1 frame)`);
      assert.equal(f.copies.length, 1);
      assert.equal(s.kit.stats.copiesPopped, 1);
    } finally {
      h.destroy();
    }
  });
});

// Test 10
test('fade: hitting the real one in its telegraph parries: stagger, every copy vanishes, re-split in 8–10 s', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      toPhase(h, f, 3);
      f.startSplit();
      run(h, 2.0, () => f.copies.length === 2);

      f.startLunge();
      assert.equal(f.fi, 0);
      const hp0 = f.hp;
      assert.equal(f.takeHit(jab, s.riley), true);
      assert.equal(f.state, 'stagger');
      assert.equal(hp0 - f.hp, 15);
      assert.equal(s.kit.stats.parries, 1);

      h.step();
      assert.equal(f.copies.length, 0);
      assert.ok(!s.enemies.some(e => e instanceof FadeCopy));
      assert.ok(f.resplitT >= 8 && f.resplitT <= 10, `resplitT ${f.resplitT} in [8, 10]`);

      let elapsed = 0;
      while (f.copies.length < 2) {
        h.step();
        elapsed += F;
        if (elapsed > 15) break;
      }
      assert.ok(elapsed >= 8, `re-split elapsed ${elapsed} >= 8s`);

      f.setState('approach', 'walk');
      assert.equal(f.inParry(), false);
      assert.equal(f.takeHit(jab, s.riley), true);
      assert.notEqual(f.state, 'stagger');
    } finally {
      h.destroy();
    }
  });
});

// Test 11
test('fade: at 0 HP it kneels and melts away, never knocked down', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = place(h);
      const n0 = h.resources().lights;

      const states = [];
      const origSetState = f.setState.bind(f);
      f.setState = function(name, anim, ...args) {
        states.push(name);
        return origSetState(name, anim, ...args);
      };

      toPhase(h, f, 3);
      f.startSplit();
      run(h, 2.0, () => f.copies.length === 2);
      f.auraOn = true;

      let clearStep = 0;
      f.takeHit({ dmg: 999, kind: 'heavy', kb: 300, down: true }, s.riley);
      assert.equal(f.state, 'defeated');
      assert.equal(f.copies.length, 0);
      assert.equal(f.auraActive, false);
      assert.equal(s.victoryPending, true);

      let sawMeltingLit = false;
      for (let i = 0; i < 300; i++) {
        h.step();
        clearStep++;
        if (f.melting && f.sprite.lit === true) sawMeltingLit = true;
        if (f.gone) break;
      }
      assert.ok(sawMeltingLit, 'must see melting with real Fade lit');
      assert.equal(f.gone, true);
      assert.ok(!states.includes('down'), 'never knocked down');
      assert.ok(!states.includes('dead'), 'never dead');

      assert.equal(s.vignette.strength, 0.35);
      assert.equal(h.resources().lights, n0);

      while (!h.observations.hud.some(o => o.method === 'stageClear')) {
        h.step();
        clearStep++;
        if (clearStep > 600) break;
      }
      assert.ok(Math.abs(clearStep - 456) <= 5, `clearStep ${clearStep} should be ~456 (7.6s)`);
      assert.equal(s.ended, true);
    } finally {
      h.destroy();
    }
  });
});

// Test 12
test('fade: restarting mid-blink, mid-fear or mid-split leaves nothing behind and the vignette at exactly 0.35', () => {
  q.set('flash', '0');
  try {
    const cases = ['mid-blink', 'mid-fear', 'mid-split'];
    for (const c of cases) {
      withSeed(1, () => {
        const h = stage3Simulation({ mode: '' });
        try {
          const s = h.s;
          const f = place(h);
          const L0 = h.resources().lights;

          if (c === 'mid-blink') {
            f.cool = 0;
            f.nextBlink = 0;
            run(h, 2.0, () => f.state === 'sunk' && f.pool);
          } else if (c === 'mid-fear') {
            toPhase(h, f, 2);
            f.startFear();
            run(h, 2.0, () => Math.abs(s.vignette.strength - 0.75) < 1e-9);
          } else if (c === 'mid-split') {
            toPhase(h, f, 3);
            f.startSplit();
            run(h, 2.0, () => f.copies.length === 2);
          }

          const v0 = s.vignette;
          s.scene.restart();
          h.step();

          assert.equal(h.observations.restarts, 1);
          assert.equal(s.stageNo, 3);
          assert.ok(s.kit instanceof Stage3Kit);
          assert.ok(!s.enemies.some(e => e instanceof Myrddraal || e instanceof FadeCopy));
          assert.equal(s.boss, null);
          assert.ok(h.resources().lights <= L0);
          assert.notEqual(s.vignette, v0);
          assert.equal(s.vignette.strength, 0.35);

          for (let i = 0; i < 60; i++) {
            h.step();
            assert.equal(s.vignette.strength, 0.35);
          }
        } finally {
          h.destroy();
        }
      });
    }
  } finally {
    q.delete('flash');
  }
});

test('fade: a fireball cast at fear 0.95 completes, spawns and dispels the aura', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = armAura(h);
      s.riley.saidin = 100;
      f.fear = 0.95;
      s.riley.startCast();
      const saidinAfter = s.riley.saidin;
      const cost = s.powers ? s.powers.castCost() : 34;
      assert.equal(100 - saidinAfter, cost);
      let sawHurt = false, sawFireball = false, lowest = saidinAfter;
      for (let i = 0; i < 60 && s.riley.state === 'cast'; i++) {
        hold(h, f);
        if (s.riley.state === 'hurt') sawHurt = true;
        if (s.fireballs.length >= 1) sawFireball = true;
        lowest = Math.min(lowest, s.riley.saidin);
      }
      assert.notEqual(s.riley.state, 'cast');
      assert.equal(sawHurt, false);
      assert.equal(s.riley.cast_fired, true);
      assert.equal(sawFireball, true);
      assert.equal(s.kit.stats.shaken || 0, 0);
      assert.equal(s.kit.stats.dispels, 1);
      assert.equal(f.auraActive, false);
      assert.ok(f.dispelT > 0);
      assert.ok(lowest >= saidinAfter, `saidin dipped to ${lowest} after one charge of ${saidinAfter}`);
      assert.ok(s.riley.saidin >= saidinAfter, 'cast cost was not charged again');
    } finally {
      h.destroy();
    }
  });
});

test('fade: the fear meter does not fill while Riley is hurt, casting or in Balefire', () => {
  const cases = [
    { name: 'hurt', enter: (s) => s.riley.setState('hurt', 'hurt') },
    { name: 'cast', enter: (s) => { s.riley.saidin = 100; s.riley.startCast(); } },
    { name: 'balefire', enter: (s) => { s.riley.saidin = 100; s.riley.startBalefire(); } },
  ];
  for (const { name, enter } of cases) {
    withSeed(1, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        const f = armAura(h);
        enter(s);
        f.fear = 0.5;
        f.dispelT = 0;
        const shaken = s.kit.stats.shaken || 0;
        let prev = f.fear;
        let steps = 0;
        while (steps < 180) {
          hold(h, f);
          if (s.riley.state !== name) break;
          assert.ok(f.fear <= prev + 1e-9, `${name} fear ${f.fear} rose from ${prev}`);
          prev = f.fear;
          steps++;
        }
        assert.ok(steps > 0, `${name} should last at least one frame`);
        assert.equal(s.kit.stats.shaken || 0, shaken, name);
      } finally {
        h.destroy();
      }
    });
  }
});

test('fade: a copy lunge does not fill the fear meter', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = armAura(h, 150);
      f.makeCopies();
      const c = f.copies[0];
      c.startLunge();
      c.x = f.x + 900;
      f.fear = 0.5;
      f.braveT = 0;
      f.dispelT = 0;
      let prev = f.fear;
      let lunging = 0;
      for (let i = 0; i < 30 && c.state === 'lunge' && s.riley.state !== 'hurt'; i++) {
        hold(h, f);
        assert.equal(c.state, 'lunge');
        assert.ok(f.fear <= prev + 1e-9, `fear ${f.fear} rose from ${prev} during a copy lunge`);
        prev = f.fear;
        lunging++;
      }
      assert.ok(lunging > 0, 'the copy should lunge while Riley is still free');
      assert.ok(f.fear < 0.5);
      assert.equal(s.kit.stats.shaken || 0, 0);
    } finally {
      h.destroy();
    }
  });
});

test('fade: after a shake the meter stays empty for FADE.fear.brave', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = armAura(h);
      f.fear = 0;
      f.braveT = 0;
      let first = null, second = null;
      const emptyFor = FADE.fear.brave * 60 - 2;
      for (let i = 0; i < 800 && second === null; i++) {
        hold(h, f);
        const shaken = s.kit.stats.shaken || 0;
        if (first === null && shaken >= 1) {
          first = i;
          assert.equal(f.fear, 0);
        } else if (first !== null) {
          const since = i - first;
          if (since <= emptyFor) assert.equal(f.fear, 0, `fear ${f.fear} at +${since}`);
          if (shaken >= 2) second = i;
        }
      }
      assert.ok(first !== null, 'first shake');
      const gap = second - first;
      const expect = (FADE.fear.brave + FADE.fear.fill) * 60;
      assert.ok(Math.abs(gap - expect) <= 3, `second shake gap ${gap} vs ${expect}`);
    } finally {
      h.destroy();
    }
  });
});

test('fade: shaken duty cycle stays at or under 25% over 20 s of phase 2 at melee range', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const s = h.s;
      const f = armAura(h, 150);
      f.fear = 0;
      f.braveT = 0;
      let hurtFrames = 0;
      for (let i = 0; i < 1200; i++) {
        hold(h, f);
        if (s.riley.state === 'hurt') hurtFrames++;
      }
      const shaken = s.kit.stats.shaken || 0;
      assert.ok(hurtFrames / 1200 <= 0.25, `hurtFrames ${hurtFrames} / 1200`);
      assert.equal(shaken, 7);
    } finally {
      h.destroy();
    }
  });
});

// Test 13
test('fade: Stage 3 startBoss spawns the Myrddraal and plays its intro', () => {
  q.set('skip', 'boss');
  try {
    withSeed(1, () => {
      const h = stage3Simulation({ mode: '' });
      try {
        const s = h.s;
        vig(s);
        let recordedCool = null, bossBarCalls = 0;
        const origBossBar = s.hud.bossBar.bind(s.hud);
        s.hud.bossBar = (b) => {
          bossBarCalls++;
          recordedCool = b.cool;
          return origBossBar(b);
        };

        s.inp.held.right = true;
        let sawIntro = false;
        for (let i = 0; i < 1200; i++) {
          h.step();
          if (s.boss) {
            if (s.boss.state === 'intro') sawIntro = true;
            if (s.boss.introDone) break;
          }
        }
        assert.ok(s.boss instanceof Myrddraal, 'boss should be Myrddraal');
        assert.equal(recordedCool, STAGE3.boss.cool);
        assert.equal(bossBarCalls, 1);
        assert.ok(sawIntro, 'must see intro state');
        assert.equal(s.boss.introDone, true);
        assert.equal(STAGE3.boss.introVoice, 'fade_intro_01');
        assert.deepEqual(STAGE3.phaseLines, {
          2: { say: 'fade_mid_01', flash: 'THE MYRDDRAAL SPREADS ITS FEAR' },
          3: { say: 'fade_split_01', flash: 'WHICH SHADOW IS REAL?' }
        });
        assert.equal(s.vignette.strength, 0.35);
      } finally {
        h.destroy();
      }
    });
  } finally {
    q.delete('skip');
  }
});
