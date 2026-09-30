'use strict';
// Run-scoped difficulty, tactical behavior and fairness. No browser or assets required.
const assert = require('node:assert/strict');
const path = require('node:path');
const { boot, soak } = require('./soak.cjs');
const root = path.resolve(__dirname, '..');
const R = boot(root);
const checks = [];
function check(value, name) { assert.ok(value, name); checks.push(name); console.log('PASS ' + name); }
function arena(level = 0, difficulty = 'hard') {
  const game = { setScene(scene) { this.scene = scene; } };
  const scene = new R.scenes.Play(game, level, { difficulty, lives: 3 });
  scene.enemies = []; scene.hazards = []; scene.projectiles = [];
  scene.attackers.clear(); scene.nextEnemyAttackAt = 0;
  scene.player.x = 320; scene.player.y = 275; scene.player.invuln = 0;
  scene.hitPlayer = () => false;
  return scene;
}
function soldier(scene, x, kind = 'axe') {
  const enemy = ['axe', 'hound', 'spear'].includes(kind) ? new R.Trolloc(scene, x, 275, kind) : new R.ShadowSoldier(scene, x, 275, kind);
  enemy.aiTimer = 0; scene.enemies.push(enemy); return enemy;
}
function tick(scene, frames, observe = () => {}) {
  for (let frame = 0; frame < frames; frame++) {
    scene.time += 1 / 60;
    scene.enemyHitboxes.length = 0;
    for (const enemy of scene.enemies) enemy.update(1 / 60);
    for (const hazard of scene.hazards) hazard.update(1 / 60);
    scene.hazards = scene.hazards.filter(hazard => hazard.life > 0);
    observe(frame);
  }
}
check(R.settings.data.difficulty === 'normal', 'Fresh settings default to Normal');
R.settings.set({ difficulty: 'hard' }); R.settings.load();
check(R.settings.data.difficulty === 'hard', 'Hard selection persists');
R.settings.set({ difficulty: 'invalid' });
check(R.settings.data.difficulty === 'normal', 'Invalid difficulty normalizes to Normal');
R.settings.set({ difficulty: 'hard' });
R.settings.saveRun({ level: 1, wave: 2, score: 123, extra: { lives: 2 } });
const legacy = R.settings.loadRun();
check(legacy.extra.difficulty === 'normal', 'Legacy Continue stays Normal when next-run setting is Hard');
check(new R.scenes.Play(R.game, 1, legacy.extra).difficulty === 'normal', 'Legacy Continue applies Normal to its scene');
for (const full of [true, false]) {
  const panel = new R.OptionsPanel('options', { full });
  const index = panel.rows.findIndex(row => row.id === 'difficulty');
  panel.sel = index;
  const before = R.settings.data.difficulty;
  panel.update({ pressed: { click: true }, pointer: { x: 100, y: panel.y0 + index * panel.step } }, 1 / 60);
  check(index >= 0 && R.settings.data.difficulty !== before, (full ? 'Title' : 'Pause') + ' difficulty row remains clickable');
  panel.update({ pressed: { left: true } }, 1 / 60);
  check(R.settings.data.difficulty === before, (full ? 'Title' : 'Pause') + ' difficulty works with directional menu input');
  check(panel.y0 + (panel.rows.length - 1) * panel.step < R.H - 64, 'All ' + (full ? 'title' : 'pause') + ' options fit above help text');
}
R.settings.set({ difficulty: 'hard' });
const hard = new R.scenes.Play(R.game, 0, {});
check(hard.difficulty === 'hard', 'New run uses saved Hard selection');
R.settings.set({ difficulty: 'normal' });
check(hard.difficulty === 'hard', 'Changing the option never changes the current run');
hard.saveCheckpoint(); const run = R.settings.loadRun();
check(run.extra.difficulty === 'hard', 'Checkpoint preserves Hard');
check(new R.scenes.Play(R.game, run.level, run.extra).difficulty === 'hard', 'Continue preserves Hard against a Normal menu setting');
const restart = arena(); restart.restartStage();
check(restart.game.scene.difficulty === 'hard', 'Restart preserves Hard');
check(hard.carryToNext().difficulty === 'hard', 'Stage progression preserves Hard');
let identicalHp = true;
for (let level = 0; level < 5; level++) for (let wave = 0; wave < 6; wave++) {
  const normal = new R.scenes.Play(R.game, level, { difficulty: 'normal', wave });
  const difficult = new R.scenes.Play(R.game, level, { difficulty: 'hard', wave });
  identicalHp = identicalHp && normal.enemies.length === difficult.enemies.length && normal.enemies.every((enemy, i) => enemy.hp === difficult.enemies[i].hp && enemy.hpMax === difficult.enemies[i].hpMax);
}
check(identicalHp, 'Every enemy and boss in all 30 waves has identical Normal/Hard HP');
{
  const scene = arena();
  const first = soldier(scene, 430), second = soldier(scene, 490);
  let flankSeen = false, bothSides = false, maxActive = 0, began = 0, prior = null, lastEnd = -Infinity, minGap = Infinity;
  tick(scene, 1200, () => {
    flankSeen ||= scene.enemies.some(enemy => enemy.hardIntent === 'flank');
    bothSides ||= first.x > scene.player.x + 20 && second.x < scene.player.x - 20;
    const active = scene.enemies.filter(enemy => enemy.ai === 'attack');
    maxActive = Math.max(maxActive, active.length);
    if (prior && !active.includes(prior)) lastEnd = scene.time;
    if (active[0] && !prior) { began++; minGap = Math.min(minGap, scene.time - lastEnd); }
    prior = active[0] || null;
  });
  check(flankSeen && bothSides, 'Enemies starting on one side visibly route to opposite flanks');
  check(began >= 8, 'Hard enemies sustain pressure rather than waiting forever');
  check(maxActive === 1 && minGap >= 0.14, 'Attack handoffs never overlap active windows and retain a reaction gap');
}
{
  for (const kind of ['axe', 'hound', 'spear', 'darkfriend', 'cultist', 'guard', 'ashaman']) {
    const scene = arena();
    const enemy = soldier(scene, kind === 'ashaman' ? 485 : 350, kind);
    enemy.hardSlot = 1; // Its assigned flank is left, but Riley has engaged it on the right.
    enemy.updateAI(1 / 60);
    check(enemy.ai === 'telegraph' && enemy.aiTimer === enemy.attack.tell, 'Pursued ' + kind + ' takes a valid opening before finishing its flank, with the full tell');
    check(enemy.facing === -1, 'Pursued ' + kind + ' telegraphs toward Riley from its actual side');
  }
}
for (const side of [-1, 1]) {
  const scene = arena();
  scene.player.x = side < 0 ? 18 : R.W - 18;
  const enemy = soldier(scene, side < 0 ? -30 : R.W + 30, 'guard');
  enemy.hardSlot = side < 0 ? 0 : 1;
  let enteredTell = false, offscreenTell = false;
  tick(scene, 180, () => {
    scene.player.y = enemy.y; // A pursuer tracks the lane, denying a free crossing.
    if (enemy.ai === 'telegraph') {
      enteredTell = true;
      offscreenTell ||= enemy.x < 16 || enemy.x > R.W - 16;
    }
  });
  check(enteredTell && !offscreenTell, 'Pursued guard re-enters from the ' + (side < 0 ? 'left' : 'right') + ' edge before telegraphing');
}
{
  const scene = arena(4);
  for (const [index, kind] of ['hound', 'axe', 'spear', 'darkfriend', 'cultist', 'guard', 'ashaman'].entries()) {
    const enemy = soldier(scene, 150 + index * 50, kind);
    enemy.y = 220 + (index % 3) * 45;
  }
  let maxActive = 0;
  tick(scene, 1800, () => { maxActive = Math.max(maxActive, scene.enemies.filter(enemy => enemy.ai === 'attack').length); });
  check(maxActive === 1, 'Mixed short/long melee and ranged tells never produce simultaneous active attackers');
}
{
  const scene = arena(); const enemy = soldier(scene, 350, 'hound');
  enemy.requestAttack(); const tell = enemy.aiTimer;
  tick(scene, Math.floor(tell * 60) - 1);
  check(enemy.ai === 'telegraph' && tell === R.EnemyAttacks.bite.tell, 'Fastest Hard melee attack retains the entire original tell');
  const facing = enemy.facing;
  scene.player.x = enemy.x - facing * 100;
  tick(scene, 1);
  check(enemy.facing === facing, 'Committed Hard attacks do not track Riley through their tell');
}
{
  const scene = arena(); const enemy = soldier(scene, 350);
  enemy.requestAttack();
  check(enemy.ai === 'telegraph', 'Hard starts a valid close attack');
  enemy.takeHit(1, 320, {});
  check(!scene.attackers.has(enemy) && enemy.state === 'hurt', 'Interrupting Hard releases the director token');
  tick(scene, 180);
  check(enemy.ai !== 'circle' && scene.attackers.size <= 1, 'Interrupted Hard enemies recover without a stale attack token');
}
{
  const scene = arena(); const enemy = soldier(scene, 350);
  scene.hazards.push(new R.Shockwave(scene, 400, 275, 1));
  check(!R.HardAI.canCommit(enemy), 'Live travelling boss attack prevents an overlapping strike');
  scene.hazards[0].hit = true;
  check(R.HardAI.canCommit(enemy), 'Spent travelling strike does not stall combat');
  scene.hazards = [new R.Mashadar(scene)];
  check(R.HardAI.canCommit(enemy), 'Persistent stage fog never deadlocks the attack schedule');
  scene.player.invuln = 2;
  check(!R.HardAI.canCommit(enemy), 'Hard respects the respawn grace window');
  scene.player.invuln = 0; enemy.x = -20;
  check(!R.HardAI.canCommit(enemy), 'Hard cannot attack from off-screen');
}
{
  const scene = arena(); const enemy = soldier(scene, 485, 'ashaman');
  tick(scene, 120);
  check(enemy.attack === enemy.config.move && Math.abs(enemy.x - scene.player.x) > 100, 'Turned Asha’man keep useful casting range in Hard');
}
for (const y of [R.FLOOR_TOP, R.FLOOR_BOTTOM]) {
  const scene = arena(); scene.player.y = y;
  const enemy = soldier(scene, 410); enemy.hardSlot = 1; enemy.y = y;
  tick(scene, 600);
  check(enemy.x < scene.player.x && enemy.y >= R.FLOOR_TOP && enemy.y <= R.FLOOR_BOTTOM, 'Flanking stays reachable at floor edge ' + y);
}
for (const kind of ['fade', 'draghkar', 'forsaken', 'taim']) {
  const scene = arena();
  const boss = new R.ShadowBoss(scene, 500, 275, kind);
  boss.introTimer = 0; scene.enemies = [boss];
  let activeCount = 0, previous = boss.ai;
  tick(scene, 2400, () => {
    if (boss.ai === 'attack' && previous !== 'attack') {
      activeCount++;
      if (activeCount === 3) assert.equal(boss.usedAttacks.size, 3, kind + ' first three active moves cover its repertoire');
    }
    previous = boss.ai;
  });
  check(activeCount >= 3 && boss.usedAttacks.size === 3, 'Hard ' + kind + ' preserves its full boss repertoire');
}
{
  const scene = arena(1); const boss = new R.ShadowBoss(scene, 500, 275, 'fade');
  boss.introTimer = 0; boss.attackIndex = 0; scene.enemies = [boss];
  boss.requestAttack();
  check(boss.attack.mode === 'blink' && boss.aiTimer === boss.attack.tell, 'Hard Fade chooses a fully telegraphed gap-closing move at range');
  const pause = new R.scenes.Play(R.game, 0, { difficulty: 'hard' });
  pause.paused = true;
  const before = pause.time;
  pause.update(1, { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) });
  check(pause.time === before, 'Pause freezes Hard attack scheduling');
}
// Optional exact comparison to a caller-provided clean checkout, including
// every result field and random call. The reference is never written by this test.
const baselineArg = process.argv.find(arg => arg.startsWith('--baseline='));
if (baselineArg) {
  const reference = boot(path.resolve(baselineArg.slice('--baseline='.length)));
  const current = boot(root);
  let oldCalls = 0, newCalls = 0;
  for (const [runtime, count] of [[reference, () => oldCalls++], [current, () => newCalls++]]) {
    const setRandom = runtime.__setRandom;
    runtime.__setRandom = random => setRandom(() => { count(); return random(); });
  }
  for (let level = 0; level < 5; level++) for (let seed = 1; seed <= 3; seed++) {
    oldCalls = 0; newCalls = 0;
    const oldResult = soak(reference, seed, level, { natural: true });
    const newResult = soak(current, seed, level, { natural: true });
    assert.deepEqual(JSON.parse(JSON.stringify(newResult)), JSON.parse(JSON.stringify(oldResult)));
    check(oldCalls === newCalls, 'Normal seed ' + seed + ', stage ' + (level + 1) + ': exact result and RNG-call parity');
  }
}
// Optional end-to-end assisted campaign coverage: same public soak bot, Hard
// selected through settings, no health/stat overrides to the enemies.
if (process.argv.includes('--soak')) {
  const runtime = boot(root);
  runtime.settings.set({ difficulty: 'hard' });
  const originalUpdate = runtime.scenes.Play.prototype.update;
  let overlaps = 0;
  runtime.scenes.Play.prototype.update = function (...args) {
    const result = originalUpdate.apply(this, args);
    if (this.enemies.filter(enemy => !enemy.dead && enemy.state === 'attack' && enemy.ai === 'attack').length > 1) overlaps++;
    return result;
  };
  for (let level = 0; level < 5; level++) {
    for (let seed = 1; seed <= 10; seed++) {
      const result = soak(runtime, seed, level);
      assert.ok(result.cleared, 'Hard stage ' + (level + 1) + ', seed ' + seed + ' clears');
      assert.ok(runtime.LEVELS[level].attacks.every(attack => result.attacks.includes(attack)), 'Every boss attack remains reachable');
      if (level === 4) assert.ok(result.jointHit, 'Hard finale uses the joint finish');
      if (level === 2) assert.ok(result.receivedMoves.every(move => ['jump', 'fireball'].includes(move)), 'Draghkar keeps its damage filter');
    }
    check(true, 'Hard assisted stage ' + (level + 1) + ': 10/10 clears and complete boss repertoire');
  }
  check(overlaps === 0, 'All 50 Hard assisted runs have zero simultaneous active attackers');
}
console.log('\nHard checks passed: ' + checks.length);
