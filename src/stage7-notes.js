import { pick } from './config.js';
import { bandY } from './stage7-street.js';
import { strikeRiley } from './stage6-hurt.js';
import { sfx7, stage7Say } from './stage7-voice.js';
export const PHRASES = Object.freeze([[0,1,0,1],[1,2,2,1],[2,0,2,0],[0,0,1,1],[2,1,2,1],[0,2,0,2]].map(Object.freeze));
export const NOTES = Object.freeze({ bpm: 96, beat: 0.625, every: 5, speed: 360, dmg: 7, reflect: 0.04, stagger: 0.8 });
export function createNotes() {
  return {
    clock: 0, next: 0, pending: [], notes: [], phrase: null, reflected: 0,
    step(dt, s, boss) {
      if (!boss?.alive || boss.entering || boss.beat) return;
      this.clock += dt;
      if (this.clock >= this.next) {
        const bands = pick(PHRASES), gold = (pick([0,1,2,3])); this.phrase = bands;
        for (let i = 0; i < 4; i++) this.pending.push({ band: bands[i], at: this.clock + i * NOTES.beat, fire: this.clock + (i + 1) * NOTES.beat, gold: i === gold });
        this.next = this.clock + (boss.phase === 2 ? 10 : 5);
      }
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const p = this.pending[i]; if (this.clock < p.fire) continue;
        this.notes.push({ x: boss.x, y: bandY(p.band), band: p.band, dir: Math.sign((s.riley?.x || 0) - boss.x) || -1, gold: p.gold, age: 0, counterUsed: false });
        sfx7(p.gold ? 'gold' : 'harp'); this.pending.splice(i,1);
      }
      const R = s.riley;
      for (const n of this.notes) {
        n.age += dt; n.x += n.dir * NOTES.speed * dt;
        if (n.gold && !n.counterUsed && R?.attackFrame && Math.abs(n.x - R.x) < 90 && Math.abs(n.y - R.y) < 34) {
          n.counterUsed = true; n.reflected = true; n.age = 9;
          boss.takeHit({ dmg: boss.maxHp * NOTES.reflect, reflected: true });
          if (!boss.beat) boss.stagger(NOTES.stagger);
          if (!this.reflected++) { stage7Say('st7_asmo_hurt_01', s.caption); s.kit?.later?.(1, () => stage7Say('riley_st7_reflect_01', s.caption)); }
        }
        if (!n.counterUsed && R && R.z < 35 && Math.abs(R.x - n.x) < 32 && Math.abs(R.y - n.y) < 22) { n.counterUsed = true; strikeRiley(s, NOTES.dmg, { fromX: n.x }); }
      }
      this.notes = this.notes.filter(n => n.age < 5 && !n.counterUsed);
    },
    tells() { return this.pending.filter(p => this.clock >= p.at && this.clock < p.fire); },
    clear() { this.notes.length = 0; this.pending.length = 0; },
  };
}
