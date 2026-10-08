// Caemlyn lighting and loading; inherited combat hooks come from Stage2Kit.
import { VW, VH, LANE_TOP, WORLD_W, clamp } from './config.js';
import { sfx, preloadClips, EXTRA_VOICE } from './audio.js';
import { queueCharPages } from './assets.js';
import { STAGE3 } from './stages.js';
import { MID_Y } from './stage2.js';
import { Stage3Hazards } from './stage3-hazards.js';
import { budgetStage3Lights, plateScale, playFearCues, coilTell } from './stage3-lights.js';
import { installStage3Suspension } from './stage3-suspension.js';
import { p3 } from './stage3-art.js';
import { queueStage3Fx, paintStage3Fx } from './stage3-fx-art.js';
export const STORY3_PANELS = Object.freeze([1, 2, 3].map(n => Object.freeze({ key: 'story3_panel_' + n, url: `assets/story/story3_panel_${n}.jpg` })));
export const STORY3_SCRIPT = Object.freeze([
  ['st3_story_01', 0, 3.58], ['st3_story_02', 1, 7.89], ['st3_story_03', 1, 1.54], ['st3_story_04', 1, 3.87], ['st3_story_05', 1, 0.72], ['st3_story_06', 2, 3.41],
].map(([id, panel, voice]) => Object.freeze({ id, who: EXTRA_VOICE[id][0], text: EXTRA_VOICE[id][1], panel, voice })));
export const STAGE3_VOICES = Object.freeze(Object.keys(EXTRA_VOICE).filter(id => /^(st3_|cutthroat_|fade_|riley_st3|riley_escape|riley_counter)/.test(id)));
export const STAGE3_ATLASES = Object.freeze(['riley3', 'cutthroat', 'fade']);   // = STAGE_CHARS[3] minus ALL_CHARS
export const TOD_FALLBACK = Object.freeze({ t: 0, ambient: 0x39425f, farMix: 0, sunI: 0, torchK: 0 });
export const TORCH_RAMP = 0.4, TORCH_FLARE = 1.3, TORCH_SETTLE = 0.3;
const hex = v => typeof v === 'string' ? parseInt(v, 16) : v;   // stage2.js:34 is not exported

/** per-channel linear blend of two 0xRRGGBB colours */
export function lerpColor(a, b, u) {
  return (lerpChannel(a, b, u, 16) << 16) | (lerpChannel(a, b, u, 8) << 8) | lerpChannel(a, b, u, 0);
}
const lerpChannel = (a, b, u, s) => { const ca = (a >> s) & 255; return Math.round(ca + (((b >> s) & 255) - ca) * u); };

/** time of day by camera x. keys: [{ x, ambient, farMix, sunI }], x strictly increasing. Returns a fresh object. */
export function timeOfDay(camX, keys, out = {}) {
  if (!keys || !keys.length) return Object.assign(out, TOD_FALLBACK);
  const k0 = keys[0];
  if (keys.length === 1) {
    out.t = out.torchK = 0; out.ambient = hex(k0.ambient); out.farMix = k0.farMix; out.sunI = k0.sunI; return out;
  }
  const last = keys[keys.length - 1];
  const t = clamp((camX - k0.x) / (last.x - k0.x), 0, 1);
  const x = clamp(camX, k0.x, last.x);
  let i = 0; while (i < keys.length - 2 && x > keys[i + 1].x) i++;
  const a = keys[i], b = keys[i + 1], u = clamp((x - a.x) / (b.x - a.x), 0, 1);
  out.t = out.torchK = t; out.ambient = lerpColor(hex(a.ambient), hex(b.ambient), u);
  out.farMix = a.farMix + (b.farMix - a.farMix) * u; out.sunI = a.sunI + (b.sunI - a.sunI) * u;
  return out;
}

export function queueStage3(scene) {
  scene.stage3LoadCleanup?.();
  const L = scene.load, has = k => scene.textures.exists(k), B = 'assets/bg3/';
  const img = (k, u) => { if (!has(k)) L.image(k, u); };
  img('far3_day', B + 'bg3-far-day.jpg'); img('far3_night', B + 'bg3-far-night.jpg');
  img('mid3a', [B + 'bg3-mid.webp', B + 'bg3-mid_n.webp']); img('mid3b', [B + 'bg3-mid2.webp', B + 'bg3-mid2_n.webp']);
  for (const [k, n] of [['floor3a', ''], ['floor3b', '2'], ['floor3c', '3']]) img(k, [`${B}bg3-floor${n}.jpg`, `${B}bg3-floor${n}_n.webp`]);
  queueStage3Fx(scene);   // painted prop/FX sheets; build() code-draws any that failed
  if (!has('crate')) L.image('crate', ['assets/props/prop-crate.webp', 'assets/props/prop-crate_n.webp']);
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('arrow')) L.image('arrow', 'assets/props/fx-arrow.webp');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  img('fadePortrait', 'assets/stage3/ui/fade-portrait.webp');
  for (const p of STORY3_PANELS) img(p.key, p.url);
  L.json('plates3', B + 'plates.json'); L.json('lights3', B + 'lights.json');
  // Stage 3 char metas are not in ALL_CHARS (boot); load them here and queue their pages once each meta arrives.
  const pending = [];
  const cleanup = () => {
    for (const [event, fn] of pending) L.off?.(event, fn);
    pending.length = 0;
    L.off?.('complete', cleanup); L.off?.('loaderror', cleanup);
    scene.events?.off('shutdown', cleanup);
    scene.stage3LoadCleanup = null;
  };
  for (const k of STAGE3_ATLASES) {
    if (scene.cache.json.get(k + '.A')) continue;
    L.json(k + '.A', 'assets/stage3/chars/' + k + '.anims.json');
    const event = 'filecomplete-json-' + k + '.A';
    const fn = () => { queueCharPages(scene, [k]); };
    pending.push([event, fn]); L.once(event, fn);
  }
  if (pending.length) {
    scene.stage3LoadCleanup = cleanup;
    scene.events?.once('shutdown', cleanup);
    L.on?.('complete', cleanup); L.on?.('loaderror', cleanup);
  }
}

export class Stage3Kit extends Stage3Hazards {
  constructor(s) {
    super(s);
    this.cfg = s.cache.json.get('lights3') || {}; this.plates = s.cache.json.get('plates3') || {};
    this.keys = this.cfg.timeKeys || []; this.tod = timeOfDay(0, this.keys);
    this.torchSpots = []; this.sun = null; this.sunGone = false; this.emitters = []; this.nightLayer = null; this.dayStopped = false;
    Object.assign(this.stats, { torchesLit: 0, sunRemoved: 0 });
  }
  get ambient() { return timeOfDay(this.s.camX || 0, this.keys).ambient; }
  get ambientUnlit() { return hex(this.cfg.ambientUnlit) || 0x5a6482; }
  applyLightBudget() { budgetStage3Lights(this); }
  telegraph(z) { coilTell(this, z); }
  claimMudJoke() { return false; }
  // ---------- build (never reads s.camX: it is stale on a restart; update() sets every camX-dependent value) ----------
  build() {
    const s = this.s, P = this.plates, cfg = this.cfg, design = P.midScale || 0.76, par = P.midParallax || 0.5;
    p3(s); paintStage3Fx(s);
    this.makeTextures();
    const fs = P.farScroll ?? 0.12, farImg = (k, d) => {
      const f = s.add.image(0, 0, k).setOrigin(0, 0).setScrollFactor(fs);
      return f.setScale(Math.max(VH * 0.8 / f.height, (VW + (WORLD_W - VW) * fs) / f.width)).setDepth(d);
    };
    this.farDay = farImg('far3_day', -100); this.farNight = farImg('far3_night', -99).setAlpha(0);
    let x = P.midX0 || 0; s.midPlates = [];
    for (const k of ['mid3a', 'mid3b']) {
      const ms = plateScale(design, s.textures.get(k).getSourceImage().width);
      const m = s.add.image(x, MID_Y, k).setOrigin(0, 1).setScrollFactor(par, 1).setScale(ms).setLighting(true).setDepth(-50);
      s.midPlates.push(m); s.backdropLit.push(m); x += m.displayWidth - (P.overlap || 0) * ms;
    }
    const fh = VH - LANE_TOP + 64, fy = LANE_TOP - 64, floors = P.floors || [{ key: 'floor3a', from: 0, to: WORLD_W }], last = floors.length - 1;
    floors.forEach(({ key, from, to }, i) => {
      const ts = fh / s.textures.get(key).getSourceImage().height;
      s.backdropLit.push(s.add.tileSprite(from, fy, to - from + (i < last ? 200 : 0), fh, key).setOrigin(0, 0).setLighting(true).setTileScale(ts).setDepth(-40 + i));
      if (i > 0) s.backdropLit.push(s.add.tileSprite(from - 280, fy, 280, fh, key).setOrigin(0, 0).setLighting(true).setTileScale(ts).setTilePosition(-280 / ts, 0).setDepth(-40 + i).setAlpha(0, 1, 0, 1));
    });
    // lights: torches are latched spots (no light until lit); the sun is world-space like the moon
    s.moon = null; s.fires = []; this.halos = [];
    s.fireCap = cfg.capOnScreen || 4;
    for (const [pi, px, py, I, radius, litAt] of cfg.torches || []) {
      const m = s.midPlates[pi]; if (!m) continue;
      this.torchSpots.push({ wx: m.x + px * design, wy: MID_Y - m.height * plateScale(design, m.width) + py * design, I, radius, litAt, par, L: null, age: 0 });
    }
    const sun = cfg.sun;
    if (sun && this.tod.sunI > 0) this.sun = s.lights.addLight(sun.sx, sun.sy, sun.radius, hex(sun.color), sun.I * this.tod.sunI, 200);
    const A = cfg.atmos || {}, day = A.day || {}, front = A.front || {}, thin = s.fx.quality >= 2;
    this.motes = s.add.particles(0, 0, 'flake', { x: { min: -100, max: VW + 300 }, y: { min: 120, max: LANE_TOP }, lifespan: 7000, speedY: { min: -12, max: 12 }, speedX: { min: -20, max: 10 }, scale: { min: 0.15, max: 0.35 }, alpha: { start: 0.5, end: 0 }, tint: hex(day.tint) || 0xffe2a8, frequency: thin ? day.thin || 200 : day.frequency || 60 }).setScrollFactor(0).setDepth(-45);
    s.snowFront = s.add.particles(0, 0, 'flake', { x: { min: -100, max: VW + 300 }, y: { min: 0, max: VH }, lifespan: 5000, speedY: { min: -10, max: 20 }, speedX: { min: -30, max: -5 }, scale: { min: 0.3, max: 0.6 }, alpha: { start: 0.45, end: 0 }, frequency: front.frequency || 70 }).setDepth(5000).setScrollFactor(0);
    this.emitters.push({ em: this.motes, base: day.frequency || 60, thin: day.thin || 200 });
  }
  start() { this.suspendCleanup ||= installStage3Suspension(this.s); preloadClips(STAGE3_VOICES); }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.suspendCleanup?.();
    const s = this.s;
    for (const e of s.enemies || []) { e.releaseHold?.('break'); e.clearAbilities?.(); }
    if (s.vignette) s.vignette.strength = 0.35;
    for (const L of s.fires) if (L.baseR !== undefined) L.radius = L.baseR;
    super.destroy();
    if (this.sun) s.lights.removeLight(this.sun);
    this.sun = null;
    for (const p of this.torchSpots) if (p.L) { s.lights.removeLight(p.L); p.L = null; }
    for (const h of this.halos) h.destroy();
    for (const e of this.emitters) e.em.destroy();
    s.snowFront?.destroy();
    this.halos.length = this.emitters.length = this.torchSpots.length = 0;
    this.nightLayer = this.motes = null;
  }
  // ---------- per frame ----------
  update(dt) {
    const s = this.s, R = s.riley, cfg = this.cfg, tod = timeOfDay(s.camX, this.keys, this.tod);
    s.ambient = s.backdropIsLit === false ? this.ambientUnlit : tod.ambient;
    if (s.lightsOn !== false) s.lights.setAmbientColor(s.ambient);
    this.farNight.setAlpha(tod.farMix);
    if (this.sun) {
      if (tod.sunI <= 0) { s.lights.removeLight(this.sun); this.sun = null; this.sunGone = true; this.stats.sunRemoved++; }
      else { this.sun.x = s.camX + cfg.sun.sx; this.sun.intensity = s.lightsOn ? cfg.sun.I * tod.sunI : 0; }
    }
    for (const p of this.torchSpots) {
      if (!p.L) {
        if (p.litAt > tod.torchK) continue;
        const c = hex(cfg.torchColor) || 0xff9a48, L = p.L = s.lights.addLight(p.wx, p.wy, p.radius, c, 0.01, 110);
        L.baseX = p.wx; L.baseI = 0.01; L.seed = Math.random() * 10; L.par = p.par; s.fires.push(L); p.age = 0;
        this.halos.push(s.add.image(p.wx, p.wy, 'glow').setScrollFactor(p.par, 1).setBlendMode('ADD').setTint(c).setScale(0.42).setAlpha(0.55).setDepth(-49));
        sfx.torchIgnite?.(); this.stats.torchesLit++;
      }
      const a = p.age += dt;
      p.L.baseI = p.I * (a < TORCH_RAMP ? TORCH_FLARE * a / TORCH_RAMP : Math.max(1, TORCH_FLARE - (TORCH_FLARE - 1) * (a - TORCH_RAMP) / TORCH_SETTLE));
    }
    const A = cfg.atmos, thin = s.fx.quality >= 2;
    if (!this.nightLayer && tod.farMix >= (A?.nightFrom ?? 0.5)) {
      const n = A?.night || {}, base = n.frequency || 90, th = n.thin || 300;
      this.nightLayer = s.add.particles(0, 0, 'ember', { x: { min: -100, max: VW + 300 }, y: { min: LANE_TOP - 200, max: VH }, lifespan: 4000, speedY: { min: -40, max: -15 }, speedX: { min: -12, max: 12 }, scale: { start: 0.9, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: hex(n.tint) || 0xffb070, blendMode: 'ADD', frequency: thin ? th : base }).setScrollFactor(0).setDepth(-45);
      this.emitters.push({ em: this.nightLayer, base, thin: th });
    }
    if (tod.farMix >= 1 && !this.dayStopped) { this.motes.stop(); this.dayStopped = true; }
    for (const e of this.emitters) { const f = thin ? e.thin : e.base; if (e.em.frequency !== f) e.em.frequency = f; }
    if (this.arrows.length) this.updateArrows(dt, R);
    if (this.skyArrows.length) this.updateSky(dt, R);
    if (this.stars.length) this.updateStars(dt);
    if (this.sticks.length) this.updateSticks(dt);
    this.updateHazards(dt);
    playFearCues(this);
  }
}

STAGE3.kit = Stage3Kit;
