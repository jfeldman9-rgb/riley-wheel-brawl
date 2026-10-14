// Shaido Aiel. Human fighters: they yield (kneel, then gai'shain fade), never ash.
import { clamp, LANE_TOP, LANE_BOT } from './config.js';
import { s7Scale } from './stage7-paint.js';
import { strikeRiley } from './stage7-hurt.js';
import { substeps } from './stage5-clock.js';

export const DANCER = Object.freeze({ hp: 60, speed: 210, tell: 0.45, lunge: 300, lungeT: 0.36, dmg: 8, score: 450, scale: 3.2 });
export const VEILED = Object.freeze({ hp: 40, speed: 120, draw: 0.6, arrowSpeed: 520, dmg: 7, score: 350, scale: 3.2, gap: 0.6 });
const ATK = new Set(['combo1', 'combo2', 'combo3', 'back', 'runkick', 'airkick', 'knee']);

function stub() {
  const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setTint() { return o; }, setVisible() { return o; }, destroy() {} };
  return o;
}
function body(e, scene, key, shadowW) {
  const add = scene.add;
  e.shadow = add?.image ? add.image(e.x, e.y, 'shadow') : stub();
  e.sprite = add?.sprite ? add.sprite(e.x, e.y, key, 0) : stub();
  e.shadow.setDepth?.(900);
  if (scene.enemies && !scene.enemies.includes(e)) scene.enemies.push(e);
  scene.koCount = (scene.koCount || 0) + 1; e.id = scene.koCount;
  e.def = { shadowW, team: 1 };
}
function facingHit(e) {
  const R = e.scene?.riley;
  return !!(R && R.attackFrame && ATK.has(R.state) && Math.sign(e.x - R.x) === (R.facing || 1)
    && Math.abs(R.x - e.x) < 210 && Math.abs(R.y - e.y) < 38);
}
function basePhysics(e, dt) {
  if (e.vx) { e.x += e.vx * dt; if ((e.z || 0) <= 0) e.vx *= Math.pow(0.004, dt); if (Math.abs(e.vx) < 6) e.vx = 0; }
  if ((e.z || 0) > 0 || e.vz) {
    e.vz = (e.vz || 0) - 2600 * dt; e.z = (e.z || 0) + e.vz * dt;
    if (e.z <= 0) { e.z = 0; e.vz = 0; }
  }
  e.y = clamp(e.y, LANE_TOP, LANE_BOT);
  const b = e.scene?.bounds;
  if (b) e.x = clamp(e.x, b.l + 40, b.r - 40);
}

class ShaidoBase {
  face(dir) { if (dir) { this.facing = dir; if (this.sprite) this.sprite.flipX = dir < 0; } }
  dropIn() { this.z = 240; this.vz = 0; this.state = 'drop'; this.st = 0; this.entering = false; }
  get canBeHit() { return this.alive && !this.entering && this.state !== 'yield' && this.state !== 'down' && this.state !== 'drop'; }
  yieldNow() {
    if (this.state === 'yield') return;
    this.alive = false; this.hp = 0; this.state = 'yield'; this.st = 0; this.yielded = true;
    this.scene?.kit?.onYield?.(this);
    this.scene?.onEnemyDie?.(this);
  }
  die() { this.yieldNow(); }
  releaseHold() {}
  physics(dt) { basePhysics(this, dt); }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.alive = false; this.gone = true; }
}

export class Dancer extends ShaidoBase {
  constructor(scene, x, y) {
    super();
    this.scene = scene; this.type = 'dancer'; this.x = x; this.y = y; this.z = 0; this.vx = 0; this.vz = 0;
    this.hp = this.maxHp = DANCER.hp; this.alive = true; this.state = 'idle'; this.st = 0; this.facing = -1;
    this.team = 1; this.accum = 0; this.gone = false; this.entering = false; this.counterUsed = false;
    this.cool = 0.5; this.hit = false; this.fromX = x;
    this.T = { speed: DANCER.speed, score: DANCER.score, boss: false, name: 'SHAIDO SPEAR-DANCER' };
    this.name = this.T.name;
    body(this, scene, 's7dancer', 120);
  }
  update(dt) {
    if (this.scene.paused || this.scene.cutscene) return;
    if (!this.alive && this.state !== 'yield') return;
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    this.st += dt; if (this.cool > 0) this.cool -= dt;
    if (this.callDown > 0 || this.daze > 0) { if (this.alive) this.state = 'down'; return; }
    if (this.state === 'drop') {
      this.vz = (this.vz || 0) - 2600 * dt; this.z = Math.max(0, (this.z || 0) + this.vz * dt);
      if (this.z <= 0) { this.z = 0; this.vz = 0; this.state = 'idle'; this.st = 0; }
      return;
    }
    if (this.state === 'yield') { if (this.st > 0.8) this.gone = true; return; }
    if (this.state === 'down') { if (this.st > 0.7) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'hurt') { if (this.st > 0.22) { this.state = 'idle'; this.st = 0; } return; }
    if (this.entering) return; // Scene entry movement owns admission (flanking would fight it).
    if (this.state === 'recover') { if (this.st > 0.55) { this.state = 'idle'; this.st = 0; this.counterUsed = false; } return; }
    if (this.state === 'attack') return this.tellStep();
    if (this.state === 'lunge') return this.lungeStep(dt);
    this.circle(dt);
  }
  freeSide() {
    const R = this.scene.riley;
    let left = 0, right = 0;
    for (const e of this.scene.enemies || []) {
      if (!e?.alive || e === this) continue;
      if (e.state !== 'attack' && e.state !== 'lunge' && e.state !== 'sweep' && e.state !== 'charge') continue;
      if (e.x < R.x) left++; else right++;
    }
    return left <= right ? -1 : 1;
  }
  circle(dt) {
    const R = this.scene.riley; if (!R) return;
    const side = this.freeSide();
    const tx = R.x + side * 240;
    this.face(Math.sign(R.x - this.x) || this.facing);
    if (Math.abs(tx - this.x) > 10) this.x += Math.sign(tx - this.x) * DANCER.speed * dt;
    if (Math.abs(R.y - this.y) > 8) this.y = clamp(this.y + Math.sign(R.y - this.y) * DANCER.speed * 0.6 * dt, LANE_TOP, LANE_BOT);
    const tokens = this.scene.attackTokens?.() ?? 0;
    const adx = Math.abs(R.x - this.x);
    if (this.cool <= 0 && this.st > 0.3 && tokens < (this.scene.maxTokens || 2)
      && adx >= 170 && adx <= 400 && Math.abs(R.y - this.y) < 30) {
      this.state = 'attack'; this.st = 0; this.counterUsed = false; this.hit = false;
      this.scene.kit?.onDancerTell?.(this);
    }
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 40, b.r - 40);
  }
  tellStep() {
    if (!this.counterUsed && this.st >= DANCER.tell - 0.16 && this.st < DANCER.tell && facingHit(this)) return this.countered(14);
    if (this.st < DANCER.tell) return;
    const tokens = this.scene.attackTokens?.() ?? 0;
    // The tell itself holds a token (state attack), so this only trips if the cap shrank.
    if (tokens > (this.scene.maxTokens || 2)) { this.state = 'idle'; this.st = 0; return; }
    this.state = 'lunge'; this.st = 0; this.fromX = this.x; this.hit = false;
  }
  countered(dmg) {
    this.counterUsed = true; this.hp -= dmg; this.state = 'down'; this.st = 0;
    this.scene.kit?.onCounter?.(this, 'dancer'); this.scene.hud?.flashText?.('COUNTER!');
    if (this.hp <= 0) this.yieldNow();
  }
  lungeStep(dt) {
    if (!this.counterUsed && facingHit(this)) return this.countered(14);
    const R = this.scene.riley, dir = this.facing || 1;
    this.x += dir * (DANCER.lunge / DANCER.lungeT) * dt;
    if (!this.hit && R && Math.abs(R.x - this.x) < 54 && Math.abs(R.y - this.y) < 32) {
      this.hit = true; this.counterUsed = true;
      strikeRiley(this.scene, DANCER.dmg, { fromX: this.x, kb: dir * 260 });
    }
    if (this.st >= DANCER.lungeT || Math.abs(this.x - this.fromX) >= DANCER.lunge) {
      this.state = 'recover'; this.st = 0; this.cool = 0.9;
    }
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 40, b.r - 40);
  }
  takeHit(h) {
    if (!this.canBeHit) return false;
    if ((this.state === 'attack' || this.state === 'lunge') && !this.counterUsed && facingHit(this)) {
      this.countered(Math.max(h?.dmg || 1, 1));
      return true;
    }
    this.hp -= h?.dmg || 0;
    if (this.hp <= 0) { this.yieldNow(); return true; }
    if (h?.down) { this.state = 'down'; this.st = 0; } else if (this.state !== 'attack' && this.state !== 'lunge') { this.state = 'hurt'; this.st = 0; }
    return true;
  }
  sync() {
    const frame = this.state === 'attack' ? 2 : this.state === 'lunge' ? 3 : this.state === 'hurt' ? 4
      : this.state === 'down' ? 5 : this.state === 'yield' ? 6 : (Math.floor((this.st || 0) * 6) % 2);
    this.sprite.x = this.x; this.sprite.y = this.y - (this.z || 0);
    this.sprite.setOrigin?.(0.5, 0.96); this.sprite.setFrame?.(frame);
    this.sprite.setScale?.(s7Scale(this.scene, 's7dancer', DANCER.scale));
    this.sprite.flipX = this.facing < 0; this.sprite.setDepth?.(1000 + this.y);
    const fade = this.state === 'yield' ? Math.max(0, 1 - this.st / 0.8) : 1;
    this.sprite.setAlpha?.(fade * (this._s7alpha ?? 1));
    this.shadow?.setPosition?.(this.x, this.y + 2); this.shadow?.setScale?.(1.9, 0.42);
    this.shadow?.setAlpha?.(this.state === 'yield' ? 0 : 0.5 * (this._s7alpha ?? 1));
  }
}

export class Veiled extends ShaidoBase {
  constructor(scene, x, y) {
    super();
    this.scene = scene; this.type = 'veiled'; this.x = x; this.y = y; this.z = 0; this.vx = 0; this.vz = 0;
    this.hp = this.maxHp = VEILED.hp; this.alive = true; this.state = 'idle'; this.st = 0; this.facing = -1;
    this.team = 1; this.accum = 0; this.gone = false; this.entering = false; this.counterUsed = false;
    this.cool = 0.8; this.sinceLoose = 9; this.arrows = [];
    this.T = { speed: VEILED.speed, score: VEILED.score, boss: false, name: 'SHAIDO ARCHER' };
    this.name = this.T.name;
    body(this, scene, 's7veiled', 115);
  }
  update(dt) {
    if (this.scene.paused || this.scene.cutscene) return;
    if (!this.alive && this.state !== 'yield' && !this.arrows.length) return;
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    this.st += dt; this.sinceLoose += dt; if (this.cool > 0) this.cool -= dt;
    this.stepArrows(dt);
    if (!this.alive) {
      if (this.state === 'yield' && this.st > 0.8 && !this.arrows.length) this.gone = true;
      return;
    }
    if (this.callDown > 0 || this.daze > 0) { this.state = 'down'; return; }
    if (this.state === 'drop') {
      this.vz = (this.vz || 0) - 2600 * dt; this.z = Math.max(0, (this.z || 0) + this.vz * dt);
      if (this.z <= 0) { this.z = 0; this.vz = 0; this.state = 'idle'; this.st = 0; }
      return;
    }
    if (this.state === 'yield') { if (this.st > 0.8) this.gone = true; return; }
    if (this.state === 'down') { if (this.st > 0.7) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'hurt') { if (this.st > 0.22) { this.state = 'idle'; this.st = 0; } return; }
    if (this.entering) return; // Scene entry movement owns admission (backing off would fight it).
    if (this.state === 'attack') return this.drawStep();
    this.keepRange(dt);
  }
  peerJustLoosed() {
    for (const e of this.scene.enemies || []) {
      if (e && e !== this && e.type === 'veiled' && e.alive && (e.sinceLoose ?? 9) < VEILED.gap) return true;
    }
    return false;
  }
  keepRange(dt) {
    const R = this.scene.riley; if (!R) return;
    const dx = R.x - this.x, adx = Math.abs(dx);
    this.face(Math.sign(dx) || this.facing);
    if (adx < 420) this.x -= Math.sign(dx || 1) * VEILED.speed * dt;
    else if (adx > 620) this.x += Math.sign(dx) * VEILED.speed * dt;
    if (Math.abs(R.y - this.y) > 10) this.y = clamp(this.y + Math.sign(R.y - this.y) * VEILED.speed * 0.55 * dt, LANE_TOP, LANE_BOT);
    const tokens = this.scene.attackTokens?.() ?? 0;
    if (this.cool <= 0 && this.st > 0.3 && tokens < (this.scene.maxTokens || 2)
      && adx >= 300 && adx <= 700 && Math.abs(R.y - this.y) < 30 && !this.peerJustLoosed()) {
      this.state = 'attack'; this.st = 0; this.counterUsed = false;
      this.scene.kit?.onVeiledDraw?.(this);
    }
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 40, b.r - 40);
  }
  drawStep() {
    if (this.st < VEILED.draw) return;
    if (this.peerJustLoosed()) return; // hold the drawn bow until the spacing window clears
    const dir = this.facing || 1;
    this.arrows.push({ x: this.x + dir * 30, y: this.y, dir, dead: false });
    this.sinceLoose = 0;
    this.state = 'idle'; this.st = 0; this.cool = 1.6;
    this.scene.kit?.onVeiledLoose?.(this);
  }
  stepArrows(dt) {
    const R = this.scene.riley;
    const camL = (this.scene.camX || 0) - 200, camR = (this.scene.camX || 0) + 1480;
    for (const a of this.arrows) {
      a.x += a.dir * VEILED.arrowSpeed * dt;
      if (a.x < camL || a.x > camR) { a.dead = true; continue; }
      if (R?.alive && Math.abs(a.x - R.x) < 26 && Math.abs(a.y - R.y) < 24 && (R.z || 0) < 90) {
        a.dead = true;
        strikeRiley(this.scene, VEILED.dmg, { fromX: a.x, kb: a.dir * 140 });
      }
    }
    this.arrows = this.arrows.filter(a => !a.dead);
  }
  takeHit(h) {
    if (!this.canBeHit) return false;
    this.hp -= h?.dmg || 0;
    if (this.hp <= 0) { this.yieldNow(); return true; }
    if (h?.down) { this.state = 'down'; this.st = 0; } else if (this.state !== 'attack') { this.state = 'hurt'; this.st = 0; }
    return true;
  }
  sync() {
    const frame = this.state === 'attack' ? 2 : this.state === 'hurt' ? 4 : this.state === 'down' ? 5
      : this.state === 'yield' ? 6 : (Math.floor((this.st || 0) * 5) % 2);
    this.sprite.x = this.x; this.sprite.y = this.y - (this.z || 0);
    this.sprite.setOrigin?.(0.5, 0.96); this.sprite.setFrame?.(frame);
    this.sprite.setScale?.(s7Scale(this.scene, 's7veiled', VEILED.scale));
    this.sprite.flipX = this.facing < 0; this.sprite.setDepth?.(1000 + this.y);
    const fade = this.state === 'yield' ? Math.max(0, 1 - this.st / 0.8) : 1;
    this.sprite.setAlpha?.(fade * (this._s7alpha ?? 1));
    this.shadow?.setPosition?.(this.x, this.y + 2); this.shadow?.setScale?.(1.8, 0.4);
    this.shadow?.setAlpha?.(this.state === 'yield' ? 0 : 0.5 * (this._s7alpha ?? 1));
  }
}

export const SHAIDO = Object.freeze({ dancer: Dancer, veiled: Veiled });
