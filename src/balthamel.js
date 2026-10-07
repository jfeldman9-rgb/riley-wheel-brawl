import { clamp, rand } from './config.js';
import { substeps } from './stage5-clock.js';
import { strikeRiley } from './stage5-hurt.js';
export const BALTH = Object.freeze({ hp: 220, tell: 0.5, flail: [9, 11], stepTell: 0.6, slash: 12, coil: 0.5, hold: 2.8, chip: 3, chipEvery: 0.5, mash: 7, decay: 0.5, throwDmg: 16, shove: 1.4, shoveMul: 1.5, cool: [8, 10], lock: 2, inv: 0.3, down: 1.5, score: 4000 });
const GRAB_OK = ['idle', 'walk', 'run', 'land'];

export class Balthamel {
  constructor(scene, x, y, deps = {}) {
    this.scene = scene; this.deps = deps; this.type = 'balthamel'; this.x = x; this.y = y; this.facing = -1;
    this.hp = this.maxHp = BALTH.hp; this.alive = true; this.state = 'drop'; this.st = 0; this.team = 1; this.accum = 0;
    this.def = { shadowW: 150, team: 1 }; this.T = { speed: 150, score: BALTH.score, boss: false, name: 'BALTHAMEL' };
    this.cool = 1.2; this.embraceCool = 2; this.grabLock = this.mashN = this.mashT = 0; this.since = 'flail'; this.counterUsed = this.hitOnce = false;
    scene.koCount = (scene.koCount || 0) + 1; this.id = scene.koCount;
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
  }
  get target() { return this.scene.riley; }
  get mashNeed() { return BALTH.mash; }
  get canBeHit() { return this.alive && !['drop', 'vines', 'dead', 'holding'].includes(this.state); }
  face(dir) { if (dir) this.facing = dir; }
  shield() { return !!(this.scene.powers?.active?.('fireshield') || this.scene.fireShieldActive); }
  update(dt) { if (!this.alive || this.scene.paused || this.scene.cutscene || this.deps.frozen?.()) return; substeps(this, dt, d => this.substep(d)); }
  substep(dt) {
    const R = this.target;
    this.st += dt; if (this.cool > 0) this.cool -= dt; if (this.embraceCool > 0) this.embraceCool -= dt; if (this.grabLock > 0) this.grabLock -= dt;
    if (this.state === 'drop') { if (this.st >= 0.6) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'holding') return this.hold(dt, R);
    if (this.state === 'lunge') return this.coil(dt, R);
    if (this.state === 'attack') return this.flail(dt, R);
    if (this.state === 'step') return this.step(dt, R);
    if (this.state === 'shoved') { if (this.st >= BALTH.shove) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'down') { if (this.st >= BALTH.down) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'hurt') { if (this.st > 0.25) this.state = 'idle'; return; }
    if (this.state === 'vines' || this.state === 'dead') { if (this.state === 'dead' && this.st > 0.6) this.gone = true; return; }
    if (this.state === 'idle' && R?.alive && this.cool <= 0) this.think(R);
  }
  think(R) {
    if (this.hp <= 0) return;
    const adx = Math.abs(R.x - this.x); this.face(Math.sign(R.x - this.x) || this.facing);
    const grab = this.since && this.embraceCool <= 0 && this.grabLock <= 0 && !this.scene.grabBusy?.(this) && !this.shield();
    if (grab && adx < 280 && adx > 50 && GRAB_OK.includes(R.state) && (R.z || 0) <= 0) return this.startCoil();
    if (adx < 170 && Math.random() < 0.55) return this.startFlail();
    if (adx > 40) return this.startStep();
    this.startFlail();
  }
  startFlail() { this.state = 'attack'; this.st = this.string = 0; this.counterUsed = this.hitOnce = false; this.face(Math.sign((this.target?.x || this.x) - this.x) || this.facing); this.scene.kit?.onFlail?.(this); }
  flail(dt, R) {
    if (this.st < BALTH.tell) return;
    const active = (this.string === 0 && this.st < BALTH.tell + 0.16) || (this.string === 1 && this.st > BALTH.tell + 0.34 && this.st < BALTH.tell + 0.5);
    if (this.string === 0 && this.st >= BALTH.tell + 0.16) this.string = 1;
    if (active && R && !this.hitOnce) {
      if (!this.counterUsed && this.string === 0 && R.attackFrame && Math.sign(this.x - R.x) === (R.facing || 1) && Math.abs(R.y - this.y) < 36 && Math.abs(R.x - this.x) < 190) {
        this.counterUsed = true; this.state = 'hurt'; this.st = 0; this.since = 'flail'; this.scene.kit?.onParry?.(this); return;
      }
      if (Math.abs(R.x - this.x) < 150 && Math.abs(R.y - this.y) < 34 && (R.z || 0) < 50) {
        this.hitOnce = true;
        strikeRiley(this.scene, BALTH.flail[this.string === 0 ? 0 : 1], { fromX: this.x, kb: 200 });
      }
    }
    if (this.st >= BALTH.tell + 0.62) { this.state = 'idle'; this.st = 0; this.cool = rand(0.7, 1.2); this.since = 'flail'; }
  }
  startStep() {
    const R = this.target; if (!R) return; const b = this.scene.bounds || { l: 0, r: 1280 };
    const dir = -Math.sign(R.facing || 1) || -1;
    this.dest = { x: clamp(R.x + dir * 80, b.l + 60, b.r - 60), y: R.y }; this.state = 'step'; this.st = 0; this.counterUsed = this.arrived = false;
    this.scene.kit?.onStep?.(this);
  }
  step(dt, R) {
    if (this.st < BALTH.stepTell) return;
    if (!this.arrived) {
      this.x = this.dest.x; this.y = this.dest.y; this.arrived = true; this.face(Math.sign((R?.x || this.x) - this.x) || 1);
      if (R?.attackFrame && R.state === 'back' && Math.abs(R.x - this.x) < 200) {
        this.counterUsed = true; this.hp -= 12 * 1.5; this.state = 'down'; this.st = 0; this.since = 'step';
        this.scene.kit?.onCounter?.(this, 'step');
        if (this.hp <= 0) this.fall();
        return;
      }
      if (R && Math.abs(R.x - this.x) < 70 && Math.abs(R.y - this.y) < 30) strikeRiley(this.scene, BALTH.slash, { fromX: this.x, kb: 220 });
    }
    if (this.st >= BALTH.stepTell + 0.28) { this.state = 'idle'; this.st = 0; this.cool = rand(0.6, 1.1); this.since = 'step'; }
  }
  startCoil() { this.state = 'lunge'; this.st = 0; this.counterUsed = false; this.face(Math.sign((this.target?.x || this.x) - this.x) || this.facing); this.scene.kit?.onCoil?.(this); }
  coil(dt, R) {
    if (this.st < BALTH.coil) return;
    if (!R || R.grabbedBy || (R.z || 0) > 0 || !GRAB_OK.includes(R.state) || this.shield() || !R.alive) {
      this.state = 'idle'; this.st = 0; this.embraceCool = rand(BALTH.cool[0], BALTH.cool[1]); return;
    }
    if (Math.abs(R.x - this.x) > 90 || Math.abs(R.y - this.y) > 28) { this.state = 'idle'; this.st = 0; this.cool = 0.4; return; }
    this.catch(R);
  }
  catch(R) {
    if (R.held) { R.held.release?.(); R.held = null; }
    this.state = 'holding'; this.st = this.mashN = this.mashT = this.chipT = 0; this.since = null;
    R.grabbedBy = this; R.face?.(-this.facing); R.enterGrabbed?.(this); this.scene.kit?.onEmbrace?.(this);
  }
  hold(dt, R) {
    if (!R || R.grabbedBy !== this) return this.releaseHold('break');
    R.x = this.x + this.facing * 46; R.vx = 0;
    this.chipT = (this.chipT || 0) + dt; this.mashT += dt;
    while (this.mashT >= BALTH.decay) { this.mashT -= BALTH.decay; this.mashN = Math.max(0, this.mashN - 1); }
    while (this.chipT >= BALTH.chipEvery) {
      this.chipT -= BALTH.chipEvery;
      R.hp = Math.max(0, R.hp - BALTH.chip);
      if (R.hp <= 0 && R.alive) { R.alive = false; this.releaseHold('break'); this.scene.rileyDied?.(); return; }
    }
    if (this.st >= BALTH.hold) this.releaseHold('throw');
  }
  mash() { if (this.state !== 'holding') return false; this.mashN++; if (this.mashN >= BALTH.mash) { this.releaseHold('escape'); return true; } return false; }
  releaseHold(how) {
    const R = this.target;
    if (this.state === 'holding' || R?.grabbedBy === this) {
      if (R?.grabbedBy === this) R.grabbedBy = null;
      this.grabLock = BALTH.lock;
      this.embraceCool = how === 'throw' ? 10 : rand(BALTH.cool[0], BALTH.cool[1]);
      if (how === 'escape') {
        if (R) R.inv = Math.max(R.inv || 0, BALTH.inv);
        R?.leaveGrabbed?.('escape');
        this.state = 'shoved'; this.st = 0; this.hp = Math.max(0, this.hp - 8 * BALTH.shoveMul);
        this.scene.kit?.onEscape?.(this);
      } else if (how === 'throw') {
        R?.leaveGrabbed?.('throw');
        strikeRiley(this.scene, BALTH.throwDmg, { down: true, fromX: this.x, launch: 400 });
        this.state = 'idle'; this.st = 0;
      } else {
        R?.leaveGrabbed?.('break');
        this.state = 'idle'; this.st = 0;
      }
    } else if (how === 'break' && this.state === 'lunge') { this.state = 'idle'; this.st = 0; }
    if (this.hp <= 0 && !this._down) this.fall();
  }
  takeHit(h, from) {
    if (!this.canBeHit) return false;
    let dmg = h.dmg || 0;
    if (this.state === 'shoved') dmg *= BALTH.shoveMul;
    this.hp -= dmg;
    if (this.state === 'lunge') { this.state = 'hurt'; this.st = 0; }
    if (this.hp <= 0) { this.fall(); return true; }
    if (h.down && this.state !== 'attack' && this.state !== 'step') { this.state = 'hurt'; this.st = 0; }
    return true;
  }
  fall() { if (this._down || this.state === 'vines' || this.state === 'dead') return; this._down = true; this.hp = 0; this.releaseHold('break'); this.scene.kit?.onBalthDown?.(this); }
  seize() { this.releaseHold('break'); this.state = 'vines'; this.st = 0; this.alive = false; }
  physics(dt) {
    if (this.vx) { this.x += this.vx * (dt || 0); this.vx *= 0.9; }
    const b = this.scene.bounds; if (b && this.state !== 'step') this.x = clamp(this.x, b.l + 50, b.r - 50);
  }
  destroy() { this.releaseHold('break'); this.alive = false; this.gone = true; }
}
