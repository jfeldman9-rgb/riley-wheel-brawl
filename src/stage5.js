// The Blight kit: hazards, the Eye, story, and the load. Controls stay in input.js.
import { q } from './config.js';
import { VOLLEY_BANDS, STAGE_TEXTURES } from './stages.js';
import { queuePowerArt } from './powers.js';
import { STAGE5, STAGE5_TEXTURES, LAYOUT5 } from './stage5-def.js';
import { createBlight, meleeTrunk, burnTrunk } from './stage5-blight.js';
import { createArena } from './stage5-arena.js';
import { createStage5View, sunAmbient } from './stage5-view.js';
import { updateSpores } from './stage5-spores.js';
import { queuePainted, freeStory5 } from './stage5-art.js';
import { preloadClips, releaseClips, MUSIC } from './audio.js';
import { STAGE5_VOICES, VOICE_FILES, stage5Say, bark, drainHum, sfxCue } from './stage5-voice.js';
import { clearStage5Hazards, clearStage5Zone, installStage5SceneHooks, installStage5RileyHook, restoreStage5Hooks } from './stage5-lifecycle.js';
import { stage4Delta } from './stage4-time.js';
import { stage5LightBudget } from './stage5-lighting.js';
import { lightNear } from './myrddraal.js';

export const STORY5_PANELS = Object.freeze([1, 2, 3].map(n => Object.freeze({ key: 'story5p' + n })));
export const STORY5_SCRIPT = Object.freeze([
  { who: 'NARRATOR', text: "Loial led him through the Ways. In the dark, a wind whispered Riley's name.", panel: 0, id: 'st5_story_01' },
  { who: 'RILEY', text: 'The trail runs north. Into the Blight.', panel: 1, id: 'st5_story_02' },
  { who: 'LOIAL', text: 'Nothing grows right here, Riley. Not even the trees.', panel: 1, id: 'st5_story_03' },
  { who: 'NARRATOR', text: 'Past the hills, something old was waiting.', panel: 2, id: 'st5_story_04' },
  { who: 'RILEY', text: "Good. I'm in a mood.", panel: 2, id: 'st5_story_05' },
]);
export { STAGE5_VOICES };

MUSIC.stage5 = { url: 'assets/audio/music-stage5.mp3', loopStart: 0.25, loopEnd: 40.25, gain: 1 };
MUSIC.boss5 = { url: 'assets/audio/music-boss5.mp3', loopStart: 0.25, loopEnd: 32, gain: 0.94 };

const STATS = ['hints', 'stalkers', 'pounces', 'pounceCounters', 'flushes', 'pods', 'spores', 'lashes', 'thornTicks', 'gouts', 'tethers', 'tetherCounters', 'rings', 'hands', 'staffs', 'shortSteps', 'flails', 'parries', 'steps', 'stepCounters', 'embraces', 'escapes', 'greenman', 'surges', 'surgeCounters', 'oak', 'ribbon', 'glimpses'];

export function queueStage5(scene) {
  const L = scene.load, has = k => scene.textures.exists(k);
  if (!has('crate')) L.image('crate', ['assets/props/prop-crate.webp', 'assets/props/prop-crate_n.webp']);
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  if (!scene.cache.json.get('layout5')) L.json('layout5', 'assets/bg5/layout.json');
  queuePainted(scene);
  queuePowerArt(scene, { twix: false });
}

export class Stage5Kit {
  constructor(s) {
    this.s = s; this.ribbons = 0; this.ribbonDropped = false; this._zone = -2;
    this.stats = {}; for (const k of STATS) this.stats[k] = 0;
    this._said = new Set();
  }
  get ambient() { return sunAmbient(this.s.camX || 0, this.lay?.sunKeys); }
  get ambientUnlit() { return 0x5a4030; }
  setQuality(level) {
    if (this.s?.fx) this.s.fx.quality = level;
    this.view?.sync?.(this);
    this.blight?.setQuality?.(level);
    this.arena?.setQuality?.(level);
  }
  layout() {
    const raw = this.s.cache?.json?.get?.('layout5');
    if (!raw?.trees) return LAYOUT5;
    const amb = n => (typeof n === 'number' ? n : LAYOUT5.sunKeys[0].ambient);
    return {
      sunKeys: (raw.sunKeys || LAYOUT5.sunKeys).map(k => ({ x: k.x, ambient: amb(k.ambient) })),
      lurks: raw.lurks || LAYOUT5.lurks, pods: raw.pods || LAYOUT5.pods,
      trees: raw.trees, thorns: raw.thorns || LAYOUT5.thorns, seeps: raw.seeps || LAYOUT5.seeps,
    };
  }
  build() {
    const s = this.s;
    installStage5SceneHooks(this);
    this.view = createStage5View(s);
    this.view.buildBackdrop();
    this.lay = this.layout();
    this.blight = createBlight(this.lay);
    this.arena = null;
    s.fires = []; s.spores = []; s.clouds = []; s.bands = VOLLEY_BANDS; this.bands = VOLLEY_BANDS;
    if (q.get('nopower') === '1' || s.stageData?.noPower) s.noPower = true;
  }
  start() { installStage5RileyHook(this); preloadClips(VOICE_FILES); this.s.music?.set('stage'); }
  bump(key) { this.stats[key] = (this.stats[key] || 0) + 1; }
  cue(name) { sfxCue(name); }
  hint(text) {
    if (this._said.has(text)) return;
    this._said.add(text); this.bump('hints'); this.s.hud?.flashText(text);
  }
  sayOnce(type, id) { bark(this.s, type, id); }
  lightAt(x, r) { return !!lightNear(this.s, x, r); }
  ensureArena() {
    if (this.arena) return this.arena;
    const z = this.s.zone || { l: 3920, r: 5200 };
    this.arena = createArena({ left: z.l, right: z.r });
    this.view?.ensureBossLights?.();
    return this.arena;
  }
  world() {
    const s = this.s, k = this;
    return {
      scene: s, riley: s.riley, enemies: s.enemies, story: !!s.cutscene, paused: !!s.paused,
      zone: s.zoneI < 0 ? 0 : s.zoneI, bands: VOLLEY_BANDS, frozen: !!k.arena?.frozen,
      aginor: s.boss, balthamel: s.enemies?.find(e => e.type === 'balthamel' && e.alive),
      onLash() { k.bump('lashes'); k.cue('treeCreak'); k.sayOnce('tree', 'riley_st5_tree_01'); },
      onThorn() { k.bump('thornTicks'); },
      onGout(seep) { k.bump('gouts'); k.cue('tarHiss'); },
      onBurst() { k.cue('goutBurst'); },
      onSnare() { k.cue('lashCrack'); },
      onRing() { k.bump('rings'); k.cue('ringCrack'); k.hint('JUMP THE RING'); k.sayOnce('ring', 'riley_st5_ring_01'); },
      onHands() { k.bump('hands'); k.cue('handsBurst'); },
      onSurge() { k.bump('surges'); k.cue('eyeFlare'); k.hint('HIT HIM WHILE HE BURNS'); },
      onOak() { if (!k.stats.oak) k.bump('oak'); },
      onRoot() { k.cue('oakGroan'); },
      onGreen() { k.bump('greenman'); stage5Say('greenman_arrive_01', s.caption); k.sayOnce('green', 'riley_st5_greenman_01'); },
      onBeatEnd() { stage5Say('greenman_fall_01', s.caption); },
      onTether() { k.bump('tethers'); k.hint("STEP OUT OF THE TETHER'S LINE"); },
      onLock() { drainHum(true); },
      onTetherEnd() { drainHum(false); },
      onDrain() {},
      onCounter(who, kind) {
        if (kind === 'tether') k.bump('tetherCounters');
        if (kind === 'pounce') k.bump('pounceCounters');
        if (kind === 'step') k.bump('stepCounters');
        if (kind === 'surge') k.bump('surgeCounters');
        s.hud?.flashText('COUNTER!');
      },
    };
  }
  update(dt) {
    dt = stage4Delta(dt);
    if (!dt || this.s.paused || this.s.cutscene) return;
    const s = this.s, R = s.riley;
    if (!R) return;
    if (s.zoneI !== this._zone) {
      this._zone = s.zoneI;
      if (s.zoneI === 0) { this.hint('LIGHT FLUSHES THE STALKERS'); this.sayOnce('stalk', 'riley_st5_stalk_01'); }
      if (s.zoneI === 3) { this.ensureArena(); if (!this._hi) { this._hi = 1; stage5Say('aginor_intro_01', s.caption); } }
    }
    R.fogSlow = 0; s._cloudSlow = 0;
    updateSpores(s, dt);
    const world = this.world();
    this.blight.step(dt, world);
    if (s.zone?.boss && s.boss) this.ensureArena().step(dt, world);
    const zone = s.zoneI < 0 ? 0 : s.zoneI;
    const trunk = meleeTrunk(this.blight, R, zone);
    if (trunk?.ribbon) this.dropRibbon();
    for (const f of s.fireballs || []) burnTrunk(this.blight, f.x, f.gy || f.y, zone);
    for (const b of s.powers?.bolts || []) if (b.L) burnTrunk(this.blight, b.L.x, b.L.y, zone);
    R.fogSlow = Math.max(R.fogSlow || 0, s._cloudSlow || 0);
    this.noteRiley(R);
    this.view.sync(this);
    this.view.moveSun(s.camX || 0);
    stage5LightBudget(this);
    s.ambient = s.backdropIsLit === false ? this.ambientUnlit : this.ambient;
    if (s.lightsOn !== false) s.lights?.setAmbientColor?.(s.ambient);
  }
  noteRiley(R) {
    if (R.hp <= 0 && R.alive) { R.grabbedBy?.releaseHold?.('break'); R.alive = false; this.s.rileyDied?.(); }
  }
  noteStalk(e) { if (e.state === 'dead' && !e._noted) { e._noted = 1; this.bump('stalkers'); } }
  notePod(e) { if (e.state === 'dead' && !e._noted) { e._noted = 1; this.bump('pods'); } }
  onPounce() { this.bump('pounces'); this.cue('stalkHiss'); }
  onLeap() { this.cue('stalkLeap'); }
  onFlush() { this.bump('flushes'); }
  onSwell() { this.cue('podSwell'); }
  onLob() { this.bump('spores'); }
  onSplat() { this.cue('sporeSplat'); }
  onTether(b) { this.world().onTether(b); }
  onLock(b) { drainHum(true); }
  onTetherEnd() { drainHum(false); }
  onCounter(who, kind) { this.world().onCounter(who, kind); }
  onStaff() { this.bump('staffs'); }
  onShortStep() { this.bump('shortSteps'); }
  onFlail() { this.bump('flails'); }
  onParry() { this.bump('parries'); }
  onStep() { this.bump('steps'); }
  onCoil() { this.cue('embraceCue'); stage5Say('balthamel_laugh_01', this.s.caption, false); }
  onEmbrace() { this.bump('embraces'); }
  onEscape() { this.bump('escapes'); this.sayOnce('free', 'riley_st5_free_01'); }
  onPhase() {}
  onBurn() { this.cue('burnRoar'); }
  onBalthDown(b) {
    const boss = this.s.boss;
    if (boss?.alive && !boss.beatDone && boss.phase === 2) this.startBeat(boss);
    if (b && !b._scored) { b._scored = 1; this.s.riley.score += b.T?.score || 0; }
  }
  startBeat(boss) {
    const a = this.ensureArena();
    a.startBeat(boss, this.s.enemies?.find(e => e.type === 'balthamel'), this.world());
  }
  onDefeat() { drainHum(false); }
  onPause(paused) { if (paused) drainHum(false); else if (this.s.boss?.locked) drainHum(true); }
  dropRibbon() {
    if (this.ribbonDropped) return;
    this.ribbonDropped = true;
    const s = this.s, R = s.riley, x = (R?.x || 1680) + 40, y = R?.y || 630;
    const g = s.add.image(x, y - 34, 'glow'), c = s.add.image(x, y - 34, s.textures.exists('ribbon') ? 'ribbon' : 's5flare');
    const L = s.lights.addLight(x, y - 40, 160, 0xd8ff6a, 1.1, 70);
    (s.pickups = s.pickups || []).push({ x, y, kind: 'ribbon', g, c, L, t: 0 });
  }
  collectRibbon() { this.ribbons++; this.bump('ribbon'); this.s.riley.score += 1000; this.s.hud?.flashText("TWINKLE TOES' RIBBON!"); this.s.hud?.ribbon?.(this.ribbons); }
  onZoneClear(i) {
    clearStage5Zone(this, i);
    if (i === 2 && !this.stats.glimpses) { this.bump('glimpses'); this.view?.glimpse?.(); this.s.hud?.flashText('THERE, ON THE RIDGE'); }
  }
  clearHazards() { clearStage5Hazards(this); }
  destroy() { drainHum(false); this.clearHazards(); this.view?.destroy(); restoreStage5Hooks(this); if (this.s.riley) this.s.riley.fogSlow = 0; }
  threats() {
    const z = this.s.zoneI < 0 ? 0 : this.s.zoneI, b = this.blight, a = this.arena;
    return {
      thorns: b.thorns.filter(t => t.on && t.zone === z && t.burn <= 0),
      gouts: b.seeps.filter(t => t.zone === z && t.phase === 'tell'),
      lashes: b.trees.filter(t => t.zone === z && t.lashed && !t.show),
      seeps: b.seeps.filter(t => t.zone === z && t.phase !== 'gone'),
      ring: a?.ring || null, hands: a?.hands || [], surge: a?.surge || null, oak: a?.oak?.open ? a.oak : null,
      trees: b.trees.filter(t => t.zone === z && t.ribbon && !this.ribbonDropped),
    };
  }
  koStars() {}
  telegraph() {}
  glint() {}
}
STAGE5.kit = Stage5Kit;
STAGE5.queue = queueStage5;
STAGE5.start = scene => {
  scene.kit?.start();
  if (q.get('story') === '0' || scene.stageData?.story === false) { scene.music?.set('stage'); freeStory5(scene); return; }
  const begun = scene.startCutscene(STORY5_SCRIPT, STORY5_PANELS, () => { scene.storyResult = 'end'; scene.music?.set('stage'); freeStory5(scene); });
  if (begun === false) freeStory5(scene);
};

queueMicrotask(() => {
  if (typeof globalThis.Phaser === 'undefined') return;
  import('./stage1.js').then(m => {
    const p = m.Stage1?.prototype;
    if (!p || p._s5rel) return;
    const orig = p.releaseStage;
    p.releaseStage = function (to) {
      const out = orig.apply(this, arguments);
      if (to !== 5 && this.textures?.exists) {
        const keep = new Set(STAGE_TEXTURES[to] || []);
        for (const k of STAGE5_TEXTURES) if (!keep.has(k) && this.textures.exists(k)) this.textures.remove(k);
        releaseClips(STAGE5_VOICES);
      }
      return out;
    };
    p._s5rel = 1;
  });
});
