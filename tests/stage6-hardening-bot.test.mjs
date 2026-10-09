import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage6Bot } from '../src/bot-stage6.js';
import { BANDS } from '../src/stage6-arena.js';

test('a line-margin escape that returns into a boss flurry also retreats horizontally', () => {
  const r = { x: 600, y: 626, hp: 80, state: 'walk', alive: true, facing: 1, saidin: 0 };
  const b = { x: 662, y: 647, state: 'attack', st: 0.53, hitI: 0, type: 'belal', alive: true, hp: 300, T: { boss: true } };
  const s = { stageNo: 6, riley: r, enemies: [b], boss: b, bands: BANDS, bounds: { l: 0, r: 1280 }, inp: { demo: {}, press() {} }, kit: { threats: () => ({ lines: [{ band: 0, phase: 'tell' }] }) } };
  stage6Bot({ s, t: 10, dkey: -1, dwho: b });
  assert.equal(s.inp.demo.x, -1); assert.equal(s.inp.demo.y, 1);
});

test('the bot waits for an actionable Riley before spending the one-second Rand stagger', () => {
  const pressed = [], r = { x: 600, y: 630, hp: 80, state: 'combo3', busy: true, alive: true, facing: 1, saidin: 0 };
  const b = { x: 662, y: 630, phase: 3, state: 'idle', st: 0, type: 'belal', alive: true, hp: 180, T: { boss: true } };
  const s = { stageNo: 6, riley: r, enemies: [b], boss: b, bounds: { l: 0, r: 1280 }, inp: { demo: {}, press: key => pressed.push(key) }, kit: { rand: { charges: 1, calls: 0, phaseCalls: {} }, randCtx: () => ({ hittable: true, bossPhase: 3 }), threats: () => ({}) } };
  stage6Bot({ s, t: 10, useRand: true }); assert.ok(!pressed.includes('assist'));
  r.busy = false; r.state = 'idle'; stage6Bot({ s, t: 10, useRand: true }); assert.ok(pressed.includes('assist'));
});

test('the delayed bot stops running before a melee poke so it does not commit to the long runkick', () => {
  const pressed = [], r = { x: 600, y: 630, hp: 80, state: 'run', busy: false, alive: true, facing: 1, saidin: 0 };
  const b = { x: 662, y: 630, state: 'idle', st: 0.7, type: 'belal', alive: true, hp: 85, T: { boss: true } };
  const s = { stageNo: 6, riley: r, enemies: [b], boss: b, bounds: { l: 0, r: 1280 }, inp: { demo: {}, press: key => pressed.push(key) }, kit: { bossTime: 50, threats: () => ({}) } };
  const bot = { s, t: 10, lag: 0.25, mem: new Map([[b, [9.75, 'idle', 662, 630, 0.7, 0, 85, true]]]) };
  stage6Bot(bot); assert.deepEqual(pressed, []); assert.equal(s.inp.demo.run, false);
  r.state = 'walk'; bot.t += 1 / 60; stage6Bot(bot); assert.ok(pressed.includes('attack'));
});
