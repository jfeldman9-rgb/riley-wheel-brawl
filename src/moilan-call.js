// Moiraine and Lan call-in rules (Stage 7). Pure: charges, the helper pick, the damage table.
// Rand stays Stage 6. Loial stays Stages 1–5. Do not merge this into assist-rules.js.
import { VW } from './config.js';
import { bandOf } from './stage7-notes.js';

export const CALL7 = Object.freeze({
  charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 3, perPhase: 1,
  bossFrac: 0.06, fadeFrac: 0.75, humanFrac: 0.6, fadeDown: 2, humanDown: 1.6,
  inv: 2, stagger: 1, gates: Object.freeze([0.66, 0.33]),
  moiraine: Object.freeze({ kos: 6, rocks: 6, rockGap: 0.1 }),
  lan: Object.freeze({ kos: 3, eliteFrac: 1.0, eliteFracHealthy: 0.75, dash: 0.45 }),
});
const SPAWN = new Set(['grunt', 'spear', 'hound']);
const HUMAN = new Set(['dancer', 'veiled']);

export function pickHelper(ctx) {
  if (ctx?.boss || ctx?.zoneI === 3) return 'duo';
  if ((ctx?.spawnOnScreen || 0) >= 3) return 'moiraine';
  if (ctx?.eliteOnScreen || (ctx?.humansOnScreen || 0) >= 1) return 'lan';
  return 'moiraine';
}

export function createCall7() {
  return { charges: CALL7.charges, calls: 0, kos: 0, since: CALL7.recharge, phaseCalls: Object.create(null), on: false };
}

export function noteRileyKo(st) {
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

export function refuseReason(st, ctx) {
  if (!st) return 'nostate';
  if (ctx?.paused || ctx?.cutscene) return 'paused';
  if (ctx?.victory) return 'victory';
  if (st.on || ctx?.callOn || ctx?.randOn) return 'busy';
  if (ctx?.balefire) return 'balefire';
  if (!ctx?.hittable) return 'empty';
  if (ctx?.bossInvuln || ctx?.bossBeat) return 'boss';
  if (st.charges < 1 || st.calls >= CALL7.maxCalls) return 'spent';
  if (ctx?.bossPhase && (st.phaseCalls[ctx.bossPhase] || 0) >= CALL7.perPhase) return 'phase';
  return '';
}

export function trySpend(st, ctx) {
  const why = refuseReason(st, ctx);
  if (why) return { ok: false, why };
  st.charges = 0; st.calls++; st.since = 0; st.kos = 0; st.on = true;
  if (ctx?.bossPhase) st.phaseCalls[ctx.bossPhase] = (st.phaseCalls[ctx.bossPhase] || 0) + 1;
  return { ok: true, why: '' };
}

export function onScreen(e, camX, vw = VW) {
  if (!e || e.alive === false || e.entering || e.canBeHit === false) return false;
  const x = e.x;
  return x >= camX - 60 && x <= camX + vw + 60;
}

export function classify(e) {
  if (!e) return 'other';
  if (e.type === 'asmodean') return 'boss';
  if (e.type === 'fadelt') return 'fadelt';
  if (HUMAN.has(e.type)) return 'human';
  if (SPAWN.has(e.type)) return 'spawn';
  return 'other';
}

export function bossFloor(boss) {
  if (!boss) return 1;
  if ((boss.phase || 1) >= 3) return 1;
  const pct = (boss.phase || 1) <= 1 ? CALL7.gates[0] : CALL7.gates[1];
  return Math.floor(boss.maxHp * pct);
}

function hurtHuman(e, frac, down) {
  const dmg = (e.hp || 0) * frac;
  e.hp = Math.max(1, (e.hp || 0) - dmg);
  e.randDown = Math.max(e.randDown || 0, down);
  e.callDown = down;
  return { kind: 'human', dmg, killed: false, down, score: 0 };
}

/** One Moiraine hit. Shadowspawn ash. Humans lose 60% of current HP and live. */
export function moiraineEffect(e) {
  const kind = classify(e);
  if (kind === 'spawn') {
    const score = Math.floor((e.T?.score || 0) / 2);
    e.callKill = true;
    if (e.T) e.T = Object.assign({}, e.T, { score });
    e.hp = 0;
    return { kind, dmg: e.maxHp, killed: true, down: 0, score };
  }
  if (kind === 'human') return hurtHuman(e, CALL7.humanFrac, CALL7.humanDown);
  return null;
}

/** Lan. Spawn on Riley's band die. Fadelt under half HP dies; otherwise loses 75% of max and lives. */
export function lanEffect(e, rileyY) {
  const kind = classify(e);
  if (kind === 'spawn') {
    if (bandOf(e.y) !== bandOf(rileyY)) return null;
    e.callKill = true;
    e.hp = 0;
    return { kind, dmg: e.maxHp, killed: true, down: 0, score: Math.floor((e.T?.score || 0) / 2) };
  }
  if (kind === 'fadelt') {
    const frac = (e.hp || 0) / (e.maxHp || 1);
    if (frac < 0.5) {
      e.callKill = true; e.hp = 0;
      return { kind, dmg: e.maxHp, killed: true, down: 0, score: 0 };
    }
    const dmg = e.maxHp * CALL7.fadeFrac;
    e.hp = Math.max(1, e.hp - dmg);
    e.randDown = Math.max(e.randDown || 0, CALL7.fadeDown);
    return { kind, dmg, killed: false, down: CALL7.fadeDown, score: 0 };
  }
  if (kind === 'human') {
    if (bandOf(e.y) !== bandOf(rileyY)) return null;
    if ((e.hp || 0) / (e.maxHp || 1) < 0.2) {
      e.callYield = true;
      e.hp = Math.max(1, e.hp || 1);
      return { kind, dmg: 0, killed: false, down: CALL7.humanDown, yield: true, score: 0 };
    }
    return hurtHuman(e, 0, CALL7.humanDown);
  }
  return null;
}

/** Duo strike on Asmodean. 6% HP, 1s stagger, clamped at the next gate, never a kill. */
export function duoEffect(e) {
  if (classify(e) !== 'boss') return null;
  if (!e.alive || e.invuln || e.beat) return null;
  const floor = bossFloor(e);
  const next = Math.max(floor, e.hp - Math.round(e.maxHp * CALL7.bossFrac));
  const dmg = Math.max(0, e.hp - next);
  e.hp = next;
  if ((e.phase || 1) < 3 && e.hp <= floor && typeof e.enter === 'function') e.enter((e.phase || 1) + 1);
  else { e.staggerLeft = CALL7.stagger; e.state = 'stagger'; e.st = 0; e.counterUsed = true; }
  return { kind: 'boss', dmg, killed: false, down: 0, score: 0 };
}

export function planStrike(helper, enemies, camX, rileyY, vw = VW) {
  const list = (enemies || []).filter(e => onScreen(e, camX, vw) && classify(e) !== 'other');
  if (helper === 'duo') return { helper, bosses: list.filter(e => classify(e) === 'boss'), spawn: [], humans: [], fades: [] };
  if (helper === 'moiraine') {
    return {
      helper,
      spawn: list.filter(e => classify(e) === 'spawn').slice(0, CALL7.moiraine.kos),
      humans: list.filter(e => classify(e) === 'human'),
      fades: [], bosses: [],
    };
  }
  const band = bandOf(rileyY);
  return {
    helper,
    spawn: list.filter(e => classify(e) === 'spawn' && bandOf(e.y) === band).slice(0, CALL7.lan.kos),
    humans: list.filter(e => classify(e) === 'human' && bandOf(e.y) === band),
    fades: list.filter(e => classify(e) === 'fadelt'),
    bosses: [],
  };
}
