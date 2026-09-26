/* Engine bootstrap: canvas scaling (HD / Sharp / Classic), fixed 640x360 world,
   main loop, scene manager with fade, loading screen, audio unlock.
   Game flow (title -> story -> stages) belongs to content code, which should
   register RWB.scenes.* and may override RWB.game.boot(). */
'use strict';

(function () {
  const W = RWB.W, H = RWB.H;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Everything persistent (display mode, volume, music, overlay opacity,
  // remaps, accessibility) lives in RWB.settings.
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

  /* Scene contract: { enter?(), exit?(), update(dt, input), draw(ctx),
     isGameplay? (true for a live fight: enables touch buttons, auto-pause on
     hide, and runtime LITE fx), paused?, phase? ('play' while fighting),
     music? (song to start on the first audio unlock) }. */
  const game = RWB.game = {
    scene: null, nextScene: null, fade: 0, fadeDir: 0, sceneAt: 0,
    /** Fade out, swap, fade in. */
    setScene(s) { this.nextScene = s; this.fadeDir = 1; },
    /** Swap with no fade (tests / soak). */
    setSceneNow(s) { this.nextScene = s; this._swap(); this.fadeDir = 0; this.fade = 0; },
    _swap() {
      if (this.scene && this.scene.exit) this.scene.exit();
      this.scene = this.nextScene; this.nextScene = null;
      this.sceneAt = performance.now();
      if (this.scene && this.scene.enter) this.scene.enter();
    },
    /** First scene after loading. Content overrides this (e.g. to show its Title). */
    boot() {
      const S = RWB.scenes || {};
      const First = S.Title || S.Rebuilding;
      if (First) this.setScene(new First(this));
    },
    debug: {}
  };

  /* ---- scaling ----
     The world stays 640x360. The backing store is the CSS box times
     devicePixelRatio, so the browser shows the bitmap 1:1 instead of
     stretching a small canvas (that stretch is what looked blurry on
     retina). Sprites are redrawn in vectors into that buffer, so actors,
     the HUD, and the backdrops pick up the extra pixels. Classic mode keeps
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
    if (s && s.isGameplay && s.phase === 'play' && !s.paused) {
      if (s.pause) s.pause(); else s.paused = true;
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
    if (game.scene && game.scene.music) RWB.audio.playMusic(game.scene.music);
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
  Promise.all([RWB.assets.load(p => { progress = p; }), fontReady]).then(() => {
    loading = false; game.boot();
  });

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
      const fighting = s && s.isGameplay && s.phase === 'play' && !s.paused && !document.hidden;
      slowSeconds = fighting && fps < 48 ? slowSeconds + 1 : 0;
      if (slowSeconds >= 3 && !RWB.perf.runtimeLite) RWB.perf.runtimeLite = true;
    }
    RWB.input.beginFrame();
    if (RWB.input.pressed.fullscreen) RWB.display.toggleFullscreen();
    if (RWB.input.pressed.mute && !(game.scene && game.scene.paused)) {
      RWB.audio.toggleMute();
      saveSettings();
    }

    // scene fade transition
    if (game.fadeDir === 1) { game.fade = Math.min(1, game.fade + dt * 6); if (game.fade >= 1) { game._swap(); game.fadeDir = -1; } }
    else if (game.fadeDir === -1) { game.fade = Math.max(0, game.fade - dt * 6); if (game.fade <= 0) game.fadeDir = 0; }
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
    if (game.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${game.fade})`; ctx.fillRect(0, 0, W, H); }
    if (RWB.audio.muted) RWB.text.draw(ctx, 'MUTE', W - 6, H - 10, { size: 6, align: 'right', color: '#aaa' });
    if (window.location.hash === '#fps') {
      RWB.text.draw(ctx, `${fps} FPS  ${rs}x`, 4, H - 10, { size: 6, color: '#0f0' });
    }
    requestAnimationFrame(frame);
  }
  function drawLoading() {
    ctx.fillStyle = '#07070f'; ctx.fillRect(0, 0, W, H);
    RWB.text.draw(ctx, 'RILEY WHEEL BRAWL', W / 2, 140, { size: 18, align: 'center', color: '#e8f0ff', stroke: '#000', strokeWidth: 5 });
    RWB.draw.bar(ctx, W / 2 - 100, 220, 200, 8, progress, '#7cc8ff', '#223');
    RWB.text.draw(ctx, 'LOADING...', W / 2, 240, { size: 7, align: 'center', color: '#bcd' });
  }
  requestAnimationFrame(frame);
})();
