// Sandstorm (Z1). Game-clock cycle: 14 s, 2.5 s telegraph, 4 s gust. Direction alternates.
// The engine has no block verb: braced means grounded and pushing into the wind.
import { clamp } from './config.js';

export const STORM = Object.freeze({ cycle: 14, tell: 2.5, gust: 4, push: 70, firstDelay: 2, sil: 0.6, alpha: 0.35 });

export function createStorm(startDir = 1) {
  return { phase: 'wait', t: 0, dir: startDir < 0 ? -1 : 1, gusts: 0, armed: false, done: false };
}

/** Push for one actor this tick. Only X moves; the caller clamps to zone bounds. */
export function stormPush(storm, isRiley, braced) {
  if (!storm || storm.phase !== 'gust') return 0;
  return storm.dir * STORM.push * (isRiley && braced ? 0.5 : 1);
}

export function isBraced(riley, inpX, dir) {
  return !!riley && (riley.z || 0) <= 0 && inpX === -dir;
}

/**
 * Advance the storm. world: { zone, waveActive, zoneCleared, grabbed, striking, onTell, onGust }.
 * waveActive arms the first gust 2 s after Z1 wave 0 clears: the kit sets armed then.
 */
export function stepStorm(storm, dt, w) {
  if (!storm || storm.done || !(dt > 0)) return storm;
  if (w.zone !== 1 || w.zoneCleared) {
    if (w.zoneCleared) { storm.done = true; storm.phase = 'wait'; }
    return storm;
  }
  storm.t += dt;
  if (storm.phase === 'wait') {
    if (!storm.armed) { storm.t = 0; return storm; }
    // No gust starts while Riley is grabbed or in a call-in: hold at the threshold.
    const due = storm.gusts === 0 ? STORM.firstDelay : STORM.cycle - STORM.tell - STORM.gust;
    if (storm.t >= due && !w.grabbed && !w.striking) {
      storm.phase = 'tell'; storm.t = 0;
      w.onTell?.(storm.dir);
    }
    return storm;
  }
  if (storm.phase === 'tell') {
    if (storm.t >= STORM.tell) { storm.phase = 'gust'; storm.t = 0; w.onGust?.(storm.dir); }
    return storm;
  }
  if (storm.t >= STORM.gust) {
    storm.phase = 'wait'; storm.t = 0; storm.gusts++; storm.dir = -storm.dir;
  }
  return storm;
}

export function applyGust(storm, actors, dt, bounds, riley, inpX) {
  if (!storm || storm.phase !== 'gust') return;
  for (const a of actors || []) {
    if (!a) continue;
    const braced = a === riley && isBraced(a, inpX, storm.dir);
    const push = stormPush(storm, a === riley, braced);
    if (!push) continue;
    const yBefore = a.y;
    a.x = bounds ? clamp(a.x + push * dt, bounds.l + 40, bounds.r - 40) : a.x + push * dt;
    a.y = yBefore;
  }
}

/** Enemies spawning into a gust show as silhouettes: held entering, no hitbox, for 0.6 s. */
export function markSpawn(storm, e) {
  if (storm?.phase === 'gust' && e) { e._s7sil = STORM.sil; e.entering = true; }
}

export function stepSilhouettes(enemies, dt) {
  for (const e of enemies || []) {
    if (!e || !(e._s7sil > 0)) continue;
    e._s7sil -= dt;
    e.entering = true;
    const k = Math.max(0, Math.min(1, 1 - e._s7sil / STORM.sil));
    e._s7alpha = 0.4 + 0.6 * k;
    if (e._s7sil <= 0) { e._s7sil = 0; e._s7alpha = 1; }
  }
}
