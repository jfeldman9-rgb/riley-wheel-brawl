// Stage 4 autopilot. Owns the controls whenever it runs so Stage 2/3 branches stay idle.
import { LANE_TOP, LANE_BOT } from './config.js';

const go = (bot, x, y, run = false) => { bot.s.inp.demo = { x, y, run }; return true; };
const press = (bot, key, gap) => {
  if (bot.t >= (bot.next || 0)) { bot.s.inp.press(key); bot.next = bot.t + gap; }
};

export function stage4Bot(bot) {
  const s = bot.s, R = s.riley, k = s.kit;
  if (!k || s.stageNo !== 4) return false;
  if (R.state === 'grabbed') {
    s.inp.press('attack'); s.inp.press('jump'); s.inp.press('special'); s.inp.press('power');
    return go(bot, 0, 0);
  }
  const th = k.threats();
  const bossNow = s.enemies.find(e => e.alive && e.type === 'draghkar');
  const urgent = bossNow && ['swoop_tell', 'swoop_dive', 'kiss_tell', 'kiss_lunge', 'croon', 'perch', 'takeoff'].includes(bossNow.state);
  if (!urgent && R.busy && !['hurt'].includes(R.state)) return go(bot, 0, 0);
  for (const tw of th.towers || []) {
    if (Math.abs(R.x - tw.x) < (tw.width || 360) / 2 + 40) {
      const y = tw.safeY != null ? Math.sign(tw.safeY - R.y) : (R.y > 630 ? -1 : 1);
      const x = Math.abs(R.x - tw.x) < 30 ? 1 : 0;
      return go(bot, x, y || 1, true);
    }
  }
  if (th.zoneWall && R.x < th.zoneWall.x + 70) return go(bot, 1, 0, true);
  const boss = s.enemies.find(e => e.alive && e.type === 'draghkar');
  if (boss && (boss.state === 'swoop_tell' || boss.state === 'swoop_dive')) {
    const learning = (k.stats.swoopCounters || 0) < 1;
    if (learning) {
      const face = Math.sign(boss.x - R.x) || -1;
      if (R.facing !== face) return go(bot, face, Math.abs(R.y - boss.y) > 10 ? Math.sign(boss.y - R.y) : 0);
      press(bot, 'attack', 0.28);
      return go(bot, 0, Math.abs(R.y - boss.y) > 8 ? Math.sign(boss.y - R.y) : 0);
    }
    const away = boss.y >= R.y ? -1 : 1;
    return go(bot, 0, away, true);
  }
  if (boss && boss.phase >= 2 && (k.stats.kisses || 0) < 1 && boss.state === 'grounded' && (boss.landedTimer || 0) < 1.2) {
    const away = -(Math.sign(boss.x - R.x) || 1);
    if (!R.busy && R.facing !== away) return go(bot, away, 0);
    return go(bot, 0, 0);
  }
  if (boss && (boss.state === 'claw' || boss.state === 'buffet')) {
    const side = Math.sign(boss.x - R.x) || 1;
    if (Math.abs(boss.x - R.x) < 200) return go(bot, -side, 0, true);
  }
  if (boss && boss.state === 'croon') {
    if (R.state === 'cast' || R.state === 'balefire') return go(bot, 0, 0);
    const side = Math.sign(boss.x - R.x) || 1;
    const adx = Math.abs(boss.x - R.x);
    if (R.facing !== side) return go(bot, side, 0);
    const cast = !s.noPower && s.powers && s.powers.castKind && s.powers.castKind(R);
    if ((k.stats.croonCancels || 0) < 1 && cast) press(bot, 'special', 0.35);
    const x = adx > 340 ? side : adx < 240 ? -side : 0;
    return go(bot, x, Math.abs(R.y - (boss.y || R.y)) > 16 ? Math.sign((boss.y || R.y) - R.y) : 0);
  }
  if (th.fogSwoop && th.fogSwoop.tell) {
    const away = th.fogSwoop.y >= R.y ? -1 : 1;
    return go(bot, 0, away, true);
  }
  if (boss && (boss.state === 'land_recovery' || boss.state === 'takeoff' || (boss.state === 'grounded' && (boss.landedTimer || 0) > 3.2 && (k.stats.kisses || 0) >= 1))) {
    const y = Math.abs(R.y - 630) > 12 ? Math.sign(630 - R.y) : 0;
    return go(bot, 0, y);
  }
  if (boss && (boss.state === 'kiss_tell' || boss.state === 'kiss_lunge')) {
    if ((k.stats.kisses || 0) < 1) {
      const away = -(Math.sign(boss.x - R.x) || 1);
      if (R.facing !== away) return go(bot, away, 0);
      return go(bot, 0, 0);
    }
    const face = Math.sign(boss.x - R.x) || 1;
    if (R.facing !== face) return go(bot, face, 0);
    press(bot, 'attack', 0.28);
    return go(bot, 0, 0);
  }
  if (boss && boss.phase >= 3 && th.walls) {
    if (R.x < th.walls.left + 70) return go(bot, 1, 0, true);
    if (R.x > th.walls.right - 70) return go(bot, -1, 0, true);
  }
  const tips = th.tendrils || [];
  const nearest = tips.reduce((best, t) => {
    const d = Math.hypot(t.x - R.x, t.y - R.y);
    return !best || d < best.d ? { t, d } : best;
  }, null);
  const inShaft = (th.shafts || []).some(m => Math.hypot(m.x - R.x, m.y - R.y) < (m.r || 80) * 0.75);
  const traveling = !s.locked && !s.enemies.some(e => e.alive) && (!nearest || nearest.d > 90 || inShaft);
  const bossOpen = boss && boss.canBeHit && !boss.untargetable && !['perch', 'takeoff', 'swoop_tell', 'swoop_dive'].includes(boss.state);
  if (nearest && !inShaft && !traveling && !bossOpen) {
    const tip = nearest.t, dist = nearest.d;
    if ((k.stats.meleeRecoils || 0) < 1 && dist < 220) {
      const face = Math.sign(tip.x - R.x) || 1;
      if (R.facing !== face) return go(bot, face, Math.sign(tip.y - R.y));
      press(bot, 'attack', 0.3);
      return go(bot, face, Math.sign(tip.y - R.y) || 0);
    }
    if (dist < 140) {
      let best = null, bd = 1e9;
      for (const m of th.shafts || []) {
        const d = Math.hypot(m.x - R.x, m.y - R.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (best && bd > 30) return go(bot, Math.sign(best.x - R.x) || 1, Math.sign(best.y - R.y), true);
      return go(bot, Math.sign(R.x - tip.x) || 1, 0, true);
    }
  }
  const onScreen = p => p.x > s.bounds.l + 30 && p.x < s.bounds.r - 30;
  const ribbon = (s.pickups || []).find(p => p.kind === 'ribbon' && onScreen(p));
  if (ribbon) return go(bot, Math.sign(ribbon.x - R.x) || 1, Math.abs(ribbon.y - R.y) > 8 ? Math.sign(ribbon.y - R.y) : 0, true);
  if (R.hp < (boss ? 72 : 55)) {
    const heal = (s.pickups || []).find(p => p.kind === 'heal' && onScreen(p));
    if (heal) return go(bot, Math.sign(heal.x - R.x) || 1, Math.abs(heal.y - R.y) > 8 ? Math.sign(heal.y - R.y) : 0, true);
  }
  if (!s.noPower) {
    const power = (s.pickups || []).find(p => p.power && p.ready !== false && onScreen(p));
    if (power && !R.busy) return go(bot, Math.sign(power.x - R.x) || 0, Math.abs(power.y - R.y) > 8 ? Math.sign(power.y - R.y) : 0);
  }
  if ((k.stats.rubble || 0) < 1) {
    const rb = (th.rubble || []).find(r => onScreen(r) && !r.broken && Math.abs(r.x - R.x) < 240);
    const crowded = s.enemies.some(e => e.alive && e.type !== 'draghkar' && Math.abs(e.x - R.x) < 190);
    if (rb && !crowded) {
      const dx = rb.x - R.x, side = Math.sign(dx) || 1;
      if (Math.abs(dx) > 70) return go(bot, side, Math.abs(rb.y - R.y) > 10 ? Math.sign(rb.y - R.y) : 0, true);
      if (R.facing !== side) return go(bot, side, 0);
      press(bot, 'attack', 0.28);
      return go(bot, 0, 0);
    }
  }
  const foes = s.enemies.filter(e => e.alive && !e.entering && e.type !== 'draghkar' && e.canBeHit !== false && onScreen(e));
  if (foes.length) {
    foes.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x));
    const e = foes[0], dx = e.x - R.x, dy = e.y - R.y, side = Math.sign(dx) || 1;
    if (Math.abs(dx) > 130) return go(bot, side, Math.abs(dy) > 8 ? Math.sign(dy) : 0, Math.abs(dx) > 280);
    if (R.facing !== side) return go(bot, side, 0);
    press(bot, 'attack', 0.42);
    if (!s.noPower && Math.abs(dx) > 180) press(bot, 'special', 1.1);
    return go(bot, Math.abs(dx) < 70 ? -side : 0, Math.abs(dy) > 8 ? Math.sign(dy) : 0);
  }
  if (boss && boss.canBeHit && !boss.untargetable && !['perch', 'takeoff', 'swoop_tell', 'swoop_dive'].includes(boss.state)) {
    const dx = boss.x - R.x, side = Math.sign(dx) || 1;
    const dy = (boss.y || R.y) - R.y;
    const adx = Math.abs(dx);
    if (adx > 168) return go(bot, side, Math.abs(dy) > 14 ? Math.sign(dy) : 0);
    if (adx < 145) return go(bot, -side, 0);
    if (R.facing !== side) return go(bot, side, 0);
    const saveCroon = !s.noPower && boss.phase >= 2 && (k.stats.croonCancels || 0) < 1;
    if (boss.phase >= 3 && !(k.stats.fogSwoops) && !bot.swoopWait) bot.swoopWait = bot.t;
    const waitSwoop = !!(bot.swoopWait && !(k.stats.fogSwoops) && bot.t - bot.swoopWait < 1.5);
    const cast = !saveCroon && !waitSwoop && !s.noPower && s.powers && s.powers.castKind && s.powers.castKind(R);
    if (!waitSwoop && !['kiss_tell', 'kiss_lunge', 'croon', 'claw', 'buffet'].includes(boss.state)) {
      if (cast && Math.random() < 0.35) press(bot, 'special', 0.75);
      else press(bot, 'attack', 0.42);
    }
    return go(bot, 0, Math.abs(dy) > 18 ? Math.sign(dy) : 0);
  }
  if (!s.locked) return go(bot, 1, R.y > 650 ? -1 : R.y < LANE_TOP + 30 ? 1 : (R.y < 620 ? 1 : 0), true);
  if (R.y < LANE_TOP + 8 || R.y > LANE_BOT - 8) return go(bot, 0, R.y > 630 ? -1 : 1);
  return go(bot, 0, 0);
}
