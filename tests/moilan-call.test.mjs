import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CALL7, pickHelper, createCall7, noteRileyKo7, tickCall7, refuseReason7, trySpend7,
  moiraineEffect, lanEffect, duoBossEffect, bossFloor7, helperCtx, kind7,
} from '../src/moilan-call.js';

const ctx = (over = {}) => ({ hittable: true, paused: false, cutscene: false, victory: false, balefire: false, bossInvuln: false, bossBeat: false, ...over });
const foe = (type, over = {}) => ({ type, alive: true, entering: false, canBeHit: true, x: 200, y: 630, hp: 100, maxHp: 100, T: { score: 200 }, ...over });

test('pickHelper: boss is duo, 3+ spawn is Moiraine, elite or any human is Lan', () => {
  assert.equal(pickHelper({ boss: true, spawnOnScreen: 0, eliteOnScreen: false, humansOnScreen: 0 }), 'duo');
  assert.equal(pickHelper({ boss: false, spawnOnScreen: 3, eliteOnScreen: false, humansOnScreen: 0 }), 'moiraine');
  assert.equal(pickHelper({ boss: false, spawnOnScreen: 2, eliteOnScreen: true, humansOnScreen: 0 }), 'lan');
  assert.equal(pickHelper({ boss: false, spawnOnScreen: 0, eliteOnScreen: false, humansOnScreen: 1 }), 'lan');
  assert.equal(pickHelper({ boss: false, spawnOnScreen: 1, eliteOnScreen: false, humansOnScreen: 0 }), 'moiraine');
  assert.equal(pickHelper(null), 'moiraine');
  assert.equal(pickHelper(helperCtx([foe('dancer'), foe('grunt')], 0, 1280, false)), 'lan');
  assert.equal(pickHelper(helperCtx([foe('grunt'), foe('spear'), foe('grunt', { x: 300 })], 0, 1280, false)), 'moiraine');
  assert.equal(pickHelper(helperCtx([], 0, 1280, true)), 'duo');
});

test('charge rules mirror Stage 6: 1 charge, 10 KOs and 45 s, 3 calls, 1 per boss phase', () => {
  assert.equal(CALL7.charges, 1); assert.equal(CALL7.kos, 10); assert.equal(CALL7.recharge, 45);
  assert.equal(CALL7.maxCalls, 3); assert.equal(CALL7.perPhase, 1);
  const st = createCall7();
  assert.equal(st.charges, 1);
  assert.deepEqual(trySpend7(st, ctx()), { ok: true, why: '' });
  assert.equal(st.charges, 0); assert.equal(st.calls, 1); assert.equal(st.since, 0);
  st.on = false;
  for (let i = 0; i < 10; i++) noteRileyKo7(st);
  tickCall7(st, 44); assert.equal(st.charges, 0);
  tickCall7(st, 1); assert.equal(st.charges, 1); assert.equal(st.kos, 0);
  // one call per boss phase
  const st2 = createCall7();
  assert.equal(trySpend7(st2, ctx({ bossPhase: 2 })).ok, true);
  st2.on = false; st2.charges = 1;
  assert.equal(refuseReason7(st2, ctx({ bossPhase: 2 })), 'phase');
  assert.equal(refuseReason7(st2, ctx({ bossPhase: 3 })), '');
});

test('a refusal spends nothing', () => {
  for (const [over, why] of [[{ paused: true }, 'paused'], [{ victory: true }, 'victory'], [{ balefire: true }, 'balefire'], [{ hittable: false }, 'empty'], [{ bossInvuln: true }, 'boss']]) {
    const st = createCall7();
    const out = trySpend7(st, ctx(over));
    assert.equal(out.ok, false, why); assert.equal(out.why, why);
    assert.equal(st.charges, 1); assert.equal(st.calls, 0);
  }
  const spent = createCall7(); spent.calls = 3;
  assert.equal(refuseReason7(spent, ctx()), 'spent');
});

test('Moiraine ashes Shadowspawn but never kills a human or the fadelt outright', () => {
  const g = foe('grunt');
  const fx = moiraineEffect(g);
  assert.equal(fx.killed, true); assert.equal(g.hp, 0); assert.equal(g.callKill, true); assert.equal(fx.score, 100);
  const d = foe('dancer', { hp: 60, maxHp: 60 });
  const hd = moiraineEffect(d);
  assert.equal(hd.killed, false); assert.ok(d.hp >= 1, 'a Shaido is downed, never killed');
  assert.equal(d.callDown, CALL7.humanDown);
  const f = foe('fadelt', { hp: 10, maxHp: 200 });
  assert.equal(moiraineEffect(f).killed, false); assert.ok(f.hp >= 1);
  assert.equal(moiraineEffect(foe('asmodean')), null);
});

test('Lan kills a fadelt under half HP, strips 75 percent from a healthy one, yields a beaten human', () => {
  const weak = foe('fadelt', { hp: 40, maxHp: 100 });
  assert.equal(lanEffect(weak).killed, true); assert.equal(weak.hp, 0);
  const strong = foe('fadelt', { hp: 100, maxHp: 100 });
  const fx = lanEffect(strong);
  assert.equal(fx.killed, false); assert.equal(strong.hp, 25);
  const beaten = foe('veiled', { hp: 7, maxHp: 40 });
  const y = lanEffect(beaten);
  assert.equal(y.yield, true, 'under 20 percent a human yields instead of dying to ash');
  const fresh = foe('veiled', { hp: 40, maxHp: 40 });
  assert.equal(lanEffect(fresh).killed, false); assert.ok(fresh.hp >= 1);
});

test('the duo hit is 6 percent, clamps at the next gate, and can never kill through a gate', () => {
  const boss = foe('asmodean', { hp: 600, maxHp: 600, phase: 1 });
  duoBossEffect(boss);
  assert.equal(boss.hp, 600 - 36);
  const nearGate = foe('asmodean', { hp: 400, maxHp: 600, phase: 1 });
  duoBossEffect(nearGate);
  assert.equal(nearGate.hp, Math.floor(600 * 0.66), 'clamped at the 66 percent gate');
  assert.equal(bossFloor7({ phase: 2, maxHp: 600 }), Math.floor(600 * 0.33));
  assert.equal(bossFloor7({ phase: 3, maxHp: 600 }), 1, 'phase 3 has no gate left but still cannot die to a call');
  const last = foe('asmodean', { hp: 20, maxHp: 600, phase: 3 });
  duoBossEffect(last);
  assert.ok(last.hp >= 1);
  assert.equal(duoBossEffect(foe('asmodean', { invuln: true })), null);
});

test('kinds: Shaido and gray men are human, trollocs are spawn, fadelt is the elite', () => {
  assert.equal(kind7(foe('dancer')), 'human');
  assert.equal(kind7(foe('veiled')), 'human');
  assert.equal(kind7(foe('grunt')), 'trolloc');
  assert.equal(kind7(foe('fadelt')), 'fadelt');
  assert.equal(kind7(foe('asmodean')), 'boss');
  assert.equal(kind7(foe('chief')), 'other');
});
