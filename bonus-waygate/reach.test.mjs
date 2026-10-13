import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const L = createRequire(import.meta.url)('./logic.js');
const gameSrc = fs.readFileSync(new URL('./game.js', import.meta.url), 'utf8');
const WAVE_COUNTS = [3, 4, 5];
const DT = 1 / 60;
const REACH_BIT = 32;

function laneBounds(arena) {
  return { minX: arena.minX, maxX: arena.maxX, minY: L.LANE_MIN_Y, maxY: L.LANE_MAX_Y };
}

function assertInReach(arena, enemies, where) {
  const heroMax = arena.maxX;
  for (const e of enemies) {
    if (!e) continue;
    assert.ok(e.x <= heroMax + 1e-4, `${where}: enemy x ${e.x} is past Riley's max ${heroMax}`);
    assert.ok(e.x >= arena.minX - 1e-4, `${where}: enemy x ${e.x} is before the arena min ${arena.minX}`);
    if (e.hp > 0 && e.state !== 'dead') {
      assert.ok(heroMax >= e.x, `${where}: living enemy at ${e.x} is out of reach`);
      assert.ok(heroMax + L.ATTACK_HIT.ahead >= e.x + REACH_BIT, `${where}: attack cannot cover ${e.x}`);
    }
  }
}

function makeEnemy(i, count, player, bounds, tune) {
  const orbit = L.orbitOffset(i, count, 0);
  return {
    x: L.clamp(player.x + orbit.x, bounds.minX, bounds.maxX),
    y: L.clamp(player.y + orbit.y, bounds.minY, bounds.maxY),
    hp: tune.hp, maxHp: tune.hp, state: 'circle', timer: 0.15, cooldown: 3,
    knock: 0, knockFriction: 0.05, hitDone: false, targetX: 0, targetY: 0,
    attackDamage: tune.damage, windup: tune.windup, speed: tune.speed,
    slot: i, hasToken: false, z: 0, vz: 0, counted: false, tokenTimer: 0
  };
}

function scriptWave(index) {
  const anchor = L.WAVE_AT[index] + 2;
  const arena = L.waveArena(index, anchor);
  assert.equal(arena.viewRight - arena.viewLeft, L.VIEW_W, `wave ${index} arena is not one screen`);
  assert.equal(arena.maxX - arena.minX, L.VIEW_W - 2 * L.EDGE_MARGIN);
  const ceiling = index >= L.WAVE_AT.length - 1 ? L.BRIDGE_START : L.WAVE_AT[index + 1];
  assert.ok(arena.viewRight <= ceiling + 1e-6, `wave ${index} view spills into the next stretch`);
  assert.ok(arena.maxX < ceiling, `wave ${index} walkable max reaches the next trigger`);
  assert.ok(anchor >= arena.minX && anchor <= arena.maxX, `wave ${index} trigger is outside the arena`);

  const count = WAVE_COUNTS[index];
  const tune = L.WAVE_TUNING[index];
  const player = {
    x: L.clamp(anchor, arena.minX, arena.maxX), y: 364, z: 0, falling: 0, invuln: 0,
    action: 'idle', facing: 1, combo: 3, focus: 60, score: 0, trollocKills: 0
  };
  const bounds = laneBounds(arena);
  const bag = { attackTokenCount: 0, maxAttackTokens: L.tokenCap(index) };
  const enemies = [];
  for (let i = 0; i < count; i++) enemies.push(makeEnemy(i, count, player, bounds, tune));
  assertInReach(arena, enemies, `wave ${index} spawn`);

  let stoodOnTheRight = false;
  for (let f = 0; f < 60 * 45; f++) {
    const live = enemies.filter((e) => e.hp > 0 && e.state !== 'dead');
    if (!live.length) break;
    let target = live[0];
    for (const e of live) if (Math.abs(e.x - player.x) < Math.abs(target.x - player.x)) target = e;
    const dir = Math.sign(target.x - player.x) || 1;
    player.facing = dir;
    player.x = L.clamp(player.x + dir * 390 * DT, arena.minX, arena.maxX);
    if (f % 90 === 40) player.x = arena.maxX;
    if (player.x >= arena.maxX - 0.5 && live.length) stoodOnTheRight = true;
    if (Math.abs(target.x - player.x) < L.ATTACK_HIT.ahead && Math.abs(target.y - player.y) < L.ATTACK_HIT.y) {
      L.applyHeroHit(target, player, 54, { combo: 3, launcher: true });
    }
    for (const e of enemies) {
      L.stepEnemy(e, { dt: DT, time: f * DT, player, tokenBag: bag, bounds, rng: () => 0.2, waveSize: count });
    }
    L.resolveCrowd(enemies, { player, waveSize: count, time: f * DT, bounds, dt: DT });
    assert.ok(player.x <= arena.maxX + 1e-6 && player.x >= arena.minX - 1e-6);
    assertInReach(arena, enemies, `wave ${index} frame ${f}`);
  }
  assert.ok(enemies.every((e) => e.hp <= 0), `wave ${index} did not clear`);
  assert.ok(stoodOnTheRight, `wave ${index} never put Riley on the right edge while a Trolloc was alive`);
}

test('each locked wave keeps every Trolloc inside the screen Riley can walk', () => {
  for (let index = 0; index < L.WAVE_AT.length; index++) scriptWave(index);
});

test('a Trolloc launched into the right edge stays where Riley can reach him', () => {
  const arena = L.waveArena(2, L.WAVE_AT[2] + 2);
  const bounds = laneBounds(arena);
  const hero = {
    x: arena.maxX - 70, y: 364, facing: 1, combo: 3, focus: 0, score: 0, trollocKills: 0, action: 'attack'
  };
  const enemy = makeEnemy(3, 5, { x: arena.maxX - 70, y: 364 }, bounds, L.WAVE_TUNING[2]);
  enemy.x = arena.maxX - 8;
  enemy.hp = 90;
  const bag = { attackTokenCount: 0, maxAttackTokens: 1 };
  const hit = L.applyHeroHit(enemy, hero, 20, { launcher: true });
  assert.equal(hit.launcher, true);
  assert.ok(enemy.knock > 0, 'the launch travels toward the right edge');
  enemy.knock = 9000;
  let pinned = false;
  for (let f = 0; f < 240; f++) {
    L.stepEnemy(enemy, { dt: DT, time: f * DT, player: hero, tokenBag: bag, bounds, rng: () => 0.2, waveSize: 5 });
    assertInReach(arena, [enemy], `knock frame ${f}`);
    if (enemy.x >= arena.maxX - 0.01) {
      pinned = true;
      assert.ok(enemy.knock <= 0, 'outward knock must die on the arena wall');
    }
  }
  assert.ok(pinned, 'the body should fetch up on the right edge');
  assert.ok(arena.maxX + L.ATTACK_HIT.ahead >= enemy.x + REACH_BIT);
});

test('the Gray Man stays inside the same screen Riley can walk', () => {
  const arena = L.bossArena();
  assert.equal(arena.viewRight - arena.viewLeft, L.VIEW_W);
  assert.ok(arena.maxX < L.EXIT_X, 'the exit stays past the fight so the gate is the right wall only after he falls');
  assert.ok(L.BOSS_X >= arena.minX && L.BOSS_X <= arena.maxX, 'the Gray Man spawn is inside the arena');
  const player = { x: arena.minX + 60, y: 346, z: 0, falling: 0, invuln: 0, action: 'idle', facing: 1 };
  const boss = {
    hp: L.GRAY_MAN.hp, x: L.clamp(L.BOSS_X, arena.minX, arena.maxX), y: 346,
    phase: 'stalk', timer: 0.35, targetX: player.x, targetY: player.y, phaseTwo: false
  };
  const clampBoss = () => {
    boss.x = L.clamp(boss.x, arena.minX, arena.maxX);
    boss.y = L.clamp(boss.y, L.LANE_MIN_Y, L.LANE_MAX_Y);
  };
  for (let f = 0; f < 60 * 40 && boss.hp > 0; f++) {
    player.x = L.clamp(player.x + 390 * DT, arena.minX, arena.maxX);
    boss.timer -= DT;
    const dx = player.x - boss.x;
    if (boss.phase === 'stalk') {
      if (Math.abs(dx) > 175) boss.x += Math.sign(dx) * Math.min(Math.abs(dx) - 175, 92 * DT);
      clampBoss();
      if (boss.timer <= 0) {
        boss.phase = 'tell';
        boss.timer = boss.phaseTwo ? L.GRAY_MAN.tellFast : L.GRAY_MAN.tell;
        boss.targetX = L.clamp(player.x, arena.minX, arena.maxX);
        boss.targetY = player.y;
      }
    } else if (boss.phase === 'tell') {
      if (boss.timer <= 0) {
        boss.phase = 'strike';
        boss.timer = L.GRAY_MAN.strike;
        const side = boss.x < boss.targetX ? -1 : 1;
        boss.x = L.clamp(boss.targetX + side * 115, arena.minX, arena.maxX);
        boss.y = boss.targetY;
      }
    } else if (boss.phase === 'strike') {
      boss.timer -= DT;
      if (boss.timer <= 0) {
        boss.phase = 'recover';
        boss.timer = L.GRAY_MAN.recover;
        boss.x = L.clamp(boss.targetX + (boss.x < boss.targetX ? -90 : 90), arena.minX, arena.maxX);
      }
    } else if (boss.phase === 'recover') {
      boss.hp = Math.max(0, boss.hp - 54 * L.GRAY_MAN.punish);
      if (boss.timer <= 0 && boss.hp > 0) {
        boss.phase = 'stalk';
        boss.timer = 0.5;
      }
    }
    clampBoss();
    assert.ok(player.x <= arena.maxX);
    assert.ok(arena.maxX >= boss.x, `Gray Man x ${boss.x} past Riley max ${arena.maxX} in ${boss.phase}`);
    assert.ok(arena.maxX + L.ATTACK_HIT.ahead >= boss.x + REACH_BIT);
  }
  assert.equal(boss.hp, 0);
});

test('outside a wave the only right wall is the level end', () => {
  const roam = L.roamBounds();
  assert.equal(roam.minX, L.EDGE_MARGIN);
  assert.equal(roam.maxX, L.WORLD - L.EDGE_MARGIN);
  assert.ok(roam.maxX > L.EXIT_X, 'the Waygate itself is walkable');
  // Follow offset -160, no deadzone: scroll target is hero.x - 320, then clamped to the world.
  const targetScroll = roam.maxX - 320;
  const scroll = Math.max(0, Math.min(L.WORLD - L.VIEW_W, targetScroll));
  const screenX = roam.maxX - scroll;
  assert.ok(Math.abs(screenX - (L.VIEW_W - L.EDGE_MARGIN)) < 1, `right-edge screen x ${screenX}`);
  const arena = L.waveArena(2, L.WAVE_AT[2]);
  assert.equal(arena.maxX - arena.viewLeft, L.VIEW_W - L.EDGE_MARGIN);
});

test('game.js shares one arena with the camera and does not keep the old right wall', () => {
  assert.equal(gameSrc.includes('setDeadzone'), false);
  assert.equal(gameSrc.includes('+ 405'), false);
  assert.equal(gameSrc.includes('WORLD - 85'), false);
  assert.match(gameSrc, /waveArena\(/);
  assert.match(gameSrc, /bossArena\(/);
  assert.match(gameSrc, /roamBounds\(/);
  assert.match(gameSrc, /setBounds\(arena\.viewLeft, 0, VIEW_W, H\)/);
  assert.match(gameSrc, /startFollow\(this\.hero, true, 0\.085, 0\.06, -160, 0\)/);
});
