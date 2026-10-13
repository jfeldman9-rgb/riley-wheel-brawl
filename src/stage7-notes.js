// Asmodean's phrase table. Fixed, so every phrase leaves a band empty. No Math.random.
import { LANE_TOP, LANE_BOT } from './config.js';

export const BEAT = 0.625;
export const NOTE_SPEED = 360;
export const NOTE_DMG = 7;
export const REFLECT_PX = 90;
export const BASH_TELL = 0.55;
export const BASH_DMG = 8;
export const PHRASE_GAP = 5;
export const PHRASE_GAP_SLOW = 10;

export const BANDS = Object.freeze([0, 1, 2].map(i => Object.freeze([
  Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * i / 3),
  Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * (i + 1) / 3),
])));

export const PHRASES = Object.freeze([
  { bands: Object.freeze([0, 1, 0, 1]), gold: 0 },
  { bands: Object.freeze([1, 2, 1, 2]), gold: 1 },
  { bands: Object.freeze([0, 2, 0, 2]), gold: 2 },
  { bands: Object.freeze([0, 0, 1, 0]), gold: 3 },
  { bands: Object.freeze([1, 1, 2, 1]), gold: 0 },
  { bands: Object.freeze([2, 2, 0, 2]), gold: 1 },
  { bands: Object.freeze([0, 1, 1, 0]), gold: 2 },
  { bands: Object.freeze([1, 2, 2, 1]), gold: 3 },
].map(p => Object.freeze(p)));

export function bandOf(y, bands = BANDS) {
  for (let i = 0; i < bands.length; i++) if (y >= bands[i][0] && y <= bands[i][1]) return i;
  let best = 0, dist = 1e9;
  for (let i = 0; i < bands.length; i++) {
    const mid = (bands[i][0] + bands[i][1]) / 2, d = Math.abs((y || 0) - mid);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}
export function bandY(i, bands = BANDS) { const b = bands[i] || bands[0]; return (b[0] + b[1]) / 2; }

/** A band index that the phrase never uses, or -1. */
export function freeBand(phrase) {
  const used = new Set(phrase?.bands || []);
  for (let i = 0; i < 3; i++) if (!used.has(i)) return i;
  return -1;
}

/** Note i spawns one beat after its tell. Tell i is the beat before that spawn. */
export function noteAt(i) { return (i + 1) * BEAT; }
export function tellBands(phrase, phraseT) {
  const out = [];
  const bands = phrase?.bands || [];
  for (let i = 0; i < bands.length; i++) {
    const at = noteAt(i);
    if (phraseT >= at - BEAT && phraseT < at) out.push(bands[i]);
  }
  return out;
}

export function gateFloor(boss, fromCall = false) {
  if (!boss) return 1;
  if ((boss.phase || 1) >= 3) return fromCall ? 1 : 0;
  const pct = (boss.phase || 1) <= 1 ? 0.66 : 0.33;
  return Math.floor(boss.maxHp * pct);
}

/** Subtract dmg but never pass the phase gate. Phase 3 calls stop at 1 HP. */
export function clampDamage(boss, dmg, fromCall = false) {
  const floor = gateFloor(boss, fromCall);
  const next = Math.max(floor, (boss.hp || 0) - Math.max(0, dmg));
  const dealt = Math.max(0, (boss.hp || 0) - next);
  boss.hp = next;
  const crossed = (boss.phase || 1) < 3 && next <= floor;
  return { dealt, floor, crossed };
}

export function noteHurt(scene, kind, tell) {
  const k = scene?.kit;
  if (!k) return;
  (k.hurtLog || (k.hurtLog = [])).push({ kind, tell });
}
