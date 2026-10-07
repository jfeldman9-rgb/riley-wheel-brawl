// Blight hazards. Pure: no Phaser. Numbers are the plan's §3 table.
import { rand } from './config.js';
import { stage4Delta } from './stage4-time.js';
import { strikeRiley, bandOf } from './stage5-hurt.js';

export const LASH = Object.freeze({ tell: 1.1, reach: 300, dmg: 6, slow: 0.7, slowFor: 1.2, immune: 2.0, enemyDmg: 18, gap: [4, 6], fire: 6, melee: 3, hits: 3 });
export const THORN = Object.freeze({ tick: 0.5, dmg: 4, enemyDmg: 12, pulse: 1, maxW: 220, burn: 8 });
export const SEEP = Object.freeze({ r: 110, tell: 1.2, slow: 0.25, dmg: 14, enemyDmg: 24, tells: 2, getup: 0.8, ignite: 3, tick: 0.5, igniteDmg: 6 });

const held = R => !!(R && (R.grabbedBy || R.state === 'grabbed'));
const yy = (bands, i) => bands && bands[i] ? (bands[i][0] + bands[i][1]) / 2 : 630;

export function createBlight(layout = {}) {
  const trees = (layout.trees || []).map(t => ({ ...t, cool: rand(1, 2.2), hits: 0, dormant: 0, lashed: false }));
  const thorns = (layout.thorns || []).map(t => ({ ...t, w: Math.min(t.w || 180, THORN.maxW), burn: 0, acc: 0, pulse: 0, on: true }));
  const seeps = (layout.seeps || []).map(s => ({ ...s, phase: 'idle', st: 0, cool: rand(1.2, 2.4), ignite: 0, acc: 0 }));
  const b = {
    trees, thorns, seeps, snare: 0, immune: 0, getup: 0, slow: 0, _rst: '',
    setQuality() {},
    clearZone(zone) {
      for (const t of trees) if (t.zone === zone) { t.lashed = false; t.cool = 1e9; }
      for (const t of thorns) if (t.zone === zone) t.on = false;
      for (const s of seeps) if (s.zone === zone) { s.phase = 'gone'; s.ignite = 0; }
      b.snare = 0;
    },
    dispose() { b.snare = 0; b.slow = 0; for (const t of trees) t.lashed = false; for (const s of seeps) s.phase = 'gone'; for (const t of thorns) t.on = false; },
    step(dt, world) {
      dt = stage4Delta(dt);
      if (!dt || world.paused || world.story || world.frozen) return b;
      const R = world.riley, zone = world.zone ?? 0, bands = world.bands || [];
      if (R) {
        if (b._rst === 'getup' && R.state !== 'getup') b.getup = SEEP.getup;
        b._rst = R.state;
        if (b.getup > 0) b.getup -= dt;
        if (b.snare > 0) b.snare -= dt;
        if (b.immune > 0) b.immune -= dt;
      }
      let tells = 0;
      for (const t of trees) if (t.zone === zone && t.lashed) tells++;
      for (const t of trees) {
        if (t.zone !== zone) continue;
        if (t.dormant > 0) { t.dormant -= dt; continue; }
        if (t.lashed) {
          t.st += dt;
          if (t.st >= LASH.tell) {
            t.lashed = false; t.cool = rand(LASH.gap[0], LASH.gap[1]); t.st = 0;
            resolveLash(b, t, world);
          }
          continue;
        }
        t.cool -= dt;
        if (t.cool <= 0 && tells < 1 && !held(R)) {
          const band = bandNear(t, bands);
          t.lashed = true; t.st = 0; t.band = band; tells++;
          world.onLash?.(t);
        }
      }
      for (const t of thorns) {
        if (!t.on || t.zone !== zone) continue;
        t.pulse += dt;
        if (R && t.burn <= 0 && inThorn(t, R, bands)) {
          t.acc += dt;
          while (t.acc >= THORN.tick) { t.acc -= THORN.tick; strikeRiley(world.scene || world, THORN.dmg, { dot: true, breakHold: true }); world.onThorn?.(t); }
        } else t.acc = 0;
        if (t.burn > 0) t.burn -= dt;
        thornEnemies(t, world, bands, dt);
      }
      let gouts = seeps.filter(s => s.zone === zone && s.phase === 'tell').length;
      for (const s of seeps) {
        if (s.zone !== zone || s.phase === 'gone') continue;
        if (s.ignite > 0) {
          s.ignite -= dt; s.acc += dt;
          while (s.acc >= SEEP.tick) {
            s.acc -= SEEP.tick;
            for (const e of world.enemies || []) if (e.alive && e.type !== 'aginor' && Math.hypot(e.x - s.x, e.y - s.y) < SEEP.r) chip(e, SEEP.igniteDmg);
          }
          continue;
        }
        if (s.phase === 'tell') {
          s.st += dt;
          if (s.st >= SEEP.tell) { s.phase = 'idle'; s.st = 0; s.cool = rand(3.5, 5.5); burst(b, s, world); }
          continue;
        }
        s.cool -= dt;
        const quiet = !held(R) && R && R.state !== 'down' && R.state !== 'getup' && b.getup <= 0;
        if (s.cool <= 0 && gouts < SEEP.tells && quiet) { s.phase = 'tell'; s.st = 0; gouts++; world.onGout?.(s); }
      }
      b.slow = slowOf(b, R, zone, bands);
      if (R) R.fogSlow = Math.max(R.fogSlow || 0, b.slow);
      return b;
    },
  };
  return b;
}

function chip(e, dmg) {
  if (!e?.alive) return;
  e.hp -= dmg;
  if (e.hp > 0) return;
  e.hp = 0;
  if (e.finish) e.finish();
  else if (e.die) e.die(1, { dmg });
  else { e.alive = false; e.state = 'dead'; e.scene?.onEnemyDie?.(e); }
}
function bandNear(tree, bands) {
  let best = 0, dist = 1e9;
  for (let i = 0; i < (bands.length || 1); i++) {
    const y = yy(bands, i), d = Math.abs(y - (tree.y || 630));
    if (d < dist && d <= LASH.reach) { dist = d; best = i; }
  }
  return best;
}
function inBand(R, bands, i) { return bandOf(R.y, bands) === i; }
function resolveLash(b, tree, world) {
  if (tree.show) return;
  const R = world.riley;
  if (R && b.immune <= 0 && !held(R) && inBand(R, world.bands, tree.band) && Math.abs(R.x - tree.x) <= LASH.reach) {
    strikeRiley(world.scene || world, LASH.dmg, { fromX: tree.x, breakHold: true });
    b.snare = LASH.slowFor; b.immune = LASH.immune; world.onSnare?.(tree);
  }
  for (const e of world.enemies || []) {
    if (!e.alive || e.type === 'aginor' || e.type === 'balthamel') continue;
    if (bandOf(e.y, world.bands) === tree.band && Math.abs(e.x - tree.x) <= LASH.reach) chip(e, LASH.enemyDmg);
  }
}
function inThorn(t, R, bands) {
  return Math.abs(R.x - t.x) <= t.w / 2 && bandOf(R.y, bands) === (t.band | 0) && (R.z || 0) < 30;
}
function thornEnemies(t, world, bands, dt) {
  if (t.burn > 0) return;
  t._e = t._e || 0; t._e += dt;
  if (t._e < THORN.tick) return;
  t._e = 0;
  for (const e of world.enemies || []) {
    if (e.alive && (e.state === 'down' || e.state === 'thrown') && Math.abs(e.x - t.x) <= t.w / 2 && bandOf(e.y, bands) === (t.band | 0)) chip(e, THORN.enemyDmg);
  }
}
function burst(b, s, world) {
  const R = world.riley;
  if (R && !held(R) && Math.hypot(R.x - s.x, R.y - s.y) <= SEEP.r) {
    strikeRiley(world.scene || world, SEEP.dmg, { down: true, launch: 420, fromX: s.x, breakHold: true });
  }
  for (const e of world.enemies || []) if (e.alive && e.type !== 'aginor' && Math.hypot(e.x - s.x, e.y - s.y) <= SEEP.r) chip(e, SEEP.enemyDmg);
  world.onBurst?.(s);
}
function slowOf(b, R, zone, bands) {
  if (!R) return 0;
  let slow = 0;
  if (b.snare > 0) slow = LASH.slow;
  for (const s of b.seeps) if (s.zone === zone && s.phase === 'idle' && s.ignite <= 0 && Math.hypot((R.x || 0) - s.x, (R.y || 0) - s.y) <= SEEP.r) slow = Math.max(slow, SEEP.slow);
  return slow;
}
export function meleeTrunk(b, R, zone) {
  if (!R?.attackFrame) return null;
  for (const t of b.trees) {
    if (t.zone !== zone || t.dormant > 0) continue;
    const dx = (t.x - R.x) * (R.facing || 1);
    if (dx > 0 && dx < 160 && Math.abs(t.y - R.y) < 50) {
      t.hits++;
      if (t.hits >= LASH.hits) { t.hits = 0; t.dormant = LASH.melee; t.lashed = false; return t; }
    }
  }
  return null;
}
export function burnTrunk(b, x, y, zone, secs = LASH.fire) {
  let hit = null;
  for (const t of b.trees) if (t.zone === zone && Math.hypot(t.x - x, t.y - y) < 80) { t.dormant = secs; t.lashed = false; hit = t; }
  for (const t of b.thorns) if (t.zone === zone && Math.abs(t.x - x) < t.w) t.burn = THORN.burn;
  for (const s of b.seeps) if (s.zone === zone && Math.hypot(s.x - x, s.y - y) < SEEP.r + 20) { s.ignite = SEEP.ignite; s.phase = 'idle'; s.acc = 0; }
  return hit;
}
export function exitOpen(b, zone, exitX) {
  const strip = 70;
  for (const t of b.thorns) if (t.on && t.zone === zone && Math.abs(t.x - exitX) < t.w / 2 + strip) return false;
  for (const s of b.seeps) if (s.zone === zone && Math.abs(s.x - exitX) < SEEP.r + 10) return false;
  return true;
}
