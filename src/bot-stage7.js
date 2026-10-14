// Stage 7 autopilot: dodge note bands, jump the shockwave, interrupt the channel,
// brace in gusts, step off rings, call when the predicted helper fits.
import { LANE_TOP, LANE_BOT, q } from './config.js';
import { VOLLEY_BANDS } from './stages.js';
import { refuseReason7 } from './moilan-call.js';
import { lateEnemies7 } from './stage7-lifecycle.js';
import { bandOfY } from './stage7-street.js';

const go = (bot, x, y, run = false) => { bot.s.inp.demo = { x, y, run }; return true; };
const press = (bot, key, gap) => { if (bot.t < (bot.next || 0)) return; bot.s.inp.press(key); bot.next = bot.t + gap; };
const adx = (a, b) => Math.abs(a.x - b.x);
const ady = (a, b) => Math.abs((a.y || 0) - (b.y || 0));
const mid = b => (VOLLEY_BANDS[b][0] + VOLLEY_BANDS[b][1]) / 2;

function foesOf(bot) {
  const s = bot.s;
  const raw = bot.lag ? lateEnemies7(bot) : (s.enemies || []).filter(e => e?.alive && !e.entering);
  return raw.filter(e => e && e.canBeHit !== false);
}

function awayY(R, e) {
  const ey = e?.y || R.y, up = R.y - LANE_TOP, down = LANE_BOT - R.y;
  let dir = R.y <= ey ? -1 : 1;
  if ((dir < 0 ? up : down) < 14) dir = -dir;
  return dir;
}

// Hold a 24-33 px lane offset: Riley's strikes still land (dy < 34) while most
// foes will not even start an attack (they need dy < 16-30). Same weave as Stage 6.
function strike(bot, R, e, reach) {
  if (!e || e.state === 'down' || e.state === 'yield' || e.canBeHit === false) return go(bot, 0, e ? awayY(R, e) : 0);
  const side = Math.sign(e.x - R.x) || 1, x = adx(R, e), y = ady(R, e);
  const off = y < 24 ? awayY(R, e) : y > 33 ? Math.sign(e.y - R.y) : 0;
  if (x > reach) return go(bot, side, off, 1);
  if (R.facing !== side) return go(bot, side, off, 1);
  if (y < 34) press(bot, 'attack', e.T?.boss ? 0.16 : 0.14);
  return go(bot, 0, off);
}

function blast(bot, R, e) {
  const s = bot.s;
  if (s.noPower || R.busy || bot.t < (bot.specT || 0)) return false;
  const kind = s.powers?.castKind?.(R);
  if (!kind) return false;
  const side = Math.sign(e.x - R.x) || 1, x = adx(R, e);
  if (x < 180 || x > 520 || ady(R, e) > 60) return false;
  if (R.facing !== side) return go(bot, side, 0);
  s.inp.press('special'); bot.specT = bot.t + 0.7;
  return go(bot, 0, 0);
}

export function stage7Bot(bot) {
  const s = bot.s, R = s.riley, k = s.kit;
  if (!k || s.stageNo !== 7 || !R) return false;
  bot.t = (bot.t || 0);
  if (R.state === 'grabbed') {
    s.inp.press('attack'); s.inp.press('jump'); s.inp.press('special'); s.inp.press('power');
    return go(bot, 0, 0);
  }
  const th = k.threats?.() || {};
  const boss = s.enemies.find(e => e.alive && e.type === 'asmodean') || (s.boss?.alive ? s.boss : null);
  const channeling = boss && boss.state === 'channel';

  // Shockwave: jump it.
  if (th.shock && (R.z || 0) <= 0 && !R.busy) {
    const d = Math.hypot(R.x - th.shock.x, (R.y - th.shock.y) * 0.6);
    if (Math.abs(d - th.shock.r) < 110) { press(bot, 'jump', 0.5); return go(bot, 0, 0); }
  }
  // Interrupt the channel before anything else.
  if (channeling) return strike(bot, R, boss, 150);

  // Note bands: leave any band with a tell or an incoming note; reflect a close gold note.
  const myBand = bandOfY(R.y);
  const hot = new Set();
  for (const t of th.tells || []) hot.add(t.band);
  for (const n of th.notes || []) {
    // A note that has already passed Riley no longer makes its band hot.
    if (!n.reflected && (Math.sign(R.x - n.x) === n.dir || Math.abs(n.x - R.x) < 70)) hot.add(n.band);
    if (n.gold && !n.reflected && Math.hypot(n.x - R.x, n.y - R.y) < 130) {
      const side = Math.sign(n.x - R.x) || R.facing || 1;
      if (R.facing !== side) return go(bot, side, 0);
      press(bot, 'attack', 0.2);
      return go(bot, 0, 0);
    }
  }
  if (hot.has(myBand)) {
    let best = -1, bd = 1e9;
    for (let b = 0; b < 3; b++) {
      if (hot.has(b)) continue;
      const d = Math.abs(mid(b) - R.y);
      if (d < bd) { bd = d; best = b; }
    }
    if (best >= 0) return go(bot, 0, Math.sign(mid(best) - R.y) || 1, 1);
  }
  // Column rain strip.
  if (th.rain && Math.abs(R.x - th.rain.x) <= th.rain.halfW + 50) {
    const dir = R.x <= th.rain.x ? -1 : 1;
    const b = s.bounds;
    if (b && ((dir < 0 && R.x < b.l + 90) || (dir > 0 && R.x > b.r - 90))) return go(bot, -dir, 0, 1);
    return go(bot, dir, 0, 1);
  }
  // Waking-street ring.
  if (th.ring && Math.hypot(R.x - th.ring.x, R.y - th.ring.y) < 110) {
    const ty = R.y <= th.ring.y ? LANE_TOP + 18 : LANE_BOT - 18;
    return go(bot, 0, Math.sign(ty - R.y) || 1, 1);
  }
  // Arrows on my lane.
  for (const a of th.arrows || []) {
    if (Math.abs(a.y - R.y) < 26 && Math.abs(a.x - R.x) < 320 && Math.sign(R.x - a.x) === a.dir) {
      return go(bot, 0, R.y > (LANE_TOP + LANE_BOT) / 2 ? -1 : 1, 1);
    }
  }
  const foes = foesOf(bot);
  // Incoming melee: step off the lane (before the busy gate, so the exit lane is queued).
  for (const e of foes) {
    // The fadelt's third swing is countered, not dodged (strike() below punishes it).
    const inc = (e.type === 'dancer' && (e.state === 'attack' || e.state === 'lunge') && adx(e, R) < 420)
      || (e.type === 'asmodean' && e.state === 'attack' && adx(e, R) < 240)
      || (e.type === 'fadelt' && (e.state === 'blink' || (e.state === 'attack' && (e.hitI | 0) < 2)) && adx(e, R) < 280)
      || (e.type !== 'fadelt' && e.state === 'attack' && adx(e, R) < 260);
    if (inc && ady(R, e) < 48) {
      const away = R.y <= (e.y || R.y) ? -1 : 1;
      const room = away < 0 ? R.y - LANE_TOP : LANE_BOT - R.y;
      return go(bot, 0, room > 26 ? away : -away, 1);
    }
  }
  if (R.busy && R.state !== 'hurt' && !channeling) return go(bot, 0, 0);
  // Brace in a gust when nothing is close.
  if (th.storm?.phase === 'gust' && !foes.some(e => adx(e, R) < 200)) {
    return go(bot, -th.storm.dir, 0);
  }
  // Call the duo on the boss when enabled (zone calls stay a player choice;
  // reserving them keeps call-on/off boss times comparable, as on Stage 6).
  const useCall = bot.useCall || q.get('call7') === '1';
  const punishOpen = boss && ['channel', 'stagger', 'stun', 'attack'].includes(boss.state);
  if (useCall && !R.busy && boss && !punishOpen && (boss.phase || 1) >= 3 && k.call7 && refuseReason7(k.call7, k.call7Ctx()) === '' && bot.t >= (bot.callAt || 0)) {
    s.inp.press('assist'); bot.callAt = bot.t + 3; return go(bot, 0, 0);
  }
  const onScreen = p => p.x > s.bounds.l + 30 && p.x < s.bounds.r - 30;
  const ribbon = (s.pickups || []).find(p => p.kind === 'ribbon' && onScreen(p));
  if (ribbon) return go(bot, Math.sign(ribbon.x - R.x) || 1, Math.abs(ribbon.y - R.y) > 8 ? Math.sign(ribbon.y - R.y) : 0, 1);
  if (R.hp < 65) {
    const heal = (s.pickups || []).find(p => p.kind === 'heal' && onScreen(p));
    if (heal) return go(bot, Math.sign(heal.x - R.x) || 1, Math.abs(heal.y - R.y) > 8 ? Math.sign(heal.y - R.y) : 0, 1);
    const crate = (s.barrels || []).find(b => !b.broken && onScreen(b) && !foes.some(e => adx(e, R) < 170));
    if (crate && R.hp < 55) {
      const side = Math.sign(crate.x - R.x) || 1;
      if (Math.abs(crate.x - R.x) > 110) return go(bot, side, Math.abs(crate.y - R.y) > 8 ? Math.sign(crate.y - R.y) : 0, 1);
      if (R.facing !== side) return go(bot, side, 0);
      press(bot, 'attack', 0.3);
      return go(bot, 0, Math.abs(crate.y - R.y) > 8 ? Math.sign(crate.y - R.y) : 0);
    }
  }
  if (!s.noPower) {
    const power = (s.pickups || []).find(p => p.power && p.ready !== false && onScreen(p));
    if (power && !R.busy) return go(bot, Math.sign(power.x - R.x) || 0, Math.abs(power.y - R.y) > 8 ? Math.sign(power.y - R.y) : 0);
  }
  // Balefire a lined-up boss (or a cluster) on a full meter, like a player would.
  if (!s.noPower && R.saidin >= 100 && !R.busy && s.canBalefire?.()) {
    const tgt = boss || foes.filter(e => e.type !== 'asmodean')[0];
    if (tgt && Math.abs(tgt.x - R.x) < 620 && Math.abs(tgt.y - R.y) < 44) {
      const side = Math.sign(tgt.x - R.x) || 1;
      if (R.facing !== side) return go(bot, side, 0);
      s.inp.press('power');
      return go(bot, 0, 0);
    }
  }
  // Boss punish windows first, then the elite, then the nearest foe.
  if (boss && (boss.state === 'stagger' || boss.state === 'stun')) return strike(bot, R, boss, 150);
  const fade = foes.find(e => e.type === 'fadelt');
  if (fade && !boss) { if (blast(bot, R, fade)) return true; return strike(bot, R, fade, 140); }
  const mobs = foes.filter(e => e.type !== 'asmodean');
  if (mobs.length) {
    mobs.sort((a, b) => adx(a, R) - adx(b, R));
    if (blast(bot, R, mobs[0])) return true;
    return strike(bot, R, mobs[0], 135);
  }
  if (boss) {
    // Hold the phrase's free band and let the gleeman walk into it.
    let free = -1;
    for (let b = 0; b < 3; b++) if (!hot.has(b)) { free = b; break; }
    if (free >= 0 && hot.size && bandOfY(boss.y) !== free && myBand === free) {
      if (blast(bot, R, boss)) return true;
      const tx = boss.x - (Math.sign(boss.x - R.x) || 1) * 170;
      return go(bot, Math.abs(tx - R.x) > 24 ? Math.sign(tx - R.x) : 0, Math.abs(mid(free) - R.y) > 10 ? Math.sign(mid(free) - R.y) : 0, 1);
    }
    if (blast(bot, R, boss)) return true;
    return strike(bot, R, boss, 150);
  }
  if (!s.locked) return go(bot, 1, R.y > 650 ? -1 : R.y < LANE_TOP + 30 ? 1 : (R.y < 620 ? 1 : 0), 1);
  if (R.y < LANE_TOP + 8 || R.y > LANE_BOT - 8) return go(bot, 0, R.y > 630 ? -1 : 1);
  return go(bot, 0, 0);
}
