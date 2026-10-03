// Stage 1: Emond's Field on Winternight. Waves, camera locks, breakables, fireball light, the Chieftain fight.
import { VW, VH, LANE_TOP, LANE_BOT, WORLD_W, q, clamp, rand, pick, DEBUG } from './config.js';
import { perf } from './perf.js';
import { FX } from './fx.js';
import { Riley } from './riley.js';
import { Enemy, Chieftain, TYPES } from './enemies.js';
import { queueCharPages, makeCharAnims, patchFlippedNormals } from './assets.js';
import { sfx, say, playMusic, preloadVoices, unlock, toggleMusic, toggleMute, stopSceneAudio } from './audio.js';
import { Bot } from './bot.js';

const MID_SCALE = 0.76, MID_Y = LANE_TOP - 58;
// fire spots measured on the plates (plate px): [plateIndex, x, y, intensity, radius]
const FIRES = [[0, 244, 382, 2.4, 700], [0, 2036, 446, 2.4, 700], [0, 1156, 573, 1.1, 420]];
// Zones: camera locks and waves. side R/L = enter from right/left edge; t = delay (s) after the wave starts
const ZONES = [
  { at: 260, l: 0, r: 1280, intro: 'trolloc_intro_01', waves: [[['grunt', 'R', 0], ['grunt', 'R', 1.4]], [['grunt', 'L', 0], ['spear', 'R', 0.6]]] },
  { at: 1500, l: 1240, r: 2520, waves: [[['spear', 'R', 0], ['grunt', 'R', 0.7]], [['hound', 'L', 0], ['grunt', 'R', 0.4], ['grunt', 'R', 2.0]]] },
  { at: 2800, l: 2560, r: 3840, waves: [[['hound', 'R', 0], ['hound', 'L', 0.5]], [['spear', 'R', 0], ['grunt', 'L', 0.6], ['hound', 'R', 1.6]]] },
  { at: 4140, l: 3920, r: 5200, boss: true },
];
const BARRELS = [[880, 600], [2140, 650], [3330, 610], [4600, 596]];

export class Stage1 extends Phaser.Scene {
  constructor() { super('stage1'); }
  preload() {
    window.__rwbStartup?.watchLoader(this.load);
    this.load.setCORS('anonymous');
    queueCharPages(this);
    this.load.image('far', 'assets/bg/bg-far.jpg');
    this.load.image('mid0', ['assets/bg/bg-mid.webp', 'assets/bg/bg-mid_n.webp']);
    this.load.image('mid1', ['assets/bg/bg-mid2.webp', 'assets/bg/bg-mid2_n.webp']);
    this.load.image('floor', ['assets/bg/bg-floor.jpg', 'assets/bg/bg-floor_n.webp']);
    this.load.image('floor2', ['assets/bg/bg-floor2.jpg', 'assets/bg/bg-floor2_n.webp']);
    this.load.image('cart', ['assets/props/prop-cart.webp', 'assets/props/prop-cart_n.webp']);
    this.load.image('barrel', ['assets/props/prop-barrel.webp', 'assets/props/prop-barrel_n.webp']);
    if (!this.textures.exists('staves')) this.load.atlas('staves', 'assets/props/staves.webp', 'assets/props/staves.json');
    this.load.json('plates', 'assets/bg/plates.json');
    this.load.on('progress', p => { const b = document.getElementById('boot'); if (b) b.textContent = `Loading Emond's Field… ${Math.round(p * 100)}%`; });
  }
  create() {
    if (window.__rwbStartup?.failed) return;
    this.runId = (this.runId || 0) + 1;
    this.pauseReasons = new Set(); this.paused = false; this.gameOver = false;
    this.clearShown = false; this.victoryPending = false; this.boss = null; this.bot = null;
    this.hudReady = false; this.startRequested = false;
    this.backdropLit = []; this.ambient = undefined;
    this.inp = this.game.inp; this.inp.clear();
    const b = document.getElementById('boot'); if (b) b.remove();
    patchFlippedNormals();
    this.metas = makeCharAnims(this);
    this.inp = this.game.inp; this.rs = this.game.rs;
    const cam = this.cameras.main; cam.setOrigin(0, 0); cam.setZoom(this.rs); cam.setRoundPixels(false);
    this.lights.enable().setAmbientColor(0x39425f);
    this.fx = new FX(this);
    this.plates = this.cache.json.get('plates') || {};
    this.buildBackdrop();
    this.enemies = []; this.fireballs = []; this.carts = []; this.patches = []; this.pickups = []; this.barrels = [];
    this.riley = new Riley(this, 180, 630);
    this.heroLight = this.lights.addLight(0, 0, 440, 0xd8e2ff, 1.0, 150);
    for (const [x, y] of BARRELS) this.addBarrel(x, y);
    this.snowFront = this.add.particles(0, 0, 'flake', { x: { min: -100, max: VW + 300 }, y: -20, lifespan: 6000, speedY: { min: 80, max: 130 }, speedX: { min: -50, max: -10 }, scale: { min: 0.5, max: 0.9 }, alpha: { min: 0.5, max: 0.9 }, frequency: 80 }).setDepth(5000).setScrollFactor(0);
    this.zoneI = -1; this.zone = null; this.wave = -1; this.pending = []; this.locked = false; this.camX = 0; this.camMax = 0;
    this.bounds = { l: 0, r: VW }; this.maxTokens = 2; this.started = false; this.ended = false; this.time0 = 0; this.timeScale = 1; this.lightsOn = true;
    this.bloom = null; if (q.get('bloom') !== '0') this.setBloom(true);
    this.vignette = q.get('vig') !== '0' ? cam.filters.external.addVignette(0.5, 0.5, 0.95, 0.35) : null;
    if (q.get('lit') === '0') this.setBackdropLit(false);
    this.caption = (who, text) => this.hud && this.hud.caption(who, text);
    this.scene.launch('hud'); this.hud = this.scene.get('hud'); this.hud.stage = this;
    const removeKey = this.inp.on('key', code => {
      if (this.paused) return;
      if (code === 'Digit1') this.toggleLights(); if (code === 'Digit2') this.setBloom(!this.bloom);
      if (code === 'Digit3') this.timeScale = this.timeScale === 1 ? 0.25 : 1; if (code === 'KeyM') toggleMusic(); if (code === 'KeyN') toggleMute();
      if (code === 'KeyH') this.hud.togglePerf();
    });
    const removePress = this.inp.on('press', a => this.onPress(a));
    this.events.once('shutdown', () => {
      removeKey(); removePress(); this.inp.clear();
      stopSceneAudio();
      if (this.bot && this.bot.destroy) this.bot.destroy();
      for (const reason of this.pauseReasons) perf.setSuspended(reason, false);
      this.scene.stop('hud');
      perf.reset();
    });
    this.god = !!q.get('god');
    // ?skip=boss starts at the Chieftain arena (testing / quick device checks)
    if (q.get('skip') === 'boss') { this.zoneI = 2; this.riley.x = 3990; this.camX = this.camMax = 3500; }
    if (q.get('demo')) { this.bot = new Bot(this); }
    if (q.get('demo') || q.get('autostart')) this.time.delayedCall(300, () => this.start());
    window.__stage = this; window.__spike = this;
  }
  // ---------- backdrop ----------
  buildBackdrop() {
    const far = this.add.image(0, 0, 'far').setOrigin(0, 0).setScrollFactor(0.12);
    far.setScale(Math.max(VH * 0.8 / far.height, (VW + (WORLD_W - VW) * 0.12) / far.width)).setTint(0xb8c4e0).setDepth(-100);
    // two mid plates side by side (parallax 0.4); their seam is hidden by an overlap
    let x = 0; this.midPlates = [];
    for (const k of ['mid0', 'mid1']) {
      if (!this.textures.exists(k)) continue;
      const m = this.add.image(x, MID_Y, k).setOrigin(0, 1).setScrollFactor(0.4, 1).setScale(MID_SCALE).setLighting(true).setDepth(-50);
      this.midPlates.push(m); (this.backdropLit = this.backdropLit || []).push(m); x += m.displayWidth - (this.plates.overlap || 0) * MID_SCALE;
    }
    // floors: street, then village green
    const fh = VH - LANE_TOP + 64, fy = LANE_TOP - 64;
    const f1 = this.textures.get('floor').getSourceImage(), ts = fh / f1.height;
    const split = this.plates.floorSplit || 3700;
    (this.backdropLit = this.backdropLit || []).push(this.add.tileSprite(0, fy, split + 200, fh, 'floor').setOrigin(0, 0).setLighting(true).setTileScale(ts).setDepth(-40));
    if (this.textures.exists('floor2')) {
      const f2 = this.textures.get('floor2').getSourceImage(), ts2 = fh / f2.height;
      const t2 = this.add.tileSprite(split, fy, WORLD_W - split, fh, 'floor2').setOrigin(0, 0).setLighting(true).setTileScale(ts2).setDepth(-39); this.backdropLit.push(t2);
      // soft seam: fade the green in over 200px
      const g = this.make.graphics({}, false); g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0, 1, 0, 1); g.fillRect(0, 0, 200, 4); g.generateTexture('seam', 200, 4); g.destroy();
      this.backdropLit.push(this.add.tileSprite(split - 200, fy, 200, fh, 'floor2').setOrigin(0, 0).setLighting(true).setTileScale(ts2).setTilePosition(-200 / ts2, 0).setDepth(-39).setAlpha(0.5));
    }
    this.add.particles(0, 0, 'flake', { x: { min: -100, max: VW + 200 }, y: -20, lifespan: 9000, speedY: { min: 30, max: 55 }, speedX: { min: -25, max: 5 }, scale: { min: 0.15, max: 0.35 }, alpha: { min: 0.35, max: 0.7 }, frequency: 26 }).setScrollFactor(0).setDepth(-45);
    this.moon = this.lights.addLight(VW * 0.85, 60, 1500, 0xa8c0ff, 1.25, 260); this.moon.setScrollFactor(0, 1);
    this.fires = [];
    const fires = FIRES.concat((this.plates.fires || []).map(f => [1, ...f]));
    for (const [pi, px, py, I, rad] of fires) {
      const m = this.midPlates[pi]; if (!m) continue;
      const wx = m.x + px * MID_SCALE, wy = MID_Y - m.height * MID_SCALE + py * MID_SCALE;
      const L = this.lights.addLight(wx, wy, rad, 0xff8a3a, I, 110); L.setScrollFactor(0.4, 1); L.baseI = I; L.seed = Math.random() * 10; this.fires.push(L);
      if (I > 1) this.add.particles(wx, wy, 'ember', { lifespan: 2600, speedY: { min: -80, max: -30 }, speedX: { min: -25, max: 30 }, scale: { start: 0.9, end: 0 }, frequency: 110, blendMode: 'ADD' }).setScrollFactor(0.4, 1).setDepth(-49);
    }
  }
  setBloom(on) {
    const cam = this.cameras.main;
    if (!on && this.bloom) { cam.filters.internal.remove(this.bloom); this.bloom = null; }
    if (on && !this.bloom) { const pf = this.bloom = cam.filters.internal.addParallelFilters(); pf.top.addThreshold(0.62, 1); pf.top.addBlur(1, 2, 2, 1.2); pf.blend.blendMode = Phaser.BlendModes.ADD; pf.blend.amount = 0.5; }
  }
  // when the backdrop drops to unlit (software/slow GPUs) the painted plates show at full value, so lift the sprite ambient to keep fighters readable against them
  setBackdropLit(on) { for (const o of this.backdropLit || []) o.setLighting(on); this.backdropIsLit = on; this.ambient = on ? 0x39425f : 0x5a6482; if (this.lightsOn !== false) this.lights.setAmbientColor(this.ambient); }
  dropVignette() { if (this.vignette) { this.cameras.main.filters.external.remove(this.vignette); this.vignette = null; } }
  toggleLights() { this.lightsOn = !this.lightsOn; this.lights.setAmbientColor(this.lightsOn ? (this.ambient || 0x39425f) : 0xffffff); }
  // ---------- flow ----------
  onPress(a) {
    if (a === 'pause' || (a === 'start' && this.started && !this.ended && !this.gameOver)) {
      if (this.started && !this.ended && !this.gameOver && !this.pauseReasons.has('report')) this.setPauseReason('manual', !this.pauseReasons.has('manual'));
      return;
    }
    if (this.paused) { this.inp.clear(); return; }
    unlock();
    if (!this.started && !this.ended) return this.start();
    if (this.gameOver && (a === 'attack' || a === 'start')) return this.continueGame();
    if (this.ended && this.clearShown && (a === 'attack' || a === 'start')) return this.scene.restart();
  }
  setPauseReason(reason, paused) {
    if (paused) this.pauseReasons.add(reason); else this.pauseReasons.delete(reason);
    perf.setSuspended(reason, paused);
    const next = this.pauseReasons.size > 0;
    this.inp.clear();
    if (next === this.paused) return;
    this.paused = next;
    if (next) this.scene.pause(); else this.scene.resume();
    if (this.hud && this.hud.pauseLabel) this.hud.pauseLabel.setVisible(next);
  }
  start() {
    if (this.started) return;
    if (!this.hudReady) { this.startRequested = true; return; }
    this.startRequested = false; this.started = true; unlock(); playMusic(); preloadVoices(); this.hud.hideTitle(); this.time0 = this.time.now;
    perf.reset();
    say('st1_narrator_01', this.caption);
    this.time.delayedCall(5200, () => !this.zone && say('riley_st1_01', this.caption));
  }
  attackTokens() { return this.enemies.filter(e => e.alive && (e.state === 'attack' || e.state === 'sweep' || e.state === 'charge')).length; }
  separation(e) { let f = 0; for (const o of this.enemies) if (o !== e && o.alive) { const dx = e.x - o.x, dy = e.y - o.y; if (Math.abs(dx) < 90 && Math.abs(dy) < 30) f += Math.sign(dx || (e.id - o.id)) * 60; } return f; }
  spawn(type, side) {
    const z = this.zone, x = side === 'R' ? z.r + 120 : z.l - 120, y = rand(LANE_TOP + 15, LANE_BOT - 10);
    const e = type === 'chief' ? new Chieftain(this, x, y) : new Enemy(this, type, x, y); e.entering = true; this.enemies.push(e); return e;
  }
  updateZones(dt) {
    const R = this.riley;
    if (!this.zone) {
      const nz = ZONES[this.zoneI + 1];
      if (nz && R.x > nz.at) { this.zoneI++; this.zone = nz; this.locked = true; this.wave = -1; this.waveGap = 0.3; if (nz.intro) say(nz.intro, this.caption); if (nz.boss) this.startBoss(); }
      return;
    }
    if (this.zone.boss) return;
    const alive = this.enemies.filter(e => e.alive).length;
    if (this.pending.length) { for (const p of this.pending.slice()) { p.t -= dt; if (p.t <= 0) { this.spawn(p.type, p.side); this.pending.splice(this.pending.indexOf(p), 1); } } return; }
    if (alive === 0) {
      this.waveGap -= dt; if (this.waveGap > 0) return;
      this.wave++;
      const w = this.zone.waves[this.wave];
      if (!w) { this.zone = null; this.locked = false; this.hud.go(); sfx.go(); return; }
      this.pending = w.map(([type, side, t]) => ({ type, side, t })); this.waveGap = 0.8;
    }
  }
  startBoss() {
    this.time.delayedCall(700, () => {
      const c = this.boss = this.spawn('chief', 'R'); c.cool = 2.5; c.nextRoar = 6;
      say('trolloc_heavy_intro_01', this.caption); sfx.roar(); this.hud.bossBar(c);
    });
  }
  onBossPhase(c, ph) {
    if (ph === 2) { say('chieftain_mid_01', this.caption); this.fx.trauma = 0.6; }
    if (ph === 3) { sfx.roar(); this.hud.flashText('THE CHIEFTAIN IS ENRAGED'); }
  }
  summonHounds(c) {
    const runId = this.runId;
    const canSummon = () => this.runId === runId && c === this.boss && c.alive && !this.victoryPending && !this.ended && !this.gameOver;
    if (!canSummon()) return;
    const n = 2 - this.enemies.filter(e => e.alive && e.type === 'hound').length;
    for (let i = 0; i < n; i++) this.time.delayedCall(i * 500, () => { if (canSummon()) this.spawn('hound', i % 2 ? 'L' : 'R'); });
  }
  onEnemyAttack(e) { }
  onEnemyDie(e) {
    this.riley.score += e.T.score;
    if (e === this.boss) this.bossDown(e);
  }
  bossDown(c) {
    if (this.victoryPending || this.ended) return;
    // Commit the victory before delayed adds or in-flight hazards can end the run.
    // A last projectile may win after game-over's timer: victory takes terminal
    // precedence in either ordering, without restoring health or spare lives.
    this.victoryPending = true;
    if (this.gameOver) { this.gameOver = false; stopSceneAudio(); this.hud.hideGameOver(); }
    this.fx.slowmo = 1.2; this.fx.hitstop = 0.25; sfx.impact();
    for (const e of this.enemies) if (e !== c && e.alive) { e.hp = 0; e.die(Math.sign(e.x - this.riley.x) || 1, { kb: 300, launch: 300 }); }
    this.time.delayedCall(900, () => say('chieftain_defeat_01', this.caption));
    this.time.delayedCall(3600, () => say('riley_victory_01', this.caption));
    this.time.delayedCall(5600, () => say('st1_clear_moiraine_01', this.caption));
    this.time.delayedCall(6200, () => { this.ended = true; sfx.levelClear(); this.hud.stageClear(this.stats()); this.time.delayedCall(1200, () => this.clearShown = true); });
  }
  stats() { const R = this.riley; return { score: R.score, combo: R.maxCombo, time: (this.time.now - this.time0) / 1000, lives: R.lives }; }
  rileyDied() {
    const R = this.riley; R.lives--;
    this.time.delayedCall(1600, () => {
      if (R !== this.riley || this.victoryPending || this.ended) return;
      if (R.lives > 0) { R.respawn(); for (const e of this.enemies) if (e.alive && Math.abs(e.x - R.x) < 260) e.vx = Math.sign(e.x - R.x) * 500; }
      else { this.gameOver = true; sfx.gameOver(); this.hud.gameOver(); }
    });
  }
  continueGame() { const R = this.riley; this.gameOver = false; R.lives = 3; R.score = Math.floor(R.score / 2); R.respawn(); this.hud.hideGameOver(); }
  // ---------- combat ----------
  /** check an attack's active frame against the other team */
  resolveAttack(att, a) {
    if (att.entering) return;
    const targets = att.team === 0 ? this.enemies : [this.riley];
    for (const t of targets) {
      if (t.entering || att.hitIds.has(t.id || 'riley')) continue;
      const dx = (t.x - att.x) * att.facing, dy = Math.abs(t.y - att.y), dz = t.z - att.z;
      const bodyW = t.def.shadowW * 0.35;
      if (dy > 34 || dx < a.x0 - bodyW || dx > a.x1 + bodyW * 0.3) continue;
      if (dz + 220 < a.z0 || dz > a.z1) continue;
      if (this.hitTarget(att, t, a)) att.hitIds.add(t.id || 'riley');
    }
    if (att.team === 0) for (const b of this.barrels) if (!b.broken && Math.abs(b.y - att.y) < 40) { const dx = (b.x - att.x) * att.facing; if (dx > a.x0 - 30 && dx < a.x1 + 20) this.breakBarrel(b, att.facing); }
  }
  hitTarget(att, t, a, src) {
    const h = Object.assign({}, a); if (a.kb && att.facing && !src) h.kb = Math.abs(a.kb) * Math.sign((t.x - att.x) || att.facing);
    if (!t.takeHit(h, src || att)) return false;
    const hx = (t.x + (src || att).x) / 2 + (t.x > (src || att).x ? 20 : -20), hy = t.y - t.z - (t.T && t.T.boss ? 230 : 160);
    this.fx.impact(a.kind || 'medium', hx, hy, Math.sign(t.x - (src || att).x) || 1);
    sfx.hit(a.kind === 'heavy' || a.kind === 'finisher');
    if (att === this.riley && t !== this.riley) { this.riley.landedHit(a.dmg); this.hud.target(t); this.hud.combo(this.riley.combo); }
    return true;
  }
  grabCandidate(R) {
    for (const e of this.enemies) if (e.grabbable && Math.abs(e.y - R.y) < 18) { const dx = (e.x - R.x) * R.facing; if (dx > 40 && dx < 105 && (e.state === 'hurt' || e.cool > 0.2)) return e; }
    return null;
  }
  dustLater(f, t) { this.time.delayedCall(t * 1000, () => { this.fx.thump(f.x - f.facing * 40, f.y, true); sfx.thud(); }); }
  spawnFireball(R) {
    const x = R.x + R.facing * 120, y = R.y - 150;
    const core = this.add.image(x, y, 'core').setBlendMode('ADD').setScale(0.9).setDepth(4003);
    const glow = this.add.image(x, y, 'glow').setBlendMode('ADD').setScale(1.4).setAlpha(0.8).setDepth(4003);
    const light = this.lights.addLight(x, y, 420, 0xff9a40, 3.0, 70);
    const trail = this.add.particles(0, 0, 'ember', { follow: core, lifespan: 480, speed: { min: 10, max: 70 }, scale: { start: 1.3, end: 0 }, frequency: this.fx.quality >= 2 ? 30 : 14, blendMode: 'ADD' }).setDepth(4002);
    this.fireballs.push({ x, y, gy: R.y, dir: R.facing, core, glow, light, trail, t: 0 });
  }
  updateFireballs(dt) {
    for (const f of this.fireballs.slice()) {
      f.t += dt; f.x += f.dir * 680 * dt; const wob = Math.sin(f.t * 40) * 0.08;
      f.core.setPosition(f.x, f.y).setScale(0.9 + wob); f.glow.setPosition(f.x, f.y).setScale(1.4 + wob * 2); f.light.x = f.x; f.light.y = f.y; f.light.intensity = 2.8 + Math.sin(f.t * 33) * 0.4;
      let hit = null;
      for (const e of this.enemies) if (e.canBeHit && Math.abs(e.x - f.x) < 60 && Math.abs(e.y - f.gy) < 42) { hit = e; break; }
      const off = f.x < this.camX - 200 || f.x > this.camX + VW + 200;
      if (hit || off) {
        if (hit) { this.hitTarget(this.riley, hit, { dmg: 14, kind: 'heavy', kb: f.dir * 420, launch: 420, down: true }, { x: f.x - f.dir * 50, facing: f.dir }); this.fx.boom(f.x, f.y); sfx.boom(); }
        this.lights.removeLight(f.light); f.core.destroy(); f.glow.destroy(); f.trail.stop(); this.time.delayedCall(600, () => f.trail.destroy());
        this.fireballs.splice(this.fireballs.indexOf(f), 1);
      }
    }
  }
  // ---------- props ----------
  addBarrel(x, y) {
    const s = this.add.image(x, y, 'barrel').setOrigin(0.5, 0.97).setScale(0.19).setLighting(true).setDepth(1000 + y);
    const sh = this.add.image(x, y + 2, 'shadow').setScale(1.2, 0.28).setDepth(900);
    this.barrels.push({ x, y, s, sh, broken: false });
  }
  breakBarrel(b, dir) {
    b.broken = true; b.s.destroy(); b.sh.destroy(); sfx.smash(); this.fx.impact('medium', b.x, b.y - 60, dir);
    const fr = this.textures.get('staves').getFrameNames();
    for (const n of fr) {
      const p = this.add.image(b.x + rand(-20, 20), b.y - rand(30, 90), 'staves', n).setScale(0.19).setLighting(true).setDepth(1000 + b.y);
      const vx = dir * rand(80, 360) + rand(-80, 80), vz = rand(-620, -300), spin = rand(-12, 12);
      this.tweens.addCounter({ from: 0, to: 1, duration: 900, onUpdate: (tw) => { const t = tw.getValue() * 0.9; p.x += vx * 0.016; p.y = b.y - 60 + vz * t + 1400 * t * t; if (p.y > b.y + rand(-6, 6)) { p.y = b.y; } p.rotation += spin * 0.016 * (p.y < b.y ? 1 : 0); }, onComplete: () => this.tweens.add({ targets: p, alpha: 0, delay: 1500, duration: 600, onComplete: () => p.destroy() }) });
    }
    this.dropPickup(b.x, b.y, Math.random() < 0.5 ? 'heal' : 'saidin');
  }
  dropPickup(x, y, kind) {
    const col = kind === 'heal' ? 0xff8866 : 0x88ccff;
    const g = this.add.image(x, y - 30, 'glow').setBlendMode('ADD').setScale(0.55).setTint(col).setDepth(1000 + y);
    const c = this.add.image(x, y - 30, 'core').setBlendMode('ADD').setScale(0.35).setTint(col).setDepth(1000 + y);
    const L = this.lights.addLight(x, y - 40, 160, col, 1.2, 80);
    this.pickups.push({ x, y, kind, g, c, L, t: 0 });
  }
  updatePickups(dt) {
    const R = this.riley;
    for (const p of this.pickups.slice()) {
      p.t += dt; const bob = Math.sin(p.t * 4) * 6; p.g.y = p.c.y = p.y - 34 + bob; p.L.y = p.y - 44 + bob;
      if (Math.abs(R.x - p.x) < 50 && Math.abs(R.y - p.y) < 30 && R.alive) {
        if (p.kind === 'heal') R.hp = Math.min(R.maxHp, R.hp + 35); else R.saidin = 100;
        sfx.pickup(); p.g.destroy(); p.c.destroy(); this.lights.removeLight(p.L); this.pickups.splice(this.pickups.indexOf(p), 1);
      }
    }
  }
  throwCart(c) {
    const R = this.riley, x0 = c.x + c.facing * 30, z0 = 330, tx = clamp(R.x, this.bounds.l + 80, this.bounds.r - 80), ty = R.y;
    const s = this.add.image(x0, c.y - z0, 'cart').setScale(0.26).setLighting(true).setDepth(1000 + c.y + 1);
    const L = this.lights.addLight(x0, c.y - z0, 380, 0xff8a3a, 2.2, 90);
    const trail = this.add.particles(0, 0, 'ember', { follow: s, lifespan: 700, speed: { min: 10, max: 60 }, scale: { start: 1.4, end: 0 }, frequency: 25, blendMode: 'ADD' }).setDepth(4002);
    this.carts.push({ s, L, trail, x0, y0: c.y, z0, tx, ty, t: 0, T: 0.85, spin: c.facing * -3 });
    sfx.whoosh();
  }
  updateCarts(dt) {
    for (const k of this.carts.slice()) {
      k.t += dt; const u = Math.min(1, k.t / k.T);
      const x = k.x0 + (k.tx - k.x0) * u, y = k.y0 + (k.ty - k.y0) * u, z = k.z0 * (1 - u) + 420 * u * (1 - u);
      k.s.setPosition(x, y - z - 30).setRotation(k.s.rotation + k.spin * dt).setDepth(1000 + y + 1); k.L.x = x; k.L.y = y - z - 40;
      if (u >= 1) {
        k.s.destroy(); k.trail.stop(); this.time.delayedCall(700, () => k.trail.destroy()); this.lights.removeLight(k.L);
        this.fx.boom(x, y - 40, 2.8, 460); this.fx.impact('heavy', x, y - 60, 1); sfx.boom(); this.fx.debris.emitParticleAt(x, y - 30, 18);
        const R = this.riley; if (Math.abs(R.x - x) < 120 && Math.abs(R.y - y) < 44 && R.z < 80) R.takeHit({ dmg: 14, kind: 'heavy', kb: 420, down: true }, { x: x - 1 });
        this.addPatch(x, y); this.carts.splice(this.carts.indexOf(k), 1);
      }
    }
    for (const p of this.patches.slice()) {
      p.t += dt; p.L.intensity = (p.t < 6 ? 1.8 : Math.max(0, 1.8 * (1 - (p.t - 6) / 1.5))) * (0.8 + 0.2 * Math.sin(p.t * 17 + p.seed));
      const R = this.riley; if (p.t < 6.5 && Math.abs(R.x - p.x) < 80 && Math.abs(R.y - p.y) < 26 && R.z < 30 && (p.tick -= dt) <= 0) { p.tick = 0.6; if (R.vulnerable) { R.hp = Math.max(1, R.hp - 3); this.fx.embers.emitParticleAt(R.x, R.y - 60, 8); sfx.hurt(); } }
      if (p.t > 7.5) { this.lights.removeLight(p.L); p.em.destroy(); p.sm.destroy(); this.patches.splice(this.patches.indexOf(p), 1); }
      else if (p.t > 6 && p.em.emitting) { p.em.stop(); p.sm.stop(); }
    }
  }
  addPatch(x, y) {
    if (this.patches.length >= 3) { const o = this.patches.shift(); this.lights.removeLight(o.L); o.em.destroy(); o.sm.destroy(); }
    const em = this.add.particles(x, y - 10, 'ember', { x: { min: -60, max: 60 }, lifespan: 900, speedY: { min: -160, max: -60 }, speedX: { min: -20, max: 20 }, scale: { start: 1.8, end: 0 }, frequency: this.fx.quality >= 2 ? 50 : 22, blendMode: 'ADD' }).setDepth(1000 + y);
    const sm = this.add.particles(x, y - 40, 'smoke', { x: { min: -40, max: 40 }, lifespan: 1800, speedY: { min: -70, max: -30 }, scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.5, end: 0 }, frequency: 160 }).setDepth(1000 + y - 1);
    const L = this.lights.addLight(x, y - 40, 420, 0xff7a2a, 1.8, 90);
    this.patches.push({ x, y, em, sm, L, t: 0, tick: 0, seed: Math.random() * 9 });
  }
  wallHit(x) { this.fx.debris.emitParticleAt(x, LANE_TOP - 40, 14); this.fx.snowPuff.emitParticleAt(x, LANE_TOP, 14); }
  // ---------- main loop ----------
  update(time, deltaMs) {
    // Phaser still installs update() when create() exits early after a loader
    // failure. Keep that failed or uninitialized scene inert behind recovery UI.
    if (window.__rwbStartup?.failed || !this.riley || !this.enemies || !this.fx) return;
    perf.tick(performance.now(), {
      active: this.started && !this.gameOver && !this.ended && !this.paused,
      inFight: this.enemies.some(e => e.alive && !e.entering),
      context: { mode: this.bot ? 'demo' : 'manual', zone: this.zoneI + 1, wave: this.wave + 1, bossPhase: this.boss && this.boss.phase || null, godMode: this.god, timeScale: this.timeScale },
    });
    let dt = Math.min(deltaMs, 50) / 1000;
    if (this.bot) this.bot.update(dt);
    for (const L of this.fires) L.intensity = this.lightsOn ? L.baseI * (0.82 + 0.18 * Math.sin(time * 0.009 + L.seed) * Math.sin(time * 0.023 + L.seed * 3)) : 0;
    this.fx.update(dt);
    const R = this.riley, fx = this.fx;
    if (fx.hitstop > 0) {
      fx.hitstop -= dt; this.anims.globalTimeScale = 0;
      for (const f of [R, ...this.enemies]) { if (f.shudder > 0) f.shudder -= dt * 0.2; f.sync(); }
      this.updateCamera(dt); return;
    }
    if (fx.slowmo > 0) { fx.slowmo -= dt; dt *= 0.3; this.anims.globalTimeScale = 0.3; } else this.anims.globalTimeScale = this.timeScale;
    dt *= this.timeScale;
    if (this.started && !this.gameOver) R.update(dt, this.inp);
    R.physics(dt);
    for (const e of this.enemies) {
      e.update(dt); const wasEntering = e.entering;
      if (e.entering && e.x > this.bounds.l + 60 && e.x < this.bounds.r - 60) e.entering = false;
      if (e.entering) {
        // Admit actors into the arena before normal slots/attacks. Chasing a
        // wall-hugging player can stop outside the stricter 60px entry margin.
        const dir = Math.sign((this.bounds.l + this.bounds.r) / 2 - e.x);
        if (e.alive) e.face(dir);
        e.x += dir * e.T.speed * dt;
        if (e.vx) { e.x += e.vx * dt; e.vx *= Math.pow(0.004, dt); if (Math.abs(e.vx) < 6) e.vx = 0; }
        e.x = clamp(e.x, this.bounds.l - 260, this.bounds.r + 260); e.y = clamp(e.y, LANE_TOP, LANE_BOT);
        if (e.z > 0 || e.vz) { e.vz -= 2600 * dt; e.z = Math.max(0, e.z + e.vz * dt); if (!e.z) e.vz = 0; }
      }
      else e.physics(dt);
    }
    // keep Riley from walking through enemies
    for (const e of this.enemies) if (e.alive && !e.entering && e.state !== 'held' && R.state !== 'down' && Math.abs(e.y - R.y) < 18 && R.z < 40 && e.z < 40) {
      const dx = R.x - e.x, min = 62; if (Math.abs(dx) < min) R.x = e.x + Math.sign(dx || -R.facing) * min;
    }
    // Separation runs after physics; a wall-pinned enemy must not push Riley
    // back outside the arena bounds that physics already enforced.
    R.x = clamp(R.x, this.bounds.l + 40, this.bounds.r - 40);
    this.enemies = this.enemies.filter(e => { if (e.gone) { e.destroy(); return false; } return true; });
    this.updateFireballs(dt); this.updateCarts(dt); this.updatePickups(dt);
    if (this.started) this.updateZones(dt);
    R.sync(); for (const e of this.enemies) e.sync();
    this.updateCamera(dt);
    this.heroLight.x = R.x - 90; this.heroLight.y = R.y - 300 - R.z; this.heroLight.intensity = this.lightsOn ? 1.0 : 0;
    this.game.governor(dt);
  }
  updateCamera(dt) {
    const R = this.riley;
    let target = R.x - VW * 0.42 + R.facing * 50;
    let lo = this.camMax - 0, hi = WORLD_W - VW;
    if (this.locked && this.zone) { lo = Math.max(lo, this.zone.l); hi = Math.min(hi, this.zone.r - VW); }
    target = clamp(target, Math.max(0, Math.min(lo, hi)), hi);
    this.camX += (target - this.camX) * Math.min(1, dt * 5);
    if (!this.locked) this.camMax = Math.max(this.camMax, this.camX);
    if (this.locked && this.zone) { this.bounds.l = Math.max(this.camX, this.zone.l); this.bounds.r = Math.min(this.camX + VW, this.zone.r); }
    else { this.bounds.l = this.camX; this.bounds.r = Math.min(WORLD_W, this.camX + VW + (this.zone ? 0 : 0)); }
    const [sx, sy] = this.fx.shakeOffset();
    this.cameras.main.setScroll(this.camX + sx, sy);
  }
}
