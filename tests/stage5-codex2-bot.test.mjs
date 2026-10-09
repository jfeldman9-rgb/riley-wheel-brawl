import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage5Bot } from '../src/bot-stage5.js';

function fixture(ring) {
  const R = { x: 4700, y: 630, hp: 80, z: 0, state: 'idle', facing: 1, lives: 3 };
  const boss = { x: 4800, y: 630, hp: 150, maxHp: 600, phase: 3, type: 'aginor', alive: true, canBeHit: true, state: 'idle' };
  const presses = [];
  const s = { stageNo: 5, riley: R, enemies: [boss], noPower: true, bounds: { l: 3920, r: 5200 }, inp: { press: key => presses.push(key) }, kit: { stats: { staffs: 1, oak: 1, tetherCounters: 1 }, threats: () => ({ ring }) } };
  return { bot: { s, t: 10 }, presses };
}
test('ring response does not jump at the beginning of a 0.9s tell', () => {
  const { bot, presses } = fixture({ phase: 'tell', x: 4800, y: 630, st: 0.1, r: 0 });
  stage5Bot(bot); assert.ok(!presses.includes('jump'));
});
test('imminent ring contact jumps even when the attack cooldown is pending', () => {
  const { bot, presses } = fixture({ phase: 'grow', x: 4800, y: 630, st: 0.05, r: 22 });
  bot.next = 11;
  stage5Bot(bot); assert.ok(presses.includes('jump')); assert.ok(!presses.includes('attack'));
});
test('ring preparation keeps moving out of the staff band', () => {
  const { bot } = fixture({ phase: 'tell', x: 4800, y: 630, st: 0.6, r: 0 });
  bot.s.enemies[0].state = 'attack';
  stage5Bot(bot); assert.notEqual(bot.s.inp.demo.y, 0);
});
