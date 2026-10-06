// Hit feel + lighting effects: hit-stop, trauma shake, sparks, dust, embers, impact lights, snow, bloom, vignette.
import { HITSTOP, SHAKE, VW } from './config.js';
export class FX {
  constructor(scene) {
    this.s = scene; this.hitstop = 0; this.trauma = 0; this.slowmo = 0; this.lightsOn = true; this.quality = 0;
    this._sx = 0; this._sy = 0; this._dt = 1 / 60; this._out = [0, 0];
    this.makeTextures();
    const add = scene.add;
    const sp = (amin, amax) => { const e = add.particles(0, 0, 'streak', { emitting: false, lifespan: { min: 110, max: 240 }, speed: { min: 360, max: 860 }, angle: { min: amin, max: amax }, rotate: { onEmit: (p) => Math.atan2(p.velocityY, p.velocityX) * 57.3, onUpdate: (p) => Math.atan2(p.velocityY, p.velocityX) * 57.3 }, scale: { start: 1.0, end: 0.1 }, blendMode: 'ADD', tint: [0xfff2c0, 0xffc060, 0xffffff] }).setDepth(4000); return e; };
    this.sparksR = sp(-45, 45); this.sparksL = sp(135, 225);
    this.dots = add.particles(0, 0, 'dot', { emitting: false, lifespan: 380, speed: { min: 120, max: 420 }, scale: { start: 0.55, end: 0 }, gravityY: 900, blendMode: 'ADD', tint: 0xffd080 }).setDepth(4000);
    this.dust = add.particles(0, 0, 'dust', { emitting: false, lifespan: 700, speedX: { min: -160, max: 160 }, speedY: { min: -60, max: -10 }, scale: { start: 1.1, end: 2.4 }, alpha: { start: 0.5, end: 0 } }).setDepth(3990);
    this.snowPuff = add.particles(0, 0, 'flake', { emitting: false, lifespan: 600, speedX: { min: -120, max: 120 }, speedY: { min: -160, max: -40 }, gravityY: 300, scale: { min: 0.3, max: 0.7 }, alpha: { start: 0.9, end: 0 } }).setDepth(3991);
    this.embers = add.particles(0, 0, 'ember', { emitting: false, lifespan: 480, speed: { min: 20, max: 120 }, scale: { start: 1.2, end: 0 }, blendMode: 'ADD' }).setDepth(4001);
    this.debris = add.particles(0, 0, 'chip', { emitting: false, lifespan: 900, speed: { min: 200, max: 520 }, angle: { min: -160, max: -20 }, gravityY: 1400, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.3 }, tint: [0x7a5230, 0x5c3b22, 0x9a6a3e] }).setDepth(4001);
    this.flash = add.image(0, 0, 'glow').setBlendMode('ADD').setVisible(false).setDepth(4002); this.flashT = 0;
    this.hitLight = scene.lights.addLight(0, 0, 260, 0xffe0a0, 0, 60);
    this.booms = [];
  }
  makeTextures() {
    const s = this.s; if (s.textures.exists('glow')) return;
    const radial = (key, size, stops) => {
      const c = s.textures.createCanvas(key, size, size), x = c.getContext(), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size); c.refresh();
    };
    radial('flake', 16, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(235,242,255,.8)'], [1, 'rgba(255,255,255,0)']]);
    radial('glow', 128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,220,140,.9)'], [0.6, 'rgba(255,120,30,.35)'], [1, 'rgba(255,80,0,0)']]);
    radial('core', 64, [[0, 'rgba(255,255,240,1)'], [0.5, 'rgba(255,200,90,1)'], [1, 'rgba(255,90,10,0)']]);
    radial('ember', 12, [[0, 'rgba(255,240,200,1)'], [0.6, 'rgba(255,140,40,.8)'], [1, 'rgba(255,60,0,0)']]);
    radial('shadow', 64, [[0, 'rgba(0,0,0,.6)'], [0.7, 'rgba(0,0,0,.28)'], [1, 'rgba(0,0,0,0)']]);
    radial('dust', 32, [[0, 'rgba(220,228,240,.8)'], [1, 'rgba(220,228,240,0)']]);
    radial('smoke', 64, [[0, 'rgba(60,55,60,.55)'], [1, 'rgba(60,55,60,0)']]);
    const g = s.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1); g.fillTriangle(0, 3, 40, 0, 40, 6); g.generateTexture('streak', 40, 6); g.clear();
    g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6); g.generateTexture('dot', 12, 12); g.clear();
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 14, 5); g.generateTexture('chip', 14, 5); g.clear();
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4); g.generateTexture('px', 4, 4); g.destroy();
  }
  /** a landed hit: freeze, shake, sparks, light. dir = +1 if the hit travels right */
  impact(kind, x, y, dir = 1) {
    this.hitstop = Math.max(this.hitstop, HITSTOP[kind] / 60);
    this.trauma = Math.min(1, this.trauma + SHAKE[kind]);
    const n = { light: 9, medium: 14, heavy: 24, finisher: 34 }[kind] >> (this.quality >= 2 ? 1 : 0);
    (dir > 0 ? this.sparksR : this.sparksL).emitParticleAt(x, y, n); this.dots.emitParticleAt(x, y, n >> 1);
    this.flash.setPosition(x, y).setVisible(true).setScale(kind === 'light' ? 0.55 : kind === 'medium' ? 0.8 : 1.15).setAlpha(0.7);
    this.flashT = 0.06 + HITSTOP[kind] / 120;
    if (kind === 'finisher') this.slowmo = 0.26; else if (kind === 'heavy') this.slowmo = Math.max(this.slowmo, 0.1);
    const L = this.hitLight; L.x = x; L.y = y; L.intensity = kind === 'light' ? 1.2 : kind === 'medium' ? 1.6 : 2.1; L.radius = kind === 'light' ? 200 : 330;
  }
  thump(x, y, big) { this.dust.emitParticleAt(x, y, big ? 14 : 8); this.snowPuff.emitParticleAt(x, y, big ? 12 : 6); this.trauma = Math.min(1, this.trauma + (big ? 0.35 : 0.2)); }
  boom(x, y, power = 2.4, rad = 420) {
    const L = this.s.lights.addLight(x, y, rad, 0xff9a40, power, 70); this.booms.push({ L, t: 0, power, rad });
    this.embers.emitParticleAt(x, y, this.quality >= 2 ? 20 : 40);
  }
  update(dt) {
    this._dt = dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const L = this.hitLight; L.intensity = Math.max(0, L.intensity - dt * 16);
    if (this.flashT > 0) { this.flashT -= dt; this.flash.setAlpha(Math.max(0, Math.min(0.7, this.flashT * 8))); if (this.flashT <= 0) this.flash.setVisible(false); }
    for (const b of this.booms.slice()) {
      b.t += dt; b.L.radius = b.rad + b.t * 900; b.L.intensity = Math.max(0, b.power * (1 - b.t / 0.45));
      if (b.t > 0.45) { this.s.lights.removeLight(b.L); this.booms.splice(this.booms.indexOf(b), 1); }
    }
  }
  shakeOffset() {
    const sh = this.trauma * this.trauma;
    const rx = (Math.random() * 2 - 1) * 10 * sh, ry = (Math.random() * 2 - 1) * 5 * sh;
    if (this.trauma === 0) this._sx = this._sy = 0;
    else {
      const k = 1 - Math.exp(-this._dt * 60);
      this._sx += (rx - this._sx) * k; this._sy += (ry - this._sy) * k;
    }
    this._out[0] = this._sx; this._out[1] = this._sy; return this._out;
  }
}
