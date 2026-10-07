// Aginor. Three phases. Tether is not a hold. Ring, hands, oak and the Green Man live in the arena.
import { clamp, rand } from './config.js';
import { substeps } from './stage5-clock.js';
import { strikeRiley, sameBand } from './stage5-hurt.js';

export const AGINOR = Object.freeze({
  hp: 600, keep: [300, 500], tetherTell: 0.8, tetherMax: 3, tetherReach: 520, tetherTick: 0.5,
  drainHp: 2, drainSaidin: 8, heal: 2, healCap: 30, counter: 0.4, stagger: 1.6, mul: 1.5,
  staffTell: 0.5, staff: [8, 12], staffKb: 260, staffReach: 160,
  stepTell: 0.4, stepDist: 300, stepCool: 6, hits: 3, hitWin: 2,
  tetherCd: { 1: 3.2, 2: 10, 3: 7 }, score: 9000,
});

export class Aginor {
  constructor(scene, x, y, deps = {}) {
    this.scene = scene; this.deps = deps; this.type = 'aginor';
    this.x = x; this.y = y; this.z = 0; this.vx = 0; this.facing = -1;
    this.hp = this.maxHp = AGINOR.hp; this.phase = 1; this.alive = true; this.state = 'idle'; this.st = 0;
    this.team = 1; this.def = { shadowW: 170, team: 1 }; this.gone = false; this.accum = 0;
    this.T = { speed: 96, score: AGINOR.score, boss: true, name: 'AGINOR' };
    this.tetherCd = 1.4; this.locked = false; this.lockT = 0; this.tickT = 0; this.healed = 0;
    this.counterUsed = false; this.staffI = 0; this.stepCool = 0; this.recent = [];
    this.beatDone = false; this.p2t = 0; this.overdrawn = false;
    scene.koCount = (scene.koCount || 0) + 1; this.id = scene.koCount;
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
  }
  get target() { return this.scene.riley; }
  get canBeHit() { return this.alive && !this.invuln && !['burn', 'dead', 'step'].includes(this.state); }
  get ceiling() { return this.phase <= 1 ? this.maxHp : Math.floor(this.maxHp * (this.phase === 2 ? 0.66 : 0.33)); }
  face(dir) { if (dir) this.facing = dir; }
  frozen() { return !!(this.invuln && this.deps.frozen?.()); }
  update(dt) {
    if (!this.alive || this.scene.paused || this.scene.cutscene) return;
    if (this.deps.frozen?.()) return;
    substeps(this, dt, d => this.substep(d));
  }
  substep(dt) {
    this.st += dt;
    this.clock = (this.clock || 0) + dt;
    if (this.stepCool > 0) this.stepCool -= dt;
    if (this.tetherCd > 0) this.tetherCd -= dt;
    if (this.phase === 2) this.p2t += dt;
    if (this.state === 'burn') { if (this.st >= 1.3) this.finish(); return; }
    if (this.state === 'dead') { if (this.st > 0.4) this.gone = true; return; }
    if (this.state === 'staggered') { if (this.st >= AGINOR.stagger) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'tether') return this.tether(dt);
    if (this.state === 'attack') return this.staff(dt);
    if (this.state === 'step') return this.blink(dt);
    if (this.state === 'hurt') { if (this.st > 0.22) { this.state = 'idle'; this.st = 0; } return; }
    if (this.phase === 2 && (this.p2t >= 50 || this.deps.balthDown?.())) this.deps.onBeat?.(this);
    this.wander(dt);
    if (this.tetherCd <= 0) this.startTether();
  }
  wander(dt) {
    const R = this.target; if (!R) return;
    const dx = R.x - this.x; this.face(Math.sign(dx) || this.facing);
    const adx = Math.abs(dx);
    if (this.phase !== 2 && adx < AGINOR.staffReach && this.state === 'idle') { this.startStaff(); return; }
    let dir = 0;
    if (adx < AGINOR.keep[0]) dir = -Math.sign(dx);
    else if (adx > AGINOR.keep[1]) dir = Math.sign(dx);
    if (dir) this.x += dir * this.T.speed * dt;
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 80, b.r - 80);
  }
  startTether() {
    if (this.target?.grabbedBy) { this.tetherCd = 0.6; return; }
    this.state = 'tether'; this.st = 0; this.locked = false; this.counterUsed = false; this.lockT = 0; this.tickT = 0;
    this.scene.kit?.onTether?.(this);
  }
  tether(dt) {
    const R = this.target;
    if (!this.locked) {
      if (R?.attackFrame && !this.counterUsed && this.st >= AGINOR.tetherTell - AGINOR.counter && this.st < AGINOR.tetherTell) {
        if (Math.sign(this.x - R.x) === (R.facing || 1) && Math.abs(R.x - this.x) < 220 && Math.abs(R.y - this.y) < 40) {
          this.counterUsed = true; this.breakTether();
          this.hp -= 10 * AGINOR.mul; this.guardHp(); this.state = 'staggered'; this.st = 0;
          this.scene.kit?.onCounter?.(this, 'tether');
          if (this.hp <= 0) this.burn(); else this.considerPhase();
          return;
        }
      }
      if (this.st >= AGINOR.tetherTell) {
        const bands = this.deps.bands || this.scene.bands;
        const near = R && Math.abs(R.x - this.x) <= AGINOR.tetherReach && sameBand(R.y, this.y, bands) && !R.grabbedBy;
        if (near && this.deps.oakBlocks?.(R)) { this.state = 'idle'; this.tetherCd = this.cd(); return; }
        if (near) { this.locked = true; this.lockT = 0; this.tickT = 0; this.scene.kit?.onLock?.(this); }
        else { this.state = 'idle'; this.st = 0; this.tetherCd = this.cd(); }
      }
      return;
    }
    this.lockT += dt; this.tickT += dt;
    if (!R || R.grabbedBy || !sameBand(R.y, this.y, this.deps.bands || this.scene.bands)) return this.breakTether();
    if (this.deps.lightCross?.(this, R)) return this.breakTether();
    while (this.tickT >= AGINOR.tetherTick) {
      this.tickT -= AGINOR.tetherTick;
      R.hp = Math.max(0, R.hp - AGINOR.drainHp);
      R.saidin = Math.max(0, (R.saidin || 0) - AGINOR.drainSaidin);
      if (this.healed < AGINOR.healCap && this.hp < this.ceiling) { this.hp = Math.min(this.ceiling, this.hp + AGINOR.heal); this.healed += AGINOR.heal; }
      this.scene.kit?.onDrain?.(this);
      if (R.hp <= 0 && R.alive) { R.alive = false; this.breakTether(); this.scene.rileyDied?.(); return; }
    }
    if (this.lockT >= AGINOR.tetherMax) this.breakTether();
  }
  breakTether() { this.locked = false; if (this.state === 'tether') { this.state = 'idle'; this.st = 0; } this.tetherCd = this.cd(); this.scene.kit?.onTetherEnd?.(this); }
  cd() { return AGINOR.tetherCd[this.phase] || 8; }
  startStaff() { this.state = 'attack'; this.st = 0; this.staffI = 0; this.struck = false; this.scene.kit?.onStaff?.(this); }
  staff(dt) {
    const R = this.target;
    const hitAt = this.staffI === 0 ? AGINOR.staffTell : AGINOR.staffTell + 0.42;
    if (!this.struck && this.st >= hitAt && this.st < hitAt + 0.14 && R && Math.abs(R.x - this.x) < AGINOR.staffReach + 20 && Math.abs(R.y - this.y) < 36) {
      this.struck = true;
      strikeRiley(this.scene, AGINOR.staff[this.staffI], { fromX: this.x, kb: this.staffI ? AGINOR.staffKb : 120, down: this.staffI === 1 });
    }
    if (this.staffI === 0 && this.st >= AGINOR.staffTell + 0.28) { this.staffI = 1; this.struck = false; }
    if (this.st >= AGINOR.staffTell + 0.7) { this.state = 'idle'; this.st = 0; this.tetherCd = Math.max(this.tetherCd, 0.8); }
  }
  blink() {
    if (!this.moved && this.st >= AGINOR.stepTell) {
      this.moved = true;
      const R = this.target, dir = R ? -Math.sign(R.x - this.x) || this.facing : this.facing;
      const b = this.scene.bounds || { l: 0, r: 4000 };
      this.x = clamp(this.x + dir * AGINOR.stepDist, b.l + 80, b.r - 80);
      this.stepCool = AGINOR.stepCool;
    }
    if (this.moved && this.st >= AGINOR.stepTell + 0.2) { this.state = 'idle'; this.st = 0; }
  }
  noteHit() {
    const now = this.scene.time?.now ? this.scene.time.now / 1000 : (this.clock || 0);
    this.recent.push(now);
    this.recent = this.recent.filter(t => now - t <= AGINOR.hitWin);
    if (this.recent.length >= AGINOR.hits && this.stepCool <= 0 && this.state !== 'step' && this.phase !== 2) {
      this.recent.length = 0; this.state = 'step'; this.st = 0; this.moved = false; this.breakTether();
      this.scene.kit?.onShortStep?.(this);
    }
  }
  takeHit(h, from) {
    if (!this.canBeHit) return false;
    if (this.state === 'tether' && !this.locked && !this.counterUsed && this.st >= AGINOR.tetherTell - AGINOR.counter && (from?.attackFrame || this.scene.riley?.attackFrame)) {
      this.counterUsed = true; this.breakTether();
      this.hp -= Math.max(h.dmg || 1, 1) * AGINOR.mul; this.guardHp(); this.state = 'staggered'; this.st = 0;
      this.scene.kit?.onCounter?.(this, 'tether');
      if (this.hp <= 0) this.burn(); else this.considerPhase();
      return true;
    }
    if (this.locked) this.breakTether();
    let dmg = h.dmg || 0;
    if (this.overdrawn) dmg *= 1.6;
    if (this.overdrawn && !this.surgeUsed) { this.surgeUsed = true; dmg = Math.max(dmg, 1); this.state = 'staggered'; this.st = 0; this.scene.kit?.onCounter?.(this, 'surge'); }
    this.hp -= dmg;
    this.guardHp();
    this.noteHit();
    if (this.hp <= 0) { this.burn(); return true; }
    this.considerPhase();
    if (this.state === 'idle' || this.state === 'tether') { this.state = 'hurt'; this.st = 0; }
    return true;
  }
  guardHp() {
    if (this.beatFired) return;
    const floor = Math.floor(this.maxHp * (this.phase <= 1 ? 0.66 : 0.33));
    if (this.hp < floor) this.hp = floor;
  }
  considerPhase() {
    const f = this.hp / this.maxHp;
    if (this.phase === 1 && f <= 0.66) this.enter(2);
    if (this.phase === 2 && this.beatDone && f <= 0.33) this.enter(3);
  }
  enter(ph) {
    if (this.phase === ph) return;
    this.phase = ph; this.healed = 0; this.breakTether();
    this.scene.onBossPhase?.(this, ph); this.deps.onPhase?.(this, ph);
  }
  markBeat() { this.beatDone = true; this.invuln = false; this.considerPhase(); }
  burn() {
    if (this.invuln || this.state === 'burn') return;
    this.hp = 0; this.breakTether(); this.state = 'burn'; this.st = 0; this.alive = true; this.invuln = true;
    this.deps.onBurn?.(this);
  }
  finish() {
    if (this.state === 'dead') return;
    this.alive = false; this.state = 'dead'; this.st = 0;
    this.deps.onDefeat?.(this);
  }
  releaseHold() { this.breakTether(); }
  physics(dt) { const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 70, b.r - 70); }
  destroy() { this.breakTether(); this.alive = false; this.gone = true; this.state = 'dead'; }
}
