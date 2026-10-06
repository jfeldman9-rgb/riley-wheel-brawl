// Shadar Logoth. Fog, towers and the Draghkar are siblings; this file is the kit and the load.
import { q } from './config.js';
import { queueCharPages } from './assets.js';
import { VOLLEY_BANDS } from './stages.js';
import { STAGE4 } from './stage4-def.js';
import { lightNear } from './myrddraal.js';
import { createFog } from './stage4-hazards.js';
import { createTowers, TOWER } from './stage4-towers.js';
import { createArena } from './stage4-arena.js';
import { LAYOUT, createStage4View, moonAmbient } from './stage4-view.js';
import { playStage4Sfx } from './stage4-sfx.js';
import { updateFogBolts, cultistHoldsToken } from './cultists.js';

export const STORY4_PANELS = Object.freeze([1, 2, 3].map(n => Object.freeze({ key: 'story4p' + n })));
export const STORY4_SCRIPT = Object.freeze([
  { who: 'NARRATOR', text: 'The Fade fled Caemlyn by night.', panel: 0 },
  { who: 'NARRATOR', text: 'Its trail ran east, to a city no map still names.', panel: 0 },
  { who: 'RILEY', text: 'Aridhol. Moiraine said never go in.', panel: 1 },
  { who: 'RILEY', text: 'He went in.', panel: 1 },
  { who: 'MORDETH', text: 'Stay... and be welcome... forever.', panel: 2 },
  { who: 'NARRATOR', text: 'Riley walked in.', panel: 2 },
]);
export const STAGE4_VOICES = Object.freeze([]);
export { cultistHoldsToken };

export function queueStage4(scene) {
  const L = scene.load, has = k => scene.textures.exists(k);
  if (!has('crate')) L.image('crate', ['assets/props/prop-crate.webp', 'assets/props/prop-crate_n.webp']);
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  if (!scene.cache.json.get('lights4')) L.json('lights4', 'assets/bg4/lights.json');
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
    s.fogBolts = [];
    if (q.get('nopower') === '1' || s.stageData?.noPower) s.noPower = true;
  }
  start() { this.s.music?.set('stage'); }
  world() {
    const s = this.s, z = s.zone, boss = s.boss;
    return {
      riley: s.riley, enemies: s.enemies, story: !!s.cutscene, paused: !!s.paused,
      lastWave: !!(z && !z.boss && s.wave >= (z.waves?.length || 1) - 1 && !(s.pending || []).length),
      exitX: z ? z.r - 40 : null, camX: s.camX, bands: VOLLEY_BANDS,
      holdWalls: !!(boss && boss.hp <= boss.maxHp * 0.15),
      onTowerHit: R => this.towerHit(R), onTowerTell: () => { this.stats.towers++; this.cue('towerCrack'); },
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
  }
  update(dt) {
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
    this.countPhases(before);
    this.view.sync(this);
    this.view.budget?.(s.camX || 0, s.lightsOn !== false);
    this.view.moveMoon(s.camX || 0);
    if (s.lightsOn !== false) s.lights?.setAmbientColor?.(this.ambient);
  }
  emit(world) {
    const z = this.s.zoneI;
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
    for (const t of now) if (t.phase === 'light' && !this._lit.has(t.id)) { this._lit.add(t.id); this.stats.lightRecoils++; }
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
  noteBoss(b, prev) {
    if (b.state === 'swoop_tell' && prev !== 'swoop_tell') { this.stats.swoops++; this.cue('screech'); }
    if (b.state === 'counter_down' && prev !== 'counter_down') this.stats.swoopCounters++;
    if (b.state === 'croon' && prev !== 'croon') { this.stats.croons++; this.cue('croonChord'); }
    if (b.state === 'kiss_hold' && prev !== 'kiss_hold') this.stats.kisses++;
    if (prev === 'kiss_hold' && b.state === 'reels' && !this.stats.kissEscapes) this.stats.kissEscapes++;
  }
  noteCult(c, prev) { if (c.state === 'chant' && prev !== 'chant') this.stats.chants++; }
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
    this.towers.clearRubble();
    if (i === 2 && !this.stats.glimpses) { this.stats.glimpses++; this.view.glimpse(); this.s.hud?.flashText('THERE, ON THE BRIDGE!'); }
  }
  clearHazards() {
    const boss = this.s.boss;
    if (boss?.releaseHold) boss.releaseHold();
    this.fog?.dispose(); this.towers?.dispose(); this.arena?.dispose();
    if (this.s.fogBolts) this.s.fogBolts.length = 0;
    if (boss) boss.gone = true;
  }
  destroy() { this.clearHazards(); this.view?.destroy(); }
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
  cue(name) {
    try {
      const ctx = this.s.game?.sound?.context, bus = ctx?.destination;
      if (ctx && bus) playStage4Sfx(ctx, bus, name);
    } catch { /* missing audio stays silent */ }
  }
  koStars() {}
  telegraph() {}
  glint() {}
  hint() {}
}
STAGE4.kit = Stage4Kit;
