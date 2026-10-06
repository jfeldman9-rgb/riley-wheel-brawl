// Draghkar boss core (Stage 4 prep). Pure logic, no Phaser, no Stage 3 import.

export const DRAGHKAR = Object.freeze({
  hp: 560,
  phase2Threshold: 560 * 0.66,
  phase3Threshold: 560 * 0.33,
  phase3EnrageThreshold: 560 * 0.15,

  swoopTell: 0.9,
  swoopSpeed: 1100,
  swoopDmg: 14,
  swoopsMin: 2,
  swoopsMax: 3,
  landRecovery: 1.2,
  landRecoveryVuln: 1.3,
  landMin: 4.0,
  landMax: 5.0,
  claw1Dmg: 10,
  claw2Dmg: 12,
  buffetDmg: 4,
  buffetPush: 300,
  airborneResist: 0.6,
  counterDown: 2.0,
  counterVuln: 1.5,

  croonDuration: 2.5,
  croonDrift: 60,
  croonLightDist: 400,
  kissTell: 0.6,
  kissSpeed: 700,
  kissMaxDuration: 0.4,
  kissRecoil: 1.2,
  kissHoldMax: 3.0,
  kissHoldDmg: 3,
  kissHoldInterval: 0.5,
  kissMashTarget: 8,
  kissMashDecay: 1,
  kissMashDecayInterval: 0.5,
  kissReelDuration: 1.6,
  kissReelVuln: 1.5,
  kissTimeoutDmg: 18,
  kissLockout: 10.0,
  kissCoolMin: 7.0,
  kissCoolMax: 9.0,
  p3KissCoolMin: 10.0,
  p3KissCoolMax: 12.0,

  hz: 120,
});

const D = DRAGHKAR, HZ = D.hz, DT_SUB = 1 / HZ;
const AIRBORNE = new Set(['perch', 'swoop_tell', 'swoop_dive', 'takeoff', 'intro']);
const GRAB_OK = new Set(['idle', 'walk', 'approach', 'run', 'wait', 'guard', 'stagger', 'hurt']);

export class Draghkar {
  constructor(scene = {}, x = 640, y = 600, deps = {}) {
    this.scene = scene; this.deps = deps; this.type = 'draghkar';
    this.x = x; this.y = y; this.hp = this.maxHp = D.hp;
    this.phase = 1; this.alive = true; this.state = 'perch';
    this.facing = -1; this.st = 0; this.accum = 0;
    this.swoopCount = 0; this.swoopQuota = D.swoopsMin; this.swoopDir = 1;
    this.targetBand = 1; this.counter = false; this.landedTimer = 0;
    this.hitRileyThisMove = false; this.clawStep = 0;
    this.kissCooldown = 0; this.kissLockout = 0; this.kissBetweenAction = false;
    this.mashCount = this.holdElapsed = this.decayElapsed = 0;
    this.croonRings = this.p2AddsSpawned = false;
    this.screech = this.floorShadow = this.laneBandArrow = false;
    if (this.scene.enemies && !this.scene.enemies.includes(this)) this.scene.enemies.push(this);
  }

  get target() { return this.scene.riley; }
  get isAirborne() { return AIRBORNE.has(this.state); }
  get canBeHit() { return this.alive && !['ash', 'defeated'].includes(this.state); }
  get untargetable() { return this.state === 'perch'; }

  getDamageMultiplier() {
    if (this.state === 'counter_down') return D.counterVuln;
    if (this.state === 'reels') return D.kissReelVuln;
    if (this.state === 'land_recovery') return D.landRecoveryVuln;
    if (this.state === 'croon' || this.isAirborne || this.state === 'intro') return D.airborneResist;
    return 1.0;
  }

  checkPhase() {
    const ph = this.hp <= D.phase3Threshold ? 3 : this.hp <= D.phase2Threshold ? 2 : 1;
    if (ph !== this.phase && this.alive) {
      const old = this.phase; this.phase = ph;
      if (ph === 2 && old < 2 && !this.p2AddsSpawned) {
        this.p2AddsSpawned = true; this.kissCooldown = 1.0;
        this.deps.dropSaangreal?.(); this.scene.dropSaangreal?.();
        this.deps.spawnCultists?.(2); this.scene.spawnCultists?.(2);
      }
      this.deps.onBossPhase?.(this, ph); this.scene.onBossPhase?.(this, ph);
    }
  }

  releaseGrab() {
    const R = this.target;
    if (R && R.grabbedBy === this) R.grabbedBy = null;
    if (this.scene) this.scene.grabBusy = false;
    if (R && R.state === 'grabbed') R.state = 'idle';
    this.mashCount = this.holdElapsed = this.decayElapsed = 0;
  }

  defeat() {
    this.alive = false; this.releaseGrab(); this.state = 'defeated'; this.st = 0;
    this.deps.onBossDefeat?.(this); this.scene.onBossDefeat?.(this);
  }

  takeHit(h = {}, from) {
    if (!this.canBeHit) return false;
    const dmg = h.dmg || 0, R = this.target;

    if (this.state === 'swoop_dive') {
      const isPower = /fireball|lightning/.test(h.kind || h.power || '') || !!h.fireball || !!h.lightning;
      const facingOncoming = R ? Math.sign(this.x - R.x) === (R.facing || 1) : false;
      const isFacingAtk = from === R && (R?.attackFrame || h.activeFrame) && facingOncoming;

      if (isPower || isFacingAtk) {
        this.state = 'counter_down'; this.st = 0; this.counter = true;
        this.hp = Math.max(0, this.hp - dmg * D.counterVuln);
        this.checkPhase();
        this.deps.onCounter?.(this); this.scene.onCounter?.(this);
        if (this.hp <= 0) this.defeat();
        return true;
      }
    }

    if (this.state === 'kiss_hold' && (h.hazard || h.breakGrab || from === this.scene.loial)) {
      this.releaseGrab(); this.state = 'reels'; this.st = 0; this.kissCooldown = D.kissCoolMin;
    }

    this.hp = Math.max(0, this.hp - dmg * this.getDamageMultiplier());
    this.checkPhase();
    if (this.hp <= 0) { this.defeat(); return true; }
    return true;
  }

  startSwoop(band = 1, dir = null) {
    if (!this.alive) return false;
    this.state = 'swoop_tell'; this.st = 0; this.targetBand = band;
    const R = this.target;
    this.swoopDir = dir !== null ? dir : (R ? (R.x > 640 ? -1 : 1) : 1);
    this.x = this.swoopDir > 0 ? -100 : 1380;
    this.screech = this.floorShadow = this.laneBandArrow = true;
    this.hitRileyThisMove = false;
    this.deps.onSwoopTell?.(this); this.scene.onSwoopTell?.(this);
    return true;
  }

  startClaw() {
    if (!this.alive || this.state !== 'grounded') return false;
    this.state = 'claw'; this.st = 0; this.clawStep = 1; this.hitRileyThisMove = false;
    if (this.target) this.facing = Math.sign(this.target.x - this.x) || this.facing || 1;
    return true;
  }

  startBuffet() {
    if (!this.alive || this.state !== 'grounded') return false;
    this.state = 'buffet'; this.st = 0; this.hitRileyThisMove = false;
    if (this.target) this.facing = Math.sign(this.target.x - this.x) || this.facing || 1;
    return true;
  }

  startCroon() {
    if (!this.alive || this.phase < 2 || this.hp <= D.phase3EnrageThreshold) return false;
    this.state = 'croon'; this.st = 0; this.croonRings = true; this.kissBetweenAction = true;
    return true;
  }

  cancelCroon() {
    if (this.state !== 'croon') return false;
    this.croonRings = false; this.state = 'grounded'; this.st = 0;
    return true;
  }

  startKiss() {
    if (!this.alive || this.phase < 2) return false;
    if (this.kissCooldown > 0 || this.kissLockout > 0 || !this.kissBetweenAction) return false;
    if (this.scene.grabBusy || (this.target && this.target.grabbedBy)) return false;
    const R = this.target;
    if (R && (R.state === 'down' || R.state === 'getup' || R.alive === false)) return false;

    this.state = 'kiss_tell'; this.st = 0; this.kissBetweenAction = false;
    if (R) this.facing = Math.sign(R.x - this.x) || this.facing || 1;
    return true;
  }

  mash() {
    if (this.state !== 'kiss_hold' || this.isPaused()) return false;
    this.mashCount++;
    if (this.mashCount >= D.kissMashTarget) {
      this.releaseGrab(); this.state = 'reels'; this.st = 0; this.setKissCooldown();
      this.deps.onRileyEscape?.(this, this.target); this.scene.onRileyEscape?.(this, this.target);
      return true;
    }
    return false;
  }

  setKissCooldown() {
    const isP3 = this.phase >= 3;
    const min = isP3 ? D.p3KissCoolMin : D.kissCoolMin;
    const max = isP3 ? D.p3KissCoolMax : D.kissCoolMax;
    this.kissCooldown = (min + max) / 2;
  }

  isPaused() { return !!(this.scene.paused || this.deps.isPaused?.()); }

  substep(dt) {
    if (!this.alive) return;
    const R = this.target;

    if (this.state === 'kiss_hold' && (!R || !R.alive || R.state === 'down')) {
      this.releaseGrab(); this.state = 'grounded'; this.st = 0; this.setKissCooldown();
    }

    if (!this.isPaused()) {
      if (this.kissCooldown > 0) this.kissCooldown = Math.max(0, this.kissCooldown - dt);
      if (this.kissLockout > 0) this.kissLockout = Math.max(0, this.kissLockout - dt);
    }

    this.st += dt;

    switch (this.state) {
      case 'perch':
        if (this.st >= 1.0) { this.swoopQuota = D.swoopsMin; this.swoopCount = 0; this.startSwoop(1); }
        break;

      case 'swoop_tell':
        if (this.st >= D.swoopTell - 1e-6) {
          this.screech = this.floorShadow = this.laneBandArrow = false;
          this.state = 'swoop_dive'; this.st = 0; this.hitRileyThisMove = false;
        }
        break;

      case 'swoop_dive': {
        const spd = D.swoopSpeed * (this.hp <= D.phase3EnrageThreshold ? 1.3 : 1.0);
        this.x += this.swoopDir * spd * dt;

        if (R && !this.hitRileyThisMove && Math.abs(this.x - R.x) < 50 && Math.abs(this.y - (R.y ?? 600)) < 40) {
          const facingOncoming = Math.sign(this.x - R.x) === (R.facing || 1);
          if (R.attackFrame && facingOncoming) { this.takeHit({ dmg: 10, activeFrame: true }, R); return; }
          for (const f of this.scene.fireballs || []) {
            if (f && f.alive !== false && Math.hypot((f.x ?? 0) - this.x, (f.y ?? 600) - this.y) < 40) {
              this.takeHit({ dmg: 20, kind: 'fireball' }, R); return;
            }
          }
          this.hitRileyThisMove = true;
          R.hp = Math.max(0, (R.hp || 100) - D.swoopDmg);
          R.state = 'down';
        }

        const done = (this.swoopDir > 0 && this.x > 1380) || (this.swoopDir < 0 && this.x < -100);
        if (done || this.st > 1.8) {
          this.swoopCount++; this.kissBetweenAction = true;
          if (this.swoopCount < this.swoopQuota) {
            this.startSwoop(this.targetBand === 1 ? 0 : 1, -this.swoopDir);
          } else {
            this.state = 'land_recovery'; this.st = 0;
            this.x = Math.max(100, Math.min(1180, R ? R.x + (this.swoopDir > 0 ? -200 : 200) : 640));
            this.y = 600;
          }
        }
        break;
      }

      case 'land_recovery':
        if (this.st >= D.landRecovery) { this.state = 'grounded'; this.st = this.landedTimer = 0; }
        break;

      case 'grounded':
        this.landedTimer += dt;
        if (R) this.facing = Math.sign(R.x - this.x) || this.facing || 1;
        if (this.phase >= 2 && this.kissCooldown <= 0 && this.kissLockout <= 0 && this.kissBetweenAction) {
          if (!this.scene.grabBusy && (!R || !R.grabbedBy)) { this.startKiss(); break; }
        }
        if (this.phase >= 2 && this.hp > D.phase3EnrageThreshold && Math.random() < 0.02) {
          this.startCroon(); break;
        }
        if (R && Math.abs(R.x - this.x) < 180) {
          if (this.st > 1.0 && Math.random() < 0.5) { this.startClaw(); break; }
          else if (this.st > 1.5) { this.startBuffet(); break; }
        }
        if (this.landedTimer >= D.landMin) { this.state = 'takeoff'; this.st = 0; }
        break;

      case 'claw':
        if (this.clawStep === 1) {
          if (!this.hitRileyThisMove && this.st >= 0.25) {
            this.hitRileyThisMove = true;
            if (R && Math.abs(R.x - this.x) < 140) R.hp = Math.max(0, (R.hp || 100) - D.claw1Dmg);
          }
          if (this.st >= 0.45) { this.clawStep = 2; this.st = 0; this.hitRileyThisMove = false; }
        } else if (this.clawStep === 2) {
          if (!this.hitRileyThisMove && this.st >= 0.25) {
            this.hitRileyThisMove = true;
            if (R && Math.abs(R.x - this.x) < 140) {
              R.hp = Math.max(0, (R.hp || 100) - D.claw2Dmg); R.state = 'down';
            }
          }
          if (this.st >= 0.6) { this.state = 'grounded'; this.st = 0; }
        }
        break;

      case 'buffet':
        if (!this.hitRileyThisMove && this.st >= 0.3) {
          this.hitRileyThisMove = true;
          if (R && Math.abs(R.x - this.x) < 160) {
            R.hp = Math.max(0, (R.hp || 100) - D.buffetDmg);
            R.vx = this.facing * D.buffetPush; R.x += this.facing * D.buffetPush;
          }
        }
        if (this.st >= 0.65) { this.state = 'grounded'; this.st = 0; }
        break;

      case 'croon': {
        if (R && R.alive && R.state !== 'down') R.x += (Math.sign(this.x - R.x) || 1) * D.croonDrift * dt;
        const light = !!(this.deps.lightNear?.(this.scene, this.x, D.croonLightDist) ||
                         this.scene.lightNear?.(this.x, D.croonLightDist) ||
                         (this.scene.fireballs || []).some(f => f && f.alive !== false && Math.hypot((f.x ?? 0) - this.x, (f.y ?? 600) - this.y) <= D.croonLightDist));
        if (light) { this.cancelCroon(); break; }
        if (this.st >= D.croonDuration) { this.croonRings = false; this.state = 'grounded'; this.st = 0; }
        break;
      }

      case 'kiss_tell':
        if (this.st >= D.kissTell) { this.state = 'kiss_lunge'; this.st = 0; this.lungeDir = this.facing; }
        break;

      case 'kiss_lunge': {
        this.x += this.lungeDir * D.kissSpeed * dt;
        if (R && R.alive && Math.abs(this.x - R.x) < 48) {
          if (R.fireShield || R.shieldActive || this.scene.fireShieldActive) {
            this.state = 'kiss_recoil'; this.st = 0; this.setKissCooldown(); break;
          }
          const facingEachOther = (R.facing || 1) === -this.lungeDir;
          if (R.attackFrame && facingEachOther) {
            this.takeHit({ dmg: 10, activeFrame: true }, R); this.setKissCooldown(); break;
          }
          const attackingAway = R.attackFrame && !facingEachOther;
          const grabbable = (GRAB_OK.has(R.state) || attackingAway) &&
                            !R.grabbedBy && !this.scene.grabBusy &&
                            R.state !== 'down' && R.state !== 'getup';
          if (grabbable) {
            if (R.held) { R.held.released?.(); R.held = null; }
            this.state = 'kiss_hold'; this.st = this.holdElapsed = this.decayElapsed = this.mashCount = 0;
            R.grabbedBy = this; R.state = 'grabbed'; this.scene.grabBusy = true;
            this.deps.onRileyGrabbed?.(this, R); this.scene.onRileyGrabbed?.(this, R);
            break;
          }
        }
        if (this.st >= D.kissMaxDuration) { this.state = 'grounded'; this.st = 0; this.setKissCooldown(); }
        break;
      }

      case 'kiss_recoil':
        if (this.st >= D.kissRecoil) { this.state = 'grounded'; this.st = 0; }
        break;

      case 'kiss_hold': {
        if (this.isPaused()) { this.st -= dt; break; }
        this.holdElapsed += dt; this.decayElapsed += dt;
        if (this.holdElapsed >= D.kissHoldInterval) {
          this.holdElapsed -= D.kissHoldInterval;
          if (R) {
            R.hp = Math.max(0, (R.hp || 100) - D.kissHoldDmg);
            if (R.hp <= 0) { this.releaseGrab(); this.state = 'grounded'; this.st = 0; this.setKissCooldown(); break; }
          }
        }
        if (this.decayElapsed >= D.kissMashDecayInterval) {
          this.decayElapsed -= D.kissMashDecayInterval;
          if (this.mashCount > 0) this.mashCount = Math.max(0, this.mashCount - D.kissMashDecay);
        }
        if (this.st >= D.kissHoldMax) {
          if (R) { R.hp = Math.max(0, (R.hp || 100) - D.kissTimeoutDmg); R.state = 'down'; }
          this.kissLockout = D.kissLockout;
          this.releaseGrab(); this.state = 'grounded'; this.st = 0; this.setKissCooldown();
        }
        break;
      }

      case 'reels':
        if (this.st >= D.kissReelDuration) { this.state = 'grounded'; this.st = 0; }
        break;

      case 'counter_down':
        if (this.st >= D.counterDown) { this.state = 'getup'; this.st = 0; this.counter = false; }
        break;

      case 'getup':
        if (this.st >= 0.4) { this.state = 'grounded'; this.st = 0; }
        break;

      case 'takeoff':
        if (this.st >= 0.5) { this.state = 'perch'; this.st = 0; }
        break;
    }
  }

  update(dt = 0) {
    if (!this.alive && this.state === 'defeated') return;
    this.accum = (this.accum || 0) + (dt || 0);
    const steps = Math.floor(this.accum * HZ + 1e-4);
    for (let i = 0; i < steps; i++) this.substep(DT_SUB);
    this.accum -= steps * DT_SUB;
    if (Math.abs(this.accum) < 1e-6) this.accum = 0;
  }

  destroy() { this.dispose(); }
  dispose() { this.releaseGrab(); this.alive = false; }
}
