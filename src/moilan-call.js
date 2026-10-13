// Stage 7+ assist rules. Pure state; the scene owns presentation and scoring.
export const CALL7 = Object.freeze({
  charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 3, perPhase: 1,
  bossFrac: 0.06, fadeFrac: 0.75, humanFrac: 0.6, fadeDown: 2, humanDown: 1.6,
  inv: 2, stagger: 1, gates: Object.freeze([0.66, 0.33]),
  moiraine: Object.freeze({ kos: 6, rocks: 6, rockGap: 0.1 }),
  lan: Object.freeze({ kos: 3, eliteFrac: 1, eliteFracHealthy: 0.75, dash: 0.45 }),
});
export function pickHelper(ctx = {}) {
  if (ctx.boss) return 'duo';
  if (ctx.spawnOnScreen >= 3) return 'moiraine';
  if (ctx.eliteOnScreen || ctx.humansOnScreen >= 1) return 'lan';
  return 'moiraine';
}
export function createCall7() { return { charges: 1, calls: 0, kos: 0, since: 45, phaseCalls: Object.create(null), on: false }; }
export function noteRileyKo(st) { if (st && st.charges < 1 && st.calls < CALL7.maxCalls) st.kos++; return st?.kos || 0; }
export function tickCall7(st, dt) {
  if (!st || !Number.isFinite(dt) || dt <= 0) return st;
  st.since += dt;
  if (st.charges < 1 && st.calls < CALL7.maxCalls && st.kos >= CALL7.kos && st.since >= CALL7.recharge) { st.charges = 1; st.kos = 0; }
  return st;
}
export function refuseReason(st, c = {}) {
  if (!st) return 'nostate';
  if (c.paused || c.cutscene) return 'paused';
  if (c.victory || c.dead) return 'victory';
  if (st.on || c.strike) return 'busy';
  if (c.balefire) return 'balefire';
  if (!c.hittable) return 'empty';
  if (c.bossInvuln || c.bossBeat) return 'boss';
  if (st.charges < 1 || st.calls >= CALL7.maxCalls) return 'spent';
  if (c.bossPhase && (st.phaseCalls[c.bossPhase] || 0) >= CALL7.perPhase) return 'phase';
  return '';
}
export const canCall = (st, c) => refuseReason(st, c) === '';
export function takeCall(st, c) {
  const why = refuseReason(st, c); if (why) return { ok: false, why };
  st.charges = 0; st.calls++; st.since = 0; st.kos = 0; st.on = true;
  if (c.bossPhase) st.phaseCalls[c.bossPhase] = (st.phaseCalls[c.bossPhase] || 0) + 1;
  return { ok: true, helper: pickHelper(c) };
}
export const human = e => e?.type === 'dancer' || e?.type === 'veiled';
export const shadowspawn = e => ['grunt', 'spear', 'hound'].includes(e?.type);
export function eligibleTargets(enemies = [], camX = 0, width = 1280) {
  return enemies.filter(e => e?.alive && !e.entering && e.canBeHit !== false && !e.silhouette && e.x >= camX - 60 && e.x <= camX + width + 60 && (human(e) || shadowspawn(e) || e.type === 'fadelt' || e.type === 'asmodean'));
}
export function helperContext(list, bossZone = false) {
  return { boss: bossZone, spawnOnScreen: list.filter(shadowspawn).length, eliteOnScreen: list.some(e => e.type === 'fadelt'), humansOnScreen: list.filter(human).length };
}
export function allocateStrikes(list, helper, y) {
  if (helper === 'duo') return list.filter(e => e.type === 'asmodean');
  const touched = helper === 'lan' ? list.filter(e => Math.abs(e.y - y) < 40) : list;
  let n = 0, cap = helper === 'lan' ? CALL7.lan.kos : CALL7.moiraine.kos;
  return touched.filter(e => human(e) || (e.type === 'fadelt' ? helper === 'lan' : shadowspawn(e) && n++ < cap));
}
export function callEffect(e, helper) {
  if (!e?.alive || e.canBeHit === false) return null;
  if (e.type === 'asmodean') {
    if (helper !== 'duo' || e.invuln || e.beat) return null;
    const floor = e.phase >= 3 ? 1 : Math.floor(e.maxHp * CALL7.gates[(e.phase || 1) - 1]);
    const dmg = Math.max(0, Math.min(e.maxHp * CALL7.bossFrac, e.hp - floor));
    e.takeHit?.({ dmg, assist: true });
    if (!e.beat) e.stagger?.(CALL7.stagger);
    return { dmg, killed: false };
  }
  if (human(e)) {
    if (helper === 'lan' && e.hp < e.maxHp * 0.2) { e.assistKill = true; e.yield?.(); return { yielded: true, killed: false }; }
    const before = e.hp;
    if (helper === 'moiraine') e.hp = Math.max(1, e.hp * (1 - CALL7.humanFrac));
    e.assistDown = CALL7.humanDown; e.state = 'down'; e.st = 0;
    return { dmg: before - e.hp, killed: false };
  }
  if (e.type === 'fadelt' && e.hp >= e.maxHp * 0.5) {
    e.hp = Math.max(1, e.hp * (1 - CALL7.lan.eliteFracHealthy)); e.randDown = CALL7.fadeDown; e.state = 'down'; e.st = 0;
    return { killed: false };
  }
  if (shadowspawn(e) || e.type === 'fadelt') {
    e.assistKill = true; e.T = { ...e.T, score: Math.floor((e.T?.score || 0) / 2) }; e.die?.(1, { kb: 200 });
    return { killed: true };
  }
  return null;
}
