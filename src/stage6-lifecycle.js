// Stage 6 hooks. Rand replaces Loial only on this scene instance.
import { freezeStrike, thawStrike } from './stage6-freeze.js';
import { stage4Delta } from './stage4-time.js';
import { VW, LANE_TOP } from './config.js';
import { refuseReason, trySpend, eligibleTargets, allocateStrikes, randEffect, noteRileyKo, tickRand, RAND } from './rand-call.js';
import { playCall, abortRandCall, dropBlob, warmRand } from './rand-call-cutscene.js';
import { grayVisible } from './grayman.js';
import { stage6Say, randBark, sfxCue } from './stage6-voice.js';
import { linkTrollocs } from './fadelt.js';

function hook(kit, object, key, wrap) {
  const original = object?.[key];
  if (!object || typeof original !== 'function') return;
  const own = Object.prototype.hasOwnProperty.call(object, key);
  const replacement = wrap(original);
  object[key] = replacement;
  (kit.hooks || (kit.hooks = [])).push(() => { if (own) object[key] = original; else delete object[key]; });
}

export function randCtx(kit) {
  const s = kit.s, b = s.boss;
  return {
    paused: !!s.paused, cutscene: !!s.cutscene, victory: !!s.victoryPending,
    randOn: !!kit.strike, balefire: !!s.beam, hittable: eligibleTargets(s.enemies, s.camX || 0, VW).length > 0,
    bossInvuln: !!(b && b.alive && (b.invuln || b.beat)), bossBeat: !!(b && b.beat),
    bossPhase: b && b.alive ? b.phase : 0,
  };
}

function hatch(kit, type) {
  const s = kit.s, z = s.zone || { l: 0, r: 1280 }, x = Math.min(z.r - 180, Math.max(z.l + 160, (s.riley?.x || 400) + 40)), y = s.riley?.y || 640;
  const h = {
    type: 'hatch', alive: true, entering: false, canBeHit: false, gone: false, x, y, z: 0, vx: 0, vz: 0, state: 'idle', team: 1, facing: 1,
    T: { speed: 0, score: 0, boss: false, name: '' }, def: { shadowW: 40, team: 1 },
    update() {}, physics() {}, sync() { this.sprite?.setPosition?.(this.x, this.y); }, takeHit() { return false; }, releaseHold() {}, face() {},
    destroy() { this.sprite?.destroy?.(); this.alive = false; this.gone = true; },
  };
  h.sprite = s.add?.sprite?.(x, y, 's6hatch', 0); h.sprite?.setOrigin?.(0.5, 0.96); h.sprite?.setDepth?.(1000 + y);
  s.enemies.push(h); sfxCue('craneCreak');
  const timer = s.time?.delayedCall?.(1000, () => {
    if (!h.alive && h.gone) return;
    h.alive = false; h.gone = true; h.sprite?.setFrame?.(1);
    const e = kit._spawn?.(type, 'R');
    if (e) { e.x = x; e.y = y; e.entering = false; }
  });
  (kit.hooks || (kit.hooks = [])).push(() => { timer?.remove?.(); h.destroy(); });
  return h;
}

export function installStage6SceneHooks(kit) {
  const s = kit.s;
  hook(kit, s, 'spawn', original => function(type, side) {
    if (side === 'B') return hatch(kit, type);
    const e = original.call(this, type, side);
    if (e?.type === 'fadelt') linkTrollocs(e, this.enemies);
    return e;
  });
  kit._spawn = (type, side) => s.spawn(type, side);
  hook(kit, s, 'callLoial', () => function() { return callRand(kit); });
  hook(kit, s, 'onEnemyDie', original => function(e) {
    if (e && !e.randKill && e.type !== 'hatch') noteRileyKo(kit.rand);
    if (e?.type === 'hatch') return;
    return original.call(this, e);
  });
  hook(kit, s, 'update', original => function(time, deltaMs) {
    if (kit.flushInp) { kit.flushInp = 0; this.inp?.flushPresses?.(); }
    if (!kit.strike) return original.call(this, time, deltaMs);
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || this.paused || this.cutscene) return;
    const dt = stage4Delta(Math.min(deltaMs, 50) / 1000);
    stepStrike(kit, dt);
    this.riley?.sync?.();
    for (const e of this.enemies || []) e.sync?.();
  });
  hook(kit, s, 'rileyDied', original => function() {
    abortRandCall(this); if (kit.strike) endStrike(kit, false); if (kit.rand) kit.rand.on = false;
    this.riley?.grabbedBy?.releaseHold?.('break');
    for (const e of this.enemies || []) e.releaseHold?.('break');
    return original.call(this);
  });
  hook(kit, s, 'spawnFireball', original => function(R) {
    const had = this.powers?.boost;
    if (kit.empowered && this.powers && had?.kind !== 'saangreal') this.powers.boost = { kind: 'angreal', t: 0.2, total: 0.2 };
    try { return original.call(this, R); }
    finally { kit.empowered = false; if (this.powers) this.powers.boost = had; }
  });
}

const CALLS = ['riley_st6_call_01', 'riley_st6_call_02'];
export function callRand(kit) {
  const s = kit.s;
  if (!s.started || s.gameOver || s.ended || s.victoryPending) return false;
  const ctx = randCtx(kit);
  if (refuseReason(kit.rand, ctx)) {
    if ((s.time?.now || 0) - (kit.waitAt || -1e9) > 2500) { kit.waitAt = s.time?.now || 0; stage6Say('riley_st6_rand_wait_01', s.caption, false); }
    return false;
  }
  trySpend(kit.rand, ctx);
  s.riley?.grabbedBy?.releaseHold?.('break');
  stage6Say(CALLS[(kit.rand.calls - 1) % CALLS.length], s.caption);
  const go = () => startStrike(kit);
  if (!playCall(s, go)) go();
  return true;
}

function startStrike(kit) {
  const s = kit.s;
  if (!s.riley || s.ended || s.gameOver) { kit.rand.on = false; return; }
  const list = eligibleTargets(s.enemies, s.camX || 0, VW);
  const plan = allocateStrikes(list);
  kit.strike = { t: 0, plan, list, resolved: false, spawned: 0, bolts: [], fires: [], dim: null, rand: null, glow: null, flash: null };
  freezeStrike(kit);
  sfxCue('randThunder');
  const x = (s.camX || 0) + 110, y = LANE_TOP + 16;
  kit.strike.rand = s.add?.sprite?.(x, y, 's6rand', 0);
  kit.strike.rand?.setOrigin?.(0.5, 0.96); kit.strike.rand?.setScale?.(3.4); kit.strike.rand?.setDepth?.(1500);
  kit.strike.dim = s.add?.image?.((s.camX || 0) + VW / 2, 360, 'glow');
  kit.strike.dim?.setScrollFactor?.(0); kit.strike.dim?.setDepth?.(4500); kit.strike.dim?.setTint?.(0x05060c); kit.strike.dim?.setAlpha?.(0.7); kit.strike.dim?.setScale?.(40);
}

function stepStrike(kit, dt) {
  const s = kit.s, st = kit.strike;
  if (!st) return;
  st.t += dt;
  if (st.t >= 0.3 && !st.glow && s.lights?.addLight) st.glow = s.lights.addLight((s.camX || 0) + 110, LANE_TOP, 220, 0x7dffa0, 1.2, 50);
  const shown = st.plan.bolts.length + st.plan.fires.length;
  const idx = Math.min(shown, Math.floor(Math.max(0, st.t - 0.5) / RAND.boltGap));
  while (st.spawned < idx) {
    const i = st.spawned || 0; st.spawned = i + 1;
    const bolt = i < st.plan.bolts.length;
    const e = bolt ? st.plan.bolts[i] : st.plan.fires[i - st.plan.bolts.length];
    if (!e) continue;
    const key = bolt ? 'fx_lightning' : 'core';
    const im = s.add?.image?.(e.x, e.y - 80, key);
    im?.setBlendMode?.('ADD'); im?.setDepth?.(4600); im?.setScale?.(bolt ? 0.4 : 0.8, bolt ? 2.2 : 0.8);
    (bolt ? st.bolts : st.fires).push(im);
    if (s.fx) s.fx.trauma = Math.min(0.8, (s.fx.trauma || 0) + 0.15);
    sfxCue(bolt ? 'randCrack' : 'randWhoosh');
    if (!st.flash && s.lights?.addLight) st.flash = s.lights.addLight(e.x, e.y, 180, 0xd6ecff, 1.4, 40);
    if (st.flash) { st.flash.x = e.x; st.flash.y = e.y; }
  }
  if (st.t >= 1.3 && !st.resolved) {
    st.resolved = true;
    kit.stone?.cancelTells?.(s.camX || 0, VW);
    for (const e of [...st.plan.bolts, ...st.plan.fires]) {
      const fx = randEffect(e);
      if (!fx) continue;
      if (fx.killed && e.die) e.die(1, { kb: 200 });
    }
    randBark(s.caption);
    kit.rand.on = false;
  }
  if (st.t >= 2) endStrike(kit);
}

function endStrike(kit, grantInv = true) {
  const s = kit.s, st = kit.strike;
  if (!st) return;
  for (const im of [...st.bolts, ...st.fires]) im?.destroy?.();
  st.dim?.destroy?.(); st.rand?.destroy?.();
  if (st.glow) s.lights?.removeLight?.(st.glow);
  if (st.flash) s.lights?.removeLight?.(st.flash);
  if (grantInv && s.riley) s.riley.inv = Math.max(s.riley.inv || 0, RAND.inv);
  kit.rand.on = false; kit.strike = null;
  thawStrike(kit);
}

export function holdDown(kit, dt) {
  const s = kit.s;
  for (const e of s.enemies || []) {
    if (!e || e.type === 'belal' || e.type === 'hatch' || !e.alive) continue;
    const t = Math.max(e.randDown || 0, e.daze || 0);
    if (t > 0) {
      e._randHeld = 1; e.state = 'down'; e.st = 0;
      if (e.randDown > 0) e.randDown = Math.max(0, e.randDown - dt);
      if (e.daze > 0) e.daze = Math.max(0, e.daze - dt);
    } else if (e._randHeld) {
      e._randHeld = 0; e.st = 0;
      if (e.type === 'grayman' || e.type === 'fadelt') e.state = 'idle';
      else e.setState?.('approach', 'walk');
    }
  }
}

export function restoreStage6Hooks(kit) {
  abortRandCall(kit.s);
  if (kit.rand) kit.rand.on = false;
  if (kit.strike) endStrike(kit, false);
  for (let i = (kit.hooks?.length || 0) - 1; i >= 0; i--) kit.hooks[i]();
  if (kit.hooks) kit.hooks.length = 0;
  dropBlob();
}

/** Bot reaction delay. Samples are game-time old. An unseen Gray Man is left out. */
export function lateEnemies(bot) {
  const d = bot.lag, s = bot.s, t = bot.t, m = bot.mem || (bot.mem = new Map()), out = [];
  bot._e = s.enemies;
  for (const e of s.enemies || []) {
    if (!e || e.type === 'hatch' || e.entering || e.alive === false) continue;
    if (e.type === 'grayman' && !grayVisible(e)) continue;
    let a = m.get(e);
    if (!a) m.set(e, a = []);
    a.push(t, e.state, e.x, e.y, e.st, e.hitI | 0, e.hp, e.canBeHit);
    let i = 0;
    while (i + 16 <= a.length && a[i + 8] <= t - d) i += 8;
    if (i) a.splice(0, i);
    if (!(a[0] <= t - d)) continue;
    let state = a[1], st = a[4];
    if (e.type === 'belal' && state === 'attack' && !a[5] && st < 0.04) { state = 'stagger'; st = 0.2; }
    out.push({ type: e.type, alive: true, entering: false, canBeHit: a[7], T: e.T, state, x: a[2], y: a[3], st, hitI: a[5], hp: a[6] });
  }
  return out;
}

export { warmRand };
