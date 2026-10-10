import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage5Bot } from '../src/bot-stage5.js';

test('bot staff-pin escape remains reachable at the 62 px collision distance', () => {
  const R = { x: 5038, y: 630, hp: 17, maxHp: 100, facing: 1, state: 'idle', z: 0, lives: 3 };
  const boss = { x: 5100, y: 630, hp: 150, type: 'aginor', phase: 1, alive: true, canBeHit: true, state: 'attack', st: 0.5 };
  const oak = { x: 4560, y: 630, open: true };
  const presses = [], s = { stageNo: 5, riley: R, enemies: [boss], bounds: { l: 3920, r: 5200 }, noPower: true, inp: { press: a => presses.push(a) }, kit: { arena: { oak }, stats: { oak: 1, staffs: 0 }, threats: () => ({ oak }) } };
  stage5Bot({ s, t: 10 });
  assert.notEqual(s.inp.demo.y, 0);
});


test('bot keeps retreating through the second flail hit after reaching safety', () => {
  const R = { x: 4500, y: 630, hp: 80, maxHp: 100, facing: 1, state: 'idle', z: 0, lives: 3 };
  const b = { x: 4600, y: 630, hp: 100, type: 'balthamel', alive: true, canBeHit: true, state: 'attack', st: 0.5 };
  const s = { stageNo: 5, riley: R, enemies: [b], bounds: { l: 3920, r: 5200 }, noPower: true, inp: { press() {} }, kit: { stats: { parries: 1 }, threats: () => ({}) } };
  const bot = { s, t: 10 };
  stage5Bot(bot); assert.equal(s.inp.demo.x, -1);
  R.x -= 200; b.st = 0.85;
  stage5Bot(bot); assert.equal(s.inp.demo.x, -1);
});

function dodgeFixture(threats) {
  const R = { x: 5160, y: 630, hp: 80, maxHp: 100, facing: -1, state: 'idle', z: 0, lives: 3 };
  const boss = { x: 5000, y: 630, hp: 500, type: 'aginor', phase: 1, alive: true, canBeHit: true, state: 'tether', locked: true };
  const s = { stageNo: 5, riley: R, enemies: [boss], bounds: { l: 3920, r: 5200 }, noPower: true, inp: { press() {} }, kit: { stats: { tetherCounters: 1 }, threats: () => threats } };
  return { s, R, boss, bot: { s, t: 10 } };
}
test('tether dodge crosses a band instead of reversing at its midpoint', () => {
  const { s, R, bot } = dodgeFixture({});
  stage5Bot(bot); const dir = s.inp.demo.y;
  R.y += dir * 3;
  stage5Bot(bot); assert.equal(s.inp.demo.y, dir);
});
test('hand dodge moves along the band axis when the arena wall blocks x', () => {
  const { s, bot } = dodgeFixture({ hands: [{ x: 5160, y: 630, phase: 'tell' }] });
  stage5Bot(bot); assert.notEqual(s.inp.demo.y, 0);
});

test('coverage bot waits for the first surge tell to become counterable', () => {
  const { s, R, boss, bot } = dodgeFixture({ surge: { phase: 'tell' } });
  boss.phase = 3; boss.locked = false; boss.state = 'idle'; boss.hp = 20; R.x = 4900; R.facing = 1;
  s.kit.stats.surgeCounters = 0;
  const presses = []; s.inp.press = a => presses.push(a);
  stage5Bot(bot); assert.deepEqual(presses, []);
});

test('bot circles past Aginor instead of backing into a wall at point-blank range', () => {
  const { s, R, boss, bot } = dodgeFixture({});
  boss.locked = false; boss.state = 'idle'; boss.x = 5120; s.kit.stats.staffs = 1;
  stage5Bot(bot); assert.equal(s.inp.demo.x, -1); assert.notEqual(s.inp.demo.y, 0);
});

test('bot responds to a learned flail tell before committing another attack', () => {
  const { s, R, boss, bot } = dodgeFixture({});
  boss.type = 'balthamel'; boss.locked = false; boss.state = 'attack'; boss.st = 0.1; boss.x = R.x - 100;
  s.kit.stats.parries = 1; R.facing = -1;
  stage5Bot(bot); assert.notEqual(s.inp.demo.y, 0);
});
test('staff avoidance takes priority over walking into Aginor to seek oak healing', () => {
  const { s, R, boss, bot } = dodgeFixture({ oak: { x: 4560, y: 630, open: true } });
  R.x = 4650; R.hp = 20; boss.x = 4590; boss.phase = 3; boss.locked = false; boss.state = 'attack'; boss.st = 0.5;
  s.kit.stats.staffs = 1;
  stage5Bot(bot); assert.equal(s.inp.demo.x, 1);
});

test('bot does not buffer a combo into the next boss string while Riley is busy', () => {
  const { s, R, boss, bot } = dodgeFixture({ ring: { phase: 'grow', x: 4000, y: 630, r: 0 } });
  boss.locked = false; boss.state = 'attack'; boss.st = 1.1; R.x = 4900; R.facing = 1; R.busy = true; R.state = 'combo1'; s.kit.stats.staffs = 1;
  const presses = []; s.inp.press = a => presses.push(a);
  stage5Bot(bot); assert.deepEqual(presses, []);
});

test('hand dodge escapes a boss body blocking the horizontal route', () => {
  const { s, R, boss, bot } = dodgeFixture({ hands: [{ x: 5058, y: 630, phase: 'tell' }] });
  R.x = 5058; boss.x = 5120;
  stage5Bot(bot); assert.ok(s.inp.demo.x < 0 || s.inp.demo.y !== 0);
});

test('a later boss string gets a new dodge direction after an intervening hand tell', () => {
  const { s, R, boss, bot } = dodgeFixture({});
  R.x = 4700; boss.x = 4800; boss.locked = false; boss.state = 'attack'; boss.st = 0.2; s.kit.stats.staffs = 1;
  stage5Bot(bot); assert.equal(s.inp.demo.x, -1);
  R.x = 4900; s.kit.stats.staffs = 2;
  stage5Bot(bot); assert.equal(s.inp.demo.x, 1);
});

test('first parry starts combo 1 late enough for its active frame to overlap the flail', () => {
  const { s, R, boss, bot } = dodgeFixture({});
  boss.type = 'balthamel'; boss.locked = false; boss.state = 'attack'; boss.st = 0.1; boss.x = R.x - 100;
  s.kit.stats.parries = 0; R.facing = -1;
  const presses = []; s.inp.press = a => presses.push(a);
  stage5Bot(bot); assert.deepEqual(presses, []);
  boss.st = 0.36;
  stage5Bot(bot); assert.deepEqual(presses, ['attack']);
});

test('coverage bot offers the first flail before attacking away its counter opportunity', () => {
  const { s, R, boss, bot } = dodgeFixture({});
  boss.type = 'balthamel'; boss.locked = false; boss.state = 'idle'; boss.hp = 150; boss.x = R.x - 100;
  s.kit.stats.parries = 0; R.facing = -1;
  const presses = []; s.inp.press = a => presses.push(a);
  stage5Bot(bot); assert.deepEqual(presses, []);
});

test('bot avoids a lethal staff string even while Aginor is overdrawn', () => {
  const { s, R, boss, bot } = dodgeFixture({ surge: { phase: 'hot' } });
  R.x = 4900; R.hp = 15; R.facing = 1; boss.x = 5000; boss.locked = false; boss.state = 'attack'; boss.st = 0.2; boss.overdrawn = true;
  s.kit.stats.staffs = 1;
  stage5Bot(bot); assert.equal(s.inp.demo.x, -1);
});

test('bot does not seek healing from the oak while its root-out closure is active', () => {
  const { s, R, boss, bot } = dodgeFixture({});
  R.x = 4900; R.hp = 15; R.facing = 1; boss.x = 5000; boss.phase = 3; boss.locked = false; boss.state = 'idle';
  s.kit.arena = { oak: { x: 4560, y: 630, open: false } }; s.kit.stats.staffs = 1;
  const presses = []; s.inp.press = a => presses.push(a);
  stage5Bot(bot); assert.ok(presses.includes('attack'));
});
