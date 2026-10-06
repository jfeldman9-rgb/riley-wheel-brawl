// Cues and backdrop plan for the Waygate. The sounds themselves stay in ../src/audio.js.
// This file only names which stage cue plays for which Waygate event, and which parallax
// layers the scene builds. No new synth, no voice lines.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WaygatePresentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // Stage 2's pair: "Baerlon in the Rain" (tense) for the waves and the bridge,
  // and that stage's boss loop for the Gray Man. Title / victory / game over stay
  // on the director's usual tracks. MusicDirector in ../src/music.js does the fades.
  const MUSIC_STAGE = 2;
  const TEXTURE_LIMIT = 4096;
  // Generated at load. All of these stay under the iPad texture cap.
  const TEXTURES = {
    void: { key: 'ways-void', w: 2048, h: 540 },
    islands: { key: 'ways-islands', w: 2048, h: 480 },
    ramps: { key: 'ways-ramps', w: 1600, h: 400 },
    leaf: { key: 'ways-leaf', w: 256, h: 320 },
    stone: { key: 'ways-stone', w: 160, h: 280 }
  };
  // scrollFactor 0 is the screen-fixed Machin Shin edge. The other three move at
  // different rates so the void, the distant islands, and the nearer ramps separate.
  const BACKDROP_LAYERS = [
    { name: 'void', scrollFactor: 0.08, texture: 'ways-void', depth: 0 },
    { name: 'islands', scrollFactor: 0.26, texture: 'ways-islands', depth: 1 },
    { name: 'ramps', scrollFactor: 0.52, texture: 'ways-ramps', depth: 2 },
    { name: 'machin', scrollFactor: 0, texture: null, depth: 8 }
  ];
  const CUES = {
    hit: (sfx, heavy) => sfx.hit(!!heavy),
    whiff: (sfx) => sfx.whiff(),
    kick: (sfx) => sfx.swing(),
    jump: (sfx) => sfx.jump(),
    land: (sfx) => sfx.land(),
    step: (sfx) => sfx.step(),
    grunt: (sfx) => sfx.grumble(),
    death: (sfx) => sfx.thud(),
    fireball: (sfx) => sfx.fire(),
    boom: (sfx) => sfx.boom(),
    balefire: (sfx) => sfx.balefire(),
    crack: (sfx) => sfx.creak(),
    fall: (sfx) => sfx.fall(),
    tell: (sfx) => sfx.glint(),
    strike: (sfx) => sfx.impact(),
    checkpoint: (sfx) => sfx.pickup(),
    wave: (sfx) => sfx.horn(),
    clear: (sfx) => sfx.levelClear(),
    gameover: (sfx) => sfx.gameOver(),
    hurt: (sfx) => sfx.hurt()
  };

  function playCue(sfx, name, arg) {
    const fn = CUES[name];
    if (!sfx || typeof fn !== 'function') return false;
    fn(sfx, arg);
    return true;
  }

  return { MUSIC_STAGE, TEXTURE_LIMIT, TEXTURES, BACKDROP_LAYERS, CUES, playCue };
});
