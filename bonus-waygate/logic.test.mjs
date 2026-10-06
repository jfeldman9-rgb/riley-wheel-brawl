import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const L = createRequire(import.meta.url)('./logic.js');

function jumpLanding(takeoff, dt) {
  const hero = { x: takeoff, z: 0, vz: 0, jumpVx: 0, action: 'idle' };
  hero.x += L.P_SPEED * dt;
  hero.jumpVx = L.P_SPEED;
  hero.vz = L.JUMP_V;
  hero.action = 'air';
  L.stepVertical(hero, dt);
  let guard = 0;
  while (hero.z > 0 && guard++ < 4000) {
    hero.x += hero.jumpVx * dt;
    L.stepVertical(hero, dt);
  }
  return hero.x;
}

test('running jump reach beats every gap plus landing margin', () => {
  const dts = [1 / 120, 1 / 60];
  const reaches = dts.map(dt => L.runningJumpReach(dt));
  const reach = Math.min(...reaches);
  assert.ok(reach > 180, `running jump should travel a real distance, got ${reach}`);
  for (const [a, b] of L.GAPS) {
    const width = b - a;
    assert.equal(width, L.GAP_W);
    assert.ok(width >= 72, 'gaps stay wide enough that a step cannot walk them');
    assert.ok(reach >= width + L.LANDING_MARGIN, `reach ${reach} < gap ${width} + margin ${L.LANDING_MARGIN}`);
    for (const dt of dts) {
      const land = jumpLanding(a, dt);
      assert.ok(land >= b + L.LANDING_MARGIN, `lip jump at dt ${dt} lands ${land}, need >= ${b + L.LANDING_MARGIN}`);
      assert.equal(L.isPit(land, L.createPlanks()), false, 'landing is not a pit');
      const pad = L.stablePadAt(land);
      assert.ok(pad, `landing ${land} missed the stable pad`);
      assert.ok(land <= pad[1] - 8, 'landing keeps a few pixels of pad ahead of the next lip');
    }
  }
  const windowPx = reach - L.GAP_W - L.LANDING_MARGIN;
  const windowSec = windowPx / L.P_SPEED;
  assert.ok(windowSec >= 0.3 && windowSec <= 0.6, `timing window ${windowSec}s should be real, not trivial and not pixel-perfect`);
});

test('jumping early still falls, and a collapsed plank does not make an impossible hole', () => {
  const reach = Math.min(L.runningJumpReach(1 / 120), L.runningJumpReach(1 / 60));
  const planks = L.createPlanks();
  for (const [a, b] of L.GAPS) {
    const lead = (reach - (b - a)) + 28;
    const takeoff = a - lead;
    assert.equal(L.isPit(takeoff, planks), false, 'the failed jump still leaves the ground');
    const land = jumpLanding(takeoff, 1 / 60);
    assert.ok(land < b && land > a, `early jump should drop inside ${a}-${b}, landed ${land}`);
  }
  for (let i = 0; i < L.CRUMBLE.length; i++) {
    const hole = L.GAPS[i][1] - L.CRUMBLE[i][0];
    assert.ok(reach >= hole + L.LANDING_MARGIN, `collapsed plank + gap ${hole} is not jumpable`);
    const land = jumpLanding(L.CRUMBLE[i][0], 1 / 60);
    assert.ok(land >= L.GAPS[i][1] + L.LANDING_MARGIN, 'jumping as the plank starts cracking still clears');
    assert.ok(L.stablePadAt(land), 'that jump lands on stone, not the next crack');
  }
});

test('cracked planks punish waiting, and the midpoint checkpoint sticks', () => {
  const cross = L.CRUMBLE_W / L.P_SPEED;
  assert.ok(cross < L.CRUMBLE_WARN - 0.45, 'a runner can cross a cracking plank and still jump');
  assert.ok(L.CRUMBLE_WARN < 1.4, 'standing on a cracking plank is not safe');
  const planks = L.createPlanks();
  const x = (L.CRUMBLE[0][0] + L.CRUMBLE[0][1]) / 2;
  const hero = { x, z: 0, onBridge: true };
  let t = 0;
  const dt = 1 / 60;
  while (t < L.CRUMBLE_WARN - dt) {
    L.stepPlanks(planks, hero, dt);
    t += dt;
    assert.equal(planks[0].collapsed, false);
    assert.equal(L.isPit(x, planks), false);
  }
  while (t < L.CRUMBLE_WARN + dt * 2) {
    L.stepPlanks(planks, hero, dt);
    t += dt;
  }
  assert.equal(planks[0].collapsed, true);
  assert.equal(L.isPit(x, planks), true);
  assert.equal(L.isPit(L.BRIDGE_SPAWN, L.createPlanks()), false);
  assert.equal(L.isPit(L.BRIDGE_MID, L.createPlanks()), false);
  assert.ok(L.stablePadAt(L.BRIDGE_SPAWN));
  assert.ok(L.stablePadAt(L.BRIDGE_MID));
  assert.ok(L.BRIDGE_MID > L.GAPS[1][1] && L.BRIDGE_MID < L.GAPS[2][0], 'checkpoint sits on the pad after the second gap');
  assert.equal(L.advanceBridgeCheckpoint(L.BRIDGE_SPAWN, L.BRIDGE_MID - 12, 0, false), L.BRIDGE_SPAWN);
  assert.equal(L.advanceBridgeCheckpoint(L.BRIDGE_SPAWN, L.BRIDGE_MID + 4, 0, false), L.BRIDGE_MID);
  assert.equal(L.advanceBridgeCheckpoint(L.BRIDGE_MID, L.BRIDGE_SPAWN, 0, false), L.BRIDGE_MID);
  assert.equal(L.advanceBridgeCheckpoint(L.BRIDGE_SPAWN, L.BRIDGE_MID + 4, 12, false), L.BRIDGE_SPAWN);
});

test('a timed running jump clears the bridge and an early jump does not', () => {
  const timed = runBridge(64);
  assert.equal(timed.falls, 0, `timed jump fell at x ${timed.x}`);
  assert.ok(timed.cleared, `timed jump stopped at ${timed.x}, bridge ends ${L.BRIDGE_END}`);
  const early = runBridge(230);
  assert.ok(early.falls > 0, 'jumping a full beat early must miss the first gap');
  assert.equal(early.cleared, false);
});

test('attack tokens hold at 1 then 2, and waiting Trollocs spread around Riley', () => {
  assert.equal(L.tokenCap(0), 1);
  assert.equal(L.tokenCap(1), 2);
  assert.equal(L.tokenCap(2), 2);
  assert.equal(L.WAVE_TUNING[0].tokens, 1);
  assert.equal(L.WAVE_TUNING[1].tokens, 2);
  const bag = { attackTokenCount: 0, maxAttackTokens: 1 };
  const a = { hasToken: false };
  const b = { hasToken: false };
  assert.equal(L.claimToken(bag, a), true);
  assert.equal(L.claimToken(bag, b), false);
  assert.equal(bag.attackTokenCount, 1);
  L.releaseToken(bag, a);
  assert.equal(bag.attackTokenCount, 0);
  assert.equal(L.claimToken(bag, b), true);

  const wave1 = L.simulateCrowd({ waveIndex: 0, count: 3, seconds: 4.8 });
  assert.equal(wave1.maxTokens, 1);
  const wave3 = L.simulateCrowd({ waveIndex: 2, count: 5, seconds: 4.8 });
  assert.equal(wave3.maxTokens, 2);
  assert.ok(wave3.maxTokens <= wave3.cap);
  const waiting = L.simulateCrowd({ waveIndex: 2, count: 5, seconds: 3.6, initialCooldown: 9 });
  const xs = waiting.enemies.map(e => e.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 180, `Trollocs still clumped, x span ${Math.max(...xs) - Math.min(...xs)}`);
  for (const e of waiting.enemies) {
    assert.equal(e.hasToken, false);
    assert.equal(e.state, 'circle');
    const dist = Math.hypot(e.x - waiting.player.x, e.y - waiting.player.y);
    assert.ok(dist > 140, `waiting Trolloc stood at ${dist.toFixed(0)}px instead of mid range`);
  }
  assert.ok(xs.some(x => x < waiting.player.x - 40) && xs.some(x => x > waiting.player.x + 40), 'the ring should wrap both sides of Riley');
  let closest = Infinity;
  for (let i = 0; i < waiting.enemies.length; i++) {
    for (let j = i + 1; j < waiting.enemies.length; j++) {
      closest = Math.min(closest, Math.hypot(waiting.enemies[i].x - waiting.enemies[j].x, waiting.enemies[i].y - waiting.enemies[j].y));
    }
  }
  assert.ok(closest > 70, `waiting Trollocs overlapped, closest ${closest.toFixed(0)}px`);
});

test('roll i-frames cover the whole roll, including the Gray Man strike lane', () => {
  assert.ok(L.ROLL_DURATION >= 0.34);
  for (const actionT of [0, 0.05, 0.2, L.ROLL_DURATION / 2, L.ROLL_DURATION - 0.001]) {
    const roller = { x: 500, y: 360, z: 0, falling: 0, invuln: 0, action: 'dodge', actionT };
    assert.equal(L.isInvulnerable(roller), true, `vulnerable at t=${actionT}`);
    assert.equal(L.grayManStrikeConnects(roller, 500, 360), false, `Gray Man hit through the roll at t=${actionT}`);
  }
  const exposed = { x: 500, y: 360, z: 0, falling: 0, invuln: 0, action: 'idle', actionT: 0 };
  assert.equal(L.isInvulnerable(exposed), false);
  assert.equal(L.grayManStrikeConnects(exposed, 500, 360), true);
  const jumped = { x: 500, y: 360, z: 40, falling: 0, invuln: 0, action: 'air', actionT: 0 };
  assert.equal(L.grayManStrikeConnects(jumped, 500, 360), false);
  const mercy = { x: 500, y: 360, z: 0, falling: 0, invuln: 0.2, action: 'hurt', actionT: 0.1 };
  assert.equal(L.grayManStrikeConnects(mercy, 500, 360), false);
});

test('Trolloc deaths count once and the end screen shows them', () => {
  const hero = { x: 0, y: 0, facing: 1, combo: 3, trollocKills: 0, kills: 0, score: 0, focus: 20, time: 95, falls: 1, lives: 2 };
  const foes = [0, 1, 2, 3].map(i => ({ x: 40 + i, y: 0, hp: 52, maxHp: 52, state: 'circle', counted: false, z: 0, vz: 0 }));
  for (const e of foes) {
    const result = L.applyHeroHit(e, hero, 54, { launcher: true, combo: 3 });
    assert.equal(result.lethal, true);
    assert.equal(result.counted, true);
    assert.equal(result.launcher, true);
    assert.equal(e.state, 'dead');
    assert.ok(e.vz >= 600, 'finisher launches even a killing blow');
    assert.equal(L.applyHeroHit(e, hero, 20, { combo: 1 }), null);
  }
  assert.equal(hero.trollocKills, 4);
  assert.equal(hero.kills, 4);
  const bruised = { x: 20, y: 0, hp: 80, state: 'circle', counted: false, z: 0, vz: 0 };
  const jab = L.applyHeroHit(bruised, hero, 25, { combo: 1 });
  assert.equal(jab.lethal, false);
  assert.equal(jab.counted, false);
  assert.equal(hero.trollocKills, 4);
  assert.equal(bruised.state, 'hurt');
  const html = L.formatRunStats(hero);
  assert.match(html, /id="trolloc-kills">4</);
  assert.match(html, /Trollocs killed/);
  const fin = L.knockProfile({ combo: 3, launcher: true });
  const light = L.knockProfile({ combo: 1 });
  const finTravel = L.knockTravel(fin.knockback, fin.friction);
  const jabTravel = L.knockTravel(light.knockback, light.friction);
  assert.ok(finTravel > jabTravel * 2, 'finisher knockback should clearly outrun a jab');
  assert.ok(jabTravel > 70 && jabTravel < 140, `jab travel ${jabTravel} should read without dropping the combo`);
  assert.ok(fin.launchVz >= 600);
});

test('an attack turns to the nearest enemy behind Riley and hits it', () => {
  const hero = { x: 400, y: 360, facing: 1, action: 'attack' };
  const behind = { x: 355, y: 364, hp: 40, state: 'circle' };
  const far = { x: 640, y: 360, hp: 40, state: 'circle' };
  const strike = L.targetsHitByAttack(hero, [behind, far]);
  assert.equal(strike.facing, -1);
  assert.ok(strike.hits.includes(behind));
  assert.equal(strike.hits.includes(far), false);
  assert.equal(L.facingAfterMove({ facing: -1, action: 'attack' }, 1), -1);
  assert.equal(L.facingAfterMove({ facing: 1, action: 'idle' }, -1), -1);
});

function runBridge(lead, dt = 1 / 60) {
  const planks = L.createPlanks();
  let x = L.BRIDGE_SPAWN;
  let z = 0;
  let vz = 0;
  let jumpVx = 0;
  let action = 'idle';
  let falls = 0;
  for (let f = 0; f < 60 * 45 && x < L.BRIDGE_END - 6; f++) {
    const onBridge = x >= L.BRIDGE_START && x <= L.BRIDGE_END;
    L.stepPlanks(planks, { x, z, onBridge }, dt);
    if (action === 'fall') {
      falls += 1;
      x = L.BRIDGE_SPAWN;
      z = 0;
      vz = 0;
      jumpVx = 0;
      action = 'idle';
      for (const plank of planks) { plank.timer = 0; plank.collapsed = false; }
      if (falls > 2) break;
      continue;
    }
    const airborne = z > 0 || action === 'air';
    if (airborne) x += jumpVx * dt;
    else x += L.P_SPEED * dt;
    const pits = L.GAPS.filter((span) => span[1] > x);
    L.CRUMBLE.forEach((span, i) => { if (planks[i].collapsed && span[1] > x) pits.push(span); });
    pits.sort((p, q) => p[0] - q[0]);
    const pit = pits[0];
    if (!airborne && pit && pit[0] - x <= lead && pit[0] - x >= -1) {
      jumpVx = L.P_SPEED;
      vz = L.JUMP_V;
      action = 'air';
    }
    const state = { z, vz, jumpVx };
    const phase = L.stepVertical(state, dt);
    z = state.z;
    vz = state.vz;
    jumpVx = state.jumpVx;
    if (phase === 'landed') action = 'idle';
    if (onBridge && z <= 0 && L.isPit(x, planks)) action = 'fall';
  }
  return { x, falls, cleared: falls === 0 && x >= L.BRIDGE_END - 6 };
}
