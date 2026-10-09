import { LANE_TOP, LANE_BOT, q } from './config.js';
import { refuseReason } from './rand-call.js';
import { lateEnemies } from './stage6-lifecycle.js';

const go = (bot, x, y, run = false) => { bot.s.inp.demo = { x, y, run }; return true; };
const press = (bot, key, gap) => { if (bot.quiet > bot.t || bot.t < (bot.next || 0)) return; bot.s.inp.press(key); bot.next = bot.t + gap; };
const adx = (a, b) => Math.abs(a.x - b.x);
const ady = (a, b) => Math.abs((a.y || 0) - (b.y || 0));
const liveOf = s => s.enemies.filter(e => e.alive && e.type !== 'hatch' && !e.entering);
const ELITE = new Set(['fadelt', 'belal', 'grayman']);

function awayY(R, e) {
  const ey = e?.y || R.y, up = R.y - LANE_TOP, down = LANE_BOT - R.y;
  const need = 48 - Math.abs(R.y - ey);
  let dir = R.y <= ey ? -1 : 1;
  if ((dir < 0 ? up : down) < Math.max(12, need)) dir = -dir;
  return dir;
}

function leave(bot, R, th) {
  for (const n of th.nets || []) {
    const y0 = n.band?.[0], y1 = n.band?.[1];
    if (y0 == null || Math.abs(R.x - n.x) >= 280) continue;
    const mid = (y0 + y1) / 2;
    if (R.y >= y0 - 18 && R.y <= y1 + 18) return go(bot, 0, R.y >= mid ? 1 : -1, 1);
  }
  for (const l of th.lamps || []) if (Math.hypot(R.x - l.x, R.y - l.y) < 150) return go(bot, Math.sign(R.x - l.x) || -1, R.y > l.y ? 1 : -1, 1);
  for (const p of th.pools || []) if (Math.hypot(R.x - p.x, R.y - p.y) < 120) return go(bot, Math.sign(R.x - p.x) || 1, R.y >= p.y ? 1 : -1, 1);
  for (const n of th.lines || []) {
    const b = (bot.s.bands || [])[n.band];
    if (!b) continue;
    const mid = (b[0] + b[1]) / 2;
    if (R.y >= b[0] - 16 && R.y <= b[1] + 16) return go(bot, 0, R.y >= mid ? 1 : -1, 1);
  }
  return null;
}

function incoming(e, R) {
  const x = adx(e, R), y = ady(R, e), st = e.state;
  if (e.type === 'cutthroat' && st === 'lunge') return x < 360 && y < 40;
  if (e.type === 'belal' && (st === 'tell' || st === 'lunge')) return x < 560 && y < 50;
  if (e.type === 'belal' && st === 'attack') return x < 200 && y < 38;
  if (e.type === 'fadelt' && st === 'blink') return true;
  if (e.type === 'fadelt' && st === 'attack') return x < 230 && y < 46;
  if (e.type === 'grayman' && (st === 'attack' || st === 'lunge' || st === 'drop')) return x < 440 && y < 46;
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
  if (e.type !== 'belal') return go(bot, 0, room >= Math.max(14, 42 - ady(R, e)) ? away : -away, 1);
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
  const min = s.powers?.boost && kind === 'fireball' ? 80 : (minX || (kind === 'fireball' ? 300 : 70));
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
  if (e.type !== 'belal' && e.type !== 'fadelt' && ady(R, e) > 80) return false;
  if (R.facing !== side) return go(bot, side, 0);
  bot.s.inp.press('power'); bot.bfT = bot.t + 5;
  return go(bot, 0, 0);
}

function bossPlan(bot, s, R, e) {
  const x = adx(R, e), side = Math.sign(e.x - R.x) || 1, back = -side, w = s.bounds;
  if (w && e.state === 'idle' && R.x > w.r - 150) return go(bot, -1, 0, 1);
  if (e.state === 'idle' || e.state === 'stagger' || e.state === 'channel') bot.dkey = null;
  if (s.powers?.boost?.kind === 'saangreal') {
    const dy = ady(R, e), y = openY(R, e, 52);
    const frozen = 'attack tell lunge stagger'.includes(e.state);
    if (frozen && dy >= 38 && dy <= 80) { const shot = blast(bot, R, e, 80); if (shot) return shot; }
    if (x > 420) return go(bot, side, y, 1);
    if (x < 130) return go(bot, back, y, 1);
    return go(bot, 0, y, !!y);
  }
  if (e.state === 'stagger') {
    if (e.st > 0.9 || R.state === 'combo3') return go(bot, 0, openY(R, e, 46), 1);
    return strike(bot, R, e, 170, R.state === 'combo1', 1);
  }
  if (e.state === 'channel') return go(bot, x > 180 ? side : 0, ady(R, e) < 40 ? awayY(R, e) : 0);
  if (e.state === 'attack' || e.state === 'tell' || e.state === 'lunge') {
    if (bot.lag) return go(bot, 0, openY(R, e, 72), 1);
    if (ady(R, e) < 38) return commit(bot, R, e);
    const shot = blast(bot, R, e, 200); return shot || go(bot, 0, openY(R, e, 46));
  }
  if ((e.hp < 90 || s.kit.bossTime > 40) && e.state === 'idle' && x < 200) return strike(bot, R, e, 170, 1, 1);
  const superHit = beam(bot, R, e); if (superHit) return superHit;
  const y = openY(R, e, 46);
  if (!y) { const shot = blast(bot, R, e, 220); if (shot) return shot; }
  if (x > 220) return go(bot, side, y, 1);
  if (x < 150) return go(bot, back, y, 1);
  return go(bot, 0, y, !!y);
}

export function stage6Bot(bot) {
  const s = bot.s, R = s.riley, k = s.kit;
  if (!k || s.stageNo !== 6) return false;
  const back = bot.lag && lateEnemies(bot);
  if (back) s.enemies = back;
  try { return play(bot, s, R, k); }
  finally { if (back) s.enemies = bot._e; }
}
function play(bot, s, R, k) {
  if (R.state === 'grabbed') {
    s.inp.press('attack'); s.inp.press('jump'); s.inp.press('special'); s.inp.press('power');
    return go(bot, 0, 0);
  }
  if (R.state === 'down' || R.state === 'getup' || R.state === 'dead' || !R.alive) return go(bot, 0, 0);
  if (s.boss?.alive && (k.randHold > 0 || k.fair > 0)) bot.quiet = bot.t + 0.2;
  const useRand = bot.useRand || q.get('rand') === '1';
  if (useRand && k.rand && refuseReason(k.rand, k.randCtx()) === '' && bot.t >= (bot.randAt || 0)) {
    s.inp.press('assist'); bot.randAt = bot.t + 3; return go(bot, 0, 0);
  }
  const away = leave(bot, R, k.threats?.() || {});
  if (away) return away;
  const live = liveOf(s);
  const elite = live.find(e => (e.type === 'belal' || e.type === 'fadelt') && e.state !== 'erase');
  if (!bot.lag && !(bot.quiet > bot.t) && !s.powers?.boost && elite?.type === 'belal' && elite.state === 'attack' && (R.saidin || 0) < 100 && ady(R, elite) < 90 && ((elite.hitI === 2 && elite.st > 0.48) || (elite.hitI === 3 && elite.st < 0.62))) {
    const side = Math.sign(elite.x - R.x) || 1, y = ady(R, elite) > 10 ? Math.sign(elite.y - R.y) : 0;
    if (elite.hitI === 3 && elite.st >= 0.4 && !R.attackFrame && !R.state.startsWith('combo')) return go(bot, 0, R.y <= elite.y ? -1 : 1, 1);
    if (elite.st > 0.5 && ady(R, elite) > 34) return commit(bot, R, elite);
    if (adx(R, elite) > 180 || R.facing !== side) return go(bot, side, y, 1);
    if (ady(R, elite) > 26 || R.state === 'run') return go(bot, 0, y);
    if (!R.busy && elite.hitI === 3 && elite.st >= 0.3 && elite.st < 0.4 && bot.t >= (bot.cntAt || 0)) { s.inp.press('attack'); bot.cntAt = bot.t + 0.85; }
    return go(bot, 0, y);
  }
  if (elite && (R.saidin || 0) >= 100 && (elite.state !== 'attack' || !k.rand.calls) && beam(bot, R, elite)) return 1;
  const danger = live.find(e => incoming(e, R));
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
  const gray = live.find(e => e.type === 'grayman');
  const boss = live.find(e => e.type === 'belal');
  const trash = live.filter(e => !ELITE.has(e.type) && e.canBeHit !== false && e.state !== 'down' && e.state !== 'getup');
  if (boss && boss.state !== 'erase') {
    if (trash.length && boss.state === 'idle' && ady(R, boss) > 40) return strike(bot, R, trash[0], 130, true, 1);
    return bossPlan(bot, s, R, boss);
  }
  if (fade && adx(fade, R) < 520) return fadePlan(bot, s, R, fade);
  if (gray && (gray.state === 'recover' || gray.state === 'hurt')) return strike(bot, R, gray, 140);
  if (trash.length && !(gray && adx(gray, R) < 340 && gray.state === 'idle')) {
    trash.sort((a, b) => a.hp - b.hp || adx(a, R) - adx(b, R));
    return strike(bot, R, trash[0], 130);
  }
  if (gray && adx(gray, R) < 420) {
    const x = adx(gray, R), back = Math.sign(R.x - gray.x) || -1;
    if (gray.state === 'idle' && gray.st < 0.12 && x < 150) return strike(bot, R, gray, 130);
    if (x < 150) return go(bot, back, awayY(R, gray), 1);
    if (x > 260) return go(bot, Math.sign(gray.x - R.x) || 1, ady(R, gray) > 16 ? Math.sign(gray.y - R.y) : 0, 1);
    return go(bot, 0, ady(R, gray) > 8 ? Math.sign(gray.y - R.y) : 0);
  }
  if (fade) return fadePlan(bot, s, R, fade);
  live.sort((a, b) => a.hp - b.hp || adx(a, R) - adx(b, R));
  return strike(bot, R, live[0], 130);
}
