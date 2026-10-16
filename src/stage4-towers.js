// Collapsing towers, rubble, and the zone-2 fog wall. No Phaser.
import { LANE_TOP, LANE_BOT } from './config.js';
import { stage4Delta } from './stage4-time.js';

export const TOWER = Object.freeze({ tell: 1.6, dmg: 16, enemyDmg: 30, width: 360 });

/** Worst-case walk out of a fall still beats the tell, including a hurt pause. */
export function canEscapeTower(from, tower, speed = 205, hurt = 0.4) {
  const half = (tower.width || TOWER.width) / 2;
  const dx = Math.max(0, half - Math.abs((from.x || 0) - tower.x));
  let dy = 0;
  if (tower.band) {
    const [y0, y1] = tower.band;
    if (from.y >= y0 && from.y <= y1) dy = Math.min(from.y - y0, y1 - from.y);
  }
  const dist = tower.along ? dy : dx;
  return dist / speed + hurt <= (tower.tell ?? TOWER.tell) + 1e-9;
}

export function createTowers() {
  const towers = [], rubble = [];
  let wall = null, dead = false, next = 2, zone = -1, shown = false, seq = 1, quota = 0, fallen = 0;
  function tell(x, y, along, band) {
    const t = {
      id: seq++, x, y, phase: 'tell', t: 0, width: TOWER.width, along: !!along, band: band || null,
      safeY: along && band ? (y > (band[0] + band[1]) / 2 ? band[0] - 6 : band[1] + 6) : y,
    };
    towers.push(t);
    return t;
  }
  return {
    towers, rubble,
    get zoneWall() { return wall; },
    arm(z) {
      if (z !== 2) { towers.length = 0; wall = null; }
      zone = z;
      quota = z === 2 ? 2 : 0;
      fallen = 0;
      next = 1.4;
      if (z === 2 && !shown) {
        shown = true;
        const show = tell(3100, 180, false, null);
        show.harmless = true;
      }
    },
    setWave(wave) {
      if (zone !== 2) return;
      quota = wave === 0 ? 2 : wave === 1 ? 3 : 0;
      fallen = 0;
      next = 1.2;
    },
    setWall(spec) { wall = spec ? { x: spec.x, zoneL: spec.zoneL, zoneR: spec.zoneR } : wall; },
    clearRubble() { rubble.length = 0; },
    hitRubble(x) {
      const r = rubble.find(o => !o.broken && Math.abs(o.x - x) < 90);
      if (!r) return false;
      r.hits++;
      if (r.hits >= 3) { r.broken = true; rubble.splice(rubble.indexOf(r), 1); return 'break'; }
      return 'hit';
    },
    step(dt, world) {
      dt = stage4Delta(dt);
      if (dead || !world || !dt) return;
      const R = world.riley;
      if (wall && R && !world.story && !world.paused) {
        const limit = wall.zoneR - 640;
        if (wall.x < limit) wall.x = Math.min(limit, wall.x + 18 * dt);
        if (R.x < wall.x + 8) {
          R.grabbedBy?.releaseHold?.('break');
          R.hp = Math.max(0, (R.hp || 0) - 3 * dt / 0.5);
          R.x += 200 * dt;
          world.onWallTouch?.();
        }
      }
      for (const tw of towers.slice()) {
        if (world.story || world.paused) continue;
        tw.t += dt;
        if (tw.phase !== 'tell' || tw.t < TOWER.tell) continue;
        tw.phase = 'down';
        if (!tw.harmless && R) {
          const inX = Math.abs(R.x - tw.x) < tw.width / 2;
          const inY = !tw.band || (R.y >= tw.band[0] && R.y <= tw.band[1]);
          if ((tw.along || inX) && inY) world.onTowerHit?.(R, tw);
          for (const e of world.enemies || []) {
            if (e.alive && e.type !== 'draghkar' && (tw.along || Math.abs(e.x - tw.x) < tw.width / 2) &&
                (!tw.band || (e.y >= tw.band[0] && e.y <= tw.band[1]))) {
              if (e.state === 'chant') e.takeHit?.({ dmg: 0, hazard: true });
              e.hp = Math.max(0, e.hp - TOWER.enemyDmg);
              if (e.hp <= 0) {
                if (typeof e.die === 'function') e.die(1, { dmg: TOWER.enemyDmg, down: true, kb: 260, launch: 260 });
                else if (typeof e.defeat === 'function') e.defeat(null);
                else e.alive = false;
              }
            }
          }
          rubble.push({ id: tw.id, x: tw.x, y: R.y, hits: 0, band: tw.band });
          fallen++;
        }
        towers.splice(towers.indexOf(tw), 1);
      }
      if (world.story || world.paused || !R || zone !== 2 || fallen >= quota) return;
      if (['down', 'getup'].includes(R.state)) return;
      if (towers.some(t => t.phase === 'tell' && !t.harmless)) return;
      next -= dt;
      if (next > 0) return;
      next = 5 + Math.random() * 2;
      const along = fallen % 2 === 1;
      const bands = world.bands;
      const band = bands ? bands[fallen % bands.length] : [LANE_TOP, LANE_BOT];
      const x = Math.min((world.exitX || 3840) - 120, Math.max((wall?.zoneL || 2560) + 80, R.x + 220));
      tell(x, R.y, along, along ? band : null);
      world.onTowerTell?.(towers[towers.length - 1]);
    },
    dispose() { dead = true; towers.length = 0; rubble.length = 0; wall = null; },
  };
}
