import { strikeRiley } from './stage6-hurt.js';
import { sfx7 } from './stage7-voice.js';
export const COLUMNS = Object.freeze([4050,4300,4550,4800,5050]);
export function createArena7() {
  return {
    t: 0, next: 3.2, index: 0, rain: null, shock: null,
    step(dt, s, boss) {
      if (!boss?.alive || boss.entering || boss.beat) return;
      this.t += dt;
      if (boss.phase === 2 && !this.rain && this.t >= this.next) {
        this.rain = { x: COLUMNS[this.index++ % 5], t: 0, phase: 'tell', counterUsed: false, hits: new Set() }; this.next = this.t + 3.2; sfx7('hum');
      }
      if (this.rain) {
        const a = this.rain; a.t += dt;
        if (a.t >= 1 && a.phase === 'tell') { a.phase = 'strike'; sfx7('glass'); }
        if (a.phase === 'strike') {
          const R = s.riley;
          if (!a.counterUsed && R && Math.abs(R.x - a.x) < 110) { a.counterUsed = true; strikeRiley(s, 12, { down: true, fromX: a.x }); }
          for (const e of s.enemies || []) if (e !== boss && e.alive && !e.entering && !a.hits.has(e) && Math.abs(e.x - a.x) < 110) { a.hits.add(e); e.takeHit?.({ dmg: 30, down: true, hazard: true }, a); }
        }
        if (a.t >= 1.9) this.rain = null;
      }
      if (this.shock) {
        const a = this.shock, old = a.radius; a.t += dt; a.radius = a.t * 520;
        const R = s.riley, distance = R ? Math.hypot(R.x - a.x, R.y - a.y) : Infinity;
        if (!a.counterUsed && distance >= old - 28 && distance <= a.radius + 28 && R?.z < 30) { a.counterUsed = true; strikeRiley(s, 16, { down: true, fromX: a.x }); }
        if (a.t >= 0.5) this.shock = null;
      }
    },
    wave(boss) { this.shock = { x: boss.x, y: boss.y, t: 0, radius: 0, counterUsed: false }; sfx7('shield'); },
    clear() { this.rain = null; this.shock = null; },
  };
}
