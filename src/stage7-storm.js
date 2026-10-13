// Z1 sandstorm. 14s cycle: 2.5s telegraph, 4s gust, 7.5s gap. Push is X only.
import { clamp } from './config.js';

export function createStorm() {
  return {
    armed: false, phase: 'idle', t: 0, wait: 0, dir: 1, gusting: false, alpha: 0, cycle: 0, told: 0,
    arm() { if (this.armed) return; this.armed = true; this.phase = 'wait'; this.wait = 2; this.t = 0; },
    stop() { this.phase = 'idle'; this.gusting = false; this.alpha = 0; },
    step(dt, blocked) {
      if (this.phase === 'idle' || !(dt > 0)) return;
      if (this.phase === 'wait') {
        if (blocked) return;
        this.wait -= dt;
        if (this.wait <= 0) this.beginTell();
        return;
      }
      this.t += dt;
      if (this.phase === 'tell') {
        this.gusting = false;
        this.alpha = Math.min(0.2, (this.t / 2.5) * 0.2);
        if (this.t >= 2.5 && !blocked) this.beginGust();
        return;
      }
      if (this.phase === 'gust') {
        this.gusting = true; this.alpha = 0.35;
        if (this.t >= 4) { this.phase = 'gap'; this.t = 0; this.gusting = false; this.alpha = 0; this.dir *= -1; this.cycle++; }
        return;
      }
      if (this.phase === 'gap') {
        this.gusting = false; this.alpha = 0;
        if (this.t >= 7.5 && !blocked) this.beginTell();
      }
    },
    beginTell() { this.phase = 'tell'; this.t = 0; this.gusting = false; this.told++; },
    beginGust() { this.phase = 'gust'; this.t = 0; this.gusting = true; this.alpha = 0.35; },
  };
}

export function pushStorm(scene, storm, dt) {
  if (!storm?.gusting || !(dt > 0)) return;
  const dir = storm.dir || 1;
  const b = scene.bounds || { l: 0, r: 5200 };
  const shove = (actor, scale) => {
    if (!actor) return;
    actor.x = clamp(actor.x + 70 * dir * scale * dt, (b.l || 0) + 40, (b.r || 5200) - 40);
  };
  const R = scene.riley;
  const x = scene.inp?.x || 0;
  const brace = !!(R?.blocking || (x && Math.sign(x) === -dir));
  shove(R, brace ? 0.5 : 1);
  for (const e of scene.enemies || []) if (e?.alive) shove(e, 1);
}

export function veilSpawn(e) {
  if (!e || e.s7Veil > 0) return;
  e.s7Veil = 0.6;
  Object.defineProperty(e, 'canBeHit', { configurable: true, get() { return false; } });
  e.sprite?.setAlpha?.(0.4);
  const orig = e.update;
  e.update = function (dt) {
    this.s7Veil -= dt;
    const u = Math.max(0, this.s7Veil) / 0.6;
    this.sprite?.setAlpha?.(0.4 + 0.6 * (1 - u));
    if (this.s7Veil > 0) { this.sync?.(); return; }
    delete this.canBeHit;
    this.sprite?.setAlpha?.(1);
    this.update = orig;
    return orig?.call(this, dt);
  };
}
