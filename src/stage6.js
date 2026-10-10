// The Stone of Tear. Controls stay in input.js. Rand replaces Loial only here.
import { q } from './config.js';
import { VOLLEY_BANDS, STAGE_TEXTURES, STAGE_CHARS } from './stages.js';
import { queuePowerArt } from './powers.js';
import { STAGE6, STAGE6_TEXTURES } from './stage6-def.js';
import { createStone, threatsOf, bandY } from './stage6-arena.js';
import { createStage6View } from './stage6-view.js';
import { freeStory6 } from './stage6-art.js';
import { preloadClips, releaseClips, MUSIC } from './audio.js';
import { makeCharAnims, releaseChars } from './assets.js';
import { STAGE6_VOICES, VOICE_FILES, stage6Say, sfxCue } from './stage6-voice.js';
import { installStage6SceneHooks, restoreStage6Hooks, holdDown, randCtx, warmRand } from './stage6-lifecycle.js';
import { installRandBless, removeRandBless } from './rand-call-cutscene.js';
import { createRand, tickRand } from './rand-call.js';
import { stage4Delta } from './stage4-time.js';
import { installStage6Hud, bindRandLabel, syncRandReady } from './stage6-hud.js';

MUSIC.stage6 = { url: 'assets/audio/music-stage6.mp3', loopStart: 0.25, loopEnd: 72.245283, gain: 1 };
MUSIC.boss6 = { url: 'assets/audio/music-boss6.mp3', loopStart: 0.25, loopEnd: 72.977279, gain: 0.94 };

export const STORY6_PANELS = Object.freeze([1, 2, 3].map(n => Object.freeze({ key: 'story6p' + n })));
export const STORY6_SCRIPT = Object.freeze([
  { who: 'NARRATOR', text: "Tarwin's Gap held. But the Fade's trail ran south, to the greatest fortress in the world.", panel: 0, id: 'st6_story_01' },
  { who: 'RILEY', text: "The Stone of Tear. She's in there.", panel: 1, id: 'st6_story_02' },
  { who: 'NARRATOR', text: 'That night, the barges at the Maule were not carrying grain.', panel: 1, id: 'st6_story_03' },
  { who: 'RAND', text: "You're the one hunting the Half-man. Then we hunt together.", panel: 2, id: 'st6_story_04' },
  { who: 'RILEY', text: "Just don't steal my kills.", panel: 2, id: 'st6_story_05' },
]);

export function queueStage6(scene) {
  const L = scene.load;
  if (!scene.cache?.json?.get?.('cutthroat.A')) L.json('cutthroat.A', 'assets/stage3/chars/cutthroat.anims.json');
  if (!scene.textures.exists('cutthroat-0')) L.atlas('cutthroat-0', 'assets/stage3/chars/cutthroat-0.webp', 'assets/stage3/chars/cutthroat-0.json');
  if (!scene.cache?.json?.get?.('layout6')) L.json('layout6', 'assets/bg6/layout.json');
  queuePowerArt(scene, { twix: false });
}

export class Stage6Kit {
  constructor(s) {
    this.s = s; this.ribbons = 0; this.ribbonDropped = false; this._zone = -2;
    this.rand = createRand(); this.bossTime = 0; this.quality = 0; this.stats = { hints: 0, glimpses: 0, ribbon: 0, calls: 0 };
    this._said = new Set();
  }
  get ambient() { return this.s?.zoneI >= 3 ? 0x2a2418 : 0x1a2438; }
  get ambientUnlit() { return 0x3a342c; }
  randCtx() { return randCtx(this); }
  setQuality(level) {
    this.quality = level | 0;
    if (this.s?.fx) this.s.fx.quality = level;
    this.stone?.setQuality?.(level); this.view?.setQuality?.(level);
    if (this.quality >= 2 && this.view) this.view.quality = this.quality;
    if (this.quality >= 4) import('./rand-call-cutscene.js').then(m => m.dropBlob());
  }
  build() {
    if (typeof globalThis.Phaser !== 'undefined') installStage6Hud();
    installStage6SceneHooks(this);
    this.view = createStage6View(this.s);
    this.view.quality = this.quality;
    this.view.buildBackdrop();
    this.stone = createStone();
    this.stone.setQuality(this.quality);
    this.s.fires = [];
    this.s.bands = VOLLEY_BANDS;
    if (this.s.metas && this.s.anims?.create) Object.assign(this.s.metas, makeCharAnims(this.s, ['cutthroat']));
    installRandBless(this.s);
    if (this.s.hud) this._unbindRand = bindRandLabel(this.s.hud);
    if (q.get('nopower') === '1' || this.s.stageData?.noPower) this.s.noPower = true;
  }
  start() { preloadClips(VOICE_FILES); this.s.music?.set('stage'); warmRand(this.s); }
  hint(text) { if (this._said.has(text)) return; this._said.add(text); this.stats.hints++; this.s.hud?.flashText(text); }
  world() {
    const s = this.s;
    return { scene: s, riley: s.riley, enemies: s.enemies, zone: s.zoneI < 0 ? 0 : s.zoneI, bounds: s.bounds, fireballs: s.fireballs, belal: s.boss, stone: this.stone };
  }
  update(dt) {
    const s = this.s, R = s.riley;
    if (s.hud && !s.hud._randBind) this._unbindRand = bindRandLabel(s.hud);
    if (R) syncRandReady(s);
    dt = stage4Delta(dt);
    if (!dt || s.paused || s.cutscene || this.strike) return;
    if (!R) return;
    tickRand(this.rand, dt);
    if (s.boss?.alive) this.bossTime += dt;
    if (s.zoneI !== this._zone) this.enterZone(s.zoneI);
    R.fogSlow = 0;
    this.stone.step(dt, this.world());
    const snare = this.stone.snare > 0;
    if (snare) R.fogSlow = 0.6;
    if (this._sn && !snare) this.snareCool = 0.4;
    this._sn = snare;
    if (this.snareCool > 0) this.snareCool -= dt;
    if (this._rst === 'getup' && R.state !== 'getup') this.getupCool = 0.8;
    if (this.getupCool > 0) this.getupCool -= dt;
    this._rst = R.state;
    holdDown(this, dt);
    this.rays(dt, R);
    this.view?.sync?.(this);
    this.view?.move?.(s.camX || 0);
    s.ambient = s.backdropIsLit === false ? this.ambientUnlit : this.ambient;
    if (s.lightsOn !== false) s.lights?.setAmbientColor?.(s.ambient);
  }
  enterZone(i) {
    this._zone = i;
    if (i === 0) this.hint('THE BARGES ARE OPENING');
    if (i === 1) { stage6Say('defender_01', this.s.caption, false); this.hint('THE DEFENDERS HOLD'); }
    if (i === 2) { this.hint('KILL THE HALF-MAN, ITS TROLLOCS REEL'); stage6Say('riley_st6_gray_01', this.s.caption, false); }
  }
  rays(dt, R) {
    const on = (this.stone.rays || []).filter(r => r.on);
    const hit = on.some(r => Math.abs(R.y - bandY(r.band)) < 26);
    this.rayT = hit ? (this.rayT || 0) + dt : 0;
    if (this.rayT >= 1 && !this.empowered) { this.empowered = true; this.rayT = 0; this.s.hud?.flashText('THE SWORD ANSWERS'); }
  }
  onBelalPhase(b, ph) {
    if (ph === 2) { this._spawn?.('grunt', 'L'); this._spawn?.('hound', 'R'); sfxCue('randThunder'); }
  }
  onCounter() {}
  onGrayTell() { sfxCue('knifeGlint'); }
  onFadelt() { this.hint('KILL THE HALF-MAN, ITS TROLLOCS REEL'); }
  onFadeltDown() {}
  onLungeTell() {}
  onChannel() {}
  onChannelFail() {}
  onChannelBreak() {}
  onErase() { stage6Say('belal_defeat_01', this.s.caption, false); }
  onZoneClear(i) {
    this.stone?.clearZone(i);
    if (this.s.riley) this.s.riley.fogSlow = 0;
    if (i === 2 && !this.stats.glimpses) { this.stats.glimpses++; this.view?.glimpse?.(); this.s.hud?.flashText('THERE, ON THE GALLERY'); }
  }
  dropRibbon() {
    if (this.ribbonDropped) return;
    this.ribbonDropped = true;
    const s = this.s, R = s.riley, x = (R?.x || 1800) + 30, y = R?.y || 630;
    const g = s.add.image(x, y - 30, 'glow'), c = s.add.image(x, y - 30, s.textures.exists('s6ribbon') ? 's6ribbon' : 'core');
    const L = s.lights?.addLight?.(x, y - 40, 140, 0xffd0e0, 0.7, 30) || { x, y };
    (s.pickups = s.pickups || []).push({ x, y, kind: 'ribbon', g, c, L, t: 0 });
  }
  collectRibbon() { this.ribbons++; this.stats.ribbon++; this.s.riley.score += 1000; this.s.hud?.flashText("TWINKLE TOES' RIBBON!"); }
  clearHazards() { this.stone?.dispose(); if (this.s.riley) this.s.riley.fogSlow = 0; }
  threats() { return threatsOf(this.stone || { nets: [], lamps: [], pools: [], lines: [], rays: [] }, this.s.zoneI < 0 ? 0 : this.s.zoneI); }
  destroy() {
    this.clearHazards(); this.view?.destroy(); restoreStage6Hooks(this); removeRandBless(); this._unbindRand?.();
    if (this.s.riley) { this.s.riley.fogSlow = 0; this.s.riley.loialReady = true; }
  }
  koStars() {}
  telegraph() {}
  glint() {}
  onPause() {}
}
STAGE6.kit = Stage6Kit;
STAGE6.queue = queueStage6;
STAGE6.start = scene => {
  scene.kit?.start();
  if (q.get('story') === '0' || scene.stageData?.story === false) { scene.music?.set('stage'); freeStory6(scene); return; }
  const begun = scene.startCutscene(STORY6_SCRIPT, STORY6_PANELS, () => { scene.storyResult = 'end'; scene.music?.set('stage'); freeStory6(scene); });
  if (begun === false) freeStory6(scene);
};

if (typeof globalThis.Phaser !== 'undefined') installStage6Hud();
queueMicrotask(() => {
  if (typeof globalThis.Phaser === 'undefined') return;
  import('./stage1.js').then(m => {
    const p = m.Stage1?.prototype;
    if (!p || p._s6rel) return;
    const orig = p.releaseStage;
    p.releaseStage = function (to) {
      const out = orig.apply(this, arguments);
      if (to !== 6 && this.textures?.exists) {
        const keep = new Set(STAGE_TEXTURES[to] || []);
        for (const k of STAGE6_TEXTURES) if (!keep.has(k) && this.textures.exists(k)) this.textures.remove(k);
        if (this.cache?.json?.get) releaseChars(this, ['fade', 'cutthroat'].filter(k => !(STAGE_CHARS[to] || []).includes(k)));
        releaseClips(STAGE6_VOICES);
      }
      return out;
    };
    p._s6rel = 1;
  });
});
