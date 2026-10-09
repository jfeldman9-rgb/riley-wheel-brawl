// Stage 6 table. Bytes sit in the Stage 6 source budget, not the Stage 1 gate.
import { sfx } from './audio.js';
import { stage6Say } from './stage6-voice.js';

export const STAGE6_CHARS = Object.freeze(['riley', 'grunt', 'spear', 'hound']);
export const STAGE6_TEXTURES = Object.freeze(['bg6far', 'bg6mid', 'bg6mid2', 'bg6floor', 'bg6floor2', 'bg6floor3', 's6gray', 's6fade', 's6belal', 's6rand', 'randPortrait', 'belalPortrait', 's6storm', 's6net', 's6lamp', 's6oil', 's6hatch', 's6call', 's6ray', 's6ribbon', 's6crate', 's6streak', 's6def', 'story6p1', 'story6p2', 'story6p3']);

export const STAGE6 = {
  no: 6, key: 'tear', title: 'THE STONE OF TEAR', loading: 'Loading the Stone…',
  zones: Object.freeze([
    { at: 260, l: 0, r: 1280, waves: [[['grunt', 'B', 0], ['grunt', 'L', 1.2]], [['spear', 'R', 0], ['cutthroat', 'L', 0.6], ['hound', 'R', 1.6]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['grayman', 'T', 0], ['grunt', 'R', 0.8]], [['cutthroat', 'L', 0], ['spear', 'R', 0.5], ['grunt', 'R', 1.8]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['fadelt', 'R', 0], ['grunt', 'L', 0.4], ['grunt', 'R', 0.8]], [['grayman', 'T', 0], ['hound', 'L', 0.6], ['spear', 'R', 1.2], ['grunt', 'L', 1.8]]] },
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
  ribbon: Object.freeze({ zone: 1, wave: 0, delay: 1.4 }),
  crates: Object.freeze([[880, 600], [2140, 650], [3330, 610], [4600, 596]]),
  crateProp: 's6crate',
  cratePlanks: 's6planks',
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'belal', name: "BE'LAL", portrait: 'belalPortrait', introVoice: 'belal_intro_01' }),
  music: Object.freeze({ stage: 'stage6', boss: 'boss6' }),
  kit: null,
  next: () => ({ stage: 1 }),
  onBossPhase: (scene, c, ph) => {
    if (ph === 2) { stage6Say('belal_net_01', scene.caption, false); scene.fx.trauma = 0.5; scene.hud?.flashText('THE NETWEAVER DRAWS HIS LINES'); }
    if (ph === 3) { stage6Say('belal_mid_01', scene.caption, false); scene.hud?.flashText('CALLANDOR FLARES'); }
    if (ph === scene.bossDrop?.phase && scene.powerDrops) scene.powerDrops.push({ kind: scene.bossDrop.kind, t: 0.6 });
  },
  bossDown: (scene) => {
    scene.kit?.clearHazards?.();
    const cap = (who, text) => scene.caption?.(who, text);
    const later = (ms, fn) => scene.time.delayedCall(ms, () => { if (!scene.gameOver) fn(); });
    later(700, () => { cap('MOIRAINE', 'Not today, Netweaver.'); stage6Say('st6_moiraine_01', null); });
    later(2800, () => stage6Say('riley_st6_victory_01', scene.caption));
    later(4800, () => stage6Say('st6_clear_01', scene.caption));
    later(6800, () => stage6Say('st6_clear_02', scene.caption));
    later(8600, () => stage6Say('st6_clear_03', scene.caption));
    later(9800, () => { scene.ended = true; sfx.levelClear(); scene.hud?.stageClear(scene.stats()); scene.music?.set('clear'); later(900, () => { scene.clearShown = true; }); });
  },
};
