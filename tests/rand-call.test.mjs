import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAND, createRand, noteRileyKo, tickRand, refuseReason, trySpend, randEffect, bossFloor, allocateStrikes, eligibleTargets, callInFor, onScreen, onScreenHittable } from '../src/rand-call.js';
import { q } from '../src/config.js';
import { callRand, installStage6SceneHooks } from '../src/stage6-lifecycle.js';
import { Belal, BELAL } from '../src/belal.js';

const ctx = (over = {}) => ({ hittable: true, paused: false, cutscene: false, victory: false, balefire: false, bossInvuln: false, bossBeat: false, ...over });
const foe = (type, over = {}) => ({ type, alive: true, entering: false, canBeHit: true, x: 200, y: 630, hp: 100, maxHp: 100, T: { score: 100, boss: type === 'belal' }, die() { this.alive = false; this.hp = 0; }, ...over });

test('call-in switches at stage 6 and a fresh Rand has one charge', () => {
  assert.equal(callInFor(5), 'loial');
  assert.equal(callInFor(6), 'rand');
  const st = createRand();
  assert.equal(st.charges, 1);
  assert.equal(st.calls, 0);
  assert.equal(RAND.kos, 10);
  assert.equal(RAND.recharge, 45);
  assert.equal(RAND.maxCalls, 3);
  assert.equal(RAND.perPhase, 1);
});

test('recharge needs 10 Riley KOs and 45s, and Rand kills do not count', () => {
  const st = createRand();
  trySpend(st, ctx());
  assert.equal(st.charges, 0);
  assert.equal(st.since, 0);
  for (let i = 0; i < 10; i++) noteRileyKo(st);
  tickRand(st, 44);
  assert.equal(st.charges, 0);
  tickRand(st, 1);
  assert.equal(st.charges, 1);
  assert.equal(st.kos, 0);
});

test('the same recharge clock at 30, 60 and 120 Hz', () => {
  const run = dt => {
    const st = createRand();
    trySpend(st, ctx());
    st.on = false;
    for (let i = 0; i < 10; i++) noteRileyKo(st);
    let n = 0;
    while (st.charges < 1 && n < 10000) { tickRand(st, dt); n++; }
    return { charges: st.charges, n };
  };
  const a = run(1 / 30), b = run(1 / 60), c = run(1 / 120);
  assert.equal(a.charges, 1);
  assert.equal(b.charges, 1);
  assert.equal(c.charges, 1);
  assert.ok(Math.abs(a.n / 30 - b.n / 60) < 0.05);
  assert.ok(Math.abs(a.n / 30 - c.n / 120) < 0.05);
});

test('a refusal spends nothing', () => {
  for (const why of ['paused', 'victory', 'balefire', 'empty', 'boss']) {
    const st = createRand();
    const over = why === 'paused' ? { paused: true } : why === 'victory' ? { victory: true } : why === 'balefire' ? { balefire: true } : why === 'empty' ? { hittable: false } : { bossInvuln: true };
    const out = trySpend(st, ctx(over));
    assert.equal(out.ok, false, why);
    assert.equal(st.charges, 1, why);
    assert.equal(st.calls, 0, why);
  }
  const busy = createRand(); busy.on = true;
  assert.equal(trySpend(busy, ctx()).ok, false);
  assert.equal(busy.calls, 0);
  const phase = createRand();
  trySpend(phase, ctx({ bossPhase: 1 }));
  phase.on = false; phase.charges = 1;
  assert.equal(refuseReason(phase, ctx({ bossPhase: 1 })), 'phase');
  assert.equal(trySpend(phase, ctx({ bossPhase: 2 })).ok, true);
});

test('three calls a stage is the cap', () => {
  const st = createRand();
  for (let i = 0; i < 3; i++) {
    st.charges = 1; st.on = false;
    assert.equal(trySpend(st, ctx()).ok, true);
  }
  st.charges = 1; st.on = false;
  assert.equal(trySpend(st, ctx()).why, 'spent');
  assert.equal(st.calls, 3);
});

test('trollocs die, fadelt lives at a quarter, humans are never killed', () => {
  const t = foe('grunt', { hp: 40, maxHp: 40 });
  const fx = randEffect(t);
  assert.equal(fx.killed, true);
  assert.equal(t.hp, 0);
  assert.equal(t.randKill, true);
  assert.equal(fx.score, 50);
  const fade = foe('fadelt', { hp: 120, maxHp: 120 });
  randEffect(fade);
  assert.equal(fade.hp, 30);
  assert.equal(fade.alive !== false, true);
  assert.equal(fade.randDown, 2);
  for (const type of ['cutthroat', 'grayman']) {
    const h = foe(type, { hp: 34, maxHp: 34 });
    randEffect(h);
    assert.ok(h.hp >= 1, type);
    assert.equal(h.hp, Math.max(1, 34 - 34 * 0.6));
    assert.equal(h.randDown, 1.6);
  }
});

test('the boss loses 10 percent, stops at the gate, and is never killed or hit while invulnerable', () => {
  const boss = foe('belal', { hp: 640, maxHp: 640, phase: 1, invuln: false, beat: false });
  const fx = randEffect(boss);
  assert.equal(fx.killed, false);
  assert.equal(boss.hp, 640 - 64);
  assert.equal(boss.randStagger, 1);
  const gated = foe('belal', { hp: 430, maxHp: 640, phase: 1, invuln: false, beat: false });
  randEffect(gated);
  assert.equal(gated.hp, bossFloor(gated));
  assert.equal(gated.hp, 422);
  const late = foe('belal', { hp: 40, maxHp: 640, phase: 3, invuln: false, beat: false });
  randEffect(late);
  assert.equal(late.hp, 1);
  const safe = foe('belal', { hp: 640, maxHp: 640, phase: 1, invuln: true, beat: false });
  assert.equal(randEffect(safe), null);
  assert.equal(safe.hp, 640);
});

test('at most 8 bolts and 4 fires, and entering foes are skipped', () => {
  const list = Array.from({ length: 14 }, (_, i) => foe('grunt', { x: i }));
  const plan = allocateStrikes(list);
  assert.equal(plan.bolts.length, 8);
  assert.equal(plan.fires.length, 4);
  assert.equal(plan.missed.length, 2);
  const off = foe('spear', { entering: true, x: 100 });
  const gone = foe('hound', { x: 9000 });
  assert.deepEqual(eligibleTargets([off, gone, foe('grunt', { x: 100 })], 0, 1280).map(e => e.type), ['grunt']);
  assert.equal(onScreen(foe('grunt', { canBeHit: false }), 0), false);
  assert.equal(onScreenHittable(off, 0, 1280), false);
  assert.equal(onScreenHittable(foe('grunt', { canBeHit: false, x: 100 }), 0, 1280), false);
  assert.equal(onScreenHittable(foe('hatch', { x: 100 }), 0, 1280), false);
  assert.equal(onScreenHittable(foe('grunt', { x: 100 }), 0, 1280), true);
});

test('with cutscenes off the strike still lands, breaks a hold, and leaves 2s of inv', () => {
  q.set('story', '0');
  const released = [];
  const grunt = foe('grunt', { hp: 40, maxHp: 40 });
  const stub = () => { const o = { setOrigin() { return o; }, setScale() { return o; }, setDepth() { return o; }, setScrollFactor() { return o; }, setTint() { return o; }, setAlpha() { return o; }, setBlendMode() { return o; }, destroy() {} }; return o; };
  const s = {
    started: true, stageNo: 6, camX: 0, paused: false, gameOver: false, ended: false,
    time: { now: 0 }, riley: { x: 80, y: 630, inv: 0, alive: true, hp: 100, grabbedBy: { releaseHold(why) { released.push(why); } } },
    enemies: [foe('grunt', { entering: true, x: 200 })], beam: null, boss: null,
    add: { sprite: stub, image: stub },
    lights: { addLight: () => ({ x: 0, y: 0 }), removeLight() {} }, fx: { trauma: 0 },
    update() {},
  };
  const kit = { s, rand: createRand(), stone: { cancelTells() {} } };
  s.kit = kit;
  installStage6SceneHooks(kit);
  try {
    assert.equal(callRand(kit), false);
    assert.equal(kit.rand.charges, 1);
    s.enemies = [grunt];
    assert.equal(callRand(kit), true);
    assert.equal(kit.rand.charges, 0);
    assert.deepEqual(released, ['break']);
    assert.ok(kit.strike);
    assert.equal(s.riley.inv, 0);
    for (let i = 0; i < 30; i++) s.update(0, 1000 / 60);
    assert.ok(kit.strike);
    assert.equal(s.riley.inv, 0);
    for (let i = 0; i < 150; i++) s.update(0, 1000 / 60);
    assert.equal(grunt.hp, 0);
    assert.equal(kit.strike, null);
    assert.ok(s.riley.inv >= 2);
  } finally { q.delete('story'); }
});

test('Belal tells match the spec at 30, 60 and 120 Hz', () => {
  const stub = () => { const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setTint() { return o; }, setBlendMode() { return o; }, destroy() {} }; return o; };
  const run = dt => {
    const scene = { riley: { x: 2000, y: 630, alive: true, hp: 100, facing: 1, state: 'idle', attackFrame: false }, enemies: [], attackTokens: () => 0, bounds: { l: 0, r: 5200 }, add: { image: stub, sprite: stub }, hud: { flashText() {} }, kit: {} };
    const b = new Belal(scene, 400, 630);
    b.state = 'attack'; b.st = 0; b.hitI = 0; b.invuln = false; b.beat = false; b.cool = 0;
    const steps = Math.round(1 / dt);
    for (let i = 0; i < steps; i++) b.update(dt);
    return { state: b.state, hitI: b.hitI, hp: b.hp };
  };
  const a = run(1 / 30);
  assert.deepEqual(a, run(1 / 60));
  assert.deepEqual(a, run(1 / 120));
  assert.ok(BELAL.tells[0] >= 0.55 && BELAL.tells[3] >= 0.6);
  assert.equal(BELAL.hp, 640);
});
