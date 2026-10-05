// Stage 3 enemies: Darkfriends of Caemlyn. The cutthroat flanks, coshes, and lunges to grab Riley from behind.
// Kid-safe: knocked out (stars) or runs away, like the Whitecloaks.
import { TYPES } from './enemies.js';
import { Whitecloak } from './whitecloaks.js';
import { rand, LANE_TOP } from './config.js';
import { sfx, say } from './audio.js';

const D = (key, scale, anchorX, hp, shadowW) => ({ key, prefix: key + '_', native: -1, scale, anchorX, hp, team: 1, shadowW });
Object.assign(TYPES, {
  cutthroat: {
    def: D('cutthroat', 0.55, 0.5, 34, 130),
    get hp() { return this.def.hp; },
    name: 'DARKFRIEND CUTTHROAT', speed: 150, pref: 200, flank: true, cool: [1.2, 2.0], score: 450,
    atk: { anim: 'slash', active: [2], x0: 20, x1: 200, z0: 0, z1: 210, dmg: 8, kind: 'medium', kb: 200, sfx: 'swing' }
  },
});

export const CUTTHROAT = Object.freeze({
  coil: 0.45, lungeSpeed: 620, lungeMax: 0.45, lungeRange: [140, 300], lungeLane: 24,
  catchDx: 80, catchDy: 22, grabCool: [5, 8], firstGrab: [2.0, 3.5], holdMax: 2.4, chipEvery: 0.6, chipDmg: 2, chipMax: 3,
  mashNeed: 6, mashDecay: 0.5, holdDx: 46, shoved: 1.2, shovedDmg: 1.3, shoveKb: 260, dropMark: 0.7, dropZ: 520, dropSpread: 300,
  throwHit: Object.freeze({ dmg: 8, kind: 'heavy', kb: 380, launch: 340, down: true })
});

export const GRAB_OK = Object.freeze(['idle', 'walk', 'run', 'hurt', 'land']);
export const RILEY_ATTACKS = Object.freeze(['combo1', 'combo2', 'combo3', 'back', 'runkick', 'airkick']);
const HOLD_BREAK = { hurt: 1, down: 1, getup: 1, dead: 1 };
const bump = (s, k) => { const st = s.kit?.stats; if (st) st[k] = (st[k] || 0) + 1; };

export class Cutthroat extends Whitecloak {
  constructor(scene, x, y) {
    super(scene, 'cutthroat', x, y);
    this.grabCool = rand(...CUTTHROAT.firstGrab);
    this.mashN = this.mashT = this.chips = 0;
    this.lungeDir = -1;
    this.stalking = false;
  }
  get canBeHit() { return super.canBeHit && this.state !== 'dropin'; }
  play(name, ts, restart) {
    if (name === 'walk' && this.stalking) name = 'stalk';
    super.play(name, ts, restart);
  }
  covers(R) {
    return RILEY_ATTACKS.includes(R.state) && R.atk && R.atk.active.includes(R.fi) &&
      Math.sign(this.x - R.x) === (R.atk.x1 > 0 ? R.facing : -R.facing);
  }
  catchResult(R) {
    if (Math.abs(R.y - this.y) >= CUTTHROAT.catchDy || Math.abs(R.x - this.x) >= CUTTHROAT.catchDx || !R.alive || R.grabbedBy || this.scene.victoryPending || this.scene.ended) return null;
    if (this.covers(R)) return 'counter';
    if (R.z > 0 || !R.vulnerable) return null;
    if (GRAB_OK.includes(R.state)) return 'grab';
    if (!RILEY_ATTACKS.includes(R.state)) return null;
    const a = R.atk, toward = a && Math.sign(this.x - R.x) === (a.x1 > 0 ? R.facing : -R.facing);
    return toward ? null : 'grab';
  }
  think(dt) {
    if (this.entering) return;
    const R = this.target, s = this.scene;
    const adx = Math.abs(R.x - this.x), ady = Math.abs(R.y - this.y);
    if (this.cool <= 0 && this.grabCool <= 0 && R.alive && !R.grabbedBy && R.state !== 'down' &&
        adx >= CUTTHROAT.lungeRange[0] && adx <= CUTTHROAT.lungeRange[1] &&
        ady < CUTTHROAT.lungeLane && !s.grabBusy(this) && s.attackTokens() < s.maxTokens) {
      return this.startLunge();
    }
    this.stalking = this.cool > 0 || s.attackTokens() >= s.maxTokens;
    super.think(dt);
  }
  startLunge() {
    this.face(Math.sign(this.target.x - this.x));
    this.lungeDir = this.facing;
    this.setState('lunge', 'lunge');
    this.grabCool = rand(...CUTTHROAT.grabCool);
    this.cool = rand(...this.T.cool);
    this.scene.kit?.telegraph(this);
    sfx.hiss?.();
  }
  update(dt) {
    if (this.grabCool > 0) this.grabCool -= dt;
    switch (this.state) {
      case 'dropin': {
        this.st += dt;
        if (this.st < CUTTHROAT.dropMark) {
          this.z = 0; this.sprite.setAlpha(0);
        } else if (!this.falling) {
          this.falling = true; this.z = CUTTHROAT.dropZ; this.vz = 0; this.sprite.setAlpha(1);
        }
        return;
      }
      case 'lunge': {
        this.st += dt;
        const R = this.target, bounds = this.scene.bounds;
        if (this.st < CUTTHROAT.coil) return;
        const stopped = (this.x <= bounds.l + 50 || this.x >= bounds.r - 50) || this.st >= CUTTHROAT.coil + CUTTHROAT.lungeMax;
        if (!stopped) {
          this.x += this.lungeDir * CUTTHROAT.lungeSpeed * dt;
          const r = this.catchResult(R);
          if (r === 'grab') { this.startHold(R); return; }
          if (r === 'counter') {
            if (!R.hitIds.has(this.id)) this.scene.hitTarget(R, this, R.atk);
            return;
          }
        }
        if (this.done) this.setState('approach', 'walk');
        return;
      }
      case 'holding': this.st += dt; return this.holding(dt);
      case 'grabthrow': {
        this.st += dt;
        if (this.done) { this.setState('approach', 'walk'); this.cool = rand(...this.T.cool); }
        return;
      }
      case 'shoved': {
        this.st += dt;
        if (this.done && this.cur !== this.def.prefix + 'dazed') this.play('dazed');
        if (this.st >= CUTTHROAT.shoved) { this.setState('approach', 'walk'); this.cool = rand(0.3, 0.6); }
        return;
      }
    }
    super.update(dt);
  }
  onLand(v) {
    if (this.state === 'dropin') {
      this.setState('approach', 'walk');
      this.sprite.anims.resume();
      this.cool = rand(0.4, 0.8);
      this.scene.fx?.thump(this.x, this.y, false);
      sfx.thud();
      bump(this.scene, 'dropins');
      return;
    }
    super.onLand(v);
  }
  sync() {
    super.sync();
    if (this.state === 'dropin' && this.st < CUTTHROAT.dropMark) {
      const g = this.st / CUTTHROAT.dropMark;
      this.shadow.setScale(this.def.shadowW / 64 * g, this.def.shadowW * 0.22 / 64 * g).setAlpha(0.9 * g);
    }
  }
  dropIn() {
    this.setState('dropin', 'lunge');
    this.sprite.anims.setCurrentFrame(this.sprite.anims.currentAnim.frames[2]);
    this.sprite.anims.pause();
    this.falling = false;
    this.z = 0;
    this.sprite.setAlpha(0);
    this.scene.kit?.dropMarker?.(this);
  }
  takeHit(h, from) {
    if (!this.canBeHit) return false;
    if (this.state === 'holding') this.releaseHold('break');
    if (this.state === 'lunge' && from === this.scene.riley) {
      bump(this.scene, 'counters');
      this.scene.kit?.hint?.('counter', 'COUNTER!');
      h = { ...h, down: true };
    }
    if (this.state === 'shoved') {
      h = { ...h, dmg: h.dmg * CUTTHROAT.shovedDmg };
    }
    return super.takeHit(h, from);
  }
  die(dir, h) {
    if (this.state === 'holding') this.releaseHold('break');
    super.die(dir, h);
  }
  startHold(R) {
    let side = Math.sign(this.x - R.x) || -R.facing;
    const bounds = this.scene.bounds;
    if (R.x + side * CUTTHROAT.holdDx < bounds.l + 40 || R.x + side * CUTTHROAT.holdDx > bounds.r - 40) side = -side;
    R.face(-side);
    R.grabbedBy = this;
    R.vx = 0;
    R.enterGrabbed?.(this);
    this.setState('holding', 'hold');
    this.holdSide = side;
    this.mashN = this.mashT = this.chips = 0;
    bump(this.scene, 'grabs');
    say('cutthroat_grab_01', this.scene.caption, false);
    this.scene.kit?.hint?.('grabbed', 'GRABBED! MASH TO BREAK FREE');
  }
  holding(dt) {
    const R = this.target, s = this.scene;
    if (!R.alive || R.grabbedBy !== this || HOLD_BREAK[R.state] || s.victoryPending || s.ended) {
      this.releaseHold('break');
      this.setState('approach', 'walk');
      this.cool = rand(0.6, 1.0);
      return;
    }
    this.x = R.x + this.holdSide * CUTTHROAT.holdDx;
    this.y = Math.max(LANE_TOP, R.y - 1);
    this.z = 0;
    this.vx = 0;
    this.face(-this.holdSide);
    this.mashT += dt;
    while (this.mashT >= CUTTHROAT.mashDecay) {
      this.mashT -= CUTTHROAT.mashDecay;
      this.mashN = Math.max(0, this.mashN - 1);
    }
    if (this.chips < CUTTHROAT.chipMax && this.st >= (this.chips + 1) * CUTTHROAT.chipEvery && this.st < CUTTHROAT.holdMax) {
      this.chips++;
      if (R.hp > 1) R.hp = Math.max(1, R.hp - CUTTHROAT.chipDmg);
      sfx.hit(false);
    }
    if (this.st >= CUTTHROAT.holdMax) {
      this.releaseHold('throw');
      this.setState('grabthrow', 'grabthrow');
      s.hitTarget(this, R, CUTTHROAT.throwHit);
    }
  }
  mash() {
    if (this.state !== 'holding') return false;
    this.mashN++;
    if (this.mashN >= CUTTHROAT.mashNeed) {
      this.releaseHold('escape');
      this.setState('shoved', 'shoved');
      this.vx = this.holdSide * CUTTHROAT.shoveKb;
      this.scene.kit?.hint?.('shoved', 'BREAK FREE! HIT HIM NOW');
      return true;
    }
    return false;
  }
  releaseHold(how) {
    const R = this.target;
    if (R && R.grabbedBy === this) {
      R.grabbedBy = null;
      R.leaveGrabbed?.(how);
      bump(this.scene, how === 'escape' ? 'escapes' : how === 'throw' ? 'throws' : 'breaks');
    }
  }
}

export const DARKFRIENDS = Object.freeze({ cutthroat: Cutthroat });
