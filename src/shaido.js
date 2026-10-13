// Shaido spear-dancer and veiled archer. They yield. They never ash.
import { clamp, LANE_TOP, LANE_BOT } from './config.js';
import { substeps } from './stage5-clock.js';
import { strikeRiley } from './stage5-hurt.js';
import { bandOf, bandY, noteHurt } from './stage7-notes.js';
import { nextFighterId } from './enemies.js';

const ATK_Y = 28;

function stub() {
  const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setOrigin() { return o; }, destroy() {} };
  return o;
}
function arm(scene, e, key, shadowW) {
  e.z = 0; e.vx = 0; e.vz = 0; e.team = 1; e.gone = false; e.entering = false; e.accum = 0;
  e.def = { shadowW, team: 1 };
  e.id = nextFighterId();
  const add = scene.add;
  e.shadow = add?.image ? add.image(e.x, e.y, 'shadow') : stub();
  e.sprite = add?.sprite ? add.sprite(e.x, e.y, key, 0) : stub();
  e.shadow.setDepth?.(900); e.sprite.setOrigin?.(0.5, 0.96); e.sprite.setDepth?.(1000 + e.y);
  if (scene.enemies && !scene.enemies.includes(e)) scene.enemies.push(e);
}
function paint(e, frame) {
  e.frame = frame;
  e.sprite?.setPosition?.(e.x, e.y - (e.z || 0));
  e.sprite?.setDepth?.(1000 + e.y);
  e.sprite?.setFrame?.(frame);
  if (e.sprite) e.sprite.flipX = e.facing < 0;
  e.shadow?.setPosition?.(e.x, e.y);
  e.shadow?.setAlpha?.(e.z > 20 ? 0.35 : 0.8);
}

export class Dancer {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'dancer'; this.x = x; this.y = y;
    this.hp = this.maxHp = 60; this.alive = true; this.state = 'circle'; this.st = 0; this.facing = -1;
    this.T = { speed: 210, score: 450, boss: false, name: 'SHAIDO SPEAR-DANCER' };
    arm(scene, this, 's7dancer', 100);
  }
  get canBeHit() { return this.alive && !this.entering && !this.yielding && this.state !== 'yield' && !(this.s7Veil > 0); }
  face(dir) { if (dir) this.facing = dir; }
  yieldOut() {
    if (this.yielding) return;
    this.yielding = true; this.alive = false; this.state = 'yield'; this.st = 0; this.hp = 0;
    this.scene.onEnemyDie?.(this);
  }
  die() { this.yieldOut(); }
  takeHit(h) {
    if (!this.canBeHit) return false;
    this.hp -= h?.dmg || 0;
    if (this.hp <= 0) { this.yieldOut(); return true; }
    this.state = 'hurt'; this.st = 0;
    return true;
  }
  releaseHold() {}
  update(dt) {
    if (this.scene.paused || this.scene.cutscene) return;
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    this.st += dt;
    if (this.yielding) {
      this.sprite?.setAlpha?.(Math.max(0, 1 - this.st / 0.8));
      if (this.st >= 0.8) this.gone = true;
      return;
    }
    if (this.randDown > 0 || this.callDown > 0) {
      this.state = 'down';
      if (this.randDown > 0) this.randDown = Math.max(0, this.randDown - dt);
      if (this.callDown > 0) this.callDown = Math.max(0, this.callDown - dt);
      return;
    }
    if (this.callYield) { this.yieldOut(); return; }
    if (this.state === 'hurt' && this.st > 0.22) { this.state = 'circle'; this.st = 0; }
    if (this.state === 'down') { if (this.st > 0.7) { this.state = 'circle'; this.st = 0; } return; }
    if (this.state === 'kneel') return this.kneel(dt);
    if (this.state === 'lunge') return this.lunge(dt);
    if (this.state === 'recover') { if (this.st > 0.55) { this.state = 'circle'; this.st = 0; } return; }
    this.circle(dt);
  }
  circle(dt) {
    const R = this.scene.riley; if (!R) return;
    const tokens = this.scene.attackTokens?.() ?? 0;
    const open = (R.x || 0) + ((this.id || 1) % 2 ? 160 : -160);
    this.face(Math.sign(R.x - this.x) || this.facing);
    this.x = clamp(this.x + Math.sign(open - this.x) * 210 * dt, LANE_TOP ? (this.scene.bounds?.l || 0) + 50 : 50, (this.scene.bounds?.r || 5200) - 50);
    if (Math.abs(R.y - this.y) > 10) this.y = clamp(this.y + Math.sign(R.y - this.y) * 140 * dt, LANE_TOP, LANE_BOT);
    if (this.st > 1.05 && tokens < (this.scene.maxTokens || 2)) { this.state = 'kneel'; this.st = 0; this.scene.kit?.onDancerTell?.(); }
  }
  kneel() {
    if (this.st < 0.55) return;
    const tokens = this.scene.attackTokens?.() ?? 0;
    if (tokens >= (this.scene.maxTokens || 2)) { this.state = 'circle'; this.st = 0; return; }
    this.state = 'lunge'; this.st = 0; this.lunged = false; this.x0 = this.x;
  }
  lunge(dt) {
    const R = this.scene.riley;
    const dir = Math.sign((R?.x || this.x) - this.x0) || this.facing || 1;
    this.face(dir);
    const goal = this.x0 + dir * 300;
    this.x += Math.sign(goal - this.x) * 860 * dt;
    if (!this.lunged && R && Math.abs(this.x - R.x) < 46 && Math.abs(this.y - R.y) < ATK_Y && (R.z || 0) < 30) {
      this.lunged = true;
      if (strikeRiley(this.scene, 10, { fromX: this.x, kb: 260 })) noteHurt(this.scene, 'lunge', 0.55);
    }
    if (this.st > 0.42 || Math.abs(this.x - goal) < 8) { this.state = 'recover'; this.st = 0; }
  }
  physics() {}
  sync() { paint(this, this.state === 'kneel' || this.state === 'yield' ? 4 : this.state === 'lunge' ? 3 : this.state === 'hurt' ? 5 : 1); }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.gone = true; }
}

export class Veiled {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'veiled'; this.x = x; this.y = y;
    this.hp = this.maxHp = 40; this.alive = true; this.state = 'idle'; this.st = 0; this.facing = -1;
    this.T = { speed: 120, score: 350, boss: false, name: 'SHAIDO VEILED ARCHER' };
    arm(scene, this, 's7veiled', 90);
  }
  get canBeHit() { return this.alive && !this.entering && !this.yielding && this.state !== 'drop' && !(this.s7Veil > 0); }
  face(dir) { if (dir) this.facing = dir; }
  dropIn() { this.z = 170; this.vz = 20; this.state = 'drop'; this.st = 0; }
  yieldOut() {
    if (this.yielding) return;
    this.yielding = true; this.alive = false; this.state = 'yield'; this.st = 0; this.hp = 0;
    this.scene.onEnemyDie?.(this);
  }
  die() { this.yieldOut(); }
  takeHit(h) {
    if (!this.canBeHit) return false;
    this.hp -= h?.dmg || 0;
    if (this.hp <= 0) { this.yieldOut(); return true; }
    this.state = 'hurt'; this.st = 0;
    return true;
  }
  releaseHold() {}
  update(dt) {
    if (this.scene.paused || this.scene.cutscene) return;
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    this.st += dt;
    if (this.yielding) {
      this.sprite?.setAlpha?.(Math.max(0, 1 - this.st / 0.8));
      if (this.st >= 0.8) this.gone = true;
      return;
    }
    if (this.randDown > 0 || this.callDown > 0) {
      this.state = 'down';
      if (this.randDown > 0) this.randDown = Math.max(0, this.randDown - dt);
      if (this.callDown > 0) this.callDown = Math.max(0, this.callDown - dt);
      return;
    }
    if (this.callYield) { this.yieldOut(); return; }
    if (this.state === 'drop') {
      this.vz -= 1500 * dt; this.z = Math.max(0, this.z + this.vz * dt);
      if (this.z <= 0) { this.state = 'idle'; this.st = 0; this.vz = 0; }
      return;
    }
    if (this.state === 'hurt' && this.st > 0.2) { this.state = 'idle'; this.st = 0; }
    if (this.state === 'down') { if (this.st > 0.7) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'draw') return this.draw();
    if (this.state === 'recover') { if (this.st > 0.45) { this.state = 'idle'; this.st = 0; } return; }
    this.keep(dt);
  }
  keep(dt) {
    const R = this.scene.riley; if (!R) return;
    const dx = R.x - this.x; this.face(Math.sign(dx) || this.facing);
    const dist = Math.abs(dx);
    const bounds = this.scene.bounds || { l: 0, r: 5200 };
    if (dist < 420) this.x = clamp(this.x - this.facing * 120 * dt, bounds.l + 50, bounds.r - 50);
    else if (dist > 620) this.x = clamp(this.x + this.facing * 120 * dt, bounds.l + 50, bounds.r - 50);
    const band = bandOf(R.y);
    const y = bandY(band);
    if (Math.abs(this.y - y) > 6) this.y = clamp(this.y + Math.sign(y - this.y) * 100 * dt, LANE_TOP, LANE_BOT);
    if (this.st > 1.3 && dist >= 380 && dist <= 700) { this.state = 'draw'; this.st = 0; }
  }
  draw() {
    if (this.st < 0.6) return;
    const scene = this.scene;
    if ((scene.s7ArrowAt || 0) > 0) return;
    scene.s7ArrowAt = 0.6;
    const R = scene.riley;
    const dir = Math.sign((R?.x || this.x) - this.x) || this.facing || 1;
    this.face(dir);
    (scene.s7Arrows || (scene.s7Arrows = [])).push({ x: this.x + dir * 30, y: this.y, vx: dir * 460, life: 1.6, hit: false, band: bandOf(this.y) });
    (scene.s7Shots || (scene.s7Shots = [])).push(scene.time?.now || 0);
    this.state = 'recover'; this.st = 0;
  }
  physics() {}
  sync() { paint(this, this.state === 'draw' ? 2 : this.state === 'yield' ? 4 : 1); }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.gone = true; }
}

export function stepArrows(scene, dt) {
  if (scene.s7ArrowAt > 0) scene.s7ArrowAt = Math.max(0, scene.s7ArrowAt - dt);
  const list = scene.s7Arrows;
  if (!list?.length) return;
  const R = scene.riley;
  for (const a of list) {
    a.x += a.vx * dt; a.life -= dt;
    if (!a.hit && R && Math.abs(a.y - R.y) < 22 && Math.abs(a.x - R.x) < 22 && (R.z || 0) < 36) {
      a.hit = true;
      if (strikeRiley(scene, 8, { fromX: a.x, kb: 180 })) noteHurt(scene, 'arrow', 0.6);
    }
    if (a.hit || a.life <= 0) a.img?.destroy?.();
  }
  scene.s7Arrows = list.filter(a => !a.hit && a.life > 0 && a.x > -200 && a.x < 5600);
}
