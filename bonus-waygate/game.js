(function () {
  'use strict';

  const L = window.WaygateLogic;
  const W = 960, H = 540;
  const {
    FLOOR, WORLD, BRIDGE_START, BRIDGE_END, BRIDGE_SPAWN, BRIDGE_MID,
    P_SPEED, JUMP_V, ROLL_DURATION, WAVE_TUNING, ARENA_START, ARENA_LEFT, ARENA_RIGHT,
    BOSS_X, EXIT_X, PADS, CRUMBLE
  } = L;
  const WAVE_AT = [500, 1120, 1750];
  const WAVE_COUNTS = [3, 4, 5];
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = L.fmtTime;

  class WaygateScene extends Phaser.Scene {
    constructor() { super('waygate'); }

    preload() {
      // Native Image loading also works when index.html is opened as file://; XHR does not.
      this.load.imageLoadType = 'HTMLImageElement';
      const inline = window.WAYGATE_ATLAS_DATA || {};
      this.load.image('rileyPage0', inline.riley0 || 'assets/atlases/riley-0.webp');
      this.load.image('rileyPage1', inline.riley1 || 'assets/atlases/riley-1.webp');
      this.load.image('gruntPage0', inline.grunt0 || 'assets/atlases/grunt-0.webp');
    }

    create() {
      this.registerAtlas('riley', window.WAYGATE_ASSET_META.riley);
      this.registerAtlas('grunt', window.WAYGATE_ASSET_META.grunt);
      this.registerAnimations('riley', window.WAYGATE_ASSET_META.riley);
      this.registerAnimations('grunt', window.WAYGATE_ASSET_META.grunt);
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
      $('#loading').style.display = 'none';
      $('#hud').hidden = false;
      this.refreshHud();
    }

    onShutdown() {
      window.removeEventListener('blur', this.onBlur);
      document.removeEventListener('visibilitychange', this.onVisibility);
      $('#overlay').removeEventListener('click', this.overlayClick);
      $('#pause-toggle').removeEventListener('click', this.pauseClick);
      document.removeEventListener('pointerdown', this.touchDetect);
      document.removeEventListener('pointerup', this.touchRelease);
      document.removeEventListener('pointercancel', this.touchRelease);
      this.touchBindings?.forEach(({ el, down, up }) => {
        el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
      });
    }

    registerAtlas(char, data) {
      const pageCount = char === 'riley' ? 2 : 1;
      for (let p = 0; p < pageCount; p++) {
        const texture = this.textures.get(`${char}Page${p}`);
        if (!texture) continue;
        for (const [name, f] of Object.entries(data.frames)) {
          if (f.page !== p || texture.has(name)) continue;
          const r = f.rect, off = f.offset, sz = f.size;
          const frame = texture.add(name, 0, r.x, r.y, r.w, r.h);
          frame.setTrim(sz.w, sz.h, off.x, off.y, off.w, off.h);
        }
      }
    }

    registerAnimations(char, data) {
      for (const a of data.anims) {
        if (this.anims.exists(a.name)) continue;
        const frames = a.frames.map((name, i) => ({
          key: `${char}Page${data.frames[name].page}`, frame: name,
          duration: a.holds[i] || 100
        }));
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
      this.heroData = { x: 120, y: FLOOR - 56, z: 0, vz: 0, jumpVx: 0, hp: 100, focus: 60, lives: 3, score: 0, kills: 0, trollocKills: 0, falls: 0, invuln: 0, facing: 1, action: 'idle', actionT: 0, combo: 0, comboExpire: 0, hitDone: false, attackBuffer: 0, specialBuffer: 0, dodgeX: 0, dodgeY: 0, onBridge: false, falling: 0, checkpoint: 120, bridgeCheckpoint: BRIDGE_SPAWN, time: 0, started: false };
    }

    createInput() {
      const kb = this.input.keyboard;
      this.keys = kb.addKeys({ left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', a: 'A', d: 'D', w: 'W', s: 'S', attack: 'J', jump: 'K', dodge: 'SHIFT', special: 'L', pause: 'P', escape: 'ESC', restart: 'R', enter: 'ENTER' });
      this.pressed = { attack: false, jump: false, dodge: false, special: false };
      this.touchState = { left: false, right: false, up: false, down: false };
      this.touchAction = { attack: false, jump: false, dodge: false, special: false };
      this.overlayClick = (e) => { const action = e.target.closest('[data-action]')?.dataset.action; if (!action) return; if (action === 'start') this.begin(); if (action === 'resume') this.resumeGame(); if (action === 'restart') this.scene.restart(); };
      this.pauseClick = () => { if (this.mode === 'play') this.pauseGame('Combat paused. Choose when you are ready.'); else if (this.mode === 'paused') this.resumeGame(); };
      this.touchDetect = (e) => { if (e.pointerType === 'touch') document.body.classList.add('has-touch'); };
      this.touchRelease = (e) => { const id = e.target.closest('[data-hold],[data-press]'); if (!id) return; const key = id.dataset.hold || id.dataset.press; if (id.dataset.hold) this.touchState[key] = false; else this.touchAction[key] = false; id.classList.remove('down'); };
      $('#overlay').addEventListener('click', this.overlayClick);
      $('#pause-toggle').addEventListener('click', this.pauseClick);
      document.addEventListener('pointerdown', this.touchDetect, { passive: true });
      this.touchBindings = [];
      document.querySelectorAll('[data-hold],[data-press]').forEach((el) => {
        const down = (e) => {
          e.preventDefault(); el.setPointerCapture?.(e.pointerId);
          if (el.dataset.hold) this.touchState[el.dataset.hold] = true;
          else this.touchAction[el.dataset.press] = true;
          el.classList.add('down');
        };
        const up = (e) => this.touchRelease(e);
        this.touchBindings.push({ el, down, up });
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('lostpointercapture', up);
      });
    }

    initRun() {
      this.mode = 'title'; this.runElapsed = 0; this.waveIndex = -1; this.waveActive = false; this.enemies = []; this.waveSize = 0; this.attackTokenCount = 0; this.maxAttackTokens = 1; this.hitstop = 0; this.debugSkip = new URLSearchParams(window.location.search).get('skip') || ''; this.planks = L.createPlanks(); this.enemyBounds = { minX: 110, maxX: WORLD - 120, minY: L.LANE_MIN_Y, maxY: L.LANE_MAX_Y };
      this.bridgeGraphic?.destroy();
      this.bridgeGraphic = this.add.graphics().setDepth(4); this.drawBridge();
      this.boss = { active: false, defeated: false, hp: 330, maxHp: 330, x: BOSS_X, y: 346, phase: 'stalk', timer: 1.2, targetX: 0, targetY: 0, strikes: 0, flashTimer: 0, phaseTwo: false };
      if (this.bossSprite) { this.bossSprite.destroy(); this.bossShadow.destroy(); }
      this.bossShadow = this.add.ellipse(0, 0, 98, 24, 0x000000, 0.5).setDepth(900);
      this.bossSprite = this.add.image(this.boss.x, this.boss.y, 'grayman').setOrigin(0.5, 1).setDisplaySize(106, 240).setDepth(1100).setAlpha(0);
      this.heroData.x = 120; this.heroData.y = FLOOR - 56; this.heroData.z = 0; this.heroData.vz = 0; this.heroData.jumpVx = 0; this.heroData.hp = 100; this.heroData.focus = 60; this.heroData.lives = 3; this.heroData.score = 0; this.heroData.kills = 0; this.heroData.trollocKills = 0; this.heroData.falls = 0; this.heroData.invuln = 0; this.heroData.facing = 1; this.heroData.action = 'idle'; this.heroData.actionT = 0; this.heroData.combo = 0; this.heroData.comboExpire = 0; this.heroData.hitDone = false; this.heroData.onBridge = false; this.heroData.falling = 0; this.heroData.checkpoint = 120; this.heroData.bridgeCheckpoint = BRIDGE_SPAWN; this.heroData.time = 0; this.heroData.started = false; this.heroData.attackBuffer = 0; this.heroData.specialBuffer = 0; this.heroData.dodgeX = 0; this.heroData.dodgeY = 0;
      this.hero.setPosition(120, FLOOR - 56).setFlipX(false).setAlpha(1).setTint(0xffffff).play('riley_idle');
      this.cameraOffset = 0; this.toast('THE WAYS SHIFT AROUND YOU', 2.2); this.refreshHud();
    }

    begin() {
      if (this.mode !== 'title') return;
      this.mode = 'play'; this.heroData.started = true; this.startedAt = this.runElapsed; this.hidePanel();
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
      const controls = `<div class="control-grid"><div><b>Move</b> · WASD / Arrows</div><div><b>Attack</b> · J</div><div><b>Jump</b> · K</div><div><b>Dodge roll</b> · Shift</div><div><b>One Power</b> · L</div><div><b>Pause / resume</b> · Esc / P</div><div><b>Restart</b> · R</div></div>`;
      if (kind === 'title') box.innerHTML = `<div class="eyebrow">RILEY WHEEL BRAWL · BONUS LEVEL</div><h1>WAYGATE<br>GAUNTLET</h1><p>Three Trolloc waves, a bridge that will not stay beneath your feet, and a Gray Man waiting in the dark.</p>${controls}<p class="fine">Every enemy attack has a tell. The Gray Man's red flash marks the strike lane; move away or jump over it.</p><div class="panel-actions"><button class="action" data-action="start">ENTER THE WAYS</button></div><p class="fine">A short, standalone, silent side-story level · about 2–3 minutes</p>`;
      else if (kind === 'pause') box.innerHTML = `<div class="eyebrow">THE WAYS HOLD STILL</div><h2>PAUSED</h2><p>${extra.message || 'Take a breath. Your checkpoint and the enemy timers are safe.'}</p><div class="panel-actions"><button class="action" data-action="resume">RESUME</button><button class="action secondary" data-action="restart">RESTART BONUS</button></div><p class="fine">Esc / P resumes · R restarts · timers stay frozen while paused</p>`;
      else if (kind === 'over') box.innerHTML = `<div class="eyebrow">THE SHADOWS CLOSE IN</div><h2>DEFEATED</h2><p>You are out of lives. The gauntlet is ready for another attempt.</p>${this.resultStats()}<p><b>Trollocs killed: ${this.heroData.trollocKills}</b></p><div class="panel-actions"><button class="action" data-action="restart">TRY AGAIN</button></div><p class="fine">Press R or Enter to restart.</p>`;
      else if (kind === 'clear') box.innerHTML = `<div class="eyebrow">THE WAYGATE OPENS</div><h2>GAUNTLET CLEARED</h2><p>Riley steps out of the Ways with the Gray Man left behind. Trollocs killed: ${this.heroData.trollocKills}.</p>${this.resultStats()}<p><b>Rank ${extra.rank || this.rank()}</b></p><div class="panel-actions"><button class="action" data-action="restart">RUN IT AGAIN</button></div><p class="fine">Press R to restart. Score and time are local to this run.</p>`;
    }

    resultStats() { return L.formatRunStats(this.heroData); }
    rank() { const h = this.heroData; return h.lives === 3 && h.falls === 0 && h.time < 135 ? 'A' : h.lives > 0 && h.falls < 3 ? 'B' : 'C'; }
    hidePanel() { $('#overlay').hidden = true; }
    pauseGame(message) { if (this.mode !== 'play') return; this.mode = 'paused'; this.showPanel('pause', { message }); }
    resumeGame() { if (this.mode !== 'paused') return; this.mode = 'play'; this.hidePanel(); this.clearInputs(); }
    clearInputs() { for (const k in this.touchState) this.touchState[k] = false; for (const k in this.touchAction) this.touchAction[k] = false; document.querySelectorAll('.touch-key.down').forEach(x => x.classList.remove('down')); }

    toast(text, duration = 1.8) { this.toastText = text; this.toastTime = duration; $('#toast').textContent = text; $('#toast').style.opacity = '1'; }
    triggerBanner(text, time = 2.1) { this.banner.setText(text).setAlpha(1); this.bannerTimer = time; }

    update(time, deltaMs) {
      const k = this.keys;
      const down = (obj) => Phaser.Input.Keyboard.JustDown(obj);
      if (down(k.restart) && this.mode !== 'title') { this.scene.restart(); return; }
      if (this.mode === 'title') { if (down(k.enter) || down(k.attack)) this.begin(); return; }
      if (this.mode === 'paused') { if (down(k.pause) || down(k.escape) || down(k.enter)) this.resumeGame(); return; }
      if (this.mode === 'over' || this.mode === 'clear') { if (down(k.enter)) this.scene.restart(); return; }
      if (down(k.pause) || down(k.escape)) { this.pauseGame('Combat paused. Choose when you are ready.'); return; }
      if (this.mode !== 'play') return;

      const dt = Math.min(0.04, deltaMs / 1000);
      if (this.hitstop > 0) {
        this.hitstop = Math.max(0, this.hitstop - dt);
        this.updateEffects(dt); this.refreshHud();
        return;
      }
      this.runElapsed += dt; this.heroData.time = this.runElapsed;
      this.exitGlowPulse += dt;
      this.updateHero(dt, down);
      this.updateWorldProgress(dt);
      this.updateEnemies(dt);
      if (this.boss.active && !this.boss.defeated) this.updateBoss(dt);
      this.updateBridge(dt);
      this.updateMotes(dt);
      this.updateEffects(dt);
      this.syncActors();
      this.refreshHud();
    }

    getInput(down) {
      const k = this.keys;
      const axis = (positive, negative, touchPos, touchNeg) => (positive.isDown || this.touchState[touchPos] ? 1 : 0) - (negative.isDown || this.touchState[touchNeg] ? 1 : 0);
      return {
        x: axis(k.right, k.left, 'right', 'left') || axis(k.d, k.a, 'right', 'left'),
        y: axis(k.down, k.up, 'down', 'up') || axis(k.s, k.w, 'down', 'up'),
        attack: down(k.attack) || this.touchAction.attack,
        jump: down(k.jump) || this.touchAction.jump,
        dodge: down(k.dodge) || this.touchAction.dodge,
        special: down(k.special) || this.touchAction.special
      };
    }

    updateHero(dt, down) {
      const p = this.heroData, I = this.getInput(down);
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
      if (I.dodge) this.touchAction.dodge = false;
      if (I.dodge && p.z <= 0 && ['idle', 'walk', 'hurt'].includes(p.action)) this.startDodge(mx, my);
      if (p.action === 'dodge') {
        p.actionT += dt; p.x += p.dodgeX * 525 * dt;
        if (!inBridge) { p.y = clamp(p.y + p.dodgeY * 290 * dt, 314, FLOOR - 5); }
        // Refresh i-frames to the time still left in the roll so a hit cannot land mid-roll.
        p.invuln = Math.max(p.invuln, Math.max(0, ROLL_DURATION - p.actionT));
        if (p.actionT >= ROLL_DURATION) { p.action = 'idle'; p.actionT = 0; this.hero.setScale(0.56).setRotation(0).play('riley_idle'); }
        if (lockX) p.x = clamp(p.x, lockX[0], lockX[1]);
        if (this.waveActive) p.x = Math.min(p.x, WAVE_AT[this.waveIndex] + 405);
        p.x = clamp(p.x, 38, WORLD - 85);
        if (inBridge && p.z <= 0 && this.isPit(p.x)) this.startBridgeFall();
        return;
      }
      const free = p.action === 'idle' || p.action === 'walk' || p.action === 'air';
      if (inBridge && p.action !== 'hurt' && (p.z > 0 || p.action === 'air')) {
        p.x += (p.jumpVx || 0) * dt;
      } else if (free && !inBridge) {
        const n = Math.hypot(mx, my) || 1; mx /= n; my /= n;
        p.x += mx * P_SPEED * dt;
        p.y += my * 168 * dt;
        p.y = clamp(p.y, 314, FLOOR - 5);
        if (mx) p.facing = L.facingAfterMove(p, mx);
      } else if (free && inBridge) {
        p.x += mx * P_SPEED * dt;
      } else if (p.action === 'hurt') {
        p.x += (p.knock || 0) * dt; p.knock *= Math.pow(0.02, dt);
      } else if (p.action === 'attack' && p.actionT < 0.16) {
        p.x += p.facing * 34 * dt;
      }
      if (lockX) p.x = clamp(p.x, lockX[0], lockX[1]);
      if (this.waveActive) p.x = Math.min(p.x, WAVE_AT[this.waveIndex] + 405);
      p.x = clamp(p.x, 38, WORLD - 85);

      if (I.jump && p.z <= 0 && !['hurt', 'special'].includes(p.action)) {
        // Takeoff speed is locked for the arc so a running jump clears the gap even if the key flickers.
        p.jumpVx = mx * P_SPEED;
        p.vz = JUMP_V; p.action = 'air'; p.actionT = 0; p.jumpAttack = false; this.hero.play('riley_jump_rise', true);
      }
      const phase = L.stepVertical(p, dt);
      if (phase === 'landed') {
        if (p.action === 'air') { p.action = 'idle'; this.hero.play('riley_idle'); }
      } else if (phase === 'air' && p.z < 52 && p.vz < 80 && this.hero.anims.currentAnim?.key !== 'riley_jump_fall') this.hero.play('riley_jump_fall', true);
      if (I.attack) { p.attackBuffer = Math.max(p.attackBuffer, p.action === 'attack' ? 0.34 : 0.18); this.touchAction.attack = false; }
      if (p.attackBuffer > 0) p.attackBuffer = Math.max(0, p.attackBuffer - dt);
      if (p.attackBuffer > 0 && !['attack', 'hurt', 'special'].includes(p.action)) {
        p.attackBuffer = 0;
        this.startHeroAttack(false);
      }
      if (I.special && p.specialBuffer <= 0) p.specialBuffer = 0.18;
      if (p.specialBuffer > 0) p.specialBuffer -= dt;
      if (p.specialBuffer > 0 && p.focus >= 50 && !['hurt', 'special'].includes(p.action)) {
        p.specialBuffer = 0; this.startSpecial();
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
        if (!p.hitDone && p.actionT > 0.24) { p.hitDone = true; this.specialHit(); }
        if (p.actionT > 0.58) { p.action = p.z > 0 ? 'air' : 'idle'; this.hero.play(p.action === 'air' ? 'riley_jump_fall' : 'riley_idle'); }
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

    startDodge(mx, my) {
      const p = this.heroData;
      const rawX = mx || p.facing || 1, rawY = p.onBridge ? 0 : my;
      const length = Math.hypot(rawX, rawY) || 1;
      p.dodgeX = rawX / length; p.dodgeY = rawY / length; p.facing = p.dodgeX < 0 ? -1 : 1;
      p.action = 'dodge'; p.actionT = 0; p.invuln = Math.max(p.invuln, ROLL_DURATION); p.combo = 0; p.attackBuffer = 0;
      this.hero.setScale(0.62, 0.43).setRotation(-0.16 * p.dodgeX).play('riley_jump_fall', true);
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
      const p = this.heroData; p.focus -= 50; p.action = 'special'; p.actionT = 0; p.hitDone = false; p.attackDamage = 48;
      this.hero.play('riley_cast', true); this.toast('ONE POWER · WAYFIRE', 0.8);
      this.powerRing = this.add.ellipse(p.x + p.facing * 80, p.y - 66, 100, 100, 0x5ee6e3, 0.22).setStrokeStyle(4, 0x8bfff1, 0.85).setDepth(1500);
      this.powerRingT = 0.4;
    }

    specialHit() {
      const p = this.heroData;
      if (this.powerRing) this.powerRing.setFillStyle(0x62fff0, 0.3).setStrokeStyle(6, 0xc5fff7, 0.95).setScale(3.1);
      this.showSlash(p.x + p.facing * 112, p.y - 110, 0x71f9ef, true);
      if (this.boss.active && !this.boss.defeated && this.boss.phase === 'recover' && Math.abs(this.boss.x - p.x) < 290 && Math.abs(this.boss.y - p.y) < 135) this.hitBoss(52, true);
      const near = this.enemies.filter(e => e.hp > 0 && e.state !== 'dead' && Math.abs(e.x - p.x) < 275 && Math.abs(e.y - p.y) < 110);
      near.forEach(e => this.hitEnemy(e, 48, { heavy: true, combo: 0 }));
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
        const x = WAVE_AT[index] + 155 + i * 84 + (i % 2) * 26;
        const y = 331 + (i % 3) * 38;
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
      if (this.waveIndex === 2) { this.heroData.checkpoint = 2180; this.toast('THE BRIDGE IS BREAKING · KEEP MOVING', 3); this.triggerBanner('THE BRIDGE IS BREAKING', 2.2); }
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
      L.separateEnemies(this.enemies, dt);
      for (const e of this.enemies) {
        e.x = clamp(e.x, this.enemyBounds.minX, this.enemyBounds.maxX);
        e.y = clamp(e.y, this.enemyBounds.minY, this.enemyBounds.maxY);
      }
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
          b.phase = 'tell'; b.timer = b.phaseTwo ? 0.66 : 0.88; b.targetX = p.x; b.targetY = p.y; b.strikes++;
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
          b.phase = 'strike'; b.timer = 0.27;
          const side = b.x < b.targetX ? -1 : 1;
          b.x = clamp(b.targetX + side * 115, ARENA_LEFT + 8, ARENA_RIGHT - 24); b.y = b.targetY;
          this.bossSprite.setPosition(b.x, b.y).setAlpha(1).setTint(0xff4c5b).setRotation(-side * 0.08);
        }
      } else if (b.phase === 'strike') {
        b.timer -= dt;
        if (b.timer <= 0) {
          if (L.grayManStrikeConnects(p, b.targetX, b.targetY)) this.hurtHero(b.phaseTwo ? 28 : 22, Math.sign(p.x - b.x) * 270);
          this.hideBossTell(); b.phase = 'recover'; b.timer = 0.95;
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

    hitBoss(amount, heavy = false) {
      const b = this.boss; if (!b.active || b.defeated || b.phase !== 'recover') return;
      b.hp = Math.max(0, b.hp - amount); this.heroData.score += amount * 7; this.heroData.focus = clamp(this.heroData.focus + 5, 0, 100);
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
    }

    completeRun() {
      if (this.mode !== 'play') return;
      this.mode = 'clear'; this.heroData.score += Math.max(0, 1800 - Math.floor(this.runElapsed * 5)); this.showPanel('clear', { rank: this.rank() });
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#080a12',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    input: { activePointers: 4 },
    fps: { target: 60, forceSetTimeOut: false },
    scene: [WaygateScene]
  });
  window.__waygateGame = game;
})();
