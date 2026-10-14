// Stage 7 table. Bytes sit in the Stage 7 source budget, not the Stage 1 gate.
import { sfx } from './audio.js';
import { stage7Say } from './stage7-voice.js';

export const STAGE7_CHARS = Object.freeze(['riley', 'grunt', 'spear']);
export const STAGE7_TEXTURES = Object.freeze(['bg7far', 'bg7mid', 'bg7mid2', 'bg7mid3', 'bg7mid4', 'bg7floor', 'bg7floor2', 'bg7floor3', 's7dancer', 's7veiled', 's6fade', 's7asmo', 's7moir', 's7lan', 'moiPortrait', 'lanPortrait', 'asmoPortrait', 's7note', 's7column', 's7shard', 's7earth', 's7shield', 's6streak', 's7dust', 's7ring', 's7portal', 's7crate', 's7planks', 'story7p1', 'story7p2', 'story7p3']);

export const STAGE7 = {
  no: 7, key: 'rhuidean', title: 'RHUIDEAN — THE AIEL WASTE', loading: 'Loading Rhuidean…',
  zones: Object.freeze([
    { at: 260, l: 0, r: 1280, waves: [[['grunt', 'L', 0], ['grunt', 'R', 1.0]], [['spear', 'R', 0], ['dancer', 'L', 0.8], ['grunt', 'R', 1.6]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['dancer', 'R', 0], ['veiled', 'L', 0.6]], [['grunt', 'L', 0], ['dancer', 'R', 0.5], ['veiled', 'R', 1.2], ['spear', 'L', 1.8]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['fadelt', 'R', 0], ['grunt', 'L', 0.4], ['dancer', 'R', 0.9]], [['veiled', 'T', 0], ['spear', 'L', 0.5], ['grunt', 'R', 1.0], ['dancer', 'L', 1.6]]] },
    { at: 4140, l: 3920, r: 5200, boss: true },
  ].map(z => Object.freeze(z))),
  drops: Object.freeze([
    { zone: 0, wave: 0, kind: 'lightning', delay: 1.2 },
    { zone: 0, wave: 1, kind: 'fireshield', delay: 1.0 },
    { zone: 1, wave: 0, kind: 'airwhip', delay: 1.0 },
    { zone: 1, wave: 1, kind: 'angreal', delay: 1.2 },
    { zone: 2, wave: 0, kind: 'ter?', delay: 1.0 },
    { zone: 2, wave: 1, kind: 'lightning', delay: 1.0 },
  ].map(d => Object.freeze(d))),
  bossDrop: Object.freeze({ phase: 2, kind: 'saangreal' }),
  ribbon: Object.freeze({ zone: 1, wave: 0, delay: 1.4 }),
  crates: Object.freeze([[880, 600], [2140, 650], [3330, 610], [4600, 596]]),
  crateProp: 's7crate',
  cratePlanks: 's7planks',
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'asmodean', name: 'ASMODEAN', portrait: 'asmoPortrait', introVoice: 'st7_asmo_intro_01' }),
  music: Object.freeze({ stage: 'stage7', boss: 'boss7' }),
  kit: null,
  next: () => ({ stage: 1 }),
  onBossPhase: (scene, c, ph) => {
    if (ph === 2) { stage7Say('st7_asmo_p2_01', scene.caption, false); scene.fx.trauma = 0.5; scene.hud?.flashText('THE GLASS SINGS'); }
    if (ph === 3) { stage7Say('st7_asmo_p3_01', scene.caption, false); scene.hud?.flashText('STOP THE CHANNEL'); }
    if (ph === scene.bossDrop?.phase && scene.powerDrops) scene.powerDrops.push({ kind: scene.bossDrop.kind, t: 0.6 });
  },
  bossDown: (scene) => {
    scene.kit?.clearHazards?.();
    const later = (ms, fn) => scene.time.delayedCall(ms, () => { if (!scene.gameOver) fn(); });
    later(700, () => stage7Say('st7_clear_01', scene.caption));
    later(3600, () => stage7Say('st7_clear_02', scene.caption));
    later(5800, () => stage7Say('st7_clear_03', scene.caption));
    later(7600, () => stage7Say('riley_st7_victory_01', scene.caption));
    later(9200, () => { scene.ended = true; sfx.levelClear(); scene.hud?.stageClear(scene.stats()); scene.music?.set('clear'); later(900, () => { scene.clearShown = true; }); });
  },
};
