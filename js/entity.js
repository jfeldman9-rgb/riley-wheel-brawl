/* Engine entity base: position in the 2.5D world, velocity, gravity on z,
   facing, a string state machine with a timer, hit points, invulnerability,
   knockback, and a soft floor shadow. Content subclasses override
   think(dt, input) and draw(ctx, camX); the scene owns the lists. */
'use strict';

RWB.Entity = class Entity {
  constructor(scene, x, y, opts = {}) {
    this.g = scene;
    this.x = x; this.y = RWB.collide.clampLane(y); this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.facing = opts.facing || 1;
    this.bw = opts.bw || 28; this.bh = opts.bh || 64;   // hurtbox size
    this.hpMax = this.hp = opts.hp || 30;
    this.invuln = 0; this.dead = false; this.remove = false;
    this.state = 'idle'; this.stateT = 0;
    this.gravity = opts.gravity != null ? opts.gravity : 900;
    this.flying = !!opts.flying;                       // flying actors hold z instead of falling
    this.friction = opts.friction != null ? opts.friction : 8;
  }
  setState(s) { if (this.state !== s) { this.prevState = this.state; this.state = s; this.stateT = 0; } }
  get grounded() { return this.z <= 0 && !this.flying; }
  hurtbox() { return RWB.collide.hurt(this); }
  /** Damage entry point. Returns true if the hit landed. */
  takeHit(dmg, fromX, opts = {}) {
    if (this.dead || this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - dmg);
    const dir = fromX < this.x ? 1 : -1;
    this.vx = dir * (opts.kb != null ? opts.kb : 80);
    if (opts.launch && !this.flying) { this.vz = opts.launch; this.z = Math.max(this.z, 0.01); }
    if (this.hp <= 0) { this.dead = true; this.onDeath && this.onDeath(opts); }
    else this.onHurt && this.onHurt(dmg, opts);
    return true;
  }
  /** Physics step. Subclasses call super.update(dt) after setting intent. */
  update(dt) {
    this.stateT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.x += this.vx * dt;
    this.y = RWB.collide.clampLane(this.y + this.vy * dt);
    if (!this.flying) {
      if (this.z > 0 || this.vz > 0) {
        this.vz -= this.gravity * dt; this.z += this.vz * dt;
        if (this.z <= 0) { this.z = 0; this.vz = 0; this.onLand && this.onLand(); }
      }
      if (this.z <= 0) { const k = Math.max(0, 1 - dt * this.friction); this.vx *= k; this.vy *= k; }
    } else {
      this.z += this.vz * dt;
      if (this.z < 0) { this.z = 0; this.vz = 0; this.onLand && this.onLand(); }
    }
  }
  drawShadow(ctx, camX, rx) {
    const profiles = RWB.Entity.shadowProfiles;
    const style = profiles[this.g && this.g.levelIndex || 0] || profiles[0];
    const radius = (rx || this.bw * 0.8) * style.width;
    const zScale = Math.max(0.25, 1 - (this.z || 0) / 160);
    ctx.save();
    ctx.globalAlpha *= style.opacity;
    RWB.draw.shadow(ctx, this.x - camX, this.y, radius, radius * style.depth, this.z);
    // A restrained ambient tint sits inside the contact area. It follows the
    // same altitude fade and depth ordering as the existing cast shadow.
    ctx.globalAlpha *= 0.12 * zScale;
    ctx.fillStyle = style.tone;
    ctx.beginPath();
    ctx.ellipse(this.x - camX, this.y, radius * zScale * 0.78, radius * style.depth * zScale * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  draw(ctx, camX) { /* content */ }
};
// Snowlight, cool stone, violet ruins, warm Tear, and the blue-black roof.
RWB.Entity.shadowProfiles = [
  { width: 1.04, depth: 0.32, opacity: 0.92, tone: '#29374d' },
  { width: 0.98, depth: 0.34, opacity: 0.96, tone: '#1c283a' },
  { width: 1.06, depth: 0.30, opacity: 0.9, tone: '#342644' },
  { width: 0.97, depth: 0.35, opacity: 0.98, tone: '#3a2b20' },
  { width: 1.03, depth: 0.29, opacity: 1, tone: '#201a37' }
];
/** Depth sort: distant lanes (smaller y) draw first. */
RWB.Entity.sortByDepth = list => list.sort((a, b) => a.y - b.y || a.z - b.z);
