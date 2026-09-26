/* Engine collision for a 2.5D brawler. World: x (horizontal), y (depth lane =
   foot position on the floor band FLOOR_TOP..FLOOR_BOTTOM), z (height above the
   floor). A hitbox is { x, y, z, w, h, depth } centered on x with its bottom at
   z; overlap needs x-overlap, |dy| < depth, and z-range overlap. */
'use strict';

RWB.collide = {
  /** Tunables shared by attacks and enemies. */
  FAIR: {
    hurtDepth: 18,     // lane tolerance for enemy attacks: a side-step during a tell escapes
    swingDepth: 26,    // lane tolerance for player attacks (generous)
    activeFrames: 0.06 // seconds an attack's hitbox stays live
  },
  box(x, y, z, w, h, depth) { return { x, y, z: z || 0, w, h, depth: depth || RWB.collide.FAIR.swingDepth }; },
  /** Attack box in front of an actor facing +1 / -1: reach forward, back behind. */
  front(actor, reach, back, h, zOff, depth) {
    const f = actor.facing || 1;
    const x0 = actor.x - f * (back || 0), x1 = actor.x + f * reach;
    return { x: (x0 + x1) / 2, y: actor.y, z: (actor.z || 0) + (zOff || 0), w: Math.abs(x1 - x0), h: h || 50, depth: depth || RWB.collide.FAIR.swingDepth };
  },
  /** An actor's hurtbox from its body size (actor.bw, actor.bh). */
  hurt(actor) { return { x: actor.x, y: actor.y, z: actor.z || 0, w: actor.bw || 28, h: actor.bh || 64, depth: 0 }; },
  overlap(a, b) {
    if (Math.abs(a.x - b.x) > (a.w + b.w) / 2) return false;
    if (Math.abs(a.y - b.y) >= Math.max(a.depth || 0, b.depth || 0, 1)) return false;
    return a.z < b.z + b.h && b.z < a.z + a.h;
  },
  /** Circle-vs-hurtbox for projectiles and beams: r in x/z, depth in y. */
  circle(cx, cy, cz, r, depth, b) {
    const dx = Math.max(Math.abs(cx - b.x) - b.w / 2, 0);
    const dz = Math.max(b.z - cz, cz - (b.z + b.h), 0);
    return dx * dx + dz * dz <= r * r && Math.abs(cy - b.y) < depth;
  },
  clampLane(y) { return RWB.util.clamp(y, RWB.FLOOR_TOP, RWB.FLOOR_BOTTOM); },
  /** Debug overlay: draw boxes (world coords) when location.hash includes 'boxes'. */
  debugDraw(ctx, camX, boxes, color) {
    if (typeof location === 'undefined' || !/boxes/.test(location.hash)) return;
    ctx.save(); ctx.strokeStyle = color || '#0f0'; ctx.lineWidth = 1;
    for (const b of boxes) ctx.strokeRect(b.x - b.w / 2 - camX, b.y - b.z - b.h, b.w, b.h);
    ctx.restore();
  }
};
