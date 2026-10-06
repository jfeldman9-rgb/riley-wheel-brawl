// Stage 1: Emond's Field on Winternight. Waves, camera locks, breakables, fireball light, the Chieftain fight.
import { VW, VH, LANE_TOP, LANE_BOT, WORLD_W, q, clamp, rand, pick, DEBUG } from './config.js';
import { perf } from './perf.js';
import { FX } from './fx.js';
import { Riley, BALEFIRE } from './riley.js';
import { Enemy, Chieftain, TYPES } from './enemies.js';
import { queueCharPages, makeCharAnims, patchFlippedNormals, releaseChars } from './assets.js';
import { sfx, say, playMusic, playTrack, audioUnlocked, preloadVoices, preloadClips, releaseClips, unlock, toggleMusic, toggleMute, stopSceneAudio } from './audio.js';
import { Bot } from './bot.js';
import { Loial } from './loial.js';
import { Powers, POWERS, TER_POWERS, DROPS, BOSS_DROP, PICKUP_LIFE, PICKUP_BLINK, TWIX_DROP_Z, TWIX_ART_KEYS, queuePowerArt, makePowerAnims, iconKey } from './powers.js';
import { Cutscene, TWIX_SCRIPT } from './twix.js';
import { STAGES, STAGE1, stageEnabled, maxStage, stageFromQuery, resolveStage, STAGE_CHARS, STAGE_TEXTURES } from './stages.js';
import { WHITECLOAKS } from './whitecloaks.js';
import { DARKFRIENDS, CUTTHROAT } from './darkfriends.js';
import { MYRDDRAAL } from './myrddraal.js';
import { Stage2Kit, queueStage2, STORY_PANELS, STORY_SCRIPT, STAGE2_VOICES } from './stage2.js';
import { queueStage3, STORY3_SCRIPT, STORY3_PANELS, STAGE3_VOICES } from './stage3.js';
import { queueStage4, STORY4_SCRIPT, STORY4_PANELS, STAGE4_VOICES } from './stage4.js';
import { STAGE4_ACTORS } from './stage4-actors.js';
import { cultistHoldsToken } from './cultists.js';
import { MusicDirector } from './music.js';

export const ENEMY_CLASSES = Object.freeze({ ...WHITECLOAKS, ...DARKFRIENDS, ...MYRDDRAAL, ...STAGE4_ACTORS });

// Balefire beam light intensity: bright enough to light nearby figures white-blue without washing them out.
const BEAM_LIGHT = 1.5, FLARE_SCALE = 0.5;

const MID_SCALE = 0.76, MID_Y = LANE_TOP - 58;
// fire spots measured on the plates (plate px): [plateIndex, x, y, intensity, radius]
const FIRES = [[0, 244, 382, 2.4, 700], [0, 2036, 446, 2.4, 700], [0, 1156, 573, 1.1, 420]];
// Zones: camera locks and waves. side R/L = enter from right/left edge; t = delay (s) after the wave starts
const ZONES = STAGES[1].zones;
// Moon: screen-fixed at x=VW*0.85, but as an ordinary world-space light. Phaser 4.2.1 LightsManager.getLights
// culls raw light x/y against camera.worldView before scroll factors apply, so a scrollFactorX=0 light was
// dropped once the camera passed x~2600 (zone 3 and the boss arena). placeMoon() keeps world x = scrollX + MOON_X
// (shake included), which projects to the same screen x and stays inside every camera's worldView.
export const MOON_X = VW * 0.85, MOON_Y = 60;
export function addMoon(lights) { return lights.addLight(MOON_X, MOON_Y, 1500, 0xa8c0ff, 1.25, 260); }
export function placeMoon(moon, scrollX) { if (moon) moon.x = scrollX + MOON_X; }
// Fires sit on the mid plates (parallax 0.4) but are world-space lights for the same culling reason as the moon:
// world x = baseX + (1 - 0.4) * scrollX projects to the parallax screen position baseX - 0.4 * scrollX. Only the
// FIRE_LIGHT_CAP on-screen fires nearest the screen centre stay active, which bounds per-frame lighting cost.
export const FIRE_PARALLAX = 0.4, FIRE_LIGHT_CAP = 4;
export function placeFires(fires, scrollX, cap = FIRE_LIGHT_CAP) {
  if (!fires) return;
  const ranked = [];
  for (const L of fires) {
    const sx = L.baseX - (L.par ?? FIRE_PARALLAX) * scrollX;
    L.x = sx + scrollX;
    const onScreen = sx + L.radius > 0 && sx - L.radius < VW;
    if (onScreen) ranked.push([Math.abs(sx - VW / 2), L]); else L.setVisible(false);
  }
  ranked.sort((a, b) => a[0] - b[0]);
  ranked.forEach(([, L], i) => L.setVisible(i < cap));
}
const BARRELS = STAGES[1].crates;

function queueStage1(scene) {
  scene.load.image('far', 'assets/bg/bg-far.jpg');
  scene.load.image('mid0', ['assets/bg/bg-mid.webp', 'assets/bg/bg-mid_n.webp']);
  scene.load.image('mid1', ['assets/bg/bg-mid2.webp', 'assets/bg/bg-mid2_n.webp']);
  scene.load.image('floor', ['assets/bg/bg-floor.jpg', 'assets/bg/bg-floor_n.webp']);
  scene.load.image('floor2', ['assets/bg/bg-floor2.jpg', 'assets/bg/bg-floor2_n.webp']);
  scene.load.image('cart', ['assets/props/prop-cart.webp', 'assets/props/prop-cart_n.webp']);
  scene.load.image('barrel', ['assets/props/prop-barrel.webp', 'assets/props/prop-barrel_n.webp']);
  if (!scene.textures.exists('staves')) scene.load.atlas('staves', 'assets/props/staves.webp', 'assets/props/staves.json');
  queuePowerArt(scene);
  scene.load.json('plates', 'assets/bg/plates.json');
}

function queueStage2All(scene) {
  queueStage2(scene);
  queuePowerArt(scene, { twix: false });
}

function queueStage3All(scene) { queueStage3(scene); queuePowerArt(scene, { twix: false }); }
function queueStage4All(scene) { queueStage4(scene); queuePowerArt(scene, { twix: false }); }

STAGES[1].queue = queueStage1;
STAGES[2].queue = queueStage2All;
STAGES[3].queue = queueStage3All;
STAGES[4].queue = queueStage4All;

STAGES[1].start = scene => {
  scene.music?.set('stage');
  say('st1_narrator_01', scene.caption);
  scene.time.delayedCall(5200, () => !scene.zone && say('riley_st1_01', scene.caption));
};
STAGES[2].start = scene => {
  scene.startStage2();
};
STAGES[3].start = scene => {
  scene.startStage3();
};
STAGES[4].start = scene => {
  scene.startStage4();
};

export class Stage1 extends Phaser.Scene {
  constructor() { super('stage1'); }
  get stageDef() { return this._stageDef || STAGES[this.stageNo || 1] || STAGES[1]; }
  set stageDef(v) { this._stageDef = v; }
  preload() {
    window.__rwbStartup?.watchLoader(this.load);
    this.load.setCORS('anonymous');
    const stageNo = resolveStage(this.sys && this.sys.settings && this.sys.settings.data, q);
    // Only one stage's backdrop and enemy atlases stay resident (iPad memory): drop the other stage's first.
    this.releaseStage(stageNo);
    if (!document.getElementById('boot') && this.game.canvas && this.game.canvas.parentNode && this.loadedStage !== undefined) {
      const b = document.createElement('div'); b.id = 'boot'; b.className = 'boot-reload'; document.body.appendChild(b);
    }
    this.loadedStage = stageNo;
    const stageDef = STAGES[stageNo] || STAGES[1];
    queueCharPages(this, stageDef.chars);
    if (stageDef.queue) stageDef.queue(this);
    this.load.on('progress', p => { const b = document.getElementById('boot'); if (b) b.textContent = `${stageDef.loading} ${Math.round(p * 100)}%`; });
  }
  releaseStage(toStage, fromStage) {
    if (!this.textures || !this.textures.remove) return;
    const toChars = new Set(STAGE_CHARS[toStage] || []);
    const toTextures = new Set(STAGE_TEXTURES[toStage] || []);
    const activeStages = [1, 2];
    if (stageEnabled(3, q) || toStage === 3 || fromStage === 3) activeStages.push(3);
    if (stageEnabled(4, q) || toStage === 4 || fromStage === 4) activeStages.push(4);
    const fromStages = fromStage ? [fromStage] : activeStages.filter(n => n !== toStage);
    for (const from of fromStages) {
      const tex = from === 1 ? [...(STAGE_TEXTURES[1] || []), ...TWIX_ART_KEYS] : (STAGE_TEXTURES[from] || []);
      for (const k of tex) {
        if (!toTextures.has(k) && this.textures.exists(k)) this.textures.remove(k);
      }
      const chars = (STAGE_CHARS[from] || []).filter(k => !toChars.has(k));
      releaseChars(this, chars);
    }
    // Stage 3 re-queues Stage 2 props and the Fade portrait, which are not in its texture list.
    // Drop them when the destination does not use them, and drop the kit's canvases on Stage 1.
    for (const k of ['arrow', 'ribbon', 'fadePortrait']) if (!toTextures.has(k) && this.textures.exists(k)) this.textures.remove(k);
    if (toStage === 1) for (const k of ['raindrop', 'lanemark', 'guardmark', 'landing', 'ring']) if (this.textures.exists(k)) this.textures.remove(k);
    if (toStage !== 2) releaseClips(STAGE2_VOICES);
    if (toStage !== 3) releaseClips(STAGE3_VOICES);
    if (toStage !== 4) releaseClips(STAGE4_VOICES);
  }
  create(data) {
    if (window.__rwbStartup?.failed) return;
    this.runId = (this.runId || 0) + 1;
    const sd = data && Object.keys(data).length ? data : (this.sys && this.sys.settings && this.sys.settings.data) || {};
    this.stageNo = resolveStage(sd, q); this.stageData = sd;
    this.stageDef = STAGES[this.stageNo] || STAGES[1];
    this.zones = this.stageDef.zones; this.drops = this.stageDef.drops; this.bossDrop = this.stageDef.bossDrop;
    this.music = new MusicDirector((id, o) => playTrack(id, o), this.stageNo);
    this.kit = this.stageDef.kit ? new this.stageDef.kit(this) : null;
    this.koCount = 0; this.titleSel = this.stageNo;
    this.pauseReasons = new Set(); this.paused = false; this.gameOver = false;
    this.clearShown = false; this.victoryPending = false; this.boss = null; this.bot = null;
    this.hudReady = false; this.startRequested = false;
    this.backdropLit = []; this.ambient = undefined; this.fireCap = FIRE_LIGHT_CAP;
    this.inp = this.game.inp; this.inp.clear();
    const b = document.getElementById('boot'); if (b) b.remove();
    patchFlippedNormals();
    this.metas = makeCharAnims(this, this.stageDef.chars); makePowerAnims(this);
    this.inp = this.game.inp; this.rs = this.game.rs;
    const cam = this.cameras.main; cam.setOrigin(0, 0); cam.setZoom(this.rs); cam.setRoundPixels(false);
    this.lights.enable().setAmbientColor(0x39425f);
    this.fx = new FX(this);
    this.plates = this.cache.json.get('plates') || {};
    if (this.kit) { this.ambient = this.kit.ambient; this.lights.setAmbientColor(this.ambient); this.kit.build(); }
    else this.buildBackdrop();
    this.enemies = []; this.fireballs = []; this.carts = []; this.patches = []; this.pickups = []; this.barrels = [];
    this.loial = null; this.beam = null; this.spentSaidAt = -9; this.makeBeamTexture();
    this.powerDrops = []; this.twixDropped = false; this.cutscene = null;
    this.riley = new Riley(this, 180, 630);
    this.powers = new Powers(this);
    this.heroLight = this.lights.addLight(0, 0, 440, 0xd8e2ff, 1.0, 150);
    for (const [x, y] of this.stageDef.crates) this.addBarrel(x, y, this.stageDef.crateProp, this.stageDef.cratePlanks);
    if (!this.kit) this.snowFront = this.add.particles(0, 0, 'flake', { x: { min: -100, max: VW + 300 }, y: -20, lifespan: 6000, speedY: { min: 80, max: 130 }, speedX: { min: -50, max: -10 }, scale: { min: 0.5, max: 0.9 }, alpha: { min: 0.5, max: 0.9 }, frequency: 80 }).setDepth(5000).setScrollFactor(0);
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
      // Retired story objects must never finish against a reused scene instance.
      if (this.cutscene) {
        this.cutscene.done = true;
        this.cutscene.onLine = this.cutscene.onEnd = () => {};
      }
      this.cutscene = this.cutsceneAfter = null;
      stopSceneAudio();
      if (this.bot && this.bot.destroy) this.bot.destroy();
      if (this.kit) this.kit.destroy();
      for (const reason of this.pauseReasons) perf.setSuspended(reason, false);
      this.scene.stop('hud');
      perf.reset();
    });
    this.god = !!q.get('god');
    // ?skip=boss starts at the Chieftain arena (testing / quick device checks)
    // Bounds follow the skipped camera too; the post-physics arena clamp otherwise pins Riley to the left wall.
    if (q.get('skip') === 'boss') { const k = this.stageDef.skipBoss; this.zoneI = k.zoneI; this.riley.x = k.x; this.camX = this.camMax = k.camX; this.bounds = { l: this.camX, r: this.camX + VW }; }
    if (q.get('demo')) { this.bot = new Bot(this); }
    if (q.get('demo') || q.get('autostart') || sd.autostart) this.time.delayedCall(300, () => this.start());
    else if (audioUnlocked()) this.music?.set('title');
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
    this.moon = addMoon(this.lights);
    this.fires = [];
    const fires = FIRES.concat((this.plates.fires || []).map(f => [1, ...f]));
    for (const [pi, px, py, I, rad] of fires) {
      const m = this.midPlates[pi]; if (!m) continue;
      const wx = m.x + px * MID_SCALE, wy = MID_Y - m.height * MID_SCALE + py * MID_SCALE;
      const L = this.lights.addLight(wx, wy, rad, 0xff8a3a, I, 110); L.baseX = wx; L.baseI = I; L.seed = Math.random() * 10; this.fires.push(L);
      if (I > 1) this.add.particles(wx, wy, 'ember', { lifespan: 2600, speedY: { min: -80, max: -30 }, speedX: { min: -25, max: 30 }, scale: { start: 0.9, end: 0 }, frequency: 110, blendMode: 'ADD' }).setScrollFactor(0.4, 1).setDepth(-49);
    }
  }
  setBloom(on) {
    const cam = this.cameras.main;
    if (!on && this.bloom) { cam.filters.internal.remove(this.bloom); this.bloom = null; }
    if (on && !this.bloom) { const pf = this.bloom = cam.filters.internal.addParallelFilters(); pf.top.addThreshold(0.62, 1); pf.top.addBlur(1, 2, 2, 1.2); pf.blend.blendMode = Phaser.BlendModes.ADD; pf.blend.amount = 0.5; }
  }
  // when the backdrop drops to unlit (software/slow GPUs) the painted plates show at full value, so lift the sprite ambient to keep fighters readable against them
  setBackdropLit(on) { for (const o of this.backdropLit || []) o.setLighting(on); this.backdropIsLit = on; this.ambient = this.kit ? (on ? this.kit.ambient : this.kit.ambientUnlit) : on ? 0x39425f : 0x5a6482; if (this.lightsOn !== false) this.lights.setAmbientColor(this.ambient); }
  dropVignette() { if (this.vignette) { this.cameras.main.filters.external.remove(this.vignette); this.vignette = null; } }
  toggleLights() { this.lightsOn = !this.lightsOn; this.lights.setAmbientColor(this.lightsOn ? (this.ambient || 0x39425f) : 0xffffff); }
  // ---------- flow ----------
  onPress(a) {
    // A press proves the window has focus. Clear a blur pause before the cutscene
    // and manual branches so a missing focus event cannot freeze the story or the fight.
    // A focus-only Start does not also toggle the manual pause.
    const blurOnly = this.pauseReasons.size === 1 && this.pauseReasons.has('window-blur');
    if (this.pauseReasons.has('window-blur')) this.setPauseReason('window-blur', false);
    // The Twix cutscene owns every press while it is up: Start/pause skips it, attack/jump/fireball advance a line.
    if (this.cutscene) {
      for (const reason of this.pauseReasons) if (reason !== 'cutscene') {
        if (reason === 'manual' && (a === 'pause' || a === 'start')) this.setPauseReason('manual', false);
        this.inp.clear(); return;
      }
      this.cutscene.press(a); return;
    }
    if (a === 'pause' || (a === 'start' && this.started && !this.ended && !this.gameOver)) {
      if (blurOnly) return;
      if (this.started && !this.ended && !this.gameOver && !this.pauseReasons.has('report')) this.setPauseReason('manual', !this.pauseReasons.has('manual'));
      return;
    }
    if (this.paused) { this.inp.clear(); return; }
    unlock();
    // Title stage select: left/right pick the stage (when Stage 2 is offered); any other press starts.
    if (!this.started && !this.ended && (a === 'left' || a === 'right' || a === 'up' || a === 'down')) { if (a === 'left' || a === 'right') this.selectStage(a === 'left' ? -1 : 1); return; }
    if (!this.started && !this.ended) return this.start();
    if (this.gameOver && (a === 'attack' || a === 'start')) return this.continueGame();
    // Stage 1 clear continues into the Baerlon story beat and Stage 2; Stage 2 clear returns to the title.
    if (this.ended && this.clearShown && (a === 'attack' || a === 'start')) return this.scene.restart(this.stageDef.next(q));
  }
  setPauseReason(reason, paused) {
    if (paused) this.pauseReasons.add(reason); else this.pauseReasons.delete(reason);
    perf.setSuspended(reason, paused);
    const next = this.pauseReasons.size > 0;
    this.inp.clear();
    if (next === this.paused) return;
    this.paused = next;
    if (next) this.scene.pause(); else this.scene.resume();
    if (this.hud && this.hud.pauseLabel) this.hud.pauseLabel.setVisible(this.showPauseLabel());
  }
  /** PAUSED card: any pause except the cutscene (which draws its own screen) */
  showPauseLabel() { return this.paused && [...this.pauseReasons].some(r => r !== 'cutscene'); }
  /** title stage select: the HUD shows the choice; starting a different stage reloads the scene with its assets */
  selectStage(dir) {
    if (this.started || this.ended) return;
    unlock(); this.music?.set('title');
    const cur = this.titleSel || this.stageNo, n = Math.max(1, Math.min(maxStage(q), cur + dir));
    if (n !== cur) { this.titleSel = n; sfx.go(); this.hud.titleSelect?.(n); }
  }
  start() {
    if (this.started) return;
    if (!this.hudReady) { this.startRequested = true; return; }
    if (this.titleSel && this.titleSel !== this.stageNo) { this.startRequested = false; return this.scene.restart({ stage: this.titleSel, autostart: true }); }
    this.startRequested = false; this.started = true; this.inp.flushPresses?.(); unlock(); preloadVoices(); this.hud.hideTitle(); this.time0 = this.time.now;
    perf.reset();
    if (this.stageDef.start) return this.stageDef.start(this);
  }
  startStage2() {
    this.kit.start();
    if (q.get('story') === '0' || this.stageData.story === false) { this.music?.set('stage'); return; }
    this.startCutscene(STORY_SCRIPT, STORY_PANELS, how => { this.storyResult = how; this.music?.set('stage'); });
  }
  startStage3() {
    this.kit.start();
    if (q.get('story') === '0' || this.stageData.story === false) { this.music?.set('stage'); return; }
    this.startCutscene(STORY3_SCRIPT, STORY3_PANELS, how => { this.storyResult = how; this.music?.set('stage'); });
  }
  startStage4() {
    this.kit.start();
    if (q.get('story') === '0' || this.stageData.story === false) { this.music?.set('stage'); return; }
    this.startCutscene(STORY4_SCRIPT, STORY4_PANELS, how => { this.storyResult = how; this.music?.set('stage'); });
  }
  attackTokens() {
    if (this.enemies.some(e => e.alive && (e.state === 'holding' || e.state === 'kiss_hold' || e.state === 'kiss_tell' || e.state === 'kiss_lunge'))) return this.maxTokens;
    return this.enemies.filter(e => e.alive && (e.state === 'attack' || e.state === 'sweep' || e.state === 'charge' || e.state === 'lunge' || e.state === 'holding' || e.state === 'kiss_tell' || e.state === 'kiss_lunge' || cultistHoldsToken(e))).length;
  }
  grabBusy(e) { return this.enemies.some(o => o !== e && o.alive && (o.state === 'lunge' || o.state === 'holding' || o.state === 'kiss_hold' || o.state === 'kiss_lunge' || o.state === 'kiss_tell')); }
  separation(e) { let f = 0; for (const o of this.enemies) if (o !== e && o.alive) { const dx = e.x - o.x, dy = e.y - o.y; if (Math.abs(dx) < 90 && Math.abs(dy) < 30) f += Math.sign(dx || (e.id - o.id)) * 60; } return f; }
  spawn(type, side) {
    if (side === 'T' && ENEMY_CLASSES[type]?.prototype.dropIn) {
      const z = this.zone, b = this.bounds, R = this.riley, d = CUTTHROAT.dropSpread;
      const x = clamp(R.x + rand(-d, d), Math.max(z.l, b.l) + 90, Math.min(z.r, b.r) - 90), y = rand(LANE_TOP + 15, LANE_BOT - 10);
      const e = new ENEMY_CLASSES[type](this, x, y); e.entering = false; e.dropIn(); if (!this.enemies.includes(e)) this.enemies.push(e); return e;
    }
    if (side === 'T') side = 'R';
    const z = this.zone, x = side === 'R' ? z.r + 120 : z.l - 120, y = rand(LANE_TOP + 15, LANE_BOT - 10);
    const W = ENEMY_CLASSES[type];
    const e = type === 'chief' ? new Chieftain(this, x, y) : W ? new W(this, x, y) : new Enemy(this, type, x, y); e.entering = true; if (!this.enemies.includes(e)) this.enemies.push(e); return e;
  }
  updateZones(dt) {
    const R = this.riley;
    if (!this.zone) {
      const nz = this.zones[this.zoneI + 1];
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
      if (!w) { if (this.kit) this.kit.onZoneClear(this.zoneI); this.zone = null; this.locked = false; this.hud.go(); sfx.go(); return; }
      this.pending = w.map(([type, side, t]) => ({ type, side, t })); this.waveGap = 0.8;
      if (this.powerDrops) for (const d of this.drops) if (d.zone === this.zoneI && d.wave === this.wave) this.powerDrops.push({ kind: d.kind, t: d.delay });
      if (this.stageDef.ribbon && this.stageDef.ribbon.zone === this.zoneI && this.stageDef.ribbon.wave === this.wave && this.powerDrops) this.powerDrops.push({ kind: 'ribbon', t: this.stageDef.ribbon.delay });
    }
  }
  startBoss() {
    this.music?.set('boss');
    const b = this.stageDef.boss;
    this.time.delayedCall(700, () => {
      const c = this.boss = this.spawn(b.type, 'R');
      if (b.cool) c.cool = b.cool;
      if (b.nextRoar) c.nextRoar = b.nextRoar;
      if (b.introVoice) say(b.introVoice, this.caption);
      if (b.sfx === 'horn') sfx.horn(); else if (b.sfx === 'roar') sfx.roar();
      this.hud.bossBar(c);
    });
  }
  onBossPhase(c, ph) {
    if (this.stageDef.onBossPhase) this.stageDef.onBossPhase(this, c, ph);
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
    this.victoryPending = true; this.powers?.clearAll(); if (this.powerDrops) this.powerDrops = [];
    if (this.gameOver) { this.gameOver = false; stopSceneAudio(); this.hud.hideGameOver(); }
    this.fx.slowmo = 1.2; this.fx.hitstop = 0.25; sfx.impact();
    for (const e of this.enemies) if (e !== c && e.alive) { e.hp = 0; e.die(Math.sign(e.x - this.riley.x) || 1, { kb: 300, launch: 300 }); }
    this.music?.set('victory');
    this.stageDef.bossDown(this, c);
  }
  stats() { const R = this.riley; return { score: R.score, combo: R.maxCombo, time: (this.time.now - this.time0) / 1000, lives: R.lives, stage: this.stageNo, ribbons: this.kit ? this.kit.ribbons : undefined }; }
  rileyDied() {
    const R = this.riley; R.lives--; this.powers?.clearAll();
    this.time.delayedCall(1600, () => {
      if (R !== this.riley || this.victoryPending || this.ended) return;
      if (R.lives > 0) { R.respawn(); for (const e of this.enemies) if (e.alive && Math.abs(e.x - R.x) < 260) e.vx = Math.sign(e.x - R.x) * 500; }
      else { this.gameOver = true; sfx.gameOver(); this.hud.gameOver(); this.music?.set('gameover'); }
    });
  }
  continueGame() { const R = this.riley; this.gameOver = false; R.lives = 3; R.score = Math.floor(R.score / 2); R.respawn(); this.hud.hideGameOver(); this.music?.resumeFight(); }
  // ---------- combat ----------
  /** check an attack's active frame against the other team */
  resolveAttack(att, a) {
    if (att.entering) return;
    const targets = att.team === 0 ? this.enemies : [this.riley];
    for (const t of targets) {
      if (t.entering || att.hitIds.has(t.id || 'riley') || (t === this.riley && t.grabbedBy && att !== t.grabbedBy)) continue;
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
    if (att === this.riley && t !== this.riley) { this.riley.landedHit(a.dmg, a.noMeter); this.hud.target(t); this.hud.combo(this.riley.combo); }
    return true;
  }
  grabCandidate(R) {
    for (const e of this.enemies) if (e.grabbable && Math.abs(e.y - R.y) < 18) { const dx = (e.x - R.x) * R.facing; if (dx > 40 && dx < 105 && (e.state === 'hurt' || e.cool > 0.2)) return e; }
    return null;
  }
  dustLater(f, t) { this.time.delayedCall(t * 1000, () => { this.fx.thump(f.x - f.facing * 40, f.y, true); sfx.thud(); }); }
  spawnFireball(R) {
    // An active angreal / sa'angreal throws three bigger fireballs in parallel lanes (1.1). Only the middle one
    // carries a light: the scene light budget (maxLights 10) is shared with the fires, moon, Riley and impacts.
    const B = this.powers?.boost && POWERS[this.powers.boost.kind], lanes = B ? B.lanes : [0];
    for (const off of lanes) {
      const x = R.x + R.facing * (120 - Math.abs(off) * 0.9), y = R.y - 150 + off, big = B ? 1.15 : 1;   // outer lanes trail: reads as three
      const core = this.add.image(x, y, 'core').setBlendMode('ADD').setScale(0.9 * big).setDepth(4003);
      const glow = this.add.image(x, y, 'glow').setBlendMode('ADD').setScale(1.4 * big).setAlpha(0.8).setDepth(4003);
      if (B) glow.setTint(B.color);
      const light = off === 0 ? this.lights.addLight(x, y, 420, 0xff9a40, 3.0, 70) : null;
      const trail = this.add.particles(0, 0, 'ember', { follow: core, lifespan: 480, speed: { min: 10, max: 70 }, scale: { start: 1.3, end: 0 }, frequency: this.fx.quality >= 2 ? 30 : 14, blendMode: 'ADD' }).setDepth(4002);
      this.fireballs.push({ x, y, gy: R.y + off, dir: R.facing, core, glow, light, trail, t: 0, dmg: B ? B.fireDmg : 14, big });
    }
  }
  updateFireballs(dt) {
    for (const f of this.fireballs.slice()) {
      f.t += dt; f.x += f.dir * 680 * dt; const wob = Math.sin(f.t * 40) * 0.08, big = f.big || 1;
      f.core.setPosition(f.x, f.y).setScale((0.9 + wob) * big); f.glow.setPosition(f.x, f.y).setScale((1.4 + wob * 2) * big);
      if (f.light) { f.light.x = f.x; f.light.y = f.y; f.light.intensity = 2.8 + Math.sin(f.t * 33) * 0.4; }
      let hit = null;
      for (const e of this.enemies) if (e.canBeHit && Math.abs(e.x - f.x) < 60 && Math.abs(e.y - f.gy) < 42) { hit = e; break; }
      const off = f.x < this.camX - 200 || f.x > this.camX + VW + 200;
      if (hit || off) {
        if (hit) { this.hitTarget(this.riley, hit, { dmg: f.dmg || 14, kind: 'heavy', kb: f.dir * 420, launch: 420, down: true }, { x: f.x - f.dir * 50, facing: f.dir }); this.fx.boom(f.x, f.y); sfx.boom(); }
        if (f.light) this.lights.removeLight(f.light); f.core.destroy(); f.glow.destroy(); f.trail.stop(); this.time.delayedCall(600, () => f.trail.destroy());
        this.fireballs.splice(this.fireballs.indexOf(f), 1);
      }
    }
  }
  // ---------- balefire (restored from 1.1) ----------
  makeBeamTexture() {
    if (this.textures.exists('beam')) return;
    // vertical profile: transparent edge -> blue-white -> white-hot core -> blue-white -> transparent
    const g = this.make.graphics({ x: 0, y: 0 }, false), H = 64;
    for (let y = 0; y < H; y++) { const d = Math.abs(y - (H - 1) / 2) / (H / 2); const a = Math.max(0, 1 - d * d); g.fillStyle(d < 0.28 ? 0xffffff : d < 0.6 ? 0xd8f0ff : 0x7cc4ff, a); g.fillRect(0, y, 8, 1); }
    g.generateTexture('beam', 8, H); g.destroy();
  }
  /** is there a foe on screen that a strike could hit right now? Balefire and Loial are refused (nothing spent) without one. */
  hasHittableFoe() { return this.enemies.some(e => e.canBeHit && e.x > this.camX - 60 && e.x < this.camX + VW + 60); }
  canBalefire() { return this.started && !this.gameOver && !this.ended && !this.victoryPending && !this.paused && !this.beam && this.hasHittableFoe(); }
  /** thrust frame: a white-hot beam to the screen edge in Riley's facing direction; every enemy in front is struck once */
  fireBalefire(R) {
    const dir = R.facing, x0 = R.x + dir * 95, y = R.y - R.z - 138;
    const edge = dir > 0 ? this.camX + VW + 160 : this.camX - 160, len = Math.max(60, Math.abs(edge - x0));
    const ox = dir > 0 ? 0 : 1, depth = 1000 + R.y + 2;
    const glow = this.add.image(x0, y, 'beam').setOrigin(ox, 0.5).setDisplaySize(len, 120).setTint(0x7cc0ff).setAlpha(0.6).setBlendMode('ADD').setDepth(depth);
    const core = this.add.image(x0, y, 'beam').setOrigin(ox, 0.5).setDisplaySize(len, 40).setBlendMode('ADD').setDepth(depth + 1);
    const hot = this.add.image(x0, y, 'beam').setOrigin(ox, 0.5).setDisplaySize(len, 16).setBlendMode('ADD').setDepth(depth + 1);
    // Small muzzle flare just ahead of the palms: a big additive flare washed Riley's black coat out to grey-brown.
    const flare = this.add.image(x0 + dir * 18, y, 'glow').setTint(0xdff4ff).setScale(FLARE_SCALE).setBlendMode('ADD').setDepth(depth + 2);
    // Lights ride the beam AHEAD of Riley so they light the foes and ground without washing out his own black coat.
    const lights = [Math.max(300, len * 0.4), len * 0.82].map(d => this.lights.addLight(x0 + dir * d, y + 40, 380, 0xd6ecff, BEAM_LIGHT, 110));
    this.beam = { t: 0, fade: 0, dir, x0, y, len, glow, core, hot, flare, lights, struck: new Set() };
    this.fx.trauma = Math.min(1, this.fx.trauma + 0.8); this.fx.hitstop = Math.max(this.fx.hitstop, 0.06);
    sfx.balefire(); this.balefireSweep();
    for (const b of this.barrels) if (!b.broken && (b.x - R.x) * dir > 0 && Math.abs(b.x - x0) <= len) this.breakBarrel(b, dir);
  }
  balefireSweep() {
    const B = this.beam, R = this.riley; if (!B || B.fade) return;
    for (const e of this.enemies) {
      if (B.struck.has(e) || !e.canBeHit) continue;
      const ahead = (e.x - R.x) * B.dir; if (ahead < -30 || ahead > B.len + 120) continue;
      const dmg = e.T && e.T.boss ? 80 : e.maxHp + 10;
      if (this.hitTarget(R, e, { dmg, kind: 'finisher', kb: B.dir * 520, launch: 520, down: true, power: true, noMeter: true }, { x: R.x, facing: B.dir })) B.struck.add(e);
    }
  }
  endBalefire() { if (this.beam && !this.beam.fade) this.beam.fade = 0.0001; }
  updateBalefire(dt) {
    const B = this.beam; if (!B) return;
    B.t += dt;
    const R = this.riley, released = R.state !== 'balefire' || (R.cur === 'riley_balefire' ? R.fi >= BALEFIRE.releaseFrame : B.t > 0.6);
    if (!B.fade && released) B.fade = 0.0001;
    if (!B.fade) this.balefireSweep(); else B.fade += dt;
    const k = B.fade ? Math.max(0, 1 - B.fade / 0.25) : Math.min(1, B.t / 0.06), wob = 0.85 + Math.random() * 0.3;
    B.core.setDisplaySize(B.len, 40 * wob * k).setAlpha(k); B.hot.setDisplaySize(B.len, 16 * wob * k).setAlpha(k); B.glow.setDisplaySize(B.len, 120 * (0.9 + Math.random() * 0.2) * k).setAlpha(0.6 * k);
    B.flare.setScale(FLARE_SCALE * wob * Math.max(0.2, k)).setAlpha(0.85 * k);
    for (const L of B.lights) L.intensity = this.lightsOn ? BEAM_LIGHT * k * wob : 0;
    if (B.fade && k <= 0) { for (const L of B.lights) this.lights.removeLight(L); B.glow.destroy(); B.core.destroy(); B.hot.destroy(); B.flare.destroy(); this.beam = null; }
  }
  // ---------- Loial assist (restored from 1.1) ----------
  callLoial() {
    if (!this.started || this.gameOver || this.ended || this.victoryPending || this.paused) return false;
    const R = this.riley;
    if (!R.loialReady || this.loial) { if (this.time.now - this.spentSaidAt > 2500) { this.spentSaidAt = this.time.now; say('riley_call_spent_01', this.caption, false); } return false; }
    if (!this.metas || !this.metas.loial) return false;
    if (!this.hasHittableFoe()) return false;   // don't spend Loial on an empty street
    R.loialReady = false;
    this.loial = new Loial(this, this.camX - 140, clamp(R.y, LANE_TOP, LANE_BOT));
    sfx.loialHorn(); say('riley_call_01', this.caption);
    return true;
  }
  updateLoial(dt) {
    const L = this.loial; if (!L) return;
    L.update(dt); L.sync();
    if (L.gone) { L.destroy(); this.loial = null; }
  }
  // ---------- props ----------
  addBarrel(x, y, tex = 'barrel', debris = 'staves') {
    const s = this.add.image(x, y, tex).setOrigin(0.5, 0.97).setScale(0.19).setLighting(true).setDepth(1000 + y);
    const sh = this.add.image(x, y + 2, 'shadow').setScale(1.2, 0.28).setDepth(900);
    this.barrels.push({ x, y, s, sh, broken: false, debris });
  }
  breakBarrel(b, dir) {
    b.broken = true; b.s.destroy(); b.sh.destroy(); sfx.smash(); this.fx.impact('medium', b.x, b.y - 60, dir);
    const atlas = b.debris || 'staves', fr = this.textures.get(atlas).getFrameNames();
    for (const n of fr) {
      const p = this.add.image(b.x + rand(-20, 20), b.y - rand(30, 90), atlas, n).setScale(0.19).setLighting(true).setDepth(1000 + b.y);
      const vx = dir * rand(80, 360) + rand(-80, 80), vz = rand(-620, -300), spin = rand(-12, 12);
      this.tweens.addCounter({ from: 0, to: 1, duration: 900, onUpdate: (tw) => { const t = tw.getValue() * 0.9; p.x += vx * 0.016; p.y = b.y - 60 + vz * t + 1400 * t * t; if (p.y > b.y + rand(-6, 6)) { p.y = b.y; } p.rotation += spin * 0.016 * (p.y < b.y ? 1 : 0); }, onComplete: () => this.tweens.add({ targets: p, alpha: 0, delay: 1500, duration: 600, onComplete: () => p.destroy() }) });
    }
    this.dropPickup(b.x, b.y, Math.random() < 0.5 ? 'heal' : 'saidin');
  }
  dropPickup(x, y, kind) {
    const P = POWERS[kind];
    if (P) return this.dropPower(x, y, kind);
    const col = kind === 'heal' ? 0xff8866 : 0x88ccff;
    const g = this.add.image(x, y - 30, 'glow').setBlendMode('ADD').setScale(0.55).setTint(col).setDepth(1000 + y);
    const c = this.add.image(x, y - 30, 'core').setBlendMode('ADD').setScale(0.35).setTint(col).setDepth(1000 + y);
    const L = this.lights.addLight(x, y - 40, 160, col, 1.2, 80);
    const p = { x, y, kind, g, c, L, t: 0 }; this.pickups.push(p); return p;
  }
  /** a power pickup: glow + painted icon + light (the same two visuals and one light as a heal pickup).
   *  Powers pop in where they land; the Twix falls into the screen from above. Uncollected powers fade after PICKUP_LIFE. */
  dropPower(x, y, kind) {
    const P = POWERS[kind], twix = kind === 'twix';
    const g = this.add.image(x, y - 30, 'glow').setBlendMode('ADD').setScale(1).setTint(P.color).setDepth(1000 + y);
    const c = this.add.image(x, y - 30, iconKey(kind)).setScale(0.7).setDepth(1000 + y + 1);
    const L = this.lights.addLight(x, y - 40, 200, P.color, 1.4, 80);
    const p = { x, y, kind, g, c, L, t: 0, power: true, z: twix ? TWIX_DROP_Z : 0, vz: 0, ready: !twix, pop: twix ? 1 : 0 };
    this.pickups.push(p);
    preloadClips(twix ? ['riley_twix_01', ...TWIX_SCRIPT.map(l => l.id)] : [P.voice]);
    if (twix) { this.twixDropped = true; sfx.fall(); } else sfx.powerUp();
    this.powers?.dropped.push(kind);
    return p;
  }
  /** wave-start power drops land a step ahead of Riley, inside the current arena */
  updatePowerDrops(dt) {
    if (!this.powerDrops) return;
    for (const d of this.powerDrops.slice()) {
      if ((d.t -= dt) > 0) continue;
      this.powerDrops.splice(this.powerDrops.indexOf(d), 1);
      if (this.victoryPending || this.ended) continue;
      if (d.kind === 'ribbon') { if (this.kit) this.kit.dropRibbon(); continue; }
      let kind = d.kind === 'ter?' ? pick(TER_POWERS) : d.kind;
      if (kind === 'twix' && this.twixDropped) continue;
      const R = this.riley, x = clamp(R.x + R.facing * 170, this.bounds.l + 90, this.bounds.r - 90), y = clamp(R.y, LANE_TOP + 12, LANE_BOT - 12);
      this.dropPickup(x, y, kind);
    }
  }
  removePickup(p) { p.g.destroy(); p.c.destroy(); this.lights.removeLight(p.L); this.pickups.splice(this.pickups.indexOf(p), 1); }
  updatePickups(dt) {
    const R = this.riley;
    for (const p of this.pickups.slice()) {
      p.t += dt; const bob = Math.sin(p.t * 4) * 6;
      if (p.power) {
        if (!p.ready) {   // falling in (the Twix): gravity, then one small bounce
          p.vz -= 1800 * dt; p.z = Math.max(0, p.z + p.vz * dt);
          if (p.z === 0) { if (p.vz < -500) { p.vz = -p.vz * 0.3; p.z = 0.01; this.fx.thump(p.x, p.y, false); } else { p.ready = true; p.vz = 0; say('riley_twix_01', this.caption, false); this.hud.flashText('A TWIX?!'); } }
        }
        if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 4);
        const left = PICKUP_LIFE - p.t, blink = left < PICKUP_BLINK && Math.floor(left * 8) % 2 ? 0.25 : 1;
        p.c.setPosition(p.x, p.y - 44 - p.z + (p.ready ? bob : 0)).setScale(0.7 * p.pop).setAlpha(blink);
        p.g.setPosition(p.x, p.y - 44 - p.z + (p.ready ? bob : 0)).setScale((1 + 0.08 * Math.sin(p.t * 6)) * p.pop).setAlpha(0.9 * blink); p.L.x = p.x; p.L.y = p.y - 54 - p.z;
        if (left <= 0) { this.removePickup(p); continue; }
        if (!p.ready) continue;
      } else { p.g.y = p.c.y = p.y - 34 + bob; p.L.y = p.y - 44 + bob; }
      if (Math.abs(R.x - p.x) < 50 && Math.abs(R.y - p.y) < 30 && R.alive) {
        this.removePickup(p);
        if (p.kind === 'heal') { R.hp = Math.min(R.maxHp, R.hp + 35); sfx.pickup(); }
        else if (p.kind === 'saidin') { R.saidin = 100; sfx.pickup(); }
        else if (p.kind === 'ribbon') this.kit.collectRibbon(p);
        else this.collectPower(p.kind);
      }
    }
  }
  collectPower(kind) {
    const P = POWERS[kind];
    if (kind === 'twix') return this.startTwixCutscene();
    this.powers.activate(kind); sfx.powerUp();
    this.hud.flashText(`${P.name}  ${P.seconds}s`);
    say(P.voice, this.caption, false);
  }
  // ---------- the Twix campfire cutscene ----------
  startTwixCutscene() {
    if (this.cutscene || this.victoryPending || this.ended || this.gameOver) return false;
    sfx.pickup();
    const cs = this.cutscene = new Cutscene(TWIX_SCRIPT, {
      onLine: line => { if (/TROLLOC/.test(line.who)) sfx.grumble(); say(line.id, null); this.hud.cutsceneLine(line); },
      onEnd: how => this.endTwixCutscene(how),
    });
    this.setPauseReason('cutscene', true);
    this.music?.set('cutscene');
    this.hud.showCutscene(cs);
    cs.begin();
    return true;
  }
  /** a story cutscene on painted panels (Stage 2's opening beat); same pause / skip / HUD path as the Twix scene */
  startCutscene(script, panels, after) {
    if (this.cutscene) return false;
    this.cutsceneAfter = after;
    const cs = this.cutscene = new Cutscene(script, {
      onLine: line => { say(line.id, null); this.hud.cutsceneLine(line); },
      onEnd: how => this.endTwixCutscene(how),
    });
    this.setPauseReason('cutscene', true);
    this.music?.set('cutscene');
    this.hud.showCutscene(cs, panels);
    cs.begin();
    return true;
  }
  /** ticked by the HUD scene (which keeps running while Stage1 is paused); other pauses freeze it too */
  tickCutscene(dt) {
    const cs = this.cutscene; if (!cs) return;
    for (const r of this.pauseReasons) if (r !== 'cutscene') return;
    cs.update(dt);
  }
  endTwixCutscene(how) {
    if (!this.cutscene) return;
    this.cutsceneResult = how; this.cutscene = null;
    stopSceneAudio(); this.hud.hideCutscene(how);
    this.setPauseReason('cutscene', false);
    const after = this.cutsceneAfter; this.cutsceneAfter = null;
    if (after) after(how); else this.music?.resumeFight();
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
    if (this.patches.length >= (this.kit ? 2 : 3)) { const o = this.patches.shift(); this.lights.removeLight(o.L); o.em.destroy(); o.sm.destroy(); }
    const em = this.add.particles(x, y - 10, 'ember', { x: { min: -60, max: 60 }, lifespan: 900, speedY: { min: -160, max: -60 }, speedX: { min: -20, max: 20 }, scale: { start: this.kit ? 1.2 : 1.8, end: 0 }, frequency: this.fx.quality >= 2 ? 50 : 22, blendMode: 'ADD' }).setDepth(1000 + y);
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
      if (this.loial) this.loial.sync();
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
    for (const e of this.enemies) if (e.alive && !e.entering && e.state !== 'held' && e.state !== 'holding' && e.state !== 'dropin' && R.state !== 'down' && Math.abs(e.y - R.y) < 18 && R.z < 40 && e.z < 40) {
      const dx = R.x - e.x, min = 62; if (Math.abs(dx) < min) R.x = e.x + Math.sign(dx || -R.facing) * min;
    }
    // Separation runs after physics; a wall-pinned enemy must not push Riley
    // back outside the arena bounds that physics already enforced.
    R.x = clamp(R.x, this.bounds.l + 40, this.bounds.r - 40);
    this.enemies = this.enemies.filter(e => { if (e.gone) { e.destroy(); return false; } return true; });
    this.updateFireballs(dt); this.updateCarts(dt); this.updatePowerDrops(dt); this.updatePickups(dt); this.powers?.update(dt); this.updateBalefire(dt); this.updateLoial(dt);
    if (this.kit) this.kit.update(dt);
    if (this.started && !this.gameOver) this.updateZones(dt);
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
    placeMoon(this.moon, this.camX + sx); placeFires(this.fires, this.camX + sx, this.fireCap || FIRE_LIGHT_CAP);
    this.kit?.applyLightBudget?.();
  }
}
