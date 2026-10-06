// Child-process probe for Stage 3 URL parameters (location.search is read once at module load): run with
// RWB_SEARCH='?stage=3&s3=1...' and it prints what production preload queued and what create() built.
import { readFileSync } from 'node:fs';
import { stage1Simulation, withSeed } from './stage1-simulation.mjs';
import { stage3Simulation } from './stage3-harness.mjs';

const { Stage1 } = await import('../../src/stage1.js');
const { STAGE3_ATLASES } = await import('../../src/stage3.js');
const { STAGE_TEXTURES, STAGE_CHARS, resolveStage } = await import('../../src/stages.js');

const meta = k => JSON.parse(readFileSync(new URL(STAGE3_ATLASES.includes(k) ? `../../assets/stage3/chars/${k}.anims.json` : `../../assets/chars/${k}.anims.json`, import.meta.url)));

// resident textures: mark Stage 2's textures and characters as resident
const resident = new Set([
  ...STAGE_TEXTURES[2],
  ...STAGE_CHARS[2].flatMap(k => meta(k).pages.flatMap(pg => [pg, pg + '_nl'])),
]);

const queued = [], removed = [];
const p = Object.assign(new Stage1(), {
  sys: { settings: { data: undefined } }, game: { canvas: null },
  load: new Proxy({}, { get: (t, k) => k === 'on' || k === 'setCORS' ? () => {} : key => { queued.push(typeof key === 'object' ? key.key : String(key)); } }),
  textures: { exists: k => resident.has(k), remove: key => { resident.delete(key); removed.push(key); } },
  anims: { exists: () => false, remove() {} },
  cache: {
    json: {
      get: k => {
        if (!/\.A$/.test(k)) return undefined;
        const base = k.slice(0, -2);
        if (STAGE3_ATLASES.includes(base)) return undefined;
        return meta(base);
      }
    }
  },
});
p.preload();

const targetStage = resolveStage(undefined, new URLSearchParams(location.search));
const out = withSeed(1, () => {
  const h = targetStage === 3 ? stage3Simulation({ mode: '' }) : stage1Simulation({ mode: '' });
  const s = h.s;
  for (let i = 0; i < 90; i++) h.step();
  const r = { stageNo: s.stageNo, kit: !!s.kit, started: !!s.started, cutscene: !!s.cutscene, music: s.music?.state, zones: s.zones.length, boss: !!s.zones.at(-1)?.boss };
  h.destroy(); return r;
});
console.log(JSON.stringify({ queued, removed, ...out }));
