import { launchSpore } from './stage5-spores.js';
// Stalker and sporepod. Pure cores; sprites live on the actors.
import { clamp } from './config.js';
import { stage4Delta } from './stage4-time.js';
import { strikeRiley } from './stage5-hurt.js';

export const STALKER = Object.freeze({ hp: 40, lurk: 6, tell: 0.7, speed: 650, leap: 380, dmg: 14, recover: 0.9, miss: 1.3, down: 1.4, mul: 1.5, light: 260, daze: 1, cap: 2, score: 450 });
export const SPOREPOD = Object.freeze({ hp: 28, emerge: 1, swell: 0.6, flight: 1, cloud: 2, r: 90, dmg: 10, slow: 0.3, cool: 2.4, cap: 3, spores: 2, thrown: 20, score: 350 });
const live = (s, type) => (s.enemies || []).filter(e => e.alive && e.type === type);
const dtOf = dt => stage4Delta(dt);
export const stalkerCount = s => live(s, 'stalker').length;
export const podCount = s => live(s, 'sporepod').length;
export const sporeCount = s => (s.spores || []).filter(p => p.alive !== false).length;
export const pounceTells = s => live(s, 'stalker').filter(e => e.state === 'attack' && !e.leaping).length;

function join(scene, e, cap, n) {
  scene.koCount = (scene.koCount || 0) + 1; e.id = scene.koCount;
  if (n >= cap) { e.alive = false; e.gone = true; e.state = 'gone'; }
  if (scene.enemies && !scene.enemies.includes(e)) scene.enemies.push(e);
}

export class Stalker {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'stalker'; this.x = x; this.y = y; this.z = this.vx = 0;
    this.hp = this.maxHp = STALKER.hp; this.alive = true; this.state = 'lurk'; this.st = 0; this.facing = -1;
    this.leaping = this.counterUsed = false; this.leapLeft = this.daze = 0; this.gone = false;
    this.team = 1; this.def = { shadowW: 130, team: 1 };
    this.T = { speed: 160, score: STALKER.score, boss: false, name: 'BLIGHT STALKER' };
    join(scene, this, STALKER.cap, stalkerCount(scene));
  }
  get target() { return this.scene.riley; }
  get canBeHit() { return this.alive && !this.entering && this.state !== 'dead' && this.state !== 'lurk'; }
  face(dir) { if (dir) this.facing = dir; }
  place(spot) { if (!spot) return; this.x = spot.x; this.y = spot.y; this.state = 'lurk'; this.st = 0; }
  flush(why) {
    if (!this.alive || (this.state !== 'lurk' && !(this.state === 'attack' && !this.leaping))) return false;
    this.state = 'stalk'; this.st = 0; this.leaping = false; this.daze = STALKER.daze; this.flushed = why || 'light';
    return true;
  }
  startPounce() {
    const R = this.target;
    if (this.daze > 0 || pounceTells(this.scene) >= 1 || !R?.alive || R.state === 'down') return false;
    if (this.scene.attackTokens?.() >= (this.scene.maxTokens || 2)) return false;
    this.state = 'attack'; this.st = 0; this.leaping = this.counterUsed = false; this.leapLeft = STALKER.leap;
    this.face(Math.sign(R.x - this.x) || this.facing); this.scene.kit?.onPounce?.(this); return true;
  }
  update(dt) {
    dt = dtOf(dt);
    if (!dt || this.scene.paused || this.scene.cutscene) return;
    if (!this.alive) { if (this.state === 'dead' && (this.st += dt) > 0.8) this.gone = true; return; }
    const R = this.target, S = STALKER; this.st += dt; if (this.daze > 0) this.daze -= dt;
    const light = this.scene.kit?.lightAt?.(this.x, S.light);
    if (light && (this.state === 'lurk' || (this.state === 'attack' && !this.leaping))) { if (this.flush('light')) this.scene.kit?.onFlush?.(this); }
    if (R?.attackFrame && this.state === 'lurk' && Math.abs(R.x - this.x) < 150 && Math.abs(R.y - this.y) < 40 && this.flush('melee')) this.scene.kit?.onFlush?.(this);
    if (this.state === 'lurk') { if (this.st >= S.lurk) { this.state = 'stalk'; this.st = 0; } return; }
    if (this.state === 'stalk') {
      if (R) { this.face(Math.sign(R.x - this.x) || this.facing); if (Math.abs(R.x - this.x) > 80) this.x += this.facing * 140 * dt; }
      if (this.daze <= 0 && this.st > 0.4 && R && Math.abs(R.y - this.y) < 36 && Math.abs(R.x - this.x) < 420 && Math.abs(R.x - this.x) > 70) this.startPounce();
      return;
    }
    if (this.state === 'attack') return this.pounce(dt, R, S);
    if (this.state === 'recover' && this.st >= S.recover) { this.state = 'stalk'; this.st = 0; this.vuln = 0; }
    if (this.state === 'hurt' && this.st > 0.28) this.state = 'stalk';
    if (this.state === 'down' && this.st > S.down) { if (this.hp <= 0) this.finish(); else { this.state = 'stalk'; this.st = 0; } }
    if (this.state === 'dead' && this.st > 0.8) this.gone = true;
  }
  pounce(dt, R, S) {
    if (!this.leaping && this.st >= S.tell) { this.leaping = true; this.st = 0; this.scene.kit?.onLeap?.(this); }
    if (!this.leaping) return;
    const step = Math.min(S.speed * dt, this.leapLeft); this.x += this.facing * step; this.leapLeft -= step;
    this.tryCounter(R);
    if (!this.counterUsed && R?.alive && R.state !== 'down' && Math.abs(R.x - this.x) < 46 && Math.abs(R.y - this.y) < 28 && (R.z || 0) < 40) {
      strikeRiley(this.scene, S.dmg, { down: true, fromX: this.x, launch: 380 });
      this.state = 'recover'; this.st = 0; this.leaping = false;
    }
    if (this.leapLeft <= 0 && this.state === 'attack') { this.state = 'recover'; this.st = 0; this.leaping = false; this.vuln = S.miss; }
  }
  tryCounter(R) {
    if (!this.leaping || this.counterUsed || !R?.attackFrame) return false;
    if (Math.sign(this.x - R.x) !== (R.facing || 1) || Math.abs(this.y - R.y) > 40 || Math.abs(this.x - R.x) > 200) return false;
    this.counterUsed = true; this.hp -= 8 * STALKER.mul; this.state = 'down'; this.st = 0; this.leaping = false;
    this.scene.kit?.onCounter?.(this, 'pounce'); if (this.hp <= 0) this.finish(); return true;
  }
  takeHit(h, from) {
    if (!this.canBeHit && this.state !== 'lurk') return false;
    if (this.state === 'lurk' && this.flush('melee')) this.scene.kit?.onFlush?.(this);
    let dmg = h.dmg || 0; if (this.state === 'recover') dmg *= STALKER.miss;
    if (this.leaping && !this.counterUsed && from === this.scene.riley && this.scene.riley?.attackFrame) return this.tryCounter(this.scene.riley);
    this.hp -= dmg; if (this.hp <= 0) { this.finish(); return true; }
    if (this.state === 'down' || this.state === 'dead') return true;
    this.state = h.down ? 'down' : 'hurt'; this.st = 0; this.leaping = false;
    this.vx = (Math.sign(this.x - (from?.x ?? this.x - 1)) || 1) * Math.abs(h.kb || 80); return true;
  }
  finish() { if (this.state === 'dead') return; this.alive = false; this.state = 'dead'; this.st = 0; this.leaping = false; this.scene.onEnemyDie?.(this); }
  physics(dt) {
    dt = dtOf(dt); if (!dt) return;
    if (this.vx) { this.x += this.vx * dt; this.vx *= Math.pow(0.004, dt); if (Math.abs(this.vx) < 6) this.vx = 0; }
    const b = this.scene.bounds; if (b && this.state !== 'attack') this.x = clamp(this.x, b.l + 40, b.r - 40);
  }
  destroy() { this.alive = false; this.gone = true; }
}

export class Sporepod {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'sporepod'; this.x = x; this.y = y; this.z = this.vx = 0;
    this.hp = this.maxHp = SPOREPOD.hp; this.alive = true; this.state = 'emerge'; this.st = 0; this.facing = -1;
    this.cool = 0.4; this.gone = false; this.team = 1; this.def = { shadowW: 120, team: 1 };
    this.T = { speed: 0, score: SPOREPOD.score, boss: false, name: 'SPOREPOD' };
    scene.spores = scene.spores || []; join(scene, this, SPOREPOD.cap, podCount(scene));
  }
  get target() { return this.scene.riley; }
  get canBeHit() { return this.alive && this.state !== 'emerge' && this.state !== 'dead'; }
  face(dir) { if (dir) this.facing = dir; }
  place(spot) { if (spot) { this.x = spot.x; this.y = spot.y; } }
  dropIn() { this.entering = false; this.state = 'emerge'; this.st = 0; }
  update(dt) {
    dt = dtOf(dt); if (!dt || this.scene.paused || this.scene.cutscene) return;
    if (!this.alive) { if (this.state === 'dead' && (this.st += dt) > 0.7) this.gone = true; return; }
    const R = this.target, P = SPOREPOD; this.st += dt; this.cool -= dt;
    if (this.state === 'emerge') { if (this.st >= P.emerge) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'attack') { if (this.st >= P.swell) this.loose(); return; }
    if (this.state === 'hurt' && this.st > 0.25) this.state = 'idle';
    if (this.state === 'dead') { if (this.st > 0.7) this.gone = true; return; }
    if (this.state === 'idle' && this.cool <= 0 && R && !['grabbed', 'down', 'getup'].includes(R.state) && sporeCount(this.scene) < P.spores && (this.scene.attackTokens?.() || 0) < (this.scene.maxTokens || 2)) {
      this.state = 'attack'; this.st = 0; this.scene.kit?.onSwell?.(this);
    }
  }
  loose() { return launchSpore(this); }
  takeHit(h, from) {
    if (!this.canBeHit) return false;
    let dmg = from?.state === 'thrown' ? SPOREPOD.thrown : (h.dmg || 0);
    if ((h.power && h.kind === 'medium') || (h.kind === 'heavy' && h.launch && h.down && !h.anim)) this.hp = 0; else this.hp -= dmg;
    if (this.hp <= 0) { this.alive = false; this.state = 'dead'; this.st = 0; this.scene.onEnemyDie?.(this); return true; }
    this.state = 'hurt'; this.st = 0; return true;
  }
  physics() {}
  destroy() { this.alive = false; this.gone = true; }
}
