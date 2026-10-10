// Be'lal, the Netweaver. Three phases. He never takes Callandor. Rand cannot skip a gate or kill him.
import { clamp, LANE_TOP, LANE_BOT } from './config.js';
import { s6Scale, isPainted } from './stage6-paint.js';
import { strikeRiley } from './stage6-hurt.js';
import { substeps } from './stage5-clock.js';

export const BELAL = Object.freeze({
  hp: 640, tells: Object.freeze([0.55, 0.48, 0.48, 0.6]), dmg: Object.freeze([6, 6, 8, 14]),
  lungeTell: 0.7, lunge: 380, lungeT: 0.28, channel: 1.5, stun: 1.4, reach: 176, speed: 96, score: 8000,
});
const ATK = new Set(['combo1', 'combo2', 'combo3', 'back', 'runkick', 'airkick', 'knee']);

function wallDir(scene) {
  const R = scene?.riley, b = scene?.bounds;
  if (!R || !b) return 0;
  if (R.x - b.l <= 140) return -1;
  if (b.r - R.x <= 140) return 1;
  return 0;
}
function snared(scene) {
  const R = scene?.riley, k = scene?.kit;
  return (R?.fogSlow || 0) > 0 || (k?.snareCool || 0) > 0;
}
function lined(scene) {
  const R = scene?.riley, lines = scene?.kit?.stone?.lines, bands = scene?.bands;
  if (!R || !lines || !bands) return false;
  for (const n of lines) {
    if (n.phase !== 'tell' && n.phase !== 'fire') continue;
    const b = bands[n.band];
    if (b && R.y >= b[0] - 8 && R.y <= b[1] + 8) return true;
  }
  return false;
}

function stub() {
  const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setTint() { return o; }, setBlendMode() { return o; }, destroy() {} };
  return o;
}

export class Belal {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'belal'; this.x = x; this.y = y; this.z = 0; this.vx = 0;
    this.hp = this.maxHp = BELAL.hp; this.phase = 1; this.alive = true; this.state = 'idle'; this.st = 0;
    this.facing = -1; this.team = 1; this.accum = 0; this.gone = false; this.entering = false;
    this.hitI = 0; this.struck = false; this.counterUsed = false; this.invuln = false; this.beat = false;
    this.hasCallandor = false; this.cool = 0.4; this.erasing = false;
    this.def = { shadowW: 170, team: 1 };
    this.T = { speed: BELAL.speed, score: BELAL.score, boss: true, name: "BE'LAL" };
    scene.koCount = (scene.koCount || 0) + 1; this.id = scene.koCount;
    const add = scene.add;
    this.shadow = add?.image ? add.image(x, y, 'shadow') : stub();
    this.sprite = add?.sprite ? add.sprite(x, y, 's6belal', 0) : stub();
    this.streak = add?.image ? add.image(x, y - 40, 's6streak') : stub();
    this.shadow.setDepth?.(900); this.streak.setBlendMode?.('ADD');
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
  }
  get canBeHit() { return this.alive && !this.invuln && !this.beat && !this.entering && !['erase', 'dead'].includes(this.state); }
  get name() { return "BE'LAL"; }
  face(dir) { if (dir) { this.facing = dir; if (this.sprite) this.sprite.flipX = dir < 0; } }
  update(dt) {
    if (this.scene.paused || this.scene.cutscene) return;
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    this.st += dt; if (this.cool > 0) this.cool -= dt;
    if (this.state === 'erase') return this.eraseStep();
    if (this.state === 'dead') { if (this.st > 0.4) this.gone = true; return; }
    if (this.randStagger > 0) {
      this.randStagger -= dt; this.state = 'stagger'; this.counterUsed = true;
      if (this.randStagger <= 0 && this.alive) { this.state = 'idle'; this.st = 0; this.counterUsed = false; }
      return;
    }
    if (this.state === 'stagger') { if (this.st >= BELAL.stun) { this.state = 'idle'; this.st = 0; this.counterUsed = false; } return; }
    if (this.beat || this.invuln) { if (this.st > 0.45) { this.beat = false; this.invuln = false; this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'attack') return this.flurry();
    if (this.state === 'tell') return this.lungeTell();
    if (this.state === 'lunge') return this.lunge(dt);
    if (this.state === 'channel') return this.channel();
    this.walk(dt);
  }
  walk(dt) {
    const R = this.scene.riley; if (!R || !R.alive) return;
    const dx = R.x - this.x; this.face(Math.sign(dx) || this.facing);
    if (Math.abs(R.y - this.y) > 12) this.y = clamp(this.y + Math.sign(R.y - this.y) * 90 * dt, LANE_TOP, LANE_BOT);
    const pin = wallDir(this.scene), dir = Math.sign(dx) || 0;
    const step = () => { if (pin && dir === pin) return; this.x += dir * BELAL.speed * dt; };
    if (this.cool > 0) {
      if (Math.abs(dx) > 120) step();
      return;
    }
    const tokens = this.scene.attackTokens?.() || 0;
    if (this.phase >= 3 && this.st > 1.2 && Math.random() < 0.012) { this.startChannel(); return; }
    if (!snared(this.scene) && !lined(this.scene) && !((this.scene.kit?.getupCool || 0) > 0) && tokens < (this.scene.maxTokens || 2) && Math.abs(dx) < 220 && Math.abs(R.y - this.y) < 36) { this.startFlurry(); return; }
    if (!snared(this.scene) && tokens < (this.scene.maxTokens || 2) && Math.abs(dx) > 240 && Math.abs(dx) < 520 && Math.abs(R.y - this.y) < 40 && !(pin && this.facing === pin)) { this.startLunge(); return; }
    if (Math.abs(dx) > 150) step();
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 50, b.r - 50);
  }
  startFlurry() { this.state = 'attack'; this.st = 0; this.hitI = 0; this.struck = false; this.counterUsed = false; }
  startLunge() { this.state = 'tell'; this.st = 0; this.hit = false; this.counterUsed = false; this.fromX = this.x; this.scene.kit?.onLungeTell?.(this); }
  startChannel() { this.state = 'channel'; this.st = 0; this.counterUsed = false; this.hasCallandor = false; this.scene.kit?.onChannel?.(this); }
  facingRiley() {
    const R = this.scene.riley;
    return !!(R && R.attackFrame && ATK.has(R.state) && Math.sign(this.x - R.x) === (R.facing || 1) && Math.abs(R.x - this.x) < 220 && Math.abs(R.y - this.y) < 40);
  }
  flurry() {
    const tell = BELAL.tells[this.hitI] || 0.4, R = this.scene.riley, last = this.hitI === 3;
    if (last && !this.counterUsed && this.facingRiley() && this.st >= tell - 0.18 && this.st < tell) {
      this.counterUsed = true; this.state = 'stagger'; this.st = 0; this.hp -= 18; this.guard();
      this.scene.kit?.onCounter?.(this, 'flurry'); this.scene.hud?.flashText?.('COUNTER!');
      return;
    }
    if (!snared(this.scene) && !lined(this.scene) && !(this.scene.kit?.getupCool > 0) && !this.struck && this.st >= tell && this.st < tell + 0.1 && R && Math.abs(R.x - this.x) < BELAL.reach && Math.abs(R.y - this.y) < 36) {
      this.struck = true;
      if (!last) R.hurtStreak = 0;
      strikeRiley(this.scene, BELAL.dmg[this.hitI], { fromX: this.x, kb: this.facing * (last ? 300 : 60), down: last });
    }
    const pinned = wallDir(this.scene);
    if (this.st >= tell + 0.14) {
      if (this.hitI >= 3 || (pinned && this.hitI >= 2)) { this.state = 'idle'; this.st = 0; this.cool = pinned ? 0.9 : 0.55; this.counterUsed = false; return; }
      this.hitI++; this.st = 0; this.struck = false; this.counterUsed = false;
    }
  }
  abortPinnedLunge() {
    const pin = wallDir(this.scene);
    if (!pin || this.facing !== pin) return false;
    this.state = 'idle'; this.st = 0; this.cool = 0.7; this.counterUsed = false;
    return true;
  }
  lungeTell() {
    if (this.st < BELAL.lungeTell || this.abortPinnedLunge()) return;
    this.state = 'lunge'; this.st = 0; this.hit = false; this.fromX = this.x; this.counterUsed = false;
  }
  lunge(dt) {
    if (this.abortPinnedLunge()) return;
    const R = this.scene.riley, dir = this.facing || 1;
    if (!this.counterUsed && this.facingRiley()) {
      this.counterUsed = true; this.state = 'stagger'; this.st = 0; this.hp -= 14; this.guard();
      this.scene.kit?.onCounter?.(this, 'lunge'); this.scene.hud?.flashText?.('COUNTER!');
      return;
    }
    this.x += dir * (BELAL.lunge / BELAL.lungeT) * dt;
    if (!this.hit && R && Math.abs(R.x - this.x) < 56 && Math.abs(R.y - this.y) < 34) {
      this.hit = true; this.counterUsed = true;
      strikeRiley(this.scene, 16, { fromX: this.x, kb: dir * 340, down: true });
    }
    if (this.st >= BELAL.lungeT || Math.abs(this.x - this.fromX) >= BELAL.lunge) { this.state = 'idle'; this.st = 0; this.cool = 0.7; this.counterUsed = false; }
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 50, b.r - 50);
  }
  channel() {
    this.hasCallandor = false;
    if (this.st >= BELAL.channel) { this.state = 'stagger'; this.st = 0; this.counterUsed = true; this.scene.kit?.onChannelFail?.(this); }
  }
  takeHit(h) {
    if (!this.canBeHit) return false;
    if (this.state === 'channel') {
      this.counterUsed = true; this.hp -= h?.dmg || 1; this.state = 'idle'; this.st = 0; this.cool = 0.35; this.guard();
      this.scene.kit?.onChannelBreak?.(this);
      return true;
    }
    if ((this.state === 'attack' && this.hitI === 3 || this.state === 'lunge') && !this.counterUsed && this.facingRiley()) {
      this.counterUsed = true; this.hp -= Math.max(h?.dmg || 1, 1); this.state = 'stagger'; this.st = 0; this.guard();
      this.scene.kit?.onCounter?.(this, this.state); this.scene.hud?.flashText?.('COUNTER!');
      return true;
    }
    this.hp -= h?.dmg || 0; this.guard();
    return true;
  }
  guard() {
    if (!this.alive) return;
    if (this.phase >= 3) { if (this.hp <= 0) this.beginErase(); return; }
    const floor = Math.floor(this.maxHp * (this.phase <= 1 ? 0.66 : 0.33));
    if (this.hp <= floor) { this.hp = floor; this.enter(this.phase + 1); }
  }
  enter(ph) {
    if (ph === this.phase || ph > 3) return;
    this.phase = ph; this.state = 'idle'; this.st = 0; this.invuln = true; this.beat = true; this.counterUsed = false; this.hasCallandor = false;
    this.scene.onBossPhase?.(this, ph); this.scene.kit?.onBelalPhase?.(this, ph);
  }
  beginErase() {
    if (this.erasing) return;
    this.randStagger = 0;
    this.erasing = true; this.alive = true; this.hp = 0; this.invuln = true; this.beat = true; this.state = 'erase'; this.st = 0; this.hasCallandor = false;
    this.scene.kit?.onErase?.(this);
  }
  eraseStep() {
    if (this.st < 1.15) return;
    if (this.state === 'dead') return;
    this.alive = false; this.state = 'dead'; this.st = 0;
    this.scene.onEnemyDie?.(this);
  }
  releaseHold() {}
  physics() { this.y = clamp(this.y, LANE_TOP, LANE_BOT); }
  sync() {
    const frame = this.state === 'attack' ? 1 + Math.min(2, this.hitI) : this.state === 'tell' || this.state === 'lunge' ? 4 : this.state === 'channel' ? 5 : this.state === 'stagger' ? 6 : this.state === 'erase' || this.state === 'dead' ? 7 : 0;
    this.sprite.x = this.x; this.sprite.y = this.y - (this.z || 0);
    this.sprite.setOrigin?.(0.5, 0.96); this.sprite.setFrame?.(frame); this.sprite.setScale?.(s6Scale(this.scene, 's6belal', 3.1));
    this.sprite.flipX = this.facing < 0; this.sprite.setDepth?.(1000 + this.y);
    this.sprite.setAlpha?.(this.state === 'erase' ? Math.max(0, 1 - this.st) : 1);
    this.shadow?.setPosition?.(this.x, this.y + 2); this.shadow?.setAlpha?.(this.state === 'erase' ? 0 : 0.5); this.shadow?.setScale?.(2.4, 0.55);
    const show = this.state === 'tell' || this.state === 'lunge' || this.state === 'channel' || (this.state === 'attack' && this.st < BELAL.tells[this.hitI]);
    this.streak?.setPosition?.(this.x + this.facing * 40, this.y - 70); this.streak?.setVisible?.(show); this.streak?.setAlpha?.(show ? 0.85 : 0);
    if (isPainted(this.scene, 's6streak')) this.streak?.setDisplaySize?.(this.state === 'channel' ? 40 : 96, 14); else this.streak?.setScale?.(this.state === 'channel' ? 0.6 : 1.4, 0.35);
  }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.streak?.destroy?.(); this.alive = false; this.gone = true; }
}
