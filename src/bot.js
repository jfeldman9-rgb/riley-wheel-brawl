// ?demo=1: a simple autopilot for Riley so the slice can be captured and perf-measured hands-free.
import { rand, q, LANE_TOP, LANE_BOT } from './config.js';
import { VOLLEY_BANDS } from './stages.js';
export class Bot {
  constructor(scene, { mode = q.get('demo') } = {}) {
    this.s = scene; this.t = 0; this.next = 0; this.plan = null;
    this.bossCoverage = mode === 'boss-coverage';
    // Observations only: this mode never writes fighter HP, positions, phases or attacks.
    this.coverage = { phases: [], attacks: [], wallStun: false, summonedHounds: 0, carts: 0, complete: false };
    this.seenHounds = new Set(); this.seenCarts = new Set();
  }
  update(dt) {
    const s = this.s, R = s.riley, inp = s.inp; this.t += dt;
    if (!s.started || !R.alive || s.ended || s.gameOver) { inp.demo = { x: 0, y: 0 }; return; }
    if (this.bossCoverage) return this.updateBossCoverage();
    // Stage 2 hazards (lane volleys, arrows, charges, the parry bait, torches, falling beams). Stage 1 never enters here.
    if (s.kit && this.evadeStage2()) return;
    const foes = s.enemies.filter(e => e.alive && !e.entering);
    // Only pickups inside the arena are reachable; a power that has landed nearby is worth a detour mid-fight.
    const reachable = s.pickups.filter(p => p.x > s.bounds.l + 40 && p.x < s.bounds.r - 40 && (!p.power || p.ready));
    const power = reachable.find(p => p.power && Math.abs(p.x - R.x) < 360);
    if (power && !R.busy) { inp.demo = { x: Math.abs(power.x - R.x) > 20 ? Math.sign(power.x - R.x) : 0, y: Math.abs(power.y - R.y) > 10 ? Math.sign(power.y - R.y) : 0 }; return; }
    if (!foes.length) { inp.demo = { x: (s.zone && !s.locked) || !s.zone ? 1 : 0, y: R.y > 640 ? -1 : R.y < 620 ? 1 : 0, run: !s.zone }; if (reachable.length) { const p = reachable[0]; inp.demo = { x: Math.sign(p.x - R.x), y: Math.abs(p.y - R.y) > 10 ? Math.sign(p.y - R.y) : 0 }; } return; }
    foes.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x));
    const e = foes[0], dx = e.x - R.x, dy = e.y - R.y, side = Math.sign(dx) || 1;
    const want = e.T.boss ? 170 : 125;
    let x = 0, y = Math.abs(dy) > 8 ? Math.sign(dy) : 0;
    if (Math.abs(dx) > want + 20) x = side; else if (Math.abs(dx) < want - 50) x = -side;
    inp.demo = { x, y, run: false };
    if (this.t < this.next || R.busy) return;
    const aligned = Math.abs(dy) < 14;
    if (R.facing !== side) { inp.demo.x = side; return; }
    const cast = s.powers ? s.powers.castKind(R) : R.saidin >= 34 ? 'fireball' : null;
    if (cast && cast !== 'fireball' && Math.abs(dy) < 50 && Math.abs(dx) > 150 && Math.random() < 0.6) { inp.press('special'); this.next = this.t + 0.8; return; }
    if (aligned && Math.abs(dx) > 300 && cast === 'fireball' && Math.random() < 0.5) { inp.press('special'); this.next = this.t + 0.9; return; }
    if (aligned && Math.abs(dx) < want + 40) {
      const r = Math.random();
      if (r < 0.12) { inp.press('jump'); this.pressLater('attack', 260); this.next = this.t + 1.0; }
      else { inp.press('attack'); this.pressLater('attack', 220); this.pressLater('attack', 470); this.next = this.t + rand(0.9, 1.3); }
    }
  }
  /** step out of the lane band / spot something is about to hit; returns true while it owns the controls */
  evadeStage2() {
    const s = this.s, R = s.riley, inp = s.inp, k = s.kit, t = k.threats();
    if (R.busy && !['idle', 'walk', 'run'].includes(R.state)) return false;
    const away = (y, dy = 1) => { const up = R.y - LANE_TOP, down = LANE_BOT - R.y; return Math.abs(R.y - y) < 4 ? (up > down ? -1 : 1) : Math.sign(R.y - y) * dy || 1; };
    const go = (x, y) => { inp.demo = { x, y, run: false }; return true; };
    const v = t.volley;
    if (v && !v.struck) {
      const cur = k.bandOf(R.y), safe = [0, 1, 2].filter(i => !v.bands.includes(i));
      if (safe.length) {
        const tgt = safe.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur))[0], [y0, y1] = VOLLEY_BANDS[tgt], mid = (y0 + y1) / 2;
        if (v.bands.includes(cur) || Math.abs(R.y - mid) > (y1 - y0) / 2 - 6) return go(0, Math.sign(mid - R.y));
        return go(0, 0);
      }
    }
    for (const m of t.sky) if (Math.abs(R.x - m.tx) < 80 && Math.abs(R.y - m.ty) < 34) return go(0, away(m.ty));
    for (const a of t.arrows) { const d = (R.x - a.x) * a.dir; if (d > -20 && d < 420 && Math.abs(R.y - a.y) < 26) return go(0, away(a.y)); }
    for (const b of t.beams) if (b.hurts && !b.landed && Math.abs(R.x - b.x) < 140 && Math.abs(R.y - b.y) < 34) return go(0, away(b.y));
    for (const c of t.torches) if (Math.abs(R.x - c.tx) < 130 && Math.abs(R.y - c.ty) < 48) return go(0, away(c.ty));
    for (const p of s.patches) if (Math.abs(R.x - p.x) < 90 && Math.abs(R.y - p.y) < 30) return go(0, away(p.y));
    for (const e of s.enemies) {
      if (!e.alive || e.entering) continue;
      if (e.type === 'zealot' && (e.state === 'chargeup' || e.state === 'charge') && Math.abs(R.y - e.y) < 36 && (R.x - e.x) * e.facing > 0) return go(0, away(e.y));
      if (e.type === 'byar' && e.state === 'parry') {
        // the bait: never swing at his raised shield; hold just out of reach until he lowers it
        const dx = R.x - e.x, side = Math.sign(dx) || 1;
        return go(Math.abs(dx) < 250 ? side : Math.abs(dx) > 320 ? -side : 0, 0);
      }
      if (e.type === 'byar' && e.state === 'rush' && Math.abs(R.y - e.y) < 40) return go(0, away(e.y));
    }
    return false;
  }
  pressLater(action, delayMs) {
    const s = this.s, R = s.riley;
    // Scene timers pause with gameplay and are removed on restart/shutdown.
    // The identity/lifecycle checks also discard inputs after death or bot replacement.
    return s.time.delayedCall(delayMs, () => {
      if (s.bot === this && s.riley === R && s.started && R.alive && !s.ended && !s.gameOver) s.inp.press(action);
    });
  }
  observeBoss(boss) {
    const c = this.coverage;
    if (!c.phases.includes(boss.phase)) c.phases.push(boss.phase);
    const attack = boss.state === 'attack' ? 'chop' : boss.state;
    if (['chop', 'sweep', 'charge', 'roar', 'lift', 'hurl'].includes(attack) && !c.attacks.includes(attack)) c.attacks.push(attack);
    if (this.lastBossState === 'charge' && boss.state === 'stunned') c.wallStun = true;
    this.lastBossState = boss.state;
    // Hounds must appear after a witnessed roar; an existing pack cannot satisfy it.
    for (const e of this.s.enemies) if (e.type === 'hound' && !this.seenHounds.has(e.id)) {
      this.seenHounds.add(e.id); if (c.attacks.includes('roar')) c.summonedHounds++;
    }
    for (const cart of this.s.carts || []) if (!this.seenCarts.has(cart)) { this.seenCarts.add(cart); c.carts++; }
    c.complete = [1, 2, 3].every(p => c.phases.includes(p)) && ['chop', 'sweep', 'charge', 'roar', 'lift', 'hurl'].every(a => c.attacks.includes(a)) && c.wallStun && c.summonedHounds >= 2 && c.carts > 0;
  }
  moveTo(x, y, run = false) {
    const R = this.s.riley;
    this.s.inp.demo = { x: Math.abs(x - R.x) > 8 ? Math.sign(x - R.x) : 0, y: Math.abs(y - R.y) > 6 ? Math.sign(y - R.y) : 0, run };
  }
  fight(e) {
    const R = this.s.riley, inp = this.s.inp, dx = e.x - R.x, dy = e.y - R.y, side = Math.sign(dx) || R.facing;
    // No wall-clock callbacks: combo requests follow the actual fighter state.
    this.moveTo(e.x - side * (e.T.boss ? 150 : 120), e.y);
    if (['combo1', 'combo2'].includes(R.state)) { inp.press('attack'); return; }
    if (R.state === 'hold') { inp.press('attack'); return; }
    if (R.busy) return;
    if (R.facing !== side) { inp.demo.x = side; return; }
    if (Math.abs(dy) < 14 && Math.abs(dx) < (e.T.boss ? 185 : 155)) { inp.demo.x = 0; inp.demo.run = false; inp.press('attack'); }
  }
  updateBossCoverage() {
    const s = this.s, R = s.riley, boss = s.boss, c = this.coverage;
    const foes = s.enemies.filter(e => e.alive && !e.entering);
    if (boss) this.observeBoss(boss);
    if (!boss || !boss.alive || boss.entering) {
      if (foes.length) { foes.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x)); return this.fight(foes[0]); }
      this.moveTo(R.x + ((!s.zone || !s.locked) ? 100 : 0), 630, !s.zone); return;
    }
    const side = Math.sign(R.x - boss.x) || -1;
    const dodgeY = boss.y < (LANE_TOP + LANE_BOT) / 2 ? LANE_BOT : LANE_TOP;
    const needMelee = boss.phase === 1 && !['chop', 'sweep'].every(a => c.attacks.includes(a));
    const needCharge = boss.phase === 2 && (!c.wallStun || c.summonedHounds < 2);
    const needCart = boss.phase >= 3 && !c.carts;
    if (needMelee) {
      // Offer a valid melee slot, then sidestep the real wind-up. No damage yet.
      const attacking = ['attack', 'sweep'].includes(boss.state);
      this.moveTo(boss.x + side * 215, attacking ? dodgeY : boss.y); return;
    }
    if (boss.state === 'charge') { this.moveTo(R.x, dodgeY); return; }
    if (needCharge || needCart) {
      // Make space for the unchanged >330 charge and >260 cart decisions.
      // Clear close hounds first without accidentally using the boss as the target.
      const hounds = foes.filter(e => !e.T.boss && Math.abs(e.x - R.x) < 250 && Math.abs(boss.x - R.x) > 320);
      hounds.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x));
      if (hounds.length) return this.fight(hounds[0]);
      const edge = side < 0 ? s.bounds.l + 100 : s.bounds.r - 100;
      this.moveTo(edge, boss.y, true); return;
    }
    // Leave the target location once a cart is actually airborne.
    if ((s.carts || []).length) { this.moveTo(R.x, dodgeY); return; }
    foes.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x));
    this.fight(foes[0] || boss);
  }
}
