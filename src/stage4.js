// Shadar Logoth. Fog, towers and the Draghkar are siblings; this file is the kit and the load.
import { q } from './config.js';
import { queueCharPages } from './assets.js';
import { VOLLEY_BANDS } from './stages.js';
import { STAGE4 } from './stage4-def.js';
import { lightNear } from './myrddraal.js';
import { createFog } from './stage4-hazards.js';
import { createTowers, TOWER } from './stage4-towers.js';
import { createArena } from './stage4-arena.js';
import { LAYOUT, createStage4View, moonAmbient, stage4Placeholder } from './stage4-view.js';
import { updateFogBolts, cultistHoldsToken } from './cultists.js';
import { preloadClips, say } from './audio.js';
import { STAGE4_VOICES, bark, croon, sfxCue, fogOffId } from './stage4-voice.js';
import { clearStage4Hazards, clearStage4Zone, installStage4SceneHooks, installStage4RileyHook, restoreStage4Hooks } from './stage4-lifecycle.js';
import { stage4Delta } from './stage4-time.js';
import { stage4LightBudget } from './stage4-lighting.js';

export const STORY4_PANELS = Object.freeze([1, 2, 3].map(n => Object.freeze({ key: 'story4p' + n })));
export const STORY4_SCRIPT = Object.freeze([
  { who: 'NARRATOR', text: 'The Fade fled Caemlyn by night.', panel: 0, id: 'st4_story_01' },
  { who: 'NARRATOR', text: 'Its trail ran east, to a city no map still names.', panel: 0 },
  { who: 'RILEY', text: 'Aridhol. Moiraine said never go in.', panel: 1, id: 'st4_story_02' },
  { who: 'RILEY', text: 'He went in.', panel: 1, id: 'st4_story_03' },
  { who: 'MORDETH', text: 'Stay... and be welcome... forever.', panel: 2, id: 'st4_story_04' },
  { who: 'NARRATOR', text: 'Riley walked in.', panel: 2, id: 'st4_story_05' },
]);
export { STAGE4_VOICES };
export { cultistHoldsToken };

export function queueStage4(scene) {
  const L = scene.load, has = k => scene.textures.exists(k);
  if (!has('crate')) L.image('crate', ['assets/props/prop-crate.webp', 'assets/props/prop-crate_n.webp']);
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  if (!scene.cache.json.get('lights4')) L.json('lights4', 'assets/bg4/lights.json');
  // Painted plates and story panels under the procedural keys; a file that fails leaves its key to the painter.
  const img = (k, u) => { if (!has(k)) L.image(k, u); };
  img('bg4far', 'assets/bg4/bg4-far.jpg'); img('bg4mid', 'assets/bg4/bg4-mid.webp'); img('bg4mid2', 'assets/bg4/bg4-mid2.webp');
  for (const n of ['', '2', '3']) img('bg4floor' + n, `assets/bg4/bg4-floor${n}.jpg`);
  for (const n of [1, 2, 3]) img('story4p' + n, `assets/story/story4_panel_${n}.jpg`);
  if (scene.cache.json.get('cutthroat.A')) queueCharPages(scene, ['cutthroat']);
  else {
    L.json('cutthroat.A', 'assets/stage3/chars/cutthroat.anims.json');
    L.once?.('filecomplete-json-cutthroat.A', () => queueCharPages(scene, ['cutthroat']));
  }
}

export class Stage4Kit {
  constructor(s) { this.s = s; this.ribbons = 0; this.ribbonDropped = false; this.stats = { tendrils: 0, meleeRecoils: 0, lightRecoils: 0, towers: 0, towerHits: 0, zoneWall: 0, swoops: 0, swoopCounters: 0, croons: 0, croonCancels: 0, kisses: 0, kissEscapes: 0, walls: 0, rubble: 0, chants: 0, ribbon: 0, glimpses: 0, hints: 0, summons: 0, fogSwoops: 0 }; this._rst = ''; this._zone = -2; this._wave = -2; }
  get ambient() { return moonAmbient(this.s.camX || 0, this.keys); }
  get ambientUnlit() { return 0x5a6482; }
  // The view reads fx.quality live; sync immediately when the governor changes it.
  setQuality(level) { this.s.fx.quality = level; this.view?.sync(this); }
  applyLightBudget() { stage4LightBudget(this); }
  layout() {
    const raw = this.s.cache?.json?.get?.('lights4');
    if (!raw) return LAYOUT;
    return {
      moonKeys: raw.moonKeys || LAYOUT.moonKeys,
      shafts: raw.shafts || LAYOUT.shafts,
      vents: (raw.vents || LAYOUT.vents).map(v => Array.isArray(v) ? { x: v[0], y: v[1], zone: v[2] || 0, fixed: v[3] ? { x: v[3][0], y: v[3][1] } : null } : v),
    };
  }
  build() {
    const s = this.s;
    installStage4SceneHooks(this);
    this.view = createStage4View(s);
    this.view.buildBackdrop();
    const lay = this.layout();
    this.keys = lay.moonKeys; this.shafts = lay.shafts.map(m => ({ ...m }));
    this.fog = createFog({ lightNear: (_w, x, r) => !!lightNear(s, x, r) });
    this.fog.setMoonshafts(this.shafts);
    for (const v of lay.vents) this.fog.addVent(v);
    for (const m of this.shafts) this.view.addShaftLight(m);
    this.towers = createTowers();
    this.arena = null;
    s.fireCap = 2;
    s.fires = [];
    s.moon = this.view.moon || null;
    // HUD PLACEHOLDER ART tag: only under ?debug, and only while visible Stage 4 art is still code-drawn
    s.ph4 = q.has('debug') && q.get('debug') !== '0' && stage4Placeholder(s);
    s.fogBolts = [];
    if (q.get('nopower') === '1' || s.stageData?.noPower) s.noPower = true;
  }
  start() { installStage4RileyHook(this); preloadClips(STAGE4_VOICES); this.s.music?.set('stage'); }
  world() {
    const s = this.s, z = s.zone, boss = s.boss;
    return {
      riley: s.riley, enemies: s.enemies, story: !!s.cutscene, paused: !!s.paused,
      lastWave: !!(z && !z.boss && s.wave >= (z.waves?.length || 1) - 1 && !(s.pending || []).length),
      exitX: z ? z.r - 40 : null, camX: s.camX, bands: VOLLEY_BANDS,
      holdWalls: !!(boss && boss.hp <= boss.maxHp * 0.15),
      onTowerHit: R => this.towerHit(R), onTowerTell: () => { this.stats.towers++; this.cue('towerCrack'); bark(this.s, 'tower', 'riley_tower_01'); },
      onWallTouch: () => { this.stats.zoneWall = 1; },
      onFogSwoop: () => { this.stats.fogSwoops++; },
    };
  }
  towerHit(R) {
    R.hp = Math.max(0, R.hp - TOWER.dmg);
    R.grabbedBy?.releaseHold?.('break');
    if (R.setState) R.setState('down', 'knockdown'); else R.state = 'down';
    this.stats.towerHits++;
    this.cue('towerCrack');
  }
  summonVent(at, cult) {
    const zone = this.s.zoneI < 0 ? 0 : this.s.zoneI;
    const v = this.fog.addVent({ x: at.x, y: at.y, zone });
    if (v) this.fog.tryEmit(v, this.world());
    this.stats.summons++;
    cult.summoned = at;
    bark(this.s, 'summon', 'cultist_feed_01');
  }
  update(dt) {
    dt = stage4Delta(dt);
    if (!dt || this.s.paused || this.s.cutscene) return;
    const s = this.s, R = s.riley;
    if (!R) return;
    if (s.zoneI !== this._zone) {
      this._zone = s.zoneI;
      this.towers.arm(s.zoneI);
      if (s.zoneI === 2) { this.towers.setWall({ x: 2560, zoneL: 2560, zoneR: 3840 }); this.stats.zoneWall = 1; }
      if (s.zoneI === 0 && !this.stats.hints) { this.stats.hints++; s.hud?.flashText('THE FOG FEARS LIGHT'); }
    }
    if (s.wave !== this._wave) { this._wave = s.wave; this.towers.clearRubble(); this.towers.setWave(s.wave); }
    const world = this.world();
    const before = this.fog.tendrils.map(t => t.phase);
    this.fog.keepZone(s.zoneI < 0 ? 0 : s.zoneI);
    this.fog.step(dt, { ...world, enemies: (world.enemies || []).filter(e => e.type !== 'draghkar') });
    this.towers.step(dt, world);
    const boss = s.enemies.find(e => e.type === 'draghkar' && e.alive);
    if (boss && boss.phase >= 3 && !this.arena) { this.arena = createArena({ left: s.zone?.l || 3920, right: s.zone?.r || 5200 }); this.stats.walls = 1; }
    if (this.arena?.active) {
      this.arena.step(dt, world);
      if (lightNear(s, this.arena.left, 80)) this.arena.pushLight('left');
      if (lightNear(s, this.arena.right, 80)) this.arena.pushLight('right');
    }
    updateFogBolts(s, dt);
    this.meleeTips(R);
    this.emit(world);
    this.noteRiley(R);
    this.hear(R);
    this.countPhases(before);
    this.view.sync(this);
    this.view.budget?.(s.camX || 0, s.lightsOn !== false);
    this.view.moveMoon(s.camX || 0);
    s.ambient = s.backdropIsLit === false ? this.ambientUnlit : this.ambient;
    if (s.lightsOn !== false) s.lights?.setAmbientColor?.(s.ambient);
  }
  emit(world) {
    const z = this.s.zoneI;
    if (this.clearedZones?.has(z)) return;
    for (const v of this.fog.vents) if (v.zone === z && v.phase === 'idle') {
      if (this.fog.tryEmit(v, world)) { this.stats.tendrils++; this.cue('fogGurgle'); }
    }
  }
  meleeTips(R) {
    if (!R.attackFrame) return;
    for (const t of this.fog.tendrils) {
      if (t.phase !== 'chase') continue;
      const dx = (t.tip.x - R.x) * (R.facing || 1);
      if (dx > 0 && dx < 190 && Math.abs(t.tip.y - R.y) < 50 && this.fog.melee(t.id)) this.stats.meleeRecoils++;
    }
    for (const r of this.towers.rubble.slice()) {
      const dx = (r.x - R.x) * (R.facing || 1);
      if (dx > 0 && dx < 160 && Math.abs(r.y - R.y) < 40 && this.towers.hitRubble(r.x) === 'break') {
        this.stats.rubble++;
        if (Math.random() < 0.5) this.s.dropPickup(r.x, r.y, 'heal');
      }
    }
  }
  countPhases(before) {
    const now = this.fog.tendrils;
    for (const t of now) if (t.phase === 'light' && before.length) this.stats.lightRecoils += 0;
    for (const t of now) if (t.phase === 'light') this._lit = this._lit || new Set();
    if (!this._lit) this._lit = new Set();
    for (const t of now) if (t.phase === 'light' && !this._lit.has(t.id)) { this._lit.add(t.id); this.stats.lightRecoils++; bark(this.s, 'light', 'riley_light_01'); }
  }
  noteRiley(R) {
    if (R.state === 'down' && this._rst !== 'down') {
      R.grabbedBy?.releaseHold?.('break');
      if (R.setState) R.setState('down', 'knockdown');
    }
    if (R.hp <= 0 && R.alive) {
      R.grabbedBy?.releaseHold?.('break');
      R.alive = false;
      this.s.rileyDied?.();
    }
    this._rst = R.state;
  }
  hear(R) {
    const touch = (R.fogContact || 0) > 0;
    if (touch && !this._fog) bark(this.s, 'fog', 'riley_fog_01');
    this._fog = touch;
    if (this._pend && !R.fogPend) bark(this.s, 'fogOff', fogOffId());
    this._pend = !!R.fogPend;
    for (const e of this.s.enemies) if (e.fogBurned) { e.fogBurned = 0; bark(this.s, 'burn', 'cultist_burn_01'); }
  }
  noteBoss(b, prev) {
    if (!this._met) { this._met = 1; say('draghkar_come_01', this.s.caption); }
    if (b.state === 'swoop_tell' && prev !== 'swoop_tell') { this.stats.swoops++; this.cue('screech'); }
    if (b.state === 'counter_down' && prev !== 'counter_down') this.stats.swoopCounters++;
    if (b.state === 'croon' && prev !== 'croon') { this.stats.croons++; croon(true); }
    if (prev === 'croon' && b.state !== 'croon') croon(false);
    if (b.state === 'kiss_tell' && prev !== 'kiss_tell') { this.cue('croonChord'); bark(this.s, 'soul', 'draghkar_soul_01', true); }
    if (b.state === 'kiss_hold' && prev !== 'kiss_hold') this.stats.kisses++;
    if (prev === 'kiss_hold' && b.state === 'reels' && !this.stats.kissEscapes) this.stats.kissEscapes++;
    if (b.state === 'defeated' && prev !== 'defeated') this.onDefeat();
  }
  noteCult(c, prev) { if (c.state === 'chant' && prev !== 'chant') { this.stats.chants++; bark(this.s, 'chant', 'cultist_call_01'); } }
  onPause(paused) {
    if (paused) croon(false);
    else if (this.s.enemies?.some(e => e.alive && e.type === 'draghkar' && e.state === 'croon')) croon(true);
  }
  onDefeat() {
    if (this._shriek) return;
    this._shriek = 1;
    croon(false);
    say('draghkar_shriek_01', this.s.caption);
  }
  dropRibbon() {
    if (this.ribbonDropped) return;
    this.ribbonDropped = true;
    const s = this.s, R = s.riley, x = R.x + 90, y = R.y;
    const key = s.textures.exists('ribbon') ? 'ribbon' : 's4tip';
    const g = s.add.image(x, y - 34, 'glow'); const c = s.add.image(x, y - 34, key);
    const L = s.lights.addLight(x, y - 40, 160, 0xd8ff6a, 1.1, 70);
    s.pickups.push({ x, y, kind: 'ribbon', g, c, L, t: 0 });
  }
  collectRibbon() { this.ribbons++; this.stats.ribbon++; this.s.riley.score += 1000; this.s.hud?.flashText("TWINKLE TOES' RIBBON!"); this.s.hud?.ribbon?.(this.ribbons); }
  onZoneClear(i) {
    clearStage4Zone(this, i);
    if (i === 2 && !this.stats.glimpses) { this.stats.glimpses++; this.view.glimpse(); this.s.hud?.flashText('THERE, ON THE BRIDGE!'); bark(this.s, 'bridge', 'riley_bridge_01'); }
  }
  clearHazards() {
    clearStage4Hazards(this);
  }
  destroy() { croon(false); this.clearHazards(); this.view?.destroy(); restoreStage4Hooks(this); }
  threats() {
    const wall = this.arena?.active ? { left: this.arena.left, right: this.arena.right } : null;
    return {
      arrows: [], sky: [], volley: null, torches: [], beams: [],
      tendrils: this.fog.tendrils.filter(t => t.phase === 'chase').map(t => ({ id: t.id, x: t.tip.x, y: t.tip.y })),
      towers: this.towers.towers.filter(t => t.phase === 'tell' && !t.harmless),
      zoneWall: this.towers.zoneWall, walls: wall, shafts: this.shafts, rubble: this.towers.rubble,
      fogSwoop: this.arena?.swoop || null,
    };
  }
  cue(name) { sfxCue(name); }
  koStars() {}
  telegraph() {}
  glint() {}
  hint() {}
}
STAGE4.kit = Stage4Kit;
