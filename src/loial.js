// Loial the Ogier: Riley's once-per-stage assist (restored from 1.1). Called with the assist button, he charges in
// from the left edge, sweeps his axe through the first group he reaches, knocks down anyone he runs into and leaves
// off the right edge. He is never targeted by enemies. Damage follows 1.1's normal difficulty (44, boss 18).
import { Fighter } from './fighter.js';
import { LANE_TOP, LANE_BOT, VW, clamp } from './config.js';
import { say } from './audio.js';
export const LOIAL_DEF = { key: 'loial', prefix: 'loial_', native: 1, scale: 0.64, anchorX: 0.5, hp: 1, team: 0, shadowW: 170, friction: 0.002 };
export const LOIAL = Object.freeze({ speed: 330, life: 3.6, maxSweeps: 2, sweepFrame: 1, dmg: 44, bossDmg: 18, reach: [-30, 240], laneBand: 60, contact: 70 });
export class Loial extends Fighter {
  constructor(scene, x, y) {
    super(scene, LOIAL_DEF, x, y);
    this.age = 0; this.sweeps = 0; this.struck = new Set(); this.chargeSpoken = false; this.doneSpoken = false; this.gone = false;
    this.setState('run', 'run');
  }
  /** the enemy he is heading for: nearest live target ahead of him that he has not hit yet */
  target() {
    let best = null, gap = Infinity;
    for (const e of this.scene.enemies) {
      if (!e.canBeHit || this.struck.has(e)) continue;
      const dx = e.x - this.x; if (dx < -40 || dx > VW) continue;
      if (dx < gap) { gap = dx; best = e; }
    }
    return best;
  }
  hit(e) {
    if (this.struck.has(e) || !e.canBeHit) return;
    const h = { dmg: e.T && e.T.boss ? LOIAL.bossDmg : LOIAL.dmg, kind: 'heavy', kb: 420, launch: 360, down: true };
    if (this.scene.hitTarget(this, e, h)) { this.struck.add(e); this.scene.riley.score += h.dmg * 10; }
  }
  update(dt) {
    const sc = this.scene; this.age += dt; this.st += dt;
    if (!this.chargeSpoken && this.age >= 1) { this.chargeSpoken = true; say('loial_charge_01', sc.caption, false); }
    const peaceful = sc.victoryPending || sc.ended;
    if (this.state === 'run') {
      const t = peaceful ? null : this.target();
      if (t) this.y = clamp(this.y + clamp(t.y - this.y, -110 * dt, 110 * dt), LANE_TOP, LANE_BOT);
      this.x += LOIAL.speed * dt;
      if (t && this.sweeps < LOIAL.maxSweeps && Math.abs(t.y - this.y) < LOIAL.laneBand && t.x - this.x > 0 && t.x - this.x < LOIAL.reach[1] - 40) {
        this.sweeps++; this.swept = false; this.setState('sweep', 'sweep');
      }
      // anyone he simply runs into is bowled over (1.1 behaviour)
      if (!peaceful) for (const e of sc.enemies) if (Math.abs(e.x - this.x) < LOIAL.contact && Math.abs(e.y - this.y) < 35) this.hit(e);
    } else if (this.state === 'sweep') {
      this.x += LOIAL.speed * 0.15 * dt;
      if (!this.swept && this.fi >= LOIAL.sweepFrame) {
        this.swept = true; sc.fx.trauma = Math.min(1, sc.fx.trauma + 0.3);
        if (!peaceful) for (const e of sc.enemies) {
          const dx = e.x - this.x;
          if (dx >= LOIAL.reach[0] && dx <= LOIAL.reach[1] && Math.abs(e.y - this.y) < LOIAL.laneBand) this.hit(e);
        }
      }
      if (this.done) this.setState('run', 'run');
    }
    if (!this.doneSpoken && this.age >= LOIAL.life - 0.4) { this.doneSpoken = true; say('loial_done_01', sc.caption, false); }
    if (this.age >= LOIAL.life && this.state === 'run' && this.x > sc.camX + VW + 120) this.gone = true;
    if (this.age >= LOIAL.life + 4) this.gone = true;   // never linger if blocked off-screen
  }
}
