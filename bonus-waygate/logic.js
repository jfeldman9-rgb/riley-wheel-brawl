// Pure Waygate Gauntlet rules shared by the browser game and node --test.
// No Phaser, no DOM. Keep bridge motion in lockstep with stepVertical / runningJumpReach.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WaygateLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FLOOR = 420;
  const P_SPEED = 245;
  const GRAVITY = 1500;
  const JUMP_V = 730;
  const LANDING_MARGIN = 44;
  const CRUMBLE_WARN = 1.08;
  const ROLL_DURATION = 0.4;
  const BRIDGE_START = 2220;
  const GAP_W = 90;
  const CRUMBLE_W = 56;
  const RUNWAY_W = 196;
  const LANDING_W = 196;
  const EXIT_W = 200;
  const GAP_COUNT = 4;
  const LANE_MIN_Y = 321;
  const LANE_MAX_Y = FLOOR - 8;
  const MID_RANGE = 172;
  const TOKEN_CAPS = [1, 2, 2];
  const ATTACK_HIT = { behind: 28, ahead: 150, y: 72 };

  const WAVE_TUNING = [
    { hp: 52, hpStep: 4, damage: 12, tokens: 1, windup: 0.88, speed: 72 },
    { hp: 72, hpStep: 6, damage: 16, tokens: 2, windup: 0.76, speed: 84 },
    { hp: 86, hpStep: 7, damage: 19, tokens: 2, windup: 0.68, speed: 96 }
  ];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmtTime(s) {
    s = Math.max(0, s || 0);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  function buildBridge() {
    const gaps = [];
    const crumble = [];
    const pads = [];
    let x = BRIDGE_START;
    pads.push([x, x + RUNWAY_W]);
    x += RUNWAY_W;
    for (let i = 0; i < GAP_COUNT; i++) {
      crumble.push([x, x + CRUMBLE_W]);
      x += CRUMBLE_W;
      gaps.push([x, x + GAP_W]);
      x += GAP_W;
      const span = i === GAP_COUNT - 1 ? EXIT_W : LANDING_W;
      pads.push([x, x + span]);
      x += span;
    }
    return { gaps, crumble, pads, bridgeEnd: x };
  }

  const layout = buildBridge();
  const GAPS = layout.gaps;
  const CRUMBLE = layout.crumble;
  const PADS = layout.pads;
  const BRIDGE_END = layout.bridgeEnd;
  const BRIDGE_SPAWN = PADS[0][0] + 52;
  // After two gaps: stable pad, inset so the respawn is not on a lip.
  const BRIDGE_MID = PADS[2][0] + 64;
  const ARENA_START = BRIDGE_END + 120;
  const ARENA_LEFT = ARENA_START - 30;
  const ARENA_RIGHT = ARENA_START + 730;
  const BOSS_X = ARENA_START + 250;
  const EXIT_X = ARENA_RIGHT + 240;
  const WORLD = EXIT_X + 200;

  function stepVertical(hero, dt) {
    if (hero.z > 0 || hero.vz > 0) {
      hero.z += hero.vz * dt;
      hero.vz -= GRAVITY * dt;
      if (hero.z <= 0) {
        hero.z = 0;
        hero.vz = 0;
        hero.jumpVx = 0;
        return 'landed';
      }
      return 'air';
    }
    return 'ground';
  }

  // Running jump: direction held on the takeoff frame, then jumpVx carries the arc.
  // Matches WaygateScene bridge order: ground step, takeoff, vertical, then air steps.
  function runningJumpReach(dt) {
    const hero = { x: 0, z: 0, vz: 0, jumpVx: 0, action: 'idle' };
    hero.x += P_SPEED * dt;
    hero.jumpVx = P_SPEED;
    hero.vz = JUMP_V;
    hero.action = 'air';
    stepVertical(hero, dt);
    let guard = 0;
    while (hero.z > 0 && guard++ < 4000) {
      hero.x += hero.jumpVx * dt;
      stepVertical(hero, dt);
    }
    return hero.x;
  }

  function createPlanks() {
    return CRUMBLE.map(() => ({ timer: 0, collapsed: false }));
  }

  function isPit(x, planks) {
    if (GAPS.some(([a, b]) => x > a && x < b)) return true;
    if (!planks) return false;
    return CRUMBLE.some(([a, b], i) => planks[i] && planks[i].collapsed && x > a && x < b);
  }

  function stablePadAt(x) {
    return PADS.find(([a, b]) => x >= a && x <= b) || null;
  }

  function stepPlanks(planks, hero, dt) {
    const started = [];
    const collapsed = [];
    for (let i = 0; i < planks.length; i++) {
      const plank = planks[i];
      const [a, b] = CRUMBLE[i];
      if (!plank.collapsed && plank.timer <= 0 && hero.x >= a && hero.x <= b && hero.z <= 0 && hero.onBridge) {
        plank.timer = CRUMBLE_WARN;
        started.push(i);
      }
      if (plank.timer > 0 && !plank.collapsed) {
        plank.timer -= dt;
        if (plank.timer <= 0) {
          plank.timer = 0;
          plank.collapsed = true;
          collapsed.push(i);
        }
      }
    }
    return { started, collapsed, changed: started.length + collapsed.length > 0 };
  }

  function advanceBridgeCheckpoint(current, x, z, pit) {
    if (z <= 0 && !pit && x >= BRIDGE_MID && current < BRIDGE_MID) return BRIDGE_MID;
    return current;
  }

  function tokenCap(waveIndex) {
    const i = Math.max(0, Math.min(TOKEN_CAPS.length - 1, waveIndex | 0));
    return TOKEN_CAPS[i];
  }

  function claimToken(bag, enemy) {
    if (!enemy || enemy.hasToken) return !!enemy && enemy.hasToken;
    if (bag.attackTokenCount >= bag.maxAttackTokens) return false;
    enemy.hasToken = true;
    bag.attackTokenCount += 1;
    return true;
  }

  function releaseToken(bag, enemy) {
    if (!enemy || !enemy.hasToken) return;
    enemy.hasToken = false;
    bag.attackTokenCount = Math.max(0, bag.attackTokenCount - 1);
  }

  function orbitOffset(slot, count, time) {
    const n = Math.max(1, count);
    // The fight lane is too shallow for a round circle, so waiting Trollocs mill on both
    // flanks at mid range and drift. X never collapses onto Riley.
    const flank = Math.ceil(n / 2);
    const index = Math.floor(slot / 2);
    const side = slot % 2 === 0 ? -1 : 1;
    const phase = time * 0.7 + slot * 1.4;
    const along = MID_RANGE + index * 108 + Math.cos(phase) * 12;
    const y = (index - (flank - 1) / 2) * 28 + Math.sin(phase) * 10;
    return { x: side * along, y };
  }

  function separateEnemies(enemies, dt) {
    const live = enemies.filter(e => e.hp > 0 && e.state !== 'dead' && e.state !== 'launched');
    const radius = 84;
    const force = 380;
    for (let pass = 0; pass < 2; pass++) {
      const acc = live.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          let dx = live[j].x - live[i].x;
          let dy = live[j].y - live[i].y;
          let dist = Math.hypot(dx, dy);
          if (dist < 0.001) {
            dx = (j % 2 ? 1 : -1);
            dy = 0.4;
            dist = Math.hypot(dx, dy);
          }
          if (dist >= radius) continue;
          const push = ((radius - dist) / radius) * force * dt;
          const nx = dx / dist;
          const ny = dy / dist;
          const wi = live[i].state === 'windup' || live[i].state === 'strike' ? 0.2 : 1;
          const wj = live[j].state === 'windup' || live[j].state === 'strike' ? 0.2 : 1;
          acc[i].x -= nx * push * wi;
          acc[i].y -= ny * push * wi;
          acc[j].x += nx * push * wj;
          acc[j].y += ny * push * wj;
        }
      }
      for (let i = 0; i < live.length; i++) {
        live[i].x += acc[i].x;
        live[i].y += acc[i].y;
      }
    }
  }

  function clampEnemy(e, bounds) {
    e.x = clamp(e.x, bounds.minX, bounds.maxX);
    e.y = clamp(e.y, bounds.minY, bounds.maxY);
  }

  function stepEnemy(e, ctx) {
    const dt = ctx.dt;
    const p = ctx.player;
    const bag = ctx.tokenBag;
    const bounds = ctx.bounds;
    const rng = ctx.rng || Math.random;
    const waveSize = ctx.waveSize || 1;
    const events = { anim: null, hit: null };
    if (e.state === 'dead') {
      releaseToken(bag, e);
      if (e.knock) {
        e.x += e.knock * dt;
        e.knock *= Math.pow(e.knockFriction || 0.2, dt);
      }
      if (e.z > 0 || e.vz) {
        e.z += (e.vz || 0) * dt;
        e.vz = (e.vz || 0) - 1220 * dt;
        if (e.z <= 0) { e.z = 0; e.vz = 0; }
      }
      e.timer -= dt;
      return events;
    }
    if (e.hp <= 0) return events;
    e.cooldown -= dt;
    if (e.knock) {
      e.x += e.knock * dt;
      e.knock *= Math.pow(e.knockFriction || 0.05, dt);
      if (Math.abs(e.knock) < 6) e.knock = 0;
    }
    if (e.state === 'launched') {
      e.timer -= dt;
      e.z += e.vz * dt;
      e.vz -= 1220 * dt;
      if (e.z <= 0 && e.vz < 0) {
        e.z = 0;
        e.vz = 0;
        e.state = 'hurt';
        e.timer = 0.25;
        events.anim = 'grunt_hurt';
      }
      clampEnemy(e, bounds);
      return events;
    }
    if (e.state === 'hurt') {
      releaseToken(bag, e);
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'circle';
        events.anim = 'grunt_walk';
      }
      clampEnemy(e, bounds);
      return events;
    }
    if (e.state === 'windup') {
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'strike';
        e.timer = 0.23;
        e.hitDone = false;
        events.anim = 'grunt_attack';
      }
      return events;
    }
    if (e.state === 'strike') {
      e.timer -= dt;
      e.x += Math.sign(e.targetX - e.x || 1) * 95 * dt;
      if (!e.hitDone && e.timer < 0.12) {
        e.hitDone = true;
        const inLane = Math.abs(p.x - e.targetX) < 93 && Math.abs(p.y - e.targetY) < 64 && p.z < 28;
        if (inLane && !(p.falling > 0) && !isInvulnerable(p)) {
          events.hit = { damage: e.attackDamage, knock: Math.sign(p.x - e.x || 1) * 205 };
        }
      }
      if (e.timer <= 0) {
        e.state = 'circle';
        e.cooldown = 1.18 + rng() * 0.38;
        releaseToken(bag, e);
        events.anim = 'grunt_walk';
      }
      clampEnemy(e, bounds);
      return events;
    }

    const orbit = orbitOffset(e.slot, waveSize, ctx.time || 0);
    const dist = Math.hypot(p.x - e.x, (p.y - e.y) * 1.15);
    if (!e.hasToken && e.cooldown <= 0 && !(p.falling > 0) && dist < 260 && dist > 40) {
      claimToken(bag, e);
      if (e.hasToken) e.tokenTimer = 2.5;
    }
    let tx = p.x + orbit.x;
    let ty = clamp(p.y + orbit.y, bounds.minY, bounds.maxY);
    if (e.hasToken) {
      e.tokenTimer = (e.tokenTimer || 2.5) - dt;
      const side = e.slot % 2 === 0 ? -1 : 1;
      tx = p.x + side * 62;
      ty = clamp(p.y + (side < 0 ? -22 : 26), bounds.minY, bounds.maxY);
      const melee = Math.abs(p.x - e.x) < 96 && Math.abs(p.y - e.y) < 60;
      if (melee) {
        e.state = 'windup';
        e.timer = e.windup;
        e.targetX = p.x;
        e.targetY = p.y;
        events.anim = 'grunt_attack';
      } else if (e.tokenTimer <= 0) {
        releaseToken(bag, e);
      }
    }
    if (e.state === 'circle') {
      e.x += clamp(tx - e.x, -e.speed * dt, e.speed * dt);
      e.y += clamp(ty - e.y, -e.speed * 0.82 * dt, e.speed * 0.82 * dt);
    }
    clampEnemy(e, bounds);
    return events;
  }

  function simulateCrowd(options) {
    const waveIndex = options.waveIndex || 0;
    const count = options.count;
    const dt = options.dt || 1 / 60;
    const tune = WAVE_TUNING[Math.max(0, Math.min(WAVE_TUNING.length - 1, waveIndex))];
    const bag = { attackTokenCount: 0, maxAttackTokens: tokenCap(waveIndex) };
    const player = { x: options.playerX || 640, y: options.playerY || 364, z: 0, falling: 0, invuln: 0, action: 'idle', actionT: 0 };
    const bounds = { minX: 80, maxX: 2200, minY: LANE_MIN_Y, maxY: LANE_MAX_Y };
    const enemies = [];
    for (let i = 0; i < count; i++) {
      enemies.push({
        x: player.x + 6, y: player.y + (i - count / 2) * 2, hp: tune.hp, maxHp: tune.hp,
        state: 'circle', timer: 0, cooldown: options.initialCooldown ?? 0, knock: 0, knockFriction: 0.05, hitDone: false,
        targetX: 0, targetY: 0, attackDamage: tune.damage, windup: tune.windup, speed: tune.speed,
        slot: i, hasToken: false, z: 0, vz: 0, counted: false, tokenTimer: 0
      });
    }
    const rng = options.rng || (() => 0.2);
    let maxTokens = 0;
    const steps = Math.round((options.seconds || 4.5) / dt);
    for (let s = 0; s < steps; s++) {
      const time = s * dt;
      for (const e of enemies) stepEnemy(e, { dt, time, player, tokenBag: bag, bounds, rng, waveSize: count });
      separateEnemies(enemies, dt);
      for (const e of enemies) clampEnemy(e, bounds);
      if (bag.attackTokenCount > bag.maxAttackTokens) {
        throw new Error(`token cap exceeded: ${bag.attackTokenCount} > ${bag.maxAttackTokens}`);
      }
      maxTokens = Math.max(maxTokens, bag.attackTokenCount);
    }
    return { enemies, maxTokens, cap: bag.maxAttackTokens, player };
  }

  function isInvulnerable(p) {
    if (!p || p.falling > 0) return false;
    if (p.action === 'dodge' && p.actionT < ROLL_DURATION) return true;
    return p.invuln > 0;
  }

  function grayManStrikeConnects(player, targetX, targetY) {
    if (isInvulnerable(player) || player.falling > 0) return false;
    return Math.abs(player.x - targetX) < 116 && Math.abs(player.y - targetY) < 76 && player.z < 30;
  }

  function nearestThreat(hero, enemies, boss) {
    let best = null;
    let bestD = Infinity;
    const list = [];
    if (enemies) {
      for (const e of enemies) {
        if (e && e.hp > 0 && e.state !== 'dead') list.push(e);
      }
    }
    if (boss && boss.active && !boss.defeated && boss.hp > 0) list.push(boss);
    for (const t of list) {
      const dx = t.x - hero.x;
      const dy = t.y - hero.y;
      if (Math.abs(dy) > 130) continue;
      const d = Math.hypot(dx, dy * 1.35);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (!best || bestD > 340) return null;
    return best;
  }

  function facingTowardThreat(hero, enemies, boss) {
    const threat = nearestThreat(hero, enemies, boss);
    if (!threat) return hero.facing || 1;
    return Math.sign(threat.x - hero.x) || hero.facing || 1;
  }

  function facingAfterMove(hero, mx) {
    if (!mx) return hero.facing || 1;
    if (hero.action === 'attack' || hero.action === 'special') return hero.facing || 1;
    return Math.sign(mx);
  }

  function targetsHitByAttack(hero, enemies, boss) {
    const facing = facingTowardThreat(hero, enemies, boss);
    const hits = [];
    for (const e of enemies) {
      if (!e || e.hp <= 0 || e.state === 'dead') continue;
      if (Math.abs(e.y - hero.y) >= ATTACK_HIT.y) continue;
      const along = (e.x - hero.x) * facing;
      if (along > -ATTACK_HIT.behind && along < ATTACK_HIT.ahead) hits.push(e);
    }
    hits.sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x));
    return { facing, hits };
  }

  function knockProfile(options) {
    const opts = options || {};
    const finisher = !!(opts.launcher || opts.combo === 3);
    if (finisher) return { knockback: 560, friction: 0.2, launchVz: 700, heavy: true, launcher: true };
    if (opts.heavy) return { knockback: 380, friction: 0.06, launchVz: 0, heavy: true, launcher: false };
    if (opts.combo === 2) return { knockback: 320, friction: 0.05, launchVz: 0, heavy: false, launcher: false };
    return { knockback: 280, friction: 0.045, launchVz: 0, heavy: false, launcher: false };
  }

  function knockTravel(knockback, friction) {
    return knockback / -Math.log(friction);
  }

  function registerTrollocKill(enemy, hero) {
    if (!enemy || enemy.counted) return false;
    enemy.counted = true;
    hero.trollocKills = (hero.trollocKills || 0) + 1;
    hero.kills = hero.trollocKills;
    return true;
  }

  function applyHeroHit(enemy, hero, amount, options) {
    if (!enemy || enemy.hp <= 0 || enemy.state === 'dead') return null;
    const lethal = enemy.hp - amount <= 0;
    enemy.hp = Math.max(0, enemy.hp - amount);
    const profile = knockProfile(Object.assign({ combo: hero.combo || 0 }, options || {}));
    const dir = Math.sign(enemy.x - hero.x) || hero.facing || 1;
    enemy.knock = dir * profile.knockback;
    enemy.knockFriction = profile.friction;
    if (profile.launcher) {
      enemy.vz = profile.launchVz;
      enemy.z = Math.max(0, enemy.z || 0);
      enemy.state = lethal ? 'dead' : 'launched';
      enemy.timer = lethal ? 0.74 : 0.64;
    } else {
      enemy.state = lethal ? 'dead' : 'hurt';
      enemy.timer = lethal ? 0.56 : 0.28;
    }
    hero.score = (hero.score || 0) + (lethal ? 180 : 35);
    hero.focus = clamp((hero.focus || 0) + 8, 0, 100);
    const counted = lethal ? registerTrollocKill(enemy, hero) : false;
    if (counted) hero.score += 120;
    return {
      lethal, counted, heavy: profile.heavy || lethal, launcher: profile.launcher,
      knockback: profile.knockback, launchVz: profile.launchVz
    };
  }

  function formatRunStats(hero) {
    const kills = hero.trollocKills | 0;
    return `<div class="result"><div class="kills"><strong id="trolloc-kills">${kills}</strong><span>Trollocs killed</span></div><div><strong>${fmtTime(hero.time)}</strong><span>Time</span></div><div><strong>${hero.falls || 0}</strong><span>Falls</span></div><div><strong>${hero.lives}</strong><span>Lives left</span></div><div><strong>${String(hero.score || 0).padStart(6, '0')}</strong><span>Score</span></div></div>`;
  }

  return {
    FLOOR, P_SPEED, GRAVITY, JUMP_V, LANDING_MARGIN, CRUMBLE_WARN, ROLL_DURATION,
    BRIDGE_START, BRIDGE_END, BRIDGE_SPAWN, BRIDGE_MID, GAPS, CRUMBLE, PADS,
    ARENA_START, ARENA_LEFT, ARENA_RIGHT, BOSS_X, EXIT_X, WORLD,
    GAP_W, CRUMBLE_W, LANE_MIN_Y, LANE_MAX_Y, MID_RANGE, WAVE_TUNING, ATTACK_HIT,
    clamp, fmtTime, stepVertical, runningJumpReach, createPlanks, isPit, stablePadAt,
    stepPlanks, advanceBridgeCheckpoint, tokenCap, claimToken, releaseToken,
    orbitOffset, separateEnemies, stepEnemy, simulateCrowd, isInvulnerable,
    grayManStrikeConnects, nearestThreat, facingTowardThreat, facingAfterMove,
    targetsHitByAttack, knockProfile, knockTravel, registerTrollocKill, applyHeroHit,
    formatRunStats
  };
});
