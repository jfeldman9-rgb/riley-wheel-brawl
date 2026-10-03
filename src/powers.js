// Angreal and sa'angreal (restored from 1.1) and ter'angreal timed powers for Stage 1.
// Two slots: a "boost" (angreal / sa'angreal: cheaper, triple fireballs, faster saidin) and one ter'angreal power
// (LIGHTNING / FIRE SHIELD / AIR WHIP). The joke ter'angreal (a Twix bar) opens the campfire cutscene instead.
// Every timer here runs on gameplay dt inside Stage1.update, so a pause or the cutscene freezes it exactly.
import { clamp, LANE_TOP, LANE_BOT, VW } from './config.js';
import { sfx } from './audio.js';

export const POWERS = Object.freeze({
  angreal: { slot: 'boost', name: 'ANGREAL', seconds: 10, color: 0xffd27a, css: '#ffd27a', castCost: 17, fireDmg: 20, lanes: [-40, 0, 40], meter: 1.6, voice: 'riley_angreal_01' },
  saangreal: { slot: 'boost', name: "SA'ANGREAL", seconds: 12, color: 0xfff3c0, css: '#fff3c0', castCost: 0, fireDmg: 26, lanes: [-46, 0, 46], meter: 2.2, voice: 'riley_saangreal_01' },
  lightning: { slot: 'ter', name: 'LIGHTNING', seconds: 12, color: 0x9fd8ff, css: '#9fd8ff', cast: true, voice: 'riley_lightning_01' },
  fireshield: { slot: 'ter', name: 'FIRE SHIELD', seconds: 10, color: 0xff8a3a, css: '#ffab6a', voice: 'riley_fireshield_01' },
  airwhip: { slot: 'ter', name: 'AIR WHIP', seconds: 12, color: 0xd8f4ff, css: '#e6f8ff', cast: true, voice: 'riley_airwhip_01' },
  twix: { slot: 'joke', name: 'TWIX', color: 0xd9a35a, css: '#e8b878' },
});
export const TER_POWERS = ['lightning', 'fireshield', 'airwhip'];
export const LIGHTNING = Object.freeze({ range: 620, hop: 320, maxTargets: 4, dmg: 12, chainDmg: 9, life: 0.24, fireFrame: 3, hand: [145, 180] });   // hand: fingertips of the painted release frame (x ahead, y up)
export const FIRE_SHIELD = Object.freeze({ rx: 125, ry: 38, dmg: 5, tick: 0.55, kb: 300, embers: 8 });
export const AIR_WHIP = Object.freeze({ range: 640, dy: 70, dmg: 6, pull: 0.26, stand: 96, life: 0.3 });
export const PICKUP_LIFE = 25, PICKUP_BLINK = 3, TWIX_DROP_Z = 640;
// Deterministic placement: every power appears in every normal Stage 1 run. Each drop lands near Riley `delay`
// seconds after that wave starts. The Twix appears once per run, mid-stage (zone 2 of 4, second wave).
// 'ter?' picks one ter'angreal at random; the sa'angreal arrives with the Chieftain's second phase.
export const DROPS = Object.freeze([
  { zone: 0, wave: 0, kind: 'angreal', delay: 1.2 },
  { zone: 0, wave: 1, kind: 'fireshield', delay: 1.0 },
  { zone: 1, wave: 0, kind: 'lightning', delay: 1.0 },
  { zone: 1, wave: 1, kind: 'twix', delay: 1.4 },
  { zone: 2, wave: 0, kind: 'airwhip', delay: 1.0 },
  { zone: 2, wave: 1, kind: 'ter?', delay: 1.0 },
]);
export const BOSS_DROP = Object.freeze({ phase: 2, kind: 'saangreal' });
// Art (painted with ChatGPT image gen via Codex; see ART_LIST.md). Pickup icons, HUD icons and cutscene panels are shown
// as-is. Effect sprites and Riley's lightning-cast frames are only used when `ready` is true; with `ready` false the
// effects are drawn procedurally and Riley uses his fireball cast.
// Full specs and prompts: ART_LIST.md (kept beside this file in assets/powers/).
export const ART = Object.freeze({
  pickups: Object.fromEntries(['angreal', 'saangreal', 'lightning', 'fireshield', 'airwhip', 'twix'].map(k => [k, { key: 'pu_' + k, url: `assets/powers/pu_${k}.png`, size: 96 }])),
  hud: Object.fromEntries(['angreal', 'saangreal', 'lightning', 'fireshield', 'airwhip'].map(k => [k, { key: 'hud_' + k, url: `assets/powers/hud_${k}.png`, size: 48 }])),
  panels: [1, 2, 3].map(n => ({ key: 'twix_panel_' + n, url: `assets/powers/twix_panel_${n}.jpg` })),
  fx: {
    lightning: { key: 'fx_lightning', url: 'assets/powers/fx_lightning.png', frameWidth: 512, frameHeight: 64, frames: 3, ready: true },
    fireshield: { key: 'fx_fireshield', url: 'assets/powers/fx_fireshield.png', frameWidth: 384, frameHeight: 160, frames: 2, ready: true },
    airwhip: { key: 'fx_airwhip', url: 'assets/powers/fx_airwhip.png', frameWidth: 512, frameHeight: 64, frames: 1, ready: true },
  },
  // Riley's lightning cast: the registered 3x2 grid (960x640 frames, feet y=610, sprite anchor x=432) is
  // riley_lightning.png; the game plays the same 6 frames packed into Riley's own atlas page riley-1 (with normal maps,
  // anim 'riley_lightning' in riley.anims.json) so they are lit and scaled exactly like his other frames.
  rileyLightning: { anim: 'riley_lightning', page: 'riley-1', url: 'assets/powers/riley_lightning.png', frameWidth: 960, frameHeight: 640, frames: 6, holds: [80, 90, 110, 160, 130, 90], ready: true },
});
export function queuePowerArt(scene) {
  const L = scene.load, has = k => scene.textures.exists(k);
  for (const a of [...Object.values(ART.pickups), ...Object.values(ART.hud), ...ART.panels]) if (!has(a.key)) L.image(a.key, a.url);
  for (const a of Object.values(ART.fx)) if (a.ready && !has(a.key)) L.spritesheet(a.key, a.url, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
}
/** Riley's lightning cast uses his painted lightning frames (atlas page riley-1, made by makeCharAnims) while
 *  ART.rileyLightning.ready is true; with it false the anim is dropped and he uses his fireball cast. */
export function makePowerAnims(scene) {
  const A = ART.rileyLightning;
  if (!A.ready && scene.anims.exists(A.anim)) scene.anims.remove(A.anim);
}
export const iconKey = kind => (ART.pickups[kind] || {}).key;

export class Powers {
  constructor(scene) {
    this.s = scene; this.boost = null; this.ter = null; this.bolts = []; this.whips = []; this.pulls = []; this.shieldHits = new Map();
    this.aura = null; this.shield = null; this.collected = []; this.dropped = [];
  }
  /** seconds left on a slot (0 when empty) */
  left(slot) { const p = this[slot]; return p ? Math.max(0, p.t) : 0; }
  active(kind) { const P = POWERS[kind]; return !!P && !!this[P.slot] && this[P.slot].kind === kind; }
  castCost() { return this.boost ? POWERS[this.boost.kind].castCost : 34; }
  meterMul() { return this.boost ? POWERS[this.boost.kind].meter : 1; }
  /** the cast a special press makes right now: a ter'angreal cast, a fireball, or nothing */
  castKind(R) {
    if (this.ter && POWERS[this.ter.kind].cast) return this.ter.kind;
    return R.saidin >= this.castCost() ? 'fireball' : null;
  }
  activate(kind) {
    const P = POWERS[kind]; if (!P || (P.slot !== 'boost' && P.slot !== 'ter')) return false;
    if (P.slot === 'boost') { this.clearSlot('boost'); this.boost = { kind, t: P.seconds, total: P.seconds }; this.makeAura(); }
    else { this.clearSlot('ter'); this.ter = { kind, t: P.seconds, total: P.seconds }; if (kind === 'fireshield') this.makeShield(); }
    this.collected.push(kind);
    return true;
  }
  clearSlot(slot) {
    const p = this[slot]; if (!p) return; this[slot] = null;
    if (slot === 'boost' && this.aura) { this.aura.destroy(); this.aura = null; }
    if (slot === 'ter' && this.shield) { for (const o of this.shield.parts) o.destroy(); this.s.lights.removeLight(this.shield.L); this.shield = null; this.shieldHits.clear(); }
  }
  /** death, victory and restart drop every active power and its effects */
  clearAll() {
    this.clearSlot('boost'); this.clearSlot('ter');
    for (const b of this.bolts) this.destroyBolt(b);
    for (const w of this.whips) w.parts.forEach(o => o.destroy());
    this.bolts = []; this.whips = []; this.pulls = [];
  }
  // ---------- effects ----------
  makeAura() {
    const R = this.s.riley, P = POWERS[this.boost.kind];
    this.aura = this.s.add.image(R.x, R.y - 120, 'glow').setBlendMode('ADD').setTint(P.color).setScale(2.2, 3.0).setAlpha(0.35).setDepth(1000 + R.y - 1);
  }
  makeShield() {
    const s = this.s, R = s.riley, parts = [], A = ART.fx.fireshield;
    // Painted ring once it exists: frame 0 (back half) behind Riley, frame 1 (front half) in front of him.
    if (A.ready) for (let f = 0; f < 2; f++) parts.push(s.add.image(R.x, R.y, A.key, f).setOrigin(0.5, 0.5).setDisplaySize(FIRE_SHIELD.rx * 2 + 40, (FIRE_SHIELD.rx * 2 + 40) * A.frameHeight / A.frameWidth).setBlendMode('ADD'));
    else for (let i = 0; i < FIRE_SHIELD.embers; i++) parts.push(s.add.image(R.x, R.y, 'core').setBlendMode('ADD').setTint(0xff8a3a).setScale(0.55).setDepth(1000 + R.y));
    const L = s.lights.addLight(R.x, R.y - 40, 260, 0xff7a2a, 0.8, 90);   // low and soft: a bright light washes Riley's black coat out
    this.shield = { parts, L, t: 0 };
  }
  destroyBolt(b) { for (const o of b.parts) o.destroy(); if (b.L) this.s.lights.removeLight(b.L); }
  /** a jagged bolt between two points made of stretched beam segments (painted strip once ART.fx.lightning is ready) */
  boltParts(x0, y0, x1, y1) {
    const s = this.s, parts = [], A = ART.fx.lightning;
    if (A.ready) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      parts.push(s.add.image(x0, y0, A.key, (Math.random() * A.frames) | 0).setOrigin(0, 0.5).setDisplaySize(len, 84).setRotation(Math.atan2(y1 - y0, x1 - x0)).setBlendMode('ADD').setDepth(4004));
      return parts;
    }
    let px = x0, py = y0; const n = 4;
    for (let i = 1; i <= n; i++) {
      const u = i / n, jit = i === n ? 0 : (Math.random() * 2 - 1) * 26;
      const nx = x0 + (x1 - x0) * u + jit * 0.4, ny = y0 + (y1 - y0) * u + jit;
      const len = Math.hypot(nx - px, ny - py), rot = Math.atan2(ny - py, nx - px);
      parts.push(s.add.image(px, py, 'beam').setOrigin(0, 0.5).setDisplaySize(len, 18).setRotation(rot).setTint(0xbfe6ff).setBlendMode('ADD').setDepth(4004));
      parts.push(s.add.image(px, py, 'beam').setOrigin(0, 0.5).setDisplaySize(len, 6).setRotation(rot).setBlendMode('ADD').setDepth(4005));
      px = nx; py = ny;
    }
    return parts;
  }
  /** LIGHTNING: strikes the nearest foe ahead, then chains to nearby foes */
  fireLightning(R) {
    const s = this.s, [hx, hy] = R.cur === 'riley_lightning' ? LIGHTNING.hand : [70, 150], hand = { x: R.x + R.facing * hx, y: R.y - R.z - hy };
    const targets = this.chainTargets(R);
    const parts = [], dir = R.facing;
    let from = hand;
    if (!targets.length) parts.push(...this.boltParts(hand.x, hand.y, hand.x + dir * 260, hand.y - 30 + Math.random() * 60));
    targets.forEach((e, i) => {
      const to = { x: e.x, y: e.y - e.z - 140 };
      parts.push(...this.boltParts(from.x, from.y, to.x, to.y));
      const kb = Math.sign(e.x - (i ? targets[i - 1].x : R.x)) || dir;
      s.hitTarget(R, e, { dmg: i ? LIGHTNING.chainDmg : LIGHTNING.dmg, kind: 'medium', kb: kb * 220, noMeter: i > 0 }, { x: e.x - kb * 40, facing: kb });
      from = to;
    });
    const end = targets.length ? { x: targets[0].x, y: targets[0].y - 160 } : { x: hand.x + dir * 200, y: hand.y };
    const L = s.lights.addLight(end.x, end.y, 420, 0xb8e0ff, 2.6, 90);
    this.bolts.push({ parts, L, t: 0, targets });
    sfx.zap(); s.fx.trauma = Math.min(1, s.fx.trauma + 0.25);
    return targets;
  }
  chainTargets(R) {
    const s = this.s, onScreen = e => e.canBeHit && e.x > s.camX - 40 && e.x < s.camX + VW + 40;
    const foes = s.enemies.filter(onScreen);
    const ahead = foes.filter(e => (e.x - R.x) * R.facing > -40 && Math.abs(e.x - R.x) < LIGHTNING.range && Math.abs(e.y - R.y) < 140);
    if (!ahead.length) return [];
    ahead.sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x));
    const chain = [ahead[0]];
    while (chain.length < LIGHTNING.maxTargets) {
      const last = chain[chain.length - 1];
      const next = foes.filter(e => !chain.includes(e) && Math.hypot(e.x - last.x, (e.y - last.y) * 2) < LIGHTNING.hop)
        .sort((a, b) => Math.abs(a.x - last.x) - Math.abs(b.x - last.x))[0];
      if (!next) break; chain.push(next);
    }
    return chain;
  }
  /** AIR WHIP: lashes the nearest foe ahead and yanks it in front of Riley, dazed (the Chieftain plants his feet) */
  fireWhip(R) {
    const s = this.s, dir = R.facing, hand = { x: R.x + dir * 70, y: R.y - R.z - 150 };
    const e = s.enemies.filter(f => f.canBeHit && (f.x - R.x) * dir > 30 && Math.abs(f.x - R.x) < AIR_WHIP.range && Math.abs(f.y - R.y) < AIR_WHIP.dy)
      .sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x))[0] || null;
    const tip = e ? { x: e.x, y: e.y - e.z - 140 } : { x: hand.x + dir * 420, y: hand.y };
    const A = ART.fx.airwhip, len = Math.abs(tip.x - hand.x) || 1, rot = Math.atan2(tip.y - hand.y, tip.x - hand.x);
    const parts = A.ready
      ? [s.add.image(hand.x, hand.y, A.key).setOrigin(0, 0.5).setDisplaySize(len, A.frameHeight).setRotation(rot).setBlendMode('ADD').setDepth(4004)]
      : [s.add.image(hand.x, hand.y, 'beam').setOrigin(0, 0.5).setDisplaySize(len, 26).setRotation(rot).setTint(0xd8f4ff).setAlpha(0.55).setBlendMode('ADD').setDepth(4004),
        s.add.image(hand.x, hand.y, 'beam').setOrigin(0, 0.5).setDisplaySize(len, 8).setRotation(rot).setAlpha(0.8).setBlendMode('ADD').setDepth(4005)];
    this.whips.push({ parts, t: 0, hand, tip, e });
    sfx.whoosh();
    if (!e) return null;
    const hit = s.hitTarget(R, e, { dmg: AIR_WHIP.dmg, kind: 'light', kb: -dir * 1 }, { x: e.x + dir * 40, facing: -dir });
    if (hit && e.alive && !(e.T && e.T.boss)) {
      const to = clamp(R.x + dir * AIR_WHIP.stand, s.bounds.l + 40, s.bounds.r - 40);
      e.vx = 0; this.pulls.push({ e, from: e.x, to, y0: e.y, y1: clamp(R.y, LANE_TOP, LANE_BOT), t: 0 });
    }
    return e;
  }
  // ---------- per frame (gameplay dt) ----------
  update(dt) {
    const s = this.s, R = s.riley;
    for (const slot of ['boost', 'ter']) { const p = this[slot]; if (p && (p.t -= dt) <= 0) { this.clearSlot(slot); sfx.powerDown(); } }
    if (this.aura) { const k = 0.3 + 0.08 * Math.sin(s.time.now * 0.012); this.aura.setPosition(R.x, R.y - R.z - 120).setAlpha(this.left('boost') < 2 && Math.floor(this.left('boost') * 8) % 2 ? 0.1 : k).setDepth(1000 + R.y - 1); }
    if (this.shield) this.updateShield(dt);
    for (const b of this.bolts.slice()) {
      b.t += dt; const k = Math.max(0, 1 - b.t / LIGHTNING.life);
      for (const o of b.parts) o.setAlpha(k * (Math.random() < 0.3 ? 0.5 : 1)); if (b.L) b.L.intensity = s.lightsOn ? 2.6 * k : 0;
      if (b.t >= LIGHTNING.life) { this.destroyBolt(b); this.bolts.splice(this.bolts.indexOf(b), 1); }
    }
    for (const w of this.whips.slice()) {
      w.t += dt; const k = Math.max(0, 1 - w.t / AIR_WHIP.life);
      for (const o of w.parts) o.setAlpha(k * 0.8);
      if (w.t >= AIR_WHIP.life) { w.parts.forEach(o => o.destroy()); this.whips.splice(this.whips.indexOf(w), 1); }
    }
    for (const p of this.pulls.slice()) {
      p.t += dt; const u = Math.min(1, p.t / AIR_WHIP.pull), ease = 1 - (1 - u) * (1 - u);
      if (!p.e.alive || p.e.state === 'held' || p.e.state === 'thrown') { this.pulls.splice(this.pulls.indexOf(p), 1); continue; }
      p.e.x = clamp(p.from + (p.to - p.from) * ease, s.bounds.l + 40, s.bounds.r - 40); p.e.y = p.y0 + (p.y1 - p.y0) * ease;
      if (u >= 1) this.pulls.splice(this.pulls.indexOf(p), 1);
    }
  }
  updateShield(dt) {
    const s = this.s, R = s.riley, sh = this.shield; sh.t += dt;
    const fading = this.left('ter') < 2 && Math.floor(this.left('ter') * 8) % 2;
    if (ART.fx.fireshield.ready) sh.parts.forEach((o, f) => o.setPosition(R.x, R.y - R.z - 30).setDepth(1000 + R.y + (f ? 2 : -2)).setAlpha(fading ? 0.3 : 0.86 + 0.12 * Math.sin(sh.t * (f ? 23 : 19))));
    else sh.parts.forEach((o, i) => {
      const a = sh.t * 3.2 + (i / sh.parts.length) * Math.PI * 2, x = R.x + Math.cos(a) * FIRE_SHIELD.rx, y = R.y + Math.sin(a) * FIRE_SHIELD.ry;
      o.setPosition(x, y - R.z - 70).setDepth(1000 + y).setAlpha(fading ? 0.3 : 0.9).setScale(0.5 + 0.1 * Math.sin(sh.t * 20 + i));
    });
    sh.L.x = R.x; sh.L.y = R.y - 40 - R.z; sh.L.intensity = s.lightsOn ? 0.7 + 0.15 * Math.sin(sh.t * 17) : 0;
    for (const [e, t] of this.shieldHits) { const n = t - dt; if (n <= 0) this.shieldHits.delete(e); else this.shieldHits.set(e, n); }
    if (!R.alive) return;
    for (const e of s.enemies) {
      if (!e.canBeHit || this.shieldHits.has(e) || e.z > 140) continue;
      const nx = (e.x - R.x) / FIRE_SHIELD.rx, ny = (e.y - R.y) / FIRE_SHIELD.ry;
      if (nx * nx + ny * ny > 1) continue;
      const dir = Math.sign(e.x - R.x) || R.facing;
      this.shieldHits.set(e, FIRE_SHIELD.tick);
      if (s.hitTarget(R, e, { dmg: FIRE_SHIELD.dmg, kind: 'light', kb: dir * FIRE_SHIELD.kb, noMeter: true }, { x: R.x, facing: dir })) s.fx.embers.emitParticleAt(e.x, e.y - 90, 8);
    }
  }
}
