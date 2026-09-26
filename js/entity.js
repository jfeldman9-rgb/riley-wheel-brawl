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
  drawShadow(ctx, camX, rx) { RWB.draw.shadow(ctx, this.x - camX, this.y, rx || this.bw * 0.8, null, this.z); }
  draw(ctx, camX) { /* content */ }
};
/** Depth sort: farther lanes (smaller y) draw first. */
RWB.Entity.sortByDepth = list => list.sort((a, b) => a.y - b.y || a.z - b.z);
