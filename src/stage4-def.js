// Stage 4 table. Kept out of stages.js so the Stage 1 pre-fight inventory stays
// inside its 25 MB gate; these bytes are reported under the Stage 4 source budget.
import { sfx } from './audio.js';

export const STAGE4_CHARS = Object.freeze(['riley', 'cutthroat', 'hound', 'loial', 'cultist', 'draghkar']);
export const STAGE4_TEXTURES = Object.freeze(['bg4far', 'bg4mid', 'bg4mid2', 'bg4floor', 'bg4floor2', 'bg4floor3', 's4vent', 's4tip', 's4seg', 's4wall', 's4shaft', 's4tower', 's4rubble', 's4drag', 's4cult', 's4bolt', 's4fog', 'story4p1', 'story4p2', 'story4p3', 'draghkarPortrait', 'crate', 'planks', 'ribbon']);

export const STAGE4 = {
  no: 4, key: 'shadar', title: 'SHADAR LOGOTH — THE DRAGHKAR', loading: 'Loading Shadar Logoth…',
  zones: Object.freeze([
    { at: 260, l: 0, r: 1280, waves: [[['cutthroat', 'R', 0], ['cultist', 'R', 1.0]], [['cultist', 'L', 0], ['cutthroat', 'T', 0.8], ['hound', 'R', 1.6]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['cultist', 'R', 0], ['cutthroat', 'R', 0.6]], [['cultist', 'L', 0], ['hound', 'R', 0.5], ['cutthroat', 'R', 1.6]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['cultist', 'R', 0], ['cutthroat', 'L', 0.7]], [['hound', 'R', 0], ['cultist', 'T', 0.6], ['cutthroat', 'R', 1.4]]] },
    { at: 4140, l: 3920, r: 5200, boss: true },
  ].map(z => Object.freeze(z))),
  drops: Object.freeze([
    { zone: 0, wave: 0, kind: 'angreal', delay: 1.2 },
    { zone: 0, wave: 1, kind: 'lightning', delay: 1.0 },
    { zone: 1, wave: 0, kind: 'fireshield', delay: 1.0 },
    { zone: 1, wave: 1, kind: 'airwhip', delay: 1.2 },
    { zone: 2, wave: 0, kind: 'ter?', delay: 1.0 },
    { zone: 2, wave: 1, kind: 'angreal', delay: 1.0 },
  ].map(d => Object.freeze(d))),
  bossDrop: Object.freeze({ phase: 2, kind: 'saangreal' }),
  ribbon: Object.freeze({ zone: 1, wave: 0, delay: 2.0 }),
  crates: Object.freeze([[880, 600], [2140, 650], [3330, 610], [4600, 596]]),
  crateProp: 'crate',
  cratePlanks: 'planks',
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'draghkar', name: 'THE DRAGHKAR', portrait: 'draghkarPortrait' }),
  phaseLines: Object.freeze({
    2: Object.freeze({ who: 'DRAGHKAR', text: 'Come closer.', flash: 'THE DRAGHKAR CROONS' }),
    3: Object.freeze({ who: 'NARRATOR', text: 'Mashadar closes in.', flash: 'MASHADAR CLOSES IN' }),
  }),
  music: Object.freeze({ stage: 'stage4', boss: 'boss4' }),
  kit: null,
  next: () => ({ stage: 1 }),
  onBossPhase: (scene, c, ph) => {
    const L = STAGE4.phaseLines[ph];
    if (L) { scene.caption?.(L.who, L.text); scene.fx.trauma = 0.5; scene.hud?.flashText(L.flash); }
    if (ph === scene.bossDrop.phase && scene.powerDrops) scene.powerDrops.push({ kind: scene.bossDrop.kind, t: 0.6 });
  },
  bossDown: (scene) => {
    if (scene.kit) scene.kit.clearHazards();
    const cap = (who, text) => scene.caption?.(who, text);
    scene.time.delayedCall(900, () => cap('DRAGHKAR', 'The song breaks.'));
    scene.time.delayedCall(3200, () => cap('RILEY', 'The trail goes underground. A Waygate.'));
    scene.time.delayedCall(5600, () => cap('LOIAL', 'Riley, the Ways are dark. Nobody goes into the Ways.'));
    scene.time.delayedCall(8000, () => cap('RILEY', 'Then show me how.'));
    scene.time.delayedCall(9200, () => { scene.ended = true; sfx.levelClear(); scene.hud.stageClear(scene.stats()); scene.music?.set('clear'); scene.time.delayedCall(1200, () => scene.clearShown = true); });
  },
};
