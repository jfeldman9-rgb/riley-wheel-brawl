// Stage 7 autopilot. Hazards are read live. Enemy positions lag when bot.lag is set.
import { LANE_TOP, LANE_BOT, q } from './config.js';
import { refuseReason } from './moilan-call.js';
import { bandOf, bandY } from './stage7-notes.js';
import { lateEnemies } from './stage7-lifecycle.js';

const go = (bot, x, y, run = false) => {
  const storm = bot.s.kit?.storm;
  if (storm?.gusting && bot.s.zoneI === 1 && (x === 0 || Math.sign(x) === -(storm.dir || 1))) x = -(storm.dir || 1);
  bot.s.inp.demo = { x, y, run };
  return true;
};
const press = (bot, key, gap) => { if (bot.t < (bot.next || 0)) return; bot.s.inp.press(key); bot.next = bot.t + gap; };
const adx = (a, b) => Math.abs(a.x - b.x);
const ady = (a, b) => Math.abs((a.y || 0) - (b.y || 0));
const liveOf = s => (s.enemies || []).filter(e => e.alive && !e.entering && e.type !== 'hatch');

function yTo(R, y) { return Math.abs(R.y - y) > 8 ? Math.sign(y - R.y) : 0; }

function dodgeHazards(bot, s, R, k) {
  const th = k.threats?.() || {};
  const shock = th.shock?.[0];
  if (shock && (R.z || 0) < 20 && Math.abs(R.x - shock.x) < shock.r + 140) { press(bot, 'jump', 0.35); return go(bot, 0, 0); }
  const boss = (bot._e || s.enemies || []).find(e => e.type === 'asmodean' && e.alive);
  if (boss?.state === 'channel' && boss.st > 1.35 && (R.z || 0) < 16) { press(bot, 'jump', 0.4); return go(bot, 0, 0); }
  const rain = th.rains?.[0];
  if (rain && Math.abs(R.x - rain.x) < (rain.w || 220) / 2 + 20) return go(bot, Math.sign(R.x - rain.x) || -1, 0, 1);
  const ring = th.rings?.[0];
  if (ring && ring.phase && Math.hypot(R.x - ring.x, R.y - ring.y) < (ring.r || 72) + 16 && (R.z || 0) < 12) {
    press(bot, 'jump', 0.35);
    return go(bot, Math.sign(R.x - ring.x) || 1, 0, 1);
  }
  if (th.bash && adx(R, th.bash) < 200 && ady(R, th.bash) < 40) return go(bot, Math.sign(R.x - th.bash.x) || -1, R.y <= th.bash.y ? -1 : 1, 1);
  const arrow = liveOf(s).find(e => e.type === 'veiled' && (e.state === 'draw' || e.state === 'aim') && ady(R, e) < 30);
  if (arrow) return go(bot, 0, R.y < 640 ? 1 : -1, 1);
  const shot = (s.s7Arrows || []).find(a => Math.abs(a.y - R.y) < 26 && Math.abs(a.x - R.x) < 240 && (a.x - R.x) * (a.vx || 0) > 0);
  if (shot) return go(bot, 0, R.y < 640 ? 1 : -1, 1);
  const kneel = liveOf(s).find(e => e.type === 'dancer' && (e.state === 'kneel' || e.state === 'lunge') && adx(R, e) < 280 && ady(R, e) < 36);
  if (kneel) return go(bot, Math.sign(R.x - kneel.x) || -1, R.y < (kneel.y || R.y) ? -1 : 1, 1);
  return null;
}

function strike(bot, R, e, reach) {
  if (!e || e.canBeHit === false || e.state === 'down' || e.state === 'yield' || e.state === 'dead') return go(bot, 0, 0);
  const side = Math.sign(e.x - R.x) || 1, x = adx(R, e), y = ady(R, e);
  if (x > reach) return go(bot, side, y > 12 ? Math.sign(e.y - R.y) : 0, 1);
  if (R.facing !== side) return go(bot, side, y > 12 ? Math.sign(e.y - R.y) : 0, 1);
  if (y > 16) return go(bot, 0, Math.sign(e.y - R.y), 1);
  if (!R.busy) press(bot, 'attack', e.T?.boss ? 0.16 : 0.12);
  return go(bot, 0, 0);
}

function beam(bot, R, e) {
  if (!e || R.busy || (R.saidin || 0) < 100 || bot.t < (bot.bfT || 0)) return false;
  const x = adx(R, e), side = Math.sign(e.x - R.x) || 1;
  if (x < 30 || x > 720) return false;
  if (R.facing !== side) return go(bot, side, 0);
  bot.s.inp.press('power'); bot.bfT = bot.t + 4;
  return go(bot, 0, 0);
}

function laneY(R, away) {
  if (away < 0 && R.y < LANE_TOP + 10) return 1;
  if (away > 0 && R.y > LANE_BOT - 10) return -1;
  return away;
}

function fadePlan(bot, R, fade) {
  if ((R.saidin || 0) >= 100) { const shot = beam(bot, R, fade); if (shot) return shot; }
  const cast = blast(bot, R, fade); if (cast) return cast;
  if (fade.state === 'hurt' || fade.state === 'down') return strike(bot, R, fade, 160);
  if (fade.state === 'attack' && fade.hitI === 2 && ady(R, fade) > 36) return strike(bot, R, fade, 170);
  const dx = fade.x - R.x, ad = Math.abs(dx);
  const x = ad < 130 ? (-Math.sign(dx) || -1) : ad > 200 ? (Math.sign(dx) || 1) : 0;
  const y = ady(R, fade) < 46 ? laneY(R, R.y <= fade.y ? -1 : 1) : 0;
  return go(bot, x, y, true);
}

function noteHot(boss, R) {
  const mine = bandOf(R.y);
  if ((boss.tells || []).includes(mine)) return true;
  return (boss.notes || []).some(n => !n.reflected && n.band === mine && n.x > R.x - 70 && n.x < R.x + 380);
}

function bossPlan(bot, s, R, k, boss, trash, gustX) {
  if (boss.state === 'channel') return strike(bot, R, boss, 170);
  if (boss.state === 'stagger' || boss.state === 'stun') {
    const cast = blast(bot, R, boss) || beam(bot, R, boss);
    if (cast) return cast;
    return strike(bot, R, boss, 170);
  }
  if (boss.state === 'bashTell' || boss.state === 'bash') return go(bot, Math.sign(R.x - boss.x) || -1, laneY(R, R.y <= boss.y ? -1 : 1), 1);
  const hot = noteHot(boss, R);
  if (hot) {
    const safe = k.safeBand?.();
    if (safe != null && bandOf(R.y) !== safe) return go(bot, 0, yTo(R, bandY(safe)), 1);
  }
  const near = !hot && trash.find(e => adx(R, e) < 160 && ady(R, e) < 30 && (e.state === 'attack' || e.state === 'lunge' || e.state === 'draw' || adx(R, e) < 90));
  if (near) return strike(bot, R, near, near.type === 'veiled' ? 160 : 140);
  const cast = beam(bot, R, boss) || blast(bot, R, boss);
  if (cast) return cast;
  if (!hot) return strike(bot, R, boss, 165);
  const dx = boss.x - R.x, ad = Math.abs(dx);
  if (ad > 240) return go(bot, Math.sign(dx) || 1, 0, 1);
  if (ad < 140) return go(bot, -Math.sign(dx) || -1, 0, 1);
  if (gustX && k.storm?.gusting) return go(bot, gustX, 0, 1);
  return go(bot, 0, 0);
}

function blast(bot, R, e) {
  const s = bot.s;
  if (s.noPower || R.busy || bot.t < (bot.specT || 0)) return false;
  const kind = s.powers?.castKind?.(R);
  const fadeUp = (s.enemies || []).some(en => en && en.alive && en.type === 'fadelt');
  if (!kind || (kind === 'fireball' && (!s.powers?.boost || fadeUp || s.zoneI < 2))) return false;
  const side = Math.sign(e.x - R.x) || 1, x = adx(R, e);
  if (x < 80 || x > 560 || ady(R, e) > 70) return false;
  if (R.facing !== side) return go(bot, side, 0);
  s.inp.press('special'); bot.specT = bot.t + 0.55;
  return go(bot, 0, 0);
}

export function stage7Bot(bot) {
  const s = bot.s;
  if (s.stageNo !== 7) return false;
  const back = bot.lag && lateEnemies(bot);
  if (back) s.enemies = back;
  try { return play(bot); }
  finally { if (back) s.enemies = bot._e; }
}

function play(bot) {
  const s = bot.s, R = s.riley, k = s.kit;
  if (!k || !R) return go(bot, 0, 0);
  if (R.state === 'grabbed') {
    s.inp.press('attack'); s.inp.press('jump'); s.inp.press('special'); s.inp.press('power');
    return go(bot, 0, 0);
  }
  if (R.state === 'down' || R.state === 'getup' || R.state === 'dead' || !R.alive) return go(bot, 0, 0);
  const away = dodgeHazards(bot, s, R, k);
  if (away) return away;
  const gustX = k.storm?.gusting ? -k.storm.dir : 0;
  const live = liveOf(s);
  const boss = live.find(e => e.type === 'asmodean' && e.state !== 'bound');
  const useCall = bot.useCall || q.get('call7') === '1';
  if (useCall && boss?.canBeHit && (boss.phase || 1) >= 3 && boss.hp <= 72 && boss.hp > 8 && k.call && refuseReason(k.call, k.callCtx()) === '' && bot.t >= (bot.callAt || 0)) {
    s.inp.press('assist'); bot.callAt = bot.t + 4; return go(bot, 0, 0);
  }
  const fade = live.find(e => e.type === 'fadelt' && e.state !== 'dead');
  const gift = (s.pickups || []).find(p => p && p.x > s.bounds.l && p.x < s.bounds.r && (p.kind === 'heal' ? R.hp < 70 : p.kind === 'saidin' ? (R.saidin || 0) < 40 : p.power || p.kind === 'ribbon'));
  if (gift && adx(R, gift) < (boss ? 180 : 420) && !(boss && (boss.state === 'stun' || boss.state === 'channel' || boss.phase >= 3)) && !(fade && fade.state === 'attack')) return go(bot, Math.sign(gift.x - R.x) || 1, ady(R, gift) > 10 ? Math.sign(gift.y - R.y) : 0, 1);
  if (R.hp < 40 && !(fade && fade.state === 'attack') && !(boss && boss.phase >= 2)) {
    const barrel = (s.barrels || []).find(b => !b.broken && b.x > s.bounds.l && b.x < s.bounds.r);
    if (barrel && adx(R, barrel) < 700) return strike(bot, R, barrel, 70);
  }
  const trash = live.filter(e => e.type !== 'asmodean' && e.type !== 'fadelt' && e.canBeHit !== false && e.state !== 'down' && e.state !== 'yield');
  if (trash.length && !(boss && (boss.state === 'stun' || boss.state === 'stagger' || boss.phase >= 3)) && !(fade && (fade.state === 'attack' || adx(R, fade) < 220))) {
    trash.sort((a, b) => (a.type === 'veiled' ? -200 : 0) + adx(a, R) - ((b.type === 'veiled' ? -200 : 0) + adx(b, R)));
    const foe = trash[0];
    if (adx(R, foe) < 96 && ady(R, foe) < 26 && (foe.state === 'attack' || foe.state === 'lunge' || foe.state === 'draw')) {
      return go(bot, Math.sign(R.x - foe.x) || -1, R.y <= foe.y ? -1 : 1, 1);
    }
    const shot = blast(bot, R, foe); if (shot) return shot;
    return strike(bot, R, foe, foe.type === 'veiled' ? 160 : 140);
  }
  if (fade) return fadePlan(bot, R, fade);
  if (boss) return bossPlan(bot, s, R, k, boss, trash, gustX);
  if (!live.length) {
    if (s.locked) return go(bot, R.x > ((s.bounds?.l || 0) + (s.bounds?.r || 5200)) / 2 ? -1 : 1, 0, false);
    return go(bot, gustX || 1, R.y > 650 ? -1 : R.y < 600 ? 1 : 0, true);
  }
  const waiting = live.find(e => e.state === 'down' || e.state === 'hurt' || e.state === 'yield');
  if (waiting) return go(bot, Math.sign(waiting.x - R.x) || -1, yTo(R, waiting.y), 1);
  return go(bot, s.locked ? 0 : (gustX || 1), 0, !s.locked);
}
