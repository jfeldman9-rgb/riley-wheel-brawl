'use strict';
// Gameplay regression observer: every present actor, including initial entries.
class OffscreenWatch {
  constructor(width = 640) { this.width = width; this.dwell = new Map(); this.violations = []; this.maxSeconds = 0; }
  observe(scene, dt) {
    if (scene.paused) return;
    const present = new Set(scene.enemies);
    for (const enemy of this.dwell.keys()) if (!present.has(enemy) || enemy.remove) this.dwell.delete(enemy);
    for (const enemy of scene.enemies) {
      if (enemy.remove) continue;
      const outside = enemy.x < scene.camera.x || enemy.x > scene.camera.x + this.width;
      const age = outside ? (this.dwell.get(enemy) || 0) + dt : 0;
      this.dwell.set(enemy, age); this.maxSeconds = Math.max(this.maxSeconds, age);
      // A centre outside the viewport is stricter than a wholly hidden sprite.
      if (age > 2 + 1e-9 && age - dt <= 2 + 1e-9) this.violations.push({ wave: scene.wave + 1, kind: enemy.kind || enemy.variant, x: +enemy.x.toFixed(2), cameraX: +scene.camera.x.toFixed(2), ai: enemy.ai, state: enemy.state, seconds: +age.toFixed(3) });
    }
  }
  assertPassed() { if (this.violations.length) throw new Error('Enemy stayed offscreen >2s: ' + JSON.stringify(this.violations)); }
}
module.exports = { OffscreenWatch };
