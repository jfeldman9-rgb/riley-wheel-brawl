'use strict';
(function () {
  const R = window.RWB;
  R.attachContentDebug = function (game) {
    game.debug.play = function () {
      game.setSceneNow(new R.scenes.Play(game, 0, {}));
    };
    game.debug.boss = function () {
      const scene = game.scene;
      if (!(scene instanceof R.scenes.Play)) return null;
      scene.wave = 5;
      scene.spawnWave(5);
      return scene.boss;
    };
  };
  const pulse = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  R.audio.defineSong('title', { bpm: 88, bass: [0, null, 3, null, 7, null, 5, null], lead: [7, null, 10, null, 12, null, 10, null], kick: pulse, snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] });
  R.audio.defineSong('story', { bpm: 72, bass: [0, null, null, null, 5, null, null, null], lead: [7, null, null, 9, null, null, 5, null], kick: pulse, snare: pulse.map((value, index) => index % 8 === 4 ? 1 : 0) });
  R.audio.defineSong('stage1', { bpm: 116, bass: [0, 0, 3, null, 5, 5, 3, null], lead: [7, null, 9, 10, 12, null, 10, 9], kick: pulse, snare: pulse.map((value, index) => index % 8 === 4 ? 1 : 0) });
  R.audio.defineSong('gameover', { bpm: 55, bass: [0, null, null, null, -2, null, null, null], lead: [3, null, 2, null, 0, null, null, null], kick: pulse, snare: [] });
  R.audio.defineSfx('kick', function () {
    R.audio.noise({ f0: 1600, f1: 420, dur: 0.07, vol: 0.22, filter: 'bandpass' });
    R.audio.tone({ f0: 240, f1: 110, dur: 0.08, type: 'triangle', vol: 0.28 });
  });
  R.audio.defineSfx('kick2', function () {
    R.audio.noise({ f0: 1900, f1: 500, dur: 0.08, vol: 0.24, filter: 'bandpass' });
    R.audio.tone({ f0: 320, f1: 140, dur: 0.09, type: 'triangle', vol: 0.3 });
  });
  R.audio.defineSfx('kick3', function () {
    R.audio.noise({ f0: 1400, f1: 240, dur: 0.12, vol: 0.32 });
    R.audio.tone({ f0: 180, f1: 60, dur: 0.16, type: 'sawtooth', vol: 0.34 });
  });
  R.audio.defineSfx('spinKick', function () {
    R.audio.noise({ f0: 2200, f1: 300, dur: 0.18, vol: 0.28, filter: 'bandpass' });
    R.audio.tone({ f0: 520, f1: 140, dur: 0.16, type: 'square', vol: 0.2 });
  });
  R.audio.defineSfx('jumpKick', function () {
    R.audio.tone({ f0: 480, f1: 180, dur: 0.12, type: 'square', vol: 0.22 });
    R.audio.noise({ f0: 1500, f1: 400, dur: 0.1, vol: 0.2 });
  });
  R.audio.defineSfx('fireball', function () {
    R.audio.tone({ f0: 360, f1: 880, dur: 0.16, type: 'sawtooth', vol: 0.2 });
    R.audio.noise({ f0: 2400, f1: 600, dur: 0.18, vol: 0.16, filter: 'lowpass' });
  });
  R.audio.defineSfx('fireHit', function () {
    R.audio.noise({ f0: 1800, f1: 200, dur: 0.12, vol: 0.3 });
    R.audio.tone({ f0: 660, f1: 180, dur: 0.1, type: 'square', vol: 0.18 });
  });
  R.audio.defineSfx('hit', function () {
    R.audio.tone({ f0: 280, f1: 90, dur: 0.07, type: 'square', vol: 0.22 });
    R.audio.noise({ f0: 900, f1: 160, dur: 0.08, vol: 0.28 });
  });
  R.audio.defineSfx('hurt', function () {
    R.audio.tone({ f0: 420, f1: 90, dur: 0.18, type: 'sawtooth', vol: 0.3 });
  });
  R.audio.defineSfx('axe', function () {
    R.audio.noise({ f0: 500, f1: 80, dur: 0.16, vol: 0.34 });
    R.audio.tone({ f0: 140, f1: 50, dur: 0.14, type: 'triangle', vol: 0.3 });
  });
  R.audio.defineSfx('claw', function () {
    R.audio.noise({ f0: 2400, f1: 700, dur: 0.1, vol: 0.26, filter: 'highpass' });
  });
  R.audio.defineSfx('spear', function () {
    R.audio.tone({ f0: 880, f1: 220, dur: 0.09, type: 'square', vol: 0.18 });
    R.audio.noise({ f0: 1200, f1: 200, dur: 0.06, vol: 0.16 });
  });
  R.audio.defineSfx('roar', function () {
    R.audio.tone({ f0: 160, f1: 70, dur: 0.35, type: 'sawtooth', vol: 0.32 });
    R.audio.noise({ f0: 400, f1: 80, dur: 0.3, vol: 0.2 });
  });
  R.audio.defineSfx('bossCrash', function () {
    R.audio.tone({ f0: 90, f1: 36, dur: 0.28, type: 'sine', vol: 0.46 });
    R.audio.noise({ f0: 600, f1: 80, dur: 0.22, vol: 0.36 });
  });
  R.audio.defineSfx('bossCharge', function () {
    R.audio.noise({ f0: 300, f1: 1400, dur: 0.28, vol: 0.28, filter: 'bandpass' });
    R.audio.tone({ f0: 110, f1: 70, dur: 0.24, type: 'sawtooth', vol: 0.24 });
  });
  R.audio.defineSfx('bossStomp', function () {
    R.audio.tone({ f0: 70, f1: 30, dur: 0.26, type: 'sine', vol: 0.48 });
    R.audio.noise({ f0: 240, f1: 60, dur: 0.2, vol: 0.3 });
  });
  R.audio.defineSfx('pickup', function () {
    R.audio.tone({ f0: 660, f1: 990, dur: 0.08, type: 'square', vol: 0.2 });
    R.audio.tone({ f0: 1320, dur: 0.1, delay: 0.08, type: 'square', vol: 0.16 });
  });
  R.audio.defineSfx('loialHorn', function () {
    R.audio.tone({ f0: 220, f1: 330, dur: 0.22, type: 'sawtooth', vol: 0.28 });
    R.audio.tone({ f0: 330, f1: 440, dur: 0.24, delay: 0.18, type: 'sawtooth', vol: 0.24 });
  });
  R.audio.defineSfx('balefire', function () {
    R.audio.tone({ f0: 180, f1: 880, dur: 0.35, type: 'sawtooth', vol: 0.22 });
    R.audio.noise({ f0: 3000, f1: 400, dur: 0.4, vol: 0.2, filter: 'highpass' });
    R.audio.tone({ f0: 90, f1: 40, dur: 0.4, type: 'sine', vol: 0.35 });
  });
  R.audio.defineSfx('throw', function () {
    R.audio.noise({ f0: 800, f1: 200, dur: 0.14, vol: 0.26 });
    R.audio.tone({ f0: 200, f1: 80, dur: 0.12, type: 'triangle', vol: 0.28 });
  });
}());
