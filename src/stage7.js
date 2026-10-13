// Rhuidean. Controls stay in input.js. Moiraine and Lan replace Loial only here.
import { q, VW } from './config.js';
import { VOLLEY_BANDS, STAGE_TEXTURES, STAGE_CHARS } from './stages.js';
import { queuePowerArt } from './powers.js';
import { STAGE7, STAGE7_TEXTURES } from './stage7-def.js';
import { createStage7View } from './stage7-view.js';
import { freeStory7 } from './stage7-art.js';
import { queueStage7Painted, PAINTED7_ROWS } from './stage7-paint.js';
import { STREAMS, deferredPlateKeys, createPlateStream } from './zone-stream.js';
import { preloadClips, releaseClips, MUSIC } from './audio.js';
import { releaseChars } from './assets.js';
import { STAGE7_VOICES, VOICE_FILES, stage7Say, sfxCue } from './stage7-voice.js';
import { installStage7SceneHooks, restoreStage7Hooks, holdDown, callCtx, helperCtx, warmCall } from './stage7-lifecycle.js';
import { createCall7, tickCall7, pickHelper } from './moilan-call.js';
import { stage4Delta } from './stage4-time.js';
import { installStage7Hud, bindCallLabel, syncCallReady } from './stage7-hud.js';
import { createStorm, pushStorm } from './stage7-storm.js';
import { createStreet } from './stage7-street.js';
import { createArena } from './stage7-arena.js';
import { stepArrows } from './shaido.js';
import { bandOf, bandY } from './stage7-notes.js';
import { pump, releaseZoneArt } from './stage7-load.js';

MUSIC.stage7 = { url: 'assets/audio/music-stage6.mp3', loopStart: 0.25, loopEnd: 72.245283, gain: 1 };
MUSIC.boss7 = { url: 'assets/audio/music-boss6.mp3', loopStart: 0.25, loopEnd: 72.977279, gain: 0.94 };

export const STORY7_PANELS = Object.freeze([1, 2, 3].map(n => Object.freeze({ key: 'story7p' + n })));
export const STORY7_SCRIPT = Object.freeze([
  { who: 'NARRATOR', text: 'The Portal Stone took them in a heartbeat — and spat them out on a mountain at the edge of the world.', panel: 0, id: 'st7_story_01' },
  { who: 'NARRATOR', text: 'Below Chaendaer lay the Three-fold Land. And under a dome of fog, a city no outsider was meant to see.', panel: 1, id: 'st7_story_02' },
  { who: 'RILEY', text: 'She came through here. I can feel it.', panel: 1, id: 'riley_st7_story_01' },
  { who: 'MOIRAINE', text: 'Rhuidean. Step carefully. Something in that city is awake.', panel: 2, id: 'st7_story_03' },
  { who: 'LAN', text: 'Shadowspawn tracks. Fresh. Stay on my left.', panel: 2, id: 'st7_story_04' },
]);

export function queueStage7(scene) {
  const L = scene.load;
  queuePowerArt(scene, { twix: false });
  const defer = new Set(deferredPlateKeys(STREAMS[7]));
  const storyOff = q.get('story') === '0' || scene.stageData?.story === false;
  queueStage7Painted(scene, PAINTED7_ROWS.filter(r => !defer.has(r.key) && !(storyOff && /^story7p/.test(r.key))));
  if (!scene.textures.exists('s6fade') && L.atlas) L.atlas('s6fade', 'assets/stage6/chars/s6fade.webp', 'assets/stage6/chars/s6fade.json');
  if (!scene.textures.exists('s6streak') && L.spritesheet) L.spritesheet('s6streak', 'assets/stage6/props/s6streak.webp', { frameWidth: 512, frameHeight: 48 });
}

export class Stage7Kit {
  constructor(s) {
    this.s = s; this.ribbons = 0; this.ribbonDropped = false; this._zone = -2;
    this.call = createCall7(); this.bossTime = 0; this.quality = 0;
    this.stats = { hints: 0, calls: 0 }; this._said = new Set();
    this.storm = createStorm(); this.street = createStreet(); this.arena = createArena();
    this.z1Deaths = 0; this.gustDeaths = 0; this._helper = '';
  }
  get ambient() { return this.s?.zoneI >= 3 ? 0x1a2430 : this.s?.zoneI >= 2 ? 0x3a4a58 : 0x6a4030; }
  get ambientUnlit() { return 0x2a241c; }
  freezesRiley() { return !!(this.strike || this.s?.cutscene); }
  freezesWorld() { return !!(this.strike || this.s?.cutscene); }
  callCtx() { return callCtx(this); }
  helperNow() { return pickHelper(helperCtx(this)); }
  setQuality(level) {
    this.quality = level | 0;
    if (this.s?.fx) this.s.fx.quality = level;
    this.view?.setQuality?.(level);
    if (this.quality >= 4) import('./call7-cutscene.js').then(m => m.dropBlob());
  }
  build() {
    if (typeof globalThis.Phaser !== 'undefined') installStage7Hud();
    installStage7SceneHooks(this);
    this.view = createStage7View(this.s);
    this.view.quality = this.quality;
    this.view.buildBackdrop();
    this.backdrops = createPlateStream(this.s, 7, this.view, () => false);
    this.backdrops.sync();
    this.s.fires = [];
    this.s.bands = VOLLEY_BANDS;
    if (this.s.hud) this._unbind = bindCallLabel(this.s.hud);
    if (q.get('nopower') === '1' || this.s.stageData?.noPower) this.s.noPower = true;
  }
  start() { preloadClips(VOICE_FILES); this.s.music?.set('stage'); }
  hint(text) { if (this._said.has(text)) return; this._said.add(text); this.stats.hints++; this.s.hud?.flashText(text); }
  update(dt) {
    const s = this.s, R = s.riley;
    if (s.hud && !s.hud._s7bind) this._unbind = bindCallLabel(s.hud);
    if (R) syncCallReady(s);
    dt = stage4Delta(dt);
    if (!dt || s.paused || s.cutscene || this.strike) return;
    if (!R) return;
    tickCall7(this.call, dt);
    const helper = this.helperNow();
    if (helper !== this._helper && this.call.charges >= 1) { this._helper = helper; warmCall(s, helper); }
    if (s.boss?.alive) this.bossTime += dt;
    if (s.zoneI !== this._zone) this.enterZone(s.zoneI);
    if (s.zoneI === 1 && s.wave >= 1) this.storm.arm();
    const blocked = R.state === 'grabbed' || !!R.grabbedBy || !!this.strike;
    if (s.zoneI === 1) {
      const before = this.storm.told;
      this.storm.step(dt, blocked);
      if (this.storm.told !== before && this.storm.phase === 'tell') {
        if (this.storm.told === 1) stage7Say('st7_storm_01', s.caption, false);
        if (this.storm.told === 2) stage7Say('riley_st7_storm_01', s.caption, false);
        this.hint(this.storm.dir > 0 ? 'WIND FROM THE LEFT' : 'WIND FROM THE RIGHT');
        sfxCue('wind');
      }
      pushStorm(s, this.storm, dt);
    }
    if (s.zoneI === 2) {
      const seen = this.street.seen;
      this.street.step(s, dt);
      if (this.street.seen !== seen) stage7Say('riley_st7_street_01', s.caption, false);
    }
    this.arena.step(s, dt);
    stepArrows(s, dt);
    holdDown(this, dt);
    if (this.addT > 0) { this.addT -= dt; if (this.addT <= 0) { this._spawn?.('veiled', 'L'); this._spawn?.('dancer', 'R'); } }
    if (s.boss?.alive && s.boss.hp > 0 && s.boss.hp <= s.boss.maxHp * 0.1 && !this._crack) { this._crack = 1; if (s.fx) s.fx.trauma = 0.3; }
    this.backdrops?.sync?.();
    this.view?.sync?.(this);
    this.view?.move?.(s.camX || 0);
    pump(s);
    if (s.lightsOn !== false) s.lights?.setAmbientColor?.(this.ambient);
    void VW;
  }
  enterZone(i) {
    this._zone = i;
    if (i === 0) this.hint('THE PORTAL STONE IS DARK');
    if (i === 2) stage7Say('st7_veil_01', this.s.caption, false);
  }
  spawnAdds(ph) {
    if (ph !== 2 || this._adds) return;
    this._adds = 1;
    this._spawn?.('dancer', 'L'); this._spawn?.('grunt', 'R');
    this.addT = 6;
  }
  onReflect() { stage7Say('st7_asmo_hurt_01', this.s.caption, false); stage7Say('riley_st7_reflect_01', this.s.caption, false); sfxCue('gold'); }
  onZoneClear(i) {
    if (i === 1) this.storm.stop();
    if (i === 0 || i === 1) releaseZoneArt(this.s, i);
    if (i === 0) this.view?.dropPortal?.();
    if (i === 1) this.view?.dropDust?.();
  }
  dropRibbon() {
    if (this.ribbonDropped) return;
    this.ribbonDropped = true;
    const s = this.s, R = s.riley, x = (R?.x || 1800) + 30, y = R?.y || 630;
    const g = s.add.image(x, y - 30, 'glow'), c = s.add.image(x, y - 30, 'core');
    const L = s.lights?.addLight?.(x, y - 40, 120, 0xffd0a0, 0.6) || { x, y };
    (s.pickups = s.pickups || []).push({ x, y, kind: 'ribbon', g, c, L, t: 0 });
  }
  collectRibbon() { this.ribbons++; this.s.riley.score += 1000; this.s.hud?.flashText('A RED RIBBON'); }
  clearHazards() { this.storm.stop(); this.street.clear(); this.arena.clear(); if (this.s.boss) this.s.boss.notes = []; }
  threats() {
    const s = this.s, boss = s.boss;
    const base = this.arena.threats(s);
    base.notes = (boss?.notes || []).map(n => ({ x: n.x, y: n.y, band: n.band, gold: n.gold }));
    base.tells = (boss?.tells || []).slice();
    base.gust = this.storm.gusting ? { dir: this.storm.dir } : null;
    base.wind = this.storm.phase === 'tell' || this.storm.gusting ? { dir: this.storm.dir, phase: this.storm.phase } : null;
    if (boss?.state === 'bashTell') base.bash = { x: boss.x, y: boss.y, tell: 0.55 };
    if (boss?.state === 'channel') base.channel = { x: boss.x, t: boss.st };
    const ring = this.street.ring;
    if (ring) base.rings = [{ x: ring.x, y: ring.y, r: 72, phase: ring.phase }];
    return base;
  }
  safeBand() {
    const boss = this.s.boss, R = this.s.riley;
    if (!R) return 1;
    let best = bandOf(R.y), score = -1e9;
    for (let i = 0; i < 3; i++) {
      const notes = (boss?.notes || []).filter(n => n.band === i && n.x > R.x - 40);
      const told = (boss?.tells || []).includes(i) ? 1 : 0;
      const dist = notes.reduce((m, n) => Math.min(m, n.x - R.x), 9999);
      const s = -((notes.length + told * 2) * 1000) + dist;
      if (s > score) { score = s; best = i; }
    }
    return best;
  }
  destroy() {
    this.clearHazards(); this.view?.destroy(); restoreStage7Hooks(this); this._unbind?.();
    if (this.s.riley) this.s.riley.loialReady = true;
  }
  koStars() {}
  telegraph() {}
  glint() {}
  onPause() {}
}
STAGE7.kit = Stage7Kit;
STAGE7.queue = queueStage7;
STAGE7.start = scene => {
  scene.kit?.start();
  if (q.get('story') === '0' || scene.stageData?.story === false) { scene.music?.set('stage'); freeStory7(scene); return; }
  const begun = scene.startCutscene(STORY7_SCRIPT, STORY7_PANELS, () => { scene.storyResult = 'end'; scene.music?.set('stage'); freeStory7(scene); });
  if (begun === false) freeStory7(scene);
};

if (typeof globalThis.Phaser !== 'undefined') installStage7Hud();
queueMicrotask(() => {
  if (typeof globalThis.Phaser === 'undefined') return;
  import('./stage1.js').then(m => {
    const p = m.Stage1?.prototype;
    if (!p || p._s7rel) return;
    const orig = p.releaseStage;
    p.releaseStage = function (to) {
      const out = orig.apply(this, arguments);
      if (to !== 7 && this.textures?.exists) {
        const keep = new Set(STAGE_TEXTURES[to] || []);
        for (const k of STAGE7_TEXTURES) if (!keep.has(k) && this.textures.exists(k)) this.textures.remove(k);
        if (this.cache?.json?.get) releaseChars(this, ['riley', 'grunt', 'spear'].filter(k => !(STAGE_CHARS[to] || []).includes(k) && k !== 'riley'));
        releaseClips(STAGE7_VOICES);
      }
      return out;
    };
    p._s7rel = 1;
  });
});

export { bandY };
