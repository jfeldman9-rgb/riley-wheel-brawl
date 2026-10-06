// Base fighter: position on the ground plane (x, y = depth lane) plus height z for jumps and launches.
import { LANE_TOP, LANE_BOT, WORLD_W, clamp } from './config.js';
import { ANIM_PIVOT_X } from './anim-pivot.js';
export class Fighter {
  constructor(scene, def, x, y) {
    this.scene = scene; this.def = def; this.meta = scene.metas[def.key];
    this.x = x; this.y = y; this.z = 0; this.vz = 0; this.vx = 0; this.vy = 0; this.facing = def.native; this.st = 0; this.state = '';
    this.hp = this.maxHp = def.hp; this.alive = true; this.team = def.team; this.hitIds = new Set(); this.shudder = 0;
    const m = this.meta, sc = def.scale / m.scale;
    this.shadow = scene.add.image(x, y, 'shadow').setScale(def.shadowW / 64, def.shadowW * 0.22 / 64).setAlpha(0.9);
    this.sprite = scene.add.sprite(x, y, m.pages[m.anims[0].pages[0]], m.anims[0].frames[0]).setLighting(true).setScale(sc);
    this.sprite.setOrigin(def.anchorX, m.baseline / m.canvas[1]);
    this.cur = '';
  }
  play(name, ts = 1, restart = true) {
    const key = this.def.prefix + name; if (!this.scene.anims.exists(key)) { console.warn('missing anim', key); return; }
    if (!restart && this.cur === key) { this.sprite.anims.timeScale = ts; return; }
    this.cur = key; this.sprite.play(key); this.sprite.anims.timeScale = ts;
    const px = ANIM_PIVOT_X[key]; if (this.sprite.setOrigin) this.sprite.setOrigin(px ?? this.def.anchorX, this.meta.baseline / this.meta.canvas[1]);
  }
  /** index of the current frame inside the current animation */
  get fi() { const c = this.sprite.anims.currentFrame; return c ? c.index - 1 : 0; }
  get done() { return !this.sprite.anims.isPlaying; }
  setState(s, anim, ts) { this.state = s; this.st = 0; this.hitIds.clear(); if (anim) this.play(anim, ts); }
  face(dir) { if (dir) { this.facing = dir; this.sprite.flipX = dir !== this.def.native; } }
  get airborne() { return this.z > 0.5; }
  physics(dt) {
    if (this.vx) { this.x += this.vx * dt; if (this.z <= 0) this.vx *= Math.pow(this.def.friction || 0.004, dt); if (Math.abs(this.vx) < 6) this.vx = 0; }
    if (this.vy) { this.y += this.vy * dt; }
    if (this.z > 0 || this.vz > 0) { this.vz -= 2600 * dt * (this.gravMul || 1); this.z += this.vz * dt; if (this.z <= 0) { this.z = 0; const v = this.vz; this.vz = 0; this.onLand && this.onLand(v); } }
    this.y = clamp(this.y, LANE_TOP, LANE_BOT);
    const cam = this.scene.bounds; this.x = clamp(this.x, cam.l + 40, cam.r - 40);
  }
  sync() {
    const s = this.sprite; s.x = this.x + (this.shudder ? (Math.random() * 2 - 1) * 2 : 0); s.y = this.y - this.z; s.setDepth(1000 + this.y);
    const k = Math.max(0.35, 1 - this.z / 500);
    // Keep a fading corpse's shadow in sync. Live Riley's invulnerability blink
    // must not make his ground shadow flicker with the sprite.
    const shadowAlpha = this.state === 'dead' ? s.alpha * 0.8 : 0.9 * k;
    this.shadow.setPosition(this.x, this.y + 2).setDepth(900).setAlpha(shadowAlpha).setScale(this.def.shadowW / 64 * k, this.def.shadowW * 0.22 / 64 * k);
  }
  destroy() { this.sprite.destroy(); this.shadow.destroy(); }
}
