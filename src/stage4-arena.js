// Phase-3 Mashadar walls. Width never drops under 640, even on a huge dt. No Phaser.

export function createArena(opts = {}) {
  const startL = opts.left ?? 3920, startR = opts.right ?? 5200, minW = 640, speed = 40;
  let left = startL, right = startR, dead = false, pauseL = 0, pauseR = 0, swoop = null, acc = 0.4;
  return {
    get left() { return left; },
    get right() { return right; },
    get width() { return right - left; },
    get active() { return !dead; },
    get swoop() { return swoop; },
    step(dt, world = {}) {
      if (dead) return;
      const stepDt = Math.max(0, dt || 0);
      if (!world.holdWalls) {
        const move = speed * stepDt;
        if (pauseL <= 0 && right - (left + move) >= minW) left += move;
        if (pauseR <= 0 && right - move - left >= minW) right -= move;
        if (right - left < minW) {
          const mid = (left + right) / 2;
          left = mid - minW / 2;
          right = mid + minW / 2;
        }
      }
      pauseL = Math.max(0, pauseL - stepDt);
      pauseR = Math.max(0, pauseR - stepDt);
      const R = world.riley;
      if (R && !world.story && !world.paused) {
        const dmg = 3 * stepDt / 0.5;
        if (R.x < left) { R.hp -= dmg; R.x += 200 * stepDt; }
        else if (R.x > right) { R.hp -= dmg; R.x -= 200 * stepDt; }
      }
      if (!swoop && (acc -= stepDt) <= 0) {
        acc = world.holdWalls ? 6.15 : 8;
        swoop = { t: 0, y: R ? R.y : 630, tell: true };
      }
      if (swoop) {
        swoop.t += stepDt;
        if (swoop.tell && swoop.t >= 0.9) { swoop.tell = false; swoop.t = 0; world.onFogSwoop?.(swoop); }
        if (!swoop.tell && R && !world.story && !world.paused && !swoop.hit && Math.abs(R.y - swoop.y) < 36) {
          swoop.hit = true; R.hp -= 8;
        }
        if (!swoop.tell && swoop.t >= 0.45) swoop = null;
      }
    },
    pushLight(side) {
      if (dead) return;
      if (side === 'left') { left = Math.max(startL, left - 120); pauseL = 3; }
      else { right = Math.min(startR, right + 120); pauseR = 3; }
    },
    dispose() { dead = true; swoop = null; },
  };
}
