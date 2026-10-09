// Balthamel attack helpers. Kept beside the core to respect its byte cap.
import { BALTH } from './balthamel.js';
import { rand } from './config.js';
import { strikeRiley } from './stage5-hurt.js';
import { stage4Delta } from './stage4-time.js';

export function flail(dt, R) {
    if (this.st < BALTH.tell) return;
    const active = (this.string === 0 && this.st < BALTH.tell + 0.16) || (this.string === 1 && this.st > BALTH.tell + 0.34 && this.st < BALTH.tell + 0.5);
    if (this.string === 0 && this.st >= BALTH.tell + 0.16) { this.string = 1; this.hitOnce = false; }
    if (active && R && !this.hitOnce) {
      if (!this.counterUsed && this.string === 0 && R.attackFrame && Math.sign(this.x - R.x) === (R.facing || 1) && Math.abs(R.y - this.y) < 36 && Math.abs(R.x - this.x) < 190) {
        this.counterUsed = true; this.state = 'hurt'; this.st = 0; this.since = 'flail'; this.scene.kit?.onParry?.(this); return;
      }
      if (Math.abs(R.x - this.x) < 150 && Math.abs(R.y - this.y) < 34 && (R.z || 0) < 50) {
        this.hitOnce = true;
        strikeRiley(this.scene, BALTH.flail[this.string === 0 ? 0 : 1], { fromX: this.x, kb: 200 });
      }
    }
    if (this.st >= BALTH.tell + 0.62) { this.state = 'idle'; this.st = 0; this.cool = rand(0.7, 1.2); this.since = 'flail'; }
  }

export function balthPhysics(dt) {
  dt = stage4Delta(dt);
  if (!dt || this.scene.paused || this.scene.cutscene || this.deps.frozen?.()) return;
  if (this.vx) { this.x += this.vx * dt; this.vx *= Math.pow(0.9, dt * 60); }
  const b = this.scene.bounds;
  if (b && this.state !== 'step') this.x = Math.max(b.l + 50, Math.min(b.r - 50, this.x));
}
