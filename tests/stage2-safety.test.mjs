// Production Stage 2 hazard/lifecycle regressions. Headless logic, not device or render evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensions } from '../tools/audit-stage1.mjs';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { Byar, Archer } = await import('../src/whitecloaks.js');
const { VOLLEY, VOLLEY_BANDS } = await import('../src/stages.js');
const { Stage2Kit, BARN_ART, STAGE_TEXTURES, queueStage2 } = await import('../src/stage2.js');
const { LANE_TOP, LANE_BOT, q } = await import('../src/config.js');
function arena(fn) { return withSeed(104, () => {
  const h = stage1Simulation({ mode: '', stage: 2 }), s = h.s;
  try {
    for (let i = 0; i < 120 && !s.cutscene; i++) h.step();
    s.endTwixCutscene('skip'); h.step(); s.powerDrops = []; s.spawnQueue = []; s.waveWait = 999;
    for (const e of s.enemies) e.destroy(); s.enemies = []; s.riley.x = 400;
    const b = new Byar(s, 950, 630); b.entering = false; b.phase = 3; b.hp = 110;
    b.cool = 99; b.nextVolley = 99; b.nextTorch = 99; b.nextParry = 99;
    s.boss = b; s.enemies.push(b); s.zone = { boss: true, l: 0, r: 1280 }; s.locked = true;
    return fn(h, s, s.riley, b);
  } finally { h.destroy(); }
}); }
function steps(h, seconds) { for (let i = 0; i < seconds * 60; i++) h.step(); }

test('volley bands follow the full walkable lane without gaps or overlaps', () => {
  assert.equal(VOLLEY_BANDS[0][0], LANE_TOP); assert.equal(VOLLEY_BANDS.at(-1)[1], LANE_BOT);
  for (let i = 1; i < 3; i++) assert.equal(VOLLEY_BANDS[i - 1][1], VOLLEY_BANDS[i][0]);
});

test('pending volley waits for flying torch and complete 7.5 second fire-patch lifetime', () => arena((h, s, R, b) => {
  s.kit.throwTorch(b); b.nextVolley = 0; b.cool = 0;
  assert.equal(s.kit.volleyReady(), false); assert.equal(s.kit.startVolley(b), false);
  steps(h, 0.9); assert.equal(s.kit.torches.length, 0); assert.equal(s.patches.length, 1);
  assert.equal(s.kit.volleyActive(), false); assert.equal(s.kit.stats.torches, 1);
  steps(h, 6.2); assert.equal(s.kit.volleyActive(), false); assert.equal(s.patches.length, 1);
  assert.equal(s.kit.stats.torches, 1, 'waiting never starts a replacement torch');
  steps(h, 2.3); assert.ok(s.kit.stats.volleys >= 1, 'volley begins after old patch expires');
}));

test('torch and lob landing marks have filled bright discs, shrinking shadows, and complete cleanup', () => arena((h, s, R, b) => {
  s.kit.throwTorch(b); const k = s.kit.torches[0];
  assert.equal(k.mark.key, 'landing'); assert.equal(k.shadow.key, 'shadow');
  const a = new Archer(s, 1050, 620); a.entering = false; s.enemies.push(a); a.startSkyshot();
  const sky = s.kit.skyArrows[0]; assert.equal(sky.mark.key, 'landing');
  s.kit.clearHazards();
  for (const o of [k.mark, k.shadow, k.img, k.trail, sky.mark, sky.shadow]) assert.equal(o.dead, true);
  assert.deepEqual([s.kit.torches.length, s.kit.skyArrows.length], [0, 0]);
}));

for (const initial of ['idle', 'combo1', 'combo2', 'combo3', 'hurt']) for (let band = 0; band < 3; band++) {
  test(`volley safe band reachable from band ${band} when Riley starts ${initial}`, () => arena((h, s, R, b) => {
    R.y = (VOLLEY_BANDS[band][0] + VOLLEY_BANDS[band][1]) / 2;
    if (initial.startsWith('combo')) R.startCombo(+initial.at(-1)); else R.setState(initial, initial);
    s.kit.startVolley(b); const v = s.kit.volley, safe = [0, 1, 2].find(i => !v.bands.includes(i));
    const target = (VOLLEY_BANDS[safe][0] + VOLLEY_BANDS[safe][1]) / 2, hp = R.hp;
    for (let i = 0; i < 180 && !v.struck; i++) {
      s.inp.held.up = R.y > target + 2; s.inp.held.down = R.y < target - 2;
      h.step();
    }
    assert.equal(v.struck, true); assert.equal(s.kit.bandOf(R.y), safe);
    assert.equal(R.hp, hp); assert.equal(s.kit.stats.volleyHits, 0);
  }));
}

test('pausing freezes volley warnings and resumes from the same timer', () => arena((h, s, R, b) => {
  s.kit.startVolley(b); steps(h, 0.3); const v = s.kit.volley, t = v.t;
  s.setPauseReason('manual', true); steps(h, 3); assert.equal(v.t, t); assert.equal(v.struck, false);
  s.setPauseReason('manual', false); steps(h, 0.3); assert.ok(v.t > t && v.t < VOLLEY.warn);
}));

for (const hazard of ['volley', 'rage', 'torch']) test(`restart mid-${hazard} cleans old markers, emitters and lights`, () => arena((h, s, R, b) => {
  if (hazard === 'volley') s.kit.startVolley(b);
  if (hazard === 'rage') s.kit.rage(b);
  if (hazard === 'torch') s.kit.throwTorch(b);
  const kit = s.kit, old = [...(kit.barn?.emitters || []), ...(kit.barn?.images || []), ...(kit.volley?.markers || []), ...kit.torches.flatMap(k => [k.img, k.trail, k.mark, k.shadow])];
  s.scene.restart({ stage: 2 }); h.step();
  assert.notEqual(s.kit, kit); for (const o of old) assert.equal(o.dead, true);
  assert.equal(h.resources().lights, h.baseline.lights); assert.equal(s.kit.barn, null);
  assert.equal(s.kit.torches.length, 0); assert.equal(s.kit.volley, null);
}));

test('lightning is a single soft decay <=0.15 with no ambient flash, and respects both opt-outs', () => arena((h, s) => {
  const ambient = []; s.lights.setAmbientColor = c => ambient.push(c);
  s.kit.flashAllowed = true; s.kit.lightningT = 0; s.kit.updateLightning(1 / 60);
  const values = [s.kit.flash.alpha]; for (let i = 0; i < 24; i++) { s.kit.updateLightning(1 / 60); values.push(s.kit.flash.alpha); }
  assert.ok(values.every(a => a >= 0 && a <= 0.15)); assert.ok(values.every((a, i) => !i || a <= values[i - 1])); assert.deepEqual(ambient, []);
  q.set('flash', '0'); const off = new Stage2Kit(s); q.delete('flash'); assert.equal(off.flashAllowed, false);
  const old = globalThis.matchMedia; globalThis.matchMedia = () => ({ matches: true });
  try { assert.equal(new Stage2Kit(s).flashAllowed, false); } finally { globalThis.matchMedia = old; }
}));

test('Stage2 light priority caps worst-case P3 at ten active lights and recovers suppressed lights', () => arena((h, s, R, b) => {
  s.kit.rage(b); s.kit.throwTorch(b); s.addPatch(300, 620); s.addPatch(500, 670); s.addPatch(700, 610);
  assert.equal(s.patches.length, 2); s.powers.activate('fireshield'); R.saidin = 100; s.spawnFireball(R);
  s.beam = { lights: [0, 1].map(i => s.lights.addLight(500 + i * 100, 500, 300, 0xffffff, 1)) };
  for (let i = 0; i < 6; i++) s.fx.boom(300 + i * 70, 600);
  s.kit.update(1 / 60); s.updateCamera(0);
  assert.ok(s.kit.lightBudget.candidates > 10); assert.equal(s.kit.lightBudget.active, 10);
  assert.equal(s.heroLight.visible, true); assert.ok(s.beam.lights.every(L => L.visible));
  for (const b of s.fx.booms) s.lights.removeLight(b.L); s.fx.booms = [];
  s.updateCamera(0); assert.ok(s.kit.lightBudget.active <= 10);
}));

test('quality downgrade thins already-created barn emitters and back rain', () => arena((h, s, R, b) => {
  s.kit.rage(b); s.kit.setQuality(2); assert.equal(s.kit.rainBack.frequency, 80);
  for (const e of s.kit.barn.emitters) { assert.ok(Number.isFinite(e.fullFrequency) && e.fullFrequency > 0); assert.equal(e.frequency, e.fullFrequency * 3); }
}));

test('an uncollected ribbon is collected once on zone clear', () => arena((h, s) => {
  s.kit.dropRibbon(); const score = s.riley.score;
  s.kit.onZoneClear(1); assert.equal(s.kit.stats.ribbon, 1); assert.equal(s.riley.score, score + 1000);
  assert.ok(!s.pickups.some(p => p.kind === 'ribbon')); s.kit.onZoneClear(1); assert.equal(s.kit.stats.ribbon, 1);
}));

 test('painted barn fades in over 1.5 seconds and all flame loops use genuine separate frames', () => arena((h, s, R, b) => {
  s.kit.rage(b); const barn = s.kit.barn;
  assert.equal(barn.images.length, 4); assert.equal(barn.overlay.alpha, 0);
  s.kit.update(0.75); assert.equal(barn.overlay.alpha, 0.5);
  const seen = barn.flames.map(() => new Set());
  for (let i = 0; i < 60; i++) { s.kit.update(1 / 60); barn.flames.forEach((f, j) => seen[j].add(f.frame)); }
  assert.equal(barn.overlay.alpha, 1);
  barn.flames.forEach((f, i) => assert.equal(seen[i].size, f.art.frames));
}));

test('fan arrows diverge visibly and keep the shared four-arrow flight bound', () => arena((h, s, R) => {
  const a = new Archer(s, 950, 630), b = new Archer(s, 300, 630); a.entering = b.entering = false;
  s.enemies.push(a, b); a.face(-1); s.kit.fireArrow(a, { fan: true });
  assert.equal(s.kit.arrows.length, 3); assert.equal(s.kit.archerBusy(b, 'shoot'), true);
  assert.equal(s.kit.archerBusy(b, 'skyshot'), false);
  s.kit.updateArrows(0.1, R); const ys = s.kit.arrows.map(k => k.y); assert.equal(new Set(ys).size, 3);
}));

test('painted fire assets load/release only with Stage2 and match accepted frame metadata', () => {
  const meta = JSON.parse(readFileSync(new URL('../assets/bg2/barn-fire.json', import.meta.url)));
  const queued = [], scene = { textures: { exists: () => false }, load: { image: key => queued.push(key), atlas() {}, json() {}, spritesheet: key => queued.push(key) } };
  queueStage2(scene);
  for (const a of [BARN_ART.overlay, ...BARN_ART.flames]) {
    assert.ok(queued.includes(a.key)); assert.ok(STAGE_TEXTURES[2].includes(a.key)); assert.ok(!STAGE_TEXTURES[1].includes(a.key));
  }
  for (const a of BARN_ART.flames) {
    const m = meta.strips.find(m => m.file === a.url); assert.ok(m); assert.equal(m.frameCount, a.frames);
    assert.deepEqual(dimensions(readFileSync(new URL('../' + a.url, import.meta.url))), [a.frames * 256, 384]);
    assert.equal(new Set(m.frames.map(f => f.frameSHA256)).size, a.frames, 'accepted frames have distinct source hashes');
  }
  assert.deepEqual(dimensions(readFileSync(new URL('../' + BARN_ART.overlay.url, import.meta.url))), [1024, 768]);
});

test('continuing after game over in Byar phase3 resumes boss2 without restarting the track', () => arena((h, s, R, b) => {
  const calls = []; s.music.backend = (id, opts) => calls.push({ id, opts });
  s.music.set('boss'); assert.equal(s.music.track, 'boss2');
  s.kit.rage(b); R.lives = 1; R.hp = 0; R.alive = false; s.rileyDied(); steps(h, 2);
  assert.equal(s.gameOver, true); assert.equal(s.music.state, 'gameover');
  s.continueGame(); assert.equal(s.gameOver, false); assert.equal(s.music.state, 'boss');
  assert.equal(calls.at(-1).id, 'boss2'); assert.equal(calls.at(-1).opts.restart, false);
  assert.equal(b.phase, 3); assert.ok(s.kit.barn);
}));
