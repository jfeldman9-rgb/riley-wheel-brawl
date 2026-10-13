// Glass columns (phase 2) and the shockwave the channel leaves behind.
import { noteHurt } from './stage7-notes.js';
import { strikeRiley } from './stage5-hurt.js';

export const COLUMNS = Object.freeze([4100, 4350, 4600, 4850, 5050]);
export const COL = Object.freeze({ every: 3.2, hum: 1.0, rain: 0.9, strip: 220, dmg: 12, enemy: 30 });
export const SHOCK = Object.freeze({ speed: 520, life: 0.5, dmg: 16, jumpZ: 24 });

export function shockTouches(riley, shock) {
  if (!riley || !shock) return false;
  if ((riley.z || 0) > SHOCK.jumpZ) return false;
  const dist = Math.abs((riley.x || 0) - shock.x);
  return dist <= shock.r + 18 && dist >= shock.r - 36;
}

export function createArena() {
  return {
    t: 0, slot: -1, hum: -1, rainX: 0, raining: false, rainHit: false, shock: null,
    step(scene, dt) {
      const b = scene.boss;
      if (b?.alive && b.phase === 2) {
        this.t += dt;
        const slot = Math.floor(this.t / COL.every);
        const local = this.t - slot * COL.every;
        const col = slot % COLUMNS.length;
        this.hum = local < COL.hum ? col : -1;
        if (local >= COL.hum && local < COL.hum + COL.rain) {
          if (this.slot !== slot) { this.slot = slot; this.rainHit = false; this.enemyHit = false; this.rainX = COLUMNS[col]; }
          this.raining = true;
          this.applyRain(scene);
        } else this.raining = false;
      } else { this.hum = -1; this.raining = false; }
      this.stepShock(scene, dt);
    },
    applyRain(scene) {
      const x = this.rainX, half = COL.strip / 2, R = scene.riley;
      if (R && !this.rainHit && Math.abs(R.x - x) <= half && (R.z || 0) <= SHOCK.jumpZ) {
        this.rainHit = true;
        if (strikeRiley(scene, COL.dmg, { down: true, launch: 360, fromX: x, kb: 220 })) noteHurt(scene, 'shard', COL.hum);
      }
      if (!this.enemyHit) {
        this.enemyHit = true;
        for (const e of scene.enemies || []) {
          if (!e?.alive || e.type === 'asmodean') continue;
          if (Math.abs(e.x - x) <= half) {
            e.hp = Math.max(0, (e.hp || 0) - COL.enemy);
            if (e.hp <= 0 && e.die) e.die(1, { kb: 160 });
            else if (e.hp <= 0 && e.yieldOut) e.yieldOut();
          }
        }
      }
    },
    stepShock(scene, dt) {
      const w = this.shock;
      if (!w) return;
      w.t += dt; w.r += SHOCK.speed * dt;
      const R = scene.riley;
      if (R && !w.hit && shockTouches(R, w)) {
        w.hit = true;
        if (strikeRiley(scene, SHOCK.dmg, { down: true, launch: 420, fromX: w.x, kb: 280 })) noteHurt(scene, 'shock', 1.8);
      }
      if (w.t >= SHOCK.life) this.shock = null;
    },
    clear() { this.raining = false; this.hum = -1; this.shock = null; },
    threats(scene) {
      const out = { columns: [], rains: [], shock: this.shock ? [{ x: this.shock.x, r: this.shock.r }] : [], rings: [] };
      if (this.hum >= 0) out.columns.push({ i: this.hum, x: COLUMNS[this.hum], tell: true });
      if (this.raining) out.rains.push({ x: this.rainX, w: COL.strip });
      const ring = scene?.kit?.street?.ring;
      if (ring) out.rings.push({ x: ring.x, y: ring.y, r: 72, phase: ring.phase });
      return out;
    },
  };
}
