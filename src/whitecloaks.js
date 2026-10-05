// Stage 2 enemies: the Children of the Light. Whitecloak zealot (shield guard + shield charge), Whitecloak archer
// (keeps its distance, arrows in its lane, lobbed arrows on a ground marker) and the boss Jaret Byar (three phases:
// sword and shield with a parry bait; archer volleys that sweep whole lane bands; rage, torching the barn).
// Kid-safe: a beaten Whitecloak is knocked out (dizzy stars, then gone) or picks himself up and runs off; Byar
// kneels, then retreats. All sprites face LEFT natively like the Trollocs; the game mirrors them to turn.
import { Enemy, TYPES } from './enemies.js';
import { clamp, rand, LANE_TOP, LANE_BOT } from './config.js';
import { sfx, say } from './audio.js';
import { VOLLEY } from './stages.js';
const D = (key, scale, anchorX, hp, shadowW) => ({ key, prefix: key + '_', native: -1, scale, anchorX, hp, team: 1, shadowW });
Object.assign(TYPES, {
  zealot: { def: D('zealot', 0.55, 0.5, 46, 150), name: 'WHITECLOAK ZEALOT', speed: 104, pref: 185, cool: [1.4, 2.4], score: 400,
    atk: { anim: 'slash', active: [2], x0: 20, x1: 235, z0: 0, z1: 220, dmg: 10, kind: 'medium', kb: 240, sfx: 'blade' } },
  archer: { def: D('archer', 0.55, 0.5, 30, 130), name: 'WHITECLOAK ARCHER', speed: 118, pref: 470, cool: [2.2, 3.2], score: 350, ranged: true,
    atk: { anim: 'shoot', active: [], x0: 0, x1: 0, z0: 0, z1: 0, dmg: 8, kind: 'medium', kb: 200 } },
  byar: { def: D('byar', 0.54, 0.5, 400, 190), name: 'JARET BYAR', speed: 96, pref: 205, cool: [1.0, 1.7], score: 6000, boss: true,
    atk: { anim: 'combo', active: [2, 5], x0: 20, x1: 265, z0: 0, z1: 240, dmg: 12, kind: 'medium', kb: 300, sfx: 'blade' } },
});
export const ZEALOT = Object.freeze({ blocksToBreak: 3, blockReset: 2.5, breakTime: 0.8, chargeUp: 0.5, chargeSpeed: 540, chargeMax: 1.35, dazed: 1.8, dazedDmg: 1.3,
  charge: { x0: -10, x1: 150, z0: 0, z1: 220, dmg: 12, kind: 'heavy', kb: 440, launch: 360, down: true } });
export const ARCHER = Object.freeze({ keep: [420, 520], tooClose: 230, backstep: 430, backCool: 2.4, releaseFrame: 4, skyRelease: 3, arrowSpeed: 760, arrowZ: 150,
  arrowDmg: 8, skyDmg: 9, skyDelay: 1.15, skyChance: 0.35 });
export const BYAR = Object.freeze({ parry: 1.5, open: 0.9, openDmg: 1.4, parryEvery: [5, 8], torchEvery: [4.5, 6.5], rushSpeed: 470, rushMax: 1.0, rushUp: 0.22,
  riposte: { anim: 'riposte', active: [2, 3], x0: 0, x1: 285, z0: 0, z1: 240, dmg: 14, kind: 'heavy', kb: 420, launch: 340, down: true, sfx: 'blade' },
  rush: { x0: -10, x1: 160, z0: 0, z1: 240, dmg: 12, kind: 'heavy', kb: 480, launch: 380, down: true },
  thrust: { dmg: 14, kind: 'heavy', down: true, kb: 380 } });
// light / medium hits from the front without knockdown are caught on a raised shield
const SHIELDABLE = h => !h.power && !h.down && (h.kind === 'light' || h.kind === 'medium');

/** shared Whitecloak behaviour: knocked out (stars) or flees instead of a Trolloc's fade */
export class Whitecloak extends Enemy {
  constructor(scene, type, x, y) {
    super(scene, type, x, y);
    // alternate KO / run away, counted per run so a seeded run is reproducible
    scene.koCount = (scene.koCount || 0) + 1; this.fleeOnKO = scene.koCount % 2 === 0;
  }
  get canBeHit() { return super.canBeHit && !['flee', 'fleeGetup', 'slipping'].includes(this.state); }
  update(dt) {
    switch (this.state) {
      case 'fleeGetup': this.st += dt; if (this.done) { this.setState('flee', 'flee'); this.fleeDir = Math.sign(this.x - this.target.x) || 1; this.face(this.fleeDir); } return;
      case 'flee': {
        this.st += dt; this.x += this.fleeDir * 330 * dt;
        const cam = this.scene.camX ?? 0;
        if (this.st > 1.6) { const a = Math.max(0, 1 - (this.st - 1.6) / 0.6); this.sprite.setAlpha(a); this.shadow.setAlpha(a * 0.8); }
        if (this.st > 2.2 || this.x < cam - 160 || this.x > cam + 1440) this.gone = true;
        return;
      }
      case 'slipping': this.st += dt; if (this.st > 2.4) { this.setState('fleeGetup', 'getup'); } return;
      case 'dead': this.st += dt; if (!this.starred) { this.starred = true; this.scene.kit?.koStars(this); } if (this.st > 1.3) { this.sprite.setAlpha(Math.max(0, 1 - (this.st - 1.3) / 0.6)); this.shadow.setAlpha(this.sprite.alpha * 0.8); if (this.st > 1.9) this.gone = true; } return;
    }
    super.update(dt);
  }
  physics(dt) {
    if (this.state === 'flee' || this.state === 'fleeGetup') { this.z = 0; this.vz = 0; this.vx = 0; this.y = clamp(this.y, LANE_TOP, LANE_BOT); return; }
    super.physics(dt);
  }
  downed(dt) {
    const lieT = 0.85;
    if (!this.alive && this.fleeOnKO && this.done && this.z <= 0 && this.st > lieT) { this.landed = false; this.setState('fleeGetup', 'getup'); return; }
    super.downed(dt);
  }
}

// ---------------- Whitecloak zealot ----------------
export class Zealot extends Whitecloak {
  constructor(scene, x, y) { super(scene, 'zealot', x, y); this.blocks = 0; this.blockT = 0; this.blockAge = 9; this.nextCharge = rand(2.5, 4.5); }
  get guarding() { return ['approach', 'wait', 'block'].includes(this.state) && !this.entering; }
  update(dt) {
    if (this.blockT > 0) this.blockT -= dt;
    this.blockAge += dt; if (this.blockAge > ZEALOT.blockReset) this.blocks = 0;
    switch (this.state) {
      case 'block': this.st += dt; this.cool -= dt; if (this.st > 0.26) this.setState('approach', 'guard'); return;
      case 'guardbreak': this.st += dt; if (this.st > ZEALOT.breakTime) { this.blocks = 0; this.setState('approach', 'walk'); this.cool = rand(0.3, 0.7); } return;
      case 'chargeup': this.st += dt; if (this.st > ZEALOT.chargeUp) { this.setState('charge', 'charge'); this.chargeDir = this.facing; this.hitIds.clear(); sfx.whoosh(); } return;
      case 'charge': this.st += dt; return this.charging(dt);
      case 'slam': this.st += dt; if (this.done) { this.setState('approach', 'walk'); this.cool = rand(1.0, 1.6); } return;
      case 'dazed': this.st += dt; if (this.st > ZEALOT.dazed) { this.setState('approach', 'walk'); this.cool = 0.4; } return;
    }
    super.update(dt);
  }
  think(dt) {
    if (this.entering) return;
    this.nextCharge -= dt;
    const R = this.target, dx = R.x - this.x, ady = Math.abs(R.y - this.y);
    if (this.cool <= 0 && this.nextCharge <= 0 && Math.abs(dx) > 300 && Math.abs(dx) < 760 && ady < 30 && R.alive && R.state !== 'down' && this.scene.attackTokens() < this.scene.maxTokens) return this.startCharge();
    const sl = this.slot(), tdx = sl.x - this.x, tdy = sl.y - this.y;
    this.face(Math.sign(dx));
    const tokens = this.scene.attackTokens();
    if (Math.abs(tdx) < 34 && ady < 16 && this.cool <= 0 && tokens < this.scene.maxTokens && R.alive && R.state !== 'down') return this.startAttack();
    const hover = (this.cool > 0 || tokens >= this.scene.maxTokens) ? sl.side * 70 : 0, tx = tdx + hover;
    const sep = this.scene.separation(this);
    const mx = Math.abs(tx) > 8 ? Math.sign(tx) : 0, my = Math.abs(tdy) > 6 ? Math.sign(tdy) : 0;
    const sp = this.T.speed * (Math.abs(tx) > 400 ? 1.25 : 1);
    this.x += (mx * sp + sep) * dt; this.y += my * sp * 0.55 * dt;
    // shield up while holding position; walking keeps it raised too (painted that way)
    if (mx || my) this.play('walk', mx && Math.sign(mx) !== this.facing ? 0.75 : 1, false); else this.play('guard', 1, false);
  }
  startCharge() { this.face(Math.sign(this.target.x - this.x)); this.setState('chargeup', 'chargeup'); this.nextCharge = rand(5, 8); this.cool = rand(1.6, 2.4); this.scene.kit?.telegraph(this); }
  charging(dt) {
    this.x += this.chargeDir * ZEALOT.chargeSpeed * dt;
    this.scene.resolveAttack(this, ZEALOT.charge);
    if (this.hitIds.has('riley')) { this.setState('slam', 'slam'); this.vx = this.chargeDir * 120; return; }
    if (this.st % 0.18 < dt) this.scene.fx.snowPuff.emitParticleAt(this.x - this.chargeDir * 40, this.y, 3);
    const b = this.scene.bounds;
    if ((this.chargeDir > 0 && this.x >= b.r - 70) || (this.chargeDir < 0 && this.x <= b.l + 70)) {
      // shield-first into the wall: dazed, open to anything
      this.setState('dazed', 'dazed'); this.vx = -this.chargeDir * 140; this.blocks = 0;
      this.scene.fx.impact('heavy', this.x + this.chargeDir * 70, this.y - 170, this.chargeDir); sfx.clang(); sfx.impact();
      this.scene.wallHit(this.x + this.chargeDir * 70);
      return;
    }
    if (this.st > ZEALOT.chargeMax) { this.setState('slam', 'slam'); }
  }
  takeHit(h, from) {
    if (!this.canBeHit) return false;
    const front = (Math.sign(from.x - this.x) || 1) === this.facing;
    if (front && this.guarding && SHIELDABLE(h)) return this.block(from);
    if (front && this.guarding && !h.power) sfx.clang();   // heavy hit / fireball smashes through the guard
    if (this.state === 'dazed') h = Object.assign({}, h, { dmg: h.dmg * ZEALOT.dazedDmg });
    else if (this.state === 'charge' && !h.down && h.kind !== 'heavy' && h.kind !== 'finisher') {
      this.hp -= h.dmg * 0.5; this.shudder = 0.1; this.flashArmor(); if (this.hp <= 0) this.die(Math.sign(this.x - from.x) || 1, h); return true;
    }
    return super.takeHit(h, from);
  }
  /** a blocked hit does no damage, builds no combo; the third block in a row breaks the guard */
  block(from) {
    if (this.blockT > 0) return false;
    this.blockT = 0.14; this.blocks++; this.blockAge = 0;
    const dir = Math.sign(this.x - from.x) || 1;
    sfx.clang(); this.scene.fx.impact('light', this.x - dir * 70, this.y - 150, dir);
    if (this.blocks >= ZEALOT.blocksToBreak) { this.setState('guardbreak', 'guardbreak'); this.vx = dir * 160; this.scene.kit?.onGuardBreak(this); }
    else { this.setState('block', 'block'); this.vx = dir * 110; this.scene.kit?.onBlock(this); }
    return false;
  }
  die(dir, h) {
    // the one fresh joke: the first zealot beaten in the market slips in the mud instead of falling
    if (this.z <= 0 && this.state !== 'held' && this.scene.kit?.claimMudJoke(this)) {
      this.heldBy = null; this.alive = false; this.hitsTaken = 0; this.vx = dir * 140; this.setState('slipping', 'slip'); this.face(-dir);
      this.scene.onEnemyDie(this); this.scene.kit.mudJoke(this); return;
    }
    super.die(dir, h);
  }
}

// ---------------- Whitecloak archer ----------------
export class Archer extends Whitecloak {
  constructor(scene, x, y) { super(scene, 'archer', x, y); this.backCool = 0; this.skyCool = rand(3, 6); this.cool = rand(1.0, 1.8); }
  update(dt) {
    switch (this.state) {
      case 'shoot': this.st += dt; this.cool -= dt;
        if (this.fi >= ARCHER.releaseFrame && !this.loosed) { this.loosed = true; this.scene.kit?.fireArrow(this); }
        if (this.done) { this.loosed = false; this.cool = rand(...this.T.cool); this.setState('approach', 'walk'); } return;
      case 'skyshot': this.st += dt; this.cool -= dt;
        if (this.fi >= ARCHER.skyRelease && !this.loosed) { this.loosed = true; this.scene.kit?.loseSkyArrow(this); }
        if (this.done) { this.loosed = false; this.cool = rand(...this.T.cool); this.setState('approach', 'walk'); } return;
      case 'backstep': this.st += dt; if (this.done) { this.setState('approach', 'walk'); } return;
    }
    super.update(dt);
  }
  think(dt) {
    if (this.entering) return;
    this.backCool -= dt; this.skyCool -= dt;
    const R = this.target, s = this.scene, dx = R.x - this.x, adx = Math.abs(dx), side = Math.sign(this.x - R.x) || 1;
    this.face(Math.sign(dx) || this.facing);
    if (adx < ARCHER.tooClose && this.backCool <= 0 && R.alive) return this.startBackstep(side);
    // stand off at keep range on its own side of Riley; a cornered archer holds the wall
    const keep = (ARCHER.keep[0] + ARCHER.keep[1]) / 2;
    let wantX = R.x + side * keep; wantX = clamp(wantX, s.bounds.l + 70, s.bounds.r - 70);
    const wantY = clamp(R.y + this.slotOff * 0.4, LANE_TOP + 4, LANE_BOT - 4);
    const tdx = wantX - this.x, tdy = wantY - this.y, ady = Math.abs(R.y - this.y);
    const ready = this.cool <= 0 && R.alive && R.state !== 'down' && adx > 260 && adx < 800 && !s.kit?.archerBusy(this);
    if (ready && this.skyCool <= 0 && s.zoneI >= 1 && Math.random() < ARCHER.skyChance) return this.startSkyshot();
    if (ready && ady < 26 && Math.abs(tdx) < 170) return this.startShoot();
    const mx = Math.abs(tdx) > 10 ? Math.sign(tdx) : 0, my = Math.abs(tdy) > 6 ? Math.sign(tdy) : 0;
    const sep = s.separation(this);
    this.x += (mx * this.T.speed + sep) * dt; this.y += my * this.T.speed * 0.6 * dt;
    if (mx || my) this.play('walk', mx && Math.sign(mx) !== this.facing ? 0.8 : 1, false); else this.play('walk', 0.0001, false);
  }
  startShoot() { this.face(Math.sign(this.target.x - this.x)); this.setState('shoot', 'shoot'); this.loosed = false; sfx.bowDraw(); }
  startSkyshot() { this.face(Math.sign(this.target.x - this.x)); this.setState('skyshot', 'skyshot'); this.loosed = false; this.skyCool = rand(5, 8); sfx.bowDraw(); this.scene.kit?.markSky(this); }
  startBackstep(side) { this.setState('backstep', 'backstep'); this.vx = side * ARCHER.backstep; this.backCool = ARCHER.backCool; }
}

// ---------------- Jaret Byar, Child of the Light ----------------
export class Byar extends Whitecloak {
  constructor(scene, x, y) {
    super(scene, 'byar', x, y); this.fleeOnKO = false;
    this.phase = 1; this.cool = 1.6; this.nextParry = 3.5; this.nextVolley = 0; this.nextTorch = 0; this.pendingRage = false; this.wake = 0;
    this.T = Object.assign({}, TYPES.byar); this.parries = 0; this.ripostes = 0; this.volleys = 0; this.torches = 0;
  }
  get grabbable() { return false; }
  get canBeHit() { return this.alive && !this.entering && !['dead', 'down', 'getup', 'defeated', 'retreat'].includes(this.state); }
  poise() { return 9; }
  update(dt) {
    if (this.state === 'getup' && this.done) { this.setState('approach', 'walk'); this.cool = 0.2; this.wake = 0.8; return; }
    if (this.wake > 0) this.wake -= dt;
    const f = this.hp / this.maxHp, ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    if (ph !== this.phase && this.alive) {
      this.phase = ph; this.scene.onBossPhase(this, ph);
      if (ph === 2) this.nextVolley = 0.4;
      if (ph === 3) { this.pendingRage = true; this.T.speed = 124; }
      if (['approach', 'wait'].includes(this.state)) this.cool = 0;
    }
    this.nextParry -= dt; this.nextVolley -= dt; this.nextTorch -= dt;
    const own = ['parry', 'open', 'riposte', 'volley', 'rage', 'torch', 'rushup', 'rush', 'rushend', 'defeated', 'retreat'];
    if (own.includes(this.state)) { this.st += dt; this.cool -= dt; if (this.shudder > 0) this.shudder -= dt; }
    switch (this.state) {
      case 'parry': if (this.st > BYAR.parry) { this.setState('open', 'accuse'); } return;
      case 'open': if (this.st > BYAR.open) { this.setState('approach', 'walk'); this.cool = rand(0.3, 0.6); } return;
      case 'riposte': return this.attacking(dt);
      case 'volley': if (this.fi >= 2 && !this.signalled) { this.signalled = true; this.volleys++; this.scene.kit?.startVolley(this); }
        if (this.done) { this.signalled = false; this.setState('approach', 'walk'); this.cool = rand(0.5, 0.9); this.nextVolley = rand(...VOLLEY.every); } return;
      case 'rage': if (this.st > 0.4 && !this.raged) { this.raged = true; this.scene.kit?.rage(this); }
        if (this.done) { this.setState('approach', 'walk'); this.cool = 0; this.nextTorch = 0.3; } return;
      case 'torch': if (this.fi >= 3 && !this.thrown) { this.thrown = true; this.torches++; this.scene.kit?.throwTorch(this); }
        if (this.done) { this.thrown = false; this.setState('approach', 'walk'); this.cool = rand(0.6, 1.0); this.nextTorch = rand(...BYAR.torchEvery); } return;
      case 'rushup': if (this.st > BYAR.rushUp) { this.setState('rush', 'rush'); this.rushDir = this.facing; this.hitIds.clear(); sfx.warcry(); } return;
      case 'rush': return this.rushing(dt);
      case 'rushend': if (this.done) { this.setState('approach', 'walk'); this.cool = rand(0.8, 1.2); } return;
      case 'defeated': if (this.st > 2.4) { this.retreatDir = Math.sign(this.x - this.target.x) || 1; this.face(this.retreatDir); this.setState('retreat', 'walk'); } return;
      case 'retreat': {
        this.x += this.retreatDir * 170 * dt;
        if (this.st > 1.2) { const a = Math.max(0, 1 - (this.st - 1.2) / 1.0); this.sprite.setAlpha(a); this.shadow.setAlpha(a * 0.8); }
        if (this.st > 2.2) this.gone = true; return;
      }
    }
    super.update(dt);
  }
  physics(dt) { if (this.state === 'retreat') return; super.physics(dt); }
  think(dt) {
    if (this.entering) return;
    const R = this.target, dx = R.x - this.x, adx = Math.abs(dx), ady = Math.abs(R.y - this.y);
    if (this.cool <= 0 && R.alive && R.state !== 'down') {
      if (this.pendingRage) return this.startRage();
      if (this.phase >= 2 && this.nextVolley <= 0 && !this.scene.kit?.volleyActive()) return this.startVolley();
      if (this.phase >= 3 && this.nextTorch <= 0 && adx > 120) return this.startTorch();
      if (this.phase >= 3 && adx > 320 && ady < 36 && Math.random() < 0.5) return this.startRush();
      if (this.nextParry <= 0 && adx < 340 && ady < 40 && this.phase !== 2) return this.startParry();
    }
    super.think(dt);
  }
  startAttack() { this.face(Math.sign(this.target.x - this.x)); this.atk = this.T.atk; this.setState('attack', 'combo'); this.lastActive = -1; this.scene.onEnemyAttack(this); }
  /** two-hit combo: each active frame can land once; the thrust (second) knocks down */
  attacking(dt) {
    const a = this.atk, fi = this.fi;
    if (a.active.includes(fi)) {
      if (fi !== this.lastActive) { this.lastActive = fi; this.hitIds.clear(); sfx[a.sfx || 'swing'](); }
      this.scene.resolveAttack(this, fi === a.active[a.active.length - 1] && a === this.T.atk ? Object.assign({}, a, BYAR.thrust) : a);
    }
    if (this.done) { this.lastActive = -1; this.cool = this.state === 'riposte' ? 0.9 : rand(...this.T.cool); this.setState('approach', 'walk'); }
  }
  startParry() { this.face(Math.sign(this.target.x - this.x)); this.setState('parry', 'parry'); this.parries++; this.nextParry = rand(...BYAR.parryEvery) + (this.phase === 3 ? 3 : 0); this.scene.kit?.parryBait(this); }
  startRiposte() { this.face(Math.sign(this.target.x - this.x)); this.ripostes++; this.atk = BYAR.riposte; this.setState('riposte', 'riposte'); this.lastActive = -1; sfx.clang(); this.scene.kit?.onRiposte(this); }
  startVolley() { this.face(Math.sign(this.target.x - this.x)); this.setState('volley', 'volley'); this.signalled = false; say('byar_volley_01', this.scene.caption, false); }
  startRage() { this.pendingRage = false; this.face(Math.sign(this.target.x - this.x)); this.setState('rage', 'rage'); this.raged = false; sfx.warcry(); this.scene.fx.trauma = Math.min(1, this.scene.fx.trauma + 0.5); }
  startTorch() { this.face(Math.sign(this.target.x - this.x)); this.setState('torch', 'torch'); this.thrown = false; }
  /** shield rush: a crouched wind-up (the telegraph), the run, then a shield bash and recovery that leave him open */
  startRush() { this.face(Math.sign(this.target.x - this.x)); this.setState('rushup', 'rushup'); this.cool = rand(1.4, 2.2); }
  rushing(dt) {
    this.x += this.rushDir * BYAR.rushSpeed * dt; this.scene.resolveAttack(this, BYAR.rush);
    const b = this.scene.bounds, wall = (this.rushDir > 0 && this.x >= b.r - 80) || (this.rushDir < 0 && this.x <= b.l + 80);
    if (this.hitIds.has('riley') || wall || this.st > BYAR.rushMax) { this.setState('rushend', 'rushend'); this.vx = this.rushDir * 90; }
  }
  takeHit(h, from) {
    if (!this.canBeHit) return false;
    const front = (Math.sign(from.x - this.x) || 1) === this.facing, R = this.scene.riley;
    if (this.state === 'parry' && front && !h.power && from !== this.scene.loial) {
      // the bait: strike his raised shield from the front and he ripostes; fireballs just glance off it
      if (from === R) this.startRiposte(); else { sfx.clang(); this.scene.fx.impact('light', this.x - this.facing * -60, this.y - 200, -this.facing); }
      return false;
    }
    if (this.state === 'open') h = Object.assign({}, h, { dmg: h.dmg * BYAR.openDmg });
    if (['volley', 'rage', 'torch', 'rushup', 'rush', 'riposte'].includes(this.state) || this.wake > 0) {
      this.hp -= h.dmg * 0.6; this.shudder = 0.1; this.flashArmor(); if (this.hp <= 0) this.die(Math.sign(this.x - from.x) || 1, h); return true;
    }
    return super.takeHit(h, from);
  }
  downed(dt) {
    if (!this.alive && this.done && this.z <= 0 && this.st > 1.1) { this.landed = false; this.setState('defeated', 'defeated'); return; }
    if (this.alive) super.downed(dt);
  }
}
export const WHITECLOAKS = Object.freeze({ zealot: Zealot, archer: Archer, byar: Byar });
