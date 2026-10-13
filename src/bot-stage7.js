import { LANE_TOP, LANE_BOT, q } from './config.js';
import { canCall } from './moilan-call.js';
import { call7Context } from './stage7-lifecycle.js';

import { perceive7 } from './stage7-perception.js';

const go = (bot, x, y, run = false) => { bot.s.inp.demo = { x, y, run: run || (!x && (bot.lag ? bot.stage7Threats?.storm : bot.s.kit?.storm)?.phase === 'gust') }; return true; };
const press = (bot, key, gap) => { if (bot.quiet > bot.t || bot.t < (bot.next || 0)) return; bot.s.inp.press(key); bot.next = bot.t + gap; };
const adx = (a, b) => Math.abs(a.x - b.x);
const ady = (a, b) => Math.abs((a.y || 0) - (b.y || 0));
const liveOf = s => s.enemies.filter(e => e.alive && e.type !== 'hatch' && !e.entering);
const ELITE = new Set(['fadelt', 'asmodean']);

function awayY(R, e) {
  const ey = e?.y || R.y, up = R.y - LANE_TOP, down = LANE_BOT - R.y;
  const need = 48 - Math.abs(R.y - ey);
  let dir = R.y <= ey ? -1 : 1;
  if ((dir < 0 ? up : down) < Math.max(12, need)) dir = -dir;
  return dir;
}


function incoming(e, R) {
  const x = adx(e, R), y = ady(R, e), st = e.state;
  if (e.type === 'dancer' && (st === 'attack' || st === 'lunge')) return x < 360 && y < 42;
  if (e.type === 'veiled' && st === 'attack') return y < 32;
  if (e.type === 'cutthroat' && st === 'lunge') return x < 360 && y < 40;
  if (e.type === 'asmodean' && (st === 'tell' || st === 'lunge')) return x < 560 && y < 50;
  if (e.type === 'asmodean' && st === 'attack') return x < 200 && y < 38;
  if (e.type === 'fadelt' && st === 'blink') return true;
  if (e.type === 'fadelt' && st === 'attack') return x < 230 && y < 46;
  if (st !== 'attack') return false;
  const lim = e.type === 'spear' ? 370 : e.type === 'hound' ? 220 : e.type === 'cutthroat' ? 250 : 270;
  return x < lim && y < 46;
}

function openDir(e) { return (LANE_BOT - (e?.y || 0)) >= ((e?.y || 0) - LANE_TOP) ? 1 : -1; }
function openY(R, e, gap) {
  const target = Math.max(LANE_TOP + 16, Math.min(LANE_BOT - 16, (e.y || R.y) + openDir(e) * gap));
  return Math.abs(R.y - target) > 8 ? Math.sign(target - R.y) : 0;
}
function commit(bot, R, e) {
  const away = R.y <= (e.y || R.y) ? -1 : 1;
  const room = away < 0 ? R.y - LANE_TOP : LANE_BOT - R.y;
  if (e.type !== 'asmodean') return go(bot, 0, room >= Math.max(14, 42 - ady(R, e)) ? away : -away, 1);
  const start = (e.state === 'attack' && !e.hitI && e.st < 0.08) || (e.state === 'tell' && e.st < 0.08);
  if (start || bot.dwho !== e || !bot.dkey) { bot.dkey = openDir(e); bot.dwho = e; }
  return go(bot, 0, bot.dkey, 1);
}

function place(bot, R, e, reach) {
  const side = Math.sign(e.x - R.x) || 1, x = adx(R, e), y = ady(R, e);
  if (x > reach) return go(bot, side, y > 12 ? Math.sign(e.y - R.y) : 0, 1);
  if (y > 14) return go(bot, 0, Math.sign(e.y - R.y), 1);
  if (R.facing !== side) return go(bot, side, 0, 1);
  return go(bot, 0, 0);
}

function strike(bot, R, e, reach, chain = true, tight = false) {
  if (!e || bot.quiet > bot.t || e.state === 'down' || e.state === 'getup' || e.state === 'dead' || e.canBeHit === false) return go(bot, 0, e ? awayY(R, e) : 0);
  const side = Math.sign(e.x - R.x) || 1, x = adx(R, e), y = ady(R, e);
  const off = tight ? (y > 12 ? Math.sign(e.y - R.y) : 0) : (y < 24 ? awayY(R, e) : y > 33 ? Math.sign(e.y - R.y) : 0);
  if (x > reach) return go(bot, side, off, 1);
  if (R.facing !== side) return go(bot, side, off, 1);
  if (bot.lag && R.state === 'run') return go(bot, 0, off);
  if ((chain || !R.busy) && y < (tight ? 36 : 34)) press(bot, 'attack', e.T?.boss ? 0.14 : 0.12);
  return go(bot, 0, off);
}

function blast(bot, R, e, minX) {
  const s = bot.s;
  if (s.noPower || R.busy || bot.quiet > bot.t || bot.t < (bot.specT || 0)) return false;
  const kind = s.powers?.castKind?.(R);
  if (!kind || (kind === 'fireball' && !s.powers?.boost)) return false;
  const side = Math.sign(e.x - R.x) || 1, x = adx(R, e);
  const yOk = kind !== 'fireball' || ady(R, e) < 78;
  const min = s.powers?.boost && kind === 'fireball' ? 150 : (minX || (kind === 'fireball' ? 300 : 70));
  const max = kind === 'lightning' ? 600 : kind === 'airwhip' ? 520 : 500;
  if (!yOk || x < min || x > max) return false;
  if (R.facing !== side) return go(bot, side, 0);
  s.inp.press('special'); bot.specT = bot.t + 0.62;
  return go(bot, 0, 0);
}

function inZone(p, s) { return p && p.x > s.bounds.l - 30 && p.x < s.bounds.r + 30; }

function fadePlan(bot, s, R, e) {
  const superHit = beam(bot, R, e); if (superHit) return superHit;
  if (e.state === 'down' || e.state === 'hurt') return strike(bot, R, e, 140, true, 1);
  const shot = blast(bot, R, e); if (shot) return shot;
  const x = adx(R, e), back = Math.sign(R.x - e.x) || -1, side = -back;
  if (x < 320) return go(bot, back, awayY(R, e), 1);
  if (x > 470) return go(bot, side, Math.sign(e.y - R.y) || 0, 1);
  return go(bot, 0, Math.sign(e.y - R.y) || 0, false);
}

function beam(bot, R, e) {
  if (!e || bot.quiet > bot.t || (R.saidin || 0) < 100 || bot.t < (bot.bfT || 0)) return false;
  const x = adx(R, e), side = Math.sign(e.x - R.x) || 1;
  if (x < 40 || x > 740) return false;
  if (e.type !== 'asmodean' && e.type !== 'fadelt' && ady(R, e) > 80) return false;
  if (R.facing !== side) return go(bot, side, 0);
  bot.s.inp.press('power'); bot.bfT = bot.t + 5;
  return go(bot, 0, 0);
}

function bossPlan(bot, s, R, e) {
  const x=adx(R,e),side=Math.sign(e.x-R.x)||1,dy=ady(R,e);
  if(beam(bot,R,e))return true;
  if(s.powers?.boost && x<170)return go(bot,-side,dy>18?Math.sign(e.y-R.y):0,true);
  if(blast(bot,R,e,180))return true;
  if(e.state==='attack' && R.z<30 && R.busy)return go(bot,0,openY(R,e,60),true);
  if(x>175)return go(bot,side,dy>12?Math.sign(e.y-R.y):0,true);
  if(dy>22)return go(bot,0,Math.sign(e.y-R.y),true);
  if(R.facing!==side)return go(bot,side,0);
  if(!R.busy){press(bot,'jump',.12);return go(bot,0,0);}
  if(R.state==='air'&&R.z>80)press(bot,'attack',.2);
  return go(bot,0,0);
}

export function stage7Bot(bot) {
  const s = bot.s, R = s.riley, k = s.kit;
  if (!k || s.stageNo !== 7) return false;
  const back = bot.lag && perceive7(bot);
  const original = s.enemies;
  if (back) { s.enemies = back.enemies; bot.stage7Threats = back.threats; }
  try { return play(bot, s, R, k); }
  finally { if (back) s.enemies = original; }
}
function play(bot, s, R, k) {
  if (R.state === 'grabbed') {
    s.inp.press('attack'); s.inp.press('jump'); s.inp.press('special'); s.inp.press('power');
    return go(bot, 0, 0);
  }
  if (R.state === 'down' || R.state === 'getup' || R.state === 'dead' || !R.alive) return go(bot, 0, 0);
  if ((bot.useCall || q.get('call7') === '1') && !R.busy && s.boss?.phase >= 3 && canCall(k.call, call7Context(k))) {
    s.inp.press('assist'); return go(bot, 0, 0);
  }
  const th = bot.lag ? bot.stage7Threats : k.threats();
  if (th.ring && Math.abs(R.x-th.ring.x)<95 && Math.abs(R.y-th.ring.y)<34) return go(bot, 0, openDir(th.ring), true);
  if (th.rain && Math.abs(R.x-th.rain.x)<145) return go(bot, R.x<=th.rain.x?-1:1, 0, true);
  if (th.shock && Math.abs(R.x-th.shock.x)<300) { if(R.z<1)press(bot,'jump',.5);return go(bot,0,0); }
  const arrow=(th.arrows||[]).find(a=>(R.x-a.x)*a.dir>=0 && Math.abs(a.x-R.x)<180 && Math.abs(a.y-R.y)<30);
  if(arrow && R.hp<40 && s.zoneI===1)return go(bot,0,openDir(arrow),true);
  const note=(th.notes||[]).find(n=>Math.abs(n.x-R.x)<150 && Math.abs(n.y-R.y)<25);
  if(note && s.boss?.state !== 'channel') return go(bot,0,openDir(note),true);
  const live = liveOf(s);
  const elite = live.find(e => (e.type === 'asmodean' || e.type === 'fadelt') && e.state !== 'erase');
  if (elite && (R.saidin || 0) >= 100 && beam(bot, R, elite)) return 1;
  const danger = live.find(e => e.type !== 'asmodean' && incoming(e, R));
  if (danger) return commit(bot, R, danger);
  const saaDrop = (s.pickups || []).find(p => p.kind === 'saangreal');
  if (saaDrop) return go(bot, Math.sign(saaDrop.x - R.x) || 1, ady(R, saaDrop) > 8 ? Math.sign(saaDrop.y - R.y) : 0, 1);
  const gift = (s.pickups || []).find(p => p.power && inZone(p, s) && adx(R, p) < 320);
  if (gift) return go(bot, Math.sign(gift.x - R.x) || 1, ady(R, gift) > 12 ? Math.sign(gift.y - R.y) : 0, 1);
  const fade = live.find(e => e.type === 'fadelt');
  const punish = fade && (fade.state === 'hurt' || fade.state === 'down' || (fade.state === 'idle' && fade.st < 0.2 && adx(fade, R) < 160));
  if (R.hp < 36 || ((R.hp < 72 || (R.saidin || 0) < 20) && !punish)) {
    const barrel = (s.barrels || []).find(b => !b.broken && inZone(b, s));
    if (barrel && adx(R, barrel) < 900) return strike(bot, R, barrel, 68);
  }
  const item = (s.pickups || []).find(p => inZone(p, s) && (p.kind === 'heal' ? R.hp < 96 : p.kind === 'saidin' ? (R.saidin || 0) < 80 : p.kind === 'ribbon' || p.power));
  if (item && adx(R, item) < 420 && !punish) return go(bot, Math.sign(item.x - R.x) || 1, ady(R, item) > 10 ? Math.sign(item.y - R.y) : 0, 1);
  if (!live.length) return go(bot, 1, R.y > 650 ? -1 : R.y < 600 ? 1 : 0, !s.locked);
  const boss = live.find(e => e.type === 'asmodean');
  const trash = live.filter(e => !ELITE.has(e.type) && e.canBeHit !== false && e.state !== 'down' && e.state !== 'getup');
  if (boss && boss.state !== 'erase') {
    if (trash.length && boss.state === 'idle' && ady(R, boss) > 40) return strike(bot, R, trash[0], 130, true, 1);
    return bossPlan(bot, s, R, boss);
  }
  if (fade && adx(fade, R) < 520) return fadePlan(bot, s, R, fade);
  if (trash.length) {
    trash.sort((a, b) => a.hp - b.hp || adx(a, R) - adx(b, R));
    return strike(bot, R, trash[0], 130);
  }
  if (fade) return fadePlan(bot, s, R, fade);
  live.sort((a, b) => a.hp - b.hp || adx(a, R) - adx(b, R));
  return strike(bot, R, live[0], 130);
}
