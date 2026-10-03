// Stage 2 kit: Baerlon at a rainy dusk. Painted backdrop + lanterns (lights.json), rain and lightning, the stable's
// falling beams, Whitecloak arrows and lobbed arrows, Jaret Byar's archer volleys (whole lane bands, dodged by
// changing lane), his torches and the burning barn, Twinkle Toes' ribbon and the story-beat cutscene.
// The shared scene (stage1.js) owns combat, waves, pickups and powers; it calls into this kit only when stageNo === 2.
import { VW, VH, LANE_TOP, LANE_BOT, WORLD_W, clamp, rand, pick } from './config.js';
import { sfx, say, setRain, preloadClips, EXTRA_VOICE } from './audio.js';
import { STAGE2, VOLLEY, VOLLEY_BANDS } from './stages.js';
import { ARCHER } from './whitecloaks.js';
export const MID_Y = LANE_TOP - 58;
export const STORY_PANELS = Object.freeze([1, 2, 3].map(n => Object.freeze({ key: 'story_panel_' + n, url: `assets/story/story_panel_${n}.jpg` })));
// Story beat between the stages: [voice id, panel, TTS clip seconds]. Captions live in audio.js EXTRA_VOICE.
export const STORY_SCRIPT = Object.freeze([
  ['st2_story_01', 0, 3.77], ['st2_story_02', 0, 3.48], ['st2_story_03', 1, 1.25], ['st2_story_04', 2, 3.38], ['st2_story_05', 2, 2.62], ['st2_story_06', 2, 2.16],
].map(([id, panel, voice]) => Object.freeze({ id, who: EXTRA_VOICE[id][0], text: EXTRA_VOICE[id][1], panel, voice })));
export const STAGE2_VOICES = Object.freeze(Object.keys(EXTRA_VOICE).filter(id => /^(st2_|byar_|zealot_|archer_|riley_st2|riley_ribbon|riley_mud)/.test(id)));
// textures each stage owns (released when the other stage loads, so an iPad never holds both backdrops)
export const STAGE_TEXTURES = Object.freeze({
  1: Object.freeze(['far', 'mid0', 'mid1', 'floor', 'floor2', 'cart', 'barrel', 'staves']),
  2: Object.freeze(['far2', 'mid2a', 'mid2b', 'floor2a', 'floor2b', 'crate', 'planks', 'beam2', 'arrow', 'torch', 'ribbon', ...STORY_PANELS.map(p => p.key)]),
});
export function queueStage2(scene) {
  const L = scene.load, has = k => scene.textures.exists(k);
  if (!has('far2')) L.image('far2', 'assets/bg2/bg2-far.jpg');
  if (!has('mid2a')) L.image('mid2a', ['assets/bg2/bg2-mid.webp', 'assets/bg2/bg2-mid_n.webp']);
  if (!has('mid2b')) L.image('mid2b', ['assets/bg2/bg2-mid2.webp', 'assets/bg2/bg2-mid2_n.webp']);
  if (!has('floor2a')) L.image('floor2a', ['assets/bg2/bg2-floor.jpg', 'assets/bg2/bg2-floor_n.webp']);
  if (!has('floor2b')) L.image('floor2b', ['assets/bg2/bg2-floor2.jpg', 'assets/bg2/bg2-floor2_n.webp']);
  if (!has('crate')) L.image('crate', ['assets/props/prop-crate.webp', 'assets/props/prop-crate_n.webp']);
  if (!has('beam2')) L.image('beam2', ['assets/props/prop-beam.webp', 'assets/props/prop-beam_n.webp']);
  if (!has('planks')) L.atlas('planks', 'assets/props/planks.webp', 'assets/props/planks.json');
  if (!has('arrow')) L.image('arrow', 'assets/props/fx-arrow.webp');
  if (!has('torch')) L.image('torch', 'assets/props/fx-torch.webp');
  if (!has('ribbon')) L.image('ribbon', 'assets/props/item-ribbon.webp');
  for (const p of STORY_PANELS) if (!has(p.key)) L.image(p.key, p.url);
  L.json('plates2', 'assets/bg2/plates.json'); L.json('lights2', 'assets/bg2/lights.json');
}
const hex = v => typeof v === 'string' ? parseInt(v, 16) : v;

export class Stage2Kit {
  constructor(s) {
    this.s = s; this.arrows = []; this.skyArrows = []; this.torches = []; this.beams = []; this.stars = []; this.sticks = []; this.fxImgs = [];
    this.volley = null; this.volleys = 0; this.barn = null; this.ribbonDropped = false; this.ribbons = 0; this.mudJokeDone = false; this.hints = new Set();
    this.lightningT = rand(5, 9); this.flashT = 0; this.beamT = 1.5; this.collapsed = false; this.lastRiposteLine = -99;
    this.cfg = s.cache.json.get('lights2') || {}; this.plates = s.cache.json.get('plates2') || {};
    this.stats = { arrows: 0, arrowHits: 0, skyArrows: 0, volleys: 0, volleyHits: 0, torches: 0, beams: 0, beamHits: 0, blocks: 0, guardBreaks: 0, ripostes: 0, mudJoke: 0, ribbon: 0, stars: 0 };
  }
  get ambient() { return hex(this.cfg.ambient) || 0x34405a; }
  get ambientUnlit() { return hex(this.cfg.ambientUnlit) || 0x58627e; }
  // ---------- build ----------
  build() {
    const s = this.s, P = this.plates, ms = P.midScale || 0.76, par = P.midParallax || 0.5;
    this.makeTextures();
    const far = s.add.image(0, 0, 'far2').setOrigin(0, 0).setScrollFactor(0.12);
    far.setScale(Math.max(VH * 0.8 / far.height, (VW + (WORLD_W - VW) * 0.12) / far.width)).setTint(0xb0bcd4).setDepth(-100);
    let x = P.midX0 || 0; s.midPlates = [];
    for (const k of ['mid2a', 'mid2b']) {
      const m = s.add.image(x, MID_Y, k).setOrigin(0, 1).setScrollFactor(par, 1).setScale(ms).setLighting(true).setDepth(-50);
      s.midPlates.push(m); s.backdropLit.push(m); x += m.displayWidth - (P.overlap || 0) * ms;
    }
    const fh = VH - LANE_TOP + 64, fy = LANE_TOP - 64, split = P.floorSplit || 2700;
    const f1 = s.textures.get('floor2a').getSourceImage(), ts = fh / f1.height;
    s.backdropLit.push(s.add.tileSprite(0, fy, split + 200, fh, 'floor2a').setOrigin(0, 0).setLighting(true).setTileScale(ts).setDepth(-40));
    const f2 = s.textures.get('floor2b').getSourceImage(), ts2 = fh / f2.height;
    s.backdropLit.push(s.add.tileSprite(split, fy, WORLD_W - split, fh, 'floor2b').setOrigin(0, 0).setLighting(true).setTileScale(ts2).setDepth(-39));
    s.backdropLit.push(s.add.tileSprite(split - 200, fy, 200, fh, 'floor2b').setOrigin(0, 0).setLighting(true).setTileScale(ts2).setTilePosition(-200 / ts2, 0).setDepth(-39).setAlpha(0.5));
    // rain: a soft far layer behind the fighters (scrollFactor 0) and the front sheet (s.snowFront: the governor thins it)
    const R = this.cfg.rain || {}, rb = R.back || {}, rf = R.front || {};
    const rng = (a, d) => ({ min: (a || d)[0], max: (a || d)[1] });
    s.add.particles(0, 0, 'raindrop', { x: { min: -100, max: VW + 300 }, y: -40, lifespan: 1300, speedY: rng(rb.speedY, [700, 850]), speedX: rng(rb.speedX, [-150, -120]), rotate: 10, scaleY: { min: 0.5, max: 0.8 }, scaleX: 0.7, alpha: rng(rb.alpha, [0.12, 0.25]), frequency: rb.frequency || 10 }).setScrollFactor(0).setDepth(-45);
    s.snowFront = s.add.particles(0, 0, 'raindrop', { x: { min: -100, max: VW + 400 }, y: -40, lifespan: 900, speedY: rng(rf.speedY, [1050, 1350]), speedX: rng(rf.speedX, [-260, -200]), rotate: 11, scaleY: { min: 0.8, max: 1.3 }, alpha: rng(rf.alpha, [0.25, 0.5]), frequency: rf.frequency || 14 }).setDepth(5000).setScrollFactor(0);
    this.splash = s.add.particles(0, 0, 'flake', { x: { min: 0, max: VW }, y: { min: LANE_TOP - 50, max: VH }, lifespan: 260, scale: { start: 0.15, end: 0.5 }, scaleY: { start: 0.08, end: 0.18 }, alpha: { start: 0.45, end: 0 }, frequency: 45, tint: 0xc8d4ea }).setScrollFactor(0).setDepth(-38);
    // lanterns: world-space lights riding the mid plates (see placeFires; L.par is this plate's parallax)
    s.fires = []; s.moon = null; this.halos = [];
    const lc = hex(this.cfg.lanternColor) || 0xffb45e;
    for (const [pi, px, py, I, rad] of this.cfg.lanterns || []) {
      const m = s.midPlates[pi]; if (!m) continue;
      const wx = m.x + px * ms, wy = MID_Y - m.height * ms + py * ms;
      const L = s.lights.addLight(wx, wy, rad, lc, I, 110); L.baseX = wx; L.baseI = I; L.seed = Math.random() * 10; L.par = par; s.fires.push(L);
      this.halos.push(s.add.image(wx, wy, 'glow').setScrollFactor(par, 1).setBlendMode('ADD').setTint(lc).setScale(0.42).setAlpha(0.55).setDepth(-49));
    }
    s.fireCap = this.cfg.capOnScreen || 4;
    this.flash = s.add.image(0, 0, 'raindrop').setOrigin(0, 0).setScrollFactor(0).setDisplaySize(VW, VH).setTint(0xdde6ff).setAlpha(0).setDepth(4900);
    if (s.fx.snowPuff.setParticleTint) s.fx.snowPuff.setParticleTint(0xa89c88);   // puffs read as mud splashes
  }
  makeTextures() {
    const s = this.s, mk = (key, w, h, draw) => { if (s.textures.exists(key)) return; const c = s.textures.createCanvas(key, w, h), x = c.getContext(); draw(x, w, h); c.refresh(); };
    mk('raindrop', 4, 40, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(210,225,255,0)'); g.addColorStop(1, 'rgba(225,235,255,0.9)'); x.fillStyle = g; x.fillRect(1, 0, 2, h); });
    mk('lanemark', 64, 32, (x, w, h) => { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(i * 16, h); x.lineTo(i * 16 + 8, h); x.lineTo(i * 16 + 8 + h / 2, 0); x.lineTo(i * 16 + h / 2, 0); x.fill(); } x.fillRect(0, 0, w, 2); x.fillRect(0, h - 2, w, 2); });
    mk('ring', 128, 48, (x, w, h) => { x.strokeStyle = 'rgba(255,255,255,1)'; x.lineWidth = 5; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2); x.stroke(); x.lineWidth = 2; x.beginPath(); x.ellipse(w / 2, h / 2, w / 4, h / 4, 0, 0, Math.PI * 2); x.stroke(); });
  }
  start() { setRain(true, 0.9); preloadClips(STAGE2_VOICES); }
  destroy() { setRain(false); }
  // ---------- per frame ----------
  update(dt) {
    const s = this.s, R = s.riley;
    this.updateLightning(dt);
    this.updateArrows(dt, R); this.updateSky(dt, R); this.updateVolley(dt, R); this.updateTorches(dt, R); this.updateBeams(dt, R); this.updateStars(dt); this.updateSticks(dt);
    if (this.barn) { this.barn.t += dt; const k = Math.min(1, this.barn.t / 1.5); for (const L of this.barn.lights) L.baseI = L.fullI * k; }
  }
  updateLightning(dt) {
    const s = this.s;
    if (this.flashT > 0) {
      this.flashT -= dt; const k = this.flashT > 0.22 ? 0.55 : this.flashT > 0.14 ? 0.05 : this.flashT > 0 ? 0.35 * this.flashT / 0.14 : 0;
      this.flash.setAlpha(s.lightsOn ? k * 0.5 : 0);
      if (s.lightsOn) s.lights.setAmbientColor(k > 0.2 ? (hex((this.cfg.lightning || {}).ambientFlash) || 0x8a9ac0) : (s.ambient || this.ambient));
      return;
    }
    if (!s.started || s.paused) return;
    if ((this.lightningT -= dt) <= 0) {
      const e = (this.cfg.lightning || {}).every || [11, 19]; this.lightningT = rand(e[0], e[1]); this.flashT = 0.32;
      s.time.delayedCall(rand(500, 1300), () => sfx.thunder());
    }
  }
  img(key, x, y, depth) { const o = this.s.add.image(x, y, key).setDepth(depth); return o; }
  // ---------- archers ----------
  archerBusy(a) { return this.s.enemies.some(e => e !== a && e.alive && e.type === 'archer' && (e.state === 'shoot' || e.state === 'skyshot')); }
  fireArrow(a) {
    const dir = a.facing, x = a.x + dir * 95, y = a.y;
    const img = this.img('arrow', x, y - ARCHER.arrowZ, 1000 + y + 1).setScale(0.2).setLighting(true); img.flipX = dir < 0;
    this.arrows.push({ img, x, y, dir, t: 0 }); this.stats.arrows++; sfx.twang();
  }
  updateArrows(dt, R) {
    const s = this.s, shield = s.powers && s.powers.ter && s.powers.ter.kind === 'fireshield', B = s.beam;
    for (const a of this.arrows.slice()) {
      a.t += dt; a.x += a.dir * ARCHER.arrowSpeed * dt; a.img.setPosition(a.x, a.y - ARCHER.arrowZ);
      let done = a.x < s.camX - 120 || a.x > s.camX + VW + 120 || a.t > 3;
      if (!done && shield && R.alive && Math.abs(R.x - a.x) < 140 && Math.abs(R.y - a.y) < 44) { s.fx.embers.emitParticleAt(a.x, a.y - ARCHER.arrowZ, 10); sfx.fire(); done = true; }
      else if (!done && B && !B.fade && (a.x - R.x) * B.dir > 0 && Math.abs(a.y - R.y) < 70) { s.fx.embers.emitParticleAt(a.x, a.y - ARCHER.arrowZ, 6); done = true; }
      else if (!done && Math.abs(R.x - a.x) < 46 && Math.abs(R.y - a.y) < 20 && R.z < 190) {
        if (R.takeHit({ dmg: ARCHER.arrowDmg, kind: 'medium', kb: a.dir * 200 }, { x: a.x - a.dir * 20 })) { this.stats.arrowHits++; s.fx.impact('light', R.x - a.dir * 20, R.y - 150, a.dir); sfx.hit(false); done = true; }
      }
      if (done) { a.img.destroy(); this.arrows.splice(this.arrows.indexOf(a), 1); }
    }
  }
  markSky(a) {
    const R = this.s.riley, tx = clamp(R.x, this.s.bounds.l + 60, this.s.bounds.r - 60), ty = R.y;
    const mark = this.img('ring', tx, ty, 950).setTint(0xff4a32).setScale(0.9, 0.9).setAlpha(0.8);
    a.skyMark = { a, mark, tx, ty, t: 0, T: ARCHER.skyDelay, armed: false, arrow: null }; this.skyArrows.push(a.skyMark);
  }
  loseSkyArrow(a) { if (a.skyMark) { a.skyMark.armed = true; this.stats.skyArrows++; sfx.twang(); } }
  updateSky(dt, R) {
    const s = this.s;
    for (const m of this.skyArrows.slice()) {
      m.t += dt; m.mark.setAlpha(0.45 + 0.35 * Math.sin(m.t * 18)).setScale(0.9 - 0.25 * Math.min(1, m.t / m.T));
      if (!m.armed && (m.t > m.T - 0.3 || !m.a.alive || m.a.state !== 'skyshot')) { m.mark.destroy(); this.skyArrows.splice(this.skyArrows.indexOf(m), 1); if (m.a.skyMark === m) m.a.skyMark = null; continue; }
      if (m.armed && !m.arrow && m.t > m.T - 0.28) { m.arrow = this.img('arrow', m.tx + 40, m.ty - 640, 1000 + m.ty + 1).setScale(0.2).setRotation(1.75).setLighting(true); }
      if (m.arrow) { const u = clamp((m.t - (m.T - 0.28)) / 0.28, 0, 1); m.arrow.setPosition(m.tx + 40 * (1 - u), m.ty - 640 * (1 - u) - 30); }
      if (m.t >= m.T) {
        if (m.armed && R.alive && Math.abs(R.x - m.tx) < 60 && Math.abs(R.y - m.ty) < 24 && R.z < 100) {
          if (R.takeHit({ dmg: ARCHER.skyDmg, kind: 'medium', kb: 160 * (Math.sign(R.x - m.tx) || 1) }, { x: m.tx - 1 })) { this.stats.arrowHits++; sfx.hit(false); }
        }
        s.fx.thump(m.tx, m.ty, false); m.mark.destroy();
        if (m.arrow) this.stick(m.arrow, 0.7);
        this.skyArrows.splice(this.skyArrows.indexOf(m), 1); if (m.a.skyMark === m) m.a.skyMark = null;
      }
    }
  }
  stick(img, life) { this.sticks.push({ img, t: 0, life }); }
  updateSticks(dt) { for (const k of this.sticks.slice()) { k.t += dt; if (k.t > k.life) { const a = Math.max(0, 1 - (k.t - k.life) / 0.4); k.img.setAlpha(a); if (a <= 0) { k.img.destroy(); this.sticks.splice(this.sticks.indexOf(k), 1); } } } }
  // ---------- zealots ----------
  telegraph(z) { this.glint(z.x - z.facing * 50, z.y - 150, 0xffffff); sfx.glint(); }
  glint(x, y, tint) {
    const g = this.img('glow', x, y, 4004).setBlendMode('ADD').setTint(tint).setScale(0.3);
    this.sticks.push({ img: g, t: 0, life: 0.15 });
  }
  hint(id, text) { if (this.hints.has(id)) return; this.hints.add(id); this.s.hud?.flashText(text); }
  onBlock(z) { this.stats.blocks++; this.hint('shield', 'SHIELD UP! GET BEHIND HIM OR FINISH THE COMBO'); }
  onGuardBreak(z) { this.stats.guardBreaks++; sfx.smash(); this.hint('guardbreak', 'GUARD BROKEN!'); }
  claimMudJoke(z) { if (this.mudJokeDone || this.s.zoneI !== 1) return false; this.mudJokeDone = true; return true; }
  mudJoke(z) {
    const s = this.s; this.stats.mudJoke++;
    s.fx.thump(z.x, z.y, true); s.fx.snowPuff.emitParticleAt(z.x, z.y, 14);
    say('zealot_mud_01', s.caption);
    const run = s.runId; s.time.delayedCall(4300, () => { if (s.runId === run && !s.ended) say('riley_mud_01', s.caption, false); });
  }
  koStars(e) {
    this.stats.stars++;
    const imgs = [0, 1, 2].map(() => this.img('core', e.x, e.y - 200, 4005).setBlendMode('ADD').setTint(0xffe27a).setScale(0.22));
    this.stars.push({ e, imgs, t: 0 });
  }
  updateStars(dt) {
    for (const st of this.stars.slice()) {
      st.t += dt; const e = st.e, a = e.sprite.alpha;
      st.imgs.forEach((o, i) => { const ang = st.t * 6 + i * 2.09; o.setPosition(e.x + Math.cos(ang) * 46, e.y - 70 - e.z + Math.sin(ang) * 12).setAlpha(a); });
      if (e.gone || st.t > 2.2) { st.imgs.forEach(o => o.destroy()); this.stars.splice(this.stars.indexOf(st), 1); }
    }
  }
  // ---------- Jaret Byar ----------
  parryBait(b) { this.glint(b.x - b.facing * 70, b.y - 230, 0xfff0c0); sfx.glint(); this.hint('parry', "PARRY STANCE! DON'T HIT HIS SHIELD. WAIT"); }
  onRiposte(b) {
    const s = this.s; this.stats.ripostes++; this.hint('riposte', 'PARRIED! WAIT FOR HIM TO LOWER HIS GUARD');
    if (s.time.now - this.lastRiposteLine > 6000) { this.lastRiposteLine = s.time.now; say('byar_parry_01', s.caption, false); }
  }
  volleyActive() { return !!this.volley; }
  bandOf(y) { return VOLLEY_BANDS.findIndex(([a, b], i) => y >= a && (y < b || i === VOLLEY_BANDS.length - 1)); }
  startVolley(b) {
    const s = this.s, R = s.riley, rb = Math.max(0, this.bandOf(R.y));
    // Riley's band is always marked; a second band is marked half the time (always in phase 3) but one band stays safe.
    const bands = [rb];
    if (b.phase >= 3 || Math.random() < 0.5) bands.push(pick([0, 1, 2].filter(i => i !== rb)));
    const markers = bands.map(i => { const [y0, y1] = VOLLEY_BANDS[i]; return this.img('lanemark', s.camX + VW / 2, (y0 + y1) / 2, 950).setDisplaySize(VW + 80, y1 - y0).setTint(0xff3a2a).setAlpha(0.5); });
    this.volley = { bands, markers, t: 0, falling: null, struck: false }; this.volleys++; this.stats.volleys++;
    sfx.horn(); this.hint('volley', 'ARROW VOLLEY! CHANGE LANES!');
  }
  updateVolley(dt, R) {
    const v = this.volley; if (!v) return;
    const s = this.s; v.t += dt;
    for (const m of v.markers) m.setPosition(s.camX + VW / 2, m.y).setAlpha(0.32 + 0.28 * Math.abs(Math.sin(v.t * 9)));
    if (!v.falling && v.t >= VOLLEY.warn - 0.32) {
      v.falling = [];
      for (const i of v.bands) { const [y0, y1] = VOLLEY_BANDS[i]; for (let k = 0; k < 7; k++) { const x = s.camX + 90 + k * (VW - 180) / 6 + rand(-30, 30), y = rand(y0 + 6, y1 - 4); v.falling.push({ img: this.img('arrow', x + 140, y - 700, 1000 + y + 1).setScale(0.2).setRotation(1.85).setLighting(true), x, y }); } }
      sfx.volleyWhistle();
    }
    if (v.falling && !v.struck) {
      const u = clamp((v.t - (VOLLEY.warn - 0.32)) / 0.32, 0, 1);
      for (const f of v.falling) f.img.setPosition(f.x + 140 * (1 - u), f.y - 700 * (1 - u) - 26);
    }
    if (!v.struck && v.t >= VOLLEY.warn) {
      v.struck = true;
      const rb = this.bandOf(R.y);
      if (v.bands.includes(rb) && R.alive && R.z < 120 && R.takeHit({ dmg: VOLLEY.dmg, kind: 'heavy', kb: 300, down: true }, { x: R.x + (R.facing || 1) * 10 })) { this.stats.volleyHits++; s.fx.impact('heavy', R.x, R.y - 150, 1); }
      for (const f of v.falling) { s.fx.dust.emitParticleAt(f.x, f.y, 2); this.stick(f.img, 0.8); }
      for (const m of v.markers) m.destroy(); v.markers = [];
      sfx.thud(); s.fx.trauma = Math.min(1, s.fx.trauma + 0.3);
    }
    if (v.struck && v.t >= VOLLEY.warn + VOLLEY.rain) this.volley = null;
  }
  rage(b) {
    const s = this.s; if (this.barn) return;
    const ms = this.plates.midScale || 0.76, lights = [], emitters = [];
    for (const [pi, px, py, I, rad] of this.cfg.barnFire || []) {
      const m = s.midPlates[pi]; if (!m) continue;
      const wx = m.x + px * ms, wy = MID_Y - m.height * ms + py * ms;
      const L = s.lights.addLight(wx, wy, rad, 0xff7a2a, 0.01, 110); L.baseX = wx; L.baseI = 0.01; L.fullI = I; L.seed = Math.random() * 10; L.par = m.scrollFactorX ?? (this.plates.midParallax || 0.5); s.fires.push(L); lights.push(L);
      emitters.push(s.add.particles(wx, wy + 40, 'ember', { x: { min: -90, max: 90 }, lifespan: 1800, speedY: { min: -150, max: -60 }, speedX: { min: -30, max: 30 }, scale: { start: 2.2, end: 0 }, frequency: s.fx.quality >= 2 ? 90 : 40, blendMode: 'ADD' }).setScrollFactor(L.par, 1).setDepth(-48));
      emitters.push(s.add.particles(wx, wy - 40, 'smoke', { x: { min: -80, max: 80 }, lifespan: 2600, speedY: { min: -60, max: -25 }, scale: { start: 1.2, end: 3.2 }, alpha: { start: 0.45, end: 0 }, frequency: 220 }).setScrollFactor(L.par, 1).setDepth(-49));
    }
    this.barn = { lights, emitters, t: 0 };
    s.fireCap = Math.max(s.fireCap || 4, 5);
    s.fx.boom(b.x - b.facing * 60, b.y - 200, 1.2, 300); sfx.flame(); s.fx.trauma = Math.min(1, s.fx.trauma + 0.5);
    s.hud?.flashText('BYAR IS TORCHING THE BARN!'); say('byar_rage_01', s.caption);
  }
  throwTorch(b) {
    const s = this.s, R = s.riley, x0 = b.x - b.facing * 40, z0 = 300, tx = clamp(R.x, s.bounds.l + 80, s.bounds.r - 80), ty = R.y;
    const img = this.img('torch', x0, b.y - z0, 1000 + b.y + 1).setScale(0.16);
    const L = s.lights.addLight(x0, b.y - z0, 340, 0xff8a3a, 2.0, 90);
    const trail = s.add.particles(0, 0, 'ember', { follow: img, lifespan: 600, speed: { min: 10, max: 60 }, scale: { start: 1.2, end: 0 }, frequency: 30, blendMode: 'ADD' }).setDepth(4002);
    this.torches.push({ img, L, trail, x0, y0: b.y, z0, tx, ty, t: 0, T: 0.8, spin: -b.facing * 9 }); this.stats.torches++;
    sfx.whoosh();
  }
  updateTorches(dt, R) {
    const s = this.s;
    for (const k of this.torches.slice()) {
      k.t += dt; const u = Math.min(1, k.t / k.T);
      const x = k.x0 + (k.tx - k.x0) * u, y = k.y0 + (k.ty - k.y0) * u, z = k.z0 * (1 - u) + 380 * u * (1 - u);
      k.img.setPosition(x, y - z - 20).setRotation(k.img.rotation + k.spin * dt).setDepth(1000 + y + 1); k.L.x = x; k.L.y = y - z - 30;
      if (u >= 1) {
        k.img.destroy(); k.trail.stop(); s.time.delayedCall(600, () => k.trail.destroy()); s.lights.removeLight(k.L);
        s.fx.boom(x, y - 30, 1.6, 300); sfx.flame(); s.fx.embers.emitParticleAt(x, y - 20, 16);
        if (Math.abs(R.x - x) < 100 && Math.abs(R.y - y) < 40 && R.z < 80) R.takeHit({ dmg: 10, kind: 'heavy', kb: 380, down: true }, { x: x - 1 });
        s.addPatch(x, y); this.torches.splice(this.torches.indexOf(k), 1);
      }
    }
  }
  // ---------- the stable (zone 3 of 4): beams fall, then the whole stable comes down behind Riley ----------
  updateBeams(dt, R) {
    const s = this.s, z = s.zone, B = STAGE2.beams;
    if (z && z.stable && s.locked && s.wave >= 0 && !s.victoryPending && this.beams.length < 2) {
      if ((this.beamT -= dt) <= 0) { this.beamT = rand(B.every[0], B.every[1]); this.dropBeam(clamp(R.x + rand(-60, 200) * (R.facing || 1), s.bounds.l + 90, s.bounds.r - 90), clamp(R.y + rand(-14, 14), LANE_TOP + 8, LANE_BOT - 8), true); }
    }
    for (const b of this.beams.slice()) {
      b.t += dt;
      if (b.t < B.warn) { const u = b.t / B.warn; b.sh.setScale(1.2 + 1.8 * u, (1.2 + 1.8 * u) * 0.24).setAlpha(0.35 + 0.5 * u); continue; }
      if (!b.landed) {
        const u = Math.min(1, (b.t - B.warn) / 0.22); b.img.setVisible(true).setPosition(b.x, b.y - 30 - 660 * (1 - u));
        if (u >= 1) {
          b.landed = true; s.fx.thump(b.x, b.y, true); s.fx.debris.emitParticleAt(b.x, b.y - 30, 12); sfx.thud(); sfx.smash(); this.stats.beams++;
          if (b.hurts) {
            if (R.alive && Math.abs(R.x - b.x) < 120 && Math.abs(R.y - b.y) < 26 && R.z < 90 && R.takeHit({ dmg: B.dmg, kind: 'heavy', kb: 320, down: true }, { x: b.x - 1 })) this.stats.beamHits++;
            for (const e of s.enemies) if (e.canBeHit && Math.abs(e.x - b.x) < 120 && Math.abs(e.y - b.y) < 26 && e.z < 90) e.takeHit({ dmg: B.enemyDmg, kind: 'heavy', kb: 320 * (Math.sign(e.x - b.x) || 1), launch: 260, down: true }, { x: b.x - 1 });
          }
        }
        continue;
      }
      if (b.t > B.warn + 1.8) { const a = Math.max(0, 1 - (b.t - B.warn - 1.8) / 0.5); b.img.setAlpha(a); b.sh.setAlpha(a * 0.6); if (a <= 0) { b.img.destroy(); b.sh.destroy(); this.beams.splice(this.beams.indexOf(b), 1); } }
    }
  }
  dropBeam(x, y, hurts) {
    const s = this.s;
    const sh = this.img('shadow', x, y + 2, 905).setScale(1.2, 0.29).setAlpha(0.3);
    const img = this.img('beam2', x, y - 700, 1000 + y).setScale(0.22).setRotation(rand(-0.08, 0.08)).setLighting(true).setVisible(false);
    this.beams.push({ x, y, sh, img, t: 0, landed: false, hurts }); sfx.creak();
  }
  /** a zone's last wave is down */
  onZoneClear(i) {
    const s = this.s, z = STAGE2.zones[i];
    if (z && z.stable && !this.collapsed) {
      this.collapsed = true; s.hud?.flashText('THE STABLE IS COMING DOWN! RUN!'); s.fx.trauma = Math.min(1, s.fx.trauma + 0.5); sfx.creak();
      const run = s.runId, R = s.riley;
      [0.25, 0.85, 1.45].forEach((t, k) => s.time.delayedCall(t * 1000, () => { if (s.runId === run && !s.ended) this.dropBeam(clamp(R.x - 170 - k * 60, s.bounds.l + 60, s.bounds.r - 60), clamp(R.y + (k - 1) * 18, LANE_TOP + 8, LANE_BOT - 8), false); }));
    }
  }
  // ---------- Twinkle Toes' ribbon ----------
  dropRibbon() {
    const s = this.s, R = s.riley; if (this.ribbonDropped) return; this.ribbonDropped = true;
    const x = clamp(R.x + (R.facing || 1) * 210, s.bounds.l + 90, s.bounds.r - 90), y = clamp(R.y, LANE_TOP + 12, LANE_BOT - 12);
    const g = s.add.image(x, y - 34, 'glow').setBlendMode('ADD').setScale(0.75).setTint(0x7ab8ff).setDepth(1000 + y);
    const c = s.add.image(x, y - 34, 'ribbon').setScale(0.3).setDepth(1000 + y + 1);
    const L = s.lights.addLight(x, y - 44, 200, 0x8ac4ff, 1.3, 80);
    s.pickups.push({ x, y, kind: 'ribbon', g, c, L, t: 0 }); sfx.fall();
  }
  collectRibbon(p) {
    const s = this.s; this.ribbons++; this.stats.ribbon++; s.riley.score += 1000;
    sfx.pickup(); sfx.powerUp(); s.fx.embers.emitParticleAt(p.x, p.y - 40, 12);
    s.hud?.flashText("TWINKLE TOES' RIBBON!"); s.hud?.ribbon?.(this.ribbons); say('riley_ribbon_01', s.caption);
  }
  // ---------- teardown of in-flight hazards at victory ----------
  clearHazards() {
    for (const a of this.arrows) a.img.destroy(); this.arrows = [];
    for (const m of this.skyArrows) { m.mark.destroy(); if (m.arrow) m.arrow.destroy(); } this.skyArrows = [];
    if (this.volley) { for (const m of this.volley.markers) m.destroy(); for (const f of this.volley.falling || []) f.img.destroy(); this.volley = null; }
    for (const k of this.torches) { k.img.destroy(); k.trail.destroy(); this.s.lights.removeLight(k.L); } this.torches = [];
  }
  /** what the campaign bot and the tests can see */
  threats() { return { arrows: this.arrows, sky: this.skyArrows, volley: this.volley, torches: this.torches, beams: this.beams }; }
}
