import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { Enemy } from '../src/enemies.js';
import { Cultist, updateFogBolts } from '../src/cultists.js';
import { beginDraghkarStrike, finishDraghkarStrike } from '../src/draghkar-impact.js';

test('fx.impact with an unknown kind falls back to medium instead of NaN feedback', () => {
  const h = stage1Simulation({ mode: null }), fx = h.s.fx;
  try {
    fx.hitstop = fx.slowmo = fx.trauma = 0;
    fx.impact('bogus', 100, 200);
    assert.equal(fx.hitstop, 6 / 60);
    assert.equal(fx.trauma, 0.28);
    assert.ok(Number.isFinite(fx.flashT) && fx.flashT > 0);
  } finally { h.destroy(); }
});

test('flashArmor: a second flash is not cut short by the first timer, and death clears the tint', () => {
  const h = stage1Simulation({ mode: null }), s = h.s;
  try {
    const e = new Enemy(s, 'grunt', 500, 630);
    let tint = null, clears = 0;
    e.sprite.setTint = c => { tint = c; return e.sprite; };
    e.sprite.clearTint = () => { tint = null; clears++; return e.sprite; };
    const timers = [], realDelayed = s.time.delayedCall;
    s.time.delayedCall = (ms, fn) => { timers.push(fn); return { remove() {} }; };
    try {
      e.flashArmor(); e.flashArmor();
      assert.equal(tint, 0xffb0a0);
      timers.shift()();            // first timer fires while the second flash is still fresh
      assert.equal(tint, 0xffb0a0);
      timers.shift()();
      assert.equal(tint, null);
      e.flashArmor();
      assert.equal(tint, 0xffb0a0);
      e.die(1, { kb: 100 });
      assert.equal(tint, null);
      assert.ok(clears >= 2);
    } finally { s.time.delayedCall = realDelayed; }
  } finally { h.destroy(); }
});

test('cultist fog bolt and shove hits produce impact feedback', () => {
  const impacts = [];
  const R = { x: 500, y: 630, hp: 50, alive: true, state: 'idle', vx: 0 };
  const scene = { riley: R, enemies: [], fogBolts: [{ x: 500, y: 630, vx: 0, dmg: 10, alive: true, t: 0 }], fx: { impact: kind => impacts.push(kind) } };
  updateFogBolts(scene, 0.016);
  assert.equal(R.hp, 40);
  assert.deepEqual(impacts, ['medium']);
  impacts.length = 0;
  const c = new Cultist(scene, 560, 630);
  assert.equal(c.startShove(), true);
  assert.equal(R.hp, 35);
  assert.deepEqual(impacts, ['light']);
});

test('draghkar strikes routed through takeHit also produce impact feedback', () => {
  const impacts = [];
  const R = { x: 500, y: 630, hp: 100, alive: true, state: 'idle', vx: 0,
    takeHit(hit) { this.hp -= hit.dmg; if (hit.down) this.state = 'down'; return true; } };
  const boss = { state: 'claw', x: 400, target: R, scene: { fx: { impact: kind => impacts.push(kind) } } };
  const hit = beginDraghkarStrike(boss);
  R.hp -= 12; R.state = 'down';   // what the pure core does before the scene routes it back
  finishDraghkarStrike(boss, hit);
  assert.equal(R.hp, 88);
  assert.deepEqual(impacts, ['heavy']);
});
