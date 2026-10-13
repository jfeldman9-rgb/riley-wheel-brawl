// Stage 7 hooks. Moiraine and Lan replace Loial only on this scene instance.
import { freezeStrike, thawStrike } from './stage7-freeze.js';
import { stage4Delta } from './stage4-time.js';
import { VW } from './config.js';
import { quietStage6 } from './stage6-audio.js';
import { refuseReason, trySpend, noteRileyKo, CALL7, pickHelper, planStrike, moiraineEffect, lanEffect, duoEffect, onScreen, classify } from './moilan-call.js';
import { playCall7, abortCall7, dropBlob, warmCall } from './call7-cutscene.js';
import { stage7Say, sfxCue } from './stage7-voice.js';
import { linkTrollocs } from './fadelt.js';
import { veilSpawn } from './stage7-storm.js';
import { s7Scale } from './stage7-paint.js';

const DUR = { moiraine: 1.6, lan: 0.9, duo: 1.8 };
const RILEY_LINE = { moiraine: 'riley_st7_call_01', lan: 'riley_st7_call_02', duo: 'riley_st7_call_03' };
const HELPER_LINE = { moiraine: ['st7_moi_call_01', 'st7_moi_call_02'], lan: ['st7_lan_call_01', 'st7_lan_call_02'], duo: ['st7_duo_call_01'] };

function hook(kit, object, key, wrap) {
  const original = object?.[key];
  if (!object || typeof original !== 'function') return;
  const own = Object.prototype.hasOwnProperty.call(object, key);
  object[key] = wrap(original);
  (kit.hooks || (kit.hooks = [])).push(() => { if (own) object[key] = original; else delete object[key]; });
}

export function callCtx(kit) {
  const s = kit.s, b = s.boss;
  const list = (s.enemies || []).filter(e => onScreen(e, s.camX || 0, VW) && classify(e) !== 'other');
  return {
    paused: !!s.paused, cutscene: !!s.cutscene, victory: !!s.victoryPending,
    callOn: !!kit.strike, balefire: !!s.beam, hittable: list.length > 0,
    bossInvuln: !!(b && b.alive && (b.invuln || b.beat)), bossBeat: !!(b && b.beat),
    bossPhase: b && b.alive ? b.phase : 0,
  };
}

export function helperCtx(kit) {
  const s = kit.s;
  const list = (s.enemies || []).filter(e => e && e.alive && !e.entering && onScreen(e, s.camX || 0, VW));
  return {
    boss: !!(s.boss && s.boss.alive) || s.zoneI === 3,
    zoneI: s.zoneI,
    spawnOnScreen: list.filter(e => classify(e) === 'spawn').length,
    humansOnScreen: list.filter(e => classify(e) === 'human').length,
    eliteOnScreen: list.some(e => e.type === 'fadelt'),
  };
}

export function installStage7SceneHooks(kit) {
  const s = kit.s;
  hook(kit, s, 'spawn', original => function (type, side) {
    const e = original.call(this, type, side);
    if (e?.type === 'fadelt') linkTrollocs(e, this.enemies);
    if (e && kit.storm?.gusting) veilSpawn(e);
    return e;
  });
  kit._spawn = (type, side) => s.spawn(type, side);
  hook(kit, s, 'callLoial', () => function () { return callHelpers(kit); });
  hook(kit, s, 'onEnemyDie', original => function (e) {
    if (e && !e.callKill && !e.callYield && e.type !== 'hatch') noteRileyKo(kit.call);
    return original.call(this, e);
  });
  hook(kit, s, 'update', original => function (time, deltaMs) {
    if (kit.flushInp) { kit.flushInp = 0; this.inp?.flushPresses?.(); }
    if (!kit.strike) return original.call(this, time, deltaMs);
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || this.paused || this.cutscene) return;
    const dt = stage4Delta(Math.min(deltaMs, 50) / 1000);
    stepStrike(kit, dt);
    this.riley?.sync?.();
    for (const e of this.enemies || []) e.sync?.();
  });
  hook(kit, s, 'rileyDied', original => function () {
    if (this.zoneI === 1) { kit.z1Deaths = (kit.z1Deaths || 0) + 1; if (kit.storm?.gusting) kit.gustDeaths = (kit.gustDeaths || 0) + 1; }
    abortCall7(this); if (kit.strike) endStrike(kit, false); if (kit.call) kit.call.on = false;
    quietStage6(this); kit.deathAudio = true;
    this.riley?.grabbedBy?.releaseHold?.('break');
    for (const e of this.enemies || []) e.releaseHold?.('break');
    return original.call(this);
  });
  hook(kit, s, 'continueGame', original => function () {
    quietStage6(this); kit.deathAudio = false;
    return original.call(this);
  });
}

export function callHelpers(kit) {
  const s = kit.s;
  if (!s.started || s.gameOver || s.ended || s.victoryPending) return false;
  const ctx = callCtx(kit);
  const helper = pickHelper(helperCtx(kit));
  if (refuseReason(kit.call, ctx)) return false;
  trySpend(kit.call, ctx);
  s.riley?.grabbedBy?.releaseHold?.('break');
  for (const e of s.enemies || []) e.releaseHold?.('break');
  kit.stats.calls = (kit.stats.calls || 0) + 1;
  kit.pendingHelper = helper;
  stage7Say(RILEY_LINE[helper] || RILEY_LINE.moiraine, s.caption);
  const go = () => startStrike(kit, helper);
  playCall7(s, helper, go);
  return true;
}

function startStrike(kit, helper) {
  const s = kit.s;
  if (!s.riley || s.ended || s.gameOver) { if (kit.call) kit.call.on = false; return; }
  const plan = planStrike(helper, s.enemies, s.camX || 0, s.riley.y, VW);
  kit.strike = { t: 0, helper, plan, resolved: false, dur: DUR[helper] || 1.6 };
  freezeStrike(kit);
  const line = HELPER_LINE[helper] || HELPER_LINE.moiraine;
  stage7Say(line[(kit.call.calls || 1) % line.length], s.caption, false);
  sfxCue(helper === 'lan' ? 'slash' : helper === 'duo' ? 'flare' : 'heave');
  const x = (s.camX || 0) + (helper === 'lan' ? 200 : 140);
  const key = helper === 'lan' ? 's7lan' : 's7moir';
  kit.strike.actor = s.add?.sprite?.(x, s.riley.y, key, 0);
  kit.strike.actor?.setOrigin?.(0.5, 0.96);
  kit.strike.actor?.setScale?.(s7Scale(s, key, helper === 'lan' ? 2.6 : 2.5));
  kit.strike.actor?.setDepth?.(1500);
}

function applyOne(e, fx) {
  if (!fx || !e) return;
  if (fx.yield && e.yieldOut) { e.callYield = true; e.yieldOut(); return; }
  if (fx.killed && e.die) e.die(1, { kb: 220 });
  else if (fx.down && e.alive) { e.state = 'down'; e.st = 0; }
}

function stepStrike(kit, dt) {
  const st = kit.strike;
  if (!st) return;
  st.t += dt;
  const resolveAt = st.helper === 'lan' ? 0.45 : st.helper === 'duo' ? 0.7 : 0.6;
  if (!st.resolved && st.t >= resolveAt) {
    st.resolved = true;
    const s = kit.s;
    if (st.helper === 'duo') {
      s.boss && (s.boss.notes = []);
      if (kit.arena) { kit.arena.shock = null; kit.arena.raining = false; }
      for (const e of st.plan.bosses || []) applyOne(e, duoEffect(e));
    } else if (st.helper === 'lan') {
      for (const e of st.plan.spawn || []) applyOne(e, lanEffect(e, s.riley?.y));
      for (const e of st.plan.humans || []) applyOne(e, lanEffect(e, s.riley?.y));
      for (const e of st.plan.fades || []) applyOne(e, lanEffect(e, s.riley?.y));
    } else {
      for (const e of st.plan.spawn || []) applyOne(e, moiraineEffect(e));
      for (const e of st.plan.humans || []) applyOne(e, moiraineEffect(e));
    }
    if (kit.call) kit.call.on = false;
  }
  if (st.t >= st.dur) endStrike(kit);
}

function endStrike(kit, grantInv = true) {
  const s = kit.s, st = kit.strike;
  if (!st) return;
  st.actor?.destroy?.();
  if (grantInv && s.riley) s.riley.inv = Math.max(s.riley.inv || 0, CALL7.inv);
  if (kit.call) kit.call.on = false;
  kit.strike = null;
  thawStrike(kit);
}

export function holdDown(kit, dt) {
  for (const e of kit.s.enemies || []) {
    if (!e?.alive || e.type === 'asmodean') continue;
    const t = Math.max(e.randDown || 0, e.callDown || 0, e.daze || 0);
    if (t > 0) {
      e.state = 'down'; e.st = 0;
      if (e.randDown > 0) e.randDown = Math.max(0, e.randDown - dt);
      if (e.callDown > 0) e.callDown = Math.max(0, e.callDown - dt);
    }
  }
}

export function restoreStage7Hooks(kit) {
  abortCall7(kit.s);
  quietStage6(kit.s);
  if (kit.call) kit.call.on = false;
  if (kit.strike) endStrike(kit, false);
  kit.s?.riley?.grabbedBy?.releaseHold?.('break');
  for (let i = (kit.hooks?.length || 0) - 1; i >= 0; i--) kit.hooks[i]();
  if (kit.hooks) kit.hooks.length = 0;
  dropBlob();
}

export function lateEnemies(bot) {
  const d = bot.lag, s = bot.s, t = bot.t, m = bot.mem || (bot.mem = new Map()), out = [];
  bot._e = s.enemies;
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
    out.push({ type: e.type, alive: true, entering: false, canBeHit: a[7], T: e.T, state: a[1], x: a[2], y: a[3], st: a[4], hitI: a[5], hp: a[6], phase: e.phase });
  }
  return out;
}

export { warmCall };
