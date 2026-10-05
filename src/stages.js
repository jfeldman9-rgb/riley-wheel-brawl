// Stage table and unified registry. Stage 1 (Emond's Field), Stage 2 (Baerlon and the Whitecloaks),
// and Stage 3 (Caemlyn and the Myrddraal) are registered here in STAGES[n].
import { DROPS, BOSS_DROP } from './powers.js';
import { sfx, say } from './audio.js';

export const STAGE_COUNT = 2;

/**
 * Returns true if stage n is enabled given URL query params q.
 * Stages 1 and 2 are always enabled; Stage 3 requires s3=1.
 */
export function stageEnabled(n, q) {
  if (n === 1 || n === 2) return true;
  if (n === 3) return !!(q && q.get && q.get('s3') === '1');
  return false;
}

/**
 * Maximum stage available given URL query params q.
 * Returns 3 if s3=1 is set, otherwise 2.
 */
export function maxStage(q) {
  return stageEnabled(3, q) ? 3 : 2;
}

/** ?stage=2 (or ?stage=3&s3=1); anything else is Stage 1 */
export function stageFromQuery(q) {
  const n = q && q.get ? +q.get('stage') : 0;
  if (n === 3 && stageEnabled(3, q)) return 3;
  if (n === 2) return 2;
  return 1;
}

/** scene data (restart({ stage })) wins over the URL */
export function resolveStage(data, q) {
  if (data && (data.stage === 1 || data.stage === 2)) return data.stage;
  if (data && data.stage === 3 && stageEnabled(3, q)) return 3;
  return stageFromQuery(q);
}

// Characters whose atlas pages each stage needs resident (anims.json for all of them load at boot; they are tiny).
export const STAGE_CHARS = Object.freeze({
  1: Object.freeze(['riley', 'grunt', 'spear', 'hound', 'chief', 'loial']),
  2: Object.freeze(['riley', 'zealot', 'archer', 'hound', 'byar', 'loial']),
  3: Object.freeze(['riley', 'riley3', 'cutthroat', 'zealot', 'archer', 'hound', 'fade', 'loial']),
});

// Textures that each stage owns, plus textures shared between stages.
export const SHARED_TEXTURES = Object.freeze(['crate', 'planks']);
export const STAGE_TEXTURES = Object.freeze({
  1: Object.freeze(['far', 'mid0', 'mid1', 'floor', 'floor2', 'cart', 'barrel', 'staves']),
  2: Object.freeze(['far2', 'mid2a', 'mid2b', 'floor2a', 'floor2b', 'crate', 'planks', 'beam2', 'arrow', 'torch', 'ribbon', 'story_panel_1', 'story_panel_2', 'story_panel_3']),
  3: Object.freeze(['far3_day', 'far3_night', 'mid3a', 'mid3b', 'floor3a', 'floor3b', 'floor3c', 'crate', 'planks', 'rooftiles', 'shadowpool', 'shadowburst', 'fade_far', 'story3_panel_1', 'story3_panel_2', 'story3_panel_3']),
  shared: SHARED_TEXTURES,
});

// Lane bands for Jaret Byar's archer volleys: the walkable depth band split into thirds.
export const VOLLEY_BANDS = Object.freeze([[572, 611], [611, 651], [651, 690]]);
export const VOLLEY = Object.freeze({ warn: 1.45, rain: 0.45, every: [7.5, 9.5], dmg: 12 });

/**
 * Kit interface contract (implemented by Stage2Kit and Stage3Kit):
 *
 * Lifecycle:
 *   get ambient(): number
 *   get ambientUnlit(): number
 *   build(): void
 *   start(): void
 *   destroy(): void
 *   update(dt: number): void
 *
 * Zones:
 *   onZoneClear(i: number): void
 *
 * Hazards:
 *   clearHazards(): void
 *   threats(): { [key: string]: any }
 *
 * Ribbon:
 *   dropRibbon(): void
 *   collectRibbon(pickup: any): void
 *   ribbons: number
 *
 * Enemy hooks:
 *   koStars(e: any): void
 *   telegraph(e: any): void
 *   glint(): void
 *   hint(key: string): void
 *
 * Stats:
 *   stats: { [key: string]: number }
 *
 * Optional:
 *   claimMudJoke?: () => boolean (Stage 2 only)
 */

export const STAGE1_ZONES = Object.freeze([
  { at: 260, l: 0, r: 1280, intro: 'trolloc_intro_01', waves: [[['grunt', 'R', 0], ['grunt', 'R', 1.4]], [['grunt', 'L', 0], ['spear', 'R', 0.6]]] },
  { at: 1500, l: 1240, r: 2520, waves: [[['spear', 'R', 0], ['grunt', 'R', 0.7]], [['hound', 'L', 0], ['grunt', 'R', 0.4], ['grunt', 'R', 2.0]]] },
  { at: 2800, l: 2560, r: 3840, waves: [[['hound', 'R', 0], ['hound', 'L', 0.5]], [['spear', 'R', 0], ['grunt', 'L', 0.6], ['hound', 'R', 1.6]]] },
  { at: 4140, l: 3920, r: 5200, boss: true },
].map(z => Object.freeze(z)));

export const STAGE1_BARRELS = Object.freeze([[880, 600], [2140, 650], [3330, 610], [4600, 596]]);

export const STAGE1 = {
  no: 1, key: 'emond', title: "EMOND'S FIELD — WINTERNIGHT", loading: "Loading Emond's Field…",
  zones: STAGE1_ZONES,
  drops: DROPS,
  bossDrop: BOSS_DROP,
  ribbon: null,
  crates: STAGE1_BARRELS,
  crateProp: undefined,
  cratePlanks: undefined,
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'chief', name: 'TROLLOC CHIEFTAIN', portrait: 'bossPortrait', cool: 2.5, nextRoar: 6, introVoice: 'trolloc_heavy_intro_01', sfx: 'roar' }),
  chars: STAGE_CHARS[1],
  textures: STAGE_TEXTURES[1],
  music: Object.freeze({ stage: 'stage1', boss: 'boss1' }),
  ambient: 0x39425f,
  ambientUnlit: 0x5a6482,
  kit: null,
  next: () => ({ stage: 2, fromStage1: true, autostart: true }),
  onBossPhase: (scene, c, ph) => {
    if (ph === 2) { say('chieftain_mid_01', scene.caption); scene.fx.trauma = 0.6; }
    const drop = scene.bossDrop || STAGE1.bossDrop;
    if (drop && ph === drop.phase && scene.powerDrops) scene.powerDrops.push({ kind: drop.kind, t: 0.6 });
    if (ph === 3) { sfx.roar(); scene.hud.flashText('THE CHIEFTAIN IS ENRAGED'); }
  },
  bossDown: (scene, c) => {
    scene.time.delayedCall(900, () => say('chieftain_defeat_01', scene.caption));
    scene.time.delayedCall(3600, () => say('riley_victory_01', scene.caption));
    scene.time.delayedCall(5600, () => say('st1_clear_moiraine_01', scene.caption));
    scene.time.delayedCall(6200, () => { scene.ended = true; sfx.levelClear(); scene.hud.stageClear(scene.stats()); scene.music?.set('clear'); scene.time.delayedCall(1200, () => scene.clearShown = true); });
  },
};

export const STAGE2 = {
  no: 2, key: 'baerlon', title: 'BAERLON — THE WHITECLOAKS', loading: 'Loading Baerlon…',
  // same arena layout as Stage 1 (world 5200 px): street, market, the stable, the barn yard (boss)
  zones: Object.freeze([
    { at: 260, l: 0, r: 1280, intro: 'zealot_intro_01', waves: [[['zealot', 'R', 0], ['zealot', 'R', 1.6]], [['archer', 'R', 0], ['zealot', 'L', 0.8]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['zealot', 'R', 0], ['archer', 'R', 0.6]], [['zealot', 'L', 0], ['archer', 'R', 0.5], ['zealot', 'R', 2.0]]] },
    { at: 2800, l: 2560, r: 3840, stable: true, intro: 'riley_st2_stable_01', waves: [[['hound', 'R', 0], ['hound', 'L', 0.6]], [['zealot', 'R', 0], ['archer', 'L', 0.6], ['hound', 'R', 1.6]]] },
    { at: 4140, l: 3920, r: 5200, boss: true },
  ].map(z => Object.freeze(z))),
  // Every power still appears in every run (the zone-2 joke slot carries Twinkle Toes' ribbon instead of the Twix).
  drops: Object.freeze([
    { zone: 0, wave: 0, kind: 'angreal', delay: 1.2 },
    { zone: 0, wave: 1, kind: 'airwhip', delay: 1.0 },      // pull archers out of their range
    { zone: 1, wave: 0, kind: 'lightning', delay: 1.0 },
    { zone: 1, wave: 1, kind: 'fireshield', delay: 1.4 },   // burns arrows out of the air
    { zone: 2, wave: 0, kind: 'ter?', delay: 1.0 },
    { zone: 2, wave: 1, kind: 'angreal', delay: 1.0 },
  ].map(d => Object.freeze(d))),
  bossDrop: Object.freeze({ phase: 2, kind: 'saangreal' }),
  ribbon: Object.freeze({ zone: 1, wave: 0, delay: 2.6 }),
  crates: Object.freeze([[880, 600], [2140, 650], [3330, 610], [4600, 596]]),
  crateProp: 'crate',
  cratePlanks: 'planks',
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'byar', name: 'JARET BYAR', portrait: 'byarPortrait', cool: 2.2, introVoice: 'byar_intro_01', sfx: 'horn' }),
  // falling stable beams (zone 2): shadow telegraph, then the beam drops
  beams: Object.freeze({ warn: 1.0, every: [2.6, 3.8], dmg: 10, enemyDmg: 18 }),
  chars: STAGE_CHARS[2],
  textures: STAGE_TEXTURES[2],
  music: Object.freeze({ stage: 'stage2', boss: 'boss2' }),
  kit: null,
  next: q => (stageEnabled(3, q) ? { stage: 3, fromStage2: true, autostart: true } : { stage: 1 }),
  onBossPhase: (scene, c, ph) => {
    if (ph === 2) { say('byar_mid_01', scene.caption); scene.fx.trauma = 0.5; scene.hud.flashText('JARET BYAR CALLS HIS ARCHERS'); }
    if (ph === scene.bossDrop.phase && scene.powerDrops) scene.powerDrops.push({ kind: scene.bossDrop.kind, t: 0.6 });
  },
  bossDown: (scene, c) => {
    if (scene.kit) scene.kit.clearHazards();
    scene.time.delayedCall(900, () => say('byar_defeat_01', scene.caption));
    scene.time.delayedCall(4400, () => say('riley_st2_victory_01', scene.caption));
    scene.time.delayedCall(7600, () => say('riley_st2_clear_01', scene.caption));
    scene.time.delayedCall(8200, () => { scene.ended = true; sfx.levelClear(); scene.hud.stageClear(scene.stats()); scene.music?.set('clear'); scene.time.delayedCall(1200, () => scene.clearShown = true); });
  },
};

export const STAGE3 = {
  no: 3, key: 'caemlyn', title: 'CAEMLYN — THE MYRDDRAAL', loading: 'Loading Caemlyn…',
  zones: Object.freeze([
    { at: 260, l: 0, r: 1280, intro: 'cutthroat_intro_01', waves: [[['cutthroat', 'R', 0], ['cutthroat', 'L', 1.2]], [['zealot', 'R', 0], ['cutthroat', 'L', 0.8]]] },
    { at: 1500, l: 1240, r: 2520, waves: [[['cutthroat', 'R', 0], ['archer', 'R', 0.6]], [['cutthroat', 'L', 0], ['cutthroat', 'R', 0.5], ['zealot', 'R', 2.0]]] },
    { at: 2800, l: 2560, r: 3840, waves: [[['cutthroat', 'T', 0], ['cutthroat', 'T', 0.9]], [['hound', 'R', 0], ['cutthroat', 'T', 0.6], ['cutthroat', 'L', 1.4]]] },
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
  boss: Object.freeze({ type: 'fade', name: 'THE MYRDDRAAL', portrait: 'fadePortrait' }),
  chars: STAGE_CHARS[3],
  textures: STAGE_TEXTURES[3],
  music: Object.freeze({ stage: 'stage3', boss: 'boss3' }),
  kit: null,
  next: () => ({ stage: 1 }),
  onBossPhase: (scene, c, ph) => {
    if (ph === scene.bossDrop.phase && scene.powerDrops) scene.powerDrops.push({ kind: scene.bossDrop.kind, t: 0.6 });
  },
  bossDown: (scene, c) => {
    if (scene.kit) scene.kit.clearHazards();
    scene.time.delayedCall(900, () => say('fade_defeat_01', scene.caption));
    scene.time.delayedCall(4000, () => say('riley_st3_victory_01', scene.caption));
    scene.time.delayedCall(7000, () => say('riley_st3_clear_01', scene.caption));
    scene.time.delayedCall(7600, () => { scene.ended = true; sfx.levelClear(); scene.hud.stageClear(scene.stats()); scene.music?.set('clear'); scene.time.delayedCall(1200, () => scene.clearShown = true); });
  },
};

export const STAGES = Object.freeze({
  1: STAGE1,
  2: STAGE2,
  3: STAGE3,
});

