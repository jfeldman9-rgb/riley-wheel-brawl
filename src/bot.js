// ?demo=1: a simple autopilot for Riley so the slice can be captured and perf-measured hands-free.
import { rand } from './config.js';
export class Bot {
  constructor(scene) { this.s = scene; this.t = 0; this.next = 0; this.plan = null; }
  update(dt) {
    const s = this.s, R = s.riley, inp = s.inp; this.t += dt;
    if (!s.started || !R.alive) { inp.demo = { x: 0, y: 0 }; return; }
    const foes = s.enemies.filter(e => e.alive && !e.entering);
    if (!foes.length) { inp.demo = { x: (s.zone && !s.locked) || !s.zone ? 1 : 0, y: R.y > 640 ? -1 : R.y < 620 ? 1 : 0, run: !s.zone }; if (s.pickups.length) { const p = s.pickups[0]; inp.demo = { x: Math.sign(p.x - R.x), y: Math.abs(p.y - R.y) > 10 ? Math.sign(p.y - R.y) : 0 }; } return; }
    foes.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x));
    const e = foes[0], dx = e.x - R.x, dy = e.y - R.y, side = Math.sign(dx) || 1;
    const want = e.T.boss ? 170 : 125;
    let x = 0, y = Math.abs(dy) > 8 ? Math.sign(dy) : 0;
    if (Math.abs(dx) > want + 20) x = side; else if (Math.abs(dx) < want - 50) x = -side;
    inp.demo = { x, y, run: false };
    if (this.t < this.next || R.busy) return;
    const aligned = Math.abs(dy) < 14;
    if (R.facing !== side) { inp.demo.x = side; return; }
    if (aligned && Math.abs(dx) > 300 && R.saidin >= 34 && Math.random() < 0.5) { inp.press('special'); this.next = this.t + 0.9; return; }
    if (aligned && Math.abs(dx) < want + 40) {
      const r = Math.random();
      if (r < 0.12) { inp.press('jump'); setTimeout(() => inp.press('attack'), 260); this.next = this.t + 1.0; }
      else { inp.press('attack'); setTimeout(() => inp.press('attack'), 220); setTimeout(() => inp.press('attack'), 470); this.next = this.t + rand(0.9, 1.3); }
    }
  }
}
