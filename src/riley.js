// Riley: the player. Frame-by-frame painted animations; all motion timing is driven by the drawn frames.
import { Fighter } from './fighter.js';
import { clamp } from './config.js';
import { sfx, say } from './audio.js';
export const RILEY_DEF = { key: 'riley', prefix: 'riley_', native: 1, scale: 0.58, anchorX: 0.45, hp: 100, team: 0, shadowW: 120, friction: 0.002 };
// Attack data. x0..x1 = reach in front (world px), z0..z1 = height band above the ground the strike covers.
const ATK = {
  combo1: { anim: 'combo1', active: [3], x0: 20, x1: 185, z0: 60, z1: 200, dmg: 5, kind: 'light', kb: 120, step: 40, voice: null },
  combo2: { anim: 'combo2', active: [2], x0: 20, x1: 185, z0: 40, z1: 180, dmg: 7, kind: 'medium', kb: 170, step: 70, voice: 'riley_combo_01' },
  combo3: { anim: 'combo3', active: [2, 3], x0: 0, x1: 200, z0: 60, z1: 220, dmg: 12, kind: 'finisher', kb: 520, launch: 520, down: true, step: 60, voice: 'riley_combo_03' },
  back: { anim: 'back', active: [3], x0: -200, x1: -10, z0: 40, z1: 170, dmg: 11, kind: 'heavy', kb: -480, launch: 380, down: true, step: 0 },
  airkick: { anim: 'airkick', active: [2, 3], x0: 0, x1: 190, z0: -60, z1: 200, dmg: 11, kind: 'heavy', kb: 460, launch: 420, down: true },
  runkick: { anim: 'runkick', active: [2], x0: 20, x1: 200, z0: 40, z1: 180, dmg: 10, kind: 'heavy', kb: 420, launch: 300, down: true, step: 260 },
  knee: { anim: 'knee', active: [1], x0: 0, x1: 140, z0: 0, z1: 200, dmg: 8, kind: 'medium', kb: 0 },
};
// Balefire (restored from 1.1): spends a FULL saidin meter. The beam fires on the thrust frame and is held through
// the sustain frames; Riley is invulnerable for 1.5 s as in 1.1.
export const BALEFIRE = Object.freeze({ cost: 100, fireFrame: 3, releaseFrame: 6, invuln: 1.5 });
export class Riley extends Fighter {
  constructor(scene, x, y) {
    super(scene, RILEY_DEF, x, y);
    this.saidin = 100; this.loialReady = true; this.lives = 3; this.inv = 0; this.combo = 0; this.comboT = 0; this.maxCombo = 0; this.score = 0; this.hurtStreak = 0;
    this.setState('idle', 'idle');
  }
  get busy() { return !['idle', 'walk', 'run'].includes(this.state); }
  get vulnerable() { return this.inv <= 0 && this.alive && !this.scene.victoryPending && !this.scene.ended && !['down', 'getup', 'dead'].includes(this.state); }
  update(dt, inp) {
    this.st += dt; if (this.inv > 0) this.inv -= dt; if (this.comboT > 0 && (this.comboT -= dt) <= 0) this.combo = 0;
    this.sprite.setAlpha(this.inv > 0 && this.state !== 'down' && this.state !== 'getup' && this.state !== 'balefire' ? (Math.floor(this.st * 20) % 2 ? 0.45 : 1) : 1);
    // The assist call works in any state (as in 1.1); the stage decides whether Loial is available.
    if (this.alive && inp.take('assist')) this.scene.callLoial?.();
    const s = this.state, x = inp.x, y = inp.y;
    switch (s) {
      case 'idle': case 'walk': case 'run': return this.free(dt, inp);
      case 'squat': if (this.st > 0.07) { this.vz = 920; this.z = 1; this.setState('air', 'jump_rise'); sfx.jump(); } return;
      case 'air': return this.air(dt, inp);
      case 'airkick': return this.airkick(dt, inp);
      case 'land': if (this.st > 0.09) this.setState('idle', 'idle'); return;
      case 'combo1': case 'combo2': case 'combo3': case 'back': case 'runkick': return this.attack(dt, inp);
      case 'cast': return this.cast(dt);
      case 'balefire': return this.balefire(dt);
      case 'grab': return this.grab(dt, inp);
      case 'hold': case 'knee': return this.hold(dt, inp);
      case 'throw': return this.throwing(dt);
      case 'hurt': if (this.done) this.setState('idle', 'idle'); return;
      case 'down': if (this.st > (this.alive ? 0.9 : 99) && this.z <= 0) { this.setState('getup', 'getup'); this.inv = 1.2; } return;
      case 'getup': if (this.done) { this.setState('idle', 'idle'); this.inv = 1.0; } return;
    }
  }
  free(dt, inp) {
    const { x, y } = inp;
    if (inp.take('power') && this.saidin >= BALEFIRE.cost && this.scene.canBalefire?.()) return this.startBalefire();
    if (inp.take('special') && this.saidin >= 34) return this.startCast();
    if (inp.take('jump')) { this.jumpVx = x * (this.state === 'run' ? 360 : 210); this.setState('squat', 'jump_crouch'); return; }
    if (inp.take('attack')) {
      if (x && x !== this.facing) { this.setState('back', ATK.back.anim); this.atk = ATK.back; sfx.swing(); return; }
      if (this.state === 'run') { this.setState('runkick', ATK.runkick.anim); this.atk = ATK.runkick; this.vx = this.facing * 420; sfx.whiff(); return; }
      return this.startCombo(1);
    }
    if (x || y) {
      if (x) this.face(x);
      const run = inp.run && x;
      const sp = run ? 390 : 205;
      this.x += x * sp * dt; this.y += y * 125 * dt;
      const st = run ? 'run' : 'walk'; if (this.state !== st) this.setState(st, st);
      if (this.st % 0.3 < dt) sfx.step();
      // walking into a dazed or open enemy grabs it
      if (x && !run) { const e = this.scene.grabCandidate(this); if (e) return this.startGrab(e); }
    } else if (this.state !== 'idle') this.setState('idle', 'idle');
  }
  air(dt, inp) {
    this.x += (this.jumpVx + inp.x * 60) * dt; this.y += inp.y * 60 * dt;
    const want = this.vz > 260 ? 'jump_rise' : this.vz > -260 ? 'jump_apex' : 'jump_fall'; this.play(want, 1, false);
    if (inp.take('attack') && !this.kicked) { this.kicked = true; this.atk = ATK.airkick; this.setState('airkick', 'airkick'); sfx.swing(); }
  }
  airkick(dt, inp) {
    this.x += (this.jumpVx + this.facing * 80) * dt;
    if (this.fi >= this.atk.active[0]) this.scene.resolveAttack(this, this.atk);
  }
  onLand() { this.kicked = false; if (['air', 'airkick'].includes(this.state)) { this.setState('land', 'land'); sfx.land(); this.scene.fx.snowPuff.emitParticleAt(this.x, this.y, 6); } }
  startCombo(n) {
    const a = ATK['combo' + n]; this.atk = a; this.setState('combo' + n, a.anim); this.next = false; sfx.swing();
    if (a.voice && Math.random() < 0.35) say(a.voice, this.scene.caption, false);
  }
  attack(dt, inp) {
    const a = this.atk, f = this.fi;
    const n = this.state.startsWith('combo') ? +this.state.slice(5) : 0;
    if (n && n < 3 && inp.take('attack', 0.3)) this.next = true;
    if (a.step && f <= a.active[a.active.length - 1]) this.x += this.facing * a.step * dt;
    if (a.active.includes(f)) this.scene.resolveAttack(this, a);
    if (n && n < 3 && this.next && f > a.active[0] && this.st > 0.12) return this.startCombo(n + 1);
    if (this.done) { this.setState('idle', 'idle'); if (inp.x) this.face(inp.x); }
  }
  startCast() {
    this.saidin -= 34; this.setState('cast', 'cast'); this.cast_fired = false; sfx.fire();
    if (Math.random() < 0.5) say('riley_fire_01', this.scene.caption, false);
  }
  cast(dt) {
    if (this.fi >= 2 && !this.cast_fired) { this.cast_fired = true; this.scene.spawnFireball(this); this.vx = -this.facing * 120; }
    if (this.done) this.setState('idle', 'idle');
  }
  startBalefire() {
    this.saidin -= BALEFIRE.cost; this.inv = Math.max(this.inv, BALEFIRE.invuln); this.vx = 0; this.fired = false;
    this.setState('balefire', this.scene.anims.exists('riley_balefire') ? 'balefire' : 'cast'); sfx.fire();
    say('riley_super_01', this.scene.caption);
  }
  balefire(dt) {
    const fireAt = this.cur === 'riley_balefire' ? BALEFIRE.fireFrame : 2;
    if (!this.fired && this.fi >= fireAt) { this.fired = true; this.scene.fireBalefire(this); }
    if (this.done) { this.scene.endBalefire?.(); this.setState('idle', 'idle'); }
  }
  startGrab(e) { this.held = e; e.grabbed(this); this.setState('grab', 'grab'); this.knees = 0; this.holdT = 0; if (Math.random() < 0.4) say('riley_grab_01', this.scene.caption, false); }
  grab(dt, inp) { this.placeHeld(); if (this.st > 0.12) this.setState('hold', 'hold'); }
  placeHeld() { const e = this.held; if (!e) return; e.x = this.x + this.facing * 92; e.y = this.y + 1; e.z = 0; e.face(-this.facing); }
  hold(dt, inp) {
    const e = this.held; if (!e || !e.alive || e.state !== 'held') { this.held = null; return this.setState('idle', 'idle'); }
    this.placeHeld(); this.holdT += dt;
    if (this.state === 'knee') { if (this.fi >= ATK.knee.active[0] && !this.kneeHit) { this.kneeHit = true; this.scene.hitTarget(this, e, ATK.knee); } if (this.done) this.setState('hold', 'hold'); return; }
    // Consume a press once: testing the throw branch used to eat the first two knees.
    const attack = inp.take('attack'), jump = inp.take('jump');
    if (jump || (attack && (inp.x === -this.facing || this.knees >= 2))) return this.startThrow();
    if (attack) { this.knees++; this.kneeHit = false; this.setState('knee', 'knee'); sfx.swing(); return; }
    if (this.holdT > 1.6) { e.release(); this.held = null; this.setState('idle', 'idle'); }
  }
  startThrow() { this.setState('throw', 'throw'); this.thrown = false; if (Math.random() < 0.5) say('riley_throw_01', this.scene.caption, false); }
  throwing(dt) {
    const e = this.held;
    if (e && !this.thrown) {
      // carry the enemy over the shoulder during the pivot frame, release on the release frame
      e.x = this.x + this.facing * (this.fi === 0 ? 40 : -30); e.z = this.fi === 0 ? 120 : 160;
      if (this.fi >= 1) { this.thrown = true; e.throwFrom(this, -this.facing); this.held = null; sfx.whoosh(); }
    }
    if (this.done) { this.setState('idle', 'idle'); this.face(-this.facing); }
  }
  /** called by the scene when an enemy strike connects */
  takeHit(h, from) {
    if (!this.vulnerable) return false;
    if (this.held) { this.held.release(); this.held = null; }
    this.hp = Math.max(this.scene.god ? 1 : 0, this.hp - h.dmg); this.hurtStreak++;
    const dir = Math.sign(this.x - from.x) || 1; this.face(-dir);
    if (this.hp <= 0) { this.alive = false; this.down(dir, h); this.scene.rileyDied(); return true; }
    if (h.down || this.hurtStreak >= 3) { this.down(dir, h); this.hurtStreak = 0; if (Math.random() < 0.5) say(Math.random() < 0.5 ? 'riley_bighit_01' : 'riley_bighit_02', this.scene.caption, false); }
    else { this.setState('hurt', 'hurt'); this.vx = dir * (h.kb || 140); sfx.hurt(); }
    this.scene.time.delayedCall(900, () => { this.hurtStreak = Math.max(0, this.hurtStreak - 1); });
    return true;
  }
  down(dir, h) { this.setState('down', 'knockdown'); this.vx = dir * 360; this.scene.dustLater(this, 0.32); sfx.hurt(); }
  respawn() { this.alive = true; this.hp = this.maxHp; this.saidin = Math.max(this.saidin, 60); this.setState('getup', 'getup'); this.inv = 2.5; say('riley_respawn_01', this.scene.caption, false); }
  landedHit(dmg) { this.combo++; this.comboT = 1.6; this.maxCombo = Math.max(this.maxCombo, this.combo); this.saidin = Math.min(100, this.saidin + 3); this.score += dmg * 10 * (1 + Math.floor(this.combo / 5)); }
}
