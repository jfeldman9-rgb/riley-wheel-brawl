// Rand al'Thor call-in rules (Stage 6+). Pure: charges, eligibility, the damage table.
// Stages 1–5 stay on Loial. callInFor is the only switch.
import { VW } from './config.js';

export const RAND = Object.freeze({
  charges: 1, maxCharges: 1, kos: 10, recharge: 45, maxCalls: 3, perPhase: 1,
  bossFrac: 0.06, fadeFrac: 0.75, humanFrac: 0.6, fadeDown: 2, humanDown: 1.6,
  bolts: 8, fires: 4, boltGap: 0.08, pad: 60, inv: 2, stagger: 1,
  gates: Object.freeze([0.66, 0.33]),
});
const TROLLOC = new Set(['grunt', 'spear', 'hound']);
const HUMAN = new Set(['cutthroat', 'grayman']);

export function callInFor(stageNo) { return stageNo >= 6 ? 'rand' : 'loial'; }

export function createRand() {
  return { charges: RAND.charges, calls: 0, kos: 0, since: RAND.recharge, phaseCalls: Object.create(null), on: false };
}

export function noteRileyKo(st) {
  if (!st || st.charges >= RAND.maxCharges || st.calls >= RAND.maxCalls) return st?.kos || 0;
  st.kos++;
  return st.kos;
}

export function tickRand(st, dt) {
  if (!st || !(dt > 0)) return st;
  st.since += dt;
  if (st.charges < 1 && st.calls < RAND.maxCalls && st.kos >= RAND.kos && st.since >= RAND.recharge) {
    st.charges = 1; st.kos = 0;
  }
  return st;
}

/** Empty string when the call may be spent. Anything else is a refusal (nothing spent). */
export function refuseReason(st, ctx) {
  if (!st) return 'nostate';
  if (ctx?.paused || ctx?.cutscene) return 'paused';
  if (ctx?.victory) return 'victory';
  if (st.on || ctx?.randOn) return 'busy';
  if (ctx?.balefire) return 'balefire';
  if (!ctx?.hittable) return 'empty';
  if (ctx?.bossInvuln || ctx?.bossBeat) return 'boss';
  if (st.charges < 1 || st.calls >= RAND.maxCalls) return 'spent';
  if (ctx?.bossPhase && (st.phaseCalls[ctx.bossPhase] || 0) >= RAND.perPhase) return 'phase';
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
  return x >= camX - RAND.pad && x <= camX + vw + RAND.pad;
}

export function targetKind(e) {
  if (!e) return 'other';
  if (e.type === 'belal') return 'boss';
  if (e.type === 'fadelt') return 'fadelt';
  if (HUMAN.has(e.type)) return 'human';
  if (TROLLOC.has(e.type)) return 'trolloc';
  return 'other';
}

export function allocateStrikes(targets) {
  const list = targets || [];
  return { bolts: list.slice(0, RAND.bolts), fires: list.slice(RAND.bolts, RAND.bolts + RAND.fires), missed: list.slice(RAND.bolts + RAND.fires) };
}

/** Next phase gate the boss cannot cross. Phase 3 leaves him at 1 (Rand never kills). */
export function bossFloor(boss) {
  if (!boss) return 1;
  if ((boss.phase || 1) >= 3) return 1;
  const pct = (boss.phase || 1) <= 1 ? RAND.gates[0] : RAND.gates[1];
  return Math.floor(boss.maxHp * pct);
}

/**
 * Apply one Rand hit. Trollocs die. Fadelt loses 75% of max and lives.
 * Humans lose 60% of max and live. The boss loses 6% of max, clamped at the gate, never killed, never while invulnerable.
 * Returns null when the hit is ignored.
 */
export function randEffect(e) {
  const kind = targetKind(e);
  if (kind === 'other') return null;
  if (kind === 'boss') {
    if (!e.alive || e.invuln || e.beat) return null;
    const floor = bossFloor(e);
    const next = Math.max(floor, e.hp - Math.round(e.maxHp * RAND.bossFrac));
    const dmg = Math.max(0, e.hp - next);
    e.hp = next;
    e.randStagger = RAND.stagger;
    return { kind, dmg, killed: false, down: 0, score: 0 };
  }
  if (kind === 'trolloc') {
    const score = Math.floor((e.T?.score || 0) / 2);
    e.randKill = true;
    if (e.T) e.T = Object.assign({}, e.T, { score });
    e.hp = 0;
    return { kind, dmg: e.maxHp, killed: true, down: 0, score };
  }
  const frac = kind === 'fadelt' ? RAND.fadeFrac : RAND.humanFrac;
  const down = kind === 'fadelt' ? RAND.fadeDown : RAND.humanDown;
  const dmg = e.maxHp * frac;
  e.hp = Math.max(1, e.hp - dmg);
  e.randDown = down;
  return { kind, dmg, killed: false, down, score: 0 };
}

/** One predicate for a refusal and for the strike. Entering and unhittable foes do not count. */
export function onScreenHittable(e, camX, vw = VW) {
  return onScreen(e, camX, vw) && targetKind(e) !== 'other';
}

export function eligibleTargets(enemies, camX, vw) {
  return (enemies || []).filter(e => onScreenHittable(e, camX, vw));
}
