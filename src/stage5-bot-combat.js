// Stage 5 bot combat actions, shared with its hazard responses.
import { AGINOR } from './aginor.js';
import { RING } from './stage5-arena.js';
export const staffDamage = AGINOR.staff[0] + AGINOR.staff[1];
export const go = (bot, x, y, run = false) => { bot.s.inp.demo = { x, y, run }; return true; };
export const press = (bot, key, gap) => { if (bot.t >= (bot.next || 0)) { bot.s.inp.press(key); bot.next = bot.t + gap; } };

// Jump near contact, not at the start of a tell. Attack cooldown cannot veto an escape.
export function dodgeRing(bot, R, ring, oak) {
  if (!ring || ring.hit || !['tell', 'grow'].includes(ring.phase)) return false;
  if (oak?.open && Math.hypot(R.x - oak.x, R.y - oak.y) <= oak.r) return false;
  const d = Math.hypot(R.x - ring.x, R.y - ring.y), edge = ring.r || 0;
  if (d > RING.radius + RING.thick / 2 || d < edge - RING.thick / 2) return false;
  const contact = (ring.phase === 'tell' ? Math.max(0, RING.tell - (ring.st || 0)) : 0) + Math.max(0, d - edge - RING.thick / 2) / (RING.radius / RING.grow);
  if (contact > 0.55) return false;
  if (contact <= 0.3 && (R.z || 0) < 24 && !R.busy) bot.s.inp.press('jump');
  return go(bot, 0, ring.y > 630 ? -1 : 1, true);
}

export function strike(bot, R, e, reach, gap, melee) {
  const dx = e.x - R.x, dy = (e.y || R.y) - R.y, side = Math.sign(dx) || 1;
  if (e.type === 'aginor' && Math.abs(dx) < 62) {
    const b = bot.s.bounds, away = -side;
    if ((away > 0 && R.x >= b.r - 45) || (away < 0 && R.x <= b.l + 45)) return go(bot, side, e.y > 630 ? -1 : 1, true);
  }
  if(e.type==='aginor'&&e.state==='attack'&&R.hp<18&&Math.abs(dx)<=62)return go(bot,Math.sign(R.x-e.x)||-1,1,1);
  if (e.type !== 'aginor' && e.type !== 'balthamel' && Math.abs(dy) > 48 && Math.abs(dx) < reach) {
    bot.missY = (bot.missY || 0) + 1;
    if (bot.missY > 45) return go(bot, 0, Math.sign(dy), true);
  } else bot.missY = 0;
  if (Math.abs(dx) > reach) return go(bot, side, Math.abs(dy) > 10 ? Math.sign(dy) : 0, Math.abs(dx) > reach + 80);
  if (R.facing !== side) return go(bot, side, Math.abs(dy) > 12 ? Math.sign(dy) : 0);
  if (!melee && !bot.s.noPower && Math.abs(dx) > 90 && bot.t >= (bot.specT || 0)) { bot.s.inp.press('special'); bot.specT = bot.t + 0.85; }
  if (!R.busy || !['aginor', 'balthamel'].includes(e.type) || ['hurt', 'down', 'shoved', 'staggered'].includes(e.state) || e.overdrawn) press(bot, 'attack', gap);
  return go(bot, Math.abs(dx) < 60 ? -side : 0, Math.abs(dy) > 14 ? Math.sign(dy) : 0);
}

// Once a string dodge starts, finish it before approaching again. Returning on
// the first safe frame walked Riley straight back into the second strike.
export function dodgeString(bot, R, enemy, reach, flail) {
  const key = flail ? 'flailDodge' : 'staffDodge';
  const serial = bot.s.kit.stats[flail ? 'flails' : 'staffs'];
  if (bot[key + 'Serial'] !== serial) { bot[key + 'Serial'] = serial; bot[key] = null; }
  if (!enemy || enemy.state !== 'attack' || (enemy.overdrawn && R.hp > staffDamage)) { bot[key] = null; return false; }
  // The end of the active window is recovery, even while state is 'attack'.
  if (enemy.st >= (flail ? 1 : 1.06)) { bot[key] = null; return false; }
  if (!bot[key] && Math.abs(enemy.x - R.x) < reach && Math.abs(enemy.y - R.y) < 40) {
    const side = Math.sign(R.x - enemy.x) || -1, b = bot.s.bounds;
    const room = side > 0 ? b.r - 40 - R.x : R.x - b.l - 40;
    bot[key] = room < reach ? { x: 0, y: enemy.y > 630 ? -1 : 1 } : { x: side, y: 0 };
  }
  const d = bot[key];
  return d ? go(bot, d.x, d.y, true) : false;
}

export function dodgeHand(bot, R, hand) {
  if (bot.handTell !== hand) {
    bot.handTell = hand;
    let dir = Math.sign(R.x - hand.x) || 1;
    const b = bot.s.bounds;
    const room = dir > 0 ? b.r - 40 - R.x : R.x - b.l - 40;
    const blocked = bot.s.enemies.some(e => e.alive && Math.abs(e.y - R.y) < 30 && (e.x - R.x) * dir > 0 && Math.abs(e.x - R.x) < 100);
    if (room < 100 || blocked) dir *= -1;
    bot.handDir = dir;
  }
  return go(bot, bot.handDir, hand.y > 630 ? -1 : 1, true);
}

// Combo 1's active frame begins 150 ms after the press. An early swing ended
// before the flail's first active frame, so the bot never learned this counter.
export function parryFlail(bot, R, balth) {
  const dx = balth.x - R.x, side = Math.sign(dx) || 1, dy = balth.y - R.y;
  if (Math.abs(dy) > 12) return go(bot, 0, Math.sign(dy), true);
  if (Math.abs(dx) > 140 || R.facing !== side) return go(bot, side, 0);
  if (!R.busy && balth.st >= 0.5 - 0.15 - 1 / 30 && balth.st < 0.5) press(bot, 'attack', 0.3);
  if (balth.st >= 0.66) return dodgeString(bot, R, balth, 150, true) || go(bot, 0, 0);
  return go(bot, 0, 0);
}
