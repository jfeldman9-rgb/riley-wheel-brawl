/* Riley Wheel Brawl 2.0 - style-lock spike: lit Phaser 4 test scene.
   Everything here is throwaway prototype code; the point is to feel the art + light + hit feel. */
(function () {
  'use strict';
  const VW = 1280, VH = 720, WORLD_W = 2200;
  const LANE_TOP = 560, LANE_BOT = 668;
  const q = new URLSearchParams(location.search);
  const RS = Math.max(1, Math.min(+q.get('rs') || Math.min(2, window.devicePixelRatio || 1), 2));
  const HS = { light: 4, medium: 6, heavy: 9, finisher: 14 };   // hit-stop in 60fps frames
  const perf = window.__perf = { frames: [], mark() { this.frames = []; } };

  class Spike extends Phaser.Scene {
    constructor() { super('spike'); }
    preload() {
      this.load.setCORS("anonymous");
      this.load.image('far', 'assets/bg-far.jpg');
      this.load.image('mid', ['assets/bg-mid.webp', 'assets/bg-mid_n.webp']);
      this.load.image('floor', ['assets/bg-floor.jpg', 'assets/bg-floor_n.webp']);
      for (const k of ['riley', 'trolloc']) {
        this.load.atlas({ key: k, textureURL: `assets/${k}.webp`, normalMap: `assets/${k}_n.webp`, atlasURL: `assets/${k}.json` });
        this.load.json(k + 'A', `assets/${k}.anims.json`);
      }
    }
    makeTextures() {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const radial = (key, size, stops) => {
        const c = this.textures.createCanvas(key, size, size), x = c.getContext();
        const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        stops.forEach(([o, col]) => gr.addColorStop(o, col)); x.fillStyle = gr; x.fillRect(0, 0, size, size); c.refresh();
      };
      radial('flake', 16, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(235,242,255,.8)'], [1, 'rgba(255,255,255,0)']]);
      radial('glow', 128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,220,140,.9)'], [0.6, 'rgba(255,120,30,.35)'], [1, 'rgba(255,80,0,0)']]);
      radial('core', 64, [[0, 'rgba(255,255,240,1)'], [0.5, 'rgba(255,200,90,1)'], [1, 'rgba(255,90,10,0)']]);
      radial('ember', 12, [[0, 'rgba(255,240,200,1)'], [0.6, 'rgba(255,140,40,.8)'], [1, 'rgba(255,60,0,0)']]);
      radial('shadow', 64, [[0, 'rgba(0,0,0,.55)'], [0.7, 'rgba(0,0,0,.25)'], [1, 'rgba(0,0,0,0)']]);
      radial('dust', 32, [[0, 'rgba(220,228,240,.8)'], [1, 'rgba(220,228,240,0)']]);
      g.fillStyle(0xffffff, 1); g.fillTriangle(0, 3, 40, 0, 40, 6); g.generateTexture('streak', 40, 6); g.clear();
      g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6); g.generateTexture('dot', 12, 12); g.destroy();
    }
    makeAnims(key) {
      const meta = this.cache.json.get(key + 'A');
      this.meta = this.meta || {}; this.meta[key] = meta;
      for (const a of meta.anims) {
        this.anims.create({ key: a.name, frames: a.frames.map((f, i) => ({ key, frame: f, duration: a.holds[i] })), repeat: a.loop ? -1 : 0 });
      }
    }
    create() {
      this.makeTextures(); this.makeAnims('riley'); this.makeAnims('trolloc');
      const cam = this.cameras.main; cam.setOrigin(0, 0); cam.setZoom(RS);
      this.lights.enable().setAmbientColor(0x353f60);
      this.lightsOn = true;
      // backdrop: far (unlit, painted moonlight), mid + floor (lit by the scene lights)
      const far = this.add.image(0, 0, 'far').setOrigin(0, 0).setScrollFactor(0.15);
      far.setScale(Math.max(VH * 0.78 / far.height, (VW + (WORLD_W - VW) * 0.15) / far.width)).setTint(0xb8c4e0);
      const mid = this.add.image(0, LANE_TOP - 10, 'mid').setOrigin(0, 1).setScrollFactor(0.4).setLighting(true);
      mid.setScale((VW + (WORLD_W - VW) * 0.4) / mid.width);
      if (mid.displayHeight > LANE_TOP + 40) mid.setScale((LANE_TOP + 40) / mid.height);
      const fl = this.textures.get('floor').getSourceImage();
      this.floor = this.add.tileSprite(0, LANE_TOP - 40, WORLD_W, VH - LANE_TOP + 40, 'floor').setOrigin(0, 0).setLighting(true);
      this.floor.setTileScale((VH - LANE_TOP + 40) / fl.height);
      this.midImg = mid;
      // snow behind the fighters
      this.snowBack = this.add.particles(0, 0, 'flake', { x: { min: -100, max: WORLD_W + 100 }, y: -20, lifespan: 9000, speedY: { min: 30, max: 55 }, speedX: { min: -25, max: 5 }, scale: { min: 0.15, max: 0.35 }, alpha: { min: 0.35, max: 0.7 }, frequency: 22, quantity: 1 }).setScrollFactor(0.6);
      // lights: moon rim + village fires (world positions roughly match the burning cottages on the mid plate)
      this.moon = this.lights.addLight(VW * 0.85, 60, 1500, 0xa8c0ff, 1.25, 260); this.moon.setScrollFactor(0.1, 1);
      this.fires = [];
      // fire positions measured on the mid plate (plate px * plate scale), lights share the plate's parallax
      const ms = mid.scale, mTop = (LANE_TOP - 10) - mid.height * ms;
      for (const [px, py, I, rad] of [[244, 382, 2.4, 700], [2036, 446, 2.4, 700], [1156, 573, 1.1, 420]]) {
        const L = this.lights.addLight(px * ms, mTop + py * ms, rad, 0xff8a3a, I, 110); L.setScrollFactor(0.4, 1);
        L.baseI = I; L.seed = Math.random() * 10; this.fires.push(L);
        if (I > 1) this.add.particles(px * ms, mTop + py * ms, 'ember', { lifespan: 2600, speedY: { min: -80, max: -30 }, speedX: { min: -25, max: 30 }, scale: { start: 0.9, end: 0 }, frequency: 90, blendMode: 'ADD' }).setScrollFactor(0.4, 1);
      }
      // fighters
      const rm = this.meta.riley, tm = this.meta.trolloc;
      this.R = this.makeFighter('riley', 420, 620, rm, 0.56);
      this.T = this.makeFighter('trolloc', 900, 615, tm, 0.56);
      this.heroLight = this.lights.addLight(0, 0, 420, 0xd8e2ff, 1.0, 150);
      this.R.hp = 999; this.T.hp = 5;
      this.setState(this.R, 'idle'); this.setState(this.T, 'walk');
      // snow in front
      this.snowFront = this.add.particles(0, 0, 'flake', { x: { min: -100, max: WORLD_W + 100 }, y: -20, lifespan: 6000, speedY: { min: 80, max: 130 }, speedX: { min: -50, max: -10 }, scale: { min: 0.5, max: 0.9 }, alpha: { min: 0.5, max: 0.9 }, frequency: 70 }).setDepth(5000).setScrollFactor(1.15);
      this.sparks = this.add.particles(0, 0, 'streak', { emitting: false, lifespan: { min: 120, max: 260 }, speed: { min: 380, max: 900 }, angle: { min: -40, max: 40 }, scale: { start: 1.1, end: 0.1 }, rotate: { onEmit: (p) => 0 }, blendMode: 'ADD', tint: [0xfff2c0, 0xffc060, 0xffffff] }).setDepth(4000);
      this.sparks.particleRotate = true;
      this.dots = this.add.particles(0, 0, 'dot', { emitting: false, lifespan: 380, speed: { min: 120, max: 420 }, scale: { start: 0.6, end: 0 }, gravityY: 900, blendMode: 'ADD', tint: 0xffd080 }).setDepth(4000);
      this.dust = this.add.particles(0, 0, 'dust', { emitting: false, lifespan: 700, speedX: { min: -160, max: 160 }, speedY: { min: -60, max: -10 }, scale: { start: 1.2, end: 2.6 }, alpha: { start: 0.55, end: 0 } }).setDepth(3999);
      this.embers = this.add.particles(0, 0, 'ember', { emitting: false, lifespan: 420, speed: { min: 20, max: 90 }, scale: { start: 1.2, end: 0 }, blendMode: 'ADD' }).setDepth(4001);
      this.flash = this.add.image(0, 0, 'glow').setBlendMode('ADD').setVisible(false).setDepth(4002);
      this.fireballs = [];
      // input
      const K = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,J,Z,K,X,B,L,M');
      this.K = K; this.touch = { L: 0, R: 0, U: 0, D: 0 };
      this.buffer = { atk: 0, fire: 0 };
      this.input.keyboard.on('keydown-J', () => this.buffer.atk = 0.2); this.input.keyboard.on('keydown-Z', () => this.buffer.atk = 0.2);
      this.input.keyboard.on('keydown-K', () => this.buffer.fire = 0.2); this.input.keyboard.on('keydown-X', () => this.buffer.fire = 0.2);
      this.input.keyboard.on('keydown-B', () => this.toggleBloom());
      this.input.keyboard.on('keydown-L', () => this.toggleLights());
      this.input.keyboard.on('keydown-M', () => this.timeScale = this.timeScale === 1 ? 0.25 : 1);
      this.bindTouch();
      this.timeScale = 1; this.hitstop = 0; this.trauma = 0; this.slowmo = 0; this.t = 0;
      this.bloom = null; if (q.get('bloom') !== '0') this.toggleBloom();
      cam.filters.external.addVignette(0.5, 0.5, 0.95, 0.35);
      this.hud = this.add.text(10, 8, '', { fontFamily: 'system-ui,sans-serif', fontSize: '13px', color: '#cfe0ff' }).setScrollFactor(0).setDepth(9999);
      window.__spike = this;
      if (q.get('clean')) { this.hud.setVisible(false); const h = document.getElementById('help'); if (h) h.style.display = 'none'; }
      if (q.get('demo')) this.demo = { t: 0, step: 0 };
    }
    toggleBloom() {
      const cam = this.cameras.main;
      if (this.bloom) { cam.filters.internal.remove(this.bloom); this.bloom = null; return; }
      const pf = this.bloom = cam.filters.internal.addParallelFilters();
      pf.top.addThreshold(0.62, 1); pf.top.addBlur(1, 2, 2, 1.2);
      pf.blend.blendMode = Phaser.BlendModes.ADD; pf.blend.amount = 0.55;
    }
    toggleLights() {
      this.lightsOn = !this.lightsOn;
      this.lights.setAmbientColor(this.lightsOn ? 0x353f60 : 0xffffff);
      [this.moon, ...this.fires].forEach(l => l.setVisible ? l.setVisible(this.lightsOn) : (l.visible = this.lightsOn));
    }
    bindTouch() {
      if (!('ontouchstart' in window)) return;
      document.body.classList.add('touch');
      const map = { tL: 'L', tR: 'R', tU: 'U' };
      for (const [id, k] of Object.entries(map)) { const el = document.getElementById(id); el.addEventListener('touchstart', e => { e.preventDefault(); this.touch[k] = 1; }); el.addEventListener('touchend', e => { e.preventDefault(); this.touch[k] = 0; }); }
      document.getElementById('tA').addEventListener('touchstart', e => { e.preventDefault(); this.buffer.atk = 0.2; });
      document.getElementById('tF').addEventListener('touchstart', e => { e.preventDefault(); this.buffer.fire = 0.2; });
    }
    makeFighter(key, x, y, meta, sc) {
      const shadow = this.add.image(x, y, 'shadow').setScale(sc * (key === 'trolloc' ? 7 : 5.5), sc * 1.4);
      const s = this.add.sprite(x, y, key, meta.anims[0].frames[0]).setLighting(true).setScale(sc);
      s.setOrigin(0.5, meta.baseline / meta.canvas[1]);
      return { key, s, shadow, x, y, vx: 0, state: '', st: 0, sc, hits: 0, cool: 1.2 };
    }
    setState(f, st, anim) {
      f.state = st; f.st = 0; f.hitDone = false;
      const a = anim || ({ riley: { idle: 'riley_idle', walk: 'riley_walk', hurt: 'riley_hurt', down: 'riley_knockdown' }, trolloc: { idle: 'trolloc_walk', walk: 'trolloc_walk', attack: 'trolloc_attack', hurt: 'trolloc_hurt', down: 'trolloc_knockdown' } }[f.key][st]);
      if (a && this.anims.exists(a)) f.s.play(a);
    }
    impact(kind, x, y, dir) {
      this.hitstop = HS[kind] / 60;
      this.trauma = Math.min(1, this.trauma + ({ light: 0.22, medium: 0.35, heavy: 0.6, finisher: 0.85 }[kind]));
      const n = { light: 10, medium: 16, heavy: 28, finisher: 40 }[kind];
      this.sparks.setConfig && 0;
      this.sparks.emitParticleAt(x, y, n);
      this.dots.emitParticleAt(x, y, Math.round(n / 2));
      this.flash.setPosition(x, y).setVisible(true).setScale(kind === 'light' ? 0.8 : kind === 'medium' ? 1.1 : 1.6).setAlpha(0.85);
      this.flashT = 0.09 + HS[kind] / 60;
      if (kind === 'finisher' || kind === 'heavy') this.slowmo = kind === 'finisher' ? 0.28 : 0.12;
      if (!this.hitLight) this.hitLight = this.lights.addLight(x, y, 260, 0xffe0a0, 0, 60);
      this.hitLight.x = x; this.hitLight.y = y; this.hitLight.intensity = kind === 'light' ? 1.3 : kind === 'medium' ? 1.7 : 2.1; this.hitLight.radius = kind === 'light' ? 200 : 340;
    }
    // ---- Riley ----
    updateRiley(dt) {
      const R = this.R, K = this.K, T = this.touch;
      R.st += dt;
      const lx = (K.LEFT.isDown || K.A.isDown || T.L) ? -1 : (K.RIGHT.isDown || K.D.isDown || T.R) ? 1 : 0;
      const ly = (K.UP.isDown || K.W.isDown || T.U) ? -1 : (K.DOWN.isDown || K.S.isDown || T.D) ? 1 : 0;
      const free = R.state === 'idle' || R.state === 'walk';
      if (this.demo) this.runDemo(dt);
      if (free && this.buffer.fire > 0 && !this.fireballs.length) { this.buffer.fire = 0; this.castFire(); return; }
      if (free && this.buffer.atk > 0) { this.buffer.atk = 0; this.startCombo(1); return; }
      if (R.state.startsWith('combo')) return this.updateCombo(dt);
      if (R.state === 'cast') { R.x -= 30 * dt; if (R.st > 0.42) this.setState(R, 'idle'); return; }
      if (R.state === 'hurt') { if (!R.s.anims.isPlaying) this.setState(R, 'idle'); return; }
      if (R.state === 'down') { R.x -= Math.max(0, 300 - R.st * 420) * dt; if (!R.s.anims.isPlaying) { this.setState(R, 'getup', 'riley_getup'); } return; }
      if (R.state === 'getup') { if (!R.s.anims.isPlaying) this.setState(R, 'idle'); return; }
      if (lx || ly) {
        R.x += lx * 205 * dt; R.y += ly * 120 * dt;
        if (R.state !== 'walk') this.setState(R, 'walk');
        R.s.anims.timeScale = lx < 0 ? 0.85 : 1;
      } else if (R.state !== 'idle') this.setState(R, 'idle');
    }
    startCombo(n) { const R = this.R; this.setState(R, 'combo' + n); R.s.play({ key: 'riley_combo' + n }); R.hitDone = false; R.next = false; }
    updateCombo(dt) {
      const R = this.R, n = +R.state.slice(5);
      if (this.buffer.atk > 0 && n < 3) { R.next = true; this.buffer.atk = 0; }
      const fr = R.s.anims.currentFrame ? R.s.anims.currentFrame.index - 1 : 0;   // index within combo-n anim
      const active = { 1: 1, 2: 1, 3: 2 }[n];
      R.x += ({ 1: 40, 2: 70, 3: 60 }[n]) * dt * (fr <= active ? 1 : 0.2);
      if (!R.hitDone && fr === active) { R.hitDone = true; this.tryHit(n); }
      const cancelAt = { 1: 1, 2: 1 }[n];
      if (R.next && fr > cancelAt && R.hitDone) return this.startCombo(n + 1);
      if (!R.s.anims.isPlaying) this.setState(R, 'idle');
    }
    tryHit(n) {
      const R = this.R, T = this.T; const dx = T.x - R.x, dy = Math.abs(T.y - R.y);
      const reach = { 1: 190, 2: 230, 3: 260 }[n];
      if (dx > 40 && dx < reach && dy < 34 && T.state !== 'down') {
        const hx = R.x + Math.min(dx - 40, reach - 70), hy = R.y - ({ 1: 190, 2: 140, 3: 200 }[n]);
        if (n < 3) { this.impact(n === 1 ? 'light' : 'medium', hx, hy, 1); this.hurt(T, n === 1 ? 70 : 110); }
        else { this.impact('finisher', hx, hy, 1); this.knockdown(T, 520); }
      }
    }
    castFire() {
      const R = this.R; this.setState(R, 'cast', 'riley_combo1');
      const x = R.x + 120, y = R.y - 170;
      const core = this.add.image(x, y, 'core').setBlendMode('ADD').setScale(0.9).setDepth(4003);
      const glow = this.add.image(x, y, 'glow').setBlendMode('ADD').setScale(1.4).setAlpha(0.8).setDepth(4003);
      const light = this.lights.addLight(x, y, 420, 0xff9a40, 3.2, 70);
      const trail = this.add.particles(0, 0, 'ember', { follow: core, lifespan: 500, speed: { min: 10, max: 70 }, scale: { start: 1.4, end: 0 }, frequency: 12, blendMode: 'ADD' }).setDepth(4002);
      this.fireballs.push({ x, y, core, glow, light, trail, t: 0 });
    }
    updateFire(dt) {
      for (const f of this.fireballs.slice()) {
        f.t += dt; f.x += 640 * dt; const wob = Math.sin(f.t * 40) * 0.08;
        f.core.setPosition(f.x, f.y).setScale(0.9 + wob); f.glow.setPosition(f.x, f.y).setScale(1.4 + wob * 2);
        f.light.x = f.x; f.light.y = f.y; f.light.intensity = 3 + Math.sin(f.t * 33) * 0.4;
        const T = this.T, hit = T.state !== 'down' && Math.abs(f.x - T.x) < 60 && Math.abs((f.y + 170) - T.y) < 50;
        if (hit || f.x > this.cameras.main.scrollX + VW + 200) {
          if (hit) { this.impact('heavy', f.x, f.y, 1); this.embers.emitParticleAt(f.x, f.y, 40); this.knockdown(T, 420); this.boom = { light: f.light, t: 0 }; }
          else f.light.intensity = 0, this.lights.removeLight(f.light);
          f.core.destroy(); f.glow.destroy(); f.trail.stop(); this.time.delayedCall(600, () => f.trail.destroy());
          this.fireballs.splice(this.fireballs.indexOf(f), 1);
        }
      }
      if (this.boom) { const b = this.boom; b.t += dt; b.light.radius = 420 + b.t * 900; b.light.intensity = Math.max(0, 2.4 * (1 - b.t / 0.45)); if (b.t > 0.45) { this.lights.removeLight(b.light); this.boom = null; } }
    }
    // ---- Trolloc ----
    hurt(f, push) { f.hp--; f.kb = push; this.setState(f, 'hurt'); }
    knockdown(f, push) { f.kb = push; this.setState(f, 'down'); this.dustLater = { f, t: 0.38 }; }
    updateTrolloc(dt) {
      const T = this.T, R = this.R; T.st += dt; T.cool -= dt;
      if (T.kb) { T.x += T.kb * dt; T.kb *= Math.pow(0.02, dt); if (Math.abs(T.kb) < 8) T.kb = 0; }
      if (T.state === 'hurt') { if (!T.s.anims.isPlaying) this.setState(T, 'walk'); return; }
      if (T.state === 'down') {
        if (T.st > 2.6) { T.hp = 5; this.setState(T, 'walk'); }
        return;
      }
      const dx = T.x - R.x, dy = R.y - T.y;
      if (T.state === 'attack') {
        const fr = T.s.anims.currentFrame ? T.s.anims.currentFrame.index - 1 : 0;
        if (fr === 3 && !T.hitDone) { T.hitDone = true; if (dx > 30 && dx < 250 && Math.abs(dy) < 36 && !R.state.startsWith('combo3') && R.state !== 'down') { this.impact('heavy', R.x + 40, R.y - 170, -1); R.hurtCount = (R.hurtCount || 0) + 1; if (R.hurtCount % 3 === 0) { this.setState(R, 'down'); this.dustLater = { f: R, t: 0.3 }; } else this.setState(R, 'hurt'); } }
        if (!T.s.anims.isPlaying) { T.cool = 1.6 + Math.random(); this.setState(T, 'walk'); }
        return;
      }
      if (dx < 210 && Math.abs(dy) < 30 && T.cool <= 0) { this.setState(T, 'attack'); return; }
      const want = dx > 200 ? -1 : dx < 150 ? 0.4 : 0;
      T.x += want * 125 * dt; T.y += Math.sign(dy) * Math.min(Math.abs(dy), 60 * dt);
      T.s.anims.timeScale = want ? 0.9 : 0.35;
    }
    clampF(f) { f.y = Phaser.Math.Clamp(f.y, LANE_TOP, LANE_BOT); f.x = Phaser.Math.Clamp(f.x, 120, WORLD_W - 140); }
    runDemo(dt) {
      const d = this.demo; d.t += dt;
      const seq = [[0.05, 'R+'], [1.1, 'R-'], [1.3, 'atk'], [1.5, 'atk'], [1.75, 'atk'], [3.0, 'R+'], [3.5, 'R-'], [4.7, 'fire'],
        [7.3, 'R+'], [7.7, 'R-'], [7.9, 'atk'], [8.1, 'atk'], [8.35, 'atk'], [10.0, 'hurt2'], [10.1, 'R+'], [10.6, 'R-'], [15.5, 'end']];
      while (d.step < seq.length && d.t >= seq[d.step][0]) {
        const ev = seq[d.step++][1];
        if (ev === 'R+') this.touch.R = 1; if (ev === 'R-') this.touch.R = 0;
        if (ev === 'atk') this.buffer.atk = 0.25; if (ev === 'fire') this.buffer.fire = 0.25;
        if (ev === 'hurt2') { this.R.hurtCount = 2; this.T.cool = 0; }
        if (ev === 'end') { d.done = true; if (q.get('demo') === 'loop') { d.t = 0; d.step = 0; } }
      }
    }
    update(time, deltaMs) {
      perf.frames.push(deltaMs);
      if (perf.frames.length > 20000) perf.frames.shift();
      let dt = Math.min(deltaMs, 50) / 1000;
      this.t += dt;
      // flicker fires
      for (const L of this.fires) L.intensity = this.lightsOn ? L.baseI * (0.82 + 0.18 * Math.sin(this.t * 9 + L.seed) * Math.sin(this.t * 23 + L.seed * 3)) : 0;
      if (this.hitLight) this.hitLight.intensity = Math.max(0, this.hitLight.intensity - dt * 18);
      if (this.flashT > 0) { this.flashT -= dt; this.flash.setAlpha(Math.max(0, this.flashT * 8)); if (this.flashT <= 0) this.flash.setVisible(false); }
      // camera shake (trauma^2, decays regardless of hit-stop)
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
      const sh = this.trauma * this.trauma, cam = this.cameras.main;
      const targetX = Phaser.Math.Clamp((this.R.x + this.T.x) / 2 - VW / 2 + 60, 0, WORLD_W - VW);
      this.camX = this.camX === undefined ? targetX : this.camX + (targetX - this.camX) * Math.min(1, dt * 4);
      cam.setScroll(this.camX + (Math.random() * 2 - 1) * 18 * sh, (Math.random() * 2 - 1) * 12 * sh);
      for (const k in this.buffer) this.buffer[k] = Math.max(0, this.buffer[k] - dt);
      // hit-stop: freeze fighters (anims + logic); particles and lights keep living
      if (this.hitstop > 0) {
        this.hitstop -= dt;
        for (const f of [this.R, this.T]) f.s.anims.pause();
        const j = (Math.random() * 2 - 1) * 3; this.T.s.x = this.T.x + j;   // victim shudder
        if (this.hitstop <= 0) for (const f of [this.R, this.T]) f.s.anims.resume();
        return this.sync(false);
      }
      if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.3; this.anims.globalTimeScale = 0.3; } else this.anims.globalTimeScale = this.timeScale;
      dt *= this.timeScale;
      if (this.dustLater) { this.dustLater.t -= dt; if (this.dustLater.t <= 0) { const f = this.dustLater.f; this.dust.emitParticleAt(f.x - 60, f.y, 14); this.trauma = Math.min(1, this.trauma + 0.3); this.dustLater = null; } }
      this.updateRiley(dt); this.updateTrolloc(dt); this.updateFire(dt);
      this.clampF(this.R); this.clampF(this.T);
      if (this.T.x - this.R.x < 70 && this.T.state !== 'down') this.R.x = this.T.x - 70;
      this.sync(true);
    }
    sync() {
      if (this.heroLight) { this.heroLight.x = this.R.x - 90; this.heroLight.y = this.R.y - 300; this.heroLight.intensity = this.lightsOn ? 1.0 : 0; }
      for (const f of [this.R, this.T]) {
        if (!this.hitstop || this.hitstop <= 0 || f === this.R) f.s.x = f.x;
        f.s.y = f.y; f.s.setDepth(1000 + f.y); f.shadow.setPosition(f.x, f.y + 2).setDepth(999 + f.y);
      }
      const ft = perf.frames.slice(-60), avg = ft.reduce((a, b) => a + b, 0) / Math.max(1, ft.length);
      if ((this.hudT = (this.hudT || 0) + 1) % 15 === 0) {
        const w = perf.frames.slice(-1800).slice().sort((a, b) => a - b), p95 = w[Math.floor(w.length * 0.95)] || 0, over = w.filter(v => v > 33.4).length;
        perf.summary = { fps: +(1000 / avg).toFixed(1), p95: +p95.toFixed(1), over33: over, window: w.length };
        this.hud.setText(`${(1000 / avg).toFixed(0)} fps   p95 ${p95.toFixed(1)} ms   >33ms: ${over} of last ${w.length} frames   RS ${RS}   bloom ${this.bloom ? 'on' : 'off'} (B)   lights ${this.lightsOn ? 'on' : 'off'} (L)${this.timeScale < 1 ? '   SLOW-MO' : ''}`);
      }
    }
  }
  window.__game = new Phaser.Game({
    type: Phaser.WEBGL, parent: 'game', backgroundColor: '#05070d',
    width: VW * RS, height: VH * RS,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, maxLights: 12, powerPreference: 'high-performance', preserveDrawingBuffer: !!q.get('capture') },
    fps: { target: 60 }, scene: [Spike]
  });
})();
