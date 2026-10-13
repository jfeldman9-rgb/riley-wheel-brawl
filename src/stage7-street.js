import { strikeRiley } from './stage6-hurt.js';
import { bandOf } from './stage5-hurt.js';
import { VOLLEY_BANDS } from './stages.js';
export const bandY = i => (VOLLEY_BANDS[i][0] + VOLLEY_BANDS[i][1]) / 2;
export const STREET = Object.freeze({ every: 9, tell: 1.1, strike: 1.6, radius: 72, dmg: 9, enemyDmg: 30 });
export function createStreet() {
  return {
    t: 9, ring: null,
    step(dt, s) {
      if (!(dt > 0) || s.paused || s.cutscene || s.kit?.strike || s.zoneI !== 2 || !s.zone || !(s.enemies || []).some(e => e.alive)) return;
      const R = s.riley; if (!R?.alive) return;
      if (!this.ring) {
        this.t -= dt; if (this.t > 0) return;
        let band = bandOf(R.y, VOLLEY_BANDS);
        if (R.grabbedBy || R.state === 'grabbed') band = (band + 1) % 3;
        this.ring = { x: R.x, y: bandY(band), band, t: 0, phase: 'tell', counterUsed: false, hits: new Set() };
        s.kit?.streetTell?.(); return;
      }
      const r = this.ring; r.t += dt;
      if (r.t >= STREET.tell) r.phase = 'strike';
      if (r.phase === 'strike') {
        if (!r.counterUsed && Math.abs(R.x - r.x) <= STREET.radius && Math.abs(R.y - r.y) < 24 && R.z < 30) {
          r.counterUsed = true; strikeRiley(s, STREET.dmg, { down: true, kb: 90, launch: 180, fromX: r.x });
        }
        for (const e of s.enemies || []) if (e.alive && !e.entering && !r.hits.has(e) && Math.abs(e.x - r.x) <= STREET.radius && Math.abs(e.y - r.y) < 24) {
          r.hits.add(e); e.takeHit?.({ dmg: STREET.enemyDmg, down: true, hazard: true }, r);
        }
      }
      if (r.t >= STREET.tell + STREET.strike) { this.ring = null; this.t = STREET.every - STREET.tell - STREET.strike; }
    },
    clear() { this.ring = null; this.t = STREET.every; },
  };
}
