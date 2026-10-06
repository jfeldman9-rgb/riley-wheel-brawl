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
  // Grunt art at the in-game scale is about 168px across. The lane is too
  // shallow to unstack them vertically, so separation is a hard X push.
  const BODY_W = 168;
  const BODY_H = 168;
  const MAX_PAIR_OVERLAP = 0.25;
  const MIN_SEPARATION = BODY_W * (1 - MAX_PAIR_OVERLAP);
  const MELEE_RANGE = 112;
  const ATTACK_STANDOFF = 86;
  const RING_RANGE = ATTACK_STANDOFF + MIN_SEPARATION + 28;
  // Far flank slots sit past the inner ring. They still have to be allowed to take
  // a token, or a Trolloc parked on the outer ring never walks in.
  const GRAY_MAN = {
    hp: 220,
    damage: 22,
    damageFast: 28,
    tell: 0.88,
    tellFast: 0.66,
    strike: 0.27,
    recover: 1,
    punish: 1.3
  };

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
    enemy.attackSide = 0;
    bag.attackTokenCount = Math.max(0, bag.attackTokenCount - 1);
  }

  function orbitOffset(slot, count, time) {
    const n = Math.max(1, count);
    // Waiting Trollocs hold both flanks outside the attackers. Spacing is
    // wide enough that equal-height bodies overlap by less than a quarter.
    const flank = Math.ceil(n / 2);
    const index = Math.floor(slot / 2);
    const side = slot % 2 === 0 ? -1 : 1;
    const phase = time * 0.35 + slot * 1.4;
    const along = RING_RANGE + index * (MIN_SEPARATION + 18) + Math.cos(phase) * 4;
    const y = (index - (flank - 1) / 2) * 22 + Math.sin(phase) * 4;
    return { x: side * along, y };
  }

  function spriteOverlap(a, b) {
    const ow = Math.max(0, BODY_W - Math.abs(a.x - b.x));
    const oh = Math.max(0, BODY_H - Math.abs(a.y - b.y));
    return (ow * oh) / (BODY_W * BODY_H);
  }

  function separateEnemies(enemies) {
    const live = enemies.filter(e => e && e.hp > 0 && e.state !== 'dead');
    for (let pass = 0; pass < 10; pass++) {
      let moved = false;
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i];
          const b = live[j];
          if (spriteOverlap(a, b) <= MAX_PAIR_OVERLAP) continue;
          let dx = b.x - a.x;
          const dy = b.y - a.y;
          if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) dx = (j % 2 ? 1 : -1);
          const overlapH = Math.max(1, BODY_H - Math.abs(dy));
          const maxOverlapW = MAX_PAIR_OVERLAP * BODY_W * BODY_H / overlapH;
          const need = BODY_W - maxOverlapW + 3;
          const deficit = Math.max(3, need - Math.abs(dx));
          const sx = Math.sign(dx) || 1;
          const push = deficit / 2;
          a.x -= sx * push;
          b.x += sx * push;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function holdWaitingRing(enemies, ctx) {
    const player = ctx && ctx.player;
    const bounds = ctx && ctx.bounds;
    if (!player || !bounds) return;
    const waveSize = ctx.waveSize || enemies.length || 1;
    const time = ctx.time || 0;
    for (const e of enemies) {
      if (!e || e.hp <= 0 || e.hasToken) continue;
      if (e.state === 'dead' || e.state === 'launched' || e.state === 'hurt' || e.state === 'windup' || e.state === 'strike') continue;
      const orbit = orbitOffset(e.slot || 0, waveSize, time);
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      const ring = Math.hypot(orbit.x, orbit.y);
      if (dist < ring - 2) {
        e.x = player.x + orbit.x;
        e.y = clamp(player.y + orbit.y, bounds.minY, bounds.maxY);
      }
    }
  }

  function resolveCrowd(enemies, ctx) {
    const bounds = ctx && ctx.bounds;
    const settle = () => {
      if (!bounds) return;
      for (const e of enemies) {
        if (e && e.hp > 0) clampEnemy(e, bounds);
      }
    };
    for (let n = 0; n < 3; n++) {
      holdWaitingRing(enemies, ctx || {});
      separateEnemies(enemies);
      settle();
    }
    // The ring snap is not allowed to restack bodies. Separation is the last move.
    holdWaitingRing(enemies, ctx || {});
    separateEnemies(enemies);
    settle();
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
    if (!e.hasToken && e.cooldown <= 0 && !(p.falling > 0) && dist < 760 && dist > 40) {
      if (claimToken(bag, e)) {
        // Long enough to walk in from the outer flank. Wave 1 speed is the slow one.
        e.tokenTimer = 8;
        e.attackSide = bag.attackTokenCount % 2 === 1 ? -1 : 1;
      }
    }
    let tx = p.x + orbit.x;
    let ty = clamp(p.y + orbit.y, bounds.minY, bounds.maxY);
    if (e.hasToken) {
      e.tokenTimer = (e.tokenTimer || 8) - dt;
      const side = e.attackSide === 1 || e.attackSide === -1 ? e.attackSide : (e.slot % 2 === 0 ? -1 : 1);
      tx = p.x + side * ATTACK_STANDOFF;
      ty = clamp(p.y + side * 16, bounds.minY, bounds.maxY);
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
    let maxOverlap = 0;
    let maxMelee = 0;
    let sawLeft = false;
    let sawRight = false;
    const engaged = new Set();
    const steps = Math.round((options.seconds || 4.5) / dt);
    const crowdCtx = { player, bounds, waveSize: count, time: 0 };
    for (let s = 0; s < steps; s++) {
      const time = s * dt;
      crowdCtx.time = time;
      for (const e of enemies) stepEnemy(e, { dt, time, player, tokenBag: bag, bounds, rng, waveSize: count });
      resolveCrowd(enemies, crowdCtx);
      if (bag.attackTokenCount > bag.maxAttackTokens) {
        throw new Error(`token cap exceeded: ${bag.attackTokenCount} > ${bag.maxAttackTokens}`);
      }
      maxTokens = Math.max(maxTokens, bag.attackTokenCount);
      const live = enemies.filter(e => e.hp > 0 && e.state !== 'dead');
      let melee = 0;
      for (const e of live) {
        const away = Math.hypot(e.x - player.x, e.y - player.y);
        if (away < MELEE_RANGE) melee += 1;
        if (e.hasToken || away < MELEE_RANGE || e.state === 'windup' || e.state === 'strike') engaged.add(e);
        if (!e.hasToken && e.x < player.x - 80) sawLeft = true;
        if (!e.hasToken && e.x > player.x + 80) sawRight = true;
      }
      maxMelee = Math.max(maxMelee, melee);
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          maxOverlap = Math.max(maxOverlap, spriteOverlap(live[i], live[j]));
        }
      }
    }
    return {
      enemies, maxTokens, cap: bag.maxAttackTokens, player,
      maxOverlap, maxMelee, engaged: engaged.size, flanks: { left: sawLeft, right: sawRight }
    };
  }

  function grayManSolidSeconds() {
    // Pace from the c03c85e playtest: a practiced player burned almost all of
    // a 330 HP Gray Man and still lost the last life. That sponge ran well
    // past a minute and a half of boss time. The punish multiplier is the
    // extra damage landing during the recovery window.
    const referenceDps = (330 * 0.9) / 120;
    return GRAY_MAN.hp / (referenceDps * GRAY_MAN.punish);
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
    // Balefire spends the full meter and must not pay it back (same as the main game's noMeter hits).
    if (!(options && options.noMeter)) hero.focus = clamp((hero.focus || 0) + 8, 0, 100);
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
    BODY_W, BODY_H, MAX_PAIR_OVERLAP, MIN_SEPARATION, MELEE_RANGE, ATTACK_STANDOFF, RING_RANGE,
    GRAY_MAN, clamp, fmtTime, stepVertical, runningJumpReach, createPlanks, isPit, stablePadAt,
    stepPlanks, advanceBridgeCheckpoint, tokenCap, claimToken, releaseToken,
    orbitOffset, spriteOverlap, separateEnemies, holdWaitingRing, resolveCrowd,
    stepEnemy, simulateCrowd, grayManSolidSeconds, isInvulnerable,
    grayManStrikeConnects, nearestThreat, facingTowardThreat, facingAfterMove,
    targetsHitByAttack, knockProfile, knockTravel, registerTrollocKill, applyHeroHit,
    formatRunStats
  };
});
