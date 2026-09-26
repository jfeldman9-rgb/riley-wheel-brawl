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
  const cueNames = ['kick', 'spinKick', 'jumpKick', 'fireball', 'fireHit', 'hit', 'hurt', 'axe', 'claw', 'spear', 'roar', 'bossCrash', 'bossCharge', 'bossStomp', 'pickup', 'loialHorn', 'balefire', 'throw'];
  cueNames.forEach(function (name, index) {
    R.audio.defineSfx(name, function () {
      const frequency = 90 + index * 23;
      if (index % 3 === 0) R.audio.noise({ f0: 900 + index * 70, f1: 180, dur: 0.06 + index * 0.002, vol: 0.05 });
      R.audio.tone({ f0: frequency, f1: frequency * 0.72, dur: 0.05 + index * 0.002, type: 'square', vol: 0.045 });
    });
  });
}());
