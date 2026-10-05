import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';

const { HUD, MASH_NEED, mashRing, fearArc, drawStage3Meters } = await import('../src/hud.js');
const { CUTTHROAT } = await import('../src/darkfriends.js');
const { Myrddraal } = await import('../src/myrddraal.js');

test('mash ring shows only while Riley is grabbed and each press fills it by one sixth', () => withSeed(1, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s;
    arena(s);
    assert.equal(mashRing(s.riley), null);

    const recordingG = {
      calls: [],
      lineStyle(...args) { this.calls.push(['lineStyle', ...args]); return this; },
      strokeCircle(...args) { this.calls.push(['strokeCircle', ...args]); return this; },
      beginPath(...args) { this.calls.push(['beginPath', ...args]); return this; },
      arc(...args) { this.calls.push(['arc', ...args]); return this; },
      strokePath(...args) { this.calls.push(['strokePath', ...args]); return this; },
    };

    drawStage3Meters(s, recordingG);
    assert.equal(recordingG.calls.length, 0);

    assert.equal(MASH_NEED, CUTTHROAT.mashNeed);

    const c = placeC(s, -50);
    c.startHold(s.riley);
    assert.equal(s.riley.state, 'grabbed');
    assert.equal(s.riley.grabbedBy, c);

    assert.ok(Math.abs(mashRing(s.riley).fill - 0) < 1e-9);

    for (let i = 1; i < MASH_NEED; i++) {
      c.mash();
      const expected = i / MASH_NEED;
      const ring = mashRing(s.riley);
      assert.ok(ring, `mashRing non-null at press ${i}`);
      assert.ok(Math.abs(ring.fill - expected) < 1e-9, `fill ${ring.fill} equals ${expected} at press ${i}`);
    }

    recordingG.calls = [];
    drawStage3Meters(s, recordingG);
    assert.ok(recordingG.calls.length > 0, 'drawStage3Meters draws while grabbed');
    assert.ok(recordingG.calls.some(entry => entry[0] === 'strokeCircle'));

    // 6th mash triggers the escape
    c.mash();
    assert.equal(mashRing(s.riley), null);
    recordingG.calls = [];
    drawStage3Meters(s, recordingG);
    assert.equal(recordingG.calls.length, 0);

    // null after a throw
    c.startHold(s.riley);
    assert.ok(mashRing(s.riley));
    c.releaseHold('throw');
    s.riley.grabbedBy = null;
    s.riley.state = 'idle';
    assert.equal(mashRing(s.riley), null);
    recordingG.calls = [];
    drawStage3Meters(s, recordingG);
    assert.equal(recordingG.calls.length, 0);
  } finally {
    h.destroy();
  }
}));

test('fear arc shows only in Myrddraal phase 2 or later with the aura raised', () => withSeed(2, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s;
    arena(s);
    const boss = new Myrddraal(s, 1000, 630);
    boss.entering = false;
    boss.introDone = true;
    s.boss = boss;

    // phase 1 with fear 0.5 -> null
    boss.phase = 1;
    boss.fear = 0.5;
    boss.auraOn = false;
    assert.equal(fearArc(s), null);
    boss.auraOn = true;
    assert.equal(fearArc(s), null);

    // phase 2 before the aura -> null
    boss.phase = 2;
    boss.auraOn = false;
    boss.fear = 0.5;
    assert.equal(fearArc(s), null);

    // aura on -> fill === boss.fear
    boss.auraOn = true;
    boss.fear = 0.42;
    assert.deepEqual(fearArc(s), { fill: 0.42 });

    boss.fear = 0.75;
    assert.deepEqual(fearArc(s), { fill: 0.75 });

    // Stage 1/2 bosses -> null
    assert.equal(fearArc({ stageNo: 1, boss }), null);
    assert.equal(fearArc({ stageNo: 2, boss }), null);

    // defeated -> null
    boss.state = 'defeated';
    assert.equal(fearArc(s), null);
    boss.alive = false;
    assert.equal(fearArc(s), null);
  } finally {
    h.destroy();
  }
}));

test('Stage 3 hints show once each per run and again after a restart', () => withSeed(3, () => {
  const h = stage3Simulation({ mode: '', followRestart: true });
  try {
    const s = h.s;
    arena(s);

    const flashed = [];
    const origFlash = s.hud.flashText.bind(s.hud);
    s.hud.flashText = (t) => { flashed.push(t); origFlash(t); };

    // 1. grabbed: startHold twice
    const c = placeC(s, -50);
    c.startHold(s.riley);
    c.releaseHold('break');
    s.riley.grabbedBy = null;
    s.riley.state = 'idle';
    c.startHold(s.riley);
    c.releaseHold('break');
    s.riley.grabbedBy = null;
    s.riley.state = 'idle';

    // 2. copies: makeCopies twice
    const boss = new Myrddraal(s, 1000, 630);
    boss.entering = false;
    boss.introDone = true;
    s.boss = boss;
    s.enemies.push(boss);
    boss.makeCopies();
    boss.makeCopies();

    // 3. fear: startFear stepped to its aura frame twice
    boss.auraOn = false;
    boss.startFear();
    for (let i = 0; i < 60 && !boss.auraOn; i++) h.step();
    assert.equal(boss.auraOn, true);

    boss.auraOn = false;
    boss.startFear();
    for (let i = 0; i < 60 && !boss.auraOn; i++) h.step();

    // 4. counter: cutthroat counter during lunge twice
    const c2 = placeC(s, -150);
    c2.startLunge();
    for (let i = 0; i < 60 && c2.fi < 1; i++) h.step();
    assert.ok(c2.fi >= 1);
    c2.takeHit({ dmg: 5 }, s.riley);

    c2.cool = 0;
    c2.startLunge();
    for (let i = 0; i < 60 && c2.fi < 1; i++) h.step();
    assert.ok(c2.fi >= 1);
    c2.takeHit({ dmg: 5 }, s.riley);

    assert.equal(flashed.filter(t => t === 'GRABBED! MASH TO BREAK FREE').length, 1);
    const copyHints = flashed.filter(t => t.startsWith('ONLY THE REAL ONE CASTS A SHADOW'));
    assert.equal(copyHints.length, 1);
    assert.ok(copyHints[0].startsWith('ONLY THE REAL ONE CASTS A SHADOW'));
    assert.equal(flashed.filter(t => t === 'FEAR AURA! FIRE OR LIGHTNING DRIVES IT BACK').length, 1);
    assert.equal(flashed.filter(t => t === 'COUNTER!').length, 1);

    // after followRestart each shows once again
    s.scene.restart({ stage: 3 });
    h.step();
    arena(s);

    flashed.length = 0;

    const rc = placeC(s, -50);
    rc.startHold(s.riley);
    rc.releaseHold('break');
    s.riley.grabbedBy = null;
    s.riley.state = 'idle';

    const rboss = new Myrddraal(s, 1000, 630);
    rboss.entering = false;
    rboss.introDone = true;
    s.boss = rboss;
    s.enemies.push(rboss);
    rboss.makeCopies();

    rboss.auraOn = false;
    rboss.startFear();
    for (let i = 0; i < 60 && !rboss.auraOn; i++) h.step();
    assert.equal(rboss.auraOn, true);

    const rc2 = placeC(s, -150);
    rc2.startLunge();
    for (let i = 0; i < 60 && rc2.fi < 1; i++) h.step();
    assert.ok(rc2.fi >= 1);
    rc2.takeHit({ dmg: 5 }, s.riley);

    assert.equal(flashed.filter(t => t === 'GRABBED! MASH TO BREAK FREE').length, 1);
    assert.equal(flashed.filter(t => t.startsWith('ONLY THE REAL ONE CASTS A SHADOW')).length, 1);
    assert.equal(flashed.filter(t => t === 'FEAR AURA! FIRE OR LIGHTNING DRIVES IT BACK').length, 1);
    assert.equal(flashed.filter(t => t === 'COUNTER!').length, 1);
  } finally {
    h.destroy();
  }
}));

test("the ribbon counter and clear card carry Stage 3's ribbon", () => withSeed(4, () => {
  const h = stage3Simulation({ mode: '' });
  try {
    const s = h.s;
    arena(s);

    const ribbonCalls = [];
    s.hud.ribbon = (n) => { ribbonCalls.push(n); };

    const pickup = { x: s.riley.x, y: s.riley.y, kind: 'ribbon' };
    s.kit.collectRibbon(pickup);

    assert.deepEqual(ribbonCalls, [1]);
    assert.equal(s.kit.ribbons, 1);
    assert.equal(s.kit.stats.ribbon, 1);

    const added = [];
    const fakeHud = Object.create(HUD.prototype);
    fakeHud.card = {
      removeAll() {},
      add(item) {
        if (Array.isArray(item)) added.push(...item);
        else added.push(item);
      }
    };
    fakeHud.add = {
      graphics: () => ({ fillStyle() {}, fillRect() {} }),
      text: (x, y, text) => ({
        x,
        y,
        text,
        setOrigin() { return this; }
      })
    };
    fakeHud.game = { inp: { isTouch: false } };

    added.length = 0;
    fakeHud.stageClear({ stage: 3, ribbons: 1, score: 1000, combo: 5, time: 60 });
    assert.ok(added.some(item => item.text === "TWINKLE TOES' RIBBON FOUND"));

    added.length = 0;
    fakeHud.stageClear({ stage: 1, ribbons: 1, score: 1000, combo: 5, time: 60 });
    assert.ok(!added.some(item => item.text === "TWINKLE TOES' RIBBON FOUND"));

    added.length = 0;
    fakeHud.stageClear({ stage: 2, ribbons: 1, score: 1000, combo: 5, time: 60 });
    assert.ok(added.some(item => item.text === "TWINKLE TOES' RIBBON FOUND"));

    added.length = 0;
    fakeHud.stageClear({ stage: 2, ribbons: 0, score: 1000, combo: 5, time: 60 });
    assert.ok(!added.some(item => item.text === "TWINKLE TOES' RIBBON FOUND"));
  } finally {
    h.destroy();
  }
}));
