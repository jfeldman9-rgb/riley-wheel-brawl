'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const { boot } = require('./soak.cjs');
const { OffscreenWatch } = require('./v11-offscreen-watch.cjs');
const R = boot(path.resolve(__dirname, '..')), dt = 1 / 60;
let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; console.log('PASS ' + label); }
function scene(difficulty = 'normal', stage = 4) {
  const s = new R.scenes.Play(R.game, stage, { difficulty, lives: 3 });
  s.enemies = []; s.projectiles = []; s.hazards = []; s.attackers.clear();
  s.player.x = s.arenaLeft + 40; s.player.y = 270;
  return s;
}
function enemy(s, x, kind) { return ['axe', 'hound', 'spear'].includes(kind) ? new R.Trolloc(s, x, 270, kind) : new R.ShadowSoldier(s, x, 270, kind); }
const still = { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) };
for (const difficulty of ['normal', 'hard']) for (const side of [-1, 1]) for (const kind of ['axe', 'hound', 'spear', 'darkfriend', 'cultist', 'guard', 'ashaman']) {
  const s = scene(difficulty), watch = new OffscreenWatch(R.W);
  s.player.x = side < 0 ? s.arenaLeft + 40 : s.arenaRight - 40;
  const target = enemy(s, side < 0 ? s.arenaLeft - 92 : s.arenaRight + 92, kind);
  target.entryX = side < 0 ? s.arenaLeft + 140 : s.arenaRight - 140;
  s.enemies = [target]; s.hitPlayer = () => false;
  for (let frame = 0; frame < 240; frame++) { s.time += dt; target.update(dt); s.player.y = target.y; watch.observe(s, dt); }
  watch.assertPassed();
  check(target.x >= s.camera.x && target.x <= s.camera.x + R.W, difficulty + ' ' + kind + ' enters and stays visible from ' + (side < 0 ? 'left' : 'right'));
  for (const state of ['hurt', 'knockdown', 'getup', 'attack', 'recover', 'thrown', 'dead']) {
    target.x = side < 0 ? s.camera.x - 100 : s.camera.x + R.W + 100;
    target.state = state; target.ai = state === 'attack' ? 'attack' : 'recover'; target.attack = target.config ? target.config.move : R.EnemyAttacks.axe;
    target.stun = 1; target.aiTimer = 1; target.vx = side * 500; target.thrown = state === 'thrown' ? 0.6 : 0; target.dead = state === 'dead'; target.deathTimer = 0.7;
    target.update(dt);
    check(target.x >= s.camera.x + 24 && target.x <= s.camera.x + R.W - 24, difficulty + ' ' + kind + ' ' + state + ' cannot persist beyond ' + (side < 0 ? 'left' : 'right') + ' wall');
  }
}
{
  const s = scene(), watch = new OffscreenWatch();
  s.enemies = [0, 1, 2, 3].map(n => ({ x: 100 + n * 30, kind: 'sentinel-' + n }));
  // Negative controls: a non-first enemy, both walls, and a living entry must
  // fail after two seconds. No average, sole-enemy or wave-clear exemption.
  for (const side of [-1, 1]) {
    const detector = new OffscreenWatch(); s.enemies[3].x = side < 0 ? -1 : 641;
    for (let frame = 0; frame < 121; frame++) detector.observe(s, dt);
    assert.throws(() => detector.assertPassed(), /sentinel-3/);
  }
  check(true, 'Any single hidden enemy among visible peers makes the >2s regression fail');
  s.enemies[3].x = -1; for (let i = 0; i < 120; i++) watch.observe(s, dt); watch.assertPassed();
  s.enemies[3].x = 10; watch.observe(s, dt); s.enemies[3].x = -1; for (let i = 0; i < 120; i++) watch.observe(s, dt); watch.assertPassed();
  check(true, 'Exactly two seconds passes; re-entry resets only that enemy’s continuous dwell');
}
for (const difficulty of ['normal', 'hard']) {
  const s = scene(difficulty), p = s.player;
  for (const state of ['idle', 'walk', 'hurt', 'knockdown', 'lying', 'getup']) {
    p.state = state; p.stateT = 0; p.x = s.arenaLeft - 30; p.vx = -300;
    p.update(dt, still);
    check(p.x >= s.camera.x + 40, difficulty + ' Riley ' + state + ' keeps his body inside the left wall');
  }
  p.state = 'getup'; p.stateT = 0.43; p.invuln = 0; p.update(dt, still);
  check(p.state === 'idle' && p.invuln >= 0.22, difficulty + ' get-up provides a short controllable recovery shield');
  const hp = p.hp; check(!s.hitPlayer(10, p.x + 10, {}) && p.hp === hp, 'Recovery shield rejects a same-frame hit');
}
{
  const s = scene('hard'), boss = new R.ShadowBoss(s, 380, 270, 'forsaken');
  s.enemies = [boss]; boss.introTimer = 0; boss.attack = R.ShadowMoves.forsaken[1]; boss.ai = 'telegraph'; boss.aiTimer = 1;
  boss.onHurt(78, { move: 'super' });
  check(boss.ai === 'recover' && boss.aiTimer >= 1, 'Hard Saidin interrupts a boss tell and opens a counterattack window');
  const flyer = new R.ShadowBoss(s, 380, 270, 'draghkar'); flyer.introTimer = 0;
  check(!flyer.takeHit(100, 200, { move: 'super' }), 'Saidin retains the Draghkar anti-air move restriction');
  const normal = scene('normal'), n = new R.ShadowBoss(normal, 380, 270, 'forsaken'); n.ai = 'telegraph'; n.onHurt(78, { move: 'super' });
  check(n.ai === 'telegraph', 'New boss resource interruption is Hard-only');
}
{
  const s = scene('hard'), target = enemy(s, 270, 'guard'); target.y = 320; s.enemies = [target]; s.player.y = 240;
  const loial = new R.Loial(s), initialY = loial.y; let damage = 0;
  s.damageEnemy = (e, amount) => { damage += amount; return true; };
  for (let i = 0; i < 130; i++) loial.update(dt);
  check(loial.y > initialY && damage >= 60, 'Hard Loial visibly tracks a flank and lands a meaningful hit');
  const n = scene('normal'); n.enemies = [enemy(n, 270, 'guard')]; const normalLoial = new R.Loial(n), lane = normalLoial.y;
  normalLoial.update(dt); check(normalLoial.y === lane, 'Normal Loial preserves his original fixed lane');
}
console.log('v1.1 combat checks passed: ' + checks);
