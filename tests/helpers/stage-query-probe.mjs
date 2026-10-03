// Child-process probe for URL parameters (location.search is read once at module load): run with
// RWB_SEARCH='?stage=2...' and it prints what production preload queued and what create() built.
import { readFileSync } from 'node:fs';
import { stage1Simulation, withSeed } from './stage1-simulation.mjs';
const meta = k => JSON.parse(readFileSync(new URL(`../../assets/chars/${k}.anims.json`, import.meta.url)));
const { Stage1 } = await import('../../src/stage1.js');
// preload with a recording loader stub (no Phaser): which stage's art gets queued, which gets released
const { STAGE_TEXTURES } = await import('../../src/stage2.js');
const { TWIX_ART_KEYS } = await import('../../src/powers.js');
const { STAGE_CHARS, stageFromQuery } = await import('../../src/stages.js');
// resident textures: as if the player had just played the OTHER stage
const other = stageFromQuery(new URLSearchParams(location.search)) === 2 ? 1 : 2;
const resident = new Set([...STAGE_TEXTURES[other], ...(other === 1 ? TWIX_ART_KEYS : []), ...STAGE_CHARS[other].flatMap(k => meta(k).pages.flatMap(pg => [pg, pg + '_nl']))]);
const queued = [], removed = [];
const p = Object.assign(new Stage1(), {
  sys: { settings: { data: undefined } }, game: { canvas: null },
  load: new Proxy({}, { get: (t, k) => k === 'on' || k === 'setCORS' ? () => {} : key => { queued.push(typeof key === 'object' ? key.key : String(key)); } }),
  textures: { exists: k => resident.has(k), remove: key => { resident.delete(key); removed.push(key); } }, anims: { exists: () => false, remove() {} }, cache: { json: { get: k => /\.A$/.test(k) ? meta(k.slice(0, -2)) : undefined } },   // as if both stages had been loaded
});
p.preload();
const out = withSeed(1, () => {
  const h = stage1Simulation({ mode: '' }), s = h.s;
  for (let i = 0; i < 90; i++) h.step();
  const r = { stageNo: s.stageNo, kit: !!s.kit, started: !!s.started, cutscene: !!s.cutscene, music: s.music?.state, zones: s.zones.length, boss: s.zones.at(-1).boss };
  h.destroy(); return r;
});
console.log(JSON.stringify({ queued, removed, ...out }));
