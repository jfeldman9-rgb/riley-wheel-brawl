// Cultist caster (Stage 4 prep). Logic only: no Phaser, no sprite, no Stage 3 import.
// Mirrors the Stage 2 Whitecloak KO/flee alternation and the archerBusy gate.
// T5/T6 wiring builds a scene.enemies entry and calls updateFogBolts from the kit.
//
// scene contract (a plain object is enough):
//   riley { x, y, hp, alive, state, facing, attackFrame? }
//   enemies[]  (the cultist pushes itself)
//   fogBolts[] (created if missing)
//   fireballs[]? { x, y, alive? } overlap pops a bolt
// deps.summonVent({ x, y }, cultist) optional; called when a chant finishes.
// casterBusy(scene, self) is the one-chant gate, same shape as stage2 archerBusy.

export const CULTIST = Object.freeze({
  hp: 30, pref: 380, speed: 108,
  boltTell: 0.6, boltSpeed: 260, boltDmg: 10, boltCool: 1.2, maxBolts: 2,
  chant: 1, daze: 0.8,
  shoveRange: 150, shoveDmg: 5, shoveKb: 260, shoveCool: 3,
  poise: 2,
});

const READY = new Set(['approach', 'hurt', 'wait', 'idle']);

export function casterBusy(scene, self) {
  return (scene.enemies || []).some(e => e !== self && e.alive && e.type === 'cultist' && e.state === 'chant');
}
export function cultistHoldsToken(e) {
  return !!(e && e.alive && e.type === 'cultist' && (e.state === 'chant' || e.state === 'bolt'));
}
export function clearStage4Cultists(scene) {
  if (scene.fogBolts) scene.fogBolts.length = 0;
  for (const e of scene.enemies || []) if (e.type === 'cultist') { e.gone = true; e.alive = false; e.state = 'gone'; }
}

export function updateFogBolts(scene, dt) {
  const bolts = scene.fogBolts;
  if (!bolts) return;
  const R = scene.riley;
  const kept = [];
  for (const b of bolts) {
    if (!b.alive) continue;
    b.t += dt;
    b.x += b.vx * dt;
    let pop = false;
    if (R && R.attackFrame) {
      const dir = R.facing || 1;
      const dx = (b.x - R.x) * dir;
      if (dx > -40 && dx < 200 && Math.abs((R.y ?? b.y) - b.y) < 50) pop = true;
    }
    for (const f of scene.fireballs || []) {
      if (f && f.alive !== false && Math.hypot((f.x ?? 0) - b.x, (f.y ?? b.y) - b.y) < 36) pop = true;
    }
    if (pop) { b.alive = false; b.popped = true; continue; }
    const grabbed = R && (R.state === 'grabbed' || R.grabbed);
    if (!grabbed && R && R.alive !== false && R.state !== 'down' && Math.abs(R.x - b.x) < 28 && Math.abs((R.y ?? b.y) - b.y) < 24) {
      R.hp -= b.dmg;
      b.alive = false;
      b.hit = true;
      continue;
    }
    if (b.t <= 3.5) kept.push(b);
  }
  bolts.length = 0;
  for (const b of kept) bolts.push(b);
}

export class Cultist {
  constructor(scene, x, y, deps = {}) {
    this.scene = scene;
    this.deps = deps;
    this.type = 'cultist';
    this.x = x;
    this.y = y;
    this.hp = this.maxHp = CULTIST.hp;
    this.pref = CULTIST.pref;
    this.alive = true;
    this.state = 'approach';
    this.facing = -1;
    this.st = 0;
    this.cool = 0.35;
    this.shoveCool = 0;
    this.boltCool = 0;
    this.hitsTaken = 0;
    this.gone = false;
    this.vx = 0;
    scene.koCount = (scene.koCount || 0) + 1;
    this.id = scene.koCount;
    this.fleeOnKO = scene.koCount % 2 === 0;
    scene.fogBolts = scene.fogBolts || [];
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
  }
  get target() { return this.scene.riley; }
  get canBeHit() { return this.alive && !['flee', 'ko', 'gone'].includes(this.state); }
  boltRoom() {
    const winding = (this.scene.enemies || []).filter(e => e !== this && e.alive && e.type === 'cultist' && e.state === 'bolt' && !e.loosed).length;
    return this.scene.fogBolts.length + winding < CULTIST.maxBolts;
  }
  startBolt() {
    if (!this.alive || !READY.has(this.state) || !this.boltRoom()) return false;
    this.state = 'bolt';
    this.st = 0;
    this.loosed = false;
    return true;
  }
  loose() {
    this.loosed = true;
    if (this.scene.fogBolts.length >= CULTIST.maxBolts) return;
    const R = this.target;
    const dir = Math.sign((R ? R.x : this.x) - this.x) || this.facing || 1;
    this.facing = dir;
    this.scene.fogBolts.push({
      x: this.x + dir * 36, y: this.y, vx: dir * CULTIST.boltSpeed,
      dmg: CULTIST.boltDmg, kind: 'medium', alive: true, owner: this.id, t: 0,
    });
  }
  startChant() {
    if (!this.alive || !READY.has(this.state) || casterBusy(this.scene, this)) return false;
    this.state = 'chant';
    this.st = 0;
    this.chanted = false;
    return true;
  }
  finishChant() {
    if (this.chanted) return;
    this.chanted = true;
    const R = this.target;
    const at = { x: R ? R.x : this.x, y: R ? R.y : this.y };
    this.summoned = at;
    if (this.deps.summonVent) this.deps.summonVent(at, this);
    this.state = 'approach';
    this.cool = 1.2;
  }
  startShove() {
    if (!this.alive || this.shoveCool > 0 || !READY.has(this.state)) return false;
    const R = this.target;
    if (!R) return false;
    const dir = Math.sign(R.x - this.x) || this.facing || 1;
    this.facing = dir;
    this.state = 'shove';
    this.st = 0;
    this.shoveCool = CULTIST.shoveCool;
    R.hp -= CULTIST.shoveDmg;
    R.vx = dir * CULTIST.shoveKb;
    return true;
  }
  takeHit(h, from) {
    if (!this.canBeHit) return false;
    this.hp -= h.dmg || 0;
    if (this.hp <= 0) { this.defeat(from); return true; }
    if (this.state === 'chant') {
      this.chanted = false;
      if (h.kind === 'heavy' || h.down) this.knockdown(from);
      else { this.state = 'dazed'; this.st = 0; }
      return true;
    }
    if (h.kind === 'heavy' || h.down || ++this.hitsTaken >= CULTIST.poise) { this.knockdown(from); return true; }
    this.state = 'hurt';
    this.st = 0;
    return true;
  }
  knockdown(from) {
    this.hitsTaken = 0;
    this.state = 'down';
    this.st = 0;
    this.vx = (Math.sign(this.x - (from && from.x != null ? from.x : this.x)) || 1) * 260;
  }
  defeat(from) {
    this.alive = false;
    this.knockdown(from);
  }
  think(dt) {
    const R = this.target;
    if (!R || R.alive === false) return;
    const dx = R.x - this.x, adx = Math.abs(dx);
    this.facing = Math.sign(dx) || this.facing;
    if (adx <= CULTIST.shoveRange && this.shoveCool <= 0) { this.startShove(); return; }
    if (this.boltCool <= 0 && adx > 160 && adx < 720 && this.boltRoom()) { this.startBolt(); return; }
    if (this.cool <= 0 && !casterBusy(this.scene, this)) { this.startChant(); return; }
    this.cool = Math.max(0, this.cool - dt);
    const side = Math.sign(this.x - R.x) || 1;
    const want = R.x + side * this.pref;
    this.x += Math.sign(want - this.x) * Math.min(Math.abs(want - this.x), CULTIST.speed * dt);
  }
  update(dt) {
    if (this.gone) return;
    this.shoveCool = Math.max(0, this.shoveCool - dt);
    this.boltCool = Math.max(0, this.boltCool - dt);
    switch (this.state) {
      case 'bolt':
        this.st += dt;
        if (!this.loosed && this.st >= CULTIST.boltTell) this.loose();
        if (this.st >= CULTIST.boltTell + 0.15) { this.state = 'approach'; this.boltCool = CULTIST.boltCool; this.loosed = false; }
        return;
      case 'chant':
        this.st += dt;
        if (this.st >= CULTIST.chant) this.finishChant();
        return;
      case 'dazed':
        this.st += dt;
        if (this.st >= CULTIST.daze) { this.state = 'approach'; this.cool = 0.4; }
        return;
      case 'shove':
        this.st += dt;
        if (this.st >= 0.28) { this.state = 'backstep'; this.st = 0; this.vx = -this.facing * 220; }
        return;
      case 'backstep':
        this.st += dt;
        this.x += this.vx * dt;
        if (this.st >= 0.35) { this.state = 'approach'; this.vx = 0; }
        return;
      case 'hurt':
        this.st += dt;
        if (this.st >= 0.3) this.state = 'approach';
        return;
      case 'down':
        this.st += dt;
        if (this.st <= 0.85) return;
        if (!this.alive) {
          if (this.fleeOnKO) {
            this.state = 'flee';
            this.st = 0;
            this.fleeDir = Math.sign(this.x - (this.target ? this.target.x : this.x)) || 1;
          } else { this.state = 'ko'; this.st = 0; this.starred = true; }
        } else { this.state = 'getup'; this.st = 0; }
        return;
      case 'getup':
        this.st += dt;
        if (this.st >= 0.4) this.state = 'approach';
        return;
      case 'flee':
        this.st += dt;
        this.x += this.fleeDir * 330 * dt;
        if (this.st > 2.2) this.gone = true;
        return;
      case 'ko':
        this.st += dt;
        if (this.st > 1.9) this.gone = true;
        return;
      default:
        this.think(dt);
    }
  }
}
