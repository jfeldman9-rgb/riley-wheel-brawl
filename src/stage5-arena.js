// Wither ring, bone hands, the oak, the Eye surge, and the Green Man beat.
import { stage4Delta } from './stage4-time.js';
import { strikeRiley, bandOf } from './stage5-hurt.js';
import { freezeBeat, thawBeat } from './stage5-beat.js';

export const RING = Object.freeze({ tell: 0.9, grow: 1, radius: 440, thick: 60, dmg: 12, jump: 20, every: [9, 11], low: 8 });
export const HANDS = Object.freeze({ tell: 1, r: 80, dmg: 10, slow: 0.7, slowFor: 1.2, max: 2, sep: 300, every: 5 });
export const OAK = Object.freeze({ r: 140, heal: 1, cap: 0.5, stay: 4, tell: 1, push: 220, shut: 6 });
export const SURGE = Object.freeze({ tell: 1.2, window: 2.5, every: [10, 12], low: 7, mul: 1.6, stagger: 1.4 });
export const BEAT = Object.freeze({ dur: 2.2, p2: 50 });

const rand = (a, b) => a + Math.random() * (b - a);

export function createArena(opts = {}) {
  const a = {
    left: opts.left ?? 3920, right: opts.right ?? 5200, quality: 2,
    ring: null, hands: [], surge: null, oak: null, beat: null, snare: 0, green: null,
    ringAt: rand(RING.every[0], RING.every[1]), handsAt: 4, surgeAt: rand(SURGE.every[0], SURGE.every[1]),
    setQuality(level) { a.quality = level; },
    get centre() { return (a.left + a.right) / 2; },
    get frozen() { return !!(a.beat && !a.beat.done); },
    dispose() { thawBeat(a); a.ring = null; a.hands.length = 0; a.surge = null; a.snare = 0; a.beat = null; if (a.oak) a.oak.light = false; },
    step(dt, world) {
      dt = stage4Delta(dt);
      if (!dt || world.paused || world.story) return a;
      const boss = world.aginor;
      if (a.beat && !a.beat.done) {
        a.beat.t += dt;
        if (a.beat.t >= BEAT.dur) a.endBeat(world);
        return a;
      }
      if (a.snare > 0) a.snare -= dt;
      if (!boss?.alive) return a;
      if (boss.phase === 2) { a.ringAt = 999; if (a.hands.length) a.hands.length = 0; a.ringStep(dt, boss, world); }
      else { a.ringStep(dt, boss, world); a.handStep(dt, boss, world); }
      if (boss.phase === 3) { a.oakStep(dt, world); a.surgeStep(dt, boss, world); }
      if (world.riley) world.riley.fogSlow = Math.max(world.riley.fogSlow || 0, a.snare > 0 ? HANDS.slow : 0);
      return a;
    },
    ringStep(dt, boss, world) {
      a.ringAt -= dt;
      const low = boss.hp / boss.maxHp <= 0.15;
      if (!a.ring && a.ringAt <= 0) {
        a.ring = { st: 0, phase: 'tell', r: 0, x: boss.x, y: boss.y, hit: false };
        a.ringAt = low ? RING.low : rand(RING.every[0], RING.every[1]);
        world.onRing?.();
        return;
      }
      if (!a.ring) return;
      const g = a.ring; g.st += dt; g.x = boss.x; g.y = boss.y;
      if (g.phase === 'tell' && g.st >= RING.tell) { g.phase = 'grow'; g.st = 0; }
      if (g.phase === 'grow') {
        g.r = Math.min(RING.radius, (g.st / RING.grow) * RING.radius);
        const R = world.riley;
        if (R && !g.hit) {
          const d = Math.hypot(R.x - g.x, R.y - g.y);
          const contact = Math.abs(d - g.r) <= RING.thick / 2;
          if (contact) {
            g.hit = true;
            const oak = a.oak?.open && Math.hypot(R.x - a.oak.x, R.y - a.oak.y) <= OAK.r;
            if ((R.z || 0) > RING.jump || d > RING.radius || oak) world.onRingClear?.(R);
            else strikeRiley(world.scene || world, RING.dmg, { fromX: g.x, breakHold: true });
          }
        }
        if (g.st >= RING.grow) a.ring = null;
      }
    },
    handStep(dt, boss, world) {
      const R = world.riley;
      a.handsAt -= dt;
      const busy = R && ['grabbed', 'down', 'getup'].includes(R.state);
      if (busy) return;
      let born;
      if (a.hands.length < HANDS.max && a.handsAt <= 0 && R && !busy && !a.insideOak(R)) {
        const ok = a.hands.every(h => Math.hypot(h.x - R.x, h.y - R.y) >= HANDS.sep);
        if (ok) {
          born = { x: R.x, y: R.y, st: 0, phase: 'tell' };
          a.hands.push(born);
          a.handsAt = HANDS.every;
          world.onHands?.();
        }
      }
      const next = [];
      for (const h of a.hands) {
        if (h === born) { next.push(h); continue; }
        h.st += dt;
        if (h.phase === 'tell' && h.st >= HANDS.tell) {
          h.phase = 'done';
          if (R && Math.hypot(R.x - h.x, R.y - h.y) <= HANDS.r && !a.insideOak(R)) {
            strikeRiley(world.scene || world, HANDS.dmg, { fromX: h.x, breakHold: true });
            a.snare = HANDS.slowFor;
          }
        } else if (h.phase === 'tell') next.push(h);
      }
      a.hands = next;
    },
    insideOak(R) { return !!(a.oak?.open && R && Math.hypot(R.x - a.oak.x, R.y - a.oak.y) <= OAK.r); },
    oakStep(dt, world) {
      if (!a.oak) a.oak = { x: a.centre, y: 630, r: OAK.r, open: true, t: 0, shut: 0, root: 0 };
      const o = a.oak, R = world.riley;
      if (o.shut > 0) { o.shut -= dt; o.open = false; if (o.shut <= 0) o.open = true; o.t = 0; return; }
      if (!o.open || !R || R.alive === false || R.hp <= 0 || ['down', 'dead'].includes(R.state)) return;
      if (a.insideOak(R)) {
        o.t += dt; world.onOak?.();
        const cap = (R.maxHp || 100) * OAK.cap;
        if (R.hp < cap) R.hp = Math.min(cap, R.hp + OAK.heal * dt);
        if (o.t >= OAK.stay && !o.root) { o.root = 0.001; world.onRoot?.(); }
      } else if (!o.root) o.t = Math.max(0, o.t - dt);
      if (o.root) {
        o.root += dt;
        if (o.root >= OAK.tell) {
          const dir = Math.sign(R.x - o.x) || 1;
          R.x += dir * OAK.push; R.vx = dir * 280;
          o.open = false; o.shut = OAK.shut; o.root = 0; o.t = 0;
        }
      }
    },
    surgeStep(dt, boss, world) {
      const low = boss.hp / boss.maxHp <= 0.15;
      if (!a.surge) {
        a.surgeAt -= dt;
        if (a.surgeAt <= 0) { a.surge = { st: 0, phase: 'tell' }; boss.surgeUsed = false; world.onSurge?.(); }
        return;
      }
      a.surge.st += dt;
      if (a.surge.phase === 'tell' && a.surge.st >= SURGE.tell) { a.surge.phase = 'hot'; a.surge.st = 0; boss.overdrawn = true; }
      if (a.surge.phase === 'hot' && a.surge.st >= SURGE.window) {
        boss.overdrawn = false; a.surge = null; a.surgeAt = low ? SURGE.low : rand(SURGE.every[0], SURGE.every[1]);
      }
    },
    startBeat(boss, balth, world) {
      if (a.beat) return false;
      balth?.releaseHold?.('break');
      boss.invuln = true; boss.beatFired = true; boss.breakTether?.();
      a.beat = { t: 0, done: false };
      a.green = { state: 'seize', st: 0 };
      freezeBeat(a, world.scene);
      world.onGreen?.();
      return true;
    },
    endBeat(world) {
      if (!a.beat || a.beat.done) return;
      a.beat.done = true;
      thawBeat(a);
      a.green = { state: 'oak', st: 0 };
      const boss = world.aginor;
      if (boss) boss.markBeat?.();
      const b = world.balthamel;
      if (b) { b.seize?.(); b.gone = true; b.alive = false; }
      a.oak = { x: a.centre, y: 630, r: OAK.r, open: true, t: 0, shut: 0, root: 0, light: true };
      world.onBeatEnd?.();
    },
  };
  return a;
}

export function jumpClears(z) { return (z || 0) > RING.jump; }
export { bandOf };
