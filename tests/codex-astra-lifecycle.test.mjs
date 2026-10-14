import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { stage4Simulation } from './helpers/stage4-harness.mjs';
import { Stage1 } from '../src/stage1.js';
import { STAGES } from '../src/stages.js';
import { q } from '../src/config.js';
import { installCutscenes } from '../src/cutscene-hooks.js';
import { installGovernor } from '../src/quality-governor.js';
import { Stage6Kit } from '../src/stage6.js';
import { createPlateStream, STREAMS, residentKeys } from '../src/zone-stream.js';
import { prefetchRand, blobCount, dropBlob } from '../src/rand-call-cutscene.js';
import { strikeRiley } from '../src/stage5-hurt.js';
import { createStone } from '../src/stage6-arena.js';
import { Cutthroat } from '../src/darkfriends.js';
import { Enemy } from '../src/enemies.js';
import { Stalker, Sporepod } from '../src/blightspawn.js';

for (const exit of ['end', 'skip', 'destroy']) test(`ordinary video releases its pause with real Stage1 shutdown ordering: ${exit}`, () => {
  const h = stage1Simulation({ mode: '' }), s = h.s;
  let completion, aborted = 0, continued = 0, active = false;
  const player = { active: false, bless() {}, play(ids, opts) {
    completion = opts.done; active = true;
    return { abort() { aborted++; active = false; }, skip() { completion('skip'); } };
  } };
  s.started = true;
  Object.assign(s.game, { isPaused: false, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } });
  const api = installCutscenes({ root: { document: {}, navigator: {} }, stages: {}, Scene: class {}, player, query: new URLSearchParams('cutscenes=1') });
  assert.equal(api.playFor(s, 2, () => continued++), true);
  const stub = s.cutscene;
  assert.equal(s.game.isPaused, true);
  if (exit === 'destroy') s.game.pendingDestroy = true;
  h.destroy();
  assert.equal(aborted, 1);
  assert.equal(active, false);
  assert.equal(s.cutscene, null);
  if (exit !== 'destroy') assert.equal(s.game.isPaused, false);
  completion(exit); stub.skip(); stub.abort();
  assert.equal(continued, 0);
  assert.equal(aborted, 1, 'disposal is idempotent');
});

for (const stage of [5, 6]) for (const oldZone of [0, 1, 2, 3]) test(`Stage ${stage} build selects opening residency after zone ${oldZone}`, () => {
  const h = stage1Simulation({ mode: '' }), s = h.s, previous = STAGES[stage].kit;
  h.destroy();
  s.zoneI = oldZone; s.camX = 3920;
  const plan = STREAMS[stage], early = residentKeys({ zoneI: 0 }, plan);
  const keys = new Set([...early, plan.zones[3].plate, plan.zones[3].floor]);
  const loads = [], removed = [], observed = [];
  const stop = new Error('build inspected');
  STAGES[stage].kit = class {
    constructor(scene) { this.s = scene; observed.push([scene.zoneI, scene.camX]); }
    build() {
      observed.push([this.s.zoneI, this.s.camX]);
      this.s.textures = { exists: k => keys.has(k), remove(k) { removed.push(k); keys.delete(k); } };
      this.stream = createPlateStream(this.s, stage, { layoutPlates() {} }, key => { loads.push(key); return true; });
      this.stream.sync();
      throw stop;
    }
    destroy() { this.stream?.destroy(); }
  };
  q.set(stage === 6 ? 's6' : 's5', '1');
  try {
    assert.throws(() => s.create({ stage }), err => err === stop);
    assert.deepEqual(observed, [[-1, 0], [-1, 0]], 'both constructor and build see new-run state');
    assert.deepEqual(loads, []);
    assert.deepEqual(keys, early);
    assert.equal(removed.some(k => early.has(k)), false);
  } finally { STAGES[stage].kit = previous; q.delete(stage === 6 ? 's6' : 's5'); h.destroy(); }
});

for (const [from, to, restart] of [[0, 4, false], [2, 5, false], [0, 4, true]]) test(`governor forwards final Stage 6 tier ${from}->${to}${restart ? ' on restart' : ''} and drops a prefetched blob`, async () => {
  dropBlob();
  assert.equal(await prefetchRand('R1', async () => ({ ok: true, blob: async () => new Blob(['clip']) })), true);
  const s = { runId: 1, started: false, fx: { quality: 0 }, setBloom() {}, setBackdropLit() {} };
  const k = s.kit = new Stage6Kit(s), calls = [];
  k.view = { setQuality(v) { this.quality = v; } };
  k.stone = { setQuality(v) { this.quality = v; } };
  const set = k.setQuality.bind(k); k.setQuality = v => { calls.push(v); set(v); };
  const query = new URLSearchParams(`q=${from}`), meter = { lastSampleMs: 10 };
  const game = { rs: 2, scale: { resize() {} }, scene: { getScene: () => s }, renderer: { gl: { getExtension: () => null, getParameter: () => 'gpu' } } };
  const governor = installGovernor(game, { q: query, rs0: 2, vw: 1280, vh: 720, meter, log() {} });
  game.governor();
  if (restart) {
    query.set('q', String(to)); s.started = true; meter.lastSampleMs = 25;
    while (governor.level < to) game.governor();
    s.runId++; s.fx.quality = 0; k.quality = 0; calls.length = 0;
  } else {
    s.started = true; meter.lastSampleMs = 25;
    while (governor.level < to) game.governor();
  }
  game.governor();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(governor.level, to);
  assert.deepEqual([meter.quality, s.fx.quality, k.quality, k.view.quality, k.stone.quality], Array(5).fill(to));
  assert.equal(blobCount(), 0);
  if (restart) assert.deepEqual(calls, [to], 'a restart applies its final tier once');
});

function grabLast(s, type = 'grunt') {
  const e = type === 'grunt' ? new Enemy(s, type, s.riley.x + 92, s.riley.y) : new Cutthroat(s, s.riley.x + 92, s.riley.y);
  e.entering = false; s.enemies = [e];
  s.riley.startGrab(e); s.riley.setState('hold', 'hold'); s.riley.inv = 0;
  return e;
}
function released(s, e) {
  assert.equal(s.riley.held, null);
  assert.equal(e.heldBy, null);
  assert.notEqual(e.state, 'held');
  assert.equal(e.canBeHit, true, 'the final wave enemy can be killed');
}
test('falling Stage 6 lamp frees the last enemy from Riley before knockdown', () => {
  const h = stage1Simulation({ mode: '' }), s = h.s, e = grabLast(s);
  const stone = createStone();
  stone.lamps.push({ zone: 1, x: s.riley.x, y: s.riley.y, t: 1.09, phase: 'swing' });
  try {
    stone.step(1 / 60, { scene: s, riley: s.riley, enemies: s.enemies, zone: 1, stone });
    assert.equal(s.riley.state, 'down'); released(s, e);
    assert.equal(s.hitTarget(s.riley, e, { dmg: 999, kind: 'heavy', down: true, kb: 300, launch: 300 }), true);
    assert.equal(e.alive, false);
  } finally { h.destroy(); }
});
test('Stage 4 tower knockdown releases a held Cutthroat', () => {
  const h = stage4Simulation({ mode: '' }), s = h.s, e = grabLast(s, 'cutthroat');
  try { s.kit.towerHit(s.riley); released(s, e); } finally { h.destroy(); }
});
for (const down of [true, false]) test(`Stage 5 direct ${down ? 'knockdown' : 'lethal DOT'} releases the last held enemy`, () => {
  const h = stage1Simulation({ mode: '' }), s = h.s, e = grabLast(s);
  try {
    assert.equal(strikeRiley(s, down ? 12 : 999, { down, dot: !down }), true);
    released(s, e);
  } finally { h.destroy(); }
});
test('respawn frees an outgoing hold as a backstop', () => {
  const h = stage1Simulation({ mode: '' }), e = grabLast(h.s);
  try { h.s.riley.respawn(); released(h.s, e); } finally { h.destroy(); }
});
test('mixed-class actors have unique IDs and an overlapping swing damages every target once', () => {
  const h = stage1Simulation({ mode: '' }), s = h.s, R = s.riley;
  try {
    const e = new Enemy(s, 'grunt', R.x + 100, R.y);
    // Force the former independent scene allocator to collide with this Enemy.
    s.koCount = e.id - 1;
    const stalker = new Stalker(s, e.x, e.y); stalker.state = 'stalk';
    const pod = new Sporepod(s, e.x, e.y); pod.state = 'idle';
    s.enemies = [e, stalker, pod];
    assert.equal(new Set(s.enemies.map(e => e.id)).size, 3);
    const hp = s.enemies.map(e => e.hp);
    const swing = { dmg: 5, kind: 'light', x0: 0, x1: 200, z0: 0, z1: 210 };
    R.hitIds.clear(); R.facing = 1;
    s.resolveAttack(R, swing);
    assert.ok(s.enemies.every((e, i) => e.hp < hp[i]));
    const after = s.enemies.map(e => e.hp); s.resolveAttack(R, swing);
    assert.deepEqual(s.enemies.map(e => e.hp), after);
  } finally { h.destroy(); }
});
