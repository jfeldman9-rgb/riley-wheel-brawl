(function () {
  'use strict';

  const L = window.WaygateLogic;
  const W = 960, H = 540;
  const {
    FLOOR, WORLD, BRIDGE_START, BRIDGE_END, BRIDGE_SPAWN, BRIDGE_MID,
    P_SPEED, JUMP_V, WAVE_TUNING, ARENA_START, ARENA_LEFT, ARENA_RIGHT,
    BOSS_X, EXIT_X, PADS, CRUMBLE
  } = L;
  const WAVE_AT = [500, 1120, 1750];
  const WAVE_COUNTS = [3, 4, 5];
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = L.fmtTime;
  // Same speeds and saidin costs as src/riley.js and src/powers.js.
  // On the bridge, a running takeoff stays at P_SPEED: the gaps were built for that
  // arc, and the main game's 360 jump carry would fly past the landing pads.
  const WALK_SPEED = 205;
  const RUN_SPEED = 390;
  const JUMP_WALK = 210;
  const JUMP_RUN = 360;
  const SPECIAL_COST = 34;
  const BALEFIRE_COST = 100;
  const BALEFIRE_INVULN = 1.5;
  const HELP_TOUCH = 'Stick: move (push far to run)   KICK: attack   JUMP   FIRE: fireball   BALE: balefire   CALL: Loial';
  const HELP_KEYS = 'WASD/Arrows move · Shift or double-tap: run · J/Z attack · K/Space jump · L/Q fireball · F balefire (full saidin) · R call Loial';
  const HELP_PAUSE = 'P / Esc / Enter / Start or II to resume';
  const HELP_TITLE = 'PRESS ENTER OR ATTACK';
  const HELP_TITLE_TOUCH = 'TAP TO START';
  const HELP_OVER = 'PRESS ATTACK TO CONTINUE';
  const HELP_OVER_TOUCH = 'TAP KICK TO CONTINUE';
  const HELP_CLEAR = 'PRESS ATTACK TO PLAY AGAIN';
  const HELP_CLEAR_TOUCH = 'TAP KICK TO PLAY AGAIN';

  class WaygateScene extends Phaser.Scene {
    constructor() { super('waygate'); }

    preload() {
      // Character art is already decoded from inline data URLs, or it is missing.
      // This loader must not request an image: a blocked atlas 403s and WebGL
      // throws on the cross-origin texture, which leaves the loading screen up.
    }

    create() {
      this.placeholderKeys = new Set();
      try {
        this.installCharacterTextures();
        this.registerAtlas('riley', window.WAYGATE_ASSET_META.riley);
        this.registerAtlas('grunt', window.WAYGATE_ASSET_META.grunt);
        this.registerAnimations('riley', window.WAYGATE_ASSET_META.riley);
        this.registerAnimations('grunt', window.WAYGATE_ASSET_META.grunt);
      } catch (err) {
        console.error('Waygate textures failed', err);
        this.paintPlaceholder('rileyPage0', 'riley');
        this.paintPlaceholder('gruntPage0', 'grunt');
        try {
          this.registerAtlas('riley', window.WAYGATE_ASSET_META.riley);
          this.registerAtlas('grunt', window.WAYGATE_ASSET_META.grunt);
          this.registerAnimations('riley', window.WAYGATE_ASSET_META.riley);
          this.registerAnimations('grunt', window.WAYGATE_ASSET_META.grunt);
        } catch (err2) { console.error(err2); }
      }
      this.createGrayManTexture();
      this.drawWorld();
      this.createHudObjects();
      this.createPlayer();
      this.createInput();
      this.initRun();
      this.cameras.main.setBounds(0, 0, WORLD, H);
      this.cameras.main.startFollow(this.hero, true, 0.085, 0.06, -160, 0);
      this.cameras.main.setDeadzone(360, 0);
      this.cameras.main.setBackgroundColor('#080a12');
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
      window.addEventListener('blur', this.onBlur = () => { if (this.mode === 'play') this.pauseGame('Game paused — the tab lost focus.'); });
      document.addEventListener('visibilitychange', this.onVisibility = () => { if (document.hidden && this.mode === 'play') this.pauseGame('Game paused — the tab is hidden.'); });
      this.showPanel('title');
      const loading = $('#loading');
      if (loading) loading.style.display = 'none';
      $('#hud').hidden = false;
      this.refreshHud();
      window.__waygateReady = true;
    }

    installCharacterTextures() {
      const images = window.__WAYGATE_IMAGES || {};
      const meta = window.WAYGATE_ASSET_META || {};
      const jobs = [
        ['riley0', 'rileyPage0', 'riley'],
        ['riley1', 'rileyPage1', 'riley'],
        ['grunt0', 'gruntPage0', 'grunt']
      ];
      for (const [srcKey, texKey, who] of jobs) {
        const data = meta[who];
        const pages = new Set();
        if (data) for (const frame of Object.values(data.frames)) pages.add(frame.page);
        const pageIndex = Number(String(srcKey).replace(/\D/g, ''));
        if (!pages.has(pageIndex)) continue;
        const img = images[srcKey];
        const w = img && (img.naturalWidth || img.width);
        const h = img && (img.naturalHeight || img.height);
        if (img && w > 2 && h > 2 && w <= 4096 && h <= 4096) {
          try {
            if (!this.textures.exists(texKey)) this.textures.addImage(texKey, img);
            continue;
          } catch (err) { console.error(err); }
        }
        this.paintPlaceholder(texKey, who);
      }
      if (!this.textures.exists('rileyPage0')) this.paintPlaceholder('rileyPage0', 'riley');
      if (!this.textures.exists('gruntPage0')) this.paintPlaceholder('gruntPage0', 'grunt');
    }

    paintPlaceholder(key, who) {
      if (this.textures.exists(key)) return;
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 180, 240);
      if (who === 'grunt') {
        ctx.fillStyle = '#3a241c';
        ctx.beginPath(); ctx.ellipse(90, 148, 50, 72, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b4a32';
        ctx.beginPath(); ctx.ellipse(90, 74, 36, 32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e6d2b0';
        ctx.beginPath(); ctx.moveTo(58, 68); ctx.lineTo(36, 24); ctx.lineTo(78, 56); ctx.fill();
        ctx.beginPath(); ctx.moveTo(122, 68); ctx.lineTo(144, 24); ctx.lineTo(102, 56); ctx.fill();
        ctx.fillStyle = '#8d2a2a';
        ctx.fillRect(60, 168, 24, 50);
        ctx.fillRect(98, 168, 24, 50);
      } else {
        ctx.fillStyle = '#1c1f2a';
        ctx.fillRect(66, 86, 48, 92);
        ctx.fillStyle = '#c9b59a';
        ctx.beginPath(); ctx.ellipse(90, 60, 22, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2e3548';
        ctx.fillRect(44, 98, 24, 66);
        ctx.fillRect(112, 98, 24, 66);
        ctx.fillStyle = '#11141c';
        ctx.fillRect(70, 174, 16, 50);
        ctx.fillRect(94, 174, 16, 50);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(90, 228, 42, 8, 0, 0, Math.PI * 2); ctx.fill();
      this.textures.addCanvas(key, canvas);
      this.placeholderKeys.add(key);
    }

    onShutdown() {
      window.removeEventListener('blur', this.onBlur);
      document.removeEventListener('visibilitychange', this.onVisibility);
      $('#overlay').removeEventListener('click', this.overlayAction);
      $('#overlay').removeEventListener('pointerup', this.overlayAction);
      $('#overlay').removeEventListener('touchend', this.overlayAction);
      $('#pause-toggle').removeEventListener('click', this.pauseClick);
      if (this.offTouch) this.offTouch();
    }

    registerAtlas(char, data) {
      const pageCount = char === 'riley' ? 2 : 1;
      for (let p = 0; p < pageCount; p++) {
        const key = `${char}Page${p}`;
        if (!this.textures.exists(key)) continue;
        const texture = this.textures.get(key);
        const src = texture.getSourceImage();
        const placeholder = this.placeholderKeys && this.placeholderKeys.has(key);
        for (const [name, f] of Object.entries(data.frames)) {
          if (f.page !== p || texture.has(name)) continue;
          const r = f.rect;
          const tooBig = !src || r.x + r.w > src.width + 0.5 || r.y + r.h > src.height + 0.5;
          if (placeholder || tooBig) {
            texture.add(name, 0, 0, 0, src.width, src.height);
          } else {
            const off = f.offset, sz = f.size;
            const frame = texture.add(name, 0, r.x, r.y, r.w, r.h);
            frame.setTrim(sz.w, sz.h, off.x, off.y, off.w, off.h);
          }
        }
      }
    }

    registerAnimations(char, data) {
      for (const a of data.anims) {
        if (this.anims.exists(a.name)) continue;
        const frames = [];
        for (let i = 0; i < a.frames.length; i++) {
          const name = a.frames[i];
          const meta = data.frames[name];
          if (!meta) continue;
          const key = `${char}Page${meta.page}`;
          if (!this.textures.exists(key) || !this.textures.get(key).has(name)) continue;
          frames.push({ key, frame: name, duration: a.holds[i] || 100 });
        }
        if (!frames.length) continue;
        this.anims.create({ key: a.name, frames, repeat: a.loop ? -1 : 0 });
      }
    }

    createGrayManTexture() {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      // Abstract, original silhouette: no borrowed art.
      g.fillStyle(0x090a10, 1); g.fillEllipse(98, 250, 92, 22);
      g.fillStyle(0x171923, 1);
      g.beginPath(); g.moveTo(71, 76); g.lineTo(125, 76); g.lineTo(143, 245); g.lineTo(128, 260); g.lineTo(70, 260); g.lineTo(55, 245); g.closePath(); g.fillPath();
      g.fillStyle(0x20222b, 1); g.fillTriangle(72, 87, 95, 38, 124, 87);
      g.fillStyle(0x5a5d65, 0.82); g.fillEllipse(98, 70, 35, 48);
      g.fillStyle(0x101116, 1); g.fillRect(78, 55, 40, 18);
      g.fillStyle(0xe8edf4, 0.95); g.fillRect(84, 71, 6, 2); g.fillRect(106, 71, 6, 2);
      g.fillStyle(0x22242d, 1); g.fillTriangle(66, 102, 38, 177, 74, 160); g.fillTriangle(130, 101, 156, 178, 121, 161);
      g.fillStyle(0x08090c, 1); g.fillRect(42, 150, 8, 45); g.fillRect(145, 151, 8, 47);
      g.lineStyle(3, 0xaeb6c4, 0.95); g.lineBetween(41, 194, 52, 170); g.lineBetween(144, 198, 155, 173);
      g.lineStyle(1, 0x626875, 0.8); g.lineBetween(97, 91, 83, 240); g.lineBetween(101, 94, 120, 243);
      g.generateTexture('grayman', 196, 270); g.destroy();
    }

    drawWorld() {
      const g = this.add.graphics().setDepth(0);
      // Shadow-veiled stone corridor, with long receding seams and broken sigils.
      g.fillStyle(0x0a0c14, 1); g.fillRect(0, 0, WORLD, H);
      g.fillStyle(0x111525, 1); g.fillRect(0, 276, WORLD, 144);
      g.fillStyle(0x202638, 0.9); g.fillRect(0, FLOOR, WORLD, 4);
      g.fillStyle(0x141a28, 1); g.fillRect(0, FLOOR + 4, WORLD, H - FLOOR - 4);
      g.lineStyle(1, 0x4a5366, 0.24);
      for (let x = 0; x <= WORLD; x += 120) { g.lineBetween(x, FLOOR + 8, x + 34, H); g.lineBetween(x, 418, x + 110, 418); }
      for (let x = 45; x < WORLD; x += 220) {
        g.lineStyle(2, 0x69708a, 0.22); g.strokeCircle(x, 385 + (x % 3) * 8, 11);
        g.lineStyle(1, 0x69708a, 0.25); g.lineBetween(x - 12, 385, x + 12, 385); g.lineBetween(x, 373, x, 397);
      }
      // Far wall pilasters and cold, drifting shadow pools.
      for (let x = 150; x < WORLD; x += 410) {
        g.fillStyle(0x131827, 0.75); g.fillRect(x, 100, 46, 322);
        g.fillStyle(0x283047, 0.42); g.fillRect(x + 5, 105, 4, 300);
        g.fillStyle(0x29344a, 0.13); g.fillEllipse(x + 180, 288, 310, 170);
      }
      // Floating, faint motes, deterministic for stable screenshots.
      for (let i = 0; i < 150; i++) {
        const x = (i * 173 + 71) % WORLD, y = 35 + ((i * 97) % 300), a = 0.12 + ((i * 7) % 8) / 30;
        g.fillStyle(i % 3 ? 0x829ab5 : 0x73c4bd, a); g.fillCircle(x, y, i % 9 === 0 ? 2 : 1);
      }
      g.setScrollFactor(1); g.setDepth(0);

      // Waygates in the distance: animated-feeling rings built entirely from shapes.
      for (const [x, tint] of [[-120, 0x44c4bd], [2140, 0x7798df], [EXIT_X - 16, 0x80ead9]]) this.drawWaygate(x, tint);
      this.bridgeGraphic = this.add.graphics().setDepth(4);
      this.drawBridge();

      // Static falling mist bands, set behind the fighters.
      this.mist = [];
      const mistCount = Math.max(7, Math.ceil(WORLD / 640));
      for (let i = 0; i < mistCount; i++) {
        const m = this.add.ellipse(280 + i * 640, 295 + (i % 2) * 35, 360, 100, 0x69758d, 0.055).setDepth(2);
        this.mist.push({ obj: m, home: m.x, seed: i * 1.7 });
      }
      // Exit gate is cold until the assassin is defeated.
      this.exitGlow = this.add.ellipse(EXIT_X, 320, 90, 154, 0x57ddd0, 0.08).setStrokeStyle(5, 0x62ded1, 0.35).setDepth(3);
      this.exitLabel = this.add.text(EXIT_X, 230, 'WAYGATE', { fontFamily: 'monospace', fontSize: '12px', color: '#a1e7dc', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(5);
      this.checkpointMark = this.add.text(BRIDGE_MID, FLOOR - 48, 'CHECKPOINT', { fontFamily: 'monospace', fontSize: '11px', color: '#9ee7dc', fontStyle: 'bold' }).setOrigin(0.5).setDepth(6).setAlpha(0.8);
      this.exitGlow.setAlpha(0.18); this.exitLabel.setAlpha(0.52);
    }

    drawWaygate(x, tint) {
      const g = this.add.graphics().setDepth(1);
      g.fillStyle(0x101623, 0.85); g.fillRect(x - 125, 200, 250, 220);
      g.fillStyle(0x242b39, 0.9); g.fillRect(x - 124, 192, 26, 232); g.fillRect(x + 98, 192, 26, 232);
      g.fillStyle(tint, 0.08); g.fillEllipse(x, 276, 174, 284);
      g.lineStyle(9, tint, 0.2); g.strokeEllipse(x, 277, 160, 262);
      g.lineStyle(4, tint, 0.46); g.strokeEllipse(x, 277, 140, 244);
      g.lineStyle(2, 0xb5fff6, 0.22); g.strokeEllipse(x, 277, 124, 226);
      for (let i = 0; i < 7; i++) { const py = 228 + i * 27; g.fillStyle(tint, 0.4 - i * 0.035); g.fillCircle(x + (i % 2 ? 46 : -46), py, 2); }
    }

    drawBridge() {
      const g = this.bridgeGraphic; g.clear();
      // A void trench beneath the shifting suspended path.
      g.fillStyle(0x02040a, 1); g.fillRect(BRIDGE_START, 425, BRIDGE_END - BRIDGE_START, H - 425);
      for (let x = BRIDGE_START; x < BRIDGE_END; x += 42) {
        g.lineStyle(1, 0x29414b, 0.24); g.lineBetween(x, 435, x - 12, 540);
      }
      for (const [a, b] of PADS) {
        g.fillStyle(0x25303a, 1); g.fillRect(a, FLOOR - 8, b - a, 18);
        g.fillStyle(0x66717b, 0.62); g.fillRect(a, FLOOR - 10, b - a, 3);
        g.lineStyle(1, 0x9aa8ad, 0.23);
        for (let x = a + 26; x < b; x += 44) g.lineBetween(x, FLOOR - 7, x - 11, FLOOR + 8);
      }
      g.fillStyle(0x7dfff0, 0.9); g.fillRect(BRIDGE_MID - 18, FLOOR - 12, 36, 4);
      for (let i = 0; i < CRUMBLE.length; i++) {
        const [a, b] = CRUMBLE[i];
        if (this.planks && this.planks[i].collapsed) continue;
        const broken = this.planks && this.planks[i].timer > 0;
        g.fillStyle(broken ? 0x58373c : 0x37414a, 1); g.fillRect(a, FLOOR - 11, b - a, 21);
        g.fillStyle(broken ? 0xff5661 : 0x849195, broken ? 0.92 : 0.5); g.fillRect(a + 3, FLOOR - 11, b - a - 6, 3);
        g.lineStyle(2, broken ? 0xff5561 : 0x11171f, broken ? 0.8 : 0.9);
        for (let x = a + 20; x < b - 8; x += 30) g.lineBetween(x, FLOOR - 8, x - 9, FLOOR + 7);
        if (broken) { g.lineStyle(2, 0xff5867, 0.9); g.lineBetween(a + 8, FLOOR - 7, b - 8, FLOOR + 7); }
      }
      // Visible gap lips. Lethal width is GAPS; the landing pad past each lip is the margin.
      for (const [a, b] of L.GAPS) { g.fillStyle(0x0e121b, 1); g.fillRect(a, FLOOR - 13, b - a, 15); g.fillStyle(0x47505a, 0.65); g.fillRect(a, FLOOR - 13, 7, 3); g.fillRect(b - 7, FLOOR - 13, 7, 3); }
      g.setDepth(4);
    }

    createHudObjects() {
      this.hudTimer = 0; this.lastToast = '';
      this.banner = this.add.text(W / 2, 95, '', { fontFamily: 'system-ui', fontSize: '16px', color: '#d9f8f4', fontStyle: '800', stroke: '#071019', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(2000).setAlpha(0);
      this.warningMark = this.add.ellipse(0, 0, 152, 66, 0xff314e, 0.18).setStrokeStyle(3, 0xff465d, 0.92).setDepth(1000).setVisible(false);
      this.warningCross = this.add.graphics().setDepth(1001).setVisible(false);
      this.warningText = this.add.text(0, 0, 'MOVE OR JUMP', { fontFamily: 'monospace', fontSize: '11px', color: '#ff9da8', fontStyle: 'bold', stroke: '#24030a', strokeThickness: 3 }).setOrigin(0.5).setDepth(1002).setVisible(false);
      this.hitFx = this.add.graphics().setDepth(900).setVisible(false);
      this.hitFxTimer = 0;
      this.exitGlowPulse = 0;
    }

    createPlayer() {
      this.heroShadow = this.add.ellipse(120, FLOOR - 53, 118, 24, 0x000000, 0.48).setDepth(800);
      this.hero = this.add.sprite(120, FLOOR - 56, 'rileyPage0', 'riley_idle_00').setOrigin(0.5, 610 / 640).setScale(0.56).setDepth(1000 + FLOOR);
      this.hero.play('riley_idle');
      this.heroData = { x: 120, y: FLOOR - 56, z: 0, vz: 0, jumpVx: 0, hp: 100, focus: 60, lives: 3, score: 0, kills: 0, trollocKills: 0, falls: 0, invuln: 0, facing: 1, action: 'idle', actionT: 0, combo: 0, comboExpire: 0, hitDone: false, attackBuffer: 0, specialBuffer: 0, onBridge: false, falling: 0, checkpoint: 120, bridgeCheckpoint: BRIDGE_SPAWN, time: 0, started: false };
    }

    createInput() {
      const Input = window.WaygateInput;
      if (!Input || !window.__waygateInput) throw new Error('Waygate input must be src/input.js');
      this.inp = window.__waygateInput;
      this.inp.clear();
      this.fireballs = [];
      this.beam = null;
      const call = document.getElementById('tbL');
      if (call) call.classList.add('off');
      this.overlayAction = (e) => {
        const action = e.target.closest?.('[data-action]')?.dataset.action;
        if (!action) return;
        if (e.cancelable && e.type !== 'click') e.preventDefault();
        if (action === 'start') this.begin();
        else if (action === 'resume') this.resumeGame();
        else if (action === 'restart') this.scene.restart();
      };
      this.pauseClick = () => {
        if (this.mode === 'play') this.pauseGame('Combat paused. Choose when you are ready.');
        else if (this.mode === 'paused') this.resumeGame();
      };
      const overlay = $('#overlay');
      overlay.addEventListener('click', this.overlayAction);
      overlay.addEventListener('pointerup', this.overlayAction);
      overlay.addEventListener('touchend', this.overlayAction, { passive: false });
      $('#pause-toggle').addEventListener('click', this.pauseClick);
      this.offTouch = this.inp.on('touch', () => { if (this.mode === 'title') this.showPanel('title'); });
    }

    initRun() {
      this.mode = 'title'; this.runElapsed = 0; this.waveIndex = -1; this.waveActive = false; this.enemies = []; this.waveSize = 0; this.attackTokenCount = 0; this.maxAttackTokens = 1; this.hitstop = 0; this.debugSkip = new URLSearchParams(window.location.search).get('skip') || ''; this.planks = L.createPlanks(); this.enemyBounds = { minX: 110, maxX: WORLD - 120, minY: L.LANE_MIN_Y, maxY: L.LANE_MAX_Y };
      this.bridgeGraphic?.destroy();
      this.bridgeGraphic = this.add.graphics().setDepth(4); this.drawBridge();
      this.boss = { active: false, defeated: false, hp: L.GRAY_MAN.hp, maxHp: L.GRAY_MAN.hp, x: BOSS_X, y: 346, phase: 'stalk', timer: 1.2, targetX: 0, targetY: 0, strikes: 0, flashTimer: 0, phaseTwo: false };
      if (this.bossSprite) { this.bossSprite.destroy(); this.bossShadow.destroy(); }
      this.bossShadow = this.add.ellipse(0, 0, 98, 24, 0x000000, 0.5).setDepth(900);
      this.bossSprite = this.add.image(this.boss.x, this.boss.y, 'grayman').setOrigin(0.5, 1).setDisplaySize(106, 240).setDepth(1100).setAlpha(0);
      this.heroData.x = 120; this.heroData.y = FLOOR - 56; this.heroData.z = 0; this.heroData.vz = 0; this.heroData.jumpVx = 0; this.heroData.hp = 100; this.heroData.focus = 60; this.heroData.lives = 3; this.heroData.score = 0; this.heroData.kills = 0; this.heroData.trollocKills = 0; this.heroData.falls = 0; this.heroData.invuln = 0; this.heroData.facing = 1; this.heroData.action = 'idle'; this.heroData.actionT = 0; this.heroData.combo = 0; this.heroData.comboExpire = 0; this.heroData.hitDone = false; this.heroData.onBridge = false; this.heroData.falling = 0; this.heroData.checkpoint = 120; this.heroData.bridgeCheckpoint = BRIDGE_SPAWN; this.heroData.time = 0; this.heroData.started = false; this.heroData.attackBuffer = 0; this.heroData.specialBuffer = 0;
      this.hero.setPosition(120, FLOOR - 56).setFlipX(false).setAlpha(1).setTint(0xffffff).play('riley_idle');
      this.cameraOffset = 0; this.toast('THE WAYS SHIFT AROUND YOU', 2.2); this.refreshHud();
    }

    begin() {
      if (this.mode !== 'title') return;
      this.mode = 'play'; this.heroData.started = true; this.startedAt = this.runElapsed; this.inp.flushPresses(); this.hidePanel();
      if (this.debugSkip === 'bridge') this.skipToBridge();
      else if (this.debugSkip === 'boss') this.skipToBoss();
      else this.toast('THREE WAVES. KEEP MOVING.', 2.6);
    }

    skipToBridge() {
      const p = this.heroData;
      this.waveIndex = 2; this.waveActive = false; this.maxAttackTokens = 2;
      p.x = BRIDGE_SPAWN; p.y = FLOOR - 12; p.checkpoint = BRIDGE_SPAWN; p.bridgeCheckpoint = BRIDGE_SPAWN; p.focus = 100; p.jumpVx = 0;
      this.hero.setPosition(p.x, p.y).play('riley_idle');
      this.toast('DEBUG · FALLING BRIDGE CHECKPOINT', 2); this.triggerBanner('DEBUG SKIP · FALLING BRIDGE', 1.8);
    }

    skipToBoss() {
      const p = this.heroData;
      this.waveIndex = 2; this.waveActive = false; this.maxAttackTokens = 2;
      p.x = ARENA_START + 40; p.y = 346; p.focus = 100; p.checkpoint = ARENA_START; p.jumpVx = 0;
      this.hero.setPosition(p.x, p.y).play('riley_idle');
      this.startBoss(); this.toast('DEBUG · GRAY MAN ARENA', 2); this.triggerBanner('DEBUG SKIP · GRAY MAN', 1.8);
    }

    showPanel(kind, extra = {}) {
      const overlay = $('#overlay'), box = $('#panel-content');
      overlay.hidden = false;
      const touch = !!(this.inp && this.inp.isTouch);
      const help = touch ? HELP_TOUCH : HELP_KEYS;
      if (kind === 'title') box.innerHTML = `<div class="eyebrow">RILEY WHEEL BRAWL · BONUS LEVEL</div><h1>WAYGATE<br>GAUNTLET</h1><p>Three Trolloc waves, a bridge that will not stay beneath your feet, and a Gray Man waiting in the dark.</p><p>${help}</p><p class="fine">Every enemy attack has a tell. The Gray Man's red flash marks the strike lane; move away or jump over it. Loial is not in the Ways, so CALL does nothing.</p><div class="panel-actions"><button class="action" type="button" data-action="start">ENTER THE WAYS</button></div><p class="fine">${touch ? HELP_TITLE_TOUCH : HELP_TITLE}</p>`;
      else if (kind === 'pause') box.innerHTML = `<div class="eyebrow">THE WAYS HOLD STILL</div><h2>PAUSED</h2><p>${extra.message || 'Take a breath. Your checkpoint and the enemy timers are safe.'}</p><div class="panel-actions"><button class="action" data-action="resume">RESUME</button><button class="action secondary" data-action="restart">RESTART BONUS</button></div><p class="fine">${HELP_PAUSE}</p>`;
      else if (kind === 'over') box.innerHTML = `<div class="eyebrow">THE SHADOWS CLOSE IN</div><h2>DEFEATED</h2><p>You are out of lives. The gauntlet is ready for another attempt.</p>${this.resultStats()}<p><b>Trollocs killed: ${this.heroData.trollocKills}</b></p><div class="panel-actions"><button class="action" data-action="restart">TRY AGAIN</button></div><p class="fine">${touch ? HELP_OVER_TOUCH : HELP_OVER}</p>`;
      else if (kind === 'clear') box.innerHTML = `<div class="eyebrow">THE WAYGATE OPENS</div><h2>GAUNTLET CLEARED</h2><p>Riley steps out of the Ways with the Gray Man left behind. Trollocs killed: ${this.heroData.trollocKills}.</p>${this.resultStats()}<p><b>Rank ${extra.rank || this.rank()}</b></p><div class="panel-actions"><button class="action" data-action="restart">RUN IT AGAIN</button></div><p class="fine">${touch ? HELP_CLEAR_TOUCH : HELP_CLEAR}</p>`;
    }

    resultStats() { return L.formatRunStats(this.heroData); }
    rank() { const h = this.heroData; return h.lives === 3 && h.falls === 0 && h.time < 135 ? 'A' : h.lives > 0 && h.falls < 3 ? 'B' : 'C'; }
    hidePanel() { $('#overlay').hidden = true; }
    pauseGame(message) { if (this.mode !== 'play') return; this.mode = 'paused'; this.inp.clear(); this.showPanel('pause', { message }); }
    resumeGame() { if (this.mode !== 'paused') return; this.mode = 'play'; this.hidePanel(); this.inp.clear(); }

    toast(text, duration = 1.8) { this.toastText = text; this.toastTime = duration; $('#toast').textContent = text; $('#toast').style.opacity = '1'; }
    triggerBanner(text, time = 2.1) { this.banner.setText(text).setAlpha(1); this.bannerTimer = time; }

    update(time, deltaMs) {
      const dt = Math.min(0.04, deltaMs / 1000);
      if (this.inp) this.inp.update(dt);
      if (this.handleMenu()) return;
      if (this.mode !== 'play') return;

      if (this.hitstop > 0) {
        this.hitstop = Math.max(0, this.hitstop - dt);
        this.updateEffects(dt); this.refreshHud();
        return;
      }
      this.runElapsed += dt; this.heroData.time = this.runElapsed;
      this.exitGlowPulse += dt;
      this.updateHero(dt);
      this.updateFireballs(dt);
      this.updateBalefireFx(dt);
      this.updateWorldProgress(dt);
      this.updateEnemies(dt);
      if (this.boss.active && !this.boss.defeated) this.updateBoss(dt);
      this.updateBridge(dt);
      this.updateMotes(dt);
      this.updateEffects(dt);
      this.syncActors();
      this.refreshHud();
    }

    handleMenu() {
      const inp = this.inp;
      if (!inp) return true;
      if (this.mode === 'title') {
        if (inp.take('start') || inp.take('attack')) this.begin();
        return true;
      }
      if (this.mode === 'over' || this.mode === 'clear') {
        if (inp.take('attack') || inp.take('start')) this.scene.restart();
        return true;
      }
      if (inp.take('pause') || inp.take('start')) {
        if (this.mode === 'play') this.pauseGame('Combat paused. Choose when you are ready.');
        else if (this.mode === 'paused') this.resumeGame();
        return true;
      }
      return this.mode !== 'play';
    }

    updateHero(dt) {
      const p = this.heroData;
      const inp = this.inp;
      const I = { x: inp.x || 0, y: inp.y || 0, run: !!inp.run };
      if (inp.take('assist')) this.callLoial();
      p.invuln = Math.max(0, p.invuln - dt);
      p.comboExpire = Math.max(0, p.comboExpire - dt);
      if (p.action === 'down') { p.deathTimer -= dt; if (p.deathTimer <= 0 && this.mode === 'play') this.respawnPlayer(); return; }
      if (p.falling > 0) {
        p.falling -= dt; p.z = Math.max(-110, p.z - 210 * dt); this.hero.setAlpha(Math.floor(this.runElapsed * 18) % 2 ? 0.25 : 0.75);
        if (p.falling <= 0) this.respawnBridge();
        return;
      }
      const inBridge = p.x >= BRIDGE_START && p.x <= BRIDGE_END;
      p.onBridge = inBridge;
      if (inBridge) p.y = FLOOR - 12;
      const lockX = this.boss.active && !this.boss.defeated ? [ARENA_LEFT, ARENA_RIGHT] : null;
      let mx = I.x, my = inBridge ? 0 : I.y;
      // Held movement must not flip Riley off a swing. Facing locks toward the threat in startHeroAttack.
      p.facing = L.facingAfterMove(p, mx);
      const running = !!(I.run && mx);
      const speed = inBridge ? (running ? P_SPEED : WALK_SPEED) : (running ? RUN_SPEED : WALK_SPEED);
      const free = p.action === 'idle' || p.action === 'walk' || p.action === 'air';
      if (inBridge && p.action !== 'hurt' && (p.z > 0 || p.action === 'air')) {
        p.x += (p.jumpVx || 0) * dt;
      } else if (free && !inBridge) {
        const n = Math.hypot(mx, my) || 1; mx /= n; my /= n;
        p.x += mx * speed * dt;
        p.y += my * 125 * dt;
        p.y = clamp(p.y, 314, FLOOR - 5);
        if (mx) p.facing = L.facingAfterMove(p, mx);
      } else if (free && inBridge) {
        p.x += mx * speed * dt;
      } else if (p.action === 'hurt') {
        p.x += (p.knock || 0) * dt; p.knock *= Math.pow(0.02, dt);
      } else if (p.action === 'attack' && p.actionT < 0.16) {
        p.x += p.facing * 34 * dt;
      }
      if (lockX) p.x = clamp(p.x, lockX[0], lockX[1]);
      if (this.waveActive) p.x = Math.min(p.x, WAVE_AT[this.waveIndex] + 405);
      p.x = clamp(p.x, 38, WORLD - 85);

      const grounded = p.z <= 0 && (p.action === 'idle' || p.action === 'walk');
      if (grounded && inp.take('power')) {
        if (p.focus >= BALEFIRE_COST && this.canBalefire()) this.startBalefire();
      } else if (grounded && inp.take('special')) {
        if (p.focus >= SPECIAL_COST) this.startSpecial();
      }
      const wantJump = inp.take('jump');
      if (wantJump && p.z <= 0 && (p.action === 'idle' || p.action === 'walk')) {
        const jumpRun = !!(I.run && mx);
        p.jumpVx = mx * (inBridge ? (jumpRun ? P_SPEED : JUMP_WALK) : (jumpRun ? JUMP_RUN : JUMP_WALK));
        p.vz = JUMP_V; p.action = 'air'; p.actionT = 0; p.jumpAttack = false; this.hero.play('riley_jump_rise', true);
      }
      const phase = L.stepVertical(p, dt);
      if (phase === 'landed') {
        if (p.action === 'air') { p.action = 'idle'; this.hero.play('riley_idle'); }
      } else if (phase === 'air' && p.z < 52 && p.vz < 80 && this.hero.anims.currentAnim?.key !== 'riley_jump_fall') this.hero.play('riley_jump_fall', true);
      const attackWin = p.action === 'attack' ? 0.3 : 0.18;
      if (inp.take('attack', attackWin)) p.attackBuffer = Math.max(p.attackBuffer, p.action === 'attack' ? 0.34 : 0.18);
      if (p.attackBuffer > 0) p.attackBuffer = Math.max(0, p.attackBuffer - dt);
      if (p.attackBuffer > 0 && !['attack', 'hurt', 'special', 'balefire'].includes(p.action)) {
        p.attackBuffer = 0;
        this.startHeroAttack(false);
      }
      if (p.action === 'attack') {
        p.actionT += dt;
        const hitAt = p.combo === 3 ? 0.18 : 0.14;
        if (!p.hitDone && p.actionT >= hitAt) { p.hitDone = true; this.heroAttackHit(); }
        if (p.combo < 3 && p.attackBuffer > 0 && p.actionT >= 0.24) {
          p.attackBuffer = 0; this.startHeroAttack(true);
          if (inBridge && p.z <= 0 && this.isPit(p.x)) this.startBridgeFall();
          return;
        }
        const endAt = p.combo === 3 ? 0.56 : 0.44;
        if (p.actionT >= endAt) { const wasFinisher = p.combo === 3; p.action = p.z > 0 ? 'air' : (mx || my ? 'walk' : 'idle'); if (wasFinisher || p.attackBuffer <= 0) p.combo = 0; this.hero.play(p.action === 'walk' ? 'riley_walk' : p.action === 'air' ? 'riley_jump_fall' : 'riley_idle'); }
      } else if (p.action === 'special') {
        p.actionT += dt;
        if (!p.hitDone && p.actionT > 0.2) { p.hitDone = true; this.spawnFireball(); }
        if (p.actionT > 0.58) { p.action = p.z > 0 ? 'air' : 'idle'; this.hero.play(p.action === 'air' ? 'riley_jump_fall' : 'riley_idle'); }
      } else if (p.action === 'balefire') {
        p.actionT += dt;
        if (!p.hitDone && p.actionT >= 0.2) { p.hitDone = true; this.fireBalefire(); }
        if (p.actionT > 0.7) { p.action = 'idle'; this.endBalefire(); this.hero.play('riley_idle'); }
      } else if (p.action === 'hurt') {
        p.actionT += dt;
        if (p.actionT > 0.36) { p.action = p.z > 0 ? 'air' : 'idle'; this.hero.play(p.action === 'air' ? 'riley_jump_fall' : 'riley_idle'); }
      }
      if (p.action === 'idle' || p.action === 'walk') {
        const moving = !!(mx || my);
        const wanted = moving ? 'riley_walk' : 'riley_idle';
        if (this.hero.anims.currentAnim?.key !== wanted) this.hero.play(wanted);
      }
      if (inBridge && p.z <= 0 && this.isPit(p.x)) this.startBridgeFall();
      if (p.invuln > 0) this.hero.setAlpha(Math.floor(this.runElapsed * 16) % 2 ? 0.42 : 1); else if (p.falling <= 0) this.hero.setAlpha(1);
      if (p.action === 'hurt' && p.hp <= 0) this.playerDeath();
    }

    faceNearestThreat() {
      const p = this.heroData;
      p.facing = L.facingTowardThreat(p, this.enemies, this.boss && this.boss.active ? this.boss : null);
    }

    startHeroAttack(chain) {
      const p = this.heroData;
      this.faceNearestThreat();
      if (p.z > 24) { p.combo = 0; p.action = 'attack'; p.actionT = 0; p.hitDone = false; p.attackDamage = 38; this.hero.play('riley_airkick', true); return; }
      if (!chain) p.combo = 0;
      p.combo = Math.min(3, p.combo + 1); p.comboExpire = 0.58; p.action = 'attack'; p.actionT = 0; p.hitDone = false;
      p.attackDamage = [0, 25, 32, 54][p.combo]; this.hero.play(`riley_combo${p.combo}`, true);
    }

    heroAttackHit() {
      const p = this.heroData;
      const strike = L.targetsHitByAttack(p, this.enemies, this.boss && this.boss.active ? this.boss : null);
      p.facing = strike.facing;
      const heavy = p.combo === 3 || p.z > 24;
      this.showSlash(p.x + p.facing * 80, p.y - p.z - 115, 0x9ff8ee, heavy);
      if (this.boss.active && !this.boss.defeated && this.boss.phase === 'recover' && Math.abs(this.boss.x - p.x) < 190 && Math.abs(this.boss.y - p.y) < 112) { this.hitBoss(p.attackDamage, heavy); return; }
      const limit = heavy ? 2 : 1;
      for (const e of strike.hits.slice(0, limit)) this.hitEnemy(e, p.attackDamage, { heavy, launcher: p.combo === 3, combo: p.combo });
    }

    startSpecial() {
      const p = this.heroData;
      p.focus -= SPECIAL_COST;
      p.action = 'special'; p.actionT = 0; p.hitDone = false;
      this.hero.play('riley_cast', true);
    }

    spawnFireball() {
      const p = this.heroData;
      const x = p.x + p.facing * 70;
      const y = p.y - p.z - 120;
      const orb = this.add.ellipse(x, y, 28, 28, 0xff9a40, 0.95).setDepth(4003);
      const glow = this.add.ellipse(x, y, 52, 52, 0xff9a40, 0.35).setDepth(4002);
      this.fireballs.push({ x, y, gy: p.y, dir: p.facing, orb, glow, dmg: 14, t: 0 });
    }

    updateFireballs(dt) {
      const cam = this.cameras.main.scrollX;
      for (const f of this.fireballs.slice()) {
        f.t += dt;
        f.x += f.dir * 680 * dt;
        f.orb.setPosition(f.x, f.y);
        f.glow.setPosition(f.x, f.y);
        let hit = null;
        for (const e of this.enemies) {
          if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x - f.x) < 60 && Math.abs(e.y - f.gy) < 42) { hit = e; break; }
        }
        const boss = this.boss && this.boss.active && !this.boss.defeated && this.boss.phase === 'recover'
          && Math.abs(this.boss.x - f.x) < 70 && Math.abs(this.boss.y - f.gy) < 80;
        const off = f.x < cam - 200 || f.x > cam + W + 200 || f.t > 1.6;
        if (hit || boss || off) {
          if (hit) this.hitEnemy(hit, f.dmg, { heavy: true, launcher: true, combo: 0 });
          if (boss) this.hitBoss(f.dmg, true);
          f.orb.destroy(); f.glow.destroy();
          this.fireballs.splice(this.fireballs.indexOf(f), 1);
        }
      }
    }

    // Loial is not in this level. Same as a stage with no Loial meta: refuse, spend nothing, don't throw.
    callLoial() {
      if (this.mode !== 'play') return false;
      return false;
    }

    hasHittableFoe() {
      const cam = this.cameras.main ? this.cameras.main.scrollX : 0;
      if (this.enemies.some(e => e.hp > 0 && e.state !== 'dead' && e.x > cam - 60 && e.x < cam + W + 60)) return true;
      return !!(this.boss && this.boss.active && !this.boss.defeated);
    }

    canBalefire() {
      return this.mode === 'play' && !this.beam && this.hasHittableFoe();
    }

    startBalefire() {
      const p = this.heroData;
      p.focus -= BALEFIRE_COST;
      p.invuln = Math.max(p.invuln, BALEFIRE_INVULN);
      p.action = 'balefire'; p.actionT = 0; p.hitDone = false; p.jumpVx = 0;
      this.hero.play('riley_cast', true);
      this.toast('BALEFIRE', 0.8);
    }

    fireBalefire() {
      const p = this.heroData;
      const dir = p.facing || 1;
      const cam = this.cameras.main.scrollX;
      const x0 = p.x + dir * 40;
      const edge = dir > 0 ? cam + W + 80 : cam - 80;
      const len = Math.max(60, Math.abs(edge - x0));
      const g = this.add.graphics().setDepth(1600);
      this.beam = { t: 0, fade: 0, dir, x0, y: p.y - p.z - 110, len, g, struck: new Set(), bossHit: false };
      this.balefireSweep();
    }

    balefireSweep() {
      const B = this.beam, p = this.heroData;
      if (!B || B.fade) return;
      for (const e of this.enemies) {
        if (B.struck.has(e) || e.hp <= 0 || e.state === 'dead') continue;
        const ahead = (e.x - p.x) * B.dir;
        if (ahead < -30 || ahead > B.len + 120) continue;
        B.struck.add(e);
        this.hitEnemy(e, e.maxHp + 10, { heavy: true, launcher: true, combo: 0, noMeter: true });
      }
      if (!B.bossHit && this.boss && this.boss.active && !this.boss.defeated && this.boss.phase === 'recover') {
        const ahead = (this.boss.x - p.x) * B.dir;
        if (ahead >= -30 && ahead <= B.len + 120) {
          B.bossHit = true;
          this.hitBoss(80, true, true);
        }
      }
    }

    endBalefire() {
      if (this.beam && !this.beam.fade) this.beam.fade = 0.0001;
    }

    updateBalefireFx(dt) {
      const B = this.beam;
      if (!B) return;
      B.t += dt;
      if (!B.fade && B.t > 0.6) B.fade = 0.0001;
      if (!B.fade) this.balefireSweep();
      else B.fade += dt;
      const k = B.fade ? Math.max(0, 1 - B.fade / 0.25) : Math.min(1, B.t / 0.06);
      const x = B.dir > 0 ? B.x0 : B.x0 - B.len;
      B.g.clear();
      B.g.fillStyle(0x7cc4ff, 0.35 * k);
      B.g.fillRect(x, B.y - 28, B.len, 56);
      B.g.fillStyle(0xffffff, 0.9 * k);
      B.g.fillRect(x, B.y - 6, B.len, 12);
      if (B.fade && k <= 0) { B.g.destroy(); this.beam = null; }
    }

    clearPowers() {
      if (this.fireballs) {
        for (const f of this.fireballs) { f.orb.destroy(); f.glow.destroy(); }
        this.fireballs.length = 0;
      } else this.fireballs = [];
      if (this.beam) { this.beam.g.destroy(); this.beam = null; }
    }

    showSlash(x, y, color, heavy = false) {
      this.hitFx.clear();
      this.hitFx.lineStyle(12, color, 0.9); this.hitFx.beginPath(); this.hitFx.arc(x, y, 47, -1.05, 1.05, false); this.hitFx.strokePath();
      this.hitFx.lineStyle(3, 0xffffff, 0.75); this.hitFx.beginPath(); this.hitFx.arc(x + 3, y, 57, -0.82, 0.82, false); this.hitFx.strokePath();
      this.hitFx.fillStyle(0xffffff, 0.95); this.hitFx.fillCircle(x, y, heavy ? 8 : 4);
      const rays = heavy ? 8 : 6;
      const len = heavy ? 30 : 16;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + 0.2;
        this.hitFx.lineStyle(heavy ? 3 : 2, 0xfff1c4, 0.92);
        this.hitFx.lineBetween(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
      this.hitFx.setVisible(true); this.hitFxTimer = heavy ? 0.14 : 0.11;
    }

    impactFeedback(heavy) {
      this.hitstop = Math.max(this.hitstop, heavy ? 0.078 : 0.064);
      if (heavy) this.cameras.main.shake(95, 0.0075);
    }

    hitEnemy(e, amount, options = {}) {
      if (!e || e.hp <= 0 || e.state === 'dead') return;
      this.releaseAttackToken(e);
      const result = L.applyHeroHit(e, this.heroData, amount, options);
      if (!result) return;
      e.flashTimer = 0.12; e.barTimer = 1.4;
      e.alert.setVisible(false); e.tell.setVisible(false);
      e.sprite.play(result.launcher || result.lethal ? 'grunt_knockdown' : 'grunt_hurt', true);
      e.sprite.setTint(0xffffff);
      this.impactFeedback(!!result.heavy);
    }

    updateWorldProgress() {
      const p = this.heroData;
      if (!this.waveActive && this.waveIndex < 2 && p.x >= WAVE_AT[this.waveIndex + 1]) this.startWave(this.waveIndex + 1);
      if (this.waveActive && this.enemies.every(e => e.hp <= 0)) this.completeWave();
      if (!this.boss.active && !this.boss.defeated && p.x > ARENA_START) this.startBoss();
      if (this.boss.defeated) {
        this.exitGlow.setAlpha(0.24 + 0.18 * (0.5 + 0.5 * Math.sin(this.exitGlowPulse * 3)));
        this.exitLabel.setAlpha(0.65 + 0.3 * Math.sin(this.exitGlowPulse * 3));
        if (p.x > EXIT_X + 24) this.completeRun();
      }
    }

    startWave(index) {
      this.waveIndex = index; this.waveActive = true;
      const p = this.heroData; p.checkpoint = Math.max(100, WAVE_AT[index] - 110);
      const count = WAVE_COUNTS[index], tune = WAVE_TUNING[index];
      this.waveSize = count;
      this.maxAttackTokens = L.tokenCap(index); this.attackTokenCount = 0;
      for (let i = 0; i < count; i++) {
        const orbit = L.orbitOffset(i, count, this.runElapsed || 0);
        const x = p.x + orbit.x;
        const y = clamp(p.y + orbit.y, this.enemyBounds.minY, this.enemyBounds.maxY);
        const sprite = this.add.sprite(x, y, 'gruntPage0', 'grunt_walk_00').setOrigin(0.5, 790 / 820).setScale(0.39 + (i % 2) * 0.015).setDepth(1000 + y);
        sprite.play('grunt_walk'); if (i % 3 === 1) sprite.setTint(0xd8dbe6);
        const shadow = this.add.ellipse(x, y + 3, 105, 22, 0x000000, 0.45).setDepth(800 + y);
        const tell = this.add.ellipse(x, y + 3, 118, 38, 0xffb245, 0.08).setStrokeStyle(3, 0xffc165, 0.92).setDepth(790 + y).setVisible(false);
        const hpBar = this.add.graphics().setDepth(1450 + y);
        const alert = this.add.text(x, y - 232, '!', { fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#ffcf70', stroke: '#321c08', strokeThickness: 5 }).setOrigin(0.5).setVisible(false).setDepth(1400 + y);
        const hp = tune.hp + (i % 2) * tune.hpStep;
        this.enemies.push({ x, y, hp, maxHp: hp, sprite, shadow, tell, hpBar, alert, state: 'circle', timer: 1.0 + i * 0.2, cooldown: 0.65 + i * 0.3, knock: 0, hitDone: false, targetX: 0, targetY: 0, attackDamage: tune.damage, windup: tune.windup, speed: tune.speed, slot: i, hasToken: false, flashTimer: 0, barTimer: 0, z: 0, vz: 0, counted: false });
      }
      this.toast(`WAVE ${index + 1} · ${count} TROLLOCS`, 2.2);
      this.triggerBanner(`WAVE ${index + 1} · KEEP THEM IN FRONT`, 1.9);
    }

    completeWave() {
      this.waveActive = false;
      this.enemies.forEach(e => { e.sprite.destroy(); e.shadow.destroy(); e.tell.destroy(); e.hpBar.destroy(); e.alert.destroy(); }); this.enemies.length = 0; this.attackTokenCount = 0;
      this.heroData.score += 300 + this.waveIndex * 100; this.heroData.hp = Math.min(100, this.heroData.hp + 12); this.heroData.focus = Math.min(100, this.heroData.focus + 15);
      this.heroData.checkpoint = WAVE_AT[this.waveIndex] + 140;
      if (this.waveIndex === 2) { this.heroData.checkpoint = 2180; this.toast('THE BRIDGE IS BREAKING · RUN AND JUMP THE GAPS', 3); this.triggerBanner('THE BRIDGE IS BREAKING', 2.2); }
      else { this.toast('WAVE CLEARED · A LITTLE BREATHING ROOM', 1.8); this.triggerBanner('WAVE CLEARED', 1.6); }
    }

    releaseAttackToken(e) {
      L.releaseToken(this, e);
    }

    drawEnemyHealthBar(e) {
      if (!e.hpBar) return;
      e.hpBar.clear();
      if (e.hp <= 0 || !e.sprite.visible) return;
      const y = e.y - e.z - 220, x = e.x - 30, width = 60;
      e.hpBar.fillStyle(0x070a0f, 0.92); e.hpBar.fillRoundedRect(x - 1, y - 1, width + 2, 7, 3);
      e.hpBar.fillStyle(0x5a2131, 0.95); e.hpBar.fillRect(x, y, width, 5);
      e.hpBar.fillStyle(0xd77a67, 1); e.hpBar.fillRect(x, y, width * clamp(e.hp / e.maxHp, 0, 1), 5);
      e.hpBar.setDepth(1450 + e.y);
    }

    updateEnemies(dt) {
      const p = this.heroData;
      const ctxBase = { dt, time: this.runElapsed, player: p, tokenBag: this, bounds: this.enemyBounds, rng: Math.random, waveSize: this.waveSize || this.enemies.length };
      for (const e of this.enemies) {
        const events = L.stepEnemy(e, ctxBase);
        if (e.flashTimer > 0) { e.flashTimer -= dt; e.sprite.setTint(0xffffff); }
        else if (e.state === 'dead') e.sprite.setTint(0xd2a29a);
        else if (e.state === 'hurt' || e.state === 'launched') e.sprite.setTint(0xff7777);
        else e.sprite.setTint(0xffffff);
        if (events.anim) e.sprite.play(events.anim, true);
        if (e.state === 'dead') {
          e.sprite.setAlpha(clamp(e.timer / 0.74, 0, 1));
          if (e.timer <= 0) {
            e.hp = 0; e.sprite.setVisible(false); e.shadow.setVisible(false); e.alert.setVisible(false); e.tell.setVisible(false); e.hpBar.clear();
          }
          continue;
        }
        if (e.state === 'windup') {
          const pulse = 0.58 + 0.42 * Math.sin(this.runElapsed * 25);
          e.alert.setVisible(true).setAlpha(pulse);
          e.tell.setPosition(e.targetX, e.targetY + 3).setVisible(true).setAlpha(pulse).setScale(0.88 + 0.12 * Math.sin(this.runElapsed * 21));
        } else if (e.state !== 'strike') {
          e.alert.setVisible(false); e.tell.setVisible(false);
        }
        if (events.hit) this.hurtHero(events.hit.damage, events.hit.knock);
      }
      L.resolveCrowd(this.enemies, { player: p, waveSize: this.waveSize || this.enemies.length, time: this.runElapsed, bounds: this.enemyBounds, dt });
    }

    hurtHero(amount, knock) {
      const p = this.heroData;
      if (L.isInvulnerable(p) || p.falling > 0 || this.mode !== 'play') return;
      p.hp -= amount; p.invuln = 0.62; p.action = 'hurt'; p.actionT = 0; p.knock = knock || -140; this.hero.play('riley_hurt', true); this.hero.setTint(0xff8f8f);
      this.cameras.main.shake(70, 0.0045);
      if (p.hp <= 0) this.playerDeath();
    }

    playerDeath() {
      const p = this.heroData;
      if (p.action === 'down') return;
      p.lives--; p.action = 'down'; p.actionT = 0; p.hp = 0; this.hero.play('riley_knockdown', true); p.deathTimer = 0.45;
      if (p.lives <= 0) { this.mode = 'over'; this.showPanel('over'); return; }
      this.toast('DOWN · BACK TO THE CHECKPOINT', 1.6);
      p.deathTimer = 0.45;
    }

    respawnPlayer() {
      const p = this.heroData;
      this.clearPowers();
      p.x = p.checkpoint; p.y = FLOOR - 56; p.z = 0; p.vz = 0; p.jumpVx = 0; p.hp = 78; p.focus = Math.max(30, p.focus); p.invuln = 1.6; p.action = 'idle'; p.actionT = 0; p.knock = 0; p.attackBuffer = 0; p.specialBuffer = 0; p.falling = 0;
      this.hero.setPosition(p.x, FLOOR - 56).setAlpha(1).setTint(0xffffff).play('riley_idle');
      this.attackTokenCount = 0;
      this.enemies.forEach(e => { if (e.hp > 0) { e.hasToken = false; e.state = 'circle'; e.timer = 0; e.cooldown = 1.2; e.z = 0; e.vz = 0; e.alert.setVisible(false); e.tell.setVisible(false); e.sprite.setAlpha(1).setTint(0xffffff).play('grunt_walk'); } });
      if (this.boss.active && !this.boss.defeated) { this.boss.phase = 'stalk'; this.boss.timer = 1.35; this.bossSprite.setAlpha(0.4).clearTint(); this.hideBossTell(); }
      this.toast('CHECKPOINT · THE ATTACK HAS RESET', 2.2);
    }

    startBoss() {
      const p = this.heroData; this.boss.active = true; this.boss.phase = 'stalk'; this.boss.timer = 1.4; this.boss.x = BOSS_X; this.boss.y = 345;
      p.checkpoint = ARENA_START; p.x = Math.min(p.x, ARENA_START + 80); this.bossSprite.setPosition(this.boss.x, this.boss.y).setAlpha(0.72);
      $('#boss-hud').style.display = 'block'; this.toast('THE GRAY MAN · WATCH FOR THE RED FLASH', 3); this.triggerBanner('THE GRAY MAN · WAIT FOR THE RED TELL', 2.8);
    }

    updateBoss(dt) {
      const b = this.boss, p = this.heroData, dx = p.x - b.x;
      b.timer -= dt;
      if (b.phase === 'stalk') {
        if (Math.abs(dx) > 175) b.x += Math.sign(dx) * Math.min(Math.abs(dx) - 175, 92 * dt);
        b.y += clamp(p.y - b.y, -1, 1) * 74 * dt;
        b.y = clamp(b.y, 326, FLOOR - 55);
        this.bossSprite.setAlpha(0.38 + 0.12 * Math.sin(this.runElapsed * 11)).clearTint();
        if (b.timer <= 0) {
          b.phase = 'tell'; b.timer = b.phaseTwo ? L.GRAY_MAN.tellFast : L.GRAY_MAN.tell; b.targetX = p.x; b.targetY = p.y; b.strikes++;
          this.warningMark.setPosition(b.targetX, b.targetY - 5).setVisible(true);
          this.warningText.setPosition(b.targetX, b.targetY - 68).setVisible(true);
          this.warningCross.setVisible(true);
          this.toast('RED FLASH · MOVE CLEAR OR JUMP', 0.85);
        }
      } else if (b.phase === 'tell') {
        const pulse = 0.42 + 0.55 * (0.5 + 0.5 * Math.sin(this.runElapsed * 35));
        this.warningMark.setPosition(b.targetX, b.targetY - 4).setAlpha(pulse).setScale(0.88 + 0.18 * Math.sin(this.runElapsed * 28));
        this.warningText.setPosition(b.targetX, b.targetY - 70).setAlpha(0.75 + 0.25 * Math.sin(this.runElapsed * 35));
        this.warningCross.clear().lineStyle(4, 0xff4058, 0.92).lineBetween(b.targetX - 46, b.targetY - 4, b.targetX + 46, b.targetY - 4).lineBetween(b.targetX, b.targetY - 40, b.targetX, b.targetY + 32);
        this.bossSprite.setPosition(b.x, b.y).setAlpha(Math.sin(this.runElapsed * 46) > 0 ? 0.9 : 0.24).setTint(0xff344f);
        if (b.timer <= 0) {
          b.phase = 'strike'; b.timer = L.GRAY_MAN.strike;
          const side = b.x < b.targetX ? -1 : 1;
          b.x = clamp(b.targetX + side * 115, ARENA_LEFT + 8, ARENA_RIGHT - 24); b.y = b.targetY;
          this.bossSprite.setPosition(b.x, b.y).setAlpha(1).setTint(0xff4c5b).setRotation(-side * 0.08);
        }
      } else if (b.phase === 'strike') {
        b.timer -= dt;
        if (b.timer <= 0) {
          if (L.grayManStrikeConnects(p, b.targetX, b.targetY)) this.hurtHero(b.phaseTwo ? L.GRAY_MAN.damageFast : L.GRAY_MAN.damage, Math.sign(p.x - b.x) * 270);
          this.hideBossTell(); b.phase = 'recover'; b.timer = L.GRAY_MAN.recover;
          b.x = clamp(b.targetX + (b.x < b.targetX ? -90 : 90), ARENA_LEFT + 8, ARENA_RIGHT - 24);
          this.bossSprite.setPosition(b.x, b.y).setAlpha(1).clearTint().setRotation(0);
        }
      } else if (b.phase === 'recover') {
        if (b.flashTimer > 0) { b.flashTimer -= dt; this.bossSprite.setAlpha(0.95).setTint(0xaffff0); } else this.bossSprite.setAlpha(0.95).clearTint();
        if (b.timer <= 0) { b.phase = 'stalk'; b.timer = b.phaseTwo ? 0.56 + Math.random() * 0.26 : 0.88 + Math.random() * 0.34; this.bossSprite.setAlpha(0.42); }
      }
      this.bossShadow.setPosition(b.x, b.y + 5); this.bossShadow.setDepth(800 + b.y); this.bossSprite.setDepth(1100 + b.y);
    }

    hideBossTell() { this.warningMark.setVisible(false); this.warningText.setVisible(false); this.warningCross.setVisible(false); }

    hitBoss(amount, heavy = false, noMeter = false) {
      const b = this.boss; if (!b.active || b.defeated || b.phase !== 'recover') return;
      const dealt = amount * L.GRAY_MAN.punish;
      b.hp = Math.max(0, b.hp - dealt); this.heroData.score += Math.round(dealt * 7);
      if (!noMeter) this.heroData.focus = clamp(this.heroData.focus + 5, 0, 100);
      this.bossSprite.setTint(0xffffff); b.flashTimer = 0.09; this.impactFeedback(heavy);
      if (b.hp <= 0) {
        b.defeated = true; b.active = false; b.phase = 'dead'; this.bossSprite.setAlpha(0.18); this.hideBossTell(); $('#boss-hud').style.display = 'none';
        this.heroData.score += 1600; this.toast('THE GRAY MAN IS GONE · EXIT OPEN', 3); this.triggerBanner('THE GRAY MAN FALLS · THE WAYGATE IS OPEN', 2.8);
      } else if (b.hp <= b.maxHp * 0.36 && !b.phaseTwo) {
        b.phaseTwo = true; this.toast('THE ASSASSIN MOVES FASTER', 1.5); b.timer = Math.max(0.36, b.timer - 0.2);
      }
    }

    updateBridge(dt) {
      if (!this.planks) return;
      const p = this.heroData;
      const step = L.stepPlanks(this.planks, p, dt);
      if (step.started.length) this.toast('PLANKS CRACKING · JUMP BEFORE THEY DROP', 1);
      if (step.changed) this.drawBridge();
      const next = L.advanceBridgeCheckpoint(p.bridgeCheckpoint, p.x, p.z, this.isPit(p.x));
      if (next !== p.bridgeCheckpoint) {
        p.bridgeCheckpoint = next;
        p.checkpoint = next;
        this.toast('MID-BRIDGE CHECKPOINT', 1.5);
      }
    }

    isPit(x) {
      return L.isPit(x, this.planks);
    }

    startBridgeFall() {
      const p = this.heroData; if (p.falling > 0) return;
      p.falling = 0.72; p.action = 'fall'; p.falls++; p.hp = Math.max(1, p.hp - 16); p.invuln = 0; this.hero.play('riley_jump_fall', true); this.toast('FALL · BRIDGE CHECKPOINT', 1.1);
    }

    respawnBridge() {
      const p = this.heroData;
      this.clearPowers();
      p.x = p.bridgeCheckpoint || BRIDGE_SPAWN; p.y = FLOOR - 12; p.z = 0; p.vz = 0; p.jumpVx = 0; p.falling = 0; p.action = 'idle'; p.invuln = 1.05; p.attackBuffer = 0; p.specialBuffer = 0;
      this.planks = L.createPlanks(); this.drawBridge();
      this.hero.setPosition(p.x, FLOOR - 12).setAlpha(1).setTint(0xffffff).setScale(0.56).setRotation(0).play('riley_idle');
      this.toast(p.x >= BRIDGE_MID - 4 ? 'MID-BRIDGE CHECKPOINT' : 'BRIDGE RESET · CHECKPOINT RESTORED', 1.7);
    }

    updateMotes(dt) {
      this.mist.forEach(m => { m.obj.x = m.home + Math.sin(this.runElapsed * 0.33 + m.seed) * 48; m.obj.y = 290 + Math.sin(this.runElapsed * 0.6 + m.seed) * 17; });
      if (this.bannerTimer > 0) { this.bannerTimer -= dt; this.banner.setAlpha(this.bannerTimer < 0.4 ? this.bannerTimer / 0.4 : 1); }
      if (this.toastTime > 0) { this.toastTime -= dt; if (this.toastTime <= 0) $('#toast').style.opacity = '0'; }
      if (this.powerRingT > 0) { this.powerRingT -= dt; if (this.powerRing) { this.powerRing.setPosition(this.heroData.x + this.heroData.facing * (90 + (0.4 - this.powerRingT) * 130), this.heroData.y - 70).setScale(0.8 + (0.4 - this.powerRingT) * 5).setAlpha(clamp(this.powerRingT * 3, 0, 0.9)); } if (this.powerRingT <= 0 && this.powerRing) { this.powerRing.destroy(); this.powerRing = null; } }
    }

    updateEffects(dt) {
      if (this.hitFxTimer > 0) { this.hitFxTimer -= dt; this.hitFx.setAlpha(clamp(this.hitFxTimer / 0.12, 0, 1)); if (this.hitFxTimer <= 0) this.hitFx.setVisible(false); }
    }

    syncActors() {
      const p = this.heroData;
      const spriteY = p.y - p.z;
      this.hero.setPosition(p.x, spriteY).setFlipX(p.facing < 0).setDepth(1000 + p.y);
      if (p.invuln > 0 && this.mode === 'play' && p.falling <= 0) this.hero.setAlpha(Math.sin(this.runElapsed * 24) > 0 ? 0.42 : 1); else if (p.falling <= 0) this.hero.setAlpha(1);
      this.heroShadow.setPosition(p.x, p.y + 3).setDepth(800 + p.y).setScale(1 - clamp(p.z / 420, 0, 0.48), 1);
      for (const e of this.enemies) {
        e.sprite.setPosition(e.x, e.y - e.z).setDepth(1000 + e.y);
        e.shadow.setPosition(e.x, e.y + 4).setDepth(800 + e.y).setScale(1 - clamp(e.z / 400, 0, 0.45), 1);
        e.alert.setPosition(e.x, e.y - e.z - 242).setDepth(1400 + e.y);
        this.drawEnemyHealthBar(e);
      }
    }

    refreshHud() {
      const p = this.heroData;
      $('#hp-fill').style.width = `${clamp(p.hp, 0, 100)}%`;
      $('#focus-fill').style.width = `${clamp(p.focus, 0, 100)}%`;
      $('#focus-text').textContent = Math.round(p.focus);
      $('#lives').textContent = '♥ '.repeat(Math.max(0, p.lives)).trim() || '—';
      $('#score').textContent = String(p.score).padStart(6, '0');
      const killsEl = $('#kills'); if (killsEl) killsEl.textContent = String(p.trollocKills | 0);
      $('#clock').textContent = fmtTime(p.time);
      if (this.boss.active && !this.boss.defeated) {
        $('#boss-hud').style.display = 'block'; $('#boss-fill').style.width = `${Math.max(0, this.boss.hp / this.boss.maxHp * 100)}%`;
      }
      const names = ['THE WAYS · FIRST WAVE', 'THE WAYS · SECOND WAVE', 'THE WAYS · LAST WAVE'];
      $('#stage-name').textContent = this.boss.active ? 'THE WAYS · GRAY MAN' : this.heroData.x >= BRIDGE_START && this.heroData.x <= BRIDGE_END ? 'THE WAYS · FALLING BRIDGE' : this.boss.defeated ? 'THE WAYS · EXIT' : this.waveIndex >= 0 ? names[this.waveIndex] : 'THE WAYS · APPROACH';
      const bale = document.getElementById('tbB');
      const call = document.getElementById('tbL');
      const ready = p.focus >= BALEFIRE_COST;
      if (bale) { bale.classList.toggle('off', !ready); bale.classList.toggle('ready', ready); }
      if (call) call.classList.add('off');
    }

    completeRun() {
      if (this.mode !== 'play') return;
      this.mode = 'clear'; this.heroData.score += Math.max(0, 1800 - Math.floor(this.runElapsed * 5)); this.showPanel('clear', { rank: this.rank() });
    }
  }

  function startGame() {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: W,
      height: H,
      backgroundColor: '#080a12',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
      input: { keyboard: false, activePointers: 4 },
      fps: { target: 60, forceSetTimeOut: false },
      scene: [WaygateScene]
    });
    window.__waygateGame = game;
  }

  function pagesInUse() {
    const meta = window.WAYGATE_ASSET_META || {};
    const want = new Set();
    for (const [who, data] of Object.entries(meta)) {
      if (!data || !data.frames) continue;
      for (const frame of Object.values(data.frames)) want.add(who + frame.page);
    }
    return want;
  }

  function bootWaygate() {
    const inline = window.WAYGATE_ATLAS_DATA || {};
    const want = pagesInUse();
    window.__WAYGATE_IMAGES = {};
    const keys = Object.keys(inline).filter((key) => want.has(key) && typeof inline[key] === 'string' && inline[key].indexOf('data:image/') === 0);
    if (!keys.length) { startGame(); return; }
    let pending = keys.length;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      clearTimeout(timer);
      startGame();
    };
    const timer = setTimeout(start, 5000);
    for (const key of keys) {
      const img = new Image();
      const done = () => { if (--pending <= 0) start(); };
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w > 2 && h > 2 && w <= 4096 && h <= 4096) window.__WAYGATE_IMAGES[key] = img;
        done();
      };
      img.onerror = done;
      img.src = inline[key];
    }
  }

  window.bootWaygate = bootWaygate;
})();
