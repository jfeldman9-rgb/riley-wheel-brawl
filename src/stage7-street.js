// The waking street (Z2 bubble of evil). One ring at a time, on the game clock.
import { VOLLEY_BANDS } from './stages.js';
import { strikeRiley } from './stage7-hurt.js';
import { sfxCue } from './stage7-voice.js';

export const STREET = Object.freeze({ every: 9, tell: 1.1, strike: 1.6, radius: 72, dmg: 9, enemyDmg: 30 });

export function bandOfY(y) {
  for (let i = 0; i < VOLLEY_BANDS.length; i++) if (y >= VOLLEY_BANDS[i][0] && y <= VOLLEY_BANDS[i][1]) return i;
  let best = 0, dist = 1e9;
  for (let i = 0; i < VOLLEY_BANDS.length; i++) {
    const mid = (VOLLEY_BANDS[i][0] + VOLLEY_BANDS[i][1]) / 2, d = Math.abs(y - mid);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}

export function createStreet() {
  return { ring: null, at: STREET.every, cleared: false };
}

function grabBand(w) {
  const R = w.riley;
  if (R?.grabbedBy || R?.held) return bandOfY(R.y);
  for (const e of w.enemies || []) if (e?.alive && (e.state === 'holding' || e.state === 'held')) return bandOfY(e.y);
  return -1;
}

function hurtEnemy(e, dmg, x) {
  if (!e || e.alive === false || !e.takeHit || e.type === 'asmodean') return;
  e.takeHit({ dmg, down: true, kind: 'heavy', kb: 140 }, { x: x ?? e.x - 1, facing: 1 });
}

export function stepStreet(street, dt, w) {
  if (!street || street.cleared || !(dt > 0)) return;
  const R = w.riley;
  if ((w.zone | 0) !== 2 || !w.waveActive) {
    if ((w.zone | 0) !== 2) street.ring = null;
    return;
  }
  if (!street.ring) {
    street.at -= dt;
    if (street.at > 0 || !R) return;
    const band = bandOfY(R.y);
    if (band === grabBand(w)) { street.at = 0.25; return; }
    const mid = (VOLLEY_BANDS[band][0] + VOLLEY_BANDS[band][1]) / 2;
    street.ring = { x: R.x, y: mid, band, t: 0, phase: 'tell', hitRiley: false, hit: new Set() };
    street.at = STREET.every;
    w.onRing?.(street.ring);
    return;
  }
  const ring = street.ring;
  ring.t += dt;
  if (ring.phase === 'tell' && ring.t >= STREET.tell) { ring.phase = 'strike'; ring.t = 0; sfxCue('shardCrack'); }
  if (ring.phase !== 'strike') return;
  const inside = (a) => a && Math.hypot(a.x - ring.x, a.y - ring.y) <= STREET.radius;
  if (R && !ring.hitRiley && inside(R) && (R.z || 0) < 40) {
    ring.hitRiley = true;
    strikeRiley(w.scene, STREET.dmg, { fromX: ring.x, kb: Math.sign(R.x - ring.x) || 1, launch: 260 });
  }
  for (const e of w.enemies || []) {
    if (!e?.alive || ring.hit.has(e) || !inside(e)) continue;
    ring.hit.add(e);
    hurtEnemy(e, STREET.enemyDmg, ring.x);
  }
  if (ring.t >= STREET.strike) street.ring = null;
}

export function clearStreetZone(street, zone) {
  if (zone === 2) { street.cleared = true; street.ring = null; }
}

export function disposeStreet(street) {
  if (street) street.ring = null;
}
