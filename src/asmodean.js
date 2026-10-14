// Asmodean, the gleeman. Beaten and bound, never killed. Call-ins cannot skip a gate.
import { clamp, LANE_TOP, LANE_BOT } from './config.js';
import { s7Scale, isPainted } from './stage7-paint.js';
import { strikeRiley } from './stage7-hurt.js';
import { substeps } from './stage5-clock.js';
import { createNotes, stepNotes } from './stage7-notes.js';

export const ASMODEAN = Object.freeze({
  hp: 600, speed: 88, reach: 150, score: 8000,
  bashTell: 0.55, bashDmg: 8, channel: 1.8, channelEvery: 6, channelHits: 3, stun: 1.4,
  reflectFrac: 0.04, reflectStagger: 0.8,
});
const ATK = new Set(['combo1', 'combo2', 'combo3', 'back', 'runkick', 'airkick', 'knee']);

function stub() {
  const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setVisible() { return o; }, destroy() {} };
  return o;
}

export class Asmodean {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'asmodean'; this.x = x; this.y = y; this.z = 0; this.vx = 0; this.vz = 0;
    this.hp = this.maxHp = ASMODEAN.hp; this.phase = 1; this.alive = true; this.state = 'idle'; this.st = 0;
    this.facing = -1; this.team = 1; this.accum = 0; this.gone = false; this.entering = false;
    this.counterUsed = false; this.invuln = false; this.beat = false; this.bound = false;
    this.cool = 0.6; this.bashAt = 3; this.channelAt = 2; this.channelHits = 0; this.staggerDur = 1;
    this.field = createNotes();
    this.def = { shadowW: 160, team: 1 };
    this.T = { speed: ASMODEAN.speed, score: ASMODEAN.score, boss: true, name: 'ASMODEAN' };
    scene.koCount = (scene.koCount || 0) + 1; this.id = scene.koCount;
    const add = scene.add;
    this.shadow = add?.image ? add.image(x, y, 'shadow') : stub();
    this.sprite = add?.sprite ? add.sprite(x, y, 's7asmo', 0) : stub();
    this.shadow.setDepth?.(900);
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
  }
  get canBeHit() { return this.alive && !this.invuln && !this.beat && !this.entering && !['bound', 'dead'].includes(this.state); }
  get name() { return 'ASMODEAN'; }
  face(dir) { if (dir) { this.facing = dir; if (this.sprite) this.sprite.flipX = dir < 0; } }
  update(dt) {
    if (this.scene.paused || this.scene.cutscene) return;
    substeps(this, dt, d => this.sub(d));
  }
  notesActive() {
    return this.alive && !this.beat && !['attack', 'channel', 'stagger', 'stun', 'bound', 'dead'].includes(this.state);
  }
  sub(dt) {
    this.st += dt; if (this.cool > 0) this.cool -= dt;
    stepNotes(this.field, dt, {
      scene: this.scene, riley: this.scene.riley, boss: this,
      interval: this.phase === 2 ? 10 : 5, active: this.notesActive(),
      onReflect: () => this.scene.kit?.onReflect?.(this),
    });
    if (this.state === 'bound') { if (this.st > 1.0 && this.alive) { this.alive = false; this.state = 'dead'; this.st = 0; this.scene.onEnemyDie?.(this); } return; }
    if (this.state === 'dead') { if (this.st > 0.4) this.gone = true; return; }
    if (this.callStagger > 0) {
      this.callStagger -= dt; this.state = 'stagger'; this.counterUsed = true;
      if (this.callStagger <= 0 && this.alive) { this.state = 'idle'; this.st = 0; this.counterUsed = false; }
      return;
    }
    if (this.state === 'stagger' || this.state === 'stun') {
      if (this.st >= this.staggerDur) { this.state = 'idle'; this.st = 0; this.counterUsed = false; }
      return;
    }
    if (this.beat || this.invuln) { if (this.st > 0.45) { this.beat = false; this.invuln = false; this.state = 'idle'; this.st = 0; } return; }
    if (this.bashAt > 0) this.bashAt -= dt;
    if (this.phase >= 3 && this.channelAt > 0) this.channelAt -= dt;
    if (this.state === 'attack') return this.bashStep();
    if (this.state === 'channel') return this.channelStep();
    this.walk(dt);
  }
  facingRiley() {
    const R = this.scene.riley;
    return !!(R && R.attackFrame && ATK.has(R.state) && Math.sign(this.x - R.x) === (R.facing || 1)
      && Math.abs(R.x - this.x) < 220 && Math.abs(R.y - this.y) < 40);
  }
  walk(dt) {
    if (this.entering) return; // Scene entry movement owns admission.
    const R = this.scene.riley; if (!R || !R.alive) return;
    const dx = R.x - this.x, adx = Math.abs(dx);
    this.face(Math.sign(dx) || this.facing);
    if (Math.abs(R.y - this.y) > 12) this.y = clamp(this.y + Math.sign(R.y - this.y) * 90 * dt, LANE_TOP, LANE_BOT);
    if (this.cool > 0) return;
    if (this.phase >= 3 && this.channelAt <= 0) { this.startChannel(); return; }
    const tokens = this.scene.attackTokens?.() ?? 0;
    const wantBash = this.bashAt <= 0;
    if (wantBash && tokens < (this.scene.maxTokens || 2) && adx < 200 && Math.abs(R.y - this.y) < 36) { this.startBash(); return; }
    const dir = Math.sign(dx) || 0;
    if (wantBash) { if (adx > 140) this.x += dir * ASMODEAN.speed * dt; }
    else if (adx > 460) this.x += dir * ASMODEAN.speed * dt;
    else if (adx < 340) this.x -= dir * ASMODEAN.speed * dt;
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 50, b.r - 50);
  }
  startBash() { this.state = 'attack'; this.st = 0; this.struck = false; this.counterUsed = false; this.scene.kit?.onBashTell?.(this); }
  startChannel() {
    this.state = 'channel'; this.st = 0; this.channelHits = 0; this.counterUsed = false;
    this.scene.kit?.onChannel?.(this);
  }
  bashStep() {
    const R = this.scene.riley;
    if (!this.counterUsed && this.st >= ASMODEAN.bashTell - 0.18 && this.st < ASMODEAN.bashTell && this.facingRiley()) {
      this.counterUsed = true; this.hp -= 14; this.enterStagger(1.0);
      this.scene.kit?.onCounter?.(this, 'bash'); this.scene.hud?.flashText?.('COUNTER!');
      this.guard();
      return;
    }
    if (!this.struck && this.st >= ASMODEAN.bashTell && this.st < ASMODEAN.bashTell + 0.1
      && R && Math.abs(R.x - this.x) < ASMODEAN.reach && Math.abs(R.y - this.y) < 36) {
      this.struck = true;
      strikeRiley(this.scene, ASMODEAN.bashDmg, { fromX: this.x, kb: this.facing * 200 });
    }
    if (this.st >= ASMODEAN.bashTell + 0.16) {
      this.state = 'idle'; this.st = 0; this.cool = 0.6; this.bashAt = 4.5; this.counterUsed = false;
    }
  }
  channelStep() {
    if (this.st < ASMODEAN.channel) return;
    this.state = 'idle'; this.st = 0; this.channelAt = ASMODEAN.channelEvery; this.counterUsed = false;
    this.scene.kit?.onChannelFire?.(this);
  }
  enterStagger(secs) { this.state = 'stagger'; this.st = 0; this.staggerDur = secs; this.counterUsed = true; }
  takeReflected() {
    if (!this.alive || this.bound) return false;
    this.hp -= Math.round(this.maxHp * ASMODEAN.reflectFrac);
    const ph = this.phase;
    this.guard();
    if (this.alive && !this.bound && this.phase === ph && !this.beat) this.enterStagger(ASMODEAN.reflectStagger);
    return true;
  }
  takeHit(h) {
    if (!this.canBeHit) return false;
    if (this.state === 'channel') {
      this.hp -= h?.dmg || 1; this.channelHits++;
      if (this.channelHits >= ASMODEAN.channelHits || h?.down) {
        this.counterUsed = true; this.channelAt = ASMODEAN.channelEvery;
        this.state = 'stun'; this.st = 0; this.staggerDur = ASMODEAN.stun;
        this.scene.kit?.onChannelBreak?.(this);
      }
      this.guard();
      return true;
    }
    if (this.state === 'attack' && !this.counterUsed && this.facingRiley()) {
      this.counterUsed = true; this.hp -= Math.max(h?.dmg || 1, 1);
      this.enterStagger(1.0);
      this.scene.kit?.onCounter?.(this, 'bash'); this.scene.hud?.flashText?.('COUNTER!');
      this.guard();
      return true;
    }
    this.hp -= h?.dmg || 0; this.guard();
    return true;
  }
  guard() {
    if (!this.alive || this.bound) return;
    if (this.phase >= 3) { if (this.hp <= 0) this.beginBound(); return; }
    const floor = Math.floor(this.maxHp * (this.phase <= 1 ? 0.66 : 0.33));
    if (this.hp <= floor) { this.hp = floor; this.enter(this.phase + 1); }
  }
  enter(ph) {
    if (ph === this.phase || ph > 3) return;
    this.phase = ph; this.state = 'idle'; this.st = 0; this.invuln = true; this.beat = true; this.counterUsed = false;
    if (ph === 3) this.channelAt = 2;
    this.scene.onBossPhase?.(this, ph); this.scene.kit?.onAsmoPhase?.(this, ph);
  }
  beginBound() {
    if (this.bound) return;
    this.callStagger = 0;
    this.bound = true; this.hp = 0; this.invuln = true; this.beat = true; this.state = 'bound'; this.st = 0;
    this.scene.kit?.onBound?.(this);
  }
  releaseHold() {}
  physics(dt) {
    if (this.vx) { this.x += this.vx * dt; this.vx *= Math.pow(0.004, dt); if (Math.abs(this.vx) < 6) this.vx = 0; }
    this.y = clamp(this.y, LANE_TOP, LANE_BOT);
    const b = this.scene?.bounds;
    if (b) this.x = clamp(this.x, b.l + 40, b.r - 40);
  }
  sync() {
    const playing = this.notesActive() && Math.abs((this.scene.riley?.x || 0) - this.x) > 300;
    const frame = this.state === 'attack' ? (this.st < ASMODEAN.bashTell ? 3 : 4)
      : this.state === 'channel' ? 5 : this.state === 'stagger' || this.state === 'stun' ? 6
      : this.state === 'bound' || this.state === 'dead' ? 7 : playing ? 2 : (Math.floor((this.st || 0) * 4) % 2);
    this.sprite.x = this.x; this.sprite.y = this.y - (this.z || 0);
    this.sprite.setOrigin?.(0.5, 0.96); this.sprite.setFrame?.(frame);
    this.sprite.setScale?.(s7Scale(this.scene, 's7asmo', 3.1));
    this.sprite.flipX = this.facing < 0; this.sprite.setDepth?.(1000 + this.y);
    this.sprite.setAlpha?.(1);
    this.shadow?.setPosition?.(this.x, this.y + 2); this.shadow?.setScale?.(2.3, 0.52); this.shadow?.setAlpha?.(0.5);
    void isPainted;
  }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.alive = false; this.gone = true; }
}
