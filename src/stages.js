// Stage table. Stage 1 (Emond's Field) keeps its original constants inside stage1.js untouched; Stage 2 (Baerlon and
// the Whitecloaks) is described here and the shared scene class reads it when stageNo === 2.
import { LANE_TOP, LANE_BOT } from './config.js';
export const STAGE_COUNT = 2;
/** ?stage=2 (testing / jump-in); anything else is Stage 1 */
export function stageFromQuery(q) { const n = q && q.get ? +q.get('stage') : 0; return n === 2 ? 2 : 1; }
/** scene data (restart({ stage })) wins over the URL */
export function resolveStage(data, q) { return data && (data.stage === 1 || data.stage === 2) ? data.stage : stageFromQuery(q); }
// Characters whose atlas pages each stage needs resident (anims.json for all of them load at boot; they are tiny).
export const STAGE_CHARS = Object.freeze({
  1: Object.freeze(['riley', 'grunt', 'spear', 'hound', 'chief', 'loial']),
  2: Object.freeze(['riley', 'zealot', 'archer', 'hound', 'byar', 'loial']),
});
// Lane bands for Jaret Byar's archer volleys: the walkable depth band split into thirds.
export const VOLLEY_BANDS = Object.freeze(Array.from({ length: 3 }, (_, i) => Object.freeze([Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * i / 3), Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * (i + 1) / 3)])));
export const VOLLEY = Object.freeze({ warn: 1.45, rain: 0.45, every: [7.5, 9.5], dmg: 12 });
export const STAGE2 = Object.freeze({
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
  skipBoss: Object.freeze({ zoneI: 2, x: 3990, camX: 3500 }),
  boss: Object.freeze({ type: 'byar', name: 'JARET BYAR', portrait: 'byarPortrait' }),
  // falling stable beams (zone 2): shadow telegraph, then the beam drops
  beams: Object.freeze({ warn: 1.0, every: [2.6, 3.8], dmg: 10, enemyDmg: 18 }),
});
