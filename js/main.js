/* Game bootstrap: canvas scaling, main loop, scene flow. */
'use strict';

(function () {
  const W = RWB.W, H = RWB.H;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Everything persistent (display mode, volume, music, overlay opacity,
  // remaps, accessibility) lives in RWB.settings under the old key.
  function loadSettings() {
    const s = RWB.settings.load();
    RWB.display.mode = s.mode;
    RWB.audio.setVolume(s.volume);
    if (s.muted && s.volume > 0) RWB.audio.setMuted(true);
    RWB.audio.setMusicLevel(s.music);
  }
  function saveSettings() {
    RWB.settings.set({ mode: RWB.display.mode, volume: RWB.audio.volume, muted: RWB.audio.muted, music: RWB.audio.musicLevel });
  }
  loadSettings();
  RWB.perf.coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  function desktopLayout() {
    // Resolution must not change the input hints or camera lead.
    // A big window is a desktop (or a headless browser that doesn't report a
    // fine pointer). A phone reports a coarse pointer and a narrow window.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const big = window.innerWidth >= 800 && window.innerHeight >= 480;
    if (coarse && !fine) return false;
    return big && (fine || !coarse);
  }

  const game = RWB.game = {
    scene: null, nextScene: null, assassin: 0, fadeDir: 0,
    setScene(s) { this.nextScene = s; this.fadeDir = 1; },
    _swap() {
      if (this.scene && this.scene.exit) this.scene.exit();
      this.scene = this.nextScene; this.nextScene = null;
      this.sceneAt = performance.now();
      if (this.scene.enter) this.scene.enter();
    },
    /* ---- flow ---- */
    toTitle() { RWB.audio.stopMusic(); this.setScene(new RWB.scenes.Title(this)); },
    /** A stage's intro beat, scored with the stage's own song. */
    introBeat(idx) { const L = RWB.LEVELS[idx]; return L.intro && Object.assign({ music: L.music }, L.intro); },
    startNewGame(withIntro) {
      // The opening runs straight into the village intro, then the fight.
      if (withIntro) this.setScene(new RWB.scenes.Cutscene(this, RWB.OPENING.concat([this.introBeat(0)]), () => this.setScene(new RWB.scenes.Play(this, 0, {})), 'story'));
      else this.startLevel(0, {});
    },
    startLevel(idx, carry) {
      const intro = this.introBeat(idx);
      if (intro) {
        this.setScene(new RWB.scenes.StoryBeat(this, { beats: [intro], onDone: () => this.setScene(new RWB.scenes.Play(this, idx, carry)) }));
      } else this.setScene(new RWB.scenes.Play(this, idx, carry));
    },
    levelComplete(idx, player) {
      const L = RWB.LEVELS[idx];
      const callandor = !!(this.scene && this.scene.callandor);
      const carry = { score: player.score, lives: player.lives, saidin: player.saidin, callandor };
      if (idx === RWB.LEVELS.length - 1) { RWB.settings.clearRun(); this.showEnding(player.score); return; }
      RWB.settings.saveRun({ level: idx + 1, wave: 0, score: player.score, saidin: Math.round(player.saidin), callandor, loial: true });
      // Repair log, then the next stage's intro, in one reel.
      this.setScene(new RWB.scenes.StoryBeat(this, {
        beats: [L.outro, this.introBeat(idx + 1)], music: 'story',
        onDone: () => this.setScene(new RWB.scenes.Play(this, idx + 1, carry))
      }));
    },
    showEnding(score) {
      this.setScene(new RWB.scenes.StoryBeat(this, { beats: RWB.ENDING, music: 'victory', onDone: () => this.setScene(new RWB.scenes.Victory(this, score)) }));
    },
    gameOver(levelIndex, score, wave) { this.setScene(new RWB.scenes.GameOver(this, levelIndex, score, wave)); },
    /** Continue after a wipe: same stage, from `wave` (0 = stage start). Half score, 3 lives. */
    continueGame(levelIndex, score, wave) {
      const run = RWB.settings.loadRun();
      this.resumeAt(levelIndex, wave | 0, { score: Math.floor(score / 2), lives: 3, saidin: 0, callandor: !!(run && run.callandor), loialReady: !(run && run.loial === false) });
    },
    resumeAt(levelIndex, wave, carry) {
      this.setScene(new RWB.scenes.Play(this, levelIndex, Object.assign({}, carry, { resumeWave: wave })));
    },
    /** Title-screen Continue from the saved checkpoint. */
    continueRun(run) {
      if (!run) { this.startNewGame(true); return; }
      const kept = { score: run.score, lives: 3, saidin: run.saidin, callandor: !!run.callandor, loialReady: run.loial !== false };
      if (run.wave === 0) this.startLevel(run.level, kept);
      else this.resumeAt(run.level, run.wave, kept);
    },
    /* debug helpers (used by automated tests / cheats) */
    debug: {
      level(n) { game.startLevel(n, { score: 0, lives: 3, saidin: 0 }); },
      play(n) { game.setScene(new RWB.scenes.Play(game, n, { score: 0, lives: 3, saidin: 0 })); },
      fillSurge() { if (game.scene && game.scene.player) game.scene.player.saidin = 100; },
      invuln(v) { if (game.scene) game.scene.cheatInvuln = v !== false; },
      boss() { const s = game.scene; if (!s || !s.level) return; s.waveIdx = s.level.waves.length - 1; s.player.x = s.level.waves[s.waveIdx].x - 10; s.camX = Math.max(0, s.player.x - W * 0.42); }
    }
  };

  /* ---- scaling ----
     The world stays 640x360. The backing store is the CSS box times
     devicePixelRatio, so the browser shows the bitmap 1:1 instead of
     stretching a small canvas (that stretch is what looked blurry on
     retina). Sprites are redrawn in vectors into that buffer, so riley,
     the HUD, and the decks pick up the extra pixels. Classic mode keeps
     the old 640x360 nearest-neighbor picture. */
  function applyTransform() {
    const rs = RWB.display.renderScale || 1;
    ctx.setTransform(rs, 0, 0, rs, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  function resize() {
    const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
    const sharp = desktopLayout();
    RWB.display.pc = sharp;
    const rawDpr = Math.max(1, window.devicePixelRatio || 1);
    RWB.display.dpr = rawDpr;

    let cssW = vw;
    let cssH = Math.floor(cssW * H / W);
    if (cssH > vh) {
      cssH = vh;
      cssW = Math.floor(cssH * W / H);
    }
    cssW = Math.max(1, cssW);
    cssH = Math.max(1, cssH);

    const classic = RWB.display.mode === 'classic';
    // Native device pixels on phones too. Sharp supersamples 1x screens;
    // both modes have a 4K / 8.3 MP ceiling to bound GPU memory and fill cost.
    // Keep an exact 16:9 buffer so circles and input coordinates stay aligned.
    const dpr = RWB.display.mode === 'sharp' ? Math.max(2, rawDpr) : rawDpr;
    const bw = classic ? W : Math.min(3840, Math.max(W, Math.ceil(cssW * dpr / 16) * 16));
    const bh = bw * H / W;
    const renderScale = bw / W;
    RWB.display.renderScale = renderScale;

    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    canvas.style.width = cssW + 'px';
    canvas.style.height = (cssW * H / W) + 'px';
    // Nearest-neighbor is only appropriate for the explicitly retro mode.
    canvas.style.imageRendering = classic ? 'pixelated' : 'auto';
    canvas.classList.toggle('pc', sharp);
    applyTransform();
  }
  RWB.display.resize = resize;
  RWB.display.save = saveSettings;
  RWB.display.setMode = function (mode) {
    this.mode = mode;
    saveSettings();
    resize();
  };
  RWB.display.cycleMode = function (dir) {
    const order = ['auto', 'sharp', 'classic'];
    const i = order.indexOf(this.mode);
    this.setMode(order[(i + (dir < 0 ? -1 : 1) + order.length) % order.length]);
    return this.mode;
  };
  RWB.display.toggleFullscreen = function () {
    const el = document.getElementById('stage') || document.documentElement;
    if (!document.fullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el).catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };
  RWB.display.modeLabel = function () {
    const s = this.renderScale || 1;
    const scale = (Math.abs(s - Math.round(s)) < 0.05 ? String(Math.round(s)) : s.toFixed(1)) + 'x';
    if (this.mode === 'classic') return 'CLASSIC';
    if (this.mode === 'sharp') return 'SHARP ' + scale;
    return 'AUTO ' + scale;
  };
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));
  // Moving the window onto a retina monitor doesn't always fire resize.
  let dprWatch = null;
  function bindDprWatch() {
    if (dprWatch) dprWatch.removeEventListener('change', onDprChange);
    dprWatch = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprWatch.addEventListener('change', onDprChange);
  }
  function onDprChange() { resize(); bindDprWatch(); }
  bindDprWatch();
  document.addEventListener('fullscreenchange', () => {
    RWB.display.fullscreen = !!document.fullscreenElement;
    setTimeout(resize, 50);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    const s = game.scene;
    if (s && s instanceof RWB.scenes.Play && s.phase === 'play' && !s.paused) {
      s.paused = true;
      s.pauseSel = 0;
    }
  });
  resize();
  function toCanvas(cx, cy) {
    const r = canvas.getBoundingClientRect();
    return { x: (cx - r.left) / (r.width / W), y: (cy - r.top) / (r.height / H) };
  }
  RWB.input.attach(canvas, toCanvas);

  // Unlock audio on first user gesture
  const unlock = () => {
    RWB.audio.unlock();
    saveSettings();
    if (game.scene instanceof RWB.scenes.Title) RWB.audio.playMusic('title');
  };
  window.addEventListener('keydown', unlock, { once: true });
  canvas.addEventListener('pointerdown', unlock, { once: true });

  /* ---- loading ---- */
  let loading = true, progress = 0;
  // Wait briefly for the bundled typeface before caching HUD portraits/text.
  const fontReady = document.fonts ? Promise.race([
    document.fonts.load(`8px ${RWB.FONT}`).catch(() => {}),
    new Promise(resolve => setTimeout(resolve, 1500))
  ]) : Promise.resolve();
  let artMissing = [];
  Promise.all([RWB.assets.load(p => { progress = p; }), fontReady]).then(() => {
    artMissing = RWB.assets.criticalMissing();
    loading = false; game.setScene(new RWB.scenes.Title(game));
  });
  /* Missing painted art still plays (procedural fallback) but must never look intentional. */
  function drawArtWarning() {
    const onTitle = game.scene instanceof RWB.scenes.Title;
    if (!onTitle && performance.now() - (game.sceneAt || 0) > 12000) return;
    const T = RWB.text, D = RWB.draw;
    const list = artMissing.length <= 2 ? artMissing.map(k => k.split(':')[1]).join(', ') : artMissing.length + ' FILES (SEE CONSOLE)';
    const w = 300, x = W / 2 - w / 2, y = 96;
    D.fillRRect(ctx, x, y, w, 30, 4, 'rgba(120,0,0,0.88)', '#ffd23f');
    T.draw(ctx, 'PAINTED ART FAILED TO LOAD', W / 2, y + 5, { size: 8, align: 'center', color: '#ffe14a', stroke: '#000', strokeWidth: 2 });
    T.draw(ctx, 'HARD REFRESH (CTRL+SHIFT+R)  MISSING: ' + list.toUpperCase(), W / 2, y + 18, { size: 4.5, align: 'center', color: '#fff', shadow: false });
  }

  /* ---- loop ---- */
  let last = performance.now();
  let fpsT = 0, frames = 0, fps = 0, slowSeconds = 0;
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1; // tab switch protection
    frames++; fpsT += dt;
    if (fpsT >= 1) {
      fps = frames; frames = 0; fpsT = 0;
      // Three slow seconds in a live fight and AUTO effects drop to LITE.
      const s = game.scene;
      const fighting = s instanceof RWB.scenes.Play && s.phase === 'play' && !s.paused && !document.hidden;
      slowSeconds = fighting && fps < 48 ? slowSeconds + 1 : 0;
      if (slowSeconds >= 3 && !RWB.perf.runtimeLite) RWB.perf.runtimeLite = true;
    }
    RWB.input.beginFrame();
    if (RWB.input.pressed.fullscreen) RWB.display.toggleFullscreen();
    if (RWB.input.pressed.mute && !(game.scene && game.scene.paused)) {
      RWB.audio.toggleMute();
      saveSettings();
    }

    // scene assassin transition
    if (game.fadeDir === 1) { game.assassin = Math.min(1, game.assassin + dt * 6); if (game.assassin >= 1) { game._swap(); game.fadeDir = -1; } }
    else if (game.fadeDir === -1) { game.assassin = Math.max(0, game.assassin - dt * 6); if (game.assassin <= 0) game.fadeDir = 0; }
    else if (game.nextScene && !game.scene) { game._swap(); }

    const rs = RWB.display.renderScale || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    applyTransform();
    if (loading) drawLoading();
    else if (game.scene) {
      if (game.fadeDir !== 1) game.scene.update(dt, RWB.input);
      game.scene.draw(ctx);
    }
    if (!loading && artMissing.length && game.scene) drawArtWarning();
    if (game.assassin > 0) { ctx.fillStyle = `rgba(0,0,0,${game.assassin})`; ctx.fillRect(0, 0, W, H); }
    if (RWB.audio.muted) RWB.text.draw(ctx, 'MUTE', W - 6, H - 10, { size: 6, align: 'right', color: '#aaa' });
    if (window.location.hash === '#fps') {
      RWB.text.draw(ctx, `${fps} FPS  ${rs}x`, 4, H - 10, { size: 6, color: '#0f0' });
    }
    requestAnimationFrame(frame);
  }
  function drawLoading() {
    ctx.fillStyle = '#07070f'; ctx.fillRect(0, 0, W, H);
    RWB.text.draw(ctx, 'Riley', W / 2, 120, { size: 20, align: 'center', gradient: ['#fff3a0', '#ffb300', '#e0301e'], stroke: '#000', strokeWidth: 5 });
    RWB.text.draw(ctx, 'WHEEL BRAWL', W / 2, 150, { size: 26, align: 'center', gradient: ['#ffffff', '#ffd23f', '#ff4d00'], stroke: '#000', strokeWidth: 6 });
    RWB.draw.bar(ctx, W / 2 - 100, 220, 200, 8, progress, '#ffe14a', '#333');
    RWB.text.draw(ctx, 'GATHERING THE LIGHT...', W / 2, 240, { size: 7, align: 'center', color: '#bcd' });
  }
  requestAnimationFrame(frame);
})();
