import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Fadelt, linkTrollocs, FADELT } from '../src/fadelt.js';

const stub = () => { const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setTint() { return o; }, destroy() {} }; return o; };

test('Fadelt links three trollocs and they reel when it dies', () => {
  const enemies = [];
  for (let i = 0; i < 4; i++) enemies.push({ type: i === 3 ? 'hound' : 'grunt', alive: true });
  const scene = { enemies, riley: { x: 0, y: 630, facing: 1, alive: true, hp: 100, state: 'idle' }, attackTokens: () => 0, bounds: { l: 0, r: 4000 }, paused: false, add: { image: stub, sprite: stub }, hud: { flashText() {} }, kit: {} };
  const f = new Fadelt(scene, 400, 630);
  assert.equal(linkTrollocs(f, enemies), 3);
  assert.equal(f.T.boss, false);
  assert.equal(FADELT.hp, 120);
  assert.deepEqual([...FADELT.tells], [0.5, 0.35, 0.45]);
  f.die();
  assert.equal(enemies.filter(e => e.daze === FADELT.daze).length, 3);
  assert.equal(f.alive, false);
});

test('only the third sword hit can be countered, and a blink cannot be hit', () => {
  const scene = { enemies: [], riley: { x: 300, y: 630, facing: 1, alive: true, hp: 100, state: 'combo2', attackFrame: true }, attackTokens: () => 0, bounds: { l: 0, r: 4000 }, paused: false, add: { image: stub, sprite: stub }, hud: { flashText() {} }, kit: {} };
  const f = new Fadelt(scene, 360, 630);
  f.state = 'attack'; f.hitI = 0; f.st = 0.2;
  assert.equal(f.takeHit({ dmg: 8, down: false }), true);
  assert.equal(f.state, 'attack');
  f.hitI = 2; f.counterUsed = false; f.hp = 80;
  assert.equal(f.takeHit({ dmg: 8 }), true);
  assert.equal(f.state, 'down');
  f.state = 'blink'; f.st = 0;
  assert.equal(f.canBeHit, false);
  assert.equal(f.takeHit({ dmg: 50 }), false);
});
