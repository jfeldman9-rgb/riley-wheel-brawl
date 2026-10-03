// Angreal / sa'angreal / ter'angreal pickups, their timers, and the Twix campfire cutscene. Production Stage1, Riley,
// Powers and Cutscene logic run in the headless harness (renderer, audio output and HUD drawing are stubs).
// Pickups are dropped with the production dropPickup at Riley's feet; placement is checked on full natural runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { stage1Simulation, withSeed, FULL_STAGE_SEEDS } from './helpers/stage1-simulation.mjs';
const { POWERS, DROPS, BOSS_DROP, LIGHTNING, FIRE_SHIELD, AIR_WHIP, PICKUP_LIFE, ART } = await import('../src/powers.js');
const { TWIX_SCRIPT, holdFor, GUARD } = await import('../src/twix.js');
const { VOICE, EXTRA_VOICE } = await import('../src/audio.js');
const { dimensions } = await import('../tools/audit-stage1.mjs');

const dt = 1 / 60;
const steps = (h, n) => { for (let i = 0; i < n; i++) h.step(dt); };
function started(seed = 1) {
  const h = stage1Simulation({ mode: null }); steps(h, 30);
  assert.equal(h.s.started, true); return h;
}
function walkToFight(h, n = 2, limit = 60 * 60) {
  const s = h.s;
  for (let f = 0; f < limit; f++) {
    const ready = s.enemies.filter(e => e.canBeHit);
    if (ready.length >= n) { s.inp.held = {}; return ready; }
    s.inp.held = { right: !s.zone || s.enemies.length === 0 }; h.step(dt);
  }
  assert.fail('no fight reached');
}
/** drop a pickup on Riley with the production code and let him collect it */
function collect(h, kind) {
  const s = h.s, R = s.riley, n = s.pickups.length;
  const p = s.dropPickup(R.x, R.y, kind);
  for (let f = 0; f < 120 && s.pickups.includes(p); f++) h.step(dt);
  assert.equal(s.pickups.includes(p), false, `${kind} collected`); assert.equal(s.pickups.length, n);
  return p;
}
const world = s => JSON.stringify({ now: s.time.now, R: [s.riley.x, s.riley.y, s.riley.z, s.riley.hp, s.riley.state, s.riley.fi, s.riley.saidin],
  E: s.enemies.map(e => [e.id, e.x, e.y, e.z, e.hp, e.state, e.fi, e.cool, e.vx]), wave: [s.zoneI, s.wave, s.pending.map(p => p.t)],
  P: s.powers && { b: s.powers.boost, t: s.powers.ter }, pick: s.pickups.map(p => [p.kind, p.t]) });

test('ANGREAL: 10 s of cheaper, triple, stronger fireballs and faster saidin; then everything is cleaned up', () => withSeed(3, () => {
  const h = started(), s = h.s, R = s.riley;
  try {
    const lights0 = h.resources().lights;
    collect(h, 'angreal');
    assert.equal(s.powers.boost.kind, 'angreal'); assert.equal(s.powers.castCost(), POWERS.angreal.castCost);
    assert.ok(Math.abs(s.powers.left('boost') - POWERS.angreal.seconds) < 0.1);
    assert.ok(h.observations.hud.some(e => e.method === 'flashText' && /ANGREAL/.test(e.args[0])));
    R.saidin = 50; R.landedHit(5); assert.equal(R.saidin, 50 + 3 * POWERS.angreal.meter, 'meter gain x1.6');
    R.saidin = 100; s.inp.press('special');
    for (let f = 0; f < 60 && !s.fireballs.length; f++) h.step(dt);
    assert.equal(s.fireballs.length, 3, 'three lanes'); assert.equal(R.saidin, 100 - POWERS.angreal.castCost);
    assert.deepEqual(s.fireballs.map(f => f.dmg), [20, 20, 20]);
    assert.equal(s.fireballs.filter(f => f.light).length, 1, 'only the middle fireball spends a scene light');
    steps(h, 60 * 11);
    assert.equal(s.powers.boost, null, 'expired after 10 s'); assert.equal(s.powers.aura, null);
    assert.equal(s.powers.castCost(), 34); assert.equal(s.fireballs.length, 0);
    assert.equal(h.resources().lights, lights0, 'no leaked lights');
  } finally { h.destroy(); }
}));

test("SA'ANGREAL replaces the angreal: free casts, 26-damage fireballs, its own 12 s timer", () => withSeed(4, () => {
  const h = started(), s = h.s, R = s.riley;
  try {
    collect(h, 'angreal'); steps(h, 120);
    collect(h, 'saangreal');
    assert.equal(s.powers.boost.kind, 'saangreal'); assert.ok(Math.abs(s.powers.left('boost') - 12) < 0.1, 'timer restarts at 12 s');
    R.saidin = 0; s.inp.press('special');
    for (let f = 0; f < 60 && !s.fireballs.length; f++) h.step(dt);
    assert.equal(s.fireballs.length, 3); assert.equal(R.saidin, 0, 'free cast with an empty meter');
    assert.deepEqual(s.fireballs.map(f => f.dmg), [26, 26, 26]);
    steps(h, 60 * 11.5); assert.equal(s.powers.boost.kind, 'saangreal');
    steps(h, 60); assert.equal(s.powers.boost, null);
  } finally { h.destroy(); }
}));

test('LIGHTNING: the fireball button casts a free bolt that chains between nearby foes', () => withSeed(5, () => {
  const h = started(), s = h.s, R = s.riley;
  try {
    const [a, b] = walkToFight(h, 2);
    collect(h, 'lightning');
    assert.equal(s.powers.ter.kind, 'lightning'); assert.equal(s.powers.castKind(R), 'lightning');
    for (let f = 0; f < 60 && R.busy; f++) h.step(dt);
    R.face(1); a.x = R.x + 260; b.x = R.x + 470; a.y = b.y = R.y; a.cool = b.cool = 5;
    const hp = [a.hp, b.hp], visuals = h.resources().visuals; R.saidin = 0;
    s.inp.press('special'); h.step(dt);
    assert.equal(R.state, 'cast'); assert.equal(R.castKind, 'lightning');
    for (let f = 0; f < 40 && !s.powers.bolts.length; f++) h.step(dt);
    assert.equal(s.powers.bolts.length, 1);
    assert.deepEqual(s.powers.bolts[0].targets, [a, b], 'nearest first, then the chain');
    assert.equal(a.hp, hp[0] - LIGHTNING.dmg); assert.equal(b.hp, hp[1] - LIGHTNING.chainDmg);
    assert.equal(R.saidin, 3, 'free (only the first strike builds meter)'); assert.equal(s.fireballs.length, 0);
    // hit-stop freezes gameplay (and the bolt's fade) for a few frames
    for (let f = 0; f < 60 && s.powers.bolts.length; f++) h.step(dt);
    assert.equal(s.powers.bolts.length, 0); assert.ok(h.resources().visuals <= visuals, 'bolt segments destroyed');
  } finally { h.destroy(); }
}));

test('FIRE SHIELD: a ring that damages foes who touch it, once per tick each, then burns out at 10 s', () => withSeed(6, () => {
  const h = started(), s = h.s, R = s.riley;
  try {
    const [a, b] = walkToFight(h, 2);
    const lights0 = h.resources().lights;
    collect(h, 'fireshield');
    assert.equal(s.powers.ter.kind, 'fireshield'); assert.equal(s.powers.castKind(R), 'fireball', 'the button stays a fireball');
    assert.equal(h.resources().lights, lights0 + 1, 'one ring light');
    a.cool = b.cool = 99; a.hp = b.hp = 1000;
    let hitsA = 0, hitsB = 0; const ah = a.takeHit.bind(a), bh = b.takeHit.bind(b);
    a.takeHit = (x, f) => { hitsA++; return ah(x, f); }; b.takeHit = (x, f) => { hitsB++; return bh(x, f); };
    for (let f = 0; f < 60 * 3; f++) { a.x = R.x + 80; a.y = R.y; a.z = 0; b.x = R.x + 400; b.y = R.y; if (a.state === 'down') a.setState('approach', 'walk'); h.step(dt); }
    assert.ok(hitsA >= Math.floor(3 / FIRE_SHIELD.tick) - 1 && hitsA <= Math.ceil(3 / FIRE_SHIELD.tick) + 1, `ticks: ${hitsA}`);
    assert.equal(hitsB, 0, 'outside the ring: untouched');
    // the timer runs on gameplay time (hit-stop frames do not count): expired well within the remaining 7 s + hit-stops
    for (let f = 0; f < 60 * 9 && s.powers.ter; f++) h.step(dt);
    assert.equal(s.powers.ter, null); assert.equal(s.powers.shield, null); assert.equal(h.resources().lights, lights0);
  } finally { h.destroy(); }
}));

test('AIR WHIP: lashes the nearest foe ahead and pulls it in front of Riley, dazed', () => withSeed(7, () => {
  const h = started(), s = h.s, R = s.riley;
  try {
    const [a, b] = walkToFight(h, 2);
    collect(h, 'airwhip');
    for (let f = 0; f < 60 && R.busy; f++) h.step(dt);
    R.face(1); a.x = R.x + 480; a.y = R.y + 30; b.x = R.x - 300; a.cool = b.cool = 9;
    const hp = a.hp; R.saidin = 0;
    s.inp.press('special');
    for (let f = 0; f < 40 && !s.powers.whips.length; f++) h.step(dt);
    assert.equal(s.powers.whips[0].e, a); assert.equal(a.hp, hp - AIR_WHIP.dmg); assert.equal(R.saidin, 3);
    for (let f = 0; f < 60 && s.powers.pulls.length; f++) h.step(dt);
    assert.ok(Math.abs(a.x - (R.x + AIR_WHIP.stand)) < 40, `pulled in: ${a.x - R.x}`); assert.ok(Math.abs(a.y - R.y) < 8);
    assert.equal(s.powers.pulls.length, 0);
    steps(h, 30); assert.equal(s.powers.whips.length, 0, 'whip visuals gone');
  } finally { h.destroy(); }
}));

test('power timers run on gameplay time: a pause freezes them exactly; death and victory clear every power', () => withSeed(8, () => {
  const h = started(), s = h.s, R = s.riley;
  try {
    collect(h, 'angreal'); collect(h, 'fireshield'); steps(h, 60);
    const left = [s.powers.left('boost'), s.powers.left('ter')];
    s.inp.press('pause'); h.step(dt); assert.equal(s.paused, true);
    steps(h, 60 * 20);
    assert.deepEqual([s.powers.left('boost'), s.powers.left('ter')], left, 'frozen while paused');
    s.inp.press('pause'); steps(h, 60);
    assert.ok(Math.abs(s.powers.left('boost') - (left[0] - 1)) < 0.05);
    const lights0 = h.resources().lights;
    s.rileyDied();
    assert.equal(s.powers.boost, null); assert.equal(s.powers.ter, null); assert.equal(h.resources().lights, lights0 - 1, 'ring light removed');
    collect(h, 'saangreal'); s.bossDown({}); assert.equal(s.powers.boost, null, 'victory clears powers');
  } finally { h.destroy(); }
}));

test('uncollected power pickups blink and fade after their lifetime, releasing their visuals and light', () => withSeed(9, () => {
  const h = started(), s = h.s, R = s.riley;
  try {
    const r0 = h.resources();
    const p = s.dropPickup(Math.min(s.bounds.r - 100, R.x + 300), R.y, 'lightning');
    assert.deepEqual([h.resources().visuals, h.resources().lights], [r0.visuals + 2, r0.lights + 1]);
    steps(h, 60 * (PICKUP_LIFE + 0.5));
    assert.equal(s.pickups.includes(p), false); assert.deepEqual([h.resources().visuals, h.resources().lights], [r0.visuals, r0.lights]);
  } finally { h.destroy(); }
}));

/** grab a Twix mid-fight; returns the stage at the first cutscene frame */
function twixFight(seed) {
  const h = started(seed), s = h.s, R = s.riley;
  walkToFight(h, 2);
  const p = s.dropPickup(R.x, R.y, 'twix');
  assert.equal(p.ready, false, 'the Twix falls in first'); assert.ok(p.z > 500);
  for (let f = 0; f < 60 * 3 && !s.cutscene; f++) h.step(dt);
  assert.ok(s.cutscene, 'grabbing the Twix opens the cutscene');
  return h;
}

test('TWIX: falls in, Riley grabs it, the fight pauses for the campfire scene and resumes exactly where it was', () => withSeed(10, () => {
  const h = twixFight(10), s = h.s;
  try {
    assert.equal(s.paused, true); assert.deepEqual([...s.pauseReasons], ['cutscene']); assert.equal(s.showPauseLabel(), false, 'no PAUSED card over it');
    const shown = h.observations.hud.filter(e => e.method === 'showCutscene'); assert.equal(shown.length, 1);
    const before = world(s), res = h.resources();
    const seen = [];
    for (let f = 0; f < 60 * 60 && s.cutscene; f++) { h.step(dt); if (s.cutscene && seen[seen.length - 1] !== s.cutscene.i) seen.push(s.cutscene.i); if (s.cutscene) assert.equal(world(s), before, 'frozen during the cutscene'); }
    assert.equal(s.cutscene, null); assert.equal(s.cutsceneResult, 'end');
    assert.deepEqual(seen, TWIX_SCRIPT.map((l, i) => i), 'every line plays in order');
    assert.deepEqual(h.observations.hud.filter(e => e.method === 'cutsceneLine').map(e => e.args[0].id), TWIX_SCRIPT.map(l => l.id));
    assert.equal(h.observations.hud.filter(e => e.method === 'hideCutscene').length, 1);
    assert.equal(s.paused, false); assert.equal(s.pauseReasons.size, 0);
    assert.equal(world(s), before, 'resumes with the exact same world');
    assert.deepEqual(h.resources(), res, 'no timers, tweens, lights or visuals were added or fired meanwhile');
    const t = s.time.now; steps(h, 30); assert.ok(s.time.now > t, 'the fight runs again');
    const total = TWIX_SCRIPT.reduce((n, l) => n + holdFor(l), 0);
    assert.ok(total > 20 && total < 45, `scene length ${total.toFixed(1)} s`);
  } finally { h.destroy(); }
}));

for (const key of ['start', 'pause']) test(`TWIX: ${key} skips the whole cutscene at once (no manual pause, no leftover input)`, () => withSeed(11, () => {
  const h = twixFight(11), s = h.s;
  try {
    const before = world(s);
    steps(h, 60);
    s.inp.press(key);   // routed at once, like the game-step input hook
    assert.equal(s.cutscene, null); assert.equal(s.cutsceneResult, 'skip');
    assert.equal(s.paused, false); assert.equal(s.pauseReasons.has('manual'), false);
    assert.deepEqual(s.inp.buf, {}, 'the skip press is not replayed');
    assert.equal(world(s), before, 'resumes exactly where it was');
    const t = s.time.now; h.step(dt); assert.ok(s.time.now > t); assert.equal(s.paused, false); assert.notEqual(s.riley.state, 'cast');
    assert.equal(h.observations.hud.filter(e => e.method === 'cutsceneLine').length, 1, 'skipped after the first line');
  } finally { h.destroy(); }
}));

test('TWIX: attack advances one line (after a short guard); other pauses freeze the scene clock', () => withSeed(12, () => {
  const h = twixFight(12), s = h.s, cs = s.cutscene;
  try {
    assert.equal(cs.i, 0);
    s.inp.press('attack'); h.step(dt); assert.equal(cs.i, 0, 'a press inside the guard does nothing');
    steps(h, Math.ceil(GUARD * 60)); s.inp.press('attack'); h.step(dt); assert.equal(cs.i, 1);
    s.inp.press('jump'); h.step(dt); assert.equal(cs.i, 1);
    s.setPauseReason('report', true); assert.equal(s.showPauseLabel(), true);
    const t = cs.elapsed; steps(h, 60 * 10); assert.equal(cs.elapsed, t, 'perf report pause freezes the cutscene');
    s.setPauseReason('report', false); steps(h, 10); assert.ok(cs.elapsed > t);
    for (let f = 0; f < 60 * 60 && s.cutscene; f++) h.step(dt);
    assert.equal(s.cutsceneResult, 'end'); assert.equal(s.paused, false);
  } finally { h.destroy(); }
}));

test('every power appears in every normal Stage 1 run; the Twix exactly once, mid-stage', () => {
  for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => {
    const h = stage1Simulation({ mode: '1' }), s = h.s; const twixAt = [];
    try {
      const drop = s.dropPickup.bind(s);
      s.dropPickup = (x, y, kind) => { if (kind === 'twix') twixAt.push([s.zoneI, s.wave]); return drop(x, y, kind); };
      for (let f = 0; f < 60 * 600 && !s.ended && !s.gameOver; f++) h.step(dt);
      assert.equal(s.ended, true);
      for (const kind of Object.keys(POWERS)) assert.ok(s.powers.dropped.includes(kind), `seed ${seed}: ${kind} appeared`);
      assert.deepEqual(twixAt, [[1, 1]], `seed ${seed}: one Twix in zone 2 of 4`);
      assert.equal(s.cutsceneResult, 'end', 'the demo bot grabbed it and watched the scene');
    } finally { h.destroy(); }
  });
  assert.equal(DROPS.filter(d => d.kind === 'twix').length, 1); assert.equal(BOSS_DROP.kind, 'saangreal');
});

test('cutscene script, voices and placeholder art are wired with the exact sizes in ART_LIST.md', () => {
  assert.ok(TWIX_SCRIPT.length >= 6 && TWIX_SCRIPT.length <= 10);
  for (const l of TWIX_SCRIPT) assert.ok(l.text.length <= 90, l.id);
  assert.ok(['Ishamael', 'Lanfear', 'Aginor', 'Myrddraal'].every(n => TWIX_SCRIPT.some(l => l.text.includes(n))));
  for (const id of Object.keys(EXTRA_VOICE)) {
    assert.ok(!Object.hasOwn(VOICE, id), 'start-of-run preload set unchanged');
    assert.ok(existsSync(new URL(`../assets/audio/voice/${id}.mp3`, import.meta.url)), `${id}.mp3`);
  }
  for (const P of Object.values(POWERS).filter(P => P.voice)) assert.ok(Object.hasOwn(EXTRA_VOICE, P.voice));
  const size = url => dimensions(readFileSync(new URL('../' + url, import.meta.url)));
  for (const a of Object.values(ART.pickups)) assert.deepEqual(size(a.url), [96, 96], a.url);
  for (const a of Object.values(ART.hud)) assert.deepEqual(size(a.url), [48, 48], a.url);
  for (const a of ART.panels) assert.deepEqual(size(a.url), [1280, 720], a.url);
  assert.deepEqual(size(ART.fx.lightning.url), [512, 192]); assert.deepEqual(size(ART.fx.fireshield.url), [384, 320]); assert.deepEqual(size(ART.fx.airwhip.url), [512, 48]);
  assert.deepEqual(size(ART.rileyLightning.url), [2880, 1280]); assert.ok(ART.rileyLightning.holds.length >= 5);
  const list = readFileSync(new URL('../assets/powers/ART_LIST.md', import.meta.url), 'utf8');
  for (const a of [...Object.values(ART.pickups), ...Object.values(ART.hud), ...ART.panels, ...Object.values(ART.fx), ART.rileyLightning]) assert.ok(list.includes(a.url.split('/').pop()), `${a.url} listed`);
});
