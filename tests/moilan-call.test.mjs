import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CALL7, createCall7, noteRileyKo, tickCall7, refuseReason, trySpend, pickHelper, moiraineEffect, lanEffect, duoEffect, bossFloor, planStrike } from '../src/moilan-call.js';

const ctx = (over = {}) => ({ hittable: true, paused: false, cutscene: false, victory: false, balefire: false, bossInvuln: false, bossBeat: false, ...over });
const foe = (type, over = {}) => ({ type, alive: true, entering: false, canBeHit: true, x: 200, y: 630, hp: 100, maxHp: 100, T: { score: 100 }, die() { this.alive = false; this.hp = 0; }, ...over });

test('a fresh call has one charge and the Rand-shaped caps', () => {
  const st = createCall7();
  assert.equal(st.charges, 1);
  assert.equal(st.calls, 0);
  assert.equal(CALL7.kos, 10);
  assert.equal(CALL7.recharge, 45);
  assert.equal(CALL7.maxCalls, 3);
  assert.equal(CALL7.perPhase, 1);
});

test('recharge needs 10 Riley KOs and 45s', () => {
  const st = createCall7();
  trySpend(st, ctx());
  assert.equal(st.charges, 0);
  for (let i = 0; i < 10; i++) noteRileyKo(st);
  tickCall7(st, 44);
  assert.equal(st.charges, 0);
  tickCall7(st, 1);
  assert.equal(st.charges, 1);
  assert.equal(st.kos, 0);
});

test('the same recharge clock at 30, 60 and 120 Hz', () => {
  const run = dt => {
    const st = createCall7();
    trySpend(st, ctx());
    st.on = false;
    for (let i = 0; i < 10; i++) noteRileyKo(st);
    let n = 0;
    while (st.charges < 1 && n < 10000) { tickCall7(st, dt); n++; }
    return n;
  };
  const a = run(1 / 30), b = run(1 / 60), c = run(1 / 120);
  assert.ok(Math.abs(a / 30 - b / 60) < 0.05);
  assert.ok(Math.abs(a / 30 - c / 120) < 0.05);
});

test('a refusal spends nothing, including a mirrored randOn busy flag', () => {
  for (const why of ['paused', 'victory', 'balefire', 'empty', 'boss']) {
    const st = createCall7();
    const over = why === 'paused' ? { paused: true } : why === 'victory' ? { victory: true } : why === 'balefire' ? { balefire: true } : why === 'empty' ? { hittable: false } : { bossInvuln: true };
    const out = trySpend(st, ctx(over));
    assert.equal(out.ok, false, why);
    assert.equal(st.charges, 1, why);
  }
  const busy = createCall7();
  assert.equal(trySpend(busy, ctx({ randOn: true })).why, 'busy');
  const phase = createCall7();
  trySpend(phase, ctx({ bossPhase: 1 }));
  phase.on = false; phase.charges = 1;
  assert.equal(refuseReason(phase, ctx({ bossPhase: 1 })), 'phase');
  assert.equal(trySpend(phase, ctx({ bossPhase: 2 })).ok, true);
});

test('three calls a stage is the cap', () => {
  const st = createCall7();
  for (let i = 0; i < 3; i++) { st.charges = 1; st.on = false; assert.equal(trySpend(st, ctx()).ok, true); }
  st.charges = 1; st.on = false;
  assert.equal(trySpend(st, ctx()).why, 'spent');
});

test('pickHelper follows the boss, crowd, elite, human table', () => {
  assert.equal(pickHelper({ boss: true }), 'duo');
  assert.equal(pickHelper({ zoneI: 3 }), 'duo');
  assert.equal(pickHelper({ spawnOnScreen: 3 }), 'moiraine');
  assert.equal(pickHelper({ eliteOnScreen: true }), 'lan');
  assert.equal(pickHelper({ humansOnScreen: 1 }), 'lan');
  assert.equal(pickHelper({}), 'moiraine');
});

test('shadowspawn ash, humans live, and the duo cannot skip a gate or kill', () => {
  const t = foe('grunt', { hp: 40, maxHp: 40 });
  const fx = moiraineEffect(t);
  assert.equal(fx.killed, true);
  assert.equal(t.hp, 0);
  const human = foe('dancer', { hp: 50, maxHp: 60 });
  moiraineEffect(human);
  assert.ok(human.hp >= 1);
  assert.equal(human.alive !== false, true);
  const low = foe('veiled', { hp: 7, maxHp: 40, y: 630 });
  const ly = lanEffect(low, 630);
  assert.equal(ly.yield, true);
  assert.ok(low.hp >= 1);
  const boss = { type: 'asmodean', alive: true, hp: 600, maxHp: 600, phase: 1, enter(ph) { this.phase = ph; this.hp = Math.floor(this.maxHp * (ph === 2 ? 0.66 : 0.33)); } };
  const hit = duoEffect(boss);
  assert.equal(hit.dmg, 36);
  assert.equal(boss.hp, 564);
  assert.equal(boss.state, 'stagger');
  boss.hp = 400; boss.phase = 1; boss.invuln = false; boss.beat = false;
  duoEffect(boss);
  assert.equal(boss.phase, 2);
  assert.ok(boss.hp >= bossFloor({ phase: 1, maxHp: 600 }));
  const end = { type: 'asmodean', alive: true, hp: 40, maxHp: 600, phase: 3 };
  duoEffect(end);
  assert.ok(end.hp >= 1);
  const plan = planStrike('moiraine', [t, human], 0, 630, 1280);
  assert.equal(plan.helper, 'moiraine');
});
