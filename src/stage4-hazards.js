// Mashadar fog core (Stage 4 prep). No Phaser, and no import of Stage 3.
//
// Injected dependency:
//   deps.lightNear(world, x, r) -> boolean
//     Called with the tendril tip and r = 260. True recoils that tendril to its
//     vent and puts the vent dormant for 5 s. After Stage 3 merges, T5 wraps
//     the real lightNear(scene, x, r) and may ignore `world`.
//
// step(dt, world) world:
//   riley { x, y, hp, state, alive, r? }
//   enemies[] { x, y, hp, type, alive, state, r?, knocked? }
//   story, paused, lastWave, exitX, exitBand?
// Moonshafts are setMoonshafts([{ x, y, r }]), not read off world.
// Timers freeze while riley.state is grabbed, down or getup, or story/paused.
// step() runs 1/120 s substeps so 30/60/120 Hz match.

export const FOG = Object.freeze({
  tell: 0.8, steer: 90, reach: 520, life: 6, retract: 1,
  contactDmg: 3, contactEvery: 0.5, slow: 0.3,
  gripTime: 2, gripDmg: 10, immunity: 2, knockIntoDmg: 20,
  lightR: 260, dormant: 5, meleeRecoil: 1.5, spawnClear: 300,
  capZone0: 1, capOther: 2, safeStrip: 200, safeWithin: 400,
  tipR: 22, actorR: 22, segments: 8, exitBand: 80, hz: 120,
});

const HZ = FOG.hz;
const SPEED = FOG.steer / HZ;
const ticks = seconds => Math.round(seconds * HZ);
const FROZEN = new Set(['grabbed', 'down', 'getup']);

function hypot(dx, dy) { return Math.hypot(dx, dy); }
function band(world) { return world && world.exitBand != null ? world.exitBand : FOG.exitBand; }
function frozen(world) {
  const state = world.riley && world.riley.state;
  return !!(world.paused || world.story || FROZEN.has(state));
}
function inShaft(shafts, x, y) {
  return shafts.some(m => hypot(x - m.x, y - m.y) < m.r);
}
function blocksExit(x, world) {
  return !!(world && world.lastWave && world.exitX != null && Math.abs(x - world.exitX) < band(world));
}

/** Widest tendril-free run, in px, inside the 400 px window around Riley. Moonshafts count as free. */
export function safeStripWidth(tendrils, moonshafts, riley) {
  const left = riley.x - FOG.safeWithin;
  const n = Math.max(1, Math.round(FOG.safeWithin * 2));
  const blocked = new Uint8Array(n);
  for (const t of tendrils) {
    for (let s = 0; s < FOG.segments; s++) {
      const u = s / (FOG.segments - 1);
      const x = t.vent.x + (t.tip.x - t.vent.x) * u;
      const y = t.vent.y + (t.tip.y - t.vent.y) * u;
      if (Math.abs(y - riley.y) > 48) continue;
      const a = Math.max(0, Math.floor(x - 36 - left));
      const b = Math.min(n, Math.ceil(x + 36 - left));
      for (let i = a; i < b; i++) blocked[i] = 1;
    }
  }
  for (const m of moonshafts || []) {
    const dy = m.y - riley.y;
    if (Math.abs(dy) > m.r) continue;
    const half = Math.sqrt(Math.max(0, m.r * m.r - dy * dy));
    const a = Math.max(0, Math.floor(m.x - half - left));
    const b = Math.min(n, Math.ceil(m.x + half - left));
    for (let i = a; i < b; i++) blocked[i] = 0;
  }
  let best = 0, run = 0;
  for (let i = 0; i < n; i++) {
    if (!blocked[i]) { if (++run > best) best = run; }
    else run = 0;
  }
  return best;
}

export function createFog(deps = {}) {
  const lightNear = typeof deps.lightNear === 'function' ? deps.lightNear : () => false;
  const vents = [], tendrils = [], moonshafts = [];
  let dead = false, seq = 1, accum = 0;
  const cap = zone => zone === 0 ? FOG.capZone0 : FOG.capOther;
  const load = zone => vents.filter(v => v.zone === zone && v.phase === 'tell').length
    + tendrils.filter(t => t.zone === zone).length;
  function lay(t) {
    t.segments = [];
    for (let s = 0; s < FOG.segments; s++) {
      const u = s / (FOG.segments - 1);
      t.segments.push({
        x: t.vent.x + (t.tip.x - t.vent.x) * u,
        y: t.vent.y + (t.tip.y - t.vent.y) * u,
      });
    }
  }
  function remove(t) {
    const i = tendrils.indexOf(t);
    if (i >= 0) tendrils.splice(i, 1);
    if (t.vent.tendril === t) t.vent.tendril = null;
    if (t.vent.phase === 'live') t.vent.phase = 'idle';
  }
  function armReturn(t) {
    const n = ticks(FOG.retract);
    t.left = n;
    t.rdx = (t.vent.x - t.tip.x) / n;
    t.rdy = (t.vent.y - t.tip.y) / n;
  }
  function beginRetract(t) { t.phase = 'retract'; armReturn(t); }
  function beginLight(t) {
    t.phase = 'light';
    t.vent.phase = 'dormant';
    t.vent.ticks = ticks(FOG.dormant);
    t.vent.tendril = null;
    armReturn(t);
  }
  function stripOk(t, x, y, world) {
    const px = t.tip.x, py = t.tip.y;
    t.tip.x = x; t.tip.y = y;
    const width = safeStripWidth(tendrils, moonshafts, world.riley);
    t.tip.x = px; t.tip.y = py;
    return width >= FOG.safeStrip;
  }
  function steer(t, world) {
    const R = world.riley;
    let nx = t.tip.x, ny = t.tip.y;
    const goal = t.vent.fixed || (R ? { x: R.x, y: R.y } : null);
    if (goal) {
      const dx = goal.x - nx, dy = goal.y - ny, len = hypot(dx, dy);
      if (len > 1e-6) { nx += dx / len * SPEED; ny += dy / len * SPEED; }
    }
    const vx = nx - t.vent.x, vy = ny - t.vent.y, reach = hypot(vx, vy);
    if (reach > FOG.reach) { nx = t.vent.x + vx / reach * FOG.reach; ny = t.vent.y + vy / reach * FOG.reach; }
    if (inShaft(moonshafts, nx, ny) || blocksExit(nx, world) || !stripOk(t, nx, ny, world)) return;
    t.tip.x = nx; t.tip.y = ny;
  }
  function pull(t) {
    const dx = t.vent.x - t.tip.x, dy = t.vent.y - t.tip.y, len = hypot(dx, dy);
    if (len <= SPEED) { t.tip.x = t.vent.x; t.tip.y = t.vent.y; return; }
    t.tip.x += dx / len * SPEED; t.tip.y += dy / len * SPEED;
  }
  function overlap(actor, t) {
    const ar = actor.r || FOG.actorR;
    return hypot(actor.x - t.tip.x, actor.y - t.tip.y) < FOG.tipR + ar;
  }
  function fell(actor, dmg) {
    actor.grabbedBy?.releaseHold?.('break');
    if ((actor.hp || 0) <= 0 && actor.alive !== false && actor.lives == null) {
      if (typeof actor.die === 'function') actor.die(1, { dmg, down: true, kb: 220, launch: 220 });
      else if (typeof actor.defeat === 'function') actor.defeat(null);
      else { actor.alive = false; actor.state = 'down'; }
      return;
    }
    if (typeof actor.setState === 'function') actor.setState('down', 'knockdown');
    else actor.state = 'down';
  }
  function touch(actor) {
    if (!actor || actor.alive === false) return;
    if (actor.fogImmuneTicks > 0) {
      actor.fogImmuneTicks--;
      actor.fogImmune = actor.fogImmuneTicks / HZ;
      actor.fogSlow = 0;
      return;
    }
    const hit = tendrils.find(t => (t.phase === 'chase' || t.phase === 'retract') && overlap(actor, t));
    // A knock only pays off when it actually meets fog. Leave the flag set until then.
    if (actor.knocked && hit) {
      if (actor.type === 'cultist') {
        if (actor.state === 'chant') actor.takeHit?.({ dmg: 0, hazard: true });
        actor.hp = Math.max(0, actor.hp - FOG.knockIntoDmg); actor.fogBurned = 1;
        if (actor.hp <= 0) { fell(actor, FOG.knockIntoDmg); return; }
      }
      actor.knocked = false;
    }
    if (!hit) { actor.fogContact = 0; actor.fogSlow = 0; return; }
    actor.fogSlow = FOG.slow;
    actor.fogContact = (actor.fogContact || 0) + 1;
    if (actor.fogContact % ticks(FOG.contactEvery) === 0) {
      if (actor.state === 'chant') actor.takeHit?.({ dmg: 0, hazard: true });
      actor.hp = Math.max(0, actor.hp - FOG.contactDmg);
      if (actor.type === 'cultist') actor.fogBurned = 1;
      if ((actor.hp || 0) <= 0 && actor.alive !== false && actor.lives == null) fell(actor, FOG.contactDmg);
    }
    if (actor.fogContact >= ticks(FOG.gripTime)) {
      actor.hp = Math.max(0, actor.hp - FOG.gripDmg);
      if (actor.type === 'cultist') actor.fogBurned = 1;
      fell(actor, FOG.gripDmg);
      actor.fogPend = true;
      actor.fogSawGetup = false;
      actor.fogContact = 0;
      actor.fogSlow = 0;
    }
  }
  function observe(actor) {
    if (!actor || !actor.fogPend) return;
    if (actor.state === 'getup') actor.fogSawGetup = true;
    if (actor.fogSawGetup && !FROZEN.has(actor.state)) {
      actor.fogPend = false;
      actor.fogSawGetup = false;
      actor.fogImmuneTicks = ticks(FOG.immunity);
      actor.fogImmune = FOG.immunity;
    }
  }
  function finishTell(v, world) {
    const R = world.riley;
    if (!R || hypot(v.x - R.x, v.y - R.y) < FOG.spawnClear || blocksExit(v.x, world)) { v.phase = 'idle'; return; }
    v.phase = 'live';
    const t = {
      id: seq++, vent: v, zone: v.zone, tip: { x: v.x, y: v.y },
      phase: 'chase', life: ticks(FOG.life), recoil: 0, born: true, segments: [],
    };
    v.tendril = t;
    tendrils.push(t);
    lay(t);
  }
  function allowed(v, world) {
    const R = world.riley;
    if (!R || v.phase !== 'idle') return false;
    if (hypot(v.x - R.x, v.y - R.y) < FOG.spawnClear) return false;
    if (load(v.zone) >= cap(v.zone)) return false;
    if (blocksExit(v.x, world)) return false;
    const dummy = { vent: v, tip: { x: v.x, y: v.y } };
    return safeStripWidth(tendrils.concat([dummy]), moonshafts, R) >= FOG.safeStrip;
  }
  function substep(world) {
    for (const v of vents) {
      if (v.phase === 'tell' && --v.ticks <= 0) finishTell(v, world);
      else if (v.phase === 'dormant' && --v.ticks <= 0) { v.phase = 'idle'; v.ticks = 0; }
    }
    for (const t of tendrils.slice()) {
      if (t.born) { t.born = false; continue; }
      if (t.phase === 'chase') {
        steer(t, world);
        if (lightNear(world, t.tip.x, FOG.lightR)) beginLight(t);
        else if (--t.life <= 0) beginRetract(t);
      } else if (t.phase === 'recoil') {
        pull(t);
        if (lightNear(world, t.tip.x, FOG.lightR)) beginLight(t);
        else {
          t.recoil--;
          if (--t.life <= 0 || t.recoil <= 0) {
            if (t.life <= 0) beginRetract(t);
            else t.phase = 'chase';
          }
        }
      } else if (t.phase === 'retract' || t.phase === 'light') {
        t.tip.x += t.rdx; t.tip.y += t.rdy;
        if (--t.left <= 0) remove(t);
      }
      if (tendrils.includes(t)) lay(t);
    }
    touch(world.riley);
    for (const e of world.enemies || []) touch(e);
  }
  return {
    vents, tendrils, moonshafts,
    addVent(spec) {
      if (dead) return null;
      const v = { id: spec.id || 'vent' + seq++, x: spec.x, y: spec.y, zone: spec.zone || 0, phase: 'idle', ticks: 0, tendril: null, fixed: spec.fixed || null };
      vents.push(v);
      return v;
    },
    setMoonshafts(list) {
      moonshafts.length = 0;
      for (const m of list || []) moonshafts.push({ x: m.x, y: m.y, r: m.r });
    },
    tryEmit(vent, world) {
      if (dead || frozen(world) || !allowed(vent, world)) return null;
      vent.phase = 'tell';
      vent.ticks = ticks(FOG.tell);
      return vent;
    },
    melee(id) {
      const t = tendrils.find(t => t.id === id && t.phase === 'chase');
      if (!t) return false;
      t.phase = 'recoil';
      t.recoil = ticks(FOG.meleeRecoil);
      return true;
    },
    live(zone) { return tendrils.filter(t => t.zone === zone).length; },
    keepZone(zone) { for (const t of tendrils.slice()) if (t.zone !== zone) remove(t); },
    clearZone(zone) {
      for (const t of tendrils.slice()) if (t.zone === zone) remove(t);
      for (let i = vents.length - 1; i >= 0; i--) if (vents[i].zone === zone) vents.splice(i, 1);
    },
    step(dt, world) {
      if (dead || !world || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 10);
      observe(world.riley);
      for (const e of world.enemies || []) observe(e);
      if (frozen(world)) {
        if (world.riley) world.riley.fogSlow = 0;
        for (const e of world.enemies || []) e.fogSlow = 0;
        return;
      }
      accum += dt * HZ;
      const n = Math.floor(accum + 1e-6);
      accum -= n;
      for (let i = 0; i < n && !frozen(world); i++) substep(world);
    },
    dispose() {
      vents.length = 0;
      tendrils.length = 0;
      moonshafts.length = 0;
      dead = true;
    },
  };
}
