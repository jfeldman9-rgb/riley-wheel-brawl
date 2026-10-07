import { LANE_TOP, LANE_BOT } from './config.js';
const BANDS = [0, 1, 2].map(i => {
  const a = Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * i / 3);
  const b = Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * (i + 1) / 3);
  return [a, b];
});

const go = (bot, x, y, run = false) => { bot.s.inp.demo = { x, y, run }; return true; };
const press = (bot, key, gap) => { if (bot.t >= (bot.next || 0)) { bot.s.inp.press(key); bot.next = bot.t + gap; } };
const bandY = i => (BANDS[i][0] + BANDS[i][1]) / 2;
const on = (p, s) => p && p.x > s.bounds.l - 40 && p.x < s.bounds.r + 40;

export function stage5Bot(bot) {
  const s = bot.s, R = s.riley, k = s.kit;
  if (!k || s.stageNo !== 5) return false;
  const st = k.stats;
  if (R.state === 'grab' || R.state === 'hold' || R.state === 'knee' || R.state === 'throw') {
    if (R.state !== 'throw') s.inp.press('jump');
    return go(bot, 0, 0);
  }
  if (R.state === 'grabbed') {
    s.inp.press('attack'); s.inp.press('jump'); s.inp.press('special'); s.inp.press('power');
    return go(bot, 0, 0);
  }
  if (R.state === 'down' || R.state === 'getup' || R.state === 'dead') return go(bot, 0, 0);
  const th = k.threats();
  const boss = s.enemies.find(e => e.alive && e.type === 'aginor');
  const balth = s.enemies.find(e => e.alive && e.type === 'balthamel');
  if (!s.noPower && boss?.phase === 1 && R.lives < 3 && R.z < 8 && Math.abs(R.y - boss.y) < 18 && R.x > s.bounds.r - 80 && R.x > boss.x + 20) return go(bot, -1, boss.y > 630 ? -1 : 1, true);
  if (th.ring && (th.ring.phase === 'grow' || th.ring.phase === 'tell')) {
    const d = Math.hypot(R.x - (th.ring.x || boss?.x || R.x), R.y - (th.ring.y || boss?.y || R.y));
    const edge = th.ring.phase === 'grow' ? th.ring.r : 0;
    if (Math.abs(d - edge) < 200 && (R.z || 0) < 24) press(bot, 'jump', 0.35);
  }
  for (const g of th.gouts || []) {
    if (Math.hypot(R.x - g.x, R.y - g.y) < 150) {
      const dir = Math.sign(R.x - g.x) || 1;
      return go(bot, dir, R.y > g.y ? 1 : -1, true);
    }
  }
  for (const h of th.hands || []) {
    if (h.phase === 'tell' && Math.hypot(R.x - h.x, R.y - h.y) < 100) {
      const dir = boss?.phase === 3 ? (bot.hd = bot.hd || Math.sign(R.x - h.x) || 1) : (Math.sign(R.x - h.x) || 1);
      return go(bot, dir, 0, true);
    }
  }
  bot.hd = 0;
  const crowded = s.enemies.some(e => e.alive && Math.abs(e.x - R.x) < 200);
  if (st.thornTicks < 1 && R.hp > 78 && !crowded) {
    const t = (th.thorns || []).find(n => on(n, s));
    if (t && Math.abs(R.x - t.x) < 360) {
      const y = bandY(t.band | 0);
      return go(bot, Math.sign(t.x - R.x) || 1, Math.abs(R.y - y) > 8 ? Math.sign(y - R.y) : 0, true);
    }
  } else {
    for (const t of th.thorns || []) {
      const mid = bandY(t.band | 0);
      if (Math.abs(R.x - t.x) <= t.w / 2 && Math.abs(R.y - mid) < 22) return go(bot, 0, R.y >= mid ? 1 : -1, true);
    }
  }
  if (s.zoneI === 2 && st.gouts < 1 && !th.gouts.length) {
    const left = s.enemies.filter(e => e.alive && e.type !== 'aginor');
    if (left.length <= 1) {
      const seep = (th.seeps || [])[0];
      if (seep) return go(bot, Math.sign(seep.x - R.x) || 1, Math.sign((seep.y || R.y) - R.y), false);
    }
  }
  if (st.flushes < 1) {
    const lurk = s.enemies.find(e => e.alive && e.type === 'stalker' && e.state === 'lurk' && Math.abs(e.x - R.x) < 280);
    if (lurk) return strike(bot, R, lurk, 140, 0.2, true);
  }
  const wall = s.enemies.find(e => e.alive && e.type === 'stalker' && (e.state === 'lurk' || (st.pounces < 1 && e.state === 'stalk')) && Math.abs(e.x - R.x) < 96 && Math.abs(e.y - R.y) < 24);
  if (wall && s.enemies.some(e => e.alive && e.canBeHit !== false && e.type !== 'aginor' && e.type !== 'stalker' && Math.abs(e.x - R.x) < 460 && (e.x - R.x) * (Math.sign(wall.x - R.x) || 1) > 20)) {
    return go(bot, Math.sign(wall.x - R.x) || 1, R.y >= wall.y ? -1 : 1, true);
  }
  if (st.pounceCounters < 1 && st.flushes >= 1 && (s.noPower || st.pounces < 1)) {
    const sk = s.enemies.find(e => e.alive && e.type === 'stalker' && (e.state === 'stalk' || e.state === 'lurk'));
    const busy = s.noPower
      ? s.enemies.some(e => e.alive && e.type !== 'stalker' && e.type !== 'aginor' && e.state === 'attack' && Math.abs(e.x - R.x) < 150)
      : s.enemies.some(e => e.alive && e.canBeHit !== false && e.type !== 'stalker' && e.type !== 'aginor' && Math.abs(e.x - R.x) < 240);
    if (sk && !busy) {
      const dx = sk.x - R.x, side = Math.sign(dx) || 1;
      if (Math.abs(sk.y - R.y) > 14) return go(bot, 0, Math.sign(sk.y - R.y), true);
      if (Math.abs(dx) < 130) return go(bot, -side, 0, true);
      if (Math.abs(dx) > 200) return go(bot, side, Math.abs(sk.y - R.y) > 10 ? Math.sign(sk.y - R.y) : 0, true);
      return go(bot, 0, 0);
    }
  }
  const skAtk = s.enemies.find(e => e.alive && e.type === 'stalker' && e.state === 'attack');
  if (skAtk && st.pounceCounters < 1) {
    const dx = skAtk.x - R.x, side = Math.sign(dx) || 1;
    if (!skAtk.leaping) {
      if (Math.abs(skAtk.y - R.y) > 12) return go(bot, 0, Math.sign(skAtk.y - R.y), true);
      if (Math.abs(dx) > 150) return go(bot, side, 0, true);
      if (Math.abs(dx) < 90) return go(bot, -side, 0, true);
      if (R.facing !== side) return go(bot, side, 0);
      return go(bot, 0, 0);
    }
    if (R.facing !== side) { s.inp.x = side; return go(bot, side, 0); }
    if (!R.busy) { s.inp.press('attack'); bot.next = bot.t + 0.2; }
    return go(bot, 0, 0);
  }
  if (skAtk?.leaping) return go(bot, 0, skAtk.y >= R.y ? -1 : 1, true);
  if ((th.trees || []).length && st.ribbon < 1 && !s.enemies.some(e => e.alive && e.type !== 'sporepod' && Math.abs(e.x - R.x) < 160)) {
    const tree = th.trees[0];
    return strike(bot, R, tree, 70, 0.26);
  }
  if (boss?.state === 'tether' && !boss.locked && st.tetherCounters < 1) return strike(bot, R, boss, 170, 0.14, true);
  if (boss?.locked) {
    const y = bandY((Math.round((R.y - LANE_TOP) / 40) + 1) % 3);
    return go(bot, 0, Math.sign(y - R.y) || 1, true);
  }
  if (balth?.alive && st.embraces < 1 && balth.hp < 80 && !['lunge', 'holding', 'attack', 'step', 'down', 'hurt'].includes(balth.state)) {
    const dx = balth.x - R.x, side = Math.sign(dx) || 1;
    if (Math.abs(balth.y - R.y) > 16) return go(bot, 0, Math.sign(balth.y - R.y));
    if (Math.abs(dx) > 160) return go(bot, side, 0);
    if (Math.abs(dx) < 70) return go(bot, -side, 0);
    return go(bot, 0, 0);
  }
  if (balth?.alive && st.parries < 1 && st.embraces >= 1 && balth.hp < 70 && !['attack', 'step', 'lunge', 'holding', 'down', 'hurt'].includes(balth.state)) {
    const dx = balth.x - R.x, side = Math.sign(dx) || 1;
    if (Math.abs(dx) > 140) return go(bot, side, Math.abs(balth.y - R.y) > 12 ? Math.sign(balth.y - R.y) : 0);
    if (Math.abs(dx) < 60) return go(bot, -side, 0);
    return go(bot, 0, 0);
  }
  if (balth && st.embraces < 1 && balth.state === 'lunge') {
    const dx = balth.x - R.x;
    if (Math.abs(dx) > 70) return go(bot, Math.sign(dx), Math.abs(balth.y - R.y) > 10 ? Math.sign(balth.y - R.y) : 0);
    return go(bot, 0, 0);
  }
  if (balth && st.parries < 1 && balth.state === 'attack') {
    const tell = balth.st || 0, side = Math.sign(balth.x - R.x) || 1;
    const swinging = R.facing === side && (R.state === 'combo1' || R.state === 'combo2' || R.state === 'combo3');
    if ((swinging && tell > 0.36) || (!swinging && tell > 0.22)) return strike(bot, R, balth, 160, 0.12, true);
  }
  if (balth && st.stepCounters < 1 && balth.state === 'step' && !balth.arrived) {
    const tell = balth.st || 0;
    if (R.state === 'back') return go(bot, 0, 0);
    if (tell >= 0.32 && tell <= 0.42 && !R.busy) {
      s.inp.x = -(R.facing || 1); s.inp.press('attack'); bot.next = bot.t + 0.3;
      return go(bot, 0, 0);
    }
    return go(bot, 0, 0);
  }
  if (boss && (boss.overdrawn || th.surge?.phase === 'hot') && boss.canBeHit && !['burn', 'dead', 'step'].includes(boss.state)) return strike(bot, R, boss, 180, 0.12, true);
  if (boss && boss.phase === 3 && R.hp < 24 && s.kit.arena?.oak) { const o = s.kit.arena.oak; return go(bot, Math.sign(o.x - R.x) || 1, Math.abs(o.y - R.y) > 12 ? Math.sign(o.y - R.y) : 0, true); }
  if (boss && boss.phase === 3 && th.oak?.open && (st.oak < 1 || R.hp < 55)) return go(bot, Math.sign(th.oak.x - R.x) || 1, Math.abs(th.oak.y - R.y) > 12 ? Math.sign(th.oak.y - R.y) : 0, true);
  if (boss && st.staffs >= 1 && boss.state === 'attack' && !boss.overdrawn) {
    const tell = boss.st || 0, hot = (tell > 0.42 && tell < 0.68) || (tell > 0.84 && tell < 1.1);
    if (hot && Math.abs(boss.x - R.x) < 185 && Math.abs(boss.y - R.y) < 40) return go(bot, Math.sign(R.x - boss.x) || -1, 0, true);
  }
  if (boss && st.staffs < 1 && boss.phase !== 2 && boss.state === 'idle' && Math.abs(boss.x - R.x) < 240) return strike(bot, R, boss, 120, 0.3);
  if (R.hp < 88 && !crowded) {
    const barrel = (s.barrels || []).find(b => !b.broken && on(b, s) && Math.abs(b.x - R.x) < 520);
    if (barrel) return strike(bot, R, barrel, 70, 0.28);
  }
  if (R.busy && !['hurt', 'land'].includes(R.state) && !(th.ring && th.ring.phase === 'grow')) return go(bot, 0, 0);
  const heal = (s.pickups || []).find(p => p.kind === 'heal' && on(p, s));
  if (heal && R.hp < (boss ? 92 : 72)) {
    const hx = heal.x - R.x;
    const blocked = s.enemies.some(e => e.alive && e.canBeHit !== false && Math.abs(e.y - R.y) < 30 && (e.x - R.x) * hx > 0 && Math.abs(e.x - R.x) < Math.abs(hx) + 24 && Math.abs(e.x - R.x) < 170);
    if (!blocked) return go(bot, Math.sign(hx) || 1, Math.abs(heal.y - R.y) > 8 ? Math.sign(heal.y - R.y) : 0, true);
  }
  const ribbon = (s.pickups || []).find(p => p.kind === 'ribbon' && on(p, s));
  if (ribbon) return go(bot, Math.sign(ribbon.x - R.x) || 1, Math.abs(ribbon.y - R.y) > 8 ? Math.sign(ribbon.y - R.y) : 0, true);
  if (!s.noPower) {
    const power = (s.pickups || []).find(p => p.power && p.ready !== false && on(p, s));
    if (power && !R.busy) return go(bot, Math.sign(power.x - R.x) || 0, Math.abs(power.y - R.y) > 8 ? Math.sign(power.y - R.y) : 0);
  }
  const holdPod = st.spores < 1;
  const foes = s.enemies.filter(e => e.alive && !e.entering && e.canBeHit !== false && e.type !== 'aginor' && on(e, s) && !(holdPod && e.type === 'sporepod') && !(st.pounces < 1 && e.type === 'stalker' && (e.state === 'lurk' || e.state === 'stalk')));
  if (balth?.alive && balth.canBeHit !== false) foes.unshift(balth);
  if (foes.length) {
    foes.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x));
    const learn = foes[0].type === 'balthamel' && (st.parries < 1 || st.stepCounters < 1);
    return strike(bot, R, foes[0], foes[0].type === 'balthamel' ? 130 : 150, 0.36, learn);
  }
  if (boss && boss.phase === 3 && boss.hp < 36 && boss.canBeHit && !['step', 'burn', 'dead'].includes(boss.state)) return strike(bot, R, boss, 210, 0.12, true);
  if (boss && boss.canBeHit && !['step', 'burn', 'dead'].includes(boss.state)) {
    if (boss.overdrawn || (th.surge && th.surge.phase === 'hot')) return strike(bot, R, boss, 170, 0.16, true);
    const reach = (st.staffs < 1 && boss.phase !== 2) ? 130 : 195;
    return strike(bot, R, boss, reach, boss.state === 'staggered' ? 0.16 : 0.28);
  }
  if (!s.locked) return go(bot, 1, R.y > 650 ? -1 : R.y < LANE_TOP + 24 ? 1 : 0, true);
  if (R.y < LANE_TOP + 8 || R.y > LANE_BOT - 8) return go(bot, 0, R.y > 630 ? -1 : 1);
  return go(bot, 0, 0);
}

function strike(bot, R, e, reach, gap, melee) {
  const dx = e.x - R.x, dy = (e.y || R.y) - R.y, side = Math.sign(dx) || 1;
  if(e.type==='aginor'&&e.state==='attack'&&R.hp<18&&Math.abs(dx)<50)return go(bot,Math.sign(R.x-e.x)||-1,1,1);
  if (e.type !== 'aginor' && e.type !== 'balthamel' && Math.abs(dy) > 48 && Math.abs(dx) < reach) {
    bot.missY = (bot.missY || 0) + 1;
    if (bot.missY > 45) return go(bot, 0, Math.sign(dy), true);
  } else bot.missY = 0;
  if (Math.abs(dx) > reach) return go(bot, side, Math.abs(dy) > 10 ? Math.sign(dy) : 0, Math.abs(dx) > reach + 80);
  if (R.facing !== side) return go(bot, side, Math.abs(dy) > 12 ? Math.sign(dy) : 0);
  if (!melee && !bot.s.noPower && Math.abs(dx) > 90 && bot.t >= (bot.specT || 0)) { bot.s.inp.press('special'); bot.specT = bot.t + 0.85; }
  press(bot, 'attack', gap);
  return go(bot, Math.abs(dx) < 60 ? -side : 0, Math.abs(dy) > 14 ? Math.sign(dy) : 0);
}
