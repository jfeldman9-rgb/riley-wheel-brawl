// Z2 waking street. One shimmer ring at a time, never on a grabbed band.
import { bandOf, bandY, noteHurt } from './stage7-notes.js';
import { strikeRiley } from './stage5-hurt.js';

export const RING = Object.freeze({ every: 9, tell: 1.1, strike: 1.6, radius: 72, dmg: 9, enemy: 30 });

export function createStreet() {
  return {
    cd: 9, ring: null, seen: 0,
    step(scene, dt) {
      const wave = scene.zoneI === 2 && scene.zone && !scene.zone.boss && (scene.pending?.length || scene.enemies?.some(e => e.alive && !e.entering));
      if (this.ring) this.advance(scene, dt);
      if (!wave || this.ring) return;
      this.cd -= dt;
      if (this.cd > 0) return;
      const R = scene.riley;
      if (!R || R.state === 'grabbed' || R.grabbedBy) return;
      this.cd = RING.every;
      this.spawn(scene, R);
    },
    spawn(scene, R) {
      const band = bandOf(R.y);
      this.ring = { x: R.x, y: bandY(band), band, t: 0, phase: 'tell', hit: false, enemyHit: false };
      this.seen++;
    },
    advance(scene, dt) {
      const r = this.ring;
      if (!r) return;
      r.t += dt;
      if (r.phase === 'tell' && r.t >= RING.tell) { r.phase = 'strike'; r.t = 0; }
      if (r.phase === 'strike') {
        const R = scene.riley;
        if (R && !r.hit) {
          const inside = Math.hypot(R.x - r.x, R.y - r.y) <= RING.radius;
          const jumped = (R.z || 0) > 10 || R.state === 'air' || R.state === 'airkick';
          if (inside && !jumped) {
            r.hit = true;
            if (strikeRiley(scene, RING.dmg, { down: true, launch: 280, fromX: r.x, kb: 180 })) noteHurt(scene, 'ring', RING.tell);
          }
        }
        if (!r.enemyHit) {
          for (const e of scene.enemies || []) {
            if (!e?.alive || e.type === 'asmodean') continue;
            if (Math.hypot(e.x - r.x, e.y - r.y) <= RING.radius) { e.hp = Math.max(0, (e.hp || 0) - RING.enemy); if (e.hp <= 0 && e.die) e.die(1, { kb: 200 }); else if (e.hp <= 0 && e.yieldOut) e.yieldOut(); }
          }
          r.enemyHit = true;
        }
        if (r.t >= RING.strike) { r.img?.destroy?.(); this.ring = null; }
      }
    },
    clear() { this.ring?.img?.destroy?.(); this.ring = null; },
  };
}
