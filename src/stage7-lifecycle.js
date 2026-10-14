// Stage 7 hooks. Moiraine/Lan replace Loial only on this scene instance.
import { freezeStrike, thawStrike } from './stage7-freeze.js';
import { stage4Delta } from './stage4-time.js';
import { VW, LANE_TOP } from './config.js';
import { VOLLEY_BANDS } from './stages.js';
import { s7Scale } from './stage7-paint.js';
import { quietStage7 } from './stage7-audio.js';
import {
  CALL7, pickHelper, refuseReason7, trySpend7, eligible7, helperCtx, kind7,
  moiraineEffect, lanEffect, duoBossEffect, noteRileyKo7,
} from './moilan-call.js';
import { playCall7, abortCall7, dropBlob7, warmCall7 } from './call7-cutscene.js';
import { stage7Say, helperBark, sfxCue } from './stage7-voice.js';
import { linkTrollocs } from './fadelt.js';
import { markSpawn } from './stage7-storm.js';
import { bandOfY } from './stage7-street.js';
import { clearNotes } from './stage7-notes.js';

function hook(kit, object, key, wrap) {
  const original = object?.[key];
  if (!object || typeof original !== 'function') return;
  const own = Object.prototype.hasOwnProperty.call(object, key);
  const replacement = wrap(original);
  object[key] = replacement;
  (kit.hooks || (kit.hooks = [])).push(() => { if (own) object[key] = original; else delete object[key]; });
}

export function call7Ctx(kit) {
  const s = kit.s, b = s.boss;
  return {
    paused: !!s.paused, cutscene: !!s.cutscene, victory: !!s.victoryPending,
    callOn: !!kit.strike, balefire: !!s.beam, hittable: eligible7(s.enemies, s.camX || 0, VW).length > 0,
    bossInvuln: !!(b && b.alive && (b.invuln || b.beat)), bossBeat: !!(b && b.beat),
    bossPhase: b && b.alive ? b.phase : 0,
  };
}

export function computePredicted(kit) {
  const s = kit.s;
  return pickHelper(helperCtx(s.enemies, s.camX || 0, VW, s.zoneI === 3));
}

export function installStage7SceneHooks(kit) {
  const s = kit.s;
  hook(kit, s, 'spawn', original => function(type, side) {
    const e = original.call(this, type, side);
    if (e?.type === 'fadelt') linkTrollocs(e, this.enemies);
    if (e) markSpawn(kit.storm, e);
    return e;
  });
  kit._spawn = (type, side) => s.spawn(type, side);
  hook(kit, s, 'callLoial', () => function() { return callMoilan(kit); });
  hook(kit, s, 'onEnemyDie', original => function(e) {
    if (e && !e.callKill) noteRileyKo7(kit.call7);
    return original.call(this, e);
  });
  hook(kit, s, 'update', original => function(time, deltaMs) {
    if (kit.deathAudio && this.riley?.alive) {
      kit.deathAudio = false;
      if (!this.ended && !this.victoryPending && !this.gameOver && this.music?.state === 'silent') this.music.resumeFight?.();
    }
    if (kit.flushInp) { kit.flushInp = 0; this.inp?.flushPresses?.(); }
    if (!kit.strike) return original.call(this, time, deltaMs);
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || this.paused || this.cutscene) return;
    const dt = stage4Delta(Math.min(deltaMs, 50) / 1000);
    stepStrike(kit, dt);
    this.riley?.sync?.();
    for (const e of this.enemies || []) e.sync?.();
  });
  hook(kit, s, 'rileyDied', original => function() {
    abortCall7(this); if (kit.strike) endStrike(kit, false); if (kit.call7) kit.call7.on = false;
    quietStage7(this); kit.deathAudio = true;
    this.riley?.grabbedBy?.releaseHold?.('break');
    for (const e of this.enemies || []) e.releaseHold?.('break');
    return original.call(this);
  });
  hook(kit, s, 'continueGame', original => function() {
    quietStage7(this); kit.deathAudio = false;
    return original.call(this);
  });
}

const CALL_LINES = { moiraine: 'riley_st7_call_01', lan: 'riley_st7_call_02', duo: 'riley_st7_call_03' };
const DUR = { moiraine: [1.0, 1.6], lan: [0.55, 0.9], duo: [1.1, 1.8] };

export function callMoilan(kit) {
  const s = kit.s;
  if (!s.started || s.gameOver || s.ended || s.victoryPending) return false;
  const ctx = call7Ctx(kit);
  if (refuseReason7(kit.call7, ctx)) {
    if ((s.time?.now || 0) - (kit.waitAt || -1e9) > 2500) { kit.waitAt = s.time?.now || 0; s.hud?.flashText?.('NOT YET'); }
    return false;
  }
  const helper = computePredicted(kit);
  trySpend7(kit.call7, ctx);
  s.riley?.grabbedBy?.releaseHold?.('break');
  stage7Say(CALL_LINES[helper], s.caption);
  const go = () => startStrike(kit, helper);
  if (!playCall7(s, helper, go)) go();
  return true;
}

function planFor(kit, helper) {
  const s = kit.s;
  const list = eligible7(s.enemies, s.camX || 0, VW);
  if (helper === 'duo') return { primaries: [], humans: [], boss: s.boss?.alive ? s.boss : null };
  if (helper === 'lan') {
    const band = bandOfY(s.riley?.y ?? VOLLEY_BANDS[1][0]);
    const onBand = list.filter(e => bandOfY(e.y) === band);
    const spawn = onBand.filter(e => kind7(e) === 'trolloc' || kind7(e) === 'fadelt').slice(0, CALL7.lan.kos);
    const humans = onBand.filter(e => kind7(e) === 'human');
    return { primaries: spawn, humans, boss: null, band };
  }
  const spawn = list.filter(e => kind7(e) === 'trolloc' || kind7(e) === 'fadelt').slice(0, CALL7.moiraine.kos);
  const humans = list.filter(e => kind7(e) === 'human');
  return { primaries: spawn, humans, boss: null };
}

function startStrike(kit, helper) {
  const s = kit.s;
  if (!s.riley || s.ended || s.gameOver) { kit.call7.on = false; return; }
  const plan = planFor(kit, helper);
  const [resolveAt, endAt] = DUR[helper] || DUR.moiraine;
  kit.strike = { t: 0, helper, plan, resolveAt, endAt, resolved: false, spawned: 0, rocks: [], dim: null, actor: null, actor2: null, glow: null, flash: null };
  kit.stats.calls = (kit.stats.calls || 0) + 1;
  freezeStrike(kit);
  sfxCue(helper === 'lan' ? 'lanSlash' : helper === 'duo' ? 'shieldFlare' : 'earthHeave');
  const camX = s.camX || 0;
  const y = s.riley?.y || LANE_TOP + 60;
  if (helper === 'moiraine' || helper === 'duo') {
    kit.strike.actor = s.add?.sprite?.(camX + 120, y, 's7moir', 1);
    kit.strike.actor?.setOrigin?.(0.5, 0.96); kit.strike.actor?.setScale?.(s7Scale(s, 's7moir', 3.2)); kit.strike.actor?.setDepth?.(1500);
  }
  if (helper === 'lan' || helper === 'duo') {
    kit.strike.actor2 = s.add?.sprite?.(camX - 40, y, 's7lan', 0);
    kit.strike.actor2?.setOrigin?.(0.5, 0.96); kit.strike.actor2?.setScale?.(s7Scale(s, 's7lan', 3.2)); kit.strike.actor2?.setDepth?.(1510);
  }
  kit.strike.dim = s.add?.image?.(camX + VW / 2, 360, 'glow');
  kit.strike.dim?.setScrollFactor?.(0); kit.strike.dim?.setDepth?.(4500); kit.strike.dim?.setTint?.(0x05060c); kit.strike.dim?.setAlpha?.(0.55); kit.strike.dim?.setScale?.(40);
}

function kill(e) {
  if (typeof e.die === 'function') e.die(1, { kb: 200 });
  else { e.alive = false; e.scene?.onEnemyDie?.(e); }
}

function resolveStrike(kit) {
  const s = kit.s, st = kit.strike, plan = st.plan;
  if (st.helper === 'duo') {
    const boss = plan.boss || s.boss;
    if (boss?.field) clearNotes(boss.field);
    kit.arena?.clearShards?.();
    if (kit.street) kit.street.ring = null;
    if (boss?.alive) {
      if (boss.state === 'channel') boss.channelAt = 6;
      duoBossEffect(boss);
    }
  } else if (st.helper === 'lan') {
    for (const e of [...plan.primaries, ...plan.humans]) {
      const fx = lanEffect(e);
      if (!fx) continue;
      if (fx.yield) { if (typeof e.yieldNow === 'function') e.yieldNow(); else kill(e); }
      else if (fx.killed) kill(e);
    }
  } else {
    for (const e of [...plan.primaries, ...plan.humans]) {
      const fx = moiraineEffect(e);
      if (fx?.killed) kill(e);
    }
  }
  helperBark(st.helper, s.caption);
  kit.call7.on = false;
}

function stepStrike(kit, dt) {
  const s = kit.s, st = kit.strike;
  if (!st) return;
  st.t += dt;
  if (st.t >= 0.25 && !st.glow && s.lights?.addLight) {
    const col = st.helper === 'lan' ? 0xe8f2ff : 0x8fe3ff;
    st.glow = s.lights.addLight((s.camX || 0) + 160, LANE_TOP, 240, col, 1.1, 50);
  }
  if (st.helper === 'moiraine') {
    const shown = st.plan.primaries.length;
    const idx = Math.min(shown, Math.floor(Math.max(0, st.t - 0.3) / CALL7.moiraine.rockGap));
    while (st.spawned < idx) {
      const e = st.plan.primaries[st.spawned]; st.spawned++;
      if (!e) continue;
      const im = s.add?.image?.(e.x, e.y - 10, 's7earth');
      im?.setDepth?.(4600); im?.setScale?.(1.6, 2.4);
      st.rocks.push(im);
      if (s.fx) s.fx.trauma = Math.min(0.8, (s.fx.trauma || 0) + 0.12);
      sfxCue('earthHeave');
    }
  }
  if ((st.helper === 'lan' || st.helper === 'duo') && st.actor2) {
    const camX = s.camX || 0;
    const k = Math.min(1, st.t / CALL7.lan.dash);
    st.actor2.x = camX - 40 + k * (VW + 120);
    st.actor2.setFrame?.(k < 0.5 ? 0 : 2);
  }
  if (st.helper === 'duo' && st.actor) st.actor.setFrame?.(st.t < 0.5 ? 1 : 2);
  if (st.t >= st.resolveAt && !st.resolved) { st.resolved = true; resolveStrike(kit); }
  if (st.t >= st.endAt) endStrike(kit);
}

function endStrike(kit, grantInv = true) {
  const s = kit.s, st = kit.strike;
  if (!st) return;
  for (const im of st.rocks) im?.destroy?.();
  st.dim?.destroy?.(); st.actor?.destroy?.(); st.actor2?.destroy?.();
  if (st.glow) s.lights?.removeLight?.(st.glow);
  if (st.flash) s.lights?.removeLight?.(st.flash);
  if (grantInv && s.riley) s.riley.inv = Math.max(s.riley.inv || 0, CALL7.inv);
  kit.call7.on = false; kit.strike = null;
  thawStrike(kit);
}

const LIGHT_TYPES = new Set(['dancer', 'veiled', 'fadelt', 'grayman']);
export function holdDown7(kit, dt) {
  const s = kit.s;
  for (const e of s.enemies || []) {
    if (!e || e.type === 'asmodean' || !e.alive) continue;
    const t = Math.max(e.callDown || 0, e.randDown || 0, e.daze || 0);
    if (t > 0) {
      e._callHeld = 1; e.state = 'down'; e.st = 0;
      if (e.callDown > 0) e.callDown = Math.max(0, e.callDown - dt);
      if (e.randDown > 0) e.randDown = Math.max(0, e.randDown - dt);
      if (e.daze > 0) e.daze = Math.max(0, e.daze - dt);
    } else if (e._callHeld) {
      e._callHeld = 0; e.st = 0;
      if (LIGHT_TYPES.has(e.type)) e.state = 'idle';
      else e.setState?.('approach', 'walk');
    }
  }
}

export function restoreStage7Hooks(kit) {
  abortCall7(kit.s);
  quietStage7(kit.s);
  if (kit.call7) kit.call7.on = false;
  if (kit.strike) endStrike(kit, false);
  for (let i = (kit.hooks?.length || 0) - 1; i >= 0; i--) kit.hooks[i]();
  if (kit.hooks) kit.hooks.length = 0;
  dropBlob7();
}

export function lateEnemies7(bot) {
  const d = bot.lag, s = bot.s, t = bot.t, m = bot.mem || (bot.mem = new Map()), out = [];
  const present = new Set(s.enemies || []);
  for (const e of m.keys()) if (!present.has(e) || e.alive === false || e.gone) m.delete(e);
  for (const e of s.enemies || []) {
    if (!e || e.entering || e.alive === false || e.gone) continue;
    let a = m.get(e);
    if (!a) m.set(e, a = []);
    a.push(t, e.state, e.x, e.y, e.st, e.hitI | 0, e.hp, e.canBeHit);
    let i = 0;
    while (i + 16 <= a.length && a[i + 8] <= t - d) i += 8;
    if (i) a.splice(0, i);
    if (!(a[0] <= t - d)) continue;
    // Lead the stale read by its own last-seen velocity, like a player tracking motion.
    let px = a[2];
    if (a.length >= 16 && a[8] > a[0]) {
      const vel = Math.max(-520, Math.min(520, (a[10] - a[2]) / (a[8] - a[0])));
      px = a[2] + vel * (t - a[0]);
    }
    out.push({ type: e.type, alive: true, entering: false, canBeHit: a[7], T: e.T, state: a[1], x: px, y: a[3], st: a[4], hitI: a[5], hp: a[6], phase: e.phase, ref: e });
  }
  return out;
}

export { warmCall7 };
