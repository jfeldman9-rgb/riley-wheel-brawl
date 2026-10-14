import { sfx } from './audio.js';
import { stage7Say } from './stage7-voice.js';
export const STAGE7_CHARS = Object.freeze(['riley', 'grunt', 'spear']);
export const STAGE7_TEXTURES = Object.freeze([
  'bg7far', 'bg7mid', 'bg7mid2', 'bg7mid3', 'bg7mid4', 'bg7floor', 'bg7floor2', 'bg7floor3',
  's7dancer', 's7veiled', 's6fade', 's7asmo', 's7moir', 's7lan', 'moiPortrait', 'lanPortrait', 'asmoPortrait',
  's7note', 's7column', 's7shard', 's7earth', 's7shield', 's7dust', 's7ring', 's7portal', 's7crate', 's7planks', 's7ribbon', 's7arrow', 's7veil', 's7streak',
  'story7p1', 'story7p2', 'story7p3',
]);
export const STAGE7 = {
  no: 7, key: 'rhuidean', title: 'RHUIDEAN — THE AIEL WASTE', loading: 'Loading Rhuidean…',
  zones: Object.freeze([
    { at: 260, l: 0, r: 1280, waves: [[['grunt','L',0],['grunt','R',1.4]], [['spear','R',0],['dancer','L',1.6],['grunt','R',2.6]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['dancer','R',0],['veiled','L',1.4]], [['grunt','L',0],['dancer','R',1.5],['veiled','R',2.8],['spear','L',3.8]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['fadelt','R',0],['grunt','L',0.4],['dancer','R',0.9]], [['veiled','T',0],['spear','L',0.5],['grunt','R',1],['dancer','L',1.6]]] },
    { at: 4140, l: 3920, r: 5200, boss: true },
  ].map(Object.freeze)),
  drops: Object.freeze(['lightning','fireshield','airwhip','angreal','ter?','lightning'].map((kind,i) => Object.freeze({ zone: i >> 1, wave: i % 2, kind, delay: 1.2 }))),
  bossDrop: Object.freeze({ phase: 2, kind: 'saangreal' }), ribbon: Object.freeze({ zone: 1, wave: 0, delay: 1.4 }),
  crates: Object.freeze([[880,600],[2140,650],[3330,610],[4600,596]]), crateProp: 's7crate', cratePlanks: 's7planks',
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'asmodean', name: 'ASMODEAN', portrait: 'asmoPortrait', introVoice: 'st7_asmo_intro_01' }),
  music: Object.freeze({ stage: 'stage7', boss: 'boss7' }), chars: STAGE7_CHARS, textures: STAGE7_TEXTURES, kit: null,
  next: () => ({ stage: 1 }),
  onBossPhase(s, boss, phase) {
    stage7Say('st7_asmo_p' + phase + '_01', s.caption);
    s.hud?.flashText(phase === 2 ? 'THE GLASS SINGS — LEAVE THE WHITE COLUMN' : 'THE KEY — THREE HITS OR A THROW');
    if (phase === 2) s.powerDrops?.push({ kind: 'saangreal', t: 0.6 });
    s.kit?.onAsmodeanPhase(boss, phase);
  },
  bossDown(s) {
    s.kit?.beginOutro();
    const lines = ['st7_clear_01','st7_clear_02','st7_clear_03','riley_st7_victory_01'];
    [0.7,5.8,9.0,11.4].forEach((t,i) => s.kit?.later(t, () => stage7Say(lines[i], s.caption)));
    s.kit?.later(13.4, () => { s.ended = true; sfx.levelClear(); s.hud?.stageClear(s.stats()); s.music?.set('clear'); s.kit?.later(0.9, () => { s.clearShown = true; }); });
  },
};
