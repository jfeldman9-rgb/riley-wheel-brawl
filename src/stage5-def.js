// Stage 5 table. Kept out of stages.js so the Stage 1 pre-fight inventory stays
// inside its 25 MB gate. These bytes sit in the Stage 5 source budget.
import { sfx } from './audio.js';
import { stage5Say } from './stage5-voice.js';

export const STAGE5_CHARS = Object.freeze(['riley', 'grunt', 'spear', 'hound', 'loial']);
export const STAGE5_TEXTURES = Object.freeze(['bg5far', 'bg5mid', 'bg5mid2', 'bg5floor', 'bg5floor2', 'bg5floor3', 's5flare', 's5stalk', 's5pod', 's5agin', 's5balt', 's5green', 'story5p1', 'story5p2', 'story5p3', 'aginorPortrait', 'crate', 'planks', 'ribbon']);

export const LAYOUT5 = Object.freeze({
  sunKeys: Object.freeze([{ x: 0, ambient: 0x5c2820 }, { x: 1800, ambient: 0x3a1814 }, { x: 3900, ambient: 0x2a6848 }]),
  lurks: Object.freeze([{ x: 480, y: 640, zone: 0 }, { x: 900, y: 600, zone: 0 }, { x: 1500, y: 650, zone: 1 }, { x: 2000, y: 610, zone: 1 }, { x: 2800, y: 660, zone: 2 }, { x: 3300, y: 620, zone: 2 }]),
  pods: Object.freeze([{ x: 640, y: 670, zone: 0 }, { x: 1800, y: 640, zone: 1 }, { x: 2200, y: 680, zone: 1 }, { x: 3000, y: 640, zone: 2 }, { x: 3450, y: 670, zone: 2 }]),
  trees: Object.freeze([{ x: 760, y: 630, zone: 0, show: true }, { x: 1680, y: 620, zone: 1, ribbon: true }, { x: 2140, y: 650, zone: 1 }]),
  thorns: Object.freeze([{ x: 360, w: 200, zone: 0, band: 0 }, { x: 1400, w: 200, zone: 1, band: 2 }, { x: 1900, w: 180, zone: 1, band: 0 }, { x: 2700, w: 200, zone: 2, band: 1 }]),
  seeps: Object.freeze([{ x: 2900, y: 640, zone: 2 }, { x: 3250, y: 600, zone: 2 }, { x: 3500, y: 670, zone: 2 }]),
});

export const STAGE5 = {
  no: 5, key: 'blight', title: 'THE BLIGHT — THE EYE OF THE WORLD', loading: 'Loading the Blight…',
  zones: Object.freeze([
    { at: 260, l: 0, r: 1280, waves: [[['grunt', 'R', 0], ['stalker', 'L', 1.2]], [['spear', 'R', 0], ['sporepod', 'T', 0.6], ['grunt', 'L', 1.4]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['stalker', 'R', 0], ['sporepod', 'T', 0.4]], [['grunt', 'L', 0], ['stalker', 'R', 0.6], ['sporepod', 'T', 1.4]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['sporepod', 'T', 0], ['spear', 'R', 0.5], ['stalker', 'L', 1.0]], [['hound', 'R', 0], ['stalker', 'L', 0.6], ['grunt', 'R', 1.2], ['sporepod', 'T', 1.8]]] },
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
  ribbon: null,
  crates: Object.freeze([[880, 600], [2140, 650], [3330, 610], [4600, 596]]),
  crateProp: 'crate',
  cratePlanks: 'planks',
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'aginor', name: 'AGINOR', portrait: 'aginorPortrait' }),
  phaseLines: Object.freeze({
    2: Object.freeze({ who: 'AGINOR', text: 'Your strength is wasted on you.', flash: 'BALTHAMEL DROPS FROM THE LEDGE' }),
    3: Object.freeze({ who: 'AGINOR', text: 'The Eye... so much... more!', flash: 'AGINOR DRAWS ON THE EYE' }),
  }),
  music: Object.freeze({ stage: 'stage5', boss: 'boss5' }),
  kit: null,
  next: () => ({ stage: 1 }),
  onBossPhase: (scene, c, ph) => {
    const L = STAGE5.phaseLines[ph];
    if (L) { scene.caption?.(L.who, L.text); scene.fx.trauma = 0.5; scene.hud?.flashText(L.flash); }
    if (ph === 2) stage5Say('aginor_drain_01', scene.caption, false);
    if (ph === 3) stage5Say('aginor_surge_01', scene.caption, false);
    if (ph === scene.bossDrop.phase && scene.powerDrops) scene.powerDrops.push({ kind: scene.bossDrop.kind, t: 0.6 });
  },
  bossDown: (scene) => {
    scene.kit?.onDefeat?.();
    if (scene.kit) scene.kit.clearHazards();
    const cap = (who, text) => scene.caption?.(who, text);
    const timers = [];
    const live = () => {
      const sys = scene.sys;
      if (sys && typeof sys.isActive === 'function') return sys.isActive();
      if (typeof scene.isActive === 'function') return scene.isActive();
      return true;
    };
    const later = (ms, fn) => { const t = scene.time.delayedCall(ms, () => { if (live()) fn(); }); if (t) timers.push(t); };
    const cancel = () => { for (const t of timers) t.remove?.(); timers.length = 0; };
    scene.events?.once?.('shutdown', cancel);
    later(900, () => { cap('AGINOR', 'The Eye burns him hollow.'); stage5Say('aginor_burn_01', null); });
    later(3200, () => stage5Say('riley_st5_victory_01', scene.caption));
    later(5200, () => stage5Say('st5_clear_01', scene.caption));
    later(7600, () => stage5Say('st5_clear_02', scene.caption));
    later(10000, () => stage5Say('st5_clear_03', scene.caption));
    later(11200, () => { scene.ended = true; sfx.levelClear(); scene.hud?.stageClear(scene.stats()); scene.music?.set('clear'); later(1200, () => { scene.clearShown = true; }); });
  },
};
