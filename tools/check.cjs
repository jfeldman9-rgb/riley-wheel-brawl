'use strict';
const fs = require('fs');
const path = require('path');
const { boot } = require('./soak.cjs');
const root = path.resolve(__dirname, '..');
const RWB = boot(root);
const failures = [];
function check(value, message) {
  console.log((value ? 'PASS ' : 'FAIL ') + message);
  if (!value) failures.push(message);
}
const game = RWB.game;
let title = new RWB.scenes.Title(game);
game.scene = title;
title.update(0, { pressed: { start: true } });
check(game.nextScene instanceof RWB.scenes.Reel, 'Title starts the opening reel');
const walk = RWB.RILEY_POSES.walk;
check(walk.length >= 4 && new Set(walk.map(pose => JSON.stringify(pose))).size >= 4, 'Riley walk cycle has at least four distinct poses');
function moveDamages(name) {
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  const enemy = new RWB.Trolloc(scene, scene.player.x + 35, scene.player.y, 'axe');
  enemy.ai = 'recover';
  enemy.aiTimer = 9;
  scene.enemies.push(enemy);
  const before = enemy.hp;
  scene.player.beginMove(name);
  scene.player.stateT = RWB.MOVES[name].active[0] + 0.01;
  scene.player.updateAttack(0.01);
  return enemy.hp < before && scene.playerHitboxes.length > 0;
}
check(moveDamages('front'), 'Front kick creates a damaging hitbox');
check(moveDamages('round'), 'Roundhouse creates a damaging hitbox');
check(moveDamages('back'), 'Spinning back kick creates a damaging hitbox');
check(moveDamages('jump'), 'Jump kick creates a damaging hitbox');
check(moveDamages('spin'), '360 spinning kick creates a damaging hitbox');
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  const enemy = new RWB.Trolloc(scene, scene.player.x + 42, scene.player.y, 'axe');
  enemy.ai = 'recover';
  enemy.aiTimer = 9;
  scene.enemies.push(enemy);
  const before = enemy.hp;
  const projectile = new RWB.Fireball(scene, scene.player, 0);
  for (let i = 0; i < 20 && projectile.life > 0; i += 1) projectile.update(1 / 60);
  check(enemy.hp < before, 'Fireball projectile hitbox damages a Trolloc');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  const enemy = new RWB.Trolloc(scene, scene.player.x + 18, scene.player.y, 'axe');
  scene.enemies.push(enemy);
  enemy.setState('hurt');
  scene.player.grabbed = enemy;
  enemy.grabbedBy = scene.player;
  const before = enemy.hp;
  scene.player.throwGrab(1);
  check(enemy.hp < before && enemy.thrown > 0, 'Grab throw damages and launches a Trolloc');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  scene.player.hp = 2;
  scene.player.power = 100;
  scene.player.taintAge = RWB.TUNE.taintGrace + 1;
  for (let i = 0; i < 600; i += 1) scene.player.updateTaint(1 / 60);
  check(scene.player.hp === 1, 'Taint never reduces HP below one');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  const first = scene.callLoial();
  const second = scene.callLoial();
  const restarted = new RWB.scenes.Play(game, 0, { loial: scene.player.loialReady });
  const afterRestart = restarted.callLoial();
  const continued = new RWB.scenes.Play(game, 0, { loial: scene.player.loialReady, wave: 2 });
  const afterContinue = continued.callLoial();
  check(first && !second && !afterRestart && !afterContinue, 'Loial cannot be used twice after use, restart, or Continue');
}
{
  const original = new RWB.scenes.Play(game, 0, { wave: 3, score: 4321, saidin: 67, loial: false, lives: 1 });
  const checkpoint = { level: 0, wave: original.wave, score: original.player.score, extra: { saidin: original.player.power, loial: original.player.loialReady, lives: 0 } };
  const over = new RWB.scenes.GameOver(game, checkpoint);
  over.continueRun();
  const resumed = game.nextScene;
  check(resumed.levelIndex === 0 && resumed.wave === 3 && resumed.player.score === 3821 && !resumed.player.loialReady && resumed.player.lives === 3, 'Game Over Continue preserves level, wave, score policy, and Loial state');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  scene.props = [];
  const hp = scene.player.hp;
  const neutral = { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) };
  for (let i = 0; i < 30 * 60; i += 1) scene.update(1 / 60, neutral);
  check(scene.player.hp === hp, 'Player takes zero damage in 30 seconds with no attackers');
}
{
  const full = RWB.settings.data.shake;
  RWB.settings.data.shake = 'full';
  const strong = new RWB.Camera();
  strong.impact(1, 'super');
  RWB.settings.data.shake = 'reduced';
  const reduced = new RWB.Camera();
  reduced.impact(1, 'super');
  check(reduced.shakeAmt < strong.shakeAmt && reduced.flashT < strong.flashT, 'Reduced Shake lowers super shake and flash');
  RWB.settings.data.shake = full;
}
check(RWB.ART_MANIFEST.length === 0 && RWB.__assetRequests() === 0, 'Empty art manifest causes zero image requests');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|ttf)[^"]*)"/g)].map(match => match[1]);
check(urls.every(url => url.includes('?v=20260926-g2')), 'Every script, stylesheet, and font URL has the g2 cache stamp');
if (failures.length) {
  console.error(failures.length + ' check(s) failed');
  process.exit(1);
}
console.log('All checks passed.');
