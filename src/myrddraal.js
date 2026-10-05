import { Enemy, TYPES } from './enemies.js';
import { clamp, rand, q, LANE_TOP, LANE_BOT } from './config.js';
import { sfx } from './audio.js';

const { abs, sign, min, max, hypot, sin } = Math;
const D = (key, scale, anchorX, hp, shadowW) => ({ key, prefix: key + '_', native: -1, scale, anchorX, hp, team: 1, shadowW });
Object.assign(TYPES, {
  fade: {
  def: D('fade', 0.56, 0.5, 440, 180), get hp() { return this.def.hp; },
  name: 'THE MYRDDRAAL', speed: 110, pref: 210, cool: [0.9, 1.5], score: 7000, boss: true,
  atk: { anim: 'slash', active: [2, 4], x0: 20, x1: 260, z0: 0, z1: 240, dmg: 12, kind: 'medium', kb: 300, sfx: 'blade' }
  }
});
TYPES.fadecopy = { ...TYPES.fade, def: { ...TYPES.fade.def, hp: 1 }, get hp() { return this.def.hp; }, boss: false, score: 0 };

const deep = o => { for (const v of Object.values(o)) if (v && typeof v === 'object') deep(v); return Object.freeze(o); };
const LH = { x0: -10, x1: 170, z0: 0, z1: 240 };
export const FADE = deep({
  blink: { every: [4, 6], everyP2: [6, 8], poolWarn: 0.6, counterFrames: [2, 3], behind: 110, edge: 70 },
  fear: { radius: 220, fill: 1.6, shaken: 0.7, dispel: 4, dispelRange: 400, vig: [0.35, 0.75], torchDim: 0.7,
  rampIn: 0.5, rampOut: 0.3, pulse: 0.03, auraFrame: 3, hurtMs: 340, brave: 1.2 },
  split: { copies: 2, every: [8, 10], wrongHitPunish: 0.3, spread: [280, 460], order: [0.8, 1.6, 2.4], relunge: [2.4, 3.2] },
  counter: { stagger: 1.4, mul: 1.5 }, reduction: 0.6, wake: 0.8, melt: 1.2,
  lunge: { speed: 760, range: [220, 420], lane: 30, chance: 0.5,
  hit: { ...LH, dmg: 12, kind: 'heavy', kb: 400, launch: 320, down: true },
  copyHit: { ...LH, dmg: 8, kind: 'medium', kb: 220 } },
  thrust: { dmg: 12, kind: 'heavy', down: true, kb: 380 }
});
const { blink, fear, split, counter, lunge, thrust, reduction, wake, melt } = FADE;
const NO_FEAR = ['hurt', 'down', 'getup', 'cast', 'balefire', 'grabbed', 'escape'];
const HIT_SKIP = ['dead', 'down', 'getup', 'defeated', 'sunk'], OPEN = ['approach', 'wait'];
const ARMOR = ['blinkout', 'blinkin', 'fear', 'split', 'intro'], THRUST = { ...TYPES.fade.atk, ...thrust };
const app = e => e.setState('approach', 'walk');

export const calmMotion = () => q.get('flash') === '0' || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const bump = (s, k, h, m) => { const st = s.kit?.stats; if (st) st[k] = (st[k] || 0) + 1; if (h) s.kit?.hint?.(h, m); };

export function poolSpot(R, b) {
  const { behind, edge } = blink, l = b.l + edge, r = b.r - edge;
  let x = R.x - R.facing * behind;
  if (x < l || x > r) x = R.x + R.facing * behind;
  return { x: clamp(x, l, r), y: clamp(R.y, LANE_TOP + 6, LANE_BOT - 6) };
}

export function lightNear(s, x, r) {
  if (s.fireballs?.some(f => abs(f.x - x) <= r)) return 'fireball';
  if (s.powers?.bolts?.some(b => b.L && abs(b.L.x - x) <= r)) return 'lightning';
  if (s.powers?.active?.('fireshield') && abs(s.riley.x - x) <= r) return 'fireshield';
  const bm = s.beam;
  if (bm && !bm.fade) {
  const u = (x - bm.x0) * bm.dir;
  if (u >= -r && u <= bm.len + r) return 'balefire';
  }
  return null;
}

function lungeTick(e, dt, hit) {
  const b = e.scene.bounds, f = e.fi === 1 || e.fi === 2;
  if (f && e.x > b.l + 60 && e.x < b.r - 60) e.x += e.facing * lunge.speed * dt;
  if (f) e.scene.resolveAttack(e, hit);
  if (e.done) { e.cool = rand(...e.T.cool); app(e); }
}

export class Myrddraal extends Enemy {
  constructor(s, x, y) {
    super(s, 'fade', x, y);
    this.T = { ...TYPES.fade };
    this.auraK = this.fear = this.braveT = this.dispelT = this.resplitT = this.forceLungeT = this.meltT = this.wake = this.t = 0;
    this.isCopy = this.introDone = this.auraOn = this.pendingFear = this.pendingSplit = this.melting = this.whooshed = false;
    this.phase = 1; this.cool = 1.6; this.lungeAt = 99; this.lastActive = -1;
    this.nextBlink = rand(...blink.every); this.pool = null; this.copies = [];
  }
  get grabbable() { return false; }
  poise() { return 9; }
  get canBeHit() { return this.alive && !this.entering && !HIT_SKIP.includes(this.state); }
  get auraActive() { return this.auraOn && this.dispelT <= 0 && this.alive; }

  update(dt) {
    this.t += dt; const s = this.scene, R = this.target;
    if (this.state === 'getup' && this.done) { app(this); this.cool = 0.2; this.wake = wake; return; }
    if (this.wake > 0) this.wake -= dt;
    if (this.alive) {
      const ph = this.hp / this.maxHp > 0.66 ? 1 : this.hp / this.maxHp > 0.33 ? 2 : 3;
      if (ph !== this.phase) {
        this.phase = ph; s.onBossPhase(this, ph);
        if (ph === 2) this.pendingFear = true;
        if (ph === 3) this.pendingSplit = true;
        if (OPEN.includes(this.state)) this.cool = 0;
      }
    }
    this.nextBlink -= dt; this.lungeAt -= dt;
    if (this.resplitT > 0 && (this.resplitT -= dt) <= 0 && this.phase === 3) this.pendingSplit = true;
    // Activation and dispel share a tick, even if the light expires this frame.
    if (this.state === 'fear' && this.fi >= fear.auraFrame && !this.auraOn) { this.auraOn = true; bump(s, 'fears', 'fear', 'FEAR AURA! FIRE OR LIGHTNING DRIVES IT BACK'); }
    this.tickFear(dt); this.tickLook(dt);
    this.st += dt; this.cool -= dt; if (this.shudder > 0) this.shudder -= dt;
    switch (this.state) {
      case 'intro':
        if (!this.fi && !this.whooshed) { this.whooshed = true; sfx.shadowWhoosh?.(); }
        if (this.done) { this.whooshed = false; this.introDone = true; this.cool = 1; app(this); }
        return;
      case 'attack': return this.attacking();
      case 'lunge': return lungeTick(this, dt, lunge.hit);
      case 'blinkout':
        if (this.done) {
          this.state = 'sunk'; this.st = 0;
          this.pool = { ...poolSpot(R, s.bounds), t: 0 };
          this.pool.fx = s.kit?.shadowPool?.(this.pool);
          sfx.shadowWhoosh?.();
        }
        return;
      case 'sunk':
        this.pool.t += dt;
        if (this.st >= blink.poolWarn) {
          this.x = this.pool.x; this.y = this.pool.y; this.face(sign(R.x - this.x) || 1);
          s.kit?.shadowPoolEnd?.(this.pool); this.pool = null; this.setState('blinkin', 'blinkin'); this.sprite.setAlpha(1);
        }
        return;
      case 'blinkin': if (this.done) this.startAttack(); return;
      case 'fear':
        if (this.done) { this.cool = rand(0.4, 0.8); app(this); }
        return;
      case 'split': if (this.done) { this.makeCopies(); this.cool = 0.6; app(this); } return;
      case 'stagger': if (this.st >= counter.stagger) { this.cool = rand(0.3, 0.6); app(this); } return;
      case 'defeated':
        if (this.done && !this.melting) { this.melting = true; s.kit?.shadowBurst?.(this.x, this.y); }
        if (this.melting) { this.meltT += dt; const a = max(0, 1 - this.meltT / melt); this.setA(a); if (!a) this.gone = true; }
        return;
      default: this.st -= dt; this.cool += dt; if (this.shudder > 0) this.shudder += dt; return super.update(dt);
    }
  }

  think(dt) {
    if (this.entering) return;
    if (!this.introDone) return this.setState('intro', 'intro');
    const R = this.target, s = this.scene;
    if (this.forceLungeT > 0 && R.alive) return this.startLunge();
    if (this.cool <= 0 && R.alive && R.state !== 'down') {
      if (this.pendingFear) return this.startFear();
      if (this.pendingSplit) return this.startSplit();
      if (this.nextBlink <= 0 && !this.copies.length) return this.startBlink();
      if (this.phase === 3 && this.lungeAt <= 0) return this.startLunge();
      const adx = abs(R.x - this.x);
      if (adx >= lunge.range[0] && adx <= lunge.range[1] &&
        abs(R.y - this.y) < lunge.lane && s.attackTokens() < s.maxTokens && Math.random() < lunge.chance) {
        return this.startLunge();
      }
    }
    super.think(dt);
  }

  startAttack() {
    this.face(sign(this.target.x - this.x) || 1);
    this.atk = this.T.atk; this.setState('attack', this.T.atk.anim);
    this.lastActive = -1; this.scene.onEnemyAttack(this);
  }

  attacking() {
    const a = this.atk, fi = this.fi;
    if (a.active.includes(fi)) {
      if (fi !== this.lastActive) { this.lastActive = fi; this.hitIds.clear(); sfx[a.sfx || 'swing']?.(); }
      this.scene.resolveAttack(this, fi === a.active[a.active.length - 1] && a === this.T.atk ? THRUST : a);
    }
    if (this.done) { this.cool = rand(...this.T.cool); app(this); }
  }

  startLunge() {
    this.face(sign(this.target.x - this.x) || 1);
    this.setState('lunge', 'lunge');
    this.forceLungeT = 0; this.lungeAt = rand(...split.relunge);
    this.scene.kit?.glint?.(this.x - this.facing * 60, this.y - 220, 0xffffff);
    sfx.glint();
  }

  startBlink() {
    this.setState('blinkout', 'blinkout');
    this.nextBlink = rand(...(this.phase === 1 ? blink.every : blink.everyP2));
    bump(this.scene, 'blinks');
  }

  startFear() { this.pendingFear = false; this.setState('fear', 'fear'); }
  startSplit() { this.pendingSplit = false; this.setState('split', 'split'); }

  makeCopies() {
    const s = this.scene, R = this.target, b = s.bounds, sd = sign(this.x - R.x) || 1;
    const spots = [R.x - sd * split.spread[0], R.x + sd * split.spread[1]];
    this.copies = [0, 1].map(i => {
      const c = new FadeCopy(s, clamp(spots[i], b.l + 80, b.r - 80), clamp(R.y + (i ? 30 : -30), LANE_TOP, LANE_BOT), this);
      s.enemies.push(c); return c;
    });
    const order = [...split.order].sort(() => Math.random() - 0.5);
    this.lungeAt = order[0]; this.copies[0].lungeAt = order[1]; this.copies[1].lungeAt = order[2];
    bump(s, 'splits', 'copies', 'ONLY THE REAL ONE CASTS A SHADOW AND CATCHES THE TORCHLIGHT');
  }

  inParry() {
    return this.phase === 3 && ((this.state === 'lunge' && this.fi <= 2) || (this.state === 'attack' && this.fi <= 4));
  }

  takeHit(h, from) {
    if (!this.canBeHit) return false;
    const s = this.scene, dir = sign(this.x - from.x) || 1, st = this.state;
    const isParry = this.inParry(), isBlink = st === 'blinkin' && blink.counterFrames.includes(this.fi);
    if (isBlink || isParry || st === 'stagger') {
      this.hp -= h.dmg * counter.mul; this.shudder = 0.12;
      if (isBlink || isParry) {
        this.setState('stagger', 'stagger'); this.vx = 0;
        bump(s, isParry ? 'parries' : 'counters', 'counter', 'COUNTER!');
        if (isParry) { this.clearCopies(false); this.pendingSplit = false; this.resplitT = rand(...split.every); }
      }
      if (this.hp <= 0) this.die(dir, h);
      return true;
    }
    if (ARMOR.includes(st) || this.wake > 0) {
      this.hp -= h.dmg * reduction; this.shudder = 0.1; this.flashArmor();
      if (this.hp <= 0) this.die(dir, h);
      return true;
    }
    return super.takeHit(h, from);
  }

  die(dir, h) {
    this.heldBy = null; this.alive = false; this.hitsTaken = 0; this.vx = (dir || 1) * 60;
    this.clearAbilities(); this.setState('defeated', 'defeated'); this.scene.onEnemyDie(this);
  }

  clearAbilities() { this.clearCopies(false); if (this.pool) { this.scene.kit?.shadowPoolEnd?.(this.pool); this.pool = null; } this.auraOn = false; this.fear = 0; this.braveT = 0; this.pendingFear = this.pendingSplit = false; this.resplitT = 0; }

  clearCopies(p) { for (const c of this.copies) if (c.alive) c.vanish(p); this.copies = []; }
  onCopyPopped(c) { const i = this.copies.indexOf(c); if (i !== -1) this.copies.splice(i, 1); this.forceLungeT = split.wrongHitPunish; bump(this.scene, 'copiesPopped'); }

  setA(a) { this.sprite.setAlpha(a); this.shadow.setAlpha(a * 0.9); }
  sync() { super.sync(); if (this.state === 'sunk') this.setA(0); else if (this.melting) this.setA(max(0, 1 - this.meltT / melt)); }

  physics(dt) { if (this.state !== 'sunk') super.physics(dt); }

  tickFear(dt) {
    const s = this.scene, R = this.target;
    // Only the part of this frame after both protection windows can fill fear.
    const protectedT = min(dt, max(0, this.braveT, this.dispelT));
    if (this.auraOn && lightNear(s, this.x, fear.dispelRange)) {
      if (this.dispelT <= 0) { bump(s, 'dispels', 'dispel', 'LIGHT DRIVES THE SHADOW BACK!'); }
      this.dispelT = fear.dispel;
    } else this.dispelT = max(0, this.dispelT - dt);
    this.braveT = max(0, this.braveT - dt);
    const copyLunge = this.copies.some(c => c.alive && c.state === 'lunge');
    const calm = this.braveT > 0 || copyLunge || NO_FEAR.includes(R.state);
    const inside = !calm && this.auraActive && R.alive && hypot(R.x - this.x, R.y - this.y) <= fear.radius;
    this.fear = inside ? clamp(max(0, this.fear - protectedT / fear.fill) + (dt - protectedT) / fear.fill, 0, 1) : clamp(this.fear - dt / fear.fill, 0, 1);
    if (this.fear >= 1 && R.vulnerable && R.z <= 0 && !R.grabbedBy && !NO_FEAR.includes(R.state)) {
      if (R.held) { R.held.release(); R.held = null; }
      R.setState('hurt', 'hurt', fear.hurtMs / (fear.shaken * 1000));
      R.vx = 0; this.fear = 0; this.braveT = fear.brave; bump(s, 'shaken');
    }
  }

  tickLook(dt) {
    const s = this.scene, k = this.auraActive ? 1 : 0;
    if (this.auraK < k) this.auraK = min(k, this.auraK + dt / fear.rampIn);
    else if (this.auraK > k) this.auraK = max(k, this.auraK - dt / fear.rampOut);
    const vig = fear.vig;
    if (s.vignette) {
      s.vignette.strength = this.auraK === 0 ? vig[0] : (vig[0] + (vig[1] - vig[0]) * this.auraK +
      (calmMotion() ? 0 : fear.pulse * this.auraK * sin(this.t * 4)));
    }
    if (s.fires) for (const L of s.fires) {
      L.baseR ??= L.radius;
      L.radius = this.auraK === 0 ? L.baseR : L.baseR * (1 - (1 - fear.torchDim) * this.auraK);
    }
  }
}

export class FadeCopy extends Enemy {
  constructor(s, x, y, owner) {
    super(s, 'fadecopy', x, y);
    this.sprite.setLighting(false);
    this.isCopy = this.introDone = true; this.entering = false;
    this.owner = owner; this.lungeAt = 99; this.cool = 0.5;
    this.shadow.setVisible(false);
    s.kit?.copyWisps?.(this);
  }
  get grabbable() { return false; }

  think(dt) {
    if (this.entering) return;
    const R = this.target, s = this.scene;
    if (this.lungeAt <= 0 && s.attackTokens() < s.maxTokens) { this.startLunge(); this.lungeAt = rand(...split.relunge); return; }
    const sl = this.slot(), dx = sl.x - this.x, dy = sl.y - this.y;
    this.face(sign(R.x - this.x));
    const tx = dx + ((this.cool > 0 || s.attackTokens() >= s.maxTokens) ? sl.side * 70 : 0);
    const mx = abs(tx) > 8 ? sign(tx) : 0, my = abs(dy) > 6 ? sign(dy) : 0, sp = this.T.speed * (abs(tx) > 400 ? 1.25 : 1);
    this.x += (mx * sp + s.separation(this)) * dt; this.y += my * sp * 0.55 * dt;
    this.play('walk', (mx || my) ? (mx && sign(mx) !== this.facing ? 0.75 : 1) : 0.0001, false);
  }

  startLunge() { this.face(sign(this.target.x - this.x) || 1); this.setState('lunge', 'lunge'); }
  update(dt) {
    this.lungeAt -= dt;
    if (this.state === 'lunge') {
      this.st += dt; this.cool -= dt; if (this.shudder > 0) this.shudder -= dt;
      return lungeTick(this, dt, lunge.copyHit);
    }
    return super.update(dt);
  }
  takeHit(h, from) { if (!this.canBeHit) return false; this.vanish(true); return true; }
  vanish(p) { const s = this.scene; this.alive = false; this.gone = true; s.kit?.shadowBurst?.(this.x, this.y); s.kit?.copyGone?.(this); sfx.shadowWhoosh?.(); if (p) this.owner.onCopyPopped(this); }
  die() { this.vanish(false); }
  sync() { super.sync(); this.shadow.setAlpha(0); }
}

export const MYRDDRAAL = Object.freeze({ fade: Myrddraal });
