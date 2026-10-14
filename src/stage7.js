// Rhuidean and the Aiel Waste. Controls stay in input.js. Moiraine and Lan replace Loial only here.
import { q, pick } from './config.js';
import { VOLLEY_BANDS, STAGE_TEXTURES } from './stages.js';
import { queuePowerArt } from './powers.js';
import { STAGE7, STAGE7_TEXTURES } from './stage7-def.js';
import { createStorm, stepStorm, applyGust, stepSilhouettes } from './stage7-storm.js';
import { createStreet, stepStreet, clearStreetZone, disposeStreet } from './stage7-street.js';
import { createArena7, threats7 } from './stage7-arena.js';
import { createStage7View, stage7LightBudget } from './stage7-view.js';
import { freeStory7 } from './stage7-art.js';
import { queueStage7Painted, queuePlate, PAINTED7_ROWS } from './stage7-paint.js';
import { STREAMS, deferredPlateKeys, createPlateStream } from './zone-stream.js';
import { preloadClips, releaseClips, MUSIC } from './audio.js';
import { STAGE7_VOICES, VOICE_FILES, stage7Say, sfxCue } from './stage7-voice.js';
import { installStage7SceneHooks, restoreStage7Hooks, holdDown7, call7Ctx, computePredicted, warmCall7 } from './stage7-lifecycle.js';
import { installCall7Bless, removeCall7Bless } from './call7-cutscene.js';
import { createCall7, tickCall7 } from './moilan-call.js';
import { stage4Delta } from './stage4-time.js';
import { installStage7Hud, bindCallLabel, syncCallReady } from './stage7-hud.js';
import { pumpDeferred, releaseSheet, BOSS_SHEETS, CALL_SHEETS } from './stage7-load.js';
import { clearNotes } from './stage7-notes.js';

// Placeholder loops: Stage 6's tracks until the 96 BPM Stage 7 loops are composed
// (docs/STAGE7-ASSETS-NEEDED.md). Repoint these two lines when music-stage7/boss7 land.
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
// The optional intro clip is a silent establishing shot: it voices no panel lines.
export function story7Script() { return STORY7_SCRIPT; }

export function queueStage7(scene) {
  queuePowerArt(scene, { twix: false });
  const defer = new Set([...deferredPlateKeys(STREAMS[7]), ...BOSS_SHEETS, ...CALL_SHEETS]);
  const storyOff = q.get('story') === '0' || scene.stageData?.story === false;
  queueStage7Painted(scene, PAINTED7_ROWS.filter(r => !defer.has(r.key) && !(storyOff && /^story7p/.test(r.key))));
}

const AMBIENT7 = [0x9a6a4a, 0x8a7a5e, 0x5a6f8c, 0x3a4a66];

export class Stage7Kit {
  constructor(s) {
    this.s = s; this.ribbons = 0; this.ribbonDropped = false; this._zone = -2;
    this.call7 = createCall7(); this.predicted = 'moiraine'; this._predT = 0;
    this.bossTime = 0; this.quality = 0;
    this.stats = { hints: 0, glimpses: 0, ribbon: 0, calls: 0, reflects: 0, yields: 0, gusts: 0, rings: 0, channels: 0, breaks: 0 };
    this._said = new Set();
    this.storm = createStorm(pick([-1, 1]));
    this.street = createStreet();
    this.arena = createArena7();
    this._cleared = new Set();
    this._fxSprites = [];
  }
  get ambient() {
    const z = Math.max(0, Math.min(3, this.s?.zoneI ?? 0));
    return AMBIENT7[z];
  }
  get ambientUnlit() { return 0x4a4238; }
  call7Ctx() { return call7Ctx(this); }
  freezesRiley() { return !!(this.strike || this.s?.cutscene); }
  freezesWorld() { return !!(this.strike || this.s?.cutscene); }
  setQuality(level) {
    this.quality = level | 0;
    if (this.s?.fx) this.s.fx.quality = level;
    this.view?.setQuality?.(level);
    if (this.quality >= 4) import('./call7-cutscene.js').then(m => m.dropBlob7());
  }
  build() {
    if (typeof globalThis.Phaser !== 'undefined') installStage7Hud();
    installStage7SceneHooks(this);
    this.view = createStage7View(this.s);
    this.view.quality = this.quality;
    this.view.buildBackdrop();
    this.backdrops = createPlateStream(this.s, 7, this.view, (key, again) => queuePlate(this.s, key, again));
    this.backdrops.sync();
    this.s.fires = [];
    this.s.bands = VOLLEY_BANDS;
    installCall7Bless(this.s);
    if (this.s.hud) this._unbindCall = bindCallLabel(this.s.hud);
    if (q.get('nopower') === '1' || this.s.stageData?.noPower) this.s.noPower = true;
  }
  start() { preloadClips(VOICE_FILES); this.s.music?.set('stage'); this.predicted = computePredicted(this); warmCall7(this.s, this.predicted); }
  hint(text) { if (this._said.has(text)) return; this._said.add(text); this.stats.hints++; this.s.hud?.flashText(text); }
  world() {
    const s = this.s;
    return { scene: s, riley: s.riley, enemies: s.enemies, zone: s.zoneI < 0 ? 0 : s.zoneI, bounds: s.bounds, boss: s.boss };
  }
  update(dt) {
    const s = this.s, R = s.riley;
    if (s.hud && !s.hud._call7Bind) this._unbindCall = bindCallLabel(s.hud);
    if (R) syncCallReady(s);
    dt = stage4Delta(dt);
    if (!dt || s.paused || s.cutscene || this.strike) return;
    if (!R) return;
    const wasCharged = this.call7.charges >= 1;
    tickCall7(this.call7, dt);
    if (!wasCharged && this.call7.charges >= 1 || !this._callWarm && this.call7.charges >= 1) {
      this._callWarm = true;
      pumpDeferred(s, CALL_SHEETS);
      this.predicted = computePredicted(this);
      warmCall7(s, this.predicted);
    }
    this._predT += dt;
    if (this._predT >= 0.25) {
      this._predT = 0;
      const next = computePredicted(this);
      if (next !== this.predicted) {
        this.predicted = next;
        if (this.call7.charges >= 1) warmCall7(s, next);
      }
    }
    if (s.boss?.alive) this.bossTime += dt;
    if (s.zoneI !== this._zone) this.enterZone(s.zoneI);
    if (s.zoneI === 0 && (s.wave ?? -1) >= 1 && !this.portalOff) { this.portalOff = true; }
    if (s.zoneI === 1 && (s.wave ?? -1) >= 1) this.storm.armed = true;
    R.fogSlow = 0;
    const w = this.world();
    stepStorm(this.storm, dt, {
      zone: s.zoneI, waveActive: !!s.zone, zoneCleared: this._cleared.has(1),
      grabbed: !!(R.grabbedBy || R.held), striking: !!this.strike,
      onTell: (dir) => {
        this.stats.gusts++;
        s.hud?.flashText(dir > 0 ? 'SANDSTORM >>' : '<< SANDSTORM');
        sfxCue('windGust');
        if (this.stats.gusts === 1) stage7Say('st7_storm_01', s.caption, false);
      },
      onGust: () => { if (this.stats.gusts === 2) stage7Say('riley_st7_storm_01', s.caption, false); },
    });
    const zb = s.zone && s.zoneI === 1 ? { l: s.zone.l, r: s.zone.r } : s.bounds;
    applyGust(this.storm, [R, ...(s.enemies || []).filter(e => e?.alive)], dt, zb, R, s.inp?.x || 0);
    stepSilhouettes(s.enemies, dt);
    const aliveN = (s.enemies || []).filter(e => e?.alive).length;
    stepStreet(this.street, dt, {
      ...w, waveActive: s.zoneI === 2 && !!s.zone && (aliveN > 0 || (s.pending?.length || 0) > 0),
      onRing: () => { this.stats.rings++; if (this.stats.rings === 1) stage7Say('riley_st7_street_01', s.caption, false); this.hint('OFF THE RING'); },
    });
    this.arena.step(dt, {
      ...w, resonance: s.zoneI === 3 && (s.boss?.phase || 1) >= 2,
      onColumn: () => this.hint('SHARD RAIN — MOVE'),
    });
    if (this._addWaveAt != null) {
      this._addWaveAt -= dt;
      if (this._addWaveAt <= 0) {
        this._addWaveAt = null;
        if (s.boss?.alive && s.zoneI === 3) { this._spawn?.('veiled', 'L'); this._spawn?.('dancer', 'R'); }
      }
    }
    const boss = s.boss;
    if (boss?.alive && !this._cracked && boss.hp <= boss.maxHp * 0.1) {
      this._cracked = true; s.fx.trauma = Math.max(s.fx.trauma || 0, 0.3); s.hud?.flashText('THE PLAZA CRACKS');
    }
    holdDown7(this, dt);
    this.backdrops?.sync?.();
    this.view?.sync?.(this);
    this.view?.move?.(s.camX || 0);
    stage7LightBudget(this);
    s.ambient = s.backdropIsLit === false ? this.ambientUnlit : this.ambient;
    if (s.lightsOn !== false) s.lights?.setAmbientColor?.(s.ambient);
  }
  enterZone(i) {
    this._zone = i;
    if (i === 0) { this.hint('CHAENDAER — TRACKS BELOW'); sfxCue('portalGlow'); }
    if (i === 1) this.hint('THE WASTE — WATCH THE SKY');
    if (i === 2) { stage7Say('st7_veil_01', this.s.caption, false); this.hint('RHUIDEAN — KEEP MOVING'); }
    if (i === 3) this.hint('THE GLASS COLUMNS');
  }
  onYield() { this.stats.yields++; }
  onDancerTell() { this.hint('VEIL UP — SHE LUNGES'); }
  onVeiledDraw() { this.hint('BOW DRAWN — CHANGE LANES'); }
  onVeiledLoose() {}
  onCounter() {}
  onBashTell() {}
  onChannel() { this.stats.channels++; this.hint('HIT HIM — STOP THE CHANNEL'); }
  onChannelBreak() { this.stats.breaks++; this.s.hud?.flashText('CHANNEL BROKEN'); }
  onChannelFire(boss) { this.arena.fireShock(boss.x, boss.y); this.hint('JUMP THE RING'); }
  onReflect() {
    this.stats.reflects++;
    if (this.stats.reflects === 1) {
      stage7Say('st7_asmo_hurt_01', this.s.caption, false);
      this.s.time?.delayedCall?.(900, () => stage7Say('riley_st7_reflect_01', this.s.caption, false));
    }
  }
  onAsmoPhase(b, ph) {
    if (ph === 2) { this._spawn?.('dancer', 'L'); this._spawn?.('grunt', 'R'); this._addWaveAt = 2.5; }
  }
  onBound(boss) {
    sfxCue('shieldFlare');
    const s = this.s;
    const ring = s.add?.image?.(boss.x, boss.y - 60, 's7shield');
    ring?.setDepth?.(1600); ring?.setScale?.(1.6);
    const lan = s.add?.sprite?.(boss.x - 90, boss.y, 's7lan', 3);
    lan?.setOrigin?.(0.5, 0.96); lan?.setDepth?.(1601);
    if (ring) this._fxSprites.push(ring);
    if (lan) this._fxSprites.push(lan);
  }
  onZoneClear(i) {
    this._cleared.add(i);
    clearStreetZone(this.street, i);
    if (i === 1) { this.storm.done = true; this.storm.phase = 'wait'; }
    if (i === 0) releaseSheet(this.s, 's7portal');
    if (i === 1) releaseSheet(this.s, 's7dust');
    if (this.s.riley) this.s.riley.fogSlow = 0;
    if (i === 2) {
      pumpDeferred(this.s, BOSS_SHEETS);
      if (!this.stats.glimpses) { this.stats.glimpses++; this.view?.glimpse?.(); this.s.hud?.flashText('THE GLEEMAN WAITS'); }
    }
  }
  dropRibbon() {
    if (this.ribbonDropped) return;
    this.ribbonDropped = true;
    const s = this.s, R = s.riley, x = (R?.x || 1800) + 30, y = R?.y || 630;
    const g = s.add.image(x, y - 30, 'glow'), c = s.add.image(x, y - 30, 'core');
    const L = s.lights?.addLight?.(x, y - 40, 140, 0xffd0e0, 0.7, 30) || { x, y };
    (s.pickups = s.pickups || []).push({ x, y, kind: 'ribbon', g, c, L, t: 0 });
  }
  collectRibbon() { this.ribbons++; this.stats.ribbon++; this.s.riley.score += 1000; this.s.hud?.flashText("TWINKLE TOES' RIBBON!"); }
  clearHazards() {
    this.arena.dispose(); disposeStreet(this.street);
    this.storm.phase = 'wait';
    if (this.s.boss?.field) clearNotes(this.s.boss.field);
    for (const o of this._fxSprites) o?.destroy?.();
    this._fxSprites.length = 0;
    if (this.s.riley) this.s.riley.fogSlow = 0;
  }
  threats() {
    const boss = this.s.boss;
    const arrows = [];
    for (const e of this.s.enemies || []) for (const a of e.arrows || []) arrows.push(a);
    return {
      storm: { phase: this.storm.phase, dir: this.storm.dir },
      ring: this.street.ring ? { x: this.street.ring.x, y: this.street.ring.y, band: this.street.ring.band, phase: this.street.ring.phase } : null,
      notes: boss?.field?.notes || [],
      tells: boss?.field?.tells || [],
      ...threats7(this.arena),
      channel: boss?.state === 'channel' ? { t: boss.st, hits: boss.channelHits } : null,
      arrows,
    };
  }
  applyLightBudget() { stage7LightBudget(this); }
  destroy() {
    this.clearHazards(); this.view?.destroy(); restoreStage7Hooks(this); removeCall7Bless(); this._unbindCall?.();
    if (this.s.riley) { this.s.riley.fogSlow = 0; this.s.riley.loialReady = true; }
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
  const begun = scene.startCutscene(story7Script(scene.clipShown), STORY7_PANELS, () => { scene.storyResult = 'end'; scene.music?.set('stage'); freeStory7(scene); });
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
        releaseClips(STAGE7_VOICES);
      }
      return out;
    };
    p._s7rel = 1;
  });
});
