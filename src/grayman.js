// Gray Man. A plain assassin the eye slides off. One live. No grab.
import { clamp, LANE_TOP, LANE_BOT } from './config.js';
import { lightNear } from './myrddraal.js';
import { strikeRiley } from './stage6-hurt.js';
import { substeps } from './stage5-clock.js';
import { queryFlag } from './debug-flag.js';
import { q } from './config.js';

export const GRAY = Object.freeze({
  hp: 34, tell: 0.6, reach: 320, lungeT: 0.26, dmg: 14, recover: 0.8, mul: 1.3,
  seen: 240, light: 260, hide: 5, score: 420, speed: 128, cap: 1,
});
const ATK = new Set(['combo1', 'combo2', 'combo3', 'back', 'runkick', 'airkick', 'knee']);

function stub() {
  const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setVisible() { return o; }, destroy() {} };
  return o;
}
function body(e, scene) {
  const add = scene.add;
  e.shadow = add?.image ? add.image(e.x, e.y, 'shadow') : stub();
  e.sprite = add?.sprite ? add.sprite(e.x, e.y, 's6gray', 0) : stub();
  e.glint = add?.image ? add.image(e.x, e.y - 80, 'core') : stub();
  e.shadow.setDepth?.(900); e.sprite.setDepth?.(1000 + e.y); e.glint.setDepth?.(1200);
  e.glint.setBlendMode?.('ADD');
}

export function grayVisible(e) {
  if (!e || e.age >= GRAY.hide) return true;
  const R = e.scene?.riley;
  if (R && Math.hypot((R.x || 0) - e.x, (R.y || 0) - e.y) <= GRAY.seen) return true;
  if (lightNear(e.scene, e.x, GRAY.light)) return true;
  return false;
}

export class GrayMan {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'grayman'; this.x = x; this.y = y; this.z = 0; this.vx = 0;
    this.hp = this.maxHp = GRAY.hp; this.alive = true; this.state = 'idle'; this.st = 0; this.facing = -1;
    this.team = 1; this.age = 0; this.accum = 0; this.gone = false; this.entering = false;
    this.counterUsed = false; this.hit = false; this.fromX = x;
    this.def = { shadowW: 110, team: 1 };
    this.T = { speed: GRAY.speed, score: GRAY.score, boss: false, name: 'GRAY MAN' };
    const live = (scene.enemies || []).filter(o => o !== this && o.alive && o.type === 'grayman').length;
    scene.koCount = (scene.koCount || 0) + 1; this.id = scene.koCount;
    if (live >= GRAY.cap) { this.alive = false; this.gone = true; this.capped = true; }
    body(this, scene);
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
  }
  get canBeHit() { return this.alive && !this.entering && !['dead', 'down'].includes(this.state); }
  get token() { return this.alive && (this.state === 'attack' || this.state === 'lunge'); }
  dropIn() { this.z = 240; this.vz = 0; this.state = 'drop'; this.st = 0; this.entering = false; }
  face(dir) { if (dir) { this.facing = dir; if (this.sprite) this.sprite.flipX = dir < 0; } }
  update(dt) {
    if (this.scene.paused || this.scene.cutscene || !this.alive && this.state !== 'dead') return;
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    this.st += dt; this.age += dt;
    if (this.randDown > 0 || this.daze > 0) { this.state = 'down'; return; }
    if (this.state === 'drop') {
      this.vz = (this.vz || 0) - 2600 * dt; this.z = Math.max(0, (this.z || 0) + this.vz * dt);
      if (this.z <= 0) { this.z = 0; this.vz = 0; this.state = 'idle'; this.st = 0; }
      return;
    }
    if (this.state === 'dead') { if (this.st > 0.8) this.gone = true; return; }
    if (this.state === 'down') { if (this.st > 0.7) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'hurt') { if (this.st > 0.2) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'recover') { if (this.st >= GRAY.recover) { this.state = 'idle'; this.st = 0; } return; }
    if (this.state === 'attack') return this.tell(dt);
    if (this.state === 'lunge') return this.lunge(dt);
    this.walk(dt);
  }
  walk(dt) {
    const R = this.scene.riley; if (!R) return;
    const dx = R.x - this.x; this.face(Math.sign(dx) || this.facing);
    if (Math.abs(R.y - this.y) > 10) this.y = clamp(this.y + Math.sign(R.y - this.y) * 70 * dt, LANE_TOP, LANE_BOT);
    const tokens = this.scene.attackTokens?.() || 0;
    if (Math.abs(dx) < 280 && Math.abs(R.y - this.y) < 28 && this.st > 0.4 && tokens < (this.scene.maxTokens || 2)) {
      this.state = 'attack'; this.st = 0; this.counterUsed = false; this.scene.kit?.onGrayTell?.(this);
      return;
    }
    if (Math.abs(dx) > 70) this.x += Math.sign(dx) * GRAY.speed * dt;
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 36, b.r - 36);
  }
  tell() {
    if (this.st >= GRAY.tell) {
      this.state = 'lunge'; this.st = 0; this.hit = false; this.fromX = this.x; this.counterUsed = false;
    }
  }
  lunge(dt) {
    const R = this.scene.riley;
    if (R && !this.counterUsed && R.attackFrame && ATK.has(R.state) && Math.sign(this.x - R.x) === (R.facing || 1) && Math.abs(R.y - this.y) < 36) {
      this.counterUsed = true; this.state = 'down'; this.st = 0; this.scene.kit?.onCounter?.(this, 'gray');
      this.scene.hud?.flashText?.('COUNTER!');
      return;
    }
    const dir = this.facing || 1;
    const step = (GRAY.reach / GRAY.lungeT) * dt;
    this.x += dir * step;
    if (!this.hit && R && Math.abs(R.x - this.x) < 48 && Math.abs(R.y - this.y) < 30) {
      this.hit = true;
      strikeRiley(this.scene, GRAY.dmg, { fromX: this.x, kb: dir * 180, down: false });
    }
    if (this.st >= GRAY.lungeT || Math.abs(this.x - this.fromX) >= GRAY.reach) {
      this.state = this.hit ? 'idle' : 'recover'; this.st = 0;
    }
    const b = this.scene.bounds; if (b) this.x = clamp(this.x, b.l + 36, b.r - 36);
  }
  takeHit(h) {
    if (!this.canBeHit) return false;
    let dmg = h?.dmg || 0;
    if (this.state === 'recover') dmg *= GRAY.mul;
    if (this.state === 'lunge' && !this.counterUsed) {
      const R = this.scene.riley;
      if (R?.attackFrame && Math.sign(this.x - R.x) === (R.facing || 1)) {
        this.counterUsed = true; this.state = 'down'; this.st = 0;
        this.hp -= Math.max(dmg, 1) * GRAY.mul;
        this.scene.kit?.onCounter?.(this, 'gray'); this.scene.hud?.flashText?.('COUNTER!');
        if (this.hp <= 0) this.die();
        return true;
      }
    }
    this.hp -= dmg;
    if (this.hp <= 0) { this.die(); return true; }
    if (h?.down) { this.state = 'down'; this.st = 0; } else if (this.state === 'idle' || this.state === 'recover') { this.state = 'hurt'; this.st = 0; }
    return true;
  }
  die() {
    if (!this.alive) return;
    this.alive = false; this.hp = 0; this.state = 'dead'; this.st = 0;
    this.scene.onEnemyDie?.(this);
  }
  releaseHold() {}
  physics() { this.y = clamp(this.y, LANE_TOP, LANE_BOT); }
  sync() {
    const vis = grayVisible(this), ash = this.state === 'dead';
    this.sprite.x = this.x; this.sprite.y = this.y - (this.z || 0);
    this.sprite.setOrigin?.(0.5, 0.96); this.sprite.setFrame?.(this.state === 'lunge' ? 3 : this.state === 'attack' ? 2 : this.state === 'down' || ash ? 5 : this.state === 'hurt' ? 4 : 1);
    this.sprite.setScale?.(3.4); this.sprite.flipX = this.facing < 0;
    this.sprite.setAlpha?.(ash ? Math.max(0, 1 - this.st) : vis ? 1 : 0.18);
    this.sprite.setDepth?.(1000 + this.y);
    this.shadow?.setPosition?.(this.x, this.y + 2); this.shadow?.setAlpha?.(ash || !vis ? 0 : 0.45); this.shadow?.setScale?.(1.8, 0.45);
    const show = this.state === 'attack';
    this.glint?.setPosition?.(this.x + this.facing * 28, this.y - 78);
    this.glint?.setVisible?.(show); this.glint?.setAlpha?.(show ? 1 : 0); this.glint?.setScale?.(0.35);
    if (queryFlag(q, 'debug') && this.sprite.setTint) this.sprite.setTint(0x665544);
  }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.glint?.destroy?.(); this.alive = false; this.gone = true; }
}
