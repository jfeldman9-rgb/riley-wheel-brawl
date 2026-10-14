// Moiraine and Lan call-in rules (Stage 7+). Pure: charges, the helper pick, the damage table.
// One shared charge; the game picks the helper from the situation so touch needs no second button.
import { VW } from './config.js';

export const CALL7 = Object.freeze({
  charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 3, perPhase: 1,
  bossFrac: 0.06, fadeFrac: 0.75, humanFrac: 0.6, fadeDown: 2, humanDown: 1.6,
  inv: 2, stagger: 1, gates: Object.freeze([0.66, 0.33]),
  moiraine: Object.freeze({ kos: 6, rocks: 6, rockGap: 0.1 }),
  lan: Object.freeze({ kos: 3, eliteFrac: 1.0, eliteFracHealthy: 0.75, dash: 0.45 }),
});
const TROLLOC = new Set(['grunt', 'spear', 'hound']);
const HUMAN = new Set(['dancer', 'veiled', 'cutthroat', 'grayman']);

export function pickHelper(ctx) {
  if (!ctx) return 'moiraine';
  if (ctx.boss) return 'duo';
  if ((ctx.spawnOnScreen || 0) >= 3) return 'moiraine';
  if (ctx.eliteOnScreen || (ctx.humansOnScreen || 0) >= 1) return 'lan';
  return 'moiraine';
}

export function createCall7() {
  return { charges: CALL7.charges, calls: 0, kos: 0, since: CALL7.recharge, phaseCalls: Object.create(null), on: false };
}

export function noteRileyKo7(st) {
  if (!st || st.charges >= CALL7.maxCharges || st.calls >= CALL7.maxCalls) return st?.kos || 0;
  st.kos++;
  return st.kos;
}

export function tickCall7(st, dt) {
  if (!st || !(dt > 0)) return st;
  st.since += dt;
  if (st.charges < 1 && st.calls < CALL7.maxCalls && st.kos >= CALL7.kos && st.since >= CALL7.recharge) {
    st.charges = 1; st.kos = 0;
  }
  return st;
}

export function refuseReason7(st, ctx) {
  if (!st) return 'nostate';
  if (ctx?.paused || ctx?.cutscene) return 'paused';
  if (ctx?.victory) return 'victory';
  if (st.on || ctx?.callOn) return 'busy';
  if (ctx?.balefire) return 'balefire';
  if (!ctx?.hittable) return 'empty';
  if (ctx?.bossInvuln || ctx?.bossBeat) return 'boss';
  if (st.charges < 1 || st.calls >= CALL7.maxCalls) return 'spent';
  if (ctx?.bossPhase && (st.phaseCalls[ctx.bossPhase] || 0) >= CALL7.perPhase) return 'phase';
  return '';
}

export function trySpend7(st, ctx) {
  const why = refuseReason7(st, ctx);
  if (why) return { ok: false, why };
  st.charges = 0; st.calls++; st.since = 0; st.kos = 0; st.on = true;
  if (ctx?.bossPhase) st.phaseCalls[ctx.bossPhase] = (st.phaseCalls[ctx.bossPhase] || 0) + 1;
  return { ok: true, why: '' };
}

export function onScreen7(e, camX, vw = VW) {
  if (!e || e.alive === false || e.entering || e.canBeHit === false) return false;
  const x = e.x;
  return x >= camX - 60 && x <= camX + vw + 60;
}

export function kind7(e) {
  if (!e) return 'other';
  if (e.type === 'asmodean') return 'boss';
  if (e.type === 'fadelt') return 'fadelt';
  if (HUMAN.has(e.type)) return 'human';
  if (TROLLOC.has(e.type)) return 'trolloc';
  return 'other';
}

export function eligible7(enemies, camX, vw) {
  return (enemies || []).filter(e => onScreen7(e, camX, vw) && kind7(e) !== 'other');
}

export function helperCtx(enemies, camX, vw, bossZone) {
  const list = eligible7(enemies, camX, vw);
  let spawn = 0, humans = 0, elite = false;
  for (const e of list) {
    const k = kind7(e);
    if (k === 'trolloc' || k === 'fadelt') spawn++;
    if (k === 'human') humans++;
    if (k === 'fadelt') elite = true;
  }
  return { boss: !!bossZone, spawnOnScreen: spawn, eliteOnScreen: elite, humansOnScreen: humans, list };
}

export function bossFloor7(boss) {
  if (!boss) return 1;
  if ((boss.phase || 1) >= 3) return 1;
  const pct = (boss.phase || 1) <= 1 ? CALL7.gates[0] : CALL7.gates[1];
  return Math.floor(boss.maxHp * pct);
}

/** Moiraine: trollocs to ash (capped by the caller), fadelt/humans downed, never a human kill. */
export function moiraineEffect(e) {
  const kind = kind7(e);
  if (kind === 'other' || kind === 'boss') return null;
  if (kind === 'trolloc') {
    const score = Math.floor((e.T?.score || 0) / 2);
    e.callKill = true;
    if (e.T) e.T = Object.assign({}, e.T, { score });
    e.hp = 0;
    return { kind, dmg: e.maxHp, killed: true, down: 0, score };
  }
  const frac = kind === 'fadelt' ? CALL7.fadeFrac : CALL7.humanFrac;
  const down = kind === 'fadelt' ? CALL7.fadeDown : CALL7.humanDown;
  const dmg = e.maxHp * frac;
  e.hp = Math.max(1, e.hp - dmg);
  e.callDown = down;
  return { kind, dmg, killed: false, down, score: 0 };
}

/** Lan: band dash. Fadelt under half HP dies; a healthy one loses 75% of max. Humans yield under 20%. */
export function lanEffect(e) {
  const kind = kind7(e);
  if (kind === 'other' || kind === 'boss') return null;
  if (kind === 'trolloc') {
    const score = Math.floor((e.T?.score || 0) / 2);
    e.callKill = true;
    if (e.T) e.T = Object.assign({}, e.T, { score });
    e.hp = 0;
    return { kind, dmg: e.maxHp, killed: true, down: 0, score };
  }
  if (kind === 'fadelt') {
    if (e.hp < e.maxHp * 0.5) {
      const score = Math.floor((e.T?.score || 0) / 2);
      e.callKill = true;
      if (e.T) e.T = Object.assign({}, e.T, { score });
      e.hp = 0;
      return { kind, dmg: e.maxHp, killed: true, down: 0, score };
    }
    const dmg = e.maxHp * CALL7.lan.eliteFracHealthy;
    e.hp = Math.max(1, e.hp - dmg);
    e.callDown = CALL7.fadeDown;
    return { kind, dmg, killed: false, down: CALL7.fadeDown, score: 0 };
  }
  if (e.hp < e.maxHp * 0.2) {
    e.callKill = true;
    e.hp = 0;
    return { kind, dmg: e.maxHp * CALL7.humanFrac, killed: true, yield: true, down: 0, score: 0 };
  }
  const dmg = e.maxHp * CALL7.humanFrac;
  e.hp = Math.max(1, e.hp - dmg);
  e.callDown = CALL7.humanDown;
  return { kind, dmg, killed: false, down: CALL7.humanDown, score: 0 };
}

/** Duo boss hit: 6% of max, clamped at the next gate, never a kill, never while invulnerable. */
export function duoBossEffect(boss) {
  if (!boss || !boss.alive || boss.invuln || boss.beat) return null;
  const floor = bossFloor7(boss);
  const next = Math.max(floor, boss.hp - Math.round(boss.maxHp * CALL7.bossFrac));
  const dmg = Math.max(0, boss.hp - next);
  boss.hp = next;
  boss.callStagger = CALL7.stagger;
  boss.state = 'stagger'; boss.st = 0; boss.counterUsed = true;
  return { kind: 'boss', dmg, killed: false, down: 0, score: 0 };
}
