// Trolloc grunt / spear / hound and the Trolloc Chieftain boss. Enemies face LEFT natively (as drawn).
import { Fighter } from './fighter.js';
import { clamp, rand, pick } from './config.js';
import { sfx, say } from './audio.js';
const D = (key, scale, anchorX, hp, shadowW) => ({ key, prefix: key + '_', native: -1, scale, anchorX, hp, team: 1, shadowW });
export const TYPES = {
  grunt: { def: D('grunt', 0.56, 0.55, 42, 150), name: 'TROLLOC', speed: 112, pref: 175, cool: [1.3, 2.3], score: 300,
    atk: { anim: 'attack', active: [3, 4], x0: 20, x1: 225, z0: 0, z1: 210, dmg: 10, kind: 'heavy', kb: 220, sfx: 'blade' } },
  spear: { def: D('spear', 0.56, 0.5, 34, 140), name: 'SPEAR TROLLOC', speed: 104, pref: 255, cool: [1.5, 2.6], score: 350,
    atk: { anim: 'attack', active: [2], x0: 40, x1: 330, z0: 20, z1: 200, dmg: 9, kind: 'medium', kb: 260, sfx: 'blade' } },
  hound: { def: D('hound', 0.56, 0.5, 24, 120), name: 'HOUND TROLLOC', speed: 250, pref: 250, cool: [1.0, 1.8], score: 250, flank: true,
    atk: { anim: 'attack', active: [2], x0: -10, x1: 170, z0: -40, z1: 220, dmg: 7, kind: 'light', kb: 160, sfx: 'blade' } },
  chief: { def: D('chief', 0.56, 0.52, 360, 230), name: 'TROLLOC CHIEFTAIN', speed: 92, pref: 215, cool: [1.2, 2.0], score: 5000, boss: true,
    atk: { anim: 'chop', active: [2, 3], x0: 20, x1: 300, z0: 0, z1: 260, dmg: 16, kind: 'heavy', kb: 380, down: true, sfx: 'blade' } },
};
let NEXT_ID = 1;
export class Enemy extends Fighter {
  constructor(scene, type, x, y) {
    const T = TYPES[type]; super(scene, T.def, x, y);
    this.T = T; this.type = type; this.id = NEXT_ID++; this.name = T.name; this.cool = rand(0.6, 1.4); this.juggle = 0; this.hitsTaken = 0; this.slotOff = rand(-14, 14);
    this.setState('approach', 'walk'); this.face(-1);
  }
  get target() { return this.scene.riley; }
  get canBeHit() { return this.alive && !this.entering && !['dead', 'held'].includes(this.state) && !(this.state === 'down' && this.z <= 0 && this.st > 0.08) && this.state !== 'getup' && !(this.airborne && this.juggle >= 3); }
  get grabbable() { return this.alive && !this.T.boss && ['approach', 'wait', 'hurt'].includes(this.state) && this.z <= 0; }
  update(dt) {
    this.st += dt; this.cool -= dt; if (this.shudder > 0) this.shudder -= dt;
    switch (this.state) {
      case 'approach': case 'wait': return this.think(dt);
      case 'attack': return this.attacking(dt);
      case 'hurt': if (this.done) this.setState('approach', 'walk'); return;
      case 'down': return this.downed(dt);
      case 'getup': if (this.done) { this.setState('approach', 'walk'); this.cool = rand(0.4, 1.0); } return;
      case 'held': this.heldT += dt; return;
      case 'thrown': return this.flying(dt);
      case 'dead': if (this.st > 1.3) { this.sprite.setAlpha(Math.max(0, 1 - (this.st - 1.3) / 0.6)); this.shadow.setAlpha(this.sprite.alpha * 0.8); if (this.st > 1.9) this.gone = true; } return;
    }
  }
  slot() {
    const R = this.target; let side = Math.sign(this.x - R.x) || 1;
    if (this.T.flank && this.scene.enemies.filter(e => e.alive && Math.sign(e.x - R.x) === side).length > 1) side = -side;
    return { x: R.x + side * this.T.pref, y: R.y + this.slotOff, side };
  }
  think(dt) {
    const R = this.target, sl = this.slot(); const dx = sl.x - this.x, dy = sl.y - this.y;
    this.face(Math.sign(R.x - this.x));
    const tokens = this.scene.attackTokens();
    const near = Math.abs(dx) < 34 && Math.abs(R.y - this.y) < 16;
    if (near && this.cool <= 0 && tokens < this.scene.maxTokens && R.alive && R.state !== 'down') return this.startAttack();
    // hover a bit further out while waiting for a token so the pack doesn't stack on Riley
    const hover = (this.cool > 0 || tokens >= this.scene.maxTokens) ? sl.side * 70 : 0;
    const tx = dx + hover, ty = dy;
    const sep = this.scene.separation(this);
    let mx = Math.abs(tx) > 8 ? Math.sign(tx) : 0, my = Math.abs(ty) > 6 ? Math.sign(ty) : 0;
    const sp = this.T.speed * (Math.abs(tx) > 400 ? 1.25 : 1);
    this.x += (mx * sp + sep) * dt; this.y += my * sp * 0.55 * dt;
    if (mx || my) { this.play('walk', mx && Math.sign(mx) !== this.facing ? 0.75 : 1, false); }
    else this.play('walk', 0.0001, false);
  }
  startAttack() { this.setState('attack', this.T.atk.anim); this.atk = this.T.atk; this.face(Math.sign(this.target.x - this.x)); this.scene.onEnemyAttack(this); }
  attacking(dt) {
    const a = this.atk; if (a.active.includes(this.fi)) { if (!this.swung) { this.swung = true; sfx[a.sfx || 'swing'](); } this.scene.resolveAttack(this, a); }
    if (this.done) { this.swung = false; this.cool = rand(...this.T.cool); this.setState('approach', 'walk'); }
  }
  takeHit(h, from) {
    // A held enemy stays immune to bystanders; only its holder's knee can connect.
    const heldKnee = this.alive && !this.entering && this.state === 'held' && this.heldBy === from && from.held === this && from.state === 'knee' && h.anim === 'knee';
    if (!this.canBeHit && !heldKnee) return false;
    const dir = Math.sign(this.x - from.x) || 1;
    this.hp -= h.dmg; this.shudder = 0.12;
    // Armor resists interruption, never death. Both melee attack states use it.
    if (this.hp <= 0) { this.die(dir, h); return true; }
    if (heldKnee) return true;
    if (['attack', 'sweep'].includes(this.state) && this.armor && !h.down && h.kind !== 'heavy') { this.flashArmor(); return true; }
    if (this.airborne || this.state === 'thrown') { this.juggle++; this.vz = Math.max(this.vz, this.juggle < 3 ? 320 : 120); this.vx = dir * Math.abs(h.kb || 200) * 0.6; this.setState('down', 'knockdown'); this.sprite.anims.setCurrentFrame(this.sprite.anims.currentAnim.frames[1]); return true; }
    if ((h.down && !this.T.boss) || (this.hitsTaken += (h.down ? 2 : 1)) >= this.poise()) return this.knockdown(dir, h), true;
    this.setState('hurt', 'hurt'); this.vx = dir * Math.abs(h.kb || 120) * (this.T.boss ? 0.3 : 1); this.face(-dir);
    return true;
  }
  poise() { return this.T.boss ? 9 : 4; }
  knockdown(dir, h) {
    this.hitsTaken = 0; this.juggle = 0; this.face(-dir);
    this.setState('down', 'knockdown'); this.vx = dir * Math.max(260, Math.abs(h.kb || 300)) * (this.T.boss ? 0.5 : 1); this.vz = (h.launch || 260) * (this.T.boss ? 0.5 : 1); this.z = 1;
    this.scene.dustLater(this, 0.35); sfx.hurt();
  }
  die(dir, h) { this.heldBy = null; this.alive = false; this.knockdown(dir, h); this.scene.onEnemyDie(this); }
  downed(dt) {
    if (this.z <= 0 && this.st > 0.15 && !this.landed) { this.landed = true; }
    const lieT = this.T.boss ? 1.1 : 0.85;
    if (this.done && this.z <= 0 && this.st > lieT) {
      this.landed = false;
      if (!this.alive) { this.setState('dead'); return; }
      this.setState('getup', 'getup');
    }
  }
  onLand(v) {
    if (this.state === 'thrown') {
      // Physics lands after update(): resume here before leaving 'thrown', or flying()
      // never runs again and the paused body can neither get up nor finish dying.
      this.sprite.anims.resume(); this.play('knockdown'); this.sprite.anims.setCurrentFrame(this.sprite.anims.currentAnim.frames[2]);
      this.scene.fx.thump(this.x, this.y, true); sfx.thud(); this.hp -= 12; this.state = 'down'; this.st = 0.2;
      if (this.hp <= 0 && this.alive) { this.alive = false; this.scene.onEnemyDie(this); } return;
    }
    if (this.state === 'down') { this.scene.fx.thump(this.x, this.y, v < -500); sfx.thud(); }
  }
  grabbed(by) { this.heldBy = by; this.setState('held', 'hurt'); this.sprite.anims.pause(); this.heldT = 0; this.vx = 0; }
  release() { if (this.state === 'held') { this.heldBy = null; this.sprite.anims.resume(); this.setState('approach', 'walk'); this.cool = 0.8; } }
  throwFrom(by, dir) {
    this.heldBy = null; this.sprite.anims.resume(); this.setState('thrown', 'knockdown'); this.sprite.anims.setCurrentFrame(this.sprite.anims.currentAnim.frames[1]); this.sprite.anims.pause();
    this.face(-dir); this.vx = dir * 560; this.vz = 560; this.z = Math.max(this.z, 60); this.thrownBy = by; this.hitIds.clear();
  }
  flying(dt) {
    // a thrown body bowls over anyone it hits
    for (const e of this.scene.enemies) if (e !== this && e.canBeHit && !this.hitIds.has(e.id) && Math.abs(e.x - this.x) < 90 && Math.abs(e.y - this.y) < 30) {
      this.hitIds.add(e.id); this.scene.hitTarget(this.thrownBy, e, { dmg: 10, kind: 'heavy', kb: Math.sign(this.vx) * 420, launch: 380, down: true }, this);
    }
  }
  flashArmor() { this.sprite.setTint(0xffb0a0); this.scene.time.delayedCall(70, () => this.sprite.clearTint()); }
}

// ---------------- Trolloc Chieftain ----------------
export class Chieftain extends Enemy {
  constructor(scene, x, y) { super(scene, 'chief', x, y); this.phase = 1; this.armor = true; this.nextRoar = 0; this.nextCart = 3; this.charges = 0; this.cool = 1.5; }
  get grabbable() { return false; }
  get canBeHit() { return this.alive && !this.entering && !['dead', 'down', 'getup'].includes(this.state); }
  update(dt) {
    if (this.state === 'getup' && this.done) { this.setState('approach', 'walk'); this.cool = 0; this.wake = 0.9; return; }
    if (this.wake > 0) this.wake -= dt;
    const f = this.hp / this.maxHp, ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    if (ph !== this.phase && this.alive) { this.phase = ph; this.scene.onBossPhase(this, ph); if (['approach', 'wait'].includes(this.state)) this.cool = 0; this.nextRoar = 0; }
    this.nextRoar -= dt; this.nextCart -= dt;
    if (['charge', 'stunned', 'roar', 'lift', 'hurl', 'sweep'].includes(this.state)) { this.st += dt; this.cool -= dt; if (this.shudder > 0) this.shudder -= dt; }
    switch (this.state) {
      case 'charge': return this.charging(dt);
      case 'stunned': if (this.st > 2.2) this.setState('approach', 'walk'); return;
      case 'roar': if (this.st > 1.1) { this.cool = rand(0.6, 1.2); this.setState('approach', 'walk'); } return;
      case 'lift': if (this.st > 0.55) { this.setState('hurl', 'hurl'); this.scene.throwCart(this); } return;
      case 'hurl': if (this.st > 0.5) { this.cool = rand(1.0, 1.6); this.setState('approach', 'walk'); } return;
      case 'sweep': return this.attacking(dt);
    }
    super.update(dt);
  }
  think(dt) {
    const R = this.target, dx = R.x - this.x, ady = Math.abs(R.y - this.y);
    if (this.cool <= 0 && R.alive) {
      if (this.phase >= 2 && this.nextRoar <= 0 && this.scene.enemies.filter(e => e.alive && e.type === 'hound').length < 2) return this.startRoar();
      if (this.phase >= 3 && this.nextCart <= 0 && Math.abs(dx) > 260) return this.startLift();
      if (this.phase >= 2 && Math.abs(dx) > 330 && ady < 40 && Math.random() < 0.6) return this.startCharge();
    }
    super.think(dt);
  }
  startAttack() {
    this.face(Math.sign(this.target.x - this.x));
    if (Math.random() < 0.45) { this.atk = { anim: 'sweep', active: [1], x0: 0, x1: 280, z0: 0, z1: 200, dmg: 12, kind: 'heavy', kb: 340, down: true, sfx: 'whoosh' }; this.setState('sweep', 'sweep'); }
    else { this.atk = this.T.atk; this.setState('attack', 'chop'); }
    this.scene.onEnemyAttack(this);
  }
  startRoar() { this.face(Math.sign(this.target.x - this.x)); this.setState('roar', 'roar'); this.nextRoar = 16; sfx.roar(); this.scene.fx.trauma = Math.min(1, this.scene.fx.trauma + 0.4); this.scene.time.delayedCall(450, () => this.alive && this.scene.summonHounds(this)); }
  startLift() { this.setState('lift', 'lift'); this.nextCart = rand(4.5, 6.5); this.face(Math.sign(this.target.x - this.x)); }
  startCharge() { this.face(Math.sign(this.target.x - this.x)); this.setState('charge', 'charge'); this.chargeDir = this.facing; this.hitIds.clear(); sfx.roar(); this.cool = rand(1.5, 2.5); }
  charging(dt) {
    this.x += this.chargeDir * 560 * dt; this.atk = { x0: -20, x1: 150, z0: 0, z1: 220, dmg: 14, kind: 'heavy', kb: 520, launch: 420, down: true };
    this.scene.resolveAttack(this, this.atk);
    if (this.st % 0.18 < dt) { this.scene.fx.snowPuff.emitParticleAt(this.x - this.chargeDir * 40, this.y, 4); this.scene.fx.trauma = Math.min(1, this.scene.fx.trauma + 0.08); }
    const b = this.scene.bounds;
    if ((this.chargeDir > 0 && this.x >= b.r - 70) || (this.chargeDir < 0 && this.x <= b.l + 70)) {
      // horns-first into the wall: stuns himself
      this.setState('stunned', 'stunned'); this.vx = -this.chargeDir * 160; this.hitsTaken = 0;
      this.scene.fx.impact('heavy', this.x + this.chargeDir * 90, this.y - 230, this.chargeDir); this.scene.fx.thump(this.x + this.chargeDir * 80, this.y, true); sfx.impact();
      this.scene.wallHit(this.x + this.chargeDir * 80);
    }
  }
  takeHit(h, from) {
    if (this.state === 'stunned') { if (!this.canBeHit) return false; this.hp -= h.dmg * 1.25; this.shudder = 0.12; if (this.hp <= 0) { this.die(Math.sign(this.x - from.x) || 1, h); } return true; }
    if (this.state === 'charge' || this.state === 'roar' || this.state === 'lift' || this.state === 'hurl') { if (!this.canBeHit) return false; this.hp -= h.dmg * 0.6; this.shudder = 0.1; this.flashArmor(); if (this.hp <= 0) this.die(Math.sign(this.x - from.x) || 1, h); return true; }
    if (this.wake > 0) { if (!this.canBeHit) return false; this.hp -= h.dmg * 0.6; this.shudder = 0.1; this.flashArmor(); if (this.hp <= 0) this.die(Math.sign(this.x - from.x) || 1, h); return true; }
    return super.takeHit(h, from);
  }
}
