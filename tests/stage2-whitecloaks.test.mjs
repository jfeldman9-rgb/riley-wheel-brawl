// Stage 2 enemy and boss AI on the production Stage1 scene in Stage 2 mode (headless harness, no controller):
// Whitecloak zealot guard / guard break / shield charge, archer spacing / release frame / one drawer at a time,
// and Jaret Byar's three phases (parry bait -> riposte, archer volleys with a safe lane, the barn fire and torches,
// kneel -> retreat). Kid-safe endings are asserted: nobody "dies"; they are knocked out, flee or retreat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { Zealot, Archer, Byar, ZEALOT, ARCHER, BYAR } = await import('../src/whitecloaks.js');
const { VOLLEY, VOLLEY_BANDS } = await import('../src/stages.js');

/** Stage 2 started, story skipped, no controller: Riley stands still at the start of the street */
function stage2(seed, fn) {
  return withSeed(seed, () => {
    const h = stage1Simulation({ mode: '', stage: 2 }), s = h.s;
    try {
      for (let i = 0; i < 120 && !s.cutscene; i++) h.step();
      assert.ok(s.cutscene, 'Stage 2 opens on the story beat');
      s.endTwixCutscene('skip'); h.step();
      return fn(h, s, s.riley);
    } finally { h.destroy(); }
  });
}
const place = (s, E, dx, dy = 0) => { const R = s.riley, e = new E(s, R.x + dx, R.y + dy); e.entering = false; s.enemies.push(e); return e; };
const run = (h, secs, until) => { for (let i = 0; i < secs * 60; i++) { h.step(); if (until && until()) return true; } return false; };
const jab = { dmg: 5, kind: 'light', kb: 100 };

// ---------------- zealot ----------------
test('zealot: frontal light hits are blocked for no damage, the third in a row breaks the guard', () => stage2(1, (h, s, R) => {
  const z = place(s, Zealot, 160); z.setState('approach', 'guard'); z.face(-1); z.cool = 9; z.nextCharge = 99;
  for (let i = 1; i <= ZEALOT.blocksToBreak - 1; i++) {
    assert.equal(z.takeHit({ ...jab }, R), false); assert.equal(z.hp, z.maxHp); assert.equal(z.state, 'block');
    run(h, 0.3); z.setState('approach', 'guard'); z.face(-1);
  }
  assert.equal(z.takeHit({ ...jab }, R), false); assert.equal(z.state, 'guardbreak');
  assert.equal(s.kit.stats.blocks, ZEALOT.blocksToBreak - 1); assert.equal(s.kit.stats.guardBreaks, 1);
  assert.equal(z.takeHit({ ...jab }, R), true, 'a broken guard takes the hit'); assert.equal(z.hp, z.maxHp - jab.dmg);
}));

test('zealot: hits from behind, heavy hits and knockdowns go through the shield', () => stage2(2, (h, s, R) => {
  const z = place(s, Zealot, 160); z.setState('approach', 'guard'); z.face(1); z.cool = 9; z.nextCharge = 99;   // back to Riley
  assert.equal(z.takeHit({ ...jab }, R), true); assert.equal(z.hp, z.maxHp - 5);
  const y = place(s, Zealot, 200, 10); y.setState('approach', 'guard'); y.face(-1); y.cool = 9; y.nextCharge = 99;
  assert.equal(y.takeHit({ dmg: 9, kind: 'heavy', kb: 300 }, R), true); assert.equal(y.hp, y.maxHp - 9);
  const w = place(s, Zealot, 240, -10); w.setState('approach', 'guard'); w.face(-1); w.cool = 9; w.nextCharge = 99;
  assert.equal(w.takeHit({ dmg: 6, kind: 'medium', kb: 300, down: true }, R), true); assert.ok(w.hp < w.maxHp);
}));

test('zealot: a shield charge into the wall leaves him dazed and taking extra damage', () => stage2(3, (h, s, R) => {
  R.y = 690; const z = place(s, Zealot, 400, -100);   // 540 px/s for up to 1.35 s reaches the left wall z.cool = 9; z.nextCharge = 99; z.face(-1);
  z.startCharge(); assert.equal(z.state, 'chargeup');
  assert.ok(run(h, 0.6, () => z.state === 'charge'), 'wind-up becomes a charge'); assert.equal(z.chargeDir, -1);
  R.x = 1100;                                                // out of his path
  assert.ok(run(h, 3, () => z.state === 'dazed'), 'reached the wall'); assert.ok(z.x <= s.bounds.l + 80);
  const hp = z.hp; z.takeHit({ dmg: 10, kind: 'heavy', kb: 50 }, { x: z.x + 50 }); assert.ok(Math.abs(hp - z.hp - 10 * ZEALOT.dazedDmg) < 1e-9, 'x1.3 while dazed');
  assert.ok(run(h, ZEALOT.dazed + 1, () => z.state === 'approach' || z.state === 'hurt' || z.state === 'wait'));
}));

test('zealot: a charge that reaches Riley knocks him down and ends in a slam', () => stage2(4, (h, s, R) => {
  const z = place(s, Zealot, 520); z.cool = 9; z.nextCharge = 99; z.startCharge();
  const hp = R.hp; assert.ok(run(h, 2.5, () => z.state === 'slam'));
  assert.equal(hp - R.hp, ZEALOT.charge.dmg, 'the charge hurt Riley'); assert.equal(R.state, 'down', 'and knocked him down');
}));

test('zealot AI starts its own charge from mid range in Riley\'s lane', () => stage2(5, (h, s, R) => {
  const z = place(s, Zealot, 560); z.cool = 0; z.nextCharge = 0;
  assert.ok(run(h, 1, () => z.state === 'chargeup'));
}));

// ---------------- archer ----------------
test('archer: backsteps away when Riley closes in, then keeps his distance', () => stage2(6, (h, s, R) => {
  R.x = 640; const a = place(s, Archer, 150); a.backCool = 0; a.cool = 9;
  run(h, 0.1); assert.equal(a.state, 'backstep'); assert.ok(a.vx > 0, 'steps away from Riley');
  run(h, 6); const d = Math.abs(a.x - R.x);
  assert.ok(d >= ARCHER.keep[0] - 40 && d <= ARCHER.keep[1] + 40, `stand-off distance ${d}`);
}));

test('archer: the arrow leaves the bow on the release frame, flies along his lane and hits Riley there', () => stage2(7, (h, s, R) => {
  R.x = 300; const a = place(s, Archer, 470); a.cool = 0; a.skyCool = 99; s.zoneI = 0;
  assert.ok(run(h, 1, () => a.state === 'shoot'));
  assert.equal(s.kit.arrows.length, 0, 'nothing loosed during the draw');
  assert.ok(run(h, 2, () => s.kit.arrows.length > 0)); assert.ok(a.fi >= ARCHER.releaseFrame);
  assert.equal(s.kit.stats.arrows, 1); const hp = R.hp;
  assert.ok(run(h, 2, () => s.kit.arrows.length === 0)); assert.equal(s.kit.stats.arrows, 1, 'one arrow per draw');
  assert.equal(R.hp, hp - ARCHER.arrowDmg); assert.equal(s.kit.stats.arrowHits, 1);
}));

test('archer: an arrow in another lane flies past, and the fire shield burns arrows up', () => stage2(8, (h, s, R) => {
  R.x = 300; const a = place(s, Archer, 470); s.zoneI = 0; a.cool = 0; a.skyCool = 99;
  assert.ok(run(h, 2, () => s.kit.arrows.length > 0));
  R.y += 40; const hp = R.hp;                         // stepped out of the lane
  assert.ok(run(h, 2, () => s.kit.arrows.length === 0)); assert.equal(R.hp, hp);
  s.powers = s.powers || {}; s.powers.ter = { kind: 'fireshield', t: 10 }; s.kit.fireArrow(a);
  const y = s.kit.arrows[0]; R.y = y.y;
  assert.ok(run(h, 2, () => s.kit.arrows.length === 0)); assert.equal(R.hp, hp, 'the shield ate the arrow');
}));

test('archers take turns: never two drawing at once', () => stage2(9, (h, s, R) => {
  R.x = 640; const a = place(s, Archer, 470), b = place(s, Archer, -470);
  for (const e of [a, b]) { e.cool = 0; e.skyCool = 99; }
  let both = 0, shots = 0, prev = false;
  for (let i = 0; i < 12 * 60; i++) {
    h.step(); R.hp = R.maxHp; R.y = 630;
    const drawing = [a, b].filter(e => e.state === 'shoot' || e.state === 'skyshot').length;
    if (drawing > 1) both++; if (drawing && !prev) shots++; prev = drawing > 0;
  }
  assert.equal(both, 0); assert.ok(shots >= 3, `shots ${shots}`);
}));

test('archer: a lobbed arrow marks the ground first and only lands where the mark was', () => stage2(10, (h, s, R) => {
  R.x = 640; const a = place(s, Archer, 480); s.zoneI = 1; a.cool = 0;
  a.startSkyshot(); assert.equal(s.kit.skyArrows.length, 1); const m = s.kit.skyArrows[0];
  assert.equal(m.tx, R.x); R.x += 200; const hp = R.hp;
  assert.ok(run(h, 2, () => s.kit.skyArrows.length === 0)); assert.equal(R.hp, hp, 'moved off the mark');
}));

// ---------------- Jaret Byar ----------------
function boss(s, dx = 240) { const b = place(s, Byar, dx); s.boss = b; s.zone = { boss: true, l: 0, r: 1280 }; s.locked = true; return b; }

test('Byar: phases change at 66% and 33% health from real damage, each exactly once', () => stage2(11, (h, s, R) => {
  const b = boss(s), seen = [], on = s.onBossPhase.bind(s); s.onBossPhase = (e, p) => { seen.push(p); on(e, p); };
  for (let k = 0; k < 400 && b.phase < 3; k++) { b.wake = 0; if (b.canBeHit && !['parry'].includes(b.state)) b.takeHit({ dmg: 6, kind: 'heavy', kb: 10 }, { x: b.x - b.facing * -50 }); run(h, 0.25); R.hp = R.maxHp; }
  assert.deepEqual(seen, [2, 3]); assert.ok(b.hp > 0 && b.hp <= b.maxHp * 0.33);
}));

test('Byar phase 1: striking his parry stance from the front triggers a knockdown riposte, no damage to him', () => stage2(12, (h, s, R) => {
  const b = boss(s, 200); b.cool = 9; b.face(-1); b.startParry(); assert.equal(b.state, 'parry');
  const hp = R.hp;
  assert.equal(b.takeHit({ ...jab }, R), false); assert.equal(b.hp, b.maxHp); assert.equal(b.state, 'riposte'); assert.equal(b.ripostes, 1);
  assert.ok(run(h, 1.5, () => R.hp < hp), 'the riposte lands'); assert.ok(hp - R.hp >= BYAR.riposte.dmg - 0.01);
}));

test('Byar phase 1: waiting out the parry leaves him open for bonus damage', () => stage2(13, (h, s, R) => {
  const b = boss(s, 200); b.cool = 9; b.face(-1); b.startParry();
  assert.ok(run(h, BYAR.parry + 0.2, () => b.state === 'open'));
  const hp = b.hp; assert.equal(b.takeHit({ dmg: 10, kind: 'heavy', kb: 10 }, R), true);
  assert.ok(Math.abs(hp - b.hp - 10 * BYAR.openDmg) < 1e-9);
}));

test('Byar: fireballs glance off his parry without a riposte; his combo thrust knocks down', () => stage2(14, (h, s, R) => {
  const b = boss(s, 200); b.cool = 9; b.face(-1); b.startParry();
  assert.equal(b.takeHit({ dmg: 10, kind: 'medium', kb: 10 }, { x: R.x + 20 }), false); assert.equal(b.state, 'parry'); assert.equal(b.ripostes, 0);
  b.setState('approach', 'walk'); b.nextParry = 99; b.cool = 0; b.x = R.x + 150; b.y = R.y;
  const hp = R.hp; assert.ok(run(h, 3, () => R.state === 'down' || R.z > 0)); assert.ok(R.hp < hp);
}));

test('Byar phase 2: he calls a volley; Riley\'s lane band is marked but one band always stays safe', () => stage2(15, (h, s, R) => {
  const b = boss(s, 400); b.hp = b.maxHp * 0.6; b.nextParry = 99; b.cool = 0;
  assert.ok(run(h, 3, () => b.state === 'volley')); assert.equal(b.phase, 2);
  assert.ok(run(h, 1, () => s.kit.volley)); const v = s.kit.volley;
  assert.ok(v.bands.includes(s.kit.bandOf(R.y))); assert.ok(v.bands.length <= 2); assert.equal(new Set(v.bands).size, v.bands.length);
  // dodge: change lanes into an unmarked band before the arrows land
  const safe = [0, 1, 2].find(i => !v.bands.includes(i)); R.y = (VOLLEY_BANDS[safe][0] + VOLLEY_BANDS[safe][1]) / 2;
  const hp = R.hp; assert.ok(run(h, VOLLEY.warn + 0.2, () => v.struck)); assert.equal(R.hp, hp); assert.equal(s.kit.stats.volleyHits, 0);
}));

test('volleys: standing in a marked band is a knockdown hit; phase 3 always marks two bands, never all three', () => stage2(16, (h, s, R) => {
  const b = boss(s, 400); b.phase = 3; b.hp = b.maxHp * 0.2;
  for (let k = 0; k < 20; k++) { s.kit.startVolley(b); assert.equal(s.kit.volley.bands.length, 2); s.kit.clearHazards(); }
  b.phase = 2; s.kit.startVolley(b); const hp = R.hp;
  assert.ok(run(h, VOLLEY.warn + 0.1, () => s.kit.volley?.struck)); assert.equal(R.hp, hp - VOLLEY.dmg); assert.equal(s.kit.stats.volleyHits, 1);
}));

test('Byar phase 3: rage lights the barn fire, then torches arc at Riley and leave burning patches', () => stage2(17, (h, s, R) => {
  const b = boss(s, 420); const fires = s.fires.length; b.nextParry = 99; b.nextVolley = 99; b.cool = 0;
  b.hp = b.maxHp * 0.3; assert.ok(run(h, 0.2, () => b.state === 'rage'));
  assert.ok(run(h, 2, () => s.kit.barn)); assert.ok(s.fires.length > fires, 'barn fire lights joined the fire lights');
  b.nextVolley = 99; assert.ok(run(h, 6, () => s.kit.stats.torches > 0), 'he throws a torch');
  assert.equal(b.torches, s.kit.stats.torches);
  const patches = s.patches.length; assert.ok(run(h, 1.5, () => s.kit.torches.length === 0)); assert.ok(s.patches.length > patches || s.patches.length > 0);
}));

test('Byar defeat is kid-safe: he kneels, then walks away and is gone; never a "dead" fade', () => stage2(18, (h, s, R) => {
  const b = boss(s, 240); b.hp = 4; b.wake = 0; b.cool = 9; b.setState('approach', 'walk');
  const states = new Set(); b.takeHit({ dmg: 10, kind: 'heavy', kb: 100 }, { x: b.x - 60 });
  assert.equal(b.alive, false);
  for (let i = 0; i < 12 * 60 && s.enemies.includes(b); i++) { h.step(); states.add(b.state); }
  assert.ok(states.has('defeated')); assert.ok(states.has('retreat')); assert.ok(!states.has('dead'));
  assert.ok(b.gone); assert.ok(!s.enemies.includes(b));
}));

test('beaten Whitecloaks alternate: knocked out (stars) or get up and flee off the street', () => stage2(19, (h, s, R) => {
  const a = place(s, Zealot, 200), b = place(s, Zealot, 260, 20);
  assert.notEqual(a.fleeOnKO, b.fleeOnKO);
  for (const e of [a, b]) e.takeHit({ dmg: 99, kind: 'heavy', kb: 200, down: true }, R);
  const seen = { [a.id]: new Set(), [b.id]: new Set() };
  for (let i = 0; i < 10 * 60 && (s.enemies.includes(a) || s.enemies.includes(b)); i++) { h.step(); for (const e of [a, b]) seen[e.id].add(e.state); }
  const ko = a.fleeOnKO ? b : a, fl = a.fleeOnKO ? a : b;
  assert.ok(seen[ko.id].has('dead') && s.kit.stats.stars >= 1, 'knocked out with dizzy stars');
  assert.ok(seen[fl.id].has('flee') && !seen[fl.id].has('dead'), 'the other one runs away');
  assert.ok(!s.enemies.includes(a) && !s.enemies.includes(b));
}));

// ---------------- review regressions ----------------
test('archer: tracks only draw frames 0–3 at no more than 90px/s, and glints once on frame 2', () => stage2(31, (h, s, R) => {
  R.x = 300; R.y = 690; const a = place(s, Archer, 470); a.y = 572; a.startShoot();
  const glints = []; s.kit.telegraph = e => glints.push({ e, frame: e.fi });
  for (let fi = 0; fi < ARCHER.releaseFrame; fi++) {
    a.sprite.anims.setCurrentFrame(a.sprite.anims.currentAnim.frames[fi]);
    const y = a.y; a.update(0.1);
    assert.ok(a.y > y && a.y - y <= 9 + 1e-9, `frame ${fi} stays within 90px/s`);
  }
  assert.deepEqual(glints.map(g => g.frame), [2]);
  a.sprite.anims.setCurrentFrame(a.sprite.anims.currentAnim.frames[ARCHER.releaseFrame]);
  const committedY = a.y; a.update(0.1); R.y = 572; a.update(0.1);
  assert.equal(a.y, committedY, 'the release and recovery cannot retarget');
  assert.equal(s.kit.stats.arrows, 1, 'the release still fires exactly once');
}));

test('archer: every third released straight shot requests a fan only from zone 2', () => stage2(32, (h, s, R) => {
  const a = place(s, Archer, 470), calls = []; s.kit.fireArrow = (e, options) => calls.push(options.fan);
  for (const zone of [0, 1]) {
    s.zoneI = zone; a.shots = 0;
    for (let shot = 0; shot < 6; shot++) {
      a.startShoot(); a.sprite.anims.setCurrentFrame(a.sprite.anims.currentAnim.frames[ARCHER.releaseFrame]); a.update(1 / 60); a.update(1 / 60);
    }
  }
  assert.deepEqual(calls, [false, false, false, false, false, false, false, false, true, false, false, true]);
}));

test('Byar: an active volley cancels every harmful move already underway and holds a safe distance', () => {
  for (const move of ['startAttack', 'startParry', 'startRiposte', 'startTorch', 'startRush', 'rushing']) stage2(40, (h, s, R) => {
    s.enemies = []; R.x = 400; const b = boss(s, 210); b.hp = b.maxHp * 0.3; b.phase = 3; b.nextVolley = 99;
    if (move === 'rushing') { b.startRush(); b.setState('rush', 'rush'); b.rushDir = b.facing; }
    else b[move]();
    s.kit.volleyActive = () => true;
    const hp = R.hp, torches = s.kit.stats.torches, ripostes = b.ripostes;
    if (move === 'startParry') assert.equal(b.takeHit({ ...jab }, R), true, 'cannot bait a riposte during a volley');
    const oldX = b.x; b.update(1 / 60);
    assert.ok(Math.abs(b.x - oldX) <= 240 / 60 + 1e-9, 'retreat never teleports');
    run(h, 1.2);
    assert.equal(R.hp, hp, move); assert.equal(s.kit.stats.torches, torches, move); assert.equal(b.ripostes, ripostes, move);
    assert.ok(Math.abs(b.x - R.x) >= BYAR.volleyKeep - 1, `${move}: holds 300px once there is room to retreat`);
    assert.ok(!['attack', 'parry', 'riposte', 'torch', 'rushup', 'rush'].includes(b.state), move);
  });
});

test('Byar: Riley may approach a wall-pinned volley hold without triggering attacks or a teleport', () => stage2(41, (h, s, R) => {
  s.enemies = []; R.x = s.bounds.r - 190; const b = boss(s, 150); b.phase = 3; b.hp = b.maxHp * 0.3; b.nextVolley = 0;
  s.kit.volleyActive = () => true; const hp = R.hp, x = b.x;
  for (let i = 0; i < 90; i++) { const oldX = b.x; h.step(); assert.ok(Math.abs(b.x - oldX) <= 4 + 1e-9); }
  assert.equal(b.x, x, 'holds the wall instead of teleporting through Riley'); assert.equal(R.hp, hp);
  assert.equal(b.state, 'approach');
}));

test('Byar: a pending volley holds harmlessly while old fire remains, then signals when ready', () => stage2(42, (h, s, R) => {
  s.enemies = []; R.x = 300; const b = boss(s, 420); b.phase = 3; b.hp = b.maxHp * 0.3; b.cool = 0; b.nextVolley = 0; b.nextTorch = 0;
  s.kit.volleyReady = () => false;
  const hp = R.hp; run(h, 2);
  assert.equal(b.state, 'approach'); assert.equal(b.torches, 0); assert.equal(b.volleys, 0); assert.equal(R.hp, hp);
  s.kit.volleyReady = () => true; h.step();
  assert.equal(b.state, 'volley'); assert.equal(b.cur, 'byar_command');
}));

test('Byar: rush gives a glint, lane cue and war cry before the full 0.55s wind-up', async () => {
  const { sfx } = await import('../src/audio.js'), warcry = sfx.warcry; let cries = 0;
  sfx.warcry = () => { cries++; };
  try { stage2(43, (h, s, R) => {
    s.enemies = []; const b = boss(s, 460); b.nextVolley = 99;
    let glints = 0, lanes = 0; s.kit.telegraph = e => { assert.equal(e, b); glints++; }; s.kit.markRush = e => { assert.equal(e, b); lanes++; };
    b.startRush(); assert.equal(cries, 1); assert.equal(glints, 1); assert.equal(lanes, 1); assert.equal(BYAR.rushUp, 0.55);
    run(h, 0.5); assert.equal(b.state, 'rushup'); assert.equal(cries, 1);
    assert.ok(run(h, 0.1, () => b.state === 'rush')); assert.equal(cries, 1, 'the warning is not delayed until the rush');
  }); } finally { sfx.warcry = warcry; }
});

test('Byar: the painted command, volley and retreat poses are used and every open guard is announced', () => stage2(44, (h, s, R) => {
  s.enemies = []; const b = boss(s, 440); let opens = 0; s.kit.guardOpen = e => { assert.equal(e, b); opens++; };
  b.startVolley(); assert.equal(b.cur, 'byar_command');
  assert.ok(run(h, 0.4, () => b.cur === 'byar_volley'));
  s.kit.clearHazards(); b.nextVolley = 99;
  for (let i = 0; i < 2; i++) { b.startParry(); assert.ok(run(h, BYAR.parry + 0.2, () => b.state === 'open')); }
  assert.equal(opens, 2);
  b.alive = false; b.setState('defeated', 'defeated'); assert.ok(run(h, 2.6, () => b.state === 'retreat'));
  assert.equal(b.cur, 'byar_retreat');
}));

test('archers: one straight draw and one lob may overlap, but a second of either kind waits', () => stage2(45, (h, s, R) => {
  s.enemies = []; R.x = 640; const a = place(s, Archer, 470), b = place(s, Archer, -470), c = place(s, Archer, 450);
  s.zoneI = 1; a.startSkyshot(); b.cool = 0; b.skyCool = 99; b.think(1 / 60);
  assert.equal(a.state, 'skyshot'); assert.equal(b.state, 'shoot', 'a lob does not monopolize the straight-shot slot');
  assert.equal(s.kit.archerBusy(c, 'skyshot'), true); assert.equal(s.kit.archerBusy(c, 'shoot'), true);
  c.cool = 0; c.skyCool = 0; c.think(1 / 60); assert.equal(c.state, 'approach', 'both occupied slots remain exclusive');
  a.setState('approach', 'walk'); assert.equal(s.kit.archerBusy(c, 'skyshot'), false); assert.equal(s.kit.archerBusy(c, 'shoot'), true);
}));

test('archer: a three-arrow fan visibly diverges and a straight arrow can hit at 25px lane offset', () => stage2(46, (h, s, R) => {
  s.enemies = []; R.x = 300; const a = place(s, Archer, 470); a.cool = 99; a.skyCool = 99;
  s.kit.fireArrow(a, { fan: true }); const fan = [...s.kit.arrows], y = a.y;
  assert.equal(fan.length, 3); assert.deepEqual(fan.map(arrow => arrow.y), [y, y, y]);
  s.kit.updateArrows(0.1, R); assert.ok(fan[0].y < fan[1].y && fan[1].y < fan[2].y);
  s.kit.clearHazards(); s.kit.fireArrow(a); R.y = a.y + 25; const hp = R.hp;
  assert.ok(run(h, 1, () => s.kit.arrows.length === 0)); assert.equal(R.hp, hp - ARCHER.arrowDmg);
}));
