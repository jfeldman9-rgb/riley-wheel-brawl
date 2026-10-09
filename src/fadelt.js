// Myrddraal lieutenant. Stage 3 shadow-blink only: no fear, no split. Linked Trollocs reel when it dies.
import { clamp, LANE_TOP, LANE_BOT } from './config.js';
import { strikeRiley } from './stage6-hurt.js';
import { substeps } from './stage5-clock.js';

export const FADELT = Object.freeze({
  hp: 120, tells: Object.freeze([0.5, 0.35, 0.45]), dmg: Object.freeze([10, 10, 16]),
  reach: 168, link: 3, daze: 1.5, blink: 5.5, blinkT: 0.32, score: 900, speed: 104, scale: 3.2,
});
const ATK = new Set(['combo1', 'combo2', 'combo3', 'back', 'runkick', 'airkick', 'knee']);
const TROLL = new Set(['grunt', 'spear', 'hound']);

function stub() {
  const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setTint() { return o; }, destroy() {} };
  return o;
}

export function linkTrollocs(fade, enemies) {
  const have = (enemies || []).filter(e => e && e.linkedTo === fade);
  let n = have.length;
  for (const e of enemies || []) {
    if (n >= FADELT.link) break;
    if (!e || e === fade || !e.alive || e.linkedTo || !TROLL.has(e.type)) continue;
    e.linkedTo = fade; n++;
  }
  fade.links = n;
  return n;
}

export function dazeLinked(fade, enemies, secs = FADELT.daze) {
  let n = 0;
  for (const e of enemies || []) if (e && e.alive && e.linkedTo === fade) { e.daze = secs; e.randDown = Math.max(e.randDown || 0, secs); n++; }
  return n;
}

export class Fadelt {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'fadelt'; this.x = x; this.y = y; this.z = 0; this.vx = 0;
    this.hp = this.maxHp = FADELT.hp; this.alive = true; this.state = 'idle'; this.st = 0; this.facing = -1;
    this.team = 1; this.accum = 0; this.gone = false; this.entering = false;
    this.hitI = 0; this.struck = false; this.counterUsed = false; this.blinkCd = 2.2; this.links = 0;
    this.def = { shadowW: 150, team: 1 };
    this.T = { speed: FADELT.speed, score: FADELT.score, boss: false, name: 'MYRDDRAAL LIEUTENANT' };
    scene.koCount = (scene.koCount || 0) + 1; this.id = scene.koCount;
    const add = scene.add;
    this.shadow = add?.image ? add.image(x, y, 'shadow') : stub();
    this.sprite = add?.sprite ? add.sprite(x, y, 's6fade', 0) : stub();
    this.shadow.setDepth?.(900);
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
    linkTrollocs(this, scene.enemies);
    scene.kit?.onFadelt?.(this);
  }
  get canBeHit() { return this.alive && !this.entering && this.state !== 'blink' && !['dead', 'down'].includes(this.state); }
  face(dir) { if (dir) { this.facing = dir; if (this.sprite) this.sprite.flipX = dir < 0; } }
  update(dt) {
    if (this.scene.paused || this.scene.cutscene) return;
    if (!this.alive && this.state !== 'dead') return;
    linkTrollocs(this, this.scene.enemies);
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    this.st += dt; if (this.blinkCd > 0) this.blinkCd -= dt;
    if (this.randDown > 0 || this.daze > 0) { this.state = 'down'; return; }
    if (this.state === 'dead') { if (this.st > 0.9) this.gone = true; return; }
    if (this.state === 'down') { if (this.st > 0.8) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'hurt') { if (this.st > 0.22) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'blink') { if (this.st >= FADELT.blinkT) this.arrive(); return; }
    if (this.state === 'attack') return this.string(dt);
    this.walk(dt);
  }
  walk(dt) {
    const R = this.scene.riley; if (!R) return;
    const dx = R.x - this.x; this.face(Math.sign(dx) || this.facing);
    if (Math.abs(R.y - this.y) > 12) this.y = clamp(this.y + Math.sign(R.y - this.y) * 80 * dt, LANE_TOP, LANE_BOT);
    const tokens = this.scene.attackTokens?.() ?? 0;
    if (this.blinkCd <= 0 && Math.abs(dx) > 200 && this.state === 'idle') { this.startBlink(); return; }
    if (Math.abs(dx) < FADELT.reach + 30 && Math.abs(R.y - this.y) < 30 && tokens < (this.scene.maxTokens || 2) && this.st > 0.35) {
      this.state = 'attack'; this.st = 0; this.hitI = 0; this.struck = false; this.counterUsed = false;
      return;
    }
    if (Math.abs(dx) > 90) this.x += Math.sign(dx) * FADELT.speed * dt;
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 40, b.r - 40);
  }
  startBlink() {
    this.state = 'blink'; this.st = 0; this.blinkCd = FADELT.blink; this.counterUsed = false;
  }
  arrive() {
    const R = this.scene.riley, b = this.scene.bounds || { l: 0, r: 4000 };
    const dir = R ? -(R.facing || 1) : -1;
    this.x = clamp((R?.x || this.x) + dir * 120, b.l + 50, b.r - 50);
    this.y = clamp(R?.y || this.y, LANE_TOP, LANE_BOT);
    this.face(R ? Math.sign(R.x - this.x) : this.facing);
    this.state = 'idle'; this.st = 0;
  }
  string() {
    const tell = FADELT.tells[this.hitI] || 0.4;
    const R = this.scene.riley;
    const third = this.hitI === 2;
    if (third && !this.counterUsed && R?.attackFrame && ATK.has(R.state) && this.st >= tell - 0.16 && this.st < tell && Math.sign(this.x - R.x) === (R.facing || 1) && Math.abs(R.x - this.x) < 200 && Math.abs(R.y - this.y) < 36) {
      this.counterUsed = true; this.state = 'down'; this.st = 0; this.hp -= 16;
      this.scene.kit?.onCounter?.(this, 'fade'); this.scene.hud?.flashText?.('COUNTER!');
      if (this.hp <= 0) this.die();
      return;
    }
    if (!this.struck && this.st >= tell && this.st < tell + 0.12 && R && Math.abs(R.x - this.x) < FADELT.reach && Math.abs(R.y - this.y) < 34) {
      this.struck = true;
      strikeRiley(this.scene, FADELT.dmg[this.hitI], { fromX: this.x, kb: this.facing * (third ? 280 : 140), down: third });
    }
    if (this.st >= tell + 0.16) {
      if (this.hitI >= 2) { this.state = 'idle'; this.st = 0; this.counterUsed = false; return; }
      this.hitI++; this.st = 0; this.struck = false; this.counterUsed = false;
    }
  }
  takeHit(h) {
    if (!this.canBeHit) return false;
    const R = this.scene.riley;
    if (this.state === 'attack' && this.hitI === 2 && !this.counterUsed && R?.attackFrame && Math.sign(this.x - R.x) === (R.facing || 1)) {
      this.counterUsed = true; this.hp -= Math.max(h?.dmg || 1, 1); this.state = 'down'; this.st = 0;
      this.scene.kit?.onCounter?.(this, 'fade'); this.scene.hud?.flashText?.('COUNTER!');
      if (this.hp <= 0) this.die();
      return true;
    }
    this.hp -= h?.dmg || 0;
    if (this.hp <= 0) { this.die(); return true; }
    if (h?.down) { this.state = 'down'; this.st = 0; } else if (this.state !== 'attack') { this.state = 'hurt'; this.st = 0; }
    return true;
  }
  die() {
    if (!this.alive && this.state === 'dead') return;
    this.alive = false; this.hp = 0; this.state = 'dead'; this.st = 0;
    dazeLinked(this, this.scene.enemies);
    this.scene.kit?.onFadeltDown?.(this);
    this.scene.onEnemyDie?.(this);
  }
  releaseHold() {}
  physics() { this.y = clamp(this.y, LANE_TOP, LANE_BOT); }
  sync() {
    const frame = this.state === 'attack' ? 2 + Math.min(2, this.hitI) : this.state === 'blink' ? 1 : this.state === 'down' || this.state === 'dead' ? 5 : 0;
    this.sprite.x = this.x; this.sprite.y = this.y - (this.z || 0);
    this.sprite.setOrigin?.(0.5, 0.96); this.sprite.setFrame?.(frame); this.sprite.setScale?.(FADELT.scale);
    this.sprite.flipX = this.facing < 0; this.sprite.setTint?.(0xcc3344);
    this.sprite.setAlpha?.(this.state === 'blink' ? 0.25 : this.state === 'dead' ? Math.max(0, 1 - this.st) : 1);
    this.sprite.setDepth?.(1000 + this.y);
    this.shadow?.setPosition?.(this.x, this.y + 2); this.shadow?.setScale?.(2.2, 0.5); this.shadow?.setAlpha?.(this.state === 'dead' || this.state === 'blink' ? 0 : 0.5);
  }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.alive = false; this.gone = true; }
}
