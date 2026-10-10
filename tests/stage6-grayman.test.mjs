import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GrayMan, grayVisible, GRAY } from '../src/grayman.js';

const stub = () => { const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setVisible() { return o; }, setBlendMode() { return o; }, destroy() {} }; return o; };
function scene(over = {}) {
  return { enemies: [], riley: { x: 0, y: 630, facing: 1, alive: true, hp: 100, state: 'idle', attackFrame: false }, attackTokens: () => 0, maxTokens: 2, bounds: { l: 0, r: 4000 }, paused: false, add: { image: stub, sprite: stub }, hud: { flashText() {} }, kit: {}, lights: null, ...over };
}

test('a Gray Man stays faint until he is close, lit, or five seconds old, and only one lives', () => {
  const s = scene();
  const g = new GrayMan(s, 800, 630);
  assert.equal(grayVisible(g), false);
  s.riley.x = 800 - 200;
  assert.equal(grayVisible(g), true);
  s.riley.x = 0;
  g.age = GRAY.hide;
  assert.equal(grayVisible(g), true);
  const extra = new GrayMan(s, 900, 630);
  assert.equal(extra.capped, true);
  assert.equal(extra.alive, false);
  assert.equal(GRAY.hp, 34);
  assert.equal(GRAY.tell, 0.6);
  assert.equal(GRAY.dmg, 14);
});

test('the knife lunge has a 0.6s tell and a facing attack counters it', () => {
  const s = scene();
  const g = new GrayMan(s, 200, 630);
  s.riley.x = 280; s.riley.y = 630;
  g.state = 'attack'; g.st = 0;
  g.update(GRAY.tell - 0.05);
  assert.equal(g.state, 'attack');
  g.update(0.1);
  assert.equal(g.state, 'lunge');
  let alpha = 0;
  const far = new GrayMan(scene(), 2000, 630);
  far.state = 'attack';
  far.glint.setAlpha = v => { alpha = v; return far.glint; };
  far.sync();
  assert.equal(grayVisible(far), false);
  assert.equal(alpha, 1);
  s.riley.x = g.x - 40; s.riley.facing = 1; s.riley.attackFrame = true; s.riley.state = 'combo1';
  g.update(1 / 60);
  assert.equal(g.state, 'down');
});
